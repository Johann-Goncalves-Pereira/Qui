/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { readAppVersion } from '../src/shared/app-version.js'
import { CURRENT_APP_VERSION } from '../src/shared/constants.js'

describe('readAppVersion (BR-desktop-25)', () => {
	it('reads semantic version from desktop package.json', () => {
		expect(CURRENT_APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
	})

	it('falls back to 0.0.0 when package.json is missing or corrupted', () => {
		expect(readAppVersion('/nonexistent/path/package.json')).toBe('0.0.0')
	})
})
