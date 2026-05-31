export const dynamic = "force-dynamic";

import Image from "next/image";
import { notFound } from "next/navigation";
import { DifficultyRating, LeadStatus, PaymentStructure } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadStatusLabels } from "@/lib/constants";
import { approveQuote, addLeadNote, createMaintenanceRecord, createProFormaInvoice, createQuote, createWorkOrder, recalculateLoadAudit, saveInstallerVerification, savePhotoReview, saveSiteInspection, updateLeadStatus } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { evaluateQuoteReadiness } from "@/lib/quotes/rules";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, equipment, installers, vendorPrices] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        appliances: true,
        loadAudits: { orderBy: { createdAt: "desc" } },
        siteInspections: { orderBy: { createdAt: "desc" }, take: 1 },
        photoReviews: { orderBy: { createdAt: "desc" }, take: 1 },
        verifications: { orderBy: { createdAt: "desc" }, take: 1, include: { installer: true } },
        quotes: { orderBy: { createdAt: "desc" }, include: { lines: true, invoices: true } },
        invoices: { orderBy: { createdAt: "desc" } },
        workOrders: { orderBy: { createdAt: "desc" } },
        maintenance: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 15 },
      },
    }),
    prisma.equipmentItem.findMany({ orderBy: [{ category: "asc" }, { budgetLevel: "asc" }] }),
    prisma.user.findMany({ where: { role: "INSTALLER", active: true }, orderBy: { name: "asc" } }),
    prisma.vendorPrice.findMany({ orderBy: { updatedAt: "desc" }, take: 50 }),
  ]);
  if (!lead) notFound();
  const latestAudit = lead.loadAudits[0];
  const latestInspection = lead.siteInspections[0];
  const photoReview = lead.photoReviews[0];
  const verification = lead.verifications[0];
  const latestQuote = lead.quotes[0];
  const photos = (lead.photoUrls ?? {}) as Record<string, string[]>;
  const readiness = evaluateQuoteReadiness({ lead, vendorPrices, markInstallerVerificationRequired: lead.quoteVerificationRequired });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge tone="gold">{leadStatusLabels[lead.status]}</Badge>
          <h1 className="mt-3 text-3xl font-black text-[#071426]">{lead.name}</h1>
          <p className="mt-1 text-[#697386]">{lead.phone} • {lead.email} • {lead.location}</p>
        </div>
        <form action={updateLeadStatus} className="flex gap-2 rounded-2xl border border-[#e4dccb] bg-white p-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <Select name="status" defaultValue={lead.status}>{Object.values(LeadStatus).map((status) => <option key={status} value={status}>{leadStatusLabels[status]}</option>)}</Select>
          <Button type="submit">Update</Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer readiness data</CardTitle><CardDescription>Altara owns customer data and review workflow.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Property" value={lead.propertyType} />
              <Info label="NEPA/day" value={`${lead.nepaAvailabilityPerDay} hours`} />
              <Info label="Fuel spend" value={formatCurrency(lead.monthlyFuelSpend)} />
              <Info label="Generator use" value={lead.generatorUse} />
              <Info label="Backup needed" value={`${lead.backupHoursNeeded} hours`} />
              <Info label="Budget" value={lead.budgetRange} />
              <Info label="Urgency" value={lead.urgency} />
              <Info label="Extra notes" value={lead.extraNotes ?? "None"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Appliance load calculator</CardTitle><CardDescription>Formula: Quantity x Wattage x Hours Used Per Day = Daily Energy Use. Safety-critical output remains installer-verification-gated.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="overflow-x-auto"><Table><thead><tr><Th>Appliance</Th><Th>Qty</Th><Th>W</Th><Th>Hours/day</Th><Th>Daily Wh</Th></tr></thead><tbody>{lead.appliances.map((item) => <tr key={item.id}><Td>{item.name}</Td><Td>{item.quantity}</Td><Td>{item.wattage}</Td><Td>{item.hoursPerDay}</Td><Td>{item.quantity * item.wattage * item.hoursPerDay}</Td></tr>)}</tbody></Table></div>
              {latestAudit ? <div className="grid gap-3 sm:grid-cols-3"><Metric label="Running watts" value={`${latestAudit.totalRunningWatts} W`} /><Metric label="Daily energy" value={`${latestAudit.dailyEnergyKwh} kWh`} /><Metric label="Backup energy" value={`${latestAudit.backupEnergyWh} Wh`} /><Metric label="Inverter" value={`${latestAudit.suggestedInverterWatts} W`} /><Metric label="Battery" value={`${latestAudit.suggestedBatteryWh} Wh`} /><Metric label="Panels" value={`${latestAudit.suggestedSolarArrayWatts} W`} /></div> : null}
              {latestAudit ? <div><Label>Warning flags</Label><div className="mt-2 flex flex-wrap gap-2">{(latestAudit.warningFlags as string[]).map((flag) => <Badge key={flag} tone="red">{flag.replaceAll("_", " ")}</Badge>)}</div></div> : null}
              <form action={recalculateLoadAudit} className="grid gap-3 rounded-2xl bg-[#fbf8f1] p-4 sm:grid-cols-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3"><input type="checkbox" name="manualOverride" /> Manual override</label>
                <Input name="totalRunningWatts" placeholder="Override running W" />
                <Input name="dailyEnergyWh" placeholder="Override daily Wh" />
                <Input name="backupEnergyWh" placeholder="Override backup Wh" />
                <Input name="suggestedInverterWatts" placeholder="Override inverter W" />
                <Input name="suggestedBatteryWh" placeholder="Override battery Wh" />
                <Input name="suggestedSolarArrayWatts" placeholder="Override panel W" />
                <Textarea name="overrideNotes" className="sm:col-span-3" placeholder="Override reason and technical notes" />
                <Button type="submit" className="sm:col-span-3">Save recalculation</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Photo analysis space</CardTitle><CardDescription>Current human review plus placeholders for future AI vision analysis.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3"><PhotoGroup title="Roof photos" urls={photos.roofPhotos} /><PhotoGroup title="Inverter/battery photos" urls={photos.inverterBatteryLocationPhotos} /><PhotoGroup title="Wiring photos" urls={photos.wiringPhotos} /></div>
              <form action={savePhotoReview} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <Input name="roofCondition" defaultValue={photoReview?.roofCondition ?? ""} placeholder="Roof condition" />
                <Input name="shadingRisk" defaultValue={photoReview?.shadingRisk ?? ""} placeholder="Shading risk" />
                <Input name="wiringRisk" defaultValue={photoReview?.wiringRisk ?? ""} placeholder="Wiring risk" />
                <Input name="batteryLocationRisk" defaultValue={photoReview?.batteryLocationRisk ?? ""} placeholder="Battery location risk" />
                <Input name="inverterVentilationRisk" defaultValue={photoReview?.inverterVentilationRisk ?? ""} placeholder="Inverter ventilation risk" />
                <Select name="installationDifficulty" defaultValue={photoReview?.installationDifficulty ?? ""}><option value="">Difficulty</option>{Object.values(DifficultyRating).map((item) => <option key={item}>{item}</option>)}</Select>
                <Textarea name="additionalPhotoNotes" defaultValue={photoReview?.additionalPhotoNotes ?? ""} className="sm:col-span-2" placeholder="Additional photo notes" />
                <Textarea name="aiAnalysisPlaceholder" className="sm:col-span-2" placeholder="AI analysis placeholder notes; no AI model connected yet" />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="humanReviewRequired" defaultChecked={photoReview?.humanReviewRequired ?? true} /> Human review required</label>
                <Button type="submit" className="sm:col-span-2">Save photo review</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Site inspection and installer verification</CardTitle><CardDescription>Installer verifies load, roof, wiring, shading, locations, earthing and safety risks before technical approval.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <form action={saveSiteInspection} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <Input name="roofCondition" defaultValue={latestInspection?.roofCondition ?? ""} placeholder="Roof condition" />
                <Input name="wiringCondition" defaultValue={latestInspection?.wiringCondition ?? ""} placeholder="Wiring condition" />
                <Textarea name="roofSpaceNotes" defaultValue={latestInspection?.roofSpaceNotes ?? ""} placeholder="Roof space notes" />
                <Textarea name="shadingNotes" defaultValue={latestInspection?.shadingNotes ?? ""} placeholder="Shading notes" />
                <Textarea name="inverterLocationNotes" defaultValue={latestInspection?.inverterLocationNotes ?? ""} placeholder="Inverter location notes" />
                <Textarea name="batteryLocationNotes" defaultValue={latestInspection?.batteryLocationNotes ?? ""} placeholder="Battery location notes" />
                <Textarea name="earthingNotes" defaultValue={latestInspection?.earthingNotes ?? ""} placeholder="Earthing notes" />
                <Textarea name="safetyRisks" defaultValue={latestInspection?.safetyRisks ?? ""} placeholder="Safety risks" />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="installerRequired" defaultChecked={latestInspection?.installerRequired ?? true} /> Installer verification required</label>
                <Button type="submit" className="sm:col-span-2">Save site inspection</Button>
              </form>
              <VerificationForm leadId={lead.id} verification={verification} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quote readiness rules</CardTitle><CardDescription>Quote generation is blocked until the required Altara controls are satisfied.</CardDescription></CardHeader>
            <CardContent className="space-y-2">{Object.entries(readiness.checks).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-[#fbf8f1] p-3 text-sm"><span>{key.replaceAll(/([A-Z])/g, " $1")}</span><Badge tone={value ? "green" : "red"}>{value ? "Ready" : "Missing"}</Badge></div>)}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quote builder</CardTitle><CardDescription>Includes equipment, labor, transport, inspection, management fee, profit margin, maintenance, discount, VAT/tax, total and payment structure.</CardDescription></CardHeader>
            <CardContent>
              <form action={createQuote} className="space-y-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <Textarea name="systemRecommendation" defaultValue={latestAudit ? `${latestAudit.systemCategory.replaceAll("_", " ")} with ${latestAudit.suggestedInverterWatts}W inverter, ${latestAudit.suggestedBatteryWh}Wh battery and ${latestAudit.suggestedSolarArrayWatts}W solar array. Final installation subject to installer verification.` : ""} />
                <Label>Equipment list</Label>
                <select name="equipmentItemIds" multiple className="h-40 w-full rounded-xl border border-[#d8cdb8] bg-white p-3 text-sm">{equipment.map((item) => <option key={item.id} value={item.id}>{item.category} • {item.brand} {item.model} • {formatCurrency(item.price)} • {item.stockStatus}</option>)}</select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="equipmentCost" placeholder="Equipment cost override" />
                  <Input name="installationLabor" placeholder="Installation labor" defaultValue="250000" />
                  <Input name="transport" placeholder="Transport" defaultValue="75000" />
                  <Input name="siteInspectionFee" placeholder="Site inspection fee" defaultValue="50000" />
                  <Input name="altaraManagementFee" placeholder="Altara management fee" defaultValue="150000" />
                  <Input name="profitMargin" placeholder="Profit margin" defaultValue="250000" />
                  <Input name="optionalMaintenanceFee" placeholder="Optional maintenance fee" defaultValue="0" />
                  <Input name="discount" placeholder="Discount" defaultValue="0" />
                  <Input name="vatTax" placeholder="VAT/tax editable" defaultValue="0" />
                  <Input name="depositPercent" placeholder="Deposit %" defaultValue="70" />
                </div>
                <Select name="paymentStructure" defaultValue={PaymentStructure.DEPOSIT_BALANCE}>{Object.values(PaymentStructure).map((item) => <option key={item}>{item}</option>)}</Select>
                <Textarea name="milestoneNotes" placeholder="Deposit, balance or milestone payment notes" />
                <Input type="date" name="expiresAt" />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="installerVerificationRequired" defaultChecked /> Installer verification required before final approval</label>
                <Button type="submit" className="w-full">Generate quote for approval</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quotes and pro-forma invoices</CardTitle></CardHeader>
            <CardContent className="space-y-4">{lead.quotes.map((quote) => <div key={quote.id} className="rounded-2xl border border-[#e4dccb] p-4"><div className="flex items-center justify-between"><div className="font-bold text-[#071426]">{quote.quoteNumber}</div><Badge tone={quote.adminApproved ? "green" : "gold"}>{quote.status}</Badge></div><p className="mt-2 text-sm text-[#697386]">{quote.systemRecommendation}</p><div className="mt-3 text-xl font-black text-[#071426]">{formatCurrency(quote.totalPrice)}</div>{!quote.adminApproved ? <form action={approveQuote} className="mt-3 space-y-2"><input type="hidden" name="quoteId" value={quote.id} /><Textarea name="approvalNotes" placeholder="Approval notes" /><Button type="submit">Admin approve final quote</Button></form> : <form action={createProFormaInvoice} className="mt-3 space-y-2"><input type="hidden" name="quoteId" value={quote.id} /><Textarea name="paymentTerms" placeholder="Payment terms" defaultValue={`Deposit: ${formatCurrency(quote.depositAmount)}. Balance: ${formatCurrency(quote.balanceAmount)} before installation.`} /><Textarea name="warrantyNotes" placeholder="Warranty notes" /><Button type="submit">Generate pro-forma invoice</Button></form>}{quote.invoices.map((invoice) => <a key={invoice.id} href={`/api/invoices/${invoice.id}/pdf`} className="mt-3 block text-sm font-bold text-[#d9901f]">Download {invoice.invoiceNumber} PDF</a>)}</div>)}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Installer work order generator</CardTitle><CardDescription>Work orders exclude Altara cost price, profit margin, vendor margin, and full financial data.</CardDescription></CardHeader>
            <CardContent><form action={createWorkOrder} className="space-y-3"><input type="hidden" name="leadId" value={lead.id} /><Select name="quoteId" defaultValue={latestQuote?.id ?? ""}><option value="">No quote link</option>{lead.quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quoteNumber}</option>)}</Select><Select name="assignedInstallerId"><option value="">Assign installer later</option>{installers.map((installer) => <option key={installer.id} value={installer.id}>{installer.name}</option>)}</Select><Textarea name="scope" placeholder="Approved installation scope" required /><Textarea name="applianceLoadSummary" placeholder="Appliance/load summary" defaultValue={latestAudit ? `${latestAudit.totalRunningWatts}W running, ${latestAudit.dailyEnergyKwh}kWh/day` : ""} /><Textarea name="installationNotes" placeholder="Installation notes" /><Input name="assignedTimeline" placeholder="Assigned timeline" /><Button type="submit" className="w-full">Create work order</Button></form></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Maintenance tracking</CardTitle></CardHeader>
            <CardContent className="space-y-4"><form action={createMaintenanceRecord} className="space-y-3"><input type="hidden" name="leadId" value={lead.id} /><Input type="date" name="scheduledFor" /><Input name="type" placeholder="Maintenance type" /><Input name="status" placeholder="Status" defaultValue="Pending" /><Textarea name="notes" placeholder="Maintenance notes" /><Button type="submit">Add maintenance follow-up</Button></form>{lead.maintenance.map((item) => <div key={item.id} className="rounded-xl bg-[#fbf8f1] p-3 text-sm"><strong>{item.type}</strong> • {item.status} • {formatDate(item.scheduledFor)}<p>{item.notes}</p></div>)}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes and activity log</CardTitle></CardHeader>
            <CardContent className="space-y-4"><form action={addLeadNote} className="space-y-2"><input type="hidden" name="leadId" value={lead.id} /><Textarea name="body" placeholder="Internal Altara note" /><Button type="submit">Add note</Button></form>{lead.notes.map((note) => <div key={note.id} className="rounded-xl bg-white p-3 text-sm"><div className="font-bold">{note.author}</div><p>{note.body}</p><div className="text-xs text-[#697386]">{formatDate(note.createdAt)}</div></div>)}<div className="border-t border-[#e4dccb] pt-3">{lead.activityLogs.map((log) => <div key={log.id} className="py-2 text-sm"><strong>{log.action}</strong><div className="text-xs text-[#697386]">{log.actor} • {formatDate(log.createdAt)}</div></div>)}</div></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#fbf8f1] p-3"><div className="text-xs font-bold uppercase tracking-wide text-[#697386]">{label}</div><div className="mt-1 font-semibold text-[#071426]">{value}</div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#071426] p-3 text-white"><div className="text-xs text-white/60">{label}</div><div className="font-black text-[#f2b544]">{value}</div></div>; }
function PhotoGroup({ title, urls }: { title: string; urls?: string[] }) { return <div><Label>{title}</Label><div className="grid grid-cols-2 gap-2">{urls?.length ? urls.map((url) => <a key={url} href={url} target="_blank" className="relative h-24 overflow-hidden rounded-xl border border-[#e4dccb]"><Image src={url} alt={title} fill className="object-cover" /></a>) : <div className="rounded-xl border border-dashed border-[#d8cdb8] p-4 text-sm text-[#697386]">Missing</div>}</div></div>; }
function VerificationForm({ leadId, verification }: { leadId: string; verification?: { actualLoadVerified: boolean; wiringConditionChecked: boolean; roofSpaceChecked: boolean; shadingChecked: boolean; inverterLocationChecked: boolean; batteryLocationChecked: boolean; earthingConditionChecked: boolean; safetyRisksNoted: string | null; installationDifficultyRated: DifficultyRating | null; finalTechnicalComments: string | null; completedAt: Date | null } }) { const boxes = [["actualLoadVerified", "Actual load verified"], ["wiringConditionChecked", "Wiring condition checked"], ["roofSpaceChecked", "Roof space checked"], ["shadingChecked", "Shading checked"], ["inverterLocationChecked", "Inverter location checked"], ["batteryLocationChecked", "Battery location checked"], ["earthingConditionChecked", "Earthing condition checked"]] as const; return <form action={saveInstallerVerification} className="grid gap-3 rounded-2xl bg-[#fbf8f1] p-4 sm:grid-cols-2"><input type="hidden" name="leadId" value={leadId} />{boxes.map(([name, label]) => <label key={name} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={name} defaultChecked={Boolean(verification?.[name])} /> {label}</label>)}<Select name="installationDifficultyRated" defaultValue={verification?.installationDifficultyRated ?? ""}><option value="">Installation difficulty</option>{Object.values(DifficultyRating).map((item) => <option key={item}>{item}</option>)}</Select><Textarea name="safetyRisksNoted" defaultValue={verification?.safetyRisksNoted ?? ""} placeholder="Safety risks noted" /><Textarea name="finalTechnicalComments" defaultValue={verification?.finalTechnicalComments ?? ""} className="sm:col-span-2" placeholder="Final technical comments" /><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="completed" defaultChecked={Boolean(verification?.completedAt)} /> Mark verification completed</label><Button type="submit" className="sm:col-span-2">Save installer verification</Button></form>; }
