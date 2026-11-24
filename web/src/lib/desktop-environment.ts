/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useSyncExternalStore } from "react"

export function isDesktopEnvironment(): boolean {
  return typeof window !== "undefined" && window.quiDesktop !== undefined
}

function subscribeNever(): () => void {
  return () => {}
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeNever, isDesktopEnvironment, () => false)
}
