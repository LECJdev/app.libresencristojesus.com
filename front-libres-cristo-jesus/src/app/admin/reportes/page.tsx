import type { LucideIcon } from 'lucide-react';
import { ArrowRight, BookOpen, CalendarDays, Home, Network } from 'lucide-react';
import Link from 'next/link';

interface ReportCard {
  href: string;
  title: string;
  description: string;
  status: string;
  Icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
  arrowClassName: string;
  statusClassName: string;
  descriptionClassName: string;
}

const reportCards: ReportCard[] = [
  {
    href: '/admin/reportes/dominical',
    title: 'Reportes Dominicales',
    description: 'Histórico por fecha, Red y persona.',
    status: 'Disponible',
    Icon: CalendarDays,
    cardClassName: 'border-slate-900 bg-slate-900 text-white',
    iconClassName: 'bg-white/10 text-white',
    arrowClassName: 'text-slate-300',
    statusClassName: 'text-slate-300',
    descriptionClassName: 'text-slate-300',
  },
  {
    href: '/admin/reportes/casa-paz',
    title: 'Reportes de Casa de Paz',
    description: 'Resumen mensual y diario con seguimiento de encuentros.',
    status: 'Disponible',
    Icon: Home,
    cardClassName: 'border-blue-200 bg-white text-slate-900',
    iconClassName: 'bg-blue-50 text-blue-600',
    arrowClassName: 'text-blue-400',
    statusClassName: 'text-blue-600',
    descriptionClassName: 'text-slate-500',
  },
  {
    href: '/admin/reportes/red/censo',
    title: 'Reportes por Red',
    description: 'Censo descargable por Red/Distrito.',
    status: 'Disponible',
    Icon: Network,
    cardClassName: 'border-indigo-200 bg-white text-slate-900',
    iconClassName: 'bg-indigo-50 text-indigo-600',
    arrowClassName: 'text-indigo-400',
    statusClassName: 'text-indigo-600',
    descriptionClassName: 'text-slate-500',
  },
  {
    href: '/admin/reportes/discipulado',
    title: 'Reportes de Discipulado',
    description: 'La pantalla de reportes estará disponible próximamente.',
    status: 'Próximamente',
    Icon: BookOpen,
    cardClassName: 'border-dashed border-slate-300 bg-slate-100 text-slate-600',
    iconClassName: 'bg-white text-slate-400',
    arrowClassName: 'text-slate-400',
    statusClassName: 'text-slate-500',
    descriptionClassName: 'text-slate-500',
  },
];

export default function AdminReportes() {
  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Libres en Cristo Jesús
          </p>
          <h1 id="reportes-title" className="text-xl font-semibold text-gray-800">
            Reportes
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <section
          aria-labelledby="reportes-title"
          className="mx-auto w-full max-w-7xl"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Centro de reportes
            </p>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Elegí una categoría para abrir sus opciones y consultar la información disponible.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {reportCards.map(
              ({
                href,
                title,
                description,
                status,
                Icon,
                cardClassName,
                iconClassName,
                arrowClassName,
                statusClassName,
                descriptionClassName,
              }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group flex min-h-56 flex-col rounded-2xl border p-5 shadow-sm transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${cardClassName}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-xl p-2.5 ${iconClassName}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${arrowClassName}`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.2em] ${statusClassName}`}>
                    {status}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{title}</h2>
                  <p className={`mt-2 text-sm ${descriptionClassName}`}>{description}</p>
                </Link>
              ),
            )}
          </div>
        </section>
      </main>
    </>
  );
}
