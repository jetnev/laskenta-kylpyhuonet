import { useEffect, useMemo, useRef, useState } from 'react';
import { useKV, useUserScopedKVMany } from './use-kv';
import {
  CompanyProfile,
  Invoice,
  Product,
  InstallationGroup,
  InstallationGroupCategorySettings,
  SubstituteProduct,
  Customer,
  Project,
  Quote,
  QuoteRow,
  QuoteTerms,
  Settings,
  QuoteStatus,
} from '../lib/types';
import { useAuth } from './use-auth';
import {
  cloneTermTemplateFromMaster,
  createTermTemplate,
  createQuoteTermsSnapshot,
  deleteTermTemplate,
  duplicateTermTemplate,
  getDefaultTermTemplate,
  hydrateStoredTermTemplates,
  listTermTemplates,
  restoreTermTemplateFromMaster,
  setTermTemplateArchived,
  updateTermTemplate,
} from '../lib/term-templates';
import { createInvoiceSnapshotFromQuote } from '../lib/invoices';

type OwnedAuditKeys = 'id' | keyof ReturnType<typeof buildOwnedAudit>;
type QuoteCreateInput = Pick<Quote, 'projectId'> & Partial<Omit<Quote, OwnedAuditKeys | 'projectId'>>;

const STARTER_WORKSPACE_VERSION = 1;

interface StarterWorkspaceSeedResult {
  customerId: string;
  projectId: string;
  quoteId: string;
}

interface StarterWorkspaceState {
  version: number;
  status: 'seeded' | 'skipped';
  handledAt: string;
  templateIds?: StarterWorkspaceSeedResult;
}

interface StarterWorkspaceTemplate {
  customers: Customer[];
  projects: Project[];
  quotes: Quote[];
  rows: QuoteRow[];
  ids: StarterWorkspaceSeedResult;
}

const DEFAULT_SETTINGS: Settings = {
  companyName: 'Yritys Oy',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  updateFeedUrl: 'https://jetnev.github.io/laskenta-kylpyhuonet/',
  defaultVatPercent: 25.5,
  defaultMarginPercent: 30,
  defaultValidityDays: 30,
  quoteNumberPrefix: 'TAR',
  currency: 'EUR',
};

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyLogo: '',
  businessId: '',
  iban: '',
  bic: '',
  invoiceNumberPrefix: 'LASKU',
  defaultInvoiceDueDays: 14,
  lateInterestPercent: 8,
};

const DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS: InstallationGroupCategorySettings = {
  industryPreset: undefined,
  hideEmptyCategories: false,
  showFavoritesOnly: false,
  preferences: [],
};

function nowIso() {
  return new Date().toISOString();
}

function buildAudit(userId?: string) {
  const now = nowIso();
  return {
    createdAt: now,
    updatedAt: now,
    createdByUserId: userId,
    updatedByUserId: userId,
  };
}

function buildOwnedAudit(userId: string) {
  return {
    ownerUserId: userId,
    ...buildAudit(userId),
  };
}

function ensureSignedIn(userId?: string | null): string {
  if (!userId) {
    throw new Error('Kirjautuminen vaaditaan.');
  }
  return userId;
}

function getVisibleUserIds(users: Array<{ id: string }>, currentUserId?: string | null, canManageUsers = false) {
  if (!currentUserId) {
    return [];
  }

  if (!canManageUsers) {
    return [currentUserId];
  }

  return Array.from(new Set(users.map((user) => user.id).filter(Boolean)));
}

function flattenUserScopedValues<T>(userIds: string[], valuesByUserId: Record<string, T[]>) {
  return userIds.flatMap((userId) => valuesByUserId[userId] ?? []);
}

