/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	DOCKER_BINARY_NOT_FOUND,
	type DockerExecOptions,
	type DockerExecutor,
	DockerManager,
	dockerBinaryCandidates,
	resolveDockerBinary,
} from '../src/main/docker.js'
import {
	DEFAULT_GAZELLE_PORT,
	DEFAULT_QUI_PORT,
	GAZELLE_CONTAINER_NAME,
	GAZELLE_IMAGE,
	QUI_CONTAINER_NAME,
	QUI_IMAGE,
} from '../src/shared/constants.js'

class MockDockerExecutor implements DockerExecutor {
	public executedCommands: Array<{
		command: string
		args: string[]
		options?: DockerExecOptions
	}> = []
	public responses: Record<string, { stdout: string; stderr: string }> = {}

	async exec(
		command: string,
		args: string[],
		options?: DockerExecOptions,
	): Promise<{ stdout: string; stderr: string }> {
		this.executedCommands.push({ command, args, options })
		const key = `${command} ${args.join(' ')}`
		if (this.responses[key]) {
			return this.responses[key]
		}
		// Prefix match
		for (const [k, v] of Object.entries(this.responses)) {
			if (key.startsWith(k)) {
				return v
			}
		}
		return { stdout: '', stderr: '' }
	}
}

describe('Docker CLI resolution (BR-desktop-10)', () => {
	it('checks the Docker Desktop user CLI, Homebrew, /usr/local, then the app bundle', () => {
		const home = path.join('Users', 'example')
		expect(dockerBinaryCandidates(home)).toEqual([
			path.join(home, '.docker', 'bin', 'docker'),
			'/opt/homebrew/bin/docker',
			'/usr/local/bin/docker',
			'/Applications/Docker.app/Contents/Resources/bin/docker',
		])
	})

	it('uses the first candidate that exists', () => {
		const home = path.join('Users', 'example')
		const homebrew = '/opt/homebrew/bin/docker'
		const resolved = resolveDockerBinary(
			candidate => candidate === homebrew,
			home,
		)
		expect(resolved).toBe(homebrew)
	})

	it('reports docker binary not found when every candidate is missing', () => {
		expect(() =>
			resolveDockerBinary(() => false, path.join('Users', 'example')),
		).toThrow(DOCKER_BINARY_NOT_FOUND)
	})
})

