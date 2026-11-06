/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Schema } from 'effect'
import {
	type TorrentTransferStats,
	TorrentTransferStatsSchema,
} from '../shared/types.js'

const RawQbitTransferInfoSchema = Schema.Struct({
	dl_info_speed: Schema.optional(Schema.Number),
	up_info_speed: Schema.optional(Schema.Number),
})

export class QuiApiClient {
	constructor(private readonly baseUrl = 'http://127.0.0.1:7476') {}

	async getTransferStats(): Promise<TorrentTransferStats> {
		try {
			// Try querying Qui / qBittorrent transfer info
			const res = await fetch(`${this.baseUrl}/api/torrents/transfer-info`, {
				signal: AbortSignal.timeout(3000),
			})
			if (!res.ok) {
				return { dlSpeed: 0, upSpeed: 0, activeCount: 0, totalCount: 0 }
			}
			const data: unknown = await res.json()
			const parsed = Schema.decodeUnknownSync(RawQbitTransferInfoSchema)(data)

			return Schema.decodeUnknownSync(TorrentTransferStatsSchema)({
				dlSpeed: parsed.dl_info_speed ?? 0,
				upSpeed: parsed.up_info_speed ?? 0,
				activeCount: 0,
				totalCount: 0,
			})
		} catch {
			return { dlSpeed: 0, upSpeed: 0, activeCount: 0, totalCount: 0 }
		}
	}

	async pauseAll(): Promise<boolean> {
		try {
			const res = await fetch(`${this.baseUrl}/api/torrents/pause-all`, {
				method: 'POST',
				signal: AbortSignal.timeout(5000),
			})
			return res.ok
		} catch {
			return false
		}
	}

	async resumeAll(): Promise<boolean> {
		try {
			const res = await fetch(`${this.baseUrl}/api/torrents/resume-all`, {
				method: 'POST',
				signal: AbortSignal.timeout(5000),
			})
			return res.ok
		} catch {
			return false
		}
	}

	async login(
		username: string,
		password: string,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const res = await fetch(`${this.baseUrl}/api/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
				signal: AbortSignal.timeout(8000),
			})

			if (res.ok) {
				return { success: true }
			}

			if (res.status === 401) {
				return { success: false, error: 'Invalid username or password' }
			}
			if (res.status === 429) {
				return {
					success: false,
					error: 'Too many attempts, please try again later',
				}
			}
			if (res.status === 428) {
				return { success: false, error: 'Initial setup required' }
			}

			const errData = (await res.json().catch(() => ({}))) as {
				message?: string
			}
			return {
				success: false,
				error: errData.message || `Login failed (HTTP ${res.status})`,
			}
		} catch {
			return {
				success: false,
				error:
					'Cannot connect to Qui service. Ensure Docker container is running.',
			}
		}
	}
}
