import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";


export const ErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}) =>
    <div classNa
        <AlertTitle>Something wen
       
          
            onClick={resetErrorBoundary}
      <Alert variant="destructive" className="max-w-lg">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">
            {error.message}













