import { useMemo } from 'react';
import { useKV } from './use-kv';
import { useCatalog } from './use-catalog';
import { mapCatalogProductToLegacyProduct } from '../lib/catalog';
import {
  Product,
  InstallationGroup,
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

type OwnedAuditKeys = 'id' | keyof ReturnType<typeof buildOwnedAudit>;
type QuoteCreateInput = Pick<Quote, 'projectId'> & Partial<Omit<Quote, OwnedAuditKeys | 'projectId'>>;

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

function generateQuoteNumber(prefix: string = 'TAR') {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${parts}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function useProducts() {
  const catalog = useCatalog();
  const { canManageSharedData } = useAuth();
  const [legacyProducts = []] = useKV<Product[]>('products', []);

  const products = useMemo(
    () =>
      catalog.products
        .filter((product) => product.active && !product.archivedAt)
        .map((product) =>
          mapCatalogProductToLegacyProduct(product, {
            categories: catalog.categories,
            productSources: catalog.productSources,
          })
        ),
    [catalog.categories, catalog.productSources, catalog.products]
  );

  const addProduct = (product: Omit<Product, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi lisätä tuotteita.');
    }
    const nextProduct = catalog.saveCatalogProduct({
      name: product.name,
      internalCode: product.internalCode || product.code,
      description: product.description,
      brand: product.brand,
      manufacturer: product.manufacturer,
      manufacturerSku: product.manufacturerSku,
      ean: product.ean,
      normalizedName: product.normalizedName || product.name,
      packageSize: product.packageSize,
      packageUnit: product.packageUnit,
      unit: product.unit,
      salesUnit: product.salesUnit || product.unit,
      baseUnit: product.baseUnit || product.unit,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      defaultCostPrice: product.defaultCostPrice ?? product.purchasePrice,
      defaultSalePrice: product.defaultSalePrice,
      defaultMarginPercent: product.defaultMarginPercent ?? product.defaultSalesMarginPercent,
      defaultInstallPrice: product.defaultInstallPrice ?? product.defaultInstallationPrice ?? 0,
      installationGroupId: product.installationGroupId,
      active: product.active ?? product.isActive ?? true,
    });
    return mapCatalogProductToLegacyProduct(nextProduct, {
      categories: catalog.categories,
      productSources: catalog.productSources,
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi muokata tuotteita.');
    }
    catalog.updateCatalogProduct(id, {
      name: updates.name,
      normalizedName: updates.normalizedName,
      description: updates.description,
      brand: updates.brand,
      manufacturer: updates.manufacturer,
      manufacturerSku: updates.manufacturerSku,
      ean: updates.ean,
      packageSize: updates.packageSize,
      packageUnit: updates.packageUnit,
      unit: updates.unit,
      salesUnit: updates.salesUnit,
      baseUnit: updates.baseUnit,
      categoryId: updates.categoryId,
      subcategoryId: updates.subcategoryId,
      defaultCostPrice: updates.defaultCostPrice ?? updates.purchasePrice,
      defaultSalePrice: updates.defaultSalePrice,
      defaultMarginPercent: updates.defaultMarginPercent ?? updates.defaultSalesMarginPercent,
      defaultInstallPrice: updates.defaultInstallPrice ?? updates.defaultInstallationPrice,
      installationGroupId: updates.installationGroupId,
      active: updates.active ?? updates.isActive,
      searchableText: updates.searchableText,
    });
  };

  const deleteProduct = (id: string) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi poistaa tuotteita.');
    }
    catalog.archiveCatalogProduct(id);
  };

  const getProduct = (id: string) => {
    const product = catalog.getProductById(id);
    if (product) {
      return mapCatalogProductToLegacyProduct(product, {
        categories: catalog.categories,
        productSources: catalog.productSources,
      });
    }
    return legacyProducts.find((item) => item.id === id);
  };

  return { products, addProduct, updateProduct, deleteProduct, getProduct };
}

export function useInstallationGroups() {
  const [groups = [], setGroups] = useKV<InstallationGroup[]>('installation-groups', []);
  const { user, canManageSharedData } = useAuth();

  const addGroup = (group: Omit<InstallationGroup, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi lisätä hintaryhmiä.');
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
      throw new Error('Vain admin voi muokata hintaryhmiä.');
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
      throw new Error('Vain admin voi poistaa hintaryhmiä.');
    }
    setGroups((current = []) => current.filter((group) => group.id !== id));
  };

  return { groups, addGroup, updateGroup, deleteGroup };
}

