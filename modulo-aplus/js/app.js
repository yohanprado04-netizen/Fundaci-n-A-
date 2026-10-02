/**
 * app.js
 * -----------------------------------------------------------------------------
 * Punto de entrada del módulo "Proyectos y Oportunidades A+".
 * Orquesta servicio + componentes. Se auto-inicializa si existe
 * #aplus-module-root en la página; también puede montarse manualmente:
 *
 *   import { initAPlusModule } from './js/app.js';
 *   initAPlusModule(document.querySelector('#aplus-module-root'), { pageSize: 9 });
 *
 * Evento para la web anfitriona (burbujea desde el root):
 *   'aplus:project-open'  -> detail: { project }
 */

import { getProjects, getFilterOptions, getSummary, SORT_OPTIONS, DEFAULT_PAGINATION } from './services/projectService.js';
import { createSummaryMetrics } from './components/summaryMetrics.js';
import { createFilterBar } from './components/filterBar.js';
import { createProjectList } from './components/projectList.js';
import { createProjectModal } from './components/projectModal.js';

export async function initAPlusModule(root = document.getElementById('aplus-module-root'), options = {}) {
  if (!root || root.dataset.aplusMounted === 'true') return null;
  root.dataset.aplusMounted = 'true';

  const pageSize = options.pageSize ?? DEFAULT_PAGINATION.pageSize;
  const hook = (name) => root.querySelector(`[data-aplus-${name}]`);

  /* Componentes ------------------------------------------------------------ */

  const metrics = createSummaryMetrics(hook('metrics'));
  const modal = createProjectModal(hook('modal-host'));

  let filterBar = null;
  let page = 1;
  let lastQueryKey = '';
  let latestRequest = 0; // descarta respuestas obsoletas si el usuario cambia filtros rápido

  const list = createProjectList(hook('list'), {
    onOpenDetail(project, trigger) {
      modal.open(project, trigger);
      root.dispatchEvent(new CustomEvent('aplus:project-open', { detail: { project }, bubbles: true }));
    },
    onPageChange(nextPage) {
      page = nextPage;
      loadProjects();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      hook('list').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    },
    onClearFilters: () => filterBar?.clearFilters(),
    onRetry: () => loadProjects(),
  });

  /* Carga de datos --------------------------------------------------------- */

  async function loadProjects() {
    const requestId = ++latestRequest;
    const { view, sort, ...filters } = filterBar.getState();

    list.setView(view);
    list.showLoading(pageSize);

    try {
      const result = await getProjects(filters, sort, { page, pageSize });
      if (requestId !== latestRequest) return;
      page = result.page;
      list.showResults(result);
    } catch (error) {
      if (requestId !== latestRequest) return;
      console.error('[A+ Module]', error);
      list.showError();
    }
  }

  /** Reacciona a los cambios de la barra de filtros. */
  function handleFilterChange(state) {
    const { view, sort, ...filters } = state;
    list.setView(view); // cambiar la vista no requiere nueva consulta

    const queryKey = JSON.stringify({ filters, sort });
    if (queryKey === lastQueryKey) return;
    lastQueryKey = queryKey;
    page = 1;
    loadProjects();
  }

  /* Arranque --------------------------------------------------------------- */

  metrics.showLoading();
  list.showLoading(pageSize);

  let filterOptions = { categories: [], statuses: [] };
  try {
    const [loadedOptions, summary] = await Promise.all([getFilterOptions(), getSummary()]);
    filterOptions = loadedOptions;
    metrics.render(summary);
  } catch (error) {
    console.error('[A+ Module]', error);
    metrics.showError();
  }

  filterBar = createFilterBar(hook('filters'), {
    categories: filterOptions.categories,
    statuses: filterOptions.statuses,
    sortOptions: SORT_OPTIONS,
    onChange: handleFilterChange,
  });

  const { view, sort, ...filters } = filterBar.getState();
  lastQueryKey = JSON.stringify({ filters, sort });
  await loadProjects();

  return { reload: loadProjects, openProject: modal.open, closeModal: modal.close };
}

/* Auto-inicialización cuando el DOM está listo */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAPlusModule());
} else {
  initAPlusModule();
}
