/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { formatErrorMessage } from "@/lib/format-error-message"
import type { InstanceResponse } from "@/types"
import { AlertCircle, ChevronDown, Edit, KeyRound, XCircle } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useDateTimeFormatters } from "@/hooks/useDateTimeFormatters"

interface InstanceErrorDisplayProps {
  instance: InstanceResponse
  onEdit?: () => void
  showEditButton?: boolean
  compact?: boolean
  extraErrorMessage?: string
}

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

export function InstanceErrorDisplay({
  instance,
  onEdit,
  showEditButton = false,
  compact = false,
  extraErrorMessage,
}: InstanceErrorDisplayProps) {
  const { t } = useTranslation("instances")
  const [isDecryptionOpen, setIsDecryptionOpen] = useState(compact)
  const [isRecentErrorsOpen, setIsRecentErrorsOpen] = useState(compact)
  const { formatTimestamp } = useDateTimeFormatters()

  const hasAuthError =
    !instance.connected &&
    (instance.hasDecryptionError ||
      isQBitAuthError(extraErrorMessage) ||
      Boolean(
        instance.recentErrors?.some((e) =>
          isQBitAuthError(e.errorMessage, e.errorType)
        )
      ))

  const authGuidanceCard = hasAuthError ? (
    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
      <div className="flex items-center gap-2 font-medium text-amber-400">
        <KeyRound className="h-4 w-4 flex-shrink-0" />
        <span>{t("errorDisplay.authGuideTitle")}</span>
      </div>
      <p className="mt-1.5 text-xs text-amber-200/90 leading-relaxed">
        {t("errorDisplay.authGuideDescription")}
      </p>
      <div className="mt-2 space-y-1.5 text-xs text-amber-200/80">
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-amber-400">1.</span>
          <span>{t("errorDisplay.authGuideStep1")}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-amber-400">2.</span>
          <span>{t("errorDisplay.authGuideStep2")}</span>
        </div>
      </div>
      {showEditButton && onEdit && (
        <Button
          onClick={onEdit}
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
        >
          <Edit className="mr-1.5 h-3 w-3" />
          {t("errorDisplay.configureCredentials")}
        </Button>
      )}
    </div>
  ) : null

  // Compact mode shows expandable error cards
  if (compact) {
    return (
      <>
        {instance.hasDecryptionError && (
          <Collapsible open={isDecryptionOpen} onOpenChange={setIsDecryptionOpen} className="mt-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-destructive/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium text-destructive truncate">{t("errorDisplay.passwordRequired")}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-destructive transition-transform duration-200 ${isDecryptionOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>

              <CollapsibleContent className="px-3 pb-3">
                <div className="text-sm text-destructive/90 mt-2 mb-3">
                  {t("errorDisplay.decryptionDescription")}
                </div>
                {showEditButton && onEdit && (
                  <Button
                    onClick={onEdit}
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    {t("errorDisplay.reenterPassword")}
                  </Button>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {!instance.connected && instance.recentErrors && instance.recentErrors.length > 0 && (
          <Collapsible open={isRecentErrorsOpen} onOpenChange={setIsRecentErrorsOpen} className="mt-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-destructive/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium text-destructive truncate">
                    {t("errorDisplay.recentErrors", { count: instance.recentErrors.length })}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-destructive transition-transform duration-200 ${isRecentErrorsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>

              <CollapsibleContent className="px-3 pb-3">
                <div className="space-y-2 mt-2">
                  {instance.recentErrors.map((error, index) => (
                    <div key={error.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-mono text-destructive/90 capitalize truncate">
                          {error.errorType}
                        </span>
                        <span className="text-destructive/70 flex-shrink-0 text-xs">
                          {formatTimestamp(new Date(error.occurredAt).getTime() / 1000)}
                        </span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="font-mono text-destructive/80 leading-relaxed truncate cursor-help">
                            {formatErrorMessage(error.errorMessage)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p className="break-words">{formatErrorMessage(error.errorMessage)}</p>
                        </TooltipContent>
                      </Tooltip>
                      {index < (instance.recentErrors?.length ?? 0) - 1 && (
                        <div className="border-t border-destructive/20 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        {authGuidanceCard}
      </>
    )
  }

  // Full mode shows expanded error messages (for dedicated pages)
  return (
    <>
      {instance.hasDecryptionError && (
        <div className="mt-4 p-3 rounded-lg bg-muted border border-border">
          <div className="flex items-start gap-2 text-sm text-foreground">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
            <div className="flex-1">
              <div className="font-medium mb-1 text-destructive">{t("errorDisplay.passwordRequired")}</div>
              <div className="text-muted-foreground mb-2">
                {t("errorDisplay.decryptionDescription")}
              </div>
              {showEditButton && onEdit && (
                <Button
                  onClick={onEdit}
                  size="sm"
                  variant="outline"
                >
                  <Edit className="mr-2 h-3 w-3" />
                  {t("errorDisplay.reenterPassword")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!instance.connected && instance.recentErrors && instance.recentErrors.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
            <div className="flex-1">
              <div className="font-medium mb-2 text-destructive">
                {t("errorDisplay.recentErrors", { count: instance.recentErrors.length })}
              </div>
              <div className="space-y-3">
                {instance.recentErrors.map((error, index) => (
                  <div key={error.id} className="text-xs">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-mono text-destructive/90 capitalize font-semibold truncate">
                        {error.errorType}
                      </span>
                      <span className="text-destructive/70 flex-shrink-0">
                        {formatTimestamp(new Date(error.occurredAt).getTime() / 1000)}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="font-mono text-destructive/80 leading-relaxed truncate cursor-help">
                          {formatErrorMessage(error.errorMessage)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <p className="break-words">{formatErrorMessage(error.errorMessage)}</p>
                      </TooltipContent>
                    </Tooltip>
                    {index < (instance.recentErrors?.length ?? 0) - 1 && (
                      <div className="border-t border-destructive/20 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {authGuidanceCard}
    </>
  )
}
