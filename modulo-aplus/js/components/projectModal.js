/**
 * projectModal.js
 * -----------------------------------------------------------------------------
 * Modal de detalle completo. Accesible: role="dialog", aria-modal, foco
 * atrapado, cierre con ESC o clic en el backdrop, y restauración del foco.
 */

import { aplusBadgeHtml, categoryBadgeHtml, statusPillHtml, impactMeterHtml } from './projectCard.js';
import { escapeHtml, formatCurrency, formatPercent, formatDate, applyMeters } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

const CLOSE_ANIMATION_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** @param {HTMLElement} host Elemento (dentro de #aplus-module-root) donde se monta el modal. */
export function createProjectModal(host) {
  host.innerHTML = `
    <div class="aplus-modal" data-aplus-modal hidden>
      <div class="aplus-modal__backdrop" data-aplus-close></div>
      <div class="aplus-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="aplus-modal-title" tabindex="-1">
        <button type="button" class="aplus-modal__close" data-aplus-close aria-label="Cerrar detalle">${icons.close}</button>
        <div class="aplus-modal__body" data-aplus-modal-body></div>
        <div class="aplus-modal__footer" data-aplus-modal-footer></div>
      </div>
    </div>
  `;

  const overlay = host.querySelector('[data-aplus-modal]');
  const dialog = host.querySelector('.aplus-modal__dialog');
  const bodyEl = host.querySelector('[data-aplus-modal-body]');
  const footerEl = host.querySelector('[data-aplus-modal-footer]');

  let opener = null;
  let closeTimer = null;
  let isOpen = false; // false también durante la animación de salida
  let previousOverflow = '';
  let previousPaddingRight = '';

  /* Contenido -------------------------------------------------------------- */

  function renderContent(project) {
    const specs = [
      { label: 'Categoría', value: project.category },
      { label: 'Prioridad', value: project.priority },
      { label: 'Nivel de riesgo', value: project.risk },
      { label: 'Región', value: project.region },
      { label: 'Fecha de inicio', value: formatDate(project.startDate) },
      { label: 'Fecha objetivo', value: formatDate(project.targetDate) },
      ...project.specs,
    ];

    bodyEl.innerHTML = `
      <header class="aplus-detail__header${project.isAPlus ? ' aplus-detail__header--aplus' : ''}">
        <div class="aplus-detail__meta">
          <span class="aplus-card__code">${escapeHtml(project.id)}</span>
          ${categoryBadgeHtml(project.category)}
          ${project.isAPlus ? aplusBadgeHtml() : ''}
          ${statusPillHtml(project.status)}
        </div>
        <h2 class="aplus-detail__title" id="aplus-modal-title">${escapeHtml(project.name)}</h2>
        <p class="aplus-detail__lead">${escapeHtml(project.summary)}</p>
      </header>

      <section class="aplus-detail__section" aria-labelledby="aplus-detail-roi">
        <h3 class="aplus-detail__heading" id="aplus-detail-roi">Retorno e impacto</h3>
        <dl class="aplus-detail__kpis">
          <div class="aplus-detail__kpi aplus-detail__kpi--roi">
            <dt>ROI proyectado (${Math.round(project.roiHorizonMonths / 12)} años)</dt>
            <dd>${formatPercent(project.roi)}</dd>
          </div>
          <div class="aplus-detail__kpi"><dt>Inversión inicial</dt><dd>${formatCurrency(project.investment)}</dd></div>
          <div class="aplus-detail__kpi"><dt>Retorno neto esperado</dt><dd>${formatCurrency(project.projectedReturn)}</dd></div>
          <div class="aplus-detail__kpi"><dt>Recuperación (payback)</dt><dd>${project.paybackMonths} meses</dd></div>
        </dl>
        <div class="aplus-detail__impact">${impactMeterHtml(project.impactScore)}</div>
        <ul class="aplus-detail__breakdown">
          ${project.roiBreakdown
            .map((row) => `<li><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></li>`)
            .join('')}
        </ul>
      </section>

      <section class="aplus-detail__section" aria-labelledby="aplus-detail-desc">
        <h3 class="aplus-detail__heading" id="aplus-detail-desc">Descripción</h3>
        ${project.description.map((p) => `<p class="aplus-detail__text">${escapeHtml(p)}</p>`).join('')}
        <ul class="aplus-detail__highlights">
          ${project.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
        </ul>
      </section>

      <section class="aplus-detail__section" aria-labelledby="aplus-detail-specs">
        <h3 class="aplus-detail__heading" id="aplus-detail-specs">Ficha técnica</h3>
        <dl class="aplus-detail__specs">
          ${specs.map((s) => `<div><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd></div>`).join('')}
        </dl>
      </section>
    `;

    const subject = encodeURIComponent(`Consulta sobre ${project.id} – ${project.name}`);
    footerEl.innerHTML = `
      <div class="aplus-detail__owner">
        <span class="aplus-detail__owner-label">Responsable</span>
        <strong>${escapeHtml(project.owner.name)}</strong>
        <span>${escapeHtml(project.owner.role)}</span>
      </div>
      <div class="aplus-detail__actions">
        <button type="button" class="aplus-btn aplus-btn--ghost" data-aplus-close>Cerrar</button>
        <a class="aplus-btn aplus-btn--primary" href="mailto:${escapeHtml(project.owner.email)}?subject=${subject}">
          ${icons.mail}<span>Contactar al responsable</span>
        </a>
      </div>
    `;

    applyMeters(bodyEl);
    bodyEl.scrollTop = 0;
  }

  /* Accesibilidad: foco, scroll y teclado ---------------------------------- */

  function lockScroll() {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`; // evita el salto de layout
  }

  function unlockScroll() {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Trampa de foco: el Tab cicla dentro del diálogo
    const focusables = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* API pública ------------------------------------------------------------ */

  function open(project, trigger = null) {
    clearTimeout(closeTimer); // si se reabre durante la animación de cierre, se cancela el cierre
    const wasHidden = overlay.hidden;
    opener = trigger ?? opener;

    renderContent(project);
    overlay.hidden = false;
    if (wasHidden) lockScroll(); // durante la animación de cierre el scroll sigue bloqueado
    if (!isOpen) document.addEventListener('keydown', onKeydown);
    isOpen = true;
    // Forzamos reflow para que la transición de entrada se dispare
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    dialog.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    }, CLOSE_ANIMATION_MS);
  }

  // Cierre por backdrop, botón X o cualquier [data-aplus-close]
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-aplus-close]')) close();
  });

  return { open, close, isOpen: () => isOpen };
}
