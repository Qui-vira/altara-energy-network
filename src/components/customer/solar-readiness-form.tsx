"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSubmissionSchema, type LeadSubmissionInput } from "@/lib/validators/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";

const defaultAppliances = [
  { name: "Lighting", quantity: 8, wattage: 10, hoursPerDay: 6, category: "Lighting", notes: "" },
  { name: "Fans", quantity: 3, wattage: 70, hoursPerDay: 8, category: "Cooling", notes: "" },
];

export function SolarReadinessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LeadSubmissionInput>({
    resolver: zodResolver(leadSubmissionSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      propertyType: "Residential apartment",
      nepaAvailabilityPerDay: 8,
      monthlyFuelSpend: 0,
      generatorUse: "Occasional backup",
      backupHoursNeeded: 6,
      budgetRange: "Value / mid-range",
      urgency: "Within 2-4 weeks",
      extraNotes: "",
      appliances: defaultAppliances,
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "appliances" });

  async function onSubmit(values: LeadSubmissionInput) {
    setServerError(null);
    setIsSubmitting(true);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key !== "appliances") formData.append(key, String(value ?? ""));
    }
    formData.append("appliances", JSON.stringify(values.appliances));
    for (const inputName of ["roofPhotos", "inverterBatteryLocationPhotos", "wiringPhotos"] as const) {
      const input = document.querySelector<HTMLInputElement>(`input[name=${inputName}]`);
      Array.from(input?.files ?? []).forEach((file) => formData.append(inputName, file));
    }

    const response = await fetch("/api/leads", { method: "POST", body: formData });
    setIsSubmitting(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setServerError(payload.error ?? "Unable to submit request. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-[#f8f5ee] p-8 text-center text-[#071426]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f2b544] text-2xl">✓</div>
        <h2 className="text-2xl font-black">Your request has been received.</h2>
        <p className="mt-3 text-[#697386]">Altara will review and send your recommendation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-[#17212f]">
      <div>
        <h2 className="text-2xl font-black text-[#071426]">Free Solar Readiness Check</h2>
        <p className="mt-1 text-sm text-[#697386]">Share your load, site photos, backup goals, and budget for Altara review.</p>
      </div>
      {serverError ? <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{serverError}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></FormField>
        <FormField label="Phone" error={form.formState.errors.phone?.message}><Input {...form.register("phone")} /></FormField>
        <FormField label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></FormField>
        <FormField label="Location" error={form.formState.errors.location?.message}><Input {...form.register("location")} placeholder="Lagos, Abuja, Port Harcourt..." /></FormField>
        <FormField label="Property type"><Select {...form.register("propertyType")}><option>Residential apartment</option><option>Detached home</option><option>Estate home</option><option>Office</option><option>Shop / small business</option><option>Commercial site</option></Select></FormField>
        <FormField label="NEPA availability per day"><Input type="number" step="0.5" {...form.register("nepaAvailabilityPerDay")} /></FormField>
        <FormField label="Monthly fuel spend"><Input type="number" {...form.register("monthlyFuelSpend")} /></FormField>
        <FormField label="Generator use"><Select {...form.register("generatorUse")}><option>Occasional backup</option><option>Daily backup</option><option>Heavy daily use</option><option>No generator</option></Select></FormField>
        <FormField label="Backup hours needed"><Input type="number" step="0.5" {...form.register("backupHoursNeeded")} /></FormField>
        <FormField label="Budget range"><Select {...form.register("budgetRange")}><option>Budget / under ₦1m</option><option>Value / mid-range</option><option>Premium / long backup</option><option>Commercial - audit required</option></Select></FormField>
        <FormField label="Urgency"><Select {...form.register("urgency")}><option>Immediately</option><option>Within 1 week</option><option>Within 2-4 weeks</option><option>Researching options</option></Select></FormField>
      </div>

      <div className="rounded-2xl border border-[#e4dccb] bg-[#fbf8f1] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-[#071426]">Appliances</h3>
          <Button type="button" variant="outline" onClick={() => append({ name: "", quantity: 1, wattage: 100, hoursPerDay: 4, category: "", notes: "" })}>Add appliance</Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-5">
              <Input placeholder="Appliance" {...form.register(`appliances.${index}.name`)} />
              <Input type="number" placeholder="Qty" {...form.register(`appliances.${index}.quantity`)} />
              <Input type="number" placeholder="Watts" {...form.register(`appliances.${index}.wattage`)} />
              <Input type="number" step="0.5" placeholder="Hours/day" {...form.register(`appliances.${index}.hoursPerDay`)} />
              <Button type="button" variant="ghost" onClick={() => remove(index)}>Remove</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Roof photos"><Input name="roofPhotos" type="file" accept="image/*" multiple /></FormField>
        <FormField label="Inverter/battery location photos"><Input name="inverterBatteryLocationPhotos" type="file" accept="image/*" multiple /></FormField>
        <FormField label="Wiring photos"><Input name="wiringPhotos" type="file" accept="image/*" multiple /></FormField>
      </div>
      <FormField label="Extra notes"><Textarea {...form.register("extraNotes")} placeholder="Tell us anything important about your power needs or site." /></FormField>
      <Button type="submit" disabled={isSubmitting} className="w-full py-3">{isSubmitting ? "Submitting..." : "Submit readiness check"}</Button>
    </form>
  );
}
