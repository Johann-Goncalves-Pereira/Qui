/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { afterEach, describe, expect, it, vi } from "vitest"

import type { Theme } from "@/config/themes"
import { onThemeApplied } from "@/lib/desktop-theme"

vi.mock("@/lib/glass", () => ({
  applyGlassOpacity: vi.fn(),
  readGlassOpacity: vi.fn(() => 60),
}))

describe("onThemeApplied", () => {
  afterEach(() => {
    delete (window as { quiDesktop?: unknown }).quiDesktop
    vi.clearAllMocks()
  })

  it("applies glass opacity and syncs theme to the desktop bridge when present", async () => {
    const { applyGlassOpacity, readGlassOpacity } = await import("@/lib/glass")
    const syncTheme = vi.fn().mockResolvedValue(undefined)
    ;(window as { quiDesktop?: { syncTheme: typeof syncTheme } }).quiDesktop = { syncTheme }

    const theme = {
      id: "test",
      name: "Test",
      cssVars: {},
      rawCss: "",
    } as Theme

    onThemeApplied(theme, true)

    expect(readGlassOpacity).toHaveBeenCalled()
    expect(applyGlassOpacity).toHaveBeenCalledWith(60)
    expect(syncTheme).toHaveBeenCalledWith({
      id: "test",
      name: "Test",
      isDark: true,
      cssVars: {},
      rawCss: "",
    })
  })
})
