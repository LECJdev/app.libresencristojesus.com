import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function DiscipuladoReportsPage() {
  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/reportes"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a Reportes
        </Link>

        <section className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Próximamente
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">Reportes de Discipulado</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Todavía no hay una pantalla de reporte implementada para Discipulado.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
