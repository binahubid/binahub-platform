// @ts-ignore - pdf-parse has no type declarations
import pdf from 'pdf-parse';

interface PDFData {
  numpages: number;
  numrender: number;
  info: Record<string, unknown>;
  metadata: unknown;
  text: string;
  version: string;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data: PDFData = await pdf(buffer);
  return data.text;
}

export async function extractTextFromPDFFile(filePath: string): Promise<string> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return extractTextFromPDF(buffer);
}
