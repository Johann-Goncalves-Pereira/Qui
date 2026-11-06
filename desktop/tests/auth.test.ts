/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	BiometricAuthService,
	type BiometricExecutor,
} from '../src/main/auth.js'

describe('BiometricAuthService', () => {
	it('reports supported when executor returns true', async () => {
		const mock: BiometricExecutor = {
			canEvaluate: async () => true,
			evaluate: async () => true,
		}
		const service = new BiometricAuthService(mock)
		expect(await service.isSupported()).toBe(true)
	})

	it('returns success: true when user authenticates with fingerprint', async () => {
		const mock: BiometricExecutor = {
			canEvaluate: async () => true,
			evaluate: async () => true,
		}
		const service = new BiometricAuthService(mock)
		const result = await service.authenticate('Log in to Qui')

		expect(result.success).toBe(true)
		expect(result.error).toBeUndefined()
	})

	it('returns error message when biometric evaluation fails or is cancelled', async () => {
		const mock: BiometricExecutor = {
			canEvaluate: async () => true,
			evaluate: async () => false,
		}
		const service = new BiometricAuthService(mock)
		const result = await service.authenticate('Log in to Qui')

		expect(result.success).toBe(false)
		expect(result.error).toContain('Authentication failed')
	})

	it('returns unsupported error when biometrics cannot be evaluated', async () => {
		const mock: BiometricExecutor = {
			canEvaluate: async () => false,
			evaluate: async () => false,
		}
		const service = new BiometricAuthService(mock)
		const result = await service.authenticate('Log in to Qui')

		expect(result.success).toBe(false)
		expect(result.error).toContain('not available')
	})
})

describe('QuiApiClient password login', () => {
	it('authenticates successfully when credentials are valid', async () => {
		const originalFetch = globalThis.fetch
		globalThis.fetch = async () =>
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})

		try {
			const { QuiApiClient } = await import('../src/main/api.js')
			const client = new QuiApiClient('http://localhost:7476')
			const res = await client.login('admin', 'password123')
			expect(res.success).toBe(true)
			expect(res.error).toBeUndefined()
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	it('returns error when credentials are wrong (401)', async () => {
		const originalFetch = globalThis.fetch
		globalThis.fetch = async () =>
			new Response(JSON.stringify({ message: 'Invalid credentials' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			})

		try {
			const { QuiApiClient } = await import('../src/main/api.js')
			const client = new QuiApiClient('http://localhost:7476')
			const res = await client.login('admin', 'wrong')
			expect(res.success).toBe(false)
			expect(res.error).toBe('Invalid username or password')
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	it('handles service connection errors gracefully', async () => {
		const originalFetch = globalThis.fetch
		globalThis.fetch = async () => {
			throw new Error('Connection refused')
		}

		try {
			const { QuiApiClient } = await import('../src/main/api.js')
			const client = new QuiApiClient('http://localhost:7476')
			const res = await client.login('admin', 'test')
			expect(res.success).toBe(false)
			expect(res.error).toContain('Cannot connect to Qui service')
		} finally {
			globalThis.fetch = originalFetch
		}
	})
})
