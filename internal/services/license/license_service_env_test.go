// Copyright (c) 2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package license

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/autobrr/qui/internal/database"
	"github.com/autobrr/qui/internal/models"
	"github.com/autobrr/qui/internal/testutil/testdb"
)

func TestHasPremiumAccess_EnvOverrides(t *testing.T) {
	ctx := t.Context()
	db := testdb.NewMigratedSQLite(t, "license-env-test")
	repo := database.NewLicenseRepo(db)
	service := NewLicenseService(repo, nil, t.TempDir())

	// Without any env vars or DB licenses
	hasPremium, err := service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.False(t, hasPremium)

	// With QUI_PREMIUM_OVERRIDE=true
	t.Setenv(EnvPremiumOverride, "true")
	hasPremium, err = service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.True(t, hasPremium)

	// With QUI_PREMIUM_OVERRIDE=1
	t.Setenv(EnvPremiumOverride, "1")
	hasPremium, err = service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.True(t, hasPremium)

	// Reset override, set QUI_DEV_LICENSE_KEY
	t.Setenv(EnvPremiumOverride, "")
	t.Setenv(EnvDevLicenseKey, "DEV-LOCAL-SECRET-KEY")
	hasPremium, err = service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.True(t, hasPremium)

	// Reset dev key, set QUI_LICENSE_KEY
	t.Setenv(EnvDevLicenseKey, "")
	t.Setenv(EnvLicenseKey, "ENV-KEY-12345")
	hasPremium, err = service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.True(t, hasPremium)
}

func TestActivateAndStoreLicense_EnvKey(t *testing.T) {
	ctx := t.Context()
	db := testdb.NewMigratedSQLite(t, "license-env-activate")
	repo := database.NewLicenseRepo(db)
	// Notice nil dodo client: if it attempts to call Dodo it would panic or return ErrDodoClientNotConfigured
	service := NewLicenseService(repo, nil, t.TempDir())

	testDevKey := "LOCAL-DEV-KEY-XYZ"
	t.Setenv(EnvDevLicenseKey, testDevKey)

	// Activate matching dev key
	lic, err := service.ActivateAndStoreLicense(ctx, testDevKey, "localuser")
	require.NoError(t, err)
	require.NotNil(t, lic)
	assert.Equal(t, testDevKey, lic.LicenseKey)
	assert.Equal(t, ProductNamePremium, lic.ProductName)
	assert.Equal(t, models.LicenseStatusActive, lic.Status)
	assert.Equal(t, "env", lic.Provider)

	// Validate matching dev key
	validLic, err := service.ValidateAndStoreLicense(ctx, testDevKey, "localuser")
	require.NoError(t, err)
	assert.Equal(t, lic.LicenseKey, validLic.LicenseKey)

	// Refreshing all licenses should skip env provider without error
	err = service.RefreshAllLicenses(ctx)
	require.NoError(t, err)

	// Validating licenses should also skip env provider without error
	allValid, err := service.ValidateLicenses(ctx)
	require.NoError(t, err)
	assert.True(t, allValid)
}
