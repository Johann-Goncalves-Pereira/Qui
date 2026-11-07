/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from "vitest"
import { router } from "./router"

describe("Router configuration (BR-web-08)", () => {
  it("enables defaultViewTransition for seamless page navigations", () => {
    expect(router.options.defaultViewTransition).toBe(true)
  })

  it("configures defaultPreload to intent", () => {
    expect(router.options.defaultPreload).toBe("intent")
  })

  it("configures defaultPendingComponent with branded LoadingOverlay (BR-web-11)", () => {
    expect(router.options.defaultPendingComponent).toBeTruthy()
  })
})


