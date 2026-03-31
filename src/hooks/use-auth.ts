import { useState, useEffect } from 'react';

interface UserInfo {
  avatarUrl: string;
}
export functi
  const [loading, s

 

      } catch (err) {
        setUser(null);
        setLoading(false);
    }


    async function loadUser() {
      try {
        const userInfo = await spark.user();
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

    loading,

    isOwner: user?.isOwner ?? false,

  };

