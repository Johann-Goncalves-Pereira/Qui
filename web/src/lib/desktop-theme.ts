/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { Theme } from "@/config/themes"
import { applyGlassOpacity, readGlassOpacity } from "@/lib/glass"

/** Fork theme side-effects after an upstream applyTheme paint. */
export function onThemeApplied(theme: Theme, effectiveIsDark: boolean): void {
  applyGlassOpacity(readGlassOpacity())
  if (typeof window !== "undefined" && window.quiDesktop?.syncTheme) {
    void window.quiDesktop
      .syncTheme({
        id: theme.id,
        name: theme.name,
        isDark: effectiveIsDark,
        cssVars: theme.cssVars,
        rawCss: theme.rawCss,
      })
      .catch(() => {})
  }
}