function generateQuoteNumber(prefix: string = 'TAR') {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${parts}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function createStarterWorkspaceTemplate(userId: string, settings: Settings): StarterWorkspaceTemplate {
  const customerId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const quoteId = crypto.randomUUID();
  const scheduleStart = new Date();
  scheduleStart.setDate(scheduleStart.getDate() + 14);
  const scheduleEnd = new Date(scheduleStart);
  scheduleEnd.setDate(scheduleEnd.getDate() + 10);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (settings.defaultValidityDays || 30));

  const customer: Customer = {
    id: customerId,
    name: 'Malliasiakas Oy',
    contactPerson: 'Maija Mallinen',
    email: 'maija.mallinen@example.com',
    phone: '+358 40 123 4567',
    address: 'Esimerkkikatu 10 A 3, 00100 Helsinki',
    businessId: '1234567-8',
    notes: 'Valmiiksi luotu esimerkkiasiakas. Muokkaa tai poista tiedot ennen omaa käyttöä.',
    ...buildOwnedAudit(userId),
  };

  const project: Project = {
    id: projectId,
    customerId,
    name: 'Malliprojekti: kylpyhuoneremontti',
    site: 'Esimerkkikatu 10 A 3, Helsinki',
    region: 'Pääkaupunkiseutu',
    regionCoefficient: 1,
    notes: 'Valmiiksi luotu malliprojekti ensimmäistä tarjousta varten.',
    customOptions: [
      {
        id: crypto.randomUUID(),
        label: 'Työn aloitus',
        value: '2-3 viikon sisällä tilauksesta',
      },
      {
        id: crypto.randomUUID(),
        label: 'Työn kesto',
        value: 'Arviolta 2 viikkoa',
      },
    ],
    ...buildOwnedAudit(userId),
  };

  const quote: Quote = {
    id: quoteId,
    projectId,
    title: 'Mallitarjous: kylpyhuoneremontti',
    quoteNumber: generateQuoteNumber(settings.quoteNumberPrefix),
    revisionNumber: 1,
    status: 'draft',
    vatPercent: settings.defaultVatPercent,
    validUntil: validUntil.toISOString().slice(0, 10),
    notes: 'Tämä on valmiiksi luotu mallitarjous. Päivitä rivit, määrät ja hinnat kohteeseesi sopiviksi ennen lähettämistä.',
    internalNotes: 'Mallitarjous on luotu käyttöönoton helpottamiseksi. Poista tai korvaa tämä teksti ennen tarjouksen lähettämistä.',
    schedule: 'Työ voidaan aloittaa noin kahden viikon kuluessa tilauksesta.',
    scheduleMilestones: [
      {
        id: crypto.randomUUID(),
        title: 'Työn aloitus',
        targetDate: scheduleStart.toISOString().slice(0, 10),
        type: 'start',
      },
      {
        id: crypto.randomUUID(),
        title: 'Työn valmistuminen',
        targetDate: scheduleEnd.toISOString().slice(0, 10),
        type: 'completion',
      },
    ],
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 95,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: settings.defaultMarginPercent,
    pricingMode: 'margin',
    ...buildOwnedAudit(userId),
    lastAutoSavedAt: nowIso(),
  };

  const rows: QuoteRow[] = [
    {
      id: crypto.randomUUID(),
      quoteId,
      sortOrder: 10,
      mode: 'section',
      source: 'manual',
      productName: 'Esimerkkisisältö',
      description: 'Mallitarjous näyttää miten väliotsikot, tuoteryhmittely ja hinnoittelu toimivat yhdessä.',
      quantity: 0,
      unit: 'erä',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: 0,
      regionMultiplier: 1,
      ...buildOwnedAudit(userId),
    },
    {
      id: crypto.randomUUID(),
      quoteId,
      sortOrder: 20,
      mode: 'product_installation',
      source: 'manual',
      productCode: 'MALLI-001',
      productName: 'Seinä- ja lattialaatoitus',
      description: 'Esimerkkirivi materiaalille ja asennukselle. Päivitä oma määrä, hinta ja kuvaus tähän.',
      quantity: 18,
      unit: 'm²',
      purchasePrice: 29.5,
      salesPrice: 42,
      installationPrice: 36,
      marginPercent: 29,
      regionMultiplier: 1,
      notes: 'Sisältää peruslaastit, sauma-aineet ja normaalin asennuksen.',
      ...buildOwnedAudit(userId),
    },
    {
      id: crypto.randomUUID(),
      quoteId,
      sortOrder: 30,
      mode: 'product_installation',
      source: 'manual',
      productCode: 'MALLI-002',
      productName: 'Kalusteiden ja hanan asennus',
      description: 'Esimerkkirivi kalusteiden, altaan ja hanan toimitukselle sekä asennukselle.',
      quantity: 1,
      unit: 'erä',
      purchasePrice: 210,
      salesPrice: 295,
      installationPrice: 320,
      marginPercent: 28,
      regionMultiplier: 1,
      notes: 'Voit jakaa tämän myöhemmin omille riveilleen tarpeen mukaan.',
      ...buildOwnedAudit(userId),
    },
    {
      id: crypto.randomUUID(),
      quoteId,
      sortOrder: 40,
      mode: 'charge',
      source: 'manual',
      chargeType: 'protection',
      productName: 'Suojaus, loppusiivous ja jätekuljetus',
      description: 'Esimerkkiveloitus yleiskuluille, jotka eivät kuulu yhdelle yksittäiselle tarjousriville.',
      quantity: 1,
      unit: 'erä',
      purchasePrice: 0,
      salesPrice: 190,
      installationPrice: 0,
      marginPercent: 100,
      regionMultiplier: 1,
      manualSalesPrice: true,
      ...buildOwnedAudit(userId),
    },
  ];

  return {
    customers: [customer],
    projects: [project],
    quotes: [quote],
    rows,
    ids: {
      customerId,
      projectId,
      quoteId,
    },
  };
}

export function normalizeCompanyProfile(profile?: Partial<CompanyProfile>): CompanyProfile {
  return {
    companyName: profile?.companyName?.trim() || '',
    companyAddress: profile?.companyAddress?.trim() || '',
    companyPhone: profile?.companyPhone?.trim() || '',
    companyEmail: profile?.companyEmail?.trim() || '',
    companyLogo: profile?.companyLogo?.trim() || '',
    businessId: profile?.businessId?.trim() || '',
    iban: profile?.iban?.replace(/\s+/g, '').toUpperCase() || '',
    bic: profile?.bic?.trim().toUpperCase() || '',
    invoiceNumberPrefix: profile?.invoiceNumberPrefix?.trim().toUpperCase() || 'LASKU',
    defaultInvoiceDueDays: Math.max(0, Math.round(profile?.defaultInvoiceDueDays || 14)),
    lateInterestPercent:
      typeof profile?.lateInterestPercent === 'number'
        ? profile.lateInterestPercent
        : 8,
  };
}

