import { useState } from 'react';
import { Plus, Pencil, Trash, Star } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
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
import { useQuoteTerms } from '../../hooks/use-data';
import { QuoteTerms } from '../../lib/types';
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

export default function TermsPage() {
  const { terms, addTerms, updateTerms, deleteTerms } = useQuoteTerms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<QuoteTerms | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isDefault: false,
  });

  const handleOpenDialog = (term?: QuoteTerms) => {
    if (term) {
      setEditingTerm(term);
      setFormData({
        name: term.name,
        content: term.content,
        isDefault: term.isDefault,
      });
    } else {
      setEditingTerm(null);
      setFormData({
        name: '',
        content: '',
        isDefault: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const termData = {
      name: formData.name,
      content: formData.content,
      isDefault: formData.isDefault,
    };

    if (editingTerm) {
      updateTerms(editingTerm.id, termData);
      toast.success('Ehdot päivitetty');
    } else {
      addTerms(termData);
      toast.success('Ehdot lisätty');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteTerms(id);
    toast.success('Ehdot poistettu');
    setDeleteConfirmId(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Ehdot</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää ehdot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingTerm ? 'Muokkaa ehtoja' : 'Uudet ehdot'}
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
                  placeholder="esim. Yleiset sopimusehdot 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Sisältö *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  placeholder="Kirjoita sopimusehdot tähän..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked as boolean })
                  }
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Aseta oletukseksi
                </Label>
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
                  {editingTerm ? 'Päivitä' : 'Lisää'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {terms.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei ehtoja. Lisää ensimmäiset ehdot yllä olevasta painikkeesta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Sisältö</TableHead>
                  <TableHead className="w-24">Oletus</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {term.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      {term.isDefault && (
                        <Star weight="fill" className="text-accent" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(term)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(term.id)}
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
              Haluatko varmasti poistaa nämä ehdot? Tätä toimintoa ei voi peruuttaa.
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
