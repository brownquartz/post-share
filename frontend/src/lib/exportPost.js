// lib/exportPost.js — TXT / DOCX エクスポートユーティリティ

// ── TXT ──────────────────────────────────────────────────────────────────────
export function exportTxt(title, htmlContent) {
  const el = document.createElement("div");
  el.innerHTML = htmlContent;
  // ブロック要素の後に改行を入れる
  el.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, br").forEach(node => {
    node.insertAdjacentText("afterend", "\n");
  });
  const text = `${title}\n${"=".repeat(title.length)}\n\n${el.innerText.replace(/\n{3,}/g, "\n\n").trim()}\n`;
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${sanitize(title)}.txt`);
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
export async function exportDocx(title, htmlContent) {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, LevelFormat,
  } = await import("docx");

  const children = parseHtmlToDocx({ Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat }, title, htmlContent);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: "numbers",
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buf = await Packer.toBlob(doc);
  downloadBlob(buf, `${sanitize(title)}.docx`);
}

// ── HTML → docx 変換 ─────────────────────────────────────────────────────────
function parseHtmlToDocx({ Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat }, title, htmlContent) {
  const result = [];

  // タイトル段落
  result.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: title, bold: true })],
  }));

  const container = document.createElement("div");
  container.innerHTML = htmlContent;

  function nodeToRuns(node) {
    const runs = [];
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (text) runs.push(new TextRun({ text }));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const innerRuns = nodeToRuns(child);
        if (tag === "strong" || tag === "b") {
          innerRuns.forEach(r => { if (r.options) r.options.bold = true; });
          runs.push(...innerRuns);
        } else if (tag === "em" || tag === "i") {
          innerRuns.forEach(r => { if (r.options) r.options.italics = true; });
          runs.push(...innerRuns);
        } else if (tag === "u") {
          innerRuns.forEach(r => { if (r.options) r.options.underline = {}; });
          runs.push(...innerRuns);
        } else if (tag === "br") {
          runs.push(new TextRun({ text: "", break: 1 }));
        } else {
          runs.push(...innerRuns);
        }
      }
    }
    return runs;
  }

  function walkNode(node) {
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = child.tagName.toLowerCase();

      if (tag === "h1") {
        result.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: nodeToRuns(child) }));
      } else if (tag === "h2") {
        result.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: nodeToRuns(child) }));
      } else if (tag === "h3") {
        result.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: nodeToRuns(child) }));
      } else if (tag === "ul") {
        for (const li of child.querySelectorAll(":scope > li")) {
          result.push(new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: nodeToRuns(li),
          }));
        }
      } else if (tag === "ol") {
        for (const li of child.querySelectorAll(":scope > li")) {
          result.push(new Paragraph({
            numbering: { reference: "numbers", level: 0 },
            children: nodeToRuns(li),
          }));
        }
      } else if (tag === "blockquote") {
        result.push(new Paragraph({
          indent: { left: 720 },
          children: nodeToRuns(child),
        }));
      } else if (tag === "p" || tag === "div") {
        const runs = nodeToRuns(child);
        if (runs.length > 0) result.push(new Paragraph({ children: runs }));
        else walkNode(child);
      } else {
        walkNode(child);
      }
    }
  }

  walkNode(container);

  if (result.length === 1) {
    // フォールバック: プレーンテキスト
    const text = container.innerText.trim();
    if (text) result.push(new Paragraph({ children: [new TextRun(text)] }));
  }

  return result;
}

// ── ヘルパー ─────────────────────────────────────────────────────────────────
function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
