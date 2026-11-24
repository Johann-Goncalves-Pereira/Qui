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
import { type QuiContainerConfig, usePodmanServices } from "@/hooks/usePodmanServices"
import { Check, Copy, Info, Loader2, RotateCw } from "lucide-react"
import type { TFunction } from "i18next"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface QuiPodmanConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function containerStateLabel(state: string, t: TFunction<"desktop">): string {
  const key = `podman.state.${state}` as const
  const translated = t(key)
  return translated === key ? state : translated
}

export function QuiPodmanConfigDialog({
  open,
  onOpenChange,
}: QuiPodmanConfigDialogProps) {
  const { t } = useTranslation("desktop")
  const { getQuiConfig, saveQuiConfig, restartContainer, statuses } =
    usePodmanServices()

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
        toast.success(t("podman.toast.quiSaved"))
        onOpenChange(false)
      } else {
        toast.error(res.error || t("podman.toast.saveFailed"))
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("podman.toast.genericSaveError")
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
        toast.success(t("podman.toast.quiRestartStarted"))
      } else {
        toast.error(res.error || t("podman.toast.restartFailed"))
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("podman.toast.genericRestartError")
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
      toast.success(t("podman.toast.copyCommandSuccess"))
    } catch (err) {
      console.error("[QuiPodmanConfigDialog] clipboard write failed:", err)
      toast.error(t("podman.toast.copyCommandFailed"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span>{t("podman.qui.title")}</span>
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
            {t("podman.qui.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qui-port" className="text-xs font-medium">
                {t("podman.fields.hostWebUiPort")}
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
                {t("podman.fields.quiPortMappedHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-image" className="text-xs font-medium">
                {t("podman.fields.podmanImage")}
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
                {t("podman.fields.quiImageHelp")}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/20">
            <div className="text-xs font-medium text-foreground">
              {t("podman.fields.volumeBindMounts")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-config-path" className="text-xs">
                {t("podman.fields.hostConfigDirQui")}
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
                {t("podman.fields.hostConfigDirQuiHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-data-path" className="text-xs">
                {t("podman.fields.hostDataDir")}
              </Label>
              <Input
                id="qui-data-path"
                value={config.dataPath ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, dataPath: e.target.value }))
                }
                placeholder={t("podman.fields.dataPathPlaceholder")}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("podman.fields.hostDataDirHelp")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qui-puid" className="text-xs">
                {t("podman.fields.puid")}
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
                {t("podman.fields.puidHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-pgid" className="text-xs">
                {t("podman.fields.pgid")}
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
                {t("podman.fields.pgidHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-umask" className="text-xs">
                {t("podman.fields.umask")}
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
                {t("podman.fields.umaskHelpQui")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="qui-base-url" className="text-xs">
                {t("podman.fields.baseUrl")}
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
                {t("podman.fields.baseUrlHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-log-level" className="text-xs">
                {t("podman.fields.logLevel")}
              </Label>
              <Select
                value={config.logLevel || "INFO"}
                onValueChange={(val) =>
                  setConfig((c) => ({ ...c, logLevel: val }))
                }
              >
                <SelectTrigger id="qui-log-level" className="h-8 text-xs">
                  <SelectValue placeholder={t("podman.fields.logLevelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBUG">
                    {t("podman.fields.logLevelOption.DEBUG")}
                  </SelectItem>
                  <SelectItem value="INFO">
                    {t("podman.fields.logLevelOption.INFO")}
                  </SelectItem>
                  <SelectItem value="WARN">
                    {t("podman.fields.logLevelOption.WARN")}
                  </SelectItem>
                  <SelectItem value="ERROR">
                    {t("podman.fields.logLevelOption.ERROR")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-restart" className="text-xs">
                {t("podman.fields.restartPolicy")}
              </Label>
              <Select
                value={config.restartPolicy || "unless-stopped"}
                onValueChange={(val) =>
                  setConfig((c) => ({ ...c, restartPolicy: val }))
                }
              >
                <SelectTrigger id="qui-restart" className="h-8 text-xs">
                  <SelectValue
                    placeholder={t("podman.fields.restartPolicyPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unless-stopped">
                    {t("podman.fields.restartPolicyOption.unlessStopped")}
                  </SelectItem>
                  <SelectItem value="always">
                    {t("podman.fields.restartPolicyOption.always")}
                  </SelectItem>
                  <SelectItem value="on-failure">
                    {t("podman.fields.restartPolicyOption.onFailure")}
                  </SelectItem>
                  <SelectItem value="no">
                    {t("podman.fields.restartPolicyOption.no")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qui-tz" className="text-xs">
                {t("podman.fields.timezone")}
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
                {t("podman.fields.podmanCommandPreview")}
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
                {copied ? t("podman.fields.copied") : t("podman.fields.copy")}
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
            {t("podman.actions.restartContainer")}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {t("podman.actions.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="text-xs"
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("podman.actions.saveApply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
