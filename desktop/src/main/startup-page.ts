/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { ThemeSyncPayload } from './theme-cache.js'
import {
	MINIMAL_DARK_BACKGROUND,
	MINIMAL_LIGHT_BACKGROUND,
} from './window-material.js'

export const ANIMATED_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" width="56" height="56"><style>@keyframes logo-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}.animated-logo-element{animation:logo-bounce 1s ease-in-out infinite alternate}@media (prefers-reduced-motion:reduce){.animated-logo-element{animation:none}}</style><path class="animated-logo-element" fill="color-mix(in srgb, var(--primary) 20%, transparent)" stroke="var(--primary)" stroke-linejoin="round" stroke-width="30" d="M231.392 297.578c62.988-50.202 302.511-28.81 414.4-11.84 6.925-24.705 14.328-38.685 36.111-63.936-46.273-13.75-99.605-16.02-243.904-10.064-68.671-10.656-68.671-139.712 0-151.552 317.312 0 538.72 148 558.256 237.392 19.536 89.392 9.59 62.873 0 100.048-23.006 57.307-85.84 104.192-104.784 110.704-18.944 6.512-101.824 0-101.824 0-32.092 143.875-71.574 205.418-177.008 279.424-59.447 23.136-97.68 20.128-107.744-53.872l21.904-37.888 31.968-14.8c15.87-28.604 14.722-43.365 0-68.08-22.999-5.874-34.752-5.74-53.872 0-34.784 68.765-62.87 93.492-129.647 110.704v24.272l92.943 50.912 75.776 75.776c2.368 76.723-60.976 91.168-92.944 88.8C361.22 876.89 301.6 838.44 168.64 799.002c-26.486-5.732-30.057-15.395-23.088-40.256 58.775-115.1 40.65-183.322 23.088-213.712-29.558 30.414-99.602 83.694-140.896 0-46.2-93.636 61.568-113.862 117.808-110.704 2.368-24.666 22.85-86.55 85.84-136.752z"/><path class="animated-logo-element" stroke="color-mix(in srgb, var(--primary) 80%, transparent)" stroke-linecap="round" stroke-width="84" d="M59.736 258.506h81.696M134.328 137.738h131.424"/><circle class="animated-logo-element" cx="875.512" cy="305.866" r="45.584" fill="var(--primary)"/></svg>`

/** Backwards-compatible alias for existing callers. */
export const LOADING_SPINNER_SVG = ANIMATED_LOGO_SVG

export const DEFAULT_DARK_VARS: Record<string, string> = {
	'--background': MINIMAL_DARK_BACKGROUND,
	'--foreground': '#f0f6fc',
	'--card': 'rgba(22, 27, 34, 0.92)',
	'--card-foreground': '#f0f6fc',
	'--primary': '#a5d6ff',
	'--border': 'rgba(255, 255, 255, 0.14)',
	'--muted': 'rgba(13, 17, 23, 0.85)',
	'--muted-foreground': '#c9d1d9',
	'--radius': '10px',
}

export const DEFAULT_LIGHT_VARS: Record<string, string> = {
	'--background': MINIMAL_LIGHT_BACKGROUND,
	'--foreground': '#1f2328',
	'--card': 'rgba(255, 255, 255, 0.96)',
	'--card-foreground': '#1f2328',
	'--primary': '#0969da',
	'--border': 'rgba(31, 35, 40, 0.15)',
	'--muted': 'rgba(246, 248, 250, 0.9)',
	'--muted-foreground': '#656d76',
	'--radius': '10px',
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

function cssVarsToStyleBlock(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([key, val]) => `${key}:${val};`)
		.join('')
}

export function startupPageDocument(
	message: string,
	processInfo: string,
	prefersDark: boolean,
	cachedTheme?: ThemeSyncPayload | null,
): string {
	const defaultVars = prefersDark ? DEFAULT_DARK_VARS : DEFAULT_LIGHT_VARS
	const themeVars = prefersDark
		? cachedTheme?.cssVars?.dark
		: cachedTheme?.cssVars?.light
	const effectiveVars: Record<string, string> = {
		...defaultVars,
		...(themeVars ?? {}),
	}

	const background =
		effectiveVars['--background'] ||
		(prefersDark ? MINIMAL_DARK_BACKGROUND : MINIMAL_LIGHT_BACKGROUND)
	const safeMessage = escapeHtml(message)
	const safeProcess = escapeHtml(processInfo)
	const rootVars = cssVarsToStyleBlock(effectiveVars)
	const rawCss = cachedTheme?.rawCss
		? `<style>${cachedTheme.rawCss}</style>`
		: ''
	const htmlClass = prefersDark ? ' class="dark"' : ''

	return `<!DOCTYPE html><html${htmlClass}><head><meta charset="utf-8"><style>
:root{${rootVars}}
html,body{margin:0;height:100%;background:${background};color:var(--foreground);font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased}
.card{background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:calc(var(--radius, 10px) * 1.5);padding:32px 36px;text-align:center;max-width:440px;box-shadow:0 20px 40px rgba(0,0,0,.45)}
.spinner{display:flex;align-items:center;justify-content:center;margin-bottom:16px}
h1{font-size:24px;margin:0 0 10px;font-weight:650;letter-spacing:-0.02em;color:var(--card-foreground)}
p{margin:0;color:var(--muted-foreground);font-size:14px;line-height:1.5}
.process-code{margin:16px 0 0;padding:10px 14px;background:var(--muted);border:1px solid var(--border);border-radius:var(--radius, 10px);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:var(--card-foreground);text-align:left;overflow-x:auto;max-height:120px;white-space:pre-wrap;word-break:break-all}
</style>${rawCss}</head><body><div class="card"><div class="spinner">${ANIMATED_LOGO_SVG}</div><h1>Qui</h1><p>${safeMessage}</p><pre class="process-code"><code>${safeProcess}</code></pre></div></body></html>`
}

export function startupPageUrl(
	message: string,
	processInfo: string,
	prefersDark: boolean,
	cachedTheme?: ThemeSyncPayload | null,
): string {
	return `data:text/html;charset=utf-8,${encodeURIComponent(
		startupPageDocument(message, processInfo, prefersDark, cachedTheme),
	)}`
}
