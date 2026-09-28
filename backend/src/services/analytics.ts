import { prisma } from "../lib/prisma";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function dashboard(from: Date) {
  const [leadCount, soldCount, revenueAgg, pingCount, reservedCount, errorCount, leads, pingsByBuyer, crmByStatus] =
    await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: from } } }),
      prisma.lead.count({ where: { createdAt: { gte: from }, status: "SOLD" } }),
      prisma.lead.aggregate({ where: { createdAt: { gte: from } }, _sum: { revenue: true } }),
      prisma.ping.count({ where: { createdAt: { gte: from } } }),
      prisma.ping.count({ where: { createdAt: { gte: from }, status: "RESERVED" } }),
      prisma.ping.count({ where: { createdAt: { gte: from }, status: "ERROR" } }),
      prisma.lead.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, status: true, revenue: true, campaignId: true },
      }),
      prisma.ping.groupBy({
        by: ["buyerId", "status"],
        where: { createdAt: { gte: from } },
        _count: true,
        _avg: { durationMs: true },
      }),
      prisma.crmEntry.groupBy({ by: ["status"], _count: true }),
    ]);

  const perDay = new Map<string, { date: string; leads: number; sold: number; revenue: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    perDay.set(key, { date: key, leads: 0, sold: 0, revenue: 0 });
  }
  for (const lead of leads) {
    const bucket = perDay.get(dayKey(lead.createdAt));
    if (!bucket) continue;
    bucket.leads += 1;
    if (lead.status === "SOLD") bucket.sold += 1;
    bucket.revenue += Number(lead.revenue);
  }

  const buyers = await prisma.buyer.findMany({ select: { id: true, name: true, provider: true } });
  const buyerName = new Map(buyers.map((b) => [b.id, b]));
  const buyerPerf = new Map<string, { buyer: string; provider: string; pings: number; wins: number; errors: number; avgMs: number }>();
  for (const row of pingsByBuyer) {
    if (!row.buyerId) continue;
    const entry = buyerPerf.get(row.buyerId) ?? {
      buyer: buyerName.get(row.buyerId)?.name ?? "Unknown",
      provider: buyerName.get(row.buyerId)?.provider ?? "",
      pings: 0,
      wins: 0,
      errors: 0,
      avgMs: 0,
    };
    entry.pings += row._count;
    if (row.status === "RESERVED") entry.wins += row._count;
    if (row.status === "ERROR") entry.errors += row._count;
    entry.avgMs = Math.round(row._avg.durationMs ?? entry.avgMs);
    buyerPerf.set(row.buyerId, entry);
  }

  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const campaignPerf = new Map<string, { campaign: string; leads: number; sold: number }>();
  for (const lead of leads) {
    const key = lead.campaignId ?? "none";
    const entry = campaignPerf.get(key) ?? { campaign: campaignName.get(key) ?? "Unassigned", leads: 0, sold: 0 };
    entry.leads += 1;
    if (lead.status === "SOLD") entry.sold += 1;
    campaignPerf.set(key, entry);
  }

  const providerPerf = new Map<string, { provider: string; pings: number; wins: number }>();
  for (const entry of buyerPerf.values()) {
    const p = providerPerf.get(entry.provider) ?? { provider: entry.provider || "unknown", pings: 0, wins: 0 };
    p.pings += entry.pings;
    p.wins += entry.wins;
    providerPerf.set(entry.provider, p);
  }

  return {
    totals: {
      leads: leadCount,
      sold: soldCount,
      qualified: soldCount,
      revenue: Number(revenueAgg._sum.revenue ?? 0),
      bidRequests: pingCount,
      bidResponses: reservedCount,
      winRate: pingCount ? Math.round((reservedCount / pingCount) * 1000) / 10 : 0,
      conversionRate: leadCount ? Math.round((soldCount / leadCount) * 1000) / 10 : 0,
      errors: errorCount,
    },
    timeseries: [...perDay.values()],
    buyers: [...buyerPerf.values()].sort((a, b) => b.pings - a.pings),
    campaigns: [...campaignPerf.values()].sort((a, b) => b.leads - a.leads),
    providers: [...providerPerf.values()].sort((a, b) => b.pings - a.pings),
    crm: Object.fromEntries(crmByStatus.map((r) => [r.status, r._count])),
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
  const leads = countOf(leadGroups);
  const sold = countOf(soldGroups);
  const revenue = new Map(revenueGroups.map((r) => [r.agentId, Number(r._sum.revenue ?? 0)]));

  return agents
    .map((agent) => {
      const crm = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
      for (const row of crmGroups) {
        if (row.agentId === agent.id) crm[row.status] = row._count;
      }
      const totalLeads = leads.get(agent.id) ?? 0;
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
