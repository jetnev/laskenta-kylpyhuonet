import { Product, InstallationGroup } from './types';

export const testProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    code: 'LAA-001',
    name: 'Keraaminen lattialaatta 30x30cm',
    category: 'Laatat',
    unit: 'm2',
    purchasePrice: 28.50,
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
    name: 'Kylpyhuonekaluste 80cm',
    category: 'Kalusteet',
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
];

export const testInstallationGroups: Omit<InstallationGroup, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Laatoitus',
    defaultPrice: 35.00,
  },
  {
    name: 'Kalusteen asennus',
    defaultPrice: 75.00,
  },
  {
    name: 'LVI-asennus',
    defaultPrice: 65.00,
  },
];
