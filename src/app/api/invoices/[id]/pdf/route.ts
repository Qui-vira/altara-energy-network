import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdf } from "@/lib/pdf/invoice";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lead: true, quote: { include: { lines: true } } } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const buffer = await renderInvoicePdf(invoice);
  return new NextResponse(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"` } });
}
