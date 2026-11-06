/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it, beforeEach, vi } from "vitest"
import type { InstanceResponse } from "@/types"
import { DEFAULT_REANNOUNCE_SETTINGS } from "@/lib/instance-validation"
import {
  buildDefaultCompanionInstance,
  isDesktopEnvironment,
  shouldAutoProvisionCompanionInstance,
  autoProvisionCompanionInstanceIfEligible,
  resetProvisioningState
} from "./desktop-companion-instance"

describe("Desktop companion qBittorrent instance (BR-web-02)", () => {
  beforeEach(() => {
    resetProvisioningState()
    delete (window as { quiDesktop?: unknown }).quiDesktop
  })

  it("identifies when running inside the desktop shell", () => {
    expect(isDesktopEnvironment()).toBe(false)
    window.quiDesktop = {
      requestTouchId: async () => ({ success: true }),
    }
    expect(isDesktopEnvironment()).toBe(true)
  })

  it("never auto-provisions when not in desktop shell", () => {
    expect(shouldAutoProvisionCompanionInstance([])).toBe(false)
  })

  it("does not auto-provision when instances are still loading (undefined)", () => {
    window.quiDesktop = {}
    expect(shouldAutoProvisionCompanionInstance(undefined)).toBe(false)
  })

  it("auto-provisions when in desktop shell and instance list is empty", () => {
    window.quiDesktop = {}
    expect(shouldAutoProvisionCompanionInstance([])).toBe(true)
  })

  it("does not auto-provision when an instance with local filesystem access already exists", () => {
    window.quiDesktop = {}
    const existing: InstanceResponse[] = [
      {
        id: 1,
        name: "My Torrent Client",
        host: "http://localhost:8080",
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
      },
    ]
    expect(shouldAutoProvisionCompanionInstance(existing)).toBe(false)
  })

  it("builds the default companion instance payload with local filesystem access enabled", () => {
    const payload = buildDefaultCompanionInstance()
    expect(payload.name).toBe("Local qBittorrent")
    expect(payload.host).toBe("http://host.docker.internal:8080")
    expect(payload.hasLocalFilesystemAccess).toBe(true)
    expect(payload.username).toBe("admin")
  })

  it("calls createInstance exactly once when eligible", async () => {
    window.quiDesktop = {}
    const createMock = vi.fn().mockResolvedValue({})
    const provisioned = await autoProvisionCompanionInstanceIfEligible([], createMock)
    expect(provisioned).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Local qBittorrent",
        host: "http://host.docker.internal:8080",
        hasLocalFilesystemAccess: true,
      })
    )

    // Second call is guarded against duplicate execution
    const secondCall = await autoProvisionCompanionInstanceIfEligible([], createMock)
    expect(secondCall).toBe(false)
    expect(createMock).toHaveBeenCalledTimes(1)
  })
})
