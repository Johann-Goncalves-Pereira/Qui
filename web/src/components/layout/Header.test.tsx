/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  viewMode: "standard" as "standard" | "dense",
  logout: vi.fn(),
  navigate: vi.fn(),
  instances: [] as Array<{ id: number; name: string; isActive: boolean }>,
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
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

vi.mock("@/contexts/LayoutRouteContext", () => ({
  useLayoutRoute: () => ({
    state: { instanceId: null, showInstanceControls: false },
  }),
}))

vi.mock("@/contexts/TorrentSelectionContext", () => ({
  useTorrentSelectionContext: () => ({
    selection: new Set(),
    dispatch: vi.fn(),
  }),
  useTorrentSelectionSummary: () => ({
    totalCount: 0,
    selectedCount: 0,
    allSelected: false,
    someSelected: false,
  }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    logout: mocks.logout,
  }),
}))

vi.mock("@/hooks/useCrossSeedInstanceState", () => ({
  useCrossSeedInstanceState: () => ({
    state: {},
  }),
}))

vi.mock("@/hooks/useActiveTaskCount", () => ({
  useActiveTaskCount: () => 0,
}))

vi.mock("@/hooks/useInstances", () => ({
  useInstances: () => ({
    instances: mocks.instances,
  }),
}))

vi.mock("@/hooks/usePersistedCompactViewState", () => ({
  usePersistedCompactViewState: () => ({
    viewMode: mocks.viewMode,
  }),
}))

vi.mock("@/hooks/usePersistedFilterSidebarState", () => ({
  usePersistedFilterSidebarState: () => [false, vi.fn()],
}))

vi.mock("@/hooks/usePersistedUnifiedInstanceFilter", () => ({
  usePersistedUnifiedInstanceFilter: () => [[], vi.fn()],
}))

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "default" }),
}))

vi.mock("@/lib/spreadsheet-disguise", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/spreadsheet-disguise")>()
  return {
    ...actual,
    useSpreadsheetDisguise: () => false,
  }
})

vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}))

import { TooltipProvider } from "@/components/ui/tooltip"
import { Header } from "./Header"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.viewMode = "standard"
})

function renderHeader(props: { sidebarCollapsed?: boolean; children?: ReactNode } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Header {...props} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe("Header layout height (BR-web-02)", () => {
  it("renders header banner with lg:h-12 and never lg:h-16 in standard mode", () => {
    mocks.viewMode = "standard"
    renderHeader()

    const banner = screen.getByRole("banner")
    expect(banner.className).toContain("lg:h-12")
    expect(banner.className).not.toContain("lg:h-16")
  })

  it("renders header banner with lg:h-12 in dense mode", () => {
    mocks.viewMode = "dense"
    renderHeader()

    const banner = screen.getByRole("banner")
    expect(banner.className).toContain("lg:h-12")
    expect(banner.className).not.toContain("lg:h-16")
  })
})

describe("Header collapsed sidebar layout and traffic light clearance", () => {
  const originalUserAgent = window.navigator.userAgent

  afterEach(() => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it("renders header with lg:pl-0 when sidebar is open (expanded)", () => {
    renderHeader({ sidebarCollapsed: false })

    const banner = screen.getByRole("banner")
    expect(banner.className).toContain("lg:pl-0")
    expect(banner.className).not.toContain("lg:pl-20")
    expect(banner.className).not.toContain("lg:pl-4")
  })

  it("pushes header with lg:pl-20, omits 'qui' text, and provides drag area on macOS desktop", () => {
    (window as unknown as { quiDesktop?: unknown }).quiDesktop = {}
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    })

    const { container } = renderHeader({
      sidebarCollapsed: true,
      children: <button data-testid="uncollapse-btn">Toggle</button>,
    })

    const banner = screen.getByRole("banner")
    // 1. Pushed right with 80px padding (lg:pl-20) to clear macOS traffic lights
    expect(banner.className).toContain("lg:pl-20")
    expect(banner.className).not.toContain("lg:pl-0")

    // 2. Drag region in empty traffic light zone
    const dragArea = container.querySelector("[data-slot=\"traffic-lights-drag-region\"]")
    expect(dragArea).not.toBeNull()
    expect(dragArea?.className).toContain("w-20")

    // 3. Uncollapse toggle button is rendered
    expect(screen.getByTestId("uncollapse-btn")).not.toBeNull()

    // 4. Logo is rendered
    const logoSvg = container.querySelector("svg")
    expect(logoSvg).not.toBeNull()

    // 5. 'qui' text is omitted
    expect(banner.textContent).not.toContain("qui")
  })

  it("applies clean lg:pl-4 on Windows desktop without 80px gap and omits 'qui' text", () => {
    (window as unknown as { quiDesktop?: unknown }).quiDesktop = {}
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    })

    const { container } = renderHeader({
      sidebarCollapsed: true,
      children: <button data-testid="uncollapse-btn">Toggle</button>,
    })

    const banner = screen.getByRole("banner")
    // 1. Windows does not have top-left traffic lights; uses standard padding
    expect(banner.className).toContain("lg:pl-4")
    expect(banner.className).not.toContain("lg:pl-20")

    // 2. Uncollapse button and logo exist
    expect(screen.getByTestId("uncollapse-btn")).not.toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()

    // 3. 'qui' text is omitted
    expect(banner.textContent).not.toContain("qui")
  })

  it("applies lg:pl-4 in standalone browser mode and omits 'qui' text when sidebar is collapsed", () => {
    delete (window as unknown as { quiDesktop?: unknown }).quiDesktop
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    })

    const { container } = renderHeader({
      sidebarCollapsed: true,
      children: <button data-testid="uncollapse-btn">Toggle</button>,
    })

    const banner = screen.getByRole("banner")
    // Browser viewport has no native traffic lights; uses standard padding
    expect(banner.className).toContain("lg:pl-4")
    expect(banner.className).not.toContain("lg:pl-20")
    expect(banner.textContent).not.toContain("qui")
    expect(container.querySelector("svg")).not.toBeNull()
  })
})
