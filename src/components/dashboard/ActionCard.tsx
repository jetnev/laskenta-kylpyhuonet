import { ArrowRight, FolderOpen, Receipt, Wrench } from '@phosphor-icons/react';

import type { DashboardNextAction } from '../../lib/dashboard-data';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import StatusBadge from './StatusBadge';

interface ActionCardProps {
  action: DashboardNextAction;
  onNavigate: (target: DashboardNextAction['actions'][number]['target']) => void;
}

export default function ActionCard({ action, onNavigate }: ActionCardProps) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(28,42,68,0.98),rgba(41,58,86,0.94))] p-6 text-white shadow-[0_28px_64px_-40px_rgba(15,23,42,0.65)] sm:p-7">
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Wrench className="h-4 w-4" weight="bold" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">Seuraava tärkein työ</span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">{action.title}</h2>
              <StatusBadge tone={action.statusTone} className="border-white/10 bg-white/10 text-white/90">
                {action.statusLabel}
              </StatusBadge>
            </div>
            <p className="text-sm text-slate-200">{action.customerName}</p>
            <p className="text-sm leading-7 text-slate-300">{action.summary}</p>
            <p className="text-sm leading-7 text-slate-300/90">{action.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="justify-between bg-sky-500 text-white hover:bg-sky-400" onClick={() => onNavigate(action.actions[0].target)}>
            <Wrench className="h-4 w-4" />
            {action.actions[0].label}
          </Button>
          <Button variant="secondary" className="justify-between bg-white/14 text-white hover:bg-white/20" onClick={() => onNavigate(action.actions[1].target)}>
            <FolderOpen className="h-4 w-4" />
            {action.actions[1].label}
          </Button>
          <Button variant="outline" className="justify-between border-white/15 bg-white text-slate-950 hover:bg-slate-100" onClick={() => onNavigate(action.actions[2].target)}>
            <Receipt className="h-4 w-4" />
            {action.actions[2].label}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(action.actions[1].target)}
          className={cn('flex items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-white/12')}
        >
          <span>{action.projectName}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}