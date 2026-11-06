/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { afterEach, describe, expect, it } from 'vitest'
import { getAppVersion } from './build-info'

describe('getAppVersion (BR-desktop-22, BR-web-07)', () => {
  afterEach(() => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    delete (window as unknown as { __QUI_VERSION__?: unknown }).__QUI_VERSION__
  })

  it('prefers version from window.quiDesktop.getAppVersion when available', () => {
    window.quiDesktop = {
      getAppVersion: () => '0.0.1',
    }
    expect(getAppVersion()).toBe('0.0.1')
  })

  it('falls back to window.__QUI_VERSION__ when valid and bridge is absent', () => {
    window.__QUI_VERSION__ = '1.35.0'
    expect(getAppVersion()).toBe('1.35.0')
  })

  it('filters out desktop-local and falls back to 0.0.0', () => {
    window.__QUI_VERSION__ = 'desktop-local'
    expect(getAppVersion()).toBe('0.0.0')
  })

  it('falls back to 0.0.0 when neither bridge nor window version is provided', () => {
    expect(getAppVersion()).toBe('0.0.0')
  })
})
