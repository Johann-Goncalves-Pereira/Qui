/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DesktopUpdateDialog, type DesktopUpdateInfo } from "@/components/ui/DesktopUpdateDialog"
import {
  ContainerUpdateDialog,
  type ContainerUpdatePromptDetails,
} from "@/components/ui/ContainerUpdateDialog"
import { isUpdateBannerMounted } from "@/lib/desktop-update-state"

export function DesktopUpdateHost() {
  const isDesktop = typeof window !== "undefined" && window.quiDesktop !== undefined
  const [appUpdateInfo, setAppUpdateInfo] = useState<DesktopUpdateInfo | null>(null)
  const [appDialogOpen, setAppDialogOpen] = useState(false)

  const [containerPrompt, setContainerPrompt] = useState<ContainerUpdatePromptDetails | null>(null)
  const [containerDialogOpen, setContainerDialogOpen] = useState(false)

  useEffect(() => {
    if (!isDesktop || !window.quiDesktop) {
      return
    }

    const unsubApp = window.quiDesktop.onShowUpdateDialog?.((info) => {
      // If the sidebar UpdateBanner is not mounted (e.g. on /setup, /login, or unauthenticated views), host the dialog here
      if (info?.hasUpdate && !isUpdateBannerMounted()) {
        setAppUpdateInfo(info)
        setAppDialogOpen(true)
      }
    })

    const unsubContainer = window.quiDesktop.onShowContainerUpdateDialog?.((details) => {
      if (details) {
        setContainerPrompt(details as ContainerUpdatePromptDetails)
        setContainerDialogOpen(true)
      }
    })

    const unsubStatus = window.quiDesktop.onUpdateStatus?.((status) => {
      if (!status?.message) return
      if (status.type === "success") {
        toast.success(status.message, { description: status.detail })
      } else if (status.type === "error") {
        toast.error(status.message, { description: status.detail })
      } else {
        toast.info(status.message, { description: status.detail })
      }
    })

    return () => {
      unsubApp?.()
      unsubContainer?.()
      unsubStatus?.()
    }
  }, [isDesktop])

  if (!isDesktop) {
    return null
  }

  return (
    <>
      {appUpdateInfo && (
        <DesktopUpdateDialog
          open={appDialogOpen}
          onOpenChange={setAppDialogOpen}
          updateInfo={appUpdateInfo}
        />
      )}
      {containerPrompt && (
        <ContainerUpdateDialog
          open={containerDialogOpen}
          onOpenChange={setContainerDialogOpen}
          promptDetails={containerPrompt}
        />
      )}
    </>
  )
}
