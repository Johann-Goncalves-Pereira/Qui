/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useCallback, useEffect, useState } from "react"

export interface DockerContainerStatus {
  name: string
  state: "running" | "stopped" | "not_found" | string
  status: string
  image: string
  port: number
}

export interface QuiContainerConfig {
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
}

export interface QBitContainerConfig {
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
}

const DEFAULT_QUI_PORT = 7476
const DEFAULT_QBIT_PORT = 8080

export function useDockerServices() {
  const [statuses, setStatuses] = useState<{
    qui: DockerContainerStatus
    qbit: DockerContainerStatus
  }>(() => {
    return {
      qui: {
        name: "qui",
        state: "running",
        status: "Running in Docker",
        image: "qui-desktop:local",
        port: DEFAULT_QUI_PORT,
      },
      qbit: {
        name: "qbittorrent-nox",
        state: "running",
        status: "Running in Docker",
        image: "lscr.io/linuxserver/qbittorrent:latest",
        port: DEFAULT_QBIT_PORT,
      },
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (typeof window === "undefined" || !window.quiDesktop?.getDockerStatus) {
      return
    }
    try {
      setIsLoading(true)
      const res = await window.quiDesktop.getDockerStatus()
      if (res?.qui && res?.qbit) {
        setStatuses(res)
      }
    } catch (err) {
      console.error("[useDockerServices] getDockerStatus failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const timer = setInterval(() => {
      void refreshStatus()
    }, 10000)
    return () => clearInterval(timer)
  }, [refreshStatus])

  const getQuiConfig = useCallback(async (): Promise<QuiContainerConfig> => {
    if (typeof window !== "undefined" && window.quiDesktop?.getQuiConfig) {
      try {
        return await window.quiDesktop.getQuiConfig()
      } catch (err) {
        console.error("[useDockerServices] getQuiConfig failed:", err)
      }
    }
    const currentPort = typeof window !== "undefined" && window.location.port
      ? Number(window.location.port)
      : DEFAULT_QUI_PORT
    return {
      port: currentPort || DEFAULT_QUI_PORT,
      configPath: "/config",
      dataPath: "/data",
      puid: "1000",
      pgid: "1000",
      umask: "002",
      logLevel: "INFO",
      baseUrl: "",
      tz: "UTC",
      restartPolicy: "unless-stopped",
      image: "ghcr.io/autobrr/qui:latest",
    }
  }, [])

  const getQBitConfig = useCallback(async (): Promise<QBitContainerConfig> => {
    if (typeof window !== "undefined" && window.quiDesktop?.getQBitConfig) {
      try {
        return await window.quiDesktop.getQBitConfig()
      } catch (err) {
        console.error("[useDockerServices] getQBitConfig failed:", err)
      }
    }
    return {
      port: DEFAULT_QBIT_PORT,
      peerPort: 6881,
      configPath: "/config",
      downloadsPath: "/downloads",
      puid: "1000",
      pgid: "1000",
      umask: "022",
      tz: "UTC",
      restartPolicy: "unless-stopped",
      image: "lscr.io/linuxserver/qbittorrent:latest",
    }
  }, [])

  const saveQuiConfig = useCallback(
    async (config: QuiContainerConfig): Promise<{ success: boolean; error?: string }> => {
      if (typeof window !== "undefined" && window.quiDesktop?.saveQuiConfig) {
        const res = await window.quiDesktop.saveQuiConfig(config)
        void refreshStatus()
        return res
      }
      // Running inside standard docker container: update local status
      setStatuses(prev => ({
        ...prev,
        qui: {
          ...prev.qui,
          port: config.port,
          image: config.image,
        },
      }))
      return { success: true }
    },
    [refreshStatus]
  )

  const saveQBitConfig = useCallback(
    async (config: QBitContainerConfig): Promise<{ success: boolean; error?: string }> => {
      if (typeof window !== "undefined" && window.quiDesktop?.saveQBitConfig) {
        const res = await window.quiDesktop.saveQBitConfig(config)
        void refreshStatus()
        return res
      }
      setStatuses(prev => ({
        ...prev,
        qbit: {
          ...prev.qbit,
          port: config.port,
          image: config.image,
        },
      }))
      return { success: true }
    },
    [refreshStatus]
  )

  const restartContainer = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      if (typeof window !== "undefined" && window.quiDesktop?.restartContainer) {
        const res = await window.quiDesktop.restartContainer(name)
        void refreshStatus()
        return res
      }
      return { success: true }
    },
    [refreshStatus]
  )

  return {
    statuses,
    isLoading,
    refreshStatus,
    getQuiConfig,
    getQBitConfig,
    saveQuiConfig,
    saveQBitConfig,
    restartContainer,
  }
}
