/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Register all compiled main and shared modules with electronmon so file modifications
 * trigger a clean process restart instead of an erroneous webContents reload (BR-desktop-37).
 */
export function registerElectronmonMainModules(options?: {
	distDir?: string
	send?: (msg: unknown) => void
	desktopDev?: boolean
}): void {
	const isDev = options?.desktopDev ?? process.env.QUI_DESKTOP_DEV === '1'
	const send =
		options?.send ??
		(process.send?.bind(process) as ((msg: unknown) => void) | undefined)
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
	} catch {
		// Non-fatal electronmon discovery hook
	}
}
