#!/bin/bash
set -e

# Must be on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "Error: Must be on main branch (currently on $BRANCH)"
    exit 1
fi

# Must be clean
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Working directory not clean"
    git status --short
    exit 1
fi

# Show current state
CURRENT=$(grep '"version"' apps/desktop/src-tauri/tauri.conf.json | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
LATEST=$(git tag -l "desktop-v*" --sort=-v:refname | head -1)
echo "Current version: $CURRENT"
echo "Latest tag: ${LATEST:-(none)}"
echo ""

# Get new version
read -p "New version: " VERSION

# Validate
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid semver"
    exit 1
fi

TAG="desktop-v$VERSION"
if git tag -l | grep -q "^$TAG$"; then
    echo "Error: Tag $TAG exists"
    exit 1
fi

# Confirm
echo ""
echo "Tag: $TAG"
echo "Commit: $(git rev-parse --short HEAD)"
read -p "Create and push? [Y/n] " CONFIRM
[[ "$CONFIRM" =~ ^[nN]$ ]] && exit 0

# Do it
git tag "$TAG"
git push origin "$TAG"

echo ""
echo "Done. Watch: https://github.com/calumpwebb/project-nebula/actions"
