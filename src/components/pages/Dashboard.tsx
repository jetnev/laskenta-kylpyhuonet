import {
  ArrowRight,
  FolderOpen,
  MagnifyingGlass,
  Package,
  PaperPlaneTilt,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react';
import { type ReactElement, useDeferredValue, useMemo, useState } from 'react';

import ActionCard from '../dashboard/ActionCard';
import DashboardCard from '../dashboard/DashboardCard';
import KPIBox from '../dashboard/KPIBox';
import RightPanelCard from '../dashboard/RightPanelCard';
import StatusBadge from '../dashboard/StatusBadge';
import TaskList from '../dashboard/TaskList';
import { AppPageHeader, AppPageLayout } from '../layout/AppPageLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useDashboardData } from '../../hooks/use-dashboard-data';
import type {
  DashboardAlert,
  DashboardKpi,
  DashboardNextAction,
  DashboardProjectStat,
  DashboardRecentItem,
} from '../../lib/dashboard-data';
import type { AppLocationState } from '../../lib/app-routing';
import { cn } from '../../lib/utils';

interface DashboardProps {
	onNavigate?: (location: AppLocationState) => void;
}

const KPI_ICON_MAP: Record<DashboardKpi['id'], ReactElement> = {
	open: <FolderOpen className="h-5 w-5" weight="duotone" />,
	sendable: <PaperPlaneTilt className="h-5 w-5" weight="duotone" />,
	'invoice-ready': <Receipt className="h-5 w-5" weight="duotone" />,
	issues: <WarningCircle className="h-5 w-5" weight="duotone" />,
};

function normalizeDashboardQuery(value: string) {
	return value.trim().toLowerCase();
}

function matchesDashboardQuery(query: string, item: { searchText: string }) {
	if (!query) {
		return true;
	}

	return item.searchText.includes(query);
}

function DashboardEmptyBlock({
	title,
	description,
	actionLabel,
	onAction,
}: {
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
}) {
	return (
		<div className="rounded-[22px] border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center">
			<h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
			<p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">{description}</p>
			{actionLabel && onAction ? (
				<Button variant="outline" className="mt-5 justify-between" onClick={onAction}>
					{actionLabel}
					<ArrowRight className="h-4 w-4" />
				</Button>
			) : null}
		</div>
	);
}

function buildOnboardingAction(): DashboardNextAction {
	return {
		title: 'Aloita ensimmäisestä tarjouksesta',
		customerName: 'Etusivu alkaa ohjata työtä heti, kun ensimmäinen projekti ja tarjous ovat olemassa.',
		projectName: 'Projektityötila',
		statusLabel: 'Alku',
		statusTone: 'info',
		summary: 'Luo asiakas, projekti ja ensimmäinen tarjous. Sen jälkeen Etusivu nostaa seuraavat toimet automaattisesti näkyviin.',
		description: 'Tämä näkymä on rakennettu työn ohjaamiseen. Kun perustat ensimmäisen työn, KPI:t, tehtävät ja oikean reunan jatkolistat alkavat täyttyä oikeasta datasta.',
		actions: [
			{
				label: 'Viimeistele tarjous',
				target: { page: 'projects' },
			},
			{
				label: 'Avaa projektityötila',
				target: { page: 'projects' },
				variant: 'secondary',
			},
			{
				label: 'Luo lasku',
				target: { page: 'invoices' },
				variant: 'outline',
			},
		],
		searchText: 'aloita projekti tarjous lasku',
	};
}

function RecentItemsList({ items, onNavigate }: { items: DashboardRecentItem[]; onNavigate: (target: AppLocationState) => void }) {
	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div key={item.id} className="rounded-[18px] border border-border/70 bg-background px-4 py-4 shadow-[0_14px_30px_-30px_rgba(15,23,42,0.35)]">
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge tone={item.tone}>{item.typeLabel}</StatusBadge>
						<p className="text-sm font-semibold text-foreground">{item.title}</p>
					</div>
					<p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
					<p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
					<Button className="mt-4 w-full justify-between" variant="outline" onClick={() => onNavigate(item.target)}>
						{item.ctaLabel}
						<ArrowRight className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}

function ProjectStatsList({
	stats,
	onNavigate,
}: {
	stats: DashboardProjectStat[];
	onNavigate: (target: AppLocationState) => void;
}) {
	return (
		<div className="space-y-3">
			{stats.map((item) => (
				<button
					key={item.id}
					type="button"
					onClick={() => onNavigate(item.target)}
					className={cn(
						'flex w-full items-center justify-between rounded-[18px] border border-border/70 bg-muted/10 px-4 py-4 text-left transition-all duration-150',
						'hover:border-primary/30 hover:bg-muted/20 hover:shadow-[0_18px_36px_-34px_rgba(15,23,42,0.35)]',
					)}
				>
					<div>
						<p className="text-sm font-medium text-foreground">{item.label}</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-4xl font-semibold tracking-[-0.04em] text-slate-900">{item.value}</span>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
					</div>
				</button>
			))}
		</div>
	);
}

function AlertsList({ alerts, onNavigate }: { alerts: DashboardAlert[]; onNavigate: (target: AppLocationState) => void }) {
	return (
		<div className="space-y-3">
			{alerts.map((alert) => (
				<div key={alert.id} className="rounded-[18px] border border-border/70 bg-background px-4 py-4 shadow-[0_14px_30px_-30px_rgba(15,23,42,0.35)]">
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
						<p className="text-sm font-semibold text-foreground">{alert.title}</p>
					</div>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">{alert.description}</p>
					<Button className="mt-4 w-full justify-between" variant="outline" onClick={() => onNavigate(alert.target)}>
						{alert.ctaLabel}
						<ArrowRight className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}

export default function Dashboard({ onNavigate }: DashboardProps) {
	const dashboardData = useDashboardData();
	const [searchQuery, setSearchQuery] = useState('');
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const normalizedSearchQuery = normalizeDashboardQuery(deferredSearchQuery);

	const heroAction = dashboardData.nextAction ?? buildOnboardingAction();
	const filteredTasks = useMemo(
		() => dashboardData.tasks.filter((item) => matchesDashboardQuery(normalizedSearchQuery, item)),
		[dashboardData.tasks, normalizedSearchQuery]
	);
	const filteredRecentItems = useMemo(
		() => dashboardData.recentItems.filter((item) => matchesDashboardQuery(normalizedSearchQuery, item)),
		[dashboardData.recentItems, normalizedSearchQuery]
	);
	const filteredProjectStats = useMemo(
		() => dashboardData.projectStats.filter((item) => matchesDashboardQuery(normalizedSearchQuery, item)),
		[dashboardData.projectStats, normalizedSearchQuery]
	);
	const filteredAlerts = useMemo(
		() => dashboardData.alerts.filter((item) => matchesDashboardQuery(normalizedSearchQuery, item)),
		[dashboardData.alerts, normalizedSearchQuery]
	);
	const totalSearchMatches = filteredTasks.length + filteredRecentItems.length + filteredProjectStats.length + filteredAlerts.length;

	const handleNavigate = (target: AppLocationState) => {
		onNavigate?.(target);
	};

	return (
		<AppPageLayout pageType="dashboard" className="max-w-[1400px] space-y-6">
			<AppPageHeader
				title="Työtila tänään"
				description="Etusivu näyttää seuraavat toimenpiteet, projektien tilanteen ja poikkeamat yhdestä näkymästä."
				actions={
					<div className="w-full max-w-md space-y-2">
						<div className="relative">
							<MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								className="h-11 rounded-2xl border-border/70 pl-10 shadow-sm"
								placeholder="Hae projekti, tarjous tai asiakas"
							/>
						</div>
						{normalizedSearchQuery ? (
							<p className="text-xs text-muted-foreground">{totalSearchMatches} osumaa nykyisestä työjonosta</p>
						) : null}
					</div>
				}
			/>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-6">
					<div className="rounded-[28px] border border-slate-900/95 bg-[linear-gradient(145deg,rgba(18,31,53,0.98),rgba(33,51,80,0.95))] p-4 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.7)] sm:p-5">
						<div className="grid gap-3 lg:grid-cols-4">
							{dashboardData.kpis.map((item) => (
								<KPIBox
									key={item.id}
									label={item.label}
									value={item.value}
									detail={item.detail}
									tone={item.tone}
									icon={KPI_ICON_MAP[item.id]}
									onClick={() => handleNavigate(item.target)}
								/>
							))}
						</div>

						<div className="mt-4">
							<ActionCard action={heroAction} onNavigate={handleNavigate} />
						</div>
					</div>

					<div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
						<DashboardCard
							title="Päivän tehtävät"
							description="Tässä listassa näkyvät vain ne asiat, joihin kannattaa tarttua ennen muuta. Jokainen rivi vie suoraan oikeaan työtilaan."
						>
							{filteredTasks.length > 0 ? (
								<TaskList tasks={filteredTasks} onNavigate={handleNavigate} />
							) : normalizedSearchQuery ? (
								<DashboardEmptyBlock
									title="Hakuehdolla ei löytynyt tehtäviä"
									description="Muuta hakua tai tyhjennä rajaus, niin näet taas päivän tehtävät tässä kortissa."
									actionLabel="Tyhjennä haku"
									onAction={() => setSearchQuery('')}
								/>
							) : (
								<DashboardEmptyBlock
									title="Työjono näyttää hallitulta"
									description="Etusivu ei nosta nyt kiireellisiä tehtäviä. Avaa projektityötila jatkaaksesi tarjouksia tai laskutusta."
									actionLabel="Avaa projektit"
									onAction={() => handleNavigate({ page: 'projects' })}
								/>
							)}
						</DashboardCard>

						<DashboardCard
							title="Projektien tilanne"
							description="Yhdellä silmäyksellä näet montako projektia on työn eri vaiheissa juuri nyt."
						>
							{filteredProjectStats.length > 0 || !normalizedSearchQuery ? (
								<ProjectStatsList
									stats={filteredProjectStats.length > 0 ? filteredProjectStats : dashboardData.projectStats}
									onNavigate={handleNavigate}
								/>
							) : (
								<DashboardEmptyBlock
									title="Hakuehdolla ei löytynyt vaiheita"
									description="Projektitilastot näyttävät vain ne rivit, joiden otsikko tai kuvaus vastaa nykyistä hakua."
									actionLabel="Tyhjennä haku"
									onAction={() => setSearchQuery('')}
								/>
							)}
						</DashboardCard>
					</div>
				</div>

				<div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
					<RightPanelCard title="Jatka työskentelyä" description="Viimeisin tarjousluonnos, projekti ja lasku ovat aina käden ulottuvilla tästä railista.">
						{filteredRecentItems.length > 0 ? (
							<RecentItemsList items={filteredRecentItems} onNavigate={handleNavigate} />
						) : normalizedSearchQuery ? (
							<DashboardEmptyBlock
								title="Ei jatkettavia kohteita tällä haulla"
								description="Poista hakurajaus, niin näet taas viimeisimmän tarjouksen, projektin ja laskun."
								actionLabel="Tyhjennä haku"
								onAction={() => setSearchQuery('')}
							/>
						) : (
							<RecentItemsList items={dashboardData.recentItems} onNavigate={handleNavigate} />
						)}
					</RightPanelCard>

					<RightPanelCard title="Määräajat ja esteet" description="Tässä näkyvät vain poikkeamat: erääntyvät laskut, puutteet ja vastuuhenkilöiden puuttuminen.">
						{filteredAlerts.length > 0 ? (
							<AlertsList alerts={filteredAlerts} onNavigate={handleNavigate} />
						) : normalizedSearchQuery ? (
							<DashboardEmptyBlock
								title="Hakuehto ei osunut poikkeamiin"
								description="Poista hakurajaus, jos haluat nähdä kaikki määräajat ja estävät puutteet tässä kortissa."
								actionLabel="Tyhjennä haku"
								onAction={() => setSearchQuery('')}
							/>
						) : dashboardData.alerts.length > 0 ? (
							<AlertsList alerts={dashboardData.alerts} onNavigate={handleNavigate} />
						) : (
							<DashboardEmptyBlock
								title="Ei poikkeamia juuri nyt"
								description="Erääntyviä laskuja, puuttuvia tietoja tai nimeämättömiä vastuita ei ole tällä hetkellä näkyvissä."
							/>
						)}
					</RightPanelCard>

					{!dashboardData.hasWorkspace ? (
						<RightPanelCard title="Aloita tästä" description="Kun ensimmäinen projekti ja tarjous ovat olemassa, tämä raili vaihtuu automaattisesti ajantasaisiin työjonoihin.">
							<div className="space-y-3">
								<Button className="w-full justify-between" onClick={() => handleNavigate({ page: 'projects' })}>
									Avaa projektityötila
									<FolderOpen className="h-4 w-4" />
								</Button>
								<Button variant="outline" className="w-full justify-between" onClick={() => handleNavigate({ page: 'products' })}>
									Lisää tuotteet
									<Package className="h-4 w-4" />
								</Button>
							</div>
						</RightPanelCard>
					) : null}
				</div>
			</div>
		</AppPageLayout>
	);
}
