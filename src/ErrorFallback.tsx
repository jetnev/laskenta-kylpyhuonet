import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { WarningCircle } from "@phosphor-icons/r
export const ErrorFallback = ({ error, resetErrorBound

        <Alert variant="destructive">
          
            <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">
            </pre>
        </Alert>
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">
              {error.message}
            </pre>
          </AlertDescription>
        </Alert>
        <Button onClick={resetErrorBoundary} variant="outline" className="w-full">
          Try again
        </Button>
      </div>

  );

