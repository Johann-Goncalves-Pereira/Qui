/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DesktopUpdateDialog } from "@/components/ui/DesktopUpdateDialog"

const i18n = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    [key, ...Object.values(options ?? {})].join(" "),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => i18n }))

describe("DesktopUpdateDialog (BR-web-15)", () => {
  afterEach(() => {
    cleanup()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  it("renders release changelog notes and data preservation assurances", () => {
    render(
      <DesktopUpdateDialog
        open={true}
        onOpenChange={vi.fn()}
        updateInfo={{
          hasUpdate: true,
          currentVersion: "0.0.15",
          latestVersion: "0.0.16",
          tagName: "v0.0.16",
          name: "Qui v0.0.16",
          body: "## What's Changed\n* Fix: Gazelle Companion Lifecycle\n* Fix: Electronmon SIGSEGV Crash",
        }}
      />
    )

    expect(screen.getByText(/desktopUpdate\.title/)).toBeTruthy()
    expect(screen.getAllByText(/v0\.0\.16/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Fix: Gazelle Companion Lifecycle/i)).toBeTruthy()
    expect(screen.getByText(/desktopUpdate\.backupNotice/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /desktopUpdate\.downloadAndUpdate/ })).toBeTruthy()
  })

  it("calls window.quiDesktop.applyUpdate when user confirms update", async () => {
    const applyUpdate = vi.fn().mockResolvedValue({ success: true })
    window.quiDesktop = {
      applyUpdate,
    }

    render(
      <DesktopUpdateDialog
        open={true}
        onOpenChange={vi.fn()}
        updateInfo={{
          hasUpdate: true,
          currentVersion: "0.0.15",
          latestVersion: "0.0.16",
          tagName: "v0.0.16",
          name: "Qui v0.0.16",
          body: "## What's Changed\n* Bug fix",
        }}
      />
    )

    const updateBtn = screen.getByRole("button", { name: /desktopUpdate\.downloadAndUpdate/ })
    updateBtn.click()

    expect(applyUpdate).toHaveBeenCalledWith("0.0.16")
    expect(await screen.findByText(/desktopUpdate\.inProgress/)).toBeTruthy()
  })
})
