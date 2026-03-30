import { Button } from "./components/ui/button";

type Props = {
  error: Error;
  resetErrorBoundary: () => void;
};

export default function ErrorFallback({ error, resetErrorBoundary }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Hm, something went wrong
        </h1>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Lataa uudelleen</Button>
      </div>
    </div>
  );
}
