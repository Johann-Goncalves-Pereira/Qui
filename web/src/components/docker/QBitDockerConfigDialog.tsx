/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { type QBitContainerConfig, useDockerServices } from "@/hooks/useDockerServices"
import type { TFunction } from "i18next"
import { Check, Copy, Info, Loader2, RotateCw } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface QBitDockerConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function containerStateLabel(state: string, t: TFunction<"common">): string {
  const key = `docker.state.${state}` as const
  const translated = t(key)
  return translated === key ? state : translated
}

export function QBitDockerConfigDialog({
  open,
  onOpenChange,
}: QBitDockerConfigDialogProps) {
  const { t } = useTranslation("common")
  const { getQBitConfig, saveQBitConfig, restartContainer, statuses } =
    useDockerServices()

  const [config, setConfig] = useState<QBitContainerConfig>({
    port: 8080,
    peerPort: 6881,
    configPath: "/config",
    downloadsPath: "/downloads",
    puid: "1000",
    pgid: "1000",
    umask: "022",
    tz: "UTC",
    restartPolicy: "unless-stopped",
    image: "lscr.io/linuxserver/qbittorrent:latest",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      void getQBitConfig().then((loaded) => {
        setConfig(loaded)
      })
    }
  }, [open, getQBitConfig])

  useEffect(() => {
    if (!copied) {
      return
    }
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const res = await saveQBitConfig(config)
      if (res.success) {
        toast.success(t("docker.toast.qbitSaved"))
        onOpenChange(false)
      } else {
        toast.error(res.error || t("docker.toast.saveFailed"))
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("docker.toast.genericSaveError")
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestart = async () => {
    try {
      setIsRestarting(true)
      const res = await restartContainer("qbittorrent-nox")
      if (res.success) {
        toast.success(t("docker.toast.qbitRestartStarted"))
      } else {
        toast.error(res.error || t("docker.toast.restartFailed"))
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("docker.toast.genericRestartError")
      )
    } finally {
      setIsRestarting(false)
    }
  }

  const dockerRunSnippet = [
    "docker run -d",
    "--name qbittorrent-nox",
    `-p ${config.port}:8080`,
    `-p ${config.peerPort}:6881/tcp`,
    `-p ${config.peerPort}:6881/udp`,
    `-v "${config.configPath}":/config`,
    `-v "${config.downloadsPath}":/downloads`,
    config.puid ? `-e PUID=${config.puid}` : null,
    config.pgid ? `-e PGID=${config.pgid}` : null,
    config.umask ? `-e UMASK=${config.umask}` : null,
    config.tz ? `-e TZ=${config.tz}` : null,
    `--restart ${config.restartPolicy || "unless-stopped"}`,
    config.image,
  ]
    .filter(Boolean)
    .join(" \\\n  ")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dockerRunSnippet)
      setCopied(true)
      toast.success(t("docker.toast.copyCommandSuccess"))
    } catch (err) {
      console.error("[QBitDockerConfigDialog] clipboard write failed:", err)
      toast.error(t("docker.toast.copyCommandFailed"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span>{t("docker.qbit.title")}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  statuses.qbit.state === "running"
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                }`}
              >
                {containerStateLabel(statuses.qbit.state, t)}
              </span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            {t("docker.qbit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qbit-port" className="text-xs font-medium">
                {t("docker.fields.hostWebUiPort")}
              </Label>
              <Input
                id="qbit-port"
                type="number"
                value={config.port}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    port: Number.parseInt(e.target.value, 10) || 8080,
                  }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.qbitPortMappedHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-peer-port" className="text-xs font-medium">
                {t("docker.fields.bitTorrentPeerPort")}
              </Label>
              <Input
                id="qbit-peer-port"
                type="number"
                value={config.peerPort}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    peerPort: Number.parseInt(e.target.value, 10) || 6881,
                  }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.peerPortHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-image" className="text-xs font-medium">
                {t("docker.fields.dockerImage")}
              </Label>
              <Input
                id="qbit-image"
                value={config.image}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, image: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.qbitImageHelp")}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">
            <div className="text-xs font-medium text-foreground">
              {t("docker.fields.volumeBindMounts")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-config-path" className="text-xs">
                {t("docker.fields.hostConfigDirQbit")}
              </Label>
              <Input
                id="qbit-config-path"
                value={config.configPath}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, configPath: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.hostConfigDirQbitHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-downloads-path" className="text-xs">
                {t("docker.fields.hostDownloadsDir")}
              </Label>
              <Input
                id="qbit-downloads-path"
                value={config.downloadsPath}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, downloadsPath: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.hostDownloadsHelp")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qbit-puid" className="text-xs">
                {t("docker.fields.puid")}
              </Label>
              <Input
                id="qbit-puid"
                value={config.puid ?? "1000"}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, puid: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.puidHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-pgid" className="text-xs">
                {t("docker.fields.pgid")}
              </Label>
              <Input
                id="qbit-pgid"
                value={config.pgid ?? "1000"}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, pgid: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.pgidHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-umask" className="text-xs">
                {t("docker.fields.umask")}
              </Label>
              <Input
                id="qbit-umask"
                value={config.umask ?? "022"}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, umask: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.umaskHelpQbit")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qbit-restart" className="text-xs">
                {t("docker.fields.restartPolicy")}
              </Label>
              <Select
                value={config.restartPolicy || "unless-stopped"}
                onValueChange={(val) =>
                  setConfig((c) => ({ ...c, restartPolicy: val }))
                }
              >
                <SelectTrigger id="qbit-restart" className="h-8 text-xs">
                  <SelectValue
                    placeholder={t("docker.fields.restartPolicyPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unless-stopped">
                    {t("docker.fields.restartPolicyOption.unlessStopped")}
                  </SelectItem>
                  <SelectItem value="always">
                    {t("docker.fields.restartPolicyOption.always")}
                  </SelectItem>
                  <SelectItem value="on-failure">
                    {t("docker.fields.restartPolicyOption.onFailure")}
                  </SelectItem>
                  <SelectItem value="no">
                    {t("docker.fields.restartPolicyOption.no")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qbit-tz" className="text-xs">
                {t("docker.fields.timezone")}
              </Label>
              <Input
                id="qbit-tz"
                value={config.tz ?? "UTC"}
                onChange={(e) => setConfig((c) => ({ ...c, tz: e.target.value }))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {t("docker.fields.dockerCommandPreview")}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 px-2"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? t("docker.fields.copied") : t("docker.fields.copy")}
              </Button>
            </div>
            <pre className="p-2.5 rounded bg-muted/60 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground border border-border/40">
              {dockerRunSnippet}
            </pre>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRestart()}
            disabled={isRestarting || isSaving}
            className="gap-1.5 text-xs"
          >
            {isRestarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            {t("docker.actions.restartContainer")}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {t("docker.actions.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="text-xs"
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("docker.actions.saveApply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
