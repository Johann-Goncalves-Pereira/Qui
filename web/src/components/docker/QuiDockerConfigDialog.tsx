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
import { type QuiContainerConfig, useDockerServices } from "@/hooks/useDockerServices"
import { Check, Copy, Info, Loader2, RotateCw } from "lucide-react"
import type { TFunction } from "i18next"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface QuiDockerConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function containerStateLabel(state: string, t: TFunction<"common">): string {
  const key = `docker.state.${state}` as const
  const translated = t(key)
  return translated === key ? state : translated
}

export function QuiDockerConfigDialog({
  open,
  onOpenChange,
}: QuiDockerConfigDialogProps) {
  const { t } = useTranslation("common")
  const { getQuiConfig, saveQuiConfig, restartContainer, statuses } =
    useDockerServices()

  const [config, setConfig] = useState<QuiContainerConfig>({
    port: 7476,
    configPath: "/config",
    dataPath: "/data",
    puid: "1000",
    pgid: "1000",
    umask: "002",
    logLevel: "INFO",
    baseUrl: "",
    tz: "UTC",
    restartPolicy: "unless-stopped",
    image: "qui-desktop:local",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      void getQuiConfig().then((loaded) => {
        setConfig(loaded)
      })
    }
  }, [open, getQuiConfig])

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
      const res = await saveQuiConfig(config)
      if (res.success) {
        toast.success(t("docker.toast.quiSaved"))
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
      const res = await restartContainer("qui")
      if (res.success) {
        toast.success(t("docker.toast.quiRestartStarted"))
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

  const podmanRunSnippet = [
    "podman run -d",
    "--name qui",
    `-p ${config.port}:7476`,
    `-v "${config.configPath}":/config`,
    config.dataPath ? `-v "${config.dataPath}":/data` : null,
    config.puid ? `-e PUID=${config.puid}` : null,
    config.pgid ? `-e PGID=${config.pgid}` : null,
    config.umask ? `-e UMASK=${config.umask}` : null,
    config.logLevel ? `-e QUI__LOG_LEVEL=${config.logLevel}` : null,
    config.baseUrl ? `-e QUI__BASE_URL=${config.baseUrl}` : null,
    config.tz ? `-e TZ=${config.tz}` : null,
    `--restart ${config.restartPolicy || "unless-stopped"}`,
    config.image,
  ]
    .filter(Boolean)
    .join(" \\\n  ")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(podmanRunSnippet)
      setCopied(true)
      toast.success(t("docker.toast.copyCommandSuccess"))
    } catch (err) {
      console.error("[QuiDockerConfigDialog] clipboard write failed:", err)
      toast.error(t("docker.toast.copyCommandFailed"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span>{t("docker.qui.title")}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  statuses.qui.state === "running"
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                }`}
              >
                {containerStateLabel(statuses.qui.state, t)}
              </span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            {t("docker.qui.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qui-port" className="text-xs font-medium">
                {t("docker.fields.hostWebUiPort")}
              </Label>
              <Input
                id="qui-port"
                type="number"
                value={config.port}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    port: Number.parseInt(e.target.value, 10) || 7476,
                  }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.quiPortMappedHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-image" className="text-xs font-medium">
                {t("docker.fields.dockerImage")}
              </Label>
              <Input
                id="qui-image"
                value={config.image}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, image: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.quiImageHelp")}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">
            <div className="text-xs font-medium text-foreground">
              {t("docker.fields.volumeBindMounts")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-config-path" className="text-xs">
                {t("docker.fields.hostConfigDirQui")}
              </Label>
              <Input
                id="qui-config-path"
                value={config.configPath}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, configPath: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.hostConfigDirQuiHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-data-path" className="text-xs">
                {t("docker.fields.hostDataDir")}
              </Label>
              <Input
                id="qui-data-path"
                value={config.dataPath ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, dataPath: e.target.value }))
                }
                placeholder={t("docker.fields.dataPathPlaceholder")}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.hostDataDirHelp")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qui-puid" className="text-xs">
                {t("docker.fields.puid")}
              </Label>
              <Input
                id="qui-puid"
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
              <Label htmlFor="qui-pgid" className="text-xs">
                {t("docker.fields.pgid")}
              </Label>
              <Input
                id="qui-pgid"
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
              <Label htmlFor="qui-umask" className="text-xs">
                {t("docker.fields.umask")}
              </Label>
              <Input
                id="qui-umask"
                value={config.umask ?? "002"}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, umask: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.umaskHelpQui")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="qui-base-url" className="text-xs">
                {t("docker.fields.baseUrl")}
              </Label>
              <Input
                id="qui-base-url"
                value={config.baseUrl ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, baseUrl: e.target.value }))
                }
                className="h-8 text-xs font-mono"
                placeholder="https://qui.example.com"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("docker.fields.baseUrlHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-log-level" className="text-xs">
                {t("docker.fields.logLevel")}
              </Label>
              <Select
                value={config.logLevel || "INFO"}
                onValueChange={(val) =>
                  setConfig((c) => ({ ...c, logLevel: val }))
                }
              >
                <SelectTrigger id="qui-log-level" className="h-8 text-xs">
                  <SelectValue placeholder={t("docker.fields.logLevelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBUG">
                    {t("docker.fields.logLevelOption.DEBUG")}
                  </SelectItem>
                  <SelectItem value="INFO">
                    {t("docker.fields.logLevelOption.INFO")}
                  </SelectItem>
                  <SelectItem value="WARN">
                    {t("docker.fields.logLevelOption.WARN")}
                  </SelectItem>
                  <SelectItem value="ERROR">
                    {t("docker.fields.logLevelOption.ERROR")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-restart" className="text-xs">
                {t("docker.fields.restartPolicy")}
              </Label>
              <Select
                value={config.restartPolicy || "unless-stopped"}
                onValueChange={(val) =>
                  setConfig((c) => ({ ...c, restartPolicy: val }))
                }
              >
                <SelectTrigger id="qui-restart" className="h-8 text-xs">
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
              <Label htmlFor="qui-tz" className="text-xs">
                {t("docker.fields.timezone")}
              </Label>
              <Input
                id="qui-tz"
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
              {podmanRunSnippet}
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
