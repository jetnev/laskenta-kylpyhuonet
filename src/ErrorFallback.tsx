import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { WarningCircle } from "@phosphor-icons/react";
export const ErrorFallback = ({ error, resetErro

export const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-4">
            <pre className="text-xs o
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
      </div>
          </AlertDescription>
};
        <Button onClick={resetErrorBoundary} variant="outline" className="w-full">

        </Button>

    </div>

};
