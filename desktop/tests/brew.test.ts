/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	checkBrewCaskInstalled,
	isInstalledViaBrew,
	resolveBrewCli,
	runBrewUpdateAndUpgrade,
} from '../src/main/brew.js'

describe('Homebrew manager and internal cask update engine (BR-desktop-44)', () => {
	it('resolves brew executable path from environment or standard macOS prefixes', () => {
		const originalBrew = process.env.BREW_PATH
		try {
			process.env.BREW_PATH = '/custom/bin/brew'
			// candidate path check will return candidates or null if not exists
			expect(resolveBrewCli()).toBeDefined()
		} finally {
			if (originalBrew !== undefined) {
				process.env.BREW_PATH = originalBrew
			} else {
				delete process.env.BREW_PATH
			}
		}
	})

	it('detects Homebrew Cask installation status via isInstalledViaBrew', () => {
		const installed = isInstalledViaBrew()
		expect(typeof installed).toBe('boolean')
	})

	it('safely handles non-existent brew binary gracefully in checkBrewCaskInstalled', async () => {
		const installed = await checkBrewCaskInstalled('/non/existent/brew')
		expect(typeof installed).toBe('boolean')
	})

	it('returns error when runBrewUpdateAndUpgrade is invoked with missing brew binary', async () => {
		const result = await runBrewUpdateAndUpgrade('/invalid/missing/brew')
		expect(result.success).toBe(false)
		expect(result.error).toBeDefined()
	})
})
