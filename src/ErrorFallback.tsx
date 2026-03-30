import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "./components/ui/button";

export const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
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
    </div>
  );
};
