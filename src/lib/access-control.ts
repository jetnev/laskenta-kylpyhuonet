import type { OrganizationRole, UserRole, UserStatus } from './supabase';

export interface AccessStateInput {
  platformRole?: UserRole | null;
  organizationRole?: OrganizationRole | null;
  status?: UserStatus | null;
}

export interface AccessState {
  isActive: boolean;
  isPlatformAdmin: boolean;
  isOrganizationOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSharedData: boolean;
  canManageLegalDocuments: boolean;
  roleLabel: string;
  roleBadgeLabel: string;
  roleBadgeVariant: 'default' | 'secondary' | 'outline';
}

export function getOrganizationRoleLabel(role?: OrganizationRole | null) {
  if (role === 'owner') {
    return 'Yrityksen pääkäyttäjä';
  }

  if (role === 'employee') {
    return 'Käyttäjä';
  }

  return 'Ei työtilaa';
}

export function getOrganizationRoleBadgeLabel(role?: OrganizationRole | null) {
  if (role === 'owner') {
    return 'Pääkäyttäjä';
  }

  if (role === 'employee') {
    return 'Käyttäjä';
  }

  return 'Ei työtilaa';
}

export function getPlatformRoleLabel(role?: UserRole | null) {
  return role === 'admin' ? 'Projektan ylläpito' : 'Käyttäjä';
}

export function getPlatformRoleBadgeLabel(role?: UserRole | null) {
  return role === 'admin' ? 'Ylläpito' : 'Käyttäjä';
}

export function deriveAccessState(input: AccessStateInput): AccessState {
  const isActive = input.status === 'active';
  const isPlatformAdmin = isActive && input.platformRole === 'admin';
  const isOrganizationOwner = isActive && input.organizationRole === 'owner';
  const canManageUsers = isPlatformAdmin || isOrganizationOwner;
  const canManageSharedData = isPlatformAdmin || isOrganizationOwner;
  const canManageLegalDocuments = isPlatformAdmin;

  let roleLabel = getOrganizationRoleLabel('employee');
  let roleBadgeLabel = getOrganizationRoleBadgeLabel('employee');
  let roleBadgeVariant: AccessState['roleBadgeVariant'] = 'outline';

  if (isPlatformAdmin) {
    roleLabel = getPlatformRoleLabel(input.platformRole);
    roleBadgeLabel = getPlatformRoleBadgeLabel(input.platformRole);
    roleBadgeVariant = 'default';
  } else if (isOrganizationOwner) {
    roleLabel = getOrganizationRoleLabel(input.organizationRole);
    roleBadgeLabel = getOrganizationRoleBadgeLabel(input.organizationRole);
    roleBadgeVariant = 'secondary';
  } else if (input.organizationRole === 'employee') {
    roleLabel = getOrganizationRoleLabel(input.organizationRole);
    roleBadgeLabel = getOrganizationRoleBadgeLabel(input.organizationRole);
    roleBadgeVariant = 'outline';
  }

  return {
    isActive,
    isPlatformAdmin,
    isOrganizationOwner,
    canEdit: isActive,
    canDelete: isActive,
    canManageUsers,
    canManageSharedData,
    canManageLegalDocuments,
    roleLabel,
    roleBadgeLabel,
    roleBadgeVariant,
  };
}