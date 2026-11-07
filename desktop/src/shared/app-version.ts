/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reads the desktop package version. Falls back to `0.0.0` if the file is
 * missing (tests may pass an explicit path or string).
 */
export function readAppVersion(
	packageJsonPath: string = defaultPackageJsonPath(),
): string {
	try {
		const raw = readFileSync(packageJsonPath, 'utf8')
		const parsed = JSON.parse(raw) as { version?: unknown }
		const version = String(parsed.version ?? '').trim()
		return version || '0.0.0'
	} catch {
		return '0.0.0'
	}
}

function defaultPackageJsonPath(): string {
	const here = path.dirname(fileURLToPath(import.meta.url))
	// dist/shared → ../../package.json ; src/shared → ../../package.json
	return path.join(here, '..', '..', 'package.json')
}
