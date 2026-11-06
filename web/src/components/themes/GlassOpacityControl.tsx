/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect } from "react"
import { Check, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { useGlassmorphism } from "@/hooks/useGlassmorphism"
import { useHasPremiumAccess } from "@/hooks/useLicense.ts"
import {
  GLASS_DEFAULT_PERCENT,
  GLASS_MIN_PERCENT,
  GLASS_SOLID_PERCENT,
  glassIsOn
} from "@/lib/glass"
import { cn } from "@/lib/utils"

function stopMenuEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

/** Checked whenever the theme color is below 100%. The slider is that amount. */
export function GlassOpacityControl({ layout }: { layout: "menu" | "settings" }) {
  const { t } = useTranslation("common")
  const [percent, setPercent] = useGlassmorphism()
  const { hasPremiumAccess, isLoading } = useHasPremiumAccess()
  const on = hasPremiumAccess && glassIsOn(percent)

  // Ensure glass opacity is reset to solid if the install has no premium license
  useEffect(() => {
    if (!isLoading && !hasPremiumAccess && glassIsOn(percent)) {
      setPercent(GLASS_SOLID_PERCENT)
    }
  }, [hasPremiumAccess, isLoading, percent, setPercent])

  const showLockedToast = () => {
    toast.error(t("themeToggle.premiumThemeError"))
  }

  const toggle = () => {
    if (!hasPremiumAccess) {
      showLockedToast()
      return
    }
    setPercent(on ? GLASS_SOLID_PERCENT : GLASS_DEFAULT_PERCENT)
  }

  const slider = (
    <input
      type="range"
      min={GLASS_MIN_PERCENT}
      max={GLASS_SOLID_PERCENT}
      step={5}
      value={on ? percent : GLASS_SOLID_PERCENT}
      disabled={!hasPremiumAccess}
      aria-label={t("themeToggle.glass")}
      aria-valuemin={GLASS_MIN_PERCENT}
      aria-valuemax={GLASS_SOLID_PERCENT}
      aria-valuenow={on ? percent : GLASS_SOLID_PERCENT}
      onPointerDown={stopMenuEvent}
      onKeyDown={stopMenuEvent}
      onChange={(event) => {
        if (!hasPremiumAccess) {
          showLockedToast()
          return
        }
        setPercent(Number(event.target.value))
      }}
      className={cn(
        "h-1.5 w-full accent-foreground",
        hasPremiumAccess ? "cursor-pointer" : "cursor-not-allowed opacity-40"
      )}
    />
  )

  if (layout === "settings") {
    return (
      <div className="rounded-md border px-3 py-2">
        <div
          className="flex items-center justify-between gap-3"
          onClick={() => {
            if (!hasPremiumAccess) {
              showLockedToast()
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("themeToggle.glass")}</span>
            {!hasPremiumAccess && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Lock className="h-3 w-3" />
                Premium
              </span>
            )}
          </div>
          <Switch
            checked={on}
            disabled={!hasPremiumAccess}
            onCheckedChange={toggle}
            aria-label={t("themeToggle.glass")}
          />
        </div>
        <div
          className="mt-3"
          onClick={() => {
            if (!hasPremiumAccess) {
              showLockedToast()
            }
          }}
        >
          {slider}
        </div>
      </div>
    )
  }

  return (
    <div className="px-2 py-1.5" onPointerDown={stopMenuEvent}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
          hasPremiumAccess
            ? "hover:bg-accent hover:text-accent-foreground"
            : "opacity-60 cursor-not-allowed"
        )}
        onClick={toggle}
      >
        <span className="flex-1 text-left">{t("themeToggle.glass")}</span>
        {!hasPremiumAccess ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">{percent}%</span>
            {on ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
          </>
        )}
      </button>
      <div className="px-2 pb-1">{slider}</div>
    </div>
  )
}
