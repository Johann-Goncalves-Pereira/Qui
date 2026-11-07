#!/usr/bin/env node
/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function bumpPatchVersion(currentVersion) {
	const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(currentVersion.trim())
	if (!match) {
		throw new Error(`Invalid semver version: "${currentVersion}"`)
	}
	const major = parseInt(match[1], 10)
	const minor = parseInt(match[2], 10)
	const patch = parseInt(match[3], 10) + 1
	return `${major}.${minor}.${patch}`
}

function run() {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const pkgPath = path.resolve(__dirname, '../package.json')

	const raw = readFileSync(pkgPath, 'utf8')
	const pkg = JSON.parse(raw)
	const currentVersion = pkg.version || '0.0.0'
	const newVersion = bumpPatchVersion(currentVersion)

	const isDryRun = process.argv.includes('--dry-run')
	if (isDryRun) {
		process.stdout.write(newVersion + '\n')
		return
	}

	pkg.version = newVersion
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

	const webPkgPath = path.resolve(__dirname, '../../web/package.json')
	try {
		const webRaw = readFileSync(webPkgPath, 'utf8')
		const webPkg = JSON.parse(webRaw)
		webPkg.version = newVersion
		writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2) + '\n', 'utf8')
	} catch {
		// optional: web package.json may not exist in isolated builds
	}

	console.log(`Bumped desktop version: ${currentVersion} -> ${newVersion}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	run()
}
