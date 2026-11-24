const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const NAME = "Buyer D5 Auto Insurance";

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: { name: "Auto Insurance" },
    select: { id: true },
  });

  let buyer = await prisma.buyer.findFirst({ where: { name: NAME } });
  const buyerData = {
    company: "Auto Insurance",
    provider: "retreaver",
    priority: 1,
    weight: 100,
    status: "ACTIVE",
  };
  buyer = buyer
    ? await prisma.buyer.update({ where: { id: buyer.id }, data: buyerData })
    : await prisma.buyer.create({ data: { name: NAME, ...buyerData } });

  const data = {
    buyerId: buyer.id,
    campaignId: campaign?.id ?? null,
    provider: "retreaver",
    method: "POST",
    mode: "rtb",
    status: "ENABLED",
    baseUrl: "https://rtb.retreaver.com/rtbs.json",
    apiKey: "180ede0b-c2f1-4c8f-a0fe-a2becb40370d",
    params: [
      { key: "caller_number", value: "{caller_number}" },
      { key: "caller_state", value: "{caller_state}" },
      { key: "caller_zip", value: "{caller_zip}" },
      { key: "placement_id", value: "{placement_id}" },
    ],
    staticParams: { homeowner: "yes" },
    headers: {},
    extra: {
      rtbId: "",
      publisherId: "",
      trafficSourceId: "",
      trackdriveNumber: "",
      providerCampaignId: "",
      campaignKey: "",
      pingEndpoint: "",
      postEndpoint: "",
    },
  };

  const existing = await prisma.rtbConfig.findFirst({ where: { buyerId: buyer.id, name: NAME } });
  const config = existing
    ? await prisma.rtbConfig.update({ where: { id: existing.id }, data })
    : await prisma.rtbConfig.create({ data: { name: NAME, ...data } });

  console.log(JSON.stringify({ buyerId: buyer.id, configId: config.id, campaignId: campaign?.id ?? null }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
