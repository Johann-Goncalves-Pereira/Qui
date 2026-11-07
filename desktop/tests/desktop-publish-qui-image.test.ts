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

describe('desktop-publish-qui-image (BR-desktop-17)', () => {
	it('pushes lowercase fork GHCR tags, not upstream autobrr', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/desktop-publish-qui-image'),
			'utf8',
		)
		expect(script).toContain('johann-goncalves-pereira/qui')
		expect(script).toContain("tr '[:upper:]' '[:lower:]'")
		expect(script).toContain('docker push')
		expect(script).toContain('write:packages')
		expect(script).not.toContain('autobrr/qui')
	})
})
