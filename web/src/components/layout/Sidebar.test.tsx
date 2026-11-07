/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  theme: "default",
  logout: vi.fn(),
  navigate: vi.fn(),
  pathname: "/dashboard",
  instances: [] as Array<{ id: number; name: string; isActive: boolean }>,
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
  useSearch: () => ({}),
}))

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en" },
    }),
  }
})

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    logout: mocks.logout,
  }),
}))

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mocks.theme }),
}))

vi.mock("@/hooks/useCrossSeedInstanceState", () => ({
  useCrossSeedInstanceState: () => ({
    state: {},
  }),
}))

vi.mock("@/hooks/usePersistedUnifiedInstanceFilter", () => ({
  usePersistedUnifiedInstanceFilter: () => [[], vi.fn()],
}))

vi.mock("@/lib/api", () => ({
  api: {
    getInstances: vi.fn(async () => mocks.instances),
  },
}))

vi.mock("@/components/ui/UpdateBanner", () => ({
  UpdateBanner: () => null,
}))

import { TooltipProvider } from "@/components/ui/tooltip"
import { Sidebar } from "./Sidebar"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.theme = "default"
  mocks.pathname = "/dashboard"
})

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sidebar />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe("Sidebar brand header layout", () => {
  it("renders a 48px centered brand row with only the logo pushed to the right and text omitted", () => {
    const { container } = renderSidebar()

    // 1. The brand header row is exactly h-12 (48px) with items-center and px-4
    const headerRow = container.querySelector("div.flex.h-12.items-center.px-4")
    expect(headerRow).not.toBeNull()
    expect(headerRow?.className).not.toContain("p-6")

    // 2. The brand mark container has ml-auto pushing it to the right
    const logoContainer = headerRow?.querySelector("span.ml-auto.flex.items-center")
    expect(logoContainer).not.toBeNull()

    // 3. The SVG logo exists inside the logo container
    const svgLogo = logoContainer?.querySelector("svg")
    expect(svgLogo).not.toBeNull()
    expect(svgLogo?.classList.contains("h-5")).toBe(true)
    expect(svgLogo?.classList.contains("w-5")).toBe(true)

    // 4. The header text "qui" is omitted from the brand header
    const brandHeader = headerRow?.querySelector("h2")
    expect(brandHeader?.textContent?.trim()).toBe("")
    expect(brandHeader?.textContent).not.toContain("qui")
  })

  it("selects SwizzinLogo when swizzin theme is active and keeps it pushed right with no text", () => {
    mocks.theme = "swizzin"
    const { container } = renderSidebar()

    const headerRow = container.querySelector("div.flex.h-12.items-center.px-4")
    expect(headerRow).not.toBeNull()

    const logoContainer = headerRow?.querySelector("span.ml-auto.flex.items-center")
    expect(logoContainer).not.toBeNull()

    const imgLogo = logoContainer?.querySelector("img")
    expect(imgLogo).not.toBeNull()
    expect(imgLogo?.getAttribute("alt")).toBe("Swizzin")

    const brandHeader = headerRow?.querySelector("h2")
    expect(brandHeader?.textContent?.trim()).toBe("")
  })

  it("selects NapsterLogo when napster theme is active and keeps it pushed right with no text", () => {
    mocks.theme = "napster"
    const { container } = renderSidebar()

    const headerRow = container.querySelector("div.flex.h-12.items-center.px-4")
    expect(headerRow).not.toBeNull()

    const logoContainer = headerRow?.querySelector("span.ml-auto.flex.items-center")
    expect(logoContainer).not.toBeNull()

    const imgLogo = logoContainer?.querySelector("img")
    expect(imgLogo).not.toBeNull()
    expect(imgLogo?.getAttribute("alt")).toBe("Napster")

    const brandHeader = headerRow?.querySelector("h2")
    expect(brandHeader?.textContent?.trim()).toBe("")
  })
})
