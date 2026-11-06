/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	computeStatsPollInterval,
	STATS_POLL_ACTIVE_MS,
	STATS_POLL_BACKGROUND_MS,
} from '../src/main/stats-polling.js'

describe('Adaptive transfer stats polling (BR-desktop-26)', () => {
	it('uses active fast polling when window is visible and not minimized', () => {
		const interval = computeStatsPollInterval({
			destroyed: false,
			visible: true,
			minimized: false,
		})
		expect(interval).toBe(STATS_POLL_ACTIVE_MS)
		expect(interval).toBe(2500)
	})

	it('throttles to background polling when window is hidden or minimized', () => {
		expect(
			computeStatsPollInterval({
				destroyed: false,
				visible: false,
				minimized: false,
			}),
		).toBe(STATS_POLL_BACKGROUND_MS)

		expect(
			computeStatsPollInterval({
				destroyed: false,
				visible: true,
				minimized: true,
			}),
		).toBe(STATS_POLL_BACKGROUND_MS)

		expect(computeStatsPollInterval(null)).toBe(STATS_POLL_BACKGROUND_MS)

		expect(
			computeStatsPollInterval({
				destroyed: true,
				visible: true,
				minimized: false,
			}),
		).toBe(STATS_POLL_BACKGROUND_MS)

		expect(STATS_POLL_BACKGROUND_MS).toBe(10000)
	})
})
