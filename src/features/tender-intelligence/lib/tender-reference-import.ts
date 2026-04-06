import { read, utils } from 'xlsx';

import type {
  CreateTenderReferenceProfileInput,
  TenderReferenceProfile,
  TenderReferenceProfileSourceKind,
} from '../types/tender-intelligence';

export interface TenderReferenceImportParsedRow {
  rowNumber: number;
  rawLabel: string;
  input: CreateTenderReferenceProfileInput | null;
  error: string | null;
}

export type TenderReferenceImportRowStatus = 'importable' | 'duplicate_existing' | 'duplicate_batch' | 'invalid';

export interface TenderReferenceImportPreviewRow {
  rowNumber: number;
  rawLabel: string;
  status: TenderReferenceImportRowStatus;
  input: CreateTenderReferenceProfileInput | null;
  reason: string;
  duplicateOfRowNumber: number | null;
}

export interface TenderReferenceImportPreview {
  rows: TenderReferenceImportPreviewRow[];
  importableProfiles: CreateTenderReferenceProfileInput[];
  summary: {
    totalRows: number;
    importableCount: number;
    duplicateExistingCount: number;
    duplicateBatchCount: number;
    invalidCount: number;
  };
}

type TenderReferenceImportRecord = Record<string, unknown>;

const IMPORT_SOURCE_KIND_MAP: Record<string, TenderReferenceProfileSourceKind> = {
  imported: 'imported',
  import: 'imported',
  tuotu: 'imported',
  manual: 'manual',
  manuaalinen: 'manual',
  other: 'other',
  muu: 'other',
};

const COLUMN_ALIASES = new Map<string, keyof CreateTenderReferenceProfileInput>([
  ['title', 'title'],
  ['otsikko', 'title'],
  ['referenssi', 'title'],
  ['reference', 'title'],
  ['name', 'title'],
  ['nimi', 'title'],
  ['clientname', 'clientName'],
  ['client', 'clientName'],
  ['asiakas', 'clientName'],
  ['customer', 'clientName'],
  ['projecttype', 'projectType'],
  ['projektityyppi', 'projectType'],
  ['project', 'projectType'],
  ['type', 'projectType'],
  ['description', 'description'],
  ['kuvaus', 'description'],
  ['summary', 'description'],
  ['location', 'location'],
  ['sijainti', 'location'],
  ['city', 'location'],
  ['kaupunki', 'location'],
  ['completedyear', 'completedYear'],
  ['valmistumisvuosi', 'completedYear'],
  ['vuosi', 'completedYear'],
  ['year', 'completedYear'],
  ['contractvalue', 'contractValue'],
  ['urakkaarvo', 'contractValue'],
  ['arvo', 'contractValue'],
  ['value', 'contractValue'],
  ['tags', 'tags'],
  ['tagit', 'tags'],
  ['keywords', 'tags'],
  ['avainsanat', 'tags'],
  ['sourcekind', 'sourceKind'],
  ['lahdetyyppi', 'sourceKind'],
  ['lahde', 'sourceKind'],
  ['source', 'sourceKind'],
  ['sourcereference', 'sourceReference'],
  ['source_ref', 'sourceReference'],
  ['lahdeviite', 'sourceReference'],
  ['crm', 'sourceReference'],
  ['crmid', 'sourceReference'],
]);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string | number | null | undefined) {
  return compactWhitespace(String(value ?? ''))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeColumnName(value: string) {
  return normalizeComparableText(value).replace(/[^a-z0-9]+/g, '');
}

function normalizeCellValue(value: unknown) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => compactWhitespace(String(entry))).filter(Boolean).join(', ');
  }

  return compactWhitespace(String(value));
}

function parseSourceKind(value: string) {
  if (!value) {
    return 'imported' as const;
  }

  return IMPORT_SOURCE_KIND_MAP[normalizeComparableText(value)] ?? null;
}

