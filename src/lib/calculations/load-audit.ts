import { SystemCategory } from "@prisma/client";
import type { ApplianceInput } from "@/lib/validators/lead";

export type WarningFlag =
  | "budget_too_low"
  | "load_too_high"
  | "site_photos_missing"
  | "roof_risk"
  | "shading_risk"
  | "wiring_risk"
  | "installer_verification_required";

export type LoadAuditInputs = {
  appliances: ApplianceInput[];
  backupHoursNeeded: number;
  budgetRange?: string;
  photoUrls?: Record<string, string[]> | null;
  riskHints?: {
    roofRisk?: boolean;
    shadingRisk?: boolean;
    wiringRisk?: boolean;
  };
};

export type ManualLoadOverride = Partial<{
  totalRunningWatts: number;
  dailyEnergyWh: number;
  backupEnergyWh: number;
  suggestedInverterWatts: number;
  suggestedBatteryWh: number;
  suggestedSolarArrayWatts: number;
  systemCategory: SystemCategory;
  warningFlags: WarningFlag[];
  overrideNotes: string;
}>;

export function calculateLoadAudit(input: LoadAuditInputs, override?: ManualLoadOverride) {
  const applianceRows = input.appliances.map((appliance) => {
    const runningWatts = appliance.quantity * appliance.wattage;
    const dailyEnergyWh = appliance.quantity * appliance.wattage * appliance.hoursPerDay;
    return { ...appliance, runningWatts, dailyEnergyWh };
  });

  const totalRunningWatts = round(applianceRows.reduce((sum, item) => sum + item.runningWatts, 0));
  const dailyEnergyWh = round(applianceRows.reduce((sum, item) => sum + item.dailyEnergyWh, 0));
  const dailyEnergyKwh = round(dailyEnergyWh / 1000, 2);
  const averageHourlyWh = dailyEnergyWh / Math.max(1, averageHours(applianceRows));
  const backupEnergyWh = round(Math.max(totalRunningWatts * input.backupHoursNeeded * 0.55, averageHourlyWh * input.backupHoursNeeded));
  const suggestedInverterWatts = round(nextSystemSize(totalRunningWatts * 1.25, [1200, 2500, 3500, 5000, 8000, 10000, 15000, 20000, 30000]));
  const suggestedBatteryWh = round(nextSystemSize(backupEnergyWh / 0.8, [1200, 2400, 5000, 7500, 10000, 15000, 20000, 30000, 50000]));
  const suggestedSolarArrayWatts = round(nextSystemSize((dailyEnergyWh / 4.2) * 1.25, [800, 1200, 1800, 2500, 3500, 5000, 7500, 10000, 15000, 25000, 50000]));
  const systemCategory = categorize(totalRunningWatts, dailyEnergyKwh);
  const warningFlags = buildWarnings({
    totalRunningWatts,
    dailyEnergyKwh,
    budgetRange: input.budgetRange,
    photoUrls: input.photoUrls,
    riskHints: input.riskHints,
  });

  const merged = {
    totalRunningWatts: override?.totalRunningWatts ?? totalRunningWatts,
    dailyEnergyWh: override?.dailyEnergyWh ?? dailyEnergyWh,
    dailyEnergyKwh: round((override?.dailyEnergyWh ?? dailyEnergyWh) / 1000, 2),
    backupEnergyWh: override?.backupEnergyWh ?? backupEnergyWh,
    suggestedInverterWatts: override?.suggestedInverterWatts ?? suggestedInverterWatts,
    suggestedBatteryWh: override?.suggestedBatteryWh ?? suggestedBatteryWh,
    suggestedSolarArrayWatts: override?.suggestedSolarArrayWatts ?? suggestedSolarArrayWatts,
    systemCategory: override?.systemCategory ?? systemCategory,
    warningFlags: override?.warningFlags ?? warningFlags,
    manualOverride: Boolean(override && Object.keys(override).length > 0),
    overrideNotes: override?.overrideNotes,
    calculationSnapshot: {
      formula: "Quantity x Wattage x Hours Used Per Day = Daily Energy Use",
      backupHoursNeeded: input.backupHoursNeeded,
      applianceRows,
      originalRecommendation: {
        totalRunningWatts,
        dailyEnergyWh,
        dailyEnergyKwh,
        backupEnergyWh,
        suggestedInverterWatts,
        suggestedBatteryWh,
        suggestedSolarArrayWatts,
        systemCategory,
        warningFlags,
      },
    },
  };

  return merged;
}

function averageHours(rows: Array<{ hoursPerDay: number }>) {
  if (!rows.length) return 1;
  return rows.reduce((sum, row) => sum + row.hoursPerDay, 0) / rows.length;
}

function nextSystemSize(value: number, sizes: number[]) {
  return sizes.find((size) => size >= value) ?? Math.ceil(value / 1000) * 1000;
}

function categorize(totalRunningWatts: number, dailyEnergyKwh: number): SystemCategory {
  if (totalRunningWatts > 15000 || dailyEnergyKwh > 45) return SystemCategory.COMMERCIAL_AUDIT_REQUIRED;
  if (totalRunningWatts > 8000 || dailyEnergyKwh > 25) return SystemCategory.SMALL_BUSINESS_BACKUP;
  if (totalRunningWatts > 5000 || dailyEnergyKwh > 14) return SystemCategory.FULL_HOME_BACKUP;
  if (totalRunningWatts > 2500 || dailyEnergyKwh > 7) return SystemCategory.MEDIUM_HOME_BACKUP;
  return SystemCategory.BASIC_BACKUP;
}

function buildWarnings(input: {
  totalRunningWatts: number;
  dailyEnergyKwh: number;
  budgetRange?: string;
  photoUrls?: Record<string, string[]> | null;
  riskHints?: { roofRisk?: boolean; shadingRisk?: boolean; wiringRisk?: boolean };
}): WarningFlag[] {
  const flags = new Set<WarningFlag>();
  const budget = (input.budgetRange ?? "").toLowerCase();
  if ((budget.includes("under") || budget.includes("500") || budget.includes("1m")) && input.dailyEnergyKwh > 7) flags.add("budget_too_low");
  if (input.totalRunningWatts > 10000 || input.dailyEnergyKwh > 30) flags.add("load_too_high");
  const photos = input.photoUrls ?? {};
  if (!photos.roofPhotos?.length || !photos.inverterBatteryLocationPhotos?.length || !photos.wiringPhotos?.length) flags.add("site_photos_missing");
  if (input.riskHints?.roofRisk) flags.add("roof_risk");
  if (input.riskHints?.shadingRisk) flags.add("shading_risk");
  if (input.riskHints?.wiringRisk) flags.add("wiring_risk");
  flags.add("installer_verification_required");
  return Array.from(flags);
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
