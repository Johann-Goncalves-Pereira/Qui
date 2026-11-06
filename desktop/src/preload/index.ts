/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
	BiometricAuthResult,
	DockerContainerStatus,
	QBitContainerConfig,
	QuiContainerConfig,
} from '../shared/types.js'

export interface QuiDesktopBridge {
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
}

const bridge: QuiDesktopBridge = {
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
}

contextBridge.exposeInMainWorld('quiDesktop', bridge)
