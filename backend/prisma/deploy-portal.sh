#!/bin/bash
set -euo pipefail
ROOT=/root/seagulls-realtime
U=/tmp/seagulls-upload
cp "$U/pkt.ts" "$ROOT/backend/src/lib/pkt.ts"
cp "$U/crm.ts" "$ROOT/backend/src/routes/crm.ts"
cp "$U/campaigns.ts" "$ROOT/backend/src/routes/campaigns.ts"
cp "$U/users.ts" "$ROOT/backend/src/routes/users.ts"
cp "$U/schema.prisma" "$ROOT/backend/prisma/schema.prisma"
cp "$U/setup-teams.js" "$ROOT/backend/prisma/setup-teams.js"
cp "$U/page.tsx" "$ROOT/frontend/src/app/page.tsx"
cp "$U/globals.css" "$ROOT/frontend/src/app/globals.css"
cp "$U/Sidebar.tsx" "$ROOT/frontend/src/components/Sidebar.tsx"
cp "$U/SalesStatsView.tsx" "$ROOT/frontend/src/components/SalesStatsView.tsx"
cp "$U/PerformanceCharts.tsx" "$ROOT/frontend/src/components/PerformanceCharts.tsx"
cp "$U/ManagerCampaignsView.tsx" "$ROOT/frontend/src/components/ManagerCampaignsView.tsx"
cd "$ROOT"
docker exec -i seagulls-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "team" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
SQL
docker compose build backend frontend
docker compose up -d backend frontend
docker compose exec -T backend node prisma/setup-teams.js
curl -fsS http://127.0.0.1:4010/api/health
echo
