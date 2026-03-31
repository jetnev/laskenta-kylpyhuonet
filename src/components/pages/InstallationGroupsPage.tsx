import { useState } from 'react';
import { Plus, Trash, PencilSimple, Lock } from '@phosphor-icons/react';
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

export default function InstallationGroupsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useInstallationGroups();
  const { canEdit, canDelete, canManageUsers } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallationGroup | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: 0,
  });

  const handleOpenDialog = (group?: InstallationGroup) => {
    if (!canManageUsers) {
      toast.error('Vain omistaja voi muokata hintaryhmiä');
      return;
    }

    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        defaultPrice: group.defaultPrice,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
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

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Hintaryhmät</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Asennushinnoittelun ryhmät</p>
        </div>
        {canManageUsers ? (
          <>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää hintaryhmä
            </Button>
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
          </>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Lukuoikeus
          </Button>
        )}
      </div>

      {!canManageUsers && <ReadOnlyAlert />}

      <Card className="p-6">
        {groups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei hintaryhmiä. Lisää ensimmäinen hintaryhmä yllä olevasta painikkeesta.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead className="text-right">Oletushinta</TableHead>
                {canManageUsers && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
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
        )}
      </Card>
    </div>
  );
}
