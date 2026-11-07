# Backend Licensing & Offline Key Verification

**Status:** shipped

Qui supports theme customization and Glassmorphism vibrancy effects. While community themes are available, premium themes and Glassmorphism customization require premium access.

## Verification Modes

1. **Online Verification (Dodo Payments):**
   Standard commercial licenses purchased through the project are activated and periodically validated against Dodo Payments API endpoints.
2. **Environment Variable Override (Local Development):**
   Local development environments can configure `QUI_PREMIUM_OVERRIDE=true`, `QUI_DEV_LICENSE_KEY`, or `QUI_LICENSE_KEY` in their container environment or local runtime to bypass license checks.
3. **Pre-Authorized Cryptographic Hashes (Packaged Desktop & Offline Installations):**
   Packaged desktop builds (distributed via Homebrew Cask `brew install --cask qui` or standalone DMG releases) run in isolated Docker containers without local `.env` configuration files mounted. To allow users to unlock premium features without leaking plaintext developer or personal license keys into public source repositories, the backend supports built-in cryptographic SHA-256 hash verification.
   - When a user inputs a license key via the web UI or API (`POST /api/license/activate`), the key is trimmed and hashed with SHA-256.
   - The computed hash is compared against the pre-authorized hash set in constant time using `crypto/subtle.ConstantTimeCompare`.
   - On a valid match, an active license record is persisted locally with `Provider: "env"`, ensuring that background refresh and validation tasks do not attempt external network requests to Dodo Payments.

## Licensed Community Themes Packaging (`BR-desktop-33`)

In addition to license key verification, Qui embeds community themes via Go's `//go:embed assets` mechanism in `internal/themes/registry.go`.
Because `internal/themes/assets/premium/` is ignored by version control to avoid duplicate asset trees in git:
- Desktop distribution and container release scripts (`scripts/desktop-publish-qui-image` and `scripts/desktop-refresh`) invoke `make themes-fetch` before compiling the Linux backend binary.
- This clones the public repository `https://github.com/autobrr/qui-community-themes.git` into `internal/themes/assets/premium/`.
- Once embedded into the compiled `qui` executable inside the Docker image, the themes are immediately available through `GET /api/themes` upon license unlock, eliminating missing licensed themes warnings (`Licensed themes not loaded`).

