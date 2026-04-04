import { calculateQuote } from './calculations';
import type { AppLocationState } from './app-routing';
import type { Customer, Invoice, Product, Project, Quote, QuoteRow, ScheduleMilestone } from './types';

export type WorkspaceTaskTone = 'critical' | 'attention' | 'follow-up' | 'info';

export interface WorkspaceTask {
  id: string;
  title: string;
  reason: string;
  locationLabel: string;
  ctaLabel: string;
  target: AppLocationState;
  priority: number;
  tone: WorkspaceTaskTone;
  projectId?: string;
  quoteId?: string;
  invoiceId?: string;
  updatedAt?: string;
}

export interface WorkspaceResumeItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  badgeLabel: string;
  ctaLabel: string;
  target: AppLocationState;
}

export interface WorkspaceActionSummary {
  blockedDrafts: number;
  deadlines: number;
  followUps: number;
  invoiceActions: number;
  blockers: number;
}

export interface WorkspaceActionCenter {
  hasWorkspace: boolean;
  nextAction: WorkspaceTask | null;
  tasks: WorkspaceTask[];
  resumeItems: WorkspaceResumeItem[];
  summary: WorkspaceActionSummary;
  hasProductGap: boolean;
}

export interface ProjectWorkspaceContext {
  nextAction: WorkspaceTask | null;
  tasks: WorkspaceTask[];
  latestInvoice: Invoice | null;
  draftInvoiceCount: number;
  overdueInvoiceCount: number;
  acceptedWithoutInvoiceCount: number;
}

