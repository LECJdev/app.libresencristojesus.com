'use client';
import { QrCode } from 'lucide-react';

export default function AdminQR() {
  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Generador QR</h1>
      </header>
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <QrCode className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Generador de Códigos QR</h2>
          </div>
          <p className="text-gray-600">
            Próximamente: herramienta para generar y exportar listados de códigos QR en PDF para impresión.
          </p>
        </div>
      </main>
    </>
  );
}
