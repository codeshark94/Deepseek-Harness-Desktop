#!/usr/bin/env bash
# Build the DeepSeek Harness desktop app from a fresh clone.
#
#   ./scripts/build-desktop.sh
#
# Prerequisites: Node.js ^22.19 || >=24, pnpm, and a macOS arm64 host.
# Output: dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing workspace dependencies"
pnpm install

echo "==> Building the dsh CLI and web assets"
pnpm run build

echo "==> Installing desktop app dependencies"
(cd apps/desktop && pnpm install)

echo "==> Packing the Electron app"
(cd apps/desktop && pnpm run pack)

echo "==> Done: dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app"
