/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	backupStorageRoot,
	createPreUpdateBackup,
	listPreUpdateBackups,
} from '../src/main/backup.js'

describe('Pre-update backup engine (BR-desktop-31)', () => {
	const tempBase = path.join(
		process.cwd(),
		'tests',
		'fixtures',
		`backup-test-${Date.now()}`,
	)
	const mockHome = path.join(tempBase, 'mock-home')
	const mockUserData = path.join(tempBase, 'mock-userdata')

	beforeEach(() => {
		mkdirSync(mockHome, { recursive: true })
		mkdirSync(mockUserData, { recursive: true })
	})

	afterEach(() => {
		try {
			rmSync(tempBase, { recursive: true, force: true })
		} catch {
			// ignore cleanup errors
		}
	})

	it('resolves platform-specific backup storage root under Application Support on darwin', () => {
		const darwinPath = backupStorageRoot('/Users/testuser', 'darwin')
		expect(darwinPath).toBe(
			'/Users/testuser/Library/Application Support/Qui/backups',
		)

		const winPath = backupStorageRoot('C:\\Users\\testuser', 'win32')
		expect(winPath).toBe(
			path.join('C:\\Users\\testuser', 'AppData', 'Roaming', 'Qui', 'backups'),
		)

		const linuxPath = backupStorageRoot('/home/testuser', 'linux')
		expect(linuxPath).toBe('/home/testuser/.local/share/qui-desktop/backups')
	})

	it('creates a verified pre-update backup snapshot preserving container configs and metadata', async () => {
		// Set up mock docker data dirs
		const quiConfigDir = path.join(tempBase, 'docker', 'qui')
		const qbitConfigDir = path.join(tempBase, 'docker', 'qbittorrent')
		mkdirSync(quiConfigDir, { recursive: true })
		mkdirSync(qbitConfigDir, { recursive: true })

		writeFileSync(path.join(quiConfigDir, 'qui.db'), 'mock sqlite data')
		writeFileSync(path.join(quiConfigDir, '.env'), 'QUI_PORT=7476')
		writeFileSync(
			path.join(qbitConfigDir, 'qBittorrent.conf'),
			'[Preferences]\nWebUI\\Port=8080',
		)

		// Set up mock user data
		writeFileSync(
			path.join(mockUserData, 'theme.json'),
			JSON.stringify({ active: 'dark' }),
		)

		const mockDataDirs = {
			quiConfig: quiConfigDir,
			qbitConfig: qbitConfigDir,
			downloads: path.join(tempBase, 'downloads'),
			gazelleConfig: path.join(tempBase, 'gazelle', 'config'),
			gazelleData: path.join(tempBase, 'gazelle', 'data'),
			gazelleRepo: path.join(tempBase, 'gazelle', 'repo'),
		}

		const meta = await createPreUpdateBackup('qui', {
			home: mockHome,
			platform: 'darwin',
			dataDirs: mockDataDirs,
			userDataDir: mockUserData,
		})

		expect(meta).toBeDefined()
		expect(meta.reason).toBe('qui')
		expect(meta.backedUpItems).toContain('qui')
		expect(meta.backedUpItems).toContain('qbittorrent')
		expect(meta.backedUpItems).toContain('theme.json')
		expect(existsSync(meta.backupPath)).toBe(true)

		// Verify files inside the backup directory
		const backedUpDb = path.join(meta.backupPath, 'qui', 'qui.db')
		expect(existsSync(backedUpDb)).toBe(true)
		expect(readFileSync(backedUpDb, 'utf-8')).toBe('mock sqlite data')

		const backedUpConf = path.join(
			meta.backupPath,
			'qbittorrent',
			'qBittorrent.conf',
		)
		expect(existsSync(backedUpConf)).toBe(true)
		expect(readFileSync(backedUpConf, 'utf-8')).toContain('WebUI\\Port=8080')

		const backedUpTheme = path.join(meta.backupPath, 'theme.json')
		expect(existsSync(backedUpTheme)).toBe(true)

		// Verify backup-meta.json was created
		const metaFile = path.join(meta.backupPath, 'backup-meta.json')
		expect(existsSync(metaFile)).toBe(true)
		const savedMeta = JSON.parse(readFileSync(metaFile, 'utf-8'))
		expect(savedMeta.reason).toBe('qui')
		expect(savedMeta.backedUpItems).toEqual(meta.backedUpItems)
	})

	it('lists existing backups in chronological order (newest first)', async () => {
		const mockDataDirs = {
			quiConfig: path.join(tempBase, 'empty-qui'),
			qbitConfig: path.join(tempBase, 'empty-qbit'),
			downloads: path.join(tempBase, 'downloads'),
			gazelleConfig: path.join(tempBase, 'gazelle', 'config'),
			gazelleData: path.join(tempBase, 'gazelle', 'data'),
			gazelleRepo: path.join(tempBase, 'gazelle', 'repo'),
		}
		mkdirSync(mockDataDirs.quiConfig, { recursive: true })
		writeFileSync(path.join(mockDataDirs.quiConfig, 'test.txt'), 'hello')

		const first = await createPreUpdateBackup('qbittorrent-nox', {
			home: mockHome,
			platform: 'darwin',
			dataDirs: mockDataDirs,
		})

		// Small delay to ensure distinct timestamp
		await new Promise(resolve => setTimeout(resolve, 20))

		const second = await createPreUpdateBackup('desktop-shell', {
			home: mockHome,
			platform: 'darwin',
			dataDirs: mockDataDirs,
		})

		const backups = await listPreUpdateBackups({
			home: mockHome,
			platform: 'darwin',
		})

		expect(backups.length).toBe(2)
		expect(backups[0].backupPath).toBe(second.backupPath)
		expect(backups[1].backupPath).toBe(first.backupPath)
	})

	it('handles missing source directories gracefully without failing', async () => {
		const nonExistentDirs = {
			quiConfig: path.join(tempBase, 'does-not-exist-qui'),
			qbitConfig: path.join(tempBase, 'does-not-exist-qbit'),
			downloads: path.join(tempBase, 'downloads'),
			gazelleConfig: path.join(tempBase, 'gazelle', 'config'),
			gazelleData: path.join(tempBase, 'gazelle', 'data'),
			gazelleRepo: path.join(tempBase, 'gazelle', 'repo'),
		}

		const meta = await createPreUpdateBackup('qui', {
			home: mockHome,
			platform: 'darwin',
			dataDirs: nonExistentDirs,
		})

		expect(meta).toBeDefined()
		expect(existsSync(meta.backupPath)).toBe(true)
		expect(meta.backedUpItems).toEqual([])
	})
})
