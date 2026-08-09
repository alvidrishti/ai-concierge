// MAN — Voice mode (client-side). Uses browser Web Speech API:
//   STT: webkitSpeechRecognition / SpeechRecognition
//   TTS: window.speechSynthesis
// If unsupported, returns null so the app falls back to text chat gracefully.

export type VoiceStatus =
  | "idle" | "listening" | "speaking" | "processing" | "error" | "unsupported";

export interface VoiceController {
  status: VoiceStatus;
  start(): void;
  stop(): void;
  speak(text: string): void;
  cancelSpeech(): void;
  onText: (text: string) => void;
  supported: boolean;
}

export function createVoice(onText: (text: string) => void): VoiceController | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    return null; // unsupported -> caller falls back to text
  }

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  let status: VoiceStatus = "idle";

  const ctrl: VoiceController = {
    status,
    supported: true,
    onText,

    start() {
      status = "listening";
      try {
        rec.start();
      } catch {
        // already started or error
      }
    },
    stop() {
      status = "idle";
      try { rec.stop(); } catch { /* noop */ }
    },
    speak(text: string) {
      if (!("speechSynthesis" in window)) return;
      status = "speaking";
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => { status = "idle"; };
      u.onerror = () => { status = "idle"; };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    cancelSpeech() {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      status = "idle";
    },
  };

  rec.onresult = (e: any) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    status = "idle";
    if (text) ctrl.onText(text);
  };
  rec.onerror = () => { status = "error"; };
  rec.onend = () => { if (status === "listening") status = "idle"; };

  return ctrl;
}
