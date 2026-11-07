/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readdirSync } from 'node:fs'
import path from 'node:path'

export type ElectronmonDiscoverMessage = {
	type: 'discover'
	file: string
}

export type RegisterElectronmonMainModulesOptions = {
	distDir?: string
	send?: (msg: ElectronmonDiscoverMessage) => void
	desktopDev?: boolean
}

/**
 * Register all compiled main and shared modules with electronmon so file modifications
 * trigger a clean process restart instead of an erroneous webContents reload (BR-desktop-37).
 *
 * Best-effort only: discovery failures must never abort Electron startup. Patterns in
 * `package.json` and incremental `tsc` remain the primary SIGSEGV mitigations.
 */
export function registerElectronmonMainModules(
	options?: RegisterElectronmonMainModulesOptions,
): void {
	const isDev = options?.desktopDev ?? process.env.QUI_DESKTOP_DEV === '1'
	const send =
		options?.send ??
		(typeof process.send === 'function'
			? (msg: ElectronmonDiscoverMessage): void => {
					process.send?.(msg)
				}
			: undefined)
	if (!isDev || typeof send !== 'function') {
		return
	}
	try {
		const distDir = options?.distDir ?? path.resolve(import.meta.dirname, '..')
		const scan = (dir: string): void => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const fullPath = path.join(dir, entry.name)
				if (entry.isDirectory()) {
					if (entry.name !== 'assets') {
						scan(fullPath)
					}
				} else if (
					entry.isFile() &&
					(entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))
				) {
					send({ type: 'discover', file: fullPath })
				}
			}
		}
		scan(distDir)
	} catch (error) {
		console.warn(
			'[electronmon] failed to register main modules for discovery:',
			error,
		)
	}
}
