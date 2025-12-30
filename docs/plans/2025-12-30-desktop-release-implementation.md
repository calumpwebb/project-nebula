# Desktop Release & Auto-Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete desktop release pipeline with hard-force auto-updates, GitHub Releases hosting, and Apple code signing.

**Architecture:** Tag-driven releases (`desktop-v1.2.0`) trigger GitHub Actions that build macOS/Linux binaries, sign/notarize for macOS, and publish to GitHub Releases. The Tauri app checks for updates on launch via Rust, blocking the UI until updated.

**Tech Stack:** Tauri 2, tauri-plugin-updater, GitHub Actions, Apple Developer ID signing, Tauri update signing

---

## Wave 1: Tauri Updater Foundation

### Task 1: Generate Tauri Update Signing Keypair

**Files:**
- Create: `apps/desktop/src-tauri/.tauri-updater-key.pub` (gitignored)
- Modify: `apps/desktop/src-tauri/.gitignore`

**Step 1: Generate the keypair**

Run:
```bash
cd apps/desktop/src-tauri && cargo install tauri-cli --version "^2" && cargo tauri signer generate -w .tauri-updater-key
```

This creates `.tauri-updater-key` (private) and `.tauri-updater-key.pub` (public).

**Step 2: Add private key to .gitignore**

Append to `apps/desktop/src-tauri/.gitignore`:
```
# Tauri update signing key (private - never commit)
.tauri-updater-key
```

**Step 3: Record the public key**

Copy the contents of `.tauri-updater-key.pub` - you'll need it for Task 2.

**Step 4: Add secrets to GitHub**

Go to GitHub repo → Settings → Secrets → Actions and add:
- `TAURI_SIGNING_PRIVATE_KEY`: contents of `.tauri-updater-key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: password you chose during generation

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/.gitignore
git commit -m "chore: add tauri updater key to gitignore"
```

---

### Task 2: Add Updater Plugin to Cargo.toml

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`

**Step 1: Add the dependency**

Add to `[dependencies]` section in `apps/desktop/src-tauri/Cargo.toml`:
```toml
tauri-plugin-updater = "2"
```

Full file after edit:
```toml
[package]
name = "nebula-desktop"
version = "0.1.0"
description = "Project Nebula - Developer HUD for AI-assisted coding"
authors = ["you"]
edition = "2021"

[lib]
name = "nebula_desktop_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**Step 2: Verify it compiles**

Run:
```bash
cd apps/desktop/src-tauri && cargo check
```
Expected: Compiles without errors

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml
git commit -m "feat(desktop): add tauri-plugin-updater dependency"
```

---

### Task 3: Configure Updater in tauri.conf.json

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

**Step 1: Add updater plugin config**

Replace entire `apps/desktop/src-tauri/tauri.conf.json` with:
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Project Nebula",
  "version": "0.1.0",
  "identifier": "com.nebula.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Project Nebula",
        "width": 1200,
        "height": 800,
        "minWidth": 600,
        "minHeight": 400,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "trafficLightPosition": { "x": 13, "y": 16 }
      }
    ],
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/calumpwebb/project-nebula/releases/latest/download/latest.json"
      ],
      "pubkey": "PUBLIC_KEY_FROM_TASK_1"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "signingIdentity": "-",
      "minimumSystemVersion": "10.13"
    }
  }
}
```

**Note:** Replace `PUBLIC_KEY_FROM_TASK_1` with the actual public key from Task 1.

**Step 2: Commit**

```bash
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "feat(desktop): configure tauri updater plugin"
```

---

## Wave 2: Rust Updater Implementation

### Task 4: Create Updater Module

**Files:**
- Create: `apps/desktop/src-tauri/src/updater.rs`

**Step 1: Create the updater module**

