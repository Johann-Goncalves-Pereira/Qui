#!/usr/bin/env bash
# Copyright (c) 2026, s0up and the autobrr contributors.
# SPDX-License-Identifier: GPL-2.0-or-later

set -eo pipefail

# Ensure Electron runs as the native desktop app and not as plain Node.js
unset ELECTRON_RUN_AS_NODE

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  🚀 Qui Desktop — Unified Hot-Reload Development Runner"
echo "=========================================================="

BG_PIDS=()

cleanup() {
  echo ""
  echo "🧹 Shutting down development processes..."
  for pid in "${BG_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  echo "✅ Cleanup complete."
}
trap cleanup INT TERM EXIT

is_port_answering() {
  local port="$1"
  curl -s -m 1 "http://localhost:${port}/" >/dev/null 2>&1 || \
  curl -s -m 1 "http://localhost:${port}/health" >/dev/null 2>&1 || \
  curl -s -m 1 "http://localhost:${port}/api/version" >/dev/null 2>&1
}

# 1. Ensure Backend is responding on port 7476
echo "🔍 [1/3] Checking Backend API (port 7476)..."
if is_port_answering 7476; then
  echo "   ✓ Port 7476 is already answering (Docker container or local backend)."
else
  echo "   → Port 7476 not answering. Attempting to start backend..."
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if docker inspect qui >/dev/null 2>&1; then
      echo "   → Starting existing Docker container 'qui'..."
      docker start qui >/dev/null 2>&1 || true
      if docker inspect qbittorrent-nox >/dev/null 2>&1; then
        docker start qbittorrent-nox >/dev/null 2>&1 || true
      fi
    else
      echo "   → 'qui' container not found. Starting local Go backend..."
      if command -v air >/dev/null 2>&1; then
        echo "   → Running with air (hot-reload)..."
        air -c .air.toml &
        BG_PIDS+=($!)
      elif command -v go >/dev/null 2>&1; then
        echo "   → Running with go run ./cmd/qui serve..."
        go run ./cmd/qui serve &
        BG_PIDS+=($!)
      fi
    fi
  elif command -v air >/dev/null 2>&1; then
    echo "   → Running with air (hot-reload)..."
    air -c .air.toml &
    BG_PIDS+=($!)
  elif command -v go >/dev/null 2>&1; then
    echo "   → Running with go run ./cmd/qui serve..."
    go run ./cmd/qui serve &
    BG_PIDS+=($!)
  else
    echo "   ❌ Error: Neither Docker nor Go compiler found to start backend." >&2
    exit 1
  fi

  # Wait for backend to be ready
  echo -n "   → Waiting for backend on port 7476..."
  READY=0
  for _ in {1..30}; do
    if is_port_answering 7476; then
      READY=1
      break
    fi
    sleep 0.5
    echo -n "."
  done
  echo ""
  if [ "$READY" -ne 1 ]; then
    echo "   ⚠️ Warning: Backend on port 7476 did not respond in time, continuing..."
  else
    echo "   ✓ Backend is ready."
  fi
fi

# 2. Start Vite Frontend on port 5173
echo "⚡ [2/3] Checking Vite Frontend dev server (port 5173)..."
if is_port_answering 5173; then
  echo "   ✓ Vite dev server is already running on port 5173."
else
  echo "   → Starting Vite dev server (pnpm --dir web dev)..."
  pnpm --dir web dev &
  VITE_PID=$!
  BG_PIDS+=($VITE_PID)

  echo -n "   → Waiting for Vite dev server..."
  READY=0
  for _ in {1..30}; do
    if is_port_answering 5173; then
      READY=1
      break
    fi
    sleep 0.5
    echo -n "."
  done
  echo ""
  if [ "$READY" -ne 1 ]; then
    echo "   ❌ Error: Vite dev server failed to start on port 5173." >&2
    exit 1
  fi
  echo "   ✓ Vite dev server ready with HMR at http://localhost:5173"
fi

# 3. Start Electron Desktop Shell in Hot-Reload mode
echo "🖥️  [3/3] Launching Electron Desktop Shell (QUI_DESKTOP_DEV=1)..."
cd "$REPO_ROOT/desktop"
pnpm build
export QUI_DESKTOP_DEV=1

# Run concurrently for TypeScript watch and Electronmon hot-restart
pnpm exec concurrently -k \
  -n "tsc,electron" \
  -c "blue.bold,magenta.bold" \
  "tsc -w --preserveWatchOutput" \
  "env -u ELECTRON_RUN_AS_NODE QUI_DESKTOP_DEV=1 pnpm exec electronmon dist/main/index.js"
