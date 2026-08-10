// MAN — Logo system (inline SVG, no external assets).
//
// A geometric, abstract "M" intelligence mark. It communicates connection,
// memory, precision, and human+machine collaboration without imitating any
// existing AI brand, a robot, or a brain icon. It stays legible at ~24px.
//
// Variants:
//   <ManLogo />                symbol + wordmark (primary)
//   <ManLogo compact />        symbol only
//   <ManLogo size={..} />      symbol at a given px
//   <ManLogo mono />           monochrome (no gradient)

import React from "react";

export const MAN_GRAD_ID = "man-grad";

export function ManMark({ size = 40, mono = false, id }: {
  size?: number;
  mono?: boolean;
  id?: string;
}) {
  const gid = id || MAN_GRAD_ID;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      role="img" aria-label="MAN symbol" style={{ display: "block" }}>
      {!mono && (
        <defs>
          <linearGradient id={gid} x1="8" y1="56" x2="56" y2="8"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="#6EA8FF" />
            <stop offset="1" stopColor="#7C5CFF" />
          </linearGradient>
        </defs>
      )}
      {/* rounded square field */}
      <rect x="4" y="4" width="56" height="56" rx="16"
        fill={mono ? "none" : "url(#" + gid + ")"} opacity={mono ? 0 : 0.12}
        stroke={mono ? "currentColor" : "none"} strokeWidth="2" />
      {/* geometric M: two legs + centre + connection + node */}
      <path
        d="M18 44 V24 L32 40 L46 24 V44"
        stroke={mono ? "currentColor" : "url(#" + gid + ")"}
        strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* precision node / connection dot */}
      <circle cx="32" cy="30" r="4.5"
        fill={mono ? "currentColor" : "url(#" + gid + ")"} />
    </svg>
  );
}

export default function ManLogo({
  variant = "primary", size = 40, mono = false, className = "",
}: {
  variant?: "primary" | "compact";
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <span className={`man-logo compact ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <ManMark size={size} mono={mono} />
      </span>
    );
  }
  const mark = size;
  const text = Math.round(size * 0.62);
  return (
    <span className={`man-logo ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.3) }}>
      <ManMark size={mark} mono={mono} />
      <span style={{ fontSize: text, fontWeight: 800, letterSpacing: text * 0.05, lineHeight: 1, color: mono ? "currentColor" : "inherit" }}>
        MAN
      </span>
    </span>
  );
}