export interface WorkspaceFlowInput {
  customers: Customer[];
  invoices: Invoice[];
  products: Product[];
  projects: Project[];
  quoteRows: QuoteRow[];
  quotes: Quote[];
  today?: Date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isInvoiceOverdueAtDate(invoice: Pick<Invoice, 'status' | 'dueDate'>, today: Date) {
  if (invoice.status !== 'issued' || !invoice.dueDate) {
    return false;
  }

  return invoice.dueDate < toDateKey(today);
}

function toMiddayDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function dayDistance(targetDate: string, today: Date) {
  const base = new Date(today);
  base.setHours(12, 0, 0, 0);
  const target = toMiddayDate(targetDate);
  if (!target) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(value: string | undefined, today: Date) {
  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return 0;
  }

  const base = new Date(today);
  base.setHours(12, 0, 0, 0);
  return Math.max(0, Math.floor((base.getTime() - timestamp) / (1000 * 60 * 60 * 24)));
}

function buildProjectLabel(project?: Project | null, customer?: Customer | null) {
  return [project?.name || 'Tuntematon projekti', customer?.name || 'Ei asiakasta'].join(' • ');
}

function pushTask(collection: WorkspaceTask[], task: WorkspaceTask | null) {
  if (task) {
    collection.push(task);
  }
}

function compareTasks(left: WorkspaceTask, right: WorkspaceTask) {
  if (right.priority !== left.priority) {
    return right.priority - left.priority;
  }

  const updatedAtDifference = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  if (updatedAtDifference !== 0) {
    return updatedAtDifference;
  }

  return left.title.localeCompare(right.title, 'fi');
}

export function buildWorkspaceActionCenter(input: WorkspaceFlowInput): WorkspaceActionCenter {
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(12, 0, 0, 0);

  const customerById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const rowsByQuoteId = input.quoteRows.reduce<Map<string, QuoteRow[]>>((result, row) => {
    const nextRows = result.get(row.quoteId) ?? [];
    nextRows.push(row);
    result.set(row.quoteId, nextRows);
    return result;
  }, new Map());
  const invoicesByQuoteId = input.invoices.reduce<Map<string, Invoice[]>>((result, invoice) => {
    const nextInvoices = result.get(invoice.sourceQuoteId) ?? [];
    nextInvoices.push(invoice);
    result.set(invoice.sourceQuoteId, nextInvoices);
    return result;
  }, new Map());

  const tasks: WorkspaceTask[] = [];
  let blockedDrafts = 0;
  let deadlines = 0;
  let followUps = 0;
  let invoiceActions = 0;
  let blockers = 0;

  const sortedProjects = [...input.projects].sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));
  const sortedQuotes = [...input.quotes].sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));
  const sortedInvoices = [...input.invoices].sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));

  sortedQuotes.forEach((quote) => {
    const project = projectById.get(quote.projectId) ?? null;
    const customer = project ? customerById.get(project.customerId) ?? null : null;
    const quoteRows = rowsByQuoteId.get(quote.id) ?? [];
    const calculation = calculateQuote(quote, quoteRows);
    const rowCount = quoteRows.filter((row) => row.mode !== 'section').length;
    const quoteInvoices = (invoicesByQuoteId.get(quote.id) ?? []).filter((invoice) => invoice.status !== 'cancelled');
    const locationLabel = buildProjectLabel(project, customer);
    const quoteTarget: AppLocationState = {
      page: 'projects',
      projectId: quote.projectId,
      quoteId: quote.id,
      editor: 'quote',
    };

    if (quote.status === 'draft') {
      const missingPieces: string[] = [];
      if (rowCount === 0) {
        missingPieces.push('rivisisältö');
      }
      if (!quote.validUntil) {
        missingPieces.push('voimassaoloaika');
      }
      if (calculation.total <= 0) {
        missingPieces.push('hinnoittelu');
      }

      if (missingPieces.length > 0) {
        blockedDrafts += 1;
        blockers += 1;
        pushTask(tasks, {
          id: `quote-blocked-${quote.id}`,
          title: quote.title,
          reason: `Luonnoksesta puuttuu ${missingPieces.join(', ')} ennen lähettämistä.`,
          locationLabel,
          ctaLabel: 'Viimeistele tarjous',
          target: quoteTarget,
          priority: 74,
          tone: 'attention',
          projectId: quote.projectId,
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
        });
      } else {
        blockedDrafts += 1;
        pushTask(tasks, {
          id: `quote-ready-${quote.id}`,
          title: quote.title,
          reason: 'Tarjous on sisällöllisesti valmis mutta vielä luonnoksena.',
          locationLabel,
          ctaLabel: 'Viimeistele tarjous',
          target: quoteTarget,
          priority: 90,
          tone: 'attention',
          projectId: quote.projectId,
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
        });
      }
    }

    if (quote.status === 'sent') {
      const followUpDays = daysSince(quote.sentAt || quote.updatedAt, today);
      if (followUpDays >= 4) {
        followUps += 1;
        pushTask(tasks, {
          id: `quote-followup-${quote.id}`,
          title: quote.title,
          reason: `Tarjous on ollut lähetettynä ${followUpDays} päivää ilman seurantaa.`,
          locationLabel,
          ctaLabel: 'Seuraa tarjousta',
          target: quoteTarget,
          priority: 80,
          tone: 'follow-up',
          projectId: quote.projectId,
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
        });
      }
    }

    if (quote.status === 'accepted' && quoteInvoices.length === 0) {
      invoiceActions += 1;
      pushTask(tasks, {
        id: `quote-invoice-${quote.id}`,
        title: quote.title,
        reason: 'Hyväksytystä tarjouksesta puuttuu vielä lasku.',
        locationLabel,
        ctaLabel: 'Avaa laskutus',
        target: { page: 'invoices' },
        priority: 77,
        tone: 'info',
        projectId: quote.projectId,
        quoteId: quote.id,
        updatedAt: quote.updatedAt,
      });
    }

    if (!quote.ownerUserId) {
      blockers += 1;
      pushTask(tasks, {
        id: `quote-owner-${quote.id}`,
        title: quote.title,
        reason: 'Tarjoukselta puuttuu vastuuhenkilö, mikä vaikeuttaa työn seurantaa.',
        locationLabel,
        ctaLabel: 'Avaa projekti',
        target: { page: 'projects', projectId: quote.projectId },
        priority: 62,
        tone: 'info',
        projectId: quote.projectId,
        quoteId: quote.id,
        updatedAt: quote.updatedAt,
      });
    }

    (quote.scheduleMilestones ?? []).forEach((milestone: ScheduleMilestone) => {
      if (!milestone.targetDate || quote.status === 'rejected') {
        return;
      }

      const daysUntil = dayDistance(milestone.targetDate, today);
      if (daysUntil > 7) {
        return;
      }

      if (daysUntil < 0) {
        deadlines += 1;
        pushTask(tasks, {
          id: `deadline-overdue-${quote.id}-${milestone.id}`,
          title: milestone.title || 'Myöhässä oleva määräaika',
          reason: `${quote.title} on myöhässä ${Math.abs(daysUntil)} päivää.`,
          locationLabel,
          ctaLabel: 'Avaa projekti',
          target: { page: 'projects', projectId: quote.projectId },
          priority: 100 + Math.min(10, Math.abs(daysUntil)),
          tone: 'critical',
          projectId: quote.projectId,
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
        });
        return;
      }

      if (daysUntil === 0) {
        deadlines += 1;
        pushTask(tasks, {
          id: `deadline-today-${quote.id}-${milestone.id}`,
          title: milestone.title || 'Määräaika tänään',
          reason: `${quote.title} erääntyy tänään.`,
          locationLabel,
          ctaLabel: 'Avaa projekti',
          target: { page: 'projects', projectId: quote.projectId },
          priority: 98,
          tone: 'critical',
          projectId: quote.projectId,
          quoteId: quote.id,
          updatedAt: quote.updatedAt,
        });
        return;
      }

      deadlines += 1;
      pushTask(tasks, {
        id: `deadline-upcoming-${quote.id}-${milestone.id}`,
        title: milestone.title || 'Lähestyvä määräaika',
        reason: `${quote.title} tarvitsee huomiota ${daysUntil} päivän sisällä.`,
        locationLabel,
        ctaLabel: 'Avaa projekti',
        target: { page: 'projects', projectId: quote.projectId },
        priority: 68 + (7 - daysUntil),
        tone: 'follow-up',
        projectId: quote.projectId,
        quoteId: quote.id,
        updatedAt: quote.updatedAt,
      });
    });
  });

  sortedInvoices.forEach((invoice) => {
    const locationLabel = [invoice.project.name, invoice.customer.name].join(' • ');
    if (isInvoiceOverdueAtDate(invoice, today)) {
      invoiceActions += 1;
      pushTask(tasks, {
        id: `invoice-overdue-${invoice.id}`,
        title: invoice.invoiceNumber,
        reason: `Lasku erääntyi ${invoice.dueDate}.`,
        locationLabel,
        ctaLabel: 'Avaa lasku',
        target: { page: 'invoices', invoiceId: invoice.id },
        priority: 95,
        tone: 'critical',
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        updatedAt: invoice.updatedAt,
      });
      return;
    }

    if (invoice.status === 'draft') {
      invoiceActions += 1;
      pushTask(tasks, {
        id: `invoice-draft-${invoice.id}`,
        title: invoice.invoiceNumber,
        reason: 'Laskuluonnos odottaa viimeistelyä tai lähetystä.',
        locationLabel,
        ctaLabel: 'Lähetä lasku',
        target: { page: 'invoices', invoiceId: invoice.id },
        priority: 84,
        tone: 'attention',
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        updatedAt: invoice.updatedAt,
      });
      return;
    }

    if (invoice.status === 'issued') {
      const dueDistance = dayDistance(invoice.dueDate, today);
      if (dueDistance >= 0 && dueDistance <= 3) {
        invoiceActions += 1;
        pushTask(tasks, {
          id: `invoice-issued-${invoice.id}`,
          title: invoice.invoiceNumber,
          reason: `Laskun eräpäivä on ${dueDistance === 0 ? 'tänään' : `${dueDistance} päivän päästä`}.`,
          locationLabel,
          ctaLabel: 'Avaa lasku',
          target: { page: 'invoices', invoiceId: invoice.id },
          priority: 79,
          tone: 'follow-up',
          projectId: invoice.projectId,
          invoiceId: invoice.id,
          updatedAt: invoice.updatedAt,
        });
      }
    }
  });

  sortedProjects.forEach((project) => {
    const customer = customerById.get(project.customerId) ?? null;
    const projectQuotes = sortedQuotes.filter((quote) => quote.projectId === project.id);

    if (projectQuotes.length === 0) {
      blockedDrafts += 1;
      pushTask(tasks, {
        id: `project-empty-${project.id}`,
        title: project.name,
        reason: 'Projektille ei ole vielä luotu tarjousta.',
        locationLabel: buildProjectLabel(project, customer),
        ctaLabel: 'Luo tarjous',
        target: { page: 'projects', projectId: project.id },
        priority: 66,
        tone: 'info',
        projectId: project.id,
        updatedAt: project.updatedAt,
      });
    }

    if (!project.ownerUserId) {
      blockers += 1;
      pushTask(tasks, {
        id: `project-owner-${project.id}`,
        title: project.name,
        reason: 'Projektilta puuttuu vastuuhenkilö.',
        locationLabel: buildProjectLabel(project, customer),
        ctaLabel: 'Täydennä tiedot',
        target: { page: 'projects', projectId: project.id },
        priority: 61,
        tone: 'info',
        projectId: project.id,
        updatedAt: project.updatedAt,
      });
    }
  });

  input.customers.forEach((customer) => {
    if (customer.ownerUserId) {
      return;
    }

    blockers += 1;
    pushTask(tasks, {
      id: `customer-owner-${customer.id}`,
      title: customer.name,
      reason: 'Asiakkaalta puuttuu vastuuhenkilö.',
      locationLabel: customer.name,
      ctaLabel: 'Täydennä tiedot',
      target: { page: 'projects' },
      priority: 60,
      tone: 'info',
      updatedAt: customer.updatedAt,
    });
  });

  const orderedTasks = tasks.sort(compareTasks);
  const resumeItems: WorkspaceResumeItem[] = [];
  const latestQuote = sortedQuotes[0];
  const latestProject = sortedProjects[0];
  const latestInvoice = sortedInvoices.find((invoice) => invoice.status === 'draft' || invoice.status === 'issued') ?? null;

  if (latestQuote) {
    const project = projectById.get(latestQuote.projectId) ?? null;
    const customer = project ? customerById.get(project.customerId) ?? null : null;
    resumeItems.push({
      id: `resume-quote-${latestQuote.id}`,
      title: latestQuote.title,
      detail: latestQuote.status === 'draft' ? 'Avaa viimeisin luonnos ja jatka viimeistelyä.' : 'Palaa viimeisimpään tarjoukseen ja tarkista eteneminen.',
      meta: buildProjectLabel(project, customer),
      badgeLabel: latestQuote.status === 'draft' ? 'Tarjousluonnos' : 'Tarjous',
      ctaLabel: 'Avaa tarjous',
      target: { page: 'projects', projectId: latestQuote.projectId, quoteId: latestQuote.id, editor: 'quote' },
    });
  }

  if (latestProject) {
    const customer = customerById.get(latestProject.customerId) ?? null;
    resumeItems.push({
      id: `resume-project-${latestProject.id}`,
      title: latestProject.name,
      detail: 'Palaa projektityötilaan ja jatka keskeneräisiä tarjouksia tai tietoja.',
      meta: buildProjectLabel(latestProject, customer),
      badgeLabel: 'Projektityötila',
      ctaLabel: 'Avaa projekti',
      target: { page: 'projects', projectId: latestProject.id },
    });
  }

  if (latestInvoice) {
    resumeItems.push({
      id: `resume-invoice-${latestInvoice.id}`,
      title: latestInvoice.invoiceNumber,
      detail: latestInvoice.status === 'draft' ? 'Viimeistele ja lähetä viimeisin laskuluonnos.' : 'Tarkista viimeisin avoin lasku ja sen tila.',
      meta: [latestInvoice.project.name, latestInvoice.customer.name].join(' • '),
      badgeLabel: 'Laskutus',
      ctaLabel: 'Avaa lasku',
      target: { page: 'invoices', invoiceId: latestInvoice.id },
    });
  }

  return {
    hasWorkspace: input.projects.length > 0 || input.quotes.length > 0 || input.customers.length > 0,
    nextAction: orderedTasks[0] ?? null,
    tasks: orderedTasks,
    resumeItems: resumeItems.slice(0, 3),
    summary: {
      blockedDrafts,
      deadlines,
      followUps,
      invoiceActions,
      blockers,
    },
    hasProductGap: input.products.length === 0,
  };
}

