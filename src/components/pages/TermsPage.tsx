import { useMemo, useState } from 'react';
import { CheckCircle, Lock, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { useQuoteTerms } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { QuoteTerms } from '../../lib/types';
import { toast } from 'sonner';
import { ReadOnlyAlert } from '../ReadOnlyAlert';

const DEFAULT_CONTENT = `Tarjous on voimassa 30 päivää.

Maksuehto 14 päivää netto.

Mahdolliset lisä- ja muutostyöt veloitetaan erikseen sovitun hinnaston mukaisesti.

Asennustyöt tehdään sovittuna ajankohtana, kun työmaa on vastaanottovalmis.`;

export default function TermsPage() {
  const { terms, addTerms, updateTerms, deleteTerms } = useQuoteTerms();
  const { canManageSharedData } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState<QuoteTerms | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: DEFAULT_CONTENT,
    isDefault: false,
  });

  const sortedTerms = useMemo(
    () => [...terms].sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name)),
    [terms]
  );

  const openDialog = (entry?: QuoteTerms) => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi hallita ehtopohjia.');
      return;
    }
    setEditingTerms(entry ?? null);
    setFormData(entry ? {
      name: entry.name,
      content: entry.content,
      isDefault: entry.isDefault,
    } : {
      name: '',
      content: DEFAULT_CONTENT,
      isDefault: terms.length === 0,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Anna ehtopohjalle nimi ja sisältö.');
      return;
    }

    try {
      if (editingTerms) {
        updateTerms(editingTerms.id, {
          name: formData.name.trim(),
          content: formData.content.trim(),
          isDefault: formData.isDefault,
        });
        toast.success('Ehtopohja päivitetty.');
      } else {
        addTerms({
          name: formData.name.trim(),
          content: formData.content.trim(),
          isDefault: formData.isDefault,
        });
        toast.success('Ehtopohja lisätty.');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tallennus epäonnistui.');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Ehtopohjat</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Hallinnoi tarjousten oletusehtoja ja dokumenttipohjia.</p>
        </div>
        {canManageSharedData ? (
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus weight="bold" />
            Uusi ehtopohja
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Vain luku
          </Button>
        )}
      </div>

      {!canManageSharedData && <ReadOnlyAlert />}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingTerms ? 'Muokkaa ehtopohjaa' : 'Uusi ehtopohja'}
        maxWidth="xl"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">
              Tallenna
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="terms-name">Pohjan nimi</Label>
              <Input id="terms-name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <Button
              type="button"
              variant={formData.isDefault ? 'default' : 'outline'}
              onClick={() => setFormData((current) => ({ ...current, isDefault: !current.isDefault }))}
            >
              {formData.isDefault ? 'Oletuspohja käytössä' : 'Merkitse oletukseksi'}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="terms-content">Sisältö</Label>
            <Textarea
              id="terms-content"
              rows={18}
              value={formData.content}
              onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
            />
          </div>
        </div>
      </ResponsiveDialog>

      {sortedTerms.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Ei ehtopohjia. Lisää ensimmäinen ehtopohja yllä olevasta painikkeesta.</Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sortedTerms.map((entry) => (
            <Card key={entry.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold">{entry.name}</h2>
                    {entry.isDefault && (
                      <Badge className="gap-1">
                        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                        Oletuspohja
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Päivitetty {new Date(entry.updatedAt).toLocaleString('fi-FI')}
                  </p>
                </div>
                {canManageSharedData && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(entry)}>
                      <PencilSimple />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (!confirm(`Poistetaanko ehtopohja "${entry.name}"?`)) return;
                        try {
                          deleteTerms(entry.id);
                          toast.success('Ehtopohja poistettu.');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Poisto epäonnistui.');
                        }
                      }}
                    >
                      <Trash className="text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-6">
                {entry.content}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
