'use client';

import { useEffect, useState, use } from 'react';
import { QRCode } from 'react-qrcode-logo';
import axios from 'axios';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface EventoQR {
  nombre: string;
  generaQr: boolean;
}

export default function EventoQRPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [evento, setEvento] = useState<EventoQR | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const token = localStorage.getItem('LC_AUTH_TOKEN');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
        const res = await axios.get(`${apiBase}/eventos/${resolvedParams.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvento(res.data);
        
        // Define public url
        const origin = window.location.origin;
        setPublicUrl(`${origin}/registro/${resolvedParams.id}`);
      } catch (error) {
        console.error('Error cargando evento:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvento();
  }, [resolvedParams.id]);

  if (loading) return <div className="p-4 text-center sm:p-6 lg:p-8">Cargando código QR...</div>;
  if (!evento) return <div className="p-4 text-center text-red-500 sm:p-6 lg:p-8">Evento no encontrado.</div>;

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${evento.nombre.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-start gap-3 sm:items-center sm:gap-4">
        <Link
          href="/admin/eventos"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Volver a eventos"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Código QR del Evento</h1>
          <p className="break-words text-slate-500">{evento.nombre}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-8">
        {!evento.generaQr ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-red-600 mb-2">QR Desactivado</h2>
            <p className="text-slate-600">Este evento está configurado para no aceptar registros públicos mediante QR.</p>
            <p className="text-sm mt-4 text-slate-500">Puedes cambiar esto editando la configuración del evento.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 w-full max-w-[328px] rounded-2xl bg-slate-50 p-3 shadow-inner sm:p-6 [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full [&_canvas]:max-w-full">
              <QRCode
                id="qr-canvas"
                value={publicUrl}
                size={280}
                qrStyle="dots"
                eyeRadius={10}
                fgColor="#0f172a"
                logoImage="/favicon.ico"
                logoWidth={60}
                logoPaddingStyle="circle"
              />
            </div>

            <div className="text-center space-y-4 w-full max-w-md">
              <p className="text-sm text-slate-600">
                Escanea este código o usa el enlace directo para ir al registro público.
              </p>
              
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  onClick={downloadQR}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" /> Descargar PNG
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" /> Ir al enlace
                </a>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Enlace Público</p>
                <code className="block p-3 bg-slate-100 rounded text-sm text-slate-700 break-all select-all">
                  {publicUrl}
                </code>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
