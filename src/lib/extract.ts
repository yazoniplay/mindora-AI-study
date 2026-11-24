const allowedExtensions = new Set(['txt', 'md', 'csv', 'pdf', 'docx', 'pptx']);

export function supportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return allowedExtensions.has(extension);
}

export function fileKind(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? 'file';
}

async function extractPdf(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => 'str' in item ? item.str : '')
      .filter(Boolean)
      .join(' ');
    if (pageText.trim()) pages.push(pageText);
  }
  return pages.join('\\n\\n');
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function extractPptx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const slidePaths = Object.keys(zip.files)
    .filter(path => /^ppt\\/slides\\/slide\\d+\\.xml$/.test(path))
    .sort((a, b) => {
      const number = (path: string) => Number(path.match(/slide(\\d+)\\.xml$/)?.[1] ?? 0);
      return number(a) - number(b);
    });
  const slides: string[] = [];
  for (const path of slidePaths) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async('text');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    const text = Array.from(parsed.getElementsByTagName('a:t')).map(node => node.textContent ?? '').join(' ');
    if (text.trim()) slides.push(text);
  }
  return slides.join('\\n\\n');
}

export async function extractText(file: File): Promise<string> {
  const extension = fileKind(file);
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Unsupported file type: .${extension || 'unknown'}`);
  }
  if (extension === 'pdf') return extractPdf(file);
  if (extension === 'docx') return extractDocx(file);
  if (extension === 'pptx') return extractPptx(file);
  return (await file.text()).replace(/\\u0000/g, '');
}

export const supportedExtensions = '.txt,.md,.csv,.pdf,.docx,.pptx';
