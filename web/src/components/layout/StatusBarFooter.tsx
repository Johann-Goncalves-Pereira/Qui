/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { QBitDockerConfigDialog } from "@/components/docker/QBitDockerConfigDialog"
import { QuiDockerConfigDialog } from "@/components/docker/QuiDockerConfigDialog"
import { useDockerServices } from "@/hooks/useDockerServices"
import { changeLanguage, languageNames, supportedLanguages } from "@/i18n"
import { getAppVersion } from "@/lib/build-info"
import { cn } from "@/lib/utils"
import { useMobileScroll } from "@/contexts/MobileScrollContext"
import { Check, Code, Copyright, Globe, Layers, Radio, Server } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export function StatusBarFooter() {
  const { t, i18n } = useTranslation("common")
  const { statuses } = useDockerServices()
  const { isFooterVisible } = useMobileScroll()

  const [quiDialogOpen, setQuiDialogOpen] = useState(false)
  const [qbitDialogOpen, setQbitDialogOpen] = useState(false)

  const appVersion = getAppVersion()
  const year = new Date().getFullYear()

  return (
    <>
      <footer
        className={cn(
          "h-8 border-t border-border/50 bg-background/80 backdrop-blur px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none flex-shrink-0 z-20 transition-all",
          isFooterVisible ? "mb-[calc(4rem+env(safe-area-inset-bottom))] lg:mb-0" : "mb-0"
        )}
      >
        {/* Left: Docker Services Status & Config Triggers */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setQuiDialogOpen(true)}
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Server className="h-3 w-3 text-muted-foreground/70" />
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full flex-shrink-0",
                    statuses.qui.state === "running" ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
                <span className="font-mono text-[11px] font-medium">
                  {t("statusBar.serviceQuiLabel", { port: statuses.qui.port })}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t("statusBar.tooltipQui", {
                state: statuses.qui.state,
                port: statuses.qui.port,
              })}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setQbitDialogOpen(true)}
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Layers className="h-3 w-3 text-muted-foreground/70" />
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full flex-shrink-0",
                    statuses.qbit.state === "running" ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
                <span className="font-mono text-[11px] font-medium">
                  {t("statusBar.serviceQbitLabel", { port: statuses.qbit.port })}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t("statusBar.tooltipQbit", {
                state: statuses.qbit.state,
                port: statuses.qbit.port,
              })}
            </TooltipContent>
          </Tooltip>

          {statuses.gazelle?.state === "running" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (window.quiDesktop?.gazelle?.openWebUi) {
                      void window.quiDesktop.gazelle.openWebUi()
                    } else {
                      window.open("http://localhost:7001", "_blank")
                    }
                  }}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Radio className="h-3 w-3 text-muted-foreground/70" />
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-emerald-500" />
                  <span className="font-mono text-[11px] font-medium">
                    {t("statusBar.serviceGazelleLabel", {
                      port: statuses.gazelle.port || 7001,
                      defaultValue: `gazelle:${statuses.gazelle.port || 7001}`,
                    })}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t("statusBar.tooltipGazelle", {
                  state: statuses.gazelle.state,
                  port: statuses.gazelle.port || 7001,
                  defaultValue: `Gazelle companion (${statuses.gazelle.state}) on port ${statuses.gazelle.port || 7001}. Click to open WebUI.`,
                })}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right: Version, Copyright, Language, GitHub */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground/70">
            <span className="font-medium text-muted-foreground/90 font-mono">
              {appVersion}
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Copyright className="h-2.5 w-2.5" />
              <span>{t("statusBar.copyright", { year })}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t("sidebar.language")}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" side="top">
                {supportedLanguages.map((lng) => (
                  <DropdownMenuItem
                    key={lng}
                    onClick={() => changeLanguage(lng)}
                    className="flex items-center justify-between gap-4 text-xs"
                  >
                    {languageNames[lng]}
                    {i18n.language === lng && <Check className="h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a
                    href="https://github.com/autobrr/qui"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("sidebar.viewOnGitHub")}
                  >
                    <Code className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t("sidebar.viewOnGitHub")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </footer>

      {/* Docker Configuration Modals */}
      <QuiDockerConfigDialog
        open={quiDialogOpen}
        onOpenChange={setQuiDialogOpen}
      />
      <QBitDockerConfigDialog
        open={qbitDialogOpen}
        onOpenChange={setQbitDialogOpen}
      />
    </>
  )
}
