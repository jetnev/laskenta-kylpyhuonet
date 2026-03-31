import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';

export type UserRole = 'owner' | 'editor' | 'viewer';

interface UserInfo {
  login: string;
  id: string;
  email: string;
  avatarUrl: string;
  isOwner: boolean;
}

interface AppUserRole {
  userId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);
  const [userRoles] = useKV<AppUserRole[]>("user-roles", []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const userInfo = await spark.user();
        
        if (!userInfo || typeof userInfo.isOwner === 'undefined') {
          console.error('User info incomplete:', userInfo);
          setUser(null);
          setRole('viewer');
          setLoading(false);
          return;
        }
        
        setUser(userInfo);

        if (userInfo.isOwner) {
          setRole('owner');
        } else {
          const userRoleEntry = userRoles?.find(r => r.userId === userInfo.id);
          setRole(userRoleEntry?.role || 'viewer');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
        setRole('viewer');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userRoles]);

  const canEdit = role === 'owner' || role === 'editor';
  const canDelete = role === 'owner' || role === 'editor';
  const canManageUsers = role === 'owner';

  return {
    user,
    role,
    canEdit,
    canDelete,
    canManageUsers,
    loading,
  };
}
