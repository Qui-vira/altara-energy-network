import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/altara_energy_network?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminHash = await bcrypt.hash("AltaraAdmin2026!", 12);
  const installerHash = await bcrypt.hash("AltaraInstaller2026!", 12);

  await prisma.user.upsert({
    where: { email: "admin@altara.energy" },
    update: {},
    create: { name: "Altara Admin", email: "admin@altara.energy", passwordHash: adminHash, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "installer@altara.energy" },
    update: {},
    create: { name: "Field Installer", email: "installer@altara.energy", passwordHash: installerHash, role: "INSTALLER" },
  });

  const vendor = await prisma.vendor.create({
    data: {
      name: "Placeholder Lagos Solar Vendor",
      contactName: "Research Pending",
      phone: "+2340000000000",
      location: "Lagos, Nigeria",
      trustScore: 50,
      deliveryNotes: "Editable placeholder vendor. Replace after market research.",
      paymentTerms: "Confirm before quote approval.",
    },
  });

  const equipment = [
    ["Placeholder", "Budget 3.5kVA Inverter", "INVERTER", "3.5kVA/48V", 650000, "BUDGET"],
    ["Placeholder", "Value 5kVA Hybrid Inverter", "INVERTER", "5kVA/48V", 1150000, "VALUE"],
    ["Placeholder", "Premium 8kVA Hybrid Inverter", "INVERTER", "8kVA/48V", 2100000, "PREMIUM"],
    ["Placeholder", "5kWh Lithium Battery", "BATTERY", "5kWh", 1450000, "VALUE"],
    ["Placeholder", "550W Mono Panel", "SOLAR_PANEL", "550W", 145000, "VALUE"],
    ["Placeholder", "DC Breaker Set", "BREAKER", "63A", 45000, "VALUE"],
    ["Placeholder", "Surge Protection Kit", "SURGE_PROTECTION", "Type 2", 60000, "VALUE"],
    ["Placeholder", "Roof Mounting Kit", "MOUNTING_KIT", "4-panel set", 90000, "VALUE"],
    ["Placeholder", "Earthing Kit", "EARTHING_MATERIAL", "Copper rod + accessories", 75000, "VALUE"],
    ["Placeholder", "PV Combiner Box", "COMBINER_BOX", "2 in 1 out", 85000, "VALUE"],
  ];

  for (const [brand, model, category, capacity, price, budgetLevel] of equipment) {
    await prisma.equipmentItem.create({
      data: {
        brand,
        model,
        category,
        capacity,
        price,
        vendorId: vendor.id,
        warranty: "Research pending - update from vendor proof",
        stockStatus: "UNKNOWN",
        compatibilityNotes: "Editable placeholder. Confirm compatibility and Nigerian market support before final approval.",
        budgetLevel,
        reliabilityScore: 50,
        localSupportScore: 50,
        installerFeedbackScore: 50,
        vendorTrustScore: 50,
        finalRecommendationScore: 50,
        adminScore: 50,
      },
    });
  }

  await prisma.sourceRegister.create({
    data: {
      sourceType: "MARKET_RESEARCH",
      dateCollected: new Date(),
      confidenceLevel: "LOW",
      reviewer: "Altara",
      notes: "Initial placeholder source. Replace with dated vendor and market evidence.",
    },
  });

  await prisma.vendorPrice.create({
    data: {
      vendorId: vendor.id,
      vendorName: vendor.name,
      equipmentType: "INVERTER",
      brand: "Placeholder",
      model: "Value 5kVA Hybrid Inverter",
      capacity: "5kVA/48V",
      price: 1150000,
      stockStatus: "UNKNOWN",
      warranty: "Research pending",
      deliveryTimeline: "Confirm with vendor",
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.researchNote.create({
    data: {
      type: "NIGERIAN_SOLAR_MARKET_INSIGHTS",
      title: "Research placeholder",
      content: "Use this area to store vendor pricing, brand reliability, failure reports, competitor pricing, and Nigerian solar market notes before changing scoring defaults.",
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
