/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	type ElectronmonDiscoverMessage,
	registerElectronmonMainModules,
} from '../src/main/electronmon.js'

describe('Electronmon development configuration (BR-desktop-37)', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('defines electronmon watch patterns in package.json to filter non-executable declarations and assets', () => {
		const pkgPath = path.resolve(__dirname, '../package.json')
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
			electronmon?: { patterns?: string[] }
		}

		expect(pkg.electronmon).toBeDefined()
		expect(Array.isArray(pkg.electronmon?.patterns)).toBe(true)

		const patterns = pkg.electronmon?.patterns ?? []
		expect(patterns).toContain('!src/**')
		expect(patterns).toContain('!**/*.d.ts')
		expect(patterns).toContain('!**/*.d.cts')
		expect(patterns).toContain('!**/*.map')
		expect(patterns).toContain('!dist/assets/**')
		expect(patterns).toContain('!dist/.tsbuildinfo')
	})

	it('configures incremental compilation in tsconfig.json to prevent startup re-emit races', () => {
		const tsconfigPath = path.resolve(__dirname, '../tsconfig.json')
		const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
			compilerOptions?: {
				incremental?: boolean
				tsBuildInfoFile?: string
			}
		}

		expect(tsconfig.compilerOptions?.incremental).toBe(true)
		expect(tsconfig.compilerOptions?.tsBuildInfoFile).toBe('dist/.tsbuildinfo')
	})

	it('registers all compiled main and preload modules with electronmon discover hook', () => {
		const tmpDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'qui-electronmon-test-'),
		)
		try {
			const mainDir = path.join(tmpDir, 'main')
			const preloadDir = path.join(tmpDir, 'preload')
			const sharedDir = path.join(tmpDir, 'shared')
			const assetsDir = path.join(tmpDir, 'assets')

			fs.mkdirSync(mainDir, { recursive: true })
			fs.mkdirSync(preloadDir, { recursive: true })
			fs.mkdirSync(sharedDir, { recursive: true })
			fs.mkdirSync(assetsDir, { recursive: true })

			fs.writeFileSync(path.join(mainDir, 'index.js'), '// main')
			fs.writeFileSync(path.join(mainDir, 'window.js'), '// window')
			fs.writeFileSync(path.join(mainDir, 'window.d.ts'), '// decl')
			fs.writeFileSync(path.join(preloadDir, 'index.cjs'), '// preload')
			fs.writeFileSync(path.join(preloadDir, 'index.d.cts'), '// preload decl')
			fs.writeFileSync(path.join(sharedDir, 'constants.js'), '// shared')
			fs.writeFileSync(path.join(assetsDir, 'icon.png'), 'fake-binary')

			const discovered: string[] = []
			const resolvedTmpDir = path.resolve(tmpDir)
			registerElectronmonMainModules({
				desktopDev: true,
				distDir: tmpDir,
				send: (msg: ElectronmonDiscoverMessage) => {
					if (msg.type === 'discover' && msg.file) {
						discovered.push(path.relative(resolvedTmpDir, msg.file))
					}
				},
			})

			expect(discovered).toContain('main/index.js')
			expect(discovered).toContain('main/window.js')
			expect(discovered).toContain('preload/index.cjs')
			expect(discovered).toContain('shared/constants.js')

			// Must not register declaration files or assets
			expect(discovered).not.toContain('main/window.d.ts')
			expect(discovered).not.toContain('preload/index.d.cts')
			expect(discovered).not.toContain('assets/icon.png')

			// electronmon keys appfiles with path.resolve(cwd, rel) absolute paths
			const absoluteDiscovered: string[] = []
			registerElectronmonMainModules({
				desktopDev: true,
				distDir: tmpDir,
				send: (msg: ElectronmonDiscoverMessage) => {
					absoluteDiscovered.push(msg.file)
				},
			})
			expect(absoluteDiscovered.length).toBeGreaterThan(0)
			for (const file of absoluteDiscovered) {
				expect(path.isAbsolute(file)).toBe(true)
				expect(file).toBe(path.resolve(file))
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true })
		}
	})

	it('no-ops when desktopDev is disabled or send function is not available', () => {
		const discovered: ElectronmonDiscoverMessage[] = []
		registerElectronmonMainModules({
			desktopDev: false,
			send: msg => discovered.push(msg),
		})
		expect(discovered).toHaveLength(0)

		const ignored: ElectronmonDiscoverMessage[] = []
		const realSend = process.send
		process.send = ((msg: unknown) => {
			ignored.push(msg as ElectronmonDiscoverMessage)
			return true
		}) as typeof process.send
		try {
			expect(() => {
				registerElectronmonMainModules({
					desktopDev: true,
					// Explicit undefined must not fall back to process.send
					send: undefined,
					distDir: path.join(os.tmpdir(), 'qui-electronmon-unused'),
				})
			}).not.toThrow()
			expect(ignored).toHaveLength(0)
		} finally {
			process.send = realSend
		}
	})

	it('logs and does not throw when distDir cannot be scanned', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const discovered: ElectronmonDiscoverMessage[] = []
		const missingDir = path.join(
			os.tmpdir(),
			`qui-electronmon-missing-${process.pid}-${Date.now()}`,
		)

		expect(() => {
			registerElectronmonMainModules({
				desktopDev: true,
				distDir: missingDir,
				send: msg => discovered.push(msg),
			})
		}).not.toThrow()

		expect(discovered).toHaveLength(0)
		expect(warn).toHaveBeenCalledWith(
			'[electronmon] failed to register main modules for discovery:',
			expect.any(Error),
		)
	})
})
