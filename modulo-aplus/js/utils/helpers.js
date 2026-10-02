/**
 * helpers.js
 * -----------------------------------------------------------------------------
 * Utilidades puras y reutilizables (sin dependencias del DOM del host).
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para insertarlo de forma segura en plantillas HTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Normaliza texto para búsquedas: minúsculas, sin tildes ni espacios sobrantes. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** "En evaluación" -> "en-evaluacion" (útil para clases CSS por estado). */
export function slugify(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Retrasa la ejecución de `fn` hasta que pasen `wait` ms sin nuevas llamadas. */
export function debounce(fn, wait = 300) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

const decimalFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** 1800000 -> "US$ 1,8 M" */
export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  if (abs >= 1e6) return `US$ ${decimalFormatter.format(value / 1e6)} M`;
  if (abs >= 1e3) return `US$ ${decimalFormatter.format(value / 1e3)} K`;
  return `US$ ${decimalFormatter.format(value)}`;
}

/** 214 -> "214 %" */
export function formatPercent(value) {
  return `${decimalFormatter.format(Number(value) || 0)} %`;
}

/** "2026-03-14" -> "14 mar 2026" */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const date = new Date(`${isoDate}T12:00:00`); // mediodía: evita saltos de día por zona horaria
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/**
 * Aplica el ancho de los medidores (barras de impacto) mediante CSSOM.
 * Se evita `style="..."` inline en las plantillas para ser compatible con
 * políticas CSP estrictas (style-src sin 'unsafe-inline') de la web anfitriona.
 */
export function applyMeters(scope) {
  scope.querySelectorAll('[data-aplus-meter]').forEach((meter) => {
    const value = Math.max(0, Math.min(100, Number(meter.dataset.aplusMeter) || 0));
    meter.style.setProperty('--aplus-meter-value', `${value}%`);
  });
}
