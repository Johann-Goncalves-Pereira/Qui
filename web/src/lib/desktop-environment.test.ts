/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { isDesktopEnvironment as isDesktopFromCompanion } from "./desktop-companion-instance"
import { isDesktopEnvironment, useIsDesktop } from "./desktop-environment"

describe("desktop environment (BR-desktop-57)", () => {
  beforeEach(() => {
    delete (window as { quiDesktop?: unknown }).quiDesktop
  })

  it("is false in a standalone browser", () => {
    expect(isDesktopEnvironment()).toBe(false)
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false)
  })

  it("is true when the desktop shell exposes window.quiDesktop", () => {
    window.quiDesktop = {}
    expect(isDesktopEnvironment()).toBe(true)
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true)
  })

  it("stays re-exported from the companion module", () => {
    expect(isDesktopFromCompanion).toBe(isDesktopEnvironment)
  })
})
