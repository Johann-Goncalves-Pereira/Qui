/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AnimatedLogo } from "./AnimatedLogo"
import { LoadingOverlay } from "./LoadingOverlay"
import { RabbitSpinner } from "./RabbitSpinner"

afterEach(() => {
  cleanup()
})

describe("AnimatedLogo (BR-web-11)", () => {
  it("renders with default sprint mode and passes backwards-compatible classes", () => {
    const { container } = render(<AnimatedLogo className="h-16 w-16 test-custom" />)
    const svg = container.querySelector("svg")

    expect(svg).not.toBeNull()
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1024 1024")
    expect(svg?.className.baseVal ?? svg?.getAttribute("class")).toContain("h-16")
    expect(svg?.className.baseVal ?? svg?.getAttribute("class")).toContain("test-custom")

    // Backwards-compatible class for queries
    const animatedElements = container.querySelectorAll(".animated-logo-element")
    expect(animatedElements.length).toBeGreaterThan(0)

    // Verify keyframe styles contain stride morph and sprint leap
    const styleTag = container.querySelector("style")
    expect(styleTag?.textContent).toContain("pawStrideMorph")
    expect(styleTag?.textContent).toContain("rabbitBoundSprint")
    expect(styleTag?.textContent).toContain("logo-bounce")
    expect(styleTag?.textContent).toContain("prefers-reduced-motion")
  })

  it("renders rapid gallop mode with gallop keyframes", () => {
    const { container } = render(<AnimatedLogo mode="gallop" />)
    const group = container.querySelector(".rabbit-leap-gallop")
    expect(group).not.toBeNull()

    const styleTag = container.querySelector("style")
    expect(styleTag?.textContent).toContain("rabbitBoundGallop")
  })

  it("renders high spring jump mode with jump keyframes", () => {
    const { container } = render(<AnimatedLogo mode="jump" />)
    const group = container.querySelector(".rabbit-leap-jump")
    expect(group).not.toBeNull()

    const styleTag = container.querySelector("style")
    expect(styleTag?.textContent).toContain("rabbitBoundJump")
  })

  it("renders turbo mode with orbital progress ring and bounds rabbit safely", () => {
    const { container } = render(<AnimatedLogo mode="turbo" />)
    const orbitalRing = container.querySelector(".orbital-spinner-ring")
    expect(orbitalRing).not.toBeNull()

    const group = container.querySelector(".rabbit-leap-turbo")
    expect(group).not.toBeNull()

    const styleTag = container.querySelector("style")
    expect(styleTag?.textContent).toContain("orbitSpinAnim")
    expect(styleTag?.textContent).toContain("rabbitBoundTurbo")
  })

  it("synchronizes with theme variables using var(--primary) and OKLCH color-mix", () => {
    const { container } = render(<AnimatedLogo />)
    const bodyPath = container.querySelector(".rabbit-body-morph")

    expect(bodyPath).not.toBeNull()
    expect(bodyPath?.getAttribute("fill")).toBe("oklch(from var(--primary) l c h / 0.18)")
    expect(bodyPath?.getAttribute("stroke")).toBe("var(--primary)")
  })

  it("supports numeric sizes via inline style", () => {
    const { container } = render(<AnimatedLogo size={40} />)
    const svg = container.querySelector("svg")

    expect(svg?.style.width).toBe("40px")
    expect(svg?.style.height).toBe("40px")
  })

  it("toggles ground shadow and streaks based on props", () => {
    const { container: withFx } = render(<AnimatedLogo showShadow={true} showStreaks={true} />)
    expect(withFx.querySelector(".ground-shadow-fx")).not.toBeNull()
    expect(withFx.querySelector(".speed-streak-top")).not.toBeNull()

    cleanup()

    const { container: withoutFx } = render(<AnimatedLogo showShadow={false} showStreaks={false} />)
    expect(withoutFx.querySelector(".ground-shadow-fx")).toBeNull()
    expect(withoutFx.querySelector(".speed-streak-top")).toBeNull()
  })
})

describe("RabbitSpinner (BR-web-11)", () => {
  it("renders accessible status role and turbo mode spinner", () => {
    const { container } = render(<RabbitSpinner label="Synchronizing..." className="size-4" />)
    const status = screen.getByRole("status")

    expect(status).not.toBeNull()
    expect(status.textContent).toContain("Synchronizing...")
    expect(container.querySelector(".orbital-spinner-ring")).not.toBeNull()
  })
})

describe("LoadingOverlay (BR-web-11)", () => {

  it("renders full status banner with message and articulated logo", () => {
    render(<LoadingOverlay message="Loading torrents" submessage="Connecting to daemon" />)
    const status = screen.getByRole("status")

    expect(status).not.toBeNull()
    expect(screen.getByText("Loading torrents")).not.toBeNull()
    expect(screen.getByText("Connecting to daemon")).not.toBeNull()
  })
})