Create `apps/desktop/src-tauri/src/updater.rs`:
```rust
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Check for updates and handle the update flow.
/// Returns Ok(true) if app should continue, Ok(false) if update is in progress.
pub async fn check_and_update(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    // Skip update check if --skip-update flag was passed
    if std::env::args().any(|arg| arg == "--skip-update") {
        println!("[updater] Skipping update check (--skip-update flag)");
        return Ok(true);
    }

    let updater = app.updater()?;

    println!("[updater] Checking for updates...");

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            println!("[updater] No update available");
            return Ok(true);
        }
        Err(e) => {
            // If update check fails (offline, etc.), allow app to continue
            eprintln!("[updater] Update check failed: {}. Continuing anyway.", e);
            return Ok(true);
        }
    };

    let current = update.current_version.to_string();
    let latest = update.version.clone();
    println!("[updater] Update available: {} -> {}", current, latest);

    // Show native dialog - blocking, no dismiss option
    let message = format!(
        "Version {} is available.\n\nYou must update to continue using the app.",
        latest
    );

    // Use native dialog (rfd or tauri dialog)
    let should_update = tauri::async_runtime::spawn_blocking(move || {
        rfd::MessageDialog::new()
            .set_title("Update Required")
            .set_description(&message)
            .set_buttons(rfd::MessageButtons::Ok)
            .show();
        true // Always update - no cancel option
    })
    .await?;

    if should_update {
        println!("[updater] Downloading update...");

        // Download and install
        let mut downloaded = 0;
        let _ = update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        println!("[updater] Downloaded {} / {} bytes", downloaded, total);
                    }
                },
                || {
                    println!("[updater] Download complete, installing...");
                },
            )
            .await?;

        println!("[updater] Update installed, restarting...");
        app.restart();
    }

    Ok(true)
}
```

**Step 2: Verify syntax**

Run:
```bash
cd apps/desktop/src-tauri && cargo check
```
Expected: May fail - we need to add rfd dependency next

---

### Task 5: Add rfd Dependency for Native Dialogs

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`

**Step 1: Add rfd dependency**

Add to `[dependencies]` in `apps/desktop/src-tauri/Cargo.toml`:
```toml
rfd = "0.15"
```

**Step 2: Verify it compiles**

Run:
```bash
cd apps/desktop/src-tauri && cargo check
```
Expected: Compiles without errors

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml
git commit -m "feat(desktop): add rfd for native dialogs"
```

---

