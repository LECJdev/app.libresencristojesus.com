import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useRouter } from 'next/navigation';
import {
  canAccessAdminPath,
  getAdminNavigationSections,
  getAllowedAdminSectionIds,
  getDefaultAdminPath,
  hasAdminSectionAccess,
  type AdminSectionId,
} from '@/lib/admin-sections';
import {
  canAssignCasaDePazLeader,
  canDeleteData,
  canManageUsers,
  getPrimaryRole,
  isAdminRole,
  isScopedCasaDePazLeader,
  normalizeRoleCarrier,
  type UserRole,
} from '../lib/roles';

export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  rol: UserRole;
  roles: UserRole[];
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
        setUser(normalizeRoleCarrier(JSON.parse(storedUser) as User));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const loginAdmin = async (identifier: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { identifier, password });
      const { access_token, user: userData } = res.data;
      const normalizedUser = normalizeRoleCarrier(userData as User);
      localStorage.setItem('LC_AUTH_TOKEN', access_token);
      localStorage.setItem('LC_USER', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return { success: true, rol: normalizedUser.rol, roles: normalizedUser.roles };
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
    isAdmin: isAdminRole(user),
    isSuperAdmin: getPrimaryRole(user) === 'SUPER_ADMIN' || user?.roles.includes('SUPER_ADMIN') === true,
    canDeleteData: canDeleteData(user),
    canManageUsers: canManageUsers(user),
    canAssignCasaDePazLeader: canAssignCasaDePazLeader(user),
    isScopedCasaDePazLeader: isScopedCasaDePazLeader(user),
    allowedAdminSectionIds: getAllowedAdminSectionIds(user),
    adminNavigationSections: getAdminNavigationSections(user),
    defaultAdminPath: getDefaultAdminPath(user),
    canAccessAdminPath: (pathname: string) => canAccessAdminPath(user, pathname),
    hasAdminSectionAccess: (sectionId: AdminSectionId) => hasAdminSectionAccess(user, sectionId),
  };
}
