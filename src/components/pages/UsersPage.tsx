import { useState } from 'react';
import { ShieldCheck, UserCircle, UserPlus } from '@phosphor-icons/react';
import {
  deriveAccessState,
  getOrganizationRoleBadgeLabel,
  getOrganizationRoleLabel,
  getPlatformRoleLabel,
} from '../../lib/access-control';
import { useAuth } from '../../hooks/use-auth';
import { AppPageContentGrid, AppPageHeader, AppPageLayout } from '../layout/AppPageLayout';
import PageEmptyState from '../layout/PageEmptyState';
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
  const accessState = deriveAccessState({
    platformRole: user?.role,
    organizationRole: user?.organizationRole,
    status: user?.status,
  });
  const workspaceName = organization?.name || user?.organizationName || 'Ei työtilaa';

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
        toast.success('Käyttäjä luotu onnistuneesti.');
      }

      setShowCreateDialog(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Käyttäjän luonti epäonnistui.');
    } finally {
      setCreatingUser(false);
    }
  };

  const createUserAction = canManageUsers ? (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Luo käyttäjä
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Luo uusi käyttäjä</DialogTitle>
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
            {isPlatformAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="create-user-role">Alustan rooli</Label>
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
                    <SelectItem value="user">{getPlatformRoleLabel('user')}</SelectItem>
                    <SelectItem value="admin">{getPlatformRoleLabel('admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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

          {!isPlatformAdmin ? (
            <Alert>
              <AlertDescription>
                Luotu käyttäjä liitetään suoraan työtilaan {organization?.name || 'yrityksesi'} käyttäjänä.
                Projektan ylläpidon roolia ei voi myöntää tästä näkymästä.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" disabled={creatingUser} onClick={() => void handleCreateUser()}>
            {creatingUser ? 'Luodaan käyttäjää...' : 'Luo käyttäjä'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <AppPageLayout pageType="registry">
      <AppPageHeader
        title={isPlatformAdmin ? 'Käyttäjähallinta' : 'Työtilan käyttäjät'}
        description={
          isPlatformAdmin
            ? 'Hallitse alustan rooleja, työtiloja ja tilien tilaa.'
            : `Hallitse yrityksesi ${organization?.name || 'työtilan'} työntekijätilejä ja käyttöoikeuksia.`
        }
        eyebrow={<Badge variant="outline">{isPlatformAdmin ? 'Projektan ylläpito' : 'Työtilan käyttäjät'}</Badge>}
        actions={createUserAction}
      />

      <AppPageContentGrid pageType="registry">
        <div className="space-y-6 xl:col-span-8">
          {!canManageUsers ? (
            <PageEmptyState
              icon={<ShieldCheck className="h-6 w-6" weight="duotone" />}
              title="Käyttäjähallinta on lukittu tälle roolille"
              description="Vain yrityksen pääkäyttäjä tai Projektan ylläpito voi hallita käyttäjiä. Oikean reunan paneeli näyttää roolimallin ja nykyiset oikeutesi."
            />
          ) : (
            <>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  {isPlatformAdmin
                    ? 'Projektan ylläpito hallitsee alustan rooleja, käyttäjätiloja ja työtilojen kokonaisnäkymää. Yrityksen pääkäyttäjä hallitsee vain oman työtilansa käyttäjiä eikä voi myöntää ylläpitoroolia.'
                    : `Yrityksen pääkäyttäjä hallitsee vain työtilan ${organization?.name || 'oman yrityksen'} käyttäjiä. Projektan ylläpidon rooli on erillinen eikä sitä voi myöntää tästä näkymästä.`}
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
                <TableHead>Työtilarooli</TableHead>
                <TableHead>Alustan rooli</TableHead>
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
                      {getOrganizationRoleBadgeLabel(account.organizationRole)}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <Select
                      value={account.role}
                      onValueChange={async (nextRole) => {
                        try {
                          await updateUserRole(account.id, nextRole as 'admin' | 'user');
                          toast.success('Alustan rooli päivitetty.');
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
                        <SelectItem value="admin">{getPlatformRoleLabel('admin')}</SelectItem>
                        <SelectItem value="user">{getPlatformRoleLabel('user')}</SelectItem>
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
                        {getOrganizationRoleBadgeLabel(account.organizationRole)}
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
                              toast.success('Käyttäjän tila päivitetty.');
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
            </>
          )}
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sinun oikeutesi</h2>
                <p className="text-sm text-muted-foreground">Näet tästä heti, mitä voit hallita nykyisellä roolillasi.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={accessState.roleBadgeVariant}>{accessState.roleBadgeLabel}</Badge>
              <Badge variant="outline">{getOrganizationRoleLabel(user?.organizationRole)}</Badge>
              <Badge variant="outline">{getPlatformRoleLabel(user?.role)}</Badge>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Työtila</p>
              <p className="mt-2 font-medium text-foreground">{workspaceName}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Käyttäjähallinta</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageUsers ? 'Kyllä' : 'Ei'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Yhteiset tiedot</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageSharedData ? 'Kyllä' : 'Ei'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2 xl:col-span-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sopimusasiat</p>
                <p className="mt-2 text-sm font-medium text-foreground">{accessState.canManageLegalDocuments ? 'Kyllä (vain Projektan ylläpito)' : 'Ei'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Roolimalli</p>
              <h2 className="mt-2 text-lg font-semibold">Työtila ja alusta ovat eri tasoja</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Työtilarooli:
                <span className="ml-1 font-medium text-foreground">Käyttäjä / Yrityksen pääkäyttäjä</span>
              </p>
              <p>
                Alustarooli:
                <span className="ml-1 font-medium text-foreground">Käyttäjä / Projektan ylläpito</span>
              </p>
              <p>Yrityksen pääkäyttäjä voi hallita oman työtilansa käyttäjiä, mutta vain Projektan ylläpito näkee koko alustatason roolit ja työtilat.</p>
            </div>
          </Card>
        </div>
      </AppPageContentGrid>
    </AppPageLayout>
  );
}
