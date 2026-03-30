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
  isNew: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportStats {
  total: number;
  new: number;
  duplicate: number;
  invalid: number;
  withWarnings: number;
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
      errors.push('Nimi puuttuu');
    }

    const validUnits: UnitType[] = ['kpl', 'm²', 'jm', 'm'];
    if (row.unit && validUnits.includes(row.unit as UnitType)) {
      unit = row.unit as UnitType;
    } else if (row.unit && !validUnits.includes(row.unit as UnitType)) {
      warnings.push(`Yksikkö "${row.unit}" ei tuettu, käytetään oletusta "kpl"`);
    } else {
      warnings.push('Yksikkö puuttuu, käytetään oletusta "kpl"');
    }

    const existingProduct = products.find(p => p.code === row.product_code);
    const isDuplicate = !!existingProduct;

    if (isDuplicate) {
      warnings.push(`Tuotekoodi "${row.product_code}" on jo olemassa`);
    }

    if (!row.category) {
      warnings.push('Kategoria puuttuu');
    }

    if (!row.brand) {
      warnings.push('Merkki puuttuu');
    }

    return {
      product_code: row.product_code,
      name: row.name,
      category: row.category || '',
      brand: row.brand || '',
      unit,
      notes: row.notes || '',
      install_group_code: row.install_group_code || '',
      isValid: errors.length === 0,
      isNew: !isDuplicate,
      isDuplicate,
      errors,
      warnings,
    };
  };

  const handleProcessInput = () => {
    if (!rawInput.trim()) {
      toast.error('Syötä tuotetiedot');
      return;
    }

    try {
      const rawData = parseCSV(rawInput);
      
      if (rawData.length === 0) {
        toast.error('Ei löytynyt tuotteita');
        return;
      }

      const uniqueData = new Map<string, LaattapisteRow>();
      rawData.forEach(row => {
        if (row.product_code) {
          if (uniqueData.has(row.product_code)) {
            console.warn(`Deduplikointi: tuotekoodi ${row.product_code} esiintyy useasti`);
          } else {
            uniqueData.set(row.product_code, row);
          }
        }
      });

      const parsedData = Array.from(uniqueData.values()).map(validateAndParseRow);

      setImportData(parsedData);
      setShowPreview(true);

      const stats = calculateStats(parsedData);
      toast.success(`${stats.total} tuotetta käsitelty, ${stats.new} uutta`);
    } catch (error) {
      toast.error('Tietojen käsittely epäonnistui');
      console.error(error);
    }
  };

  const calculateStats = (data: ParsedLaattapisteRow[]): ImportStats => {
    return {
      total: data.length,
      new: data.filter(r => r.isValid && r.isNew).length,
      duplicate: data.filter(r => r.isDuplicate).length,
      invalid: data.filter(r => !r.isValid).length,
      withWarnings: data.filter(r => r.isValid && r.warnings.length > 0).length,
    };
  };

  const handleConfirmImport = () => {
    setIsProcessing(true);

    const rowsToImport = importData.filter(r => r.isValid && r.isNew);
    let importedCount = 0;

    rowsToImport.forEach(row => {
      try {
        addProduct({
          code: row.product_code,
          name: row.name,
          category: row.category || 'Kategorisoimaton',
          unit: row.unit,
          purchasePrice: 0,
        });
        importedCount++;
      } catch (error) {
        console.error(`Tuonnin virhe tuotteella ${row.product_code}:`, error);
      }
    });

    setIsProcessing(false);
    setShowPreview(false);
    setImportData([]);
    setRawInput('');

    toast.success(`${importedCount} tuotetta tuotu onnistuneesti`);
  };

  const stats = showPreview ? calculateStats(importData) : null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Laattapiste-tuonti</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tuo Laattapisteen tuotteita turvallisesti esikatselu edellä
          </p>
        </div>
      </div>

      <div className="max-w-6xl space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="input">1. Syötä tiedot</TabsTrigger>
            <TabsTrigger value="instructions">2. Ohjeet</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Syötä Laattapisteen tuotetiedot</h2>
              
              <div className="mb-4 flex gap-2">
                <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2">
                  <Download weight="bold" />
                  Lataa tuontipohja
                </Button>
                <Button onClick={handleLoadExample} variant="outline" className="gap-2">
                  <Upload weight="bold" />
                  Lataa esimerkki
                </Button>
              </div>

              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Liitä Laattapisteen tuotetiedot CSV-muodossa (puolipiste tai sarkain erottimena)..."
                className="font-mono text-sm min-h-[300px]"
              />

              <div className="mt-4 flex justify-end">
                <Button onClick={handleProcessInput} className="gap-2">
                  <Check weight="bold" />
                  Käsittele ja esikatsele
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">Tietolähteet:</p>
                    <p className="text-sm">
                      Tämä työkalu tukee Laattapisteen virallisia tuotetietoja. 
                      Hanki tuotetiedot Laattapisteen virallisista lähteistä:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm mt-2 ml-4">
                      <li>Laattapisteen verkkokauppa (www.laattapiste.fi)</li>
                      <li>Laattapisteen tuotekatalogit</li>
                      <li>Laattapisteen toimittama tuotedata</li>
                      <li>Laattapisteen asiakaspalvelun tarjoamat tiedostot</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Vaiheittainen prosessi:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                      <li>Hanki Laattapisteen tuotetiedot virallisesta lähteestä</li>
                      <li>Muodosta tiedot CSV-muotoon (käytä pohjaa apuna)</li>
                      <li>Kopioi ja liitä tiedot "Syötä tiedot" -välilehdelle</li>
                      <li>Paina "Käsittele ja esikatsele"</li>
                      <li>Tarkista esikatselu huolellisesti</li>
                      <li>Vahvista tuonti vain uusille tuotteille</li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Kentät (CSV-muoto):</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li><strong>product_code</strong> (pakollinen): Laattapisteen tuotekoodi</li>
                      <li><strong>name</strong> (pakollinen): Tuotteen nimi</li>
                      <li><strong>category</strong>: Tuotekategoria (esim. Laatat, Tarvikkeet)</li>
                      <li><strong>brand</strong>: Tuotemerkki (esim. Pukkila, Weber)</li>
                      <li><strong>unit</strong>: Yksikkö (kpl, m², jm, m)</li>
                      <li><strong>notes</strong>: Lisätiedot</li>
                      <li><strong>install_group_code</strong>: Hintaryhmän koodi</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Turvallisuus:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li>Deduplikointi: Tuotteet deduplikoidaan tuotekoodin perusteella</li>
                      <li>Olemassa olevat: Olemassa olevia tuotteita EI päivitetä automaattisesti</li>
                      <li>Esikatselu: Näet tarkan yhteenvedon ennen tuontia</li>
                      <li>Validointi: Virheelliset rivit ohitetaan automaattisesti</li>
                      <li>Puuttuvat kentät: Tyhjät kentät jätetään tyhjiksi (ei keksitä)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Esimerkki CSV-syötteestä:</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
{`product_code;name;category;brand;unit;notes;install_group_code
LP-KAAK-001;Lattialaatta 30x60cm valkoinen;Laatat;Pukkila;m²;;Laatoitus
LP-SAUM-001;Saumalaasti 5kg valkoinen;Tarvikkeet;Weber;kpl;;`}
                    </pre>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="font-semibold text-yellow-900 mb-1">Huomio:</p>
                    <p className="text-sm text-yellow-800">
                      Tämä työkalu EI hae tuotteita automaattisesti Laattapisteen verkkosivuilta. 
                      Käyttäjä on vastuussa tuotetietojen hankkimisesta virallisista lähteistä ja 
                      syöttämisestä järjestelmään. Tämä varmistaa datan tarkkuuden ja laillisuuden.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="font-semibold text-blue-900 mb-1">Ostohinta:</p>
                    <p className="text-sm text-blue-800">
                      Tuotteet tuodaan oletushinnalla 0 €. Päivitä ostohinnat erikseen 
                      Tuoterekisteri-sivulla, koska hintatiedot ovat yleensä kaupallisesti 
                      arkaluontoisia eivätkä ole julkisia.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Laattapiste-tuonnin esikatselu</DialogTitle>
          </DialogHeader>

          {stats && (
            <div className="grid grid-cols-5 gap-4 py-4 border-y">
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  {stats.new}
                </div>
                <div className="text-xs text-muted-foreground">Uutta tuotetta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-yellow-600">
                  {stats.duplicate}
                </div>
                <div className="text-xs text-muted-foreground">Duplikaattia</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-orange-600">
                  {stats.withWarnings}
                </div>
                <div className="text-xs text-muted-foreground">Varoituksia</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-destructive">
                  {stats.invalid}
                </div>
                <div className="text-xs text-muted-foreground">Virheellisiä</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {stats.total}
                </div>
                <div className="text-xs text-muted-foreground">Yhteensä</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Tila</TableHead>
                  <TableHead>Koodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Merkki</TableHead>
                  <TableHead>Yks.</TableHead>
                  <TableHead>Huomautukset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index} className={row.isDuplicate ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      {!row.isValid ? (
                        <X className="text-destructive" weight="bold" />
                      ) : row.isDuplicate ? (
                        <Warning className="text-yellow-600" weight="fill" />
                      ) : row.warnings.length > 0 ? (
                        <Warning className="text-orange-600" weight="fill" />
                      ) : (
                        <Check className="text-green-600" weight="bold" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.product_code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-sm">{row.category || '-'}</TableCell>
                    <TableCell className="text-sm">{row.brand || '-'}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="max-w-xs">
                      {row.errors.length > 0 && (
                        <div className="text-xs text-destructive mb-1">
                          {row.errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                      {row.warnings.length > 0 && (
                        <div className="text-xs text-yellow-700">
                          {row.warnings.map((warn, i) => (
                            <div key={i}>• {warn}</div>
                          ))}
                        </div>
                      )}
                      {row.isDuplicate && (
                        <div className="text-xs text-yellow-700 font-semibold">
                          → Ohitetaan (duplikaatti)
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Vain uudet ja kelvolliset tuotteet tuodaan. Duplikaatit ja virheelliset ohitetaan.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isProcessing}>
                Peruuta
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isProcessing || !stats || stats.new === 0}
              >
                {isProcessing ? 'Tuodaan...' : `Tuo ${stats?.new || 0} uutta tuotetta`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
