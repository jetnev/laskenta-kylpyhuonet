import { describe, expect, it } from 'vitest';

import {
  formatTenderConfidence,
  getTenderTextPreview,
  TENDER_DOCUMENT_EXTRACTION_STATUS_META,
  TENDER_DOCUMENT_EXTRACTOR_TYPE_META,
  TENDER_DRAFT_ARTIFACT_STATUS_META,
  TENDER_MISSING_ITEM_STATUS_META,
  TENDER_REQUIREMENT_STATUS_META,
  TENDER_REVIEW_TASK_STATUS_META,
  TENDER_RISK_FLAG_STATUS_META,
  TENDER_SEVERITY_META,
} from './tender-intelligence-ui';

describe('Phase 6 Tender UI helpers', () => {
  it('maps result-domain statuses and severities into visible finnish labels', () => {
    expect(TENDER_REQUIREMENT_STATUS_META.unreviewed.label).toBe('Tarkistamatta');
    expect(TENDER_MISSING_ITEM_STATUS_META.open.label).toBe('Avoin');
    expect(TENDER_RISK_FLAG_STATUS_META.mitigated.label).toBe('Mitigoitu');
    expect(TENDER_REVIEW_TASK_STATUS_META.todo.label).toBe('Avoin');
    expect(TENDER_DRAFT_ARTIFACT_STATUS_META.placeholder.label).toBe('Placeholder');
    expect(TENDER_DOCUMENT_EXTRACTION_STATUS_META.unsupported.label).toBe('Ei tuettu');
    expect(TENDER_DOCUMENT_EXTRACTOR_TYPE_META.xlsx.label).toBe('XLSX');
    expect(TENDER_SEVERITY_META.high.label).toBe('Korkea');
  });

  it('formats confidence values and preview text for result cards', () => {
    expect(formatTenderConfidence(0.42)).toBe('42 %');
    expect(formatTenderConfidence(null)).toBe('Ei arviota');
    expect(getTenderTextPreview('  Tämä on\n\nplaceholder-rivin pidempi esimerkkiteksti.  ', 20)).toBe('Tämä on placehold...');
  });
});