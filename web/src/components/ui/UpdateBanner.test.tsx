/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type AnyRouter, createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { UpdateBanner } from "@/components/ui/UpdateBanner"
import { server } from "@/test/msw/server"

const i18n = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) => [key, ...Object.values(options ?? {})].join(" "),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => i18n }))

describe("UpdateBanner desktop suppression", () => {
  let queryClient: QueryClient
  let router: AnyRouter

  beforeEach(() => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory({ initialEntries: ["/"] }) })

    server.use(
      http.get("*/api/version/latest", () => {
        return HttpResponse.json({
          tag_name: "v1.35.0",
          html_url: "https://github.com/autobrr/qui/releases/tag/v1.35.0",
          published_at: "2026-11-01T00:00:00Z",
        })
      }),
      http.get("*/api/version", () => {
        return HttpResponse.json({
          version: "1.30.0",
          updateAvailable: true,
          selfUpdate: true,
          selfUpdateUnavailableReason: "",
          restart: true,
        })
      })
    )
  })

  afterEach(() => {
    cleanup()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  function renderComponent() {
    return render(
      <RouterContextProvider router={router}>
        <QueryClientProvider client={queryClient}>
          <UpdateBanner />
        </QueryClientProvider>
      </RouterContextProvider>
    )
  }

  it("renders update banner in standalone browser mode when update is available", async () => {
    renderComponent()
    expect(await screen.findByText("updateBanner.updateAvailable")).toBeTruthy()
    expect(screen.getByText("updateBanner.versionAvailable v1.35.0")).toBeTruthy()
  })

  it("suppresses update banner completely when running in desktop shell (window.quiDesktop present) and no update available", async () => {
    window.quiDesktop = {
      getAppVersion: () => "0.0.7",
      checkForUpdates: vi.fn().mockResolvedValue({ hasUpdate: false }),
    }
    const { container } = renderComponent()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText("updateBanner.updateAvailable")).toBeNull()
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
})
