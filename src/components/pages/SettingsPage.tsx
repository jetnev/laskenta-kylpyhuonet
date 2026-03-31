import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { useSettings } from '../../hooks/use-data';
import { useAuth, UserRole } from '../../hooks/use-auth';
import { useKV } from '@github/spark/hooks';
import { toast } from 'sonner';
import { User as UserIcon, Info } from '@phosphor-icons/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

interface AppUserRole {
  userId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: string;
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { canManageUsers, user: currentUser } = useAuth();
  const [userRoles, setUserRoles] = useKV<AppUserRole[]>("user-roles", []);
  
  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    defaultVatPercent: settings.defaultVatPercent,
    defaultMarginPercent: settings.defaultMarginPercent,
  });

  const handleSave = () => {
    updateSettings(formData);
    toast.success('Asetukset tallennettu');
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!currentUser) return;
    
    setUserRoles((current) => {
      const existing = current?.find(r => r.userId === userId);
      if (existing) {
        return (current || []).map(r => 
          r.userId === userId 
            ? { ...r, role: newRole, grantedBy: currentUser.id, grantedAt: new Date().toISOString() }
            : r
        );
      } else {
        return [
          ...(current || []),
          {
            userId,
            role: newRole,
            grantedBy: currentUser.id,
            grantedAt: new Date().toISOString(),
          }
        ];
      }
    });
    
    toast.success('Käyttäjärooli päivitetty');
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'secondary';
      case 'editor':
        return 'default';
      case 'viewer':
        return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'Omistaja';
      case 'editor':
        return 'Muokkaaja';
      case 'viewer':
        return 'Lukija';
    }
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

      {canManageUsers && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Käyttäjäroolit</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hallinnoi sovelluksen käyttäjien oikeuksia
              </p>
            </div>

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Roolit määritetään GitHub-käyttäjille. Sovelluksen omistaja saa automaattisesti owner-roolin.
                Muille käyttäjille voit määrittää roolin Editor (muokkausoikeudet) tai Viewer (lukuoikeus).
              </AlertDescription>
            </Alert>

            {userRoles && userRoles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Käyttäjä ID</TableHead>
                    <TableHead>Rooli</TableHead>
                    <TableHead>Myönnetty</TableHead>
                    <TableHead className="w-[200px]">Toiminnot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((userRole) => (
                    <TableRow key={userRole.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{userRole.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userRole.role)}>
                          {getRoleLabel(userRole.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(userRole.grantedAt).toLocaleDateString('fi-FI')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={userRole.role}
                          onValueChange={(value) => handleRoleChange(userRole.userId, value as UserRole)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Muokkaaja</SelectItem>
                            <SelectItem value="viewer">Lukija</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Ei määritettyjä rooleja. Roolit lisätään automaattisesti kun käyttäjä kirjautuu ensimmäisen kerran.
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave}>Tallenna asetukset</Button>
      </div>
    </div>
  );
}
