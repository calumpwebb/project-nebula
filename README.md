# Project Nebula

Coming soon.

## Desktop Release Secrets

GitHub Actions secrets required for `just release-desktop`:

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 Developer ID Application cert |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Your Name (TEAM_ID)` |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | 10-character Apple Team ID |
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri update signing private key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for Tauri signing key |
