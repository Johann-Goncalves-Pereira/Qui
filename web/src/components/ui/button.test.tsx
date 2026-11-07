/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"

afterEach(() => {
  cleanup()
})

describe("Button UI primitive", () => {
  it("renders children cleanly in standard mode", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: "Click me" })
    expect(button).not.toBeNull()
    expect(button.hasAttribute("disabled")).toBe(false)
  })

  it("supports asChild delegation without Slot child errors", () => {
    render(
      <Button asChild>
        <a href="/target">Slotted Link</a>
      </Button>
    )
    const link = screen.getByRole("link", { name: "Slotted Link" })
    expect(link).not.toBeNull()
    expect(link.getAttribute("href")).toBe("/target")
  })

  it("renders RabbitSpinner when loading is true and disables the button", () => {
    render(
      <Button loading loadingText="Saving...">
        Save
      </Button>
    )
    const button = screen.getByRole("button", { name: /saving\.\.\./i })
    expect(button).not.toBeNull()
    expect(button.hasAttribute("disabled")).toBe(true)
    expect(button.querySelector("svg")).not.toBeNull()
  })
})
