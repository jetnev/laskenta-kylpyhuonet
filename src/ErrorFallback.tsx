import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";

export const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  // When encountering an error in the development mode, rethrow it and don't display the boundary.
  // The parent UI will take care of showing a more helpful dialog.
  if (import.meta.env.DEV) throw error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <Warning className="h-4 w-4" />
          <AlertTitle>Järjestelmässä tapahtui virhe</AlertTitle>
          <AlertDescription>
            Sovelluksessa tapahtui odottamaton virhe. Virhetiedot näytetään alla. Ota yhteyttä sovelluksen ylläpitäjään ja kerro tästä ongelmasta.
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Virhetiedot:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
        </div>
        
        <Button 
          onClick={resetErrorBoundary} 
          className="w-full gap-2"
          variant="outline"
        >
          <ArrowClockwise />
          Yritä uudelleen
        </Button>
      </div>
    </div>
  );
}
