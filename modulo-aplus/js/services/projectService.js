/**
 * projectService.js
 * -----------------------------------------------------------------------------
 * Capa de datos desacoplada (Service Pattern).
 *
 * La UI SOLO habla con las funciones exportadas aquí. Para pasar del mock a una
 * API REST real basta con (menos de 2 minutos):
 *
 *   import { configureProjectService } from './services/projectService.js';
 *   configureProjectService({ useMock: false, apiBaseUrl: 'https://api.miempresa.com/v1' });
 *
 * Endpoints esperados cuando `useMock` es false:
 *   GET {apiBaseUrl}/projects?search=&onlyAPlus=&category=&status=&sort=&page=&pageSize=
 *       -> { items: Project[], total, page, pageSize, totalPages }
 *   GET {apiBaseUrl}/projects/:id        -> Project
 *   GET {apiBaseUrl}/projects/filters    -> { categories: string[], statuses: string[] }
 *   GET {apiBaseUrl}/projects/summary    -> { total, aplusActive, avgRoiAPlus, aplusCapital }
 *
 * El contrato de `Project` está documentado en js/data/mockProjects.js.
 */

import { MOCK_PROJECTS } from '../data/mockProjects.js';
import { normalizeText } from '../utils/helpers.js';

/* ------------------------------------------------------------------ Config */

const CONFIG = {
  useMock: true,
  apiBaseUrl: '/api',
  mockLatencyMs: 450, // simula red para poder ver el Skeleton Loader
  requestInit: { headers: { Accept: 'application/json' } }, // credenciales, tokens, etc.
};

/** Sobrescribe la configuración del servicio (p. ej. al integrarlo en la web principal). */
export function configureProjectService(overrides = {}) {
  Object.assign(CONFIG, overrides);
}

/* --------------------------------------------------------------- Constantes */

/** Opciones de ordenamiento: `value` es el contrato con la API (?sort=impact). */
export const SORT_OPTIONS = [
  { value: 'impact', label: 'Mayor impacto' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'alpha', label: 'Alfabético (A-Z)' },
];

export const DEFAULT_FILTERS = { search: '', onlyAPlus: false, category: '', status: '' };
export const DEFAULT_PAGINATION = { page: 1, pageSize: 6 };

/** Estados que se consideran "activos" para las métricas del encabezado. */
const ACTIVE_STATUSES = ['En evaluación', 'Aprobado', 'En ejecución'];

/* ------------------------------------------------------------ Lógica (mock) */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (data) => structuredClone(data);

function applyFilters(projects, { search, onlyAPlus, category, status }) {
  const query = normalizeText(search);
  return projects.filter((project) => {
    if (onlyAPlus && !project.isAPlus) return false;
    if (category && project.category !== category) return false;
    if (status && project.status !== status) return false;
    if (query) {
      // Búsqueda en Nombre, Código/ID y Resumen Ejecutivo
      const haystack = normalizeText(`${project.name} ${project.id} ${project.summary}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

const COMPARATORS = {
  impact: (a, b) => b.impactScore - a.impactScore || b.roi - a.roi,
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  alpha: (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
};

function applySort(projects, sort) {
  return [...projects].sort(COMPARATORS[sort] ?? COMPARATORS.impact);
}

function paginate(projects, { page, pageSize }) {
  const total = projects.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: projects.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages };
}

/* -------------------------------------------------------------- Lógica REST */

async function request(path, params = {}) {
  const url = new URL(`${CONFIG.apiBaseUrl}${path}`, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== false && value != null) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, CONFIG.requestInit);
  if (!response.ok) throw new Error(`Error ${response.status} al consultar ${url.pathname}`);
  return response.json();
}

/* ------------------------------------------------------------- API pública */

/**
 * Lista proyectos con filtros, orden y paginación.
 * @param {{search?: string, onlyAPlus?: boolean, category?: string, status?: string}} filters
 * @param {'impact'|'recent'|'alpha'} sort
 * @param {{page?: number, pageSize?: number}} pagination
 * @returns {Promise<{items: object[], total: number, page: number, pageSize: number, totalPages: number}>}
 */
export async function getProjects(filters = {}, sort = 'impact', pagination = {}) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const p = { ...DEFAULT_PAGINATION, ...pagination };

  if (!CONFIG.useMock) {
    return request('/projects', { ...f, sort, page: p.page, pageSize: p.pageSize });
  }

  await wait(CONFIG.mockLatencyMs);
  const result = paginate(applySort(applyFilters(MOCK_PROJECTS, f), sort), p);
  return clone(result);
}

/** Obtiene un proyecto por ID (útil para cargar el detalle bajo demanda). */
export async function getProjectById(id) {
  if (!CONFIG.useMock) return request(`/projects/${encodeURIComponent(id)}`);

  await wait(CONFIG.mockLatencyMs / 3);
  const project = MOCK_PROJECTS.find((item) => item.id === id);
  if (!project) throw new Error(`Proyecto ${id} no encontrado`);
  return clone(project);
}

/** Valores disponibles para los selectores de Categoría y Estado. */
export async function getFilterOptions() {
  if (!CONFIG.useMock) return request('/projects/filters');

  const unique = (key) => [...new Set(MOCK_PROJECTS.map((project) => project[key]))].sort((a, b) => a.localeCompare(b, 'es'));
  return { categories: unique('category'), statuses: unique('status') };
}

/** Métricas del encabezado del módulo. */
export async function getSummary() {
  if (!CONFIG.useMock) return request('/projects/summary');

  await wait(CONFIG.mockLatencyMs / 2);
  const aplusActive = MOCK_PROJECTS.filter((project) => project.isAPlus && ACTIVE_STATUSES.includes(project.status));
  const avgRoiAPlus = aplusActive.length
    ? aplusActive.reduce((sum, project) => sum + project.roi, 0) / aplusActive.length
    : 0;
  return {
    total: MOCK_PROJECTS.length,
    aplusActive: aplusActive.length,
    avgRoiAPlus: Math.round(avgRoiAPlus),
    aplusCapital: aplusActive.reduce((sum, project) => sum + project.investment, 0),
  };
}
