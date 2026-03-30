import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Download, Upload, Check, Warning, X } from '@phosphor-icons/react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { useProducts } from '../../hooks/use-data';
import { UnitType } from '../../lib/types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface LaattapisteRow {
  product_code: string;
  name: string;
  category?: string;
  brand?: string;
  unit?: string;
  notes?: string;
  install_group_code?: string;
}

interface ParsedLaattapisteRow {
  product_code: string;
  name: string;
  category: string;
  brand: string;
  unit: UnitType;
  notes: string;
  install_group_code: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  new: number;
}

export default function LaattapisteImportPage() {
  const { products, addProduct } = useProducts();
  const [rawInput, setRawInput] = useState('');
  const [importData, setImportData] = useState<ParsedLaattapisteRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('input');

  const getExampleData = () => {
    return `product_code;name;category;brand;unit;notes;install_group_code
LP-KAAK-001;Lattialaatta Pukkila Arctica 30x60cm valkoinen;Laatat;Pukkila;m²;;Laatoitus
LP-KAAK-002;Seinälaatta Pukkila Natura 25x40cm beige;Laatat;Pukkila;m²;;Laatoitus
LP-SAUM-001;Saumalaasti Weber Vetonit 5kg valkoinen;Tarvikkeet;Weber;kpl;;
LP-LIIMA-001;Laattaliiima Kerakoll H40 25kg;Tarvikkeet;Kerakoll;kpl;;
LP-PROF-001;Sisänurkkalistaprofili alumiini 8mm 2,5m;Profiilit;Schlüter;jm;;`;
  };

  const handleLoadExample = () => {
    setRawInput(getExampleData());
    setActiveTab('input');
    toast.success('Esimerkkidata ladattu');
  };

  const handleDownloadTemplate = () => {
    const template = `product_code;name;category;brand;unit;notes;install_group_code
LP-XXX-001;Tuotteen nimi;Kategoria;Merkki;kpl;Huomiot;Hintaryhmäkoodi`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'laattapiste_tuonti_pohja.csv';
    link.click();

    toast.success('Tuontipohja ladattu');
  };

  const parseCSV = (text: string): LaattapisteRow[] => {
    const lines = text.trim().split('\n');
    const data: LaattapisteRow[] = [];

    const delimiter = text.includes('\t') ? '\t' : ';';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(delimiter).map(p => p.trim());
      if (parts.length >= 2) {
        data.push({
          product_code: parts[0] || '',
          name: parts[1] || '',
          category: parts[2] || '',
          brand: parts[3] || '',
          unit: parts[4] || '',
          notes: parts[5] || '',
          install_group_code: parts[6] || '',
        });
      }
    }

    return data;
  };

  const validateAndParseRow = (row: LaattapisteRow): ParsedLaattapisteRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let unit: UnitType = 'kpl';

    if (!row.product_code) {
      errors.push('Tuotekoodi puuttuu');
    }

    if (!row.name) {
      errors.push('Tuotteen nimi puuttuu');
    }

    const validUnits: UnitType[] = ['kpl', 'm²', 'jm', 'm'];
    if (row.unit && validUnits.includes(row.unit as UnitType)) {
      unit = row.unit as UnitType;
    } else if (row.unit) {
      warnings.push(`Tuntematon yksikkö "${row.unit}", käytetään oletuksena "kpl"`);
    }

    const existingProduct = products.find(p => p.code === row.product_code);
    const isDuplicate = !!existingProduct;

    if (isDuplicate) {
      warnings.push('Tuotekoodi on jo järjestelmässä');
    }

    if (!row.category) {
      warnings.push('Kategoria puuttuu');
    }

    return {
      product_code: row.product_code || '',
      name: row.name || '',
      category: row.category || 'Määrittämätön',
      brand: row.brand || '',
      unit,
      notes: row.notes || '',
      install_group_code: row.install_group_code || '',
      isValid: errors.length === 0,
      isDuplicate,
      errors,
      warnings,
    };
  };

  const handleProcess = () => {
    try {
      if (!rawInput.trim()) {
        toast.error('Syötä tuotetiedot tekstikenttään');
        return;
      }

      const data = parseCSV(rawInput);

      if (data.length === 0) {
        toast.error('Ei löytynyt tuotteita käsiteltäväksi');
        return;
      }

      const uniqueData = new Map<string, LaattapisteRow>();
      for (const row of data) {
        if (row.product_code) {
          uniqueData.set(row.product_code, row);
        }
      }

      const parsedData = Array.from(uniqueData.values()).map(validateAndParseRow);
      setImportData(parsedData);
      setShowPreview(true);
      setActiveTab('input');

    } catch (error) {
      console.error(error);
      toast.error('Virhe tietojen käsittelyssä');
    }
  };

  const getStats = (): ImportStats => {
    return {
      total: importData.length,
      valid: importData.filter(r => r.isValid).length,
      invalid: importData.filter(r => !r.isValid).length,
      duplicate: importData.filter(r => r.isDuplicate).length,
      new: importData.filter(r => r.isValid && !r.isDuplicate).length,
    };
  };

  const handleConfirmImport = () => {
    try {
      setIsProcessing(true);
      let imported = 0;

      for (const row of importData) {
        if (row.isValid && !row.isDuplicate) {
          addProduct({
            code: row.product_code,
            name: row.name,
            category: row.category,
            unit: row.unit,
            purchasePrice: 0,
          });
          imported++;
        }
      }

      setShowPreview(false);
      setRawInput('');
      setImportData([]);
      toast.success(`${imported} tuotetta tuotu onnistuneesti`);
    } catch (error) {
      console.error(error);
      toast.error('Virhe tuonnissa');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Laattapiste-tuonti</h1>
        <p className="text-muted-foreground mt-1">
          Tuo tuotteita suoraan Laattapiste-muodossa
        </p>
      </div>

      <div className="max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="input">Tuonti</TabsTrigger>
            <TabsTrigger value="instructions">Ohjeet</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleDownloadTemplate} variant="outline">
                    <Download className="mr-2" />
                    Lataa tuontipohja
                  </Button>
                  <Button onClick={handleLoadExample} variant="outline">
                    <Upload className="mr-2" />
                    Lataa esimerkkidata
                  </Button>
                </div>

                <Textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Liitä Laattapiste CSV-data tähän..."
                  className="font-mono text-sm min-h-[300px]"
                />

                <Button onClick={handleProcess} disabled={!rawInput.trim()}>
                  <Check className="mr-2" />
                  Käsittele ja esikatsele
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Yleiskatsaus</h3>
                  <p className="text-sm text-muted-foreground">
                    Laattapiste-tuonti mahdollistaa tuotteiden tuomisen suoraan CSV-muodossa.
                    Tuonti tukee deduplikointia ja validointia.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tuettavat kentät</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li><strong>product_code</strong>: Tuotekoodi (pakollinen, uniikki)</li>
                    <li><strong>name</strong>: Tuotteen nimi (pakollinen)</li>
                    <li><strong>category</strong>: Tuotekategoria (esim. Laatat, Tarvikkeet)</li>
                    <li><strong>brand</strong>: Tuotemerkki (esim. Pukkila, Weber)</li>
                    <li><strong>unit</strong>: Yksikkö (kpl, m², jm, m)</li>
                    <li><strong>notes</strong>: Vapaamuotoiset huomiot</li>
                    <li><strong>install_group_code</strong>: Hintaryhmän koodi</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tuontiprosessi</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Muodosta tiedot CSV-muotoon (käytä pohjaa apuna)</li>
                    <li>Liitä data tekstikenttään</li>
                    <li>Käsittele ja tarkista esikatselu</li>
                    <li>Vahvista tuonti vain uusille tuotteille</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tuontitoiminnot</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Deduplikointi: Tuotteet duplikaatintarkistetaan tuotekoodin perusteella</li>
                    <li>Esikatselu: Näet tarkan yhteenvedon ennen tuontia</li>
                    <li>Validointi: Pakolliset kentät tarkistetaan automaattisesti</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Esimerkki CSV-tiedostosta</h3>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
{`product_code;name;category;brand;unit;notes;install_group_code
LP-KAAK-001;Lattialaatta 30x60cm;Laatat;Pukkila;m²;;Laatoitus
LP-SAUM-001;Saumalaasti 5kg;Tarvikkeet;Weber;kpl;;`}
                  </pre>
                </div>
              </div>
            </Card>

            <Alert>
              <Warning className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">Huomioitavaa</p>
                <p className="text-sm">
                  Tuonti ei ylikirjoita olemassa olevia tuotteita. Duplikaatit merkitään
                  esikatselussa ja ohitetaan tuonnissa.
                </p>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Laattapiste-tuonnin esikatselu</DialogTitle>
          </DialogHeader>

          {importData.length > 0 && (
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Yhteensä</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-700">Kelvolliset</div>
                <div className="text-2xl font-semibold text-green-700">{stats.valid}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-destructive">Virheelliset</div>
                <div className="text-2xl font-semibold text-destructive">{stats.invalid}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-700">Duplikaatit</div>
                <div className="text-2xl font-semibold text-orange-700">{stats.duplicate}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-700">Uudet</div>
                <div className="text-2xl font-semibold text-blue-700">{stats.new}</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Tila</TableHead>
                  <TableHead>Tuotekoodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Merkki</TableHead>
                  <TableHead>Yksikkö</TableHead>
                  <TableHead>Huomiot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {!row.isValid ? (
                        <X className="text-destructive" weight="bold" />
                      ) : row.isDuplicate ? (
                        <Warning className="text-yellow-600" weight="fill" />
                      ) : (
                        <Check className="text-green-600" weight="bold" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.product_code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-sm">{row.brand || '-'}</TableCell>
                    <TableCell className="text-sm">{row.unit}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <div className="text-xs text-destructive space-y-1">
                          {row.errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                      {row.warnings.length > 0 && (
                        <div className="text-xs text-yellow-700 space-y-1">
                          {row.warnings.map((warn, i) => (
                            <div key={i}>⚠ {warn}</div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground mt-4">
            Vain kelvolliset, ei-duplikaatti tuotteet tuodaan järjestelmään.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Peruuta
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={stats.new === 0 || isProcessing}
            >
              Tuo {stats.new} tuotetta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