export function useSubstituteProducts() {
  const [substitutes = [], setSubstitutes] = useKV<SubstituteProduct[]>('substitute-products', []);
  const { user, canManageSharedData } = useAuth();

  const addSubstitute = (substitute: Omit<SubstituteProduct, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi lisätä korvaavia tuotteita.');
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
    if (!canManageSharedData) {
      throw new Error('Vain admin voi poistaa korvaavia tuotteita.');
    }
    setSubstitutes((current = []) => current.filter((substitute) => substitute.id !== id));
  };

  const getSubstitutesForProduct = (productId: string) =>
    substitutes.filter((substitute) => substitute.originalProductId === productId);

  return { substitutes, addSubstitute, deleteSubstitute, getSubstitutesForProduct };
}

export function useCustomers() {
  const [allCustomers = [], setCustomers] = useKV<Customer[]>('customers', []);
  const { user, canDelete, canEdit, canManageUsers } = useAuth();
  const userId = user?.id;

  const customers = useMemo(() => {
    if (!userId) return [];
    if (canManageUsers) return allCustomers;
    return allCustomers.filter((customer) => customer.ownerUserId === userId);
  }, [allCustomers, canManageUsers, userId]);

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
    setCustomers((current = []) => [...current, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata asiakkaita.');
    }
    setCustomers((current = []) =>
      current.map((customer) =>
        customer.id === id && (canManageUsers || customer.ownerUserId === currentUserId)
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
    setCustomers((current = []) =>
      current.filter(
        (customer) => customer.id !== id || (!canManageUsers && customer.ownerUserId !== currentUserId)
      )
    );
  };

  const getCustomer = (id: string) => customers.find((customer) => customer.id === id);

  return { customers, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}

export function useProjects() {
  const [allProjects = [], setProjects] = useKV<Project[]>('projects', []);
  const { user, canDelete, canEdit, canManageUsers } = useAuth();
  const userId = user?.id;

  const projects = useMemo(() => {
    if (!userId) return [];
    if (canManageUsers) return allProjects;
    return allProjects.filter((project) => project.ownerUserId === userId);
  }, [allProjects, canManageUsers, userId]);

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
    setProjects((current = []) => [...current, newProject]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata projekteja.');
    }
    setProjects((current = []) =>
      current.map((project) =>
        project.id === id && (canManageUsers || project.ownerUserId === currentUserId)
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
    setProjects((current = []) =>
      current.filter(
        (project) => project.id !== id || (!canManageUsers && project.ownerUserId !== currentUserId)
      )
    );
  };

  const getProject = (id: string) => projects.find((project) => project.id === id);
  const getProjectsForCustomer = (customerId: string) =>
    projects.filter((project) => project.customerId === customerId);

  return { projects, addProject, updateProject, deleteProject, getProject, getProjectsForCustomer };
}

export function useQuotes() {
  const [allQuotes = [], setQuotes] = useKV<Quote[]>('quotes', []);
  const { user, canDelete, canEdit, canManageUsers } = useAuth();
  const { settings } = useSettings();
  const userId = user?.id;

  const quotes = useMemo(() => {
    if (!userId) return [];
    if (canManageUsers) return allQuotes;
    return allQuotes.filter((quote) => quote.ownerUserId === userId);
  }, [allQuotes, canManageUsers, userId]);

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
      selectedMarginPercent: quote.selectedMarginPercent ?? settings.defaultMarginPercent,
      pricingMode: quote.pricingMode ?? 'margin',
      validUntil,
      ...buildOwnedAudit(currentUserId),
      lastAutoSavedAt: now,
    };
    setQuotes((current = []) => [...current, newQuote]);
    return newQuote;
  };

  const updateQuote = (id: string, updates: Partial<Quote>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata tarjouksia.');
    }
    setQuotes((current = []) =>
      current.map((quote) =>
        quote.id === id && (canManageUsers || quote.ownerUserId === currentUserId)
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
    setQuotes((current = []) =>
      current.filter(
        (quote) => quote.id !== id || (!canManageUsers && quote.ownerUserId !== currentUserId)
      )
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
  const [allRows = [], setRows] = useKV<QuoteRow[]>('quote-rows', []);
  const { user, canDelete, canEdit, canManageUsers } = useAuth();
  const { quotes } = useQuotes();
  const userId = user?.id;

  const visibleQuoteIds = useMemo(() => new Set(quotes.map((quote) => quote.id)), [quotes]);
  const rows = useMemo(() => {
    if (!userId) return [];
    if (canManageUsers) return allRows;
    return allRows.filter((row) => row.ownerUserId === userId || visibleQuoteIds.has(row.quoteId));
  }, [allRows, canManageUsers, userId, visibleQuoteIds]);

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
    setRows((current = []) => [...current, newRow]);
    return newRow;
  };

  const updateRow = (id: string, updates: Partial<QuoteRow>) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canEdit) {
      throw new Error('Sinulla ei ole oikeuksia muokata tarjousrivejä.');
    }
    setRows((current = []) =>
      current.map((row) =>
        row.id === id && (canManageUsers || row.ownerUserId === currentUserId)
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
    setRows((current = []) =>
      current.filter((row) => row.id !== id || (!canManageUsers && row.ownerUserId !== currentUserId))
    );
  };

  const deleteRows = (ids: string[]) => {
    const currentUserId = ensureSignedIn(userId);
    if (!canDelete) {
      throw new Error('Sinulla ei ole oikeuksia poistaa tarjousrivejä.');
    }
    const idSet = new Set(ids);
    setRows((current = []) =>
      current.filter((row) => !idSet.has(row.id) || (!canManageUsers && row.ownerUserId !== currentUserId))
    );
  };

  const deleteRowsForQuote = (quoteId: string) => {
    const currentUserId = ensureSignedIn(userId);
    setRows((current = []) =>
      current.filter(
        (row) => row.quoteId !== quoteId || (!canManageUsers && row.ownerUserId !== currentUserId)
      )
    );
  };

  const getRowsForQuote = (quoteId: string) =>
    rows.filter((row) => row.quoteId === quoteId).sort((left, right) => left.sortOrder - right.sortOrder);

  return { rows, addRow, updateRow, deleteRow, deleteRows, deleteRowsForQuote, getRowsForQuote };
}

export function useQuoteTerms() {
  const [terms = [], setTerms] = useKV<QuoteTerms[]>('quote-terms', []);
  const { user, canManageSharedData } = useAuth();

  const addTerms = (termsData: Omit<QuoteTerms, 'id' | keyof ReturnType<typeof buildAudit>>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi lisätä ehtopohjia.');
    }
    const newTerms: QuoteTerms = {
      ...termsData,
      id: crypto.randomUUID(),
      ...buildAudit(user?.id),
    };

    if (newTerms.isDefault) {
      setTerms((current = []) => current.map((term) => ({ ...term, isDefault: false })));
    }

    setTerms((current = []) => [...current, newTerms]);
    return newTerms;
  };

  const updateTerms = (id: string, updates: Partial<QuoteTerms>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi muokata ehtopohjia.');
    }

    if (updates.isDefault) {
      setTerms((current = []) =>
        current.map((term) => ({
          ...term,
          isDefault: term.id === id,
          ...(term.id === id ? { ...updates, updatedAt: nowIso(), updatedByUserId: user?.id } : {}),
        }))
      );
      return;
    }

    setTerms((current = []) =>
      current.map((term) =>
        term.id === id ? { ...term, ...updates, updatedAt: nowIso(), updatedByUserId: user?.id } : term
      )
    );
  };

  const deleteTerms = (id: string) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi poistaa ehtopohjia.');
    }
    setTerms((current = []) => current.filter((term) => term.id !== id));
  };

  const getDefaultTerms = () => terms.find((term) => term.isDefault);

  return { terms, addTerms, updateTerms, deleteTerms, getDefaultTerms };
}

export function useSettings() {
  const [storedSettings = DEFAULT_SETTINGS, setSettings] = useKV<Settings>('settings', DEFAULT_SETTINGS);
  const { user, canManageSharedData } = useAuth();
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...storedSettings }), [storedSettings]);

  const updateSettings = (updates: Partial<Settings>) => {
    if (!canManageSharedData) {
      throw new Error('Vain admin voi muokata asetuksia.');
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
