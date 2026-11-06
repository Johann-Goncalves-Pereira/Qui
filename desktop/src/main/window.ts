/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow } from 'electron'
import { APP_NAME } from '../shared/constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createGlassWindow(): BrowserWindow {
	const preloadPath = path.join(__dirname, '../preload/index.js')

	const win = new BrowserWindow({
		width: 1280,
		height: 860,
		minWidth: 900,
		minHeight: 600,
		title: APP_NAME,
		titleBarStyle: 'hiddenInset',
		transparent: true,
		backgroundColor: '#00000000',
		vibrancy: 'under-window',
		visualEffectState: 'active',
		show: false,
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	})

	win.once('ready-to-show', () => {
		win.show()
	})

	return win
}
