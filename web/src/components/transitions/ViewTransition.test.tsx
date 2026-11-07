/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { act, cleanup, render, renderHook, screen } from "@testing-library/react"
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ActionTransitionProvider,
  useActionTransition,
  withActionTransition
} from "./ActionTransition"
import { ViewTransitionBoundary } from "./ViewTransitionBoundary"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ViewTransitionBoundary component (BR-web-08)", () => {
  it("renders children through the boundary", () => {
    render(
      <ViewTransitionBoundary name="test-surface">
        <div data-testid="test-child">Child Content</div>
      </ViewTransitionBoundary>
    )

    expect(screen.getByTestId("test-child").textContent).toBe("Child Content")
  })

  it("keeps React.ViewTransition available in the supported runtime", () => {
    expect(React.ViewTransition).toBeTruthy()
  })

  it("renders named page content without throwing when ViewTransition is present", () => {
    render(
      <ViewTransitionBoundary name="page-main-content" enter="slide-in" exit="fade-out">
        <article data-testid="main-article">Main Content</article>
      </ViewTransitionBoundary>
    )

    expect(screen.getByTestId("main-article").textContent).toBe("Main Content")
  })
})

describe("ActionTransition utilities (BR-web-08)", () => {
  it("withActionTransition executes callback inside startTransition", () => {
    const spy = vi.spyOn(React, "startTransition")
    const action = vi.fn()

    const wrapped = withActionTransition(action)
    wrapped("param1", 42)

    expect(spy).toHaveBeenCalled()
    expect(action).toHaveBeenCalledWith("param1", 42)
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
