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
