import { useState } from 'react';
import { Plus, MagnifyingGlass, Trash, PencilSimple } from '@phosphor-icons/react';
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
import { useProducts, useInstallationGroups } from '../../hooks/use-data';
import { Product } from '../../lib/types';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/calculations';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { groups } = useInstallationGroups();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'kpl',
    purchasePrice: 0,
    installationGroupId: '',
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        unit: product.unit,
        purchasePrice: product.purchasePrice,
        installationGroupId: product.installationGroupId || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        unit: 'kpl',
        purchasePrice: 0,
        installationGroupId: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error('Täytä kaikki pakolliset kentät');
      return;
    }

    const productData = {
      code: formData.code,
      name: formData.name,
      unit: formData.unit,
      purchasePrice: formData.purchasePrice,
      installationGroupId: formData.installationGroupId || undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast.success('Tuote päivitetty');
    } else {
      addProduct(productData);
      toast.success('Tuote lisätty');
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Haluatko varmasti poistaa tämän tuotteen?')) {
      deleteProduct(id);
      toast.success('Tuote poistettu');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tuoterekisteri</h1>
          <p className="text-muted-foreground mt-1">Hallinnoi tuotteita ja hintoja</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää tuote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Muokkaa tuotetta' : 'Uusi tuote'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Tuotekoodi *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="esim. LAA-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tuotenimi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="esim. Keraaminen laatta 30x30cm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Yksikkö</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kpl">kpl</SelectItem>
                      <SelectItem value="m2">m²</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Ostohinta (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Hintaryhmä</Label>
                <Select
                  value={formData.installationGroupId}
                  onValueChange={(value) => setFormData({ ...formData, installationGroupId: value })}
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Ei hintaryhmää" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ei hintaryhmää</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
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
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hae tuotteita..."
              className="pl-10"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {products.length === 0 ? 'Ei tuotteita. Lisää ensimmäinen tuote yllä olevasta painikkeesta.' : 'Ei hakutuloksia.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuotekoodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Yksikkö</TableHead>
                  <TableHead className="text-right">Ostohinta</TableHead>
                  <TableHead>Hintaryhmä</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const group = product.installationGroupId
                    ? groups.find((g) => g.id === product.installationGroupId)
                    : null;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.purchasePrice)}
                      </TableCell>
                      <TableCell>{group?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(product)}
                            className="h-8 w-8"
                          >
                            <PencilSimple />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            className="h-8 w-8"
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
    </div>
  );
}