export function mergeDocumentSettings(
  settings: Settings,
  companyProfile?: CompanyProfile,
  options: {
    fallbackEmail?: string;
    allowSharedContactFallback?: boolean;
  } = {}
): Settings {
  const profile = normalizeCompanyProfile(companyProfile);
  const fallbackEmail = options.fallbackEmail?.trim() || '';
  const allowSharedContactFallback = Boolean(options.allowSharedContactFallback);

  return {
    ...settings,
    companyName: profile.companyName || settings.companyName,
    companyAddress: profile.companyAddress || settings.companyAddress,
    companyPhone: profile.companyPhone || (allowSharedContactFallback ? settings.companyPhone : ''),
    companyEmail:
      profile.companyEmail ||
      (allowSharedContactFallback ? settings.companyEmail : '') ||
      fallbackEmail,
    companyLogo: profile.companyLogo || settings.companyLogo,
  };
}

export function useProducts() {
  const [products = [], setProducts] = useKV<Product[]>('products', []);
  const { user, canDelete, canEdit } = useAuth();
  const userId = user?.id;

  const orderedProducts = useMemo(
    () =>
      [...products].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
          left.name.localeCompare(right.name, 'fi')
      ),
    [products]
  );

  const addProduct = (product: Omit<Product, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä tuotteita.');
    }

    const internalCode = product.internalCode?.trim() || product.code?.trim();
    const code = product.code?.trim() || internalCode;
    if (!code || !product.name.trim()) {
      throw new Error('Anna tuotteelle vähintään koodi ja nimi.');
    }

    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      code,
      internalCode,
      name: product.name.trim(),
      description: product.description?.trim(),
      category: product.category?.trim(),
      brand: product.brand?.trim(),
      manufacturer: product.manufacturer?.trim(),
      manufacturerSku: product.manufacturerSku?.trim(),
      ean: product.ean?.trim(),
      normalizedName: product.normalizedName?.trim() || product.name.trim(),
      salesUnit: product.salesUnit || product.unit,
      baseUnit: product.baseUnit || product.unit,
      purchasePrice: product.defaultCostPrice ?? product.purchasePrice ?? 0,
      defaultCostPrice: product.defaultCostPrice ?? product.purchasePrice ?? 0,
      defaultSalePrice: product.defaultSalePrice ?? product.purchasePrice ?? 0,
      defaultSalesMarginPercent:
        product.defaultSalesMarginPercent ?? product.defaultMarginPercent ?? 0,
      defaultInstallationPrice:
        product.defaultInstallationPrice ?? product.defaultInstallPrice ?? 0,
      defaultMarginPercent:
        product.defaultMarginPercent ?? product.defaultSalesMarginPercent ?? 0,
      defaultInstallPrice:
        product.defaultInstallPrice ?? product.defaultInstallationPrice ?? 0,
      active: product.active ?? product.isActive ?? true,
      isActive: product.active ?? product.isActive ?? true,
      searchableText:
        product.searchableText ||
        [
          code,
          internalCode,
          product.name,
          product.description,
          product.category,
          product.brand,
          product.manufacturer,
          product.ean,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      ...buildAudit(currentUserId),
    };

    setProducts((current = []) => [...current, newProduct]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata tuotteita.');
    }

    setProducts((current = []) =>
      current.map((product) => {
        if (product.id !== id) {
          return product;
        }

        const code = updates.code?.trim() || updates.internalCode?.trim() || product.code;
        const internalCode = updates.internalCode?.trim() || updates.code?.trim() || product.internalCode || code;
        const name = updates.name?.trim() || product.name;
        const description = updates.description !== undefined ? updates.description?.trim() : product.description;
        const category = updates.category !== undefined ? updates.category?.trim() : product.category;
        const brand = updates.brand !== undefined ? updates.brand?.trim() : product.brand;
        const manufacturer =
          updates.manufacturer !== undefined ? updates.manufacturer?.trim() : product.manufacturer;
        const manufacturerSku =
          updates.manufacturerSku !== undefined
            ? updates.manufacturerSku?.trim()
            : product.manufacturerSku;
        const ean = updates.ean !== undefined ? updates.ean?.trim() : product.ean;
        const purchasePrice = updates.defaultCostPrice ?? updates.purchasePrice ?? product.purchasePrice;
        const defaultSalePrice = updates.defaultSalePrice ?? product.defaultSalePrice ?? purchasePrice;
        const defaultMarginPercent =
          updates.defaultMarginPercent ??
          updates.defaultSalesMarginPercent ??
          product.defaultMarginPercent ??
          product.defaultSalesMarginPercent ??
          0;
        const defaultInstallationPrice =
          updates.defaultInstallPrice ??
          updates.defaultInstallationPrice ??
          product.defaultInstallPrice ??
          product.defaultInstallationPrice ??
          0;
        const active = updates.active ?? updates.isActive ?? product.active ?? product.isActive ?? true;

        return {
          ...product,
          ...updates,
          code,
          internalCode,
          name,
          description,
          category,
          brand,
          manufacturer,
          manufacturerSku,
          ean,
          salesUnit: updates.salesUnit || updates.unit || product.salesUnit || product.unit,
          baseUnit: updates.baseUnit || updates.unit || product.baseUnit || product.unit,
          purchasePrice,
          defaultCostPrice: updates.defaultCostPrice ?? purchasePrice,
          defaultSalePrice,
          defaultSalesMarginPercent: defaultMarginPercent,
          defaultMarginPercent,
          defaultInstallationPrice,
          defaultInstallPrice: defaultInstallationPrice,
          active,
          isActive: active,
          normalizedName: updates.normalizedName?.trim() || name,
          searchableText:
            updates.searchableText ||
            [code, internalCode, name, description, category, brand, manufacturer, ean]
              .filter(Boolean)
              .join(' ')
              .toLowerCase(),
          updatedAt: nowIso(),
          updatedByUserId: currentUserId,
        };
      })
    );
  };

  const deleteProduct = (id: string) => {
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa tuotteita.');
    }
    setProducts((current = []) => current.filter((product) => product.id !== id));
  };

  const getProduct = (id: string) => orderedProducts.find((item) => item.id === id);

  return { products: orderedProducts, addProduct, updateProduct, deleteProduct, getProduct };
}

