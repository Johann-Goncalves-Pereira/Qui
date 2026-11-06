/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	defaultQBitConfig,
	defaultQuiConfig,
	dockerDataDirs,
	gazelleContainerRunArgs,
	imageDigestHasUpdate,
	parseInspectToQBitConfig,
	parseInspectToQuiConfig,
	qbitConfigToRunArgs,
	qbitContainerRunArgs,
	quiConfigToRunArgs,
	quiContainerRunArgs,
	updatesWorthPrompting,
} from '../src/main/container-layout.js'

describe('Docker data survives container replacement (BR-desktop-11)', () => {
	it('keeps Qui config and downloads under the desktop data directory', () => {
		const home = path.join('Users', 'ada')
		const dirs = dockerDataDirs(home, 'darwin')
		expect(dirs.quiConfig).toBe(
			path.join(home, 'Library', 'Application Support', 'Qui', 'docker', 'qui'),
		)
		expect(dirs.downloads).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'docker',
				'downloads',
			),
		)
		expect(dirs.gazelleConfig).toBe(
			path.join(
				home,
				'Library',
				'Application Support',
				'Qui',
				'docker',
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
				'docker',
				'gazelle',
				'data',
			),
		)
	})

	it('mounts the host config directory into the Qui container', () => {
		const args = quiContainerRunArgs('qui-desktop:local', '/host/qui')
		expect(args).toContain('-v')
		expect(args).toContain('/host/qui:/config')
		expect(args.at(-1)).toBe('qui-desktop:local')
	})

	it('mounts qBittorrent config and the download directory', () => {
		const args = qbitContainerRunArgs('qbit:latest', '/host/qbit', '/host/dl')
		expect(args).toContain('/host/qbit:/config')
		expect(args).toContain('/host/dl:/downloads')
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

describe('Docker image prompt (BR-desktop-13)', () => {
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

describe('Docker container config arguments & inspect parsing', () => {
	it('builds Qui docker run args matching user configuration', () => {
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

	it('builds qBittorrent docker run args matching user configuration', () => {
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

	it('parses docker inspect json into QuiContainerConfig correctly', () => {
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

		const fallback = defaultQuiConfig(dockerDataDirs('/home', 'darwin'))
		const parsed = parseInspectToQuiConfig(inspect, fallback)
		expect(parsed.port).toBe(7476)
		expect(parsed.configPath).toBe('/host/qui')
		expect(parsed.dataPath).toBe('/host/media')
		expect(parsed.logLevel).toBe('DEBUG')
	})

	it('parses docker inspect json into QBitContainerConfig correctly', () => {
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

		const fallback = defaultQBitConfig(dockerDataDirs('/home', 'darwin'))
		const parsed = parseInspectToQBitConfig(inspect, fallback)
		expect(parsed.port).toBe(8080)
		expect(parsed.peerPort).toBe(6881)
		expect(parsed.configPath).toBe('/host/qbit')
		expect(parsed.downloadsPath).toBe('/host/downloads')
	})
})
