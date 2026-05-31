export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { orderedLeadStatuses, leadStatusLabels } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const [totalLeads, statusCounts, quotes, invoices, recentLeads] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const statusMap = new Map(statusCounts.map((item) => [item.status, item._count.status]));
  const quoteValue = quotes.reduce((sum, quote) => sum + Number(quote.totalPrice), 0);
  const invoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#071426]">Dashboard</h1>
        <p className="mt-1 text-[#697386]">Altara-owned customer, calculator, vendor, quote and invoice workflow.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total leads" value={totalLeads} />
        <Metric title="Recent quote value" value={formatCurrency(quoteValue)} />
        <Metric title="Recent pro-forma invoices" value={formatCurrency(invoiceValue)} />
        <Metric title="Safety gate" value="Installer verification" />
      </div>
      <Card>
        <CardHeader><CardTitle>Lead pipeline</CardTitle><CardDescription>Full Altara status pipeline from new lead to maintenance follow-up.</CardDescription></CardHeader>
        <CardContent><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">{orderedLeadStatuses.map((status) => <div key={status} className="rounded-xl border border-[#e4dccb] bg-[#fbf8f1] p-4"><div className="text-sm font-semibold text-[#697386]">{leadStatusLabels[status]}</div><div className="mt-2 text-3xl font-black text-[#071426]">{statusMap.get(status) ?? 0}</div></div>)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">{recentLeads.map((lead) => <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="flex items-center justify-between rounded-xl border border-[#e4dccb] bg-white p-4 hover:border-[#f2b544]"><div><div className="font-bold text-[#071426]">{lead.name}</div><div className="text-sm text-[#697386]">{lead.location} • {lead.budgetRange}</div></div><Badge tone="gold">{leadStatusLabels[lead.status]}</Badge></Link>)}</CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardContent><div className="text-sm font-semibold text-[#697386]">{title}</div><div className="mt-2 text-2xl font-black text-[#071426]">{value}</div></CardContent></Card>;
}
