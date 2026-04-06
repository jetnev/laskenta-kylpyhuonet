import { type ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';

export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
};

interface StatusBadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: StatusBadgeTone;
}

export default function StatusBadge({ tone = 'neutral', className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}