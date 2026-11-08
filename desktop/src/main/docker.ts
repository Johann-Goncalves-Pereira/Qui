/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { execFile } from 'node:child_process'
import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { Schema } from 'effect'
import {
	CURRENT_APP_VERSION,
	DEFAULT_GAZELLE_PORT,
	DEFAULT_QBIT_PORT,
	DEFAULT_QUI_PORT,
	GAZELLE_CONTAINER_NAME,
	GAZELLE_IMAGE,
	GAZELLE_REPO_URL,
	GITHUB_REPO,
	QBIT_CONTAINER_NAME,
	QBIT_IMAGE,
	QUI_CONTAINER_NAME,
	QUI_IMAGE,
	QUI_IMAGE_LOCAL,
	VPN_CONTAINER_NAME,
	VPN_IMAGE,
} from '../shared/constants.js'
import {
	quiDesktopImageArchiveUrl,
	quiEmbeddedImageArchiveRelativePath,
} from '../shared/qui-image.js'
import {
	type DockerContainerStatus,
	DockerContainerStatusSchema,
	type DockerUpdateInfo,
	DockerUpdateInfoSchema,
	type QBitContainerConfig,
	QBitContainerConfigSchema,
	type QuiContainerConfig,
	QuiContainerConfigSchema,
	type VpnConfig,
	VpnConfigSchema,
} from '../shared/types.js'
import {
	defaultQBitConfig,
	defaultQuiConfig,
	dockerDataDirs,
	ensureDockerDataPermissions,
	imageDigestHasUpdate,
	parseInspectToQBitConfig,
	parseInspectToQuiConfig,
	parseQBitCredentialsFromLogs,
	qbitConfigToRunArgs,
	qbitContainerRunArgs,
	quiConfigToRunArgs,
	quiContainerRunArgs,
	vpnContainerRunArgs,
} from './container-layout.js'

const execFileAsync = promisify(execFile)

export interface DockerExecOptions {
	cwd?: string
	timeout?: number
}

export interface DockerExecutor {
	exec(
		command: string,
		args: string[],
		options?: DockerExecOptions,
	): Promise<{ stdout: string; stderr: string }>
}

/** Standard PATH additions for macOS GUI apps (which don't inherit interactive shell PATH). */
const DEFAULT_EXEC_PATH = [
	'/opt/homebrew/bin',
	'/usr/local/bin',
	'/usr/bin',
	'/bin',
	'/usr/sbin',
	'/sbin',
	process.env.PATH ?? '',
]
	.filter(Boolean)
	.join(':')

export const PODMAN_BINARY_NOT_FOUND = 'podman binary not found'
export const DOCKER_BINARY_NOT_FOUND = PODMAN_BINARY_NOT_FOUND

/** macOS GUI launches do not inherit a shell PATH, so look up the Podman CLI by path. */
export function podmanBinaryCandidates(homeDir: string): readonly string[] {
	return [
		'/opt/homebrew/bin/podman',
		'/usr/local/bin/podman',
		path.join(homeDir, '.local', 'bin', 'podman'),
		'/usr/bin/podman',
		'/bin/podman',
	]
}

/** Legacy alias for backwards compatibility with tests and callers. */
export const dockerBinaryCandidates = podmanBinaryCandidates

export function resolvePodmanBinary(
	exists: (candidate: string) => boolean,
	homeDir: string,
): string {
	for (const candidate of podmanBinaryCandidates(homeDir)) {
		if (exists(candidate)) {
			return candidate
		}
	}
	throw new Error(PODMAN_BINARY_NOT_FOUND)
}

/** Legacy alias for backwards compatibility. */
export const resolveDockerBinary = resolvePodmanBinary

export class CliDockerExecutor implements DockerExecutor {
	constructor(
		private readonly locateBinary: () => string = () =>
			resolveDockerBinary(existsSync, homedir()),
	) {}

	async exec(
		command: string,
		args: string[],
		options?: DockerExecOptions,
	): Promise<{ stdout: string; stderr: string }> {
		const executable =
			command === 'docker' || command === 'podman'
				? this.locateBinary()
				: command
		const pathValue = [path.dirname(executable), DEFAULT_EXEC_PATH].join(
			path.delimiter,
		)
		return execFileAsync(executable, args, {
			timeout: options?.timeout ?? 120000,
			cwd: options?.cwd,
			env: {
				...process.env,
				PATH: pathValue,
			},
		})
	}
}

