const BYTES_IN_KIB = 1024;
const BYTES_IN_MIB = BYTES_IN_KIB * BYTES_IN_KIB;

export const TENDER_INTELLIGENCE_STORAGE_BUCKET = 'tender-intelligence';
export const TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES = 25 * BYTES_IN_MIB;
export const TENDER_DOCUMENT_ACCEPT_ATTRIBUTE = '.txt,.md,.markdown,.csv,.pdf,.docx,.xlsx,.zip';

export interface TenderDocumentFileLike {
  name: string;
  size: number;
  type?: string | null;
}

interface TenderDocumentTypeDefinition {
  extension: string;
  label: string;
  canonicalMimeType: string;
  acceptedMimeTypes: string[];
}

type TenderDocumentKindValue = 'rfp' | 'appendix' | 'pricing' | 'technical' | 'contract' | 'other';

export interface ValidTenderDocumentFile {
  fileName: string;
  sanitizedFileName: string;
  extension: string;
  label: string;
  canonicalMimeType: string;
  fileSizeBytes: number;
}

const TENDER_DOCUMENT_TYPE_DEFINITIONS: readonly TenderDocumentTypeDefinition[] = [
  {
    extension: 'txt',
    label: 'TXT',
    canonicalMimeType: 'text/plain',
    acceptedMimeTypes: ['text/plain'],
  },
  {
    extension: 'md',
    label: 'Markdown',
    canonicalMimeType: 'text/markdown',
    acceptedMimeTypes: ['text/markdown', 'text/x-markdown'],
  },
  {
    extension: 'markdown',
    label: 'Markdown',
    canonicalMimeType: 'text/markdown',
    acceptedMimeTypes: ['text/markdown', 'text/x-markdown'],
  },
  {
    extension: 'csv',
    label: 'CSV',
    canonicalMimeType: 'text/csv',
    acceptedMimeTypes: ['text/csv'],
  },
  {
    extension: 'pdf',
    label: 'PDF',
    canonicalMimeType: 'application/pdf',
    acceptedMimeTypes: ['application/pdf'],
  },
  {
    extension: 'docx',
    label: 'DOCX',
    canonicalMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    acceptedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  {
    extension: 'xlsx',
    label: 'XLSX',
    canonicalMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    acceptedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  {
    extension: 'zip',
    label: 'ZIP',
    canonicalMimeType: 'application/zip',
    acceptedMimeTypes: ['application/zip', 'application/x-zip-compressed'],
  },
] as const;

function getAllowedTypeLabels() {
  return [...new Set(TENDER_DOCUMENT_TYPE_DEFINITIONS.map((definition) => definition.label))].join(', ');
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.slice(lastDotIndex + 1).trim().toLowerCase();
}

function sanitizeFileNameSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .toLowerCase();
}

function getTenderDocumentTypeByExtension(extension: string) {
  return TENDER_DOCUMENT_TYPE_DEFINITIONS.find((definition) => definition.extension === extension) ?? null;
}

function normalizeDocumentKindSource(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function includesAnyKeyword(source: string, keywords: readonly string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

const RFP_KEYWORDS = ['tarjouspyynt', 'request for proposal', 'request-for-proposal', 'rfp', 'invitation to tender', 'itt'] as const;
const APPENDIX_KEYWORDS = ['liite', 'appendix', 'attachment', 'annex'] as const;
const PRICING_KEYWORDS = ['hinta', 'hinnoittelu', 'pricing', 'price', 'cost', 'boq', 'bill of quantities'] as const;
const TECHNICAL_KEYWORDS = ['tekn', 'specification', 'spec', 'vaatimusmaarittely', 'piirustus', 'drawing'] as const;
const CONTRACT_KEYWORDS = ['sopimus', 'agreement', 'contract', 'ehdot', 'terms and conditions', 'terms'] as const;

export function inferTenderDocumentKind(fileName: string, mimeType: string | null | undefined): TenderDocumentKindValue {
  const normalizedName = normalizeDocumentKindSource(fileName);
  const normalizedMimeType = normalizeDocumentKindSource(mimeType);
  const source = `${normalizedName} ${normalizedMimeType}`;

  if (includesAnyKeyword(source, RFP_KEYWORDS)) {
    return 'rfp';
  }

  if (includesAnyKeyword(source, PRICING_KEYWORDS)) {
    return 'pricing';
  }

  if (includesAnyKeyword(source, TECHNICAL_KEYWORDS)) {
    return 'technical';
  }

  if (includesAnyKeyword(source, CONTRACT_KEYWORDS)) {
    return 'contract';
  }

  if (includesAnyKeyword(source, APPENDIX_KEYWORDS)) {
    return 'appendix';
  }

  if (normalizedMimeType.includes('text/csv') || normalizedMimeType.includes('spreadsheetml.sheet')) {
    return 'pricing';
  }

  return 'other';
}

export function sanitizeTenderDocumentFileName(fileName: string) {
  const normalizedFileName = fileName.trim().replace(/[\\/]+/g, '-');
  const extension = getFileExtension(normalizedFileName);
  const baseName = extension ? normalizedFileName.slice(0, -(extension.length + 1)) : normalizedFileName;
  const safeBaseName = sanitizeFileNameSegment(baseName) || 'document';
  const safeExtension = sanitizeFileNameSegment(extension);

  return safeExtension ? `${safeBaseName}.${safeExtension}` : safeBaseName;
}

export function validateTenderDocumentFile(file: TenderDocumentFileLike): ValidTenderDocumentFile {
  const fileName = file.name.trim();

  if (!fileName) {
    throw new Error('Tiedostolta puuttuu nimi.');
  }

  if (!Number.isFinite(file.size) || file.size < 0) {
    throw new Error(`Tiedoston “${fileName}” koko on virheellinen.`);
  }

  if (file.size === 0) {
    throw new Error(`Tiedosto “${fileName}” on tyhjä eikä sitä voi ladata.`);
  }

  if (file.size > TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES) {
    throw new Error(`Tiedosto “${fileName}” ylittää kokorajan ${formatTenderDocumentFileSize(TENDER_DOCUMENT_MAX_FILE_SIZE_BYTES)}.`);
  }

  const extension = getFileExtension(fileName);
  const documentType = getTenderDocumentTypeByExtension(extension);

  if (!documentType) {
    throw new Error(`Tiedosto “${fileName}” ei ole sallittu. Sallitut tiedostotyypit ovat ${getAllowedTypeLabels()}.`);
  }

  const normalizedMimeType = (file.type ?? '').trim().toLowerCase();
  const isGenericMimeType = normalizedMimeType === '' || normalizedMimeType === 'application/octet-stream';

  if (!isGenericMimeType && !documentType.acceptedMimeTypes.includes(normalizedMimeType)) {
    throw new Error(`Tiedoston “${fileName}” MIME-tyyppi ei vastaa sallittua ${documentType.label}-tiedostoa.`);
  }

  return {
    fileName,
    sanitizedFileName: sanitizeTenderDocumentFileName(fileName),
    extension: documentType.extension,
    label: documentType.label,
    canonicalMimeType: documentType.canonicalMimeType,
    fileSizeBytes: file.size,
  };
}

export function buildTenderDocumentStoragePath(input: {
  organizationId: string;
  packageId: string;
  documentId: string;
  fileName: string;
}) {
  const sanitizedFileName = sanitizeTenderDocumentFileName(input.fileName);
  return `${input.organizationId}/${input.packageId}/${input.documentId}-${sanitizedFileName}`;
}

export function formatTenderDocumentFileSize(bytes: number | null | undefined) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return 'Tuntematon koko';
  }

  if (bytes < BYTES_IN_KIB) {
    return `${bytes} B`;
  }

  if (bytes < BYTES_IN_MIB) {
    return `${(bytes / BYTES_IN_KIB).toFixed(1)} kB`;
  }

  return `${(bytes / BYTES_IN_MIB).toFixed(1)} MB`;
}

export function getTenderDocumentTypeLabel(fileName: string, mimeType: string) {
  const extension = getFileExtension(fileName);
  const byExtension = getTenderDocumentTypeByExtension(extension);

  if (byExtension) {
    return byExtension.label;
  }

  const normalizedMimeType = mimeType.trim().toLowerCase();
  const byMimeType = TENDER_DOCUMENT_TYPE_DEFINITIONS.find((definition) =>
    definition.acceptedMimeTypes.includes(normalizedMimeType)
  );

  return (byMimeType?.label ?? normalizedMimeType) || 'Tiedosto';
}