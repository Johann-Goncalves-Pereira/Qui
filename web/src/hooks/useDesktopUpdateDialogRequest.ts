/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect } from "react"

import { isDesktopEnvironment } from "@/lib/desktop-environment"

export function useDesktopUpdateDialogRequest(onRequest: () => void): void {
  useEffect(() => {
    if (!isDesktopEnvironment()) {
      return
    }
    const unsubscribe = window.quiDesktop?.onShowUpdateDialog?.((info) => {
      if (info?.hasUpdate) {
        onRequest()
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [onRequest])
}
