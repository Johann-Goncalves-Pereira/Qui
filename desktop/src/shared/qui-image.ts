/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/** Local image built from this repo for developers. */
export const QUI_IMAGE_LOCAL = 'qui-desktop:local'

/**
 * Canonical fork image for downloadable / packaged builds.
 * GHCR requires lowercase owner/name (mixed-case pushes fail).
 * Must NOT be upstream `ghcr.io/autobrr/qui` — that omits fork-only web UI.
 */
export const QUI_IMAGE_RELEASE = 'ghcr.io/johann-goncalves-pereira/qui:latest'

/** GitHub Releases asset stem for `docker load` when GHCR is unavailable ($0). */
export function quiDesktopImageArchiveName(arch: string): string {
	const normalized = arch === 'arm64' ? 'arm64' : 'amd64'
	return `qui-desktop-image-${normalized}.tar.gz`
}

/** Latest-release download URL for the fork Qui GUI image archive. */
export function quiDesktopImageArchiveUrl(repo: string, arch: string): string {
	return `https://github.com/${repo}/releases/latest/download/${quiDesktopImageArchiveName(arch)}`
}

export interface ResolveQuiImageOptions {
	/** Electron `app.isPackaged`. */
	isPackaged: boolean
	/** `QUI_DESKTOP_IMAGE` override. */
	envImage?: string
}

/**
 * Packaged apps pull this fork’s GHCR image. Unpackaged (dev) builds use the
 * local tag unless `QUI_DESKTOP_IMAGE` is set.
 */
export function resolveQuiImage(options: ResolveQuiImageOptions): string {
	const override = options.envImage?.trim()
	if (override) {
		return override
	}
	return options.isPackaged ? QUI_IMAGE_RELEASE : QUI_IMAGE_LOCAL
}
