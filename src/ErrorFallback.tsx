import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";


}: {
  resetEr
  <div className="fle
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
      </AlertD
        <Button 
          onClick={resetErrorBoundary}
          className="mt-4"

        >

        </Button>




