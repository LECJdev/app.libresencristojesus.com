'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { UserData } from '@/hooks/useUserStorage';
import {
  ColombiaCity,
  ColombiaDepartment,
  fetchColombiaCitiesByDepartment,
  fetchColombiaDepartments,
} from '@/lib/api-colombia';
import {
  buildRegistrationPersonaPayload,
  EMPTY_REGISTRATION_PERSONA_FORM,
} from '@/lib/registration-persona';
import {
  sanitizeBarrioInput,
  sanitizeCelularInput,
  sanitizeCorreoInput,
  sanitizeDireccionInput,
  sanitizeLocationInput,
  sanitizeNombreInput,
} from '@/lib/input-security';

interface Props {
  initialDocumento: string;
  onRegistered: (user: UserData) => void;
}

interface RedOption {
  id: string;
  nombre: string | null;
  sede?: { id: string; nombre: string | null } | null;
}

function formatRedLabel(red: RedOption): string {
  if (red.sede?.nombre) {
    return `${red.nombre || red.id} · ${red.sede.nombre}`;
  }

  return red.nombre || red.id;
}

export default function FormularioRegistro({ initialDocumento, onRegistered }: Props) {
  const [formData, setFormData] = useState({
    ...EMPTY_REGISTRATION_PERSONA_FORM,
    celular: initialDocumento,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [departments, setDepartments] = useState<ColombiaDepartment[]>([]);
  const [cities, setCities] = useState<ColombiaCity[]>([]);
  const [redes, setRedes] = useState<RedOption[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      setIsLoadingDepartments(true);
      setLocationError('');

      try {
        const [response, redesResponse] = await Promise.all([
          fetchColombiaDepartments(),
          apiClient.get<RedOption[]>('/redes'),
        ]);
        if (!cancelled) {
          setDepartments(response);
          setRedes(redesResponse.data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLocationError('No fue posible cargar departamentos. Intentá de nuevo más tarde.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDepartments(false);
        }
      }
    };

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDepartmentId) {
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setIsLoadingCities(true);
      setLocationError('');

      try {
        const response = await fetchColombiaCitiesByDepartment(
          Number.parseInt(selectedDepartmentId, 10),
        );
        if (!cancelled) {
          setCities(response);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setCities([]);
          setLocationError('No fue posible cargar ciudades o municipios.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCities(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'nombres' || name === 'apellidos') {
      setFormData((prev) => ({ ...prev, [name]: sanitizeNombreInput(value) }));
      return;
    }

    if (name === 'celular') {
      setFormData((prev) => ({ ...prev, celular: sanitizeCelularInput(value) }));
      return;
    }

    if (name === 'correo') {
      setFormData((prev) => ({ ...prev, correo: sanitizeCorreoInput(value) }));
      return;
    }

    if (name === 'direccion') {
      setFormData((prev) => ({ ...prev, direccion: sanitizeDireccionInput(value) }));
      return;
    }

    if (name === 'barrio') {
      setFormData((prev) => ({ ...prev, barrio: sanitizeBarrioInput(value) }));
      return;
    }

    if (name === 'departamento') {
      const department = departments.find((item) => item.name === value);
      setSelectedDepartmentId(department ? String(department.id) : '');
      setCities([]);
      setFormData((prev) => ({
        ...prev,
        departamento: sanitizeLocationInput(value),
        ciudad: '',
      }));
      return;
    }

    if (name === 'ciudad') {
      setFormData((prev) => ({ ...prev, ciudad: sanitizeLocationInput(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.departamento || !formData.ciudad) {
      setError('Seleccioná departamento y ciudad/municipio.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post(
        '/personas',
        buildRegistrationPersonaPayload(formData),
      );
      onRegistered({
        id: data.id,
        nombres: data.nombres,
        apellidos: data.apellidos,
        documento: data.celular,
      });
    } catch (err) {
      console.error(err);
      setError('Error al registrar la persona. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registro Nuevo</h2>
        <p className="text-gray-500 mt-2">Parece que eres nuevo. Por favor completa tus datos.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
            <input
              type="text"
              name="nombres"
              required
              value={formData.nombres}
              onChange={handleChange}
              maxLength={120}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
            <input
              type="text"
              name="apellidos"
              required
              value={formData.apellidos}
              onChange={handleChange}
              maxLength={120}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="C.C">C.C</option>
              <option value="T.I.">T.I.</option>
              <option value="C.E.">C.E.</option>
              <option value="PT">PT</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Doc / Celular *</label>
            <input
              type="text"
              name="celular"
              required
              value={formData.celular}
              onChange={handleChange}
              maxLength={15}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
            <select
              name="departamento"
              required
              value={formData.departamento}
              onChange={handleChange}
              disabled={isLoadingDepartments}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            >
              <option value="">
                {isLoadingDepartments ? 'Cargando departamentos...' : 'Selecciona un departamento'}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Municipio *</label>
            <select
              name="ciudad"
              required
              value={formData.ciudad}
              onChange={handleChange}
              disabled={!formData.departamento || isLoadingCities}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            >
              <option value="">
                {!formData.departamento
                  ? 'Primero selecciona un departamento'
                  : isLoadingCities
                    ? 'Cargando ciudades...'
                    : 'Selecciona una ciudad o municipio'}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Red</label>
              <select
                name="idRed"
                value={formData.idRed}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecciona una red (opcional)</option>
                {redes.map((red) => (
                  <option key={red.id} value={red.id}>
                    {formatRedLabel(red)}
                  </option>
                ))}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
            <input
              type="text"
              name="barrio"
              value={formData.barrio}
              onChange={handleChange}
              maxLength={120}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              maxLength={255}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            maxLength={120}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {locationError && <p className="text-sm text-amber-600">{locationError}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70 mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Guardando...
            </>
          ) : (
            'Completar Registro'
          )}
        </button>
      </form>
    </div>
  );
}
