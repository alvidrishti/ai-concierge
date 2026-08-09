// MAN — lightweight client-side markdown renderer (no external deps).
// Supports: headings, bold, italic, inline code, code blocks, bullet/numbered
// lists, links, paragraphs. Returns HTML string.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let list: string[] = [];
  let listType = "";

  const flushList = () => {
    if (!list.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    out.push(`<${tag}>${list.map((li) => `<li>${li}</li>`).join("")}</${tag}>`);
    list = [];
    listType = "";
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = []; inCode = false;
      } else {
        flushList(); inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (/^#{1,4}\s/.test(line)) {
      flushList();
      const level = line.match(/^#+/)![0].length;
      const content = inline(line.replace(/^#+\s/, ""));
      out.push(`<h${Math.min(level, 4)}>${content}</h${Math.min(level, 4)}>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      list.push(inline(line.replace(/^\s*[-*]\s+/, "")));
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      list.push(inline(line.replace(/^\s*\d+[.)]\s+/, "")));
    } else if (!line.trim()) {
      flushList();
    } else {
      flushList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushList();
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
  return out.join("\n");
}
