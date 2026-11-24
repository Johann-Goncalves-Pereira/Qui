/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

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
