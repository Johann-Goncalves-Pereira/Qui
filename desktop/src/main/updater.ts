/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Schema } from 'effect'
import { type BrowserWindow, dialog } from 'electron'
import {
	APP_NAME,
	CURRENT_APP_VERSION,
	GITHUB_REPO,
	getVersionedQuiImage,
	QUI_CONTAINER_NAME,
} from '../shared/constants.js'
import { type AppReleaseInfo, AppReleaseInfoSchema } from '../shared/types.js'
import { createPreUpdateBackup } from './backup.js'
import {
	type BrewUpdateResult,
	checkBrewCaskInstalled,
	runBrewUpdateAndUpgrade,
} from './brew.js'

export function parseSemver(v: string): [number, number, number] {
	const cleaned = v.trim().replace(/^v/i, '')
	const parts = cleaned.split('.').map(p => Number.parseInt(p, 10))
	return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

export function compareSemver(v1: string, v2: string): number {
	const [maj1, min1, pat1] = parseSemver(v1)
	const [maj2, min2, pat2] = parseSemver(v2)

	if (maj1 !== maj2) return maj1 - maj2
	if (min1 !== min2) return min1 - min2
	return pat1 - pat2
}

export interface ReleaseAsset {
	name?: string
	browser_download_url?: string
}

/**
 * Prefer a macOS `.dmg`, then `.zip`. Does not download or install — callers
 * open the URL externally (unsigned builds).
 */
export function preferMacReleaseAsset(
	assets: readonly ReleaseAsset[],
): string | undefined {
	const dmg = assets.find(a => a.name?.toLowerCase().endsWith('.dmg'))
	if (dmg?.browser_download_url) {
		return dmg.browser_download_url
	}
	const zip = assets.find(a => a.name?.toLowerCase().endsWith('.zip'))
	if (zip?.browser_download_url) {
		return zip.browser_download_url
	}
	return undefined
}

export interface ReleaseFetcher {
	fetchLatest(repo: string): Promise<unknown>
}

export class GitHubReleaseFetcher implements ReleaseFetcher {
	async fetchLatest(repo: string): Promise<unknown> {
		const res = await fetch(
			`https://api.github.com/repos/${repo}/releases/latest`,
			{
				headers: {
					'User-Agent': `${APP_NAME}-Desktop-Updater`,
					Accept: 'application/vnd.github.v3+json',
				},
				signal: AbortSignal.timeout(8000),
			},
		)
		if (!res.ok) {
			throw new Error(`Failed to query releases: HTTP ${res.status}`)
		}
		return res.json()
	}
}

export class AppReleaseUpdater {
	private currentVersion: string

	constructor(
		private readonly repo: string = GITHUB_REPO,
		currentVersion: string = CURRENT_APP_VERSION,
		private readonly fetcher: ReleaseFetcher = new GitHubReleaseFetcher(),
		private readonly brewRunner: () => Promise<BrewUpdateResult> = runBrewUpdateAndUpgrade,
		private readonly isBrewChecker: () => Promise<boolean> = checkBrewCaskInstalled,
	) {
		this.currentVersion = currentVersion
	}

	getCurrentVersion(): string {
		return this.currentVersion
	}

	setCurrentVersion(version: string): void {
		this.currentVersion = version.replace(/^v/i, '')
	}

	async checkForUpdates(): Promise<AppReleaseInfo> {
		try {
			const data = (await this.fetcher.fetchLatest(this.repo)) as Record<
				string,
				unknown
			>
			const tagName = String(data.tag_name ?? '')
			const latestVersion = tagName.replace(/^v/i, '') || this.currentVersion
			const hasUpdate = compareSemver(latestVersion, this.currentVersion) > 0

			const assets = Array.isArray(data.assets)
				? (data.assets as ReleaseAsset[])
				: []
			const downloadUrl = preferMacReleaseAsset(assets)

			return Schema.decodeUnknownSync(AppReleaseInfoSchema)({
				hasUpdate,
				currentVersion: this.currentVersion,
				latestVersion,
				tagName,
				name: String(data.name ?? `Release ${tagName}`),
				body: String(data.body ?? ''),
				htmlUrl: String(
					data.html_url ?? `https://github.com/${this.repo}/releases`,
				),
				downloadUrl: downloadUrl || undefined,
				publishedAt: String(data.published_at ?? new Date().toISOString()),
			})
		} catch (err) {
			console.warn('AppReleaseUpdater.checkForUpdates failed:', err)
			return Schema.decodeUnknownSync(AppReleaseInfoSchema)({
				hasUpdate: false,
				currentVersion: this.currentVersion,
				latestVersion: this.currentVersion,
				tagName: `v${this.currentVersion}`,
				name: `${APP_NAME} v${this.currentVersion}`,
				body: '',
				htmlUrl: `https://github.com/${this.repo}/releases`,
				publishedAt: new Date().toISOString(),
			})
		}
	}

	/**
	 * Notifies the renderer window to display the in-app DesktopUpdateDialog.
	 * Eliminates intrusive native macOS NSAlert dialogs when updates are available.
	 */
	async promptUpdateIfAvailable(
		window: BrowserWindow | null,
		info: AppReleaseInfo,
	): Promise<boolean> {
		if (!info.hasUpdate) {
			if (window && !window.isDestroyed()) {
				await dialog.showMessageBox(window, {
					type: 'info',
					title: APP_NAME,
					message: `You are using the latest version of ${APP_NAME} (v${this.currentVersion}).`,
				})
			}
			return false
		}

		if (!window || window.isDestroyed()) return false

		window.webContents.send('updater:show-dialog', info)
		return true
	}

	/**
	 * Automatically applies a desktop update without external browser navigation.
	 * If Qui is installed via Homebrew Cask, runs `brew update` and `brew upgrade --cask qui` internally.
	 * Performs pre-update backup, pulls or loads the target version container image,
	 * recreates the Qui container, advances in-memory app version, and reloads the web UI.
	 */
	async applyUpdate(
		_window: BrowserWindow | null,
		dockerManager: {
			updateAndRestartContainer: (
				name: string,
				image: string,
			) => Promise<unknown>
		},
		loadWebUi: () => Promise<void> | void,
		targetVersion?: string,
		brewRunner?: () => Promise<BrewUpdateResult>,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const info = await this.checkForUpdates()
			const versionToApply = targetVersion || info.latestVersion
			const targetImage = getVersionedQuiImage(versionToApply)

			try {
				await createPreUpdateBackup('desktop-update')
			} catch (err) {
				console.warn('Pre-update backup failed (desktop-update):', err)
			}

			const isBrew = await this.isBrewChecker()
			if (isBrew) {
				const runner = brewRunner ?? this.brewRunner
				const brewResult = await runner()
				if (!brewResult.success) {
					console.warn(
						'Homebrew cask update failed (proceeding with container update):',
						brewResult.error,
					)
				}
			}

			await dockerManager.updateAndRestartContainer(
				QUI_CONTAINER_NAME,
				targetImage,
			)

			this.setCurrentVersion(versionToApply)

			await loadWebUi()

			return { success: true }
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			return { success: false, error: message }
		}
	}
}
