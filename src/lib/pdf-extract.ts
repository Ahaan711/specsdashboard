// Client-side PDF text extraction using pdfjs-dist.
// Browser-only; do not import from server code.

import * as pdfjs from "pdfjs-dist";
// Vite-friendly worker URL
// @ts-ignore - vite handles ?url
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(pdf.numPages, 30); // cap for AI cost
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .filter(Boolean);
    out += strings.join(" ") + "\n\n";
  }
  return out.trim();
}
