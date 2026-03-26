'use client';

import VerificacionRapida from '@/components/VerificacionRapida';
import FormularioRegistro from '@/components/FormularioRegistro';
import PantallaExito from '@/components/PantallaExito';
import { useUserStorage, UserData } from '@/hooks/useUserStorage';
import { apiClient } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  params: { tipo: string };
}

type Step = 'LOADING' | 'VERIFYING' | 'REGISTERING' | 'SUCCESS' | 'ERROR';

export default function AsistenciaPage({ params }: Props) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  
  const { isLoaded, userData, saveUserData } = useUserStorage();
  const [step, setStep] = useState<Step>('LOADING');
  const [documentoNotFound, setDocumentoNotFound] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const registrarAsistencia = useCallback(async (idPersona: string) => {
    setStep('LOADING');
    try {
      let endpoint = '';
      let payload = {};

      if (params.tipo === 'casapaz') {
        endpoint = '/asistencias/casa-paz';
        payload = { idCasaDePaz: eventId, idPersona, fecha: new Date() };
      } else if (params.tipo === 'dicipulado') {
        endpoint = '/asistencias/dicipulado';
        payload = { idDicipulado: eventId, idPersona, fecha: new Date() };
      } else if (params.tipo === 'sede' || params.tipo === 'culto') {
        endpoint = '/asistencias/nuevos';
        payload = { idSede: eventId, idPersona, fecha: new Date() };
      } else {
        throw new Error('Tipo de evento no válido');
      }

      await apiClient.post(endpoint, payload);
      setStep('SUCCESS');
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar tu asistencia.';
      setErrorMsg(errorMessage);
      setStep('ERROR');
    }
  }, [eventId, params.tipo]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!eventId) {
      setErrorMsg('No se especificó ningún evento válido en el código QR.');
      setStep('ERROR');
      return;
    }
    if (userData) {
      registrarAsistencia(userData.id);
    } else {
      setStep('VERIFYING');
    }
  }, [isLoaded, userData, eventId, registrarAsistencia]);

  const handleUserFound = (user: UserData) => {
    saveUserData(user);
  };

  const handleUserNotFound = (documento: string) => {
    setDocumentoNotFound(documento);
    setStep('REGISTERING');
  };

  const handleRegistered = (user: UserData) => {
    saveUserData(user);
  };

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Procesando tu asistencia...</p>
      </div>
    );
  }

  if (step === 'ERROR') {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-red-50 text-red-800 rounded-xl border border-red-200">
        <h3 className="text-xl font-bold mb-2">Error</h3>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {step === 'VERIFYING' && (
        <VerificacionRapida onFound={handleUserFound} onNotFound={handleUserNotFound} />
      )}

      {step === 'REGISTERING' && (
        <FormularioRegistro initialDocumento={documentoNotFound} onRegistered={handleRegistered} />
      )}

      {step === 'SUCCESS' && userData && (
        <PantallaExito user={userData} eventoTipo={params.tipo} />
      )}
    </div>
  );
}
