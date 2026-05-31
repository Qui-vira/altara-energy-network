import Link from "next/link";
import { getServerSession } from "next-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function InstallerWorkOrdersPage() { const session = await getServerSession(authOptions); const where = session?.user?.role === "INSTALLER" ? { assignedInstallerId: session.user.id } : {}; const orders = await prisma.workOrder.findMany({ where, include: { lead: true }, orderBy: { createdAt: "desc" } }); return <div className="space-y-6"><div><h1 className="text-3xl font-black text-[#071426]">Work orders</h1><p className="mt-1 text-[#697386]">Installer view excludes Altara cost price, profit margin, vendor margin, and full customer financial data.</p></div><Card><CardHeader><CardTitle>Assigned installation scope</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><thead><tr><Th>Client location</Th><Th>Scope</Th><Th>Status</Th><Th>Timeline</Th><Th>Created</Th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><Td><Link href={`/installer/work-orders/${order.id}`} className="font-bold text-[#071426] hover:text-[#d9901f]">{order.lead.location}</Link><div className="text-xs text-[#697386]">{order.lead.propertyType}</div></Td><Td className="max-w-md">{order.scope}</Td><Td><Badge tone="gold">{order.status}</Badge></Td><Td>{order.assignedTimeline}</Td><Td>{formatDate(order.createdAt)}</Td></tr>)}</tbody></Table></CardContent></Card></div>; }
