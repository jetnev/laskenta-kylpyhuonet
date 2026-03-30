import { useState } from 'react';
import { Plus, Pencil, Trash } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
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
import { Label } from '../ui/label';
import { useInstallationGroups } from '../../hooks/use-data';
import { InstallationGroup } from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export default function InstallationGroupsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useInstallationGroups();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallationGroup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: '',
    description: '',
  });

  const handleOpenDialog = (group?: InstallationGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        defaultPrice: group.defaultPrice.toString(),
        description: group.description || '',
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        defaultPrice: '',
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const defaultPrice = parseFloat(formData.defaultPrice);
    if (isNaN(defaultPrice) || defaultPrice < 0) {
      toast.error('Virheellinen hinta');
      return;
    }

    const groupData = {
      name: formData.name,
      defaultPrice,
      description: formData.description || undefined,
    };

    if (editingGroup) {
      updateGroup(editingGroup.id, groupData);
      toast.success('Hintaryhmä päivitetty');
    } else {
      addGroup(groupData);
      toast.success('Hintaryhmä lisätty');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteGroup(id);
    toast.success('Hintaryhmä poistettu');
    setDeleteConfirmId(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Hintaryhmät</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää hintaryhmä
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Muokkaa hintaryhmää' : 'Uusi hintaryhmä'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nimi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="esim. Perusasennus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPrice">Oletushinta (€) *</Label>
                <Input
                  id="defaultPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultPrice: e.target.value })
                  }
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Kuvaus</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Kuvaus hintaryhmästä..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Peruuta
                </Button>
                <Button type="submit">
                  {editingGroup ? 'Päivitä' : 'Lisää'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {groups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei hintaryhmiä. Lisää ensimmäinen hintaryhmä yllä olevasta painikkeesta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kuvaus</TableHead>
                  <TableHead className="text-right">Oletushinta</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.description || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(group.defaultPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(group)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(group.id)}
                        >
                          <Trash className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vahvista poisto</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa tämän hintaryhmän? Tätä toimintoa ei voi peruuttaa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Poista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
