/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ContainerUpdateDialog } from "@/components/ui/ContainerUpdateDialog"

const i18n = vi.hoisted(() => ({
  t: (key: string, options?: Record<string, unknown>) =>
    [key, ...Object.values(options ?? {})].join(" "),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => i18n }))

describe("ContainerUpdateDialog (BR-web-17)", () => {
  afterEach(() => {
    cleanup()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  it("renders container component list, reload requirements, and data preservation assurances", () => {
    render(
      <ContainerUpdateDialog
        open={true}
        onOpenChange={vi.fn()}
        promptDetails={{
          title: "Qui - Container Updates Available",
          message: "Updates are available for: qbittorrent-nox",
          detail: "Details",
          componentTypes: ["qbittorrent-nox"],
          reloadRequirements: ["• qbittorrent-nox: Container will restart"],
          components: [
            {
              type: "qbittorrent-nox",
              image: "lscr.io/linuxserver/qbittorrent:latest",
              description: "Recreates container with the latest image.",
              reloadRequirement: "Container will restart; torrent connections will momentarily reconnect.",
            },
          ],
        }}
      />
    )

    expect(screen.getByText(/containerUpdate\.title/)).toBeTruthy()
    expect(screen.getByText("qbittorrent-nox")).toBeTruthy()
    expect(screen.getByText(/Recreates container with the latest image/)).toBeTruthy()
    expect(screen.getByText(/torrent connections will momentarily reconnect/)).toBeTruthy()
    expect(screen.getByText(/containerUpdate\.backupNotice/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /containerUpdate\.updateNow/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: /containerUpdate\.later/ })).toBeTruthy()
  })

  it("calls window.quiDesktop.applyContainerUpdates when user confirms update", async () => {
    const applyContainerUpdates = vi.fn().mockResolvedValue({ success: true })
    window.quiDesktop = {
      applyContainerUpdates,
    }

    render(
      <ContainerUpdateDialog
        open={true}
        onOpenChange={vi.fn()}
        promptDetails={{
          title: "Qui - Container Updates Available",
          message: "Updates are available for: qui",
          detail: "Details",
          componentTypes: ["qui"],
          reloadRequirements: ["• qui: Web interface will refresh"],
        }}
      />
    )

    const updateBtn = screen.getByRole("button", { name: /containerUpdate\.updateNow/ })
    updateBtn.click()

    expect(applyContainerUpdates).toHaveBeenCalled()
    expect(await screen.findByText(/containerUpdate\.inProgress/)).toBeTruthy()
  })

  it("calls window.quiDesktop.dismissContainerUpdates when user clicks Later", async () => {
    const dismissContainerUpdates = vi.fn().mockResolvedValue({ success: true })
    const onOpenChange = vi.fn()
    window.quiDesktop = {
      dismissContainerUpdates,
    }

    render(
      <ContainerUpdateDialog
        open={true}
        onOpenChange={onOpenChange}
        promptDetails={{
          title: "Qui - Container Updates Available",
          message: "Updates are available for: qbittorrent-nox",
          detail: "Details",
          componentTypes: ["qbittorrent-nox"],
          reloadRequirements: ["• qbittorrent-nox: Container will restart"],
        }}
      />
    )

    const laterBtn = screen.getByRole("button", { name: /containerUpdate\.later/ })
    laterBtn.click()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(dismissContainerUpdates).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
