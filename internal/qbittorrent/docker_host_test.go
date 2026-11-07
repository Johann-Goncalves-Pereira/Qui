// Copyright (c) 2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package qbittorrent

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveDockerHost(t *testing.T) {
	origIsDocker := isDockerEnvironment
	origLookupHost := lookupHost
	defer func() {
		isDockerEnvironment = origIsDocker
		lookupHost = origLookupHost
	}()

	t.Run("returns original host when not in docker", func(t *testing.T) {
		isDockerEnvironment = func() bool { return false }
		lookupHost = func(_ string) ([]string, error) { return []string{"192.168.5.2"}, nil }

		require.Equal(t, "http://localhost:8080", ResolveDockerHost("http://localhost:8080"))
		require.Equal(t, "http://127.0.0.1:8080", ResolveDockerHost("http://127.0.0.1:8080"))
	})

	t.Run("returns original host when host.docker.internal does not resolve", func(t *testing.T) {
		isDockerEnvironment = func() bool { return true }
		lookupHost = func(_ string) ([]string, error) { return nil, errors.New("not found") }

		require.Equal(t, "http://localhost:8080", ResolveDockerHost("http://localhost:8080"))
	})

	t.Run("leaves non-loopback hosts unchanged even in docker", func(t *testing.T) {
		isDockerEnvironment = func() bool { return true }
		lookupHost = func(_ string) ([]string, error) { return []string{"192.168.5.2"}, nil }

		require.Equal(t, "http://192.168.1.50:8080", ResolveDockerHost("http://192.168.1.50:8080"))
		require.Equal(t, "https://seedbox.example.com/qbt", ResolveDockerHost("https://seedbox.example.com/qbt"))
		require.Equal(t, "http://qbittorrent-nox:8080", ResolveDockerHost("http://qbittorrent-nox:8080"))
	})

	t.Run("rewrites localhost, 127.0.0.1, and [::1] when in docker and resolvable", func(t *testing.T) {
		isDockerEnvironment = func() bool { return true }
		lookupHost = func(_ string) ([]string, error) { return []string{"192.168.5.2"}, nil }

		require.Equal(t, "http://host.docker.internal:8080", ResolveDockerHost("http://localhost:8080"))
		require.Equal(t, "http://host.docker.internal:8080/api/v2", ResolveDockerHost("http://127.0.0.1:8080/api/v2"))
		require.Equal(t, "http://host.docker.internal:8080", ResolveDockerHost("http://[::1]:8080"))
		require.Equal(t, "http://host.docker.internal", ResolveDockerHost("http://localhost"))
	})
}
