import { z } from "zod";

export const applianceInputSchema = z.object({
  name: z.string().min(1, "Appliance name is required"),
  quantity: z.coerce.number().int().min(1),
  wattage: z.coerce.number().positive(),
  hoursPerDay: z.coerce.number().positive().max(24),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const leadSubmissionSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  location: z.string().min(2),
  propertyType: z.string().min(2),
  nepaAvailabilityPerDay: z.coerce.number().min(0).max(24),
  monthlyFuelSpend: z.coerce.number().min(0),
  generatorUse: z.string().min(1),
  backupHoursNeeded: z.coerce.number().min(1).max(24),
  budgetRange: z.string().min(1),
  urgency: z.string().min(1),
  extraNotes: z.string().optional(),
  appliances: z.array(applianceInputSchema).min(1, "Add at least one appliance"),
});

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;
export type LeadSubmissionFormInput = z.input<typeof leadSubmissionSchema>;
export type ApplianceInput = z.infer<typeof applianceInputSchema>;
