import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Upload } from '@phosphor-icons/react';
import { Alert, AlertDescription } from '../ui/alert';

export default function ImportPage() {
  const handleDownloadTemplate = () => {
    const csvContent = `tuotekoodi,nimi,kategoria,yksikko,ostohinta,hintaryhmä
ABC-123,Esimerkkituote 1,Suihkukalusteet,kpl,150.00,Perusasennus
ABC-124,Esimerkkituote 2,Wc-kalusteet,kpl,200.00,Perusasennus`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tuote_tuonti_pohja.csv';
    link.click();
  };

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-semibold">Tuonti</h1>

      <div className="max-w-3xl space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Tuotteiden tuonti</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Tuo tuotteita järjestelmään Excel-tiedostosta. Lataa ensin pohja, täytä se,
            ja lähetä se takaisin järjestelmään.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleDownloadTemplate} className="gap-2">
              <Download weight="bold" />
              Lataa tuontipohja (CSV)
            </Button>
            <Button variant="outline" disabled className="gap-2">
              <Upload weight="bold" />
              Lähetä täytetty tiedosto
            </Button>
          </div>
        </Card>

        <Alert>
          <AlertDescription>
            <strong>Tuontiominaisuus kehitteillä.</strong> Tällä hetkellä voit ladata pohjan, mutta
            tuonti ei vielä toimi. Lisää tuotteita manuaalisesti Tuoterekisteri-sivulla.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
