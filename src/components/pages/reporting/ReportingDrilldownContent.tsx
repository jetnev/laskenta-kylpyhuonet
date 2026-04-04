import { format } from 'date-fns';
import { fi } from 'date-fns/locale';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { cn } from '../../../lib/utils';
import type {
  QuoteFamilySummary,
  ReportBadgeVariant,
  ReportCustomerSummary,
  ReportProjectSummary,
} from '../../../lib/reporting';

const FMT_CURRENCY = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FMT_PERCENT = new Intl.NumberFormat('fi-FI', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function fc(value: number) {
  return FMT_CURRENCY.format(value);
}

function fp(value: number) {
  return `${FMT_PERCENT.format(value)}\u00a0%`;
}

function fd(value: string | Date) {
  return format(value instanceof Date ? value : new Date(value), 'dd.MM.yyyy', { locale: fi });
}

function badgeVariant(value: ReportBadgeVariant): 'default' | 'secondary' | 'outline' | 'destructive' {
  return value as 'default' | 'secondary' | 'outline' | 'destructive';
}

function OverflowText({
  primary,
  secondary,
  primaryClassName,
  secondaryClassName,
}: {
  primary: string;
  secondary?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  const title = [primary, secondary].filter(Boolean).join(' • ');

  return (
    <div className="min-w-0" title={title}>
      <div className={cn('line-clamp-2 break-words whitespace-normal text-sm leading-5 text-foreground', primaryClassName)}>{primary}</div>
      {secondary ? (
        <div className={cn('mt-1 truncate text-xs text-muted-foreground', secondaryClassName)}>{secondary}</div>
      ) : null}
    </div>
  );
}

function CompactText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('truncate text-sm', className)} title={value}>
      {value}
    </div>
  );
}

function CompactBadge({
  label,
  variant,
  className,
}: {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0', className)} title={label}>
      <Badge variant={variant} className="inline-flex max-w-full items-center whitespace-nowrap">
        <span className="truncate">{label}</span>
      </Badge>
    </div>
  );
}

function getFamilyHeading(family: QuoteFamilySummary) {
  return family.latestQuoteTitle || family.projectName || family.latestQuoteNumber;
}

function getFamilyOwnerLabel(family: QuoteFamilySummary) {
  const ownerLabel = family.ownerLabel.trim();
  return ownerLabel ? ownerLabel : 'Ei nimettyä vastuuhenkilöä';
}

function getFamilyContextReason({
  family,
  kind,
  title,
}: {
  family: QuoteFamilySummary;
  kind: ReportingDrillKind | null;
  title?: string;
}) {
  const normalizedTitle = title?.trim().toLocaleLowerCase('fi-FI') ?? '';

  if (kind === 'family-detail') {
    return family.primaryDeviationReason;
  }

  if (
    normalizedTitle.includes('vanhenemassa')
    || normalizedTitle.includes('voimassaolo')
  ) {
    if (family.expiresInDays === 0) {
      return 'Tarjouksen voimassaolo päättyy tänään.';
    }

    if (family.expiresInDays !== null && family.expiresInDays > 0) {
      return `Tarjouksen voimassaoloa on jäljellä ${family.expiresInDays} päivää.`;
    }

    return 'Tarjouksen voimassaolo päättyy pian ja vaatii jatkotoimenpiteen.';
  }

  if (
    normalizedTitle.includes('ei ole koskettu')
    || normalizedTitle.includes('pitkään aikaan')
    || normalizedTitle.includes('vanhentuneet')
  ) {
    return `Tarjousta ei ole päivitetty ${family.ageDays} päivään.`;
  }

  if (
    normalizedTitle.includes('alittaa tavoitteen')
    || normalizedTitle.includes('heikompi kate')
  ) {
    return `Kate jää ${FMT_PERCENT.format(Math.abs(family.marginGapPercent))} prosenttiyksikköä tavoitteen alle.`;
  }

  if (
    normalizedTitle.includes('odottavat toteumaa')
    || normalizedTitle.includes('odottaa toteumaa')
  ) {
    return 'Tarjous on hyväksytty, mutta toteumaa ei ole vielä kirjattu.';
  }

  if (normalizedTitle.includes('vastuuhenkilö')) {
    return 'Tarjoukselta puuttuu vastuuhenkilö, joten seuraava omistaja on epäselvä.';
  }

  if (
    normalizedTitle.includes('avoimet tarjoukset')
    || normalizedTitle.includes('kaikki tarjousketjut')
  ) {
    return 'Tarjous on edelleen avoin ja odottaa seuraavaa toimenpidettä.';
  }

  return family.primaryDeviationReason;
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground" title={value}>{value}</p>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-2 font-mono text-lg font-semibold tabular-nums text-foreground', valueClassName)}>{value}</p>
    </div>
  );
}

