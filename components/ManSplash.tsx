// MAN — STARTUP / OPENING EXPERIENCE (Phase 6).
// A distinctive but FAST brand reveal: logo -> subtle intelligent animation ->
// wordmark -> tagline -> transition into the interface.
// Premium, minimal, fast, non-annoying, accessible, and skippable.

import React, { useEffect, useState } from "react";
import { BrandLockup } from "./brand";

export default function ManSplash({
  onDone,
  duration = 1700,
}: {
  onDone?: () => void;
  duration?: number;
}) {
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 Rayhan, 1 MAN, 2 tagline

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), duration * 0.4);
    const t2 = setTimeout(() => setStage(2), duration * 0.7);
    const t3 = setTimeout(() => onDone && onDone(), duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onDone]);

  return (
    <div className="man-splash" role="status" aria-label="Loading MAN"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--man-bg)", transition: "opacity .35s var(--ease)",
      }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: "translateY(-4%)" }}>
        {stage === 0 && (
          <div className="splash-rayhan">
            <span className="splash-rayhan-name">Rayhan</span>
            <span className="splash-rayhan-sub">MD RAYHAN MIA</span>
          </div>
        )}
        {stage >= 1 && (
          <>
            <BrandLockup size={56} showTagline={stage === 2} animate />
            {stage === 2 && (
              <div className="brand-splash-tagline">
                Personal AI Intelligence Agent
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes manBlink { 50% { opacity: 0 } }
        @keyframes rayhanRise { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .man-splash { opacity: 1; }
        .splash-rayhan { display: flex; flex-direction: column; align-items: center; gap: 6px; animation: rayhanRise .55s var(--ease) both; }
        .splash-rayhan-name {
          font-size: clamp(52px, 14vw, 96px); font-weight: 800; letter-spacing: .01em;
          background: var(--man-grad); -webkit-background-clip: text; background-clip: text;
          color: transparent; line-height: 1;
        }
        .splash-rayhan-sub { font-size: 13px; letter-spacing: 5px; text-transform: uppercase; color: var(--man-text-dim); }
      `}</style>
    </div>
  );
}
