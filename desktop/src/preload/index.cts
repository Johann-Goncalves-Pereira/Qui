/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
	AppReleaseInfo,
	BiometricAuthResult,
	DockerContainerStatus,
	QBitContainerConfig,
	QuiContainerConfig,
	ThemeSyncPayload,
} from '../shared/types.js'

export interface QuiDesktopBridge {
	/** Packaged desktop semantic version (e.g. 0.0.0, 0.0.1). */
	getAppVersion: () => string
	/** macOS Touch ID / fingerprint after web sign-in or registration (no password storage). */
	requestTouchId: (reason?: string) => Promise<BiometricAuthResult>
	/** Glass switch. Vibrancy turns on for any theme while this is true. */
	setWindowMaterial: (glass: boolean) => Promise<void>
	/** Sidebar pages center the traffic lights on the logo row. */
	setSidebarChrome: (visible: boolean) => Promise<void>
	saveAccount: (username: string, password: string) => Promise<void>
	hasSavedAccount: () => Promise<boolean>
	/** Touch ID, then the encrypted account. Null when cancelled or missing. */
	unlockAccount: () => Promise<{ username: string; password: string } | null>
	getDockerStatus: () => Promise<{
		qui: DockerContainerStatus
		qbit: DockerContainerStatus
	}>
	getQuiConfig: () => Promise<QuiContainerConfig>
	getQBitConfig: () => Promise<QBitContainerConfig>
	saveQuiConfig: (
		config: QuiContainerConfig,
	) => Promise<{ success: boolean; error?: string }>
	saveQBitConfig: (
		config: QBitContainerConfig,
	) => Promise<{ success: boolean; error?: string }>
	restartContainer: (
		name: string,
	) => Promise<{ success: boolean; error?: string }>
	/** Checks GitHub Releases for desktop shell updates */
	checkForUpdates: () => Promise<AppReleaseInfo>
	/** Triggers native desktop multilayer update dialog (shell and containers with pre-update backups) */
	promptUpdates: () => Promise<boolean>
	/** Automatically downloads and applies the desktop update in-app */
	applyUpdate: (
		version?: string,
	) => Promise<{ success: boolean; error?: string }>
	/** Synchronize active theme tokens and dark/light preference to desktop shell for startup page caching */
	syncTheme: (payload: ThemeSyncPayload) => Promise<void>
	/** Gazelle companion Docker lifecycle controls */
	gazelle: {
		getStatus: () => Promise<DockerContainerStatus>
		start: () => Promise<DockerContainerStatus>
		stop: () => Promise<DockerContainerStatus>
		restart: () => Promise<DockerContainerStatus>
		openWebUi: () => Promise<void>
		install: () => Promise<DockerContainerStatus>
		destroy: () => Promise<DockerContainerStatus>
	}
}

const bridge: QuiDesktopBridge = {
	getAppVersion: () => {
		try {
			const version = ipcRenderer.sendSync('app:get-version')
			return typeof version === 'string' && version.trim() !== ''
				? version.trim()
				: '0.0.0'
		} catch {
			return '0.0.0'
		}
	},
	requestTouchId: (reason?: string) =>
		ipcRenderer.invoke('auth:biometrics', reason),
	setWindowMaterial: (glass: boolean) =>
		ipcRenderer.invoke('window:set-material', glass),
	setSidebarChrome: (visible: boolean) =>
		ipcRenderer.invoke('window:set-sidebar', visible),
	saveAccount: (username: string, password: string) =>
		ipcRenderer.invoke('account:save', username, password),
	hasSavedAccount: () => ipcRenderer.invoke('account:has'),
	unlockAccount: () => ipcRenderer.invoke('account:unlock'),
	getDockerStatus: () => ipcRenderer.invoke('docker:status'),
	getQuiConfig: () => ipcRenderer.invoke('docker:get-qui-config'),
	getQBitConfig: () => ipcRenderer.invoke('docker:get-qbit-config'),
	saveQuiConfig: (config: QuiContainerConfig) =>
		ipcRenderer.invoke('docker:save-qui-config', config),
	saveQBitConfig: (config: QBitContainerConfig) =>
		ipcRenderer.invoke('docker:save-qbit-config', config),
	restartContainer: (name: string) =>
		ipcRenderer.invoke('docker:restart-container', name),
	checkForUpdates: () => ipcRenderer.invoke('updater:check-app-update'),
	promptUpdates: () => ipcRenderer.invoke('updater:prompt-updates'),
	applyUpdate: (version?: string) =>
		ipcRenderer.invoke('updater:apply-update', version),
	syncTheme: (payload: ThemeSyncPayload) =>
		ipcRenderer.invoke('theme:sync', payload),
	gazelle: {
		getStatus: () => ipcRenderer.invoke('docker:gazelle:status'),
		start: () => ipcRenderer.invoke('docker:gazelle:start'),
		stop: () => ipcRenderer.invoke('docker:gazelle:stop'),
		restart: () => ipcRenderer.invoke('docker:gazelle:restart'),
		openWebUi: () => ipcRenderer.invoke('docker:gazelle:open-web'),
		install: () => ipcRenderer.invoke('docker:gazelle:install'),
		destroy: () => ipcRenderer.invoke('docker:gazelle:destroy'),
	},
}

contextBridge.exposeInMainWorld('quiDesktop', bridge)
