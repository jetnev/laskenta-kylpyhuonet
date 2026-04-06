import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer, Project, Quote } from '@/lib/types';

import { buildTenderPackageCreateInput, type TenderPackageCreationFormValues } from '../lib/tender-package-links';
import type { CreateTenderPackageInput } from '../types/tender-intelligence';

const NONE_VALUE = '__none__';

interface CreateTenderPackageDialogProps {
  open: boolean;
  submitting?: boolean;
  customers?: Customer[];
  projects?: Project[];
  quotes?: Quote[];
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateTenderPackageInput) => Promise<void>;
}

function createEmptyFormValues(): TenderPackageCreationFormValues {
  return {
    name: '',
    customerId: '',
    projectId: '',
    quoteId: '',
  };
}

export default function CreateTenderPackageDialog({
  open,
  submitting = false,
  customers = [],
  projects = [],
  quotes = [],
  onOpenChange,
  onCreate,
}: CreateTenderPackageDialogProps) {
  const [formValues, setFormValues] = useState<TenderPackageCreationFormValues>(createEmptyFormValues());
  const [error, setError] = useState<string | null>(null);

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const filteredProjects = useMemo(
    () => (formValues.customerId ? projects.filter((project) => project.customerId === formValues.customerId) : projects),
    [formValues.customerId, projects],
  );
  const filteredQuotes = useMemo(
    () => (formValues.projectId ? quotes.filter((quote) => quote.projectId === formValues.projectId) : []),
    [formValues.projectId, quotes],
  );
  const selectedProject = formValues.projectId ? projectById.get(formValues.projectId) ?? null : null;
  const selectedCustomer = formValues.customerId ? customerById.get(formValues.customerId) ?? null : null;
  const selectedQuote = formValues.quoteId ? quotes.find((quote) => quote.id === formValues.quoteId) ?? null : null;

  useEffect(() => {
    if (!open) {
      setFormValues(createEmptyFormValues());
      setError(null);
    }
  }, [open]);

  const handleCustomerChange = (value: string) => {
    const nextCustomerId = value === NONE_VALUE ? '' : value;

    setFormValues((current) => {
      const nextProjectId = current.projectId && projectById.get(current.projectId)?.customerId === nextCustomerId
        ? current.projectId
        : '';
      const nextQuoteId = nextProjectId && quotes.some((quote) => quote.id === current.quoteId && quote.projectId === nextProjectId)
        ? current.quoteId
        : '';

      return {
        ...current,
        customerId: nextCustomerId,
        projectId: nextProjectId,
        quoteId: nextQuoteId,
      };
    });
  };

  const handleProjectChange = (value: string) => {
    const nextProjectId = value === NONE_VALUE ? '' : value;
    const nextProject = nextProjectId ? projectById.get(nextProjectId) ?? null : null;

    setFormValues((current) => ({
      ...current,
      customerId: nextProject?.customerId ?? current.customerId,
      projectId: nextProjectId,
      quoteId: nextProjectId && quotes.some((quote) => quote.id === current.quoteId && quote.projectId === nextProjectId)
        ? current.quoteId
        : '',
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      await onCreate(buildTenderPackageCreateInput({
        values: formValues,
        customers,
        projects,
        quotes,
      }));
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Paketin luonti epäonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uusi tarjouspyyntöpaketti</DialogTitle>
          <DialogDescription>
            Paketti tallennetaan nyt organisaation omaan Tarjousäly-dataan Supabaseen. Dokumentit, analyysi ja generointi kytketään tähän myöhemmissä vaiheissa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm font-medium text-foreground">
            <span>Paketin nimi</span>
            <Input
              autoFocus
              placeholder="Esim. Kiinteistö Oy Aurinkopiha / tarjouspyyntö 04-2026"
              value={formValues.name}
              onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Asiakas</Label>
              <Select value={formValues.customerId || NONE_VALUE} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse asiakas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Ei linkitystä asiakkaaseen</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projekti</Label>
              <Select value={formValues.projectId || NONE_VALUE} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse projekti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Ei linkitystä projektiin</SelectItem>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tarjousluonnos</Label>
            <Select
              value={formValues.quoteId || NONE_VALUE}
              onValueChange={(value) => setFormValues((current) => ({
                ...current,
                quoteId: value === NONE_VALUE ? '' : value,
              }))}
              disabled={!formValues.projectId}
            >
              <SelectTrigger>
                <SelectValue placeholder={formValues.projectId ? 'Valitse tarjousluonnos' : 'Valitse ensin projekti'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Ei linkitystä tarjoukseen</SelectItem>
                {filteredQuotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>{`${quote.quoteNumber} • ${quote.title}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedCustomer || selectedProject || selectedQuote) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-950">Paketin linkityskonteksti</p>
              {selectedCustomer && <p className="mt-2">Asiakas: {selectedCustomer.name}</p>}
              {selectedProject && <p>Projekti: {selectedProject.name}</p>}
              {selectedQuote && <p>Tarjous: {selectedQuote.quoteNumber} • {selectedQuote.title}</p>}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Peruuta
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Luodaan...' : 'Luo tarjouspyyntöpaketti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}