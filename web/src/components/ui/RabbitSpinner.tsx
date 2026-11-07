/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { AnimatedLogo, type AnimatedLogoMode, type AnimatedLogoSize } from "@/components/ui/AnimatedLogo"
import { cn } from "@/lib/utils"

export interface RabbitSpinnerProps {
  size?: AnimatedLogoSize
  mode?: AnimatedLogoMode
  className?: string
  label?: string
}

const spinnerSizeMap: Record<string, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
}

/**
 * Branded, theme-synchronized inline spinner powered by the articulated rabbit motion engine.
 * Drop-in accessible replacement for generic Lucide `<Loader2>` spinners.
 */
export function RabbitSpinner({
  size = "sm",
  mode = "turbo",
  className,
  label = "Loading...",
}: RabbitSpinnerProps) {
  const isNumericSize = typeof size === "number"
  const sizeClass = !isNumericSize && typeof size === "string" ? spinnerSizeMap[size] ?? "size-4" : ""

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center shrink-0", className)}
    >
      <AnimatedLogo
        mode={mode}
        size={size}
        showShadow={false}
        showStreaks={false}
        showShimmer={false}
        className={cn(sizeClass, className)}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
