import { PrismaClient, Role, BuyerStatus, ConfigStatus, HttpMethod, LeadStatus, PingStatus, CrmStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting RTB database seeding...");

  // 1. Clean existing records for fresh idempotent seed
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
  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@rtb.local",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  // 3. Create > 20 Agent IDs (25 active agent accounts)
  const agentUsers: any[] = [];
  for (let i = 1; i <= 25; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    const agent = await prisma.user.create({
      data: {
        name: `Agent ${num}`,
        email: `agent${i}@rtb.local`,
        passwordHash: agentPasswordHash,
        role: Role.AGENT,
        active: true,
      },
    });
    agentUsers.push(agent);
  }
  console.log(`✅ Created Admin and ${agentUsers.length} Agent accounts`);

  // 4. Create Built-in Campaigns
  const campaignData = [
    {
      name: "Auto Insurance",
      vertical: "Auto",
      description: "Motor vehicle insurance lead generation and call transfers.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Bathroom",
      vertical: "Home Improvement",
      description: "Bathroom remodel, walk-in tubs, and liner conversions.",
      defaults: { homeowner: "yes", property_type: "single_family" },
    },
    {
      name: "Final Expense",
      vertical: "Life Insurance",
      description: "Senior final expense and whole life coverage.",
      defaults: {},
    },
    {
      name: "HVAC",
      vertical: "Home Services",
      description: "Heating, ventilation, air conditioning installation and repair.",
      defaults: { homeowner: "yes" },
    },
    {
      name: "Home Insurance",
      vertical: "Home Insurance",
      description: "Homeowners, renters, and dwelling property insurance policies.",
      defaults: { homeowner: "yes", property_type: "single_family" },
    },
    {
      name: "Home Warranty",
      vertical: "Warranty",
      description: "Whole home systems and appliances warranty policies.",
      defaults: { homeowner: "yes" },
      active: false,
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
  ];

  const campaignMap = new Map<string, any>();
  for (const c of campaignData) {
    const record = await prisma.campaign.create({ data: c });
    campaignMap.set(c.name, record);
  }
  console.log(`✅ Created ${campaignMap.size} Campaigns`);

  // 5. Create Buyers with Priority & Status matching screenshots
  const buyerData = [
    { name: "Buyer 11", company: "Retreaver publisher c492b33b", provider: "retreaver", priority: 1, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer 19", company: "Auto Insurance", provider: "trackdrive", priority: 2, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D1", company: "Retreaver Pool", provider: "retreaver", priority: 3, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D12", company: "Ringba", provider: "ringba", priority: 4, weight: 100, status: BuyerStatus.INACTIVE },
    { name: "Buyer D12 New", company: "Home Insurance", provider: "ringba", priority: 5, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D13", company: "UHK Networks LLC", provider: "trackdrive", priority: 6, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D14", company: "The Lead Penguin", provider: "trackdrive", priority: 7, weight: 100, status: BuyerStatus.INACTIVE },
    { name: "Buyer D15", company: "The Lead Penguin", provider: "trackdrive", priority: 8, weight: 100, status: BuyerStatus.INACTIVE },
    { name: "Buyer D17 Auto Insurance", company: "Auto Insurance", provider: "trackdrive", priority: 9, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D17 Home Insurance", company: "Home Insurance", provider: "trackdrive", priority: 10, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D18 Auto Insurance", company: "Auto Insurance", provider: "trackdrive", priority: 11, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D22", company: "Auto Insurance", provider: "trackdrive", priority: 12, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D23", company: "Auto Insurance", provider: "trackdrive", priority: 13, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D26", company: "Auto Insurance", provider: "trackdrive", priority: 14, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D4", company: "IntelHouse Calls", provider: "intelhouse", priority: 15, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D7", company: "Ringba Pool", provider: "ringba", priority: 16, weight: 100, status: BuyerStatus.ACTIVE },
    { name: "Buyer D9", company: "KP Consulting Services", provider: "trackdrive", priority: 17, weight: 100, status: BuyerStatus.ACTIVE },
  ];

  const buyerMap = new Map<string, any>();
  for (const b of buyerData) {
    const record = await prisma.buyer.create({ data: b });
    buyerMap.set(b.name, record);
  }
  console.log(`✅ Created ${buyerMap.size} Buyers`);

  const autoId = campaignMap.get("Auto Insurance")?.id;
  const homeId = campaignMap.get("Home Insurance")?.id;
  const finalExpId = campaignMap.get("Final Expense")?.id;

  // Standard token params
  const defaultParams = [
    { key: "caller_number", value: "{caller_number}" },
    { key: "caller_zip", value: "{caller_zip}" },
    { key: "caller_state", value: "{caller_state}" },
    { key: "placement_id", value: "{placement_id}" },
  ];

  // 6. Create RTB Configurations matching user specs and screenshots
  const configsData = [
    {
      name: "BD12 - Home Insurance",
      buyerId: buyerMap.get("Buyer D12 New")?.id,
      campaignId: homeId,
      provider: "ringba",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.ringba.com/v1/production/94aac31aff6849429a65452f6318e344.json",
      apiKey: "rtb_979hE48dYkmLzCTi2ucDCBl0x0Conueo",
      params: defaultParams,
      staticParams: { homeowner: "yes", property_type: "single_family" },
      successCount: 0,
      totalCount: 0,
    },
    {
      name: "Buyer D23 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D23")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      apiKey: "",
      params: defaultParams,
      extra: {
        trafficSourceId: "1008",
        trackdriveNumber: "+18449012076",
        pingEndpoint: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
        postEndpoint: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/post/check_auto_insurance_buyers",
      },
      successCount: 14,
      totalCount: 16,
    },
    {
      name: "Buyer D26 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D26")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      extra: {
        trafficSourceId: "1008",
        trackdriveNumber: "+18884811498",
      },
      successCount: 8,
      totalCount: 10,
    },
    {
      name: "Buyer D22 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D22")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      extra: {
        trackdriveNumber: "+18449332050",
      },
      successCount: 12,
      totalCount: 14,
    },
    {
      name: "Buyer D19 - Auto Insurance",
      buyerId: buyerMap.get("Buyer 19")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      successCount: 5,
      totalCount: 6,
    },
    {
      name: "Buyer D18 Auto Insurance",
      buyerId: buyerMap.get("Buyer D18 Auto Insurance")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      successCount: 7,
      totalCount: 8,
    },
    {
      name: "Buyer D17 Auto Insurance",
      buyerId: buyerMap.get("Buyer D17 Auto Insurance")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      successCount: 9,
      totalCount: 11,
    },
    {
      name: "Buyer D14",
      buyerId: buyerMap.get("Buyer D14")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://the-lead-penguin.trackdrive.com/api/v1/inbound_webhooks/ping/check_for_available_buyers_on_auto_insurance",
      params: defaultParams,
      successCount: 0,
      totalCount: 0,
    },
    {
      name: "Buyer D13 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D13")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      successCount: 3,
      totalCount: 4,
    },
    {
      name: "Buyer 11 - Auto Insurance (Insured)",
      buyerId: buyerMap.get("Buyer 11")?.id,
      campaignId: autoId,
      provider: "retreaver",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.retreaver.com/rtbs.json",
      apiKey: "10bac3914a8246d892d1927e3ad7",
      params: defaultParams,
      staticParams: { homeowner: "yes" },
      successCount: 18,
      totalCount: 22,
    },
    {
      name: "Buyer 11 - Auto Insurance (Uninsured)",
      buyerId: buyerMap.get("Buyer 11")?.id,
      campaignId: autoId,
      provider: "retreaver",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.retreaver.com/rtbs.json",
      apiKey: "10bac3914a8246d892d1927e3ad7",
      params: defaultParams,
      successCount: 10,
      totalCount: 15,
    },
    {
      name: "Buyer 11 - Home Insurance",
      buyerId: buyerMap.get("Buyer 11")?.id,
      campaignId: homeId,
      provider: "retreaver",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.retreaver.com/rtbs.json",
      apiKey: "10bac3914a8246d892d1927e3ad7",
      params: defaultParams,
      successCount: 6,
      totalCount: 8,
    },
    {
      name: "Buyer D1 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D1")?.id,
      campaignId: autoId,
      provider: "retreaver",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.retreaver.com/rtbs.json",
      apiKey: "10bac3914a8246d892d1927e3ad7",
      params: defaultParams,
      successCount: 4,
      totalCount: 5,
    },
    {
      name: "Buyer D1 - Home Insurance",
      buyerId: buyerMap.get("Buyer D1")?.id,
      campaignId: homeId,
      provider: "retreaver",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.retreaver.com/rtbs.json",
      apiKey: "10bac3914a8246d892d1927e3ad7",
      params: defaultParams,
      successCount: 5,
      totalCount: 6,
    },
    {
      name: "Buyer D7 - Ringba",
      buyerId: buyerMap.get("Buyer D7")?.id,
      campaignId: autoId,
      provider: "ringba",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://rtb.ringba.com/v1/production/e1959311eb26b2e915aa4c10672eb42f.json",
      apiKey: "rtb_prod_7719284baefc",
      params: defaultParams,
      successCount: 4,
      totalCount: 6,
    },
    {
      name: "Buyer D4 - Final Expense",
      buyerId: buyerMap.get("Buyer D4")?.id,
      campaignId: finalExpId,
      provider: "intelhouse",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://api.call.intelhouse.net/v1/rtb/ping",
      params: defaultParams,
      extra: {
        publisherId: "2d20bc90-9b7b-40da-bc3f-edfa9fe4bedb",
        campaignId: "f10dd531-c327-4e4a-9226-c236d32ad860",
        pingEndpoint: "https://api.call.intelhouse.net/v1/rtb/ping",
        postEndpoint: "https://api.call.intelhouse.net/v1/rtb/post",
      },
      successCount: 11,
      totalCount: 13,
    },
    {
      name: "Buyer D4 - Auto Insurance",
      buyerId: buyerMap.get("Buyer D4")?.id,
      campaignId: autoId,
      provider: "intelhouse",
      method: HttpMethod.POST,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://api.call.intelhouse.net/v1/rtb/ping",
      params: defaultParams,
      extra: {
        publisherId: "2d20bc90-9b7b-40da-bc3f-edfa9fe4bedb",
        campaignId: "f10dd531-c327-4e4a-9226-c236d32ad860",
        pingEndpoint: "https://api.call.intelhouse.net/v1/rtb/ping",
        postEndpoint: "https://api.call.intelhouse.net/v1/rtb/post",
      },
      successCount: 3,
      totalCount: 4,
    },
    {
      name: "Buyer D9 - TrackDrive",
      buyerId: buyerMap.get("Buyer D9")?.id,
      campaignId: autoId,
      provider: "trackdrive",
      method: HttpMethod.GET,
      mode: "RTB",
      status: ConfigStatus.ENABLED,
      baseUrl: "https://kp-consulting-services-un-d-products.trackdrive.com/api/v1/inbound_webhooks/ping/check_auto_insurance_buyers",
      params: defaultParams,
      successCount: 2,
      totalCount: 3,
    },
  ];

  const configMap = new Map<string, any>();
  for (const cfg of configsData) {
    if (!cfg.buyerId) continue;
    const record = await prisma.rtbConfig.create({
      data: {
        name: cfg.name,
        buyerId: cfg.buyerId,
        campaignId: cfg.campaignId,
        provider: cfg.provider,
        method: cfg.method,
        mode: cfg.mode,
        status: cfg.status,
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey ?? "",
        params: cfg.params,
        staticParams: cfg.staticParams ?? {},
        extra: cfg.extra ?? {},
        successCount: cfg.successCount,
        totalCount: cfg.totalCount,
        lastTestedAt: new Date(),
      },
    });
    configMap.set(cfg.name, record);
  }
  console.log(`✅ Created ${configMap.size} RTB Configurations`);

  // 7. Seed Sample Leads from screenshot 6
  const lead1 = await prisma.lead.create({
    data: {
      phone: "7314787322",
      zip: "38382",
      state: "TN",
      campaignId: autoId,
      agentId: agentUsers[0].id,
      buyerId: buyerMap.get("Buyer D23")?.id,
      revenue: 0.0,
      score: 85,
      status: LeadStatus.SOLD,
      createdAt: new Date("2026-09-28T20:03:00Z"),
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      phone: "7708668016",
      zip: "30228",
      state: "GA",
      campaignId: homeId,
      agentId: agentUsers[1].id,
      buyerId: buyerMap.get("Buyer D22")?.id,
      revenue: 0.0,
      score: 85,
      status: LeadStatus.SOLD,
      createdAt: new Date("2026-09-28T20:01:00Z"),
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      phone: "2563421894",
      zip: "35907",
      state: "AL",
      campaignId: autoId,
      agentId: agentUsers[2].id,
      buyerId: buyerMap.get("Buyer D22")?.id,
      revenue: 0.0,
      score: 85,
      status: LeadStatus.SOLD,
      createdAt: new Date("2026-09-28T19:56:00Z"),
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      phone: "6605632937",
      zip: "65336",
      state: "MO",
      campaignId: autoId,
      agentId: agentUsers[0].id,
      buyerId: buyerMap.get("Buyer D23")?.id,
      revenue: 0.0,
      score: 85,
      status: LeadStatus.SUBMITTED,
      createdAt: new Date("2026-09-28T19:56:00Z"),
    },
  });

  // 8. Seed sample Pings matching screenshot 7, 8, 9 for Lead 7314787322
  const d23Config = configMap.get("Buyer D23 - Auto Insurance");
  const d26Config = configMap.get("Buyer D26 - Auto Insurance");
  const d22Config = configMap.get("Buyer D22 - Auto Insurance");

  if (d23Config) {
    // Reserved ping 1
    await prisma.ping.create({
      data: {
        leadId: lead1.id,
        buyerId: buyerMap.get("Buyer D23")?.id,
        configId: d23Config.id,
        agentId: agentUsers[0].id,
        status: PingStatus.RESERVED,
        bid: 0.0,
        trackingNumber: "+18449012076",
        requestUrl: d23Config.baseUrl,
        durationMs: 412,
        httpStatus: 200,
        responseBody: {
          ping: {
            success: true,
            status: "accepted",
            errors: [],
            tracking_type: "caller_number",
            try_all_buyers_ping_id: "ad9262e5-6d0f-4ab3-b122-c8031288a4e1",
            try_all_buyers: {
              ping_id: "ad9262e5-6d0f-4ab3-b122-c8031288a4e1",
            },
          },
        },
        createdAt: new Date("2026-09-28T20:05:01Z"),
      },
    });

    // Duplicate ping (Rejected)
    await prisma.ping.create({
      data: {
        leadId: lead1.id,
        buyerId: buyerMap.get("Buyer D23")?.id,
        configId: d23Config.id,
        agentId: agentUsers[0].id,
        status: PingStatus.REJECTED,
        rejectReason: "Duplicate Ping",
        requestUrl: d23Config.baseUrl,
        durationMs: 198,
        httpStatus: 200,
        responseBody: {
          success: false,
          status: "duplicate_ping",
          errors: ["Duplicate Ping"],
          tracking_type: "caller_number",
          try_all_buyers_ping_id: null,
          try_all_buyers: {},
          ping_ids_expiry_in_seconds: 9999,
          buyers: [],
        },
        createdAt: new Date("2026-09-28T20:03:52Z"),
      },
    });
  }

  if (d26Config) {
    await prisma.ping.create({
      data: {
        leadId: lead1.id,
        buyerId: buyerMap.get("Buyer D26")?.id,
        configId: d26Config.id,
        agentId: agentUsers[0].id,
        status: PingStatus.RESERVED,
        bid: 0.0,
        trackingNumber: "+18884811498",
        durationMs: 380,
        httpStatus: 200,
        createdAt: new Date("2026-09-28T20:03:58Z"),
      },
    });
  }

  if (d22Config) {
    await prisma.ping.create({
      data: {
        leadId: lead1.id,
        buyerId: buyerMap.get("Buyer D22")?.id,
        configId: d22Config.id,
        agentId: agentUsers[0].id,
        status: PingStatus.RESERVED,
        bid: 0.0,
        trackingNumber: "+18449332050",
        durationMs: 320,
        httpStatus: 200,
        createdAt: new Date("2026-09-28T20:03:56Z"),
      },
    });
  }

  // 9. Seed Sample CRM Submissions with Pending, Approved, Rejected statuses
  const crmSamples = [
    {
      fronterName: "Sarah Jenkins",
      customerName: "Robert Davis",
      customerNumber: "7314787322",
      customerZip: "38382",
      customerEmail: "rdavis@gmail.com",
      did: "844-901-2076",
      campaignId: autoId,
      comment: "Customer interested in comprehensive collision coverage with clean driving record.",
      status: CrmStatus.APPROVED,
      agentId: agentUsers[0].id,
    },
    {
      fronterName: "Michael Chang",
      customerName: "Jessica Wilson",
      customerNumber: "7708668016",
      customerZip: "30228",
      customerEmail: "jessica.w@yahoo.com",
      did: "888-481-1498",
      campaignId: homeId,
      comment: "Single family home owner looking for combined dwelling and liability package.",
      status: CrmStatus.PENDING,
      agentId: agentUsers[1].id,
    },
    {
      fronterName: "Alex Rivera",
      customerName: "David Miller",
      customerNumber: "2563421894",
      customerZip: "35907",
      customerEmail: "dmiller99@outlook.com",
      did: "844-933-2050",
      campaignId: autoId,
      comment: "Current policy expiring end of month, wants rate quotes immediately.",
      status: CrmStatus.APPROVED,
      agentId: agentUsers[2].id,
    },
    {
      fronterName: "Emma Watson",
      customerName: "Daniel Smith",
      customerNumber: "6605632937",
      customerZip: "65336",
      customerEmail: "d.smith@aol.com",
      did: "844-901-2076",
      campaignId: autoId,
      comment: "Uninsured motorist looking for minimum liability coverage.",
      status: CrmStatus.REJECTED,
      agentId: agentUsers[3].id,
    },
    {
      fronterName: "Jason Vance",
      customerName: "Karen Taylor",
      customerNumber: "3125550188",
      customerZip: "60601",
      customerEmail: "ktaylor@gmail.com",
      did: "877-629-1845",
      campaignId: finalExpId,
      comment: "Senior age 68 inquiring about no-medical-exam whole life burial policy.",
      status: CrmStatus.PENDING,
      agentId: agentUsers[4].id,
    },
    {
      fronterName: "Sarah Jenkins",
      customerName: "William Clark",
      customerNumber: "4045558921",
      customerZip: "30301",
      customerEmail: "wclark@hotmail.com",
      did: "855-724-9912",
      campaignId: homeId,
      comment: "Requires flood rider evaluation before purchasing policy.",
      status: CrmStatus.PENDING,
      agentId: agentUsers[0].id,
    },
  ];

  for (const crm of crmSamples) {
    await prisma.crmEntry.create({ data: crm });
  }
  console.log(`✅ Created ${crmSamples.length} CRM entries`);

  console.log("✨ RTB Database Seeding Complete!");
  console.log("-----------------------------------------");
  console.log("Admin credentials: admin@rtb.local / admin12345");
  console.log("Agent credentials: agent1@rtb.local (to agent25@rtb.local) / agent12345");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
