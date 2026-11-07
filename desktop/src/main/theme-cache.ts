/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Schema } from 'effect'

import {
	type ThemeSyncPayload,
	ThemeSyncPayloadSchema,
} from '../shared/types.js'

export { type ThemeSyncPayload, ThemeSyncPayloadSchema }

export function themeCacheFilePath(userDataDir: string): string {
	return path.join(userDataDir, 'theme-cache.json')
}

export function readCachedTheme(userDataDir: string): ThemeSyncPayload | null {
	try {
		const raw = readFileSync(themeCacheFilePath(userDataDir), 'utf8')
		const parsed = JSON.parse(raw)
		return Schema.decodeUnknownSync(ThemeSyncPayloadSchema)(parsed)
	} catch {
		return null
	}
}

export function writeCachedTheme(
	userDataDir: string,
	payload: ThemeSyncPayload,
): void {
	try {
		const validated = Schema.decodeUnknownSync(ThemeSyncPayloadSchema)(payload)
		writeFileSync(
			themeCacheFilePath(userDataDir),
			JSON.stringify(validated, null, 2),
			'utf8',
		)
	} catch (err) {
		console.warn('Failed to cache theme payload:', err)
	}
}
