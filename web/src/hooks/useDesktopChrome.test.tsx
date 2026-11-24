/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { useDesktopChrome } from "./useDesktopChrome"

const originalUserAgent = window.navigator.userAgent

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true })
}

afterEach(() => {
  delete (window as { quiDesktop?: unknown }).quiDesktop
  setUserAgent(originalUserAgent)
})

describe("useDesktopChrome", () => {
  it("returns empty overrides in a standalone browser", () => {
    const { result } = renderHook(() => useDesktopChrome())

    expect(result.current.isDesktopMac).toBe(false)
    expect(result.current.headerHeightClassName).toBe("")
    expect(result.current.headerPaddingClassName(true)).toBe("")
    expect(result.current.dragAreaStyle).toBeUndefined()
    expect(result.current.showTrafficLightsDragRegion(true)).toBe(false)
  })

  it("keeps lg:h-12 and open-sidebar padding on desktop with the sidebar shown", () => {
    window.quiDesktop = {}
    const { result } = renderHook(() => useDesktopChrome())

    expect(result.current.headerHeightClassName).toContain("lg:h-12")
    expect(result.current.headerPaddingClassName(false)).toContain("lg:pl-2")
    expect(result.current.showTrafficLightsDragRegion(false)).toBe(false)
  })

  it("clears macOS traffic lights and drags while the sidebar is hidden", () => {
    window.quiDesktop = {}
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    const { result } = renderHook(() => useDesktopChrome())

    expect(result.current.isDesktopMac).toBe(true)
    expect(result.current.headerPaddingClassName(true)).toContain("lg:pl-20")
    expect(result.current.showTrafficLightsDragRegion(true)).toBe(true)
    expect((result.current.dragAreaStyle as Record<string, unknown>).WebkitAppRegion).toBe("drag")
  })

  it("uses lg:pl-4 without a drag region on Windows desktop while the sidebar is hidden", () => {
    window.quiDesktop = {}
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    const { result } = renderHook(() => useDesktopChrome())

    expect(result.current.headerPaddingClassName(true)).toContain("lg:pl-4")
    expect(result.current.headerPaddingClassName(true)).not.toContain("lg:pl-20")
    expect(result.current.showTrafficLightsDragRegion(true)).toBe(false)
  })
})
