import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadStatusLabels, orderedLeadStatuses } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const selected = orderedLeadStatuses.includes(status as LeadStatus) ? (status as LeadStatus) : undefined;
  const leads = await prisma.lead.findMany({ where: selected ? { status: selected } : undefined, orderBy: { createdAt: "desc" }, include: { loadAudits: { orderBy: { createdAt: "desc" }, take: 1 }, quotes: { orderBy: { createdAt: "desc" }, take: 1 } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#071426]">Leads</h1>
        <p className="mt-1 text-[#697386]">Solar Readiness Check submissions and the full Altara pipeline.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/leads"><Badge tone={!selected ? "gold" : "neutral"}>All</Badge></Link>
        {orderedLeadStatuses.map((item) => <Link key={item} href={`/admin/leads?status=${item}`}><Badge tone={selected === item ? "gold" : "neutral"}>{leadStatusLabels[item]}</Badge></Link>)}
      </div>
      <Card>
        <CardHeader><CardTitle>Lead register</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead><tr><Th>Client</Th><Th>Status</Th><Th>Load</Th><Th>Budget</Th><Th>Urgency</Th><Th>Created</Th></tr></thead>
            <tbody>{leads.map((lead) => <tr key={lead.id}><Td><Link href={`/admin/leads/${lead.id}`} className="font-bold text-[#071426] hover:text-[#d9901f]">{lead.name}</Link><div className="text-xs text-[#697386]">{lead.phone} • {lead.location}</div></Td><Td><Badge tone="gold">{leadStatusLabels[lead.status]}</Badge></Td><Td>{lead.loadAudits[0] ? `${lead.loadAudits[0].dailyEnergyKwh} kWh/day` : "Pending"}</Td><Td>{lead.budgetRange}</Td><Td>{lead.urgency}</Td><Td>{formatDate(lead.createdAt)}</Td></tr>)}</tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
