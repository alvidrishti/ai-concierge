import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getHotel, listBookingsForHotel } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/hotels/[id] — hotel detail + (if owner) its bookings
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const hotel = await getHotel(params.id);
  if (!hotel) return NextResponse.json({ error: "hotel not found" }, { status: 404 });
  let bookings: any[] = [];
  // owner can see bookings
  if (session && hotel.owner_id === session.userId) {
    bookings = await listBookingsForHotel(params.id);
  }
  return NextResponse.json({ hotel, bookings, isOwner: !!session && hotel.owner_id === session.userId });
}
