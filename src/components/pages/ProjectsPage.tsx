import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash, FileText, Building, Users, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useProjects, useCustomers, useQuotes, useQuoteRows, useQuoteTerms, useSettings, useStarterWorkspaceTemplate } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import { Project, Customer } from '../../lib/types';
import { filterOwnedRecords, getResponsibleUserLabel } from '../../lib/ownership';
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

export default function ProjectsPage() {
  const starterWorkspace = useStarterWorkspaceTemplate();
  const { user, users, canManageUsers } = useAuth();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { customers, addCustomer, updateCustomer, deleteCustomer, getCustomer } = useCustomers();
  const { addQuote, getQuotesForProject, deleteQuote } = useQuotes();
  const { rows, deleteRow } = useQuoteRows();
  const { createQuoteTermsSnapshot, getDefaultTerms } = useQuoteTerms();
  const { settings } = useSettings();
  
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [searchProjects, setSearchProjects] = useState('');
  const [searchCustomers, setSearchCustomers] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');

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

  const resolveResponsibleUserLabel = (ownerUserId?: string | null) =>
    getResponsibleUserLabel(ownerUserId, responsibleUsers);
  
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

  const filteredProjects = filterOwnedRecords(projects, ownerFilter).filter(project => {
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
          quote.status === 'draft' ? 'luonnos' :
          quote.status === 'sent' ? 'lähetetty' :
          quote.status === 'accepted' ? 'hyväksytty' :
          'hylätty',
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchLower))
      )
    );
  });

  const filteredCustomers = filterOwnedRecords(customers, ownerFilter).filter((customer) => {
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
  });

  useEffect(() => {
    if (!starterWorkspace) {
      return;
    }

    toast.success('Lisäsimme valmiiksi malliasiakkaan, malliprojektin ja mallitarjouksen. Voit muokata niitä suoraan oman työn pohjaksi.');
  }, [starterWorkspace]);

  const handleSaveProject = () => {
    if (!projectForm.customerId || !projectForm.name || !projectForm.site) {
      toast.error('Täytä kaikki pakolliset kentät');
      return;
    }

    const selectedCustomer = customers.find((customer) => customer.id === projectForm.customerId);
    const ownerUserId = projectForm.ownerUserId || selectedCustomer?.ownerUserId || user?.id;
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
      .filter(row => row.quoteId === quoteId)
      .forEach(row => deleteRow(row.id));
    deleteQuote(quoteId);
  };

  const handleDeleteProject = (id: string) => {
    const projectQuotes = getQuotesForProject(id);
    const projectQuoteRows = rows.filter(row => projectQuotes.some(quote => quote.id === row.quoteId));
    const confirmMessage = projectQuotes.length > 0
      ? `Haluatko varmasti poistaa projektin? Tämä poistaa myös ${projectQuotes.length} tarjousta ja ${projectQuoteRows.length} riviä.`
      : 'Haluatko varmasti poistaa projektin?';

    if (confirm(confirmMessage)) {
      projectQuoteRows.forEach(row => deleteRow(row.id));
      projectQuotes.forEach(quote => deleteQuote(quote.id));
      deleteProject(id);

      if (selectedProjectId === id) {
        setShowQuoteEditor(false);
        setSelectedProjectId(null);
        setSelectedQuoteId(null);
      }

      toast.success(projectQuotes.length > 0 ? 'Projekti ja siihen liittyvät tarjoukset poistettu' : 'Projekti poistettu');
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const customerProjects = projects.filter(p => p.customerId === id);
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

    setSelectedProjectId(projectId);
    setSelectedQuoteId(newQuote.id);
    setShowQuoteEditor(true);
  };

  const handleEditQuote = (projectId: string, quoteId: string) => {
    setSelectedProjectId(projectId);
    setSelectedQuoteId(quoteId);
    setShowQuoteEditor(true);
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm('Haluatko varmasti poistaa tarjouksen?')) {
      deleteQuoteWithRows(quoteId);
      setSelectedQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quoteId);
        return newSet;
      });

      if (selectedQuoteId === quoteId) {
        setShowQuoteEditor(false);
        setSelectedProjectId(null);
        setSelectedQuoteId(null);
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
      selectedQuotes.forEach(id => deleteQuoteWithRows(id));
      setSelectedQuotes(new Set());
      toast.success(`${selectedQuotes.size} tarjousta poistettu`);
    }
  };

  const toggleQuoteSelection = (quoteId: string) => {
    setSelectedQuotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Projektit ja Asiakkaat</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Hallinnoi projekteja, asiakkaita ja tarjouksia</p>
        </div>
        {canManageUsers && responsibleUsers.length > 0 && (
          <div className="w-full sm:w-80">
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
      </div>

      {selectedQuotes.size > 0 && (
        <Card className="p-4 bg-accent/20 border-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedQuotes.size} tarjous{selectedQuotes.size !== 1 ? 'ta' : ''} valittu
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedQuotes(new Set())}>
                <X /> Tyhjennä valinta
              </Button>
            </div>
            <Button variant="destructive" size="sm" onClick={handleBulkDeleteQuotes} className="gap-2">
              <Trash weight="bold" />
              Poista valitut
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" weight="fill" />
              <h2 className="text-xl font-semibold">Projektit</h2>
            </div>
            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
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
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="project-name" label="Projektin nimi" required help={PROJECT_FIELD_HELP.name} className="mb-2" />
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      placeholder="Esim. Kylpyhuoneremontti"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="site" label="Työkohde" required help={PROJECT_FIELD_HELP.site} className="mb-2" />
                    <Input
                      id="site"
                      value={projectForm.site}
                      onChange={(e) => setProjectForm({ ...projectForm, site: e.target.value })}
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
                      onChange={(e) => setProjectForm({ ...projectForm, regionCoefficient: parseFloat(e.target.value) || 1.0 })}
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
          </div>

          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchProjects}
                onChange={(e) => setSearchProjects(e.target.value)}
                placeholder="Hae projektia, asiakasta tai tarjousnumeroa..."
                className="pl-10"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{projects.length === 0 ? 'Ei projekteja' : 'Ei hakutuloksia'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredProjects.map(project => {
                const customer = getCustomer(project.customerId);
                const projectQuotes = filterOwnedRecords(getQuotesForProject(project.id), ownerFilter);
                const projectResponsibleLabel = resolveResponsibleUserLabel(project.ownerUserId || customer?.ownerUserId);
                
                return (
                  <div key={project.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{customer?.name}</p>
                        <p className="text-sm text-muted-foreground">{project.site}</p>
                        <p className="text-xs text-muted-foreground mt-2">Vastuuhenkilö: {projectResponsibleLabel}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditProject(project)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        {projectQuotes.length} tarjous{projectQuotes.length !== 1 ? 'ta' : ''}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateQuote(project.id)}
                      >
                        <FileText className="h-4 w-4" />
                        Uusi tarjous
                      </Button>
                    </div>

                    {projectQuotes.length > 0 && (
                      <div className="space-y-1 pt-2">
                        {projectQuotes.map(quote => (
                          <div
                            key={quote.id}
                            className="flex items-center gap-2 bg-muted/50 rounded px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedQuotes.has(quote.id)}
                              onCheckedChange={() => toggleQuoteSelection(quote.id)}
                            />
                            <div
                              className="flex-1 cursor-pointer hover:underline"
                              onClick={() => handleEditQuote(project.id, quote.id)}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                Vastuuhenkilö: {resolveResponsibleUserLabel(quote.ownerUserId || project.ownerUserId || customer?.ownerUserId)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{quote.title}</span>
                                {quote.quoteNumber && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {quote.quoteNumber}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  v{quote.revisionNumber}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant={
                              quote.status === 'draft' ? 'secondary' :
                              quote.status === 'sent' ? 'default' :
                              quote.status === 'accepted' ? 'default' :
                              'destructive'
                            }>
                              {quote.status === 'draft' ? 'Luonnos' :
                               quote.status === 'sent' ? 'Lähetetty' :
                               quote.status === 'accepted' ? 'Hyväksytty' :
                               'Hylätty'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" weight="fill" />
              <h2 className="text-xl font-semibold">Asiakkaat</h2>
            </div>
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
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
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      placeholder="Yritys Oy"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="contact-person" label="Yhteyshenkilö" help={CUSTOMER_FIELD_HELP.contactPerson} className="mb-2" />
                    <Input
                      id="contact-person"
                      value={customerForm.contactPerson}
                      onChange={(e) => setCustomerForm({ ...customerForm, contactPerson: e.target.value })}
                      placeholder="Matti Meikäläinen"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="email" label="Sähköposti" help={CUSTOMER_FIELD_HELP.email} className="mb-2" />
                    <Input
                      id="email"
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      placeholder="matti@yritys.fi"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="phone" label="Puhelin" help={CUSTOMER_FIELD_HELP.phone} className="mb-2" />
                    <Input
                      id="phone"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                  <div>
                    <FieldHelpLabel htmlFor="address" label="Osoite" help={CUSTOMER_FIELD_HELP.address} className="mb-2" />
                    <Input
                      id="address"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
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

          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchCustomers}
                onChange={(e) => setSearchCustomers(e.target.value)}
                placeholder="Hae asiakasta tai vastuuhenkilöä..."
                className="pl-10"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{customers.length === 0 ? 'Ei asiakkaita' : 'Ei hakutuloksia'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredCustomers.map(customer => {
                const customerProjects = projects.filter(p => p.customerId === customer.id);
                
                return (
                  <div key={customer.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Vastuuhenkilö: {resolveResponsibleUserLabel(customer.ownerUserId)}</p>
                        {customer.contactPerson && (
                          <p className="text-sm text-muted-foreground">{customer.contactPerson}</p>
                        )}
                        {customer.email && (
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          {customerProjects.length} projekti{customerProjects.length !== 1 ? 'a' : ''}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {showQuoteEditor && selectedProjectId && (
        <QuoteEditor
          projectId={selectedProjectId}
          quoteId={selectedQuoteId}
          onClose={() => {
            setShowQuoteEditor(false);
            setSelectedProjectId(null);
            setSelectedQuoteId(null);
          }}
        />
      )}
    </div>
  );
}
