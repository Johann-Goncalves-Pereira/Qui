/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { Schema } from 'effect'
import {
	app,
	BrowserWindow,
	ipcMain,
	nativeTheme,
	net,
	safeStorage,
	shell,
} from 'electron'
import {
	CURRENT_APP_VERSION,
	DEFAULT_QBIT_PORT,
	DEFAULT_QUI_PORT,
	GAZELLE_WEB_ORIGIN,
	QBIT_CONTAINER_NAME,
	QBIT_IMAGE,
	QUI_CONTAINER_NAME,
	quiWebLoginUrl,
	resolveQuiImage,
	resolveQuiWebOrigin,
} from '../shared/constants.js'
import { VpnConfigSchema } from '../shared/types.js'
import { AccountVault, VpnVault } from './account-vault.js'
import { QuiApiClient } from './api.js'
import { BiometricAuthService } from './auth.js'
import { createPreUpdateBackup } from './backup.js'
import { isCheckoutUrl, openCheckoutWindow } from './checkout-window.js'
import {
	ensurePodmanDataPermissions,
	ensureQbitPreseedConfig,
	migrateLegacyContainerDataRoot,
	parseWireGuardConf,
	podmanDataDirs,
	updatesWorthPrompting,
} from './container-layout.js'
import {
	type ContainerUpdateTarget,
	formatContainerUpdatePrompt,
} from './container-updater-dialog.js'
import { registerElectronmonMainModules } from './electronmon.js'
import {
	findMagnetUrlInArgs,
	MagnetManager,
	registerMagnetProtocolHandler,
} from './magnet.js'
import { registerApplicationMenu } from './menu.js'
import { PodmanManager } from './podman.js'
import { openWrappedQui, waitForQuiHttpReady } from './qui-ready.js'
import { startupPageUrl } from './startup-page.js'
import { computeStatsPollInterval } from './stats-polling.js'
import {
	readCachedTheme,
	ThemeSyncPayloadSchema,
	writeCachedTheme,
} from './theme-cache.js'
import { AppTray } from './tray.js'
import { AppReleaseUpdater } from './updater.js'
import {
	applyTrafficLights,
	applyWindowMaterial,
	createMainWindow,
} from './window.js'

const DismissedDigestsSchema = Schema.Record({
	key: Schema.String,
	value: Schema.String,
})

let mainWindow: BrowserWindow | null = null
let tray: AppTray | null = null
let isQuitting = false
let statsTimeout: NodeJS.Timeout | null = null

function scheduleNextStatsPoll(): void {
	if (isQuitting) {
		return
	}
	if (statsTimeout) {
		clearTimeout(statsTimeout)
		statsTimeout = null
	}
	const delay = computeStatsPollInterval(
		mainWindow
			? {
					destroyed: mainWindow.isDestroyed(),
					visible: mainWindow.isVisible(),
					minimized: mainWindow.isMinimized(),
				}
			: null,
	)

	statsTimeout = setTimeout(async () => {
		try {
			const stats = await apiClient.getTransferStats()
			if (tray) tray.updateStats(stats)
		} finally {
			scheduleNextStatsPoll()
		}
	}, delay)
}

const desktopDev = process.env.QUI_DESKTOP_DEV === '1'
registerElectronmonMainModules({ desktopDev })

const quiWebOrigin = resolveQuiWebOrigin({
	envOrigin: process.env.QUI_WEB_ORIGIN,
	desktopDev,
})
const quiWebLogin = quiWebLoginUrl(quiWebOrigin)
const quiImage = resolveQuiImage({
	isPackaged: app.isPackaged,
	envImage: process.env.QUI_DESKTOP_IMAGE,
	version: CURRENT_APP_VERSION,
})

const podmanManager = new PodmanManager(undefined, undefined, quiImage)
const biometricAuth = new BiometricAuthService()
/** Suppress repeat Podman image dialogs in one session (tray can force a recheck). */
let podmanImageUpdatePromptShownThisSession = false
let pendingContainerUpdates: ContainerUpdateTarget[] = []
const apiClient = new QuiApiClient(quiWebOrigin, (input, init) =>
	net.fetch(input, init),
)
const appUpdater = new AppReleaseUpdater()
const magnetManager = new MagnetManager(quiWebOrigin)

