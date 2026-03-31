import { Product, InstallationGroup } from './types';

    code: 'LAA-001',
   
    purchasePrice: 2
  {
    name: 'Keraaminen s
    unit: 'm2',
    purchasePrice: 25.50,
  {
   
    code: 'LAA-002',
    name: 'Keraaminen seinälaatta 25x40cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 32.00,
  {
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
    purchasePrice: 1
  {
    name: 'Pesuallas 60cm'
    unit: 'kpl',
  },
    
   
    purchasePrice: 8
  {
    name: 'Suihkuhana term
    unit: 'kpl',
  },
    
   
    purchasePrice: 1
  {
    name: 'Saumausmassa valk
    unit: 'pkt',
  },
    
   
    purchasePrice: 8
];
export const testInstallatio
    name: 'Laato
  },
    
  }
    name: 'Kalusteen
  },
    name: 'Suihkuseinän asen
  },
    name: 'Hanojen asennus
  },

  return `
(async () => {
  const testGroups = ${JSON.st
  // Lisää hinta
  const newGroups = testGr
    
   
  await spark.kv.set
  
  const existingProducts = awa
  
    if (productCategory =
    
   
    } else if (produ
      return group?.id;
      const group = groups.fin
    }
  };
  co
   
    createdAt: new D
  }));
  await spark.kv.set('produ
  console.log('T
`.trim();



































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
