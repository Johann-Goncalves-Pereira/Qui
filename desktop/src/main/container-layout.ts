/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import {
	DEFAULT_GAZELLE_PORT,
	DEFAULT_QBIT_PORT,
	DEFAULT_QUI_PORT,
	GAZELLE_CONTAINER_NAME,
	QBIT_CONTAINER_NAME,
	QBIT_IMAGE,
	QUI_CONTAINER_NAME,
	QUI_IMAGE,
} from '../shared/constants.js'
import type {
	QBitContainerConfig,
	QuiContainerConfig,
} from '../shared/types.js'

export interface DockerDataDirs {
	quiConfig: string
	qbitConfig: string
	downloads: string
	gazelleConfig: string
	gazelleData: string
}

/** Host directories that survive `docker rm`. Qui keeps its account database here. */
export function dockerDataDirs(home: string, platform: string): DockerDataDirs {
	const root =
		platform === 'darwin'
			? path.join(home, 'Library', 'Application Support', 'Qui', 'docker')
			: platform === 'win32'
				? path.join(home, 'AppData', 'Roaming', 'Qui', 'docker')
				: path.join(home, '.local', 'share', 'qui-desktop', 'docker')
	return {
		quiConfig: path.join(root, 'qui'),
		qbitConfig: path.join(root, 'qbittorrent'),
		downloads: path.join(root, 'downloads'),
		gazelleConfig: path.join(root, 'gazelle', 'config'),
		gazelleData: path.join(root, 'gazelle', 'data'),
	}
}

export function quiContainerRunArgs(
	image: string,
	hostConfig: string,
	downloads?: string,
	envExists: (filePath: string) => boolean = existsSync,
): string[] {
	const args = [
		'run',
		'-d',
		'--name',
		QUI_CONTAINER_NAME,
		'-p',
		`${DEFAULT_QUI_PORT}:7476`,
	]
	if (downloads) {
		args.push(
			'--add-host=host.docker.internal:host-gateway',
			'-v',
			`${downloads}:/downloads`,
		)
	}
	const envPath = path.join(hostConfig, '.env')
	if (envExists(envPath)) {
		args.push('--env-file', envPath)
	}
	args.push('-v', `${hostConfig}:/config`, '--restart', 'unless-stopped', image)
	return args
}

export function qbitContainerRunArgs(
	image: string,
	hostConfig: string,
	downloads: string,
): string[] {
	return [
		'run',
		'-d',
		'--name',
		QBIT_CONTAINER_NAME,
		'-p',
		`${DEFAULT_QBIT_PORT}:8080`,
		'-p',
		'6881:6881',
		'-p',
		'6881:6881/udp',
		'-v',
		`${hostConfig}:/config`,
		'-v',
		`${downloads}:/downloads`,
		'--restart',
		'unless-stopped',
		image,
	]
}

export function gazelleContainerRunArgs(
	image: string,
	hostConfig: string,
	hostData: string,
	port = DEFAULT_GAZELLE_PORT,
): string[] {
	return [
		'run',
		'-d',
		'--name',
		GAZELLE_CONTAINER_NAME,
		'-p',
		`${port}:7001`,
		'-v',
		`${hostConfig}:/var/www/app/config`,
		'-v',
		`${hostData}:/var/lib/mysql`,
		'--restart',
		'unless-stopped',
		image,
	]
}

/** True when the remote manifest shares any digest with the local image. */
export function imageDigestHasUpdate(
	localText: string,
	remoteText: string,
): boolean {
	const local = digestsIn(localText)
	const remote = digestsIn(remoteText)
	if (local.size === 0 || remote.size === 0) {
		return false
	}
	for (const digest of remote) {
		if (local.has(digest)) {
			return false
		}
	}
	return true
}

function digestsIn(text: string): Set<string> {
	const found = new Set<string>()
	for (const match of text.matchAll(/sha256:[a-f0-9]{64}/gi)) {
		found.add(match[0].toLowerCase())
	}
	return found
}

