export const TENDER_DOCUMENT_EXTRACTION_STATUSES = [
  'not_started',
  'pending',
  'extracting',
  'extracted',
  'failed',
  'unsupported',
] as const;

export const TENDER_DOCUMENT_EXTRACTOR_TYPES = [
  'none',
  'plain_text',
  'markdown',
  'csv',
  'xlsx',
  'unsupported',
] as const;

export type TenderDocumentExtractionStatusValue = (typeof TENDER_DOCUMENT_EXTRACTION_STATUSES)[number];
export type TenderDocumentExtractorTypeValue = (typeof TENDER_DOCUMENT_EXTRACTOR_TYPES)[number];

export const TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP = {
  'text/plain': 'plain_text',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
} as const satisfies Record<string, Exclude<TenderDocumentExtractorTypeValue, 'none' | 'unsupported'>>;

export const TENDER_DOCUMENT_EXTRACTION_DEFAULT_CHUNK_SIZE = 1200;
const TENDER_DOCUMENT_EXTRACTION_MIN_BREAK_SEARCH = 0.4;
const TENDER_DOCUMENT_EXTRACTION_BREAKS = ['\n\n', '\n', '. ', '; ', ', '] as const;

export interface TenderDocumentTextChunk {
  chunkIndex: number;
  textContent: string;
  characterCount: number;
}

export function normalizeTenderDocumentMimeType(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function getTenderDocumentExtractionSupport(mimeType: string | null | undefined) {
  const normalizedMimeType = normalizeTenderDocumentMimeType(mimeType);
  const extractorType = TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP[normalizedMimeType as keyof typeof TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP] ?? null;

  return {
    mimeType: normalizedMimeType,
    supported: extractorType != null,
    extractorType: extractorType ?? 'unsupported',
  } as const;
}

export function isTenderDocumentExtractionSupported(mimeType: string | null | undefined) {
  return getTenderDocumentExtractionSupport(mimeType).supported;
}

export function resolveTenderDocumentExtractionStatus(value: string | null | undefined): TenderDocumentExtractionStatusValue {
  return (TENDER_DOCUMENT_EXTRACTION_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as TenderDocumentExtractionStatusValue)
    : 'not_started';
}

export function normalizeTenderExtractedText(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function chunkTenderExtractedText(
  value: string | null | undefined,
  options: { maxCharacters?: number } = {},
): TenderDocumentTextChunk[] {
  const normalized = normalizeTenderExtractedText(value);
  const maxCharacters = Math.max(250, Math.floor(options.maxCharacters ?? TENDER_DOCUMENT_EXTRACTION_DEFAULT_CHUNK_SIZE));

  if (!normalized) {
    return [];
  }

  const chunks: TenderDocumentTextChunk[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let end = Math.min(cursor + maxCharacters, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(cursor, end);
      const minBreakIndex = Math.floor(window.length * TENDER_DOCUMENT_EXTRACTION_MIN_BREAK_SEARCH);

      for (const separator of TENDER_DOCUMENT_EXTRACTION_BREAKS) {
        const candidate = window.lastIndexOf(separator);

        if (candidate >= minBreakIndex) {
          end = cursor + candidate + separator.length;
          break;
        }
      }
    }

    const chunkText = normalized.slice(cursor, end).trim();

    if (chunkText) {
      chunks.push({
        chunkIndex: chunks.length,
        textContent: chunkText,
        characterCount: chunkText.length,
      });
    }

    cursor = end;

    while (cursor < normalized.length && /\s/.test(normalized[cursor])) {
      cursor += 1;
    }
  }

  return chunks;
}