import { useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Upload, Check, Warning } from '@phosphor-icons/react';
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
import { useProducts, useInstallationGroups } from '../../hooks/use-data';
import { UnitType } from '../../lib/types';
import { toast } from 'sonner';

interface ImportRow {
  code: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: string;
  installationGroup: string;
}

interface ParsedImportRow {
  code: string;
  name: string;
  category: string;
  unit: UnitType;
  purchasePrice: number;
  installationGroupName: string;
  isValid: boolean;
  errors: string[];
}

export default function ImportPage() {
  const { products, addProduct } = useProducts();
  const { groups } = useInstallationGroups();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importData, setImportData] = useState<ParsedImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadTemplate = () => {
    const csvContent = `tuotekoodi;nimi;kategoria;yksikko;ostohinta;hintaryhmä
ABC-001;Suihkusetti Hansgrohe Croma 100;Suihkukalusteet;kpl;245.50;Perusasennus
WC-002;WC-istuin Gustavsberg Nautic;Wc-kalusteet;kpl;189.00;Perusasennus
KAAK-003;Kaakel Pukkila 30x60 valkoinen;Laatoitus;m²;32.90;Laatoitus
HAN-004;Pesuallashana Oras Safira;Hanat;kpl;156.00;Perusasennus`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tuote_tuonti_pohja.csv';
    link.click();
    
    toast.success('Tuontipohja ladattu');
  };

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    const data: ImportRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length >= 6) {
        data.push({
          code: parts[0].trim(),
          name: parts[1].trim(),
          category: parts[2].trim(),
          unit: parts[3].trim(),
          purchasePrice: parts[4].trim(),
          installationGroup: parts[5].trim(),
        });
      }
    }
    
    return data;
  };

  const validateAndParseRow = (row: ImportRow): ParsedImportRow => {
    const errors: string[] = [];
    let unit: UnitType = 'kpl';
    let purchasePrice = 0;

    if (!row.code) {
      errors.push('Tuotekoodi puuttuu');
    }

    if (!row.name) {
      errors.push('Nimi puuttuu');
    }

    const validUnits: UnitType[] = ['kpl', 'm²', 'jm', 'm'];
    if (validUnits.includes(row.unit as UnitType)) {
      unit = row.unit as UnitType;
    } else {
      errors.push(`Virheellinen yksikkö: ${row.unit} (sallitut: kpl, m², jm, m)`);
    }

    const price = parseFloat(row.purchasePrice.replace(',', '.'));
    if (isNaN(price) || price < 0) {
      errors.push('Virheellinen ostohinta');
    } else {
      purchasePrice = price;
    }

    const existingProduct = products.find(p => p.code === row.code);
    if (existingProduct) {
      errors.push('Tuotekoodi on jo käytössä');
    }

    return {
      code: row.code,
      name: row.name,
      category: row.category,
      unit,
      purchasePrice,
      installationGroupName: row.installationGroup,
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawData = parseCSV(text);
        const parsedData = rawData.map(validateAndParseRow);
        
        setImportData(parsedData);
        setShowPreview(true);
        
        const validCount = parsedData.filter(r => r.isValid).length;
        const invalidCount = parsedData.length - validCount;
        
        if (invalidCount > 0) {
          toast.warning(`${validCount} kelvollista riviä, ${invalidCount} virheellistä riviä`);
        } else {
          toast.success(`${validCount} riviä valmis tuotavaksi`);
        }
      } catch (error) {
        toast.error('Tiedoston lukeminen epäonnistui');
        console.error(error);
      }
    };
    
    reader.readAsText(file, 'UTF-8');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    setIsProcessing(true);
    
    const validRows = importData.filter(r => r.isValid);
    let importedCount = 0;

    validRows.forEach(row => {
      const group = groups.find(g => g.name.toLowerCase() === row.installationGroupName.toLowerCase());
      
      try {
        addProduct({
          code: row.code,
          name: row.name,
          category: row.category,
          unit: row.unit,
          purchasePrice: row.purchasePrice,
          installationGroupId: group?.id,
        });
        importedCount++;
      } catch (error) {
        console.error(`Failed to import ${row.code}:`, error);
      }
    });

    setIsProcessing(false);
    setShowPreview(false);
    setImportData([]);
    
    toast.success(`${importedCount} tuotetta tuotu onnistuneesti`);
  };

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-semibold">Tuonti</h1>

      <div className="max-w-4xl space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Tuotteiden massatuonti</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Tuo tuotteita järjestelmään CSV-tiedostosta. Lataa ensin pohja, täytä se tietokoneellasi,
            ja lähetä täytetty tiedosto takaisin järjestelmään.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2">
              <Download weight="bold" />
              Lataa tuontipohja (CSV)
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              className="gap-2"
            >
              <Upload weight="bold" />
              Lähetä täytetty tiedosto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </Card>

        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Ohjeet:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Lataa tuontipohja CSV-muodossa</li>
                <li>Avaa tiedosto Excelissä tai muussa taulukkolaskentaohjelmassa</li>
                <li>Täytä tuotetiedot. Älä muuta otsikkoriviä!</li>
                <li>Tallenna tiedosto CSV-muodossa (puolipiste-eroteltu)</li>
                <li>Lataa tiedosto järjestelmään yllä olevalla painikkeella</li>
                <li>Tarkista esikatselu ja vahvista tuonti</li>
              </ol>
              <p className="mt-2 text-sm"><strong>Huom:</strong> Tuotteet, joiden tuotekoodi on jo käytössä, ohitetaan.</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Tuonnin esikatselu</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Tila</TableHead>
                  <TableHead>Koodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Yks.</TableHead>
                  <TableHead className="text-right">Hinta</TableHead>
                  <TableHead>Virheet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {row.isValid ? (
                        <Check className="text-green-600" weight="bold" />
                      ) : (
                        <Warning className="text-destructive" weight="bold" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.purchasePrice.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <span className="text-xs text-destructive">
                          {row.errors.join(', ')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">{importData.filter(r => r.isValid).length}</span> kelvollista / {' '}
              <span className="font-semibold">{importData.length}</span> yhteensä
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Peruuta
              </Button>
              <Button 
                onClick={handleConfirmImport} 
                disabled={isProcessing || importData.filter(r => r.isValid).length === 0}
              >
                {isProcessing ? 'Tuodaan...' : 'Vahvista tuonti'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
