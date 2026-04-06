import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash, FileText, Building, Users, MagnifyingGlass, X, Clock, FolderOpen } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useProjects, useCustomers, useInvoices, useQuotes, useQuoteRows, useQuoteTerms, useSettings, useStarterWorkspaceTemplate } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import { Project, Customer, Quote } from '../../lib/types';
import { cn } from '../../lib/utils';
import type { AppLocationState } from '../../lib/app-routing';
import { getInvoiceStatusLabel, isInvoiceOverdue } from '../../lib/invoices';
import { filterOwnedRecords, getResponsibleUserLabel } from '../../lib/ownership';
import { shouldKeepPendingQuoteEditorOpen } from '../../lib/project-workspace';
import { buildProjectWorkspaceContext, resolveWorkspaceTaskExecution, type WorkspaceTask } from '../../lib/workspace-flow';
import {
  isShortcutInputTarget,
  sortQuotesForList,
  type QuoteListSortDirection,
  type QuoteListSortField,
} from '../../lib/projects-quote-list';
import QuoteEditor from '../QuoteEditor';
import FieldHelpLabel from '../FieldHelpLabel';

const PROJECT_FIELD_HELP = {
  customerId: 'Valitse asiakas, jolle projekti kuuluu. Näin tarjoukset ja yhteystiedot pysyvät oikean asiakkaan alla.',
  name: 'Projektin nimi on sisäinen otsikko, jonka perusteella löydät kohteen myöhemmin nopeasti.',
  site: 'Työkohde kertoo missä työ tehdään. Lisää osoite tai selkeä kohteen nimi, jotta se näkyy oikein tarjouksilla.',
  regionCoefficient: 'Aluekerroin auttaa korottamaan tai laskemaan hintoja alueen mukaan. Jätä arvoksi 1, jos et käytä aluekohtaista hinnoittelua.',
  ownerUserId: 'Vastuuhenkilö määrittää kenelle projekti kuuluu. Uudet tarjoukset perivät projektin tai asiakkaan vastuuhenkilön oletuksena.',
} as const;

const CUSTOMER_FIELD_HELP = {
  name: 'Asiakkaan nimi näkyy projekteilla, tarjouksilla ja dokumenteissa. Kirjoita nimi siinä muodossa kuin haluat sen näkyvän ulospäin.',
  contactPerson: 'Yhteyshenkilö helpottaa oikean henkilön tavoittamista, jos asiakkaalla on useita päätöksentekijöitä.',
  email: 'Sähköpostia voidaan käyttää tarjouksiin, yhteydenpitoon ja myöhemmin automatisoituihin viesteihin.',
  phone: 'Puhelinnumero auttaa nopeassa yhteydenotossa työmaan tai tarjousvaiheen aikana.',
  address: 'Osoite on hyödyllinen laskutuksessa, dokumenteissa ja asiakkaan tunnistamisessa.',
  ownerUserId: 'Vastuuhenkilö näkyy asiakaslistassa, projekteilla ja tarjouksilla. Omistaja tai admin voi vaihtaa vastuuhenkilön tästä.',
} as const;

const PAGE_FIELD_HELP = {
  ownerFilter: 'Rajaa näkyviin vain tietyn vastuuhenkilön asiakkaat, projektit ja tarjoukset. Omistaja tai admin voi vaihtaa näkymää tästä.',
} as const;

const QUOTE_STATUS_META = {
  draft: { label: 'Luonnos', variant: 'secondary' as const },
  sent: { label: 'Lähetetty', variant: 'outline' as const },
  accepted: { label: 'Hyväksytty', variant: 'default' as const },
  rejected: { label: 'Hylätty', variant: 'destructive' as const },
};

type QuoteStatusFilter = Quote['status'];

type ProjectWorkspaceStage = 'new' | 'drafting' | 'accepted';

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

interface ProjectsPageProps {
  routeState?: AppLocationState;
  onNavigate?: (location: AppLocationState, options?: { replace?: boolean }) => void;
}

