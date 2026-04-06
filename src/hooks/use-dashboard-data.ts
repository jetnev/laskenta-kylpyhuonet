import { useMemo } from 'react';

import { useCustomers, useInvoices, useProducts, useProjects, useQuoteRows, useQuotes } from './use-data';
import { buildDashboardData } from '../lib/dashboard-data';

export function useDashboardData() {
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  const { products } = useProducts();
  const { projects } = useProjects();
  const { rows } = useQuoteRows();
  const { quotes } = useQuotes();

  return useMemo(
    () =>
      buildDashboardData({
        customers,
        invoices,
        products,
        projects,
        quoteRows: rows,
        quotes,
      }),
    [customers, invoices, products, projects, quotes, rows]
  );
}