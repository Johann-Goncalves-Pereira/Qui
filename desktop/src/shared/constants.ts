/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { readAppVersion } from './app-version.js'
import {
	getVersionedQuiImage,
	QUI_FORK_IMAGE_REPO,
	QUI_IMAGE_LOCAL,
	QUI_IMAGE_RELEASE,
	quiDesktopImageArchiveName,
	quiDesktopImageArchiveUrl,
	quiEmbeddedImageArchiveRelativePath,
	resolveQuiImage,
} from './qui-image.js'
import {
	DEFAULT_VITE_ORIGIN,
	quiWebLoginUrl,
	resolveQuiWebOrigin,
} from './qui-web-origin.js'

export const APP_NAME = 'Qui'
export const BUNDLE_ID = 'com.autobrr.qui.desktop'
export const DEFAULT_QUI_PORT = 7476

export {
	DEFAULT_VITE_ORIGIN,
	getVersionedQuiImage,
	QUI_FORK_IMAGE_REPO,
	QUI_IMAGE_LOCAL,
	QUI_IMAGE_RELEASE,
	quiDesktopImageArchiveName,
	quiDesktopImageArchiveUrl,
	quiEmbeddedImageArchiveRelativePath,
	quiWebLoginUrl,
	resolveQuiImage,
	resolveQuiWebOrigin,
}

/**
 * Default origin for tests and modules that do not resolve env at runtime.
 * Prefer `resolveQuiWebOrigin` in the Electron main process.
 */
export const QUI_WEB_ORIGIN = resolveQuiWebOrigin()

/**
 * SPA entry for sign-in; first-run registration uses `/setup` (Login redirects when
 * `checkSetupRequired` is true).
 */
export const QUI_WEB_LOGIN_URL = quiWebLoginUrl(QUI_WEB_ORIGIN)

export const DEFAULT_QBIT_PORT = 8080
export const DEFAULT_GAZELLE_PORT = 7001

/**
 * Default Qui image for unpackaged / test imports. Packaged builds resolve via
 * `resolveQuiImage({ isPackaged: true })` in main.
 */
export const QUI_IMAGE = QUI_IMAGE_LOCAL

export const QBIT_IMAGE = 'lscr.io/linuxserver/qbittorrent:latest'
export const GAZELLE_IMAGE = 'gazelle-desktop:local'
export const QUI_CONTAINER_NAME = 'qui'
export const QBIT_CONTAINER_NAME = 'qbittorrent-nox'
export const GAZELLE_CONTAINER_NAME = 'gazelle'
export const GAZELLE_REPO_URL = 'https://github.com/OPSnet/Gazelle.git'
export const GAZELLE_WEB_ORIGIN = `http://localhost:${DEFAULT_GAZELLE_PORT}`
export const GITHUB_REPO = 'Johann-Goncalves-Pereira/Qui'
export const CURRENT_APP_VERSION = readAppVersion()
