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

	it('uses content-addressed SHA-pair caching and ref probe (BR-desktop-34)', () => {
		const script = readFileSync(
			path.join(repoRoot, 'scripts/upstream-sync-check'),
			'utf8',
		)
		expect(script).toContain('upstream-sync-cache')
		expect(script).toContain('git ls-remote')
		expect(script).toContain('QUI_SKIP_SYNC_CACHE')
	})

	it('enforces upstream fork synchronization script and finish-pr rules (BR-desktop-42)', () => {
		const syncForkScript = readFileSync(
			path.join(repoRoot, 'scripts/upstream-sync-fork'),
			'utf8',
		)
		expect(syncForkScript).toContain('autobrr/qui')
		expect(syncForkScript).toContain('merge-tree')
		expect(syncForkScript).toContain('rev-list')
		expect(syncForkScript).toContain('--merge')
		expect(syncForkScript).toContain('gh pr merge')

		const ruleContent = readFileSync(
			path.join(repoRoot, '.cursor/rules/510-local-upstream-sync.mdc'),
			'utf8',
		)
		expect(ruleContent).toContain('upstream-sync-fork')
		expect(ruleContent).toMatch(/always sync/i)

		const skillContent = readFileSync(
			path.join(repoRoot, '.cursor/skills/qui-fork-finish-pr/SKILL.md'),
			'utf8',
		)
		expect(skillContent).toContain('upstream-sync-fork')

		const bumpScript = readFileSync(
			path.join(repoRoot, 'scripts/desktop-version-bump-local'),
			'utf8',
		)
		expect(bumpScript).toContain('upstream-sync-fork')
	})
})
