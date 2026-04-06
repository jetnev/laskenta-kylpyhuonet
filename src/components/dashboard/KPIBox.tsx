import { type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import StatusBadge, { type StatusBadgeTone } from './StatusBadge';

interface KPIBoxProps {
  label: string;
  value: string;
  detail: string;
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  onClick?: () => void;
}

export default function KPIBox({ label, value, detail, tone = 'neutral', icon, onClick }: KPIBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-[18px] border border-white/10 bg-white/8 px-4 py-4 text-left text-white transition-all duration-150',
        'hover:border-white/20 hover:bg-white/12 hover:shadow-[0_16px_30px_-28px_rgba(15,23,42,0.55)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">{label}</p>
          <p className="text-3xl font-semibold tracking-[-0.03em] text-white">{value}</p>
        </div>
        {icon ? <div className="text-slate-200/80 transition-transform duration-150 group-hover:scale-105">{icon}</div> : null}
      </div>
      <StatusBadge tone={tone} className="mt-4 border-white/10 bg-white/10 text-white/85">
        {detail}
      </StatusBadge>
    </button>
  );
}