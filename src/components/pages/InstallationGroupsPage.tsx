import { useMemo, useState } from 'react';
import { FunnelSimple, Lock, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { useInstallationGroups } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { InstallationGroup } from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';

const DEFAULT_CATEGORIES = [
  'Lattiatyöt',
  'Seinätyöt',
  'Kattotyöt',
  'Kalusteasennus',
  'Putkityöt',
  'Sähkötyöt',
  'Viimeistely',
  'Muu',
];

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  defaultPrice: 0,
  defaultMarginPercent: 0,
  defaultInstallationPrice: 0,
};

export default function InstallationGroupsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useInstallationGroups();
  const { canManageSharedData } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallationGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const allCategories = useMemo(() => {
    const existingCategories = groups
      .map((group) => group.category)
      .filter((category): category is string => Boolean(category));

    return Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories])).sort((left, right) =>
      left.localeCompare(right, 'fi')
    );
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!selectedCategory) {
      return groups;
    }
    return groups.filter((group) => group.category === selectedCategory);
  }, [groups, selectedCategory]);

  const openDialog = (group?: InstallationGroup) => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi hallita hintaryhmiä.');
      return;
    }

    setEditingGroup(group ?? null);
    setFormData(
      group
        ? {
            name: group.name,
            category: group.category ?? selectedCategory ?? '',
            description: group.description ?? '',
            defaultPrice: group.defaultPrice,
            defaultMarginPercent: group.defaultMarginPercent ?? 0,
            defaultInstallationPrice: group.defaultInstallationPrice ?? 0,
          }
        : {
            ...EMPTY_FORM,
            category: selectedCategory ?? '',
          }
    );
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Anna hintaryhmälle nimi.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || undefined,
      description: formData.description.trim() || undefined,
      defaultPrice: formData.defaultPrice,
      defaultMarginPercent: formData.defaultMarginPercent,
      defaultInstallationPrice: formData.defaultInstallationPrice,
    };

    try {
      if (editingGroup) {
        updateGroup(editingGroup.id, payload);
        toast.success('Hintaryhmä päivitetty.');
      } else {
        addGroup(payload);
        toast.success('Hintaryhmä lisätty.');
      }

      setDialogOpen(false);
      setEditingGroup(null);
      setFormData(EMPTY_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tallennus epäonnistui.');
    }
  };

  const handleDelete = (group: InstallationGroup) => {
    if (!confirm(`Poistetaanko hintaryhmä "${group.name}"?`)) {
      return;
    }

    try {
      deleteGroup(group.id);
      toast.success('Hintaryhmä poistettu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Poisto epäonnistui.');
    }
  };

  const getCategoryCount = (category: string) =>
    groups.filter((group) => (group.category || 'Ei kategoriaa') === category).length;

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Hintaryhmät</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Määritä oletuskatteet, hinnat ja asennuskulut tuoteryhmittäin.
          </p>
        </div>
        {canManageSharedData ? (
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus weight="bold" />
            Lisää hintaryhmä
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Vain luku
          </Button>
        )}
      </div>

      {!canManageSharedData && <ReadOnlyAlert />}

      <div className="flex gap-2 flex-wrap items-center">
        <FunnelSimple className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="gap-2"
        >
          Kaikki
          <Badge variant="secondary">{groups.length}</Badge>
        </Button>
        {allCategories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="gap-2"
          >
            {category}
            <Badge variant="secondary">{getCategoryCount(category)}</Badge>
          </Button>
        ))}
      </div>

      <Card className="p-6">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {selectedCategory
              ? `Ei hintaryhmiä kategoriassa "${selectedCategory}".`
              : 'Ei hintaryhmiä. Lisää ensimmäinen hintaryhmä yllä olevasta painikkeesta.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ryhmän nimi</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Kuvaus</TableHead>
                <TableHead className="text-right">Oletushinta</TableHead>
                <TableHead className="text-right">Oletuskate</TableHead>
                <TableHead className="text-right">Oletusasennus</TableHead>
                {canManageSharedData && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.category || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(group.defaultPrice)}</TableCell>
                  <TableCell className="text-right font-mono">{(group.defaultMarginPercent ?? 0).toFixed(1)} %</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(group.defaultInstallationPrice ?? 0)}</TableCell>
                  {canManageSharedData && (
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDialog(group)}>
                          <PencilSimple />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(group)}>
                          <Trash className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingGroup ? 'Muokkaa hintaryhmää' : 'Uusi hintaryhmä'}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">
              Tallenna
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nimi *</Label>
            <Input
              id="group-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="Esim. Laatan asennus"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-category">Kategoria</Label>
            <Input
              id="group-category"
              list="installation-group-categories"
              value={formData.category}
              onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
              placeholder="Valitse tai kirjoita kategoria"
            />
            <datalist id="installation-group-categories">
              {allCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Kuvaus</Label>
            <Input
              id="group-description"
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="group-price">Oletushinta</Label>
              <Input
                id="group-price"
                type="number"
                step="0.01"
                value={formData.defaultPrice}
                onChange={(event) => setFormData((current) => ({ ...current, defaultPrice: parseFloat(event.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-margin">Oletuskate %</Label>
              <Input
                id="group-margin"
                type="number"
                step="0.1"
                value={formData.defaultMarginPercent}
                onChange={(event) => setFormData((current) => ({ ...current, defaultMarginPercent: parseFloat(event.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-installation">Oletusasennus</Label>
              <Input
                id="group-installation"
                type="number"
                step="0.01"
                value={formData.defaultInstallationPrice}
                onChange={(event) => setFormData((current) => ({ ...current, defaultInstallationPrice: parseFloat(event.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

