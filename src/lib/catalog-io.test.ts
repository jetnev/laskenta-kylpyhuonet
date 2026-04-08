import { describe, it, expect } from 'vitest';
import {
  getDemoProductIndex,
  generateDemoSourceRecord,
  generateDemoSourceRecords,
  registerCatalogAdapter,
  getCatalogAdapter,
  listCatalogAdapters,
  parseCatalogDemo,
  getCatalogAdapterNames,
  buildCatalogSourceDisplayName,
  parseCatalogFile,
} from './catalog-io';
import type { SourceAdapter } from './catalog-types';

// ── getDemoProductIndex ───────────────────────────────────────

describe('getDemoProductIndex', () => {
  it('palauttaa indeksin validista tuotetunnisteesta', () => {
    expect(getDemoProductIndex('k_rauta_demo-000001')).toBe(0);
    expect(getDemoProductIndex('stark_demo-000042')).toBe(41);
  });

  it('palauttaa undefined ilman päätteen numeroa', () => {
    expect(getDemoProductIndex('random-text')).toBeUndefined();
    expect(getDemoProductIndex('')).toBeUndefined();
  });

  it('palauttaa undefined nollalle', () => {
    expect(getDemoProductIndex('demo-000000')).toBeUndefined();
  });
});

// ── generateDemoSourceRecord ──────────────────────────────────

describe('generateDemoSourceRecord', () => {
  it('generoi validin SourceProductRecord-olion', () => {
    const record = generateDemoSourceRecord('test_source', 0);
    expect(record.sourceName).toBe('test_source');
    expect(record.sourceProductId).toBe('test_source-000001');
    expect(record.sourceNameRaw).toBeTruthy();
    expect(record.rawPayload).toBeDefined();
  });

  it('asettaa hintatiedot oikein', () => {
    const record = generateDemoSourceRecord('test_source', 0);
    expect(record.sourcePrice).toBeGreaterThan(0);
    expect(record.sourceSalePrice).toBeGreaterThan(record.sourcePrice!);
    expect(record.sourceMarginPercent).toBeGreaterThan(0);
  });

  it('generoi EAN-numeron', () => {
    const record = generateDemoSourceRecord('test_source', 0);
    expect(record.ean).toBe('6400000000000');
  });

  it('kiertää kategorioita indeksin mukaan', () => {
    const record0 = generateDemoSourceRecord('test', 0);
    const record1 = generateDemoSourceRecord('test', 1);
    // Eri kategoriat eri indekseille (11 kategoriaa syklissä)
    expect(record0.sourceCategoryPath).not.toBe(record1.sourceCategoryPath);
  });

  it('generoi deterministisiä arvoja samalle indeksille', () => {
    const a = generateDemoSourceRecord('demo', 5);
    const b = generateDemoSourceRecord('demo', 5);
    expect(a.sourcePrice).toBe(b.sourcePrice);
    expect(a.sourceNameRaw).toBe(b.sourceNameRaw);
    expect(a.sourceBrand).toBe(b.sourceBrand);
  });

  it('asettaa saatavuustekstin vaihtelevasti', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      generateDemoSourceRecord('test', i),
    );
    const texts = new Set(records.map((r) => r.availabilityText));
    expect(texts.size).toBeGreaterThan(1);
  });
});

// ── generateDemoSourceRecords ─────────────────────────────────

describe('generateDemoSourceRecords', () => {
  it('generoi oikean määrän tietueita', () => {
    const records = generateDemoSourceRecords('demo', 10);
    expect(records).toHaveLength(10);
  });

  it('käyttää oletusarvoisesti 1200 tietuetta', () => {
    const records = generateDemoSourceRecords('demo');
    expect(records).toHaveLength(1200);
  });

  it('kaikilla tietueilla on uniikki sourceProductId', () => {
    const records = generateDemoSourceRecords('demo', 50);
    const ids = new Set(records.map((r) => r.sourceProductId));
    expect(ids.size).toBe(50);
  });
});

// ── Adapter registry ──────────────────────────────────────────

