import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Resetting and initializing clean RTB database...");

  // 1. Wipe all existing test/mock data completely
  await prisma.apiLog.deleteMany();
  await prisma.crmEntry.deleteMany();
  await prisma.ping.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.rtbConfig.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin12345", 10);
  const agentPasswordHash = await bcrypt.hash("agent12345", 10);

  // 2. Create Admin user
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@rtb.local",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  // 3. Create > 20 Agent IDs (25 active agent accounts)
  for (let i = 1; i <= 25; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    await prisma.user.create({
      data: {
        name: `Agent ${num}`,
        email: `agent${i}@rtb.local`,
        passwordHash: agentPasswordHash,
        role: Role.AGENT,
        active: true,
      },
    });
  }
  console.log("✅ Created Admin and 25 Agent accounts");

  const { syncReferenceCatalog } = await import("./sync-catalog");
  const counts = await syncReferenceCatalog(prisma);
  console.log(`✅ Synced ${counts.campaigns} campaigns, ${counts.buyers} buyers, ${counts.apis} RTB APIs`);
  console.log("✨ RTB Database reset complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
