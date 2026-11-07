/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	QUI_IMAGE_LOCAL,
	QUI_IMAGE_RELEASE,
	quiDesktopImageArchiveName,
	quiDesktopImageArchiveUrl,
	resolveQuiImage,
} from '../src/shared/qui-image.js'

describe('resolveQuiImage (BR-desktop-17)', () => {
	it('defaults to qui-desktop:local when unpackaged', () => {
		expect(resolveQuiImage({ isPackaged: false })).toBe(QUI_IMAGE_LOCAL)
	})

	it('defaults to this fork GHCR image (lowercase) when packaged', () => {
		expect(resolveQuiImage({ isPackaged: true })).toBe(QUI_IMAGE_RELEASE)
		expect(QUI_IMAGE_RELEASE).toBe(
			'ghcr.io/johann-goncalves-pereira/qui:latest',
		)
		expect(QUI_IMAGE_RELEASE).toBe(QUI_IMAGE_RELEASE.toLowerCase())
		expect(QUI_IMAGE_RELEASE).not.toContain('autobrr/qui')
	})

	it('pins fork GHCR image to desktop version when provided', () => {
		expect(
			resolveQuiImage({
				isPackaged: true,
				version: '0.0.8',
			}),
		).toBe('ghcr.io/johann-goncalves-pereira/qui:0.0.8')
		expect(
			resolveQuiImage({
				isPackaged: true,
				version: 'v0.0.8',
			}),
		).toBe('ghcr.io/johann-goncalves-pereira/qui:0.0.8')
	})

	it('lets QUI_DESKTOP_IMAGE override packaged and local defaults', () => {
		expect(
			resolveQuiImage({
				isPackaged: true,
				envImage: 'ghcr.io/example/qui:dev',
			}),
		).toBe('ghcr.io/example/qui:dev')
		expect(
			resolveQuiImage({
				isPackaged: false,
				envImage: '  custom:tag  ',
			}),
		).toBe('custom:tag')
	})

	it('resolves to version-pinned image tag when version is provided (BR-desktop-32)', () => {
		expect(resolveQuiImage({ isPackaged: true, version: '0.0.9' })).toBe(
			'ghcr.io/johann-goncalves-pereira/qui:0.0.9',
		)
		expect(resolveQuiImage({ isPackaged: true, version: 'v0.0.9' })).toBe(
			'ghcr.io/johann-goncalves-pereira/qui:0.0.9',
		)
	})

	it('names the embedded archive relative path inside Contents/Resources (BR-desktop-32)', () => {
		expect(quiDesktopImageArchiveName('arm64')).toBe(
			'qui-desktop-image-arm64.tar.gz',
		)
		expect(quiDesktopImageArchiveName('x64')).toBe(
			'qui-desktop-image-amd64.tar.gz',
		)
		expect(
			quiDesktopImageArchiveUrl('Johann-Goncalves-Pereira/Qui', 'arm64'),
		).toBe(
			'https://github.com/Johann-Goncalves-Pereira/Qui/releases/latest/download/qui-desktop-image-arm64.tar.gz',
		)
		expect(
			quiDesktopImageArchiveUrl(
				'Johann-Goncalves-Pereira/Qui',
				'arm64',
				'0.0.6',
			),
		).toBe(
			'https://github.com/Johann-Goncalves-Pereira/Qui/releases/download/v0.0.6/qui-desktop-image-arm64.tar.gz',
		)
	})
})
