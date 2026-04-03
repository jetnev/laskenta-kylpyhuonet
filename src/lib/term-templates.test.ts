import { describe, expect, it } from 'vitest';
import {
  cloneTermTemplateFromMaster,
  createQuoteTermsSnapshot,
  getSystemTermTemplates,
  listTermTemplates,
  resolveQuoteTermsSnapshotTemplate,
  restoreTermTemplateFromMaster,
  updateTermTemplate,
} from './term-templates';

describe('term templates', () => {
  it('exposes the seeded master templates only once', () => {
    const masters = getSystemTermTemplates();
    expect(masters).toHaveLength(6);
    expect(new Set(masters.map((template) => template.slug)).size).toBe(6);

    const cloned = cloneTermTemplateFromMaster([], 'master-consumer-product-only', 'user-1');
    const listed = listTermTemplates(cloned.templates, 'user-1');
    expect(listed.filter((template) => template.isSystem)).toHaveLength(6);
  });

  it('shows master templates in the combined listing', () => {
    const listed = listTermTemplates([], 'user-1');
    expect(listed.some((template) => template.id === 'master-business-project')).toBe(true);
    expect(listed.some((template) => template.isSystem)).toBe(true);
  });

  it('does not allow direct master template updates', () => {
    expect(() =>
      updateTermTemplate([], 'master-business-project', { name: 'Muokattu master' }, 'user-1')
    ).toThrow('Master-pohjaa ei voi muokata suoraan. Luo siitä oma kopio.');
  });

  it('can create an editable user copy from a master template', () => {
    const result = cloneTermTemplateFromMaster([], 'master-business-product-install', 'user-1');

    expect(result.template.isSystem).toBe(false);
    expect(result.template.baseTemplateId).toBe('master-business-product-install');
    expect(result.template.name).toContain('(oma versio)');
  });

  it('can update a user copy', () => {
    const cloned = cloneTermTemplateFromMaster([], 'master-business-product-only', 'user-1');
    const updated = updateTermTemplate(
      cloned.templates,
      cloned.template.id,
      {
        name: 'B2B - tuotetoimitus (oma)',
        contentMd: '# Oma sisältö\nMuokattu ehtoteksti.',
      },
      'user-1'
    );

    expect(updated.template.name).toBe('B2B - tuotetoimitus (oma)');
    expect(updated.template.contentMd).toContain('Muokattu ehtoteksti.');
    expect(updated.template.version).toBe(2);
  });

  it('can restore a user copy from its master template', () => {
    const cloned = cloneTermTemplateFromMaster([], 'master-business-project', 'user-1');
    const modified = updateTermTemplate(
      cloned.templates,
      cloned.template.id,
      {
        name: 'Oma projektipohja',
        description: 'Muokattu kuvaus',
        customerSegment: 'consumer',
        scopeType: 'product_only',
        contentMd: '# Oma teksti\nTäysin eri sisältö.',
      },
      'user-1'
    );

    const restored = restoreTermTemplateFromMaster(modified.templates, modified.template.id, 'user-1');

    expect(restored.template.name).toBe('Oma projektipohja');
    expect(restored.template.description).toBe('Laajempaan projekti- tai urakkatoimitukseen tarkoitettu ehtopohja.');
    expect(restored.template.customerSegment).toBe('business');
    expect(restored.template.scopeType).toBe('project');
    expect(restored.template.contentMd).toContain('Tarjous koskee projektikohtaista toimitusta');
    expect(restored.template.version).toBe(3);
  });

  it('keeps the quote snapshot unchanged after template updates', () => {
    const cloned = cloneTermTemplateFromMaster([], 'master-consumer-product-install', 'user-1');
    const snapshot = createQuoteTermsSnapshot(cloned.template);
    const updated = updateTermTemplate(
      cloned.templates,
      cloned.template.id,
      {
        contentMd: '# Päivitetty sisältö\nTämä ei saa muuttaa vanhaa tarjousta.',
      },
      'user-1'
    );

    expect(snapshot.termsSnapshotContentMd).toContain('Tarjous koskee tarjouksessa eriteltyjen tuotteiden toimitusta');
    expect(updated.template.contentMd).toContain('Tämä ei saa muuttaa vanhaa tarjousta.');

    const resolved = resolveQuoteTermsSnapshotTemplate(
      {
        termsId: snapshot.termsId,
        termsSnapshotName: snapshot.termsSnapshotName,
        termsSnapshotContentMd: snapshot.termsSnapshotContentMd,
      },
      updated.template
    );

    expect(resolved?.contentMd).toBe(snapshot.termsSnapshotContentMd);
    expect(resolved?.contentMd).not.toBe(updated.template.contentMd);
  });
});