### Task 6: Integrate Updater into App Startup

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs` (if exists)

**Step 1: Update lib.rs**

Replace `apps/desktop/src-tauri/src/lib.rs` with:
```rust
mod updater;

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // Run update check before showing window
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater::check_and_update(&handle).await {
                    eprintln!("[updater] Error: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: Verify it compiles**

Run:
```bash
cd apps/desktop/src-tauri && cargo check
```
Expected: Compiles without errors

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/updater.rs
git commit -m "feat(desktop): integrate updater into app startup"
```

---

## Wave 3: Release Script & Justfile

### Task 7: Create Release Script

**Files:**
- Create: `scripts/release-desktop.sh`

**Step 1: Create scripts directory and script**

Create `scripts/release-desktop.sh`:
```bash
#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  Desktop Release                        │"
echo "├─────────────────────────────────────────┤"

# Check we're on main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "│  ${RED}Error: Must be on main branch${NC}           │"
    echo -e "│  Current: $CURRENT_BRANCH"
    echo "└─────────────────────────────────────────┘"
    exit 1
fi

# Check working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "│  ${RED}Error: Working directory not clean${NC}      │"
    echo "└─────────────────────────────────────────┘"
    echo ""
    git status --short
    exit 1
fi

# Get current version from tauri.conf.json
CURRENT_VERSION=$(grep '"version"' apps/desktop/src-tauri/tauri.conf.json | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')

# Get latest tag
LATEST_TAG=$(git tag -l "desktop-v*" --sort=-v:refname | head -1)
LATEST_TAG=${LATEST_TAG:-"(none)"}

echo "│  Current version: $CURRENT_VERSION"
echo "│  Latest tag: $LATEST_TAG"
echo "│  Branch: main (clean)"
echo "└─────────────────────────────────────────┘"
echo ""

# Prompt for new version
read -p "Enter new version (e.g. 1.2.0): " NEW_VERSION

# Validate semver format
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid semver format${NC}"
    exit 1
fi

# Check version is greater (simple string compare - good enough for semver)
TAG_NAME="desktop-v$NEW_VERSION"

# Check tag doesn't exist
if git tag -l | grep -q "^$TAG_NAME$"; then
    echo -e "${RED}Error: Tag $TAG_NAME already exists${NC}"
    exit 1
fi

# Get current commit
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --format="%s")

echo ""
echo "Will create tag: $TAG_NAME"
echo "On commit: $COMMIT_SHA ($COMMIT_MSG)"
echo ""
read -p "Continue? [y/N] " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# Create and push tag
git tag "$TAG_NAME"
git push origin "$TAG_NAME"

echo ""
echo -e "${GREEN}✓ Created tag $TAG_NAME${NC}"
echo -e "${GREEN}✓ Pushed to origin${NC}"
echo ""
echo "Release started! Watch progress:"
echo "https://github.com/calumpwebb/project-nebula/actions"
```

**Step 2: Make executable**

Run:
```bash
chmod +x scripts/release-desktop.sh
```

**Step 3: Commit**

```bash
git add scripts/release-desktop.sh
git commit -m "feat: add desktop release script"
```

---

### Task 8: Add release-desktop Target to Justfile

**Files:**
- Modify: `justfile`

**Step 1: Add the target**

Add to end of `justfile`:
```just
# Release desktop app (creates tag, triggers CI)
release-desktop:
    ./scripts/release-desktop.sh
```

**Step 2: Verify it works**

Run:
```bash
just --list
```
Expected: Shows `release-desktop` in the list

**Step 3: Commit**

```bash
git add justfile
git commit -m "feat: add release-desktop target to justfile"
```

---

## Wave 4: GitHub Actions Workflow

### Task 9: Create GitHub Actions Release Workflow

**Files:**
- Create: `.github/workflows/release-desktop.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/release-desktop.yml`:
```yaml
name: Release Desktop

on:
  push:
    tags:
      - 'desktop-v*'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: Install dependencies
        run: pnpm install

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/desktop-v}" >> $GITHUB_OUTPUT

      - name: Update version in tauri.conf.json
        run: |
          cd apps/desktop/src-tauri
          sed -i '' 's/"version": "[^"]*"/"version": "${{ steps.version.outputs.version }}"/' tauri.conf.json

      - name: Import Apple certificates
        if: ${{ secrets.APPLE_CERTIFICATE != '' }}
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          CERTIFICATE_PATH=$RUNNER_TEMP/certificate.p12
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
          KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

          echo -n "$APPLE_CERTIFICATE" | base64 --decode > $CERTIFICATE_PATH

          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security import $CERTIFICATE_PATH -P "$APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

      - name: Build Tauri app (Universal)
        run: |
          cd apps/desktop
          pnpm tauri build --target universal-apple-darwin
        env:
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Upload macOS artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-artifacts
          path: |
            apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
            apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/macos/*.app.tar.gz
            apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/macos/*.app.tar.gz.sig

  build-linux:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Rust
        uses: dtolnay/rust-action@stable

      - name: Install Linux dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install dependencies
        run: pnpm install

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/desktop-v}" >> $GITHUB_OUTPUT

      - name: Update version in tauri.conf.json
        run: |
          cd apps/desktop/src-tauri
          sed -i 's/"version": "[^"]*"/"version": "${{ steps.version.outputs.version }}"/' tauri.conf.json

      - name: Build Tauri app
        run: |
          cd apps/desktop
          pnpm tauri build

      - name: Upload Linux artifacts
        uses: actions/upload-artifact@v4
        with:
          name: linux-artifacts
          path: |
            apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage
            apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage.tar.gz
            apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage.tar.gz.sig

  create-release:
    needs: [build-macos, build-linux]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/desktop-v}" >> $GITHUB_OUTPUT

      - name: Download macOS artifacts
        uses: actions/download-artifact@v4
        with:
          name: macos-artifacts
          path: artifacts/macos

      - name: Download Linux artifacts
        uses: actions/download-artifact@v4
        with:
          name: linux-artifacts
          path: artifacts/linux

      - name: Generate latest.json manifest
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          REPO="calumpwebb/project-nebula"

          # Find the signature files
          MAC_SIG=$(cat artifacts/macos/*.app.tar.gz.sig 2>/dev/null || echo "")
          LINUX_SIG=$(cat artifacts/linux/*.AppImage.tar.gz.sig 2>/dev/null || echo "")

          cat > artifacts/latest.json << EOF
          {
            "version": "$VERSION",
            "notes": "Release $VERSION",
            "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "platforms": {
              "darwin-aarch64": {
                "signature": "$MAC_SIG",
                "url": "https://github.com/$REPO/releases/download/desktop-v$VERSION/Project.Nebula_${VERSION}_aarch64.app.tar.gz"
              },
              "darwin-x86_64": {
                "signature": "$MAC_SIG",
                "url": "https://github.com/$REPO/releases/download/desktop-v$VERSION/Project.Nebula_${VERSION}_x64.app.tar.gz"
              },
              "linux-x86_64": {
                "signature": "$LINUX_SIG",
                "url": "https://github.com/$REPO/releases/download/desktop-v$VERSION/project-nebula_${VERSION}_amd64.AppImage.tar.gz"
              }
            }
          }
          EOF

          cat artifacts/latest.json

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: Desktop v${{ steps.version.outputs.version }}
          draft: false
          prerelease: false
          files: |
            artifacts/macos/*
            artifacts/linux/*
            artifacts/latest.json
```

**Step 2: Create .github/workflows directory if needed**

Run:
```bash
mkdir -p .github/workflows
```

**Step 3: Commit**

```bash
git add .github/workflows/release-desktop.yml
git commit -m "feat: add desktop release GitHub Actions workflow"
```

---

## Wave 5: Version Tracking in Convex

### Task 10: Add Version to Vite Build

**Files:**
- Modify: `apps/desktop/vite.config.ts`

**Step 1: Add version define**

Replace `apps/desktop/vite.config.ts` with:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import fs from "fs";

// Read version from tauri.conf.json
function getAppVersion(): string {
  try {
    const tauriConfig = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "src-tauri/tauri.conf.json"), "utf-8")
    );
    return tauriConfig.version || "0.0.0";
  } catch {
    return "dev";
  }
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [TanStackRouterVite(), react()],

  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

**Step 2: Add type declaration**

Append to `apps/desktop/src/vite-env.d.ts`:
```typescript
declare const __APP_VERSION__: string;
```

**Step 3: Commit**

```bash
git add apps/desktop/vite.config.ts apps/desktop/src/vite-env.d.ts
git commit -m "feat(desktop): inject app version at build time"
```

---

### Task 11: Create Versioned Convex Hooks

**Files:**
- Create: `apps/desktop/src/lib/convex.ts`

**Step 1: Create the hooks file**

Create `apps/desktop/src/lib/convex.ts`:
```typescript
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/**
 * Wrapper around useQuery that injects _appVersion into args.
 */
export function useQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Omit<FunctionArgs<Query>, "_appVersion">
): FunctionReturnType<Query> | undefined {
  return useConvexQuery(query, { ...args, _appVersion: APP_VERSION } as FunctionArgs<Query>);
}

