/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { DEFAULT_REANNOUNCE_SETTINGS } from "@/lib/instance-validation"
import type { InstanceFormData, InstanceResponse } from "@/types"

export const COMPANION_INSTANCE_NAME = "Local qBittorrent"
export const COMPANION_INSTANCE_HOST = "http://host.docker.internal:8080"

let isProvisioning = false
let provisionAttempted = false

export function resetProvisioningState(): void {
  isProvisioning = false
  provisionAttempted = false
}

export function isDesktopEnvironment(): boolean {
  return typeof window !== "undefined" && window.quiDesktop !== undefined
}

export function shouldAutoProvisionCompanionInstance(
  instances: InstanceResponse[] | undefined
): boolean {
  if (!isDesktopEnvironment()) {
    return false
  }
  if (instances === undefined) {
    return false
  }
  if (provisionAttempted || isProvisioning) {
    return false
  }
  // If an instance with local filesystem access already exists, no need to auto-provision
  const hasLocalFs = instances.some((i) => i.hasLocalFilesystemAccess)
  if (hasLocalFs) {
    return false
  }
  // Also check if an instance matching the companion host or name already exists
  const hasCompanion = instances.some(
    (i) =>
      i.name === COMPANION_INSTANCE_NAME ||
      i.host === COMPANION_INSTANCE_HOST ||
      i.host.includes(":8080")
  )
  if (hasCompanion) {
    return false
  }
  return true
}

export function buildDefaultCompanionInstance(): InstanceFormData {
  return {
    name: COMPANION_INSTANCE_NAME,
    host: COMPANION_INSTANCE_HOST,
    username: "admin",
    password: "",
    tlsSkipVerify: false,
    hasLocalFilesystemAccess: true,
    useHardlinks: false,
    hardlinkBaseDir: "",
    hardlinkDirPreset: "flat",
    useReflinks: false,
    fallbackToRegularMode: true,
    reannounceSettings: { ...DEFAULT_REANNOUNCE_SETTINGS },
  }
}

export async function autoProvisionCompanionInstanceIfEligible(
  instances: InstanceResponse[] | undefined,
  createInstance: (data: InstanceFormData) => Promise<unknown> | void
): Promise<boolean> {
  if (!shouldAutoProvisionCompanionInstance(instances)) {
    return false
  }
  isProvisioning = true
  provisionAttempted = true
  try {
    const payload = buildDefaultCompanionInstance()
    await createInstance(payload)
    return true
  } catch (err) {
    console.error("Failed to auto-provision companion qBittorrent instance:", err)
    return false
  } finally {
    isProvisioning = false
  }
}

/**
 * Returns default instance URL for new instance forms (companion host in desktop, localhost in browser).
 */
export function defaultInstanceHost(): string {
  return isDesktopEnvironment() ? COMPANION_INSTANCE_HOST : "http://localhost:8080"
}

/**
 * Normalizes loopback host addresses (localhost, 127.0.0.1, [::1]) to host.docker.internal
 * when running inside the desktop shell so containerized Qui does not encounter connection refusal.
 */
export function normalizeDesktopHost(host: string): string {
  if (!isDesktopEnvironment()) {
    return host
  }
  const trimmed = host.trim()
  try {
    const url = new URL(trimmed)
    const h = url.hostname.toLowerCase()
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") {
      url.hostname = "host.docker.internal"
      return url.toString().replace(/\/$/, "")
    }
  } catch {
    return trimmed
      .replace(/^http:\/\/localhost(?::(\d+))?/, "http://host.docker.internal:$1")
      .replace(/^http:\/\/127\.0\.0\.1(?::(\d+))?/, "http://host.docker.internal:$1")
  }
  return trimmed
}
