import { Button } from "./components/ui/button";

type Props = {
  error: Error;
  resetErrorBoundary: () => void;
};

export default function ErrorFallback({ error, resetErrorBoundary }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </div>
    </div>
  );
}