registerMagnetProtocolHandler(app)

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', (_event, commandLine) => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.show()
			mainWindow.focus()
		}
		const magnetUrl = findMagnetUrlInArgs(commandLine)
		if (magnetUrl) {
			magnetManager.handleMagnetUrl(magnetUrl, mainWindow)
		} else {
			void loadQuiWebUi()
		}
	})
}

// macOS emits 'open-url' when clicking a magnet link, which can happen before whenReady()
app.on('open-url', (event, url) => {
	event.preventDefault()
	magnetManager.handleMagnetUrl(url, mainWindow)
})

// Cold start on Windows / Linux / CLI launch with magnet URI argument
const initialMagnetUrl = findMagnetUrlInArgs(process.argv)
if (initialMagnetUrl) {
	magnetManager.handleMagnetUrl(initialMagnetUrl, mainWindow)
}

function showStartupPage(message: string, processInfo?: string): string {
	const cachedTheme = readCachedTheme(app.getPath('userData'))
	const prefersDark =
		cachedTheme?.isDark !== undefined
			? cachedTheme.isDark
			: nativeTheme.shouldUseDarkColors
	return startupPageUrl(
		message,
		processInfo && processInfo.length > 0 ? processInfo : message,
		prefersDark,
		cachedTheme,
	)
}

async function presentStartupPage(
	win: BrowserWindow,
	message: string,
	processInfo?: string,
): Promise<void> {
	await win.loadURL(showStartupPage(message, processInfo))
	if (!win.isVisible()) {
		win.show()
	}
}

let openingQui: Promise<void> | null = null

async function loadQuiWebUi(): Promise<void> {
	if (!mainWindow) {
		return
	}
	if (openingQui) {
		return openingQui
	}
	const win = mainWindow
	openingQui = (async () => {
		let result: 'opened' | 'unavailable' | 'failed' = 'failed'
		try {
			result = await openWrappedQui({
				showStatus: async (message, processInfo) => {
					await presentStartupPage(win, message, processInfo)
				},
				ensureContainers: async () => {
					// Hot-reload mode expects `make dev` (air + Vite). Do not bind :7476.
					if (desktopDev) {
						return
					}
					await podmanManager.ensurePodmanEngineReady({
						onStartingMachine: async () => {
							await presentStartupPage(
								win,
								'Starting Qui…',
								'Starting Podman machine…',
							)
						},
					})
					migrateLegacyContainerDataRoot(homedir(), process.platform)
					const dirs = podmanDataDirs(homedir(), process.platform)
					for (const dir of [dirs.quiConfig, dirs.qbitConfig, dirs.downloads]) {
						mkdirSync(dir, { recursive: true })
					}
					ensurePodmanDataPermissions(dirs)
					ensureQbitPreseedConfig(dirs.qbitConfig)
					await podmanManager.alignContainer(
						QUI_CONTAINER_NAME,
						quiImage,
						dirs.quiConfig,
						'/config',
						[{ hostDir: dirs.downloads, containerDir: '/downloads' }],
					)
					await podmanManager.alignContainer(
						QBIT_CONTAINER_NAME,
						QBIT_IMAGE,
						dirs.qbitConfig,
						'/config',
						[{ hostDir: dirs.downloads, containerDir: '/downloads' }],
					)
					const { qui, qbit } = await podmanManager.ensureContainersRunning()
					// Re-apply saved VPN after base ensure freed any leftover
					// qui-vpn ports (BR-desktop-56).
					const rawVpn = vpnVault().read()
					if (rawVpn) {
						const savedVpn = Schema.decodeUnknownSync(VpnConfigSchema)(rawVpn)
						if (savedVpn.enabled) {
							const vpnApply = await podmanManager.applyVpnConfig(savedVpn)
							if (!vpnApply.success) {
								throw new Error(
									vpnApply.error ??
										'Failed to re-apply saved VPN configuration',
								)
							}
						}
					}
					if (tray) tray.updatePodmanStatus(qui, qbit)
				},
				waitForHttp: () => waitForQuiHttpReady({ baseUrl: quiWebOrigin }),
				openWeb: async () => {
					const targetUrl = magnetManager.consumePendingAddUrl() ?? quiWebLogin
					await win.loadURL(targetUrl)
				},
				unavailableMessage: desktopDev
					? `Nothing is serving ${quiWebOrigin}. Start make dev (Vite on 5173, API on 7476), then reload.`
					: `Nothing is serving ${quiWebOrigin} yet. Check Podman (podman machine start), then use Tray → Reload Qui web app.`,
			})
		} catch (error) {
			const detail =
				error instanceof Error ? error.message : 'Podman or Qui failed to start'
			await presentStartupPage(win, 'Failed to start Qui', detail)
		} finally {
			openingQui = null
		}
		if (result === 'opened') {
			magnetManager.setQuiReady(true)
			const pendingAddUrl = magnetManager.consumePendingAddUrl()
			if (pendingAddUrl && mainWindow) {
				void mainWindow.loadURL(pendingAddUrl)
			}
		}
	})()
	return openingQui
}

