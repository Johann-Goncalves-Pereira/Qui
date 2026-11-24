/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { CSSProperties } from "react"

interface WindowDragStyle extends CSSProperties {
  WebkitAppRegion: "drag" | "no-drag"
}

export const windowDragStyle: WindowDragStyle = { WebkitAppRegion: "drag" }

export const windowNoDragStyle: WindowDragStyle = { WebkitAppRegion: "no-drag" }
