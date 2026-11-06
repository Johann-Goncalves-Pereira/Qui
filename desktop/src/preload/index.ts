/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
	BiometricAuthResult,
	DockerContainerStatus,
	DockerUpdateInfo,
	TorrentTransferStats,
} from '../shared/types.js'

export interface QuiDesktopBridge {
	authenticateBiometrics: () => Promise<BiometricAuthResult>
	isBiometricsSupported: () => Promise<boolean>
	getDockerStatus: () => Promise<{
		qui: DockerContainerStatus
		qbit: DockerContainerStatus
	}>
	checkForUpdates: () => Promise<DockerUpdateInfo[]>
	applyDockerUpdate: (
		containerName: string,
		image: string,
		port: number,
	) => Promise<boolean>
	getTransferStats: () => Promise<TorrentTransferStats>
	onDockerStatusChanged: (
		callback: (status: {
			qui: DockerContainerStatus
			qbit: DockerContainerStatus
		}) => void,
	) => () => void
}

const desktopBridge: QuiDesktopBridge = {
	authenticateBiometrics: () => ipcRenderer.invoke('auth:biometrics'),
	isBiometricsSupported: () => ipcRenderer.invoke('auth:supported'),
	getDockerStatus: () => ipcRenderer.invoke('docker:status'),
	checkForUpdates: () => ipcRenderer.invoke('docker:check-updates'),
	applyDockerUpdate: (containerName: string, image: string, port: number) =>
		ipcRenderer.invoke('docker:apply-update', { containerName, image, port }),
	getTransferStats: () => ipcRenderer.invoke('api:transfer-stats'),
	onDockerStatusChanged: callback => {
		const listener = (
			_event: unknown,
			status: { qui: DockerContainerStatus; qbit: DockerContainerStatus },
		) => {
			callback(status)
		}
		ipcRenderer.on('docker:status-update', listener)
		return () => {
			ipcRenderer.removeListener('docker:status-update', listener)
		}
	},
}

contextBridge.exposeInMainWorld('quiDesktop', desktopBridge)
