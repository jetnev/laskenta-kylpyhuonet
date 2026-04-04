import { CheckCircle, Circle, DotOutline } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import type { QuoteEditorStep, QuoteEditorStepId } from '../../lib/quote-editor-ux';
import { getQuoteEditorStepStatusLabel } from '../../lib/quote-editor-ux';
import { cn } from '../../lib/utils';

interface QuoteEditorStepperProps {
  steps: QuoteEditorStep[];
  activeStep: QuoteEditorStepId;
  onStepChange: (stepId: QuoteEditorStepId) => void;
}

function StepStatusIcon({ status, active }: { status: QuoteEditorStep['status']; active: boolean }) {
  if (status === 'completed') {
    return <CheckCircle className="h-4 w-4" weight="fill" />;
  }

  if (status === 'in-progress') {
    return <DotOutline className="h-4 w-4" weight="fill" />;
  }

  return <Circle className={cn('h-4 w-4', active && 'text-primary')} weight={active ? 'fill' : 'regular'} />;
}

export default function QuoteEditorStepper({ steps, activeStep, onStepChange }: QuoteEditorStepperProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tarjouksen vaiheet</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">Etene rauhallisesti vaihe kerrallaan</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-600">
          Vaihe 1: täytä tarjouksen perustiedot. Vaihe 2: lisää myytävät rivit. Vaihe 3: lisää tarvittaessa työmaan lisäkulut. Vaihe 4: viimeistele ehdot, aikataulu ja huomiot. Vaihe 5: tarkista yhteenveto ja lähetä tarjous.
        </p>
      </div>
      <ol className="grid gap-3 xl:grid-cols-5">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;

          return (
            <li key={step.id}>
              <Button
                type="button"
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'h-auto w-full justify-start rounded-2xl px-4 py-4 text-left',
                  !isActive && 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50'
                )}
                onClick={() => onStepChange(step.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex w-full items-start gap-3">
                  <div className={cn('mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold', isActive ? 'border-white/40 bg-white/10' : 'border-slate-200 bg-slate-50')}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{step.title}</span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', isActive ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                        <StepStatusIcon status={step.status} active={isActive} />
                        {getQuoteEditorStepStatusLabel(step.status)}
                      </span>
                    </div>
                    <p className={cn('mt-1 text-xs leading-5', isActive ? 'text-white/80' : 'text-slate-600')}>{step.description}</p>
                    <p className={cn('mt-2 text-xs font-medium', isActive ? 'text-white' : 'text-slate-700')}>{step.summary}</p>
                  </div>
                </div>
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
