/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Homebrew Cask specification (BR-desktop-24)', () => {
	const caskPath = resolve(__dirname, '../../Casks/qui.rb')
	const packageJsonPath = resolve(__dirname, '../package.json')

	const caskContent = readFileSync(caskPath, 'utf8')
	const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

	it('defines the canonical qui cask block with dual-architecture support', () => {
		expect(caskContent).toContain('cask "qui" do')
		expect(caskContent).toMatch(/arch\s+arm:\s+"arm64",\s*intel:\s+"x64"/)
	})

	it('points to GitHub Releases with DMG asset naming', () => {
		expect(caskContent).toContain(
			'url "https://github.com/Johann-Goncalves-Pereira/Qui/releases/download/v#{version}/Qui-#{version}-#{arch}.dmg"',
		)
		expect(caskContent).toContain('livecheck do')
		expect(caskContent).toContain('strategy :github_latest')
	})

	it('specifies the app name matching desktop productName', () => {
		expect(caskContent).toContain(`app "${pkg.productName}.app"`)
	})

	it('keeps cask version equal to desktop package.json (BR-desktop-28)', () => {
		expect(caskContent).toContain(`version "${pkg.version}"`)
	})

	it('includes comprehensive zap paths targeting desktop storage and bundle identifier', () => {
		const appId = pkg.build.appId // com.autobrr.qui.desktop
		expect(caskContent).toContain('zap trash: [')
		expect(caskContent).toContain('"~/Library/Application Support/Qui"')
		expect(caskContent).toContain(`"~/Library/Caches/${appId}"`)
		expect(caskContent).toContain(`"~/Library/Caches/${appId}.ShipIt"`)
		expect(caskContent).toContain(`"~/Library/Preferences/${appId}.plist"`)
		expect(caskContent).toContain(
			`"~/Library/Saved Application State/${appId}.savedState"`,
		)
	})

	it('includes Gatekeeper quarantine resolution caveats for unsigned builds', () => {
		expect(caskContent).toContain('caveats <<~EOS')
		expect(caskContent).toContain('xattr -cr /Applications/Qui.app')
		expect(caskContent).toContain('Privacy & Security')
	})

	it('does not include deprecated or disabled macos dependency directives', () => {
		expect(caskContent).not.toContain('depends_on macos: :catalina')
		expect(caskContent).not.toContain('depends_on macos: ">= :catalina"')
	})

	it('uses modern postflight_steps instead of deprecated postflight stanza', () => {
		expect(caskContent).toContain('postflight_steps do')
		expect(caskContent).not.toMatch(/^\s*postflight\s+do/m)
	})
})
