/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import "@/i18n"
import { TooltipProvider } from "@/components/ui/tooltip"
import { VPN_PRIVACY_DOCS_URL, VpnSettingsCard } from "./VpnSettingsCard"

function renderVpnCard() {
  return render(
    <TooltipProvider>
      <VpnSettingsCard />
    </TooltipProvider>,
  )
}

describe("VpnSettingsCard (BR-desktop-53)", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  it("renders null when window.quiDesktop.saveVpnConfig is undefined", () => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    const { container } = renderVpnCard()
    expect(container.firstChild).toBeNull()
  })

  it("exposes a How to enable link to the GitHub vpn-privacy docs page", () => {
    window.quiDesktop = {
      saveVpnConfig: vi.fn(),
      getVpnConfig: vi.fn().mockResolvedValue(null),
      getVpnStatus: vi.fn().mockResolvedValue({
        name: "qui-vpn",
        state: "stopped",
        status: "stopped",
        image: "qmcgaw/gluetun:latest",
        port: 0,
      }),
    }

    renderVpnCard()

    const link = screen.getByRole("link", { name: /how to enable/i })
    expect(link.getAttribute("href")).toBe(VPN_PRIVACY_DOCS_URL)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(VPN_PRIVACY_DOCS_URL).toContain("docs/desktop/vpn-privacy.md")
  })
})