export interface ImageUpdateOffer {
	image: string
	hasUpdate: boolean
	remoteDigest: string
}

/** Skip a digest the user already dismissed, and skip images that are current. */
export function updatesWorthPrompting(
	updates: readonly ImageUpdateOffer[],
	dismissed: Readonly<Record<string, string>>,
): ImageUpdateOffer[] {
	return updates.filter(
		update =>
			update.hasUpdate && dismissed[update.image] !== update.remoteDigest,
	)
}

export function quiConfigToRunArgs(config: QuiContainerConfig): string[] {
	const args = [
		'run',
		'-d',
		'--name',
		QUI_CONTAINER_NAME,
		'-p',
		`${config.port}:7476`,
		'-v',
		`${config.configPath}:/config`,
	]
	if (config.dataPath && config.dataPath.length > 0) {
		args.push('-v', `${config.dataPath}:/data`)
	}
	if (config.puid && config.puid.length > 0) {
		args.push('-e', `PUID=${config.puid}`)
	}
	if (config.pgid && config.pgid.length > 0) {
		args.push('-e', `PGID=${config.pgid}`)
	}
	if (config.umask && config.umask.length > 0) {
		args.push('-e', `UMASK=${config.umask}`)
	}
	if (config.logLevel && config.logLevel.length > 0) {
		args.push('-e', `QUI__LOG_LEVEL=${config.logLevel}`)
	}
	if (config.baseUrl && config.baseUrl.length > 0) {
		args.push('-e', `QUI__BASE_URL=${config.baseUrl}`)
	}
	if (config.tz && config.tz.length > 0) {
		args.push('-e', `TZ=${config.tz}`)
	}
	args.push('--restart', config.restartPolicy || 'unless-stopped')
	args.push(config.image)
	return args
}

export function qbitConfigToRunArgs(config: QBitContainerConfig): string[] {
	const args = [
		'run',
		'-d',
		'--name',
		QBIT_CONTAINER_NAME,
		'-p',
		`${config.port}:8080`,
		'-p',
		`${config.peerPort}:6881`,
		'-p',
		`${config.peerPort}:6881/udp`,
		'-v',
		`${config.configPath}:/config`,
		'-v',
		`${config.downloadsPath}:/downloads`,
	]
	if (config.puid && config.puid.length > 0) {
		args.push('-e', `PUID=${config.puid}`)
	}
	if (config.pgid && config.pgid.length > 0) {
		args.push('-e', `PGID=${config.pgid}`)
	}
	if (config.umask && config.umask.length > 0) {
		args.push('-e', `UMASK=${config.umask}`)
	}
	if (config.tz && config.tz.length > 0) {
		args.push('-e', `TZ=${config.tz}`)
	}
	if (config.port !== 8080) {
		args.push('-e', `WEBUI_PORT=${config.port}`)
	}
	args.push('--restart', config.restartPolicy || 'unless-stopped')
	args.push(config.image)
	return args
}

export function defaultQuiConfig(
	dirs: DockerDataDirs,
	image: string = QUI_IMAGE,
): QuiContainerConfig {
	return {
		port: DEFAULT_QUI_PORT,
		configPath: dirs.quiConfig,
		dataPath: dirs.downloads,
		puid: '1000',
		pgid: '1000',
		umask: '002',
		logLevel: 'INFO',
		baseUrl: '',
		tz: 'UTC',
		restartPolicy: 'unless-stopped',
		image,
	}
}

export function defaultQBitConfig(
	dirs: DockerDataDirs,
	image: string = QBIT_IMAGE,
): QBitContainerConfig {
	return {
		port: DEFAULT_QBIT_PORT,
		peerPort: 6881,
		configPath: dirs.qbitConfig,
		downloadsPath: dirs.downloads,
		puid: '1000',
		pgid: '1000',
		umask: '022',
		tz: 'UTC',
		restartPolicy: 'unless-stopped',
		image,
	}
}

