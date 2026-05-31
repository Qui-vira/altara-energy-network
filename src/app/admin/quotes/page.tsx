export const dynamic = "force-dynamic";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function QuotesPage() { const quotes = await prisma.quote.findMany({ include: { lead: true, lines: true, invoices: true }, orderBy: { createdAt: "desc" } }); return <div className="space-y-6"><div><h1 className="text-3xl font-black text-[#071426]">Quotes</h1><p className="mt-1 text-[#697386]">Altara-owned quote register. Drafts and approvals remain gated by research, stock and installer verification rules.</p></div><Card><CardHeader><CardTitle>Quote register</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><thead><tr><Th>Quote</Th><Th>Client</Th><Th>Status</Th><Th>Total</Th><Th>Payment</Th><Th>Created</Th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><Td><Link className="font-bold text-[#071426] hover:text-[#d9901f]" href={`/admin/leads/${quote.leadId}`}>{quote.quoteNumber}</Link><div className="text-xs text-[#697386]">{quote.lines.length} lines • {quote.invoices.length} invoices</div></Td><Td>{quote.lead.name}</Td><Td><Badge tone={quote.adminApproved ? "green" : "gold"}>{quote.status}</Badge></Td><Td>{formatCurrency(quote.totalPrice)}</Td><Td>{quote.paymentStructure}<div className="text-xs">Deposit {formatCurrency(quote.depositAmount)}<br />Balance {formatCurrency(quote.balanceAmount)}</div></Td><Td>{formatDate(quote.createdAt)}</Td></tr>)}</tbody></Table></CardContent></Card></div>; }
