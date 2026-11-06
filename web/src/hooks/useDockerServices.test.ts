/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useDockerServices } from "./useDockerServices"

describe("useDockerServices hook", () => {
  const originalQuiDesktop = window.quiDesktop

  afterEach(() => {
    window.quiDesktop = originalQuiDesktop
    vi.restoreAllMocks()
  })

  it("returns default container status and ports in container/web environment", () => {
    delete (window as { quiDesktop?: unknown }).quiDesktop
    const { result } = renderHook(() => useDockerServices())

    expect(result.current.statuses.qui.name).toBe("qui")
    expect(result.current.statuses.qui.state).toBe("running")
    expect(result.current.statuses.qui.port).toBe(7476)
    expect(result.current.statuses.qbit.name).toBe("qbittorrent-nox")
    expect(result.current.statuses.qbit.port).toBe(8080)
  })

  it("fetches and updates live container status from electron bridge when available", async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({
      qui: {
        name: "qui",
        state: "running",
        status: "Up 3 hours",
        image: "qui-desktop:local",
        port: 7476,
      },
      qbit: {
        name: "qbittorrent-nox",
        state: "stopped",
        status: "Exited (0)",
        image: "lscr.io/linuxserver/qbittorrent:latest",
        port: 8080,
      },
    })

    window.quiDesktop = {
      getDockerStatus: mockGetStatus,
    }

    const { result } = renderHook(() => useDockerServices())

    await act(async () => {
      await result.current.refreshStatus()
    })

    expect(mockGetStatus).toHaveBeenCalled()
    expect(result.current.statuses.qbit.state).toBe("stopped")
  })

  it("invokes saveQuiConfig and saveQBitConfig through bridge", async () => {
    const mockSaveQui = vi.fn().mockResolvedValue({ success: true })
    const mockSaveQBit = vi.fn().mockResolvedValue({ success: true })

    window.quiDesktop = {
      saveQuiConfig: mockSaveQui,
      saveQBitConfig: mockSaveQBit,
    }

    const { result } = renderHook(() => useDockerServices())

    await act(async () => {
      await result.current.saveQuiConfig({
        port: 7480,
        configPath: "/qui/config",
        restartPolicy: "unless-stopped",
        image: "qui-desktop:local",
      })
    })

    expect(mockSaveQui).toHaveBeenCalledWith(
      expect.objectContaining({ port: 7480 })
    )

    await act(async () => {
      await result.current.saveQBitConfig({
        port: 8090,
        peerPort: 6881,
        configPath: "/qbit/config",
        downloadsPath: "/qbit/downloads",
        restartPolicy: "unless-stopped",
        image: "lscr.io/linuxserver/qbittorrent:latest",
      })
    })

    expect(mockSaveQBit).toHaveBeenCalledWith(
      expect.objectContaining({ port: 8090 })
    )
  })
})
