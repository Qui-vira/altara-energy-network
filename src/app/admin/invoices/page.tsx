import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InvoicesPage() { const invoices = await prisma.invoice.findMany({ include: { lead: true, quote: true }, orderBy: { createdAt: "desc" } }); return <div className="space-y-6"><div><h1 className="text-3xl font-black text-[#071426]">Invoices</h1><p className="mt-1 text-[#697386]">Only pro-forma invoices are generated before payment confirmation and final equipment availability checks.</p></div><Card><CardHeader><CardTitle>Invoice register</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><thead><tr><Th>Invoice</Th><Th>Client</Th><Th>Status</Th><Th>Total</Th><Th>Expiry</Th><Th>PDF</Th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><Td><Link href={`/admin/leads/${invoice.leadId}`} className="font-bold text-[#071426] hover:text-[#d9901f]">{invoice.invoiceNumber}</Link><div className="text-xs text-[#697386]">{invoice.quote.quoteNumber}</div></Td><Td>{invoice.lead.name}</Td><Td><Badge tone="gold">{invoice.status}</Badge></Td><Td>{formatCurrency(invoice.totalAmount)}</Td><Td>{formatDate(invoice.expiryDate)}</Td><Td><a href={`/api/invoices/${invoice.id}/pdf`} className="font-bold text-[#d9901f]">Download PDF</a></Td></tr>)}</tbody></Table></CardContent></Card></div>; }
