import { useState } from 'react';
import { ShieldCheck, UserCircle, UserPlus } from '@phosphor-icons/react';
import { getOrganizationRoleLabel } from '../../lib/access-control';
import { useAuth } from '../../hooks/use-auth';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const EMPTY_CREATE_FORM = {
  displayName: '',
  email: '',
  password: '',
  role: 'user' as 'admin' | 'user',
  status: 'active' as 'active' | 'disabled',
};

export default function UsersPage() {
  const {
    users,
    canManageUsers,
    createUserByAdmin,
    createOrganizationEmployee,
    updateUserRole,
    updateUserStatus,
    updateOrganizationEmployeeStatus,
    user,
    isPlatformAdmin,
    organization,
  } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  if (!canManageUsers) {
    return (
      <div className="p-4 sm:p-8">
        <Card className="p-8 text-center text-muted-foreground">
          Käyttäjähallinta on vain yrityksen omistajalle tai pääkäyttäjälle.
        </Card>
      </div>
    );
  }

  const handleCreateUser = async () => {
    try {
      setCreatingUser(true);
      if (isPlatformAdmin) {
        await createUserByAdmin(createForm);
        toast.success('Käyttäjä luotu onnistuneesti.');
      } else {
        await createOrganizationEmployee({
          displayName: createForm.displayName,
          email: createForm.email,
          password: createForm.password,
          status: createForm.status,
        });
        toast.success('Työntekijä luotu onnistuneesti.');
      }

      setShowCreateDialog(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Käyttäjän luonti epäonnistui.');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">
          {isPlatformAdmin ? 'Käyttäjähallinta' : 'Työntekijät'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isPlatformAdmin
            ? 'Hallitse alustan käyttäjärooleja, työtiloja ja tilien tilaa.'
            : `Hallitse yrityksesi ${organization?.name || 'työtilan'} työntekijätilejä ja käyttöoikeuksia.`}
        </p>
      </div>

      <div className="flex justify-end">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              {isPlatformAdmin ? 'Luo käyttäjä' : 'Luo työntekijä'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isPlatformAdmin ? 'Luo uusi käyttäjä' : 'Luo uusi työntekijä'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-user-name">Nimi</Label>
                <Input
                  id="create-user-name"
                  value={createForm.displayName}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, displayName: event.target.value }))
                  }
                  placeholder="Etunimi Sukunimi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-email">Sähköposti</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="kayttaja@yritys.fi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-password">Väliaikainen salasana</Label>
                <Input
                  id="create-user-password"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Vähintään 8 merkkiä"
                />
              </div>
              <div className={`grid grid-cols-1 ${isPlatformAdmin ? 'sm:grid-cols-2' : ''} gap-4`}>
                {isPlatformAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="create-user-role">Pääkäyttäjärooli</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(value) =>
                        setCreateForm((current) => ({ ...current, role: value as 'admin' | 'user' }))
                      }
                    >
                      <SelectTrigger id="create-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Käyttäjä</SelectItem>
                        <SelectItem value="admin">Pääkäyttäjä</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="create-user-status">Tila</Label>
                  <Select
                    value={createForm.status}
                    onValueChange={(value) =>
                      setCreateForm((current) => ({ ...current, status: value as 'active' | 'disabled' }))
                    }
                  >
                    <SelectTrigger id="create-user-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiivinen</SelectItem>
                      <SelectItem value="disabled">Pois käytöstä</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isPlatformAdmin && (
                <Alert>
                  <AlertDescription>
                    Luotu käyttäjä liitetään suoraan työtilaan {organization?.name || 'yrityksesi'} työntekijänä.
                    Työntekijä ei voi saada pääkäyttäjän roolia tästä näkymästä.
                  </AlertDescription>
                </Alert>
              )}

              <Button className="w-full" disabled={creatingUser} onClick={() => void handleCreateUser()}>
                {creatingUser
                  ? isPlatformAdmin
                    ? 'Luodaan käyttäjää...'
                    : 'Luodaan työntekijää...'
                  : isPlatformAdmin
                    ? 'Luo käyttäjä'
                    : 'Luo työntekijä'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          {isPlatformAdmin
            ? 'Pääkäyttäjä hallitsee alustan pääkäyttäjärooleja, käyttäjätiloja ja työtilojen kokonaisnäkymää. Yrityksen omistaja hallitsee vain oman yrityksensä työntekijöitä eikä voi antaa pääkäyttäjäroolia.'
            : `Yrityksen omistaja hallitsee vain työtilan ${organization?.name || 'oman yrityksen'} työntekijöitä. Pääkäyttäjärooli on erillinen eikä sitä voi myöntää tästä näkymästä.`}
        </AlertDescription>
      </Alert>

      {isPlatformAdmin ? (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Käyttäjä</TableHead>
                <TableHead>Sähköposti</TableHead>
                <TableHead>Työtila</TableHead>
                <TableHead>Yritysrooli</TableHead>
                <TableHead>Pääkäyttäjärooli</TableHead>
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
                  <TableCell>{account.organizationName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={account.organizationRole === 'owner' ? 'secondary' : 'outline'}>
                      {getOrganizationRoleLabel(account.organizationRole)}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <Select
                      value={account.role}
                      onValueChange={async (nextRole) => {
                        try {
                          await updateUserRole(account.id, nextRole as 'admin' | 'user');
                          toast.success('Pääkäyttäjärooli päivitetty.');
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
                        <SelectItem value="admin">Pääkäyttäjä</SelectItem>
                        <SelectItem value="user">Käyttäjä</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[180px]">
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
                            await updateUserStatus(
                              account.id,
                              account.status === 'active' ? 'disabled' : 'active'
                            );
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
                  <TableCell>
                    {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('fi-FI') : 'Ei vielä'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
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
              {users.map((account) => {
                const isOwnerRow = account.organizationRole === 'owner';
                return (
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
                    <TableCell>
                      <Badge variant={isOwnerRow ? 'secondary' : 'outline'}>
                        {getOrganizationRoleLabel(account.organizationRole)}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[220px]">
                      <div className="flex items-center gap-2">
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status === 'active' ? 'Aktiivinen' : 'Pois käytöstä'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={account.id === user?.id || isOwnerRow}
                          onClick={async () => {
                            try {
                              await updateOrganizationEmployeeStatus(
                                account.id,
                                account.status === 'active' ? 'disabled' : 'active'
                              );
                              toast.success('Työntekijän tila päivitetty.');
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
                    <TableCell>
                      {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('fi-FI') : 'Ei vielä'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
