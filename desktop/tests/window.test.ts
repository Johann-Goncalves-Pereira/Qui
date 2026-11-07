/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { BrowserWindow } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import {
	applyTrafficLights,
	DEFAULT_TRAFFIC_LIGHT_POSITION,
	SIDEBAR_TRAFFIC_LIGHT_POSITION,
} from '../src/main/window.js'
import {
	GLASS_WINDOW_BACKGROUND,
	windowMaterialForGlass,
} from '../src/main/window-material.js'

describe('Main window surface (BR-desktop-05)', () => {
	it('blurs the desktop with HUD vibrancy while glass is below 100%', () => {
		expect(windowMaterialForGlass(false)).toEqual({
			vibrancy: null,
			backgroundColor: GLASS_WINDOW_BACKGROUND,
		})
		expect(windowMaterialForGlass(true)).toEqual({
			vibrancy: 'hud',
			backgroundColor: GLASS_WINDOW_BACKGROUND,
		})
		expect(GLASS_WINDOW_BACKGROUND).toBe('#00000000')
	})

	it('positions traffic lights centered on the 48px sidebar brand row only when sidebar is open', () => {
		expect(DEFAULT_TRAFFIC_LIGHT_POSITION).toEqual({ x: 12, y: 10 })
		expect(SIDEBAR_TRAFFIC_LIGHT_POSITION).toEqual({ x: 14, y: 18 })

		const setWindowButtonPosition = vi.fn()
		const mockWin = { setWindowButtonPosition } as unknown as BrowserWindow

		const originalPlatform = process.platform
		try {
			Object.defineProperty(process, 'platform', { value: 'darwin' })

			applyTrafficLights(mockWin, true)
			expect(setWindowButtonPosition).toHaveBeenCalledWith(
				SIDEBAR_TRAFFIC_LIGHT_POSITION,
			)

			applyTrafficLights(mockWin, false)
			expect(setWindowButtonPosition).toHaveBeenCalledWith(
				DEFAULT_TRAFFIC_LIGHT_POSITION,
			)
		} finally {
			Object.defineProperty(process, 'platform', { value: originalPlatform })
		}
	})

	it('configures preload script as CommonJS .cjs to prevent ESM syntax error in sandbox (BR-desktop-35)', async () => {
		const fs = await import('node:fs')
		const path = await import('node:path')
		const cjsPath = path.resolve(__dirname, '../dist/preload/index.cjs')

		expect(fs.existsSync(cjsPath)).toBe(true)
		const content = fs.readFileSync(cjsPath, 'utf8')
		expect(content).toContain('require("electron")')
		expect(content).not.toMatch(/^import /m)
	})
})
