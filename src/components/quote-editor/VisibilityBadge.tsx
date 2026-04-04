import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export type VisibilityBadgeTone = 'customer' | 'internal' | 'derived' | 'optional';

const VISIBILITY_BADGE_MAP: Record<VisibilityBadgeTone, { label: string; className: string }> = {
  customer: {
    label: 'Näkyy asiakkaalle',
    className: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  internal: {
    label: 'Vain sisäinen',
    className: 'border-amber-200 bg-amber-50 text-amber-950',
  },
  derived: {
    label: 'Lasketaan automaattisesti',
    className: 'border-slate-200 bg-slate-50 text-slate-800',
  },
  optional: {
    label: 'Valinnainen',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
};

interface VisibilityBadgeProps {
  tone: VisibilityBadgeTone;
  label?: string;
  className?: string;
}

export default function VisibilityBadge({ tone, label, className }: VisibilityBadgeProps) {
  const config = VISIBILITY_BADGE_MAP[tone];

  return (
    <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', config.className, className)}>
      {label || config.label}
    </Badge>
  );
}
