/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import "@/i18n"

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { InstanceResponse } from "@/types"

import { InstanceErrorDisplay, isQBitAuthError } from "./InstanceErrorDisplay"

const mockGetQBitConfig = vi.fn().mockResolvedValue({
  username: "admin",
  password: "temporaryPassword123",
  isTemporaryPassword: true,
})

vi.mock("@/hooks/usePodmanServices", () => ({
  usePodmanServices: () => ({
    getQBitConfig: mockGetQBitConfig,
  }),
}))

afterEach(() => {
  cleanup()
  delete (window as { quiDesktop?: unknown }).quiDesktop
})

describe("InstanceErrorDisplay", () => {
  // regression: #4233
  it("names each error category with a label, and an unknown category as Unknown", () => {
    const recentErrors = [
      { id: 1, instanceId: 3, errorType: "api", errorMessage: "bad response", occurredAt: "2026-01-02T03:04:05Z" },
      { id: 2, instanceId: 3, errorType: "timeout", errorMessage: "slow", occurredAt: "2026-01-02T03:04:06Z" },
    ]
    render(<InstanceErrorDisplay instance={{ connected: false, recentErrors } as InstanceResponse} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Recent errors/i }))

    expect(screen.getByText("API")).not.toBeNull()
    expect(screen.getByText("Unknown")).not.toBeNull()
    expect(screen.queryByText("timeout")).toBeNull()
  })
})

describe("InstanceErrorDisplay and isQBitAuthError (BR-web-16)", () => {
  it("isQBitAuthError identifies authentication failure patterns accurately", () => {
    expect(isQBitAuthError("error making request: qbit re-login")).toBe(true)
    expect(isQBitAuthError("Health check failed: could not get webapi version", "Authentication")).toBe(true)
    expect(isQBitAuthError("HTTP 401 Unauthorized")).toBe(true)
    expect(isQBitAuthError("HTTP 403 Forbidden")).toBe(true)
    expect(isQBitAuthError(undefined, "authentication")).toBe(true)

    // Unrelated errors return false
    expect(isQBitAuthError("Connection refused on port 8080", "network")).toBe(false)
    expect(isQBitAuthError("Disk space full", "storage")).toBe(false)
    expect(isQBitAuthError(undefined, undefined)).toBe(false)
  })

  it("renders actionable remediation guidance when instance has authentication errors in recentErrors", async () => {
    ;(window as { quiDesktop?: Record<string, unknown> }).quiDesktop = {}
    const onEdit = vi.fn()
    const mockInstance: InstanceResponse = {
      id: 1,
      name: "Home",
      host: "http://host.docker.internal:8080",
      connected: false,
      hasDecryptionError: false,
      recentErrors: [
        {
          id: 101,
          instanceId: 1,
          errorType: "Authentication",
          errorMessage: "Health check failed: could not get webapi version: error making request: qbit re-login",
          occurredAt: "2026-11-07T17:48:00Z",
        },
      ],
    } as InstanceResponse

    render(<InstanceErrorDisplay instance={mockInstance} onEdit={onEdit} />)

    // Guidance title and steps should be visible
    expect(screen.getByText("qBittorrent Authentication Required")).toBeDefined()
    expect(
      screen.getByText(
        /Modern qBittorrent \(v4\.6\.1\+\) generates an administrator password on initial start and rejects unauthenticated connections\./i
      )
    ).toBeDefined()
    expect(screen.getByText(/Click the qbittorrent:8080 service badge/i)).toBeDefined()
    expect(screen.getByText(/Edit this instance, set qBittorrent Authentication to Username \/ Password/i)).toBeDefined()

    // Configure credentials button invokes onEdit
    const editBtn = screen.getByRole("button", { name: /Configure Instance Credentials/i })
    fireEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalledTimes(1)

    // Copy container password button copies password to clipboard
    const clipboardWriteMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteMock,
      },
    })
    const copyPassBtn = screen.getByRole("button", { name: /Copy Container Password/i })
    await act(async () => {
      fireEvent.click(copyPassBtn)
    })
    expect(mockGetQBitConfig).toHaveBeenCalled()
    expect(clipboardWriteMock).toHaveBeenCalledWith("temporaryPassword123")
  })

  it("does not render guidance when instance is connected and healthy", () => {
    const mockInstance = {
      id: 3,
      name: "Connected Client",
      host: "http://localhost:8080",
      connected: true,
      hasDecryptionError: false,
      recentErrors: [],
    } as unknown as InstanceResponse

    render(<InstanceErrorDisplay instance={mockInstance} onEdit={vi.fn()} />)

    expect(screen.queryByText("qBittorrent Authentication Required")).toBeNull()
  })
})
