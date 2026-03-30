import { useKV } from '@github/spark/hooks';
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

export function useProducts() {
  const [products, setProducts] = useKV<Product[]>('products', []);
  
  const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setProducts(current => [...(current || []), newProduct]);
    return newProduct;
  };
  
  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(current =>
      (current || []).map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  };
  
  const deleteProduct = (id: string) => {
    setProducts(current => (current || []).filter(p => p.id !== id));
  };
  
  const getProduct = (id: string) => {
    return (products || []).find(p => p.id === id);
  };
  
  return { products: products || [], addProduct, updateProduct, deleteProduct, getProduct };
}

export function useInstallationGroups() {
  const [groups, setGroups] = useKV<InstallationGroup[]>('installation-groups', []);
  
  const addGroup = (group: Omit<InstallationGroup, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newGroup: InstallationGroup = {
      ...group,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setGroups(current => [...(current || []), newGroup]);
    return newGroup;
  };
  
  const updateGroup = (id: string, updates: Partial<InstallationGroup>) => {
    setGroups(current =>
      (current || []).map(g =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      )
    );
  };
  
  const deleteGroup = (id: string) => {
    setGroups(current => (current || []).filter(g => g.id !== id));
  };
  
  const getGroup = (id: string) => {
    return (groups || []).find(g => g.id === id);
  };
  
  return { groups: groups || [], addGroup, updateGroup, deleteGroup, getGroup };
}

export function useSubstituteProducts() {
  const [substitutes, setSubstitutes] = useKV<SubstituteProduct[]>('substitute-products', []);
  
  const addSubstitute = (substitute: Omit<SubstituteProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newSubstitute: SubstituteProduct = {
      ...substitute,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setSubstitutes(current => [...(current || []), newSubstitute]);
    return newSubstitute;
  };
  
  const updateSubstitute = (id: string, updates: Partial<SubstituteProduct>) => {
    setSubstitutes(current =>
      (current || []).map(s =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      )
    );
  };
  
  const deleteSubstitute = (id: string) => {
    setSubstitutes(current => (current || []).filter(s => s.id !== id));
  };
  
  const getSubstitutesForProduct = (productId: string) => {
    return (substitutes || []).filter(s => s.primaryProductId === productId);
  };
  
  return { 
    substitutes: substitutes || [], 
    addSubstitute, 
    updateSubstitute, 
    deleteSubstitute, 
    getSubstitutesForProduct 
  };
}

export function useCustomers() {
  const [customers, setCustomers] = useKV<Customer[]>('customers', []);
  
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setCustomers(current => [...(current || []), newCustomer]);
    return newCustomer;
  };
  
  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(current =>
      (current || []).map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    );
  };
  
  const deleteCustomer = (id: string) => {
    setCustomers(current => (current || []).filter(c => c.id !== id));
  };
  
  const getCustomer = (id: string) => {
    return (customers || []).find(c => c.id === id);
  };
  
  return { customers: customers || [], addCustomer, updateCustomer, deleteCustomer, getCustomer };
}

export function useProjects() {
  const [projects, setProjects] = useKV<Project[]>('projects', []);
  
  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setProjects(current => [...(current || []), newProject]);
    return newProject;
  };
  
  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(current =>
      (current || []).map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  };
  
  const deleteProject = (id: string) => {
    setProjects(current => (current || []).filter(p => p.id !== id));
  };
  
  const getProject = (id: string) => {
    return (projects || []).find(p => p.id === id);
  };
  
  return { projects: projects || [], addProject, updateProject, deleteProject, getProject };
}

