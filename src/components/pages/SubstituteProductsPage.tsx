import { useState } from 'react';
import { Plus, Trash, ArrowsLeftRight, Lock } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
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
import FieldHelpLabel from '../FieldHelpLabel';

const SUBSTITUTE_FIELD_HELP = {
  originalType: 'Valitse haetaanko alkuperäinen suunnitelmatuote omasta tuoterekisteristä vai syötetäänkö se käsin. Käsinsyöttö sopii tilanteisiin, joissa asiakkaan tai suunnitelman tuote ei ole omassa rekisterissäsi.',
  originalProductId: 'Tämä on asiakkaan pyytämä tai suunnitelmassa oleva tuote, jolle haluat määrittää vaihtoehdon.',
  manualOriginalCode: 'Syötä suunnitelmissa olevan tuotteen koodi, jos sitä ei ole omassa tuoterekisterissäsi.',
  manualOriginalName: 'Syötä suunnitelmissa tai asiakkaan pyynnössä oleva tuote mahdollisimman tunnistettavasti.',
  substituteProductId: 'Valitse oma tuote, jota haluat ehdottaa alkuperäisen tilalle tarjouksessa.',
  notes: 'Kirjoita lyhyt perustelu tai huomio, esimerkiksi miksi oma tuote on parempi vaihtoehto tai mitä eroa tuotteilla on.',
} as const;

export default function SubstituteProductsPage() {
  const { substitutes, addSubstitute, deleteSubstitute } = useSubstituteProducts();
  const { products } = useProducts();
  const { canDelete, canEdit } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalType, setOriginalType] = useState<'existing' | 'manual'>('existing');

  const [formData, setFormData] = useState({
    originalProductId: '',
    substituteProductId: '',
    manualOriginalCode: '',
    manualOriginalName: '',
    notes: '',
  });

  const handleOpenDialog = () => {
    if (!canEdit) {
      toast.error('Sinulla ei ole oikeuksia lisätä korvaavia tuotteita');
      return;
    }

    setFormData({
      originalProductId: '',
      substituteProductId: '',
      manualOriginalCode: '',
      manualOriginalName: '',
      notes: '',
    });
    setOriginalType('existing');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!canEdit) {
      toast.error('Sinulla ei ole oikeuksia tallentaa muutoksia');
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
    toast.success('Vaihtoehtotuote lisätty');
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast.error('Sinulla ei ole oikeuksia poistaa korvaavia tuotteita');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän korvaavan tuotteen?')) {
      deleteSubstitute(id);
      toast.success('Vaihtoehtotuote poistettu');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Korvaavat tuotteet</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Määritä mitä omaa tuotetta ehdotat asiakkaan pyytämän tai suunnitelmissa olevan tuotteen tilalle.</p>
        </div>
        {canEdit ? (
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus weight="bold" />
            Lisää vaihtoehtotuote
          </Button>
        ) : (
          <Button disabled className="gap-2">
            <Lock weight="bold" />
            Ei muokkausoikeutta
          </Button>
        )}
      </div>

      <Alert>
        <AlertDescription>
          Tämän näkymän tarkoitus on auttaa urakoitsijaa ehdottamaan omaa vaihtoehtotuotetta tilanteissa, joissa suunnitelmissa on toisen valmistajan tai toimittajan tuote. 
          Lisää vasemmalle alkuperäinen suunnitelmatuote ja oikealle oma ehdotettava tuote, niin vaihtoehto näkyy tarjouseditorissa oikean tuotteen yhteydessä.
        </AlertDescription>
      </Alert>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Uusi vaihtoehtotuote"
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
            <FieldHelpLabel label="Suunnitelmissa oleva tuote" help={SUBSTITUTE_FIELD_HELP.originalType} />
            <RadioGroup value={originalType} onValueChange={(value: 'existing' | 'manual') => setOriginalType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">Valitse omasta tuoterekisteristä</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">Syötä suunnitelmatuote käsin</Label>
              </div>
            </RadioGroup>
            
            {originalType === 'existing' ? (
              <div className="space-y-2">
                <FieldHelpLabel label="Valitse suunnitelmatuote" help={SUBSTITUTE_FIELD_HELP.originalProductId} />
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
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="manual-code" label="Tuotekoodi" help={SUBSTITUTE_FIELD_HELP.manualOriginalCode} />
                  <Input
                    id="manual-code"
                    placeholder="Tuotekoodi"
                    value={formData.manualOriginalCode}
                    onChange={(e) => setFormData({ ...formData, manualOriginalCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <FieldHelpLabel htmlFor="manual-name" label="Tuotteen nimi" help={SUBSTITUTE_FIELD_HELP.manualOriginalName} />
                  <Input
                    id="manual-name"
                    placeholder="Tuotteen nimi"
                    value={formData.manualOriginalName}
                    onChange={(e) => setFormData({ ...formData, manualOriginalName: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <ArrowsLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="substitute" label="Oma ehdotettava tuote" help={SUBSTITUTE_FIELD_HELP.substituteProductId} />
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
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="substitute-notes" label="Perustelu tai lisätieto" help={SUBSTITUTE_FIELD_HELP.notes} />
            <Input
              id="substitute-notes"
              placeholder="Esim. paremmin saatavilla, sopii samaan käyttökohteeseen, kustannustehokkaampi"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
      </ResponsiveDialog>

      {!canEdit && <ReadOnlyAlert />}

      <Card className="p-6">
        {substitutes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Ei vaihtoehtotuotteita. Lisää ensimmäinen ehdotus yllä olevasta painikkeesta.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suunnitelmissa / pyydetty</TableHead>
                <TableHead></TableHead>
                <TableHead>Oma vaihtoehto</TableHead>
                <TableHead>Perustelu</TableHead>
                {canDelete && <TableHead className="w-24"></TableHead>}
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
                    <TableCell className="text-muted-foreground">
                      {sub.notes || '-'}
                    </TableCell>
                    {canDelete && (
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
