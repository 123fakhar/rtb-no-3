import { prisma } from "../lib/prisma";

/** Digits that identify a caller. Sheet numbers are 9 digits; normal calls are 10. */
export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length > 11 && digits.startsWith("1")) return digits.slice(-10);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export type ReviewedBuyerBlock = {
  buyerId: string;
  status: "APPROVED" | "REJECTED";
};

/**
 * Buyers this phone number must not be sent to again.
 * An admin approval or rejection both close that buyer. A pending review does not.
 * A new lead with the same number is still the same customer.
 */
export async function reviewedBuyerBlocksForPhone(phone: string): Promise<ReviewedBuyerBlock[]> {
  const key = phoneKey(phone);
  if (key.length < 9) return [];

  const storedKeys = key.length === 10 ? [key, `1${key}`] : [key];
  const reviewed = {
    status: { in: ["APPROVED", "REJECTED"] as ("APPROVED" | "REJECTED")[] },
    buyerId: { not: null },
  };
  const [byNumber, byLead] = await Promise.all([
    prisma.crmEntry.findMany({
      where: { ...reviewed, customerNumber: { in: storedKeys } },
      select: { buyerId: true, status: true, customerNumber: true },
    }),
    prisma.crmEntry.findMany({
      where: { ...reviewed, lead: { is: { phone: { in: storedKeys } } } },
      select: { buyerId: true, status: true, customerNumber: true, lead: { select: { phone: true } } },
    }),
  ]);
  const rows = [
    ...byNumber.map((row) => ({ ...row, leadPhone: "" })),
    ...byLead.map((row) => ({ ...row, leadPhone: row.lead?.phone ?? "" })),
  ];

  const byBuyer = new Map<string, "APPROVED" | "REJECTED">();
  for (const row of rows) {
    if (!row.buyerId) continue;
    if (row.status !== "APPROVED" && row.status !== "REJECTED") continue;
    const sameCustomer = phoneKey(row.customerNumber) === key || phoneKey(row.leadPhone) === key;
    if (!sameCustomer) continue;
    if (byBuyer.get(row.buyerId) === "APPROVED") continue;
    byBuyer.set(row.buyerId, row.status);
  }

  return [...byBuyer.entries()].map(([buyerId, status]) => ({ buyerId, status }));
}

/** D12 and "Buyer D12 New" are the same buyer code. D34 and D38 are not. */
export function buyerCode(name: string): string | null {
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const coded = compact.match(/D0*(\d+)/);
  if (coded) return String(Number(coded[1]));
  const numbered = compact.match(/^BUYER0*(\d+)$/);
  return numbered ? String(Number(numbered[1])) : null;
}

export type ReservedBid = {
  id: string;
  buyerId: string | null;
  bid: number;
  buyerName: string;
  provider: string;
  campaignId: string | null;
};

/** The bid recorded for this sale. Same buyer first, then the same D-code on that lead. */
export function pickSaleBid(bids: ReservedBid[], buyerId: string, buyerName: string): ReservedBid | null {
  const positive = bids.filter((bid) => bid.bid > 0);
  const exact = positive.filter((bid) => bid.buyerId === buyerId);
  const code = buyerCode(buyerName);
  const sameCode = code ? positive.filter((bid) => buyerCode(bid.buyerName) === code) : [];
  const pool = exact.length > 0 ? exact : sameCode;
  return pool.reduce<ReservedBid | null>((best, bid) => (!best || bid.bid > best.bid ? bid : best), null);
}

export async function reservedBidsForLeads(leadIds: string[]): Promise<Map<string, ReservedBid[]>> {
  const unique = [...new Set(leadIds.filter(Boolean))];
  const grouped = new Map<string, ReservedBid[]>();
  if (unique.length === 0) return grouped;
  const pings = await prisma.ping.findMany({
    where: { leadId: { in: unique }, status: "RESERVED", bid: { not: null } },
    select: {
      id: true,
      leadId: true,
      buyerId: true,
      bid: true,
      buyer: { select: { name: true, provider: true } },
      config: { select: { provider: true, campaignId: true } },
    },
  });
  for (const ping of pings) {
    const row: ReservedBid = {
      id: ping.id,
      buyerId: ping.buyerId,
      bid: Number(ping.bid),
      buyerName: ping.buyer?.name ?? "",
      provider: (ping.config?.provider || ping.buyer?.provider || "unknown").toLowerCase(),
      campaignId: ping.config?.campaignId ?? null,
    };
    const list = grouped.get(ping.leadId) ?? [];
    list.push(row);
    grouped.set(ping.leadId, list);
  }
  return grouped;
}

/** A bid is not a sale. The lead is sold only while an admin-approved CRM entry exists. */
export async function syncLeadSale(leadId: string) {
  const approved = await prisma.crmEntry.findMany({
    where: { leadId, status: "APPROVED", buyerId: { not: null }, kind: "SALE" },
    orderBy: { reviewedAt: "desc" },
    include: { buyer: { select: { name: true } } },
  });

  if (approved.length === 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "SUBMITTED", buyerId: null, revenue: 0 },
    });
    return;
  }

  const bidsByLead = await reservedBidsForLeads([leadId]);
  const bids = bidsByLead.get(leadId) ?? [];
  let winner = approved[0];
  let winnerBid = 0;
  for (const entry of approved) {
    let bid = 0;
    if (entry.pingId && entry.pingId !== "sheet-import") {
      const ping = await prisma.ping.findUnique({ where: { id: entry.pingId }, select: { bid: true } });
      bid = ping?.bid ? Number(ping.bid) : 0;
    }
    if (bid <= 0) {
      bid = pickSaleBid(bids, entry.buyerId!, entry.buyer?.name ?? "")?.bid ?? 0;
    }
    if (bid >= winnerBid) {
      winner = entry;
      winnerBid = bid;
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "SOLD",
      buyerId: winner.buyerId,
      revenue: winnerBid,
    },
  });
}
