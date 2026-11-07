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
  getAppVersion: () => "0.0.0",
}))

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <StatusBarFooter />
    </TooltipProvider>
  )
}

describe("StatusBarFooter component (BR-web-03, BR-web-07)", () => {
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

  it("renders container indicator buttons with ports and relocated bare version metadata", () => {
    renderWithProviders()

    expect(screen.getByText("qui:7476")).toBeDefined()
    expect(screen.getByText("qbittorrent:8080")).toBeDefined()
    expect(screen.getByText("0.0.0")).toBeDefined()
    expect(screen.queryByText(/Version/)).toBeNull()
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

  it("renders Gazelle container indicator when companion is running and launches WebUI on click (BR-web-14)", async () => {
    const openWebUiMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("quiDesktop", {
      getDockerStatus: vi.fn().mockResolvedValue({
        qui: { name: "qui", state: "running", status: "running", image: "qui-desktop:local", port: 7476 },
        qbit: { name: "qbittorrent-nox", state: "running", status: "running", image: "qbittorrent", port: 8080 },
        gazelle: { name: "gazelle", state: "running", status: "running", image: "gazelle-desktop:local", port: 7001 },
      }),
      gazelle: {
        openWebUi: openWebUiMock,
      },
    })

    renderWithProviders()

    const gazelleBtn = await screen.findByText("gazelle:7001")
    expect(gazelleBtn).toBeDefined()

    await act(async () => {
      fireEvent.click(gazelleBtn.closest("button")!)
    })

    expect(openWebUiMock).toHaveBeenCalledTimes(1)
  })
})

