import { ShieldCheck, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/use-auth';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

export default function UsersPage() {
  const { users, canManageUsers, updateUserRole, updateUserStatus, user } = useAuth();

  if (!canManageUsers) {
    return (
      <div className="p-4 sm:p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Käyttäjähallinta on vain admin-roolille.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Käyttäjähallinta</h1>
        <p className="text-muted-foreground mt-1">Hallitse käyttäjärooleja ja tilien tilaa.</p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Ensimmäinen käyttäjä saa admin-roolin. Admin hallitsee käyttäjiä sekä yhteisiä tuotetietoja, hintaryhmiä, ehtoja ja asetuksia.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Käyttäjä</TableHead>
              <TableHead>Sähköposti</TableHead>
              <TableHead>Rooli</TableHead>
              <TableHead>Tila</TableHead>
              <TableHead>Luotu</TableHead>
              <TableHead>Viimeksi kirjautunut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <UserCircle className="h-6 w-6" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium">{account.displayName}</p>
                      <p className="text-xs text-muted-foreground">{account.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{account.email}</TableCell>
                <TableCell className="w-[170px]">
                  <Select
                    value={account.role}
                    onValueChange={async (nextRole) => {
                      try {
                        await updateUserRole(account.id, nextRole as 'admin' | 'user');
                        toast.success('Käyttäjärooli päivitetty.');
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'Roolin päivitys epäonnistui.');
                      }
                    }}
                    disabled={account.id === user?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Käyttäjä</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[170px]">
                  <div className="flex items-center gap-2">
                    <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                      {account.status === 'active' ? 'Aktiivinen' : 'Pois käytöstä'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={account.id === user?.id}
                      onClick={async () => {
                        try {
                          await updateUserStatus(account.id, account.status === 'active' ? 'disabled' : 'active');
                          toast.success('Käyttäjätilan tila päivitetty.');
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Tilapäivitys epäonnistui.');
                        }
                      }}
                    >
                      {account.status === 'active' ? 'Poista käytöstä' : 'Aktivoi'}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{new Date(account.createdAt).toLocaleDateString('fi-FI')}</TableCell>
                <TableCell>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('fi-FI') : 'Ei vielä'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