function registerIpcHandlers(): void {
	ipcMain.handle('auth:biometrics', async (_event, reason?: string) =>
		biometricAuth.authenticate(
			typeof reason === 'string' && reason.length > 0
				? reason
				: 'Secure your Qui session',
		),
	)

	ipcMain.handle('podman:status', async () => {
		const qui = await podmanManager.getContainerStatus(
			QUI_CONTAINER_NAME,
			DEFAULT_QUI_PORT,
			quiImage,
		)
		const qbit = await podmanManager.getContainerStatus(
			QBIT_CONTAINER_NAME,
			DEFAULT_QBIT_PORT,
			QBIT_IMAGE,
		)
		const gazelle = await podmanManager.getGazelleStatus()
		return { qui, qbit, gazelle }
	})

	ipcMain.handle('podman:check-updates', async () => {
		const quiUpdate = await podmanManager.checkForImageUpdate(quiImage)
		const qbitUpdate = await podmanManager.checkForImageUpdate(QBIT_IMAGE)
		return [quiUpdate, qbitUpdate]
	})

	ipcMain.handle(
		'podman:apply-update',
		async (
			_event,
			{ containerName, image }: { containerName: string; image: string },
		) => {
			return podmanManager.updateAndRestartContainer(containerName, image)
		},
	)

	ipcMain.handle('podman:get-qui-config', async () =>
		podmanManager.getQuiConfig(),
	)

	ipcMain.handle('podman:get-qbit-config', async () =>
		podmanManager.getQBitConfig(),
	)

	ipcMain.handle('podman:save-qui-config', async (_event, config: unknown) =>
		podmanManager.applyQuiConfig(config),
	)

	ipcMain.handle('podman:save-qbit-config', async (_event, config: unknown) =>
		podmanManager.applyQBitConfig(config),
	)

	ipcMain.handle(
		'podman:restart-container',
		async (_event, containerName: unknown) => {
			if (typeof containerName !== 'string') {
				return { success: false, error: 'Invalid container name' }
			}
			return podmanManager.restartContainer(containerName)
		},
	)

	ipcMain.handle('podman:gazelle:status', async () => {
		return podmanManager.getGazelleStatus()
	})

	ipcMain.handle('podman:gazelle:start', async () => {
		return podmanManager.startGazelle()
	})

	ipcMain.handle('podman:gazelle:stop', async () => {
		return podmanManager.stopGazelle()
	})

	ipcMain.handle('podman:gazelle:restart', async () => {
		return podmanManager.restartGazelle()
	})

	ipcMain.handle('podman:gazelle:open-web', async () => {
		await shell.openExternal(GAZELLE_WEB_ORIGIN)
	})

	ipcMain.handle('vpn:get-config', async () => {
		const vault = vpnVault()
		return vault.read()
	})

	ipcMain.handle('vpn:save-config', async (_event, config: unknown) => {
		const vault = vpnVault()
		vault.save(config)
		return podmanManager.applyVpnConfig(config)
	})

	ipcMain.handle('vpn:status', async () => {
		return podmanManager.getVpnStatus()
	})

	ipcMain.handle('vpn:open-auth-page', async (_event, provider?: string) => {
		const targetUrl =
			provider === 'proton' || provider === 'protonvpn'
				? 'https://account.protonvpn.com/downloads#wireguard-configuration'
				: 'https://account.protonvpn.com/downloads'
		await shell.openExternal(targetUrl)
	})

	ipcMain.handle('vpn:parse-conf', async (_event, confContent: unknown) => {
		if (typeof confContent !== 'string') {
			return { privateKey: '', address: '10.2.0.2/32' }
		}
		return parseWireGuardConf(confContent)
	})

	ipcMain.handle('api:transfer-stats', async () => {
		return apiClient.getTransferStats()
	})

	ipcMain.handle('updater:check-app-update', async () => {
		return appUpdater.checkForUpdates()
	})

	ipcMain.handle('updater:prompt-updates', async () => {
		return promptDesktopUpdates()
	})

	ipcMain.handle('updater:apply-update', async (_event, version?: unknown) => {
		const targetVer =
			typeof version === 'string' && version.trim()
				? version.trim().replace(/^v/i, '')
				: undefined
		return appUpdater.applyUpdate(
			mainWindow,
			podmanManager,
			() => loadQuiWebUi(),
			targetVer,
		)
	})

	ipcMain.handle('updater:apply-container-updates', async () => {
		try {
			if (pendingContainerUpdates.length === 0) {
				const quiUpdate = await podmanManager.checkForImageUpdate(quiImage)
				const qbitUpdate = await podmanManager.checkForImageUpdate(QBIT_IMAGE)
				pendingContainerUpdates = updatesWorthPrompting(
					[quiUpdate, qbitUpdate],
					{},
				)
			}

			if (pendingContainerUpdates.length === 0) {
				return {
					success: true,
					message: 'All containers are already up to date.',
				}
			}

			try {
				await createPreUpdateBackup('podman-update')
			} catch {
				// Non-fatal backup failure
			}

			for (const u of pendingContainerUpdates) {
				const name =
					u.image === quiImage ? QUI_CONTAINER_NAME : QBIT_CONTAINER_NAME
				await podmanManager.updateAndRestartContainer(name, u.image)
			}

			const hasQuiUpdate = pendingContainerUpdates.some(
				u => u.image === quiImage,
			)
			const updatedCount = pendingContainerUpdates.length
			pendingContainerUpdates = []

			if (hasQuiUpdate) {
				void loadQuiWebUi()
			}

			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send('updater:status', {
					type: 'success',
					message: 'Containers updated successfully!',
					detail: `Updated ${updatedCount} container component(s). Pre-update backup archived.`,
				})
			}

			return {
				success: true,
				reloaded: hasQuiUpdate,
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			return { success: false, error: message }
		}
	})

	ipcMain.handle('updater:dismiss-container-updates', async () => {
		const dismissed = readDismissedDigests()
		for (const update of pendingContainerUpdates) {
			if (update.remoteDigest) {
				dismissed[update.image] = update.remoteDigest
			}
		}
		writeDismissedDigests(dismissed)
		pendingContainerUpdates = []
		return { success: true }
	})

	ipcMain.handle('window:set-material', async (_event, glass: unknown) => {
		if (!mainWindow || typeof glass !== 'boolean') {
			return
		}
		applyWindowMaterial(mainWindow, glass)
	})

	ipcMain.handle('window:set-sidebar', async (_event, visible: unknown) => {
		if (!mainWindow || typeof visible !== 'boolean') {
			return
		}
		applyTrafficLights(mainWindow, visible)
	})

	ipcMain.handle(
		'account:save',
		async (_event, username: unknown, password: unknown) => {
			if (
				typeof username !== 'string' ||
				typeof password !== 'string' ||
				!safeStorage.isEncryptionAvailable()
			) {
				return
			}
			accountVault().save({ username, password })
		},
	)

	ipcMain.handle('account:has', async () => accountVault().has())

	ipcMain.handle('account:unlock', async () => {
		const auth = await biometricAuth.authenticate('Sign in to Qui')
		if (!auth.success) {
			return null
		}
		return accountVault().read()
	})

	ipcMain.handle('theme:sync', async (_event, payload: unknown) => {
		try {
			const validated = Schema.decodeUnknownSync(ThemeSyncPayloadSchema)(
				payload,
			)
			writeCachedTheme(app.getPath('userData'), validated)
		} catch (error) {
			console.warn('Failed to handle theme:sync IPC:', error)
		}
	})

	ipcMain.on('app:get-version', event => {
		event.returnValue =
			appUpdater.getCurrentVersion() || app.getVersion() || CURRENT_APP_VERSION
	})
}

