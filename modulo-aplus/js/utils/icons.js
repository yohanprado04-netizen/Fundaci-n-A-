/**
 * icons.js
 * -----------------------------------------------------------------------------
 * Iconos SVG inline (sin dependencias ni peticiones de red).
 * Todos heredan `currentColor` y son decorativos (aria-hidden).
 */

const stroke = (paths) =>
  `<svg class="aplus-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  search: stroke('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  award: stroke('<circle cx="12" cy="8" r="6"/><path d="m15.4 12.5 2.6 8.5-6-3-6 3 2.6-8.5"/>'),
  grid: stroke('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  list: stroke('<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  close: stroke('<path d="M18 6 6 18M6 6l12 12"/>'),
  arrowRight: stroke('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
  chevronLeft: stroke('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: stroke('<path d="m9 18 6-6-6-6"/>'),
  mail: stroke('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  trend: stroke('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  inbox: stroke('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>'),
  alert: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/>'),
  reset: stroke('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
};
