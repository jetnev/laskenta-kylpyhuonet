import { Bell, BellSlash, CalendarBlank, Clock, EnvelopeSimple, Gear, Trash, Warning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useDeadlineNotifications, type DeadlineNotification } from '../hooks/use-deadline-notifications';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

const MILESTONE_TYPE_LABELS: Record<string, string> = {
	deadline: 'Määräaika',
	delivery: 'Toimitus',
	start: 'Aloitus',
	completion: 'Valmistuminen',
	other: 'Muu',
};

interface DeadlineNotificationsProps {
	compact?: boolean;
}

export default function DeadlineNotifications({ compact = false }: DeadlineNotificationsProps) {
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

	if (!settings) {
		return null;
	}

	const visibleDeadlines = compact ? upcomingDeadlines.slice(0, 3) : upcomingDeadlines;

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
	};

	const handleAddCustomDay = () => {
		const days = Number.parseInt(customDays, 10);
		if (Number.isNaN(days) || days < 0) {
			toast.error('Anna kelvollinen päivämäärä');
			return;
		}

		const currentDays = settings.notifyDaysBefore || [];
		if (currentDays.includes(days)) {
			toast.error('Ilmoitus on jo lisätty');
			return;
		}

		updateSettings({ notifyDaysBefore: [...currentDays, days].sort((left, right) => right - left) });
		setCustomDays('');
		toast.success(`Ilmoitus lisätty ${days} päivää ennen`);
	};

	const handleRemoveDay = (day: number) => {
		updateSettings({
			notifyDaysBefore: (settings.notifyDaysBefore || []).filter((currentDay) => currentDay !== day),
		});
		toast.success('Ilmoitus poistettu');
	};

	return (
		<Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
			<CardHeader className={compact ? 'pb-3' : 'pb-4'}>
				<div className="flex items-start gap-3 pr-12">
					<div className={`rounded-2xl p-2 ${settings.enabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
						{settings.enabled ? <Bell className="h-5 w-5" weight="fill" /> : <BellSlash className="h-5 w-5" />}
					</div>
					<div>
						<CardTitle>Määräaikaseuranta</CardTitle>
						<CardDescription>
							{compact
								? 'Seuraa lähimpiä määräaikoja ja avaa asetukset samasta kortista.'
								: 'Seuraa lähestyviä määräaikoja, toimituksia ja ilmoitushistoriaa yhdestä paikasta.'}
						</CardDescription>
					</div>
				</div>

				<CardAction>
					<Dialog open={showSettings} onOpenChange={setShowSettings}>
						<DialogTrigger asChild>
							<Button data-testid="deadline-settings-button" variant="outline" size="sm" className="gap-2">
								<Gear className="h-4 w-4" />
								{!compact && <span>Asetukset</span>}
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>Ilmoitusasetukset</DialogTitle>
							</DialogHeader>

							<div className="max-h-[60vh] space-y-5 overflow-y-auto py-2">
								<div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
									<Label htmlFor="deadline-enabled" className="flex-1 text-sm">Ilmoitukset käytössä</Label>
									<Switch
										id="deadline-enabled"
										checked={settings.enabled}
										onCheckedChange={(checked) => updateSettings({ enabled: checked })}
									/>
								</div>

								<div className="space-y-3">
									<Label className="text-sm">Ilmoita etukäteen (päiviä)</Label>
									<div className="flex flex-wrap gap-2">
										{(settings.notifyDaysBefore || []).map((day) => (
											<Badge key={day} variant="secondary" className="gap-2 text-xs">
												{day} päivää
												<button
													type="button"
													onClick={() => handleRemoveDay(day)}
													className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full hover:text-destructive"
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
											onChange={(event) => setCustomDays(event.target.value)}
											placeholder="Lisää päivät"
										/>
										<Button type="button" variant="outline" onClick={handleAddCustomDay}>
											Lisää
										</Button>
									</div>
								</div>

								<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
									<div className="flex items-center justify-between gap-4">
										<div>
											<Label htmlFor="deadline-email-enabled" className="text-sm font-medium">Sähköposti-ilmoitukset</Label>
											<p className="text-xs text-muted-foreground">Demo-ominaisuus</p>
										</div>
										<Switch
											id="deadline-email-enabled"
											checked={settings.emailEnabled}
											onCheckedChange={(checked) => updateSettings({ emailEnabled: checked })}
										/>
									</div>

									<div>
										<Label htmlFor="deadline-email" className="text-sm">Sähköpostiosoite</Label>
										<Input
											id="deadline-email"
											type="email"
											value={tempEmail}
											onChange={(event) => setTempEmail(event.target.value)}
											placeholder="oma.nimi@example.com"
											className="mt-1.5"
											disabled={!settings.emailEnabled}
										/>
										<Alert className="mt-3 py-2">
											<EnvelopeSimple className="h-4 w-4" />
											<AlertDescription className="text-xs">
												{settings.emailEnabled
													? 'Anna sähköpostiosoite saadaksesi demoilmoitukset lähestyvistä määräajoista.'
													: 'Ota sähköposti-ilmoitukset käyttöön, jos haluat kokeilla demoilmoituksia.'}
											</AlertDescription>
										</Alert>
									</div>
								</div>
							</div>

							<DialogFooter>
								<Button onClick={handleSaveSettings} className="w-full sm:w-auto">Tallenna</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardAction>
			</CardHeader>

			<CardContent className="space-y-4">
				{!settings.enabled && (
					<Alert>
						<Warning className="h-4 w-4" />
						<AlertDescription>
							Ilmoitukset eivät ole käytössä. Ota määräaikaseuranta käyttöön asetuksista.
						</AlertDescription>
					</Alert>
				)}

				{visibleDeadlines.length === 0 ? (
					<div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
						<CalendarBlank className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
						Tänään ei ole lähestyviä määräaikoja seuraavan 30 päivän aikana.
					</div>
				) : (
					<div className="space-y-3">
						{visibleDeadlines.map((deadline: DeadlineNotification) => (
							<div key={deadline.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_30px_-32px_rgba(15,23,42,0.35)]">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant={getBadgeVariant(deadline.daysUntil)} className="text-xs">
												<Clock className="mr-1 h-3 w-3" />
												{getDaysText(deadline.daysUntil)}
											</Badge>
											<span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
												{MILESTONE_TYPE_LABELS[deadline.milestoneName] || deadline.milestoneName}
											</span>
										</div>
										<p className="mt-3 font-medium text-slate-950">{deadline.projectName}</p>
										<p className="mt-1 text-sm text-muted-foreground">{deadline.customerName}</p>
										<p className="mt-2 text-xs text-muted-foreground">Tavoitepäivä {formatDate(deadline.targetDate)}</p>
									</div>

									{settings.emailEnabled && !compact && (
										<Button variant="ghost" size="sm" onClick={() => sendEmailNotification(deadline)}>
											<EnvelopeSimple className="h-4 w-4" />
										</Button>
									)}
								</div>
							</div>
						))}

						{compact && upcomingDeadlines.length > visibleDeadlines.length && (
							<p className="text-xs text-muted-foreground">
								Näytetään 3 lähintä määräaikaa {upcomingDeadlines.length} kohteesta.
							</p>
						)}
					</div>
				)}

				{!compact && notifiedDeadlines && notifiedDeadlines.length > 0 && (
					<div className="border-t pt-4">
						<div className="mb-3 flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-medium text-slate-950">Ilmoitushistoria</p>
								<p className="text-xs text-muted-foreground">Viimeisimmät lähetetyt muistutukset</p>
							</div>
							<Button variant="ghost" size="sm" onClick={clearNotificationHistory}>
								<Trash className="h-4 w-4" />
								Tyhjennä
							</Button>
						</div>

						<div className="max-h-60 space-y-2 overflow-y-auto pr-1">
							{notifiedDeadlines.slice(0, 10).map((notification: DeadlineNotification) => (
								<div key={notification.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
									<span className="block font-medium text-slate-950">{notification.projectName}</span>
									<span className="mt-1 block text-xs text-muted-foreground">{notification.milestoneName}</span>
									<span className="mt-2 block text-xs text-muted-foreground">{new Date(notification.notifiedAt).toLocaleDateString('fi-FI')}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
