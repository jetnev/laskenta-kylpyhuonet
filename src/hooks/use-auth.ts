import { useState, useEffect } from 'react';

interface UserInfo {
  login: string;
  id: string;
  email: string;

  isOwner: boolean;
 

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
        setIsOwner(false);
        setLoading(false);

    fetchUser();

    user,
    isOwner,
}













  return {
    user,


  };

