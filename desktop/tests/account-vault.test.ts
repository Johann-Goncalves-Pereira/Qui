/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { AccountVault, VpnVault } from '../src/main/account-vault.js'

describe('Encrypted desktop account (BR-desktop-12)', () => {
	it('round-trips the username and password through the cipher', () => {
		let stored: Uint8Array | null = null
		const vault = new AccountVault(
			{
				encrypt: plain => new TextEncoder().encode(`sealed:${plain}`),
				decrypt: bytes =>
					new TextDecoder().decode(bytes).replace(/^sealed:/, ''),
			},
			() => stored,
			bytes => {
				stored = bytes
			},
		)

		expect(vault.has()).toBe(false)
		vault.save({ username: 'ada', password: 's3cret' })
		expect(vault.has()).toBe(true)
		expect(vault.read()).toEqual({ username: 'ada', password: 's3cret' })
		expect(new TextDecoder().decode(stored ?? new Uint8Array())).toContain(
			'sealed:',
		)
	})

	it('round-trips the VPN config through VpnVault (BR-desktop-52)', () => {
		let stored: Uint8Array | null = null
		const vpnVault = new VpnVault(
			{
				encrypt: (plain: string) => new TextEncoder().encode(`sealed:${plain}`),
				decrypt: (bytes: Uint8Array) =>
					new TextDecoder().decode(bytes).replace(/^sealed:/, ''),
			},
			() => stored,
			(bytes: Uint8Array) => {
				stored = bytes
			},
		)

		expect(vpnVault.has()).toBe(false)
		expect(vpnVault.read()).toBe(null)

		const config = {
			enabled: true,
			provider: 'protonvpn',
			wireguardPrivateKey: 'aaaa...=',
			wireguardAddress: '10.2.0.2/32',
		}
		vpnVault.save(config)
		expect(vpnVault.has()).toBe(true)
		expect(vpnVault.read()).toEqual(config)
	})
})
