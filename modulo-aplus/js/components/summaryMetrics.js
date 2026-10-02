/**
 * summaryMetrics.js
 * -----------------------------------------------------------------------------
 * Resumen métrico del encabezado: total de oportunidades, A+ activas, ROI
 * promedio A+ y capital comprometido en A+.
 */

import { formatCurrency, formatPercent } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

export function createSummaryMetrics(container) {
  function showLoading() {
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = Array.from({ length: 4 }, () => `
      <li class="aplus-metric aplus-metric--skeleton">
        <span class="aplus-skeleton aplus-skeleton--line" data-w="50"></span>
        <span class="aplus-skeleton aplus-skeleton--metric"></span>
      </li>`).join('');
  }

  function render(summary) {
    const items = [
      { label: 'Total oportunidades', value: summary.total, modifier: '', icon: icons.inbox },
      { label: 'Oportunidades A+ activas', value: summary.aplusActive, modifier: ' aplus-metric--aplus', icon: icons.star },
      { label: 'ROI promedio A+', value: formatPercent(summary.avgRoiAPlus), modifier: '', icon: icons.trend },
      { label: 'Capital en oportunidades A+', value: formatCurrency(summary.aplusCapital), modifier: '', icon: icons.trend },
    ];

    container.setAttribute('aria-busy', 'false');
    container.innerHTML = items.map((item) => `
      <li class="aplus-metric${item.modifier}">
        <span class="aplus-metric__icon">${item.icon}</span>
        <div class="aplus-metric__text">
          <span class="aplus-metric__label">${item.label}</span>
          <strong class="aplus-metric__value">${item.value}</strong>
        </div>
      </li>`).join('');
  }

  function showError() {
    container.setAttribute('aria-busy', 'false');
    container.innerHTML = '';
  }

  return { showLoading, render, showError };
}
