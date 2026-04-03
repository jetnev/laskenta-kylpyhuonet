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
  roleLabel: string;
  roleBadgeVariant: 'default' | 'secondary' | 'outline';
}

export function getOrganizationRoleLabel(role?: OrganizationRole | null) {
  if (role === 'owner') {
    return 'Omistaja';
  }

  if (role === 'employee') {
    return 'Työntekijä';
  }

  return 'Ei organisaatiota';
}

export function getPlatformRoleLabel(role?: UserRole | null) {
  return role === 'admin' ? 'Pääkäyttäjä' : 'Käyttäjä';
}

export function deriveAccessState(input: AccessStateInput): AccessState {
  const isActive = input.status === 'active';
  const isPlatformAdmin = isActive && input.platformRole === 'admin';
  const isOrganizationOwner = isActive && input.organizationRole === 'owner';
  const canManageUsers = isPlatformAdmin || isOrganizationOwner;
  const canManageSharedData = isPlatformAdmin || isOrganizationOwner;

  let roleLabel = 'Käyttäjä';
  let roleBadgeVariant: AccessState['roleBadgeVariant'] = 'outline';

  if (isPlatformAdmin) {
    roleLabel = 'Pääkäyttäjä';
    roleBadgeVariant = 'default';
  } else if (isOrganizationOwner) {
    roleLabel = 'Omistaja';
    roleBadgeVariant = 'secondary';
  } else if (input.organizationRole === 'employee') {
    roleLabel = 'Työntekijä';
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
    roleLabel,
    roleBadgeVariant,
  };
}