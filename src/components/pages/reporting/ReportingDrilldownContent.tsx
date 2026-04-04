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
      <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>{value}</p>
    </div>
  );
}

function StatItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-[5.75rem]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-lg font-semibold tracking-[-0.03em] tabular-nums text-foreground', valueClassName)}>{value}</p>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2">
        <p className="text-sm font-semibold text-foreground">{countLabel}</p>
        <p className="text-xs text-muted-foreground">Tarkista kohteet nopeasti ja avaa tarjous jatkotoimia varten.</p>
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
            className="rounded-[28px] border border-border/60 bg-background px-5 py-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.35)] sm:px-6 sm:py-6"
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex h-7 items-center rounded-full bg-muted px-3 font-mono text-[11px] font-semibold tracking-[0.08em] text-foreground/80" title={family.latestQuoteNumber}>
                      {family.latestQuoteNumber}
                    </span>
                    <CompactBadge
                      label={family.latestStatusLabel}
                      variant={badgeVariant(family.latestStatusVariant)}
                      className="max-w-full"
                    />
                  </div>

                  <h3 className="mt-3 line-clamp-2 break-words text-lg font-semibold leading-6 tracking-[-0.02em] text-foreground sm:text-[1.15rem]" title={heading}>
                    {heading}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:min-w-[15rem] lg:flex-none lg:justify-items-end">
                  <StatItem label="Arvo" value={fc(family.latestSubtotal)} />
                  <StatItem
                    label="Kate"
                    value={fp(family.latestMarginPercent)}
                    valueClassName={family.belowTargetMargin ? 'text-red-600 dark:text-red-400' : undefined}
                  />
                </div>
              </div>

              <div className="grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2 sm:gap-x-6">
                <InfoField label="Asiakas" value={family.customerName} />
                <InfoField label="Vastuuhenkilö" value={getFamilyOwnerLabel(family)} />
              </div>

              <div className="flex flex-col gap-4 border-t border-border/50 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Syy</p>
                  <p className="mt-1 text-sm leading-6 text-foreground/90" title={reason}>
                    {reason}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="self-start rounded-full border-border/70 px-4 shadow-none sm:self-end"
                  onClick={() => options?.onOpenQuote?.(family)}
                  disabled={!options?.onOpenQuote}
                >
                  Avaa tarjous
                </Button>
              </div>
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
      return 'Tarkista kohteen tila, arvo, kate ja vastuuhenkilö. Avaa tarjous jatkotoimia varten.';
    case 'customers':
      return 'Skannaa asiakkaat nopeasti ja poraudu tarvittaessa tarkempaan tarjousnäkymään.';
    case 'projects':
      return 'Tarkista projektipoikkeamat, vastuuhenkilöt ja kohteet jotka vaativat seuraavan toimenpiteen.';
    default:
      return 'Tarkista poikkeavat kohteet ja avaa tarvittavat tarjoukset seuraavaa toimenpidettä varten.';
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