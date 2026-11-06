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

describe('upstream-sync workflow (BR-desktop-21)', () => {
	it('fails closed when merging autobrr/qui develop conflicts', () => {
		const workflow = readFileSync(
			path.join(repoRoot, '.github/workflows/upstream-sync.yml'),
			'utf8',
		)
		expect(workflow).toContain('autobrr/qui')
		expect(workflow).toContain('develop')
		expect(workflow).toContain('merge --no-commit')
		expect(workflow).toMatch(/pull_request/)
		expect(workflow).toMatch(/exit 1|::error/)
	})
})
