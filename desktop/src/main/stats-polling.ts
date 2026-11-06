/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

export const STATS_POLL_ACTIVE_MS = 2500
export const STATS_POLL_BACKGROUND_MS = 10000

export interface WindowStateLike {
	destroyed?: boolean
	visible?: boolean
	minimized?: boolean
}

export function computeStatsPollInterval(
	windowState: WindowStateLike | null,
): number {
	if (!windowState || windowState.destroyed) {
		return STATS_POLL_BACKGROUND_MS
	}
	const isActive = Boolean(windowState.visible && !windowState.minimized)
	return isActive ? STATS_POLL_ACTIVE_MS : STATS_POLL_BACKGROUND_MS
}