function parseOptionalInteger(value: string, fieldLabel: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} ei ole kelvollinen kokonaisluku.`);
  }

  return parsed;
}

function parseOptionalDecimal(value: string, fieldLabel: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} ei ole kelvollinen luku.`);
  }

  return parsed;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    const tags = value.map((entry) => compactWhitespace(String(entry))).filter(Boolean);
    return tags.length > 0 ? tags : null;
  }

  const normalized = normalizeCellValue(value);

  if (!normalized) {
    return null;
  }

  const tags = normalized
    .split(/[,;|]/)
    .map((tag) => compactWhitespace(tag))
    .filter(Boolean);

  return tags.length > 0 ? tags : null;
}

function mapImportRecordToNormalizedRecord(record: TenderReferenceImportRecord) {
  const normalized = new Map<keyof CreateTenderReferenceProfileInput, unknown>();

  Object.entries(record).forEach(([column, value]) => {
    const alias = COLUMN_ALIASES.get(normalizeColumnName(column));

    if (!alias || normalized.has(alias)) {
      return;
    }

    normalized.set(alias, value);
  });

  return normalized;
}

function toRawLabel(record: TenderReferenceImportRecord, fallbackRowNumber: number) {
  const candidate = ['title', 'otsikko', 'reference', 'referenssi', 'name', 'nimi']
    .map((key) => record[key])
    .find((value) => normalizeCellValue(value));

  return normalizeCellValue(candidate) || `Rivi ${fallbackRowNumber}`;
}

export function buildTenderReferenceProfileImportKey(profile: {
  title: string;
  clientName?: string | null;
  projectType?: string | null;
  location?: string | null;
  completedYear?: number | null;
  contractValue?: number | null;
}) {
  return [
    normalizeComparableText(profile.title),
    normalizeComparableText(profile.clientName),
    normalizeComparableText(profile.projectType),
    normalizeComparableText(profile.location),
    profile.completedYear == null ? '' : String(profile.completedYear),
    profile.contractValue == null ? '' : String(profile.contractValue),
  ].join('|');
}

export function parseTenderReferenceImportRecords(records: TenderReferenceImportRecord[]) {
  return records.map((record, index) => {
    const rowNumber = index + 1;
    const rawLabel = toRawLabel(record, rowNumber);

    try {
      const normalizedRecord = mapImportRecordToNormalizedRecord(record);
      const title = normalizeCellValue(normalizedRecord.get('title'));

      if (!title) {
        throw new Error('Otsikko puuttuu.');
      }

      const sourceKindValue = parseSourceKind(normalizeCellValue(normalizedRecord.get('sourceKind')));

      if (!sourceKindValue) {
        throw new Error('Lähteen tyyppi ei ole tuettu.');
      }

      const completedYear = parseOptionalInteger(
        normalizeCellValue(normalizedRecord.get('completedYear')),
        'Valmistumisvuosi',
      );

      if (completedYear != null && (completedYear < 1900 || completedYear > 2100)) {
        throw new Error('Valmistumisvuoden pitää olla välillä 1900–2100.');
      }

      const contractValue = parseOptionalDecimal(
        normalizeCellValue(normalizedRecord.get('contractValue')),
        'Urakka-arvo',
      );

      if (contractValue != null && contractValue < 0) {
        throw new Error('Urakka-arvon pitää olla nolla tai positiivinen.');
      }

      const input: CreateTenderReferenceProfileInput = {
        title,
        clientName: normalizeCellValue(normalizedRecord.get('clientName')) || null,
        projectType: normalizeCellValue(normalizedRecord.get('projectType')) || null,
        description: normalizeCellValue(normalizedRecord.get('description')) || null,
        location: normalizeCellValue(normalizedRecord.get('location')) || null,
        completedYear,
        contractValue,
        tags: parseTags(normalizedRecord.get('tags')),
        sourceKind: sourceKindValue,
        sourceReference: normalizeCellValue(normalizedRecord.get('sourceReference')) || null,
      };

      return {
        rowNumber,
        rawLabel,
        input,
        error: null,
      } satisfies TenderReferenceImportParsedRow;
    } catch (error) {
      return {
        rowNumber,
        rawLabel,
        input: null,
        error: error instanceof Error ? error.message : 'Rivin jäsentäminen epäonnistui.',
      } satisfies TenderReferenceImportParsedRow;
    }
  });
}

