/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { CURRENT_APP_VERSION } from '../shared/constants.js'
import { type DockerDataDirs, dockerDataDirs } from './container-layout.js'

export interface BackupMeta {
	backupPath: string
	timestamp: string
	reason: string
	appVersion: string
	backedUpItems: string[]
}

/**
 * Platform-specific root folder where Qui persists automated backups.
 * On macOS, this lives directly inside `~/Library/Application Support/Qui/backups`.
 * The only way this data is removed is when the application is uninstalled (or zapped).
 */
export function backupStorageRoot(
	home: string = homedir(),
	platform: string = process.platform,
): string {
	if (platform === 'darwin') {
		return path.join(home, 'Library', 'Application Support', 'Qui', 'backups')
	}
	if (platform === 'win32') {
		return path.join(home, 'AppData', 'Roaming', 'Qui', 'backups')
	}
	return path.join(home, '.local', 'share', 'qui-desktop', 'backups')
}

export interface BackupOptions {
	home?: string
	platform?: string
	dataDirs?: DockerDataDirs
	userDataDir?: string
}

/**
 * Creates an automated pre-update backup snapshot of all application state,
 * database files (`qui.db`), torrent configurations (`BT_backup`, `qBittorrent.conf`),
 * and user preferences before container recreations or desktop app updates.
 */
export async function createPreUpdateBackup(
	reason: string,
	options: BackupOptions = {},
): Promise<BackupMeta> {
	const home = options.home || homedir()
	const platform = options.platform || process.platform
	const root = backupStorageRoot(home, platform)
	const dirs = options.dataDirs || dockerDataDirs(home, platform)
	const userDataDir =
		options.userDataDir ||
		(platform === 'darwin'
			? path.join(home, 'Library', 'Application Support', 'Qui')
			: platform === 'win32'
				? path.join(home, 'AppData', 'Roaming', 'Qui')
				: path.join(home, '.local', 'share', 'qui-desktop'))

	mkdirSync(root, { recursive: true })

	const now = new Date()
	const dateTag = now.toISOString().replace(/[:.]/g, '-')
	const safeReason = reason.replace(/[^a-zA-Z0-9_-]/g, '_')
	const backupDir = path.join(root, `backup-${dateTag}-${safeReason}`)
	mkdirSync(backupDir, { recursive: true })

	const backedUpItems: string[] = []

	// 1. Qui container config & SQLite database
	if (existsSync(dirs.quiConfig)) {
		const destQui = path.join(backupDir, 'qui')
		try {
			cpSync(dirs.quiConfig, destQui, { recursive: true })
			backedUpItems.push('qui')
		} catch {
			// Best-effort copy
		}
	}

	// 2. qBittorrent config, session state, and resume data
	if (existsSync(dirs.qbitConfig)) {
		const destQbit = path.join(backupDir, 'qbittorrent')
		try {
			cpSync(dirs.qbitConfig, destQbit, { recursive: true })
			backedUpItems.push('qbittorrent')
		} catch {
			// Best-effort copy
		}
	}

	// 3. User data files (theme.json, dismissed digests)
	if (existsSync(userDataDir)) {
		const themeFile = path.join(userDataDir, 'theme.json')
		if (existsSync(themeFile)) {
			try {
				cpSync(themeFile, path.join(backupDir, 'theme.json'))
				backedUpItems.push('theme.json')
			} catch {
				// Best-effort copy
			}
		}

		const dismissedFile = path.join(userDataDir, 'dismissed-digests.json')
		if (existsSync(dismissedFile)) {
			try {
				cpSync(dismissedFile, path.join(backupDir, 'dismissed-digests.json'))
				backedUpItems.push('dismissed-digests.json')
			} catch {
				// Best-effort copy
			}
		}
	}

	const meta: BackupMeta = {
		backupPath: backupDir,
		timestamp: now.toISOString(),
		reason,
		appVersion: CURRENT_APP_VERSION,
		backedUpItems,
	}

	try {
		writeFileSync(
			path.join(backupDir, 'backup-meta.json'),
			JSON.stringify(meta, null, 2),
			'utf-8',
		)
	} catch {
		// Non-fatal
	}

	return meta
}

/**
 * Lists all existing pre-update backups sorted by chronological order (newest first).
 */
export async function listPreUpdateBackups(
	options: { home?: string; platform?: string } = {},
): Promise<BackupMeta[]> {
	const home = options.home || homedir()
	const platform = options.platform || process.platform
	const root = backupStorageRoot(home, platform)

	if (!existsSync(root)) {
		return []
	}

	const entries = readdirSync(root)
	const backups: BackupMeta[] = []

	for (const entry of entries) {
		const entryPath = path.join(root, entry)
		try {
			if (!statSync(entryPath).isDirectory()) continue
			const metaFile = path.join(entryPath, 'backup-meta.json')
			if (existsSync(metaFile)) {
				const content = JSON.parse(readFileSync(metaFile, 'utf-8'))
				backups.push({
					backupPath: entryPath,
					timestamp: content.timestamp || new Date().toISOString(),
					reason: content.reason || 'unknown',
					appVersion: content.appVersion || CURRENT_APP_VERSION,
					backedUpItems: Array.isArray(content.backedUpItems)
						? content.backedUpItems
						: [],
				})
			} else {
				backups.push({
					backupPath: entryPath,
					timestamp: statSync(entryPath).birthtime.toISOString(),
					reason: 'unindexed',
					appVersion: CURRENT_APP_VERSION,
					backedUpItems: [],
				})
			}
		} catch {
			// Skip corrupt entry
		}
	}

	return backups.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	)
}
