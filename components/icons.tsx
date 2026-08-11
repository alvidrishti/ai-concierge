// MAN — Premium icon system (Lucide-style outline, 1.5px stroke, monochrome).
// No emoji, no external dependency. Consistent 18-20px, inherits currentColor.

import React from "react";

function Base({ children, size = 18, ...rest }: { children: React.ReactNode; size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconPlus = (p: any) => (<Base {...p}><path d="M12 5v14M5 12h14"/></Base>);
export const IconSearch = (p: any) => (<Base {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Base>);
export const IconWeather = (p: any) => (<Base {...p}><path d="M17.5 19a4.5 4.5 0 0 0 0-9h-1.1a6 6 0 1 0-11.3 3A3.5 3.5 0 0 0 6 19z"/><path d="M8 21h9"/></Base>);
export const IconMap = (p: any) => (<Base {...p}><path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3z"/><path d="M9 7v13M15 4v13"/></Base>);
export const IconCalculator = (p: any) => (<Base {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01M8 20h.01M12 20h.01M16 20h.01"/></Base>);
export const IconClock = (p: any) => (<Base {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Base>);
export const IconMemory = (p: any) => (<Base {...p}><path d="M4 4h16v12H4z"/><path d="M4 16h16v4H4z"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 18h.01M12 18h.01M16 18h.01"/></Base>);
export const IconExport = (p: any) => (<Base {...p}><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></Base>);
export const IconMic = (p: any) => (<Base {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 18v3"/></Base>);
export const IconSend = (p: any) => (<Base {...p}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></Base>);
export const IconSettings = (p: any) => (<Base {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4 8.6a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8.6a1.6 1.6 0 0 0 1.1-1.1V2.5a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 14 4a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.2a1.6 1.6 0 0 0 1.1 1.1H21.5a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.1 1.1z"/></Base>);
export const IconLogout = (p: any) => (<Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></Base>);
export const IconMenu = (p: any) => (<Base {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Base>);
export const IconX = (p: any) => (<Base {...p}><path d="M18 6 6 18M6 6l12 12"/></Base>);
export const IconEdit = (p: any) => (<Base {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></Base>);
export const IconTrash = (p: any) => (<Base {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></Base>);
export const IconCopy = (p: any) => (<Base {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Base>);
export const IconRefresh = (p: any) => (<Base {...p}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/></Base>);
export const IconStop = (p: any) => (<Base {...p}><rect x="6" y="6" width="12" height="12" rx="2"/></Base>);
export const IconChevronDown = (p: any) => (<Base {...p}><path d="M6 9l6 6 6-6"/></Base>);
export const IconSparkle = (p: any) => (<Base {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></Base>);
export const IconGlobe = (p: any) => (<Base {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></Base>);
export const IconCheck = (p: any) => (<Base {...p}><path d="M20 6 9 17l-5-5"/></Base>);
export const IconMessage = (p: any) => (<Base {...p}><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/></Base>);
export const IconFeedback = (p: any) => (<Base {...p}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l2-3a8.5 8.5 0 1 1 15-5.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></Base>);
export const IconStar = (p: any) => (<Base {...p}><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.6 1-6-4.3-4.2 6-.9z"/></Base>);
export const IconSparkles = (p: any) => (<Base {...p}><path d="M12 3l1.8 4.8L18.6 9 13.8 10.8 12 15l-1.8-4.2L5.4 9l4.8-1.2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></Base>);
