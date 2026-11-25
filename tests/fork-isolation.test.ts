/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

describe("BR-desktop-57 fork isolation layout", () => {
  it("keeps desktop CSS in desktop.css and imports it from index.css", () => {
    const desktopCss = path.join(root, "web/src/desktop.css")
    const indexCss = path.join(root, "web/src/index.css")
    expect(existsSync(desktopCss)).toBe(true)
    expect(readFileSync(indexCss, "utf8")).toMatch(/@import\s+["']\.\/desktop\.css["']/)
    expect(readFileSync(desktopCss, "utf8")).toMatch(/data-glass/)
  })

  it("keeps fork Makefile targets in mk/fork.mk included from the root Makefile", () => {
    const forkMk = path.join(root, "mk/fork.mk")
    const makefile = readFileSync(path.join(root, "Makefile"), "utf8")
    expect(existsSync(forkMk)).toBe(true)
    expect(makefile).toMatch(/^-include\s+mk\/fork\.mk/m)
    const phony = makefile
      .split("\n")
      .filter((line) => line.startsWith(".PHONY:"))
      .join("\n")
    expect(phony).not.toMatch(/\bthemes-fetch\b/)
    expect(phony).not.toMatch(/\bthemes-clean\b/)
    expect(phony).not.toMatch(/\bcheck-regression-marker\b/)
    const forkMkText = readFileSync(forkMk, "utf8")
    expect(forkMkText).toMatch(/desktop-dev:/)
    expect(forkMkText).toMatch(/upstream-sync-fork:/)
    expect(forkMkText).toMatch(/^themes-fetch\b/m)
  })

  it("loads a desktop i18n namespace for every locale", () => {
    const localesRoot = path.join(root, "web/src/i18n/locales")
    const locales = readFileSync(path.join(root, "web/src/i18n/index.ts"), "utf8")
    expect(locales).toMatch(/["']desktop["']/)
    for (const locale of [
      "en", "ca", "cs", "de", "fr", "it", "ko", "pt-BR", "uk", "zh-CN", "zh-TW",
    ]) {
      const desktopJson = path.join(localesRoot, locale, "desktop.json")
      expect(existsSync(desktopJson), `missing ${locale}/desktop.json`).toBe(true)
      const data = JSON.parse(readFileSync(desktopJson, "utf8")) as Record<string, unknown>
      expect(Object.keys(data).length).toBeGreaterThan(0)
    }
  })

  it("keeps license env override helpers in a sibling Go file", () => {
    const override = path.join(root, "internal/services/license/license_env_override.go")
    expect(existsSync(override)).toBe(true)
    expect(readFileSync(override, "utf8")).toMatch(/func\s+/)
  })

  it("exposes DesktopUpdateBanner as a fork-owned module", () => {
    const banner = path.join(root, "web/src/components/ui/DesktopUpdateBanner.tsx")
    expect(existsSync(banner)).toBe(true)
    const updateBanner = readFileSync(path.join(root, "web/src/components/ui/UpdateBanner.tsx"), "utf8")
    expect(updateBanner).toMatch(/DesktopUpdateBanner/)
  })
})
