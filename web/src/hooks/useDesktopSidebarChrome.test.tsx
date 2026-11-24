/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDesktopSidebarChrome } from "./useDesktopSidebarChrome"

describe("useDesktopSidebarChrome", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as { quiDesktop?: unknown }).quiDesktop
  })

  it("does nothing without the desktop bridge", () => {
    expect(() => renderHook(() => useDesktopSidebarChrome(true)).unmount()).not.toThrow()
  })

  it("applies, re-applies after 100 ms, and resets on unmount", () => {
    const setSidebarChrome = vi.fn().mockResolvedValue(undefined)
    window.quiDesktop = { setSidebarChrome }

    const { unmount } = renderHook(() => useDesktopSidebarChrome(true))
    expect(setSidebarChrome).toHaveBeenCalledTimes(1)
    expect(setSidebarChrome).toHaveBeenLastCalledWith(true)

    vi.advanceTimersByTime(100)
    expect(setSidebarChrome).toHaveBeenCalledTimes(2)
    expect(setSidebarChrome).toHaveBeenLastCalledWith(true)

    unmount()
    expect(setSidebarChrome).toHaveBeenLastCalledWith(false)
  })

  it("reports a hidden sidebar as false and follows visibility changes", () => {
    const setSidebarChrome = vi.fn().mockResolvedValue(undefined)
    window.quiDesktop = { setSidebarChrome }

    const { rerender } = renderHook(
      ({ visible }) => useDesktopSidebarChrome(visible),
      { initialProps: { visible: false } }
    )
    expect(setSidebarChrome).toHaveBeenLastCalledWith(false)

    rerender({ visible: true })
    expect(setSidebarChrome).toHaveBeenLastCalledWith(true)
  })
})
