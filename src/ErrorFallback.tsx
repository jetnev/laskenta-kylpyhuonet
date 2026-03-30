import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";


export function ErrorFallback({
  error,
  resetErrorBoundary,
}) {
    <div classN
        <AlertTitle className="te
    
          
          </p>
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

            className="mt-2"

            Yritä uudelleen

        </AlertDescription>

    </div>

}
