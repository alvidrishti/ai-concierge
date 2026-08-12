import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getInvoice } from "@/lib/daily_life";

export const runtime = "nodejs";

// Minimal pure-JS single-page PDF builder (no external binary dependency).
// Generates a clean invoice PDF the customer can download. No secrets, no DB writes.
function buildInvoicePdf(inv: any, businessName: string): Buffer {
  const esc = (s: string) => (s || "").replace(/[\\()]/g, "\\$&");
  const W = 595; // A4 width pt
  let y = 40;
  const lines: string[] = [];
  const text = (s: string, size = 11, x = 50, bold = false) => {
    lines.push(`BT /F${bold ? 2 : 1} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);
    y -= size + 4;
  };
  const rule = () => { lines.push(`0.7 w 50 ${y} m ${W - 50} ${y} l S`); y -= 10; };

  text("INVOICE / BILL", 18, 50, true);
  text("ACI-MAN", 9, 50, false);
  y -= 8;
  text(`Issued by: ${esc(businessName)}`, 10);
  text(`Invoice No: ${esc(inv.invoice_no || inv.id)}`, 10);
  text(`Date: ${new Date(inv.created_at).toLocaleDateString("en-GB")}`, 10);
  y -= 6;
  text(`Customer: ${esc(inv.customer_name)}`, 12, 50, true);
  if (inv.customer_phone) text(`Phone: ${esc(inv.customer_phone)}`, 10);
  y -= 8; rule();
  text("Description", 11, 50, true); text("Qty", 11, 400, true); text("Price", 11, 460, true); text("Amount", 11, 520, true);
  y -= 4;
  for (const it of (inv.items || [])) {
    text(esc(it.description || ""), 10, 50);
    text(String(it.qty || 0), 10, 400);
    text(String(it.price || 0), 10, 460);
    text(String(((it.qty || 0) * (it.price || 0)).toFixed(2)), 10, 520);
    y -= 2;
  }
  y -= 6; rule();
  text(`Subtotal: ${esc((inv.subtotal || 0).toFixed(2))} BDT`, 11, 430, true);
  text(`Tax: ${esc((inv.tax || 0).toFixed(2))} BDT`, 11, 430, true);
  text(`TOTAL: ${esc((inv.total || 0).toFixed(2))} BDT`, 13, 430, true);
  y -= 14;
  text("Status: " + (inv.status || "unpaid").toUpperCase(), 10, 50, true);
  y -= 12;
  text("Thank you for your business.", 10, 50);

  const body = lines.join("\n");
  const content = `BT /F1 9 Tf 1 0 0 1 50 790 Tm (MAN - Daily Life Platform) Tj ET\n${body}`;
  const pdf =
`%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>>
endobj
2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>>
endobj
3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R/F2 5 0 R>>>>/Contents 6 0 R>>
endobj
4 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>>
endobj
5 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>
endobj
6 0 obj <</Length ${content.length}>> stream
${content}
endstream
endobj
trailer <</Root 1 0 R>>
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

// GET /api/invoices/[id]/pdf — download invoice as PDF
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const inv = await getInvoice(params.id);
  if (!inv) return NextResponse.json({ error: "invoice not found" }, { status: 404 });
  // Only the business that issued it (or admin) can download
  if (inv.business_id !== session.userId && session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const pdf = buildInvoicePdf(inv, session.name || "Business");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${inv.invoice_no || inv.id}.pdf"`,
    },
  });
}
