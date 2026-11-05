import { PrismaClient } from "@prisma/client";
import { syncReferenceCatalog } from "../prisma/sync-catalog";

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
