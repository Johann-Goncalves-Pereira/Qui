/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, render, renderHook, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"
import {
  ActionTransitionProvider,
  useActionTransition,
  withActionTransition,
} from "./ActionTransition"
import { ViewTransitionBoundary } from "./ViewTransitionBoundary"

describe("ViewTransitionBoundary component (BR-web-07)", () => {
  it("renders children directly within ViewTransitionBoundary", () => {
    render(
      <ViewTransitionBoundary name="test-surface">
        <div data-testid="test-child">Child Content</div>
      </ViewTransitionBoundary>
    )

    expect(screen.getByTestId("test-child").textContent).toBe("Child Content")
  })

  it("falls back gracefully when React.ViewTransition is undefined", () => {
    const originalVT = (React as unknown as { ViewTransition?: unknown }).ViewTransition
    try {
      // Simulate environment where ViewTransition is not supported
      delete (React as unknown as { ViewTransition?: unknown }).ViewTransition

      render(
        <ViewTransitionBoundary name="fallback-surface">
          <span data-testid="fallback-child">Fallback Content</span>
        </ViewTransitionBoundary>
      )

      expect(screen.getByTestId("fallback-child").textContent).toBe("Fallback Content")
    } finally {
      ;(React as unknown as { ViewTransition?: unknown }).ViewTransition = originalVT
    }
  })

  it("passes custom transition props when React.ViewTransition is present", () => {
    render(
      <ViewTransitionBoundary name="page-main-content" enter="slide-in" exit="fade-out">
        <article data-testid="main-article">Main Content</article>
      </ViewTransitionBoundary>
    )

    expect(screen.getByTestId("main-article")).toBeDefined()
    expect(screen.getByTestId("main-article").textContent).toBe("Main Content")
  })
})

describe("ActionTransition utilities (BR-web-07)", () => {
  it("withActionTransition executes callback inside startTransition", () => {
    const spy = vi.spyOn(React, "startTransition")
    const action = vi.fn()

    const wrapped = withActionTransition(action)
    wrapped("param1", 42)

    expect(spy).toHaveBeenCalled()
    expect(action).toHaveBeenCalledWith("param1", 42)
    spy.mockRestore()
  })

  it("useActionTransition runs transitions and manages pending state", async () => {
    const { result } = renderHook(() => useActionTransition(), {
      wrapper: ({ children }) => <ActionTransitionProvider>{children}</ActionTransitionProvider>,
    })

    const mockAction = vi.fn()
    await act(async () => {
      const run = result.current.runWithTransition(mockAction)
      run()
    })

    expect(mockAction).toHaveBeenCalledTimes(1)
    expect(result.current.isPending).toBe(false)
  })
})
