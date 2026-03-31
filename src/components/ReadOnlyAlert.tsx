import { Lock } from '@phosphor-icons/react';
import { Card, CardDescription } from './ui/card';

export function ReadOnlyAlert() {
  return (
    <Card className="border-muted bg-muted/50 p-4">
      <CardDescription className="flex items-center gap-2">
        <Lock className="h-4 w-4 flex-shrink-0" />
        <span>
          Sinulla on vain lukuoikeus. Ainoastaan sovelluksen omistaja voi lisätä, muokata tai poistaa tietoja.
        </span>
      </CardDescription>
    </Card>
  );
}
