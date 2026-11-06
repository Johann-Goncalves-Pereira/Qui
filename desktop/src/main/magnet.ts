/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import type { BrowserWindow } from 'electron'
import { QUI_WEB_ORIGIN } from '../shared/constants.js'

export function normalizeMagnetUrl(input: unknown): string | null {
	if (typeof input !== 'string') return null

	let value = input.trim().replace(/^['"]|['"]$/g, '')
	if (!value) return null

	// Handle up to 2 passes of URL decoding for encoded magnet schemes
	for (let i = 0; i < 2; i++) {
		if (/^magnet:/i.test(value)) return value
		if (!/%[0-9a-f]{2}/i.test(value)) break
		try {
			const decoded = decodeURIComponent(value)
			if (decoded === value) break
			value = decoded.trim()
		} catch {
			break
		}
	}

	return /^magnet:/i.test(value) ? value : null
}

export function findMagnetUrlInArgs(args: string[]): string | null {
	for (const arg of args) {
		const extracted = normalizeMagnetUrl(arg)
		if (extracted) {
			return extracted
		}
	}
	return null
}

export function buildQuiAddMagnetUrl(
	baseUrl: string,
	magnetUrl: string,
): string {
	const origin = baseUrl.replace(/\/$/, '')
	const target = new URL(`${origin}/add`)
	target.searchParams.set('url', magnetUrl)
	return target.toString()
}

export interface AppProtocolClientTarget {
	setAsDefaultProtocolClient: (
		protocol: string,
		path?: string,
		args?: string[],
	) => boolean
}

export function registerMagnetProtocolHandler(
	appInstance: AppProtocolClientTarget,
	options?: {
		isDefaultApp?: boolean
		execPath?: string
		argv?: string[]
	},
): boolean {
	try {
		const isDefaultApp = options?.isDefaultApp ?? process.defaultApp
		const execPath = options?.execPath ?? process.execPath
		const argv = options?.argv ?? process.argv

		if (isDefaultApp && argv.length >= 2) {
			const scriptPath = path.resolve(argv[1])
			return appInstance.setAsDefaultProtocolClient('magnet', execPath, [
				scriptPath,
			])
		}
		return appInstance.setAsDefaultProtocolClient('magnet')
	} catch {
		return false
	}
}

export interface WindowActions {
	isMinimized: () => boolean
	restore: () => void
	show: () => void
	focus: () => void
	loadURL: (url: string) => Promise<void>
}

export class MagnetManager {
	private pendingMagnetUrl: string | null = null
	private quiReady = false

	constructor(private readonly baseUrl: string = QUI_WEB_ORIGIN) {}

	isQuiReady(): boolean {
		return this.quiReady
	}

	setQuiReady(ready: boolean): void {
		this.quiReady = ready
	}

	getPendingMagnetUrl(): string | null {
		return this.pendingMagnetUrl
	}

	consumePendingMagnetUrl(): string | null {
		const url = this.pendingMagnetUrl
		this.pendingMagnetUrl = null
		return url
	}

	consumePendingAddUrl(): string | null {
		const magnet = this.consumePendingMagnetUrl()
		if (!magnet) return null
		return buildQuiAddMagnetUrl(this.baseUrl, magnet)
	}

	handleMagnetUrl(
		rawUrl: string,
		win?: WindowActions | BrowserWindow | null,
	): boolean {
		const magnet = normalizeMagnetUrl(rawUrl)
		if (!magnet) {
			return false
		}

		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
		}

		if (this.quiReady && win) {
			const targetUrl = buildQuiAddMagnetUrl(this.baseUrl, magnet)
			void win.loadURL(targetUrl)
			return true
		}

		this.pendingMagnetUrl = magnet
		return true
	}
}
