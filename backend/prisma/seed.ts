import { PrismaClient, Role, BuyerStatus, ConfigStatus, HttpMethod } from "@prisma/client";
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

  // 4. Create Standard Industry Campaigns (Predefined templates)
  const campaignData = [
    {
      name: "Auto Insurance",
      vertical: "Auto Insurance",
      description: "Motor vehicle insurance lead generation and real-time call transfers.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Home Insurance",
      vertical: "Home Insurance",
      description: "Homeowners, renters, and dwelling property insurance policies.",
      defaults: { homeowner: "yes", property_type: "single_family" },
    },
    {
      name: "Final Expense",
      vertical: "Life Insurance",
      description: "Senior final expense and whole life coverage.",
      defaults: {},
    },
    {
      name: "Bathroom",
      vertical: "Home Improvement",
      description: "Bathroom remodel, walk-in tubs, and liner conversions.",
      defaults: { homeowner: "yes", property_type: "single_family" },
    },
    {
      name: "HVAC",
      vertical: "Home Services",
      description: "Heating, ventilation, air conditioning installation and repair.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Pest Control",
      vertical: "Home Services",
      description: "Termite, bedbug, and general residential pest extermination.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Plumbing",
      vertical: "Home Services",
      description: "Emergency residential plumbing and pipe diagnostics.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Home Warranty",
      vertical: "Warranty",
      description: "Whole home systems and appliances warranty policies.",
      defaults: { homeowner: "yes" },
      active: false,
    },
  ];

  const campaignMap = new Map<string, any>();
  for (const c of campaignData) {
    const record = await prisma.campaign.create({ data: c });
    campaignMap.set(c.name, record);
  }
  console.log(`✅ Created ${campaignMap.size} Campaigns`);

  // 5. Seed only the user's specific reference configuration (with 0 calls / 0 pings / Never tested)
  const homeCampaign = campaignMap.get("Home Insurance");
  const buyer = await prisma.buyer.create({
    data: {
      name: "Buyer D12 New",
      company: "Home Insurance Group",
      provider: "ringba",
      priority: 1,
      weight: 100,
      status: BuyerStatus.ACTIVE,
      notes: "Configured RTB buyer",
    },
  });

  await prisma.rtbConfig.create({
    data: {
      name: "BD12 - Home Insurance",
      buyerId: buyer.id,
      campaignId: homeCampaign?.id,
      provider: "ringba",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.ringba.com/v1/production/94aac31aff6849429a65452f6318e344.json",
      apiKey: "rtb_979hE48dYkmLzCTi2ucDCBl0x0Conueo",
      params: [
        { key: "caller_number", value: "{caller_number}" },
        { key: "caller_zip", value: "{caller_zip}" },
        { key: "caller_state", value: "{caller_state}" },
        { key: "placement_id", value: "{placement_id}" },
      ],
      staticParams: { homeowner: "yes", property_type: "single_family" },
      successCount: 0,
      totalCount: 0,
      lastTestedAt: null,
    },
  });

  console.log("✅ Seeded initial clean reference configuration (0 calls, 0 pings made)");
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
