const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PKT = 5 * 60 * 60 * 1000;

function shiftStart(date) {
  const pkt = new Date(date.getTime() + PKT);
  let year = pkt.getUTCFullYear();
  let month = pkt.getUTCMonth();
  let day = pkt.getUTCDate();
  if (pkt.getUTCHours() < 18) {
    const previous = new Date(Date.UTC(year, month, day - 1));
    year = previous.getUTCFullYear();
    month = previous.getUTCMonth();
    day = previous.getUTCDate();
  }
  return new Date(Date.UTC(year, month, day, 13, 0, 0));
}

async function main() {
  const now = new Date();
  const todayStart = shiftStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const [latest, todaySales, yesterdaySales, todayLeads, yesterdayLeads] = await Promise.all([
    prisma.crmEntry.findFirst({
      where: { kind: "SALE", pingId: null, status: "APPROVED", buyerId: null },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.crmEntry.count({
      where: { kind: "SALE", pingId: null, status: "APPROVED", buyerId: null, createdAt: { gte: todayStart } },
    }),
    prisma.crmEntry.count({
      where: { kind: "SALE", pingId: null, status: "APPROVED", buyerId: null, createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
  ]);
  const calendarStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0) - PKT);
  const calendarSales = await prisma.crmEntry.count({
    where: { kind: "SALE", pingId: null, status: "APPROVED", buyerId: null, createdAt: { gte: calendarStart } },
  });
  console.log(JSON.stringify({
    now: now.toISOString(),
    todayShiftStart: todayStart.toISOString(),
    yesterdayShiftStart: yesterdayStart.toISOString(),
    latestSale: latest ? latest.createdAt.toISOString() : null,
    approvedSalesThisShift: todaySales,
    approvedSalesPreviousShift: yesterdaySales,
    calendarPktSalesSinceMidnight: calendarSales,
    rtbLeadsThisShift: todayLeads,
    rtbLeadsPreviousShift: yesterdayLeads,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
