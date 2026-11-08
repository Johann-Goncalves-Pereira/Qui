/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it, vi } from 'vitest'
import {
	buildQuiAddMagnetUrl,
	findMagnetUrlInArgs,
	isMagnetProtocolClientDefault,
	MagnetManager,
	normalizeMagnetUrl,
	registerMagnetProtocolHandler,
	type WindowActions,
} from '../src/main/magnet.js'

describe('Magnet URL normalization', () => {
	it('normalizes standard magnet URIs', () => {
		const raw =
			'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=Ubuntu'
		expect(normalizeMagnetUrl(raw)).toBe(raw)
	})

	it('normalizes uppercase or mixed-case magnet links', () => {
		const raw = 'MAGNET:?XT=URN:BTIH:ABCDEF'
		expect(normalizeMagnetUrl(raw)).toBe(raw)
	})

	it('strips surrounding quotes and whitespace', () => {
		const raw = '  "magnet:?xt=urn:btih:abcdef"  '
		expect(normalizeMagnetUrl(raw)).toBe('magnet:?xt=urn:btih:abcdef')

		const singleQuoted = "'magnet:?xt=urn:btih:abcdef'"
		expect(normalizeMagnetUrl(singleQuoted)).toBe('magnet:?xt=urn:btih:abcdef')
	})

	it('decodes URL-encoded magnet links', () => {
		const encoded = 'magnet%3A%3Fxt%3Durn%3Abtih%3Aabcdef'
		expect(normalizeMagnetUrl(encoded)).toBe('magnet:?xt=urn:btih:abcdef')
	})

	it('returns null for non-magnet inputs', () => {
		expect(normalizeMagnetUrl(null)).toBeNull()
		expect(normalizeMagnetUrl(undefined)).toBeNull()
		expect(normalizeMagnetUrl('')).toBeNull()
		expect(normalizeMagnetUrl('   ')).toBeNull()
		expect(normalizeMagnetUrl('https://example.com/file.torrent')).toBeNull()
		expect(normalizeMagnetUrl('ftp://example.com/file.torrent')).toBeNull()
	})
})

describe('Finding magnet URL in CLI arguments', () => {
	it('extracts magnet link from argv array', () => {
		const args = [
			'/usr/local/bin/electron',
			'.',
			'--some-flag',
			'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678',
		]
		expect(findMagnetUrlInArgs(args)).toBe(
			'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678',
		)
	})

	it('returns null when no magnet link is present', () => {
		const args = ['/usr/local/bin/electron', '.', '--inspect', '--flag=true']
		expect(findMagnetUrlInArgs(args)).toBeNull()
	})
})

describe('Building Qui add URL for magnet links', () => {
	it('constructs correct /add?url= target URL', () => {
		const target = buildQuiAddMagnetUrl(
			'http://localhost:7476',
			'magnet:?xt=urn:btih:abcdef&dn=Test',
		)
		expect(target).toBe(
			'http://localhost:7476/add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Aabcdef%26dn%3DTest',
		)
	})

	it('handles trailing slash in baseUrl', () => {
		const target = buildQuiAddMagnetUrl(
			'http://localhost:7476/',
			'magnet:?xt=urn:btih:abcdef',
		)
		expect(target).toBe(
			'http://localhost:7476/add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Aabcdef',
		)
	})
})

describe('Registering protocol handler', () => {
	it('calls setAsDefaultProtocolClient in packaged mode', () => {
		const setAsDefaultProtocolClient = vi.fn().mockReturnValue(true)
		const registered = registerMagnetProtocolHandler(
			{ setAsDefaultProtocolClient },
			{ isDefaultApp: false },
		)
		expect(registered).toBe(true)
		expect(setAsDefaultProtocolClient).toHaveBeenCalledWith('magnet')
	})

	it('passes script path in defaultApp (dev) mode', () => {
		const setAsDefaultProtocolClient = vi.fn().mockReturnValue(true)
		const registered = registerMagnetProtocolHandler(
			{ setAsDefaultProtocolClient },
			{
				isDefaultApp: true,
				execPath: '/path/to/electron',
				argv: ['electron', 'dist/main/index.js'],
			},
		)
		expect(registered).toBe(true)
		expect(setAsDefaultProtocolClient).toHaveBeenCalledWith(
			'magnet',
			'/path/to/electron',
			[expect.stringContaining('dist/main/index.js')],
		)
	})

	it('handles exceptions gracefully', () => {
		const setAsDefaultProtocolClient = vi.fn().mockImplementation(() => {
			throw new Error('OS error')
		})
		const registered = registerMagnetProtocolHandler(
			{ setAsDefaultProtocolClient },
			{ isDefaultApp: false },
		)
		expect(registered).toBe(false)
	})
})

