/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { type ComponentType, type ReactNode } from "react"

export interface ViewTransitionBoundaryProps {
  children?: ReactNode
  name?: string
  className?: string
  enter?: string
  exit?: string
  update?: string
  share?: string
}

/**
 * ViewTransitionBoundary provides a declarative and defensive wrapper
 * around React 19's native <ViewTransition /> component.
 *
 * When React.ViewTransition is available, wraps children inside React.ViewTransition
 * with optional transition name and animation classes.
 * When unavailable (or in environments without View Transitions), renders children directly.
 */
export function ViewTransitionBoundary({
  children,
  name,
  className,
  enter,
  exit,
  update,
  share,
}: ViewTransitionBoundaryProps) {
  const VT = (React as unknown as { ViewTransition?: ComponentType<Record<string, unknown>> }).ViewTransition

  if (!VT) {
    return <>{children}</>
  }

  const props: Record<string, unknown> = {}
  if (name) props.name = name
  if (className) props.className = className
  if (enter) props.enter = enter
  if (exit) props.exit = exit
  if (update) props.update = update
  if (share) props.share = share

  return <VT {...props}>{children}</VT>
}