function dismissalFile(): string {
	return path.join(app.getPath('userData'), 'dismissed-podman-digests.json')
}

/** Pre-Podman-naming dismissal file; read-only fallback (BR-desktop-55). */
function legacyDismissalFile(): string {
	return path.join(app.getPath('userData'), 'dismissed-docker-digests.json')
}

function readDismissedDigests(): Record<string, string> {
	const file = existsSync(dismissalFile())
		? dismissalFile()
		: legacyDismissalFile()
	try {
		return Schema.decodeUnknownSync(DismissedDigestsSchema)(
			JSON.parse(readFileSync(file, 'utf8')),
		)
	} catch {
		return {}
	}
}

function writeDismissedDigests(value: Record<string, string>): void {
	writeFileSync(dismissalFile(), JSON.stringify(value))
}

function accountVault(): AccountVault {
	const file = path.join(app.getPath('userData'), 'account.bin')
	return new AccountVault(
		{
			encrypt: plain => safeStorage.encryptString(plain),
			decrypt: bytes => safeStorage.decryptString(Buffer.from(bytes)),
		},
		() => {
			try {
				return readFileSync(file)
			} catch {
				return null
			}
		},
		bytes => {
			writeFileSync(file, Buffer.from(bytes))
		},
	)
}

function vpnVault(): VpnVault {
	const file = path.join(app.getPath('userData'), 'vpn-config.bin')
	return new VpnVault(
		{
			encrypt: plain => safeStorage.encryptString(plain),
			decrypt: bytes => safeStorage.decryptString(Buffer.from(bytes)),
		},
		() => {
			try {
				return readFileSync(file)
			} catch {
				return null
			}
		},
		bytes => {
			writeFileSync(file, Buffer.from(bytes))
		},
	)
}

