/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it, vi } from 'vitest'
import {
	type ApplicationMenuCallbacks,
	buildApplicationMenuTemplate,
} from '../src/main/menu.js'
import { APP_NAME } from '../src/shared/constants.js'

describe('Application Menu Bar (BR-desktop-22)', () => {
	it('builds a production macOS menu bar without developer tools', () => {
		const template = buildApplicationMenuTemplate({
			platform: 'darwin',
			desktopDev: false,
		})

		const labels = template.map(item => item.label)
		expect(labels).toEqual([
			APP_NAME,
			'File',
			'Edit',
			'Transfers',
			'View',
			'Window',
			'Help',
		])

		// Top-level Developer menu must NOT be present
		expect(labels).not.toContain('Developer')

		// View menu must not contain DevTools in production
		const viewMenu = template.find(item => item.label === 'View')
		expect(viewMenu).toBeDefined()
		const viewSubmenu = Array.isArray(viewMenu?.submenu) ? viewMenu.submenu : []
		const hasDevToolsInView = viewSubmenu.some(
			sub =>
				sub.role === 'toggleDevTools' ||
				(typeof sub.label === 'string' &&
					sub.label.toLowerCase().includes('developer tools')),
		)
		expect(hasDevToolsInView).toBe(false)

		// Transfers menu contains domain actions
		const transfersMenu = template.find(item => item.label === 'Transfers')
		expect(transfersMenu).toBeDefined()
		const transfersSubmenu = Array.isArray(transfersMenu?.submenu)
			? transfersMenu.submenu
			: []
		const transferLabels = transfersSubmenu.map(s => s.label)
		expect(transferLabels).toContain('Resume All Torrents')
		expect(transferLabels).toContain('Pause All Torrents')
		expect(transferLabels).toContain('View Torrents')

		// File menu contains Qui folder and torrent actions
		const fileMenu = template.find(item => item.label === 'File')
		expect(fileMenu).toBeDefined()
		const fileSubmenu = Array.isArray(fileMenu?.submenu) ? fileMenu.submenu : []
		const fileLabels = fileSubmenu.map(s => s.label)
		expect(fileLabels).toContain('Add Torrent or Magnet Link...')
		expect(fileLabels).toContain('Open Downloads Folder')
		expect(fileLabels).toContain('Open Qui Config Folder')
		expect(fileLabels).toContain('Open qBittorrent Config Folder')
	})

	it('registers a dedicated Developer menu when desktopDev is true', () => {
		const template = buildApplicationMenuTemplate({
			platform: 'darwin',
			desktopDev: true,
			quiWebOrigin: 'http://localhost:5173',
		})

		const labels = template.map(item => item.label)
		expect(labels).toContain('Developer')

		const devMenu = template.find(item => item.label === 'Developer')
		expect(devMenu).toBeDefined()
		const devSubmenu = Array.isArray(devMenu?.submenu) ? devMenu.submenu : []
		const devLabels = devSubmenu.map(s => s.label)

		expect(devLabels).toContain('Toggle Developer Tools')
		expect(devLabels).toContain('Reload Electron Window')
		expect(devLabels).toContain('Open Vite Dev Origin (http://localhost:5173)')
		expect(devLabels).toContain(
			'Probe Backend Health (http://localhost:7476/api/healthz)',
		)
		expect(devLabels).toContain('Clear Cache and Reload')

		const toggleDevToolsItem = devSubmenu.find(
			s => s.label === 'Toggle Developer Tools',
		)
		expect(toggleDevToolsItem?.accelerator).toBe('Alt+Command+I')
	})

	it('configures non-macOS platforms with clean File and Transfers menus', () => {
		const template = buildApplicationMenuTemplate({
			platform: 'linux',
			desktopDev: false,
		})

		const labels = template.map(item => item.label)
		expect(labels).toEqual(['File', 'Edit', 'Transfers', 'View', 'Help'])
		expect(labels).not.toContain('Developer')

		const fileMenu = template.find(item => item.label === 'File')
		const fileSubmenu = Array.isArray(fileMenu?.submenu) ? fileMenu.submenu : []
		const fileLabels = fileSubmenu.map(s => s.label)
		expect(fileLabels).toContain('Preferences...')
		expect(fileLabels).toContain('Quit Qui')
	})

	it('dispatches callbacks accurately when menu items are clicked', async () => {
		const callbacks: ApplicationMenuCallbacks = {
			onAddTorrent: vi.fn(),
			onPauseAll: vi.fn(),
			onResumeAll: vi.fn(),
			onOpenDownloadsFolder: vi.fn(),
			onOpenQuiConfigFolder: vi.fn(),
			onOpenQbitConfigFolder: vi.fn(),
			onCheckAppUpdates: vi.fn(),
			onCheckDockerUpdates: vi.fn(),
			onNavigateSettings: vi.fn(),
			onNavigateTorrents: vi.fn(),
			onReloadQui: vi.fn(),
		}

		const template = buildApplicationMenuTemplate({
			platform: 'darwin',
			desktopDev: false,
			callbacks,
		})

		const appMenu = template.find(item => item.label === APP_NAME)
		const appSubmenu = Array.isArray(appMenu?.submenu) ? appMenu.submenu : []
		const checkAppUpdateItem = appSubmenu.find(
			s => s.label === `Check for ${APP_NAME} Updates...`,
		)
		checkAppUpdateItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onCheckAppUpdates).toHaveBeenCalledTimes(1)

		const preferencesItem = appSubmenu.find(s => s.label === 'Preferences...')
		preferencesItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onNavigateSettings).toHaveBeenCalledTimes(1)

		const fileMenu = template.find(item => item.label === 'File')
		const fileSubmenu = Array.isArray(fileMenu?.submenu) ? fileMenu.submenu : []
		const addTorrentItem = fileSubmenu.find(
			s => s.label === 'Add Torrent or Magnet Link...',
		)
		addTorrentItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onAddTorrent).toHaveBeenCalledTimes(1)

		const openDownloadsItem = fileSubmenu.find(
			s => s.label === 'Open Downloads Folder',
		)
		openDownloadsItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onOpenDownloadsFolder).toHaveBeenCalledTimes(1)

		const transfersMenu = template.find(item => item.label === 'Transfers')
		const transfersSubmenu = Array.isArray(transfersMenu?.submenu)
			? transfersMenu.submenu
			: []
		const resumeAllItem = transfersSubmenu.find(
			s => s.label === 'Resume All Torrents',
		)
		resumeAllItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onResumeAll).toHaveBeenCalledTimes(1)

		const pauseAllItem = transfersSubmenu.find(
			s => s.label === 'Pause All Torrents',
		)
		pauseAllItem?.click?.(null as never, null as never, null as never)
		expect(callbacks.onPauseAll).toHaveBeenCalledTimes(1)
	})
})
