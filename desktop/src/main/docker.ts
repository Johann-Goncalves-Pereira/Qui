/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
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
} from '../shared/constants.js'
import { quiDesktopImageArchiveUrl } from '../shared/qui-image.js'
import {
	type DockerContainerStatus,
	DockerContainerStatusSchema,
	type DockerUpdateInfo,
	DockerUpdateInfoSchema,
	type QBitContainerConfig,
	QBitContainerConfigSchema,
	type QuiContainerConfig,
	QuiContainerConfigSchema,
} from '../shared/types.js'
import {
	defaultQBitConfig,
	defaultQuiConfig,
	dockerDataDirs,
	imageDigestHasUpdate,
	parseInspectToQBitConfig,
	parseInspectToQuiConfig,
	qbitConfigToRunArgs,
	qbitContainerRunArgs,
	quiConfigToRunArgs,
	quiContainerRunArgs,
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

export const DOCKER_BINARY_NOT_FOUND = 'docker binary not found'

/** macOS GUI launches do not inherit a shell PATH, so look up the CLI by path. */
export function dockerBinaryCandidates(homeDir: string): readonly string[] {
	return [
		path.join(homeDir, '.docker', 'bin', 'docker'),
		'/opt/homebrew/bin/docker',
		'/usr/local/bin/docker',
		'/Applications/Docker.app/Contents/Resources/bin/docker',
	]
}

export function resolveDockerBinary(
	exists: (candidate: string) => boolean,
	homeDir: string,
): string {
	for (const candidate of dockerBinaryCandidates(homeDir)) {
		if (exists(candidate)) {
			return candidate
		}
	}
	throw new Error(DOCKER_BINARY_NOT_FOUND)
}

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
		const executable = command === 'docker' ? this.locateBinary() : command
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
		if (!this.fileExists(overrideFile)) {
			const content = [
				'services:',
				'  web:',
				`    container_name: ${GAZELLE_CONTAINER_NAME}`,
				`    image: ${GAZELLE_IMAGE}`,
				'',
			].join('\n')
			this.writeFile(overrideFile, content)
		}
	}

	private async composeExec(
		composeArgs: string[],
		cwd: string,
	): Promise<{ stdout: string; stderr: string }> {
		try {
			return await this.executor.exec('docker', ['compose', ...composeArgs], {
				cwd,
				timeout: 600000,
			})
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err)
			if (
				errMsg.includes('unknown command: docker compose') ||
				errMsg.includes('is not a docker command')
			) {
				return await this.executor.exec('docker-compose', composeArgs, {
					cwd,
					timeout: 600000,
				})
			}
			throw err
		}
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
	 * Ensure `image` exists locally. Prefer inspect → pull; if pull fails
	 * (e.g. fork GHCR not published yet / $0 Actions), retag `qui-desktop:local`
	 * when that alias is present, else `docker load` the GitHub Releases archive
	 * so packaged apps still get this fork’s GUI (never upstream autobrr).
	 */
	private async pullIfMissing(image: string): Promise<void> {
		try {
			await this.executor.exec('docker', ['image', 'inspect', image])
			return
		} catch {
			// missing locally
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
		const url = quiDesktopImageArchiveUrl(
			GITHUB_REPO,
			this.processArch,
			CURRENT_APP_VERSION,
		)
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
		try {
			const { stdout } = await this.executor.exec('docker', [
				'inspect',
				QBIT_CONTAINER_NAME,
			])
			return parseInspectToQBitConfig(stdout, fallback)
		} catch {
			return fallback
		}
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
