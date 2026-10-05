/**
 * filterBar.js
 * -----------------------------------------------------------------------------
 * Barra de búsqueda y filtros. No conoce el servicio de datos: recibe las
 * opciones ya cargadas y notifica cada cambio mediante `onChange(state)`.
 *
 * Estado emitido:
 *   { search, onlyAPlus, category, status, sort, view }
 */

import { escapeHtml, debounce } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

const SEARCH_DEBOUNCE_MS = 300;

const optionsHtml = (values, placeholder) =>
  [`<option value="">${placeholder}</option>`, ...values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)].join('');

/**
 * @param {HTMLElement} container
 * @param {{categories: string[], statuses: string[], sortOptions: {value:string,label:string}[],
 *          initialState?: object, onChange: (state: object) => void}} config
 */
export function createFilterBar(container, { categories, statuses, sortOptions, initialState = {}, onChange }) {
  const state = {
    search: '',
    onlyAPlus: false,
    category: '',
    status: '',
    sort: sortOptions[0].value,
    view: 'grid',
    ...initialState,
  };

  container.innerHTML = `
    <form class="aplus-filters" role="search" aria-label="Buscar y filtrar proyectos" novalidate>
      <div class="aplus-filters__row aplus-filters__row--primary">
        <div class="aplus-search">
          <span class="aplus-search__icon">${icons.search}</span>
          <label class="aplus-sr-only" for="aplus-search-input">Buscar por nombre, código o resumen</label>
          <input id="aplus-search-input" class="aplus-search__input" type="search" autocomplete="off"
                 placeholder="Buscar por nombre, código o resumen de la iniciativa…" />
        </div>

        <button type="button" class="aplus-switch" role="switch" aria-checked="false" data-aplus-aplus-toggle>
          <span class="aplus-switch__track" aria-hidden="true"><span class="aplus-switch__thumb"></span></span>
          <span class="aplus-switch__label">Solo Iniciativas A+</span>
        </button>
      </div>

      <div class="aplus-filters__row aplus-filters__row--secondary">
        <div class="aplus-field">
          <label class="aplus-field__label" for="aplus-filter-category">Categoría</label>
          <select id="aplus-filter-category" class="aplus-select" data-aplus-category>
            ${optionsHtml(categories, 'Todas las categorías')}
          </select>
        </div>

        <div class="aplus-field">
          <label class="aplus-field__label" for="aplus-filter-status">Estado</label>
          <select id="aplus-filter-status" class="aplus-select" data-aplus-status>
            ${optionsHtml(statuses, 'Todos los estados')}
          </select>
        </div>

        <div class="aplus-field">
          <label class="aplus-field__label" for="aplus-filter-sort">Ordenar por</label>
          <select id="aplus-filter-sort" class="aplus-select" data-aplus-sort>
            ${sortOptions.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}
          </select>
        </div>

        <div class="aplus-filters__actions">
          <div class="aplus-view-toggle" role="group" aria-label="Tipo de vista">
            <button type="button" class="aplus-view-toggle__btn" data-aplus-view="grid" aria-pressed="true" aria-label="Vista de cuadrícula" title="Cuadrícula">${icons.grid}</button>
            <button type="button" class="aplus-view-toggle__btn" data-aplus-view="list" aria-pressed="false" aria-label="Vista de lista" title="Lista">${icons.list}</button>
          </div>
          <button type="button" class="aplus-btn aplus-btn--ghost" data-aplus-clear>${icons.reset}<span>Limpiar filtros</span></button>
        </div>
      </div>
    </form>
  `;

  const $ = (selector) => container.querySelector(selector);
  const form = $('.aplus-filters');
  const searchInput = $('#aplus-search-input');
  const aplusToggle = $('[data-aplus-aplus-toggle]');
  const categorySelect = $('[data-aplus-category]');
  const statusSelect = $('[data-aplus-status]');
  const sortSelect = $('[data-aplus-sort]');
  const viewButtons = container.querySelectorAll('[data-aplus-view]');
  const clearButton = $('[data-aplus-clear]');

  const hasActiveFilters = () => Boolean(searchInput.value.trim() || state.onlyAPlus || state.category || state.status);
  const emit = () => onChange({ ...state });

  /** Refleja el estado interno en los controles. */
  function syncUi() {
    categorySelect.value = state.category;
    statusSelect.value = state.status;
    sortSelect.value = state.sort;
    aplusToggle.setAttribute('aria-checked', String(state.onlyAPlus));
    viewButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.aplusView === state.view)));
    clearButton.disabled = !hasActiveFilters();
  }

  const commitSearch = debounce((value) => {
    state.search = value;
    emit();
  }, SEARCH_DEBOUNCE_MS);

  /* Eventos ---------------------------------------------------------------- */

  // La búsqueda se aplica en tiempo real con debounce; Enter la aplica al instante.
  searchInput.addEventListener('input', () => {
    clearButton.disabled = !hasActiveFilters();
    commitSearch(searchInput.value);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    commitSearch.cancel();
    if (state.search !== searchInput.value) {
      state.search = searchInput.value;
      emit();
    }
  });

  aplusToggle.addEventListener('click', () => {
    state.onlyAPlus = !state.onlyAPlus;
    syncUi();
    emit();
  });

  categorySelect.addEventListener('change', () => { state.category = categorySelect.value; syncUi(); emit(); });
  statusSelect.addEventListener('change', () => { state.status = statusSelect.value; syncUi(); emit(); });
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; emit(); });

  viewButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (state.view === btn.dataset.aplusView) return;
      state.view = btn.dataset.aplusView;
      syncUi();
      emit();
    })
  );

  /** Limpia búsqueda, A+, categoría y estado (conserva orden y vista). */
  function clearFilters({ focus = true } = {}) {
    commitSearch.cancel();
    Object.assign(state, { search: '', onlyAPlus: false, category: '', status: '' });
    searchInput.value = '';
    syncUi();
    emit();
    if (focus) searchInput.focus(); // el botón queda deshabilitado: devolvemos el foco a un control útil
  }
  clearButton.addEventListener('click', () => clearFilters());

  searchInput.value = state.search;
  syncUi();

  return {
    getState: () => ({ ...state }),
    clearFilters,
  };
}
