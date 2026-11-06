/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { changeLanguage, initI18n } from "@/i18n"
import { QBitDockerConfigDialog } from "./QBitDockerConfigDialog"
import { QuiDockerConfigDialog } from "./QuiDockerConfigDialog"

const mockSaveQui = vi.fn().mockResolvedValue({ success: true })
const mockSaveQBit = vi.fn().mockResolvedValue({ success: true })
const mockRestart = vi.fn().mockResolvedValue({ success: true })

const mockGetQuiConfig = vi.fn().mockResolvedValue({
  port: 7476,
  configPath: "/host/qui",
  dataPath: "/host/data",
  puid: "1000",
  pgid: "1000",
  umask: "002",
  logLevel: "INFO",
  baseUrl: "",
  tz: "UTC",
  restartPolicy: "unless-stopped",
  image: "qui-desktop:local",
})

const mockGetQBitConfig = vi.fn().mockResolvedValue({
  port: 8080,
  peerPort: 6881,
  configPath: "/host/qbit",
  downloadsPath: "/host/downloads",
  puid: "1000",
  pgid: "1000",
  umask: "022",
  tz: "UTC",
  restartPolicy: "unless-stopped",
  image: "lscr.io/linuxserver/qbittorrent:latest",
})

vi.mock("@/hooks/useDockerServices", () => ({
  useDockerServices: () => ({
    statuses: {
      qui: {
        name: "qui",
        state: "running",
        status: "Up",
        image: "qui-desktop:local",
        port: 7476,
      },
      qbit: {
        name: "qbittorrent-nox",
        state: "running",
        status: "Up",
        image: "lscr.io/linuxserver/qbittorrent:latest",
        port: 8080,
      },
    },
    getQuiConfig: mockGetQuiConfig,
    getQBitConfig: mockGetQBitConfig,
    saveQuiConfig: mockSaveQui,
    saveQBitConfig: mockSaveQBit,
    restartContainer: mockRestart,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("Docker configuration dialogs (BR-web-04)", () => {
  beforeEach(async () => {
    await initI18n()
    await changeLanguage("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders QuiDockerConfigDialog with official config parameters and submits updates", async () => {
    render(<QuiDockerConfigDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByText("Qui Container Configuration")).toBeDefined()
    expect(screen.getByLabelText("Host Web UI Port")).toBeDefined()
    expect(screen.getByLabelText("Host Config Directory (/config)")).toBeDefined()
    expect(screen.getByLabelText("Host Data Directory (/data)")).toBeDefined()
    expect(screen.getByLabelText("Base URL (QUI__BASE_URL)")).toBeDefined()
    expect(screen.getByLabelText("PUID")).toBeDefined()
    expect(screen.getByLabelText("PGID")).toBeDefined()
    expect(screen.getByLabelText("UMASK")).toBeDefined()

    const saveBtn = screen.getByRole("button", { name: /Save & Apply/i })
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(mockSaveQui).toHaveBeenCalled()
  })

  it("renders QBitDockerConfigDialog with official config parameters and submits updates", async () => {
    render(<QBitDockerConfigDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByText("qBittorrent-nox Container Configuration")).toBeDefined()
    expect(screen.getByLabelText("Host Web UI Port")).toBeDefined()
    expect(screen.getByLabelText("BitTorrent Peer Port")).toBeDefined()
    expect(screen.getByLabelText("Host Config Directory (/config)")).toBeDefined()
    expect(screen.getByLabelText("Host Downloads Directory (/downloads)")).toBeDefined()

    const saveBtn = screen.getByRole("button", { name: /Save & Apply/i })
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(mockSaveQBit).toHaveBeenCalled()
  })
})
