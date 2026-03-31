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
  
  return { groups: groups || [], addGroup, updateGroup, deleteGroup };
}

export function useSubstituteProducts() {
  const [substitutes, setSubstitutes] = useKV<SubstituteProduct[]>('substitute-products', []);
  
  const addSubstitute = (substitute: Omit<SubstituteProduct, 'id' | 'createdAt'>) => {
    const newSubstitute: SubstituteProduct = {
      ...substitute,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSubstitutes(current => [...(current || []), newSubstitute]);
    return newSubstitute;
  };
  
  const deleteSubstitute = (id: string) => {
    setSubstitutes(current => (current || []).filter(s => s.id !== id));
  };
  
  const getSubstitutesForProduct = (productId: string) => {
    return (substitutes || []).filter(s => s.originalProductId === productId);
  };
  
  return { substitutes: substitutes || [], addSubstitute, deleteSubstitute, getSubstitutesForProduct };
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
  
  const getProjectsForCustomer = (customerId: string) => {
    return (projects || []).filter(p => p.customerId === customerId);
  };
  
  return { projects: projects || [], addProject, updateProject, deleteProject, getProject, getProjectsForCustomer };
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
    updateQuote(id, { status });
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
    const parentId = quote.parentQuoteId || quote.id;
    return (quotes || []).some(
      q => (q.parentQuoteId === parentId || q.id === parentId) &&
           q.revisionNumber > quote.revisionNumber
    );
  };
  
  return { 
    quotes: quotes || [], 
    addQuote, 
    updateQuote, 
    updateQuoteStatus,
    deleteQuote, 
    getQuote, 
    getQuotesForProject,
    hasNewerRevision
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
    setRows(current =>
      (current || []).map(r => r.id === id ? { ...r, ...updates } : r)
    );
  };
  
  const deleteRow = (id: string) => {
    setRows(current => (current || []).filter(r => r.id !== id));
  };
  
  const getRowsForQuote = (quoteId: string) => {
    return (rows || []).filter(r => r.quoteId === quoteId).sort((a, b) => a.sortOrder - b.sortOrder);
  };
  
  return { rows: rows || [], addRow, updateRow, deleteRow, getRowsForQuote };
}

export function useQuoteTerms() {
  const [terms, setTerms] = useKV<QuoteTerms[]>('quote-terms', []);
  
  const addTerms = (termsData: Omit<QuoteTerms, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTerms: QuoteTerms = {
      ...termsData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    if (newTerms.isDefault) {
      setTerms(current => 
        (current || []).map(t => ({ ...t, isDefault: false }))
      );
    }
    
    setTerms(current => [...(current || []), newTerms]);
    return newTerms;
  };
  
  const updateTerms = (id: string, updates: Partial<QuoteTerms>) => {
    if (updates.isDefault) {
      setTerms(current =>
        (current || []).map(t => ({
          ...t,
          isDefault: t.id === id,
          ...(t.id === id ? { ...updates, updatedAt: new Date().toISOString() } : {}),
        }))
      );
    } else {
      setTerms(current =>
        (current || []).map(t =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        )
      );
    }
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
  const defaultSettings: Settings = {
    companyName: 'Yritys Oy',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    defaultVatPercent: 25.5,
    defaultMarginPercent: 30,
  };
  
  const [settings, setSettings] = useKV<Settings>('settings', defaultSettings);
  
  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(current => ({ ...(current || defaultSettings), ...updates }));
  };
  
  return { settings: settings || defaultSettings, updateSettings };
}