async function checkAndPromptPodmanUpdates(options?: {
	force?: boolean
}): Promise<void> {
	try {
		if (!options?.force && podmanImageUpdatePromptShownThisSession) {
			return
		}
		const quiUpdate = await podmanManager.checkForImageUpdate(quiImage)
		const qbitUpdate = await podmanManager.checkForImageUpdate(QBIT_IMAGE)

		const updates = updatesWorthPrompting(
			[quiUpdate, qbitUpdate],
			options?.force ? {} : readDismissedDigests(),
		)
		if (updates.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
			podmanImageUpdatePromptShownThisSession = true
			pendingContainerUpdates = updates
			const promptDetails = formatContainerUpdatePrompt(updates, quiImage)
			mainWindow.webContents.send(
				'updater:show-container-dialog',
				promptDetails,
			)
		} else if (options?.force && mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('updater:status', {
				type: 'info',
				message: 'All containers are up to date.',
				detail:
					'qui and qbittorrent-nox are running the latest container images.',
			})
		}
	} catch {
		// Non-blocking update check
	}
}

async function promptDesktopUpdates(): Promise<boolean> {
	if (!mainWindow || mainWindow.isDestroyed()) {
		return false
	}
	try {
		const info = await appUpdater.checkForUpdates()
		const quiUpdate = await podmanManager.checkForImageUpdate(quiImage)
		const qbitUpdate = await podmanManager.checkForImageUpdate(QBIT_IMAGE)
		const updates = updatesWorthPrompting([quiUpdate, qbitUpdate], {})

		if (info.hasUpdate) {
			await appUpdater.promptUpdateIfAvailable(mainWindow, info)
		}
		if (updates.length > 0) {
			await checkAndPromptPodmanUpdates({ force: true })
		} else if (!info.hasUpdate) {
			mainWindow.webContents.send('updater:status', {
				type: 'info',
				message: `Qui Desktop is up to date (v${appUpdater.getCurrentVersion()}).`,
				detail:
					'All desktop layers (application shell, qui, and qbittorrent-nox) are running the latest versions.',
			})
		}
		return true
	} catch {
		return false
	}
}

