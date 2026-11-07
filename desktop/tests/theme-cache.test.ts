/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	readCachedTheme,
	type ThemeSyncPayload,
	themeCacheFilePath,
	writeCachedTheme,
} from '../src/main/theme-cache.js'

describe('Theme cache persistence (BR-desktop-28)', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(path.join(tmpdir(), 'qui-theme-test-'))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('returns null when theme cache file does not exist', () => {
		expect(readCachedTheme(tempDir)).toBeNull()
	})

	it('writes and reads a valid theme payload', () => {
		const payload: ThemeSyncPayload = {
			id: 'nord',
			name: 'Nord',
			isDark: true,
			cssVars: {
				dark: {
					'--background': 'oklch(0.2 0.05 240)',
					'--foreground': 'oklch(0.9 0.01 240)',
					'--primary': 'oklch(0.7 0.1 230)',
				},
				light: {
					'--background': 'oklch(0.98 0.01 240)',
				},
			},
			rawCss: ':root { --custom: #fff; }',
		}

		writeCachedTheme(tempDir, payload)
		const loaded = readCachedTheme(tempDir)
		expect(loaded).toEqual(payload)
	})

	it('returns null gracefully on corrupted JSON in cache file', () => {
		const filePath = themeCacheFilePath(tempDir)
		writeFileSync(filePath, '{ invalid json', 'utf8')
		expect(readCachedTheme(tempDir)).toBeNull()
	})

	it('returns null gracefully when payload lacks required fields', () => {
		const filePath = themeCacheFilePath(tempDir)
		writeFileSync(filePath, JSON.stringify({ noId: true }), 'utf8')
		expect(readCachedTheme(tempDir)).toBeNull()
	})

	it('exposes syncTheme on desktop preload bridge (BR-desktop-28)', async () => {
		const fs = await import('node:fs')
		const cjsPath = path.resolve(__dirname, '../dist/preload/index.cjs')

		expect(fs.existsSync(cjsPath)).toBe(true)
		const content = fs.readFileSync(cjsPath, 'utf8')
		expect(content).toContain('syncTheme')
		expect(content).toContain('theme:sync')
	})
})
