import { Product, InstallationGroup } from './types';

export const testProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
   
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
    code: 'KAL-001',
    name: 'Suihkuhana termostaatilla',
    category: 'Vesikalusteet',
  {
    purchasePrice: 245.00,
  },
  {
    code: 'SUH-001',
    name: 'Suihkuseinä 80x200cm',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 385.00,
  },
  {
    code: 'KAL-002',
    name: 'Pesuallas 60cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 125.00,
  },
  {
    code: 'VES-001',
    name: 'Suihkuhana termostaatilla',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 245.00,
  },
  {
    code: 'MAT-001',
    name: 'Saumausmassa valkoinen',
    category: 'Materiaalit',
    unit: 'pkt',
    purchasePrice: 12.50,
  },
];{

export const testInstallationGroups: Omit<InstallationGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Laatoitus',
    defaultPrice: 35.00,

  {
    name: 'Kalusteen asennus',

  },

    name: 'Suihkuseinän asennus',

    defaultPrice: 95.00,
,
    name: 'Hanojen asennus',
    defaultPrice: 95.00,
  },rt function createTestDataScript() {
  return `
// Kopioi tämä koodi selaimen konsoliin testidatan luomiseksi
export function createTestDataScript() {
  return `roducts = ${JSON.stringify(testProducts, null, 2)};
// Kopioi tämä koodi selaimen konsoliin testidatan luomiseksi null, 2)};
(async () => {
  const testProducts = ${JSON.stringify(testProducts, null, 2)};
  const testGroups = ${JSON.stringify(testInstallationGroups, null, 2)};
  const newGroups = testGroups.map(g => ({
  // Lisää hintaryhmät
  const existingGroups = await spark.kv.get('installation-groups') || [];
  const newGroups = testGroups.map(g => ({
    ...g,g(),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),Groups, ...newGroups]);
    updatedAt: new Date().toISOString(),

  await spark.kv.set('installation-groups', [...existingGroups, ...newGroups]);
  console.log('Lisätty', newGroups.length, 'hintaryhmää');
  tallation-groups') || [];
  // Lisää tuotteet ja liitä ne hintaryhmiin
  const existingProducts = await spark.kv.get('products') || [];
  const groups = await spark.kv.get('installation-groups') || [];
  const group = groups.find(g => g.name.includes('Laatoitus'));
  const getGroupId = (productCategory) => {
    if (productCategory === 'Laatat') {
      const group = groups.find(g => g.name.includes('Laatoitus'));

    } else if (productCategory === 'Kalusteet') {
      const group = groups.find(g => g.name.includes('Kalusteen'));
  return group?.id;
    } else if (productCategory === 'Suihkutilat') {
      const group = groups.find(g => g.name.includes('Suihkuseinän'));
      return group?.id;
    } else if (productCategory === 'Vesikalusteet') {
      const group = groups.find(g => g.name.includes('Hanojen'));
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

