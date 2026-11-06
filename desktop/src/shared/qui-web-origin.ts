/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/** Default Vite origin used when `QUI_DESKTOP_DEV=1`. */
export const DEFAULT_VITE_ORIGIN = 'http://localhost:5173'

export interface ResolveQuiWebOriginOptions {
	/** Explicit `QUI_WEB_ORIGIN` (wins over everything). */
	envOrigin?: string
	/** When true (`QUI_DESKTOP_DEV=1`), use Vite. */
	desktopDev?: boolean
	/** Production / Docker Qui port. */
	quiPort?: number
}

function stripTrailingSlash(url: string): string {
	return url.replace(/\/+$/, '')
}

/**
 * Production loads loopback Qui. Desktop dev mode loads Vite for HMR.
 */
export function resolveQuiWebOrigin(
	options: ResolveQuiWebOriginOptions = {},
): string {
	const override = options.envOrigin?.trim()
	if (override) {
		return stripTrailingSlash(override)
	}
	if (options.desktopDev) {
		return DEFAULT_VITE_ORIGIN
	}
	const port = options.quiPort ?? 7476
	return `http://localhost:${port}`
}

export function quiWebLoginUrl(origin: string): string {
	return `${stripTrailingSlash(origin)}/login`
}
