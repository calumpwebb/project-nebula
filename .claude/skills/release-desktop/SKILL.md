---
name: release-desktop
description: Use when releasing the desktop app - analyzes commits, suggests semver, generates release notes, and orchestrates the full release workflow
---

# Release Desktop Workflow

You are orchestrating a desktop release for Project Nebula. Guide the user through each step interactively.

## Step 1: Verify Prerequisites

Run these commands to check readiness:

```bash
git branch --show-current  # Must be "main"
git status --porcelain     # Must be empty (clean)
git tag -l "desktop-v*" --sort=-v:refname | head -1  # Latest tag
```

If not on main or not clean, stop and inform the user.

## Step 2: Analyze Commits

Get commits since the last release:

```bash
LATEST_TAG=$(git tag -l "desktop-v*" --sort=-v:refname | head -1)
git log ${LATEST_TAG}..HEAD --format="%h %s" --no-merges
```

Parse each commit using conventional commit format: `type(scope): description`

Filter to desktop-relevant commits (scope contains: desktop, ci, scripts, or is empty).

## Step 3: Determine Version Bump

Apply these rules in order:

1. **MAJOR** if any commit:
   - Has `BREAKING CHANGE:` in body
   - Has `!` after type, for example `feat!:` or `fix(desktop)!:`

2. **MINOR** if any commit:
   - Type is `feat` with desktop-relevant scope

3. **PATCH** otherwise (fixes, perf, chore, etc.)

Calculate the new version from the latest tag.

Present to user:
```
Current version: 0.1.7
Commits to include: 3

- feat(desktop): add frontend logging -> MINOR bump
- fix(ci): hide .background in DMG -> patch
- fix(desktop): force RGBA icons -> patch

Suggested: 0.2.0 (MINOR - new features added)
```

## Step 4: Generate Release Notes

Group commits into markdown sections:

```markdown
## Features
- Add frontend console log piping to Rust logger (194f180)

## Fixes
- Hide .background folder in DMG installer (7841cd0)
- Force RGBA format on all icon PNGs (46b2ba8, 998432e)

## Other
- Auto-suggest next patch version in release script (284d5b4)
```

Rules:
- `feat` -> Features
- `fix` -> Fixes
- `perf` -> Performance
- `docs`, `chore`, `refactor`, `style`, `test` -> Other
- Include short commit hash for reference
- Combine related commits (same fix across multiple commits)

## Step 5: Confirm with User

Show the complete release summary:

```
DESKTOP RELEASE SUMMARY
-----------------------
Version: 0.1.7 -> 0.2.0 (MINOR)
Commits: 4
Tag: desktop-v0.2.0

Release Notes:
---
## Features
- Add frontend console log piping to Rust logger (194f180)

## Fixes
- Hide .background folder in DMG installer (7841cd0)
- Force RGBA format on all icon PNGs (46b2ba8)
---

Proceed with release? [Y/n]
```

If user wants changes, help them edit the notes.

## Step 6: Execute Release

Run the release script with parameters:

```bash
./scripts/release-desktop.sh --version "0.2.0" --notes "## Features
- Add frontend console log piping to Rust logger (194f180)

## Fixes
- Hide .background folder in DMG installer (7841cd0)
- Force RGBA format on all icon PNGs (46b2ba8)"
```

## Step 7: Provide Next Steps

After successful push:

```
Tag desktop-v0.2.0 pushed successfully.

Monitor the build: https://github.com/calumpwebb/project-nebula/actions

The release will be created automatically when builds complete.
Expected artifacts: macOS DMG, Linux AppImage
```

## Important Notes

- Always work in the project-nebula directory
- The script creates an annotated tag with release notes as the message
- CI extracts these notes and uses them for the GitHub Release
- If builds fail, the tag exists but no release is created - user may need to delete tag and retry
