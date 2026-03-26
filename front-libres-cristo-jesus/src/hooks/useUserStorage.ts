import { useState, useEffect } from 'react';

export interface UserData {
  id: string;
  nombres: string;
  apellidos: string;
  documento?: string;
}

const STORAGE_KEY = 'libres_cristo_jesus_user';

export function useUserStorage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUserData(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveUserData = (data: UserData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setUserData(data);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  };

  const clearUserData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserData(null);
  };

  return { userData, saveUserData, clearUserData, isLoaded };
}