describe('registerCatalogAdapter', () => {
  it('rekisteröi ja palauttaa adapterin', () => {
    const adapter: SourceAdapter = {
      sourceName: 'test_adapter_1',
      displayName: 'Test 1',
      supportedFormats: ['csv'],
      parseFile: async () => [],
    };
    const result = registerCatalogAdapter(adapter);
    expect(result).toBe(adapter);
  });
});

describe('getCatalogAdapter', () => {
  it('palauttaa rekisteröidyn adapterin', () => {
    const adapter: SourceAdapter = {
      sourceName: 'test_adapter_2',
      displayName: 'Test 2',
      supportedFormats: ['csv'],
      parseFile: async () => [],
    };
    registerCatalogAdapter(adapter);
    expect(getCatalogAdapter('test_adapter_2')).toBe(adapter);
  });

  it('luo geneerisen adapterin tuntemattomalle lähteelle', () => {
    const adapter = getCatalogAdapter('totally_unknown_source');
    expect(adapter.sourceName).toBe('totally_unknown_source');
    expect(adapter.displayName).toBeTruthy();
    expect(adapter.supportedFormats).toEqual(['csv', 'xlsx', 'json', 'html']);
  });
});

describe('listCatalogAdapters', () => {
  it('palauttaa rekisteröidyt adapterit aakkosjärjestyksessä', () => {
    const adapters = listCatalogAdapters();
    expect(adapters.length).toBeGreaterThan(0);
    for (let i = 1; i < adapters.length; i++) {
      expect(
        adapters[i - 1].displayName.localeCompare(adapters[i].displayName, 'fi'),
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe('getCatalogAdapterNames', () => {
  it('palauttaa lähdenimilistan', () => {
    const names = getCatalogAdapterNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
    names.forEach((n) => expect(typeof n).toBe('string'));
  });
});

// ── buildCatalogSourceDisplayName ─────────────────────────────

describe('buildCatalogSourceDisplayName', () => {
  it('tunnistaa K-Rauta-lähteen', () => {
    expect(buildCatalogSourceDisplayName('k_rauta')).toBe('K-Rauta');
    expect(buildCatalogSourceDisplayName('K-Rauta')).toBe('K-Rauta');
  });

  it('tunnistaa STARK-lähteen', () => {
    expect(buildCatalogSourceDisplayName('stark')).toBe('STARK');
    expect(buildCatalogSourceDisplayName('STARK')).toBe('STARK');
  });

  it('tunnistaa demo-lähteet', () => {
    expect(buildCatalogSourceDisplayName('k_rauta_demo')).toBe('K-Rauta demo');
    expect(buildCatalogSourceDisplayName('stark_demo')).toBe('STARK demo');
  });

  it('palauttaa syötteen sellaisenaan tuntemattomalle', () => {
    expect(buildCatalogSourceDisplayName('oma_lahde')).toBe('oma_lahde');
  });

  it('palauttaa "Lähde" tyhjälle syötteelle', () => {
    expect(buildCatalogSourceDisplayName('')).toBe('Lähde');
  });
});

// ── parseCatalogDemo ──────────────────────────────────────────

describe('parseCatalogDemo', () => {
  it('generoi demo-tietueita rekisteröidylle lähteelle', () => {
    const records = parseCatalogDemo('k_rauta_demo', 5);
    expect(records).toHaveLength(5);
    records.forEach((r) => {
      expect(r.sourceName).toBe('k_rauta_demo');
    });
  });

  it('generoi geneerisiä demo-tietueita lähteelle jolla ei ole omaa demo-generaattoria', () => {
    const records = parseCatalogDemo('ei_demo_lahdetta', 10);
    // Generic adapter creates records via createGenericAdapter fallback
    expect(records).toHaveLength(10);
  });
});

// ── parseCatalogFile (CSV-parsinta) ───────────────────────────

describe('parseCatalogFile (CSV)', () => {
  function makeFile(content: string, name: string, type = 'text/csv'): File {
    return new File([content], name, { type });
  }

  it('parsii puolipisteerotetun CSV:n', async () => {
    const csv = 'name;price;unit\nLattialaatta;25.50;m2\nSeinälaatta;18.00;m2';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(2);
    expect(records[0].sourceNameRaw).toBe('Lattialaatta');
    expect(records[0].sourcePrice).toBe(25.5);
  });

  it('parsii pilkkuerotetun CSV:n', async () => {
    const csv = 'name,price,unit\nTuote A,10.00,kpl';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Tuote A');
  });

  it('parsii tabulaattorierotetun tiedoston', async () => {
    const tsv = 'name\tprice\tunit\nTuote B\t15.00\tkpl';
    const records = await parseCatalogFile(makeFile(tsv, 'test.tsv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Tuote B');
  });

  it('käsittelee lainausmerkit CSV:ssä', async () => {
    const csv = 'name;price\n"Tuote ""A""";30.00';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Tuote "A"');
  });

  it('käsittelee BOM-merkin', async () => {
    const csv = '\uFEFFname;price\nBOM Tuote;5.00';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('BOM Tuote');
  });

  it('tunnistaa eri kenttänimialiakset', async () => {
    const csv = 'nimi;ostohinta;brandi;ean;yksikkö\nTestituote;20;Pukkila;6418551234567;m2';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Testituote');
    expect(records[0].sourcePrice).toBe(20);
    expect(records[0].sourceBrand).toBe('Pukkila');
    expect(records[0].ean).toBe('6418551234567');
  });

  it('parsii hinta-arvot suomalaisella pilkuilla', async () => {
    const csv = 'name;price\nTuote;1 234,56';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'test');
    expect(records).toHaveLength(1);
    expect(records[0].sourcePrice).toBe(1234.56);
  });

  it('generoi sourceProductId automaattisesti ilman id-kenttää', async () => {
    const csv = 'name;price\nTuote;10';
    const records = await parseCatalogFile(makeFile(csv, 'test.csv'), 'src');
    expect(records[0].sourceProductId).toBe('src-000001');
  });

  it('palauttaa tyhjän taulukon sisältöiselle CSV:lle', async () => {
    const csv = '';
    const records = await parseCatalogFile(makeFile(csv, 'empty.csv'), 'test');
    expect(records).toHaveLength(0);
  });
});

// ── parseCatalogFile (JSON-parsinta) ──────────────────────────

describe('parseCatalogFile (JSON)', () => {
  function makeJsonFile(data: unknown, name = 'test.json'): File {
    return new File([JSON.stringify(data)], name, { type: 'application/json' });
  }

  it('parsii JSON-taulukon', async () => {
    const data = [
      { name: 'Tuote A', price: 10, unit: 'kpl' },
      { name: 'Tuote B', price: 20, unit: 'm2' },
    ];
    const records = await parseCatalogFile(makeJsonFile(data), 'json_test');
    expect(records).toHaveLength(2);
    expect(records[0].sourceNameRaw).toBe('Tuote A');
  });

  it('parsii {items: [...]} -rakenteen', async () => {
    const data = { items: [{ name: 'Item 1', price: 5 }] };
    const records = await parseCatalogFile(makeJsonFile(data), 'json_test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Item 1');
  });

  it('parsii {products: [...]} -rakenteen', async () => {
    const data = { products: [{ name: 'Product 1', price: 15 }] };
    const records = await parseCatalogFile(makeJsonFile(data), 'json_test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Product 1');
  });

  it('parsii yksittäisen objektin', async () => {
    const data = { name: 'Yksittäinen', price: 99 };
    const records = await parseCatalogFile(makeJsonFile(data), 'json_test');
    expect(records).toHaveLength(1);
    expect(records[0].sourceNameRaw).toBe('Yksittäinen');
  });

  it('tunnistaa JSON-tiedoston .json-päätteestä', async () => {
    const data = [{ name: 'From Extension' }];
    const file = new File([JSON.stringify(data)], 'data.json', { type: 'application/octet-stream' });
    const records = await parseCatalogFile(file, 'ext_test');
    expect(records).toHaveLength(1);
  });
});

// ── rawPayload sisältö ────────────────────────────────────────

describe('rawPayload', () => {
  it('sisältää alkuperäiset ei-tyhjät kenttäarvot', async () => {
    const csv = 'name;price;category\nTestituote;30.00;Laatat';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const records = await parseCatalogFile(file, 'payload_test');
    expect(records).toHaveLength(1);
    const payload = records[0].rawPayload;
    expect(payload).toBeDefined();
    expect(Object.keys(payload).length).toBeGreaterThan(0);
  });
});
