/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react"

export interface ActionTransitionContextValue {
  isPending: boolean
  startTransition: TransitionStartFunction
  runWithTransition: <T extends (...args: unknown[]) => unknown>(fn: T) => (...args: Parameters<T>) => void
}

const ActionTransitionContext = createContext<ActionTransitionContextValue | null>(null)

export interface ActionTransitionProviderProps {
  children?: ReactNode
}

/**
 * ActionTransitionProvider coordinates React 19 transitions across user actions
 * (button clicks, tab activations, dialog switches).
 */
export function ActionTransitionProvider({ children }: ActionTransitionProviderProps) {
  const [isPending, startTransition] = useTransition()

  const runWithTransition = useCallback(
    <T extends (...args: unknown[]) => unknown>(fn: T) => {
      return (...args: Parameters<T>): void => {
        startTransition(() => {
          void fn(...args)
        })
      }
    },
    [startTransition]
  )

  const value: ActionTransitionContextValue = {
    isPending,
    startTransition,
    runWithTransition,
  }

  return (
    <ActionTransitionContext.Provider value={value}>
      {children}
    </ActionTransitionContext.Provider>
  )
}

/**
 * Hook to access the current ActionTransition context or create a local transition runner.
 */
export function useActionTransition(): ActionTransitionContextValue {
  const context = useContext(ActionTransitionContext)
  const [localPending, localStartTransition] = useTransition()

  const localRunWithTransition = useCallback(
    <T extends (...args: unknown[]) => unknown>(fn: T) => {
      return (...args: Parameters<T>): void => {
        localStartTransition(() => {
          void fn(...args)
        })
      }
    },
    [localStartTransition]
  )

  if (context) {
    return context
  }

  return {
    isPending: localPending,
    startTransition: localStartTransition,
    runWithTransition: localRunWithTransition,
  }
}

/**
 * Utility function to wrap an action in React.startTransition.
 */
export function withActionTransition<T extends (...args: unknown[]) => unknown>(fn: T) {
  return (...args: Parameters<T>): void => {
    React.startTransition(() => {
      void fn(...args)
    })
  }
}
