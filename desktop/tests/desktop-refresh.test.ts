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

describe('desktop refresh script (BR-desktop-20)', () => {
	it('dockerignores the host qui binary so macOS builds cannot poison the image', () => {
		const dockerignore = readFileSync(
			path.join(repoRoot, '.dockerignore'),
			'utf8',
		)
		expect(dockerignore.split(/\r?\n/)).toContain('qui')
	})

	it('ships a refresh script that rebuilds qui-desktop:local and clears Electron caches', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/desktop-refresh'),
			'utf8',
		)
		expect(script).toContain('qui-desktop:local')
		expect(script).toContain('make frontend')
		expect(script).toContain('Service Worker')
		expect(script).toContain('--install-app')
		expect(script).toContain('--open')
		expect(script).toContain('docker build')
	})
})