async function bootstrapApp(): Promise<void> {
	registerIpcHandlers()
	mainWindow = createMainWindow()

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (isCheckoutUrl(url)) {
			openCheckoutWindow(url, mainWindow, quiWebOrigin)
			return { action: 'deny' }
		}
		void shell.openExternal(url)
		return { action: 'deny' }
	})

	mainWindow.webContents.on('will-navigate', (event, url) => {
		if (isCheckoutUrl(url)) {
			event.preventDefault()
			openCheckoutWindow(url, mainWindow, quiWebOrigin)
			return
		}
		try {
			const target = new URL(url)
			const origin = new URL(quiWebOrigin)
			if (target.origin !== origin.origin && target.protocol !== 'file:') {
				event.preventDefault()
				void shell.openExternal(url)
			}
		} catch {
			// ignore malformed URLs
		}
	})

	registerApplicationMenu({
		desktopDev,
		quiWebOrigin,
		getMainWindow: () => mainWindow,
		callbacks: {
			onAddTorrent: () => {
				if (mainWindow) {
					if (mainWindow.isMinimized()) mainWindow.restore()
					mainWindow.show()
					mainWindow.focus()
					if (magnetManager.isQuiReady()) {
						void mainWindow.loadURL(`${quiWebOrigin}/add`)
					}
				}
			},
			onPauseAll: async () => {
				await apiClient.pauseAll()
			},
			onResumeAll: async () => {
				await apiClient.resumeAll()
			},
			onOpenDownloadsFolder: () => {
				const dirs = podmanDataDirs(homedir(), process.platform)
				void shell.openPath(dirs.downloads)
			},
			onOpenQuiConfigFolder: () => {
				const dirs = podmanDataDirs(homedir(), process.platform)
				void shell.openPath(dirs.quiConfig)
			},
			onOpenQbitConfigFolder: () => {
				const dirs = podmanDataDirs(homedir(), process.platform)
				void shell.openPath(dirs.qbitConfig)
			},
			onCheckAppUpdates: async () => {
				const info = await appUpdater.checkForUpdates()
				await appUpdater.promptUpdateIfAvailable(mainWindow, info)
			},
			onCheckPodmanUpdates: async () => {
				await checkAndPromptPodmanUpdates({ force: true })
			},
			onNavigateSettings: () => {
				if (mainWindow) {
					if (mainWindow.isMinimized()) mainWindow.restore()
					mainWindow.show()
					mainWindow.focus()
					void mainWindow.loadURL(`${quiWebOrigin}/settings`)
				}
			},
			onNavigateTorrents: () => {
				if (mainWindow) {
					if (mainWindow.isMinimized()) mainWindow.restore()
					mainWindow.show()
					mainWindow.focus()
					void mainWindow.loadURL(`${quiWebOrigin}/torrents`)
				}
			},
			onReloadQui: () => {
				void loadQuiWebUi()
			},
		},
	})

	tray = new AppTray(mainWindow, {
		onShowApp: () => {
			if (mainWindow) {
				mainWindow.show()
				mainWindow.focus()
			}
		},
		onReloadQui: () => {
			void loadQuiWebUi()
		},
		onPauseAll: async () => {
			await apiClient.pauseAll()
		},
		onResumeAll: async () => {
			await apiClient.resumeAll()
		},
		onAddTorrent: () => {
			if (mainWindow) {
				if (mainWindow.isMinimized()) mainWindow.restore()
				mainWindow.show()
				mainWindow.focus()
				if (magnetManager.isQuiReady()) {
					void mainWindow.loadURL(`${quiWebOrigin}/add`)
				}
			}
		},
		onCheckUpdates: async () => {
			await checkAndPromptPodmanUpdates({ force: true })
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

	void loadQuiWebUi()

	scheduleNextStatsPoll()

	mainWindow.on('show', () => scheduleNextStatsPoll())
	mainWindow.on('focus', () => scheduleNextStatsPoll())
	mainWindow.on('hide', () => scheduleNextStatsPoll())
	mainWindow.on('minimize', () => scheduleNextStatsPoll())
	mainWindow.on('restore', () => scheduleNextStatsPoll())

	mainWindow.on('close', event => {
		if (!isQuitting) {
			event.preventDefault()
			mainWindow?.hide()
			scheduleNextStatsPoll()
		}
	})
}

app.on('before-quit', () => {
	isQuitting = true
	if (statsTimeout) {
		clearTimeout(statsTimeout)
		statsTimeout = null
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
