import { readFileSync } from "fs";
import { join } from "path";
import { BuyerStatus, ConfigStatus, HttpMethod, PrismaClient } from "@prisma/client";

interface Catalog {
  campaigns: {
    name: string;
    vertical: string;
    description: string;
    active: boolean;
    defaults: Record<string, string>;
  }[];
  buyers: {
    name: string;
    company: string;
    provider: string;
    priority: number;
    weight: number;
    status: "ACTIVE" | "INACTIVE";
  }[];
  apis: {
    name: string;
    buyerName: string;
    campaignName: string | null;
    provider: string;
    method: "GET" | "POST";
    mode: string;
    status: "ENABLED" | "DISABLED";
    baseUrl: string;
    apiKey: string;
    params: { key: string; value: string }[];
    staticParams: Record<string, string>;
    headers: Record<string, string>;
    extra: Record<string, string>;
  }[];
}

function loadCatalog(): Catalog {
  return JSON.parse(readFileSync(join(process.cwd(), "prisma", "reference-catalog.json"), "utf8"));
}

/** Upsert reference campaigns, buyers, and RTB endpoints. Does not touch users, leads, or pings. */
export async function syncReferenceCatalog(prisma: PrismaClient) {
  const catalog = loadCatalog();
  const campaigns = new Map<string, string>();

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

  const buyers = new Map<string, string>();
  for (const buyer of catalog.buyers) {
    const existing = await prisma.buyer.findFirst({ where: { name: buyer.name } });
    const data = {
      company: buyer.company,
      provider: buyer.provider,
      priority: buyer.priority,
      weight: buyer.weight,
      status: buyer.status === "ACTIVE" ? BuyerStatus.ACTIVE : BuyerStatus.INACTIVE,
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
          status: BuyerStatus.ACTIVE,
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
      method: api.method === "POST" ? HttpMethod.POST : HttpMethod.GET,
      mode: api.mode,
      status: api.status === "ENABLED" ? ConfigStatus.ENABLED : ConfigStatus.DISABLED,
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
