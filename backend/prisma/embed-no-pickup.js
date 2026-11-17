const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function text(value) {
  if (value == null) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value === "object" && value.text) return String(value.text);
  if (typeof value === "object" && value.result != null) return text(value.result);
  return String(value).replace(/\s+/g, " ").trim();
}

function phoneOf(value) {
  const digits = text(value).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return "";
}

function shiftInstant(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 13, 30, 0));
}

function parseRow(values) {
  let phone = "";
  let when = null;
  let agent = "";
  for (let index = 1; index <= 10; index += 1) {
    const raw = values[index];
    const value = text(raw);
    if (!value) continue;
    const instant = shiftInstant(raw);
    if (instant) {
      when = instant;
      continue;
    }
    const phoneValue = phoneOf(value);
    if (!phone && phoneValue) {
      phone = phoneValue;
      continue;
    }
    if (/^[a-z][a-z .'-]{1,40}$/i.test(value) && !/xfer|ring|office|closed|buffer|hang|sale|agent_name|date|auto|home/i.test(value)) {
      agent = value;
    }
  }
  return { phone, when, agent: agent.slice(0, 120) };
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) throw new Error("Pass the no-pickup workbook");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet("NO PICK UP");
  if (!sheet) throw new Error("NO PICK UP sheet is missing");

  const fromFile = new Map();
  sheet.eachRow((row) => {
    const parsed = parseRow(row.values);
    if (!parsed.phone) return;
    const current = fromFile.get(parsed.phone) || { when: null, agent: "" };
    if (parsed.when && (!current.when || parsed.when > current.when)) current.when = parsed.when;
    if (parsed.agent) current.agent = parsed.agent;
    fromFile.set(parsed.phone, current);
  });

  const existing = await prisma.crmEntry.findMany({
    where: { pingId: "sheet-import", status: "REJECTED" },
    select: { id: true, customerNumber: true, fronterName: true, reportedAt: true },
  });
  const byPhone = new Map();
  for (const entry of existing) {
    const phone = phoneOf(entry.customerNumber);
    if (!phone) continue;
    const list = byPhone.get(phone) || [];
    list.push(entry);
    byPhone.set(phone, list);
  }

  let dated = 0;
  let named = 0;
  for (const [phone, info] of fromFile) {
    const rows = byPhone.get(phone) || [];
    for (const entry of rows) {
      const data = {};
      if (info.when && !entry.reportedAt) {
        data.reportedAt = info.when;
        data.createdAt = info.when;
        dated += 1;
      }
      if (info.agent && (!entry.fronterName || entry.fronterName === "Sheet import")) {
        data.fronterName = info.agent;
        data.closerName = info.agent;
        named += 1;
      }
      if (Object.keys(data).length) {
        await prisma.crmEntry.update({ where: { id: entry.id }, data });
      }
    }
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) throw new Error("No admin user");
  const missing = [];
  for (const [phone, info] of fromFile) {
    if (byPhone.has(phone)) continue;
    missing.push({
      fronterName: info.agent || "No pickup",
      closerName: info.agent || "",
      customerName: "No pickup",
      customerNumber: phone,
      customerZip: "00000",
      customerEmail: "",
      did: "",
      comment: "No pickup sheet",
      kind: "SALE",
      status: "REJECTED",
      pingId: "sheet-import",
      agentId: admin.id,
      reportedAt: info.when,
      createdAt: info.when || new Date("2020-01-01T13:30:00.000Z"),
    });
  }
  for (let index = 0; index < missing.length; index += 200) {
    await prisma.crmEntry.createMany({ data: missing.slice(index, index + 200) });
  }

  const rejected = await prisma.crmEntry.count({ where: { pingId: "sheet-import", status: "REJECTED" } });
  console.log(JSON.stringify({
    filePhones: fromFile.size,
    alreadyStoredPhones: byPhone.size,
    datesAdded: dated,
    namesAdded: named,
    inserted: missing.length,
    rejected,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
