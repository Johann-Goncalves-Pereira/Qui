/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { changeLanguage, initI18n } from "@/i18n"
import { TooltipProvider } from "@/components/ui/tooltip"
import { StatusBarFooter } from "./StatusBarFooter"

const mockMobileScroll = { isFooterVisible: false, setScrollContainer: vi.fn() }

vi.mock("@/contexts/MobileScrollContext", () => ({
  useMobileScroll: () => mockMobileScroll,
}))

vi.mock("@/lib/build-info", () => ({
  getAppVersion: () => "desktop-local",
}))

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <StatusBarFooter />
    </TooltipProvider>
  )
}

describe("StatusBarFooter component (BR-web-03)", () => {
  beforeEach(async () => {
    await initI18n()
    await changeLanguage("en")
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders container indicator buttons with ports and relocated version metadata", () => {
    renderWithProviders()

    expect(screen.getByText("qui:7476")).toBeDefined()
    expect(screen.getByText("qbittorrent:8080")).toBeDefined()
    expect(screen.getByText("Version desktop-local")).toBeDefined()
    expect(screen.getByText(/autobrr/)).toBeDefined()
  })

  it("opens Qui configuration dialog upon clicking qui button", async () => {
    renderWithProviders()

    const quiBtn = screen.getByText("qui:7476").closest("button")
    expect(quiBtn).not.toBeNull()

    await act(async () => {
      if (quiBtn) fireEvent.click(quiBtn)
    })

    expect(screen.getByText("Qui Container Configuration")).toBeDefined()
  })

  it("opens qBittorrent configuration dialog upon clicking qbittorrent button", async () => {
    renderWithProviders()

    const qbitBtn = screen.getByText("qbittorrent:8080").closest("button")
    expect(qbitBtn).not.toBeNull()

    await act(async () => {
      if (qbitBtn) fireEvent.click(qbitBtn)
    })

    expect(screen.getByText("qBittorrent-nox Container Configuration")).toBeDefined()
  })

  it("renders streamlined icon-dot-port indicators without green box borders (BR-web-03)", () => {
    renderWithProviders()

    const quiBtn = screen.getByText("qui:7476").closest("button")
    const qbitBtn = screen.getByText("qbittorrent:8080").closest("button")

    expect(quiBtn?.className).not.toContain("border-emerald-500")
    expect(quiBtn?.className).not.toContain("bg-emerald-500/5")
    expect(qbitBtn?.className).not.toContain("border-emerald-500")
    expect(qbitBtn?.className).not.toContain("bg-emerald-500/5")
  })
})
