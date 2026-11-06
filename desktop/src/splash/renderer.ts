/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { QuiDesktopBridge } from '../preload/index.js'

declare global {
	interface Window {
		quiDesktop?: QuiDesktopBridge
	}
}

const quiStatusEl = document.getElementById('qui-status')
const qbitStatusEl = document.getElementById('qbit-status')
const touchIdBtn = document.getElementById(
	'touch-id-btn',
) as HTMLButtonElement | null
const authFeedbackEl = document.getElementById('auth-feedback')
const updateModalEl = document.getElementById('update-modal')
const updateNowBtn = document.getElementById(
	'update-now-btn',
) as HTMLButtonElement | null
const updateLaterBtn = document.getElementById(
	'update-later-btn',
) as HTMLButtonElement | null

async function initSplash(): Promise<void> {
	if (!window.quiDesktop) {
		if (authFeedbackEl)
			authFeedbackEl.textContent = 'Desktop bridge unavailable'
		return
	}

	const bridge = window.quiDesktop

	// Listen for live Docker container updates
	bridge.onDockerStatusChanged(status => {
		if (quiStatusEl) {
			quiStatusEl.textContent = status.qui.state
			quiStatusEl.className = `status-badge ${status.qui.state === 'running' ? 'running' : 'checking'}`
		}
		if (qbitStatusEl) {
			qbitStatusEl.textContent = status.qbit.state
			qbitStatusEl.className = `status-badge ${status.qbit.state === 'running' ? 'running' : 'checking'}`
		}
	})

	// Check if Touch ID is supported
	const supported = await bridge.isBiometricsSupported()
	if (!supported && touchIdBtn) {
		touchIdBtn.textContent = 'Continue without Biometrics'
	}

	// Trigger biometric unlock on button click
	touchIdBtn?.addEventListener('click', async () => {
		if (!bridge) return
		if (authFeedbackEl) authFeedbackEl.textContent = 'Authenticating...'
		const res = await bridge.authenticateBiometrics()
		if (res.success) {
			if (authFeedbackEl) {
				authFeedbackEl.textContent = 'Unlocked successfully!'
				authFeedbackEl.style.color = '#3fb950'
			}
		} else {
			if (authFeedbackEl) {
				authFeedbackEl.textContent = res.error ?? 'Authentication failed'
				authFeedbackEl.style.color = '#f85149'
			}
		}
	})

	// Check for Docker updates
	try {
		const updates = await bridge.checkForUpdates()
		const hasUpdate = updates.some(u => u.hasUpdate)
		if (hasUpdate && updateModalEl) {
			updateModalEl.classList.remove('hidden')
		}
	} catch {
		// Ignore update check errors on splash
	}

	updateLaterBtn?.addEventListener('click', () => {
		updateModalEl?.classList.add('hidden')
	})

	updateNowBtn?.addEventListener('click', async () => {
		if (updateModalEl) updateModalEl.classList.add('hidden')
		if (authFeedbackEl) {
			authFeedbackEl.textContent = 'Applying Docker updates...'
			authFeedbackEl.style.color = '#d29922'
		}
	})
}

document.addEventListener('DOMContentLoaded', () => {
	void initSplash()
})
