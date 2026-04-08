import { describe, expect, it } from 'vitest';
import { resolveTermTemplatePlaceholders } from '../lib/term-templates';
import type { Product, Settings } from '../lib/types';
import {
  buildDuplicatedProductInput,
  buildDuplicatedProductName,
  mergeDocumentSettings,
} from './use-data';

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

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    code: 'LAA-60',
    internalCode: 'LAA-60',
    name: 'Seinälaatta 60x60',
    description: 'Mattapintainen laatta',
    category: 'Laatat',
    brand: 'Testi Brand',
    manufacturer: 'Testi Manufacturer',
    manufacturerSku: 'SKU-123',
    ean: '1234567890123',
    normalizedName: 'Seinälaatta 60x60',
    unit: 'kpl',
    salesUnit: 'kpl',
    baseUnit: 'kpl',
    purchasePrice: 10,
    defaultCostPrice: 10,
    defaultSalePrice: 15,
    defaultSalesMarginPercent: 50,
    defaultInstallationPrice: 2,
    defaultMarginPercent: 50,
    defaultInstallPrice: 2,
    installationGroupId: 'group-1',
    isActive: true,
    active: true,
    searchableText: 'laa-60 seinälaatta 60x60',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

describe('buildDuplicatedProductName', () => {
  it('adds a copy suffix for the first duplicate', () => {
    expect(buildDuplicatedProductName('Seinälaatta 60x60', ['Seinälaatta 60x60'])).toBe('Seinälaatta 60x60 (kopio)');
  });

  it('increments the copy suffix when prior copies already exist', () => {
    expect(
      buildDuplicatedProductName('Seinälaatta 60x60', [
        'Seinälaatta 60x60',
        'Seinälaatta 60x60 (kopio)',
        'Seinälaatta 60x60 (kopio 2)',
      ]),
    ).toBe('Seinälaatta 60x60 (kopio 3)');
  });

  it('normalizes an already duplicated source name back to the original base name', () => {
    expect(
      buildDuplicatedProductName('Seinälaatta 60x60 (kopio)', [
        'Seinälaatta 60x60',
        'Seinälaatta 60x60 (kopio)',
      ]),
    ).toBe('Seinälaatta 60x60 (kopio 2)');
  });
});

describe('buildDuplicatedProductInput', () => {
  it('copies the editable product fields but drops storage audit fields', () => {
    const duplicated = buildDuplicatedProductInput(createProduct(), [createProduct()]);

    expect(duplicated.name).toBe('Seinälaatta 60x60 (kopio)');
    expect(duplicated.code).toBe('LAA-60');
    expect(duplicated.defaultSalePrice).toBe(15);
    expect(duplicated.installationGroupId).toBe('group-1');
    expect('id' in duplicated).toBe(false);
    expect('createdAt' in duplicated).toBe(false);
    expect('updatedAt' in duplicated).toBe(false);
  });
});

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