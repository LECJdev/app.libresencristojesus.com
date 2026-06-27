'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon, LockIcon, UserIcon } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { getDefaultAdminPath } from '@/lib/admin-sections';

export default function LoginPage() {
  const { loginAdmin } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginAdmin(identifier, password);

    if (res.success) {
      router.push(getDefaultAdminPath({ roles: res.roles, rol: res.rol }) ?? '/admin');
    } else {
      setError(res.message ?? 'Error desconocido');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-600/20 p-4">
            <BrandLogo variant="horizontal" className="h-16 w-auto object-contain" priority />
          </div>
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-white">
          Acceso al Sistema
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Libres en Cristo Jesús — Panel Administrativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border border-slate-700/50 bg-slate-800/60 px-4 py-8 shadow-xl backdrop-blur-sm sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full pl-10 sm:text-sm rounded-lg py-3"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Personas must sign in with their email. Only the legacy admin can use the username useroot.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full pl-10 pr-11 sm:text-sm rounded-lg py-3"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded-r-lg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                If your access was assigned from an existing persona, your initial password is your document or identification number.
              </p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-800/50 bg-red-900/30 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {loading ? 'Verificando...' : 'Ingresar al Sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
