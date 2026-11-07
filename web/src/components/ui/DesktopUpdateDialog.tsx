/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, CheckCircle2, Download, Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

export interface DesktopUpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  tagName?: string
  name?: string
  body?: string
  htmlUrl?: string
  downloadUrl?: string
  publishedAt?: string
}

export interface DesktopUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  updateInfo: DesktopUpdateInfo
}

export function DesktopUpdateDialog({
  open,
  onOpenChange,
  updateInfo,
}: DesktopUpdateDialogProps) {
  const { t } = useTranslation("common")
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleUpdate = async () => {
    if (typeof window === "undefined" || !window.quiDesktop?.applyUpdate) {
      return
    }

    try {
      setUpdating(true)
      setError(null)
      const res = await window.quiDesktop.applyUpdate(updateInfo.latestVersion)
      if (!res.success) {
        setError(res.error || t("desktopUpdate.failed", { defaultValue: "Failed to apply update." }))
        setUpdating(false)
        return
      }
      setSuccess(true)
      setUpdating(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setUpdating(false)
    }
  }

  const versionTag = updateInfo.tagName || `v${updateInfo.latestVersion}`

  return (
    <Dialog open={open} onOpenChange={(val) => !updating && onOpenChange(val)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {t("desktopUpdate.title", { defaultValue: "Qui Desktop Update Available" })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("desktopUpdate.subtitle", {
                  version: versionTag,
                  current: `v${updateInfo.currentVersion}`,
                  defaultValue: `Version ${versionTag} is ready to download and install. Current version is v${updateInfo.currentVersion}.`,
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Release Notes / Changelog */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("desktopUpdate.whatsNew", { defaultValue: `What's New in ${versionTag}` })}
            </h4>
            <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
              {updateInfo.body && updateInfo.body.trim().length > 0 ? (
                updateInfo.body
              ) : (
                <span className="text-muted-foreground italic">
                  {t("desktopUpdate.noChangelog", {
                    defaultValue: "Performance improvements, bug fixes, and maintenance updates.",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Data Safety & Backup Guarantees */}
          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1">
                <p className="font-medium">
                  {t("desktopUpdate.dataSafetyTitle", { defaultValue: "Data Safety & Pre-Update Backups" })}
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                  <li>
                    {t("desktopUpdate.backupNotice", {
                      defaultValue: "Pre-update backup snapshot is archived before updating.",
                    })}
                  </li>
                  <li>
                    {t("desktopUpdate.storageNotice", {
                      defaultValue: "All database settings, torrent data, and vaults are safely preserved.",
                    })}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Updating / In-Progress State */}
          {updating && (
            <div className="flex items-center gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <p>
                {t("desktopUpdate.inProgress", {
                  defaultValue: "Downloading update and updating Qui container... Interface will automatically reload momentarily.",
                })}
              </p>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p>
                {t("desktopUpdate.applied", {
                  defaultValue: "Update applied successfully! Web interface is refreshing...",
                })}
              </p>
            </div>
          )}

          {/* Error Message */}
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
            onClick={() => onOpenChange(false)}
          >
            {t("desktopUpdate.later", { defaultValue: "Later" })}
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
                {t("desktopUpdate.updating", { defaultValue: "Updating..." })}
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("desktopUpdate.done", { defaultValue: "Done" })}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                {t("desktopUpdate.downloadAndUpdate", { defaultValue: "Download & Update" })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
