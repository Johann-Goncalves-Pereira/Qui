// Copyright (c) 2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package version

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChecker_NonAutobrrDirectGitHub(t *testing.T) {
	fakeRelease := Release{
		TagName: "v0.0.14",
		HTMLURL: "https://github.com/Johann-Goncalves-Pereira/Qui/releases/tag/v0.0.14",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/repos/Johann-Goncalves-Pereira/Qui/releases/latest", r.URL.Path)
		assert.Equal(t, "application/vnd.github.v3+json", r.Header.Get("Accept"))
		assert.Equal(t, "qui-test-agent", r.Header.Get("User-Agent"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(fakeRelease)
	}))
	defer server.Close()

	checker := NewChecker("Johann-Goncalves-Pereira", "Qui", "qui-test-agent")
	checker.BaseURL = server.URL
	checker.httpClient = server.Client()

	hasUpdate, release, err := checker.CheckNewVersion(context.Background(), "0.0.13")
	require.NoError(t, err)
	assert.True(t, hasUpdate)
	require.NotNil(t, release)
	assert.Equal(t, "v0.0.14", release.TagName)
}

func TestChecker_URLRouting(t *testing.T) {
	cAutobrr := NewChecker("autobrr", "qui", "")
	assert.Equal(t, "autobrr", cAutobrr.Owner)

	cFork := NewChecker("Johann-Goncalves-Pereira", "Qui", "")
	assert.Equal(t, "Johann-Goncalves-Pereira", cFork.Owner)

	targetRelease := &Release{
		TagName:     "v0.0.14",
		PublishedAt: time.Now(),
	}
	newer, ver, err := cFork.compareVersions("0.0.13", targetRelease)
	require.NoError(t, err)
	assert.True(t, newer)
	assert.Equal(t, "0.0.14", ver)

	same, verSame, err := cFork.compareVersions("0.0.14", targetRelease)
	require.NoError(t, err)
	assert.False(t, same)
	assert.Empty(t, verSame)
}