export function useInstallationGroups() {
  const [groups = [], setGroups] = useKV<InstallationGroup[]>('installation-groups', []);
  const { user, canManageSharedData } = useAuth();

  const addGroup = (group: Omit<InstallationGroup, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi lisätä hintaryhmiä.');
    }
    const newGroup: InstallationGroup = {
      ...group,
      id: crypto.randomUUID(),
      ...buildAudit(user?.id),
    };
    setGroups((current = []) => [...current, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, updates: Partial<InstallationGroup>) => {
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi muokata hintaryhmiä.');
    }
    setGroups((current = []) =>
      current.map((group) =>
        group.id === id
          ? { ...group, ...updates, updatedAt: nowIso(), updatedByUserId: user?.id }
          : group
      )
    );
  };

  const deleteGroup = (id: string) => {
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi poistaa hintaryhmiä.');
    }
    setGroups((current = []) => current.filter((group) => group.id !== id));
  };

  return { groups, addGroup, updateGroup, deleteGroup };
}

export function useInstallationGroupCategorySettings() {
  const [storedSettings = DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS, setSettings] = useKV<InstallationGroupCategorySettings>(
    'installation-group-category-settings',
    DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS
  );

  const settings = useMemo(
    () => ({
      ...DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS,
      ...storedSettings,
      preferences: [...(storedSettings.preferences ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    }),
    [storedSettings]
  );

  const updateSettings = (
    updates:
      | Partial<InstallationGroupCategorySettings>
      | ((current: InstallationGroupCategorySettings) => InstallationGroupCategorySettings)
  ) => {
    setSettings((current = DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS) => {
      const normalizedCurrent: InstallationGroupCategorySettings = {
        ...DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS,
        ...current,
        preferences: [...(current.preferences ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
      };

      const nextSettings =
        typeof updates === 'function'
          ? updates(normalizedCurrent)
          : {
              ...normalizedCurrent,
              ...updates,
            };

      return {
        ...DEFAULT_INSTALLATION_GROUP_CATEGORY_SETTINGS,
        ...nextSettings,
        preferences: [...(nextSettings.preferences ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
      };
    });
  };

  return { settings, updateSettings };
}

export function useSubstituteProducts() {
  const [substitutes = [], setSubstitutes] = useKV<SubstituteProduct[]>('substitute-products', []);
  const { user, canDelete, canEdit } = useAuth();

  const addSubstitute = (substitute: Omit<SubstituteProduct, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä korvaavia tuotteita.');
    }
    const newSubstitute: SubstituteProduct = {
      ...substitute,
      id: crypto.randomUUID(),
      ...buildAudit(user?.id),
    };
    setSubstitutes((current = []) => [...current, newSubstitute]);
    return newSubstitute;
  };

  const deleteSubstitute = (id: string) => {
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa korvaavia tuotteita.');
    }
    setSubstitutes((current = []) => current.filter((substitute) => substitute.id !== id));
  };

  const getSubstitutesForProduct = (productId: string) =>
    substitutes.filter((substitute) => substitute.originalProductId === productId);

  return { substitutes, addSubstitute, deleteSubstitute, getSubstitutesForProduct };
}

export function useStarterWorkspaceTemplate() {
  const { user, canEdit } = useAuth();
  const { settings } = useSettings();
  const [customers = [], setCustomers, customersReady] = useKV<Customer[]>('customers', []);
  const [projects = [], setProjects, projectsReady] = useKV<Project[]>('projects', []);
  const [quotes = [], setQuotes, quotesReady] = useKV<Quote[]>('quotes', []);
  const [rows = [], setRows, rowsReady] = useKV<QuoteRow[]>('quote-rows', []);
  const [bootstrapState = null, setBootstrapState, bootstrapReady] = useKV<StarterWorkspaceState | null>(
    'starter-workspace-state',
    null
  );
  const [seededTemplate, setSeededTemplate] = useState<StarterWorkspaceSeedResult | null>(null);
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    handledUserIdRef.current = null;
    setSeededTemplate(null);
  }, [user?.id]);

  useEffect(() => {
    const currentUserId = user?.id;
    if (!currentUserId || !canEdit) {
      return;
    }

    if (!customersReady || !projectsReady || !quotesReady || !rowsReady || !bootstrapReady) {
      return;
    }

    if (handledUserIdRef.current === currentUserId) {
      return;
    }

    handledUserIdRef.current = currentUserId;

    if (bootstrapState?.version === STARTER_WORKSPACE_VERSION) {
      return;
    }

    if (customers.length > 0 || projects.length > 0 || quotes.length > 0 || rows.length > 0) {
      setBootstrapState({
        version: STARTER_WORKSPACE_VERSION,
        status: 'skipped',
        handledAt: nowIso(),
      });
      return;
    }

    const template = createStarterWorkspaceTemplate(currentUserId, settings);
    setCustomers(template.customers);
    setProjects(template.projects);
    setQuotes(template.quotes);
    setRows(template.rows);
    setBootstrapState({
      version: STARTER_WORKSPACE_VERSION,
      status: 'seeded',
      handledAt: nowIso(),
      templateIds: template.ids,
    });
    setSeededTemplate(template.ids);
  }, [
    bootstrapReady,
    bootstrapState?.version,
    canEdit,
    customers.length,
    customersReady,
    projects.length,
    projectsReady,
    quotes.length,
    quotesReady,
    rows.length,
    rowsReady,
    setBootstrapState,
    setCustomers,
    setProjects,
    setQuotes,
    setRows,
    settings,
    user?.id,
  ]);

  return seededTemplate;
}

export function useCustomers() {
  const { user, users, canDelete, canEdit, canManageUsers } = useAuth();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [customersByUserId, setCustomersForUser, customersLoaded] = useUserScopedKVMany<Customer[]>(
    'customers',
    [],
    visibleUserIds
  );

  const customers = useMemo(() => {
    if (!userId) {
      return [];
    }

    return flattenUserScopedValues(visibleUserIds, customersByUserId);
  }, [customersByUserId, userId, visibleUserIds]);

  const addCustomer = (customer: Omit<Customer, 'id' | keyof ReturnType<typeof buildOwnedAudit>>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä asiakkaita.');
    }
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      ...buildOwnedAudit(currentUserId),
    };
    setCustomersForUser(currentUserId, (current = []) => [...current, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata asiakkaita.');
    }
    const targetCustomer = customers.find((customer) => customer.id === id);
    if (!targetCustomer || (!canManageUsers && targetCustomer.ownerUserId !== currentUserId)) {
      return;
    }

    setCustomersForUser(targetCustomer.ownerUserId, (current = []) =>
      current.map((customer) =>
        customer.id === id
          ? { ...customer, ...updates, updatedAt: nowIso(), updatedByUserId: currentUserId }
          : customer
      )
    );
  };

  const deleteCustomer = (id: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa asiakkaita.');
    }

    const targetCustomer = customers.find((customer) => customer.id === id);
    if (!targetCustomer || (!canManageUsers && targetCustomer.ownerUserId !== currentUserId)) {
      return;
    }

    setCustomersForUser(targetCustomer.ownerUserId, (current = []) =>
      current.filter((customer) => customer.id !== id)
    );
  };

  const getCustomer = (id: string) => customers.find((customer) => customer.id === id);

  return { customers, customersLoaded, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}

export function useProjects() {
  const { user, users, canDelete, canEdit, canManageUsers } = useAuth();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [projectsByUserId, setProjectsForUser, projectsLoaded] = useUserScopedKVMany<Project[]>(
    'projects',
    [],
    visibleUserIds
  );

  const projects = useMemo(() => {
    if (!userId) {
      return [];
    }

    return flattenUserScopedValues(visibleUserIds, projectsByUserId);
  }, [projectsByUserId, userId, visibleUserIds]);

  const addProject = (project: Omit<Project, 'id' | keyof ReturnType<typeof buildOwnedAudit>>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä projekteja.');
    }
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      ...buildOwnedAudit(currentUserId),
    };
    setProjectsForUser(currentUserId, (current = []) => [...current, newProject]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata projekteja.');
    }
    const targetProject = projects.find((project) => project.id === id);
    if (!targetProject || (!canManageUsers && targetProject.ownerUserId !== currentUserId)) {
      return;
    }

    setProjectsForUser(targetProject.ownerUserId, (current = []) =>
      current.map((project) =>
        project.id === id
          ? { ...project, ...updates, updatedAt: nowIso(), updatedByUserId: currentUserId }
          : project
      )
    );
  };

  const deleteProject = (id: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa projekteja.');
    }

    const targetProject = projects.find((project) => project.id === id);
    if (!targetProject || (!canManageUsers && targetProject.ownerUserId !== currentUserId)) {
      return;
    }

    setProjectsForUser(targetProject.ownerUserId, (current = []) =>
      current.filter((project) => project.id !== id)
    );
  };

  const getProject = (id: string) => projects.find((project) => project.id === id);
  const getProjectsForCustomer = (customerId: string) =>
    projects.filter((project) => project.customerId === customerId);

  return { projects, projectsLoaded, addProject, updateProject, deleteProject, getProject, getProjectsForCustomer };
}

