# Nebula development commands

# Start everything (creates cluster if needed)
up:
    cd infra && tilt up

# Stop services (keeps cluster)
down:
    cd infra && tilt down

# Full reset (delete cluster + registry)
reset:
    cd infra && tilt down || true
    ctlptl delete -f infra/ctlptl.yaml || true

# Type-check all packages
check:
    pnpm turbo check

# Lint all packages
lint:
    pnpm turbo lint

# Run all tests
test:
    pnpm turbo test

# Build all packages
build:
    pnpm turbo build

# Run desktop app in dev mode
app:
    cd apps/desktop && pnpm tauri dev

# Build desktop app for production
app-build:
    cd apps/desktop && pnpm tauri build
