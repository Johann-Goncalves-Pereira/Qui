/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import "@/i18n"

import { GlassOpacityControl } from "@/components/themes/GlassOpacityControl"
import { GLASS_DEFAULT_PERCENT, GLASS_SOLID_PERCENT } from "@/lib/glass"

const licenseState = vi.hoisted(() => ({
  hasPremiumAccess: false,
  isLoading: false,
}))

vi.mock("@/hooks/useLicense.ts", () => ({
  useHasPremiumAccess: () => ({
    hasPremiumAccess: licenseState.hasPremiumAccess,
    isLoading: licenseState.isLoading,
    isError: false,
  }),
}))

const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: mockToast,
}))

describe("GlassOpacityControl premium gating", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    licenseState.hasPremiumAccess = false
    licenseState.isLoading = false
  })

  afterEach(() => {
    cleanup()
  })

  it("disables switch and slider when user has no premium license in settings layout", () => {
    render(<GlassOpacityControl layout="settings" />)

    const premiumBadge = screen.getByText("Premium")
    expect(premiumBadge).toBeDefined()
    const toggleSwitch = screen.getByRole("switch")
    expect(toggleSwitch.hasAttribute("disabled")).toBe(true)

    const slider = screen.getByRole("slider")
    expect(slider.hasAttribute("disabled")).toBe(true)

    // Attempting to interact should show error toast
    fireEvent.click(premiumBadge)
    expect(mockToast.error).toHaveBeenCalled()
  })

  it("disables menu button and shows lock when user has no premium license in menu layout", () => {
    render(<GlassOpacityControl layout="menu" />)

    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(mockToast.error).toHaveBeenCalled()
  })

  it("enables controls and allows toggling when user has premium license", () => {
    licenseState.hasPremiumAccess = true
    render(<GlassOpacityControl layout="settings" />)

    expect(screen.queryByText("Premium")).toBeNull()
    const toggleSwitch = screen.getByRole("switch")
    expect(toggleSwitch.hasAttribute("disabled")).toBe(false)

    // Initial state is solid / off
    expect(toggleSwitch.getAttribute("aria-checked")).toBe("false")

    // Clicking switch toggles it on
    act(() => {
      fireEvent.click(toggleSwitch)
    })
    expect(toggleSwitch.getAttribute("aria-checked")).toBe("true")
  })

  it("resets glass opacity to solid if unlicensed when glass was previously on", () => {
    localStorage.setItem("qui-glassmorphism", String(GLASS_DEFAULT_PERCENT))
    licenseState.hasPremiumAccess = false

    render(<GlassOpacityControl layout="settings" />)

    expect(localStorage.getItem("qui-glassmorphism")).toBe(String(GLASS_SOLID_PERCENT))
  })
})
