'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api';

type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'INTEGRANTE';

interface FormData {
  nombres: string;
  apellidos: string;
  celular: string;
  rol: Rol;
  password: string;
}

interface NuevoUsuario {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
  rol: Rol;
}

const ROL_LABELS: Record<Rol, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  INTEGRANTE: 'Integrante',
};

const ROL_COLORS: Record<Rol, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  INTEGRANTE: 'bg-green-100 text-green-800',
};

export default function AdminUsuarios() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    nombres: '',
    apellidos: '',
    celular: '',
    rol: 'INTEGRANTE',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [recentUsers, setRecentUsers] = useState<NuevoUsuario[]>([]);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/admin');
    }
  }, [loading, isSuperAdmin, router]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const needsPassword = form.rol === 'ADMIN' || form.rol === 'SUPER_ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = needsPassword
        ? form
        : { nombres: form.nombres, apellidos: form.apellidos, celular: form.celular, rol: form.rol };

      const res = await apiClient.post('/personas/admin/crear', payload);
      const created = res.data as NuevoUsuario;
      setSuccess(`Usuario "${created.nombres} ${created.apellidos}" creado correctamente.`);
      setRecentUsers((prev) => [created, ...prev]);
      setForm({ nombres: '', apellidos: '', celular: '', rol: 'INTEGRANTE', password: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Error al crear el usuario');
    }
    setSubmitting(false);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Gestión de Usuarios</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">Crear Nuevo Usuario</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={form.nombres}
                    onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular / Usuario</label>
                <input
                  type="text"
                  required
                  value={form.celular}
                  onChange={(e) => setForm({ ...form, celular: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: 3001234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value as Rol, password: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="INTEGRANTE">Integrante</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPER_ADMIN">Super Administrador</option>
                </select>
              </div>

              {needsPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={needsPassword}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                  ✓ {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-70 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>

          {/* Recent users */}
          {recentUsers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Usuarios Creados en esta Sesión</h2>
              <div className="space-y-3">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.nombres} {u.apellidos}</p>
                      <p className="text-xs text-gray-500">{u.celular}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROL_COLORS[u.rol]}`}>
                      {ROL_LABELS[u.rol]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