function renderFamiliesList(
  families: QuoteFamilySummary[],
  options?: {
    kind?: ReportingDrillKind | null;
    title?: string;
    onOpenQuote?: (family: QuoteFamilySummary) => void;
  }
) {
  const countLabel = families.length === 1 ? '1 tarjouskohde' : `${families.length} tarjouskohdetta`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <p className="text-sm font-semibold text-foreground">{countLabel}</p>
      </div>
      {families.map((family) => {
        const heading = getFamilyHeading(family);
        const reason = getFamilyContextReason({
          family,
          kind: options?.kind ?? null,
          title: options?.title,
        });

        return (
          <article
            key={family.id}
            className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.5)]"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {family.latestQuoteNumber}
                  </Badge>
                  <CompactBadge
                    label={family.latestStatusLabel}
                    variant={badgeVariant(family.latestStatusVariant)}
                    className="max-w-full"
                  />
                </div>

                <div className="min-w-0 space-y-3">
                  <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 text-foreground" title={heading}>
                    {heading}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField label="Asiakas" value={family.customerName} />
                    <InfoField label="Vastuuhenkilö" value={getFamilyOwnerLabel(family)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px] xl:max-w-[360px] xl:flex-none">
                <MetricBlock label="Arvo" value={fc(family.latestSubtotal)} />
                <MetricBlock
                  label="Kate"
                  value={fp(family.latestMarginPercent)}
                  valueClassName={family.belowTargetMargin ? 'text-red-600 dark:text-red-400' : undefined}
                />
                <Button
                  className="w-full sm:col-span-2"
                  onClick={() => options?.onOpenQuote?.(family)}
                  disabled={!options?.onOpenQuote}
                >
                  Avaa tarjous
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Miksi näkyy tässä</p>
              <p className="mt-2 text-sm leading-6 text-foreground">{reason}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function renderCustomersTable(customers: ReportCustomerSummary[]) {
  return (
    <Table className="min-w-[760px] table-fixed">
      <colgroup>
        <col className="w-[34%]" />
        <col className="w-[5.5rem]" />
        <col className="w-[8rem]" />
        <col className="w-[7rem]" />
        <col className="w-[8.5rem]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="px-3">Asiakas</TableHead>
          <TableHead className="px-3 text-right">Tarjouksia</TableHead>
          <TableHead className="px-3 text-right">Arvo €</TableHead>
          <TableHead className="px-3 text-right">Kate %</TableHead>
          <TableHead className="px-3 text-right">Hyväksymisaste</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="px-3 py-3 align-top !whitespace-normal">
              <OverflowText
                primary={customer.name}
                primaryClassName="font-medium"
                secondary={customer.ownerLabel}
              />
            </TableCell>
            <TableCell className="px-3 py-3 text-right tabular-nums">{customer.quoteCount}</TableCell>
            <TableCell className="px-3 py-3 text-right font-mono tabular-nums">{fc(customer.totalValue)}</TableCell>
            <TableCell className="px-3 py-3 text-right tabular-nums">{fp(customer.marginPercent)}</TableCell>
            <TableCell className="px-3 py-3 text-right">
              <CompactBadge
                label={fp(customer.acceptanceRatePercent)}
                variant={customer.acceptanceRatePercent >= 50 ? 'default' : 'secondary'}
                className="justify-end"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function renderProjectsTable(projects: ReportProjectSummary[]) {
  return (
    <Table className="min-w-[900px] table-fixed">
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[22%]" />
        <col className="w-[8rem]" />
        <col className="w-[8rem]" />
        <col className="w-[7.5rem]" />
        <col className="w-[9rem]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="px-3">Projekti</TableHead>
          <TableHead className="px-3">Asiakas</TableHead>
          <TableHead className="px-3 text-right">Tarjous €</TableHead>
          <TableHead className="px-3 text-right">Toteutunut €</TableHead>
          <TableHead className="px-3 text-right">Poikkeama %</TableHead>
          <TableHead className="px-3">Vaihe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="px-3 py-3 align-top !whitespace-normal">
              <OverflowText primary={project.name} primaryClassName="font-medium" secondary={project.ownerLabel} />
            </TableCell>
            <TableCell className="px-3 py-3 align-top !whitespace-normal">
              <OverflowText primary={project.customerName} secondary={project.riskReason || undefined} />
            </TableCell>
            <TableCell className="px-3 py-3 text-right font-mono tabular-nums">{fc(project.quoteValue)}</TableCell>
            <TableCell className="px-3 py-3 text-right font-mono tabular-nums">{fc(project.actualValue ?? 0)}</TableCell>
            <TableCell
              className={cn(
                'px-3 py-3 text-right tabular-nums',
                (project.quoteToActualDeltaPercent ?? 0) > 0
                  ? 'text-green-600 dark:text-green-400'
                  : (project.quoteToActualDeltaPercent ?? 0) < 0
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              )}
            >
              {(project.quoteToActualDeltaPercent ?? 0) > 0 ? '+' : ''}
              {fp(project.quoteToActualDeltaPercent ?? 0)}
            </TableCell>
            <TableCell className="px-3 py-3 align-top">
              <CompactBadge label={project.projectStage} variant={badgeVariant(project.projectStageVariant)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export type ReportingDrillKind = 'families' | 'family-detail' | 'customers' | 'projects';

interface ReportingDrilldownContentProps {
  kind: ReportingDrillKind | null;
  title?: string;
  families: QuoteFamilySummary[];
  customers: ReportCustomerSummary[];
  projects: ReportProjectSummary[];
  onOpenQuote?: (family: QuoteFamilySummary) => void;
}

export function getReportingDrilldownDescription(kind: ReportingDrillKind | null) {
  switch (kind) {
    case 'families':
    case 'family-detail':
      return 'Avaa alla olevat tarjoukset yksi kerrallaan ja korjaa ensin näkyvin syy.';
    case 'customers':
      return 'Skannaa asiakkaat nopeasti ja etsi poikkeamat ennen tarkempaa jatkoselvitystä.';
    case 'projects':
      return 'Tarkista projektipoikkeamat nopeasti ja arvioi mitkä kohteet vaativat seuraavan toimenpiteen.';
    default:
      return 'Tarkista poikkeavat kohteet ja avaa seuraavaksi ne, jotka vaativat välittömän toimenpiteen.';
  }
}

export default function ReportingDrilldownContent({
  kind,
  title,
  families,
  customers,
  projects,
  onOpenQuote,
}: ReportingDrilldownContentProps) {
  if ((kind === 'families' || kind === 'family-detail') && families.length > 0) {
    return renderFamiliesList(families, { kind, title, onOpenQuote });
  }

  if (kind === 'customers' && customers.length > 0) {
    return renderCustomersTable(customers);
  }

  if (kind === 'projects' && projects.length > 0) {
    return renderProjectsTable(projects);
  }

  return <div className="py-12 text-center text-muted-foreground">Ei tietoja tälle rajaukselle</div>;
}