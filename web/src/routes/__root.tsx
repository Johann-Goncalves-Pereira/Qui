/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { createRootRoute, redirect } from "@tanstack/react-router"
import { DesktopShellHost } from "@/components/DesktopShellHost"
import { RootLayout } from "@/layouts/RootLayout"
import { NotFound } from "@/pages/NotFound"

export const Route = createRootRoute({
  staticData: { title: null },
  beforeLoad: ({ location }) => {
    if (location.pathname.endsWith("/index.html")) {
      throw redirect({ to: "/", search: location.search })
    }
  },
  component: () => (
    <DesktopShellHost>
      <RootLayout />
    </DesktopShellHost>
  ),
  notFoundComponent: NotFound,
})
