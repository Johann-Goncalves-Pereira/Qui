/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { DesktopUpdateBanner } from "@/components/ui/DesktopUpdateBanner"

const i18n = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) => [key, ...Object.values(options ?? {})].join(" "),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => i18n }))

describe("DesktopUpdateBanner (BR-desktop-57)", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    cleanup()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DesktopUpdateBanner />
        </TooltipProvider>
      </QueryClientProvider>
    )
  }

  it("renders nothing when the desktop shell reports no update", async () => {
    window.quiDesktop = {
      getAppVersion: () => "0.0.7",
      checkForUpdates: vi.fn().mockResolvedValue({ hasUpdate: false }),
    }
    const { container } = renderComponent()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.firstChild).toBeNull()
  })

  it("renders desktop update banner and opens in-app DesktopUpdateDialog when review is clicked", async () => {
    window.quiDesktop = {
      getAppVersion: () => "0.0.14",
      checkForUpdates: vi.fn().mockResolvedValue({
        hasUpdate: true,
        currentVersion: "0.0.14",
        latestVersion: "0.0.15",
        tagName: "v0.0.15",
        name: "Qui v0.0.15",
        body: "## What's Changed\n* New features",
      }),
    }

    renderComponent()
    expect(await screen.findByText(/updateBanner\.desktopUpdateAvailable/)).toBeTruthy()
    expect(screen.getByText(/updateBanner\.versionAvailable/)).toBeTruthy()

    const updateBtn = screen.getByText(/updateBanner\.reviewAndUpdate/)
    updateBtn.click()

    expect(await screen.findByText(/desktopUpdate\.title/)).toBeTruthy()
    expect(screen.getByText(/New features/)).toBeTruthy()
  })

  it("opens DesktopUpdateDialog when onShowUpdateDialog listener triggers (BR-desktop-44)", async () => {
    let dialogCallback: ((info: unknown) => void) | null = null
    window.quiDesktop = {
      getAppVersion: () => "0.0.19",
      checkForUpdates: vi.fn().mockResolvedValue({
        hasUpdate: true,
        currentVersion: "0.0.19",
        latestVersion: "0.0.20",
        tagName: "v0.0.20",
        name: "Qui v0.0.20",
        body: "## What's Changed\n* Automated Homebrew upgrade",
      }),
      onShowUpdateDialog: vi.fn().mockImplementation((cb) => {
        dialogCallback = cb
        return () => {}
      }),
    }

    renderComponent()
    expect(await screen.findByText(/updateBanner\.desktopUpdateAvailable/)).toBeTruthy()

    dialogCallback?.({ hasUpdate: true })

    expect(await screen.findByText(/desktopUpdate\.title/)).toBeTruthy()
    expect(screen.getByText(/Automated Homebrew upgrade/)).toBeTruthy()
  })
})
