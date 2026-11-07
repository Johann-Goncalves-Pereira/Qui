/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../..',
)

describe('local upstream-sync gate (BR-desktop-21)', () => {
	it('fails closed when merging autobrr/qui develop conflicts', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/upstream-sync-check'),
			'utf8',
		)
		expect(script).toContain('autobrr/qui')
		expect(script).toContain('develop')
		expect(script).toContain('merge-tree')
		expect(script).toMatch(/exit 1/)

		const prePush = readFileSync(
			path.join(repoRoot, '.githooks/pre-push'),
			'utf8',
		)
		expect(prePush).toContain('upstream-sync-check')
		expect(prePush).toMatch(/develop|main/)
		expect(prePush).toMatch(/exit 1/)
	})
})
