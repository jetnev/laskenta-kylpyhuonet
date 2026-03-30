import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTitle className="text-lg font-semibold mb-2">
          Jotain meni vikaan
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm">
            Sovelluksessa tapahtui odottamaton virhe. Yritä ladata sivu uudelleen.
          </p>
          <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2 p-2 bg-muted rounded">
            {error.message}
          </pre>
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            className="mt-2"
          >
            Yritä uudelleen
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
