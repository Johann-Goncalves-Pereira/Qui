/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	defaultQBitConfig,
	defaultQuiConfig,
	ensurePodmanDataPermissions,
	ensureQbitPreseedConfig,
	gazelleContainerRunArgs,
	imageDigestHasUpdate,
	legacyContainerDataRoot,
	migrateLegacyContainerDataRoot,
	parseInspectToQBitConfig,
	parseInspectToQuiConfig,
	parseQBitCredentialsFromLogs,
	parseWireGuardConf,
	patchQBitConfigAuthBypass,
	podmanDataDirs,
	qbitConfigToRunArgs,
	qbitContainerRunArgs,
	quiConfigToRunArgs,
	quiContainerRunArgs,
	updatesWorthPrompting,
	vpnContainerRunArgs,
} from '../src/main/container-layout.js'

describe('Podman data survives container replacement (BR-desktop-11)', () => {
	it('keeps Qui config and downloads under the desktop data directory', () => {
		const home = path.join('Users', 'ada')
		const dirs = podmanDataDirs(home, 'darwin')
		expect(dirs.quiConfig).toBe(
			path.join(home, 'Library', 'Application Support', 'Qui', 'podman', 'qui'),
		)
		expect(dirs.downloads).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'podman',
				'downloads',
			),
		)
		expect(dirs.gazelleConfig).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'podman',
				'gazelle',
				'config',
			),
		)
		expect(dirs.gazelleData).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'podman',
				'gazelle',
				'data',
			),
		)
		expect(dirs.gazelleRepo).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'podman',
				'gazelle',
				'repo',
			),
		)
	})

	it('mounts the host config directory into the Qui container', () => {
		const args = quiContainerRunArgs('qui-desktop:local', '/host/qui')
		expect(args).toContain('-v')
		expect(args).toContain('/host/qui:/config')
		expect(args.at(-1)).toBe('qui-desktop:local')
	})

	it('adds --env-file when an .env file exists in the qui config directory', () => {
		const args = quiContainerRunArgs(
			'qui-desktop:local',
			'/host/qui',
			undefined,
			() => true,
		)
		expect(args).toContain('--env-file')
		expect(args).toContain(path.join('/host/qui', '.env'))
	})

	it('mounts the downloads directory and adds host-gateway resolution (BR-desktop-16)', () => {
		const args = quiContainerRunArgs(
			'qui-desktop:local',
			'/host/qui',
			'/host/dl',
		)
		expect(args).toContain('/host/qui:/config')
		expect(args).toContain('/host/dl:/downloads')
		expect(args).toContain('--add-host=host.docker.internal:host-gateway')
	})

	it('mounts qBittorrent config and the download directory with PUID/PGID (BR-desktop-29)', () => {
		const args = qbitContainerRunArgs('qbit:latest', '/host/qbit', '/host/dl')
		expect(args).toContain('/host/qbit:/config')
		expect(args).toContain('/host/dl:/downloads')
		expect(args).toContain('PUID=1000')
		expect(args).toContain('PGID=1000')
		expect(args).toContain('UMASK=022')
	})

	it('names the host data root podman on every platform (BR-desktop-55)', () => {
		for (const platform of ['darwin', 'win32', 'linux']) {
			const dirs = podmanDataDirs(path.join('home', 'ada'), platform)
			expect(path.basename(path.dirname(dirs.quiConfig))).toBe('podman')
			expect(path.basename(path.dirname(dirs.downloads))).toBe('podman')
			expect(
				path.basename(
					legacyContainerDataRoot(path.join('home', 'ada'), platform),
				),
			).toBe('docker')
		}
	})

	it('renames the legacy docker data root to podman once (BR-desktop-55)', () => {
		const home = path.join('Users', 'ada')
		const legacy = legacyContainerDataRoot(home, 'darwin')
		const next = path.dirname(podmanDataDirs(home, 'darwin').quiConfig)
		const present = new Set([legacy])
		const renames: Array<[string, string]> = []
		const fs = {
			exists: (filePath: string) => present.has(filePath),
			rename: (from: string, to: string) => {
				renames.push([from, to])
				present.delete(from)
				present.add(to)
			},
		}
		expect(migrateLegacyContainerDataRoot(home, 'darwin', fs)).toBe(true)
		expect(renames).toEqual([[legacy, next]])
		expect(migrateLegacyContainerDataRoot(home, 'darwin', fs)).toBe(false)
		expect(renames).toHaveLength(1)
	})

	it('prefers an existing podman data root over the legacy docker root (BR-desktop-55)', () => {
		const home = path.join('Users', 'ada')
		const legacy = legacyContainerDataRoot(home, 'darwin')
		const next = path.dirname(podmanDataDirs(home, 'darwin').quiConfig)
		const renames: Array<[string, string]> = []
		const migrated = migrateLegacyContainerDataRoot(home, 'darwin', {
			exists: filePath => filePath === legacy || filePath === next,
			rename: (from, to) => renames.push([from, to]),
		})
		expect(migrated).toBe(false)
		expect(renames).toEqual([])
	})

	it('does nothing when no legacy docker data root exists (BR-desktop-55)', () => {
		const migrated = migrateLegacyContainerDataRoot('/home/ada', 'linux', {
			exists: () => false,
			rename: () => {
				throw new Error('must not rename')
			},
		})
		expect(migrated).toBe(false)
	})

	it('ensures podman data directories have 0755 traversal permissions (BR-desktop-29)', () => {
		const home = path.join('Users', 'ada')
		const dirs = podmanDataDirs(home, 'darwin')
		const chmodCalls: Array<{ path: string; mode: number }> = []
		ensurePodmanDataPermissions(dirs, (p, mode) => {
			chmodCalls.push({ path: p, mode })
		})

		expect(chmodCalls.length).toBe(5)
		for (const call of chmodCalls) {
			expect(call.mode).toBe(0o755)
		}
		expect(chmodCalls.some(c => c.path === dirs.qbitConfig)).toBe(true)
		expect(chmodCalls.some(c => c.path === dirs.downloads)).toBe(true)
		expect(chmodCalls.some(c => c.path === path.dirname(dirs.quiConfig))).toBe(
			true,
		)
	})

	it('mounts Gazelle config and database directories with port 7001', () => {
		const args = gazelleContainerRunArgs(
			'ghcr.io/opsnet/gazelle:latest',
			'/host/gazelle/config',
			'/host/gazelle/data',
		)
		expect(args).toContain('7001:7001')
		expect(args).toContain('/host/gazelle/config:/var/www/app/config')
		expect(args).toContain('/host/gazelle/data:/var/lib/mysql')
		expect(args.at(-1)).toBe('ghcr.io/opsnet/gazelle:latest')
	})
})

