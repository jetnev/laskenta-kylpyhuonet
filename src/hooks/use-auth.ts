import { useState, useEffect } from 'react';

interface User {
  avatarUrl: string;
  email: string;
  id: string;
  isOwner: boolean;
  login: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfo = await spark.user();
        setUser(userInfo);
        setIsOwner(userInfo.isOwner);
      } catch (err) {
        setUser(null);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user,
    loading,
    isOwner,
  };
}
