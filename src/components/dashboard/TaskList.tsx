import { ArrowRight } from '@phosphor-icons/react';

import type { DashboardTaskItem } from '../../lib/dashboard-data';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import StatusBadge from './StatusBadge';

const PRIORITY_TONE_MAP = {
  high: 'danger',
  today: 'warning',
  blocked: 'danger',
  normal: 'info',
} as const;

interface TaskListProps {
  tasks: DashboardTaskItem[];
  onNavigate: (target: DashboardTaskItem['target']) => void;
}

export default function TaskList({ tasks, onNavigate }: TaskListProps) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onNavigate(task.target)}
          className={cn(
            'w-full rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4 text-left transition-all duration-150',
            'hover:border-primary/30 hover:bg-muted/20 hover:shadow-[0_18px_36px_-34px_rgba(15,23,42,0.35)]',
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={PRIORITY_TONE_MAP[task.priorityTone]}>{task.priorityLabel}</StatusBadge>
                <p className="text-sm font-medium text-foreground">{task.title}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{task.subtitle}</p>
              <p className="text-sm leading-6 text-muted-foreground">{task.description}</p>
            </div>
            <Button variant="outline" className="justify-between lg:shrink-0" onClick={(event) => {
              event.stopPropagation();
              onNavigate(task.target);
            }}>
              {task.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}