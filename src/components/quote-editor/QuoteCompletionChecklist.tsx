import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import type { QuoteCompletionChecklistItem } from '../../lib/quote-editor-ux';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

interface QuoteCompletionChecklistProps {
  items: QuoteCompletionChecklistItem[];
  onJumpToStep: (stepId: QuoteCompletionChecklistItem['stepId']) => void;
}

function ChecklistIcon({ state }: { state: QuoteCompletionChecklistItem['state'] }) {
  if (state === 'ok' || state === 'optional') {
    return <CheckCircle className="h-4 w-4" weight="fill" />;
  }

  if (state === 'warning') {
    return <Warning className="h-4 w-4" weight="fill" />;
  }

  return <XCircle className="h-4 w-4" weight="fill" />;
}

const STATE_STYLES: Record<QuoteCompletionChecklistItem['state'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  optional: 'border-slate-200 bg-slate-50 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  missing: 'border-red-200 bg-red-50 text-red-900',
};

export default function QuoteCompletionChecklist({ items, onJumpToStep }: QuoteCompletionChecklistProps) {
  return (
    <Card className="rounded-[28px] border-slate-200 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Valmis lähetykseen?</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">Tarkista puuttuvat ja poikkeavat asiat</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Paneeli kertoo heti, puuttuuko lähetyksestä olennaisia tietoja tai onko hinnoittelussa poikkeamia, jotka kannattaa tarkistaa ennen asiakkaalle vientiä.
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onJumpToStep(item.stepId)}
            className={cn('flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:border-slate-300', STATE_STYLES[item.state])}
          >
            <span className="mt-0.5 shrink-0">
              <ChecklistIcon state={item.state} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs leading-6 opacity-90">{item.message}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
        Lähetys- ja vientipainikkeet pysyvät footerissa koko ajan käytettävissä, mutta tämän paneelin avulla näet nopeasti, mitä kannattaa vielä tarkistaa ennen viimeistä vahvistusta.
      </div>
    </Card>
  );
}
