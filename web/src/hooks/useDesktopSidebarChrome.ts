/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect } from "react"

import { isDesktopEnvironment } from "@/lib/desktop-environment"

/** Lines macOS traffic lights up with the docked sidebar logo while that sidebar shows. */
export function useDesktopSidebarChrome(sidebarVisible: boolean): void {
  useEffect(() => {
    if (!isDesktopEnvironment()) {
      return
    }
    const applyChrome = () => {
      const setSidebarChrome = window.quiDesktop?.setSidebarChrome
      if (setSidebarChrome) {
        void setSidebarChrome(sidebarVisible)
      }
    }
    applyChrome()
    const timer = setTimeout(applyChrome, 100)
    return () => {
      clearTimeout(timer)
      const setSidebarChrome = window.quiDesktop?.setSidebarChrome
      if (setSidebarChrome) {
        void setSidebarChrome(false)
      }
    }
  }, [sidebarVisible])
}
