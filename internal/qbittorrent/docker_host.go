// Copyright (c) 2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package qbittorrent

import (
	"net"
	"net/url"
	"os"
)

var (
	isDockerEnvironment = func() bool {
		_, err := os.Stat("/.dockerenv")
		return err == nil
	}
	lookupHost = func(host string) ([]string, error) {
		return net.LookupHost(host)
	}
)

// ResolveDockerHost rewrites loopback host addresses (localhost, 127.0.0.1, ::1)
// to host.docker.internal when running inside Docker with a resolvable host gateway.
// In containerized environments, loopback targets the Qui container itself rather
// than the host machine or companion containers, resulting in dial connection refused.
func ResolveDockerHost(host string) string {
	u, err := url.Parse(host)
	if err != nil {
		return host
	}
	hostname := u.Hostname()
	if hostname != "localhost" && hostname != "127.0.0.1" && hostname != "::1" {
		return host
	}
	if !isDockerEnvironment() {
		return host
	}
	if _, err := lookupHost("host.docker.internal"); err != nil {
		return host
	}
	port := u.Port()
	if port != "" {
		u.Host = net.JoinHostPort("host.docker.internal", port)
	} else {
		u.Host = "host.docker.internal"
	}
	return u.String()
}
