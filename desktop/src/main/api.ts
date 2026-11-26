/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Schema } from 'effect'
import { QUI_WEB_ORIGIN } from '../shared/constants.js'
import {
	type TorrentTransferStats,
	TorrentTransferStatsSchema,
} from '../shared/types.js'

const InstanceIdSchema = Schema.Struct({
	id: Schema.Number,
})

const InstancesListSchema = Schema.Array(InstanceIdSchema)

const RawQbitTransferInfoSchema = Schema.Struct({
	dl_info_speed: Schema.optional(Schema.Number),
	up_info_speed: Schema.optional(Schema.Number),
})

const TorrentCountsSchema = Schema.Struct({
	status: Schema.optional(
		Schema.Record({ key: Schema.String, value: Schema.Number }),
	),
	total: Schema.optional(Schema.Number),
})

const TorrentsSummarySchema = Schema.Struct({
	total: Schema.optional(Schema.Number),
	counts: Schema.optional(TorrentCountsSchema),
})

const emptyStats = (): TorrentTransferStats =>
	Schema.decodeUnknownSync(TorrentTransferStatsSchema)({
		dlSpeed: 0,
		upSpeed: 0,
		activeCount: 0,
		totalCount: 0,
	})

export type QuiFetch = (input: string, init?: RequestInit) => Promise<Response>

export class QuiApiClient {
	constructor(
		private readonly baseUrl = QUI_WEB_ORIGIN,
		private readonly fetchFn: QuiFetch = (input, init) =>
			globalThis.fetch(input, init),
	) {}

	private origin(): string {
		return this.baseUrl.replace(/\/$/, '')
	}

	private async listInstanceIds(): Promise<number[] | null> {
		try {
			const res = await this.fetchFn(`${this.origin()}/api/instances`, {
				signal: AbortSignal.timeout(3000),
			})
			if (!res.ok) {
				return null
			}
			const data: unknown = await res.json()
			const instances = Schema.decodeUnknownSync(InstancesListSchema)(data)
			return instances.map(inst => inst.id)
		} catch {
			return null
		}
	}

	private async readInstanceTransfer(
		instanceId: number,
	): Promise<{ dlSpeed: number; upSpeed: number } | null> {
		try {
			const res = await this.fetchFn(
				`${this.origin()}/api/instances/${instanceId}/transfer-info`,
				{ signal: AbortSignal.timeout(3000) },
			)
			if (!res.ok) {
				return null
			}
			const data: unknown = await res.json()
			const parsed = Schema.decodeUnknownSync(RawQbitTransferInfoSchema)(data)
			return {
				dlSpeed: parsed.dl_info_speed ?? 0,
				upSpeed: parsed.up_info_speed ?? 0,
			}
		} catch {
			return null
		}
	}

	private async readInstanceCounts(
		instanceId: number,
	): Promise<{ activeCount: number; totalCount: number } | null> {
		try {
			const res = await this.fetchFn(
				`${this.origin()}/api/instances/${instanceId}/torrents?limit=1&prefer=stale`,
				{ signal: AbortSignal.timeout(3000) },
			)
			if (!res.ok) {
				return null
			}
			const data: unknown = await res.json()
			const parsed = Schema.decodeUnknownSync(TorrentsSummarySchema)(data)
			const totalCount = parsed.counts?.total ?? parsed.total ?? 0
			const activeCount = parsed.counts?.status?.running ?? 0
			return { activeCount, totalCount }
		} catch {
			return null
		}
	}

	async getTransferStats(): Promise<TorrentTransferStats> {
		const ids = await this.listInstanceIds()
		if (!ids || ids.length === 0) {
			return emptyStats()
		}

		let dlSpeed = 0
		let upSpeed = 0
		let activeCount = 0
		let totalCount = 0

		for (const id of ids) {
			const [transfer, counts] = await Promise.all([
				this.readInstanceTransfer(id),
				this.readInstanceCounts(id),
			])
			if (transfer) {
				dlSpeed += transfer.dlSpeed
				upSpeed += transfer.upSpeed
			}
			if (counts) {
				activeCount += counts.activeCount
				totalCount += counts.totalCount
			}
		}

		return Schema.decodeUnknownSync(TorrentTransferStatsSchema)({
			dlSpeed,
			upSpeed,
			activeCount,
			totalCount,
		})
	}

	private async bulkActionAll(action: 'pause' | 'resume'): Promise<boolean> {
		const ids = await this.listInstanceIds()
		if (!ids || ids.length === 0) {
			return false
		}

		let allOk = true
		for (const id of ids) {
			try {
				const res = await this.fetchFn(
					`${this.origin()}/api/instances/${id}/torrents/bulk-action`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							hashes: [],
							selectAll: true,
							action,
						}),
						signal: AbortSignal.timeout(5000),
					},
				)
				if (!res.ok) {
					allOk = false
				}
			} catch {
				allOk = false
			}
		}
		return allOk
	}

	async pauseAll(): Promise<boolean> {
		return this.bulkActionAll('pause')
	}

	async resumeAll(): Promise<boolean> {
		return this.bulkActionAll('resume')
	}
}
