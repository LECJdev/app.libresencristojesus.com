'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { UserData } from '@/hooks/useUserStorage';

interface Props {
  onFound: (user: UserData) => void;
  onNotFound: (documento: string) => void;
}

export default function VerificacionRapida({ onFound, onNotFound }: Props) {
  const [documento, setDocumento] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { data } = await apiClient.get(`/personas/celular/${documento}`);
      if (data) {
        onFound({
          id: data.id,
          nombres: data.nombres || '',
          apellidos: data.apellidos || '',
          documento: data.celular || documento,
        });
      } else {
        onNotFound(documento);
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al buscar el documento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Verificación Rápida</h2>
        <p className="text-gray-500 mt-2">Ingresa tu número de documento o celular para buscarte en el sistema.</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Documento / Celular
          </label>
          <div className="relative">
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 123456789"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || !documento}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Buscando...
            </>
          ) : (
            'Buscar'
          )}
        </button>
      </form>
    </div>
  );
}
