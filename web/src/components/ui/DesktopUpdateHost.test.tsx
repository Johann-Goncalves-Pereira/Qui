/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DesktopUpdateHost } from "@/components/ui/DesktopUpdateHost"
import { setUpdateBannerMounted } from "@/lib/desktop-update-state"

const i18n = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    [key, ...Object.values(options ?? {})].join(" "),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => i18n }))
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("DesktopUpdateHost (BR-web-17)", () => {
  beforeEach(() => {
    setUpdateBannerMounted(false)
    vi.clearAllMocks()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  afterEach(() => {
    cleanup()
    setUpdateBannerMounted(false)
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  it("renders null in standalone browser mode when quiDesktop is absent", () => {
    const { container } = render(<DesktopUpdateHost />)
    expect(container.firstChild).toBeNull()
  })

  it("subscribes to onShowContainerUpdateDialog and opens ContainerUpdateDialog on all routes", async () => {
    let containerCallback: any = null

    window.quiDesktop = {
      onShowContainerUpdateDialog: vi.fn().mockImplementation((cb) => {
        containerCallback = cb
        return () => {}
      }),
    }

    render(<DesktopUpdateHost />)

    containerCallback?.({
      title: "Qui - Container Updates Available",
      message: "Updates are available for: qbittorrent-nox",
      detail: "Details",
      componentTypes: ["qbittorrent-nox"],
      reloadRequirements: ["• qbittorrent-nox: Container will restart"],
    })

    expect(await screen.findByText(/containerUpdate\.title/)).toBeTruthy()
    expect(screen.getByText("qbittorrent-nox")).toBeTruthy()
  })

  it("subscribes to onShowUpdateDialog and opens DesktopUpdateDialog when UpdateBanner is unmounted (e.g. on /setup or /login)", async () => {
    let appCallback: any = null

    window.quiDesktop = {
      onShowUpdateDialog: vi.fn().mockImplementation((cb) => {
        appCallback = cb
        return () => {}
      }),
    }

    render(<DesktopUpdateHost />)

    appCallback?.({
      hasUpdate: true,
      currentVersion: "0.0.19",
      latestVersion: "0.0.20",
      tagName: "v0.0.20",
      name: "Qui v0.0.20",
      body: "Changelog",
    })

    expect(await screen.findByText(/desktopUpdate\.title/)).toBeTruthy()
    expect(screen.getByText("Changelog")).toBeTruthy()
  })

  it("does not duplicate DesktopUpdateDialog if UpdateBanner is already mounted in sidebar", () => {
    let appCallback: any = null

    setUpdateBannerMounted(true)

    window.quiDesktop = {
      onShowUpdateDialog: vi.fn().mockImplementation((cb) => {
        appCallback = cb
        return () => {}
      }),
    }

    render(<DesktopUpdateHost />)

    appCallback?.({
      hasUpdate: true,
      currentVersion: "0.0.19",
      latestVersion: "0.0.20",
    })

    expect(screen.queryByText(/desktopUpdate\.title/)).toBeNull()
  })

  it("subscribes to onUpdateStatus and triggers in-app toast notifications", () => {
    let statusCallback: any = null

    window.quiDesktop = {
      onUpdateStatus: vi.fn().mockImplementation((cb) => {
        statusCallback = cb
        return () => {}
      }),
    }

    render(<DesktopUpdateHost />)

    statusCallback?.({
      type: "info",
      message: "Qui Desktop is up to date (v0.0.20).",
      detail: "All components running latest version.",
    })

    expect(toast.info).toHaveBeenCalledWith("Qui Desktop is up to date (v0.0.20).", {
      description: "All components running latest version.",
    })
  })
})
