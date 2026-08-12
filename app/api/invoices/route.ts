import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createInvoice, listInvoices, getInvoice, markInvoicePaid } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/invoices — invoices created by this (business) account
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const invoices = await listInvoices(session.userId);
  return NextResponse.json({ invoices });
}

// POST /api/invoices — create a customer bill
// { customer_name, customer_phone?, items: [{description,qty,price}], tax?, invoice_no? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.customer_name) return NextResponse.json({ error: "customer_name required" }, { status: 400 });
    const items = Array.isArray(body.items) ? body.items : [];
    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    const tax = Number(body.tax) || 0;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const invoiceNo = body.invoice_no || `INV-${Date.now().toString().slice(-8)}`;
    const invoice = await createInvoice({
      business_id: session.userId,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone || "",
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      total,
      invoice_no: invoiceNo,
      status: "unpaid",
    });
    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH /api/invoices  { id, action: "mark_paid" }
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { id, action } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (action === "mark_paid") {
      await markInvoicePaid(id, session.userId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
