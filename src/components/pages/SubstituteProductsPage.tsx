import { useState } from 'react';
import { Plus, Trash, ArrowsLeftRight, Lock } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { useSubstituteProducts, useProducts } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import { ReadOnlyAlert } from '../ReadOnlyAlert';

export default function SubstituteProductsPage() {
  const { substitutes, addSubstitute, deleteSubstitute } = useSubstituteProducts();
  const { products } = useProducts();
  const { isOwner } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    originalProductId: '',
    substituteProductId: '',
  });

  const handleOpenDialog = () => {
    if (!isOwner) {
      toast.error('Vain omistaja voi lisätä korvaavia tuotteita');
      return;
    }

    setFormData({
      originalProductId: '',
      substituteProductId: '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!isOwner) {
      toast.error('Vain omistaja voi tallentaa muutoksia');
      return;
    }

    if (!formData.originalProductId || !formData.substituteProductId) {
      toast.error('Valitse molemmat tuotteet');
      return;
    }

    if (formData.originalProductId === formData.substituteProductId) {
      toast.error('Tuotteet eivät voi olla sama');
      return;
    }

    addSubstitute(formData);
    toast.success('Korvaava tuote lisätty');
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!isOwner) {
      toast.error('Vain omistaja voi poistaa korvaavia tuotteita');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän korvaavan tuotteen?')) {
      deleteSubstitute(id);
      toast.success('Korvaava tuote poistettu');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Korvaavat tuotteet</h1>
          <p className="text-muted-foreground mt-1">Määritä tuotteiden korvattavuus</p>
        </div>
        {isOwner ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="gap-2">
                <Plus weight="bold" />
                Lisää korvaava tuote
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uusi korvaava tuote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="original">Alkuperäinen tuote</Label>
                <Select
                  value={formData.originalProductId}
                  onValueChange={(value) => setFormData({ ...formData, originalProductId: value })}
                >
                  <SelectTrigger id="original">
                    <SelectValue placeholder="Valitse tuote" />
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
              <div className="flex justify-center">
                <ArrowsLeftRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="substitute">Korvaava tuote</Label>
                <Select
                  value={formData.substituteProductId}
                  onValueChange={(value) => setFormData({ ...formData, substituteProductId: value })}
                >
                  <SelectTrigger id="substitute">
                    <SelectValue placeholder="Valitse tuote" />
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Peruuta
              </Button>
              <Button onClick={handleSave}>Tallenna</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Lukuoikeus
          </Button>
        )}
      </div>

      {!isOwner && <ReadOnlyAlert />}

      <Card className="p-6">
        {substitutes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei korvaavia tuotteita. Lisää ensimmäinen yllä olevasta painikkeesta.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alkuperäinen tuote</TableHead>
                <TableHead></TableHead>
                <TableHead>Korvaava tuote</TableHead>
                {isOwner && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {substitutes.map((sub) => {
                const original = products.find((p) => p.id === sub.originalProductId);
                const substitute = products.find((p) => p.id === sub.substituteProductId);
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {original ? `${original.code} - ${original.name}` : 'Tuntematon'}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowsLeftRight className="h-5 w-5 mx-auto text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {substitute ? `${substitute.code} - ${substitute.name}` : 'Tuntematon'}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="h-8 w-8"
                        >
                          <Trash className="text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
