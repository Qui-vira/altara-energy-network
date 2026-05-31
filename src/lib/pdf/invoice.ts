import PDFDocument from "pdfkit";
import type { Invoice, Lead, Quote, QuoteLine } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";

type InvoicePdfInput = Invoice & {
  lead: Lead;
  quote: Quote & { lines: QuoteLine[] };
};

export async function renderInvoicePdf(invoice: InvoicePdfInput) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.rect(0, 0, doc.page.width, 120).fill("#071426");
  doc.fillColor("#f2b544").fontSize(22).text("ALTARA ENERGY NETWORK", 48, 38);
  doc.fillColor("#f8f5ee").fontSize(10).text("Pro-forma invoice | Solar audit, equipment recommendation and installation coordination", 48, 68);

  doc.fillColor("#17212f").fontSize(18).text("PRO-FORMA INVOICE", 48, 150);
  doc.fontSize(10).text(`Invoice: ${invoice.invoiceNumber}`, 360, 150);
  doc.text(`Quote: ${invoice.quote.quoteNumber}`, 360, 166);
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 360, 182);
  doc.text(`Expires: ${formatDate(invoice.expiryDate)}`, 360, 198);

  doc.fontSize(12).fillColor("#071426").text("Client details", 48, 230);
  doc.fontSize(10).fillColor("#17212f").text(invoice.lead.name, 48, 250);
  doc.text(invoice.lead.email, 48, 266);
  doc.text(invoice.lead.phone, 48, 282);
  doc.text(invoice.lead.location, 48, 298);

  doc.fontSize(12).fillColor("#071426").text("System recommendation", 48, 330);
  doc.fontSize(10).fillColor("#17212f").text(invoice.quote.systemRecommendation, 48, 350, { width: 500 });

  let y = 400;
  doc.fillColor("#071426").fontSize(12).text("Equipment, labor and logistics", 48, y);
  y += 22;
  doc.fontSize(9).fillColor("#697386").text("Description", 48, y).text("Qty", 340, y).text("Unit", 390, y).text("Total", 470, y);
  y += 14;
  doc.moveTo(48, y).lineTo(545, y).strokeColor("#e4dccb").stroke();
  y += 10;
  for (const line of invoice.quote.lines) {
    doc.fillColor("#17212f").fontSize(9).text(line.description, 48, y, { width: 270 });
    doc.text(String(line.quantity), 340, y);
    doc.text(formatCurrency(line.unitPrice), 390, y, { width: 70 });
    doc.text(formatCurrency(line.lineTotal), 470, y, { width: 80 });
    y += 24;
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
  }

  y += 8;
  doc.moveTo(320, y).lineTo(545, y).strokeColor("#e4dccb").stroke();
  y += 12;
  doc.fontSize(10).fillColor("#071426").text("Total amount", 360, y).text(formatCurrency(invoice.totalAmount), 470, y);

  y += 40;
  doc.fontSize(12).text("Payment terms", 48, y);
  doc.fontSize(10).fillColor("#17212f").text(invoice.paymentTerms, 48, y + 18, { width: 500 });

  y += 70;
  doc.fontSize(12).fillColor("#071426").text("Warranty notes", 48, y);
  doc.fontSize(10).fillColor("#17212f").text(invoice.warrantyNotes ?? "Warranty is subject to manufacturer terms and verified equipment availability.", 48, y + 18, { width: 500 });

  doc.fillColor("#d9901f").fontSize(10).text(invoice.disclaimer, 48, 760, { width: 500 });
  doc.end();
  return done;
}
