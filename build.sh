#!/usr/bin/env bash
# Render build script — installs both Python and Node deps, builds frontend.
set -euo pipefail

# 1. Python dependencies
cd backend
pip install -r requirements.txt

# 2. Frontend build
cd ../frontend
npm ci
npm run build

echo "Build complete — frontend/dist ready for static serving."
