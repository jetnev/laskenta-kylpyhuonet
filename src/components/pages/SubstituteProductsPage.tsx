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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useSubstituteProducts, useProducts } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { toast } from 'sonner';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import { ResponsiveDialog } from '../ResponsiveDialog';

export default function SubstituteProductsPage() {
  const { substitutes, addSubstitute, deleteSubstitute } = useSubstituteProducts();
  const { products } = useProducts();
  const { canManageSharedData } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalType, setOriginalType] = useState<'existing' | 'manual'>('existing');

  const [formData, setFormData] = useState({
    originalProductId: '',
    substituteProductId: '',
    manualOriginalCode: '',
    manualOriginalName: '',
  });

  const handleOpenDialog = () => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi lisätä korvaavia tuotteita');
      return;
    }

    setFormData({
      originalProductId: '',
      substituteProductId: '',
      manualOriginalCode: '',
      manualOriginalName: '',
    });
    setOriginalType('existing');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi tallentaa muutoksia');
      return;
    }

    if (!formData.substituteProductId) {
      toast.error('Valitse korvaava tuote');
      return;
    }

    if (originalType === 'existing') {
      if (!formData.originalProductId) {
        toast.error('Valitse alkuperäinen tuote');
        return;
      }
      if (formData.originalProductId === formData.substituteProductId) {
        toast.error('Tuotteet eivät voi olla sama');
        return;
      }
    } else {
      if (!formData.manualOriginalCode.trim() || !formData.manualOriginalName.trim()) {
        toast.error('Syötä tuotekoodi ja nimi');
        return;
      }
    }

    addSubstitute(formData);
    toast.success('Korvaava tuote lisätty');
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi poistaa korvaavia tuotteita');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän korvaavan tuotteen?')) {
      deleteSubstitute(id);
      toast.success('Korvaava tuote poistettu');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Korvaavat tuotteet</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Määritä tuotteiden korvattavuus</p>
        </div>
        {canManageSharedData ? (
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus weight="bold" />
            Lisää korvaava tuote
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Lukuoikeus
          </Button>
        )}
      </div>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Uusi korvaava tuote"
        maxWidth="lg"
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
          <div className="space-y-3">
            <Label>Alkuperäinen tuote</Label>
            <RadioGroup value={originalType} onValueChange={(value: 'existing' | 'manual') => setOriginalType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">Valitse tuoterekisteristä</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">Lisää manuaalisesti</Label>
              </div>
            </RadioGroup>
            
            {originalType === 'existing' ? (
              <Select
                value={formData.originalProductId}
                onValueChange={(value) => setFormData({ ...formData, originalProductId: value })}
              >
                <SelectTrigger>
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
            ) : (
              <div className="space-y-2">
                <Input
                  id="manual-code"
                  placeholder="Tuotekoodi"
                  value={formData.manualOriginalCode}
                  onChange={(e) => setFormData({ ...formData, manualOriginalCode: e.target.value })}
                />
                <Input
                  id="manual-name"
                  placeholder="Tuotteen nimi"
                  value={formData.manualOriginalName}
                  onChange={(e) => setFormData({ ...formData, manualOriginalName: e.target.value })}
                />
              </div>
            )}
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
      </ResponsiveDialog>

      {!canManageSharedData && <ReadOnlyAlert />}

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
                {canManageSharedData && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {substitutes.map((sub) => {
                const original = sub.originalProductId 
                  ? products.find((p) => p.id === sub.originalProductId)
                  : null;
                const substitute = products.find((p) => p.id === sub.substituteProductId);
                
                const originalDisplay = original 
                  ? `${original.code} - ${original.name}`
                  : sub.manualOriginalCode && sub.manualOriginalName
                    ? `${sub.manualOriginalCode} - ${sub.manualOriginalName}`
                    : 'Tuntematon';
                
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {originalDisplay}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowsLeftRight className="h-5 w-5 mx-auto text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {substitute ? `${substitute.code} - ${substitute.name}` : 'Tuntematon'}
                    </TableCell>
                    {canManageSharedData && (
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