const INSPECT_ALIGN_FORMAT =
	'{{.Config.Image}}||{{range .Mounts}}{{.Destination}}={{.Source}};{{end}}'

export type BinaryFetcher = (url: string) => Promise<Uint8Array>

async function defaultBinaryFetch(url: string): Promise<Uint8Array> {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} fetching ${url}`)
	}
	return new Uint8Array(await response.arrayBuffer())
}

export class DockerManager {
	constructor(
		private readonly executor: DockerExecutor = new CliDockerExecutor(),
		private readonly mkdir: (dir: string) => void = dir => {
			mkdirSync(dir, { recursive: true })
		},
		private readonly quiImage: string = QUI_IMAGE,
		private readonly fileExists: (filePath: string) => boolean = existsSync,
		private readonly writeFile: (filePath: string, content: string) => void = (
			filePath,
			content,
		) => {
			writeFileSync(filePath, content, 'utf8')
		},
		private readonly fetchBinary: BinaryFetcher = defaultBinaryFetch,
		private readonly processArch: string = process.arch,
		private readonly resourcesPath: string = process.resourcesPath ?? '',
		private readonly readFile: (filePath: string) => string = filePath =>
			readFileSync(filePath, 'utf8'),
	) {}

	/**
	 * Copy /config onto the host, then remove the container, when it is missing
	 * that mount or is not the requested image. A failed copy leaves the
	 * container in place so the account database is not deleted.
	 */
	async alignContainer(
		name: string,
		desiredImage: string,
		hostDir: string,
		containerDir: string,
		requiredExtraMounts?: Array<{ hostDir: string; containerDir: string }>,
	): Promise<void> {
		let raw: string
		try {
			const { stdout } = await this.executor.exec('docker', [
				'inspect',
				'--format',
				INSPECT_ALIGN_FORMAT,
				name,
			])
			raw = stdout.trim()
		} catch {
			return
		}
		const [image = '', mounts = ''] = raw.split('||')
		const mountEntries = mounts.split(';')
		const mounted = mountEntries.some(
			entry => entry === `${containerDir}=${hostDir}`,
		)
		const extraMounted =
			!requiredExtraMounts ||
			requiredExtraMounts.every(req =>
				mountEntries.some(
					entry => entry === `${req.containerDir}=${req.hostDir}`,
				),
			)
		if (mounted && extraMounted && image === desiredImage) {
			return
		}
		await this.executor.exec('docker', ['stop', name])
		if (!mounted) {
			this.mkdir(hostDir)
			await this.executor.exec('docker', [
				'cp',
				`${name}:${containerDir}/.`,
				hostDir,
			])
		}
		await this.executor.exec('docker', ['rm', name])
	}

	async isDockerAvailable(): Promise<boolean> {
		try {
			const { stdout } = await this.executor.exec('docker', [
				'info',
				'--format',
				'{{.ServerVersion}}',
			])
			return stdout.trim().length > 0
		} catch {
			return false
		}
	}

	async isPodmanAvailable(): Promise<boolean> {
		return this.isDockerAvailable()
	}

	async getContainerStatus(
		containerName: string,
		port: number,
		image: string,
	): Promise<DockerContainerStatus> {
		try {
			const { stdout } = await this.executor.exec('docker', [
				'inspect',
				'--format',
				'{{.State.Status}}|{{.State.Running}}',
				containerName,
			])
			const [status, running] = stdout.trim().split('|')
			const state = running === 'true' ? 'running' : 'stopped'

			return Schema.decodeUnknownSync(DockerContainerStatusSchema)({
				name: containerName,
				state,
				status: status ?? 'unknown',
				image,
				port,
			})
		} catch {
			return Schema.decodeUnknownSync(DockerContainerStatusSchema)({
				name: containerName,
				state: 'not_found',
				status: 'not_installed',
				image,
				port,
			})
		}
	}

	async ensureContainersRunning(): Promise<{
		qui: DockerContainerStatus
		qbit: DockerContainerStatus
	}> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		ensureDockerDataPermissions(dirs)
		const quiStatus = await this.ensureContainer(
			QUI_CONTAINER_NAME,
			this.quiImage,
			DEFAULT_QUI_PORT,
			quiContainerRunArgs(this.quiImage, dirs.quiConfig, dirs.downloads),
		)

		const qbitStatus = await this.ensureContainer(
			QBIT_CONTAINER_NAME,
			QBIT_IMAGE,
			DEFAULT_QBIT_PORT,
			qbitContainerRunArgs(QBIT_IMAGE, dirs.qbitConfig, dirs.downloads),
		)

		return { qui: quiStatus, qbit: qbitStatus }
	}

	async getGazelleStatus(): Promise<DockerContainerStatus> {
		return this.getContainerStatus(
			GAZELLE_CONTAINER_NAME,
			DEFAULT_GAZELLE_PORT,
			GAZELLE_IMAGE,
		)
	}

	async ensureGazelleRepoCloned(repoDir: string): Promise<void> {
		const composeFile = path.join(repoDir, 'docker-compose.yml')
		if (!this.fileExists(composeFile)) {
			await this.executor.exec(
				'git',
				['clone', '--depth', '1', GAZELLE_REPO_URL, repoDir],
				{ timeout: 300000 },
			)
		}
	}

	ensureGazelleComposeOverride(repoDir: string): void {
		const overrideFile = path.join(repoDir, 'docker-compose.override.yml')
		const content = [
			'services:',
			'  web:',
			`    container_name: ${GAZELLE_CONTAINER_NAME}`,
			`    image: ${GAZELLE_IMAGE}`,
			'    restart: unless-stopped',
			'',
		].join('\n')
		this.writeFile(overrideFile, content)
	}

	ensureGazellePatches(repoDir: string): void {
		const galleryScript = path.join(
			repoDir,
			'bin',
			'build-stylesheet-gallery.mjs',
		)
		if (this.fileExists(galleryScript)) {
			try {
				const original = this.readFile(galleryScript)
				if (original.includes('process.exitCode = 1;\n});')) {
					const patched = original.replace(
						'process.exitCode = 1;\n});',
						'console.warn("Puppeteer preview launch skipped in headless container");\nprocess.exitCode = 0;\n});',
					)
					this.writeFile(galleryScript, patched)
				}
			} catch {
				// Best-effort patch
			}
		}
	}

	private async composeExec(
		composeArgs: string[],
		cwd: string,
	): Promise<{ stdout: string; stderr: string }> {
		const candidates: Array<{ cmd: string; args: string[] }> = [
			{ cmd: 'docker', args: ['compose', ...composeArgs] },
			{ cmd: 'docker-compose', args: composeArgs },
			{ cmd: 'podman', args: ['compose', ...composeArgs] },
			{ cmd: 'podman-compose', args: composeArgs },
		]

		let lastError: unknown = null
		for (const candidate of candidates) {
			try {
				return await this.executor.exec(candidate.cmd, candidate.args, {
					cwd,
					timeout: 600000,
				})
			} catch (err) {
				lastError = err
				const errMsg = err instanceof Error ? err.message : String(err)
				if (
					errMsg.includes('unknown command') ||
					errMsg.includes('is not a') ||
					errMsg.includes('not found') ||
					errMsg.includes('ENOENT')
				) {
					continue
				}
				throw err
			}
		}
		throw (
			lastError ??
			new Error('Neither podman compose nor docker compose succeeded')
		)
	}

	async startGazelle(): Promise<DockerContainerStatus> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		this.mkdir(dirs.gazelleConfig)
		this.mkdir(dirs.gazelleData)
		this.mkdir(dirs.gazelleRepo)

		const current = await this.getGazelleStatus()
		if (current.state === 'running') {
			return current
		}

		try {
			await this.ensureGazelleRepoCloned(dirs.gazelleRepo)
			this.ensureGazellePatches(dirs.gazelleRepo)
			this.ensureGazelleComposeOverride(dirs.gazelleRepo)
			await this.composeExec(['up', '-d'], dirs.gazelleRepo)
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to provision Gazelle companion: ${msg}`)
		}

		return this.getGazelleStatus()
	}

	async stopGazelle(): Promise<DockerContainerStatus> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		try {
			const composeFile = path.join(dirs.gazelleRepo, 'docker-compose.yml')
			if (this.fileExists(composeFile)) {
				await this.composeExec(['stop'], dirs.gazelleRepo)
			} else {
				await this.executor.exec('docker', ['stop', GAZELLE_CONTAINER_NAME])
			}
		} catch {
			// Container/stack may already be stopped or absent
		}
		return this.getGazelleStatus()
	}

	async restartGazelle(): Promise<DockerContainerStatus> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		try {
			const composeFile = path.join(dirs.gazelleRepo, 'docker-compose.yml')
			if (this.fileExists(composeFile)) {
				await this.composeExec(['restart'], dirs.gazelleRepo)
				return this.getGazelleStatus()
			}
			await this.executor.exec('docker', ['restart', GAZELLE_CONTAINER_NAME])
			return this.getGazelleStatus()
		} catch {
			return this.startGazelle()
		}
	}

	private async ensureContainer(
		name: string,
		image: string,
		port: number,
		runArgs: string[],
	): Promise<DockerContainerStatus> {
		const current = await this.getContainerStatus(name, port, image)

		if (current.state === 'running') {
			return current
		}

		if (current.state === 'stopped') {
			await this.executor.exec('docker', ['start', name])
			return this.getContainerStatus(name, port, image)
		}

		await this.pullIfMissing(image)
		await this.executor.exec('docker', runArgs)
		return this.getContainerStatus(name, port, image)
	}

	async checkForImageUpdate(imageName: string): Promise<DockerUpdateInfo> {
		try {
			// Get local image repo digest
			const { stdout: localDigestOut } = await this.executor.exec('docker', [
				'inspect',
				'--format',
				'{{range .RepoDigests}}{{.}}{{end}}',
				imageName,
			])
			const localDigest = localDigestOut.trim()

			// The raw manifest lists every platform digest. An update exists only
			// when none of those digests are already local.
			let remoteText = ''
			try {
				const { stdout: remoteOut } = await this.executor.exec('docker', [
					'buildx',
					'imagetools',
					'inspect',
					'--raw',
					imageName,
				])
				remoteText = remoteOut
			} catch {
				const { stdout: manifestOut } = await this.executor.exec('docker', [
					'manifest',
					'inspect',
					imageName,
				])
				remoteText = manifestOut
			}

			const hasUpdate = imageDigestHasUpdate(localDigest, remoteText)
			const remoteDigest =
				remoteText.match(/sha256:[a-f0-9]{64}/i)?.[0] ?? 'unknown'

			return Schema.decodeUnknownSync(DockerUpdateInfoSchema)({
				hasUpdate,
				image: imageName,
				localDigest: localDigest || 'unknown',
				remoteDigest: remoteDigest || 'unknown',
			})
		} catch {
			return Schema.decodeUnknownSync(DockerUpdateInfoSchema)({
				hasUpdate: false,
				image: imageName,
				localDigest: 'unknown',
				remoteDigest: 'unknown',
			})
		}
	}

	async updateAndRestartContainer(
		containerName: string,
		image: string,
	): Promise<boolean> {
		try {
			const dirs = dockerDataDirs(homedir(), process.platform)
			await this.executor.exec('docker', ['pull', image])
			await this.executor.exec('docker', ['stop', containerName])
			await this.executor.exec('docker', ['rm', containerName])
			const runArgs =
				containerName === QUI_CONTAINER_NAME
					? quiContainerRunArgs(image, dirs.quiConfig, dirs.downloads)
					: qbitContainerRunArgs(image, dirs.qbitConfig, dirs.downloads)
			await this.executor.exec('docker', runArgs)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Ensure `image` exists locally.
	 * 1. If inspect succeeds, image is ready.
	 * 2. Check for embedded archive inside the application bundle (process.resourcesPath).
	 *    If present, docker load it instantly without network dependencies.
	 * 3. Fallback to `docker pull`.
	 * 4. Fallback to retagging `qui-desktop:local` if present.
	 * 5. Fallback to downloading release archive from GitHub Releases.
	 */
	private async pullIfMissing(image: string): Promise<void> {
		try {
			await this.executor.exec('docker', ['image', 'inspect', image])
			return
		} catch {
			// missing locally
		}

		// First priority for packaged app: load embedded image archive if bundled
		if (this.resourcesPath) {
			const embeddedArchive = path.join(
				this.resourcesPath,
				quiEmbeddedImageArchiveRelativePath(this.processArch),
			)
			if (this.fileExists(embeddedArchive)) {
				try {
					await this.executor.exec('docker', ['load', '-i', embeddedArchive], {
						timeout: 600_000,
					})
					await this.executor.exec('docker', [
						'image',
						'inspect',
						QUI_IMAGE_LOCAL,
					])
					if (image !== QUI_IMAGE_LOCAL) {
						await this.executor.exec('docker', ['tag', QUI_IMAGE_LOCAL, image])
					}
					return
				} catch {
					// Fall through to pull / network fallback
				}
			}
		}

		try {
			await this.executor.exec('docker', ['pull', image])
			return
		} catch (pullError) {
			if (image === QUI_IMAGE_LOCAL) {
				throw pullError
			}
			try {
				await this.executor.exec('docker', [
					'image',
					'inspect',
					QUI_IMAGE_LOCAL,
				])
				await this.executor.exec('docker', ['tag', QUI_IMAGE_LOCAL, image])
				return
			} catch {
				// fall through to Releases archive
			}
			try {
				await this.loadForkImageFromGithubRelease(image)
				return
			} catch {
				throw pullError
			}
		}
	}

	private async loadForkImageFromGithubRelease(
		desiredImage: string,
	): Promise<void> {
		const tag = desiredImage.includes(':')
			? desiredImage.split(':')[1]
			: CURRENT_APP_VERSION
		const url = quiDesktopImageArchiveUrl(GITHUB_REPO, this.processArch, tag)
		const bytes = await this.fetchBinary(url)
		const archivePath = path.join(
			tmpdir(),
			`qui-desktop-image-${Date.now()}.tar.gz`,
		)
		writeFileSync(archivePath, bytes)
		try {
			await this.executor.exec('docker', ['load', '-i', archivePath], {
				timeout: 600_000,
			})
			await this.executor.exec('docker', ['image', 'inspect', QUI_IMAGE_LOCAL])
			if (desiredImage !== QUI_IMAGE_LOCAL) {
				await this.executor.exec('docker', [
					'tag',
					QUI_IMAGE_LOCAL,
					desiredImage,
				])
			}
		} finally {
			try {
				unlinkSync(archivePath)
			} catch {
				// temp cleanup best-effort
			}
		}
	}

	async getQuiConfig(): Promise<QuiContainerConfig> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		const fallback = defaultQuiConfig(dirs)
		try {
			const { stdout } = await this.executor.exec('docker', [
				'inspect',
				QUI_CONTAINER_NAME,
			])
			return parseInspectToQuiConfig(stdout, fallback)
		} catch {
			return fallback
		}
	}

	async getQBitConfig(): Promise<QBitContainerConfig> {
		const dirs = dockerDataDirs(homedir(), process.platform)
		const fallback = defaultQBitConfig(dirs)
		let config = fallback
		try {
			const { stdout } = await this.executor.exec('docker', [
				'inspect',
				QBIT_CONTAINER_NAME,
			])
			config = parseInspectToQBitConfig(stdout, fallback)
		} catch {
			config = fallback
		}

		try {
			const { stdout: logs } = await this.executor.exec('docker', [
				'logs',
				'--tail',
				'200',
				QBIT_CONTAINER_NAME,
			])
			const creds = parseQBitCredentialsFromLogs(logs)
			config = {
				...config,
				username: creds.username,
				password: creds.password,
				isTemporaryPassword: creds.isTemporary,
			}
		} catch {
			config = {
				...config,
				username: config.username || 'admin',
			}
		}

		return config
	}

	async applyQuiConfig(
		rawConfig: unknown,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const config = Schema.decodeUnknownSync(QuiContainerConfigSchema)(
				rawConfig,
			)
			this.mkdir(config.configPath)
			if (config.dataPath) {
				this.mkdir(config.dataPath)
			}
			try {
				await this.executor.exec('docker', ['stop', QUI_CONTAINER_NAME])
			} catch {
				// Container might not be running
			}
			try {
				await this.executor.exec('docker', ['rm', QUI_CONTAINER_NAME])
			} catch {
				// Container might not exist
			}
			await this.pullIfMissing(config.image)
			const args = quiConfigToRunArgs(config)
			await this.executor.exec('docker', args)
			return { success: true }
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err)
			return { success: false, error }
		}
	}

	async applyQBitConfig(
		rawConfig: unknown,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const config = Schema.decodeUnknownSync(QBitContainerConfigSchema)(
				rawConfig,
			)
			this.mkdir(config.configPath)
			this.mkdir(config.downloadsPath)
			ensureDockerDataPermissions({
				quiConfig: path.join(path.dirname(config.configPath), 'qui'),
				qbitConfig: config.configPath,
				downloads: config.downloadsPath,
				gazelleConfig: '',
				gazelleData: '',
				gazelleRepo: '',
			})
			try {
				await this.executor.exec('docker', ['stop', QBIT_CONTAINER_NAME])
			} catch {
				// Container might not be running
			}
			try {
				await this.executor.exec('docker', ['rm', QBIT_CONTAINER_NAME])
			} catch {
				// Container might not exist
			}
			await this.pullIfMissing(config.image)
			const args = qbitConfigToRunArgs(config)
			await this.executor.exec('docker', args)
			return { success: true }
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err)
			return { success: false, error }
		}
	}

	async applyVpnConfig(
		rawConfig: unknown,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const config = Schema.decodeUnknownSync(VpnConfigSchema)(rawConfig)
			const dirs = dockerDataDirs(homedir(), process.platform)

			// 1. Stop and remove existing qbittorrent container
			try {
				await this.executor.exec('docker', ['stop', QBIT_CONTAINER_NAME])
			} catch {}
			try {
				await this.executor.exec('docker', ['rm', QBIT_CONTAINER_NAME])
			} catch {}

			// 2. Stop and remove existing VPN container
			try {
				await this.executor.exec('docker', ['stop', VPN_CONTAINER_NAME])
			} catch {}
			try {
				await this.executor.exec('docker', ['rm', VPN_CONTAINER_NAME])
			} catch {}

			if (config.enabled) {
				// Spin up Gluetun container
				await this.pullIfMissing(VPN_IMAGE)
				const vpnArgs = vpnContainerRunArgs(config)
				await this.executor.exec('docker', vpnArgs)

				// Spin up qBittorrent attached to VPN container network namespace
				await this.pullIfMissing(QBIT_IMAGE)
				const qbitArgs = qbitContainerRunArgs(
					QBIT_IMAGE,
					dirs.qbitConfig,
					dirs.downloads,
					{ vpnContainer: VPN_CONTAINER_NAME },
				)
				await this.executor.exec('docker', qbitArgs)
			} else {
				// Spin up qBittorrent standalone
				await this.pullIfMissing(QBIT_IMAGE)
				const qbitArgs = qbitContainerRunArgs(
					QBIT_IMAGE,
					dirs.qbitConfig,
					dirs.downloads,
				)
				await this.executor.exec('docker', qbitArgs)
			}

			return { success: true }
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err)
			return { success: false, error }
		}
	}

	async getVpnStatus(): Promise<DockerContainerStatus> {
		return this.getContainerStatus(VPN_CONTAINER_NAME, DEFAULT_QBIT_PORT, VPN_IMAGE)
	}

	async restartContainer(
		containerName: string,
	): Promise<{ success: boolean; error?: string }> {
		try {
			await this.executor.exec('docker', ['restart', containerName])
			return { success: true }
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err)
			return { success: false, error }
		}
	}
}

export const PodmanManager = DockerManager
export const CliPodmanExecutor = CliDockerExecutor
export type PodmanExecutor = DockerExecutor
export type PodmanExecOptions = DockerExecOptions
