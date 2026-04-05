import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CreateTenderPackageDialogProps {
  open: boolean;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string }) => Promise<void>;
}

export default function CreateTenderPackageDialog({
  open,
  submitting = false,
  onOpenChange,
  onCreate,
}: CreateTenderPackageDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Anna tarjouspyyntöpaketille nimi.');
      return;
    }

    try {
      setError(null);
      await onCreate({ name: trimmedName });
      onOpenChange(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Paketin luonti epäonnistui.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uusi tarjouspyyntöpaketti</DialogTitle>
          <DialogDescription>
            Paketti tallennetaan nyt organisaation omaan Tarjousäly-dataan Supabaseen. Dokumentit, analyysi ja generointi kytketään tähän myöhemmissä vaiheissa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block space-y-2 text-sm font-medium text-foreground">
            <span>Paketin nimi</span>
            <Input
              autoFocus
              placeholder="Esim. Kiinteistö Oy Aurinkopiha / tarjouspyyntö 04-2026"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Peruuta
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Luodaan...' : 'Luo tarjouspyyntöpaketti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}