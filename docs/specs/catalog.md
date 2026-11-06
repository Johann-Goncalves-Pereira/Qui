# Spec catalog — Business Rules & Use Cases

Every behavioral claim in the wiki has a row here before implementation. The
test named in the row is written in the same step, and it fails until the
behavior exists.

| Kind | Meaning |
| ---- | ------- |
| `asserted-integration` | Across modules, or UI to domain |
| `asserted-unit` | One module |
| `asserted-loopback` | Live protocol on loopback |
| `fail-closed` | Deferred or refused; the test proves refusal |

**ID scheme**

| Prefix | Meaning |
| ------ | ------- |
| `BR-<area>-<nn>` | Invariant |
| `UC-<area>-<nn>` | Acceptance journey |

## Catalog

| ID | Rule (one line) | Source | Owner | Test | Kind |
| -- | --------------- | ------ | ----- | ---- | ---- |
| `BR-desktop-01` | Desktop shell enforces Touch ID biometric fingerprint authentication before granting access | issue #1 | desktop/auth | tests/auth.test.ts | `asserted-unit` |
| `BR-desktop-02` | Docker manager verifies and bootstraps Qui and qbittorrent-nox containers on startup | issue #1 | desktop/docker | tests/docker.test.ts | `asserted-unit` |
| `BR-desktop-03` | Docker update checker queries remote image digests and triggers update prompt when newer image exists | issue #1 | desktop/docker | tests/docker.test.ts | `asserted-unit` |
| `BR-desktop-04` | macOS Status Bar Tray renders real-time download and upload transfer rates with quick control actions | issue #1 | desktop/tray | tests/tray.test.ts | `asserted-unit` |
| `BR-desktop-05` | Window configures transparent frameless viewport with macOS vibrancy and Glassmorphism blur | issue #1 | desktop/window | tests/schema.test.ts | `asserted-unit` |
| `BR-desktop-06` | Brand and product name is strictly capitalized as Qui across all platforms | issue #1 | desktop/main | tests/schema.test.ts | `asserted-unit` |