describe('Checking default protocol client status', () => {
	it('checks isDefaultProtocolClient in packaged mode', () => {
		const isDefaultProtocolClient = vi.fn().mockReturnValue(true)
		const isDefault = isMagnetProtocolClientDefault(
			{
				setAsDefaultProtocolClient: vi.fn(),
				isDefaultProtocolClient,
			},
			{ isDefaultApp: false },
		)
		expect(isDefault).toBe(true)
		expect(isDefaultProtocolClient).toHaveBeenCalledWith('magnet')
	})

	it('checks isDefaultProtocolClient with script path in defaultApp (dev) mode', () => {
		const isDefaultProtocolClient = vi.fn().mockReturnValue(false)
		const isDefault = isMagnetProtocolClientDefault(
			{
				setAsDefaultProtocolClient: vi.fn(),
				isDefaultProtocolClient,
			},
			{
				isDefaultApp: true,
				execPath: '/path/to/electron',
				argv: ['electron', 'dist/main/index.js'],
			},
		)
		expect(isDefault).toBe(false)
		expect(isDefaultProtocolClient).toHaveBeenCalledWith(
			'magnet',
			'/path/to/electron',
			[expect.stringContaining('dist/main/index.js')],
		)
	})

	it('returns false when isDefaultProtocolClient is unavailable or throws', () => {
		expect(
			isMagnetProtocolClientDefault({ setAsDefaultProtocolClient: vi.fn() }),
		).toBe(false)

		const throwingApp = {
			setAsDefaultProtocolClient: vi.fn(),
			isDefaultProtocolClient: vi.fn().mockImplementation(() => {
				throw new Error('OS lookup failed')
			}),
		}
		expect(isMagnetProtocolClientDefault(throwingApp)).toBe(false)
	})
})

describe('MagnetManager', () => {
	function createMockWindow(): WindowActions & {
		minimized: boolean
		shown: boolean
		focused: boolean
		loadedUrl: string | null
	} {
		return {
			minimized: false,
			shown: false,
			focused: false,
			loadedUrl: null,
			isMinimized() {
				return this.minimized
			},
			restore() {
				this.minimized = false
			},
			show() {
				this.shown = true
			},
			focus() {
				this.focused = true
			},
			loadURL: vi.fn(async (url: string) => {
				this.loadedUrl = url
			}),
		}
	}

	it('queues magnet link when Qui is not ready yet', () => {
		const manager = new MagnetManager('http://localhost:7476')
		const mockWin = createMockWindow()
		mockWin.minimized = true

		const magnet = 'magnet:?xt=urn:btih:abcdef'
		const handled = manager.handleMagnetUrl(magnet, mockWin)

		expect(handled).toBe(true)
		expect(manager.getPendingMagnetUrl()).toBe(magnet)
		expect(mockWin.minimized).toBe(false)
		expect(mockWin.shown).toBe(true)
		expect(mockWin.focused).toBe(true)
		expect(mockWin.loadURL).not.toHaveBeenCalled()

		const addUrl = manager.consumePendingAddUrl()
		expect(addUrl).toBe(
			'http://localhost:7476/add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Aabcdef',
		)
		expect(manager.getPendingMagnetUrl()).toBeNull()
	})

	it('immediately navigates window to add URL when Qui is already ready', () => {
		const manager = new MagnetManager('http://localhost:7476')
		manager.setQuiReady(true)

		const mockWin = createMockWindow()
		const magnet = 'magnet:?xt=urn:btih:1234567890abcdef'
		const handled = manager.handleMagnetUrl(magnet, mockWin)

		expect(handled).toBe(true)
		expect(manager.getPendingMagnetUrl()).toBeNull()
		expect(mockWin.show).toBeDefined()
		expect(mockWin.loadURL).toHaveBeenCalledWith(
			'http://localhost:7476/add?url=magnet%3A%3Fxt%3Durn%3Abtih%3A1234567890abcdef',
		)
	})

	it('rejects invalid non-magnet inputs', () => {
		const manager = new MagnetManager('http://localhost:7476')
		const mockWin = createMockWindow()
		const handled = manager.handleMagnetUrl('https://example.com', mockWin)

		expect(handled).toBe(false)
		expect(manager.getPendingMagnetUrl()).toBeNull()
		expect(mockWin.loadURL).not.toHaveBeenCalled()
	})
})
