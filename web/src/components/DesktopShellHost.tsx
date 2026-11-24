/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { ReactNode } from "react"

import { DesktopUpdateHost } from "@/components/ui/DesktopUpdateHost"

export function DesktopShellHost({ children }: { children?: ReactNode }) {
  return (
    <>
      {children}
      <DesktopUpdateHost />
    </>
  )
}
