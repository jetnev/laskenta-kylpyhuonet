import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';

interface UserInfo {
  login: string;
  id: string;
  email: string;
  avatarUrl: string;
  isOwner: boolean;
}

interface LocalUser {
  email: string;
  password: string;
  createdAt: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users] = useKV<LocalUser[]>("app-users", []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const sessionEmail = sessionStorage.getItem('laskenta-user-email');
        
        if (sessionEmail && users) {
          const localUser = users.find(u => u.email === sessionEmail);
          if (localUser) {
            setUser({
              login: localUser.email.split('@')[0],
              id: localUser.email,
              email: localUser.email,
              avatarUrl: '',
              isOwner: true,
            });
            setIsOwner(true);
            setLoading(false);
            return;
          }
        }

        const userInfo = await spark.user();
        setUser(userInfo);
        setIsOwner(userInfo.isOwner);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [users]);

  const login = (email: string, password: string): boolean => {
    if (!users) return false;
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      sessionStorage.setItem('laskenta-user-email', email);
      setUser({
        login: email.split('@')[0],
        id: email,
        email: email,
        avatarUrl: '',
        isOwner: true,
      });
      setIsOwner(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem('laskenta-user-email');
    setUser(null);
    setIsOwner(false);
  };

  return {
    user,
    isOwner,
    loading,
    login,
    logout,
  };
}
