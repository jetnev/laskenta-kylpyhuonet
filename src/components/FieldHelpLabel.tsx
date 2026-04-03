import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

type FieldHelpLabelProps = {
  label: string;
  help: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
};

export default function FieldHelpLabel({
  label,
  help,
  htmlFor,
  required = false,
  className,
}: FieldHelpLabelProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold leading-none text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ohje kentälle ${label}`}
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="max-w-72 rounded-xl px-3 py-2 text-left leading-relaxed">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
