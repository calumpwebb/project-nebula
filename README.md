# Project Nebula

[![Download](https://img.shields.io/github/v/release/calumpwebb/project-nebula?label=Download&logo=github)](https://github.com/calumpwebb/project-nebula/releases/latest)
[![Release](https://img.shields.io/github/actions/workflow/status/calumpwebb/project-nebula/release-desktop.yml?label=Release&logo=github-actions)](https://github.com/calumpwebb/project-nebula/actions/workflows/release-desktop.yml)

Coming soon.

## Desktop Release Secrets

GitHub Actions secrets required for `just release-desktop`:

| Secret | Description |
|--------|-------------|
| `VITE_CONVEX_URL` | Convex backend URL (e.g., `http://127.0.0.1:3210` for local) |
| `VITE_CONVEX_SITE_URL` | Convex HTTP/auth URL (e.g., `http://127.0.0.1:3211` for local) |
| `APPLE_CERTIFICATE` | Base64-encoded .p12 Developer ID Application cert |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Your Name (TEAM_ID)` |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | 10-character Apple Team ID |
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri update signing private key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for Tauri signing key |

**Note:** For local testing, use `127.0.0.1` URLs pointing to your Tilt k8s port-forwards. For production, these should point to your publicly accessible Convex deployment.
