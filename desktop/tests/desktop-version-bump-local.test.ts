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

describe('desktop-version-bump-local (BR-desktop-28)', () => {
	it('bumps via PR + tags on develop without Actions', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/desktop-version-bump-local'),
			'utf8',
		)
		expect(script).toContain('bump-version.mjs')
		expect(script).toContain('gh pr create')
		expect(script).toContain('--squash')
		expect(script).toMatch(/git tag/)
		expect(script).toContain('[skip ci]')
		expect(script).not.toMatch(/workflow_dispatch|actions\/checkout/)
	})
})
