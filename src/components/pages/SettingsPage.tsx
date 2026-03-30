import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { useSettings } from '../../hooks/use-data';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    defaultVatPercent: '',
    defaultMarginPercent: '',
    defaultRegionCoefficient: '',
  });

  useEffect(() => {
    setFormData({
      companyName: settings.companyName || '',
      companyAddress: settings.companyAddress || '',
      companyPhone: settings.companyPhone || '',
      companyEmail: settings.companyEmail || '',
      defaultVatPercent: settings.defaultVatPercent.toString(),
      defaultMarginPercent: settings.defaultMarginPercent.toString(),
      defaultRegionCoefficient: settings.defaultRegionCoefficient.toString(),
    });
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const vatPercent = parseFloat(formData.defaultVatPercent);
    const marginPercent = parseFloat(formData.defaultMarginPercent);
    const regionCoefficient = parseFloat(formData.defaultRegionCoefficient);

    if (isNaN(vatPercent) || vatPercent < 0) {
      toast.error('Virheellinen ALV-prosentti');
      return;
    }

    if (isNaN(marginPercent) || marginPercent < 0) {
      toast.error('Virheellinen marginaaliprosentti');
      return;
    }

    if (isNaN(regionCoefficient) || regionCoefficient < 0) {
      toast.error('Virheellinen aluekerroin');
      return;
    }

    updateSettings({
      companyName: formData.companyName,
      companyAddress: formData.companyAddress || undefined,
      companyPhone: formData.companyPhone || undefined,
      companyEmail: formData.companyEmail || undefined,
      defaultVatPercent: vatPercent,
      defaultMarginPercent: marginPercent,
      defaultRegionCoefficient: regionCoefficient,
    });

    toast.success('Asetukset tallennettu');
  };

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-semibold">Asetukset</h1>

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Yritystiedot</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Yrityksen nimi *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Osoite</Label>
                <Input
                  id="companyAddress"
                  value={formData.companyAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, companyAddress: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Puhelin</Label>
                  <Input
                    id="companyPhone"
                    value={formData.companyPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, companyPhone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Sähköposti</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, companyEmail: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">Oletusarvot</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultVatPercent">Oletus ALV-% *</Label>
                <Input
                  id="defaultVatPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.defaultVatPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultVatPercent: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Oletusarvoisesti 0% B2B-rakentamiselle
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultMarginPercent">Oletus marginaali-% *</Label>
                <Input
                  id="defaultMarginPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.defaultMarginPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultMarginPercent: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultRegionCoefficient">Oletus aluekerroin *</Label>
                <Input
                  id="defaultRegionCoefficient"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultRegionCoefficient}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultRegionCoefficient: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Esim. PK-seutu = 1.15
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Tallenna asetukset</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