export function useQuotes() {
  const [quotes, setQuotes] = useKV<Quote[]>('quotes', []);
  
  const addQuote = (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setQuotes(current => [...(current || []), newQuote]);
    return newQuote;
  };
  
  const updateQuote = (id: string, updates: Partial<Quote>) => {
    setQuotes(current =>
      (current || []).map(q =>
        q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
      )
    );
  };
  
  const updateQuoteStatus = (id: string, status: QuoteStatus) => {
    const updates: Partial<Quote> = { status };
    if (status === 'sent') {
      updates.sentAt = new Date().toISOString();
    }
    updateQuote(id, updates);
  };
  
  const deleteQuote = (id: string) => {
    setQuotes(current => (current || []).filter(q => q.id !== id));
  };
  
  const getQuote = (id: string) => {
    return (quotes || []).find(q => q.id === id);
  };
  
  const getQuotesForProject = (projectId: string) => {
    return (quotes || []).filter(q => q.projectId === projectId);
  };
  
  const hasNewerRevision = (quote: Quote) => {
    const allQuotes = quotes || [];
    if (!quote.parentQuoteId) {
      const children = allQuotes.filter(q => q.parentQuoteId === quote.id);
      return children.length > 0;
    }
    const siblings = allQuotes.filter(
      q => q.parentQuoteId === quote.parentQuoteId || q.id === quote.parentQuoteId
    );
    return siblings.some(q => q.revisionNumber > quote.revisionNumber);
  };
  
  return {
    quotes: quotes || [],
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
  const [rows, setRows] = useKV<QuoteRow[]>('quote-rows', []);
  
  const addRow = (row: Omit<QuoteRow, 'id'>) => {
    const newRow: QuoteRow = {
      ...row,
      id: crypto.randomUUID(),
    };
    setRows(current => [...(current || []), newRow]);
    return newRow;
  };
  
  const updateRow = (id: string, updates: Partial<QuoteRow>) => {
    setRows(current => (current || []).map(r => (r.id === id ? { ...r, ...updates } : r)));
  };
  
  const deleteRow = (id: string) => {
    setRows(current => (current || []).filter(r => r.id !== id));
  };
  
  const getRowsForQuote = (quoteId: string) => {
    return (rows || []).filter(r => r.quoteId === quoteId).sort((a, b) => a.sortOrder - b.sortOrder);
  };
  
  const reorderRows = (quoteId: string, rowIds: string[]) => {
    setRows(current =>
      (current || []).map(r => {
        if (r.quoteId !== quoteId) return r;
        const newOrder = rowIds.indexOf(r.id);
        return newOrder >= 0 ? { ...r, sortOrder: newOrder } : r;
      })
    );
  };
  
  const deleteRowsForQuote = (quoteId: string) => {
    setRows(current => (current || []).filter(r => r.quoteId !== quoteId));
  };
  
  return {
    rows: rows || [],
    addRow,
    updateRow,
    deleteRow,
    getRowsForQuote,
    reorderRows,
    deleteRowsForQuote,
  };
}

export function useQuoteTerms() {
  const [terms, setTerms] = useKV<QuoteTerms[]>('quote-terms', []);
  
  const addTerms = (term: Omit<QuoteTerms, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTerm: QuoteTerms = {
      ...term,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setTerms(current => [...(current || []), newTerm]);
    return newTerm;
  };
  
  const updateTerms = (id: string, updates: Partial<QuoteTerms>) => {
    setTerms(current =>
      (current || []).map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  };
  
  const deleteTerms = (id: string) => {
    setTerms(current => (current || []).filter(t => t.id !== id));
  };
  
  const getDefaultTerms = () => {
    return (terms || []).find(t => t.isDefault);
  };
  
  return { terms: terms || [], addTerms, updateTerms, deleteTerms, getDefaultTerms };
}

export function useSettings() {
  const [settings, setSettings] = useKV<Settings>('settings', {
    defaultVatPercent: 0,
    defaultMarginPercent: 30,
    defaultRegionCoefficient: 1.0,
    companyName: 'Yritys Oy',
  });
  
  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(current => {
      const base = current || {
        defaultVatPercent: 0,
        defaultMarginPercent: 30,
        defaultRegionCoefficient: 1.0,
        companyName: 'Yritys Oy',
      };
      return { ...base, ...updates };
    });
  };
  
  return { 
    settings: settings || {
      defaultVatPercent: 0,
      defaultMarginPercent: 30,
      defaultRegionCoefficient: 1.0,
      companyName: 'Yritys Oy',
    }, 
    updateSettings 
  };
}
