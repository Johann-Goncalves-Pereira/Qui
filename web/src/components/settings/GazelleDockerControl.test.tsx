/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GazelleDockerControl } from "./GazelleDockerControl"

describe("GazelleDockerControl (BR-desktop-15)", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
  })

  it("renders null when window.quiDesktop is undefined (standalone browser fallback)", () => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    const { container } = render(<GazelleDockerControl />)
    expect(container.firstChild).toBeNull()
  })

  it("renders not installed state and initiates install/start", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      name: "gazelle",
      state: "not_found",
      status: "not_installed",
      image: "gazelle-desktop:local",
      port: 7001,
    })
    const start = vi.fn().mockResolvedValue({
      name: "gazelle",
      state: "running",
      status: "running",
      image: "gazelle-desktop:local",
      port: 7001,
    })

    window.quiDesktop = {
      gazelle: {
        getStatus,
        start,
      },
    }

    await act(async () => {
      render(<GazelleDockerControl />)
    })

    expect(screen.getByText("Gazelle Docker Companion")).toBeDefined()
    expect(screen.getByText("Not Installed")).toBeDefined()

    const installButton = screen.getByRole("button", { name: /install & run gazelle/i })
    expect(installButton).toBeDefined()

    await act(async () => {
      fireEvent.click(installButton)
    })

    expect(start).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Running (:7001)")).toBeDefined()
  })

  it("renders running state with action buttons and opens web UI", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      name: "gazelle",
      state: "running",
      status: "running",
      image: "gazelle-desktop:local",
      port: 7001,
    })
    const stop = vi.fn().mockResolvedValue({
      name: "gazelle",
      state: "stopped",
      status: "stopped",
      image: "gazelle-desktop:local",
      port: 7001,
    })
    const restart = vi.fn().mockResolvedValue({
      name: "gazelle",
      state: "running",
      status: "running",
      image: "gazelle-desktop:local",
      port: 7001,
    })
    const openWebUi = vi.fn().mockResolvedValue(undefined)

    window.quiDesktop = {
      gazelle: {
        getStatus,
        stop,
        restart,
        openWebUi,
      },
    }

    await act(async () => {
      render(<GazelleDockerControl />)
    })

    expect(screen.getByText("Running (:7001)")).toBeDefined()

    const openWebBtn = screen.getByRole("button", { name: /open webui/i })
    const restartBtn = screen.getByRole("button", { name: /restart/i })
    const stopBtn = screen.getByRole("button", { name: /stop/i })

    expect(openWebBtn).toBeDefined()
    expect(restartBtn).toBeDefined()
    expect(stopBtn).toBeDefined()

    await act(async () => {
      fireEvent.click(openWebBtn)
    })
    expect(openWebUi).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(restartBtn)
    })
    expect(restart).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(stopBtn)
    })
    expect(stop).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Stopped")).toBeDefined()
  })
})