export function useQuotes() {
  const { user, users, canDelete, canEdit, canManageUsers } = useAuth();
  const { settings } = useSettings();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [quotesByUserId, setQuotesForUser, quotesLoaded] = useUserScopedKVMany<Quote[]>(
    'quotes',
    [],
    visibleUserIds
  );

  const quotes = useMemo(() => {
    if (!userId) {
      return [];
    }

    return flattenUserScopedValues(visibleUserIds, quotesByUserId);
  }, [quotesByUserId, userId, visibleUserIds]);

  const addQuote = (quote: QuoteCreateInput) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä tarjouksia.');
    }
    const now = nowIso();
    const validUntil = quote.validUntil ?? (() => {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (settings.defaultValidityDays || 30));
      return nextDate.toISOString().slice(0, 10);
    })();
    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      title: quote.title?.trim() || 'Uusi tarjous',
      quoteNumber: quote.quoteNumber || generateQuoteNumber(settings.quoteNumberPrefix),
      revisionNumber: quote.revisionNumber ?? 1,
      status: quote.status ?? 'draft',
      vatPercent: quote.vatPercent ?? settings.defaultVatPercent,
      discountType: quote.discountType ?? 'none',
      discountValue: quote.discountValue ?? 0,
      projectCosts: quote.projectCosts ?? 0,
      deliveryCosts: quote.deliveryCosts ?? 0,
      installationCosts: quote.installationCosts ?? 0,
      travelKilometers: quote.travelKilometers ?? 0,
      travelRatePerKm: quote.travelRatePerKm ?? 0,
      disposalCosts: quote.disposalCosts ?? 0,
      demolitionCosts: quote.demolitionCosts ?? 0,
      protectionCosts: quote.protectionCosts ?? 0,
      permitCosts: quote.permitCosts ?? 0,
      selectedMarginPercent: quote.selectedMarginPercent ?? settings.defaultMarginPercent,
      pricingMode: quote.pricingMode ?? 'margin',
      validUntil,
      ...buildOwnedAudit(currentUserId),
      lastAutoSavedAt: now,
    };
    setQuotesForUser(currentUserId, (current = []) => [...current, newQuote]);
    return newQuote;
  };

  const updateQuote = (id: string, updates: Partial<Quote>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata tarjouksia.');
    }
    const targetQuote = quotes.find((quote) => quote.id === id);
    if (!targetQuote || (!canManageUsers && targetQuote.ownerUserId !== currentUserId)) {
      return;
    }

    setQuotesForUser(targetQuote.ownerUserId, (current = []) =>
      current.map((quote) =>
        quote.id === id
          ? {
              ...quote,
              ...updates,
              updatedAt: nowIso(),
              updatedByUserId: currentUserId,
              lastAutoSavedAt: nowIso(),
            }
          : quote
      )
    );
  };

  const updateQuoteStatus = (id: string, status: QuoteStatus) => {
    const timestamp = nowIso();
    updateQuote(id, {
      status,
      sentAt: status === 'sent' ? timestamp : undefined,
      acceptedAt: status === 'accepted' ? timestamp : undefined,
      rejectedAt: status === 'rejected' ? timestamp : undefined,
    });
  };

  const deleteQuote = (id: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa tarjouksia.');
    }

    const targetQuote = quotes.find((quote) => quote.id === id);
    if (!targetQuote || (!canManageUsers && targetQuote.ownerUserId !== currentUserId)) {
      return;
    }

    setQuotesForUser(targetQuote.ownerUserId, (current = []) =>
      current.filter((quote) => quote.id !== id)
    );
  };

  const getQuote = (id: string) => quotes.find((quote) => quote.id === id);
  const getQuotesForProject = (projectId: string) => quotes.filter((quote) => quote.projectId === projectId);

  const hasNewerRevision = (quote: Quote) => {
    const parentId = quote.parentQuoteId || quote.id;
    return quotes.some(
      (candidate) =>
        (candidate.parentQuoteId === parentId || candidate.id === parentId) &&
        candidate.revisionNumber > quote.revisionNumber
    );
  };

  return {
    quotes,
    quotesLoaded,
    addQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    getQuote,
    getQuotesForProject,
    hasNewerRevision,
  };
}

