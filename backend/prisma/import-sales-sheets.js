const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function cell(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value.text) return String(value.text);
  if (typeof value === "object" && value.result != null) return cell(value.result);
  return String(value).replace(/\s+/g, " ").trim();
}

function digits(value) {
  return cell(value).replace(/\D/g, "");
}

function campaignBucket(raw) {
  const text = raw.toLowerCase();
  if (text.includes("service")) return "Home Services";
  if (text.includes("auto")) return "Auto Insurance";
  if (text.includes("warranty")) return "Home Warranty";
  if (text.includes("home")) return "Home Insurance";
  if (text.includes("plumb")) return "Plumbing";
  if (text.includes("roof")) return "Roofing";
  if (text.includes("window")) return "Windows";
  if (text.includes("bath")) return "Bathroom";
  if (text.includes("hvac") || text.includes("haoc")) return "HVAC";
  return "";
}

function parseWhen(value) {
  const text = cell(value);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAuto(values) {
  const phoneLate = digits(values[2]);
  const lateCampaign = campaignBucket(cell(values[9]));
  if (phoneLate.length >= 7 && lateCampaign) {
    return {
      when: parseWhen(values[1]),
      phone: phoneLate,
      name: `${cell(values[3])} ${cell(values[4])}`.trim(),
      state: cell(values[5]).slice(0, 8),
      zip: digits(values[6]).slice(0, 10) || "00000",
      agent: cell(values[7]) || "Agent",
      closer: cell(values[8]) || "Closer",
      campaign: lateCampaign,
      did: cell(values[10]).slice(0, 30),
      comment: cell(values[11]).slice(0, 2000),
    };
  }
  const earlyCampaign = campaignBucket(cell(values[10]));
  return {
    when: parseWhen(values[1]),
    phone: digits(values[3]),
    name: `${cell(values[4])} ${cell(values[5])}`.trim(),
    state: cell(values[6]).slice(0, 8),
    zip: digits(values[7]).slice(0, 10) || "00000",
    agent: cell(values[8]) || "Agent",
    closer: cell(values[9]) || "Closer",
    campaign: earlyCampaign,
    did: "",
    comment: cell(values[11]).slice(0, 2000),
  };
}

function parseHome(values) {
  return {
    when: parseWhen(values[1]),
    phone: digits(values[2]),
    name: `${cell(values[3])} ${cell(values[4])}`.trim(),
    state: cell(values[5]).slice(0, 8),
    zip: digits(values[6]).slice(0, 10) || "00000",
    agent: cell(values[7]) || "Agent",
    closer: cell(values[8]) || "Closer",
    campaign: "Home Services",
    did: cell(values[10]).slice(0, 30),
    comment: `${cell(values[9])} ${cell(values[11])}`.trim().slice(0, 2000),
  };
}

async function campaignId(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const existing = await prisma.campaign.findUnique({ where: { name } });
  const row = existing || await prisma.campaign.create({
    data: { name, vertical: name, description: "", active: true, defaults: {} },
  });
  cache.set(name, row.id);
  return row.id;
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) throw new Error("Pass the sales workbook path");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const rows = [];
  const auto = workbook.getWorksheet("AUTOHOME");
  const home = workbook.getWorksheet("HOME SERVICES");
  if (auto) auto.eachRow((row) => rows.push(parseAuto(row.values)));
  if (home) home.eachRow((row, number) => { if (number > 1) rows.push(parseHome(row.values)); });

  const usable = rows.filter((row) => row.when && row.phone.length >= 7 && row.campaign && row.name);
  const campaigns = new Map();
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const admin = users.find((user) => user.role === "ADMIN") || users[0];
  if (!admin) throw new Error("No user available to own imported sales");
  const byName = new Map(users.map((user) => [user.name.toLowerCase().replace(/\s+/g, " "), user.id]));

  const existing = await prisma.crmEntry.findMany({
    where: { kind: "SALE", pingId: null },
    select: { customerNumber: true, createdAt: true, campaignId: true },
  });
  const seen = new Set(existing.map((entry) => `${entry.customerNumber}|${entry.createdAt.toISOString()}|${entry.campaignId || ""}`));

  const batch = [];
  for (const row of usable) {
    const id = await campaignId(row.campaign, campaigns);
    const key = `${row.phone}|${row.when.toISOString()}|${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const owner = byName.get(row.closer.toLowerCase().replace(/\s+/g, " ")) || admin.id;
    batch.push({
      fronterName: row.agent.slice(0, 120),
      closerName: row.closer.slice(0, 120),
      customerName: row.name.slice(0, 120),
      customerNumber: row.phone.slice(0, 25),
      customerZip: row.zip,
      customerEmail: "",
      did: row.did,
      campaignId: id,
      comment: row.comment,
      kind: "SALE",
      status: "APPROVED",
      agentId: owner,
      reportedAt: row.when,
      createdAt: row.when,
    });
  }

  for (let i = 0; i < batch.length; i += 200) {
    await prisma.crmEntry.createMany({ data: batch.slice(i, i + 200) });
  }

  const closers = await prisma.user.findMany({
    where: { role: { in: ["CLOSER", "AGENT"] }, active: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  const autoId = await campaignId("Auto Insurance", campaigns);
  const homeId = await campaignId("Home Services", campaigns);
  let autoCount = 0;
  let homeCount = 0;
  for (const [index, closer] of closers.entries()) {
    if (index < 20) {
      await prisma.campaignMember.upsert({
        where: { campaignId_userId: { campaignId: autoId, userId: closer.id } },
        update: { active: true },
        create: { campaignId: autoId, userId: closer.id, active: true },
      });
      autoCount += 1;
    } else if (index < 30) {
      await prisma.campaignMember.upsert({
        where: { campaignId_userId: { campaignId: homeId, userId: closer.id } },
        update: { active: true },
        create: { campaignId: homeId, userId: closer.id, active: true },
      });
      homeCount += 1;
    }
  }

  console.log(JSON.stringify({
    read: usable.length,
    imported: batch.length,
    autoClosers: autoCount,
    homeClosers: homeCount,
    closerAccounts: closers.length,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
