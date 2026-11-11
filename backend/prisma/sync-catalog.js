const { readFileSync } = require("fs");
const { join } = require("path");
const { PrismaClient } = require("@prisma/client");

function loadCatalog() {
  return JSON.parse(readFileSync(join(process.cwd(), "prisma", "reference-catalog.json"), "utf8"));
}

async function syncReferenceCatalog(prisma) {
  const catalog = loadCatalog();
  const campaigns = new Map();

  for (const campaign of catalog.campaigns) {
    const row = await prisma.campaign.upsert({
      where: { name: campaign.name },
      update: {
        vertical: campaign.vertical,
        description: campaign.description,
        active: campaign.active,
        defaults: campaign.defaults,
      },
      create: campaign,
    });
    campaigns.set(campaign.name, row.id);
  }

  const buyers = new Map();
  for (const buyer of catalog.buyers) {
    const existing = await prisma.buyer.findFirst({ where: { name: buyer.name } });
    const data = {
      company: buyer.company,
      provider: buyer.provider,
      priority: buyer.priority,
      weight: buyer.weight,
      status: buyer.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    };
    const row = existing
      ? await prisma.buyer.update({ where: { id: existing.id }, data })
      : await prisma.buyer.create({ data: { name: buyer.name, ...data } });
    buyers.set(buyer.name, row.id);
  }

  for (const api of catalog.apis) {
    const buyerName = api.buyerName || api.name.replace(/\s+[-—].*$/, "").trim() || api.name;
    let buyerId = buyers.get(buyerName);
    if (!buyerId) {
      const created = await prisma.buyer.create({
        data: {
          name: buyerName,
          provider: api.provider,
          priority: 1,
          weight: 100,
          status: "ACTIVE",
        },
      });
      buyerId = created.id;
      buyers.set(buyerName, buyerId);
    }
    const campaignId = api.campaignName ? campaigns.get(api.campaignName) ?? null : null;
    const data = {
      buyerId,
      campaignId,
      provider: api.provider,
      method: api.method === "POST" ? "POST" : "GET",
      mode: api.mode,
      status: api.status === "ENABLED" ? "ENABLED" : "DISABLED",
      baseUrl: api.baseUrl,
      apiKey: api.apiKey,
      params: api.params,
      staticParams: api.staticParams,
      headers: api.headers,
      extra: api.extra,
    };
    const existing = await prisma.rtbConfig.findFirst({
      where: { buyerId, name: api.name },
    });
    if (existing) {
      await prisma.rtbConfig.update({ where: { id: existing.id }, data });
    } else {
      await prisma.rtbConfig.create({ data: { name: api.name, ...data } });
    }
  }

  return {
    campaigns: catalog.campaigns.length,
    buyers: catalog.buyers.length,
    apis: catalog.apis.length,
  };
}

const prisma = new PrismaClient();

syncReferenceCatalog(prisma)
  .then((counts) => {
    console.log(`Synced ${counts.campaigns} campaigns, ${counts.buyers} buyers, ${counts.apis} APIs`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