export function useQuoteRows() {
  const { user, users, canDelete, canEdit, canManageUsers } = useAuth();
  const { quotes } = useQuotes();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [rowsByUserId, setRowsForUser] = useUserScopedKVMany<QuoteRow[]>('quote-rows', [], visibleUserIds);

  const visibleQuoteIds = useMemo(() => new Set(quotes.map((quote) => quote.id)), [quotes]);
  const rows = useMemo(() => {
    if (!userId) {
      return [];
    }

    const allRows = flattenUserScopedValues(visibleUserIds, rowsByUserId);
    if (canManageUsers) {
      return allRows;
    }

    return allRows.filter((row) => row.ownerUserId === userId || visibleQuoteIds.has(row.quoteId));
  }, [canManageUsers, rowsByUserId, userId, visibleQuoteIds, visibleUserIds]);

  const addRow = (row: Omit<QuoteRow, 'id' | keyof ReturnType<typeof buildOwnedAudit>>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia lisätä tarjousrivejä.');
    }
    const newRow: QuoteRow = {
      ...row,
      id: crypto.randomUUID(),
      source: row.source ?? 'manual',
      ...buildOwnedAudit(currentUserId),
    };
    setRowsForUser(currentUserId, (current = []) => [...current, newRow]);
    return newRow;
  };

  const updateRow = (id: string, updates: Partial<QuoteRow>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata tarjousrivejä.');
    }
    const targetRow = rows.find((row) => row.id === id);
    if (!targetRow || (!canManageUsers && targetRow.ownerUserId !== currentUserId)) {
      return;
    }

    setRowsForUser(targetRow.ownerUserId, (current = []) =>
      current.map((row) =>
        row.id === id
          ? { ...row, ...updates, updatedAt: nowIso(), updatedByUserId: currentUserId }
          : row
      )
    );
  };

  const deleteRow = (id: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa tarjousrivejä.');
    }

    const targetRow = rows.find((row) => row.id === id);
    if (!targetRow || (!canManageUsers && targetRow.ownerUserId !== currentUserId)) {
      return;
    }

    setRowsForUser(targetRow.ownerUserId, (current = []) => current.filter((row) => row.id !== id));
  };

  const deleteRows = (ids: string[]) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa tarjousrivejä.');
    }

    const idSet = new Set(ids);
    const targetRows = rows.filter(
      (row) => idSet.has(row.id) && (canManageUsers || row.ownerUserId === currentUserId)
    );
    const idsByOwner = new Map<string, Set<string>>();

    targetRows.forEach((row) => {
      const ownerIds = idsByOwner.get(row.ownerUserId) ?? new Set<string>();
      ownerIds.add(row.id);
      idsByOwner.set(row.ownerUserId, ownerIds);
    });

    idsByOwner.forEach((ownedIds, ownerUserId) => {
      setRowsForUser(ownerUserId, (current = []) => current.filter((row) => !ownedIds.has(row.id)));
    });
  };

  const deleteRowsForQuote = (quoteId: string) => {
    const currentUserId = ensureSignedIn(userId);
    const targetRows = rows.filter(
      (row) => row.quoteId === quoteId && (canManageUsers || row.ownerUserId === currentUserId)
    );
    const idsByOwner = new Map<string, Set<string>>();

    targetRows.forEach((row) => {
      const ownerIds = idsByOwner.get(row.ownerUserId) ?? new Set<string>();
      ownerIds.add(row.id);
      idsByOwner.set(row.ownerUserId, ownerIds);
    });

    idsByOwner.forEach((ownedIds, ownerUserId) => {
      setRowsForUser(ownerUserId, (current = []) => current.filter((row) => !ownedIds.has(row.id)));
    });
  };

  const getRowsForQuote = (quoteId: string) =>
    rows.filter((row) => row.quoteId === quoteId).sort((left, right) => left.sortOrder - right.sortOrder);

  return { rows, addRow, updateRow, deleteRow, deleteRows, deleteRowsForQuote, getRowsForQuote };
}

