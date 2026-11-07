/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { AnimatedLogo, type AnimatedLogoMode } from "@/components/ui/AnimatedLogo"
import { cn } from "@/lib/utils"

export interface LoadingOverlayProps {
  mode?: AnimatedLogoMode
  message?: string
  submessage?: string
  fullScreen?: boolean
  className?: string
}

/**
 * Branded loading overlay that renders the articulated vector rabbit with theme-synchronized
 * typography and animation. Ideal for page-level transitions, route boundaries, and card loaders.
 */
export function LoadingOverlay({
  mode = "sprint",
  message = "Loading...",
  submessage,
  fullScreen = false,
  className,
}: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none",
        fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : "w-full min-h-[220px]",
        className
      )}
    >
      <AnimatedLogo
        mode={mode}
        size="lg"
        showShadow={true}
        showStreaks={true}
        showShimmer={true}
        className="h-20 w-20 md:h-24 md:w-24 text-primary"
      />

      {message && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>{message}</span>
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="size-1 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-1 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="size-1 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}

      {submessage && (
        <p className="mt-1 text-xs text-muted-foreground/80 max-w-sm">
          {submessage}
        </p>
      )}
    </div>
  )
}
