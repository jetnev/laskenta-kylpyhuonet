import { describe, expect, it } from 'vitest';

import {
  formatTenderCurrency,
  formatTenderConfidence,
  getTenderTextPreview,
  TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META,
  TENDER_DRAFT_PACKAGE_ITEM_TYPE_META,
  TENDER_DRAFT_PACKAGE_STATUS_META,
  TENDER_DOCUMENT_EXTRACTION_STATUS_META,
  TENDER_DOCUMENT_EXTRACTOR_TYPE_META,
  TENDER_DRAFT_ARTIFACT_STATUS_META,
  TENDER_MISSING_ITEM_STATUS_META,
  TENDER_REFERENCE_PROFILE_SOURCE_KIND_META,
  TENDER_REFERENCE_SOURCE_META,
  TENDER_RESOLUTION_STATUS_META,
  TENDER_REVIEW_STATUS_META,
  TENDER_REQUIREMENT_STATUS_META,
  TENDER_REVIEW_TASK_STATUS_META,
  TENDER_RISK_FLAG_STATUS_META,
  TENDER_SEVERITY_META,
} from './tender-intelligence-ui';

describe('Phase 6 Tender UI helpers', () => {
  it('maps result-domain statuses and severities into visible finnish labels', () => {
    expect(TENDER_REQUIREMENT_STATUS_META.unreviewed.label).toBe('Tarkistamatta');
    expect(TENDER_REVIEW_STATUS_META.accepted.label).toBe('Hyväksytty');
    expect(TENDER_RESOLUTION_STATUS_META.resolved.label).toBe('Ratkaistu');
    expect(TENDER_MISSING_ITEM_STATUS_META.open.label).toBe('Avoin');
    expect(TENDER_RISK_FLAG_STATUS_META.mitigated.label).toBe('Mitigoitu');
    expect(TENDER_REVIEW_TASK_STATUS_META.todo.label).toBe('Avoin');
    expect(TENDER_DRAFT_ARTIFACT_STATUS_META.placeholder.label).toBe('Placeholder');
    expect(TENDER_DOCUMENT_EXTRACTION_STATUS_META.unsupported.label).toBe('Ei tuettu');
    expect(TENDER_DOCUMENT_EXTRACTOR_TYPE_META.xlsx.label).toBe('XLSX');
    expect(TENDER_SEVERITY_META.high.label).toBe('Korkea');
    expect(TENDER_REFERENCE_SOURCE_META.organization_reference_profile.label).toBe('Referenssikorpus');
    expect(TENDER_REFERENCE_PROFILE_SOURCE_KIND_META.imported.label).toBe('Tuotu');
    expect(TENDER_DRAFT_PACKAGE_STATUS_META.reviewed.label).toBe('Tarkistettu');
    expect(TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META.imported.label).toBe('Importoitu editoriin');
    expect(TENDER_DRAFT_PACKAGE_ITEM_TYPE_META.review_note.label).toBe('Editor-note');
  });

  it('formats confidence values and preview text for result cards', () => {
    expect(formatTenderConfidence(0.42)).toBe('42 %');
    expect(formatTenderConfidence(null)).toBe('Ei arviota');
    expect(formatTenderCurrency(125000)).toContain('125');
    expect(getTenderTextPreview('  Tämä on\n\nplaceholder-rivin pidempi esimerkkiteksti.  ', 20)).toBe('Tämä on placehold...');
  });
});