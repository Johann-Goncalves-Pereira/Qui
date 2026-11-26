/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { QuiApiClient, type QuiFetch } from '../src/main/api.js'

const BASE = 'http://localhost:7476'

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('QuiApiClient transfer stats (BR-desktop-64)', () => {
	it('lists instances then aggregates transfer-info speeds and torrent counts', async () => {
		const urls: string[] = []
		const fetchFn: QuiFetch = async (input, init) => {
			const url = input
			urls.push(url)
			expect(init?.signal).toBeDefined()
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([
					{ id: 1, name: 'a' },
					{ id: 2, name: 'b' },
				])
			}
			if (url === `${BASE}/api/instances/1/transfer-info`) {
				return jsonResponse({ dl_info_speed: 1000, up_info_speed: 200 })
			}
			if (url === `${BASE}/api/instances/2/transfer-info`) {
				return jsonResponse({ dl_info_speed: 500, up_info_speed: 50 })
			}
			if (url.startsWith(`${BASE}/api/instances/1/torrents`)) {
				expect(url).toContain('limit=1')
				expect(url).toContain('prefer=stale')
				return jsonResponse({
					torrents: [],
					total: 10,
					counts: { status: { running: 3 }, total: 10 },
				})
			}
			if (url.startsWith(`${BASE}/api/instances/2/torrents`)) {
				return jsonResponse({
					torrents: [],
					total: 4,
					counts: { status: { running: 1 }, total: 4 },
				})
			}
			throw new Error(`unexpected url: ${url}`)
		}

		const client = new QuiApiClient(BASE, fetchFn)
		const stats = await client.getTransferStats()

		expect(stats).toEqual({
			dlSpeed: 1500,
			upSpeed: 250,
			activeCount: 4,
			totalCount: 14,
		})
		expect(urls[0]).toBe(`${BASE}/api/instances`)
		expect(urls.some(u => u.includes('/api/torrents/transfer-info'))).toBe(
			false,
		)
	})

	it('falls back to torrents total when counts are missing', async () => {
		const fetchFn: QuiFetch = async input => {
			const url = input
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([{ id: 7 }])
			}
			if (url.includes('/transfer-info')) {
				return jsonResponse({ dl_info_speed: 42, up_info_speed: 0 })
			}
			if (url.includes('/torrents')) {
				return jsonResponse({ torrents: [], total: 5 })
			}
			throw new Error(`unexpected url: ${url}`)
		}

		const client = new QuiApiClient(BASE, fetchFn)
		const stats = await client.getTransferStats()
		expect(stats).toEqual({
			dlSpeed: 42,
			upSpeed: 0,
			activeCount: 0,
			totalCount: 5,
		})
	})

	it('returns zeros when instances list is unauthorized', async () => {
		const fetchFn: QuiFetch = async () =>
			new Response('unauthorized', { status: 401 })
		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.getTransferStats()).resolves.toEqual({
			dlSpeed: 0,
			upSpeed: 0,
			activeCount: 0,
			totalCount: 0,
		})
	})

	it('returns zeros when there are no instances', async () => {
		const fetchFn: QuiFetch = async () => jsonResponse([])
		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.getTransferStats()).resolves.toEqual({
			dlSpeed: 0,
			upSpeed: 0,
			activeCount: 0,
			totalCount: 0,
		})
	})

	it('skips a failed instance and still aggregates the rest', async () => {
		const fetchFn: QuiFetch = async input => {
			const url = input
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([{ id: 1 }, { id: 2 }])
			}
			if (url.includes('/instances/1/')) {
				return new Response('gone', { status: 503 })
			}
			if (url.includes('/transfer-info')) {
				return jsonResponse({ dl_info_speed: 10, up_info_speed: 20 })
			}
			if (url.includes('/torrents')) {
				return jsonResponse({
					torrents: [],
					total: 2,
					counts: { status: { running: 2 }, total: 2 },
				})
			}
			throw new Error(`unexpected url: ${url}`)
		}

		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.getTransferStats()).resolves.toEqual({
			dlSpeed: 10,
			upSpeed: 20,
			activeCount: 2,
			totalCount: 2,
		})
	})
})

describe('QuiApiClient pause and resume (BR-desktop-64)', () => {
	it('posts bulk-action selectAll pause to each instance', async () => {
		const posts: Array<{ url: string; body: unknown }> = []
		const fetchFn: QuiFetch = async (input, init) => {
			const url = input
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([{ id: 1 }, { id: 9 }])
			}
			if (url.endsWith('/torrents/bulk-action')) {
				posts.push({
					url,
					body: JSON.parse(String(init?.body ?? '{}')),
				})
				return new Response(null, { status: 200 })
			}
			throw new Error(`unexpected url: ${url}`)
		}

		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.pauseAll()).resolves.toBe(true)
		expect(posts).toEqual([
			{
				url: `${BASE}/api/instances/1/torrents/bulk-action`,
				body: { hashes: [], selectAll: true, action: 'pause' },
			},
			{
				url: `${BASE}/api/instances/9/torrents/bulk-action`,
				body: { hashes: [], selectAll: true, action: 'pause' },
			},
		])
	})

	it('posts bulk-action selectAll resume to each instance', async () => {
		const posts: Array<{ url: string; body: unknown }> = []
		const fetchFn: QuiFetch = async (input, init) => {
			const url = input
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([{ id: 3 }])
			}
			if (url.endsWith('/torrents/bulk-action')) {
				posts.push({
					url,
					body: JSON.parse(String(init?.body ?? '{}')),
				})
				return new Response(null, { status: 200 })
			}
			throw new Error(`unexpected url: ${url}`)
		}

		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.resumeAll()).resolves.toBe(true)
		expect(posts).toEqual([
			{
				url: `${BASE}/api/instances/3/torrents/bulk-action`,
				body: { hashes: [], selectAll: true, action: 'resume' },
			},
		])
	})

	it('returns false when any bulk-action fails', async () => {
		const fetchFn: QuiFetch = async input => {
			const url = input
			if (url === `${BASE}/api/instances`) {
				return jsonResponse([{ id: 1 }, { id: 2 }])
			}
			if (url.includes('/instances/1/')) {
				return new Response(null, { status: 200 })
			}
			return new Response('fail', { status: 500 })
		}

		const client = new QuiApiClient(BASE, fetchFn)
		await expect(client.pauseAll()).resolves.toBe(false)
	})
})
