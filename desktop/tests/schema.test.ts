/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { APP_NAME } from '../src/shared/constants.js'
import {
	BiometricAuthResultSchema,
	DesktopConfigSchema,
	DockerContainerStatusSchema,
	DockerUpdateInfoSchema,
	QBitContainerConfigSchema,
	QuiContainerConfigSchema,
	TorrentTransferStatsSchema,
} from '../src/shared/types.js'

describe('Effect/Schema desktop validation', () => {
	it('validates DockerContainerStatus with proper structure', () => {
		const valid = {
			name: 'qui',
			state: 'running',
			status: 'Up 2 hours',
			image: 'ghcr.io/autobrr/qui:latest',
			port: 7476,
		}
		const decoded = Schema.decodeUnknownSync(DockerContainerStatusSchema)(valid)
		expect(decoded.name).toBe('qui')
		expect(decoded.port).toBe(7476)
	})

	it('rejects DockerContainerStatus when required fields are missing or wrong type', () => {
		const invalid = {
			name: 'qui',
			port: 'not-a-number',
		}
		expect(() =>
			Schema.decodeUnknownSync(DockerContainerStatusSchema)(invalid),
		).toThrow()
	})

	it('validates DockerUpdateInfo schema correctly', () => {
		const valid = {
			hasUpdate: true,
			image: 'ghcr.io/autobrr/qui:latest',
			localDigest: 'sha256:1111',
			remoteDigest: 'sha256:2222',
		}
		const decoded = Schema.decodeUnknownSync(DockerUpdateInfoSchema)(valid)
		expect(decoded.hasUpdate).toBe(true)
	})

	it('validates TorrentTransferStats schema correctly', () => {
		const valid = {
			dlSpeed: 1048576,
			upSpeed: 524288,
			activeCount: 5,
			totalCount: 15,
		}
		const decoded = Schema.decodeUnknownSync(TorrentTransferStatsSchema)(valid)
		expect(decoded.dlSpeed).toBe(1048576)
	})

	it('validates BiometricAuthResult with optional error field', () => {
		const success = { success: true }
		const decodedSuccess = Schema.decodeUnknownSync(BiometricAuthResultSchema)(
			success,
		)
		expect(decodedSuccess.success).toBe(true)
		expect(decodedSuccess.error).toBeUndefined()

		const failure = { success: false, error: 'User cancelled' }
		const decodedFailure = Schema.decodeUnknownSync(BiometricAuthResultSchema)(
			failure,
		)
		expect(decodedFailure.success).toBe(false)
		expect(decodedFailure.error).toBe('User cancelled')
	})

	it('validates DesktopConfig schema', () => {
		const valid = {
			quiUrl: 'http://127.0.0.1:7476',
			qbitUrl: 'http://127.0.0.1:8080',
			enableTouchId: true,
			theme: 'minimal',
			minimizeToTray: true,
			autoUpdateImages: false,
		}
		const decoded = Schema.decodeUnknownSync(DesktopConfigSchema)(valid)
		expect(decoded.theme).toBe('minimal')
	})

	it('validates QuiContainerConfigSchema structure and types', () => {
		const valid = {
			port: 7476,
			configPath: '/path/to/qui',
			dataPath: '/path/to/data',
			puid: '1000',
			pgid: '1000',
			umask: '002',
			logLevel: 'INFO',
			baseUrl: '/qui',
			tz: 'UTC',
			restartPolicy: 'unless-stopped',
			image: 'qui-desktop:local',
		}
		const decoded = Schema.decodeUnknownSync(QuiContainerConfigSchema)(valid)
		expect(decoded.port).toBe(7476)
		expect(decoded.logLevel).toBe('INFO')
	})

	it('validates QBitContainerConfigSchema structure and types', () => {
		const valid = {
			port: 8080,
			peerPort: 6881,
			configPath: '/path/to/qbit',
			downloadsPath: '/path/to/downloads',
			puid: '1000',
			pgid: '1000',
			umask: '022',
			tz: 'America/New_York',
			restartPolicy: 'unless-stopped',
			image: 'lscr.io/linuxserver/qbittorrent:latest',
		}
		const decoded = Schema.decodeUnknownSync(QBitContainerConfigSchema)(valid)
		expect(decoded.port).toBe(8080)
		expect(decoded.peerPort).toBe(6881)
	})

	it('enforces capitalized app name branding Qui (BR-desktop-06)', () => {
		expect(APP_NAME).toBe('Qui')
		expect(APP_NAME).not.toBe('qui')
	})
})
