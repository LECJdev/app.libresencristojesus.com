/**
 * Shared display formatters.
 *
 * Defined once so every screen shows the same figure the same way: an
 * offering rendered as "$ 250.000" in one place and "250000" in another
 * reads as two different amounts to the person checking the numbers.
 */

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  // Offerings are recorded in whole pesos in practice; the cents the API
  // allows are shown only when they exist.
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('es-CO');

/** Colombian pesos, e.g. "$ 250.000". */
export function formatCurrencyCOP(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Colombian grouping, e.g. "1.542". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Short date from an ISO instant, e.g. "07 ago 2026". */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
