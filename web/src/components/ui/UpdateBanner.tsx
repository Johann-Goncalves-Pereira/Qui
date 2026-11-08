/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { InstallUpdateButton } from "@/components/settings/InstallUpdateButton"
import { RestartOverlay } from "@/components/settings/RestartOverlay"
import { Button } from "@/components/ui/button"
import { DesktopUpdateDialog } from "@/components/ui/DesktopUpdateDialog"
import { useSelfUpdate } from "@/hooks/useSelfUpdate"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Download, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { setUpdateBannerMounted } from "@/lib/desktop-update-state"

export function UpdateBanner() {
  const isDesktop = typeof window !== "undefined" && window.quiDesktop !== undefined
  const { t } = useTranslation("common")
  const [dismissed, setDismissed] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const selfUpdate = useSelfUpdate()

  useEffect(() => {
    setUpdateBannerMounted(true)
    return () => {
      setUpdateBannerMounted(false)
    }
  }, [])

  const bannerButtonClass = "h-6 text-xs border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"

  // Desktop shell update query
  const { data: desktopUpdate } = useQuery({
    queryKey: ["desktop-latest-update"],
    queryFn: async () => {
      if (typeof window === "undefined" || !window.quiDesktop?.checkForUpdates) {
        return null
      }
      return await window.quiDesktop.checkForUpdates()
    },
    enabled: isDesktop,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  // Listen for open-dialog events emitted by desktop main process
  useEffect(() => {
    if (typeof window === "undefined" || !window.quiDesktop?.onShowUpdateDialog) {
      return
    }
    const unsubscribe = window.quiDesktop.onShowUpdateDialog((info) => {
      if (info?.hasUpdate) {
        setDialogOpen(true)
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  // Standalone browser / Docker container update query
  const { data: updateInfo } = useQuery({
    queryKey: ["latest-version"],
    queryFn: () => api.getLatestVersion(),
    enabled: !isDesktop,
    // Check for updates every 2 minutes
    refetchInterval: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  if (isDesktop) {
    if (!desktopUpdate?.hasUpdate) {
      return null
    }

    return (
      <>
        {!dismissed && (
          <div className={cn(
            "mb-3 rounded-md border border-green-200 bg-green-50 p-3",
            "dark:border-green-800 dark:bg-green-950/50"
          )}>
          <div className="flex items-start gap-2">
            <Download className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {t("updateBanner.desktopUpdateAvailable")}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {t("updateBanner.versionAvailable", {
                  version: desktopUpdate.tagName || `v${desktopUpdate.latestVersion}`,
                })}
              </p>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={bannerButtonClass}
                  onClick={() => {
                    setDialogOpen(true)
                  }}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  {t("updateBanner.reviewAndUpdate")}
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              onClick={() => setDismissed(true)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">{t("updateBanner.dismiss")}</span>
            </Button>
          </div>
        </div>
        )}
        <DesktopUpdateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          updateInfo={desktopUpdate}
        />
      </>
    )
  }

  return (
    <>
      {!dismissed && updateInfo && (
        <div className={cn(
          "mb-3 rounded-md border border-green-200 bg-green-50 p-3",
          "dark:border-green-800 dark:bg-green-950/50"
        )}>
          <div className="flex items-start gap-2">
            <Download className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {t("updateBanner.updateAvailable")}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {t("updateBanner.versionAvailable", { version: updateInfo.tag_name })}
              </p>
              <div className="mt-2">
                <InstallUpdateButton selfUpdate={selfUpdate} release={updateInfo} className={bannerButtonClass} />
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              onClick={() => setDismissed(true)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">{t("updateBanner.dismiss")}</span>
            </Button>
          </div>
        </div>
      )}
      <RestartOverlay state={selfUpdate.overlay} update={selfUpdate.update} />
    </>
  )
}
