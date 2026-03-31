import { useState, useEffect } from 'react';

interface UserInfo {
  login: string;
}
export function 
  const [load

}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    user,
    error,
  };



