export function buildProjectWorkspaceContext(projectId: string, input: WorkspaceFlowInput): ProjectWorkspaceContext {
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(12, 0, 0, 0);
  const projectTasks = buildWorkspaceActionCenter(input).tasks.filter((task) => task.projectId === projectId);
  const projectInvoices = input.invoices
    .filter((invoice) => invoice.projectId === projectId)
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));
  const projectQuotes = input.quotes.filter((quote) => quote.projectId === projectId);
  const activeInvoicesByQuoteId = input.invoices.reduce<Map<string, Invoice[]>>((result, invoice) => {
    if (invoice.status === 'cancelled') {
      return result;
    }

    const nextInvoices = result.get(invoice.sourceQuoteId) ?? [];
    nextInvoices.push(invoice);
    result.set(invoice.sourceQuoteId, nextInvoices);
    return result;
  }, new Map());

  return {
    nextAction: projectTasks[0] ?? null,
    tasks: projectTasks,
    latestInvoice: projectInvoices[0] ?? null,
    draftInvoiceCount: projectInvoices.filter((invoice) => invoice.status === 'draft').length,
    overdueInvoiceCount: projectInvoices.filter((invoice) => isInvoiceOverdueAtDate(invoice, today)).length,
    acceptedWithoutInvoiceCount: projectQuotes.filter((quote) => quote.status === 'accepted' && (activeInvoicesByQuoteId.get(quote.id) ?? []).length === 0).length,
  };
}