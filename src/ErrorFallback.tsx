import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

}: {
  resetE
  return (
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
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

          <Button onClick={resetErrorBoundary} className="mt-2">

          </Button>

      </Alert>

  );
