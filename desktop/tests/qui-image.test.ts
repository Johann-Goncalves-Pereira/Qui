/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	QUI_IMAGE_LOCAL,
	QUI_IMAGE_RELEASE,
	resolveQuiImage,
} from '../src/shared/qui-image.js'

describe('resolveQuiImage (BR-desktop-17)', () => {
	it('defaults to qui-desktop:local when unpackaged', () => {
		expect(resolveQuiImage({ isPackaged: false })).toBe(QUI_IMAGE_LOCAL)
	})

	it('defaults to fork GHCR image when packaged', () => {
		expect(resolveQuiImage({ isPackaged: true })).toBe(QUI_IMAGE_RELEASE)
		expect(QUI_IMAGE_RELEASE).toBe(
			'ghcr.io/johann-goncalves-pereira/qui:latest',
		)
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
})
