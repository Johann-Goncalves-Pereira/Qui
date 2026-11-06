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
