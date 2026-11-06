/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import {
	APP_NAME,
	DEFAULT_QBIT_PORT,
	DEFAULT_QUI_PORT,
	QBIT_CONTAINER_NAME,
	QBIT_IMAGE,
	QUI_CONTAINER_NAME,
	QUI_IMAGE,
} from '../shared/constants.js'
import { QuiApiClient } from './api.js'
import { BiometricAuthService } from './auth.js'
import { DockerManager } from './docker.js'
import { AppTray } from './tray.js'
import { AppReleaseUpdater } from './updater.js'
import { createGlassWindow } from './window.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: AppTray | null = null
let statsInterval: NodeJS.Timeout | null = null
let isQuitting = false

const dockerManager = new DockerManager()
const authService = new BiometricAuthService()
const apiClient = new QuiApiClient()
const appUpdater = new AppReleaseUpdater()

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.show()
			mainWindow.focus()
		}
	})
}

function registerIpcHandlers(): void {
	ipcMain.handle('auth:supported', async () => {
		return authService.isSupported()
	})

	ipcMain.handle('auth:biometrics', async () => {
		const res = await authService.authenticate('Log in to Qui')
		if (res.success && mainWindow) {
			// Once authenticated, navigate directly to local Qui WebUI
			await mainWindow.loadURL(`http://127.0.0.1:${DEFAULT_QUI_PORT}`)
		}
		return res
	})

	ipcMain.handle(
		'auth:login-password',
		async (
			_event,
			{ username, password }: { username: string; password: string },
		) => {
			const res = await apiClient.login(username, password)
			if (res.success && mainWindow) {
				await mainWindow.loadURL(`http://127.0.0.1:${DEFAULT_QUI_PORT}`)
			}
			return res
		},
	)

	ipcMain.handle('docker:status', async () => {
		const qui = await dockerManager.getContainerStatus(
			QUI_CONTAINER_NAME,
			DEFAULT_QUI_PORT,
			QUI_IMAGE,
		)
		const qbit = await dockerManager.getContainerStatus(
			QBIT_CONTAINER_NAME,
			DEFAULT_QBIT_PORT,
			QBIT_IMAGE,
		)
		return { qui, qbit }
	})

	ipcMain.handle('docker:check-updates', async () => {
		const quiUpdate = await dockerManager.checkForImageUpdate(QUI_IMAGE)
		const qbitUpdate = await dockerManager.checkForImageUpdate(QBIT_IMAGE)
		return [quiUpdate, qbitUpdate]
	})

	ipcMain.handle(
		'docker:apply-update',
		async (
			_event,
			{
				containerName,
				image,
				port,
			}: { containerName: string; image: string; port: number },
		) => {
			return dockerManager.updateAndRestartContainer(containerName, image, port)
		},
	)

	ipcMain.handle('api:transfer-stats', async () => {
		return apiClient.getTransferStats()
	})

	ipcMain.handle('updater:check-app-update', async () => {
		return appUpdater.checkForUpdates()
	})
}

async function checkAndPromptDockerUpdates(): Promise<void> {
	try {
		const quiUpdate = await dockerManager.checkForImageUpdate(QUI_IMAGE)
		const qbitUpdate = await dockerManager.checkForImageUpdate(QBIT_IMAGE)

		const updates = [quiUpdate, qbitUpdate].filter(u => u.hasUpdate)
		if (updates.length > 0 && mainWindow) {
			const names = updates.map(u => u.image).join(', ')
			const { response } = await dialog.showMessageBox(mainWindow, {
				type: 'question',
				title: `${APP_NAME} - Docker Image Updates Available`,
				message: `Updates are available for: ${names}`,
				detail:
					'Would you like to pull the latest Docker image(s) and restart the containers now?',
				buttons: ['Update Now', 'Later'],
				defaultId: 0,
				cancelId: 1,
			})

			if (response === 0) {
				for (const u of updates) {
					const isQui = u.image === QUI_IMAGE
					const name = isQui ? QUI_CONTAINER_NAME : QBIT_CONTAINER_NAME
					const port = isQui ? DEFAULT_QUI_PORT : DEFAULT_QBIT_PORT
					await dockerManager.updateAndRestartContainer(name, u.image, port)
				}
				dialog.showMessageBox(mainWindow, {
					type: 'info',
					title: APP_NAME,
					message: 'Containers updated successfully!',
				})
			}
		}
	} catch {
		// Non-blocking update check
	}
}

async function bootstrapApp(): Promise<void> {
	registerIpcHandlers()
	mainWindow = createGlassWindow()

	// Load splash view initially
	const splashPath = path.join(__dirname, '../splash/index.html')
	await mainWindow.loadFile(splashPath)

	// Setup Tray
	tray = new AppTray(mainWindow, {
		onShowApp: () => {
			if (mainWindow) {
				mainWindow.show()
				mainWindow.focus()
			}
		},
		onPauseAll: async () => {
			await apiClient.pauseAll()
		},
		onResumeAll: async () => {
			await apiClient.resumeAll()
		},
		onAddTorrent: () => {
			if (mainWindow) {
				mainWindow.show()
				mainWindow.focus()
			}
		},
		onCheckUpdates: async () => {
			await checkAndPromptDockerUpdates()
		},
		onCheckAppUpdates: async () => {
			const info = await appUpdater.checkForUpdates()
			await appUpdater.promptUpdateIfAvailable(mainWindow, info)
		},
		onQuitApp: () => {
			app.quit()
		},
	})
	tray.init()

	// Bootstrap Docker containers in background
	void dockerManager.ensureContainersRunning().then(async ({ qui, qbit }) => {
		if (tray) tray.updateDockerStatus(qui, qbit)
		if (mainWindow) {
			mainWindow.webContents.send('docker:status-update', { qui, qbit })
		}
		// Check for updates and prompt user if updates exist
		await checkAndPromptDockerUpdates()
		// Check for desktop app updates
		const appRelease = await appUpdater.checkForUpdates()
		if (appRelease.hasUpdate) {
			await appUpdater.promptUpdateIfAvailable(mainWindow, appRelease)
		}
	})

	// Start live transfer stats polling
	statsInterval = setInterval(async () => {
		const stats = await apiClient.getTransferStats()
		if (tray) tray.updateStats(stats)
	}, 2000)

	mainWindow.on('close', event => {
		// Minimize to tray on macOS window close
		if (!isQuitting) {
			event.preventDefault()
			mainWindow?.hide()
		}
	})
}

app.on('before-quit', () => {
	isQuitting = true
	if (statsInterval) {
		clearInterval(statsInterval)
		statsInterval = null
	}
	if (tray) {
		tray.destroy()
		tray = null
	}
})

app.whenReady().then(bootstrapApp)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		void bootstrapApp()
	} else if (mainWindow) {
		mainWindow.show()
	}
})
