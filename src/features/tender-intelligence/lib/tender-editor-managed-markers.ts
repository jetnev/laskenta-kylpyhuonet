import type { QuoteRow } from '@/lib/types';

import type { TenderEditorManagedBlockId } from '../types/tender-editor-import';
import { buildTenderEditorManagedBlockMarkerKey } from './tender-editor-managed-surface';

export const TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX = 'tender-editor-import';
export const TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX = 'tender-editor-import';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getTenderEditorManagedTextBlockMarkers(markerKey: string, options?: { legacy?: boolean }) {
  const markerPrefix = options?.legacy ? TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX : `${TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX}:block`;

  return {
    start: `<!-- ${markerPrefix}:${markerKey}:start -->`,
    end: `<!-- ${markerPrefix}:${markerKey}:end -->`,
  };
}

export function hasTenderEditorManagedTextBlock(existingValue: string | null | undefined, markerKey: string, options?: { legacy?: boolean }) {
  const currentValue = existingValue ?? '';
  const markers = getTenderEditorManagedTextBlockMarkers(markerKey, options);
  const blockPattern = new RegExp(`${escapeRegex(markers.start)}[\\s\\S]*?${escapeRegex(markers.end)}`, 'm');

  return blockPattern.test(currentValue);
}

export function extractTenderEditorManagedTextMarkerKeys(existingValue: string | null | undefined, draftPackageId: string) {
  const currentValue = existingValue ?? '';
  const markerPattern = new RegExp(`${escapeRegex(`<!-- ${TENDER_EDITOR_MANAGED_TEXT_BLOCK_PREFIX}:block:`)}(.+?)${escapeRegex(':start -->')}`, 'g');
  const markerKeys = new Set<string>();

  let match = markerPattern.exec(currentValue);

  while (match) {
    const markerKey = match[1]?.trim();

    if (markerKey && markerKey.startsWith(`${draftPackageId}:`)) {
      markerKeys.add(markerKey);
    }

    match = markerPattern.exec(currentValue);
  }

  return [...markerKeys];
}

export function buildTenderEditorManagedSectionRowKey(draftPackageId: string, blockId: TenderEditorManagedBlockId) {
  return `${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:${buildTenderEditorManagedBlockMarkerKey(draftPackageId, blockId)}`;
}

export function parseTenderEditorManagedSectionRowKey(value?: string | null) {
  const nextValue = value?.trim();

  if (!nextValue || !nextValue.startsWith(`${TENDER_EDITOR_MANAGED_SECTION_ROW_PREFIX}:`)) {
    return null;
  }

  const [, draftPackageId = '', blockId = ''] = nextValue.split(':');

  if (!draftPackageId || !blockId) {
    return null;
  }

  return { draftPackageId, blockId };
}

export function hasTenderEditorManagedSectionRow(rows: QuoteRow[], sectionRowKey: string | null | undefined) {
  if (!sectionRowKey) {
    return false;
  }

  return rows.some((row) => row.mode === 'section' && row.notes?.trim() === sectionRowKey);
}