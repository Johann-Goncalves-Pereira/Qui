/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const FALLBACK_VERSION = "0.0.0"

export function getAppVersion(): string {
  if (typeof window === "undefined") {
    return FALLBACK_VERSION
  }

  if (typeof window.quiDesktop?.getAppVersion === "function") {
    try {
      const desktopVersion = window.quiDesktop.getAppVersion()
      const cleanDesktop = desktopVersion?.trim().replace(/^v/i, "")
      if (cleanDesktop && cleanDesktop !== "" && cleanDesktop !== FALLBACK_VERSION) {
        return cleanDesktop
      }
    } catch {
      // IPC or bridge failure; continue to window.__QUI_VERSION__
    }
  }

  const version = window.__QUI_VERSION__
  if (!version || version.trim() === "" || version === "desktop-local") {
    return FALLBACK_VERSION
  }

  return version.trim().replace(/^v/i, "")
}

