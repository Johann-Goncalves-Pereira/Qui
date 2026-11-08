/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, Boxes, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type UpdateComponentType = "qui" | "qbittorrent-nox" | "other"

export interface ContainerComponentUpdate {
  type: UpdateComponentType
  image: string
  description: string
  reloadRequirement: string
}

export interface ContainerUpdatePromptDetails {
  title: string
  message: string
  detail: string
  componentTypes: UpdateComponentType[]
  reloadRequirements: string[]
  components?: ContainerComponentUpdate[]
}

export interface ContainerUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptDetails: ContainerUpdatePromptDetails
}

export function ContainerUpdateDialog({
  open,
  onOpenChange,
  promptDetails,
}: ContainerUpdateDialogProps) {
  const { t } = useTranslation("common")
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleUpdate = async () => {
    if (typeof window === "undefined" || !window.quiDesktop?.applyContainerUpdates) {
      return
    }

    try {
      setUpdating(true)
      setError(null)
      const res = await window.quiDesktop.applyContainerUpdates()
      if (!res.success) {
        setError(res.error || t("containerUpdate.failed"))
        setUpdating(false)
        return
      }
      setSuccess(true)
      setUpdating(false)
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setUpdating(false)
    }
  }

  const handleDismiss = async () => {
    if (typeof window !== "undefined" && window.quiDesktop?.dismissContainerUpdates) {
      try {
        await window.quiDesktop.dismissContainerUpdates()
      } catch {
        // Safe dismissal
      }
    }
    onOpenChange(false)
  }

  const componentList = promptDetails.components ?? promptDetails.componentTypes.map((type) => ({
    type,
    image: type,
    description: type === "qui"
      ? "qui (Qui Web & API): Recreates container with the latest image."
      : type === "qbittorrent-nox"
        ? "qbittorrent-nox (qBittorrent Engine): Recreates container with the latest image."
        : `${type}: Recreates container with the latest image.`,
    reloadRequirement: type === "qui"
      ? "qui: Web interface will automatically refresh once restarted."
      : type === "qbittorrent-nox"
        ? "qbittorrent-nox: Container will restart; torrent connections will momentarily reconnect."
        : `${type}: Companion container will restart.`,
  }))

  return (
    <Dialog open={open} onOpenChange={(val) => !updating && onOpenChange(val)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {t("containerUpdate.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("containerUpdate.subtitle", {
                  components: promptDetails.componentTypes.join(", "),
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("containerUpdate.componentsTitle")}
            </h4>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {componentList.map((comp) => (
                <div
                  key={comp.image || comp.type}
                  className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{comp.type}</span>
                    <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
                      {comp.type === "qui" ? "Web & API" : comp.type === "qbittorrent-nox" ? "Engine" : "Companion"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-normal">{comp.description}</p>
                  <div className="text-[11px] text-muted-foreground/90 border-t border-border/50 pt-1 mt-1">
                    <span className="font-medium text-foreground/80">{t("containerUpdate.reloadRequirementsTitle")}: </span>
                    {comp.reloadRequirement}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1">
                <p className="font-medium">{t("containerUpdate.dataSafetyTitle")}</p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                  <li>{t("containerUpdate.backupNotice")}</li>
                  <li>{t("containerUpdate.storageNotice")}</li>
                </ul>
              </div>
            </div>
          </div>

          {updating && (
            <div className="flex items-center gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <p>{t("containerUpdate.inProgress")}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p>{t("containerUpdate.applied")}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updating}
            onClick={handleDismiss}
          >
            {t("containerUpdate.later")}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={updating || success}
            className="gap-1.5"
            onClick={handleUpdate}
          >
            {updating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("containerUpdate.updating")}
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("containerUpdate.done")}
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                {t("containerUpdate.updateNow")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
