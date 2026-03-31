import { useState, useEffect } from 'react';

interface UserInfo {
  avatarUrl: string;
  email: string;
  id: number;
  isOwner: boolean;
  login: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const userInfo = await window.spark.user();
        setUser(userInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return {
    user,
    loading,
    error,
    isOwner: user?.isOwner ?? false,
    isAuthenticated: user !== null,
  };
}
