import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { calculateLoadAudit } from "@/lib/calculations/load-audit";
import { leadSubmissionSchema } from "@/lib/validators/lead";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const appliances = JSON.parse(String(formData.get("appliances") ?? "[]"));
    const parsed = leadSubmissionSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      location: formData.get("location"),
      propertyType: formData.get("propertyType"),
      nepaAvailabilityPerDay: formData.get("nepaAvailabilityPerDay"),
      monthlyFuelSpend: formData.get("monthlyFuelSpend"),
      generatorUse: formData.get("generatorUse"),
      backupHoursNeeded: formData.get("backupHoursNeeded"),
      budgetRange: formData.get("budgetRange"),
      urgency: formData.get("urgency"),
      extraNotes: formData.get("extraNotes") ?? "",
      appliances,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
    }

    const uploadGroup = `${Date.now()}-${slugify(parsed.data.name)}`;
    const photoUrls = {
      roofPhotos: await saveFiles(formData.getAll("roofPhotos"), uploadGroup, "roof"),
      inverterBatteryLocationPhotos: await saveFiles(formData.getAll("inverterBatteryLocationPhotos"), uploadGroup, "inverter-battery"),
      wiringPhotos: await saveFiles(formData.getAll("wiringPhotos"), uploadGroup, "wiring"),
    };

    const lead = await prisma.lead.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email.toLowerCase(),
        location: parsed.data.location,
        propertyType: parsed.data.propertyType,
        nepaAvailabilityPerDay: parsed.data.nepaAvailabilityPerDay,
        monthlyFuelSpend: parsed.data.monthlyFuelSpend,
        generatorUse: parsed.data.generatorUse,
        backupHoursNeeded: parsed.data.backupHoursNeeded,
        budgetRange: parsed.data.budgetRange,
        urgency: parsed.data.urgency,
        extraNotes: parsed.data.extraNotes,
        photoUrls,
        appliances: { create: parsed.data.appliances },
        activityLogs: { create: { actor: "Customer", action: "Submitted Solar Readiness Check", metadata: { source: "public_form" } } },
      },
      include: { appliances: true },
    });

    const audit = calculateLoadAudit({
      appliances: lead.appliances,
      backupHoursNeeded: lead.backupHoursNeeded,
      budgetRange: lead.budgetRange,
      photoUrls,
    });

    await prisma.loadAudit.create({
      data: {
        leadId: lead.id,
        totalRunningWatts: audit.totalRunningWatts,
        dailyEnergyWh: audit.dailyEnergyWh,
        dailyEnergyKwh: audit.dailyEnergyKwh,
        backupEnergyWh: audit.backupEnergyWh,
        suggestedInverterWatts: audit.suggestedInverterWatts,
        suggestedBatteryWh: audit.suggestedBatteryWh,
        suggestedSolarArrayWatts: audit.suggestedSolarArrayWatts,
        systemCategory: audit.systemCategory,
        warningFlags: audit.warningFlags,
        manualOverride: audit.manualOverride,
        overrideNotes: audit.overrideNotes,
        calculationSnapshot: audit.calculationSnapshot,
      },
    });

    return NextResponse.json({ id: lead.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to submit readiness check" }, { status: 500 });
  }
}

async function saveFiles(values: FormDataEntryValue[], group: string, folder: string) {
  const urls: string[] = [];
  const dir = path.join(process.cwd(), "public", "uploads", group, folder);
  await mkdir(dir, { recursive: true });

  for (const value of values) {
    if (!(value instanceof File) || value.size === 0) continue;
    const safeName = `${Date.now()}-${slugify(value.name)}`;
    const target = path.join(dir, safeName);
    await writeFile(target, Buffer.from(await value.arrayBuffer()));
    urls.push(`/uploads/${group}/${folder}/${safeName}`);
  }
  return urls;
}
