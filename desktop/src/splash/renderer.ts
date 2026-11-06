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
const loginForm = document.getElementById(
	'login-form',
) as HTMLFormElement | null
const usernameInput = document.getElementById(
	'username-input',
) as HTMLInputElement | null
const passwordInput = document.getElementById(
	'password-input',
) as HTMLInputElement | null
const signInBtn = document.getElementById(
	'sign-in-btn',
) as HTMLButtonElement | null
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

	// Password login submission
	loginForm?.addEventListener('submit', async event => {
		event.preventDefault()
		if (!bridge) return

		const username = usernameInput?.value.trim() ?? ''
		const password = passwordInput?.value ?? ''

		if (!username || !password) {
			if (authFeedbackEl) {
				authFeedbackEl.textContent = 'Please enter username and password'
				authFeedbackEl.style.color = '#f85149'
			}
			return
		}

		if (authFeedbackEl) {
			authFeedbackEl.textContent = 'Signing in...'
			authFeedbackEl.style.color = '#58a6ff'
		}
		if (signInBtn) signInBtn.disabled = true

		try {
			const res = await bridge.loginWithPassword(username, password)
			if (res.success) {
				if (authFeedbackEl) {
					authFeedbackEl.textContent = 'Signed in successfully!'
					authFeedbackEl.style.color = '#3fb950'
				}
			} else {
				if (authFeedbackEl) {
					authFeedbackEl.textContent = res.error ?? 'Login failed'
					authFeedbackEl.style.color = '#f85149'
				}
				if (signInBtn) signInBtn.disabled = false
			}
		} catch {
			if (authFeedbackEl) {
				authFeedbackEl.textContent = 'Network or connection error'
				authFeedbackEl.style.color = '#f85149'
			}
			if (signInBtn) signInBtn.disabled = false
		}
	})

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
