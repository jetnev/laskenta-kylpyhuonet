import { useState } from 'react';
import { Plus, Pencil, Trash, FileText, Building, Users, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useProjects, useCustomers, useQuotes } from '../../hooks/use-data';
import { toast } from 'sonner';
import { Project, Customer } from '../../lib/types';
import QuoteEditor from '../QuoteEditor';

export default function ProjectsPage() {
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { customers, addCustomer, updateCustomer, deleteCustomer, getCustomer } = useCustomers();
  const { quotes, getQuotesForProject, deleteQuote } = useQuotes();
  
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
  
  const [projectForm, setProjectForm] = useState({
    customerId: '',
    name: '',
    site: '',
    regionCoefficient: 1.0,
    customOptions: [] as { id: string; label: string; value: string }[],
  });
  
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });

  const filteredProjects = projects.filter(p => {
    const customer = getCustomer(p.customerId);
    const searchLower = searchProjects.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.site.toLowerCase().includes(searchLower) ||
      (customer && customer.name.toLowerCase().includes(searchLower))
    );
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomers.toLowerCase()) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(searchCustomers.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchCustomers.toLowerCase()))
  );

  const handleSaveProject = () => {
    if (!projectForm.customerId || !projectForm.name || !projectForm.site) {
      toast.error('Täytä kaikki pakolliset kentät');
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, projectForm);
      toast.success('Projekti päivitetty');
    } else {
      addProject(projectForm);
      toast.success('Projekti luotu');
    }
    
    setShowProjectDialog(false);
    setEditingProject(null);
    setProjectForm({ customerId: '', name: '', site: '', regionCoefficient: 1.0, customOptions: [] });
    setNewOptionLabel('');
    setNewOptionValue('');
  };

  const handleSaveCustomer = () => {
    if (!customerForm.name) {
      toast.error('Anna asiakkaan nimi');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerForm);
      toast.success('Asiakas päivitetty');
    } else {
      addCustomer(customerForm);
      toast.success('Asiakas luotu');
    }
    
    setShowCustomerDialog(false);
    setEditingCustomer(null);
    setCustomerForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      customerId: project.customerId,
      name: project.name,
      site: project.site,
      regionCoefficient: project.regionCoefficient,
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
    });
    setShowCustomerDialog(true);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Haluatko varmasti poistaa projektin?')) {
      deleteProject(id);
      toast.success('Projekti poistettu');
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
    setSelectedProjectId(projectId);
    setSelectedQuoteId(null);
    setShowQuoteEditor(true);
  };

  const handleEditQuote = (projectId: string, quoteId: string) => {
    setSelectedProjectId(projectId);
    setSelectedQuoteId(quoteId);
    setShowQuoteEditor(true);
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm('Haluatko varmasti poistaa tarjouksen?')) {
      deleteQuote(quoteId);
      setSelectedQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quoteId);
        return newSet;
      });
      toast.success('Tarjous poistettu');
    }
  };

  const handleBulkDeleteQuotes = () => {
    if (selectedQuotes.size === 0) {
      toast.error('Valitse poistettavat tarjoukset');
      return;
    }

    if (confirm(`Haluatko varmasti poistaa ${selectedQuotes.size} tarjousta?`)) {
      selectedQuotes.forEach(id => deleteQuote(id));
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Projektit ja Asiakkaat</h1>
          <p className="text-muted-foreground mt-1">Hallinnoi projekteja, asiakkaita ja tarjouksia</p>
        </div>
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
                    setProjectForm({ customerId: '', name: '', site: '', regionCoefficient: 1.0, customOptions: [] });
                    setNewOptionLabel('');
                    setNewOptionValue('');
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
                    <Label htmlFor="customer">Asiakas *</Label>
                    <select
                      id="customer"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={projectForm.customerId}
                      onChange={(e) => setProjectForm({ ...projectForm, customerId: e.target.value })}
                    >
                      <option value="">Valitse asiakas...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="project-name">Projektin nimi *</Label>
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      placeholder="Esim. Kylpyhuoneremontti"
                    />
                  </div>
                  <div>
                    <Label htmlFor="site">Työkohde *</Label>
                    <Input
                      id="site"
                      value={projectForm.site}
                      onChange={(e) => setProjectForm({ ...projectForm, site: e.target.value })}
                      placeholder="Esim. Mannerheimintie 1, Helsinki"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coefficient">Aluekohtainen kerroin</Label>
                    <Input
                      id="coefficient"
                      type="number"
                      step="0.1"
                      value={projectForm.regionCoefficient}
                      onChange={(e) => setProjectForm({ ...projectForm, regionCoefficient: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
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
                placeholder="Hae projekteja..."
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
                const projectQuotes = getQuotesForProject(project.id);
                
                return (
                  <div key={project.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{customer?.name}</p>
                        <p className="text-sm text-muted-foreground">{project.site}</p>
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
                              <div className="flex items-center gap-2">
                                <span>{quote.title}</span>
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
                    setCustomerForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
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
                    <Label htmlFor="customer-name">Nimi *</Label>
                    <Input
                      id="customer-name"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      placeholder="Yritys Oy"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-person">Yhteyshenkilö</Label>
                    <Input
                      id="contact-person"
                      value={customerForm.contactPerson}
                      onChange={(e) => setCustomerForm({ ...customerForm, contactPerson: e.target.value })}
                      placeholder="Matti Meikäläinen"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Sähköposti</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      placeholder="matti@yritys.fi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Puhelin</Label>
                    <Input
                      id="phone"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Osoite</Label>
                    <Input
                      id="address"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      placeholder="Mannerheimintie 1, 00100 Helsinki"
                    />
                  </div>
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
                placeholder="Hae asiakkaita..."
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
