import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { useSettings } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { useKV } from '@github/spark/hooks';
import { toast } from 'sonner';
import { Trash, Plus, User as UserIcon } from '@phosphor-icons/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface LocalUser {
  email: string;
  password: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { isOwner } = useAuth();
  const [users, setUsers] = useKV<LocalUser[]>("app-users", []);
  
  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    defaultVatPercent: settings.defaultVatPercent,
    defaultMarginPercent: settings.defaultMarginPercent,
  });

  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleSave = () => {
    updateSettings(formData);
    toast.success('Asetukset tallennettu');
  };

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Täytä kaikki kentät');
      return;
    }

    if (!users) return;

    if (users.some(u => u.email === newUser.email)) {
      toast.error('Käyttäjä on jo olemassa');
      return;
    }

    setUsers((currentUsers) => [
      ...(currentUsers || []),
      {
        email: newUser.email,
        password: newUser.password,
        createdAt: new Date().toISOString(),
      },
    ]);

    toast.success('Käyttäjä lisätty');
    setNewUser({ email: '', password: '' });
    setIsAddDialogOpen(false);
  };

  const handleDeleteUser = (email: string) => {
    setUsers((currentUsers) => (currentUsers || []).filter(u => u.email !== email));
    toast.success('Käyttäjä poistettu');
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Asetukset</h1>
        <p className="text-muted-foreground mt-1">Sovelluksen yleiset asetukset</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Yritystiedot</h3>
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="companyName">Yrityksen nimi</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Osoite</Label>
            <Input
              id="companyAddress"
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Puhelin</Label>
              <Input
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Sähköposti</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Oletusarvot</h3>
        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatPercent">Oletusarvonlisävero (%)</Label>
              <Input
                id="vatPercent"
                type="number"
                step="0.1"
                value={formData.defaultVatPercent}
                onChange={(e) => setFormData({ ...formData, defaultVatPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginPercent">Oletuskateprosentti (%)</Label>
              <Input
                id="marginPercent"
                type="number"
                step="0.1"
                value={formData.defaultMarginPercent}
                onChange={(e) => setFormData({ ...formData, defaultMarginPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </Card>

      {isOwner && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Käyttäjien hallinta</h3>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää käyttäjä
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lisää uusi käyttäjä</DialogTitle>
                  <DialogDescription>
                    Luo uusi käyttäjätunnus sovellukseen.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Sähköpostiosoite</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="kayttaja@yritys.fi"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Salasana</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Peruuta
                    </Button>
                    <Button onClick={handleAddUser}>
                      Lisää käyttäjä
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sähköposti</TableHead>
                  <TableHead>Luotu</TableHead>
                  <TableHead className="w-[100px]">Toiminnot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('fi-FI')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.email)}
                      >
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Ei käyttäjiä. Lisää ensimmäinen käyttäjä yllä olevasta painikkeesta.</p>
          )}
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave}>Tallenna asetukset</Button>
      </div>
    </div>
  );
}
