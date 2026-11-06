/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, Play, RotateCw, Server, Square } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface DockerContainerStatus {
  name: string
  state: "running" | "stopped" | "not_found" | "unknown"
  status: string
  image: string
  port: number
}

export function GazelleDockerControl() {
  const isDesktop = typeof window !== "undefined" && Boolean(window.quiDesktop?.gazelle)
  if (!isDesktop) {
    return null
  }

  return <GazelleDockerControlInner />
}

function GazelleDockerControlInner() {
  const [status, setStatus] = useState<DockerContainerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!window.quiDesktop?.gazelle?.getStatus) return
    try {
      const res = await window.quiDesktop.gazelle.getStatus()
      setStatus(res)
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to query Gazelle container status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleStart = async () => {
    if (!window.quiDesktop?.gazelle?.start) return
    setActionPending(true)
    setErrorMessage(null)
    try {
      const res = await window.quiDesktop.gazelle.start()
      setStatus(res)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start Gazelle container")
    } finally {
      setActionPending(false)
    }
  }

  const handleStop = async () => {
    if (!window.quiDesktop?.gazelle?.stop) return
    setActionPending(true)
    setErrorMessage(null)
    try {
      const res = await window.quiDesktop.gazelle.stop()
      setStatus(res)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to stop Gazelle container")
    } finally {
      setActionPending(false)
    }
  }

  const handleRestart = async () => {
    if (!window.quiDesktop?.gazelle?.restart) return
    setActionPending(true)
    setErrorMessage(null)
    try {
      const res = await window.quiDesktop.gazelle.restart()
      setStatus(res)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to restart Gazelle container")
    } finally {
      setActionPending(false)
    }
  }

  const handleOpenWeb = async () => {
    if (!window.quiDesktop?.gazelle?.openWebUi) return
    try {
      await window.quiDesktop.gazelle.openWebUi()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to open Gazelle WebUI")
    }
  }

  const isRunning = status?.state === "running"
  const isStopped = status?.state === "stopped"
  const isNotFound = status?.state === "not_found" || !status

  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Gazelle Docker Companion</span>
          {loading ? (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Checking...
            </Badge>
          ) : isRunning ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              Running (:7001)
            </Badge>
          ) : isStopped ? (
            <Badge variant="secondary" className="text-xs">
              Stopped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Not Installed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenWeb}
                title="Open Gazelle WebUI (http://localhost:7001)"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open WebUI
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionPending}
                onClick={handleRestart}
                title="Restart Gazelle container"
              >
                <RotateCw className={`h-3.5 w-3.5 ${actionPending ? "animate-spin" : ""}`} />
                Restart
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={actionPending}
                onClick={handleStop}
                title="Stop Gazelle container"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          )}

          {(isStopped || isNotFound) && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={actionPending || loading}
              onClick={handleStart}
            >
              {actionPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1" />
              )}
              {isStopped ? "Start Gazelle" : "Install & Run Gazelle"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Deploy a local OPSnet/Gazelle tracker container (ghcr.io/opsnet/gazelle) mapped to port 7001 with persistent state in the desktop data directory.
      </p>

      {errorMessage && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
