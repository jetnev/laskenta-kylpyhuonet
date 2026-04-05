import {
	ArrowRight,
	FolderOpen,
	Package,
	Plus,
	TrendUp,
	WarningCircle,
} from '@phosphor-icons/react';
import { useMemo } from 'react';

import DeadlineNotifications from '../DeadlineNotifications';
import { AppPageLayout } from '../layout/AppPageLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useCustomers, useInvoices, useProducts, useProjects, useQuoteRows, useQuotes } from '../../hooks/use-data';
import type { AppLocationState } from '../../lib/app-routing';
import { buildWorkspaceActionCenter } from '../../lib/workspace-flow';

interface DashboardProps {
	onNavigate?: (location: AppLocationState) => void;
}

const TASK_TONE_STYLES = {
	critical: 'border-red-200 bg-red-50/80 text-red-900',
	attention: 'border-amber-200 bg-amber-50/80 text-amber-900',
	'follow-up': 'border-sky-200 bg-sky-50/80 text-sky-900',
	info: 'border-slate-200 bg-slate-50 text-slate-900',
} as const;

export default function Dashboard({ onNavigate }: DashboardProps) {
	const { customers } = useCustomers();
	const { invoices } = useInvoices();
	const { products } = useProducts();
	const { projects } = useProjects();
	const { rows } = useQuoteRows();
	const { quotes } = useQuotes();

	const actionCenter = useMemo(
		() =>
			buildWorkspaceActionCenter({
				customers,
				invoices,
				products,
				projects,
				quoteRows: rows,
				quotes,
			}),
		[customers, invoices, products, projects, quotes, rows]
	);

	const nextAction = actionCenter.nextAction;
	const actionQueue = actionCenter.tasks.slice(0, 5);
	const resumeItems = actionCenter.resumeItems;
	const summaryCards = [
		{ label: 'Luonnokset', value: actionCenter.summary.blockedDrafts },
		{ label: 'Laskutus', value: actionCenter.summary.invoiceActions },
		{ label: 'Seuranta', value: actionCenter.summary.followUps },
		{ label: 'Määräajat', value: actionCenter.summary.deadlines },
		{ label: 'Esteet', value: actionCenter.summary.blockers },
	];

	if (!actionCenter.hasWorkspace) {
		return (
			<AppPageLayout pageType="dashboard">
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
					<Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
						<div className="flex h-full flex-col gap-6 p-6 sm:p-8">
							<Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Työn aloitus</Badge>
							<div className="space-y-3">
								<h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Etusivu ohjaa työn käyntiin yhdestä paikasta</h1>
								<p className="max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
									Aloita projektityötilasta. Kun asiakas, projekti ja ensimmäinen tarjous ovat olemassa, Etusivu alkaa ohjata seuraavat työvaiheet automaattisesti oikeaan paikkaan.
								</p>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<Button className="justify-center gap-2 bg-white text-slate-950 hover:bg-slate-100" onClick={() => onNavigate?.({ page: 'projects' })}>
									<Plus className="h-4 w-4" />
									Avaa projektityötila
								</Button>
								<Button
									variant="outline"
									className="justify-center gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
									onClick={() => onNavigate?.({ page: 'products' })}
								>
									<Package className="h-4 w-4" />
									Lisää ensimmäinen tuote
								</Button>
							</div>

							<div className="grid gap-3 md:grid-cols-3">
								{[
									{
										title: '1. Luo asiakas ja projekti',
										description: 'Projektityötila muodostaa asiakkaan, tarjouksen ja laskutuksen saman työnkulun alle.',
									},
									{
										title: '2. Rakenna tarjous',
										description: 'Tarjouseditori avautuu suoraan projektin sisään, joten työ ei hajoa sivulta toiselle.',
									},
									{
										title: '3. Palaa Etusivulle',
										description: 'Kun dataa on, Etusivu nostaa seuraavan tärkeimmän työn ja kiireelliset tehtävät näkyviin.',
									},
								].map((item) => (
									<div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
										<p className="text-base font-medium text-white">{item.title}</p>
										<p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
									</div>
								))}
							</div>
						</div>
					</Card>

					<div className="space-y-6">
						<Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
							<CardHeader>
								<CardTitle>Ensimmäinen askel</CardTitle>
								<CardDescription>Projektit-sivu on varsinainen työtila. Etusivu alkaa ohjata työtä vasta, kun siellä on mitä ohjata.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button className="w-full justify-between" onClick={() => onNavigate?.({ page: 'projects' })}>
									Luo ensimmäinen projekti
									<ArrowRight className="h-4 w-4" />
								</Button>
								{actionCenter.hasProductGap && (
									<Button variant="outline" className="w-full justify-between" onClick={() => onNavigate?.({ page: 'products' })}>
										Lisää tuotteet ennen ensimmäistä tarjousta
										<ArrowRight className="h-4 w-4" />
									</Button>
								)}
							</CardContent>
						</Card>

						<DeadlineNotifications compact />
					</div>
				</div>
			</AppPageLayout>
		);
	}

	return (
		<AppPageLayout pageType="dashboard">
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_340px]">
				<div className="space-y-6">
					<Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
						<div className="flex h-full flex-col gap-6 p-6 sm:p-8">
							<div className="space-y-4">
								<Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Työn ohjaus</Badge>
								<div className="space-y-3">
									<h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Etusivu näyttää mitä pitää tehdä nyt</h1>
									<p className="max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
										Päivän tilanne priorisoi kiireellisimmän työn, nostaa estävät puutteet näkyviin ja ohjaa suoraan oikeaan projektityötilaan tai laskuun.
									</p>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
								{summaryCards.map((item) => (
									<div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{item.label}</p>
										<p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{item.value}</p>
									</div>
								))}
							</div>

							<div className="rounded-[28px] border border-white/10 bg-white/6 p-5 sm:p-6">
								<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
									<div className="space-y-3">
										<div className="flex items-center gap-2 text-sky-200">
											<TrendUp className="h-4 w-4" weight="bold" />
											<span className="text-xs font-semibold uppercase tracking-[0.16em]">Seuraava tärkein työ</span>
										</div>
										<div>
											<h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
												{nextAction ? nextAction.title : 'Tänään ei ole kiireellisiä tehtäviä'}
											</h2>
											<p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
												{nextAction
													? nextAction.reason
													: 'Työjono näyttää hallitulta. Avaa projektityötila, kun haluat jatkaa keskeneräisiä projekteja tai luoda uutta.'}
											</p>
											{nextAction && <p className="mt-3 text-sm text-slate-300">{nextAction.locationLabel}</p>}
										</div>
									</div>

									<div className="flex flex-col gap-3 sm:min-w-52">
										<Button className="justify-between bg-white text-slate-950 hover:bg-slate-100" onClick={() => nextAction ? onNavigate?.(nextAction.target) : onNavigate?.({ page: 'projects' })}>
											{nextAction ? nextAction.ctaLabel : 'Avaa projektityötila'}
											<ArrowRight className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											className="justify-between border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
											onClick={() => onNavigate?.({ page: 'projects' })}
										>
											Jatka projektityötilaan
											<FolderOpen className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					</Card>

					<Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
						<CardHeader>
							<CardTitle>Päivän tilanne</CardTitle>
							<CardDescription>
								Lista näyttää vain tehtävät, jotka johtavat suoraan seuraavaan toimenpiteeseen. Mitä ylempänä rivi on, sitä kiireellisempänä työ kannattaa hoitaa.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{actionQueue.length === 0 ? (
								<div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
									Tänään ei ole kiireellisiä tehtäviä. Avaa projektityötila, kun haluat jatkaa tarjouksia tai tarkistaa asiakaskontekstin.
								</div>
							) : (
								<div className="space-y-3">
									{actionQueue.map((task, index) => (
										<div key={task.id} className={`rounded-2xl border px-4 py-4 ${TASK_TONE_STYLES[task.tone]}`}>
											<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<Badge variant="outline" className="bg-white/70">#{index + 1}</Badge>
														<p className="font-medium">{task.title}</p>
													</div>
													<p className="mt-2 text-sm leading-6 text-current/80">{task.reason}</p>
													<p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-current/60">{task.locationLabel}</p>
												</div>
												<Button variant="outline" className="border-current/20 bg-white/80 text-current hover:bg-white" onClick={() => onNavigate?.(task.target)}>
													{task.ctaLabel}
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
						<CardHeader>
							<CardTitle>Jatka työskentelyä</CardTitle>
							<CardDescription>Etusivulta pääsee suoraan takaisin viimeisimpään tarjoukseen, projektiin tai avoimeen laskuun.</CardDescription>
						</CardHeader>
						<CardContent>
							{resumeItems.length === 0 ? (
								<div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
									Ei jatkettavia kohteita juuri nyt.
								</div>
							) : (
								<div className="space-y-3">
									{resumeItems.map((item) => (
										<div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-32px_rgba(15,23,42,0.35)]">
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant="outline">{item.badgeLabel}</Badge>
												<p className="font-medium text-slate-950">{item.title}</p>
											</div>
											<p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
											<p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.meta}</p>
											<Button className="mt-4 w-full justify-between" variant="outline" onClick={() => onNavigate?.(item.target)}>
												{item.ctaLabel}
												<ArrowRight className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{actionCenter.hasProductGap && (
						<Card className="border-amber-200 bg-amber-50/70 shadow-[0_20px_50px_-44px_rgba(120,53,15,0.25)]">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-amber-950">
									<WarningCircle className="h-5 w-5" weight="fill" />
									Tuoterekisteri puuttuu vielä
								</CardTitle>
								<CardDescription className="text-amber-900/80">
									Tarjousluonnokset pysyvät kevyinä ilman tuotteita, mutta ensimmäinen oikea laskenta kannattaa tehdä vasta tuoterekisterin jälkeen.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button className="w-full justify-between" variant="outline" onClick={() => onNavigate?.({ page: 'products' })}>
									Lisää ensimmäinen tuote
									<Package className="h-4 w-4" />
								</Button>
							</CardContent>
						</Card>
					)}

					<DeadlineNotifications compact />
				</div>
			</div>
		</AppPageLayout>
	);
}
