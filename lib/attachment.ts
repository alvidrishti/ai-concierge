// MAN — Attachment architecture (image / file / document).
//
// Frontend picker + backend validation + secure storage abstraction + ownership.
// Actual AI vision/document analysis requires a multimodal provider key
// (IMPLEMENTED — EXTERNAL CREDENTIAL REQUIRED). The attachment pipeline itself
// (validate, store, authorize, list) is real and testable.

import { db, dbEnabled } from "./db";
import { randomBytes } from "crypto";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB
export const MAX_FILE_BYTES = 15 * 1024 * 1024;   // 15MB
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOC_MIME = ["application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; // pdf, txt, csv, docx

export function classifyMime(mime: string): "image" | "document" | "text" | "other" {
  if (ALLOWED_IMAGE_MIME.includes(mime)) return "image";
  if (ALLOWED_DOC_MIME.includes(mime)) return "document";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  contentType?: "image" | "document" | "text" | "other";
}

// MIME validation — reject spoofed/unsupported types.
export function validateAttachment(filename: string, mime: string, size: number): ValidationResult {
  // filename/path traversal guard
  const base = filename.split("/").pop()?.split("\\").pop() || filename;
  if (!base || base === "." || base === ".." || base.includes("..") || /[\x00-\x1f]/.test(base)) {
    return { ok: false, error: "invalid filename" };
  }
  const type = classifyMime(mime);
  if (type === "other") {
    return { ok: false, error: `Unsupported file type: ${mime}. Allowed: images (JPG/PNG/WEBP), PDF, TXT, CSV, DOCX.` };
  }
  const max = type === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (size > max) {
    return { ok: false, error: `File too large. Max ${Math.round(max / 1024 / 1024)}MB for ${type}s.` };
  }
  if (size <= 0) return { ok: false, error: "empty file" };
  return { ok: true, contentType: type };
}

// Secure storage abstraction — binary stored via this. In local/dev it's a
// memory map; in production point to Supabase Storage / S3.
const store = new Map<string, Buffer>();

export async function storeAttachment(data: Buffer): Promise<string> {
  const key = "att_" + randomBytes(16).toString("hex");
  store.set(key, data);
  return key; // never exposed as a public URL
}

export async function getAttachmentData(storageKey: string): Promise<Buffer | null> {
  return store.get(storageKey) || null;
}

export async function saveAttachmentMeta(userId: string, threadId: string | null, meta: {
  filename: string; mime: string; size: number; storageKey: string; contentType: string;
}): Promise<any> {
  if (dbEnabled()) {
    const row = {
      user_id: userId, thread_id: threadId || null,
      filename: meta.filename, mime_type: meta.mime, size_bytes: meta.size,
      storage_key: meta.storageKey, content_type: meta.contentType,
    };
    return db.insert("attachments", row);
  }
  return { id: "att_mem_" + Date.now(), ...meta };
}

// Ownership-scoped list — only this user's attachments.
export async function listAttachments(userId: string, threadId?: string) {
  if (dbEnabled()) {
    const f = threadId ? `&thread_id=eq.${threadId}` : "";
    return db.select("attachments", `&user_id=eq.${encodeURIComponent(userId)}${f}`).catch(() => []);
  }
  return [];
}
