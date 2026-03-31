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
import { useState, useEffect } from 'react';
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
  const [tempEmail, setTempEmail] = useState('');
  const [customDays, setCustomDays] = useState('');

  useEffect(() => {
    if (settings?.emailAddress) {
      setTempEmail(settings.emailAddress);
    }
  }, [settings?.emailAddress]);

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
      const emailToSave = tempEmail.trim();
      if (settings.emailEnabled && !emailToSave) {
        toast.error('Sähköpostiosoite vaaditaan');
        return;
      }
      if (emailToSave && !emailToSave.includes('@')) {
        toast.error('Anna kelvollinen sähköpostiosoite');
        return;
      }
      updateSettings({ emailAddress: emailToSave });
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
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" weight="fill" />
          ) : (
            <BellSlash className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate">Määräaikailmoitukset</h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Seuraa lähestyviä määräaikoja ja toimituksia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-h-[44px]">
                <Gear className="h-4 w-4" />
                <span className="hidden sm:inline">Asetukset</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Ilmoitusasetukset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 sm:space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="enabled" className="flex-1 text-sm">
                    Ilmoitukset käytössä
                  </Label>
                  <Switch
                    id="enabled"
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm">Ilmoita etukäteen (päiviä)</Label>
                  <div className="flex flex-wrap gap-2">
                    {(settings.notifyDaysBefore || []).map(day => (
                      <Badge key={day} variant="secondary" className="gap-2 text-xs">
                        {day} päivää
                        <button
                          onClick={() => handleRemoveDay(day)}
                          className="hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
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
                      className="flex-1 text-base h-11"
                    />
                    <Button onClick={handleAddCustomDay} variant="outline" size="sm" className="min-h-[44px]">
                      Lisää
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailEnabled" className="text-sm font-medium">Sähköposti-ilmoitukset</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Demo-ominaisuus</p>
                    </div>
                    <Switch
                      id="emailEnabled"
                      checked={settings.emailEnabled}
                      onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm">Sähköpostiosoite</Label>
                    <Input
                      id="email"
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="oma.nimi@example.com"
                      className="mt-1.5 text-base h-11"
                      disabled={!settings.emailEnabled}
                    />
                    <Alert className="mt-2 py-2">
                      <EnvelopeSimple className="h-4 w-4 flex-shrink-0" />
                      <AlertDescription className="text-xs">
                        {settings.emailEnabled 
                          ? 'Anna sähköpostiosoite saadaksesi AI-luodut demo-ilmoitukset lähestyvistä määräajoista.'
                          : 'Ota sähköposti-ilmoitukset käyttöön saadaksesi AI-luodut demo-ilmoitukset.'
                        }
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings} className="min-h-[44px] w-full sm:w-auto">Tallenna</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!settings.enabled && (
        <Alert className="mb-4">
          <Warning className="h-4 w-4 flex-shrink-0" />
          <AlertDescription className="text-sm">
            Ilmoitukset eivät ole käytössä. Ota käyttöön asetuksista.
          </AlertDescription>
        </Alert>
      )}

      {upcomingDeadlines.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <CalendarBlank className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground px-4">
            Ei lähestyviä määräaikoja seuraavan 30 päivän aikana
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-3">
            Lähestyvät määräajat ({upcomingDeadlines.length})
          </h3>
          {upcomingDeadlines.map((deadline: DeadlineNotification) => (
            <Card key={deadline.id} className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={getBadgeVariant(deadline.daysUntil)} className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {getDaysText(deadline.daysUntil)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {MILESTONE_TYPE_LABELS[deadline.milestoneName] || deadline.milestoneName}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm sm:text-base truncate">{deadline.projectName}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{deadline.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tavoitepäivä: {formatDate(deadline.targetDate)}
                  </p>
                </div>
                {settings.emailEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendEmailNotification(deadline)}
                    className="gap-2 flex-shrink-0 min-h-[44px] min-w-[44px]"
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
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-medium text-xs sm:text-sm text-muted-foreground">
              Ilmoitushistoria ({notifiedDeadlines.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotificationHistory}
              className="gap-2 min-h-[44px]"
            >
              <Trash className="h-4 w-4" />
              <span className="hidden sm:inline">Tyhjennä</span>
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifiedDeadlines.slice(0, 10).map((notification: DeadlineNotification) => (
              <div
                key={notification.id}
                className="text-sm p-2 sm:p-3 rounded-md bg-muted/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-xs sm:text-sm truncate block">{notification.projectName}</span>
                  <span className="text-muted-foreground text-xs truncate block sm:inline">
                    {notification.milestoneName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
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
