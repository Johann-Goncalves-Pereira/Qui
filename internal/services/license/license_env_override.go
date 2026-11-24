// Copyright (c) 2025-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package license

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"os"
	"strings"
)

const (
	EnvPremiumOverride = "QUI_PREMIUM_OVERRIDE"
	EnvDevLicenseKey   = "QUI_DEV_LICENSE_KEY"
	EnvLicenseKey      = "QUI_LICENSE_KEY"
)

// preAuthorizedLicenseHashes stores SHA-256 digests of pre-authorized offline license keys.
// Raw keys are never stored in version-controlled source code.
var preAuthorizedLicenseHashes = []string{
	"c2572f4e9c4244e258659857c5f04877432468e26a1dd8a1fee01a179613c78e",
}

func isEnvPremiumOverride() bool {
	val := strings.TrimSpace(os.Getenv(EnvPremiumOverride))
	if strings.EqualFold(val, "true") || val == "1" || strings.EqualFold(val, "yes") {
		return true
	}
	if strings.TrimSpace(os.Getenv(EnvLicenseKey)) != "" || strings.TrimSpace(os.Getenv(EnvDevLicenseKey)) != "" {
		return true
	}
	return false
}

func isPreAuthorizedLicenseKey(key string) bool {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return false
	}
	hash := sha256.Sum256([]byte(trimmed))
	hashHex := hex.EncodeToString(hash[:])
	for _, authorizedHash := range preAuthorizedLicenseHashes {
		if subtle.ConstantTimeCompare([]byte(hashHex), []byte(authorizedHash)) == 1 {
			return true
		}
	}
	return false
}

func isMatchingEnvLicenseKey(key string) bool {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return false
	}
	if devKey := strings.TrimSpace(os.Getenv(EnvDevLicenseKey)); devKey != "" && trimmed == devKey {
		return true
	}
	if envKey := strings.TrimSpace(os.Getenv(EnvLicenseKey)); envKey != "" && trimmed == envKey {
		return true
	}
	return false
}

func isOfflineAuthorizedKey(key string) bool {
	return isMatchingEnvLicenseKey(key) || isPreAuthorizedLicenseKey(key)
}
