import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type QuoteRowWorkflowOption = 'margin' | 'manual' | 'line_total';

interface QuotePricingModeSelectorProps {
  value: QuoteRowWorkflowOption;
  onChange: (value: QuoteRowWorkflowOption) => void;
  disabled?: boolean;
  canUseMargin?: boolean;
}

const WORKFLOW_COPY: Record<QuoteRowWorkflowOption, { title: string; description: string }> = {
  margin: {
    title: 'Kateohjattu',
    description: 'Syötä oma kustannus ja tavoitekate. Järjestelmä laskee asiakashinnan.',
  },
  manual: {
    title: 'Manuaalinen asiakashinta',
    description: 'Syötä asiakkaalle menevä veroton hinta itse.',
  },
  line_total: {
    title: 'Rivin kokonaishinta',
    description: 'Syötä koko rivin veroton loppuhinta. Järjestelmä johtaa yksikköhinnan.',
  },
};

export default function QuotePricingModeSelector({
  value,
  onChange,
  disabled = false,
  canUseMargin = true,
}: QuotePricingModeSelectorProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {(Object.keys(WORKFLOW_COPY) as QuoteRowWorkflowOption[]).map((workflow) => {
        const config = WORKFLOW_COPY[workflow];
        const isActive = value === workflow;
        const isDisabled = disabled || (workflow === 'margin' && !canUseMargin);

        return (
          <Button
            key={workflow}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            className={cn(
              'h-auto min-h-28 flex-col items-start rounded-2xl px-4 py-4 text-left',
              !isActive && 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50',
              isDisabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => onChange(workflow)}
            disabled={isDisabled}
            aria-pressed={isActive}
          >
            <span className="text-sm font-semibold">{config.title}</span>
            <span className={cn('mt-2 text-xs leading-6', isActive ? 'text-white/85' : 'text-slate-600')}>
              {config.description}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
