import { describe, expect, it } from 'vitest';
import { resolveTermTemplatePlaceholders } from '../lib/term-templates';
import type { Settings } from '../lib/types';
import { mergeDocumentSettings } from './use-data';

const sharedSettings: Settings = {
  companyName: 'Admin Oy',
  companyAddress: 'Adminkatu 1, 00100 Helsinki',
  companyPhone: '+358 40 111 2222',
  companyEmail: 'admin@example.com',
  updateFeedUrl: 'https://example.com/updates/',
  defaultVatPercent: 25.5,
  defaultMarginPercent: 30,
  defaultValidityDays: 30,
  quoteNumberPrefix: 'TAR',
  currency: 'EUR',
};

describe('mergeDocumentSettings', () => {
  it('does not leak shared admin contact details into a regular user document fallback', () => {
    const merged = mergeDocumentSettings(sharedSettings, undefined, {
      fallbackEmail: 'user@example.com',
      allowSharedContactFallback: false,
    });

    expect(merged.companyName).toBe('Admin Oy');
    expect(merged.companyAddress).toBe('Adminkatu 1, 00100 Helsinki');
    expect(merged.companyPhone).toBe('');
    expect(merged.companyEmail).toBe('user@example.com');

    const resolved = resolveTermTemplatePlaceholders('Reklamaatiot: {{reklamaatio_yhteystieto}}', {
      settings: merged,
    });

    expect(resolved).toContain('user@example.com');
    expect(resolved).not.toContain('admin@example.com');
  });

  it('allows shared contact details as fallback for admin-managed document settings', () => {
    const merged = mergeDocumentSettings(sharedSettings, undefined, {
      allowSharedContactFallback: true,
    });

    expect(merged.companyEmail).toBe('admin@example.com');
    expect(merged.companyPhone).toBe('+358 40 111 2222');
  });
});