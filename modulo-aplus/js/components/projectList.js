/**
 * projectList.js
 * -----------------------------------------------------------------------------
 * Listado de proyectos: contador de resultados, tarjetas, estados de carga /
 * vacío / error y paginación. No consulta datos: recibe resultados ya listos.
 */

import { createProjectCard, createProjectCardSkeleton } from './projectCard.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/helpers.js';

/** Devuelve [1, '…', 4, 5, 6, '…', 12] para paginaciones largas. */
function buildPageList(current, total) {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  return pages.reduce((out, page, i) => {
    if (i > 0 && page - pages[i - 1] > 1) out.push('…');
    out.push(page);
    return out;
  }, []);
}

/**
 * @param {HTMLElement} container
 * @param {{onOpenDetail: (project: object, trigger: HTMLElement) => void,
 *          onPageChange: (page: number) => void,
 *          onClearFilters: () => void,
 *          onRetry: () => void}} handlers
 */
export function createProjectList(container, { onOpenDetail, onPageChange, onClearFilters, onRetry }) {
  container.innerHTML = `
    <section class="aplus-results" aria-label="Listado de proyectos e iniciativas">
      <p class="aplus-results__count" role="status" aria-live="polite" data-aplus-count></p>
      <div class="aplus-results__body" data-aplus-body data-view="grid"></div>
      <nav class="aplus-pagination" aria-label="Paginación de resultados" data-aplus-pagination hidden></nav>
    </section>
  `;

  const countEl = container.querySelector('[data-aplus-count]');
  const bodyEl = container.querySelector('[data-aplus-body]');
  const paginationEl = container.querySelector('[data-aplus-pagination]');

  let currentItems = [];

  /* Utilidades de render --------------------------------------------------- */

  function setBody(node) {
    bodyEl.replaceChildren(node);
  }

  function buildGrid(children) {
    const ul = document.createElement('ul');
    ul.className = 'aplus-grid';
    children.forEach((child) => {
      const li = document.createElement('li');
      li.className = 'aplus-grid__item';
      li.appendChild(child);
      ul.appendChild(li);
    });
    return ul;
  }

  function messageState({ icon, title, text, actionLabel, actionAttr }) {
    const div = document.createElement('div');
    div.className = 'aplus-state';
    div.innerHTML = `
      <span class="aplus-state__icon">${icon}</span>
      <h3 class="aplus-state__title">${escapeHtml(title)}</h3>
      <p class="aplus-state__text">${escapeHtml(text)}</p>
      <button type="button" class="aplus-btn aplus-btn--primary" ${actionAttr}>${escapeHtml(actionLabel)}</button>
    `;
    return div;
  }

  function renderPagination({ page, totalPages }) {
    if (totalPages <= 1) {
      paginationEl.hidden = true;
      paginationEl.innerHTML = '';
      return;
    }
    const pages = buildPageList(page, totalPages)
      .map((p) =>
        p === '…'
          ? '<span class="aplus-pagination__gap" aria-hidden="true">…</span>'
          : `<button type="button" class="aplus-pagination__btn" data-aplus-page="${p}" ${p === page ? 'aria-current="page"' : ''} aria-label="Página ${p}">${p}</button>`
      )
      .join('');

    paginationEl.hidden = false;
    paginationEl.innerHTML = `
      <button type="button" class="aplus-pagination__btn aplus-pagination__btn--nav" data-aplus-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Página anterior">${icons.chevronLeft}</button>
      ${pages}
      <button type="button" class="aplus-pagination__btn aplus-pagination__btn--nav" data-aplus-page="${page + 1}" ${page === totalPages ? 'disabled' : ''} aria-label="Página siguiente">${icons.chevronRight}</button>
    `;
  }

  /* API pública ------------------------------------------------------------ */

  /** Skeleton Loader mientras llegan los datos. */
  function showLoading(count = 6) {
    bodyEl.setAttribute('aria-busy', 'true');
    countEl.textContent = 'Cargando proyectos…';
    paginationEl.hidden = true;
    setBody(buildGrid(Array.from({ length: count }, createProjectCardSkeleton)));
  }

  function showResults({ items, total, page, pageSize, totalPages }) {
    bodyEl.setAttribute('aria-busy', 'false');
    currentItems = items;

    if (items.length === 0) {
      countEl.textContent = 'Sin resultados';
      paginationEl.hidden = true;
      setBody(messageState({
        icon: icons.inbox,
        title: 'No encontramos proyectos o iniciativas',
        text: 'Ningún proyecto coincide con tu búsqueda o filtros. Prueba con otros términos o limpia los filtros.',
        actionLabel: 'Limpiar filtros',
        actionAttr: 'data-aplus-empty-clear',
      }));
      return;
    }

    const from = (page - 1) * pageSize + 1;
    const to = from + items.length - 1;
    countEl.textContent = `Mostrando ${from}–${to} de ${total} ${total === 1 ? 'proyecto' : 'proyectos'}`;
    setBody(buildGrid(items.map(createProjectCard)));
    renderPagination({ page, totalPages });
  }

  function showError(message = 'No pudimos cargar los proyectos.') {
    bodyEl.setAttribute('aria-busy', 'false');
    countEl.textContent = 'Error al cargar';
    paginationEl.hidden = true;
    setBody(messageState({
      icon: icons.alert,
      title: 'Algo salió mal',
      text: `${message} Revisa tu conexión e inténtalo de nuevo.`,
      actionLabel: 'Reintentar',
      actionAttr: 'data-aplus-retry',
    }));
  }

  /** Cambia entre Cuadrícula (grid) y Lista (list) sin volver a consultar datos. */
  function setView(view) {
    bodyEl.dataset.view = view === 'list' ? 'list' : 'grid';
  }

  /* Delegación de eventos -------------------------------------------------- */

  container.addEventListener('click', (event) => {
    const openBtn = event.target.closest('[data-aplus-open]');
    if (openBtn) {
      const project = currentItems.find((item) => item.id === openBtn.dataset.aplusOpen);
      if (project) onOpenDetail(project, openBtn);
      return;
    }
    const pageBtn = event.target.closest('[data-aplus-page]');
    if (pageBtn && !pageBtn.disabled) {
      onPageChange(Number(pageBtn.dataset.aplusPage));
      return;
    }
    if (event.target.closest('[data-aplus-empty-clear]')) onClearFilters();
    if (event.target.closest('[data-aplus-retry]')) onRetry();
  });

  return { showLoading, showResults, showError, setView };
}
