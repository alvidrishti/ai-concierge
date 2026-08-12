import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listHotels, getHotel, upsertHotel, deleteHotel } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/hotels?district=...&mine=true — list hotels (public search or owner's own)
export async function GET(req: Request) {
  const session = await getSession();
  const url = new URL(req.url);
  const district = url.searchParams.get("district") || undefined;
  const mine = url.searchParams.get("mine") === "true";
  if (mine) {
    if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    const hotels = await listHotels({ ownerId: session.userId });
    return NextResponse.json({ hotels });
  }
  const hotels = await listHotels({ district });
  return NextResponse.json({ hotels });
}

// POST /api/hotels — create/update a hotel (owner-managed)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const hotel = await upsertHotel(session.userId, {
      id: body.id, name: body.name, category: body.category, address: body.address,
      district: body.district, division: body.division, phone: body.phone,
      description: body.description, amenities: body.amenities || [],
      images: body.images || [], price_range: body.price_range,
    });
    return NextResponse.json({ ok: true, hotel }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/hotels?id=...
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteHotel(id, session.userId);
  return NextResponse.json({ ok: true });
}

// GET /api/hotels/[id] handled in a separate dynamic route
