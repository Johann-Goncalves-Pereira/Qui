/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Resolves the Homebrew CLI executable path on macOS.
 * Checks BREW_PATH override first, then standard Apple Silicon and Intel prefix locations.
 */
export function resolveBrewCli(): string | null {
	if (process.env.BREW_PATH && existsSync(process.env.BREW_PATH)) {
		return process.env.BREW_PATH
	}
	const candidates = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate
		}
	}
	return null
}

/**
 * Checks whether Qui was installed via Homebrew Cask by inspecting
 * standard Caskroom directories or querying the Homebrew CLI.
 */
export function isInstalledViaBrew(): boolean {
	const caskDirs = ['/opt/homebrew/Caskroom/qui', '/usr/local/Caskroom/qui']
	for (const dir of caskDirs) {
		if (existsSync(dir)) {
			return true
		}
	}
	return false
}

export async function checkBrewCaskInstalled(
	brewPath?: string,
): Promise<boolean> {
	if (isInstalledViaBrew()) {
		return true
	}
	const brew = brewPath || resolveBrewCli()
	if (!brew) {
		return false
	}
	try {
		await execFileAsync(brew, ['list', '--cask', 'qui'], {
			timeout: 10000,
			env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' },
		})
		return true
	} catch {
		return false
	}
}

export interface BrewUpdateResult {
	success: boolean
	output?: string
	error?: string
}

/**
 * Runs `brew update` followed by `brew upgrade --cask qui` internally.
 * Synchronizes local formula/tap metadata and updates the packaged Qui.app cask.
 */
export async function runBrewUpdateAndUpgrade(
	brewPath?: string,
	options?: {
		timeoutUpdateMs?: number
		timeoutUpgradeMs?: number
	},
): Promise<BrewUpdateResult> {
	const brew = brewPath || resolveBrewCli()
	if (!brew) {
		return {
			success: false,
			error: 'Homebrew CLI (brew) was not found on this machine.',
		}
	}

	const timeoutUpdate = options?.timeoutUpdateMs ?? 120000
	const timeoutUpgrade = options?.timeoutUpgradeMs ?? 180000

	try {
		// Step 1: Run brew update internally to sync tap manifests
		const updateRes = await execFileAsync(brew, ['update'], {
			timeout: timeoutUpdate,
			env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' },
		})

		// Step 2: Run brew upgrade --cask -y qui to download & replace Qui.app
		const upgradeRes = await execFileAsync(
			brew,
			['upgrade', '--cask', '-y', 'qui'],
			{
				timeout: timeoutUpgrade,
				env: {
					...process.env,
					HOMEBREW_NO_AUTO_UPDATE: '1',
					HOMEBREW_NO_ASK: '1',
					NONINTERACTIVE: '1',
				},
			},
		)

		// Step 3: Clear macOS Gatekeeper quarantine flag so Qui.app opens without security blocks
		try {
			await execFileAsync('xattr', ['-cr', '/Applications/Qui.app'], {
				timeout: 10000,
			})
		} catch {
			// Best-effort quarantine removal
		}

		return {
			success: true,
			output: `${updateRes.stdout}\n${upgradeRes.stdout}`.trim(),
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return {
			success: false,
			error: message,
		}
	}
}
