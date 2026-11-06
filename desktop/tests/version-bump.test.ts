/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { bumpPatchVersion } from '../scripts/bump-version.mjs'

describe('bumpPatchVersion (BR-desktop-25)', () => {
	it('bumps patch version from 0.0.0 to 0.0.1', () => {
		expect(bumpPatchVersion('0.0.0')).toBe('0.0.1')
	})

	it('bumps patch versions sequentially', () => {
		expect(bumpPatchVersion('0.0.1')).toBe('0.0.2')
		expect(bumpPatchVersion('0.0.9')).toBe('0.0.10')
		expect(bumpPatchVersion('1.2.3')).toBe('1.2.4')
	})

	it('throws on invalid version formats', () => {
		expect(() => bumpPatchVersion('invalid')).toThrow(/Invalid semver/)
		expect(() => bumpPatchVersion('')).toThrow(/Invalid semver/)
	})
})
