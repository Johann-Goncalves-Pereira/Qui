/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useInstances } from "@/hooks/useInstances"
import {
  buildDefaultCompanionInstance,
  isDesktopEnvironment,
} from "@/lib/desktop-companion-instance"
import { AlertTriangle } from "lucide-react"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

export function DesktopDirScanCompanionCard() {
  const { t } = useTranslation("crossseed")
  const isDesktop = isDesktopEnvironment()
  const { createInstance, isCreating } = useInstances()

  const handleAddCompanionInstance = useCallback(() => {
    createInstance(buildDefaultCompanionInstance())
  }, [createInstance])

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-warning shrink-0" />
          <p className="text-sm text-muted-foreground">
            {t("dirScan.noLocalAccessWarning")}
          </p>
        </div>
        {isDesktop && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCompanionInstance}
            disabled={isCreating}
            className="shrink-0"
          >
            {t("dirScan.addLocalCompanionInstance")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
