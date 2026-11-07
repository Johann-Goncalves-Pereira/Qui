/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { APP_NAME, QBIT_IMAGE } from '../shared/constants.js'

export type UpdateComponentType = 'qui' | 'qbittorrent-nox' | 'other'

export interface ContainerUpdateTarget {
	image: string
	hasUpdate?: boolean
	remoteDigest?: string
}

export interface ContainerUpdatePromptDetails {
	title: string
	message: string
	detail: string
	componentTypes: UpdateComponentType[]
	reloadRequirements: string[]
}

/**
 * Identifies the high-level desktop component type for a given Docker image.
 */
export function identifyUpdateComponentType(
	image: string,
	quiImage: string,
): UpdateComponentType {
	if (image === quiImage) {
		return 'qui'
	}
	if (image === QBIT_IMAGE || image.toLowerCase().includes('qbittorrent')) {
		return 'qbittorrent-nox'
	}
	return 'other'
}

/**
 * Generates structured, desktop-specific update dialog messaging,
 * explicitly declaring component types (`qui`, `qbittorrent-nox`, `other`),
 * reload/restart impacts, and pre-update data backup safety guarantees.
 */
export function formatContainerUpdatePrompt(
	updates: readonly ContainerUpdateTarget[],
	quiImage: string,
): ContainerUpdatePromptDetails {
	const componentTypes: UpdateComponentType[] = []
	const componentDescriptions: string[] = []
	const reloadRequirements: string[] = []

	for (const update of updates) {
		const compType = identifyUpdateComponentType(update.image, quiImage)
		componentTypes.push(compType)

		if (compType === 'qui') {
			componentDescriptions.push(
				'• qui (Qui Web & API): Recreates container with the latest image.',
			)
			reloadRequirements.push(
				'• qui: Web interface will automatically refresh once restarted.',
			)
		} else if (compType === 'qbittorrent-nox') {
			componentDescriptions.push(
				'• qbittorrent-nox (qBittorrent Engine): Recreates container with the latest image.',
			)
			reloadRequirements.push(
				'• qbittorrent-nox: Container will restart; torrent connections will momentarily reconnect.',
			)
		} else {
			componentDescriptions.push(
				`• ${update.image} (Companion Service): Recreates container with the latest image.`,
			)
			reloadRequirements.push(
				`• ${update.image}: Companion container will restart.`,
			)
		}
	}

	const names = componentTypes.join(', ')
	const title = `${APP_NAME} - Container Updates Available`
	const message = `Updates are available for: ${names}`

	const detail = [
		'The following container components have updates available:',
		componentDescriptions.join('\n'),
		'',
		'Reload / Restart Requirements:',
		reloadRequirements.join('\n'),
		'',
		'Data Safety & Backups:',
		'• A pre-update backup of your container configurations and databases is created automatically before updating.',
		'• All application settings, torrent data, and configurations are safely preserved and only removed if you uninstall the application.',
		'',
		'Would you like to pull updates and restart the containers now?',
	].join('\n')

	return {
		title,
		message,
		detail,
		componentTypes,
		reloadRequirements,
	}
}
