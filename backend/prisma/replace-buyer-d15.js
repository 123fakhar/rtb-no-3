const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const caller = [
  { key: "CALLER_ID", value: "{caller_id}" },
  { key: "caller_zip", value: "{caller_zip}" },
  { key: "ZIP_CODE", value: "{caller_zip}" },
  { key: "CALLER_STATE", value: "{caller_state}" },
];

const HOME_HOURS = {
  timezone: "America/New_York",
  label: "Mon–Fri 9am–7pm ET, Sat 12pm–5pm ET",
  windows: [
    { days: [1, 2, 3, 4, 5], start: "09:00", end: "19:00" },
    { days: [6], start: "12:00", end: "17:00" },
  ],
};

const OFFERS = [
  {
    name: "Buyer D15 Auto Insurance",
    company: "Auto Insurance",
    notes: "Moja inbound. Nationwide. 24/7.",
    campaignName: "Auto Insurance",
    baseUrl: "https://rtb.moja.cloud/inbound_rtb/inbound_rtb_1795450786922_3f6a0c2d",
    hours: null,
  },
  {
    name: "Buyer D15 Home Insurance",
    company: "Home Insurance",
    notes: "Moja inbound. Nationwide. Mon–Fri 9am–7pm ET, Sat 12pm–5pm ET.",
    campaignName: "Home Insurance",
    baseUrl: "https://rtb.moja.cloud/inbound_rtb/inbound_rtb_1795450648888_a0187203",
    hours: HOME_HOURS,
  },
];

async function upsertOffer(offer) {
  const campaign = await prisma.campaign.findFirst({
    where: { name: offer.campaignName },
    select: { id: true },
  });
  const buyerData = {
    company: offer.company,
    provider: "moja",
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
    provider: "moja",
    method: "GET",
    mode: "rtb",
    status: "ENABLED",
    baseUrl: offer.baseUrl,
    apiKey: "",
    params: caller,
    staticParams: {},
    headers: {},
    extra: { hours: offer.hours },
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
    where: { name: { contains: "D15" } },
    select: { id: true, name: true },
  });
  const removed = [];
  for (const buyer of previous) {
    if (keep.has(buyer.name) || !/\bD15\b/.test(buyer.name)) continue;
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
