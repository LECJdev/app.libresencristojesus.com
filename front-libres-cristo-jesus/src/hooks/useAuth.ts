import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useRouter } from 'next/navigation';
import {
  canDeleteData,
  canManageUsers,
  isAdminRole,
  type UserRole,
} from '../lib/roles';

export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  rol: UserRole;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('LC_AUTH_TOKEN');
      const storedUser = localStorage.getItem('LC_USER');
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const loginAdmin = async (identifier: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { identifier, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('LC_AUTH_TOKEN', access_token);
      localStorage.setItem('LC_USER', JSON.stringify(userData));
      setUser(userData);
      return { success: true, rol: userData.rol };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return { success: false, message: err.response?.data?.message || 'Error al iniciar sesión' };
    }
  };

  const logout = () => {
    localStorage.removeItem('LC_AUTH_TOKEN');
    localStorage.removeItem('LC_USER');
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    loading,
    loginAdmin,
    logout,
    isAdmin: isAdminRole(user?.rol),
    isSuperAdmin: user?.rol === 'SUPER_ADMIN',
    canDeleteData: canDeleteData(user?.rol),
    canManageUsers: canManageUsers(user?.rol),
  };
}
