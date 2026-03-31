import { useState, useEffect } from 'react';

interface UserInfo {
  login: string;
  avatarUrl: string;
  email: string;
  id: string;
  isOwner: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
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
  }, []);

  return {
    user,
    loading,
    isOwner,
  };
}
