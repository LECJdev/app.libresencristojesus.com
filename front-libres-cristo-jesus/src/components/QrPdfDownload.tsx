'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';
import { PDFDocument, StandardFonts } from 'pdf-lib';

type QrSizeKey = 'small' | 'medium' | 'large';

interface QrPdfDownloadProps {
  publicPath: string;
  fileName: string;
  title: string;
}

const MM_TO_PT = 72 / 25.4;

const SIZE_CONFIG: Record<
  QrSizeKey,
  {
    label: string;
    pageMm: number;
    qrMm: number;
    canvasSize: number;
  }
> = {
  small: {
    label: 'Pequeño',
    pageMm: 80,
    qrMm: 50,
    canvasSize: 512,
  },
  medium: {
    label: 'Mediano',
    pageMm: 110,
    qrMm: 75,
    canvasSize: 768,
  },
  large: {
    label: 'Grande',
    pageMm: 140,
    qrMm: 100,
    canvasSize: 1024,
  },
};

function mmToPt(mm: number) {
  return mm * MM_TO_PT;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitTitleIntoLines(title: string, maxWidth: number, fontSize: number) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const averageCharWidth = fontSize * 0.55;
  const maxCharsPerLine = Math.max(12, Math.floor(maxWidth / averageCharWidth));
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine || !currentLine) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export default function QrPdfDownload({ publicPath, fileName, title }: QrPdfDownloadProps) {
  const [size, setSize] = useState<QrSizeKey>('medium');
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const qrId = useId();

  const selectedSize = SIZE_CONFIG[size];
  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);

  const handleDownload = async () => {
    if (!publicUrl) {
      alert('No se pudo construir el enlace del QR.');
      return;
    }

    const canvas = containerRef.current?.querySelector('canvas');

    if (!canvas) {
      alert('No se pudo generar el QR para descargar.');
      return;
    }

    setIsDownloading(true);

    try {
      const imageBytes = await fetch(canvas.toDataURL('image/png')).then((res) =>
        res.arrayBuffer(),
      );

      const pdfDoc = await PDFDocument.create();
      const pageSize = mmToPt(selectedSize.pageMm);
      const qrSize = mmToPt(selectedSize.qrMm);
      const horizontalPadding = mmToPt(10);
      const topPadding = mmToPt(12);
      const bottomPadding = mmToPt(10);
      const titleGap = mmToPt(8);
      const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const titleFontSize = Math.max(12, Math.round(pageSize * 0.1));
      const titleMaxWidth = pageSize - horizontalPadding * 2;
      const titleLines = splitTitleIntoLines(title, titleMaxWidth, titleFontSize);
      const titleLineHeight = titleFontSize * 1.2;
      const titleBlockHeight = titleLines.length * titleLineHeight;
      const pageHeight = topPadding + titleBlockHeight + titleGap + qrSize + bottomPadding;
      const qrX = (pageSize - qrSize) / 2;
      const qrY = bottomPadding;
      const page = pdfDoc.addPage([pageSize, pageHeight]);
      const qrImage = await pdfDoc.embedPng(imageBytes);

      let currentTitleY = pageHeight - topPadding - titleFontSize;

      for (const line of titleLines) {
        const textWidth = titleFont.widthOfTextAtSize(line, titleFontSize);

        page.drawText(line, {
          x: (pageSize - textWidth) / 2,
          y: currentTitleY,
          size: titleFontSize,
          font: titleFont,
        });

        currentTitleY -= titleLineHeight;
      }

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      const pdfBytes = await pdfDoc.save();
      const safePdfBytes = Uint8Array.from(pdfBytes);
      const blob = new Blob([safePdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = `${slugify(fileName) || 'qr'}-${size}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      alert('No se pudo descargar el QR en PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-[120px]">
          <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as QrSizeKey)}
            className="w-full appearance-none rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            aria-label="Tamaño del QR"
          >
            {Object.entries(SIZE_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || !publicUrl}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          title="Descargar QR en PDF"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Generando...' : 'Descargar QR'}
        </button>
      </div>

      <div ref={containerRef} className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
        {publicUrl && (
          <QRCode
            id={qrId}
            value={publicUrl}
            size={selectedSize.canvasSize}
            fgColor="#0f172a"
            bgColor="#ffffff"
            quietZone={32}
          />
        )}
      </div>
    </>
  );
}
