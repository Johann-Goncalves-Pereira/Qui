/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/** Local image built from this repo for developers. */
export const QUI_IMAGE_LOCAL = 'qui-desktop:local'

/** Base registry image name for this fork on GHCR (lowercase). */
export const QUI_IMAGE_BASE = 'ghcr.io/johann-goncalves-pereira/qui'

/** Canonical fork image tag for a specific version, defaulting to latest. */
export function quiImageRelease(version?: string): string {
	const ver = version?.trim().replace(/^v/i, '')
	if (ver) {
		return `${QUI_IMAGE_BASE}:${ver}`
	}
	return `${QUI_IMAGE_BASE}:latest`
}

/**
 * Canonical fork image for downloadable / packaged builds.
 * GHCR requires lowercase owner/name (mixed-case pushes fail).
 * Must NOT be upstream `ghcr.io/autobrr/qui` — that omits fork-only web UI.
 */
export const QUI_IMAGE_RELEASE = quiImageRelease()

/** GitHub Releases asset stem for `docker load` when GHCR is unavailable ($0). */
export function quiDesktopImageArchiveName(arch: string): string {
	const normalized = arch === 'arm64' ? 'arm64' : 'amd64'
	return `qui-desktop-image-${normalized}.tar.gz`
}

/**
 * Download URL for the fork Qui GUI image archive.
 * Prefer the matching desktop semver tag (`v0.0.6`) — GitHub’s
 * `/releases/latest/download/…` can resolve to an older tag that lacks the asset.
 */
export function quiDesktopImageArchiveUrl(
	repo: string,
	arch: string,
	version?: string,
): string {
	const name = quiDesktopImageArchiveName(arch)
	const ver = version?.trim().replace(/^v/i, '')
	if (ver) {
		return `https://github.com/${repo}/releases/download/v${ver}/${name}`
	}
	return `https://github.com/${repo}/releases/latest/download/${name}`
}

export interface ResolveQuiImageOptions {
	/** Electron `app.isPackaged`. */
	isPackaged: boolean
	/** `QUI_DESKTOP_IMAGE` override. */
	envImage?: string
	/** Packaged desktop semver tag (e.g. 0.0.8). */
	version?: string
}

/**
 * Packaged apps pull this fork’s GHCR image (pinned to the desktop semver when
 * available). Unpackaged (dev) builds use the local tag unless `QUI_DESKTOP_IMAGE` is set.
 */
export function resolveQuiImage(options: ResolveQuiImageOptions): string {
	const override = options.envImage?.trim()
	if (override) {
		return override
	}
	return options.isPackaged ? quiImageRelease(options.version) : QUI_IMAGE_LOCAL
}
