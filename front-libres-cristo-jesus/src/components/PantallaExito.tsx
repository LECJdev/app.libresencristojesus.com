'use client';

import { CheckCircle2 } from 'lucide-react';
import { UserData } from '@/hooks/useUserStorage';

interface Props {
  user: UserData;
  eventoTipo: string;
}

export default function PantallaExito({ user, eventoTipo }: Props) {
  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg text-center">
      <div className="flex justify-center mb-6">
        <CheckCircle2 className="h-20 w-20 text-green-500 animate-bounce" />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Asistencia Registrada!</h2>
      <p className="text-gray-500 mb-6">Gracias por asistir a este {eventoTipo}</p>
      
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Tu Info</p>
        <p className="font-medium text-gray-800 text-lg">{user.nombres} {user.apellidos}</p>
        <p className="text-gray-500 text-sm mt-1">{user.documento}</p>
      </div>
      
      <p className="mt-8 text-sm text-gray-400">
        Ya puedes cerrar esta ventana.
      </p>
    </div>
  );
}
