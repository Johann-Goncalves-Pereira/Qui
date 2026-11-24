/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import { DesktopUpdateDialog } from "@/components/ui/DesktopUpdateDialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDesktopUpdateDialogRequest } from "@/hooks/useDesktopUpdateDialogRequest"
import { useUpdateBannerDismissed } from "@/hooks/useUpdateBannerDismissed"
import { cn, collapseRowClassName } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Download, X } from "lucide-react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

const bannerButtonClass = "h-6 text-xs border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"

export function DesktopUpdateBanner({ iconOnly = false }: { iconOnly?: boolean }) {
  const { t } = useTranslation(["desktop", "common"])
  const [dismissed, dismiss] = useUpdateBannerDismissed()
  const [dialogOpen, setDialogOpen] = useState(false)
  const openDialog = useCallback(() => setDialogOpen(true), [])

  const { data: desktopUpdate } = useQuery({
    queryKey: ["desktop-latest-update"],
    queryFn: async () => {
      if (typeof window === "undefined" || !window.quiDesktop?.checkForUpdates) {
        return null
      }
      return await window.quiDesktop.checkForUpdates()
    },
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  useDesktopUpdateDialogRequest(openDialog)

  if (!desktopUpdate?.hasUpdate) {
    return null
  }

  const desktopVersion = desktopUpdate.tagName || `v${desktopUpdate.latestVersion}`

  return (
    <>
      {!dismissed && (
        <div>
          <div inert={iconOnly} className={collapseRowClassName(iconOnly)}>
            <div className="min-h-0 overflow-hidden">
              <div className={cn(
                "mb-3 rounded-md border border-green-200 bg-green-50 p-3",
                "dark:border-green-800 dark:bg-green-950/50",
                iconOnly && "w-58"
              )}>
                <div className="flex items-start gap-2">
                  <Download className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {t("desktop:updateBanner.desktopUpdateAvailable")}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {t("common:updateBanner.versionAvailable", { version: desktopVersion })}
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
                        {t("desktop:updateBanner.reviewAndUpdate")}
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                    onClick={dismiss}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">{t("common:updateBanner.dismiss")}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div inert={!iconOnly} className={collapseRowClassName(!iconOnly)}>
            <div className="min-h-0 overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("desktop:updateBanner.desktopUpdateAvailable")}
                    onClick={() => setDialogOpen(true)}
                    className="mb-3 flex h-8 w-full items-center rounded-md px-3 text-green-600 -outline-offset-2 hover:bg-sidebar-accent dark:text-green-400 short:h-7"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {t("desktop:updateBanner.desktopUpdateAvailable")}
                  <span className="block opacity-70">{t("common:updateBanner.versionAvailable", { version: desktopVersion })}</span>
                </TooltipContent>
              </Tooltip>
            </div>
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
