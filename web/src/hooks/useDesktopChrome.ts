/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { CSSProperties } from "react"

import { useIsDesktop } from "@/lib/desktop-environment"

export interface DesktopChrome {
  isDesktopMac: boolean
  headerHeightClassName: string
  headerPaddingClassName: (sidebarHidden: boolean) => string
  dragAreaStyle: CSSProperties | undefined
  showTrafficLightsDragRegion: (sidebarHidden: boolean) => boolean
}

const browserChrome: DesktopChrome = {
  isDesktopMac: false,
  headerHeightClassName: "",
  headerPaddingClassName: () => "",
  dragAreaStyle: undefined,
  showTrafficLightsDragRegion: () => false,
}

/** Desktop-only header chrome (traffic lights, drag region, h-12). Browser gets empty overrides. */
export function useDesktopChrome(): DesktopChrome {
  const isDesktop = useIsDesktop()
  if (!isDesktop) {
    return browserChrome
  }
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const isDesktopMac = isMac
  return {
    isDesktopMac,
    headerHeightClassName: "lg:h-12",
    headerPaddingClassName: (sidebarHidden) =>
      sidebarHidden ? (isDesktopMac ? "lg:pl-20" : "lg:pl-4") : "lg:pl-2",
    dragAreaStyle: isDesktopMac
      ? ({ WebkitAppRegion: "drag" } as CSSProperties)
      : undefined,
    showTrafficLightsDragRegion: (sidebarHidden) => isDesktopMac && sidebarHidden,
  }
}
