/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	AppReleaseUpdater,
	compareSemver,
	parseSemver,
	preferMacReleaseAsset,
	type ReleaseFetcher,
} from '../src/main/updater.js'

describe('AppReleaseUpdater and semver helpers', () => {
	it('parses semver with or without v prefix', () => {
		expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
		expect(parseSemver('v2.0.1')).toEqual([2, 0, 1])
		expect(parseSemver('1.0')).toEqual([1, 0, 0])
	})

	it('compares versions accurately', () => {
		expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0)
		expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0)
		expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0)
		expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
		expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0)
		expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
	})

	it('identifies when a newer release exists on GitHub', async () => {
		const mockFetcher: ReleaseFetcher = {
			async fetchLatest() {
				return {
					tag_name: 'v1.1.0',
					name: 'Qui v1.1.0 - Glassmorphism Update',
					body: 'Exciting new features and fixes',
					html_url:
						'https://github.com/Johann-Goncalves-Pereira/Qui/releases/tag/v1.1.0',
					published_at: '2026-11-06T12:00:00Z',
					assets: [
						{
							name: 'Qui-1.1.0-arm64.dmg',
							browser_download_url:
								'https://github.com/.../Qui-1.1.0-arm64.dmg',
						},
					],
				}
			},
		}

		const updater = new AppReleaseUpdater(
			'Johann-Goncalves-Pereira/Qui',
			'1.0.0',
			mockFetcher,
		)
		const info = await updater.checkForUpdates()

		expect(info.hasUpdate).toBe(true)
		expect(info.latestVersion).toBe('1.1.0')
		expect(info.currentVersion).toBe('1.0.0')
		expect(info.downloadUrl).toContain('Qui-1.1.0-arm64.dmg')
	})

	it('returns hasUpdate: false when current version is latest or newer', async () => {
		const mockFetcher: ReleaseFetcher = {
			async fetchLatest() {
				return {
					tag_name: 'v1.0.0',
					name: 'Qui v1.0.0',
					body: 'Initial release',
					html_url:
						'https://github.com/Johann-Goncalves-Pereira/Qui/releases/tag/v1.0.0',
					published_at: '2026-11-06T10:00:00Z',
					assets: [],
				}
			},
		}

		const updater = new AppReleaseUpdater(
			'Johann-Goncalves-Pereira/Qui',
			'1.0.0',
			mockFetcher,
		)
		const info = await updater.checkForUpdates()

		expect(info.hasUpdate).toBe(false)
		expect(info.latestVersion).toBe('1.0.0')
	})

	it('handles network or release fetching errors gracefully without crashing', async () => {
		const mockFetcher: ReleaseFetcher = {
			async fetchLatest() {
				throw new Error('Network unreachable')
			},
		}

		const updater = new AppReleaseUpdater(
			'Johann-Goncalves-Pereira/Qui',
			'1.0.0',
			mockFetcher,
		)
		const info = await updater.checkForUpdates()

		expect(info.hasUpdate).toBe(false)
		expect(info.currentVersion).toBe('1.0.0')
	})

	it('prefers .dmg over .zip for mac download assets (BR-desktop-18)', () => {
		expect(
			preferMacReleaseAsset([
				{
					name: 'Qui-1.1.0-arm64.zip',
					browser_download_url: 'https://example.com/Qui.zip',
				},
				{
					name: 'Qui-1.1.0-arm64.dmg',
					browser_download_url: 'https://example.com/Qui.dmg',
				},
			]),
		).toBe('https://example.com/Qui.dmg')
		expect(
			preferMacReleaseAsset([
				{
					name: 'Qui-1.1.0-arm64.zip',
					browser_download_url: 'https://example.com/Qui.zip',
				},
			]),
		).toBe('https://example.com/Qui.zip')
	})

	it('selects the dmg URL when both assets are listed (BR-desktop-18)', async () => {
		const mockFetcher: ReleaseFetcher = {
			async fetchLatest() {
				return {
					tag_name: 'v1.2.0',
					name: 'Qui v1.2.0',
					body: 'notes',
					html_url:
						'https://github.com/Johann-Goncalves-Pereira/Qui/releases/tag/v1.2.0',
					published_at: '2026-11-06T12:00:00Z',
					assets: [
						{
							name: 'Qui-1.2.0-arm64.zip',
							browser_download_url: 'https://example.com/Qui.zip',
						},
						{
							name: 'Qui-1.2.0-arm64.dmg',
							browser_download_url: 'https://example.com/Qui.dmg',
						},
					],
				}
			},
		}

		const updater = new AppReleaseUpdater(
			'Johann-Goncalves-Pereira/Qui',
			'1.0.0',
			mockFetcher,
		)
		const info = await updater.checkForUpdates()
		expect(info.downloadUrl).toBe('https://example.com/Qui.dmg')
		expect(info.hasUpdate).toBe(true)
	})

	it('exposes checkForUpdates, promptUpdates, and applyUpdate on desktop preload bridge (BR-desktop-36, BR-desktop-40)', async () => {
		const fs = await import('node:fs')
		const path = await import('node:path')
		const cjsPath = path.resolve(__dirname, '../dist/preload/index.cjs')

		expect(fs.existsSync(cjsPath)).toBe(true)
		const content = fs.readFileSync(cjsPath, 'utf8')
		expect(content).toContain('checkForUpdates')
		expect(content).toContain('updater:check-app-update')
		expect(content).toContain('promptUpdates')
		expect(content).toContain('updater:prompt-updates')
		expect(content).toContain('applyUpdate')
		expect(content).toContain('updater:apply-update')
	})

	it('applyUpdate performs automated container synchronization and UI reload without external browser navigation (BR-desktop-40)', async () => {
		const mockFetcher: ReleaseFetcher = {
			fetchLatest: async () => ({
				tag_name: 'v0.0.17',
				name: 'Qui v0.0.17',
				body: "## What's Changed\n* Feature in 0.0.17",
				html_url:
					'https://github.com/Johann-Goncalves-Pereira/Qui/releases/tag/v0.0.17',
				published_at: new Date().toISOString(),
				assets: [],
			}),
		}

		const updater = new AppReleaseUpdater(
			'Johann-Goncalves-Pereira/Qui',
			'0.0.16',
			mockFetcher,
		)

		let containerUpdatedWith: string | null = null
		let webUiReloaded = false

		const mockDockerManager: Parameters<typeof updater.applyUpdate>[1] = {
			updateAndRestartContainer: async (_name: string, image: string) => {
				containerUpdatedWith = image
			},
		}

		const result = await updater.applyUpdate(
			null,
			mockDockerManager,
			() => {
				webUiReloaded = true
			},
			'0.0.17',
		)

		expect(result.success).toBe(true)
		expect(containerUpdatedWith).toBe(
			'ghcr.io/johann-goncalves-pereira/qui:0.0.17',
		)
		expect(webUiReloaded).toBe(true)
	})
})
