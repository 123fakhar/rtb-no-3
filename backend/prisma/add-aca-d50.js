const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BUYER_NAME = "ACA D50";
const PING_URL =
  "https://api.nextgeninsurancesolutionsinc.com/api/vendor/ping/457de3e2-88d2-47e2-b79e-55e0f4bd7062/[Call:CallerId]";
const DID = "8037236864";

async function main() {
  const campaign = await prisma.campaign.upsert({
    where: { name: "ACA" },
    update: { active: true, vertical: "ACA", team: true },
    create: {
      name: "ACA",
      vertical: "ACA",
      description: "ACA calls routed to D50",
      active: true,
      team: true,
    },
  });

  let buyer = await prisma.buyer.findFirst({ where: { name: BUYER_NAME } });
  if (!buyer) {
    buyer = await prisma.buyer.create({
      data: {
        name: BUYER_NAME,
        company: "NextGen Insurance Solutions",
        provider: "nextgen",
        priority: 50,
        status: "ACTIVE",
        notes: "Transfer (803) 723-6864",
      },
    });
  } else {
    buyer = await prisma.buyer.update({
      where: { id: buyer.id },
      data: { provider: "nextgen", status: "ACTIVE", company: "NextGen Insurance Solutions" },
    });
  }

  const extra = { did: DID, transferNumber: "+18037236864" };
  const existing = await prisma.rtbConfig.findFirst({ where: { buyerId: buyer.id, name: BUYER_NAME } });
  const config = existing
    ? await prisma.rtbConfig.update({
        where: { id: existing.id },
        data: {
          campaignId: campaign.id,
          provider: "nextgen",
          method: "GET",
          mode: "RTB",
          status: "ENABLED",
          baseUrl: PING_URL,
          params: [],
          extra,
        },
      })
    : await prisma.rtbConfig.create({
        data: {
          name: BUYER_NAME,
          buyerId: buyer.id,
          campaignId: campaign.id,
          provider: "nextgen",
          method: "GET",
          mode: "RTB",
          status: "ENABLED",
          baseUrl: PING_URL,
          params: [],
          extra,
        },
      });

  console.log(JSON.stringify({ campaignId: campaign.id, buyerId: buyer.id, configId: config.id }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
