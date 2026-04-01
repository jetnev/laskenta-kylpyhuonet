import { useState, useMemo } from 'react';
import { Plus, Trash, PencilSimple, Lock, FunnelSimple } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Label } from '../ui/label';
import { useInstallationGroups } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { InstallationGroup } from '../../lib/types';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const DEFAULT_CATEGORIES = [
  'Lattiatyöt',
  'Seinätyöt',
  'Kattotypöt',
  'Kalusteasennus',
  'Putkityöt',
  'Sähkötyöt',
  'Viimeistely',
  'Muu',
];

export default function InstallationGroupsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useInstallationGroups();
  const { canEdit, canDelete, canManageUsers } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallationGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultPrice: 0,
  });

  const allCategories = useMemo(() => {
    const existingCategories = groups
      .map(g => g.category)
      .filter((c): c is string => !!c);
    const uniqueExisting = Array.from(new Set(existingCategories));
    const allCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...uniqueExisting]));
    return allCats.sort();
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!selectedCategory) return groups;
    return groups.filter(g => g.category === selectedCategory);
  }, [groups, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    const grouped = new Map<string, InstallationGroup[]>();
    groups.forEach(group => {
      const category = group.category || 'Ei kategoriaa';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(group);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      if (a[0] === 'Ei kategoriaa') return 1;
      if (b[0] === 'Ei kategoriaa') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [groups]);

  const handleOpenDialog = (group?: InstallationGroup) => {
    if (!canManageUsers) {
      toast.error('Vain omistaja voi muokata hintaryhmiä');
      return;
    }

    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        category: group.category || '',
        defaultPrice: group.defaultPrice,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        category: selectedCategory || '',
        defaultPrice: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!canManageUsers) {
      toast.error('Vain omistaja voi tallentaa muutoksia');
      return;
    }

    if (!formData.name) {
      toast.error('Anna hintaryhmän nimi');
      return;
    }

    if (editingGroup) {
      updateGroup(editingGroup.id, formData);
      toast.success('Hintaryhmä päivitetty');
    } else {
      addGroup(formData);
      toast.success('Hintaryhmä lisätty');
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canManageUsers) {
      toast.error('Vain omistaja voi poistaa hintaryhmiä');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän hintaryhmän?')) {
      deleteGroup(id);
      toast.success('Hintaryhmä poistettu');
    }
  };

  const getCategoryStats = (category: string) => {
    const categoryGroups = groups.filter(g => (g.category || 'Ei kategoriaa') === category);
    return categoryGroups.length;
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Hintaryhmät</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Asennushinnoittelun ryhmät</p>
        </div>
        {canManageUsers ? (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus weight="bold" />
            Lisää hintaryhmä
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Lukuoikeus
          </Button>
        )}
      </div>

      {!canManageUsers && <ReadOnlyAlert />}

      <div className="flex gap-2 flex-wrap items-center">
        <FunnelSimple className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="gap-2"
        >
          Kaikki
          <Badge variant="secondary" className="ml-1">{groups.length}</Badge>
        </Button>
        {allCategories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="gap-2"
          >
            {category}
            <Badge variant="secondary" className="ml-1">{getCategoryStats(category)}</Badge>
          </Button>
        ))}
      </div>

      {selectedCategory ? (
        <Card className="p-6">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Ei hintaryhmiä kategoriassa "{selectedCategory}".
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{selectedCategory}</h2>
                <Badge variant="secondary">{filteredGroups.length} ryhmää</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nimi</TableHead>
                    <TableHead className="text-right">Oletushinta</TableHead>
                    {canManageUsers && <TableHead className="w-24"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(group.defaultPrice)}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(group)}
                              className="h-8 w-8"
                            >
                              <PencilSimple />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(group.id)}
                              className="h-8 w-8"
                            >
                              <Trash className="text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Ei hintaryhmiä. Lisää ensimmäinen hintaryhmä yllä olevasta painikkeesta.
              </div>
            </Card>
          ) : (
            groupedByCategory.map(([category, categoryGroups]) => (
              <Card key={category} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">{category}</h2>
                    <Badge variant="secondary">{categoryGroups.length} ryhmää</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nimi</TableHead>
                        <TableHead className="text-right">Oletushinta</TableHead>
                        {canManageUsers && <TableHead className="w-24"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(group.defaultPrice)}
                          </TableCell>
                          {canManageUsers && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(group)}
                                  className="h-8 w-8"
                                >
                                  <PencilSimple />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(group.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash className="text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingGroup ? 'Muokkaa hintaryhmää' : 'Uusi hintaryhmä'}
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">Tallenna</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nimi *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="esim. Laatan asennus"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria</Label>
            <Input
              id="category"
              list="categories"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Valitse tai kirjoita kategoria"
            />
            <datalist id="categories">
              {allCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Oletushinta (€/yks)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.defaultPrice}
              onChange={(e) => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
