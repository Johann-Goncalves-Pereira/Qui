/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

let updateBannerMounted = false

export function setUpdateBannerMounted(mounted: boolean): void {
  updateBannerMounted = mounted
}

export function isUpdateBannerMounted(): boolean {
  return updateBannerMounted
}