export function useQuoteTerms() {
  const [storedTemplates = [], setStoredTemplates] = useKV<QuoteTerms[]>('term-templates', []);
  const { user, users, canManageUsers, canManageSharedData } = useAuth();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [quotesByUserId] = useUserScopedKVMany<Quote[]>('quotes', [], visibleUserIds);
  const allVisibleQuotes = useMemo(
    () => flattenUserScopedValues(visibleUserIds, quotesByUserId),
    [quotesByUserId, visibleUserIds]
  );

  const ownTemplates = useMemo(
    () => hydrateStoredTermTemplates(storedTemplates, userId),
    [storedTemplates, userId]
  );

  const terms = useMemo(
    () => listTermTemplates(storedTemplates, userId),
    [storedTemplates, userId]
  );

  const activeTerms = useMemo(
    () => terms.filter((template) => template.isActive),
    [terms]
  );

  const addTerms = (input: Parameters<typeof createTermTemplate>[1]) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi lisätä ehtopohjia.');
    }
    const result = createTermTemplate(storedTemplates, input, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const updateTerms = (id: string, updates: Parameters<typeof updateTermTemplate>[2]) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi muokata ehtopohjia.');
    }
    const result = updateTermTemplate(storedTemplates, id, updates, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const cloneTermsFromMaster = (masterId: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi luoda ehtopohjia.');
    }
    const result = cloneTermTemplateFromMaster(storedTemplates, masterId, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const duplicateTerms = (templateId: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi monistaa ehtopohjia.');
    }
    const result = duplicateTermTemplate(storedTemplates, templateId, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const restoreTermsFromMaster = (templateId: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi palauttaa ehtopohjia.');
    }
    const result = restoreTermTemplateFromMaster(storedTemplates, templateId, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const archiveTerms = (templateId: string, archived = true) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi arkistoida ehtopohjia.');
    }
    const result = setTermTemplateArchived(storedTemplates, templateId, archived, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const deleteTerms = (templateId: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi poistaa ehtopohjia.');
    }
    if (allVisibleQuotes.some((quote) => quote.termsId === templateId)) {
      throw new Error('Ehtopohja on valittuna tarjoukselle. Poista ehtopohja tarjoukselta ennen poistamista.');
    }

    const result = deleteTermTemplate(storedTemplates, templateId, currentUserId);
    setStoredTemplates(result.templates);
    return result.template;
  };

  const getDefaultTerms = () => getDefaultTermTemplate(activeTerms);
  const getTermById = (id: string) => terms.find((template) => template.id === id);

  return {
    terms,
    activeTerms,
    ownTemplates,
    addTerms,
    updateTerms,
    cloneTermsFromMaster,
    duplicateTerms,
    restoreTermsFromMaster,
    archiveTerms,
    deleteTerms,
    getDefaultTerms,
    getTermById,
    createQuoteTermsSnapshot,
  };
}

export function useInvoices() {
  const { user, users, canDelete, canEdit, canManageUsers } = useAuth();
  const { documentSettings, companyProfile } = useDocumentSettings();
  const userId = user?.id;
  const visibleUserIds = useMemo(
    () => getVisibleUserIds(users, userId, canManageUsers),
    [canManageUsers, userId, users]
  );
  const [invoicesByUserId, setInvoicesForUser] = useUserScopedKVMany<Invoice[]>(
    'invoices',
    [],
    visibleUserIds
  );

  const invoices = useMemo(() => {
    if (!userId) {
      return [];
    }

    return flattenUserScopedValues(visibleUserIds, invoicesByUserId);
  }, [invoicesByUserId, userId, visibleUserIds]);

  const orderedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (left, right) =>
          new Date(right.issueDate || right.createdAt).getTime() - new Date(left.issueDate || left.createdAt).getTime() ||
          right.invoiceNumber.localeCompare(left.invoiceNumber, 'fi')
      ),
    [invoices]
  );

  const createInvoiceFromQuote = (
    quote: Parameters<typeof createInvoiceSnapshotFromQuote>[0]['quote'],
    rows: Parameters<typeof createInvoiceSnapshotFromQuote>[0]['rows'],
    customer: Parameters<typeof createInvoiceSnapshotFromQuote>[0]['customer'],
    project: Parameters<typeof createInvoiceSnapshotFromQuote>[0]['project']
  ) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia luoda laskuja.');
    }
    if (orderedInvoices.some((invoice) => invoice.sourceQuoteId === quote.id && invoice.status !== 'cancelled')) {
      throw new Error('Tarjouksesta on jo olemassa lasku.');
    }

    const snapshot = createInvoiceSnapshotFromQuote({
      quote,
      rows,
      customer,
      project,
      settings: documentSettings,
      companyProfile,
    });

    const newInvoice: Invoice = {
      ...snapshot,
      id: crypto.randomUUID(),
      ...buildOwnedAudit(currentUserId),
      lastAutoSavedAt: nowIso(),
    };

    setInvoicesForUser(currentUserId, (current = []) => [...current, newInvoice]);
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata laskuja.');
    }

    const targetInvoice = orderedInvoices.find((invoice) => invoice.id === id);
    if (!targetInvoice || (!canManageUsers && targetInvoice.ownerUserId !== currentUserId)) {
      return;
    }

    setInvoicesForUser(targetInvoice.ownerUserId, (current = []) =>
      current.map((invoice) =>
        invoice.id === id
          ? {
              ...invoice,
              ...updates,
              updatedAt: nowIso(),
              updatedByUserId: currentUserId,
              lastAutoSavedAt: nowIso(),
            }
          : invoice
      )
    );
  };

  const updateInvoiceStatus = (id: string, status: Invoice['status']) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata laskuja.');
    }

    const timestamp = nowIso();
    const targetInvoice = orderedInvoices.find((invoice) => invoice.id === id);
    if (!targetInvoice || (!canManageUsers && targetInvoice.ownerUserId !== currentUserId)) {
      return;
    }

    setInvoicesForUser(targetInvoice.ownerUserId, (current = []) =>
      current.map((invoice) => {
        if (invoice.id !== id) {
          return invoice;
        }

        return {
          ...invoice,
          status,
          issuedAt:
            status === 'issued' || status === 'paid'
              ? invoice.issuedAt || timestamp
              : invoice.issuedAt,
          paidAt: status === 'paid' ? timestamp : undefined,
          cancelledAt: status === 'cancelled' ? timestamp : undefined,
          updatedAt: timestamp,
          updatedByUserId: currentUserId,
          lastAutoSavedAt: timestamp,
        };
      })
    );
  };

  const deleteInvoice = (id: string) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa laskuja.');
    }

    const targetInvoice = orderedInvoices.find((invoice) => invoice.id === id);
    if (!targetInvoice || (!canManageUsers && targetInvoice.ownerUserId !== currentUserId)) {
      return;
    }

    setInvoicesForUser(targetInvoice.ownerUserId, (current = []) =>
      current.filter((invoice) => invoice.id !== id)
    );
  };

  const getInvoice = (id: string) => orderedInvoices.find((invoice) => invoice.id === id);
  const getInvoicesForProject = (projectId: string) =>
    orderedInvoices.filter((invoice) => invoice.projectId === projectId);
  const getInvoicesForQuote = (quoteId: string) =>
    orderedInvoices.filter((invoice) => invoice.sourceQuoteId === quoteId);

  return {
    invoices: orderedInvoices,
    createInvoiceFromQuote,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    getInvoice,
    getInvoicesForProject,
    getInvoicesForQuote,
  };
}

