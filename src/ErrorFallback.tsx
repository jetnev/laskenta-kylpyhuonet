import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";


      <Alert variant="destructive" className="max-w-lg">
        <A
            {error.message}
      <Alert variant="destructive" className="max-w-lg">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <pre className="text-xs overflow-auto whitespace-pre-wrap mt-2">
            {error.message}
          </pre>
          <Button 
            onClick={resetErrorBoundary}
            variant="outline"
            className="mt-4"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
          </pre>
          <Button 
            onClick={resetErrorBoundary}
            variant="outline"
            className="mt-4"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
