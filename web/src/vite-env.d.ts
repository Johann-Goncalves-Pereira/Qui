/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    __QUI_VERSION__?: string
    /** Injected by the Qui Electron shell preload (optional). */
    quiDesktop?: {
      getAppVersion?: () => string
      requestTouchId?: (reason?: string) => Promise<{ success: boolean; error?: string }>
      setWindowMaterial?: (glass: boolean) => Promise<void>
      setSidebarChrome?: (visible: boolean) => Promise<void>
      saveAccount?: (username: string, password: string) => Promise<void>
      hasSavedAccount?: () => Promise<boolean>
      unlockAccount?: () => Promise<{ username: string; password: string } | null>
      syncTheme?: (theme: {
        id: string
        name?: string
        isDark?: boolean
        cssVars?: {
          light?: Record<string, string>
          dark?: Record<string, string>
        }
        rawCss?: string
      }) => Promise<void>
      getDockerStatus?: () => Promise<{
        qui: { name: string; state: string; status: string; image: string; port: number }
        qbit: { name: string; state: string; status: string; image: string; port: number }
      }>
      getQuiConfig?: () => Promise<{
        port: number
        configPath: string
        dataPath?: string
        puid?: string
        pgid?: string
        umask?: string
        logLevel?: string
        baseUrl?: string
        tz?: string
        restartPolicy: string
        image: string
      }>
      getQBitConfig?: () => Promise<{
        port: number
        peerPort: number
        configPath: string
        downloadsPath: string
        puid?: string
        pgid?: string
        umask?: string
        tz?: string
        restartPolicy: string
        image: string
      }>
      saveQuiConfig?: (config: {
        port: number
        configPath: string
        dataPath?: string
        puid?: string
        pgid?: string
        umask?: string
        logLevel?: string
        baseUrl?: string
        tz?: string
        restartPolicy: string
        image: string
      }) => Promise<{ success: boolean; error?: string }>
      saveQBitConfig?: (config: {
        port: number
        peerPort: number
        configPath: string
        downloadsPath: string
        puid?: string
        pgid?: string
        umask?: string
        tz?: string
        restartPolicy: string
        image: string
      }) => Promise<{ success: boolean; error?: string }>
      restartContainer?: (name: string) => Promise<{ success: boolean; error?: string }>
      checkForUpdates?: () => Promise<{
        hasUpdate: boolean
        currentVersion: string
        latestVersion: string
        tagName: string
        name: string
        body: string
        htmlUrl: string
        downloadUrl?: string
        publishedAt: string
      }>
      promptUpdates?: () => Promise<boolean>
      gazelle?: {
        getStatus?: () => Promise<{
          name: string
          state: "running" | "stopped" | "not_found" | "unknown"
          status: string
          image: string
          port: number
        }>
        start?: () => Promise<{
          name: string
          state: "running" | "stopped" | "not_found" | "unknown"
          status: string
          image: string
          port: number
        }>
        stop?: () => Promise<{
          name: string
          state: "running" | "stopped" | "not_found" | "unknown"
          status: string
          image: string
          port: number
        }>
        restart?: () => Promise<{
          name: string
          state: "running" | "stopped" | "not_found" | "unknown"
          status: string
          image: string
          port: number
        }>
        openWebUi?: () => Promise<void>
      }
    }
  }

  interface ImportMetaEnv {
    readonly VITE_DEMO?: string
  }
}

export {}
