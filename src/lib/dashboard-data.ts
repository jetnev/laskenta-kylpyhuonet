import { calculateQuote, formatCurrency } from './calculations';
import type { AppLocationState } from './app-routing';
import {
  buildWorkspaceActionCenter,
  type WorkspaceFlowInput,
  type WorkspaceTask,
} from './workspace-flow';
import type { Customer, Invoice, Project, Quote, QuoteRow } from './types';

export type DashboardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type DashboardTaskPriority = 'high' | 'today' | 'blocked' | 'normal';

export interface DashboardKpi {
  id: 'open' | 'sendable' | 'invoice-ready' | 'issues';
  label: string;
  value: string;
  detail: string;
  tone: DashboardTone;
  target: AppLocationState;
  searchText: string;
}

export interface DashboardActionButton {
  label: string;
  target: AppLocationState;
  variant?: 'default' | 'outline' | 'secondary';
}

export interface DashboardNextAction {
  title: string;
  customerName: string;
  projectName: string;
  statusLabel: string;
  statusTone: DashboardTone;
  summary: string;
  description: string;
  actions: [DashboardActionButton, DashboardActionButton, DashboardActionButton];
  searchText: string;
}

export interface DashboardTaskItem {
  id: string;
  priorityLabel: string;
  priorityTone: DashboardTaskPriority;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  target: AppLocationState;
  searchText: string;
}

export interface DashboardRecentItem {
  id: string;
  typeLabel: string;
  title: string;
  description: string;
  detail: string;
  ctaLabel: string;
  target: AppLocationState;
  tone: DashboardTone;
  searchText: string;
}

export interface DashboardProjectStat {
  id: string;
  label: string;
  value: number;
  description: string;
  target: AppLocationState;
  searchText: string;
}

export interface DashboardAlert {
  id: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  target: AppLocationState;
  tone: DashboardTone;
  searchText: string;
}

export interface DashboardData {
  hasWorkspace: boolean;
  kpis: DashboardKpi[];
  nextAction: DashboardNextAction | null;
  tasks: DashboardTaskItem[];
  recentItems: DashboardRecentItem[];
  projectStats: DashboardProjectStat[];
  alerts: DashboardAlert[];
}

const TODAY_LABELS = new Intl.RelativeTimeFormat('fi-FI', { numeric: 'auto' });

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByUpdatedAt<T extends { updatedAt?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));
}

function buildQuoteTarget(quote: Pick<Quote, 'id' | 'projectId'>): AppLocationState {
  return {
    page: 'projects',
    projectId: quote.projectId,
    quoteId: quote.id,
    editor: 'quote',
  };
}

function buildProjectTarget(projectId?: string | null): AppLocationState {
  return projectId ? { page: 'projects', projectId } : { page: 'projects' };
}

function buildInvoiceTarget(invoiceId?: string | null): AppLocationState {
  return invoiceId ? { page: 'invoices', invoiceId } : { page: 'invoices' };
}

function getProjectCustomerLabel(project?: Project | null, customer?: Customer | null) {
  if (!project && !customer) {
    return 'Tuntematon kohde';
  }

  return [customer?.name, project?.name].filter(Boolean).join(' / ');
}

