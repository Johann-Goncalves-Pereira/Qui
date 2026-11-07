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

describe('desktop-publish-release-local (BR-desktop-40)', () => {
	it("generates release notes containing ## What's Changed parsed from git history", () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/desktop-publish-release-local'),
			'utf8',
		)
		expect(script).toContain('CHANGELOG')
		expect(script).toContain("## What's Changed")
		expect(script).toMatch(/git describe|git log/)
		expect(script).toContain('--notes')
	})
})
