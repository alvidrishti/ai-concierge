import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canUploadImage, canUploadFile, getEntitlements } from "@/lib/entitlements";
import { validateAttachment, storeAttachment, saveAttachmentMeta } from "@/lib/attachment";

export const runtime = "nodejs";

// POST /api/upload  — multipart/form-data: file, optional threadId
// Validates MIME/size/type, checks entitlement, stores securely, returns meta
// (never a public URL). Ownership = authenticated user.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const threadId = form.get("threadId") as string | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const mime = file.type || "";
    const size = file.size;
    const filename = file.name || "upload";

    // entitlement check
    const ent = await getEntitlements(session.userId);
    const type = mime.split("/")[0];
    if (type === "image" && !ent.canImage) {
      return NextResponse.json({ error: "Image upload requires MAN Pro." }, { status: 403 });
    }
    if (type !== "image" && !ent.canFile) {
      return NextResponse.json({ error: "File upload requires MAN Pro." }, { status: 403 });
    }

    // MIME/size/path validation
    const v = validateAttachment(filename, mime, size);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const storageKey = await storeAttachment(buf);
    const meta = await saveAttachmentMeta(session.userId, threadId, {
      filename, mime, size, storageKey, contentType: v.contentType!,
    });

    return NextResponse.json({ ok: true, attachment: { id: meta.id, filename, mime, size, contentType: v.contentType } });
  } catch (e: any) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
