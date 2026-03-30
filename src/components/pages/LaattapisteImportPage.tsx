import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Download, Upload, Check, Warning, X } from '@phosphor-icons/react';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Table,
  TableCell,
  TableHeade
} from '../u
  Dialog,
  DialogHea
  DialogFooter,
import {
import { 
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
  unit: UnitType;
  install_group_code: string;
 

}
interface ImportStats {
  new: number;
  invalid: number;
}
export default fu
  const [rawInpu
  const [showPreview, setShow
  const [activeTab,
  const getExampl
LP-KAAK-001;Lattialaatt
LP-SAUM-001;Saumala
LP-PROF-001;Sisänurkk


    toast.success('Esim

    const temp

    const link = d
    link.download = 'la


  const parseCSV = (text: string): LaattapisteRow
    const data: LaattapisteRow[] = [];
    const delimiter = text.includes('\t') ? '\t
    for (let i = 1; i < lines.length; i++) {
      if (!line) continue;
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
      isDuplicate,
     

  const handleProces
      toast.error('Syötä tuotetied
    }

      
        toast.error('Ei löytynyt tuotteita');
      }
      const uniqueData = new Map<string, LaattapisteRow>();
        if (row.product_code) {
            
            uniqueData.set(row.product_code, row);
     


      setShowPreview(true);

    } catch (error) {
      console.error(error);
  };

      total: data.length
      duplicate: data.filter(r => r.isDup
     

  const handleConfirm

    l

        addP
          name: row.name,
          unit: row.u
        });
      } catch (error) {
      }

    setShowPreview(false);
    setRawInput('');
    toast.success(`${impor


    <div classN
      
    

      </div>
      <div className="max-w
          <TabsList>
            <


         
                <Button onClick={handleDo
      
                <Button onClick={
                  Lataa esimerkki
              <
       

                className="font-mono text-sm min-h-[300px]"

                <Button onClick
                  Käsittele ja esikatsele
              </div>
          </TabsCo
          <TabsContent value="instructions" classN
           
         
         

                    <ul className="list-disc list-inside space-y-1 text-sm mt-2 ml

                      <li>Laatta
                  </div>

                    <ol className="list-decimal
                      <li>Muodosta tiedot CSV-muotoon (käytä pohjaa apuna)</l
                     
                      <li>Vahvista tuonti vain uusil
                  </div>
     
    

                      <li><strong>brand</strong>: Tuotemerkki (esim. Pukk
            
                    </ul>

                    <p className="font-semibold mb-2">Tu
                      <li>Deduplikointi: Tuotteet d
                      <li>Esikatselu: Näet tarkan yhteenvedon ennen tuontia</li>
      
    

                    <pre className="b
LP-KAAK-001;Lattialaatta 3


                    <p cla

                      syöttämises
           
                  <d
                    <p className=
                      Tuo
                    </p>
                </div>
            </Alert>
        </T

        <DialogContent 
            <DialogTitle>Laattapiste-tuonnin esikatselu</DialogTitle>

       

                </div>
              </div>
                <div c
                </di

                <div className="text-2xl font-semibold text-orange-
    

                <div className="text-2xl font-semibold text-dest

          
                <div clas
                </div>
             
          )}
          <div className="flex-1 overflow-y-auto">
              <TableHeader>
              
              
            

              </TableHeader>
                {importData.map((row, index) => (
                    
                        <X className="text-destructive" weight="bold
                        <Warning className="text-yellow-600" weight="
                     

                    </TableCell>
                    <TableCell>{ro
                    <TableCell className="text-sm">{row.brand || '-'}</TableCell>
              
                        <div className="text-xs
                            <div key={i}>• {err}</div>
                        </div>
                      {row.warnings
                         
                          ))}
                      )}
                        <div clas
                        <
                    

            </Table>

            <div className="text-sm text-muted-foreground">
            </div>
              <Button variant="outline" onClick={() => setS
              </

              >
              </Button>
          </DialogFooter>
      </Dialog>
  );




















































































































































































































