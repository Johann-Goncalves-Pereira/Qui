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
		expect(script).toContain('Casks/qui.rb')
		expect(script).toContain('desktop-publish-release-local')
		expect(script).not.toMatch(/workflow_dispatch|actions\/checkout/)
	})

	it('publishes GitHub Latest from desktop package version', () => {
		const publish = readFileSync(
			path.join(repoRoot, 'scripts/desktop-publish-release-local'),
			'utf8',
		)
		expect(publish).toContain('gh release')
		expect(publish).toContain('--latest')
		expect(publish).toContain('package.json')
	})

	it('uses delta asset verification to avoid redundant uploads (BR-desktop-34)', () => {
		const publish = readFileSync(
			path.join(repoRoot, 'scripts/desktop-publish-release-local'),
			'utf8',
		)
		expect(publish).toContain('EXISTING_ASSETS')
		expect(publish).toContain('UPLOAD_CANDIDATES')
		expect(publish).toMatch(/already matches|already up to date/)
	})

	it('enforces postflight_steps stanza and verifies Cask download availability (BR-desktop-48)', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/desktop-version-bump-local'),
			'utf8',
		)
		expect(script).toContain('postflight_steps')
		expect(script).toContain('curl -ILs')
		expect(script).toContain('VERIFY_URL')
	})
})