describe('DockerManager', () => {
	it('checks if docker is available when docker info succeeds', async () => {
		const mock = new MockDockerExecutor()
		mock.responses['docker info --format {{.ServerVersion}}'] = {
			stdout: '24.0.7\n',
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const available = await manager.isDockerAvailable()
		expect(available).toBe(true)
	})

	it('returns false when docker info fails', async () => {
		const mock: DockerExecutor = {
			async exec() {
				throw new Error('Docker daemon not running')
			},
		}

		const manager = new DockerManager(mock)
		const available = await manager.isDockerAvailable()
		expect(available).toBe(false)
	})

	it('inspects container status correctly when running', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			'docker inspect --format {{.State.Status}}|{{.State.Running}} qui'
		] = {
			stdout: 'running|true\n',
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const status = await manager.getContainerStatus(
			QUI_CONTAINER_NAME,
			DEFAULT_QUI_PORT,
			QUI_IMAGE,
		)

		expect(status.name).toBe('qui')
		expect(status.state).toBe('running')
		expect(status.status).toBe('running')
		expect(status.port).toBe(7476)
	})

	it('returns not_found when container inspect fails', async () => {
		const mock: DockerExecutor = {
			async exec() {
				throw new Error('No such container')
			},
		}

		const manager = new DockerManager(mock)
		const status = await manager.getContainerStatus(
			QUI_CONTAINER_NAME,
			DEFAULT_QUI_PORT,
			QUI_IMAGE,
		)

		expect(status.state).toBe('not_found')
		expect(status.status).toBe('not_installed')
	})

	it('starts stopped containers during ensureContainersRunning', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			'docker inspect --format {{.State.Status}}|{{.State.Running}} qui'
		] = {
			stdout: 'exited|false\n',
			stderr: '',
		}
		mock.responses[
			'docker inspect --format {{.State.Status}}|{{.State.Running}} qbittorrent-nox'
		] = {
			stdout: 'running|true\n',
			stderr: '',
		}
		mock.responses['docker start qui'] = { stdout: 'qui\n', stderr: '' }

		const manager = new DockerManager(mock)
		await manager.ensureContainersRunning()

		expect(
			mock.executedCommands.some(
				c =>
					c.command === 'docker' &&
					c.args[0] === 'start' &&
					c.args[1] === 'qui',
			),
		).toBe(true)
	})

	it('detects available updates when image digests differ', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{range .RepoDigests}}{{.}}{{end}} ${QUI_IMAGE}`
		] = {
			stdout:
				'ghcr.io/autobrr/qui@sha256:1111111111111111111111111111111111111111111111111111111111111111',
			stderr: '',
		}
		mock.responses[`docker buildx imagetools inspect --raw ${QUI_IMAGE}`] = {
			stdout:
				'{"mediaType":"application/vnd.docker.distribution.manifest.list.v2+json","digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222"}',
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const update = await manager.checkForImageUpdate(QUI_IMAGE)

		expect(update.hasUpdate).toBe(true)
		expect(update.image).toBe(QUI_IMAGE)
	})

	it('detects no updates when local repo digest line lists multiple digests including the remote', async () => {
		const remote =
			'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
		const other =
			'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{range .RepoDigests}}{{.}}{{end}} ${QUI_IMAGE}`
		] = {
			stdout:
				`ghcr.io/autobrr/qui@${remote}\n` + `ghcr.io/autobrr/qui@${other}\n`,
			stderr: '',
		}
		mock.responses[`docker buildx imagetools inspect --raw ${QUI_IMAGE}`] = {
			stdout: `{"digest":"${remote}"}`,
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const update = await manager.checkForImageUpdate(QUI_IMAGE)

		expect(update.hasUpdate).toBe(false)
	})

	it('does not report an update when the manifest list still contains the local platform digest', async () => {
		const local =
			'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
		const index =
			'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{range .RepoDigests}}{{.}}{{end}} ${QUI_IMAGE}`
		] = {
			stdout: `qui-desktop@${local}`,
			stderr: '',
		}
		mock.responses[`docker buildx imagetools inspect --raw ${QUI_IMAGE}`] = {
			stdout: `{"manifests":[{"digest":"${index}"},{"digest":"${local}"}]}`,
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const update = await manager.checkForImageUpdate(QUI_IMAGE)
		expect(update.hasUpdate).toBe(false)
	})

	it('detects no updates when image digests match', async () => {
		const digest =
			'sha256:3333333333333333333333333333333333333333333333333333333333333333'
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{range .RepoDigests}}{{.}}{{end}} ${QUI_IMAGE}`
		] = {
			stdout: `ghcr.io/autobrr/qui@${digest}`,
			stderr: '',
		}
		mock.responses[`docker buildx imagetools inspect --raw ${QUI_IMAGE}`] = {
			stdout: `{"digest":"${digest}"}`,
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const update = await manager.checkForImageUpdate(QUI_IMAGE)

		expect(update.hasUpdate).toBe(false)
	})

	it('copies config before removing a container that has no host mount', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			'docker inspect --format {{.Config.Image}}||{{range .Mounts}}{{.Destination}}={{.Source}};{{end}} qui'
		] = {
			stdout: 'ghcr.io/autobrr/qui:latest||\n',
			stderr: '',
		}
		const created: string[] = []
		const manager = new DockerManager(mock, dir => {
			created.push(dir)
		})

		await manager.alignContainer('qui', QUI_IMAGE, '/host/qui', '/config')

		expect(created).toEqual(['/host/qui'])
		expect(mock.executedCommands.map(c => c.args[0])).toEqual([
			'inspect',
			'stop',
			'cp',
			'rm',
		])
	})

	it('realigns container when missing required extra mount (BR-desktop-16)', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			'docker inspect --format {{.Config.Image}}||{{range .Mounts}}{{.Destination}}={{.Source}};{{end}} qui'
		] = {
			stdout: `${QUI_IMAGE}||/config=/host/qui;\n`,
			stderr: '',
		}
		const manager = new DockerManager(mock, () => {})

		await manager.alignContainer('qui', QUI_IMAGE, '/host/qui', '/config', [
			{ hostDir: '/host/dl', containerDir: '/downloads' },
		])

		expect(mock.executedCommands.map(c => c.args[0])).toEqual([
			'inspect',
			'stop',
			'rm',
		])
	})

	it('leaves the container alone when the copy fails', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			'docker inspect --format {{.Config.Image}}||{{range .Mounts}}{{.Destination}}={{.Source}};{{end}} qui'
		] = {
			stdout: 'old:image||\n',
			stderr: '',
		}
		const original = mock.exec.bind(mock)
		mock.exec = async (command, args) => {
			if (args[0] === 'cp') {
				throw new Error('copy failed')
			}
			return original(command, args)
		}
		const manager = new DockerManager(mock, () => {})

		await expect(
			manager.alignContainer('qui', QUI_IMAGE, '/host/qui', '/config'),
		).rejects.toThrow('copy failed')
		expect(mock.executedCommands.map(c => c.args[0])).toEqual([
			'inspect',
			'stop',
		])
		expect(mock.executedCommands.some(c => c.args[0] === 'rm')).toBe(false)
	})

	it('updates and restarts container cleanly', async () => {
		const mock = new MockDockerExecutor()
		const manager = new DockerManager(mock)

		const success = await manager.updateAndRestartContainer(
			QUI_CONTAINER_NAME,
			QUI_IMAGE,
		)

		expect(success).toBe(true)
		expect(mock.executedCommands.map(c => c.args[0])).toEqual([
			'pull',
			'stop',
			'rm',
			'run',
		])
	})

	it('applies custom Qui container config and recreates container', async () => {
		const mock = new MockDockerExecutor()
		const manager = new DockerManager(mock, () => {})

		const res = await manager.applyQuiConfig({
			port: 7476,
			configPath: '/qui/config',
			dataPath: '/qui/data',
			puid: '1000',
			pgid: '1000',
			umask: '002',
			logLevel: 'INFO',
			baseUrl: '',
			tz: 'UTC',
			restartPolicy: 'unless-stopped',
			image: QUI_IMAGE,
		})

		expect(res.success).toBe(true)
		expect(mock.executedCommands.some(c => c.args[0] === 'stop')).toBe(true)
		expect(mock.executedCommands.some(c => c.args[0] === 'rm')).toBe(true)
		expect(mock.executedCommands.some(c => c.args[0] === 'run')).toBe(true)
	})

	it('applies custom qBittorrent container config and recreates container', async () => {
		const mock = new MockDockerExecutor()
		const manager = new DockerManager(mock, () => {})

		const res = await manager.applyQBitConfig({
			port: 8080,
			peerPort: 6881,
			configPath: '/qbit/config',
			downloadsPath: '/qbit/downloads',
			puid: '1000',
			pgid: '1000',
			umask: '022',
			tz: 'UTC',
			restartPolicy: 'unless-stopped',
			image: 'lscr.io/linuxserver/qbittorrent:latest',
		})

		expect(res.success).toBe(true)
		expect(mock.executedCommands.some(c => c.args[0] === 'run')).toBe(true)
	})

	it('restarts a named container via restartContainer', async () => {
		const mock = new MockDockerExecutor()
		const manager = new DockerManager(mock)

		const res = await manager.restartContainer(QUI_CONTAINER_NAME)
		expect(res.success).toBe(true)
		expect(mock.executedCommands).toEqual([
			{ command: 'docker', args: ['restart', QUI_CONTAINER_NAME] },
		])
	})

	it('inspects Gazelle container status (BR-desktop-15)', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{.State.Status}}|{{.State.Running}} ${GAZELLE_CONTAINER_NAME}`
		] = {
			stdout: 'running|true\n',
			stderr: '',
		}

		const manager = new DockerManager(mock)
		const status = await manager.getGazelleStatus()

		expect(status.name).toBe(GAZELLE_CONTAINER_NAME)
		expect(status.state).toBe('running')
		expect(status.port).toBe(DEFAULT_GAZELLE_PORT)
		expect(status.image).toBe(GAZELLE_IMAGE)
	})

	it('starts Gazelle container by cloning repo and provisioning compose stack (BR-desktop-15)', async () => {
		const mock = new MockDockerExecutor()
		let inspectCalls = 0
		mock.exec = async (command, args, options) => {
			mock.executedCommands.push({ command, args, options })
			if (args[0] === 'inspect') {
				inspectCalls++
				if (inspectCalls === 1) {
					// Initially not found
					throw new Error('No such container')
				}
				return { stdout: 'running|true\n', stderr: '' }
			}
			return { stdout: '', stderr: '' }
		}

		const writtenFiles: Record<string, string> = {}
		const manager = new DockerManager(
			mock,
			() => {},
			() => false, // repo not yet cloned
			(filePath, content) => {
				writtenFiles[filePath] = content
			},
		)
		const status = await manager.startGazelle()

		expect(status.state).toBe('running')
		expect(
			mock.executedCommands.some(
				c => c.command === 'git' && c.args[0] === 'clone',
			),
		).toBe(true)
		expect(
			mock.executedCommands.some(
				c =>
					c.command === 'docker' &&
					c.args[0] === 'compose' &&
					c.args[1] === 'up',
			),
		).toBe(true)
		expect(
			Object.keys(writtenFiles).some(k =>
				k.endsWith('docker-compose.override.yml'),
			),
		).toBe(true)
	})

	it('falls back to docker-compose binary when docker compose command is missing (BR-desktop-15)', async () => {
		const mock = new MockDockerExecutor()
		let inspectCalls = 0
		mock.exec = async (command, args, options) => {
			mock.executedCommands.push({ command, args, options })
			if (args[0] === 'inspect') {
				inspectCalls++
				if (inspectCalls === 1) {
					throw new Error('No such container')
				}
				return { stdout: 'running|true\n', stderr: '' }
			}
			if (command === 'docker' && args[0] === 'compose') {
				throw new Error('docker: unknown command: docker compose')
			}
			return { stdout: '', stderr: '' }
		}

		const manager = new DockerManager(
			mock,
			() => {},
			() => true, // compose file already exists
			() => {},
		)
		const status = await manager.startGazelle()
		expect(status.state).toBe('running')
		expect(
			mock.executedCommands.some(
				c => c.command === 'docker-compose' && c.args[0] === 'up',
			),
		).toBe(true)
	})

	it('stops and restarts Gazelle compose stack cleanly (BR-desktop-15)', async () => {
		const mock = new MockDockerExecutor()
		mock.responses[
			`docker inspect --format {{.State.Status}}|{{.State.Running}} ${GAZELLE_CONTAINER_NAME}`
		] = {
			stdout: 'exited|false\n',
			stderr: '',
		}

		const manager = new DockerManager(
			mock,
			() => {},
			() => true, // compose file exists
			() => {},
		)
		const stopStatus = await manager.stopGazelle()
		expect(stopStatus.state).toBe('stopped')
		expect(
			mock.executedCommands.some(
				c =>
					c.command === 'docker' &&
					c.args[0] === 'compose' &&
					c.args[1] === 'stop',
			),
		).toBe(true)

		const restartStatus = await manager.restartGazelle()
		expect(restartStatus.state).toBe('stopped')
		expect(
			mock.executedCommands.some(
				c =>
					c.command === 'docker' &&
					c.args[0] === 'compose' &&
					c.args[1] === 'restart',
			),
		).toBe(true)
	})

	it('wraps Gazelle provisioning errors with helpful diagnostics (BR-desktop-15)', async () => {
		const mock = new MockDockerExecutor()
		mock.exec = async (command, args) => {
			if (args[0] === 'inspect') {
				throw new Error('No such container')
			}
			if (command === 'git') {
				throw new Error('network unreachable')
			}
			return { stdout: '', stderr: '' }
		}

		const manager = new DockerManager(
			mock,
			() => {},
			() => false,
			() => {},
		)

		await expect(manager.startGazelle()).rejects.toThrow(
			'Failed to provision Gazelle companion: network unreachable',
		)
	})
})
