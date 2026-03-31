import { useState, useEffect } from 'react';

interface UserInfo {
  login: string;
  id: string;
  email: string;
  avatarUrl: string;
  isOwner: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

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
    isOwner,
    loading,
  };
}
