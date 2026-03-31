import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { useSettings } from '../../hooks/use-data';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  
  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    defaultVatPercent: settings.defaultVatPercent,
    defaultMarginPercent: settings.defaultMarginPercent,
  });

  const handleSave = () => {
    updateSettings(formData);
    toast.success('Asetukset tallennettu');
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Asetukset</h1>
        <p className="text-muted-foreground mt-1">Sovelluksen yleiset asetukset</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Yritystiedot</h3>
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="companyName">Yrityksen nimi</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Osoite</Label>
            <Input
              id="companyAddress"
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Puhelin</Label>
              <Input
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Sähköposti</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Oletusarvot</h3>
        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatPercent">Oletusarvonlisävero (%)</Label>
              <Input
                id="vatPercent"
                type="number"
                step="0.1"
                value={formData.defaultVatPercent}
                onChange={(e) => setFormData({ ...formData, defaultVatPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginPercent">Oletuskateprosentti (%)</Label>
              <Input
                id="marginPercent"
                type="number"
                step="0.1"
                value={formData.defaultMarginPercent}
                onChange={(e) => setFormData({ ...formData, defaultMarginPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Tallenna asetukset</Button>
      </div>
    </div>
  );
}
