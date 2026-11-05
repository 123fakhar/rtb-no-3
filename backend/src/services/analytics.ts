import { prisma } from "../lib/prisma";

export interface DashboardQuery {
  from: Date;
  to: Date;
  /** Minutes returned by Date.getTimezoneOffset() so day buckets match the operator's clock. */
  tzOffsetMin: number;
  campaignId?: string;
  buyerId?: string;
  provider?: string;
  state?: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function money(v: { toNumber?: () => number } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v.toNumber === "function") return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function providerLabel(key: string): string {
  const map: Record<string, string> = {
    ringba: "Ringba",
    ringfuel: "RingFuel",
    retreaver: "Retreaver",
    trackdrive: "TrackDrive",
    unset: "Unassigned",
    unknown: "Unassigned",
  };
  const raw = (key || "").trim();
  if (!raw) return "Unassigned";
  return map[raw.toLowerCase()] ?? raw;
}

/** Collapse free-text reject reasons into the buckets operators scan for, keeping the real text when it doesn't match. */
function bucketReason(reason: string | null, httpStatus: number | null): string {
  const r = (reason || "").toLowerCase();
  if (r.includes("capacity") || r.includes("cap reached") || r.includes("no capacity")) return "Capacity";
  if (r.includes("duplicate")) return "Duplicate";
  if (r.includes("zip") || r.includes("postal")) return "Invalid ZIP";
  if (r.includes("criteria") || r.includes("unqualified") || r.includes("not eligible") || r.includes("filter")) {
    return "Buyer criteria";
  }
  if (r.includes("rate") || r.includes("429") || r.includes("too many")) return "Rate limited";
  if (r.includes("timeout") || r.includes("timed out") || r.includes("abort") || r.includes("etimedout")) return "Timeout";
  if (reason && reason.trim()) {
    const clean = reason.replace(/\s+/g, " ").trim();
    return clean.length > 56 ? `${clean.slice(0, 56)}…` : clean;
  }
  if (httpStatus) return `HTTP ${httpStatus}`;
  return "Other";
}

function isHardFailure(httpStatus: number | null, reason: string | null): boolean {
  const r = (reason || "").toLowerCase();
  if (r.includes("timeout") || r.includes("timed out") || r.includes("abort") || r.includes("etimedout")) return true;
  if (r.includes("network") || r.includes("connection") || r.includes("econnrefused")) return true;
  if (httpStatus == null) return true;
  return httpStatus >= 500;
}

function localParts(d: Date, tzOffsetMin: number) {
  const shifted = new Date(d.getTime() - tzOffsetMin * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.toISOString().slice(0, 13),
  };
}

function enumerateBuckets(from: Date, to: Date, tzOffsetMin: number, hourly: boolean): string[] {
  const keys: string[] = [];
  if (hourly) {
    const startShifted = new Date(from.getTime() - tzOffsetMin * 60_000);
    startShifted.setUTCMinutes(0, 0, 0);
    const endShifted = new Date(to.getTime() - tzOffsetMin * 60_000);
    const cursor = new Date(startShifted);
    while (cursor <= endShifted && keys.length < 48) {
      keys.push(cursor.toISOString().slice(0, 13));
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    return keys;
  }

  const startShifted = new Date(from.getTime() - tzOffsetMin * 60_000);
  startShifted.setUTCHours(0, 0, 0, 0);
  const endKey = localParts(to, tzOffsetMin).date;
  const cursor = new Date(startShifted);
  while (keys.length < 120) {
    const key = cursor.toISOString().slice(0, 10);
    keys.push(key);
    if (key >= endKey) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export async function dashboard(query: DashboardQuery) {
  const { from, to, tzOffsetMin } = query;
  const hourly = to.getTime() - from.getTime() <= 36 * 60 * 60 * 1000;

  const leadWhere = {
    createdAt: { gte: from, lte: to },
    ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    ...(query.state ? { state: query.state.toUpperCase() } : {}),
    ...(query.buyerId ? { OR: [{ buyerId: query.buyerId }, { pings: { some: { buyerId: query.buyerId } } }] } : {}),
  };

  const pingWhere = {
    createdAt: { gte: from, lte: to },
    ...(query.buyerId ? { buyerId: query.buyerId } : {}),
    ...(query.campaignId || query.state || query.provider
      ? {
          lead: {
            ...(query.campaignId ? { campaignId: query.campaignId } : {}),
            ...(query.state ? { state: query.state.toUpperCase() } : {}),
          },
        }
      : {}),
  };

  const minuteAgo = new Date(Date.now() - 60_000);

  const [leads, pings, buyerRows, campaignRows, stateRows, dbCheck, recentMinute, recentErrors] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        phone: true,
        state: true,
        status: true,
        revenue: true,
        buyerId: true,
        campaignId: true,
        createdAt: true,
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20000,
    }),
    prisma.ping.findMany({
      where: pingWhere,
      select: {
        id: true,
        leadId: true,
        buyerId: true,
        status: true,
        bid: true,
        rejectReason: true,
        httpStatus: true,
        durationMs: true,
        createdAt: true,
        lead: { select: { id: true, phone: true, state: true, campaignId: true, campaign: { select: { name: true } } } },
        buyer: { select: { id: true, name: true, provider: true } },
        config: { select: { provider: true, campaign: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20000,
    }),
    prisma.buyer.findMany({
      select: { id: true, name: true, provider: true, status: true },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    prisma.campaign.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({ distinct: ["state"], select: { state: true }, orderBy: { state: "asc" } }),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    prisma.ping.count({ where: { createdAt: { gte: minuteAgo } } }),
    prisma.ping.count({
      where: {
        createdAt: { gte: minuteAgo },
        OR: [{ httpStatus: { gte: 500 } }, { status: "ERROR" }],
      },
    }),
  ]);

  const soldRows = await prisma.crmEntry.findMany({
    where: { status: "APPROVED", pingId: { not: null } },
    select: { pingId: true },
  });
  const soldPingIds = new Set(soldRows.map((row) => row.pingId).filter((id): id is string => Boolean(id)));

  const providerFilter = query.provider?.toLowerCase();
  const filteredPings = providerFilter
    ? pings.filter((p) => (p.config?.provider || p.buyer?.provider || "").toLowerCase() === providerFilter)
    : pings;

  const pingLeadIds = new Set(filteredPings.map((p) => p.leadId));
  const scopedLeads = providerFilter ? leads.filter((l) => pingLeadIds.has(l.id)) : leads;

  const buyerName = new Map(buyerRows.map((b) => [b.id, b.name]));

  let bidSum = 0;
  let bidCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  let hardFails = 0;
  let buyerResponses = 0;
  let validBids = 0;
  let winningBids = 0;
  let revenue = 0;

  const qualifiedLeadIds = new Set<string>();
  const buyerStats = new Map<
    string,
    { requests: number; bids: number; wins: number; bidSum: number; revenue: number; hardFails: number }
  >();
  const campaignStats = new Map<
    string,
    { leads: Set<string>; qualified: Set<string>; bids: number; wins: number; revenue: number }
  >();
  const providerStats = new Map<
    string,
    { leads: Set<string>; bids: number; wins: number; revenue: number; hardFails: number }
  >();
  const rejectionMap = new Map<
    string,
    { count: number; buyers: Map<string, { rejected: number; lastAt: Date | null }> }
  >();

  const ensureBuyer = (id: string) => {
    const row = buyerStats.get(id) ?? { requests: 0, bids: 0, wins: 0, bidSum: 0, revenue: 0, hardFails: 0 };
    buyerStats.set(id, row);
    return row;
  };
  const ensureCampaign = (id: string) => {
    const row = campaignStats.get(id) ?? { leads: new Set<string>(), qualified: new Set<string>(), bids: 0, wins: 0, revenue: 0 };
    campaignStats.set(id, row);
    return row;
  };
  const ensureProvider = (key: string) => {
    const row = providerStats.get(key) ?? { leads: new Set<string>(), bids: 0, wins: 0, revenue: 0, hardFails: 0 };
    providerStats.set(key, row);
    return row;
  };

  for (const lead of scopedLeads) {
    const campaignId = lead.campaignId ?? "unassigned";
    ensureCampaign(campaignId).leads.add(lead.id);
  }

  for (const ping of filteredPings) {
    const bid = ping.bid == null ? null : money(ping.bid);
    const won = soldPingIds.has(ping.id);
    const responded = ping.httpStatus != null && ping.httpStatus < 500;
    const valid = bid != null && bid > 0;
    const hard = isHardFailure(ping.httpStatus, ping.rejectReason);
    const providerKey = (ping.config?.provider || ping.buyer?.provider || "unknown").toLowerCase();
    const campaignId = ping.config?.campaign?.id ?? ping.lead?.campaignId ?? "unassigned";

    if (responded) buyerResponses += 1;
    if (valid) {
      validBids += 1;
      bidSum += bid!;
      bidCount += 1;
      qualifiedLeadIds.add(ping.leadId);
      ensureCampaign(campaignId).qualified.add(ping.leadId);
    }
    if (won) {
      winningBids += 1;
      const wonAmount = bid ?? 0;
      revenue += wonAmount;
      qualifiedLeadIds.add(ping.leadId);
      ensureCampaign(campaignId).qualified.add(ping.leadId);
    }
    if (hard) hardFails += 1;
    if (ping.durationMs != null) {
      durationSum += ping.durationMs;
      durationCount += 1;
    }

    if (ping.buyerId) {
      const row = ensureBuyer(ping.buyerId);
      row.requests += 1;
      if (valid) {
        row.bids += 1;
        row.bidSum += bid!;
      }
      if (won) {
        row.wins += 1;
        row.revenue += bid ?? 0;
      }
      if (hard) row.hardFails += 1;
    }

    const camp = ensureCampaign(campaignId);
    camp.bids += 1;
    if (won) {
      camp.wins += 1;
      camp.revenue += bid ?? 0;
    }

    const prov = ensureProvider(providerKey);
    prov.leads.add(ping.leadId);
    prov.bids += 1;
    if (won) {
      prov.wins += 1;
      prov.revenue += bid ?? 0;
    }
    if (hard) prov.hardFails += 1;

    if (!won) {
      const reason = bucketReason(ping.rejectReason, ping.httpStatus);
      const bucket = rejectionMap.get(reason) ?? { count: 0, buyers: new Map() };
      bucket.count += 1;
      if (ping.buyerId) {
        const b = bucket.buyers.get(ping.buyerId) ?? { rejected: 0, lastAt: null };
        b.rejected += 1;
        if (!b.lastAt || ping.createdAt > b.lastAt) b.lastAt = ping.createdAt;
        bucket.buyers.set(ping.buyerId, b);
      }
      rejectionMap.set(reason, bucket);
    }
  }

  const rejectedCount = filteredPings.length - winningBids;
  const bidRequests = filteredPings.length;

  const bucketKeys = enumerateBuckets(from, to, tzOffsetMin, hourly);
  const series = new Map(bucketKeys.map((k) => [k, { t: k, revenue: 0, leads: 0, wins: 0 }]));
  for (const lead of scopedLeads) {
    const key = hourly ? localParts(lead.createdAt, tzOffsetMin).hour : localParts(lead.createdAt, tzOffsetMin).date;
    const row = series.get(key);
    if (row) row.leads += 1;
  }
  for (const ping of filteredPings) {
    if (!soldPingIds.has(ping.id)) continue;
    const key = hourly ? localParts(ping.createdAt, tzOffsetMin).hour : localParts(ping.createdAt, tzOffsetMin).date;
    const row = series.get(key);
    if (!row) continue;
    row.wins += 1;
    row.revenue += ping.bid == null ? 0 : money(ping.bid);
  }

  const buyers = buyerRows
    .filter((b) => !query.buyerId || b.id === query.buyerId)
    .filter((b) => !providerFilter || b.provider.toLowerCase() === providerFilter)
    .map((b) => {
      const s = buyerStats.get(b.id) ?? { requests: 0, bids: 0, wins: 0, bidSum: 0, revenue: 0, hardFails: 0 };
      return {
        id: b.id,
        name: b.name,
        provider: providerLabel(b.provider),
        requests: s.requests,
        bids: s.bids,
        wins: s.wins,
        winRate: s.requests ? round1((s.wins / s.requests) * 100) : 0,
        avgBid: s.bids ? Math.round((s.bidSum / s.bids) * 100) / 100 : 0,
        revenue: Math.round(s.revenue * 100) / 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.requests - a.requests || a.name.localeCompare(b.name));

  const campaignName = new Map(campaignRows.map((c) => [c.id, c.name]));
  const campaigns = campaignRows
    .filter((c) => !query.campaignId || c.id === query.campaignId)
    .map((c) => {
      const s = campaignStats.get(c.id) ?? { leads: new Set<string>(), qualified: new Set<string>(), bids: 0, wins: 0, revenue: 0 };
      const leadCount = s.leads.size;
      return {
        id: c.id,
        name: c.name,
        leads: leadCount,
        qualified: s.qualified.size,
        bids: s.bids,
        wins: s.wins,
        revenue: Math.round(s.revenue * 100) / 100,
        winRate: leadCount ? round1((s.wins / leadCount) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads || a.name.localeCompare(b.name));

  if (campaignStats.has("unassigned") && !query.campaignId) {
    const s = campaignStats.get("unassigned")!;
    campaigns.push({
      id: "unassigned",
      name: campaignName.get("unassigned") ?? "Unassigned",
      leads: s.leads.size,
      qualified: s.qualified.size,
      bids: s.bids,
      wins: s.wins,
      revenue: Math.round(s.revenue * 100) / 100,
      winRate: s.leads.size ? round1((s.wins / s.leads.size) * 100) : 0,
    });
  }

  const knownProviders = new Set<string>();
  for (const b of buyerRows) knownProviders.add((b.provider || "unknown").toLowerCase());
  for (const key of providerStats.keys()) knownProviders.add(key);

  const providerStatus = (key: string): "healthy" | "degraded" | "idle" => {
    const s = providerStats.get(key);
    if (!s || s.bids === 0) return "idle";
    if (s.hardFails / s.bids >= 0.3 && s.bids >= 3) return "degraded";
    if (s.bids >= 1 && s.hardFails === s.bids && s.wins === 0 && s.hardFails >= 3) return "degraded";
    return "healthy";
  };

  const providers = [...knownProviders]
    .filter((key) => !providerFilter || key === providerFilter)
    .map((key) => {
      const s = providerStats.get(key) ?? { leads: new Set<string>(), bids: 0, wins: 0, revenue: 0, hardFails: 0 };
      return {
        key,
        name: providerLabel(key),
        leads: s.leads.size,
        bids: s.bids,
        wins: s.wins,
        revenue: Math.round(s.revenue * 100) / 100,
        status: providerStatus(key),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.bids - a.bids || a.name.localeCompare(b.name));

  const rejectionTotal = [...rejectionMap.values()].reduce((sum, r) => sum + r.count, 0);
  const rejections = [...rejectionMap.entries()]
    .map(([reason, row]) => ({
      reason,
      count: row.count,
      percent: rejectionTotal ? round1((row.count / rejectionTotal) * 100) : 0,
      buyers: [...row.buyers.entries()]
        .map(([buyerId, info]) => ({
          id: buyerId,
          name: buyerName.get(buyerId) ?? "Buyer",
          rejected: info.rejected,
          accepted: buyerStats.get(buyerId)?.wins ?? 0,
          lastAt: info.lastAt ? info.lastAt.toISOString() : null,
        }))
        .sort((a, b) => b.rejected - a.rejected),
    }))
    .sort((a, b) => b.count - a.count);

  const activity = filteredPings.slice(0, 20).map((ping) => {
    const won = soldPingIds.has(ping.id);
    const bid = ping.bid == null ? null : money(ping.bid);
    return {
      id: ping.id,
      at: ping.createdAt.toISOString(),
      leadId: ping.leadId,
      leadLabel: `#${ping.leadId.slice(-6)}`,
      phone: ping.lead?.phone ?? "",
      campaign: ping.config?.campaign?.name ?? ping.lead?.campaign?.name ?? "Unassigned",
      buyer: ping.buyer?.name ?? "Buyer",
      bid: won || ping.status === "RESERVED" || (bid != null && bid > 0) ? bid : null,
      status: won ? "WON" : ping.status === "RESERVED" ? "BID" : ping.status === "ERROR" ? "ERROR" : "REJECTED",
      reason: won || ping.status === "RESERVED" ? null : bucketReason(ping.rejectReason, ping.httpStatus),
    };
  });

  const recentLeads = scopedLeads.slice(0, 25).map((lead) => ({
    id: lead.id,
    at: lead.createdAt.toISOString(),
    label: `#${lead.id.slice(-6)}`,
    phone: lead.phone,
    state: lead.state,
    campaign: lead.campaign?.name ?? "Unassigned",
    buyer: lead.buyerId ? buyerName.get(lead.buyerId) ?? null : null,
    bid: money(lead.revenue) > 0 ? money(lead.revenue) : null,
    status: lead.status === "SOLD" ? "WON" : lead.status === "REJECTED" ? "REJECTED" : "OPEN",
  }));

  const states = stateRows.map((row) => row.state).filter(Boolean);
  const avgResponseMs = durationCount ? Math.round(durationSum / durationCount) : 0;
  const rtbDegraded = bidRequests >= 3 && hardFails / bidRequests >= 0.3;

  return {
    range: { from: from.toISOString(), to: to.toISOString(), hourly },
    health: {
      operational: Boolean(dbCheck) && !rtbDegraded,
      api: "healthy" as const,
      database: dbCheck ? ("healthy" as const) : ("degraded" as const),
      rtbEngine: dbCheck && !rtbDegraded ? ("healthy" as const) : ("degraded" as const),
      providers: providers.map((p) => ({ name: p.name, status: p.status })),
      avgResponseMs,
      requestsPerMin: recentMinute,
      errorsPerMin: recentErrors,
    },
    totals: {
      leads: scopedLeads.length,
      bidRequests,
      bidsReceived: buyerResponses,
      winRate: bidRequests ? round1((winningBids / bidRequests) * 100) : 0,
      qualifiedLeads: qualifiedLeadIds.size,
      revenue: Math.round(revenue * 100) / 100,
      avgBid: bidCount ? Math.round((bidSum / bidCount) * 100) / 100 : 0,
      rejectRate: bidRequests ? round1((rejectedCount / bidRequests) * 100) : 0,
    },
    timeseries: [...series.values()],
    funnel: {
      leads: scopedLeads.length,
      bidRequests,
      buyerResponses,
      validBids,
      winningBids,
      revenue: Math.round(revenue * 100) / 100,
    },
    buyers,
    campaigns,
    providers,
    rejections,
    activity,
    recentLeads,
    options: {
      campaigns: campaignRows.map((c) => ({ id: c.id, name: c.name })),
      buyers: buyerRows.map((b) => ({ id: b.id, name: b.name })),
      providers: [...knownProviders].map((key) => ({ key, name: providerLabel(key) })).sort((a, b) => a.name.localeCompare(b.name)),
      states,
    },
  };
}

/** Stats for a single signed-in user. Never includes other agents. */
export async function performanceForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;

  const [leads, sold, revenueAgg, crmGroups] = await Promise.all([
    prisma.lead.count({ where: { agentId: userId } }),
    prisma.lead.count({ where: { agentId: userId, status: "SOLD" } }),
    prisma.lead.aggregate({ where: { agentId: userId }, _sum: { revenue: true } }),
    prisma.crmEntry.groupBy({ by: ["status"], where: { agentId: userId }, _count: true }),
  ]);

  const crm = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of crmGroups) crm[row.status] = row._count;
  const revenue = Number(revenueAgg._sum.revenue ?? 0);

  return {
    ...user,
    leads,
    sold,
    revenue,
    conversionRate: leads ? Math.round((sold / leads) * 1000) / 10 : 0,
    crm,
  };
}

export async function agentPerformance() {
  const agents = await prisma.user.findMany({
    where: { role: "AGENT" },
    select: { id: true, name: true, email: true, active: true },
  });

  const [leadGroups, soldGroups, revenueGroups, crmGroups] = await Promise.all([
    prisma.lead.groupBy({ by: ["agentId"], _count: true }),
    prisma.lead.groupBy({ by: ["agentId"], where: { status: "SOLD" }, _count: true }),
    prisma.lead.groupBy({ by: ["agentId"], _sum: { revenue: true } }),
    prisma.crmEntry.groupBy({ by: ["agentId", "status"], _count: true }),
  ]);

  const countOf = (rows: { agentId: string; _count: number }[]) => new Map(rows.map((r) => [r.agentId, r._count]));
  const leadCounts = countOf(leadGroups);
  const sold = countOf(soldGroups);
  const revenue = new Map(revenueGroups.map((r) => [r.agentId, Number(r._sum.revenue ?? 0)]));

  return agents
    .map((agent) => {
      const crm = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
      for (const row of crmGroups) {
        if (row.agentId === agent.id) crm[row.status] = row._count;
      }
      const totalLeads = leadCounts.get(agent.id) ?? 0;
      const soldLeads = sold.get(agent.id) ?? 0;
      return {
        ...agent,
        leads: totalLeads,
        sold: soldLeads,
        revenue: revenue.get(agent.id) ?? 0,
        conversionRate: totalLeads ? Math.round((soldLeads / totalLeads) * 1000) / 10 : 0,
        crm,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
