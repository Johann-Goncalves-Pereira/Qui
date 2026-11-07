/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	ANIMATED_LOGO_SVG,
	LOADING_SPINNER_SVG,
	startupPageDocument,
} from '../src/main/startup-page.js'

describe('Startup page (BR-desktop-09, BR-desktop-28)', () => {
	it('paints an opaque Minimal background, the Qui animated logo, and a process code block', () => {
		const html = startupPageDocument(
			'Starting Qui…',
			'Ensuring Docker containers (qui, qbit) are running…',
			true,
		)

		expect(html).toContain('background:#252525')
		expect(html).not.toContain('background:transparent')
		expect(html).toContain('animated-logo-element')
		expect(html).toContain('logo-bounce')
		expect(html).toContain('var(--primary)')
		expect(html).toContain(
			'<pre class="process-code"><code>Ensuring Docker containers (qui, qbit) are running…</code></pre>',
		)
		expect(ANIMATED_LOGO_SVG).toBe(LOADING_SPINNER_SVG)
	})

	it('uses the light Minimal fill when the OS appearance is light', () => {
		const html = startupPageDocument('Starting Qui…', 'Waiting…', false)
		expect(html).toContain('background:#ffffff')
		expect(html).not.toContain('background:#252525')
	})

	it('escapes the process log so a docker error cannot break the page', () => {
		const html = startupPageDocument(
			'Failed to start Qui',
			'docker binary not found <script>',
			true,
		)
		expect(html).toContain(
			'<pre class="process-code"><code>docker binary not found &lt;script&gt;</code></pre>',
		)
		expect(html).not.toContain('<script>')
	})

	it('renders tokens and raw CSS from cached theme payload when provided', () => {
		const html = startupPageDocument('Starting Qui…', 'Connecting…', true, {
			id: 'tokyo-night',
			name: 'Tokyo Night',
			isDark: true,
			cssVars: {
				dark: {
					'--background': '#1a1b26',
					'--card': '#24283b',
					'--primary': '#7aa2f7',
				},
				light: {
					'--background': '#e1e2e7',
				},
			},
			rawCss: '.custom-class { color: red; }',
		})

		expect(html).toContain('background:#1a1b26')
		expect(html).toContain('--primary:#7aa2f7')
		expect(html).toContain('.custom-class { color: red; }')
		expect(html).toContain('class="dark"')
	})
})
