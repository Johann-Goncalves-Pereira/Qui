/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldHelp } from "@/components/ui/field-help"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ExternalLink, Lock, Shield, ShieldAlert, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"

export function VpnSettingsCard() {
  const isDesktop = typeof window !== "undefined" && Boolean(window.quiDesktop?.saveVpnConfig)

  const [enabled, setEnabled] = useState(false)
  const [provider, setProvider] = useState("protonvpn")
  const [wireguardPrivateKey, setWireguardPrivateKey] = useState("")
  const [wireguardAddress, setWireguardAddress] = useState("10.2.0.2/32")
  const [serverCountry, setServerCountry] = useState("Netherlands")
  const [killSwitchOnly, setKillSwitchOnly] = useState(true)
  const [vpnStatus, setVpnStatus] = useState<string>("stopped")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isDesktop) return

    void (async () => {
      try {
        const config = await window.quiDesktop?.getVpnConfig?.()
        if (config) {
          setEnabled(config.enabled)
          setProvider(config.provider || "protonvpn")
          setWireguardPrivateKey(config.wireguardPrivateKey || "")
          setWireguardAddress(config.wireguardAddress || "10.2.0.2/32")
          setServerCountry(config.serverCountry || "Netherlands")
          setKillSwitchOnly(config.killSwitchOnly ?? true)
        }
        const status = await window.quiDesktop?.getVpnStatus?.()
        if (status) {
          setVpnStatus(status.state)
        }
      } catch (err) {
        console.error("Failed to load VPN settings:", err)
      }
    })()
  }, [isDesktop])

  const handleOpenAuth = async () => {
    try {
      await window.quiDesktop?.openVpnAuthPage?.(provider)
    } catch (err) {
      console.error("Failed to open auth page:", err)
    }
  }

  const handleConfDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const text = await file.text()
    if (window.quiDesktop?.parseWireGuardConf) {
      const parsed = await window.quiDesktop.parseWireGuardConf(text)
      if (parsed.privateKey) {
        setWireguardPrivateKey(parsed.privateKey)
        if (parsed.address) setWireguardAddress(parsed.address)
      }
    }
  }

  const handleSave = async () => {
    if (!window.quiDesktop?.saveVpnConfig) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await window.quiDesktop.saveVpnConfig({
        enabled,
        provider,
        wireguardPrivateKey,
        wireguardAddress,
        serverCountry,
        killSwitchOnly,
      })
      if (res?.success) {
        setSaveMessage("VPN configuration applied and torrent engine restarted.")
        const status = await window.quiDesktop.getVpnStatus?.()
        if (status) setVpnStatus(status.state)
      } else {
        setSaveMessage(res?.error || "Failed to apply VPN configuration.")
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Error applying VPN configuration.")
    } finally {
      setSaving(false)
    }
  }

  if (!isDesktop) {
    return null
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>VPN & Privacy Protection</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {vpnStatus === "running" ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected (Kill Switch Active)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                <ShieldAlert className="h-3.5 w-3.5" />
                {enabled ? "Connecting / Starting..." : "Inactive"}
              </span>
            )}
          </div>
        </div>
        <CardDescription>
          Route qBittorrent through an isolated VPN tunnel using Podman. Only torrent traffic goes through the VPN.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="vpn-toggle" className="font-medium">
              Only run torrenting when VPN is connected
            </Label>
            <FieldHelp>
              When active, qBittorrent is strictly attached to the VPN sidecar container. All peer and tracker traffic stops instantly if the VPN drops.
            </FieldHelp>
          </div>
          <Switch
            id="vpn-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold">Proton VPN Authentication</h4>
                <p className="text-xs text-muted-foreground">
                  Open Proton account in your browser to generate a WireGuard configuration token.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAuth}
                className="gap-1.5"
              >
                <span>Connect Proton Account</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleConfDrop}
              className="flex flex-col items-center justify-center rounded-md border border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
            >
              <Lock className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-xs font-medium">
                Drop your downloaded <code className="rounded bg-muted px-1">.conf</code> file here, or enter your WireGuard Private Key below
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wg-key" className="text-xs">WireGuard Private Key</Label>
                <Input
                  id="wg-key"
                  type="password"
                  placeholder="e.g. aaaaaaa...="
                  value={wireguardPrivateKey}
                  onChange={e => setWireguardPrivateKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wg-addr" className="text-xs">Client IP Address</Label>
                <Input
                  id="wg-addr"
                  placeholder="10.2.0.2/32"
                  value={wireguardAddress}
                  onChange={e => setWireguardAddress(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wg-country" className="text-xs">Server Country</Label>
              <Input
                id="wg-country"
                placeholder="Netherlands, Switzerland, United States..."
                value={serverCountry}
                onChange={e => setServerCountry(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {saveMessage && (
          <p className="text-xs text-muted-foreground">
            {saveMessage}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Applying..." : "Save & Apply VPN Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
