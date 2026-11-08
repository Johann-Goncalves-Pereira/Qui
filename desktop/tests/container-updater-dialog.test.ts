/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	formatContainerUpdatePrompt,
	identifyUpdateComponentType,
} from '../src/main/container-updater-dialog.js'
import { QBIT_IMAGE, QUI_IMAGE } from '../src/shared/constants.js'
import type { DockerUpdateInfo } from '../src/shared/types.js'

describe('formatContainerUpdatePrompt (BR-desktop-30)', () => {
	it('identifies update component types correctly', () => {
		expect(identifyUpdateComponentType(QUI_IMAGE, QUI_IMAGE)).toBe('qui')
		expect(
			identifyUpdateComponentType(
				'ghcr.io/johann-goncalves-pereira/qui:latest',
				'ghcr.io/johann-goncalves-pereira/qui:latest',
			),
		).toBe('qui')
		expect(identifyUpdateComponentType(QBIT_IMAGE, QUI_IMAGE)).toBe(
			'qbittorrent-nox',
		)
		expect(identifyUpdateComponentType('custom/service:v1', QUI_IMAGE)).toBe(
			'other',
		)
	})

	it('formats dialog details for qui container update with web reload requirements', () => {
		const updates: DockerUpdateInfo[] = [
			{
				hasUpdate: true,
				image: QUI_IMAGE,
				localDigest: 'sha256:oldqui',
				remoteDigest: 'sha256:newqui',
			},
		]

		const prompt = formatContainerUpdatePrompt(updates, QUI_IMAGE)

		expect(prompt.componentTypes).toEqual(['qui'])
		expect(prompt.message).toContain('qui')
		expect(prompt.detail).toContain('qui (Qui Web & API)')
		expect(prompt.detail).toContain('Web interface will automatically refresh')
		expect(prompt.detail).toContain('Data Safety')
		expect(prompt.detail).toContain('pre-update backup')
		expect(prompt.detail).toContain('only removed if you uninstall')
	})

	it('formats dialog details for qbittorrent container update with connection reload requirement', () => {
		const updates: DockerUpdateInfo[] = [
			{
				hasUpdate: true,
				image: QBIT_IMAGE,
				localDigest: 'sha256:oldqbit',
				remoteDigest: 'sha256:newqbit',
			},
		]

		const prompt = formatContainerUpdatePrompt(updates, QUI_IMAGE)

		expect(prompt.componentTypes).toEqual(['qbittorrent-nox'])
		expect(prompt.message).toContain('qbittorrent-nox')
		expect(prompt.detail).toContain('qbittorrent-nox')
		expect(prompt.detail).toContain(
			'torrent connections will momentarily reconnect',
		)
		expect(prompt.detail).toContain('Data Safety')
	})

	it('formats multi-component updates declaring reload requirements for each component', () => {
		const updates: DockerUpdateInfo[] = [
			{
				hasUpdate: true,
				image: QUI_IMAGE,
				localDigest: 'sha256:oldqui',
				remoteDigest: 'sha256:newqui',
			},
			{
				hasUpdate: true,
				image: QBIT_IMAGE,
				localDigest: 'sha256:oldqbit',
				remoteDigest: 'sha256:newqbit',
			},
		]

		const prompt = formatContainerUpdatePrompt(updates, QUI_IMAGE)

		expect(prompt.componentTypes).toEqual(['qui', 'qbittorrent-nox'])
		expect(prompt.message).toContain('qui, qbittorrent-nox')
		expect(prompt.detail).toContain('qui (Qui Web & API)')
		expect(prompt.detail).toContain('qbittorrent-nox')
		expect(prompt.reloadRequirements.length).toBe(2)
		expect(prompt.components).toHaveLength(2)
		expect(prompt.components[0].type).toBe('qui')
		expect(prompt.components[1].type).toBe('qbittorrent-nox')
	})
})
