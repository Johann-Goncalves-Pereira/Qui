/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
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
	VPN_CONTAINER_NAME,
	VPN_IMAGE,
} from '../shared/constants.js'
import type {
	QBitContainerConfig,
	QuiContainerConfig,
} from '../shared/types.js'

export interface ContainerDataDirs {
	quiConfig: string
	qbitConfig: string
	downloads: string
	gazelleConfig: string
	gazelleData: string
	gazelleRepo: string
}

export type DockerDataDirs = ContainerDataDirs
export type PodmanDataDirs = ContainerDataDirs

/** Host directories that survive container removal. Qui keeps its account database here. */
export function containerDataDirs(
	home: string,
	platform: string,
): ContainerDataDirs {
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
		gazelleRepo: path.join(root, 'gazelle', 'repo'),
	}
}

export const dockerDataDirs = containerDataDirs
export const podmanDataDirs = containerDataDirs

/**
 * Ensures that the Docker data directories and their host parent directories
 * have traversal permissions (0755) so that container runtimes running unprivileged
 * UIDs (e.g. linuxserver/qbittorrent UID 1000/911) can traverse virtiofs/bind mounts
 * without encountering EPERM (Operation not permitted).
 */
export function ensureDockerDataPermissions(
	dirs: DockerDataDirs,
	chmod: (filePath: string, mode: number) => void = chmodSync,
): void {
	const paths = [
		path.dirname(path.dirname(dirs.quiConfig)),
		path.dirname(dirs.quiConfig),
		dirs.quiConfig,
		dirs.qbitConfig,
		dirs.downloads,
	]
	for (const p of paths) {
		try {
			chmod(p, 0o755)
		} catch {
			// Best-effort for non-existing or restricted paths
		}
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

export function parseWireGuardConf(content: string): {
	privateKey: string
	address: string
} {
	const privateKeyMatch = content.match(/PrivateKey\s*=\s*([^\r\n]+)/i)
	const addressMatch = content.match(/Address\s*=\s*([^\r\n]+)/i)
	return {
		privateKey: privateKeyMatch ? privateKeyMatch[1].trim() : '',
		address: addressMatch ? addressMatch[1].trim() : '10.2.0.2/32',
	}
}

export function vpnContainerRunArgs(
	vpnConfig: {
		provider: string
		wireguardPrivateKey?: string
		wireguardAddress?: string
		serverCountry?: string
	},
	vpnImage = VPN_IMAGE,
): string[] {
	const args = [
		'run',
		'-d',
		'--name',
		VPN_CONTAINER_NAME,
		'--cap-add=NET_ADMIN',
		'--device=/dev/net/tun:/dev/net/tun',
		'-p',
		`${DEFAULT_QBIT_PORT}:8080`,
		'-p',
		'6881:6881',
		'-p',
		'6881:6881/udp',
		'-e',
		`VPN_SERVICE_PROVIDER=${vpnConfig.provider}`,
		'-e',
		'VPN_TYPE=wireguard',
		'-e',
		`WIREGUARD_PRIVATE_KEY=${vpnConfig.wireguardPrivateKey ?? ''}`,
		'-e',
		`WIREGUARD_ADDRESSES=${vpnConfig.wireguardAddress ?? '10.2.0.2/32'}`,
		'--restart',
		'unless-stopped',
		vpnImage,
	]
	if (vpnConfig.serverCountry) {
		args.push('-e', `SERVER_COUNTRIES=${vpnConfig.serverCountry}`)
	}
	return args
}

export function qbitContainerRunArgs(
	image: string,
	hostConfig: string,
	downloads: string,
	options?: {
		puid?: string
		pgid?: string
		umask?: string
		vpnContainer?: string
	},
): string[] {
	const puid = options?.puid ?? '1000'
	const pgid = options?.pgid ?? '1000'
	const umask = options?.umask ?? '022'
	const args = [
		'run',
		'-d',
		'--name',
		QBIT_CONTAINER_NAME,
	]
	if (options?.vpnContainer) {
		args.push(`--network=container:${options.vpnContainer}`)
	} else {
		args.push(
			'-p',
			`${DEFAULT_QBIT_PORT}:8080`,
			'-p',
			'6881:6881',
			'-p',
			'6881:6881/udp',
		)
	}
	args.push(
		'-v',
		`${hostConfig}:/config`,
		'-v',
		`${downloads}:/downloads`,
		'-e',
		`PUID=${puid}`,
		'-e',
		`PGID=${pgid}`,
		'-e',
		`UMASK=${umask}`,
		'--restart',
		'unless-stopped',
		image,
	)
	return args
}

export const QBIT_AUTH_BYPASS_MARKER = 'WebUI\\AuthSubnetWhitelistEnabled=true'

const QBIT_AUTH_BYPASS_PREFERENCE_LINES = [
	'WebUI\\Address=*',
	'WebUI\\ServerDomains=*',
	QBIT_AUTH_BYPASS_MARKER,
	'WebUI\\AuthSubnetWhitelist=10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32, ::ffff:10.0.0.0/104, ::ffff:172.16.0.0/108, ::ffff:192.168.0.0/112, ::ffff:127.0.0.1/128, ::ffff:0:0/96',
	'WebUI\\LocalHostAuth=false',
]

export const DEFAULT_QBIT_PRESEED_CONF = `[BitTorrent]
Session\\DefaultSavePath=/downloads/
Session\\Port=6881
Session\\QueueingSystemEnabled=true
Session\\TempPath=/downloads/incomplete/

[LegalNotice]
Accepted=true

[Preferences]
Connection\\ResolvePeerCountries=true
WebUI\\Address=*
WebUI\\ServerDomains=*
WebUI\\AuthSubnetWhitelistEnabled=true
WebUI\\AuthSubnetWhitelist=10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/32, ::ffff:10.0.0.0/104, ::ffff:172.16.0.0/108, ::ffff:192.168.0.0/112, ::ffff:127.0.0.1/128, ::ffff:0:0/96
WebUI\\LocalHostAuth=false
`

export interface QBitCredentials {
	username: string
	password?: string
	isTemporary?: boolean
}

/**
 * Extracts administrator username and temporary session password from qBittorrent-nox container logs.
 */
export function parseQBitCredentialsFromLogs(logs: string): QBitCredentials {
	let username = 'admin'
	let password: string | undefined
	let isTemporary = false

	const userMatches = [
		...logs.matchAll(/The WebUI administrator username is:\s*([^\r\n]+)/gi),
	]
	if (userMatches.length > 0) {
		username = userMatches[userMatches.length - 1][1].trim()
	}

	const passMatches = [
		...logs.matchAll(
			/A temporary password is provided for this session:\s*([^\r\n]+)/gi,
		),
	]
	if (passMatches.length > 0) {
		password = passMatches[passMatches.length - 1][1].trim()
		isTemporary = true
	}

	return { username, password, isTemporary }
}

/**
 * Merges subnet auth-bypass keys into qBittorrent.conf when the companion
 * container already wrote a partial file without whitelist settings.
 */
export function patchQBitConfigAuthBypass(confContent: string): string {
	if (confContent.includes(QBIT_AUTH_BYPASS_MARKER)) {
		return confContent
	}
	const eol = confContent.includes('\r\n') ? '\r\n' : '\n'
	const lines = confContent.split(/\r?\n/)
	const prefIdx = lines.findIndex(line => line.trim() === '[Preferences]')
	const insert = QBIT_AUTH_BYPASS_PREFERENCE_LINES
	if (prefIdx >= 0) {
		let insertAt = prefIdx + 1
		while (insertAt < lines.length && !lines[insertAt].startsWith('[')) {
			insertAt++
		}
		lines.splice(insertAt, 0, ...insert)
		return lines.join(eol)
	}
	const prefix = confContent.trimEnd()
	return `${prefix}${prefix.length > 0 ? eol + eol : ''}[Preferences]${eol}${insert.join(eol)}${eol}`
}

/**
 * Ensures that qBittorrent has an initial configuration file on clean install.
 * By pre-seeding AuthSubnetWhitelist and LocalHostAuth=false, Qui communicating
 * via the Docker network / loopback does not get locked out by random password
 * generation or brute-force IP bans. Existing configs missing the bypass are
 * patched before the companion container starts.
 */
export function ensureQbitPreseedConfig(
	qbitConfigDir: string,
	fs = {
		existsSync,
		mkdirSync,
		readFileSync,
		writeFileSync,
		chmodSync,
	},
): boolean {
	const confDir = path.join(qbitConfigDir, 'qBittorrent')
	const confPath = path.join(confDir, 'qBittorrent.conf')
	if (fs.existsSync(confPath)) {
		const existing = fs.readFileSync(confPath, 'utf-8')
		if (existing.includes(QBIT_AUTH_BYPASS_MARKER)) {
			return false
		}
		const patched = patchQBitConfigAuthBypass(existing)
		fs.writeFileSync(confPath, patched, 'utf-8')
		try {
			fs.chmodSync(confPath, 0o666)
		} catch {
			// Ignore chmod failure in environments without filesystem permissions
		}
		return true
	}
	fs.mkdirSync(confDir, { recursive: true })
	fs.writeFileSync(confPath, DEFAULT_QBIT_PRESEED_CONF, 'utf-8')
	try {
		fs.chmodSync(confPath, 0o666)
	} catch {
		// Ignore chmod failure in environments without filesystem permissions
	}
	return true
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
		username: 'admin',
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
