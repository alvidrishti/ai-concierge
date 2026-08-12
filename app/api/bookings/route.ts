import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBooking, listMyBookings } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/bookings — the authenticated user's own bookings
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const bookings = await listMyBookings(session.userId);
  return NextResponse.json({ bookings });
}

// POST /api/bookings — a customer books a room
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.hotel_id || !body.check_in || !body.check_out) {
      return NextResponse.json({ error: "hotel, check-in and check-out required" }, { status: 400 });
    }
    const booking = await createBooking({
      hotel_id: body.hotel_id,
      user_id: session.userId,
      guest_name: body.guest_name || session.name,
      guest_phone: body.guest_phone || "",
      check_in: body.check_in,
      check_out: body.check_out,
      rooms: body.rooms || 1,
      guests: body.guests || 1,
      amount: body.amount || 0,
      status: "confirmed",
      note: body.note || "",
    });
    return NextResponse.json({ ok: true, booking }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
