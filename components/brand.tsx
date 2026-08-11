// MAN — BRAND SYSTEM (Phase 5). Centralized brand primitives so every screen
// (auth, loading, onboarding, chat, logout) uses the SAME logo, wordmark,
// tagline, sizing and spacing. No screen should hand-style the MAN mark.
//
// Tokens (keep consistent with app/globals.css):
//   mark<->wordmark ratio: wordmark = mark * 0.62 ; gap = mark * 0.3
//   tagline is always the wordmark's muted companion below it.

import React from "react";
import { ManMark } from "./ManLogo";

// Shared vertical rhythm for logo lockups.
export function BrandLockup({
  size = 44,
  showTagline = false,
  mono = false,
  animate = false,
}: {
  size?: number;
  showTagline?: boolean;
  mono?: boolean;
  animate?: boolean;
}) {
  const gap = Math.round(size * 0.3);
  const text = Math.round(size * 0.62);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      <ManMark size={size} mono={mono} />
      <span style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontSize: text, fontWeight: 800, letterSpacing: text * 0.05, lineHeight: 1, color: mono ? "currentColor" : "inherit" }}>
          MAN
        </span>
        {showTagline && (
          <span style={{ fontSize: Math.round(text * 0.42), fontWeight: 500, letterSpacing: text * 0.04, color: "var(--man-text-dim)", marginTop: Math.round(text * 0.18), textTransform: "uppercase" }}>
            Personal AI Intelligence Agent
          </span>
        )}
      </span>
      {animate && <span className="brand-caret" aria-hidden style={{ width: 4, height: text, borderRadius: 3, background: "var(--man-grad)", animation: "manBlink 1s steps(2,start) infinite" }} />}
    </span>
  );
}

// Centered lockup used on auth + splash screens.
export function BrandCenter({
  size = 52,
  tagline = false,
  animate = false,
}: {
  size?: number;
  tagline?: boolean;
  animate?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <BrandLockup size={size} showTagline={tagline} animate={animate} />
    </div>
  );
}

// Loading animation (branded). Simple, fast, non-annoying.
export function BrandLoader({ size = 28, label = "MAN" }: { size?: number; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div className="brand-loader" style={{ width: size, height: size }}>
        <ManMark size={size} mono />
      </div>
      <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "var(--man-text-dim)" }}>{label}</span>
    </div>
  );
}
