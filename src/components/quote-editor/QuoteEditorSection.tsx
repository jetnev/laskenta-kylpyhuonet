import type { ReactNode } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { Card } from '../ui/card';
import type { QuoteEditorStep } from '../../lib/quote-editor-ux';
import { getQuoteEditorStepStatusLabel } from '../../lib/quote-editor-ux';
import { cn } from '../../lib/utils';

interface QuoteEditorSectionProps {
  step: QuoteEditorStep;
  stepNumber: number;
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
  footer?: ReactNode;
  badges?: ReactNode;
}

export default function QuoteEditorSection({
  step,
  stepNumber,
  active,
  onSelect,
  children,
  footer,
  badges,
}: QuoteEditorSectionProps) {
  return (
    <Card className={cn('overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]', active && 'border-slate-300')}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-6 py-6 text-left sm:px-8"
        onClick={onSelect}
        aria-expanded={active}
      >
        <div className="flex min-w-0 gap-4">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold', active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700')}>
            {stepNumber}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{step.title}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                {getQuoteEditorStepStatusLabel(step.status)}
              </span>
              {step.optional && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900">
                  Valinnainen
                </span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{step.description}</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{step.summary}</p>
            {badges && <div className="mt-3 flex flex-wrap gap-2">{badges}</div>}
          </div>
        </div>
        <div className="mt-1 shrink-0 rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-700">
          {active ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
        </div>
      </button>
      {active && (
        <div className="border-t border-slate-200 px-6 py-6 sm:px-8">
          <div className="space-y-6">{children}</div>
          {footer && <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">{footer}</div>}
        </div>
      )}
    </Card>
  );
}
