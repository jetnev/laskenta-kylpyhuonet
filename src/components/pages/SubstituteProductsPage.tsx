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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { useSubstituteProducts, useProducts } from '../../hooks/use-data';
import { SubstituteProduct } from '../../lib/types';
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

export default function SubstituteProductsPage() {
  const { substitutes, addSubstitute, updateSubstitute, deleteSubstitute } = useSubstituteProducts();
  const { products, getProduct } = useProducts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubstitute, setEditingSubstitute] = useState<SubstituteProduct | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    primaryProductId: '',
    substituteProductId: '',
    justification: '',
    dimensionNotes: '',
  });

  const handleOpenDialog = (substitute?: SubstituteProduct) => {
    if (substitute) {
      setEditingSubstitute(substitute);
      setFormData({
        primaryProductId: substitute.primaryProductId,
        substituteProductId: substitute.substituteProductId,
        justification: substitute.justification,
        dimensionNotes: substitute.dimensionNotes || '',
      });
    } else {
      setEditingSubstitute(null);
      setFormData({
        primaryProductId: '',
        substituteProductId: '',
        justification: '',
        dimensionNotes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.primaryProductId === formData.substituteProductId) {
      toast.error('Tuote ei voi korvata itseään');
      return;
    }

    const substituteData = {
      primaryProductId: formData.primaryProductId,
      substituteProductId: formData.substituteProductId,
      justification: formData.justification,
      dimensionNotes: formData.dimensionNotes || undefined,
    };

    if (editingSubstitute) {
      updateSubstitute(editingSubstitute.id, substituteData);
      toast.success('Korvaava tuote päivitetty');
    } else {
      addSubstitute(substituteData);
      toast.success('Korvaava tuote lisätty');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSubstitute(id);
    toast.success('Korvaava tuote poistettu');
    setDeleteConfirmId(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Korvaavat tuotteet</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää korvaava tuote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubstitute ? 'Muokkaa korvaavaa tuotetta' : 'Uusi korvaava tuote'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Päätuote *</Label>
                <Select
                  value={formData.primaryProductId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, primaryProductId: value })
                  }
                >
                  <SelectTrigger id="primary">
                    <SelectValue placeholder="Valitse päätuote" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="substitute">Korvaava tuote *</Label>
                <Select
                  value={formData.substituteProductId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, substituteProductId: value })
                  }
                >
                  <SelectTrigger id="substitute">
                    <SelectValue placeholder="Valitse korvaava tuote" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="justification">Perustelu *</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) =>
                    setFormData({ ...formData, justification: e.target.value })
                  }
                  required
                  placeholder="Miksi tämä tuote korvaa alkuperäisen?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensionNotes">Mittatiedot</Label>
                <Textarea
                  id="dimensionNotes"
                  value={formData.dimensionNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, dimensionNotes: e.target.value })
                  }
                  placeholder="Esim. mitoitus tai asennushuomiot..."
                  rows={2}
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
                  {editingSubstitute ? 'Päivitä' : 'Lisää'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {substitutes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei korvaavia tuotteita. Lisää ensimmäinen korvaava tuote yllä olevasta painikkeesta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Päätuote</TableHead>
                  <TableHead>Korvaava tuote</TableHead>
                  <TableHead>Perustelu</TableHead>
                  <TableHead>Mittatiedot</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutes.map((substitute) => {
                  const primary = getProduct(substitute.primaryProductId);
                  const substituteProd = getProduct(substitute.substituteProductId);
                  return (
                    <TableRow key={substitute.id}>
                      <TableCell>
                        {primary ? (
                          <div>
                            <div className="font-mono text-sm">{primary.code}</div>
                            <div className="text-sm">{primary.name}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {substituteProd ? (
                          <div>
                            <div className="font-mono text-sm">{substituteProd.code}</div>
                            <div className="text-sm">{substituteProd.name}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {substitute.justification}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {substitute.dimensionNotes || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(substitute)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(substitute.id)}
                          >
                            <Trash className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              Haluatko varmasti poistaa tämän korvaavan tuotteen? Tätä toimintoa ei voi peruuttaa.
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
