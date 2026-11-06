/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useInstances } from "./useInstances"
import { api } from "@/lib/api"
import { resetProvisioningState } from "@/lib/desktop-companion-instance"
import { DEFAULT_REANNOUNCE_SETTINGS } from "@/lib/instance-validation"

vi.mock("@/lib/api", () => ({
  api: {
    getInstances: vi.fn(),
    createInstance: vi.fn(),
    testConnection: vi.fn(),
    updateInstance: vi.fn(),
    deleteInstance: vi.fn(),
    updateInstanceStatus: vi.fn(),
    reorderInstances: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useInstances auto-provisioning hook (BR-web-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetProvisioningState()
    delete (window as { quiDesktop?: unknown }).quiDesktop
  })

  it("does not auto-provision when running in a standalone web browser", async () => {
    vi.mocked(api.getInstances).mockResolvedValue([])

    const { result } = renderHook(() => useInstances(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(api.createInstance).not.toHaveBeenCalled()
  })

  it("auto-provisions default companion instance in desktop environment when instance list is empty", async () => {
    window.quiDesktop = {
      requestTouchId: async () => ({ success: true }),
    }
    vi.mocked(api.getInstances).mockResolvedValue([])
    vi.mocked(api.createInstance).mockResolvedValue({
      id: 1,
      name: "Local qBittorrent",
      host: "http://host.docker.internal:8080",
      username: "admin",
      tlsSkipVerify: false,
      hasLocalFilesystemAccess: true,
      useHardlinks: false,
      hardlinkBaseDir: "",
      hardlinkDirPreset: "flat",
      useReflinks: false,
      fallbackToRegularMode: true,
      sortOrder: 0,
      isActive: true,
      connected: true,
      hasDecryptionError: false,
      filesystemMode: "local",
      capabilities: {
        read: true,
        identity: true,
        trustedIdentity: true,
        write: true,
        content: true,
      },
      connectionStatus: "connected",
      reannounceSettings: DEFAULT_REANNOUNCE_SETTINGS,
    })
    vi.mocked(api.testConnection).mockResolvedValue({ connected: true, message: "Connected successfully" })

    renderHook(() => useInstances(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(api.createInstance).toHaveBeenCalledTimes(1)
    })

    expect(api.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Local qBittorrent",
        host: "http://host.docker.internal:8080",
        hasLocalFilesystemAccess: true,
      })
    )
  })
})