function getInvoiceDueDistance(invoice: Pick<Invoice, 'status' | 'dueDate'>, today: Date) {
  if (invoice.status !== 'issued' || !invoice.dueDate) {
    return Number.POSITIVE_INFINITY;
  }

  const dueDate = new Date(`${invoice.dueDate}T12:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isInvoiceActive(invoice: Invoice) {
  return invoice.status !== 'cancelled';
}

function getQuoteRows(rowsByQuoteId: Map<string, QuoteRow[]>, quoteId: string) {
  return rowsByQuoteId.get(quoteId) ?? [];
}

function getMissingQuotePieces(quote: Quote, quoteRows: QuoteRow[]) {
  const billableRowCount = quoteRows.filter((row) => row.mode !== 'section').length;
  const calculation = calculateQuote(quote, quoteRows);
  const missingPieces: string[] = [];

  if (billableRowCount === 0) {
    missingPieces.push('rivisisältö');
  }

  if (!quote.validUntil) {
    missingPieces.push('voimassaoloaika');
  }

  if (calculation.total <= 0) {
    missingPieces.push('hinnoittelu');
  }

  return {
    billableRowCount,
    calculation,
    missingPieces,
  };
}

function getQuoteStatusSummary(quote: Quote, quoteRows: QuoteRow[], hasInvoice: boolean) {
  const { billableRowCount, calculation, missingPieces } = getMissingQuotePieces(quote, quoteRows);

  if (quote.status === 'accepted' && !hasInvoice) {
    return {
      label: 'Laskutusvalmis',
      tone: 'success' as const,
      summary: `Hyväksytty tarjous ${formatCurrency(calculation.total)} odottaa laskua.`,
    };
  }

  if (quote.status === 'draft' && missingPieces.length > 0) {
    return {
      label: 'Puutteita',
      tone: 'warning' as const,
      summary: `Tarjoukselta puuttuu ${missingPieces.join(', ')}.`,
    };
  }

  if (quote.status === 'draft') {
    return {
      label: 'Luonnos',
      tone: 'info' as const,
      summary: `Luonnos sisältää ${billableRowCount} riviä ja arviolta ${formatCurrency(calculation.total)}.`,
    };
  }

  if (quote.status === 'sent') {
    return {
      label: 'Lähetetty',
      tone: 'neutral' as const,
      summary: `Lähetetty tarjous ${formatCurrency(calculation.total)} odottaa seurantaa.`,
    };
  }

  return {
    label: 'Valmis',
    tone: 'neutral' as const,
    summary: `Tarjousarvio ${formatCurrency(calculation.total)}.`,
  };
}

function mapTaskPriority(task: WorkspaceTask): { label: string; tone: DashboardTaskPriority } {
  const normalizedReason = task.reason.toLowerCase();

  if (normalizedReason.includes('puuttuu') || normalizedReason.includes('myöhässä') || normalizedReason.includes('erääntyi')) {
    return {
      label: normalizedReason.includes('puuttuu') ? 'Este' : 'Korkea',
      tone: normalizedReason.includes('puuttuu') ? 'blocked' : 'high',
    };
  }

  if (normalizedReason.includes('tänään') || normalizedReason.includes('päivän sisällä')) {
    return {
      label: 'Tänään',
      tone: 'today',
    };
  }

  if (task.tone === 'critical') {
    return {
      label: 'Korkea',
      tone: 'high',
    };
  }

  return {
    label: 'Huomio',
    tone: 'normal',
  };
}

function toSearchText(parts: Array<string | number | undefined | null>) {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .join(' ')
    .toLowerCase();
}

function buildPlaceholderRecentItem(kind: 'quote' | 'project' | 'invoice'): DashboardRecentItem {
  if (kind === 'quote') {
    return {
      id: 'recent-placeholder-quote',
      typeLabel: 'Tarjous',
      title: 'Ei tarjousluonnosta vielä',
      description: 'Luo ensimmäinen tarjous projektityötilassa.',
      detail: 'Tarjous näkyy tässä heti, kun aloitat ensimmäisen luonnoksen.',
      ctaLabel: 'Avaa projektit',
      target: { page: 'projects' },
      tone: 'neutral',
      searchText: 'tarjous luonnos projekti',
    };
  }

  if (kind === 'project') {
    return {
      id: 'recent-placeholder-project',
      typeLabel: 'Projekti',
      title: 'Ei projektia vielä',
      description: 'Projektityötila käynnistyy ensimmäisestä asiakkaasta ja projektista.',
      detail: 'Projektin jälkeen Etusivu osaa ehdottaa seuraavat toimenpiteet.',
      ctaLabel: 'Avaa projektit',
      target: { page: 'projects' },
      tone: 'neutral',
      searchText: 'projekti työtila',
    };
  }

  return {
    id: 'recent-placeholder-invoice',
    typeLabel: 'Lasku',
    title: 'Ei laskua vielä',
    description: 'Laskutus näkyy täällä, kun hyväksytystä tarjouksesta syntyy lasku.',
    detail: 'Laskun tilan voit avata tästä heti ilman lisähakuja.',
    ctaLabel: 'Avaa laskutus',
    target: { page: 'invoices' },
    tone: 'neutral',
    searchText: 'lasku laskutus',
  };
}

export function buildDashboardData(input: WorkspaceFlowInput): DashboardData {
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(12, 0, 0, 0);

  const actionCenter = buildWorkspaceActionCenter(input);
  const customerById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const rowsByQuoteId = input.quoteRows.reduce<Map<string, QuoteRow[]>>((result, row) => {
    const nextRows = result.get(row.quoteId) ?? [];
    nextRows.push(row);
    result.set(row.quoteId, nextRows);
    return result;
  }, new Map());
  const activeInvoicesByQuoteId = input.invoices.reduce<Map<string, Invoice[]>>((result, invoice) => {
    if (!isInvoiceActive(invoice)) {
      return result;
    }

    const nextInvoices = result.get(invoice.sourceQuoteId) ?? [];
    nextInvoices.push(invoice);
    result.set(invoice.sourceQuoteId, nextInvoices);
    return result;
  }, new Map());

  const sortedQuotes = sortByUpdatedAt(input.quotes);
  const sortedProjects = sortByUpdatedAt(input.projects);
  const sortedInvoices = sortByUpdatedAt(input.invoices);
  const latestQuoteByProjectId = sortedQuotes.reduce<Map<string, Quote>>((result, quote) => {
    if (!result.has(quote.projectId)) {
      result.set(quote.projectId, quote);
    }
    return result;
  }, new Map());

  const sendableQuotes = sortedQuotes.filter((quote) => {
    if (quote.status !== 'draft') {
      return false;
    }

    return getMissingQuotePieces(quote, getQuoteRows(rowsByQuoteId, quote.id)).missingPieces.length === 0;
  });

  const acceptedWithoutInvoice = sortedQuotes.filter((quote) => {
    if (quote.status !== 'accepted') {
      return false;
    }

    return (activeInvoicesByQuoteId.get(quote.id) ?? []).length === 0;
  });

  const acceptedWithoutInvoiceTotal = acceptedWithoutInvoice.reduce((sum, quote) => {
    return sum + calculateQuote(quote, getQuoteRows(rowsByQuoteId, quote.id)).total;
  }, 0);

  const overdueInvoices = sortedInvoices.filter((invoice) => getInvoiceDueDistance(invoice, today) < 0);
  const nearDueInvoices = sortedInvoices.filter((invoice) => {
    const distance = getInvoiceDueDistance(invoice, today);
    return distance >= 0 && distance <= 1;
  });
  const projectsWithoutOwner = sortedProjects.filter((project) => !project.ownerUserId);
  const quotesWithMissingData = sortedQuotes.filter((quote) => {
    if (quote.status !== 'draft') {
      return false;
    }

    return getMissingQuotePieces(quote, getQuoteRows(rowsByQuoteId, quote.id)).missingPieces.length > 0;
  });

  const latestDraftQuote = sortedQuotes.find((quote) => quote.status === 'draft') ?? null;
  const latestProject = sortedProjects[0] ?? null;
  const latestInvoice = sortedInvoices.find((invoice) => invoice.status === 'draft' || invoice.status === 'issued') ?? sortedInvoices[0] ?? null;
  const preferredQuote = sendableQuotes[0] ?? latestDraftQuote ?? acceptedWithoutInvoice[0] ?? sortedQuotes[0] ?? null;
  const preferredProject = preferredQuote ? projectById.get(preferredQuote.projectId) ?? null : latestProject;
  const preferredCustomer = preferredProject ? customerById.get(preferredProject.customerId) ?? null : null;
  const preferredInvoice = preferredProject
    ? sortedInvoices.find((invoice) => invoice.projectId === preferredProject.id && invoice.status !== 'cancelled') ?? null
    : latestInvoice;

  const nextAction = preferredQuote && preferredProject
    ? (() => {
        const status = getQuoteStatusSummary(
          preferredQuote,
          getQuoteRows(rowsByQuoteId, preferredQuote.id),
          (activeInvoicesByQuoteId.get(preferredQuote.id) ?? []).length > 0,
        );

        return {
          title: `Tarjous: ${preferredProject.name}`,
          customerName: preferredCustomer?.name || 'Ei asiakasta',
          projectName: preferredProject.name,
          statusLabel: status.label,
          statusTone: status.tone,
          summary: status.summary,
          description: actionCenter.nextAction?.reason || 'Etusivu nostaa korkeimman arvon työn näkyviin, jotta voit jatkaa sitä ilman välivaiheita.',
          actions: [
            {
              label: 'Viimeistele tarjous',
              target: buildQuoteTarget(preferredQuote),
            },
            {
              label: 'Avaa projektityötila',
              target: buildProjectTarget(preferredProject.id),
              variant: 'secondary',
            },
            {
              label: 'Luo lasku',
              target: buildInvoiceTarget(preferredInvoice?.id),
              variant: 'outline',
            },
          ] as [DashboardActionButton, DashboardActionButton, DashboardActionButton],
          searchText: toSearchText([
            preferredProject.name,
            preferredCustomer?.name,
            status.label,
            status.summary,
            actionCenter.nextAction?.reason,
          ]),
        } satisfies DashboardNextAction;
      })()
    : null;

  const kpis: DashboardKpi[] = [
    {
      id: 'open',
      label: 'Avoimet',
      value: String(actionCenter.tasks.length),
      detail: actionCenter.tasks.length === 1 ? '1 työ odottaa päätöstä' : `${actionCenter.tasks.length} työtä odottaa päätöstä`,
      tone: actionCenter.tasks.length > 0 ? 'info' : 'neutral',
      target: nextAction?.actions[1].target ?? { page: 'projects' },
      searchText: 'avoimet tehtävät projektit tarjoukset',
    },
    {
      id: 'sendable',
      label: 'Lähetettävät',
      value: String(sendableQuotes.length),
      detail: sendableQuotes.length > 0 ? 'Tarjoukset valmiina asiakkaalle' : 'Ei valmiita tarjouksia juuri nyt',
      tone: sendableQuotes.length > 0 ? 'success' : 'neutral',
      target: sendableQuotes[0] ? buildQuoteTarget(sendableQuotes[0]) : { page: 'projects' },
      searchText: 'lähetettävät tarjoukset',
    },
    {
      id: 'invoice-ready',
      label: 'Laskutusvalmis',
      value: formatCurrency(acceptedWithoutInvoiceTotal),
      detail: acceptedWithoutInvoice.length > 0 ? `${acceptedWithoutInvoice.length} hyväksyttyä tarjousta ilman laskua` : 'Ei laskutusvalmiita tarjouksia',
      tone: acceptedWithoutInvoice.length > 0 ? 'success' : 'neutral',
      target: { page: 'invoices' },
      searchText: 'laskutusvalmis hyväksytty tarjous lasku',
    },
    {
      id: 'issues',
      label: 'Esteet / puutteet',
      value: String(actionCenter.summary.blockers),
      detail: actionCenter.summary.blockers > 0 ? 'Tietoja puuttuu tai vastuu on nimeämättä' : 'Ei estäviä puutteita',
      tone: actionCenter.summary.blockers > 0 ? 'danger' : 'neutral',
      target: projectsWithoutOwner[0] ? buildProjectTarget(projectsWithoutOwner[0].id) : { page: 'projects' },
      searchText: 'esteet puutteet vastuuhenkilö',
    },
  ];

  const tasks = actionCenter.tasks.slice(0, 6).map((task) => {
    const priority = mapTaskPriority(task);

    return {
      id: task.id,
      priorityLabel: priority.label,
      priorityTone: priority.tone,
      title: task.locationLabel.replace(' • ', ' / '),
      subtitle: task.title,
      description: task.reason,
      ctaLabel: task.ctaLabel,
      target: task.target,
      searchText: toSearchText([task.locationLabel, task.title, task.reason, task.ctaLabel]),
    } satisfies DashboardTaskItem;
  });

  const recentItems: DashboardRecentItem[] = [
    latestDraftQuote
      ? (() => {
          const project = projectById.get(latestDraftQuote.projectId) ?? null;
          const customer = project ? customerById.get(project.customerId) ?? null : null;
          return {
            id: `recent-quote-${latestDraftQuote.id}`,
            typeLabel: 'Tarjousluonnos',
            title: latestDraftQuote.title,
            description: getProjectCustomerLabel(project, customer),
            detail: 'Viimeisintä tarjousluonnosta työstetään täällä.',
            ctaLabel: 'Avaa tarjous',
            target: buildQuoteTarget(latestDraftQuote),
            tone: 'info' as const,
            searchText: toSearchText([latestDraftQuote.title, project?.name, customer?.name, 'tarjousluonnos']),
          } satisfies DashboardRecentItem;
        })()
      : buildPlaceholderRecentItem('quote'),
    latestProject
      ? (() => {
          const customer = customerById.get(latestProject.customerId) ?? null;
          return {
            id: `recent-project-${latestProject.id}`,
            typeLabel: 'Projekti',
            title: latestProject.name,
            description: customer?.name || 'Ei asiakasta',
            detail: 'Avaa projekti kirjotyötilaan tästä ja jatka sen tarjouksia tai laskutusta.',
            ctaLabel: 'Avaa projekti',
            target: buildProjectTarget(latestProject.id),
            tone: 'neutral' as const,
            searchText: toSearchText([latestProject.name, customer?.name, 'projekti']),
          } satisfies DashboardRecentItem;
        })()
      : buildPlaceholderRecentItem('project'),
    latestInvoice
      ? {
          id: `recent-invoice-${latestInvoice.id}`,
          typeLabel: 'Lasku',
          title: latestInvoice.invoiceNumber,
          description: [latestInvoice.customer.name, latestInvoice.project.name].join(' / '),
          detail: latestInvoice.status === 'draft' ? 'Viimeisin lasku odottaa vielä viimeistelyä.' : 'Viimeisin lasku on avoinna seurattavaksi.',
          ctaLabel: 'Avaa lasku',
          target: buildInvoiceTarget(latestInvoice.id),
          tone: latestInvoice.status === 'draft' ? 'warning' : 'neutral',
          searchText: toSearchText([latestInvoice.invoiceNumber, latestInvoice.customer.name, latestInvoice.project.name, 'lasku']),
        }
      : buildPlaceholderRecentItem('invoice'),
  ];

  const quoteStageProjects = sortedProjects.filter((project) => {
    const latestQuote = latestQuoteByProjectId.get(project.id);
    return latestQuote?.status === 'draft' || latestQuote?.status === 'sent';
  }).length;
  const acceptedAwaitingStart = sortedProjects.filter((project) => {
    const latestQuote = latestQuoteByProjectId.get(project.id);
    return latestQuote?.status === 'accepted' && acceptedWithoutInvoice.some((quote) => quote.projectId === project.id);
  }).length;
  const invoicingInProgress = new Set(
    sortedInvoices
      .filter((invoice) => invoice.status === 'draft' || invoice.status === 'issued')
      .map((invoice) => invoice.projectId),
  ).size;

  const projectStats: DashboardProjectStat[] = [
    {
      id: 'active-projects',
      label: 'Aktiiviset projektit',
      value: sortedProjects.length,
      description: 'Kaikki työtilan käynnissä olevat projektit.',
      target: { page: 'projects' },
      searchText: 'aktiiviset projektit',
    },
    {
      id: 'quote-stage',
      label: 'Tarjousvaiheessa',
      value: quoteStageProjects,
      description: 'Projektit, joissa tarjous on vielä luonnos- tai lähetysvaiheessa.',
      target: { page: 'projects' },
      searchText: 'tarjousvaiheessa projektit',
    },
    {
      id: 'accepted-awaiting-start',
      label: 'Hyväksytty odottaa aloitusta',
      value: acceptedAwaitingStart,
      description: 'Hyväksytyt tarjoukset, joista ei ole vielä muodostettu laskua.',
      target: { page: 'invoices' },
      searchText: 'hyväksytty odottaa aloitusta laskutusvalmis',
    },
    {
      id: 'invoicing-in-progress',
      label: 'Laskutus kesken',
      value: invoicingInProgress,
      description: 'Projektit, joissa laskuja viimeistellään tai seurataan.',
      target: { page: 'invoices' },
      searchText: 'laskutus kesken projektit',
    },
  ];

  const alerts: DashboardAlert[] = [
    ...overdueInvoices.slice(0, 2).map((invoice) => ({
      id: `alert-overdue-${invoice.id}`,
      label: 'Huomio',
      title: `${invoice.invoiceNumber} on erääntynyt`,
      description: `${invoice.customer.name} / ${invoice.project.name}`,
      ctaLabel: 'Avaa lasku',
      target: buildInvoiceTarget(invoice.id),
      tone: 'danger' as const,
      searchText: toSearchText([invoice.invoiceNumber, invoice.customer.name, invoice.project.name, 'erääntynyt lasku']),
    })),
    ...nearDueInvoices.slice(0, 2).map((invoice) => {
      const distance = getInvoiceDueDistance(invoice, today);
      return {
        id: `alert-due-${invoice.id}`,
        label: distance === 0 ? 'Tänään' : 'Huomenna',
        title: `${invoice.invoiceNumber} erääntyy ${TODAY_LABELS.format(distance, 'day')}`,
        description: `${invoice.customer.name} / ${invoice.project.name}`,
        ctaLabel: 'Avaa lasku',
        target: buildInvoiceTarget(invoice.id),
        tone: 'warning' as const,
        searchText: toSearchText([invoice.invoiceNumber, invoice.customer.name, invoice.project.name, 'erääntyvä lasku']),
      } satisfies DashboardAlert;
    }),
    ...quotesWithMissingData.slice(0, 2).map((quote) => {
      const project = projectById.get(quote.projectId) ?? null;
      const customer = project ? customerById.get(project.customerId) ?? null : null;
      const missingPieces = getMissingQuotePieces(quote, getQuoteRows(rowsByQuoteId, quote.id)).missingPieces;
      return {
        id: `alert-gap-${quote.id}`,
        label: 'Puute',
        title: `${project?.name || quote.title} tarvitsee täydennyksiä`,
        description: `${customer?.name || 'Ei asiakasta'} / Puuttuu ${missingPieces.join(', ')}`,
        ctaLabel: 'Viimeistele tarjous',
        target: buildQuoteTarget(quote),
        tone: 'warning' as const,
        searchText: toSearchText([project?.name, quote.title, customer?.name, missingPieces.join(' '), 'puute tarjous']),
      } satisfies DashboardAlert;
    }),
    ...projectsWithoutOwner.slice(0, 2).map((project) => ({
      id: `alert-owner-${project.id}`,
      label: 'Huomio',
      title: `${project.name} ilman vastuuhenkilöä`,
      description: `${customerById.get(project.customerId)?.name || 'Ei asiakasta'} / Vastuunjako kannattaa täydentää ennen seuraavaa vaihetta.`,
      ctaLabel: 'Avaa projekti',
      target: buildProjectTarget(project.id),
      tone: 'danger' as const,
      searchText: toSearchText([project.name, customerById.get(project.customerId)?.name, 'vastuuhenkilö puuttuu']),
    })),
  ].slice(0, 6);

  return {
    hasWorkspace: actionCenter.hasWorkspace && (sortedQuotes.length > 0 || sortedInvoices.length > 0 || sortedProjects.length > 0),
    kpis,
    nextAction,
    tasks,
    recentItems,
    projectStats,
    alerts,
  };
}