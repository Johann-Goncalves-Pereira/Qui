/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { ipcRenderer } from 'electron'

function setupCheckoutChrome(): void {
	if (typeof document === 'undefined') {
		return
	}

	const isMac = process.platform === 'darwin'

	const mountControls = () => {
		if (!document.body) {
			return
		}

		// Frameless drag region across the top
		if (!document.getElementById('qui-checkout-drag-region')) {
			const dragRegion = document.createElement('div')
			dragRegion.id = 'qui-checkout-drag-region'
			dragRegion.style.cssText = `
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				right: 0 !important;
				height: 48px !important;
				-webkit-app-region: drag !important;
				pointer-events: none !important;
				z-index: 2147483640 !important;
			`
			document.body.appendChild(dragRegion)
		}

		// Single 'x' close button positioned depending on host system
		if (!document.getElementById('qui-checkout-close-btn')) {
			const button = document.createElement('button')
			button.id = 'qui-checkout-close-btn'
			button.setAttribute('type', 'button')
			button.setAttribute('aria-label', 'Close checkout')
			button.setAttribute('title', 'Close (Esc)')

			// Crisp SVG 'x' icon
			button.innerHTML = `
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			`

			const sideStyle = isMac ? 'left: 14px;' : 'right: 14px;'
			const defaultStyle = `
				position: fixed !important;
				top: 14px !important;
				${sideStyle}
				width: 30px !important;
				height: 30px !important;
				min-width: 30px !important;
				min-height: 30px !important;
				max-width: 30px !important;
				max-height: 30px !important;
				border-radius: 9999px !important;
				background: rgba(30, 32, 38, 0.85) !important;
				border: 1px solid rgba(255, 255, 255, 0.15) !important;
				color: rgba(255, 255, 255, 0.85) !important;
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				cursor: pointer !important;
				z-index: 2147483647 !important;
				-webkit-app-region: no-drag !important;
				pointer-events: auto !important;
				padding: 0 !important;
				margin: 0 !important;
				box-sizing: border-box !important;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45) !important;
				backdrop-filter: blur(12px) !important;
				-webkit-backdrop-filter: blur(12px) !important;
				outline: none !important;
				transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease !important;
			`

			button.style.cssText = defaultStyle

			button.addEventListener('mouseenter', () => {
				button.style.background = 'rgba(239, 68, 68, 0.95)'
				button.style.color = '#ffffff'
				button.style.borderColor = 'rgba(239, 68, 68, 1)'
				button.style.transform = 'scale(1.05)'
			})

			button.addEventListener('mouseleave', () => {
				button.style.cssText = defaultStyle
			})

			button.addEventListener('mousedown', () => {
				button.style.transform = 'scale(0.95)'
			})

			button.addEventListener('mouseup', () => {
				button.style.transform = 'scale(1.05)'
			})

			button.addEventListener('click', event => {
				event.preventDefault()
				event.stopPropagation()
				ipcRenderer.send('checkout:close')
			})

			document.body.appendChild(button)
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountControls)
	} else {
		mountControls()
	}

	// Watch DOM mutations to preserve the button on route / view changes
	const observer = new MutationObserver(() => {
		if (document.body && !document.getElementById('qui-checkout-close-btn')) {
			mountControls()
		}
	})

	if (document.body) {
		observer.observe(document.body, { childList: true, subtree: true })
	} else {
		document.addEventListener('DOMContentLoaded', () => {
			if (document.body) {
				observer.observe(document.body, {
					childList: true,
					subtree: true,
				})
			}
		})
	}

	window.addEventListener(
		'keydown',
		event => {
			if (event.key === 'Escape') {
				ipcRenderer.send('checkout:close')
			}
		},
		true,
	)
}

setupCheckoutChrome()