describe('Podman image prompt (BR-desktop-13)', () => {
	const local =
		'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
	const other =
		'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

	it('does not offer an update when the manifest still contains the local digest', () => {
		expect(
			imageDigestHasUpdate(
				`ghcr.io/autobrr/qui@${local}`,
				`{"manifests":[{"digest":"${other}"},{"digest":"${local}"}]}`,
			),
		).toBe(false)
	})

	it('offers an update only when none of the remote digests are local', () => {
		expect(imageDigestHasUpdate(`repo@${local}`, `{"digest":"${other}"}`)).toBe(
			true,
		)
	})

	it('does not prompt again for a digest the user dismissed', () => {
		const update = {
			image: 'qui-desktop:local',
			hasUpdate: true,
			remoteDigest: other,
		}
		expect(updatesWorthPrompting([update], {})).toEqual([update])
		expect(
			updatesWorthPrompting([update], { 'qui-desktop:local': other }),
		).toEqual([])
	})
})

describe('Podman container config arguments & inspect parsing', () => {
	it('builds Qui podman run args matching user configuration', () => {
		const args = quiConfigToRunArgs({
			port: 7480,
			configPath: '/custom/qui/config',
			dataPath: '/custom/data',
			puid: '1001',
			pgid: '1001',
			umask: '002',
			logLevel: 'DEBUG',
			baseUrl: '/qui',
			tz: 'Europe/Paris',
			restartPolicy: 'always',
			image: 'ghcr.io/autobrr/qui:latest',
		})

		expect(args).toContain('-p')
		expect(args).toContain('7480:7476')
		expect(args).toContain('/custom/qui/config:/config')
		expect(args).toContain('/custom/data:/data')
		expect(args).toContain('PUID=1001')
		expect(args).toContain('PGID=1001')
		expect(args).toContain('UMASK=002')
		expect(args).toContain('QUI__LOG_LEVEL=DEBUG')
		expect(args).toContain('QUI__BASE_URL=/qui')
		expect(args).toContain('TZ=Europe/Paris')
		expect(args).toContain('always')
		expect(args.at(-1)).toBe('ghcr.io/autobrr/qui:latest')
	})

	it('builds qBittorrent podman run args matching user configuration', () => {
		const args = qbitConfigToRunArgs({
			port: 8090,
			peerPort: 6890,
			configPath: '/custom/qbit/config',
			downloadsPath: '/custom/downloads',
			puid: '1000',
			pgid: '1000',
			umask: '022',
			tz: 'UTC',
			restartPolicy: 'unless-stopped',
			image: 'lscr.io/linuxserver/qbittorrent:latest',
		})

		expect(args).toContain('8090:8080')
		expect(args).toContain('6890:6881')
		expect(args).toContain('6890:6881/udp')
		expect(args).toContain('/custom/qbit/config:/config')
		expect(args).toContain('/custom/downloads:/downloads')
		expect(args).toContain('WEBUI_PORT=8090')
		expect(args).toContain('unless-stopped')
		expect(args.at(-1)).toBe('lscr.io/linuxserver/qbittorrent:latest')
	})

	it('parses podman inspect json into QuiContainerConfig correctly', () => {
		const inspect = JSON.stringify([
			{
				Config: {
					Image: 'ghcr.io/autobrr/qui:latest',
					Env: ['PUID=1000', 'PGID=1000', 'QUI__LOG_LEVEL=DEBUG', 'TZ=UTC'],
				},
				HostConfig: {
					Binds: ['/host/qui:/config', '/host/media:/data'],
					PortBindings: {
						'7476/tcp': [{ HostPort: '7476' }],
					},
					RestartPolicy: { Name: 'unless-stopped' },
				},
			},
		])

		const fallback = defaultQuiConfig(podmanDataDirs('/home', 'darwin'))
		const parsed = parseInspectToQuiConfig(inspect, fallback)
		expect(parsed.port).toBe(7476)
		expect(parsed.configPath).toBe('/host/qui')
		expect(parsed.dataPath).toBe('/host/media')
		expect(parsed.logLevel).toBe('DEBUG')
	})

	it('parses podman inspect json into QBitContainerConfig correctly', () => {
		const inspect = JSON.stringify([
			{
				Config: {
					Image: 'lscr.io/linuxserver/qbittorrent:latest',
					Env: ['PUID=1000', 'PGID=1000', 'TZ=UTC'],
				},
				HostConfig: {
					Binds: ['/host/qbit:/config', '/host/downloads:/downloads'],
					PortBindings: {
						'8080/tcp': [{ HostPort: '8080' }],
						'6881/tcp': [{ HostPort: '6881' }],
					},
					RestartPolicy: { Name: 'unless-stopped' },
				},
			},
		])

		const fallback = defaultQBitConfig(podmanDataDirs('/home', 'darwin'))
		const parsed = parseInspectToQBitConfig(inspect, fallback)
		expect(parsed.port).toBe(8080)
		expect(parsed.peerPort).toBe(6881)
		expect(parsed.configPath).toBe('/host/qbit')
		expect(parsed.downloadsPath).toBe('/host/downloads')
	})

	it('pre-seeds qBittorrent.conf with subnet bypass on clean install (BR-desktop-22)', () => {
		const writtenFiles = new Map<string, string>()
		const createdDirs = new Set<string>()

		const mockFs = {
			existsSync: (filePath: string) => writtenFiles.has(filePath),
			mkdirSync: (dirPath: string) => {
				createdDirs.add(dirPath)
				return undefined
			},
			readFileSync: (filePath: string) => writtenFiles.get(filePath) ?? '',
			writeFileSync: (filePath: string, data: string) => {
				writtenFiles.set(filePath, data)
			},
		}

		const qbitConfigDir = '/mock/appdata/podman/qbittorrent'
		const confPath = path.join(qbitConfigDir, 'qBittorrent', 'qBittorrent.conf')

		// First run: conf doesn't exist, should create dir and write pre-seeded config
		const seeded = ensureQbitPreseedConfig(qbitConfigDir, mockFs)
		expect(seeded).toBe(true)
		expect(createdDirs.has(path.join(qbitConfigDir, 'qBittorrent'))).toBe(true)
		expect(writtenFiles.get(confPath)).toContain(
			'WebUI\\AuthSubnetWhitelistEnabled=true',
		)
		expect(writtenFiles.get(confPath)).toContain('WebUI\\LocalHostAuth=false')
		expect(writtenFiles.get(confPath)).toContain('WebUI\\Address=*')

		// Existing config that already has bypass: left unchanged
		writtenFiles.set(
			confPath,
			'[Preferences]\nWebUI\\AuthSubnetWhitelistEnabled=true\n',
		)
		const unchanged = ensureQbitPreseedConfig(qbitConfigDir, mockFs)
		expect(unchanged).toBe(false)

		// Container-written config without bypass: patched in place (BR-desktop-46)
		const legacy = `[WebUI]\nAddress=*\nServerDomains=*\n`
		writtenFiles.set(confPath, legacy)
		const patched = ensureQbitPreseedConfig(qbitConfigDir, mockFs)
		expect(patched).toBe(true)
		expect(writtenFiles.get(confPath)).toContain('[Preferences]')
		expect(writtenFiles.get(confPath)).toContain(
			'WebUI\\AuthSubnetWhitelistEnabled=true',
		)
		expect(writtenFiles.get(confPath)).toContain('[WebUI]')
	})

	it('patchQBitConfigAuthBypass inserts keys under existing Preferences section (BR-desktop-46)', () => {
		const legacy = `[Preferences]\nConnection\\ResolvePeerCountries=true\n\n[WebUI]\nAddress=*\n`
		const patched = patchQBitConfigAuthBypass(legacy)
		expect(patched).toContain('WebUI\\AuthSubnetWhitelistEnabled=true')
		expect(patched).toContain('Connection\\ResolvePeerCountries=true')
		expect(patched.indexOf('[Preferences]')).toBeLessThan(
			patched.indexOf('[WebUI]'),
		)
		expect(patchQBitConfigAuthBypass(patched)).toBe(patched)
	})

	it('parses qBittorrent username and temporary password from container logs (BR-desktop-43)', () => {
		const logs = `
LocalPeer: failed to listen on local socket.
The WebUI administrator username is: admin
WebUI will be started shortly.
The WebUI administrator password was not set. A temporary password is provided for this session: wG5hHhawM
Connection to localhost succeeded!
`
		const creds = parseQBitCredentialsFromLogs(logs)
		expect(creds.username).toBe('admin')
		expect(creds.password).toBe('wG5hHhawM')
		expect(creds.isTemporary).toBe(true)

		// Returns defaults when no password found
		const emptyCreds = parseQBitCredentialsFromLogs(
			'Normal output without credentials',
		)
		expect(emptyCreds.username).toBe('admin')
		expect(emptyCreds.password).toBeUndefined()
		expect(emptyCreds.isTemporary).toBe(false)
	})

	it('parses WireGuard conf file into privateKey and address (BR-desktop-50)', () => {
		const sampleConf = `[Interface]
PrivateKey = aaaaaa111111=
Address = 10.2.0.2/32
DNS = 10.2.0.1
`
		const res = parseWireGuardConf(sampleConf)
		expect(res.privateKey).toBe('aaaaaa111111=')
		expect(res.address).toBe('10.2.0.2/32')
	})

	it('prefers the first IPv4 CIDR when Address is dual-stack (BR-desktop-50)', () => {
		const sampleConf = `[Interface]
PrivateKey = aaaaaa111111=
Address = 10.2.0.2/32, 2a07:b944::2:2/128
`
		const res = parseWireGuardConf(sampleConf)
		expect(res.address).toBe('10.2.0.2/32')
	})

	it('generates Gluetun VPN container run arguments and attaches qBittorrent (BR-desktop-51)', () => {
		const vpnArgs = vpnContainerRunArgs({
			provider: 'protonvpn',
			wireguardPrivateKey: 'my-key=',
			wireguardAddress: '10.2.0.5/32',
			serverCountry: 'Netherlands',
		})
		expect(vpnArgs).toContain('--cap-add=NET_ADMIN')
		expect(vpnArgs).toContain('VPN_SERVICE_PROVIDER=protonvpn')
		expect(vpnArgs).toContain('WIREGUARD_PRIVATE_KEY=my-key=')
		expect(vpnArgs).toContain('WIREGUARD_ADDRESSES=10.2.0.5/32')
		expect(vpnArgs).toContain('SERVER_COUNTRIES=Netherlands')

		const qbitAttachedArgs = qbitContainerRunArgs(
			'qbit:latest',
			'/host/cfg',
			'/host/dl',
			{
				vpnContainer: 'qui-vpn',
			},
		)
		expect(qbitAttachedArgs).toContain('--network=container:qui-vpn')
		expect(qbitAttachedArgs).not.toContain('-p')
	})

	it('places SERVER_COUNTRIES before the Gluetun image so it is not a container command (BR-desktop-54)', () => {
		const vpnArgs = vpnContainerRunArgs({
			provider: 'protonvpn',
			wireguardPrivateKey: 'my-key=',
			wireguardAddress: '10.2.0.2/32',
			serverCountry: 'United States',
		})
		const imageIndex = vpnArgs.lastIndexOf('qmcgaw/gluetun:latest')
		expect(imageIndex).toBeGreaterThan(-1)
		expect(vpnArgs.slice(imageIndex + 1)).toEqual([])
		const countryIndex = vpnArgs.indexOf('SERVER_COUNTRIES=United States')
		expect(countryIndex).toBeGreaterThan(-1)
		expect(countryIndex).toBeLessThan(imageIndex)
		expect(vpnArgs[countryIndex - 1]).toBe('-e')
	})
})
