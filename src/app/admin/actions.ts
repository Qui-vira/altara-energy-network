"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  BudgetLevel,
  DifficultyRating,
  EquipmentCategory,
  LeadStatus,
  PaymentStructure,
  QuoteStatus,
  StockStatus,
  type Prisma,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { calculateLoadAudit, type WarningFlag } from "@/lib/calculations/load-audit";
import { prisma } from "@/lib/prisma";
import { calculateQuoteTotals } from "@/lib/quotes/calc";
import { canApproveFinalQuote, evaluateQuoteReadiness } from "@/lib/quotes/rules";
import { toNumber } from "@/lib/utils";

async function requirePrivateUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user;
}

async function requireAdmin() {
  const user = await requirePrivateUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

export async function updateLeadStatus(formData: FormData) {
  const user = await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const status = String(formData.get("status")) as LeadStatus;
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      activityLogs: { create: { actor: user.email ?? "Admin", action: `Status changed to ${status}` } },
    },
  });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
}

export async function addLeadNote(formData: FormData) {
  const user = await requirePrivateUser();
  const leadId = String(formData.get("leadId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await prisma.note.create({ data: { leadId, author: user.email ?? "Altara", body } });
  await prisma.activityLog.create({ data: { leadId, actor: user.email ?? "Altara", action: "Added note" } });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function recalculateLoadAudit(formData: FormData) {
  const user = await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { appliances: true } });
  if (!lead) throw new Error("Lead not found");
  const manualOverride = formData.get("manualOverride") === "on";
  const override = manualOverride
    ? {
        totalRunningWatts: optionalNumber(formData.get("totalRunningWatts")),
        dailyEnergyWh: optionalNumber(formData.get("dailyEnergyWh")),
        backupEnergyWh: optionalNumber(formData.get("backupEnergyWh")),
        suggestedInverterWatts: optionalNumber(formData.get("suggestedInverterWatts")),
        suggestedBatteryWh: optionalNumber(formData.get("suggestedBatteryWh")),
        suggestedSolarArrayWatts: optionalNumber(formData.get("suggestedSolarArrayWatts")),
        overrideNotes: String(formData.get("overrideNotes") ?? ""),
      }
    : undefined;
  const audit = calculateLoadAudit({
    appliances: lead.appliances,
    backupHoursNeeded: lead.backupHoursNeeded,
    budgetRange: lead.budgetRange,
    photoUrls: lead.photoUrls as Record<string, string[]> | null,
  }, cleanOverride(override));

  await prisma.loadAudit.create({
    data: {
      leadId,
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
  await prisma.activityLog.create({ data: { leadId, actor: user.email ?? "Admin", action: audit.manualOverride ? "Created manual load audit override" : "Recalculated load audit" } });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function saveSiteInspection(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const data = {
    roofCondition: stringOrNull(formData.get("roofCondition")),
    roofSpaceNotes: stringOrNull(formData.get("roofSpaceNotes")),
    wiringCondition: stringOrNull(formData.get("wiringCondition")),
    shadingNotes: stringOrNull(formData.get("shadingNotes")),
    inverterLocationNotes: stringOrNull(formData.get("inverterLocationNotes")),
    batteryLocationNotes: stringOrNull(formData.get("batteryLocationNotes")),
    earthingNotes: stringOrNull(formData.get("earthingNotes")),
    safetyRisks: stringOrNull(formData.get("safetyRisks")),
    installerRequired: formData.get("installerRequired") === "on",
  };
  const existing = await prisma.siteInspection.findFirst({ where: { leadId }, orderBy: { createdAt: "desc" } });
  if (existing) await prisma.siteInspection.update({ where: { id: existing.id }, data });
  else await prisma.siteInspection.create({ data: { leadId, ...data } });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function savePhotoReview(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const data = {
    roofCondition: stringOrNull(formData.get("roofCondition")),
    shadingRisk: stringOrNull(formData.get("shadingRisk")),
    wiringRisk: stringOrNull(formData.get("wiringRisk")),
    batteryLocationRisk: stringOrNull(formData.get("batteryLocationRisk")),
    inverterVentilationRisk: stringOrNull(formData.get("inverterVentilationRisk")),
    installationDifficulty: enumOrNull<DifficultyRating>(formData.get("installationDifficulty")),
    additionalPhotoNotes: stringOrNull(formData.get("additionalPhotoNotes")),
    humanReviewRequired: formData.get("humanReviewRequired") === "on",
    aiAnalysisPlaceholder: { provider: "future_vision_ai", status: "not_connected", notes: String(formData.get("aiAnalysisPlaceholder") ?? "") },
  };
  const existing = await prisma.photoReview.findFirst({ where: { leadId }, orderBy: { createdAt: "desc" } });
  if (existing) await prisma.photoReview.update({ where: { id: existing.id }, data });
  else await prisma.photoReview.create({ data: { leadId, ...data } });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function saveInstallerVerification(formData: FormData) {
  const user = await requirePrivateUser();
  const leadId = String(formData.get("leadId"));
  const markCompleted = formData.get("completed") === "on";
  const data = {
    installerUserId: user.id,
    actualLoadVerified: formData.get("actualLoadVerified") === "on",
    wiringConditionChecked: formData.get("wiringConditionChecked") === "on",
    roofSpaceChecked: formData.get("roofSpaceChecked") === "on",
    shadingChecked: formData.get("shadingChecked") === "on",
    inverterLocationChecked: formData.get("inverterLocationChecked") === "on",
    batteryLocationChecked: formData.get("batteryLocationChecked") === "on",
    earthingConditionChecked: formData.get("earthingConditionChecked") === "on",
    safetyRisksNoted: stringOrNull(formData.get("safetyRisksNoted")),
    installationDifficultyRated: enumOrNull<DifficultyRating>(formData.get("installationDifficultyRated")),
    finalTechnicalComments: stringOrNull(formData.get("finalTechnicalComments")),
    completedAt: markCompleted ? new Date() : null,
  };
  const existing = await prisma.installerVerification.findFirst({ where: { leadId }, orderBy: { createdAt: "desc" } });
  if (existing) await prisma.installerVerification.update({ where: { id: existing.id }, data });
  else await prisma.installerVerification.create({ data: { leadId, ...data } });
  if (markCompleted) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: LeadStatus.AUDIT_IN_PROGRESS } });
  }
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/installer/work-orders");
}

export async function createEquipment(formData: FormData) {
  await requireAdmin();
  await prisma.equipmentItem.create({
    data: {
      brand: String(formData.get("brand")),
      model: String(formData.get("model")),
      category: String(formData.get("category")) as EquipmentCategory,
      capacity: String(formData.get("capacity")),
      price: toNumber(formData.get("price")),
      vendorId: stringOrNull(formData.get("vendorId")),
      warranty: String(formData.get("warranty") ?? "Research pending"),
      stockStatus: String(formData.get("stockStatus")) as StockStatus,
      compatibilityNotes: stringOrNull(formData.get("compatibilityNotes")),
      budgetLevel: String(formData.get("budgetLevel")) as BudgetLevel,
      reliabilityScore: toNumber(formData.get("reliabilityScore"), 50),
      localSupportScore: toNumber(formData.get("localSupportScore"), 50),
      installerFeedbackScore: toNumber(formData.get("installerFeedbackScore"), 50),
      vendorTrustScore: toNumber(formData.get("vendorTrustScore"), 50),
      finalRecommendationScore: toNumber(formData.get("finalRecommendationScore"), 50),
      adminScore: toNumber(formData.get("adminScore"), 50),
    },
  });
  revalidatePath("/admin/equipment");
}

export async function updateEquipmentScores(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.equipmentItem.update({
    where: { id },
    data: {
      price: toNumber(formData.get("price")),
      stockStatus: String(formData.get("stockStatus")) as StockStatus,
      reliabilityScore: toNumber(formData.get("reliabilityScore"), 50),
      localSupportScore: toNumber(formData.get("localSupportScore"), 50),
      installerFeedbackScore: toNumber(formData.get("installerFeedbackScore"), 50),
      vendorTrustScore: toNumber(formData.get("vendorTrustScore"), 50),
      finalRecommendationScore: toNumber(formData.get("finalRecommendationScore"), 50),
      adminScore: toNumber(formData.get("adminScore"), 50),
      compatibilityNotes: stringOrNull(formData.get("compatibilityNotes")),
    },
  });
  revalidatePath("/admin/equipment");
}

export async function createVendor(formData: FormData) {
  await requireAdmin();
  await prisma.vendor.create({
    data: {
      name: String(formData.get("name")),
      contactName: stringOrNull(formData.get("contactName")),
      phone: stringOrNull(formData.get("phone")),
      email: stringOrNull(formData.get("email")),
      location: stringOrNull(formData.get("location")),
      trustScore: toNumber(formData.get("trustScore"), 50),
      deliveryNotes: stringOrNull(formData.get("deliveryNotes")),
      paymentTerms: stringOrNull(formData.get("paymentTerms")),
    },
  });
  revalidatePath("/admin/vendors");
}

export async function createSource(formData: FormData) {
  await requireAdmin();
  await prisma.sourceRegister.create({
    data: {
      sourceType: String(formData.get("sourceType")) as Prisma.SourceRegisterCreateInput["sourceType"],
      sourceLink: stringOrNull(formData.get("sourceLink")),
      dateCollected: dateOrNow(formData.get("dateCollected")),
      expiryDate: dateOrNull(formData.get("expiryDate")),
      confidenceLevel: String(formData.get("confidenceLevel")) as Prisma.SourceRegisterCreateInput["confidenceLevel"],
      reviewer: stringOrNull(formData.get("reviewer")),
      notes: stringOrNull(formData.get("notes")),
      proofUrl: stringOrNull(formData.get("proofUrl")),
    },
  });
  revalidatePath("/admin/research");
}

export async function createVendorPrice(formData: FormData) {
  await requireAdmin();
  await prisma.vendorPrice.create({
    data: {
      vendorId: stringOrNull(formData.get("vendorId")),
      vendorName: String(formData.get("vendorName")),
      equipmentType: String(formData.get("equipmentType")) as EquipmentCategory,
      brand: String(formData.get("brand")),
      model: String(formData.get("model")),
      capacity: String(formData.get("capacity")),
      price: toNumber(formData.get("price")),
      stockStatus: String(formData.get("stockStatus")) as StockStatus,
      warranty: stringOrNull(formData.get("warranty")),
      deliveryTimeline: stringOrNull(formData.get("deliveryTimeline")),
      proofUploadUrl: stringOrNull(formData.get("proofUploadUrl")),
      validUntil: dateOrNull(formData.get("validUntil")),
    },
  });
  revalidatePath("/admin/research");
}

export async function createResearchNote(formData: FormData) {
  await requireAdmin();
  await prisma.researchNote.create({
    data: {
      type: String(formData.get("type")) as Prisma.ResearchNoteCreateInput["type"],
      title: String(formData.get("title")),
      content: String(formData.get("content")),
      sourceId: stringOrNull(formData.get("sourceId")),
    },
  });
  revalidatePath("/admin/research");
}

export async function createQuote(formData: FormData) {
  const user = await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { loadAudits: { orderBy: { createdAt: "desc" }, take: 1 }, verifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!lead) throw new Error("Lead not found");
  const vendorPrices = await prisma.vendorPrice.findMany({ take: 25, orderBy: { updatedAt: "desc" } });
  const readiness = evaluateQuoteReadiness({ lead, vendorPrices, markInstallerVerificationRequired: formData.get("installerVerificationRequired") === "on" });
  if (!readiness.ready) throw new Error(`Quote cannot be generated yet. Missing: ${readiness.missing.join(", ")}`);

  const selectedEquipmentIds = formData.getAll("equipmentItemIds").map(String).filter(Boolean);
  const equipment = await prisma.equipmentItem.findMany({ where: { id: { in: selectedEquipmentIds } } });
  const equipmentCost = equipment.reduce((sum, item) => sum + Number(item.price), 0) || toNumber(formData.get("equipmentCost"));
  const totals = calculateQuoteTotals({
    equipmentCost,
    installationLabor: toNumber(formData.get("installationLabor")),
    transport: toNumber(formData.get("transport")),
    siteInspectionFee: toNumber(formData.get("siteInspectionFee")),
    altaraManagementFee: toNumber(formData.get("altaraManagementFee")),
    profitMargin: toNumber(formData.get("profitMargin")),
    optionalMaintenanceFee: toNumber(formData.get("optionalMaintenanceFee")),
    discount: toNumber(formData.get("discount")),
    vatTax: toNumber(formData.get("vatTax")),
    depositPercent: toNumber(formData.get("depositPercent"), 70),
  });

  const quote = await prisma.quote.create({
    data: {
      leadId,
      quoteNumber: `ALT-Q-${Date.now()}`,
      status: QuoteStatus.PENDING_APPROVAL,
      systemRecommendation: String(formData.get("systemRecommendation")),
      equipmentCost,
      installationLabor: toNumber(formData.get("installationLabor")),
      transport: toNumber(formData.get("transport")),
      siteInspectionFee: toNumber(formData.get("siteInspectionFee")),
      altaraManagementFee: toNumber(formData.get("altaraManagementFee")),
      profitMargin: toNumber(formData.get("profitMargin")),
      optionalMaintenanceFee: toNumber(formData.get("optionalMaintenanceFee")),
      discount: toNumber(formData.get("discount")),
      vatTax: toNumber(formData.get("vatTax")),
      totalPrice: totals.totalPrice,
      paymentStructure: String(formData.get("paymentStructure")) as PaymentStructure,
      depositAmount: totals.depositAmount,
      balanceAmount: totals.balanceAmount,
      milestoneNotes: stringOrNull(formData.get("milestoneNotes")),
      installerVerificationRequired: formData.get("installerVerificationRequired") === "on",
      expiresAt: dateOrNull(formData.get("expiresAt")),
      lines: {
        create: [
          ...equipment.map((item) => ({ equipmentItemId: item.id, description: `${item.brand} ${item.model} (${item.capacity})`, quantity: 1, unitPrice: item.price, lineTotal: item.price })),
          { description: "Installation labor and logistics", quantity: 1, unitPrice: totals.totalPrice - equipmentCost, lineTotal: totals.totalPrice - equipmentCost, isLabor: true },
        ],
      },
    },
  });
  await prisma.activityLog.create({ data: { leadId, actor: user.email ?? "Admin", action: `Created quote ${quote.quoteNumber}` } });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/quotes");
}

export async function approveQuote(formData: FormData) {
  const user = await requireAdmin();
  const quoteId = String(formData.get("quoteId"));
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lead: { include: { loadAudits: { orderBy: { createdAt: "desc" }, take: 1 }, verifications: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  if (!quote) throw new Error("Quote not found");
  const vendorPrices = await prisma.vendorPrice.findMany({ take: 25, orderBy: { updatedAt: "desc" } });
  const approval = canApproveFinalQuote({ lead: quote.lead, vendorPrices, adminApproved: true, markInstallerVerificationRequired: quote.installerVerificationRequired });
  if (!approval.ready) throw new Error(`Quote cannot be approved. Missing: ${approval.readiness.missing.join(", ")}`);
  await prisma.quote.update({ where: { id: quoteId }, data: { adminApproved: true, status: QuoteStatus.APPROVED, approvalNotes: stringOrNull(formData.get("approvalNotes")) } });
  await prisma.lead.update({ where: { id: quote.leadId }, data: { status: LeadStatus.QUOTE_READY } });
  await prisma.activityLog.create({ data: { leadId: quote.leadId, actor: user.email ?? "Admin", action: `Approved quote ${quote.quoteNumber}` } });
  revalidatePath(`/admin/leads/${quote.leadId}`);
  revalidatePath("/admin/quotes");
}

export async function createProFormaInvoice(formData: FormData) {
  const user = await requireAdmin();
  const quoteId = String(formData.get("quoteId"));
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { lead: true } });
  if (!quote || !quote.adminApproved) throw new Error("Only approved quotes can generate pro-forma invoices");
  const invoice = await prisma.invoice.create({
    data: {
      leadId: quote.leadId,
      quoteId: quote.id,
      invoiceNumber: `ALT-PF-${Date.now()}`,
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      totalAmount: quote.totalPrice,
      paymentTerms: String(formData.get("paymentTerms") ?? `Deposit ${quote.depositAmount}, balance ${quote.balanceAmount}`),
      warrantyNotes: stringOrNull(formData.get("warrantyNotes")),
    },
  });
  await prisma.lead.update({ where: { id: quote.leadId }, data: { status: LeadStatus.INVOICE_SENT } });
  await prisma.activityLog.create({ data: { leadId: quote.leadId, actor: user.email ?? "Admin", action: `Created pro-forma invoice ${invoice.invoiceNumber}` } });
  revalidatePath(`/admin/leads/${quote.leadId}`);
  revalidatePath("/admin/invoices");
}

export async function createWorkOrder(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId"));
  await prisma.workOrder.create({
    data: {
      leadId,
      quoteId: stringOrNull(formData.get("quoteId")),
      assignedInstallerId: stringOrNull(formData.get("assignedInstallerId")),
      scope: String(formData.get("scope")),
      applianceLoadSummary: stringOrNull(formData.get("applianceLoadSummary")),
      installationNotes: stringOrNull(formData.get("installationNotes")),
      assignedTimeline: stringOrNull(formData.get("assignedTimeline")),
    },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: LeadStatus.INSTALLATION_SCHEDULED } });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/installer/work-orders");
}

export async function createMaintenanceRecord(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId"));
  await prisma.maintenanceRecord.create({
    data: {
      leadId,
      scheduledFor: dateOrNull(formData.get("scheduledFor")),
      type: String(formData.get("type")),
      status: String(formData.get("status") ?? "Pending"),
      notes: stringOrNull(formData.get("notes")),
    },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { status: LeadStatus.MAINTENANCE_FOLLOW_UP } });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/maintenance");
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanOverride<T extends Record<string, unknown> | undefined>(override: T) {
  if (!override) return undefined;
  return Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined && value !== "")) as T & { warningFlags?: WarningFlag[] };
}

function stringOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function enumOrNull<T extends string>(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? (text as T) : null;
}

function dateOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text) : null;
}

function dateOrNow(value: FormDataEntryValue | null) {
  return dateOrNull(value) ?? new Date();
}
