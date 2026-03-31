import { Bell, BellSlash, Clock, EnvelopeSimple, Trash, Gear, CalendarBlank, Warning } from '@phosphor-icons/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { useDeadlineNotifications, DeadlineNotification } from '../hooks/use-deadline-notifications';
import { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  deadline: 'Määräaika',
  delivery: 'Toimitus',
  start: 'Aloitus',
  completion: 'Valmistuminen',
  other: 'Muu',
};

export default function DeadlineNotifications() {
  const {
    settings,
    updateSettings,
    upcomingDeadlines,
    notifiedDeadlines,
    clearNotificationHistory,
    sendEmailNotification,
  } = useDeadlineNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [tempEmail, setTempEmail] = useState(settings?.emailAddress || '');
  const [customDays, setCustomDays] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'Tänään';
    if (days === 1) return 'Huomenna';
    return `${days} päivän kuluttua`;
  };

  const getBadgeVariant = (days: number): 'default' | 'secondary' | 'destructive' => {
    if (days === 0) return 'destructive';
    if (days <= 3) return 'default';
    return 'secondary';
  };

  const handleSaveSettings = () => {
    if (settings) {
      updateSettings({ emailAddress: tempEmail });
      toast.success('Asetukset tallennettu');
      setShowSettings(false);
    }
  };

  const handleAddCustomDay = () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days < 0) {
      toast.error('Anna kelvollinen päivämäärä');
      return;
    }
    if (settings) {
      const currentDays = settings.notifyDaysBefore || [];
      if (!currentDays.includes(days)) {
        updateSettings({ notifyDaysBefore: [...currentDays, days].sort((a, b) => b - a) });
        setCustomDays('');
        toast.success(`Ilmoitus lisätty ${days} päivää ennen`);
      } else {
        toast.error('Ilmoitus on jo lisätty');
      }
    }
  };

  const handleRemoveDay = (day: number) => {
    if (settings) {
      updateSettings({
        notifyDaysBefore: (settings.notifyDaysBefore || []).filter(d => d !== day),
      });
      toast.success('Ilmoitus poistettu');
    }
  };

  if (!settings) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell className="h-6 w-6 text-primary" weight="fill" />
          ) : (
            <BellSlash className="h-6 w-6 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-xl font-semibold">Määräaikailmoitukset</h2>
            <p className="text-sm text-muted-foreground">
              Seuraa lähestyviä määräaikoja ja toimituksia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Gear className="h-4 w-4" />
                Asetukset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ilmoitusasetukset</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enabled" className="flex-1">
                    Ilmoitukset käytössä
                  </Label>
                  <Switch
                    id="enabled"
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Ilmoita etukäteen (päiviä)</Label>
                  <div className="flex flex-wrap gap-2">
                    {(settings.notifyDaysBefore || []).map(day => (
                      <Badge key={day} variant="secondary" className="gap-2">
                        {day} päivää
                        <button
                          onClick={() => handleRemoveDay(day)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Lisää päivät"
                      className="flex-1"
                    />
                    <Button onClick={handleAddCustomDay} variant="outline" size="sm">
                      Lisää
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailEnabled">Sähköposti-ilmoitukset</Label>
                    <Switch
                      id="emailEnabled"
                      checked={settings.emailEnabled}
                      onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
                    />
                  </div>
                  {settings.emailEnabled && (
                    <div>
                      <Label htmlFor="email">Sähköpostiosoite</Label>
                      <Input
                        id="email"
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Huom: Sähköpostin lähetys on demo-ominaisuus
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings}>Tallenna</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!settings.enabled && (
        <Alert className="mb-4">
          <Warning className="h-4 w-4" />
          <AlertDescription>
            Ilmoitukset eivät ole käytössä. Ota käyttöön asetuksista.
          </AlertDescription>
        </Alert>
      )}

      {upcomingDeadlines.length === 0 ? (
        <div className="text-center py-12">
          <CalendarBlank className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Ei lähestyviä määräaikoja seuraavan 30 päivän aikana
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">
            Lähestyvät määräajat ({upcomingDeadlines.length})
          </h3>
          {upcomingDeadlines.map((deadline: DeadlineNotification) => (
            <Card key={deadline.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getBadgeVariant(deadline.daysUntil)}>
                      <Clock className="h-3 w-3 mr-1" />
                      {getDaysText(deadline.daysUntil)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {MILESTONE_TYPE_LABELS[deadline.milestoneName] || deadline.milestoneName}
                    </span>
                  </div>
                  <h4 className="font-medium">{deadline.projectName}</h4>
                  <p className="text-sm text-muted-foreground">{deadline.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tavoitepäivä: {formatDate(deadline.targetDate)}
                  </p>
                </div>
                {settings.emailEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendEmailNotification(deadline)}
                    className="gap-2"
                  >
                    <EnvelopeSimple className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {notifiedDeadlines && notifiedDeadlines.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-muted-foreground">
              Ilmoitushistoria ({notifiedDeadlines.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotificationHistory}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Tyhjennä
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifiedDeadlines.slice(0, 10).map((notification: DeadlineNotification) => (
              <div
                key={notification.id}
                className="text-sm p-2 rounded-md bg-muted/50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <span className="font-medium">{notification.projectName}</span>
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="text-muted-foreground">{notification.milestoneName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.notifiedAt).toLocaleDateString('fi-FI')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
