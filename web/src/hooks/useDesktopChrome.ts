/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { CSSProperties } from "react"

import { useIsDesktop } from "@/lib/desktop-environment"
import { windowDragStyle } from "@/lib/desktop-window-drag"
import { cn } from "@/lib/utils"

export interface DesktopChrome {
  headerClassName: string | undefined
  style: CSSProperties | undefined
  logoOnly: boolean
  showTrafficLightsDragRegion: boolean
}

const browserChrome: DesktopChrome = {
  headerClassName: undefined,
  style: undefined,
  logoOnly: false,
  showTrafficLightsDragRegion: false,
}

export function useDesktopChrome({ sidebarHidden }: { sidebarHidden: boolean }): DesktopChrome {
  const isDesktop = useIsDesktop()
  if (!isDesktop) {
    return browserChrome
  }
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  return {
    headerClassName: cn(
      "transition-[padding] duration-300 ease-out lg:h-12",
      sidebarHidden ? (isMac ? "lg:pl-20" : "lg:pl-4") : "lg:pl-2"
    ),
    style: isMac ? windowDragStyle : undefined,
    logoOnly: sidebarHidden,
    showTrafficLightsDragRegion: isMac && sidebarHidden,
  }
}