function parseTenderReferenceImportJson(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as TenderReferenceImportRecord[];
  }

  if (parsed && typeof parsed === 'object') {
    const container = parsed as { profiles?: unknown; rows?: unknown; items?: unknown };
    const nested = container.profiles ?? container.rows ?? container.items;

    if (Array.isArray(nested)) {
      return nested as TenderReferenceImportRecord[];
    }
  }

  throw new Error('JSON-tuonnin pitää olla taulukko tai olio, joka sisältää `profiles`, `rows` tai `items` -taulukon.');
}

function parseWorkbookRecords(workbook: ReturnType<typeof read>) {
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [] as TenderReferenceImportRecord[];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  return utils.sheet_to_json<TenderReferenceImportRecord>(worksheet, {
    defval: '',
    raw: false,
  });
}

export function parseTenderReferenceImportText(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return [] as TenderReferenceImportParsedRow[];
  }

  const records = trimmed.startsWith('[') || trimmed.startsWith('{')
    ? parseTenderReferenceImportJson(trimmed)
    : parseWorkbookRecords(read(trimmed, { type: 'string' }));

  return parseTenderReferenceImportRecords(records);
}

export async function parseTenderReferenceImportFile(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    return parseTenderReferenceImportRecords(parseTenderReferenceImportJson(await file.text()));
  }

  const workbook = read(await file.arrayBuffer(), { type: 'array' });
  return parseTenderReferenceImportRecords(parseWorkbookRecords(workbook));
}

export function buildTenderReferenceImportPreview(options: {
  parsedRows: TenderReferenceImportParsedRow[];
  existingProfiles: TenderReferenceProfile[];
}) {
  const existingKeys = new Set(options.existingProfiles.map((profile) => buildTenderReferenceProfileImportKey(profile)));
  const batchKeyFirstRow = new Map<string, number>();
  const rows = options.parsedRows.map((row) => {
    if (!row.input) {
      return {
        rowNumber: row.rowNumber,
        rawLabel: row.rawLabel,
        status: 'invalid',
        input: null,
        reason: row.error ?? 'Riviä ei voitu tulkita.',
        duplicateOfRowNumber: null,
      } satisfies TenderReferenceImportPreviewRow;
    }

    const dedupeKey = buildTenderReferenceProfileImportKey(row.input);

    if (existingKeys.has(dedupeKey)) {
      return {
        rowNumber: row.rowNumber,
        rawLabel: row.rawLabel,
        status: 'duplicate_existing',
        input: row.input,
        reason: 'Profiili näyttää jo olevan organisaation referenssikorpuksessa.',
        duplicateOfRowNumber: null,
      } satisfies TenderReferenceImportPreviewRow;
    }

    if (batchKeyFirstRow.has(dedupeKey)) {
      return {
        rowNumber: row.rowNumber,
        rawLabel: row.rawLabel,
        status: 'duplicate_batch',
        input: row.input,
        reason: 'Sama profiili esiintyy useammin tässä tuontierässä.',
        duplicateOfRowNumber: batchKeyFirstRow.get(dedupeKey) ?? null,
      } satisfies TenderReferenceImportPreviewRow;
    }

    batchKeyFirstRow.set(dedupeKey, row.rowNumber);
    return {
      rowNumber: row.rowNumber,
      rawLabel: row.rawLabel,
      status: 'importable',
      input: row.input,
      reason: 'Profiili voidaan tuoda uutena referenssinä.',
      duplicateOfRowNumber: null,
    } satisfies TenderReferenceImportPreviewRow;
  });

  return {
    rows,
    importableProfiles: rows.flatMap((row) => (row.status === 'importable' && row.input ? [row.input] : [])),
    summary: {
      totalRows: rows.length,
      importableCount: rows.filter((row) => row.status === 'importable').length,
      duplicateExistingCount: rows.filter((row) => row.status === 'duplicate_existing').length,
      duplicateBatchCount: rows.filter((row) => row.status === 'duplicate_batch').length,
      invalidCount: rows.filter((row) => row.status === 'invalid').length,
    },
  } satisfies TenderReferenceImportPreview;
}