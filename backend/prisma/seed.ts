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
  const managerPasswordHash = await bcrypt.hash("manager12345", 10);
  const closerPasswordHash = await bcrypt.hash("closer12345", 10);

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@rtb.local",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Floor Manager",
      email: "manager@rtb.local",
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      active: true,
    },
  });

  for (let i = 1; i <= 30; i++) {
    await prisma.user.create({
      data: {
        name: `Closer ${i}`,
        email: `closer${i}@rtb.local`,
        passwordHash: closerPasswordHash,
        role: Role.CLOSER,
        active: true,
      },
    });
  }
  console.log("✅ Created admin, manager, and 30 closer accounts");

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
