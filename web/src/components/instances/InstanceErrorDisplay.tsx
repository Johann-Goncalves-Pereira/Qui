/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { AlertCircle, Check, ChevronDown, Copy, KeyRound } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useDateTimeFormatters } from "@/hooks/useDateTimeFormatters"
import { usePodmanServices } from "@/hooks/usePodmanServices"
import { formatErrorMessage } from "@/lib/format-error-message"
import type { InstanceResponse } from "@/types"

/** Whether an error looks like qBittorrent rejected the credentials, as with the generated password of a new container. */
export function isQBitAuthError(errorMessage?: string, errorType?: string): boolean {
  if (!errorMessage && !errorType) return false
  const text = `${errorType ?? ""} ${errorMessage ?? ""}`.toLowerCase()
  return (
    text.includes("qbit re-login") ||
    text.includes("authentication") ||
    text.includes("401") ||
    text.includes("403") ||
    text.includes("could not get webapi version") ||
    text.includes("password required")
  )
}

/** The errors of one instance, under its row: a saved password that qui cannot read, and the last connection errors. */
export function InstanceErrorDisplay({ instance, onEdit }: { instance: InstanceResponse; onEdit: () => void }) {
  const { t } = useTranslation("instances")
  const { formatTimestamp } = useDateTimeFormatters()
  const { getQBitConfig } = usePodmanServices()
  const [copiedContainerPass, setCopiedContainerPass] = useState(false)
  const [isCopyingPass, setIsCopyingPass] = useState(false)
  const recentErrors = instance.connected ? [] : instance.recentErrors ?? []
  const hasAuthError =
    !instance.connected &&
    (instance.hasDecryptionError || recentErrors.some((error) => isQBitAuthError(error.errorMessage, error.errorType)))

  const handleCopyContainerPass = async () => {
    try {
      setIsCopyingPass(true)
      const qbitConfig = await getQBitConfig()
      if (qbitConfig.password) {
        await navigator.clipboard.writeText(qbitConfig.password)
        setCopiedContainerPass(true)
        toast.success(t("errorDisplay.copiedContainerPassword"))
        setTimeout(() => setCopiedContainerPass(false), 2000)
      } else {
        toast.error(t("errorDisplay.noContainerPasswordFound"))
      }
    } catch (err) {
      console.error("[InstanceErrorDisplay] copy container password failed:", err)
      toast.error(t("errorDisplay.failedToCopyPassword"))
    } finally {
      setIsCopyingPass(false)
    }
  }

  return (
    <div className="space-y-2.5">
      {instance.hasDecryptionError && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-2 text-sm">
            <KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="font-medium text-destructive">{t("errorDisplay.passwordRequired")}</p>
              <p className="text-xs text-muted-foreground">{t("errorDisplay.decryptionDescription")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 max-sm:h-10" onClick={onEdit}>
            {t("errorDisplay.reenterPassword")}
          </Button>
        </div>
      )}

      {recentErrors.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group -mx-1.5 flex min-h-8 w-[calc(100%+0.75rem)] items-center gap-2 rounded-md px-1.5 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-10">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 font-medium">{t("errorDisplay.recentErrors", { count: recentErrors.length })}</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1.5 divide-y divide-destructive/15 rounded-md border border-destructive/20 bg-destructive/5">
              {recentErrors.map((error) => (
                <li key={error.id} className="space-y-1 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="font-medium text-destructive">{t([`errorDisplay.errorTypes.${error.errorType}`, "common:status.unknown"])}</span>
                    <span className="tabular-nums text-muted-foreground">{formatTimestamp(new Date(error.occurredAt).getTime() / 1000)}</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">{formatErrorMessage(error.errorMessage)}</p>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasAuthError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-amber-400">
            <KeyRound aria-hidden="true" className="size-4 shrink-0" />
            <span>{t("errorDisplay.authGuideTitle")}</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-amber-200/90">{t("errorDisplay.authGuideDescription")}</p>
          <div className="mt-2 space-y-1.5 text-amber-200/80">
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-amber-400">1.</span>
              <span>{t("errorDisplay.authGuideStep1")}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-amber-400">2.</span>
              <span>{t("errorDisplay.authGuideStep2")}</span>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isCopyingPass}
              onClick={() => void handleCopyContainerPass()}
              className="h-7 border-amber-500/40 px-3 text-xs text-amber-300 hover:bg-amber-500/20"
            >
              {copiedContainerPass ? <Check className="mr-1.5 size-3 text-emerald-400" /> : <Copy className="mr-1.5 size-3" />}
              {copiedContainerPass ? t("errorDisplay.copiedPassword") : t("errorDisplay.copyContainerPassword")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-7 border-amber-500/40 px-3 text-xs text-amber-300 hover:bg-amber-500/20"
            >
              {t("errorDisplay.configureCredentials")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