/**
 * Wrapper around useMutation that injects _appVersion into args.
 */
export function useMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation
): (args: Omit<FunctionArgs<Mutation>, "_appVersion">) => Promise<FunctionReturnType<Mutation>> {
  const mutate = useConvexMutation(mutation);
  return (args) => mutate({ ...args, _appVersion: APP_VERSION } as FunctionArgs<Mutation>);
}

/**
 * Get the current app version.
 */
export function getAppVersion(): string {
  return APP_VERSION;
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/lib/convex.ts
git commit -m "feat(desktop): add versioned Convex hooks"
```

---

### Task 12: Update Convex Function Wrappers

**Files:**
- Modify: `packages/convex/convex/lib/functions.ts`

**Step 1: Add _appVersion to args**

This requires using customQuery pattern. For now, the version will be available in args but optional. Update later when needed for version-specific logic.

Note: The current implementation auto-strips unknown args in Convex, so `_appVersion` will just be ignored server-side until we add explicit handling. This is fine for now - the client is already sending it.

**Step 2: Skip this task for now**

The version tracking on the client side is complete. Server-side handling can be added later when needed.

---

## Wave 6: Testing

### Task 13: Add Updater Unit Tests

**Files:**
- Create: `apps/desktop/src-tauri/src/updater_tests.rs`
- Modify: `apps/desktop/src-tauri/src/updater.rs`

**Step 1: Add test module to updater.rs**

Append to `apps/desktop/src-tauri/src/updater.rs`:
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_skip_update_flag_detection() {
        // Test that --skip-update is detected in args
        let args = vec!["app".to_string(), "--skip-update".to_string()];
        assert!(args.iter().any(|arg| arg == "--skip-update"));
    }

    #[test]
    fn test_skip_update_not_present() {
        let args = vec!["app".to_string(), "--other-flag".to_string()];
        assert!(!args.iter().any(|arg| arg == "--skip-update"));
    }
}
```

**Step 2: Run tests**

Run:
```bash
cd apps/desktop/src-tauri && cargo test
```
Expected: Tests pass

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/updater.rs
git commit -m "test(desktop): add updater unit tests"
```

---

## Wave 7: Documentation & Verification

### Task 14: Update Design Doc with Implementation Notes

**Files:**
- Modify: `docs/plans/2025-12-30-desktop-release-design.md`

**Step 1: Add implementation status**

Add at the end of the design doc:
```markdown
## Implementation Status

- [x] Generate Tauri signing keypair
- [x] Add updater plugin to Cargo.toml
- [x] Configure updater in tauri.conf.json
- [x] Implement Rust-side update check
- [x] Add native dialog with rfd
- [x] Create release script
- [x] Add justfile target
- [x] Create GitHub Actions workflow
- [ ] Add Apple signing secrets to GitHub (requires certs)
- [x] Add version tracking to Convex client
- [ ] Test full release flow with desktop-v0.1.0
```

**Step 2: Commit**

```bash
git add docs/plans/2025-12-30-desktop-release-design.md
git commit -m "docs: update desktop release design with implementation status"
```

---

### Task 15: Test Local Build

**Step 1: Build the app locally**

Run:
```bash
cd apps/desktop && pnpm tauri build
```
Expected: Builds successfully (may show signing warning on macOS without certs)

**Step 2: Verify the app launches**

Run the built app from `apps/desktop/src-tauri/target/release/bundle/`

Expected: App launches, may show update check message in console

---

## Summary

| Wave | Tasks | Description |
|------|-------|-------------|
| 1 | 1-3 | Tauri updater foundation (keypair, deps, config) |
| 2 | 4-6 | Rust updater implementation |
| 3 | 7-8 | Release script and justfile |
| 4 | 9 | GitHub Actions workflow |
| 5 | 10-12 | Version tracking in Convex |
| 6 | 13 | Testing |
| 7 | 14-15 | Documentation and verification |

## Manual Steps Required

1. **Task 1:** Generate keypair and add secrets to GitHub manually
2. **Task 9:** Apple signing secrets need to be added to GitHub (APPLE_CERTIFICATE, etc.)
3. **Task 15:** First release test with `just release-desktop`
