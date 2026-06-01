// Client-side document text extraction.
// Browser-only — pdfjs is dynamically imported so SSR doesn't try to load it
// (it references DOMMatrix at module init, which doesn't exist in workerd/SSR).

export async function extractPdfText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("extractPdfText must run in the browser.");
  }
  const pdfjs = await import("pdfjs-dist");
  // @ts-ignore - vite handles ?url
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(pdf.numPages, 30);
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

export async function extractHtmlText(file: File): Promise<string> {
  const raw = await file.text();
  if (typeof window === "undefined") {
    // crude fallback: strip tags
    return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(raw, "text/html");
  // remove scripts/styles
  doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  const text = doc.body?.textContent || doc.documentElement?.textContent || "";
  return text.replace(/\s+/g, " ").trim();
}

export async function extractDocText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isHtml =
    file.type === "text/html" || name.endsWith(".html") || name.endsWith(".htm");
  if (isHtml) return extractHtmlText(file);
  return extractPdfText(file);
}
