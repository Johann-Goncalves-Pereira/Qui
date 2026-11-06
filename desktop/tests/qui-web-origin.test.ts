/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_QUI_PORT } from '../src/shared/constants.js'
import {
	DEFAULT_VITE_ORIGIN,
	quiWebLoginUrl,
	resolveQuiWebOrigin,
} from '../src/shared/qui-web-origin.js'

describe('resolveQuiWebOrigin (BR-desktop-19)', () => {
	it('uses loopback Qui in production', () => {
		expect(resolveQuiWebOrigin()).toBe(`http://localhost:${DEFAULT_QUI_PORT}`)
	})

	it('uses Vite when QUI_DESKTOP_DEV is enabled', () => {
		expect(resolveQuiWebOrigin({ desktopDev: true })).toBe(DEFAULT_VITE_ORIGIN)
	})

	it('lets QUI_WEB_ORIGIN override desktop dev', () => {
		expect(
			resolveQuiWebOrigin({
				desktopDev: true,
				envOrigin: 'http://localhost:3000/',
			}),
		).toBe('http://localhost:3000')
	})

	it('builds the login URL from the resolved origin', () => {
		expect(quiWebLoginUrl(DEFAULT_VITE_ORIGIN)).toBe(
			`${DEFAULT_VITE_ORIGIN}/login`,
		)
	})
})
