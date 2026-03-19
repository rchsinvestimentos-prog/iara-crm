#!/bin/sh
set -e

echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || echo "⚠️ db push skipped (non-critical)"

echo "🚀 Starting server..."
exec node server.js
