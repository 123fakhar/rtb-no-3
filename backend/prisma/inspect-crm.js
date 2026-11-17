const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.crmEntry.findFirst({
    where: { pingId: "sheet-import", status: "REJECTED" },
    select: {
      fronterName: true,
      closerName: true,
      campaignId: true,
      did: true,
      comment: true,
      buyerId: true,
      agent: { select: { role: true } },
    },
  });
  const agents = await prisma.$queryRaw`
    SELECT u.role::text AS role, e.status, COUNT(*)::int AS count
    FROM "CrmEntry" e
    JOIN "User" u ON u.id = e."agentId"
    WHERE e."pingId" = 'sheet-import'
    GROUP BY 1, 2
  `;
  console.log(JSON.stringify({
    sample: sample ? {
      fronter: sample.fronterName,
      closer: sample.closerName,
      hasCampaign: Boolean(sample.campaignId),
      did: sample.did,
      hasBuyer: Boolean(sample.buyerId),
      role: sample.agent.role,
      comment: sample.comment,
    } : null,
    agents,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
