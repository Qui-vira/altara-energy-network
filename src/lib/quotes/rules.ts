import type { Lead, LoadAudit, VendorPrice, InstallerVerification } from "@prisma/client";

type ReadinessInput = {
  lead: Lead & { loadAudits?: LoadAudit[]; verifications?: InstallerVerification[] };
  vendorPrices: VendorPrice[];
  markInstallerVerificationRequired?: boolean;
};

export function evaluateQuoteReadiness(input: ReadinessInput) {
  const latestVerification = input.lead.verifications?.[0];
  const checks = {
    customerDataComplete: Boolean(input.lead.name && input.lead.phone && input.lead.email && input.lead.location && input.lead.propertyType && input.lead.budgetRange),
    loadDataExists: Boolean(input.lead.loadAudits?.length),
    vendorPriceExists: input.vendorPrices.length > 0,
    stockStatusExists: input.vendorPrices.some((price) => price.stockStatus !== "UNKNOWN"),
    installerVerificationCompletedOrRequired: Boolean(latestVerification?.completedAt || input.markInstallerVerificationRequired || input.lead.quoteVerificationRequired),
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return { ready: missing.length === 0, checks, missing };
}

export function canApproveFinalQuote(args: ReadinessInput & { adminApproved: boolean }) {
  const readiness = evaluateQuoteReadiness(args);
  return { ready: readiness.ready && args.adminApproved, readiness };
}