export function useCompanyProfile() {
  const [storedCompanyProfile = DEFAULT_COMPANY_PROFILE, setCompanyProfile] = useKV<CompanyProfile>(
    'company-profile',
    DEFAULT_COMPANY_PROFILE
  );
  const { user, canManageSharedData } = useAuth();
  const companyProfile = useMemo(
    () => normalizeCompanyProfile(storedCompanyProfile),
    [storedCompanyProfile]
  );

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    ensureSignedIn(user?.id);
    if (!canManageSharedData) {
      throw new Error('Yritystietoja voi muokata vain omistaja tai pääkäyttäjä.');
    }
    setCompanyProfile((current = DEFAULT_COMPANY_PROFILE) =>
      normalizeCompanyProfile({
        ...current,
        ...updates,
      })
    );
  };

  return { companyProfile, updateCompanyProfile, companyProfileUpdatedBy: user?.id };
}

export function useDocumentSettings() {
  const { user, canManageSharedData } = useAuth();
  const { settings } = useSettings();
  const { companyProfile } = useCompanyProfile();
  const documentSettings = useMemo(
    () =>
      mergeDocumentSettings(settings, companyProfile, {
        fallbackEmail: user?.email,
        allowSharedContactFallback: canManageSharedData,
      }),
    [canManageSharedData, companyProfile, settings, user?.email]
  );

  return { sharedSettings: settings, documentSettings, companyProfile };
}

export function useSettings() {
  const [storedSettings = DEFAULT_SETTINGS, setSettings] = useKV<Settings>('settings', DEFAULT_SETTINGS);
  const { user, canManageSharedData } = useAuth();
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...storedSettings }), [storedSettings]);

  const updateSettings = (updates: Partial<Settings>) => {
    if (!canManageSharedData) {
      throw new Error('Vain omistaja tai pääkäyttäjä voi muokata asetuksia.');
    }
    setSettings((current = DEFAULT_SETTINGS) => ({
      ...DEFAULT_SETTINGS,
      ...current,
      ...updates,
      companyName: updates.companyName ?? current.companyName,
    }));
  };

  return { settings, updateSettings, settingsUpdatedBy: user?.id };
}
