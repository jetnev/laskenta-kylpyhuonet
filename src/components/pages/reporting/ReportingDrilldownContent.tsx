import { format } from 'date-fns';
import { fi } from 'date-fns/locale';

import { Badge } from '../../ui/badge';
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

function renderFamiliesTable(families: QuoteFamilySummary[]) {
  return (
    <Table className="min-w-[980px] table-fixed">
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[22%]" />
        <col className="w-[9.5rem]" />
        <col className="w-[8rem]" />
        <col className="w-[7rem]" />
        <col className="w-[5rem]" />
        <col className="w-[10rem]" />
        <col className="w-[8rem]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="px-3">Tarjous</TableHead>
          <TableHead className="px-3">Asiakas</TableHead>
          <TableHead className="px-3">Tila</TableHead>
          <TableHead className="px-3 text-right">Arvo €</TableHead>
          <TableHead className="px-3 text-right">Kate %</TableHead>
          <TableHead className="px-3 text-right">Rev.</TableHead>
          <TableHead className="px-3">Vastuuhenkilö</TableHead>
          <TableHead className="px-3 text-right">Päivitetty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {families.map((family) => (
          <TableRow key={family.id}>
            <TableCell className="px-3 py-3 align-top !whitespace-normal">
              <OverflowText
                primary={family.latestQuoteTitle || family.projectName}
                primaryClassName="font-medium"
                secondary={family.latestQuoteNumber}
              />
            </TableCell>
            <TableCell className="px-3 py-3 align-top !whitespace-normal">
              <OverflowText primary={family.customerName} />
            </TableCell>
            <TableCell className="px-3 py-3 align-top">
              <CompactBadge label={family.latestStatusLabel} variant={badgeVariant(family.latestStatusVariant)} />
            </TableCell>
            <TableCell className="px-3 py-3 text-right font-mono tabular-nums">{fc(family.latestSubtotal)}</TableCell>
            <TableCell className="px-3 py-3 text-right tabular-nums">{fp(family.latestMarginPercent)}</TableCell>
            <TableCell className="px-3 py-3 text-right tabular-nums">{family.revisionCount}</TableCell>
            <TableCell className="px-3 py-3 align-top">
              <CompactText value={family.ownerLabel} />
            </TableCell>
            <TableCell className="px-3 py-3 text-right text-sm text-muted-foreground">{fd(family.lastActivityAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  families: QuoteFamilySummary[];
  customers: ReportCustomerSummary[];
  projects: ReportProjectSummary[];
}

export function getReportingDrilldownDescription(kind: ReportingDrillKind | null) {
  switch (kind) {
    case 'families':
    case 'family-detail':
      return 'Pitkät tarjous-, asiakas- ja vastuuhenkilönimet typistetään hallitusti. Tarvittaessa taulukkoa voi vierittää vaakasuunnassa.';
    case 'customers':
      return 'Asiakastaulukko pitää nimet luettavina ja numero- sekä badge-sarakkeet kompakteina myös kapeammalla desktop-leveydellä.';
    case 'projects':
      return 'Projektitaulukko priorisoi pitkät projekti- ja asiakasnimet ilman että poikkeama-, euro- tai vaihe-sarakkeet rikkoutuvat.';
    default:
      return 'Pitkä sisältö typistetään hallitusti, ja taulukko pysyy tarvittaessa vaakasuunnassa vieritettävänä.';
  }
}

export default function ReportingDrilldownContent({
  kind,
  families,
  customers,
  projects,
}: ReportingDrilldownContentProps) {
  if ((kind === 'families' || kind === 'family-detail') && families.length > 0) {
    return renderFamiliesTable(families);
  }

  if (kind === 'customers' && customers.length > 0) {
    return renderCustomersTable(customers);
  }

  if (kind === 'projects' && projects.length > 0) {
    return renderProjectsTable(projects);
  }

  return <div className="py-12 text-center text-muted-foreground">Ei tietoja tälle rajaukselle</div>;
}