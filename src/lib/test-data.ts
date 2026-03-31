import { Product, InstallationGroup } from './types';

export const testProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    code: 'LAA-001',
    name: 'Keraaminen lattialaatta 30x30cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 25.50,
  },
  {
    code: 'LAA-002',
    name: 'Keraaminen seinälaatta 25x40cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 32.00,
  },
  {
    code: 'LAA-003',
    name: 'Mosaiikkilaatta 30x30cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 45.00,
  },
  {
    code: 'KAL-001',
    name: 'Peilikaappi 60cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 185.00,
  },
  {
    code: 'KAL-002',
    name: 'Peilikaappi 80cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 245.00,
  },
  {
    code: 'KAL-003',
    name: 'Allaskaappi 60cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 295.00,
  },
  {
    code: 'SUH-001',
    name: 'Suihkuseinä 80cm kirkas',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 320.00,
  },
  {
    code: 'SUH-002',
    name: 'Suihkuseinä 90cm kirkas',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 365.00,
  },
  {
    code: 'SUH-003',
    name: 'Suihkuallas 90x90cm',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 175.00,
  },
  {
    code: 'VES-001',
    name: 'Pesuallas 60cm',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 125.00,
  },
  {
    code: 'VES-002',
    name: 'Pesuallashana kromattu',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 89.00,
  },
  {
    code: 'VES-003',
    name: 'Suihkuhana termostaatti',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 165.00,
  },
  {
    code: 'TAR-001',
    name: 'Laataston laasti',
    category: 'Tarvikkeet',
    unit: 'pkt',
    purchasePrice: 15.50,
  },
  {
    code: 'TAR-002',
    name: 'Saumausmassa valkoinen',
    category: 'Tarvikkeet',
    unit: 'pkt',
    purchasePrice: 12.00,
  },
  {
    code: 'TAR-003',
    name: 'Vedeneristyskalvo',
    category: 'Tarvikkeet',
    unit: 'm2',
    purchasePrice: 8.50,
  },
];

export const testInstallationGroups: Omit<InstallationGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Laatoitus lattia',
    defaultPrice: 35.00,
  },
  {
    name: 'Laatoitus seinä',
    defaultPrice: 40.00,
  },
  {
    name: 'Kalusteen asennus',
    defaultPrice: 85.00,
  },
  {
    name: 'Suihkuseinän asennus',
    defaultPrice: 125.00,
  },
  {
    name: 'Hanojen asennus',
    defaultPrice: 95.00,
  },
];

export function createTestDataScript() {
  return `
// Kopioi tämä koodi selaimen konsoliin testidatan luomiseksi
(async () => {
  const testProducts = ${JSON.stringify(testProducts, null, 2)};
  const testGroups = ${JSON.stringify(testInstallationGroups, null, 2)};
  
  // Lisää hintaryhmät
  const existingGroups = await spark.kv.get('installation-groups') || [];
  const newGroups = testGroups.map(g => ({
    ...g,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  await spark.kv.set('installation-groups', [...existingGroups, ...newGroups]);
  console.log('Lisätty', newGroups.length, 'hintaryhmää');
  
  // Lisää tuotteet ja liitä ne hintaryhmiin
  const existingProducts = await spark.kv.get('products') || [];
  const groups = await spark.kv.get('installation-groups') || [];
  
  const getGroupId = (productCategory) => {
    if (productCategory === 'Laatat') {
      const group = groups.find(g => g.name.includes('Laatoitus'));
      return group?.id;
    } else if (productCategory === 'Kalusteet') {
      const group = groups.find(g => g.name.includes('Kalusteen'));
      return group?.id;
    } else if (productCategory === 'Suihkutilat') {
      const group = groups.find(g => g.name.includes('Suihkuseinän'));
      return group?.id;
    } else if (productCategory === 'Vesikalusteet') {
      const group = groups.find(g => g.name.includes('Hanojen'));
      return group?.id;
    }
    return undefined;
  };
  
  const newProducts = testProducts.map(p => ({
    ...p,
    id: crypto.randomUUID(),
    installationGroupId: getGroupId(p.category),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  await spark.kv.set('products', [...existingProducts, ...newProducts]);
  console.log('Lisätty', newProducts.length, 'tuotetta');
  console.log('Testidatan luonti valmis! Päivitä sivu nähdäksesi muutokset.');
})();
`.trim();
}
