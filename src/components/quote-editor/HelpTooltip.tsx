import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface HelpTooltipProps {
  label: string;
  help: ReactNode;
  className?: string;
}

export default function HelpTooltip({ label, help, className }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold leading-none text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label={`Ohje: ${label}`}
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-72 rounded-xl px-3 py-2 text-left leading-relaxed">
        {help}
      </TooltipContent>
    </Tooltip>
  );
}
