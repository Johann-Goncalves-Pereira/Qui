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

func TestActivateAndStoreLicense_PreAuthorizedHashKey(t *testing.T) {
	ctx := t.Context()
	db := testdb.NewMigratedSQLite(t, "license-hash-activate")
	repo := database.NewLicenseRepo(db)
	// Dodo client is nil: if an online call is made it would fail or return ErrDodoClientNotConfigured
	service := NewLicenseService(repo, nil, t.TempDir())

	// Ensure no env overrides are set
	t.Setenv(EnvPremiumOverride, "")
	t.Setenv(EnvDevLicenseKey, "")
	t.Setenv(EnvLicenseKey, "")

	// Known pre-authorized license key
	authorizedKey := "Professed5-Rinse7-Dreamboat7-Paralyze1-Violet0-Uncombed3-Jalapeno2-Porridge2-Nacho5-Vanquish7"

	// Initial premium check should be false
	hasPremium, err := service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.False(t, hasPremium)

	// Activate using the pre-authorized key (with whitespace padding to test trimming)
	lic, err := service.ActivateAndStoreLicense(ctx, "  "+authorizedKey+"  ", "localuser")
	require.NoError(t, err)
	require.NotNil(t, lic)
	assert.Equal(t, authorizedKey, lic.LicenseKey)
	assert.Equal(t, ProductNamePremium, lic.ProductName)
	assert.Equal(t, models.LicenseStatusActive, lic.Status)
	assert.Equal(t, "env", lic.Provider)

	// HasPremiumAccess should now be true
	hasPremium, err = service.HasPremiumAccess(ctx)
	require.NoError(t, err)
	assert.True(t, hasPremium)

	// ValidateAndStoreLicense should also succeed for the pre-authorized key
	validLic, err := service.ValidateAndStoreLicense(ctx, authorizedKey, "localuser")
	require.NoError(t, err)
	assert.Equal(t, lic.LicenseKey, validLic.LicenseKey)

	// Refreshing all licenses should skip the pre-authorized key
	err = service.RefreshAllLicenses(ctx)
	require.NoError(t, err)

	// ValidateLicenses should report true
	allValid, err := service.ValidateLicenses(ctx)
	require.NoError(t, err)
	assert.True(t, allValid)

	// Unrecognized key should fail (fallback to nil dodoClient -> ErrDodoClientNotConfigured)
	_, err = service.ActivateAndStoreLicense(ctx, "INVALID-UNAUTHORIZED-KEY-12345", "localuser")
	require.Error(t, err)
}
