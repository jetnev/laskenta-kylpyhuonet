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
  'pdf',
  'docx',
  'unsupported',
] as const;

export type TenderDocumentExtractionStatusValue = (typeof TENDER_DOCUMENT_EXTRACTION_STATUSES)[number];
export type TenderDocumentExtractorTypeValue = (typeof TENDER_DOCUMENT_EXTRACTOR_TYPES)[number];

const TENDER_DOCUMENT_EXTRACTION_EXTENSION_MAP = {
  txt: 'plain_text',
  md: 'markdown',
  markdown: 'markdown',
  csv: 'csv',
  xlsx: 'xlsx',
  pdf: 'pdf',
  docx: 'docx',
} as const satisfies Record<string, Exclude<TenderDocumentExtractorTypeValue, 'unsupported' | 'none'>>;

const TENDER_DOCUMENT_EXTRACTION_GENERIC_MIME_TYPES = [
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/binary',
] as const;

export const TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP = {
  'text/plain': 'plain_text',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'text/csv': 'csv',
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
} as const satisfies Record<string, Exclude<TenderDocumentExtractorTypeValue, 'unsupported'>>;

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

function resolveTenderDocumentExtractorTypeByFileName(fileName: string | null | undefined) {
  const normalizedName = (fileName ?? '').trim().toLowerCase();
  const extensionSeparator = normalizedName.lastIndexOf('.');

  if (extensionSeparator < 0 || extensionSeparator === normalizedName.length - 1) {
    return null;
  }

  const extension = normalizedName.slice(extensionSeparator + 1);
  return TENDER_DOCUMENT_EXTRACTION_EXTENSION_MAP[extension as keyof typeof TENDER_DOCUMENT_EXTRACTION_EXTENSION_MAP] ?? null;
}

function shouldUseFileNameFallback(mimeType: string) {
  return (TENDER_DOCUMENT_EXTRACTION_GENERIC_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getTenderDocumentExtractionSupport(
  mimeType: string | null | undefined,
  options: { fileName?: string | null } = {},
) {
  const normalizedMimeType = normalizeTenderDocumentMimeType(mimeType);
  const extractorTypeFromMime = TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP[normalizedMimeType as keyof typeof TENDER_DOCUMENT_EXTRACTION_SUPPORTED_MIME_MAP] ?? null;
  const extractorType = extractorTypeFromMime
    ?? (shouldUseFileNameFallback(normalizedMimeType)
      ? resolveTenderDocumentExtractorTypeByFileName(options.fileName)
      : null);

  return {
    mimeType: normalizedMimeType,
    supported: extractorType != null,
    extractorType: extractorType ?? 'unsupported',
  } as const;
}

export function isTenderDocumentExtractionSupported(
  mimeType: string | null | undefined,
  options: { fileName?: string | null } = {},
) {
  return getTenderDocumentExtractionSupport(mimeType, options).supported;
}

export function resolveTenderDocumentExtractionStatus(value: string | null | undefined): TenderDocumentExtractionStatusValue {
  return (TENDER_DOCUMENT_EXTRACTION_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as TenderDocumentExtractionStatusValue)
    : 'not_started';
}

export function normalizeTenderExtractedText(value: string | null | undefined) {
  return (value ?? '')
    .split(String.fromCharCode(0)).join('')
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