export default function ProjectsPage({ routeState, onNavigate }: ProjectsPageProps) {
  const starterWorkspace = useStarterWorkspaceTemplate();
  const { user, users, canManageUsers } = useAuth();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { customers, addCustomer, updateCustomer, deleteCustomer, getCustomer } = useCustomers();
  const { invoices } = useInvoices();
  const { quotes, addQuote, getQuotesForProject, deleteQuote } = useQuotes();
  const { rows, deleteRow } = useQuoteRows();
  const { createQuoteTermsSnapshot, getDefaultTerms } = useQuoteTerms();
  const { settings } = useSettings();

  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [pendingCreatedQuoteId, setPendingCreatedQuoteId] = useState<string | null>(null);
  const [quoteListViewMode, setQuoteListViewMode] = useState<'cards' | 'table'>('cards');
  const [quoteListSearch, setQuoteListSearch] = useState('');
  const [quoteStatusFilters, setQuoteStatusFilters] = useState<Set<QuoteStatusFilter>>(new Set());
  const [quoteSortField, setQuoteSortField] = useState<QuoteListSortField>('updatedAt');
  const [quoteSortDirection, setQuoteSortDirection] = useState<QuoteListSortDirection>('desc');
  const [searchProjects, setSearchProjects] = useState('');
  const [searchCustomers, setSearchCustomers] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sidePanelTab, setSidePanelTab] = useState<'summary' | 'customers'>('customers');
  const selectedProjectId = routeState?.page === 'projects' ? routeState.projectId ?? null : null;
  const selectedQuoteId = routeState?.page === 'projects' ? routeState.quoteId ?? null : null;
  const showQuoteEditor = routeState?.page === 'projects' && routeState.editor === 'quote' && Boolean(routeState.quoteId);

  const responsibleUsers = [user, ...users]
    .filter((candidate): candidate is NonNullable<typeof user> => Boolean(candidate))
    .filter((candidate, index, collection) => collection.findIndex((item) => item.id === candidate.id) === index)
    .map((candidate) => ({ id: candidate.id, displayName: candidate.displayName }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'fi'));

  const resolveDefaultOwnerUserId = (fallback?: string | null) => {
    if (fallback) {
      return fallback;
    }

    if (canManageUsers && ownerFilter !== 'all') {
      return ownerFilter;
    }

    return user?.id || '';
  };

  const resolveResponsibleUserLabel = useCallback(
    (ownerUserId?: string | null) => getResponsibleUserLabel(ownerUserId, responsibleUsers),
    [responsibleUsers]
  );

  const [projectForm, setProjectForm] = useState({
    customerId: '',
    name: '',
    site: '',
    regionCoefficient: 1.0,
    ownerUserId: '',
    customOptions: [] as { id: string; label: string; value: string }[],
  });

  const [customerForm, setCustomerForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    ownerUserId: '',
  });

  const ownerScopedProjects = sortByUpdatedAtDesc(filterOwnedRecords(projects, ownerFilter));

  const filteredProjects = ownerScopedProjects.filter((project) => {
      const customer = getCustomer(project.customerId);
      const projectQuotes = filterOwnedRecords(getQuotesForProject(project.id), ownerFilter);
      const searchLower = searchProjects.trim().toLowerCase();
      const projectResponsibleLabel = resolveResponsibleUserLabel(project.ownerUserId || customer?.ownerUserId).toLowerCase();

      if (!searchLower) {
        return true;
      }

      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.site.toLowerCase().includes(searchLower) ||
        projectResponsibleLabel.includes(searchLower) ||
        (customer && customer.name.toLowerCase().includes(searchLower)) ||
        projectQuotes.some((quote) =>
          [
            quote.title,
            quote.quoteNumber,
            resolveResponsibleUserLabel(quote.ownerUserId || project.ownerUserId || customer?.ownerUserId),
            quote.status === 'draft'
              ? 'luonnos'
              : quote.status === 'sent'
                ? 'lähetetty'
                : quote.status === 'accepted'
                  ? 'hyväksytty'
                  : 'hylätty',
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(searchLower))
        )
      );
    });

  const filteredCustomers = sortByUpdatedAtDesc(
    filterOwnedRecords(customers, ownerFilter).filter((customer) => {
      const searchLower = searchCustomers.trim().toLowerCase();
      if (!searchLower) {
        return true;
      }

      return (
        customer.name.toLowerCase().includes(searchLower) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchLower)) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        resolveResponsibleUserLabel(customer.ownerUserId).toLowerCase().includes(searchLower)
      );
    })
  );

  const visibleQuotes = sortByUpdatedAtDesc(filterOwnedRecords(quotes, ownerFilter));
  const selectedProject = ownerScopedProjects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedCustomer = selectedProject ? getCustomer(selectedProject.customerId) : null;
  const selectedProjectQuotes = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }

    return sortByUpdatedAtDesc(filterOwnedRecords(getQuotesForProject(selectedProjectId), ownerFilter));
  }, [getQuotesForProject, ownerFilter, selectedProjectId]);
  const visibleSelectedProjectQuotes = useMemo(() => {
    const searchValue = quoteListSearch.trim().toLowerCase();

    const filtered = selectedProjectQuotes.filter((quote) => {
      if (quoteStatusFilters.size > 0 && !quoteStatusFilters.has(quote.status)) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

          const customerOwner = selectedCustomer?.ownerUserId;
          const responsibleLabel = resolveResponsibleUserLabel(quote.ownerUserId || selectedProject?.ownerUserId || customerOwner).toLowerCase();
          const statusLabel = QUOTE_STATUS_META[quote.status].label.toLowerCase();

          return (
            quote.title.toLowerCase().includes(searchValue) ||
            (quote.quoteNumber || '').toLowerCase().includes(searchValue) ||
            responsibleLabel.includes(searchValue) ||
            statusLabel.includes(searchValue)
          );
    });

    return sortQuotesForList(filtered, quoteSortField, quoteSortDirection);
  }, [quoteListSearch, quoteSortDirection, quoteSortField, quoteStatusFilters, resolveResponsibleUserLabel, selectedCustomer?.ownerUserId, selectedProject?.ownerUserId, selectedProjectQuotes]);
  const visibleSelectedQuoteIds = useMemo(() => visibleSelectedProjectQuotes.map((quote) => quote.id), [visibleSelectedProjectQuotes]);
  const allVisibleQuotesSelected =
    visibleSelectedQuoteIds.length > 0 && visibleSelectedQuoteIds.every((quoteId) => selectedQuotes.has(quoteId));
  const projectContext = useMemo(
    () =>
      selectedProject
        ? buildProjectWorkspaceContext(selectedProject.id, {
            customers,
            invoices,
            products: [],
            projects,
            quoteRows: rows,
            quotes,
          })
        : null,
    [customers, invoices, projects, quotes, rows, selectedProject]
  );
  const projectQuoteStats = {
    draft: selectedProjectQuotes.filter((quote) => quote.status === 'draft').length,
    sent: selectedProjectQuotes.filter((quote) => quote.status === 'sent').length,
    accepted: selectedProjectQuotes.filter((quote) => quote.status === 'accepted').length,
    rejected: selectedProjectQuotes.filter((quote) => quote.status === 'rejected').length,
  };
  const latestSelectedQuote = selectedProjectQuotes[0];
  const draftQuotes = visibleQuotes.filter((quote) => quote.status === 'draft');
  const nextProjectAction = projectContext?.nextAction ?? null;
  const latestProjectInvoice = projectContext?.latestInvoice ?? null;
  const projectWorkspaceStage: ProjectWorkspaceStage = useMemo(() => {
    if (!selectedProject || selectedProjectQuotes.length === 0) {
      return 'new';
    }

    if (projectQuoteStats.accepted > 0) {
      return 'accepted';
    }

    return 'drafting';
  }, [projectQuoteStats.accepted, selectedProject, selectedProjectQuotes.length]);

  useEffect(() => {
    if (!starterWorkspace) {
      return;
    }

    toast.success('Lisäsimme valmiiksi malliasiakkaan, malliprojektin ja mallitarjouksen. Voit muokata niitä suoraan oman työn pohjaksi.');
  }, [starterWorkspace]);

  const navigateToProjects = useCallback((
    nextState: Pick<AppLocationState, 'projectId' | 'quoteId' | 'editor'>,
    options?: { replace?: boolean }
  ) => {
    onNavigate?.(
      {
        page: 'projects',
        projectId: nextState.projectId,
        quoteId: nextState.quoteId,
        editor: nextState.editor,
      },
      options
    );
  }, [onNavigate]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const projectStillVisible = ownerScopedProjects.some((project) => project.id === selectedProjectId);
    if (!projectStillVisible) {
      setSelectedQuotes(new Set());
      setSidePanelTab('customers');
      navigateToProjects({}, { replace: true });
    }
  }, [navigateToProjects, ownerScopedProjects, selectedProjectId]);

  useEffect(() => {
    setQuoteStatusFilters(new Set());
    setQuoteListSearch('');
    setQuoteSortField('updatedAt');
    setQuoteSortDirection('desc');
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedQuoteId) {
      setPendingCreatedQuoteId(null);
    }
  }, [selectedQuoteId]);

  useEffect(() => {
    if (!selectedProject || !selectedQuoteId) {
      return;
    }

    const visibleQuoteIds = selectedProjectQuotes.map((quote) => quote.id);
    const shouldKeepEditorOpen = shouldKeepPendingQuoteEditorOpen({
      pendingCreatedQuoteId,
      selectedQuoteId,
      visibleQuoteIds,
    });

    if (visibleQuoteIds.includes(selectedQuoteId)) {
      setPendingCreatedQuoteId((current) => (current === selectedQuoteId ? null : current));
    }

    if (!shouldKeepEditorOpen) {
      navigateToProjects({ projectId: selectedProject.id }, { replace: true });
    }
  }, [navigateToProjects, pendingCreatedQuoteId, selectedProject, selectedProjectQuotes, selectedQuoteId]);

  useEffect(() => {
    if (selectedProject) {
      setSidePanelTab('summary');
    }
  }, [selectedProject]);

  const handleSaveProject = () => {
    if (!projectForm.customerId || !projectForm.name || !projectForm.site) {
      toast.error('Täytä kaikki pakolliset kentät');
      return;
    }

    const selectedFormCustomer = customers.find((customer) => customer.id === projectForm.customerId);
    const ownerUserId = projectForm.ownerUserId || selectedFormCustomer?.ownerUserId || user?.id;
    if (!ownerUserId) {
      toast.error('Valitse projektille vastuuhenkilö');
      return;
    }

    const nextProject = {
      ...projectForm,
      ownerUserId,
    };

    if (editingProject) {
      updateProject(editingProject.id, nextProject);
      toast.success('Projekti päivitetty');
    } else {
      addProject(nextProject);
      toast.success('Projekti luotu');
    }

    setShowProjectDialog(false);
    setEditingProject(null);
    setProjectForm({ customerId: '', name: '', site: '', regionCoefficient: 1.0, ownerUserId: resolveDefaultOwnerUserId(), customOptions: [] });
  };

  const handleSaveCustomer = () => {
    if (!customerForm.name) {
      toast.error('Anna asiakkaan nimi');
      return;
    }

    const ownerUserId = customerForm.ownerUserId || user?.id;
    if (!ownerUserId) {
      toast.error('Valitse asiakkaalle vastuuhenkilö');
      return;
    }

    const nextCustomer = {
      ...customerForm,
      ownerUserId,
    };

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, nextCustomer);
      toast.success('Asiakas päivitetty');
    } else {
      addCustomer(nextCustomer);
      toast.success('Asiakas luotu');
    }

    setShowCustomerDialog(false);
    setEditingCustomer(null);
    setCustomerForm({ name: '', contactPerson: '', email: '', phone: '', address: '', ownerUserId: resolveDefaultOwnerUserId() });
  };

  const handleEditProject = (project: Project) => {
    const customer = getCustomer(project.customerId);
    setEditingProject(project);
    setProjectForm({
      customerId: project.customerId,
      name: project.name,
      site: project.site,
      regionCoefficient: project.regionCoefficient,
      ownerUserId: project.ownerUserId || customer?.ownerUserId || resolveDefaultOwnerUserId(customer?.ownerUserId),
      customOptions: project.customOptions || [],
    });
    setShowProjectDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      ownerUserId: customer.ownerUserId || resolveDefaultOwnerUserId(customer.ownerUserId),
    });
    setShowCustomerDialog(true);
  };

  const deleteQuoteWithRows = (quoteId: string) => {
    rows
      .filter((row) => row.quoteId === quoteId)
      .forEach((row) => deleteRow(row.id));
    deleteQuote(quoteId);
  };

  const handleDeleteProject = (id: string) => {
    const projectQuotes = getQuotesForProject(id);
    const projectQuoteRows = rows.filter((row) => projectQuotes.some((quote) => quote.id === row.quoteId));
    const confirmMessage = projectQuotes.length > 0
      ? `Haluatko varmasti poistaa projektin? Tämä poistaa myös ${projectQuotes.length} tarjousta ja ${projectQuoteRows.length} riviä.`
      : 'Haluatko varmasti poistaa projektin?';

    if (confirm(confirmMessage)) {
      const deletedQuoteIds = new Set(projectQuotes.map((quote) => quote.id));
      setSelectedQuotes((current) => new Set([...current].filter((quoteId) => !deletedQuoteIds.has(quoteId))));

      projectQuoteRows.forEach((row) => deleteRow(row.id));
      projectQuotes.forEach((quote) => deleteQuote(quote.id));
      deleteProject(id);

      if (selectedProjectId === id) {
        navigateToProjects({}, { replace: true });
      }

      toast.success(projectQuotes.length > 0 ? 'Projekti ja siihen liittyvät tarjoukset poistettu' : 'Projekti poistettu');
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const customerProjects = projects.filter((project) => project.customerId === id);
    if (customerProjects.length > 0) {
      toast.error('Asiakkaalla on projekteja, poista ne ensin');
      return;
    }

    if (confirm('Haluatko varmasti poistaa asiakkaan?')) {
      deleteCustomer(id);
      toast.success('Asiakas poistettu');
    }
  };

  const handleCreateQuote = (projectId: string) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) {
      toast.error('Projektia ei löytynyt.');
      return;
    }

    const customer = customers.find((candidate) => candidate.id === project.customerId);

    const defaultTerms = getDefaultTerms();
    const termsSnapshot = createQuoteTermsSnapshot(defaultTerms);
    const newQuote = addQuote({
      projectId,
      title: `${project.name} tarjous`,
      quoteNumber: '',
      revisionNumber: 1,
      ...termsSnapshot,
      pricingMode: 'margin',
      selectedMarginPercent: settings.defaultMarginPercent,
      vatPercent: settings.defaultVatPercent,
      discountType: 'none',
      discountValue: 0,
      projectCosts: 0,
      deliveryCosts: 0,
      installationCosts: 0,
      notes: '',
      internalNotes: '',
      ownerUserId: project.ownerUserId || customer?.ownerUserId || user?.id,
      scheduleMilestones: [],
    });

    setPendingCreatedQuoteId(newQuote.id);
    navigateToProjects({ projectId, quoteId: newQuote.id, editor: 'quote' });
  };

  const handleProjectWorkspaceTask = (task: WorkspaceTask) => {
    const execution = resolveWorkspaceTaskExecution(task);

    if (execution.kind === 'create-quote') {
      handleCreateQuote(execution.projectId);
      return;
    }

    onNavigate?.(execution.target);
  };

  const handleEditQuote = (projectId: string, quoteId: string) => {
    setPendingCreatedQuoteId(null);
    navigateToProjects({ projectId, quoteId, editor: 'quote' });
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm('Haluatko varmasti poistaa tarjouksen?')) {
      deleteQuoteWithRows(quoteId);
      setSelectedQuotes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(quoteId);
        return newSet;
      });

      if (selectedQuoteId === quoteId) {
        navigateToProjects(selectedProjectId ? { projectId: selectedProjectId } : {}, { replace: true });
      }

      toast.success('Tarjous poistettu');
    }
  };

  const handleBulkDeleteQuotes = () => {
    if (selectedQuotes.size === 0) {
      toast.error('Valitse poistettavat tarjoukset');
      return;
    }

    if (confirm(`Haluatko varmasti poistaa ${selectedQuotes.size} tarjousta?`)) {
      selectedQuotes.forEach((id) => deleteQuoteWithRows(id));
      setSelectedQuotes(new Set());
      toast.success(`${selectedQuotes.size} tarjousta poistettu`);
    }
  };

  const toggleQuoteSelection = (quoteId: string) => {
    setSelectedQuotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  const toggleQuoteStatusFilter = (status: QuoteStatusFilter) => {
    setQuoteStatusFilters((current) => {
      const next = new Set(current);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleQuoteSortHeaderClick = (field: QuoteListSortField) => {
    if (field === quoteSortField) {
      setQuoteSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setQuoteSortField(field);
    setQuoteSortDirection(field === 'updatedAt' ? 'desc' : 'asc');
  };

  const getQuoteSortIndicator = (field: QuoteListSortField) => {
    if (quoteSortField !== field) {
      return '';
    }

    return quoteSortDirection === 'asc' ? 'asc' : 'desc';
  };

  const toggleSelectAllVisibleQuotes = useCallback(() => {
    setSelectedQuotes((current) => {
      const next = new Set(current);

      if (allVisibleQuotesSelected) {
        visibleSelectedQuoteIds.forEach((quoteId) => next.delete(quoteId));
      } else {
        visibleSelectedQuoteIds.forEach((quoteId) => next.add(quoteId));
      }

      return next;
    });
  }, [allVisibleQuotesSelected, visibleSelectedQuoteIds]);

  const handleSelectProject = (projectId: string) => {
    if (selectedProjectId !== projectId) {
      setSelectedQuotes(new Set());
    }
    navigateToProjects({ projectId });
  };

  useEffect(() => {
    if (!selectedProject || showQuoteEditor) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isShortcutInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && key === 'a') {
        event.preventDefault();
        toggleSelectAllVisibleQuotes();
        return;
      }

      if (!hasModifier && !event.altKey && key === 'v') {
        event.preventDefault();
        setQuoteListViewMode((current) => (current === 'cards' ? 'table' : 'cards'));
        return;
      }

      if (key === 'escape') {
        if (selectedQuotes.size > 0) {
          event.preventDefault();
          setSelectedQuotes(new Set());
        }
        return;
      }

      if ((key === 'delete' || key === 'backspace') && selectedQuotes.size > 0) {
        event.preventDefault();

        if (confirm(`Haluatko varmasti poistaa ${selectedQuotes.size} tarjousta?`)) {
          [...selectedQuotes].forEach((quoteId) => {
            rows
              .filter((row) => row.quoteId === quoteId)
              .forEach((row) => deleteRow(row.id));
            deleteQuote(quoteId);
          });
          setSelectedQuotes(new Set());
          toast.success(`${selectedQuotes.size} tarjousta poistettu`);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deleteQuote, deleteRow, rows, selectedProject, selectedQuotes, showQuoteEditor, toggleSelectAllVisibleQuotes]);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">Projektityötila</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Valitse projekti vasemmalta, hallitse tarjouksia keskellä ja pidä asiakas- sekä vastuukonteksti oikealla.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {canManageUsers && responsibleUsers.length > 0 && (
            <div className="w-full lg:w-72">
              <FieldHelpLabel
                htmlFor="owner-filter"
                label="Vastuuhenkilö"
                help={PAGE_FIELD_HELP.ownerFilter}
                className="mb-2"
              />
              <select
                id="owner-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
              >
                <option value="all">Kaikki vastuuhenkilöt</option>
                {responsibleUsers.map((responsibleUser) => (
                  <option key={responsibleUser.id} value={responsibleUser.id}>{responsibleUser.displayName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingProject(null);
                    setProjectForm({
                      customerId: '',
                      name: '',
                      site: '',
                      regionCoefficient: 1.0,
                      ownerUserId: resolveDefaultOwnerUserId(),
                      customOptions: [],
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Uusi projekti
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Muokkaa projektia' : 'Uusi projekti'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <FieldHelpLabel htmlFor="customer" label="Asiakas" required help={PROJECT_FIELD_HELP.customerId} className="mb-2" />
                    <select
                      id="customer"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={projectForm.customerId}
                      onChange={(event) => {
                        const nextCustomerId = event.target.value;
                        const nextCustomer = customers.find((customer) => customer.id === nextCustomerId);
                        setProjectForm((current) => ({
                          ...current,
                          customerId: nextCustomerId,
                          ownerUserId: current.ownerUserId || nextCustomer?.ownerUserId || current.ownerUserId,
                        }));
                      }}
                    >
                      <option value="">Valitse asiakas...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="project-name" label="Projektin nimi" required help={PROJECT_FIELD_HELP.name} className="mb-2" />
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                      placeholder="Esim. Kylpyhuoneremontti"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="site" label="Työkohde" required help={PROJECT_FIELD_HELP.site} className="mb-2" />
                    <Input
                      id="site"
                      value={projectForm.site}
                      onChange={(event) => setProjectForm({ ...projectForm, site: event.target.value })}
                      placeholder="Esim. Mannerheimintie 1, Helsinki"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="coefficient" label="Aluekohtainen kerroin" help={PROJECT_FIELD_HELP.regionCoefficient} className="mb-2" />
                    <Input
                      id="coefficient"
                      type="number"
                      step="0.1"
                      value={projectForm.regionCoefficient}
                      onChange={(event) => setProjectForm({ ...projectForm, regionCoefficient: parseFloat(event.target.value) || 1.0 })}
                    />
                  </div>
                  {canManageUsers && responsibleUsers.length > 0 && (
                    <div>
                      <FieldHelpLabel htmlFor="project-owner" label="Vastuuhenkilö" required help={PROJECT_FIELD_HELP.ownerUserId} className="mb-2" />
                      <select
                        id="project-owner"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={projectForm.ownerUserId || resolveDefaultOwnerUserId()}
                        onChange={(event) => setProjectForm({ ...projectForm, ownerUserId: event.target.value })}
                      >
                        {responsibleUsers.map((responsibleUser) => (
                          <option key={responsibleUser.id} value={responsibleUser.id}>{responsibleUser.displayName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button onClick={handleSaveProject} className="w-full">
                    {editingProject ? 'Päivitä' : 'Luo projekti'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({
                      name: '',
                      contactPerson: '',
                      email: '',
                      phone: '',
                      address: '',
                      ownerUserId: resolveDefaultOwnerUserId(),
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Uusi asiakas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? 'Muokkaa asiakasta' : 'Uusi asiakas'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <FieldHelpLabel htmlFor="customer-name" label="Nimi" required help={CUSTOMER_FIELD_HELP.name} className="mb-2" />
                    <Input
                      id="customer-name"
                      value={customerForm.name}
                      onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                      placeholder="Yritys Oy"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="contact-person" label="Yhteyshenkilö" help={CUSTOMER_FIELD_HELP.contactPerson} className="mb-2" />
                    <Input
                      id="contact-person"
                      value={customerForm.contactPerson}
                      onChange={(event) => setCustomerForm({ ...customerForm, contactPerson: event.target.value })}
                      placeholder="Matti Meikäläinen"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="email" label="Sähköposti" help={CUSTOMER_FIELD_HELP.email} className="mb-2" />
                    <Input
                      id="email"
                      type="email"
                      value={customerForm.email}
                      onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                      placeholder="matti@yritys.fi"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="phone" label="Puhelin" help={CUSTOMER_FIELD_HELP.phone} className="mb-2" />
                    <Input
                      id="phone"
                      value={customerForm.phone}
                      onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="address" label="Osoite" help={CUSTOMER_FIELD_HELP.address} className="mb-2" />
                    <Input
                      id="address"
                      value={customerForm.address}
                      onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
                      placeholder="Mannerheimintie 1, 00100 Helsinki"
                    />
                  </div>
                  {canManageUsers && responsibleUsers.length > 0 && (
                    <div>
                      <FieldHelpLabel htmlFor="customer-owner" label="Vastuuhenkilö" required help={CUSTOMER_FIELD_HELP.ownerUserId} className="mb-2" />
                      <select
                        id="customer-owner"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={customerForm.ownerUserId || resolveDefaultOwnerUserId()}
                        onChange={(event) => setCustomerForm({ ...customerForm, ownerUserId: event.target.value })}
                      >
                        {responsibleUsers.map((responsibleUser) => (
                          <option key={responsibleUser.id} value={responsibleUser.id}>{responsibleUser.displayName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button onClick={handleSaveCustomer} className="w-full">
                    {editingCustomer ? 'Päivitä' : 'Luo asiakas'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Projektit', value: filteredProjects.length, detail: 'Näkyvät tämän suodatuksen alla', icon: Building },
          { label: 'Asiakkaat', value: filteredCustomers.length, detail: 'Aktiivinen asiakaskanta', icon: Users },
          { label: 'Tarjoukset', value: visibleQuotes.length, detail: 'Projektityötilan tarjoukset', icon: FileText },
          { label: 'Luonnokset', value: draftQuotes.length, detail: 'Vaativat viimeistelyä tai seurantaa', icon: Clock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-slate-200/80 px-5 py-5 shadow-[0_18px_40px_-40px_rgba(15,23,42,0.4)]">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                  <Icon className="h-5 w-5" weight="fill" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(280px,320px)]">
        <Card className="overflow-hidden border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <div className="border-b px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Projektit</h2>
                <p className="text-sm text-muted-foreground">Valitse projekti työtilaan. Muut toiminnot pysyvät tämän paneelin ulkopuolella.</p>
              </div>
              <Badge variant="outline">{filteredProjects.length}</Badge>
            </div>
            <div className="relative mt-4">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchProjects}
                onChange={(event) => setSearchProjects(event.target.value)}
                placeholder="Hae projektia, asiakasta tai tarjousnumeroa..."
                className="pl-10"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-muted-foreground">
              <Building className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>{projects.length === 0 ? 'Ei projekteja vielä. Luo ensimmäinen projekti aloittaaksesi.' : 'Ei hakutuloksia tällä suodatuksella.'}</p>
            </div>
          ) : (
            <div className="max-h-[640px] space-y-3 overflow-y-auto p-4">
              {filteredProjects.map((project) => {
                const customer = getCustomer(project.customerId);
                const projectQuotes = sortByUpdatedAtDesc(filterOwnedRecords(getQuotesForProject(project.id), ownerFilter));
                const projectResponsibleLabel = resolveResponsibleUserLabel(project.ownerUserId || customer?.ownerUserId);
                const isSelected = selectedProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProject(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectProject(project.id);
                      }
                    }}
                    className={cn(
                      'rounded-2xl border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
                      isSelected ? 'border-primary bg-primary/5 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.45)]' : 'border-slate-200 bg-white hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-950">{project.name}</h3>
                          {isSelected && <Badge variant="default">Valittu</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{customer?.name || 'Ei asiakasta'}</p>
                        <p className="text-sm text-muted-foreground">{project.site}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Vastuuhenkilö: {projectResponsibleLabel}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditProject(project);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">{projectQuotes.length} tarjous{projectQuotes.length !== 1 ? 'ta' : ''}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCreateQuote(project.id);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Uusi tarjous
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
            {selectedProject ? (
              <div className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Valittu projekti</Badge>
                      <Badge variant="secondary">{selectedProjectQuotes.length} tarjous{selectedProjectQuotes.length !== 1 ? 'ta' : ''}</Badge>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedProject.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedCustomer?.name || 'Ei asiakasta'} • {selectedProject.site}</p>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Tässä näkymässä hallitset yhden projektin tarjouksia ja pidät asiakkaan perustiedot näkyvissä ilman erillisiä listoja.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleCreateQuote(selectedProject.id)}>
                      <Plus className="h-4 w-4" />
                      Uusi tarjous
                    </Button>
                    <Button variant="outline" onClick={() => handleEditProject(selectedProject)}>
                      <Pencil className="h-4 w-4" />
                      Muokkaa projektia
                    </Button>
                    <Button variant="ghost" onClick={() => navigateToProjects({})}>
                      <X className="h-4 w-4" />
                      Tyhjennä valinta
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {([
                    { key: 'draft', label: 'Luonnokset', value: projectQuoteStats.draft },
                    { key: 'sent', label: 'Lähetetyt', value: projectQuoteStats.sent },
                    { key: 'accepted', label: 'Hyväksytyt', value: projectQuoteStats.accepted },
                    { key: 'rejected', label: 'Hylätyt', value: projectQuoteStats.rejected },
                  ] as const).map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-950">Projektin vaihe</p>
                        {projectWorkspaceStage === 'new' && <Badge variant="secondary">Uusi projekti</Badge>}
                        {projectWorkspaceStage === 'drafting' && <Badge variant="outline">Tarjousvaihe käynnissä</Badge>}
                        {projectWorkspaceStage === 'accepted' && <Badge variant="default">Hyväksytty vaihe</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {projectWorkspaceStage === 'new' && 'Aloita luomalla ensimmäinen tarjous tähän projektiin.'}
                        {projectWorkspaceStage === 'drafting' && 'Tarjoukset ovat työn alla. Jatka viimeisintä tarjousta tai luo uusi versio.'}
                        {projectWorkspaceStage === 'accepted' && 'Projektilla on hyväksyttyjä tarjouksia. Seuraava luonteva vaihe on laskutus.'}
                      </p>
                      {latestSelectedQuote && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Viimeisin tarjous: {latestSelectedQuote.title} • {new Date(latestSelectedQuote.updatedAt).toLocaleDateString('fi-FI')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {projectWorkspaceStage === 'new' && (
                        <Button variant="outline" onClick={() => handleCreateQuote(selectedProject.id)}>
                          <FileText className="h-4 w-4" />
                          Luo ensimmäinen tarjous
                        </Button>
                      )}
                      {projectWorkspaceStage === 'drafting' && latestSelectedQuote && (
                        <Button variant="outline" onClick={() => handleEditQuote(selectedProject.id, latestSelectedQuote.id)}>
                          <FileText className="h-4 w-4" />
                          Jatka viimeisintä tarjousta
                        </Button>
                      )}
                      {projectWorkspaceStage === 'accepted' && (
                        <Button variant="outline" onClick={() => onNavigate?.({ page: 'invoices' })}>
                          <FileText className="h-4 w-4" />
                          Siirry laskutukseen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Seuraava työ</p>
                    {nextProjectAction ? (
                      <>
                        <p className="mt-3 font-medium text-slate-950">{nextProjectAction.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextProjectAction.reason}</p>
                        <Button className="mt-4 w-full justify-between" variant="outline" onClick={() => handleProjectWorkspaceTask(nextProjectAction)}>
                          {nextProjectAction.ctaLabel}
                          <FileText className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Tässä projektissa ei ole juuri nyt kiireellisiä toimenpiteitä.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Laskutuskonteksti</p>
                    {latestProjectInvoice ? (
                      <>
                        <p className="mt-3 font-medium text-slate-950">{latestProjectInvoice.invoiceNumber}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{getInvoiceStatusLabel(latestProjectInvoice.status)}{isInvoiceOverdue(latestProjectInvoice) ? ' • Erääntynyt' : ''}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Luonnoksia {projectContext?.draftInvoiceCount || 0} • Erääntyneitä {projectContext?.overdueInvoiceCount || 0}</p>
                        <Button className="mt-4 w-full justify-between" variant="outline" onClick={() => onNavigate?.({ page: 'invoices', invoiceId: latestProjectInvoice.id })}>
                          Avaa lasku
                          <FileText className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {projectContext?.acceptedWithoutInvoiceCount
                          ? `Hyväksyttyjä tarjouksia ilman laskua: ${projectContext.acceptedWithoutInvoiceCount}.`
                          : 'Projektilla ei ole vielä laskuja.'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Työtilan fokus</p>
                    <p className="mt-3 font-medium text-slate-950">
                      {projectWorkspaceStage === 'new' && 'Aloitus ja ensimmäinen tarjous'}
                      {projectWorkspaceStage === 'drafting' && `${projectContext?.tasks.length || 0} aktiivista toimenpidettä tarjousvaiheessa`}
                      {projectWorkspaceStage === 'accepted' && 'Laskutus ja toteuman seuranta'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Tarjoukset, laskutus ja asiakaskonteksti pysyvät tässä projektissa samassa näkymässä. Työvaiheen fokus vaihtuu automaattisesti projektin tilanteen mukaan.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
                <h2 className="text-xl font-semibold text-slate-950">Valitse projekti työtilaan</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Vasemman paneelin projektivalinta avaa tarjoukset ja asiakaskontekstin samaan näkymään. Näin työ alkaa yhdestä selkeästä paikasta.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button onClick={() => setShowProjectDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Luo projekti
                  </Button>
                  <Button variant="outline" onClick={() => setShowCustomerDialog(true)}>
                    <Users className="h-4 w-4" />
                    Luo asiakas
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {selectedProject && (
            <Card className="overflow-hidden border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
              <div className="border-b px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Tarjoukset</h2>
                    <p className="text-sm text-muted-foreground">Projektin aktiiviset ja aiemmat tarjoukset samassa listassa.</p>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                    <Input
                      value={quoteListSearch}
                      onChange={(event) => setQuoteListSearch(event.target.value)}
                      placeholder="Hae tarjousta, numeroa, tilaa tai vastuuhenkilöä..."
                      className="w-full lg:w-80"
                    />
                    {quoteListViewMode === 'cards' && (
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={`${quoteSortField}_${quoteSortDirection}`}
                        onChange={(event) => {
                          const [field, direction] = event.target.value.split('_') as [QuoteListSortField, QuoteListSortDirection];
                          setQuoteSortField(field);
                          setQuoteSortDirection(direction);
                        }}
                      >
                        <option value="updatedAt_desc">Uusin ensin</option>
                        <option value="updatedAt_asc">Vanhin ensin</option>
                        <option value="title_asc">Nimi A-Z</option>
                        <option value="title_desc">Nimi Z-A</option>
                        <option value="status_asc">Tila A-Z</option>
                        <option value="status_desc">Tila Z-A</option>
                      </select>
                    )}
                  </div>

                  <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                    <Button
                      size="sm"
                      variant={quoteStatusFilters.size === 0 ? 'default' : 'outline'}
                      onClick={() => setQuoteStatusFilters(new Set())}
                    >
                      Kaikki
                    </Button>
                    {(Object.entries(QUOTE_STATUS_META) as Array<[QuoteStatusFilter, (typeof QUOTE_STATUS_META)[QuoteStatusFilter]]>).map(([status, meta]) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={quoteStatusFilters.has(status) ? 'default' : 'outline'}
                        onClick={() => toggleQuoteStatusFilter(status)}
                      >
                        {meta.label}
                      </Button>
                    ))}
                  </div>

                  {selectedQuotes.size > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{selectedQuotes.size} valittu</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuoteListViewMode((current) => (current === 'cards' ? 'table' : 'cards'))}
                      >
                        {quoteListViewMode === 'cards' ? 'Taulukkotila' : 'Korttitila'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedQuotes(new Set())}>
                        <X className="h-4 w-4" />
                        Tyhjennä
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleBulkDeleteQuotes}>
                        <Trash className="h-4 w-4" />
                        Poista valitut
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted-foreground">Avaa tarjous editoriin klikkaamalla riviä.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuoteListViewMode((current) => (current === 'cards' ? 'table' : 'cards'))}
                      >
                        {quoteListViewMode === 'cards' ? 'Taulukkotila' : 'Korttitila'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {selectedProjectQuotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                    Tälle projektille ei ole vielä tarjouksia. Luo ensimmäinen tarjous työtilan päätoiminnolla.
                  </div>
                ) : visibleSelectedProjectQuotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                    Hakuehdoilla ei löytynyt tarjouksia. Kokeile toista hakua tai poista suodatus.
                  </div>
                ) : quoteListViewMode === 'table' ? (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[56px]">
                            <Checkbox
                              checked={allVisibleQuotesSelected}
                              onCheckedChange={toggleSelectAllVisibleQuotes}
                              aria-label="Valitse kaikki näkyvät tarjoukset"
                            />
                          </TableHead>
                          <TableHead>
                            <button type="button" className="font-medium" onClick={() => handleQuoteSortHeaderClick('title')}>
                              Tarjous {getQuoteSortIndicator('title')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="font-medium" onClick={() => handleQuoteSortHeaderClick('status')}>
                              Tila {getQuoteSortIndicator('status')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="font-medium" onClick={() => handleQuoteSortHeaderClick('updatedAt')}>
                              Päivitetty {getQuoteSortIndicator('updatedAt')}
                            </button>
                          </TableHead>
                          <TableHead>Vastuuhenkilö</TableHead>
                          <TableHead className="w-[64px]">Toimet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleSelectedProjectQuotes.map((quote) => {
                          const statusMeta = QUOTE_STATUS_META[quote.status];
                          return (
                            <TableRow key={quote.id} className="cursor-pointer" onClick={() => handleEditQuote(selectedProject.id, quote.id)}>
                              <TableCell onClick={(event) => event.stopPropagation()}>
                                <Checkbox
                                  checked={selectedQuotes.has(quote.id)}
                                  onCheckedChange={() => toggleQuoteSelection(quote.id)}
                                  aria-label={`Valitse tarjous ${quote.title}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-slate-950">{quote.title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {quote.quoteNumber && <span className="rounded border px-1.5 py-0.5 font-mono">{quote.quoteNumber}</span>}
                                  <span>v{quote.revisionNumber}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                              </TableCell>
                              <TableCell>{new Date(quote.updatedAt).toLocaleString('fi-FI')}</TableCell>
                              <TableCell>{resolveResponsibleUserLabel(quote.ownerUserId || selectedProject.ownerUserId || selectedCustomer?.ownerUserId)}</TableCell>
                              <TableCell onClick={(event) => event.stopPropagation()}>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteQuote(quote.id)} className="h-8 w-8 p-0">
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleSelectedProjectQuotes.map((quote) => {
                      const statusMeta = QUOTE_STATUS_META[quote.status];
                      return (
                        <div key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-32px_rgba(15,23,42,0.45)]">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedQuotes.has(quote.id)}
                              onCheckedChange={() => toggleQuoteSelection(quote.id)}
                              aria-label={`Valitse tarjous ${quote.title}`}
                            />
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleEditQuote(selectedProject.id, quote.id)}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-slate-950">{quote.title}</p>
                                    {quote.quoteNumber && (
                                      <Badge variant="outline" className="font-mono text-xs">{quote.quoteNumber}</Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">v{quote.revisionNumber}</Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Vastuuhenkilö: {resolveResponsibleUserLabel(quote.ownerUserId || selectedProject.ownerUserId || selectedCustomer?.ownerUserId)}
                                  </p>
                                  <p className="mt-2 text-sm text-muted-foreground">Päivitetty {new Date(quote.updatedAt).toLocaleString('fi-FI')}</p>
                                </div>
                                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {showQuoteEditor && selectedProjectId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Tarjouseditori</h2>
                  <p className="text-sm text-muted-foreground">Muokkaa valittua tarjousta ilman että poistut projektityötilasta.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigateToProjects(selectedProjectId ? { projectId: selectedProjectId } : {});
                  }}
                >
                  <X className="h-4 w-4" />
                  Piilota editori
                </Button>
              </div>
              <QuoteEditor
                projectId={selectedProjectId}
                quoteId={selectedQuoteId}
                onClose={() => {
                  navigateToProjects(selectedProjectId ? { projectId: selectedProjectId } : {});
                }}
              />
            </div>
          )}
        </div>

        <Card className="overflow-hidden border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <Tabs value={sidePanelTab} onValueChange={(value) => setSidePanelTab(value as 'summary' | 'customers')} className="gap-0">
            <div className="border-b px-4 py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Yhteenveto</TabsTrigger>
                <TabsTrigger value="customers">Asiakkaat</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="space-y-4 p-4">
              {selectedProject ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projektin tiedot</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">{selectedProject.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedProject.site}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Vastuuhenkilö: {resolveResponsibleUserLabel(selectedProject.ownerUserId || selectedCustomer?.ownerUserId)}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Asiakas</p>
                    <p className="mt-3 text-base font-semibold text-slate-950">{selectedCustomer?.name || 'Ei asiakasta'}</p>
                    {selectedCustomer?.contactPerson && <p className="mt-2 text-sm text-muted-foreground">{selectedCustomer.contactPerson}</p>}
                    {selectedCustomer?.email && <p className="mt-1 text-sm text-muted-foreground">{selectedCustomer.email}</p>}
                    {selectedCustomer?.phone && <p className="mt-1 text-sm text-muted-foreground">{selectedCustomer.phone}</p>}
                    {selectedCustomer?.address && <p className="mt-1 text-sm text-muted-foreground">{selectedCustomer.address}</p>}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tilanne nyt</p>
                    <div className="mt-3 space-y-3">
                      {([
                        { key: 'draft', label: 'Luonnoksia', value: projectQuoteStats.draft },
                        { key: 'sent', label: 'Lähetettyjä', value: projectQuoteStats.sent },
                        { key: 'accepted', label: 'Hyväksyttyjä', value: projectQuoteStats.accepted },
                      ] as const).map((item) => (
                        <div key={item.key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-slate-950">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                  Valitse projekti vasemmalta nähdäksesi asiakkaan tiedot, vastuuhenkilön ja tarjousyhteenvedon.
                </div>
              )}
            </TabsContent>

            <TabsContent value="customers" className="space-y-4 p-4">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchCustomers}
                  onChange={(event) => setSearchCustomers(event.target.value)}
                  placeholder="Hae asiakasta tai vastuuhenkilöä..."
                  className="pl-10"
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                  {customers.length === 0 ? 'Ei asiakkaita vielä. Luo ensimmäinen asiakas tästä näkymästä.' : 'Ei hakutuloksia tällä suodatuksella.'}
                </div>
              ) : (
                <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {filteredCustomers.map((customer) => {
                    const customerProjects = projects.filter((project) => project.customerId === customer.id);
                    const isSelectedCustomer = selectedCustomer?.id === customer.id;

                    return (
                      <div
                        key={customer.id}
                        className={cn(
                          'rounded-2xl border p-4 transition-colors',
                          isSelectedCustomer ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-slate-950">{customer.name}</h3>
                              {isSelectedCustomer && <Badge variant="default">Valitun projektin asiakas</Badge>}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">Vastuuhenkilö: {resolveResponsibleUserLabel(customer.ownerUserId)}</p>
                            {customer.contactPerson && <p className="mt-2 text-sm text-muted-foreground">{customer.contactPerson}</p>}
                            {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                            {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                            <p className="mt-2 text-xs text-muted-foreground">{customerProjects.length} projekti{customerProjects.length !== 1 ? 'a' : ''}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditCustomer(customer)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteCustomer(customer.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