export function parseInspectToQuiConfig(
	rawInspectJson: string,
	fallback: QuiContainerConfig,
): QuiContainerConfig {
	try {
		const parsed = JSON.parse(rawInspectJson)
		const container = Array.isArray(parsed) ? parsed[0] : parsed
		if (!container) return fallback

		const envList: string[] = container.Config?.Env ?? []
		const envMap = new Map<string, string>()
		for (const item of envList) {
			const idx = item.indexOf('=')
			if (idx > 0) {
				envMap.set(item.slice(0, idx), item.slice(idx + 1))
			}
		}

		const binds: string[] = container.HostConfig?.Binds ?? []
		let configPath = fallback.configPath
		let dataPath = fallback.dataPath
		for (const bind of binds) {
			const [host, target] = bind.split(':')
			if (target === '/config') configPath = host
			if (target === '/data') dataPath = host
		}

		const portBindings = container.HostConfig?.PortBindings ?? {}
		const hostPort =
			portBindings['7476/tcp']?.[0]?.HostPort ??
			portBindings['7476/udp']?.[0]?.HostPort
		const port = hostPort ? Number.parseInt(hostPort, 10) : fallback.port

		return {
			port: Number.isNaN(port) ? fallback.port : port,
			configPath: configPath || fallback.configPath,
			dataPath,
			puid: envMap.get('PUID') ?? fallback.puid,
			pgid: envMap.get('PGID') ?? fallback.pgid,
			umask: envMap.get('UMASK') ?? fallback.umask,
			logLevel: envMap.get('QUI__LOG_LEVEL') ?? fallback.logLevel,
			baseUrl: envMap.get('QUI__BASE_URL') ?? fallback.baseUrl,
			tz: envMap.get('TZ') ?? fallback.tz,
			restartPolicy:
				container.HostConfig?.RestartPolicy?.Name || fallback.restartPolicy,
			image: container.Config?.Image || fallback.image,
		}
	} catch {
		return fallback
	}
}

export function parseInspectToQBitConfig(
	rawInspectJson: string,
	fallback: QBitContainerConfig,
): QBitContainerConfig {
	try {
		const parsed = JSON.parse(rawInspectJson)
		const container = Array.isArray(parsed) ? parsed[0] : parsed
		if (!container) return fallback

		const envList: string[] = container.Config?.Env ?? []
		const envMap = new Map<string, string>()
		for (const item of envList) {
			const idx = item.indexOf('=')
			if (idx > 0) {
				envMap.set(item.slice(0, idx), item.slice(idx + 1))
			}
		}

		const binds: string[] = container.HostConfig?.Binds ?? []
		let configPath = fallback.configPath
		let downloadsPath = fallback.downloadsPath
		for (const bind of binds) {
			const [host, target] = bind.split(':')
			if (target === '/config') configPath = host
			if (target === '/downloads') downloadsPath = host
		}

		const portBindings = container.HostConfig?.PortBindings ?? {}
		const hostPort =
			portBindings['8080/tcp']?.[0]?.HostPort ??
			portBindings['8080/udp']?.[0]?.HostPort
		const port = hostPort ? Number.parseInt(hostPort, 10) : fallback.port

		const peerPortRaw =
			portBindings['6881/tcp']?.[0]?.HostPort ??
			portBindings['6881/udp']?.[0]?.HostPort
		const peerPort = peerPortRaw
			? Number.parseInt(peerPortRaw, 10)
			: fallback.peerPort

		return {
			port: Number.isNaN(port) ? fallback.port : port,
			peerPort: Number.isNaN(peerPort) ? fallback.peerPort : peerPort,
			configPath: configPath || fallback.configPath,
			downloadsPath: downloadsPath || fallback.downloadsPath,
			puid: envMap.get('PUID') ?? fallback.puid,
			pgid: envMap.get('PGID') ?? fallback.pgid,
			umask: envMap.get('UMASK') ?? fallback.umask,
			tz: envMap.get('TZ') ?? fallback.tz,
			restartPolicy:
				container.HostConfig?.RestartPolicy?.Name || fallback.restartPolicy,
			image: container.Config?.Image || fallback.image,
		}
	} catch {
		return fallback
	}
}
