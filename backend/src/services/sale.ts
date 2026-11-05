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

  const rows = await prisma.crmEntry.findMany({
    where: {
      status: { in: ["APPROVED", "REJECTED"] },
      buyerId: { not: null },
      OR: [
        { customerNumber: { contains: key } },
        { lead: { is: { phone: { contains: key } } } },
      ],
    },
    select: {
      buyerId: true,
      status: true,
      customerNumber: true,
      lead: { select: { phone: true } },
    },
  });

  const byBuyer = new Map<string, "APPROVED" | "REJECTED">();
  for (const row of rows) {
    if (!row.buyerId) continue;
    if (row.status !== "APPROVED" && row.status !== "REJECTED") continue;
    const sameCustomer =
      phoneKey(row.customerNumber) === key || phoneKey(row.lead?.phone ?? "") === key;
    if (!sameCustomer) continue;
    if (byBuyer.get(row.buyerId) === "APPROVED") continue;
    byBuyer.set(row.buyerId, row.status);
  }

  return [...byBuyer.entries()].map(([buyerId, status]) => ({ buyerId, status }));
}

/** A bid is not a sale. The lead is sold only while an admin-approved CRM entry exists. */
export async function syncLeadSale(leadId: string) {
  const approved = await prisma.crmEntry.findMany({
    where: { leadId, status: "APPROVED", buyerId: { not: null } },
    orderBy: { reviewedAt: "desc" },
  });

  if (approved.length === 0) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "SUBMITTED", buyerId: null, revenue: 0 },
    });
    return;
  }

  let winner = approved[0];
  let winnerBid = 0;
  for (const entry of approved) {
    const ping = entry.pingId
      ? await prisma.ping.findUnique({ where: { id: entry.pingId }, select: { bid: true } })
      : null;
    const bid = ping?.bid ? Number(ping.bid) : 0;
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
