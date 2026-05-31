import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function MaintenancePage() { const records = await prisma.maintenanceRecord.findMany({ include: { lead: true }, orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }] }); return <div className="space-y-6"><div><h1 className="text-3xl font-black text-[#071426]">Maintenance tracking</h1><p className="mt-1 text-[#697386]">Follow-up scheduling for installed Altara systems.</p></div><Card><CardHeader><CardTitle>Maintenance records</CardTitle></CardHeader><CardContent><Table><thead><tr><Th>Client</Th><Th>Type</Th><Th>Status</Th><Th>Scheduled</Th><Th>Notes</Th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><Td><Link className="font-bold text-[#071426]" href={`/admin/leads/${record.leadId}`}>{record.lead.name}</Link></Td><Td>{record.type}</Td><Td>{record.status}</Td><Td>{formatDate(record.scheduledFor)}</Td><Td>{record.notes}</Td></tr>)}</tbody></Table></CardContent></Card></div>; }
