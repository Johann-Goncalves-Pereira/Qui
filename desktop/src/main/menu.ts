/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import {
	type BrowserWindow,
	Menu,
	type MenuItemConstructorOptions,
	shell,
} from 'electron'
import { APP_NAME } from '../shared/constants.js'

export interface ApplicationMenuCallbacks {
	onAddTorrent?: () => void
	onPauseAll?: () => Promise<void> | void
	onResumeAll?: () => Promise<void> | void
	onOpenDownloadsFolder?: () => void
	onOpenQuiConfigFolder?: () => void
	onOpenQbitConfigFolder?: () => void
	onCheckAppUpdates?: () => Promise<void> | void
	onCheckDockerUpdates?: () => Promise<void> | void
	onNavigateSettings?: () => void
	onNavigateTorrents?: () => void
	onReloadQui?: () => void
}

export interface ApplicationMenuOptions {
	platform?: NodeJS.Platform
	desktopDev?: boolean
	quiWebOrigin?: string
	backendApiOrigin?: string
	callbacks?: ApplicationMenuCallbacks
	getMainWindow?: () => BrowserWindow | null
}

const GITHUB_REPO_URL = 'https://github.com/Johann-Goncalves-Pereira/Qui'

export function buildApplicationMenuTemplate(
	options: ApplicationMenuOptions = {},
): MenuItemConstructorOptions[] {
	const platform = options.platform ?? process.platform
	const desktopDev = options.desktopDev ?? process.env.QUI_DESKTOP_DEV === '1'
	const quiWebOrigin = options.quiWebOrigin ?? 'http://localhost:7476'
	const backendApiOrigin = options.backendApiOrigin ?? 'http://localhost:7476'
	const cb = options.callbacks ?? {}
	const getWin = options.getMainWindow

	const handleAddTorrent = () => {
		if (cb.onAddTorrent) {
			cb.onAddTorrent()
			return
		}
		const win = getWin?.()
		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
			void win.loadURL(`${quiWebOrigin}/add`)
		}
	}

	const handleNavigateSettings = () => {
		if (cb.onNavigateSettings) {
			cb.onNavigateSettings()
			return
		}
		const win = getWin?.()
		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
			void win.loadURL(`${quiWebOrigin}/settings`)
		}
	}

	const handleNavigateTorrents = () => {
		if (cb.onNavigateTorrents) {
			cb.onNavigateTorrents()
			return
		}
		const win = getWin?.()
		if (win) {
			if (win.isMinimized()) win.restore()
			win.show()
			win.focus()
			void win.loadURL(`${quiWebOrigin}/torrents`)
		}
	}

	const handleReloadQui = () => {
		if (cb.onReloadQui) {
			cb.onReloadQui()
			return
		}
		const win = getWin?.()
		win?.webContents.reload()
	}

	const handleToggleDevTools = () => {
		const win = getWin?.()
		win?.webContents.toggleDevTools()
	}

	const handleClearCacheAndReload = async () => {
		const win = getWin?.()
		if (win) {
			await win.webContents.session.clearCache()
			win.webContents.reloadIgnoringCache()
		}
	}

	const isDarwin = platform === 'darwin'

	// macOS Application menu (Qui)
	const appMenu: MenuItemConstructorOptions = {
		label: APP_NAME,
		submenu: [
			{
				label: `About ${APP_NAME}`,
				role: 'about',
			},
			{
				label: `Check for ${APP_NAME} Updates...`,
				click: () => {
					void cb.onCheckAppUpdates?.()
				},
			},
			{
				label: 'Check for Docker Updates...',
				click: () => {
					void cb.onCheckDockerUpdates?.()
				},
			},
			{ type: 'separator' },
			{
				label: 'Preferences...',
				accelerator: 'CmdOrCtrl+,',
				click: handleNavigateSettings,
			},
			{ type: 'separator' },
			{ role: 'services' },
			{ type: 'separator' },
			{
				role: 'hide',
				label: `Hide ${APP_NAME}`,
			},
			{ role: 'hideOthers' },
			{ role: 'unhide' },
			{ type: 'separator' },
			{
				role: 'quit',
				label: `Quit ${APP_NAME}`,
			},
		],
	}

	// File menu
	const fileMenu: MenuItemConstructorOptions = {
		label: 'File',
		submenu: [
			{
				label: 'Add Torrent or Magnet Link...',
				accelerator: 'CmdOrCtrl+O',
				click: handleAddTorrent,
			},
			{ type: 'separator' },
			{
				label: 'Open Downloads Folder',
				accelerator: 'CmdOrCtrl+Shift+D',
				click: () => {
					cb.onOpenDownloadsFolder?.()
				},
			},
			{
				label: 'Open Qui Config Folder',
				click: () => {
					cb.onOpenQuiConfigFolder?.()
				},
			},
			{
				label: 'Open qBittorrent Config Folder',
				click: () => {
					cb.onOpenQbitConfigFolder?.()
				},
			},
			...(isDarwin
				? [
						{ type: 'separator' as const },
						{
							role: 'close' as const,
							label: 'Close Window',
						},
					]
				: [
						{ type: 'separator' as const },
						{
							label: 'Preferences...',
							accelerator: 'CmdOrCtrl+,',
							click: handleNavigateSettings,
						},
						{ type: 'separator' as const },
						{
							role: 'quit' as const,
							label: `Quit ${APP_NAME}`,
						},
					]),
		],
	}

	// Edit menu
	const editMenu: MenuItemConstructorOptions = {
		label: 'Edit',
		submenu: [
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			{ role: 'paste' },
			{ role: 'pasteAndMatchStyle' },
			{ role: 'delete' },
			{ role: 'selectAll' },
		],
	}

	// Transfers menu (Qui domain specific)
	const transfersMenu: MenuItemConstructorOptions = {
		label: 'Transfers',
		submenu: [
			{
				label: 'Resume All Torrents',
				click: () => {
					void cb.onResumeAll?.()
				},
			},
			{
				label: 'Pause All Torrents',
				click: () => {
					void cb.onPauseAll?.()
				},
			},
			{ type: 'separator' },
			{
				label: 'View Torrents',
				accelerator: 'CmdOrCtrl+T',
				click: handleNavigateTorrents,
			},
		],
	}

	// View menu (DevTools omitted for ordinary users)
	const viewMenu: MenuItemConstructorOptions = {
		label: 'View',
		submenu: [
			{
				label: 'Reload Qui Web App',
				accelerator: 'CmdOrCtrl+R',
				click: handleReloadQui,
			},
			{
				label: 'Force Reload',
				accelerator: 'CmdOrCtrl+Shift+R',
				click: () => {
					const win = getWin?.()
					win?.webContents.reloadIgnoringCache()
				},
			},
			{ type: 'separator' },
			{ role: 'resetZoom', label: 'Actual Size' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' },
		],
	}

	// Developer menu (Strictly conditional on dev hot-reload mode)
	const developerMenu: MenuItemConstructorOptions = {
		label: 'Developer',
		submenu: [
			{
				label: 'Toggle Developer Tools',
				accelerator: isDarwin ? 'Alt+Command+I' : 'Ctrl+Shift+I',
				click: handleToggleDevTools,
			},
			{
				label: 'Reload Electron Window',
				click: () => {
					const win = getWin?.()
					win?.webContents.reload()
				},
			},
			{ type: 'separator' },
			{
				label: `Open Vite Dev Origin (${quiWebOrigin})`,
				click: () => {
					void shell.openExternal(quiWebOrigin)
				},
			},
			{
				label: `Probe Backend Health (${backendApiOrigin}/api/healthz)`,
				click: () => {
					void shell.openExternal(`${backendApiOrigin}/api/healthz`)
				},
			},
			{ type: 'separator' },
			{
				label: 'Clear Cache and Reload',
				click: () => {
					void handleClearCacheAndReload()
				},
			},
		],
	}

	// Window menu
	const windowMenu: MenuItemConstructorOptions = {
		label: 'Window',
		submenu: [
			{ role: 'minimize' },
			{ role: 'zoom' },
			...(isDarwin
				? [
						{ type: 'separator' as const },
						{ role: 'front' as const, label: 'Bring All to Front' },
					]
				: []),
		],
	}

	// Help menu
	const helpMenu: MenuItemConstructorOptions = {
		label: 'Help',
		submenu: [
			{
				label: `${APP_NAME} Documentation`,
				click: () => {
					void shell.openExternal(`${GITHUB_REPO_URL}#readme`)
				},
			},
			{
				label: `${APP_NAME} on GitHub`,
				click: () => {
					void shell.openExternal(GITHUB_REPO_URL)
				},
			},
			{
				label: 'Report an Issue...',
				click: () => {
					void shell.openExternal(`${GITHUB_REPO_URL}/issues/new`)
				},
			},
			{
				label: 'Release Notes...',
				click: () => {
					void shell.openExternal(`${GITHUB_REPO_URL}/releases`)
				},
			},
		],
	}

	const template: MenuItemConstructorOptions[] = []

	if (isDarwin) {
		template.push(appMenu)
	}

	template.push(fileMenu, editMenu, transfersMenu, viewMenu)

	if (desktopDev) {
		template.push(developerMenu)
	}

	if (isDarwin) {
		template.push(windowMenu)
	}

	template.push(helpMenu)

	return template
}

export function registerApplicationMenu(
	options: ApplicationMenuOptions = {},
): Menu {
	const template = buildApplicationMenuTemplate(options)
	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
	return menu
}
