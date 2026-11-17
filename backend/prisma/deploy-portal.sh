#!/bin/bash
set -euo pipefail
ROOT=/root/seagulls-realtime
U=/tmp/seagulls-upload
mkdir -p "$U"
cp "$U/records.ts" "$ROOT/backend/src/lib/records.ts"
cp "$U/crm.ts" "$ROOT/backend/src/routes/crm.ts"
cp "$U/analytics.ts" "$ROOT/backend/src/services/analytics.ts"
cp "$U/CrmListView.tsx" "$ROOT/frontend/src/components/CrmListView.tsx"
cp "$U/CloserReportView.tsx" "$ROOT/frontend/src/components/CloserReportView.tsx"
cp "$U/SalesStatsView.tsx" "$ROOT/frontend/src/components/SalesStatsView.tsx"
cd "$ROOT"
docker compose build backend frontend
docker compose up -d backend frontend
curl -fsS http://127.0.0.1:4010/api/health
echo
