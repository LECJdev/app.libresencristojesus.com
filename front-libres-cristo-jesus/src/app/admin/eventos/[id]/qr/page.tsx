'use client';

import { useEffect, useState, use } from 'react';
import { QRCode } from 'react-qrcode-logo';
import axios from 'axios';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function EventoQRPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [evento, setEvento] = useState<any>(null);
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

  if (loading) return <div className="p-8 text-center">Cargando código QR...</div>;
  if (!evento) return <div className="p-8 text-center text-red-500">Evento no encontrado.</div>;

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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/eventos" className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Código QR del Evento</h1>
          <p className="text-slate-500">{evento.nombre}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border border-slate-200 flex flex-col items-center justify-center">
        {!evento.generaQr ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-red-600 mb-2">QR Desactivado</h2>
            <p className="text-slate-600">Este evento está configurado para no aceptar registros públicos mediante QR.</p>
            <p className="text-sm mt-4 text-slate-500">Puedes cambiar esto editando la configuración del evento.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-inner mb-8">
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
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={downloadQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shadow-sm font-medium"
                >
                  <Download className="h-4 w-4" /> Descargar PNG
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-sm font-medium"
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
