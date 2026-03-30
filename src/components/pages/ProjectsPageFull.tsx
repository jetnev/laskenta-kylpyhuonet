import { useState } from 'react';
import { Plus, Pencil, FileText } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  useProjects,
  useCustomers,
  useQuotes,
  useSettings,
} from '../../hooks/use-data';
import { Project, DEFAULT_REGIONS } from '../../lib/types';
import { toast } from 'sonner';
import QuoteEditor from '../QuoteEditor';

export default function ProjectsPageFull() {
  const { projects, addProject, updateProject, getProject } = useProjects();
  const { customers, addCustomer, getCustomer } = useCustomers();
  const { quotes, addQuote, getQuotesForProject } = useQuotes();
  const { settings } = useSettings();

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const [projectForm, setProjectForm] = useState({
    customerId: '',
    name: '',
    site: '',
    region: 'Muu Suomi',
    notes: '',
  });

  const [customerForm, setCustomerForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });

  const handleOpenProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        customerId: project.customerId,
        name: project.name,
        site: project.site,
        region: project.region,
        notes: project.notes || '',
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        customerId: '',
        name: '',
        site: '',
        region: 'Muu Suomi',
        notes: '',
      });
    }
    setIsProjectDialogOpen(true);
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectForm.customerId) {
      toast.error('Valitse asiakas');
      return;
    }

    const regionData = DEFAULT_REGIONS.find((r) => r.name === projectForm.region);
    const regionCoefficient = regionData?.coefficient || 1.0;

    const projectData = {
      customerId: projectForm.customerId,
      name: projectForm.name,
      site: projectForm.site,
      region: projectForm.region,
      regionCoefficient,
      notes: projectForm.notes || undefined,
    };

    if (editingProject) {
      updateProject(editingProject.id, projectData);
      toast.success('Projekti päivitetty');
    } else {
      addProject(projectData);
      toast.success('Projekti lisätty');
    }

    setIsProjectDialogOpen(false);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    addCustomer({
      name: customerForm.name,
      contactPerson: customerForm.contactPerson || undefined,
      email: customerForm.email || undefined,
      phone: customerForm.phone || undefined,
      address: customerForm.address || undefined,
    });

    toast.success('Asiakas lisätty');
    setIsCustomerDialogOpen(false);
    setCustomerForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const handleCreateQuote = (projectId: string) => {
    const project = getProject(projectId);
    if (!project) return;

    const projectQuotes = getQuotesForProject(projectId);
    const revisionNumber = projectQuotes.length + 1;

    const newQuote = addQuote({
      projectId,
      title: `Tarjous ${revisionNumber}`,
      revisionNumber: 1,
      status: 'draft',
      vatPercent: settings.defaultVatPercent,
    });

    setSelectedQuoteId(newQuote.id);
  };

  const selectedQuote = selectedQuoteId ? quotes.find((q) => q.id === selectedQuoteId) : null;

  if (selectedQuote) {
    return (
      <div className="p-8">
        <QuoteEditor quote={selectedQuote} onClose={() => setSelectedQuoteId(null)} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Projektit</h1>
        <div className="flex gap-2">
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus weight="bold" />
                Lisää asiakas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Uusi asiakas</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCustomer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Yrityksen nimi *</Label>
                  <Input
                    id="customerName"
                    value={customerForm.name}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Yhteyshenkilö</Label>
                  <Input
                    id="contactPerson"
                    value={customerForm.contactPerson}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, contactPerson: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Sähköposti</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerForm.email}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Puhelin</Label>
                    <Input
                      id="phone"
                      value={customerForm.phone}
                      onChange={(e) =>
                        setCustomerForm({ ...customerForm, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Osoite</Label>
                  <Input
                    id="address"
                    value={customerForm.address}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, address: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCustomerDialogOpen(false)}
                  >
                    Peruuta
                  </Button>
                  <Button type="submit">Lisää</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenProjectDialog()} className="gap-2">
                <Plus weight="bold" />
                Uusi projekti
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Muokkaa projektia' : 'Uusi projekti'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Asiakas *</Label>
                  <Select
                    value={projectForm.customerId}
                    onValueChange={(value) =>
                      setProjectForm({ ...projectForm, customerId: value })
                    }
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Valitse asiakas" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Projektin nimi *</Label>
                  <Input
                    id="projectName"
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site">Työmaa *</Label>
                  <Input
                    id="site"
                    value={projectForm.site}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, site: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Alue *</Label>
                  <Select
                    value={projectForm.region}
                    onValueChange={(value) =>
                      setProjectForm({ ...projectForm, region: value })
                    }
                  >
                    <SelectTrigger id="region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_REGIONS.map((region) => (
                        <SelectItem key={region.name} value={region.name}>
                          {region.name} (kerroin: {region.coefficient})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProjectDialogOpen(false)}
                  >
                    Peruuta
                  </Button>
                  <Button type="submit">
                    {editingProject ? 'Päivitä' : 'Lisää'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">Ei projekteja.</p>
            <p>Lisää ensin asiakas ja luo sitten ensimmäinen projekti.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const customer = getCustomer(project.customerId);
            const projectQuotes = getQuotesForProject(project.id);

            return (
              <Card key={project.id} className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {customer?.name} • {project.site} • {project.region}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenProjectDialog(project)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateQuote(project.id)}
                      className="gap-2"
                    >
                      <Plus weight="bold" />
                      Uusi tarjous
                    </Button>
                  </div>
                </div>

                {projectQuotes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Ei tarjouksia. Luo ensimmäinen tarjous yllä olevasta painikkeesta.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Otsikko</TableHead>
                          <TableHead>Revisio</TableHead>
                          <TableHead>Tila</TableHead>
                          <TableHead>Luotu</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectQuotes.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell className="font-medium">{quote.title}</TableCell>
                            <TableCell>{quote.revisionNumber}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  quote.status === 'draft'
                                    ? 'secondary'
                                    : quote.status === 'sent'
                                      ? 'default'
                                      : quote.status === 'accepted'
                                        ? 'default'
                                        : 'destructive'
                                }
                              >
                                {quote.status === 'draft' && 'Luonnos'}
                                {quote.status === 'sent' && 'Lähetetty'}
                                {quote.status === 'accepted' && 'Hyväksytty'}
                                {quote.status === 'rejected' && 'Hylätty'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(quote.createdAt).toLocaleDateString('fi-FI')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedQuoteId(quote.id)}
                                className="gap-2"
                              >
                                <FileText />
                                Avaa
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
