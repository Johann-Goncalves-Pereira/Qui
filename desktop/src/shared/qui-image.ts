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
export const QUI_IMAGE_RELEASE =
	'ghcr.io/johann-goncalves-pereira/qui:latest'

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
