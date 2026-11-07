/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	createCheckoutWindowOptions,
	getCloseButtonPlacement,
	isCheckoutReturnUrl,
	isCheckoutUrl,
} from '../src/main/checkout-window.js'

describe('Frameless checkout window & close button (BR-desktop-39)', () => {
	describe('isCheckoutUrl', () => {
		it('identifies canonical DodoPayments checkout URLs', () => {
			expect(
				isCheckoutUrl(
					'https://checkout.dodopayments.com/buy/pdt_0NkFeqcJL7YVFgj8p4vYg?quantity=1',
				),
			).toBe(true)
			expect(
				isCheckoutUrl(
					'https://test.checkout.dodopayments.com/buy/pdt_0NWpVDU3kVcVuB10ycNiQ',
				),
			).toBe(true)
		})

		it('rejects internal Qui routes and unrelated external domains', () => {
			expect(isCheckoutUrl('http://localhost:7476/settings')).toBe(false)
			expect(isCheckoutUrl('http://localhost:7476/login')).toBe(false)
			expect(
				isCheckoutUrl('https://github.com/Johann-Goncalves-Pereira/Qui'),
			).toBe(false)
			expect(isCheckoutUrl('https://crypto.getqui.com')).toBe(false)
			expect(isCheckoutUrl('invalid-url')).toBe(false)
		})
	})

	describe('isCheckoutReturnUrl', () => {
		it('detects return URL with checkout=success', () => {
			expect(
				isCheckoutReturnUrl(
					'http://localhost:7476/settings?tab=themes&checkout=success',
					'http://localhost:7476',
				),
			).toBe(true)
			expect(
				isCheckoutReturnUrl(
					'http://localhost:5173/settings?tab=themes&checkout=success&status=succeeded',
					'http://localhost:5173',
				),
			).toBe(true)
		})

		it('rejects URLs without checkout parameters', () => {
			expect(
				isCheckoutReturnUrl(
					'http://localhost:7476/settings?tab=themes',
					'http://localhost:7476',
				),
			).toBe(false)
			expect(
				isCheckoutReturnUrl(
					'https://checkout.dodopayments.com/buy/pdt_123',
					'http://localhost:7476',
				),
			).toBe(false)
		})
	})

	describe('createCheckoutWindowOptions', () => {
		it('configures a frameless window without system title bar (BR-desktop-39)', () => {
			const options = createCheckoutWindowOptions()

			// System bar must be completely removed
			expect(options.frame).toBe(false)
			// Dark background prevents white flashes during load
			expect(options.backgroundColor).toBe('#0b0c0e')
			// Window dimensions suitable for modal checkout
			expect(options.minWidth).toBeGreaterThanOrEqual(500)
			expect(options.minHeight).toBeGreaterThanOrEqual(500)
			// Web preferences include checkout preload
			expect(options.webPreferences?.preload).toContain('checkout.cjs')
			expect(options.webPreferences?.contextIsolation).toBe(true)
		})
	})

	describe('getCloseButtonPlacement', () => {
		it('places close button on top-left for macOS (darwin)', () => {
			const placement = getCloseButtonPlacement('darwin')
			expect(placement.side).toBe('left')
			expect(placement.top).toBe(14)
			expect(placement.offset).toBe(14)
		})

		it('places close button on top-right for Windows and Linux', () => {
			const winPlacement = getCloseButtonPlacement('win32')
			expect(winPlacement.side).toBe('right')
			expect(winPlacement.top).toBe(14)
			expect(winPlacement.offset).toBe(14)

			const linuxPlacement = getCloseButtonPlacement('linux')
			expect(linuxPlacement.side).toBe('right')
			expect(linuxPlacement.top).toBe(14)
			expect(linuxPlacement.offset).toBe(14)
		})
	})

	it('configures checkout preload script as CommonJS .cjs', async () => {
		const fs = await import('node:fs')
		const path = await import('node:path')
		const cjsPath = path.resolve(__dirname, '../dist/preload/checkout.cjs')

		expect(fs.existsSync(cjsPath)).toBe(true)
		const content = fs.readFileSync(cjsPath, 'utf8')
		expect(content).toContain('checkout:close')
		expect(content).toContain('qui-checkout-close-btn')
	})
})
