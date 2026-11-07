/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { type ReactNode } from "react"
import type { ViewTransitionClass } from "react"

export interface ViewTransitionBoundaryProps {
  children?: ReactNode
  name?: string
  enter?: ViewTransitionClass
  exit?: ViewTransitionClass
  update?: ViewTransitionClass
  share?: ViewTransitionClass
}

/**
 * ViewTransitionBoundary provides a declarative and defensive wrapper
 * around React 19's native <ViewTransition /> component.
 *
 * When React.ViewTransition is available, wraps children inside it with the
 * caller-supplied View Transition props. When unavailable, renders children
 * directly. Props are applied selectively so omitted names keep React's
 * default `"auto"` behavior.
 */
export function ViewTransitionBoundary({
  children,
  name,
  enter,
  exit,
  update,
  share,
}: ViewTransitionBoundaryProps) {
  const VT = React.ViewTransition

  if (!VT) {
    return <>{children}</>
  }

  const props: {
    name?: string
    enter?: ViewTransitionClass
    exit?: ViewTransitionClass
    update?: ViewTransitionClass
    share?: ViewTransitionClass
  } = {}
  if (name) props.name = name
  if (enter) props.enter = enter
  if (exit) props.exit = exit
  if (update) props.update = update
  if (share) props.share = share

  return <VT {...props}>{children}</VT>
}
