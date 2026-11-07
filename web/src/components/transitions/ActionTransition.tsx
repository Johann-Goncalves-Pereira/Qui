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
  type TransitionStartFunction
} from "react"

export interface ActionTransitionContextValue {
  isPending: boolean
  startTransition: TransitionStartFunction
  runWithTransition: <Args extends unknown[]>(
    fn: (...args: Args) => unknown
  ) => (...args: Args) => void
}

const ActionTransitionContext = createContext<ActionTransitionContextValue | null>(null)

export interface ActionTransitionProviderProps {
  children?: ReactNode
}

/**
 * ActionTransitionProvider exposes a shared React transition runner for
 * opt-in action boundaries (via useActionTransition / withActionTransition).
 * It does not intercept DOM events globally.
 */
export function ActionTransitionProvider({ children }: ActionTransitionProviderProps) {
  const [isPending, startTransition] = useTransition()

  const runWithTransition = useCallback(
    <Args extends unknown[]>(fn: (...args: Args) => unknown) => {
      return (...args: Args): void => {
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
 * Hook to access the current ActionTransition context, or a local transition
 * runner when no provider is mounted.
 */
export function useActionTransition(): ActionTransitionContextValue {
  const context = useContext(ActionTransitionContext)
  const [localPending, localStartTransition] = useTransition()

  const localRunWithTransition = useCallback(
    <Args extends unknown[]>(fn: (...args: Args) => unknown) => {
      return (...args: Args): void => {
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
export function withActionTransition<Args extends unknown[]>(
  fn: (...args: Args) => unknown
) {
  return (...args: Args): void => {
    React.startTransition(() => {
      void fn(...args)
    })
  }
}
