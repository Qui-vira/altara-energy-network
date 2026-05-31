import { LeadStatus } from "@prisma/client";

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  AUDIT_IN_PROGRESS: "Audit In Progress",
  INSTALLER_VERIFICATION_NEEDED: "Installer Verification Needed",
  QUOTE_READY: "Quote Ready",
  INVOICE_SENT: "Invoice Sent",
  PAID: "Paid",
  MATERIALS_ORDERED: "Materials Ordered",
  INSTALLATION_SCHEDULED: "Installation Scheduled",
  INSTALLED: "Installed",
  MAINTENANCE_FOLLOW_UP: "Maintenance Follow-up",
};

export const orderedLeadStatuses = Object.keys(leadStatusLabels) as LeadStatus[];
