import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

export const ErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <Alert variant="destructive" className="max-w-lg">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">
          {error.message}
        </pre>
        <Button 
          onClick={resetErrorBoundary}
          className="mt-4"
          variant="outline"
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);
