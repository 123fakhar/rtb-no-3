const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const HOME_SERVICES = [
  "Appliance",
  "Bathroom",
  "Electrical",
  "Final Expense",
  "Flooring",
  "Gutters",
  "HVAC",
  "Home Warranty",
  "Kitchen",
  "Medicare",
  "Pest Control",
  "Plumbing",
  "Roofing",
  "Siding",
  "Water Damage",
  "Windows",
];

async function ensure(name, vertical) {
  const existing = await prisma.campaign.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.campaign.create({
    data: { name, vertical, description: "", active: true, defaults: {}, team: false },
  });
}

async function main() {
  const auto = await ensure("Auto Insurance", "Auto Insurance");
  const home = await ensure("Home Services", "Home Services");
  await prisma.campaign.update({ where: { id: auto.id }, data: { team: true, parentId: null } });
  await prisma.campaign.update({ where: { id: home.id }, data: { team: true, parentId: null } });
  for (const name of HOME_SERVICES) {
    const child = await ensure(name, name);
    if (child.id !== home.id) {
      await prisma.campaign.update({ where: { id: child.id }, data: { parentId: home.id, team: false } });
    }
  }
  const teams = await prisma.campaign.findMany({ where: { team: true }, select: { name: true } });
  const children = await prisma.campaign.count({ where: { parentId: home.id } });
  console.log(JSON.stringify({ teams: teams.map((team) => team.name), homeServices: children }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
