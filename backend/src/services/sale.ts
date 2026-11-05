import { prisma } from "../lib/prisma";

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
