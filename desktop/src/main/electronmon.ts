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
 *
 * Discover paths use `path.resolve` (not realpath) so keys match electronmon's watcher,
 * which stores `path.resolve(cwd, relativeChangedPath)` in `appfiles`.
 *
 * Default `distDir` is `path.resolve(process.cwd(), 'dist')` so keys stay aligned with
 * that same package cwd electronmon watches from.
 */
export function registerElectronmonMainModules(
	options?: RegisterElectronmonMainModulesOptions,
): void {
	const isDev = options?.desktopDev ?? process.env.QUI_DESKTOP_DEV === '1'
	// Explicit `send: undefined` must no-op (tests + non-IPC launches). Only fall
	// back to process.send when the option is omitted entirely — `??` alone would
	// treat undefined as missing and leak discover messages into Vitest's IPC.
	const send =
		options && Object.hasOwn(options, 'send')
			? options.send
			: typeof process.send === 'function'
				? (msg: ElectronmonDiscoverMessage): void => {
						process.send?.(msg)
					}
				: undefined
	if (!isDev || typeof send !== 'function') {
		return
	}
	try {
		const distDir = path.resolve(
			options?.distDir ?? path.resolve(process.cwd(), 'dist'),
		)
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
					send({ type: 'discover', file: path.resolve(fullPath) })
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
