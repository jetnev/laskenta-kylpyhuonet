export const testProducts = [
  {
    code: 'LAA-001',
    name: 'Keraaminen lattialaatta 30x30cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 25.5,
  },
  {
    code: 'LAA-002',
    name: 'Keraaminen seinälaatta 25x40cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 32.0,
  },
  {
    code: 'KAL-001',
    name: 'Suihkuhana termostaatilla',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 245.0,
  },
  {
    code: 'SUH-001',
    name: 'Suihkuseinä 80x200cm',
    category: 'Suihkutilat',
    unit: 'kpl',
    purchasePrice: 385.0,
  },
  {
    code: 'KAL-002',
    name: 'Pesuallas 60cm',
    category: 'Kalusteet',
    unit: 'kpl',
    purchasePrice: 125.0,
  },
  {
    code: 'VES-001',
    name: 'Suihkuhana termostaatilla',
    category: 'Vesikalusteet',
    unit: 'kpl',
    purchasePrice: 245.0,
  },
  {
    code: 'MAT-001',
    name: 'Saumausmassa valkoinen',
    category: 'Materiaalit',
    unit: 'pkt',
    purchasePrice: 12.5,
  },
];

export const testInstallationGroups = [
  {
    name: 'Laatoitus',
    defaultPrice: 35.0,
  },
  {
    name: 'Kalusteen asennus',
    defaultPrice: 75.0,
  },
  {
    name: 'Suihkuseinän asennus',
    defaultPrice: 95.0,
  },
  {
    name: 'Hanojen asennus',
    defaultPrice: 95.0,
  },
];

export function createTestDataScript() {
  return `
(async () => {
  const testProducts = ${JSON.stringify(testProducts, null, 2)};
  const testGroups = ${JSON.stringify(testInstallationGroups, null, 2)};
  
  const existingGroups = await spark.kv.get('installation-groups') || [];
  const newGroups = testGroups.map(g => ({
    ...g,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  await spark.kv.set('installation-groups', [...existingGroups, ...newGroups]);
  console.log('Lisätty', newGroups.length, 'hintaryhmää');
  
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
