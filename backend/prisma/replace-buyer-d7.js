const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const emptyExtra = {
  rtbId: "",
  publisherId: "5455e7fa",
  trafficSourceId: "",
  trackdriveNumber: "",
  providerCampaignId: "",
  campaignKey: "",
  pingEndpoint: "",
  postEndpoint: "",
};

const caller = [
  { key: "caller_number", value: "{caller_number}" },
  { key: "caller_state", value: "{caller_state}" },
  { key: "caller_zip", value: "{caller_zip}" },
];

const OFFERS = [
  {
    name: "Buyer D7 Auto Insurance",
    company: "Auto Insurance",
    notes: "Inbound. EN. Nationwide. Insured callers. Payout $19-$70. Open cap. 24/7. Publisher 5455e7fa.",
    campaignName: "Auto Insurance",
    apiKey: "99479dbb-81a7-4130-96c3-e24e6044ea4e",
    staticParams: { currently_insured: "yes", language: "EN" },
    params: [
      { key: "caller_number", value: "{caller_number}" },
      { key: "caller_state", value: "{caller_state}" },
      { key: "caller_zip", value: "{caller_zip}" },
      { key: "homeowner", value: "" },
    ],
  },
  {
    name: "Buyer D7 Home Insurance",
    company: "Home Insurance",
    notes: "Inbound. EN. Nationwide. Homeowners only. Payout $15-$60. Open cap. 9am-7pm EST Mon-Fri. Publisher 5455e7fa.",
    campaignName: "Home Insurance",
    apiKey: "bb1a6288-1ff0-44d2-8ff3-1eaa0f159b99",
    staticParams: { homeowner: "yes", language: "EN" },
    params: [
      ...caller,
      { key: "property_type", value: "" },
    ],
  },
];

async function upsertOffer(offer) {
  const campaign = await prisma.campaign.findFirst({
    where: { name: offer.campaignName },
    select: { id: true },
  });
  const buyerData = {
    company: offer.company,
    provider: "retreaver",
    priority: 1,
    weight: 100,
    status: "ACTIVE",
    notes: offer.notes,
  };
  let buyer = await prisma.buyer.findFirst({ where: { name: offer.name } });
  buyer = buyer
    ? await prisma.buyer.update({ where: { id: buyer.id }, data: buyerData })
    : await prisma.buyer.create({ data: { name: offer.name, ...buyerData } });

  const data = {
    buyerId: buyer.id,
    campaignId: campaign?.id ?? null,
    provider: "retreaver",
    method: "POST",
    mode: "rtb",
    status: "ENABLED",
    baseUrl: "https://rtb.retreaver.com/rtbs.json",
    apiKey: offer.apiKey,
    params: offer.params,
    staticParams: offer.staticParams,
    headers: {},
    extra: emptyExtra,
  };
  const existing = await prisma.rtbConfig.findFirst({ where: { buyerId: buyer.id, name: offer.name } });
  const config = existing
    ? await prisma.rtbConfig.update({ where: { id: existing.id }, data })
    : await prisma.rtbConfig.create({ data: { name: offer.name, ...data } });
  return { name: offer.name, buyerId: buyer.id, configId: config.id, campaignId: campaign?.id ?? null };
}

async function main() {
  const keep = new Set(OFFERS.map((offer) => offer.name));
  const previous = await prisma.buyer.findMany({
    where: { name: { contains: "D7" } },
    select: { id: true, name: true },
  });
  const removed = [];
  for (const buyer of previous) {
    if (keep.has(buyer.name) || !/\bD7\b/.test(buyer.name)) continue;
    await prisma.buyer.delete({ where: { id: buyer.id } });
    removed.push(buyer.name);
  }
  const added = [];
  for (const offer of OFFERS) added.push(await upsertOffer(offer));
  console.log(JSON.stringify({ removed, added }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
