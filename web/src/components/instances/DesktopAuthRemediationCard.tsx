/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Check, Copy, KeyRound } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { usePodmanServices } from "@/hooks/usePodmanServices"
import { useIsDesktop } from "@/lib/desktop-environment"
import { isQBitAuthError } from "@/lib/qbit-auth-error"
import type { InstanceResponse } from "@/types"

function hasAuthFailure(instance: InstanceResponse): boolean {
  return (
    !instance.connected &&
    (instance.hasDecryptionError || (instance.recentErrors ?? []).some((error) => isQBitAuthError(error.errorMessage, error.errorType)))
  )
}

export function DesktopAuthRemediationCard({ instance, onEdit }: { instance: InstanceResponse; onEdit: () => void }) {
  const isDesktop = useIsDesktop()
  if (!isDesktop || !hasAuthFailure(instance)) {
    return null
  }
  return <AuthRemediationBody onEdit={onEdit} />
}

function AuthRemediationBody({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation("desktop")
  const { getQBitConfig } = usePodmanServices()
  const [copiedContainerPass, setCopiedContainerPass] = useState(false)
  const [isCopyingPass, setIsCopyingPass] = useState(false)

  const handleCopyContainerPass = async () => {
    try {
      setIsCopyingPass(true)
      const qbitConfig = await getQBitConfig()
      if (qbitConfig.password) {
        await navigator.clipboard.writeText(qbitConfig.password)
        setCopiedContainerPass(true)
        toast.success(t("instances.errorDisplay.copiedContainerPassword"))
        setTimeout(() => setCopiedContainerPass(false), 2000)
      } else {
        toast.error(t("instances.errorDisplay.noContainerPasswordFound"))
      }
    } catch {
      toast.error(t("instances.errorDisplay.failedToCopyPassword"))
    } finally {
      setIsCopyingPass(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
      <div className="flex items-center gap-2 font-medium text-amber-400">
        <KeyRound aria-hidden="true" className="size-4 shrink-0" />
        <span>{t("instances.errorDisplay.authGuideTitle")}</span>
      </div>
      <p className="mt-1.5 leading-relaxed text-amber-200/90">{t("instances.errorDisplay.authGuideDescription")}</p>
      <div className="mt-2 space-y-1.5 text-amber-200/80">
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-amber-400">1.</span>
          <span>{t("instances.errorDisplay.authGuideStep1")}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-amber-400">2.</span>
          <span>{t("instances.errorDisplay.authGuideStep2")}</span>
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
          {copiedContainerPass
            ? t("instances.errorDisplay.copiedPassword")
            : t("instances.errorDisplay.copyContainerPassword")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="h-7 border-amber-500/40 px-3 text-xs text-amber-300 hover:bg-amber-500/20"
        >
          {t("instances.errorDisplay.configureCredentials")}
        </Button>
      </div>
    </div>
  )
}
