import { Card } from '../ui/card';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-semibold">Etusivu</h1>
      <Card className="p-6">
        <p className="text-muted-foreground">Tervetuloa Laskenta-järjestelmään</p>
      </Card>
    </div>
  );
}
