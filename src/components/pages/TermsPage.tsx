import { Card } from '../ui/card';

export default function TermsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sopimusehdot</h1>
        <p className="text-muted-foreground mt-1">Hallinnoi tarjousehtopohjia</p>
      </div>

      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          Sopimusehdot tulossa pian.
        </div>
      </Card>
    </div>
  );
}
