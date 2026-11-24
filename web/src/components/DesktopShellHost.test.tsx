/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/ui/DesktopUpdateHost", () => ({
  DesktopUpdateHost: () => <div data-testid="desktop-update-host" />,
}))

import { DesktopShellHost } from "./DesktopShellHost"

afterEach(cleanup)

describe("DesktopShellHost (BR-desktop-61)", () => {
  it("renders its children next to the desktop update host", () => {
    render(<DesktopShellHost><div data-testid="child" /></DesktopShellHost>)

    expect(screen.getByTestId("child")).toBeTruthy()
    expect(screen.getByTestId("desktop-update-host")).toBeTruthy()
  })
})
