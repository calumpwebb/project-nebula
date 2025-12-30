# Desktop App Release & Auto-Update Design

## Overview

Distribution system for the Project Nebula desktop app with automatic updates, code signing, and a streamlined release workflow.

## Decisions

| Component | Decision |
|-----------|----------|
| Hosting | GitHub Releases (free, public repo) |
| Trigger | Git tags: `desktop-v1.2.0` |
| Versioning | Tag-driven (CI extracts from tag) |
| Platforms | macOS (universal binary), Linux (x86_64 AppImage) |
| Update behavior | Hard force - must update to use app |
| Update UI | Native dialog, Rust-side blocking check |
| Signing | Apple code signing + notarization, Tauri update signing |
| Release script | `just release-desktop` with validation |
| Version tracking | Client hooks inject `_appVersion` into Convex args |
| Testing | Unit + integration tests for updater logic |

## Release Flow

```
Developer runs: just release-desktop
         ↓
Script validates (on main, clean, semver, etc.)
         ↓
Creates + pushes tag: desktop-v1.2.0
         ↓
GitHub Actions triggered
         ↓
    ┌────┴────┐
    ↓         ↓
  macOS     Linux      (parallel)
  build     build
    ↓         ↓
  Sign &    Build
  Notarize  AppImage
    ↓         ↓
  Universal  x86_64
  DMG        AppImage
    └────┬────┘
         ↓
GitHub Release created
(DMG + AppImage + latest.json manifest)
```

## Release Script

**File:** `scripts/release-desktop.sh` + `justfile` target

**Behavior:**
```
just release-desktop

┌─────────────────────────────────────────┐
│  Desktop Release                        │
├─────────────────────────────────────────┤
│  Current version: 1.1.0                 │
│  Latest tag: desktop-v1.1.0             │
│  Branch: main (clean)                   │
└─────────────────────────────────────────┘

Enter new version (e.g. 1.2.0): 1.2.0

Will create tag: desktop-v1.2.0
On commit: abc123f (feat: add cool thing)

Continue? [y/N] y

✓ Created tag desktop-v1.2.0
✓ Pushed to origin

Release started! Watch progress:
https://github.com/calumpwebb/project-nebula/actions
```

**Validations:**
- Must be on `main` branch
- Working directory clean (no uncommitted changes)
- Version is valid semver
- Version greater than current
- Tag doesn't already exist

## Update Flow

```
App launches
     ↓
Rust: Check update endpoint (latest.json)
     ↓
┌────┴────────────────┐
↓                     ↓
No update          Update available
↓                     ↓
App loads          Show native dialog (blocking)
normally           "Version X.Y.Z available"
                      ↓
                   [Update Now] ← only button, no dismiss
                      ↓
                   Download (progress TBD - see NEBULA-gzy)
                      ↓
                   Install & restart
```

**Key behaviors:**
- Check happens in Rust before frontend loads
- Hard force: no "Later" button, no escape key dismiss
- If update check fails (offline), allow app to run
- Emergency escape: `--skip-update` CLI flag

## GitHub Actions Workflow

**File:** `.github/workflows/release-desktop.yml`

**Triggers:** `desktop-v*` tags

**Jobs:**
1. `build-macos` - Build universal binary, sign, notarize
2. `build-linux` - Build x86_64 AppImage
3. `create-release` - Collect artifacts, generate manifest, create GitHub Release

**Secrets required:**
```
# Tauri update signing
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD

# Apple code signing
APPLE_CERTIFICATE              # base64 Developer ID Application .p12
APPLE_CERTIFICATE_PASSWORD
APPLE_INSTALLER_CERTIFICATE    # base64 Developer ID Installer .p12
APPLE_INSTALLER_CERTIFICATE_PASSWORD
APPLE_ID                       # Apple ID email
APPLE_PASSWORD                 # App-specific password
APPLE_TEAM_ID                  # 10-char team ID
```

## Tauri Configuration Changes

**Add to `tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/calumpwebb/project-nebula/releases/latest/download/latest.json"
      ],
      "pubkey": "<PUBLIC_KEY_FROM_TAURI_SIGNER>"
    }
  },
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "notarization": {
        "teamId": "TEAM_ID"
      }
    }
  }
}
```

**Add to `Cargo.toml`:**
```toml
[dependencies]
tauri-plugin-updater = "2"
```

## Version Tracking in API Requests

Convex uses WebSocket, so HTTP headers don't work. Instead, inject version into function args.

**Client-side hooks:**
```typescript
// apps/desktop/src/lib/convex.ts
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "dev";

export function useVersionedQuery(query, args) {
  return useQuery(query, { ...args, _appVersion: APP_VERSION });
}

export function useVersionedMutation(mutation) {
  const mutate = useMutation(mutation);
  return (args) => mutate({ ...args, _appVersion: APP_VERSION });
}
```

**Server-side:**
```typescript
// Add _appVersion to existing auth wrapper args
export const authedQuery = customQuery(query, {
  args: { _appVersion: v.optional(v.string()) },
  // ...
});
```

## Updater Testing Strategy

The updater code should be frozen (rarely changed) and well-tested.

**Unit tests (every commit):**
- Version comparison logic (`should_update("1.2.0", "1.2.1")`)
- Manifest parsing
- Edge cases (semver ordering, pre-release tags)

**Integration tests (every commit):**
- Mock update server responses
- HTTP error handling
- Timeout handling

```rust
#[test]
fn test_update_check_finds_new_version() {
    let mock_server = MockServer::start();
    mock_server.mock(|when, then| {
        when.path("/latest.json");
        then.json_body(json!({"version": "1.3.0", ...}));
    });

    let result = check_for_update("1.2.0", mock_server.url());
    assert!(result.update_available);
}

#[test]
fn test_update_check_handles_server_error() {
    let mock_server = MockServer::start();
    mock_server.mock(|when, then| {
        when.path("/latest.json");
        then.status(500);
    });

    let result = check_for_update("1.2.0", mock_server.url());
    assert!(result.is_err());
}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Tag wrong commit | Delete tag, re-tag correct commit |
| Forget prefix (`v1.2.0`) | CI doesn't trigger, delete and re-tag with `desktop-v1.2.0` |
| Re-tag same version | GitHub Release exists, CI fails - bump version instead |
| Tag on feature branch | That code gets released - always tag on `main` |
| Build fails after tag | Tag exists but no release - fix and re-run CI |
| Update check fails (offline) | Allow app to run |
| Download fails | Show error with retry button |
| Broken updater shipped | Users manually download from GitHub Releases |

## Open Items

- **NEBULA-6zs**: Add Apple signing secrets to GitHub (certs created, secrets pending)
- **NEBULA-gzy**: Investigate download progress UI options
- **NEBULA-2sn**: Generate Tauri update signing keypair

## Implementation Order

1. Generate Tauri signing keypair, add to GitHub secrets
2. Add updater plugin to Tauri config and Cargo.toml
3. Implement Rust-side update check and native dialog
4. Write unit + integration tests for updater
5. Create release script (`scripts/release-desktop.sh`)
6. Add `release-desktop` target to justfile
7. Create GitHub Actions workflow
8. Add Apple signing secrets to GitHub
9. Add version tracking to Convex client hooks
10. Test full release flow with `desktop-v0.1.0`
