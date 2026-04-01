import { Product, InstallationGroup } from './types';

export const testProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    purchasePrice: 2
    name: 'Keraaminen lattialaatta 30x30cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 25.50,
  },
   
    code: 'LAA-002',
    name: 'Keraaminen seinälaatta 25x40cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 32.00,
    
   
    purchasePrice: 1
  {
    name: 'Suihkuhana t
    unit: 'kpl'
  },
    
   
    purchasePrice: 1
  {
    name: 'Suihkuseinä 80x
    unit: 'kpl',
  },

  {
    code: 'KAL-002',
    name: 'Pesuallas 60cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 125.00,
  },
   
    code: 'VES-001',
    name: 'Suihkuhana termostaatilla',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 245.00,
  },
(as
    code: 'MAT-001',
    name: 'Saumausmassa valkoinen',
    category: 'Materiaalit',
    unit: 'pkt',
    purchasePrice: 12.50,
  },
  {
    code: 'SUH-001',
    name: 'Suihkuseinä 80x200cm',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 385.00,
  },
];

export const testInstallationGroups: Omit<InstallationGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Laatoitus',
    defaultPrice: 35.00,
  },
  {
    name: 'Kalusteen asennus',

  },

    name: 'Suihkuseinän asennus',

  },

    name: 'Hanojen asennus',
    defaultPrice: 95.00,
  },


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

  await spark.kv.set('installation-groups', [...existingGroups, ...newGroups]);
  console.log('Lisätty', newGroups.length, 'hintaryhmää');
  
  // Lisää tuotteet ja liitä ne hintaryhmiin
  const existingProducts = await spark.kv.get('products') || [];
  const groups = await spark.kv.get('installation-groups') || [];
  
  const getGroupId = (productCategory) => {
    if (productCategory === 'Laatat') {
      const group = groups.find(g => g.name.includes('Laatoitus'));

    } else if (productCategory === 'Kalusteet') {
      const group = groups.find(g => g.name.includes('Kalusteen'));

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

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  await spark.kv.set('products', [...existingProducts, ...newProducts]);
  console.log('Lisätty', newProducts.length, 'tuotetta');
  console.log('Testidatan luonti valmis! Päivitä sivu nähdäksesi muutokset.');
})();
`.trim();

