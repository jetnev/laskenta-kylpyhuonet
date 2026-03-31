import { Card } from '../ui/card';

export default function ProjectsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Projektit</h1>
        <p className="text-muted-foreground mt-1">Hallinnoi projekteja ja tarjouksia</p>
      </div>

      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          Projekti-hallinta tulossa pian.
        </div>
      </Card>
    </div>
  );
}
