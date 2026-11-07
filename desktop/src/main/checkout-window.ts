/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	BrowserWindow,
	type BrowserWindowConstructorOptions,
	ipcMain,
} from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let activeCheckoutWindow: BrowserWindow | null = null
let ipcRegistered = false

export interface CloseButtonPlacement {
	side: 'left' | 'right'
	top: number
	offset: number
}

/**
 * Returns close button placement depending on the host operating system.
 * macOS convention places close on the top-left; Windows & Linux place it on the top-right.
 */
export function getCloseButtonPlacement(
	platform: NodeJS.Platform = process.platform,
): CloseButtonPlacement {
	if (platform === 'darwin') {
		return { side: 'left', top: 14, offset: 14 }
	}
	return { side: 'right', top: 14, offset: 14 }
}

/**
 * Evaluates whether a target URL is a DodoPayments checkout page.
 */
export function isCheckoutUrl(rawUrl: string): boolean {
	try {
		const parsed = new URL(rawUrl)
		const host = parsed.hostname.toLowerCase()
		if (
			host === 'checkout.dodopayments.com' ||
			host === 'test.checkout.dodopayments.com'
		) {
			return true
		}
		if (
			host.endsWith('.dodopayments.com') &&
			parsed.pathname.startsWith('/buy/')
		) {
			return true
		}
		return false
	} catch {
		return false
	}
}

/**
 * Checks if a URL represents a post-checkout redirect back into Qui.
 */
export function isCheckoutReturnUrl(
	rawUrl: string,
	quiOrigin?: string,
): boolean {
	try {
		const parsed = new URL(rawUrl)
		if (parsed.searchParams.get('checkout') === 'success') {
			return true
		}
		if (quiOrigin) {
			const quiParsed = new URL(quiOrigin)
			if (
				parsed.origin === quiParsed.origin &&
				parsed.searchParams.has('checkout')
			) {
				return true
			}
		}
		return false
	} catch {
		return false
	}
}

/**
 * Options for the frameless checkout modal window.
 * Removes the native OS system bar (frame: false) and prepares checkout preload.
 */
export function createCheckoutWindowOptions(
	parent?: BrowserWindow | null,
): BrowserWindowConstructorOptions {
	const preloadPath = path.join(__dirname, '../preload/checkout.cjs')

	return {
		width: 980,
		height: 820,
		minWidth: 540,
		minHeight: 600,
		frame: false,
		titleBarStyle: undefined,
		backgroundColor: '#0b0c0e',
		center: true,
		show: false,
		parent: parent && !parent.isDestroyed() ? parent : undefined,
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	}
}

function ensureCheckoutIpc(): void {
	if (ipcRegistered) {
		return
	}
	ipcRegistered = true
	ipcMain.on('checkout:close', event => {
		const win = BrowserWindow.fromWebContents(event.sender)
		if (win && !win.isDestroyed()) {
			win.close()
		} else if (activeCheckoutWindow && !activeCheckoutWindow.isDestroyed()) {
			activeCheckoutWindow.close()
		}
	})
}

/**
 * Spawns or refocuses a frameless checkout window.
 */
export function openCheckoutWindow(
	url: string,
	parent?: BrowserWindow | null,
	quiOrigin?: string,
): BrowserWindow {
	ensureCheckoutIpc()

	if (activeCheckoutWindow && !activeCheckoutWindow.isDestroyed()) {
		if (activeCheckoutWindow.isMinimized()) {
			activeCheckoutWindow.restore()
		}
		void activeCheckoutWindow.loadURL(url)
		activeCheckoutWindow.show()
		activeCheckoutWindow.focus()
		return activeCheckoutWindow
	}

	const options = createCheckoutWindowOptions(parent)
	const win = new BrowserWindow(options)
	activeCheckoutWindow = win

	const handleReturn = (event: Electron.Event, navUrl: string) => {
		if (isCheckoutReturnUrl(navUrl, quiOrigin)) {
			event.preventDefault()
			if (parent && !parent.isDestroyed()) {
				void parent.loadURL(navUrl)
				parent.show()
				parent.focus()
			}
			win.close()
		}
	}

	win.webContents.on('will-navigate', handleReturn)
	win.webContents.on('will-redirect', handleReturn)

	win.once('ready-to-show', () => {
		win.show()
		win.focus()
	})

	win.on('closed', () => {
		if (activeCheckoutWindow === win) {
			activeCheckoutWindow = null
		}
	})

	void win.loadURL(url)
	return win
}

export function closeCheckoutWindow(): void {
	if (activeCheckoutWindow && !activeCheckoutWindow.isDestroyed()) {
		activeCheckoutWindow.close()
		activeCheckoutWindow = null
	}
}
