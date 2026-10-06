/**
 * proyectos.js — Portafolio de Inversión y Proyectos de Estudiantes
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Portafolio de Inversión A+ (Iniciativas estratégicas institucionales, KPIs de impacto, presupuesto COP)
 * 2. Portafolio de Desarrollo y Empleabilidad de Estudiantes (Talento Tech A+, filtros por cohorte/categoría)
 * 3. Portal del Estudiante: Mis Proyectos (Publicación, edición, repositorio GitHub, demo en vivo, imágenes)
 * 4. Modales Batman Lightbox de detalle técnico y de impacto
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : (typeof currentAdminRole !== 'undefined' ? currentAdminRole : 'superadmin'));
  const getAdminUser = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : (typeof currentAdminUser !== 'undefined' ? currentAdminUser : null));
  const getEstudianteActual = () => {
    let est = (typeof window !== 'undefined' && typeof window.getCurrentEstudiante === 'function') ? window.getCurrentEstudiante() : (typeof currentEstudiante !== 'undefined' ? currentEstudiante : null);
    if (!est && typeof localStorage !== 'undefined') {
      try {
        est = JSON.parse(localStorage.getItem('fundacion_current_estudiante') || 'null');
      } catch (e) {}
    }
    return est;
  };
  const cohortesPermitidasParaUsuario = (usuario) => {
    if (typeof window !== 'undefined' && typeof window.cohortesPermitidasParaUsuario === 'function' && window.cohortesPermitidasParaUsuario !== cohortesPermitidasParaUsuario) {
      return window.cohortesPermitidasParaUsuario(usuario || getAdminUser());
    }
    const u = usuario || getAdminUser();
    if (!u) return null;
    const r = (u.rol || getAdminRole() || '').toLowerCase();
    if (r !== 'aliado' && r !== 'donante' && getAdminRole() !== 'aliado' && getAdminRole() !== 'donante') return null;
    let permitidas = u.cohortesPermitidas || u.cohortes_permitidas;
    if (typeof permitidas === 'string') {
      try { permitidas = JSON.parse(permitidas); } catch (e) { permitidas = [permitidas]; }
    }
    return Array.isArray(permitidas) && permitidas.length > 0 && !permitidas.includes('todas') ? permitidas : null;
  };
  const fetchApi = async (endpoint, opts) => {
    if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') return await window.apiFetch(endpoint, opts);
    throw new Error('apiFetch no disponible');
  };
  const Store = {
    get: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[proyectos] window.Store no disponible'); return s.get(col, opts); },
    list: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[proyectos] window.Store no disponible'); return s.list(col, opts); },
    save: (col, item) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[proyectos] window.Store no disponible'); return s.save(col, item); },
    invalidate: (col) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) return; return s.invalidate(col); }
  };
  const apiFetch = fetchApi;

  // =========================================================================
  // MÓDULO: PROYECTOS FUNDACIÓN A+ & PROYECTOS DE ESTUDIANTES (PORTAFOLIO INVERSORES)
  // =========================================================================

  let proyectosFundacionState = {
    busqueda: '',
    categoria: '',
    estado: '',
    soloAplus: false,
    vista: 'grid',
    orden: 'impacto'
  };

  let proyectosEstudiantesState = {
    busqueda: '',
    cohorte: '',
    categoria: ''
  };

  function puedeGestionarProyectosFundacion() {
    const currentAdminRole = getAdminRole();
    const currentAdminUser = getAdminUser();
    return currentAdminRole === 'superadmin' || currentAdminRole === 'administracion' || (currentAdminUser && (currentAdminUser.rol === 'Superadmin' || currentAdminUser.rol === 'Coordinador' || currentAdminUser.rol === 'Administrador'));
  }

  function formatCOP(num) {
    const n = Number(num || 0);
    return '$ ' + n.toLocaleString('es-CO') + ' COP';
  }

  // ---------- PROYECTOS FUNDACIÓN (PORTAFOLIO INVERSORES) ----------
  async function renderPanelProyectosFundacion() {
    const mount = document.getElementById('mount-proyectos-fundacion');
    if (!mount) return;

    let proyectos = await Store.list('proyectos_fundacion');
    if (!proyectos || proyectos.length === 0) {
      proyectos = [];
    }

    const esAdmin = puedeGestionarProyectosFundacion();
    if (!esAdmin) {
      proyectos = proyectos.filter(p => p.visibleInversores !== false && p.visible_inversores !== 0 && p.visible_inversores !== '0');
    }
    window.__cacheProyectosFundacion = proyectos;

    const total = proyectos.length;
    const aplusCount = proyectos.filter(p => p.isAPlus || p.es_aplus || p.esAplus).length;
    const aplusProjects = proyectos.filter(p => p.isAPlus || p.es_aplus || p.esAplus);
    const avgRoi = aplusProjects.length
      ? Math.round(aplusProjects.reduce((acc, p) => acc + Number(p.roi || p.sroi || 0), 0) / aplusProjects.length)
      : 0;
    const capitalTotal = proyectos.reduce((acc, p) => acc + Number(p.investment || p.inversion || 0), 0);
    const categoriasUnicas = Array.from(new Set(proyectos.map(p => p.category || p.categoria).filter(Boolean))).sort();

    mount.innerHTML = `
      <div id="aplus-module-root" class="w-full">
        <section class="aplus-module" aria-labelledby="aplus-title">
          <header class="aplus-header">
            <div class="flex items-center justify-between flex-wrap gap-4 mb-3">
              <div>
                <p class="aplus-header__eyebrow">Fundación A+ · Portafolio Social &amp; Territorial</p>
                <h1 class="aplus-header__title" id="aplus-title">Proyectos e Iniciativas A+</h1>
                <p class="aplus-header__subtitle">
                  Explora las iniciativas de alto impacto territorial y los programas estratégicos <strong>A+</strong>: modelos de formación multiplicadora 10:1, conectividad e infraestructura con Retorno Social de la Inversión (SROI) certificado.
                </p>
              </div>
              ${esAdmin ? `
                <button type="button" onclick="abrirFormNuevoProyectoFundacion()" class="aplus-btn aplus-btn--primary cursor-pointer shrink-0" style="padding: 0.75rem 1.4rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 700; border: none !important; color: #FFFFFF !important; background: linear-gradient(90deg, #8B5CF6 0%, #1FC8C0 100%) !important; box-shadow: 0 4px 16px rgba(139,92,246,0.35); display: inline-flex; align-items: center; gap: 0.5rem;">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                  <span>Registrar Proyecto A+</span>
                </button>
              ` : ''}
            </div>

            <!-- Métricas KPI Portafolio -->
            <ul class="aplus-metrics" aria-label="Resumen del portafolio">
              <li class="aplus-metric">
                <span class="aplus-metric__icon">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </span>
                <div class="aplus-metric__text">
                  <span class="aplus-metric__label">Iniciativas en Cartera</span>
                  <strong class="aplus-metric__value">${total}</strong>
                </div>
              </li>
              <li class="aplus-metric aplus-metric--aplus">
                <span class="aplus-metric__icon">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                </span>
                <div class="aplus-metric__text">
                  <span class="aplus-metric__label">Iniciativas A+ Activas</span>
                  <strong class="aplus-metric__value">${aplusCount}</strong>
                </div>
              </li>
              <li class="aplus-metric">
                <span class="aplus-metric__icon">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </span>
                <div class="aplus-metric__text">
                  <span class="aplus-metric__label">SROI Promedio A+</span>
                  <strong class="aplus-metric__value">${avgRoi ? `+${avgRoi}%` : '0%'}</strong>
                </div>
              </li>
              <li class="aplus-metric">
                <span class="aplus-metric__icon">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                <div class="aplus-metric__text">
                  <span class="aplus-metric__label">Presupuesto Requerido</span>
                  <strong class="aplus-metric__value">${capitalTotal ? formatCOP(capitalTotal).replace(' COP', '') : '$ 0'}</strong>
                </div>
              </li>
            </ul>
          </header>

          <!-- Barra de Filtros y Búsqueda -->
          <div class="aplus-filters" role="search" aria-label="Filtros de proyectos">
            <div class="aplus-filters__row aplus-filters__row--primary">
              <div class="aplus-search">
                <span class="aplus-search__icon">
                  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </span>
                <input
                  type="search"
                  id="pf_input_buscar"
                  class="aplus-search__input"
                  placeholder="Buscar iniciativas por nombre, código o resumen..."
                  value="${escapeHtml(proyectosFundacionState.busqueda)}"
                  oninput="onInputBusquedaProyectosFundacion(this.value)"
                />
                <button type="button" class="aplus-search__clear" id="pf_btn_clear_search" aria-label="Limpiar búsqueda" onclick="limpiarBusquedaProyectosFundacion()" style="display: ${proyectosFundacionState.busqueda ? 'flex' : 'none'};">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <button type="button" class="aplus-switch cursor-pointer" role="switch" aria-checked="${proyectosFundacionState.soloAplus ? 'true' : 'false'}" onclick="onToggleAplusProyectosFundacion(!proyectosFundacionState.soloAplus)">
                <span class="aplus-switch__track" aria-hidden="true"><span class="aplus-switch__thumb"></span></span>
                <span class="aplus-switch__label">Solo Iniciativas A+</span>
              </button>
            </div>

            <div class="aplus-filters__row aplus-filters__row--secondary">
              <div class="aplus-field">
                <label class="aplus-field__label" for="pf_select_cat">Categoría</label>
                <select id="pf_select_cat" class="aplus-select" onchange="onCambioFiltroCatProyectosFundacion(this.value)">
                  <option value="">Todas las categorías</option>
                  ${categoriasUnicas.map(c => `<option value="${escapeHtml(c)}" ${proyectosFundacionState.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>

              <div class="aplus-field">
                <label class="aplus-field__label" for="pf_select_est">Estado</label>
                <select id="pf_select_est" class="aplus-select" onchange="onCambioFiltroEstadoProyectosFundacion(this.value)">
                  <option value="">Todos los estados</option>
                  <option value="En ejecución" ${proyectosFundacionState.estado === 'En ejecución' ? 'selected' : ''}>En ejecución</option>
                  <option value="En evaluación" ${proyectosFundacionState.estado === 'En evaluación' ? 'selected' : ''}>En evaluación</option>
                  <option value="Completado" ${proyectosFundacionState.estado === 'Completado' ? 'selected' : ''}>Completado</option>
                </select>
              </div>

              <div class="aplus-field">
                <label class="aplus-field__label" for="pf_select_orden">Ordenar por</label>
                <select id="pf_select_orden" class="aplus-select" onchange="onCambioOrdenProyectosFundacion(this.value)">
                  <option value="impacto" ${proyectosFundacionState.orden === 'impacto' ? 'selected' : ''}>Mayor Impacto Social</option>
                  <option value="sroi" ${proyectosFundacionState.orden === 'sroi' ? 'selected' : ''}>Mayor Retorno (SROI)</option>
                  <option value="inversion" ${proyectosFundacionState.orden === 'inversion' ? 'selected' : ''}>Mayor Presupuesto</option>
                  <option value="alfa" ${proyectosFundacionState.orden === 'alfa' ? 'selected' : ''}>Alfabético (A-Z)</option>
                </select>
              </div>

              <div class="aplus-filters__actions">
                <div class="aplus-view-toggle" role="group" aria-label="Tipo de vista">
                  <button type="button" data-view="grid" class="aplus-view-toggle__btn ${proyectosFundacionState.vista === 'grid' ? 'is-active' : ''}" onclick="cambiarVistaProyectosFundacion('grid')" aria-pressed="${proyectosFundacionState.vista === 'grid' ? 'true' : 'false'}" title="Cuadrícula">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                  </button>
                  <button type="button" data-view="list" class="aplus-view-toggle__btn ${proyectosFundacionState.vista === 'list' ? 'is-active' : ''}" onclick="cambiarVistaProyectosFundacion('list')" aria-pressed="${proyectosFundacionState.vista === 'list' ? 'true' : 'false'}" title="Lista">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
                  </button>
                </div>
                <button type="button" class="aplus-btn aplus-btn--ghost cursor-pointer" onclick="limpiarTodosFiltrosProyectosFundacion()">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Limpiar</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Contenedor de Proyectos -->
          <div id="pf_lista_contenedor" class="mt-6">
            ${renderFilasProyectosFundacion(proyectos)}
          </div>
        </section>
      </div>
    `;
  }

  function renderFilasProyectosFundacion(proyectos) {
    const todosProyectos = proyectos || [];
    let filtrados = [...todosProyectos];

    if (proyectosFundacionState.busqueda) {
      const q = proyectosFundacionState.busqueda.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.name || p.nombre || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        (p.summary || p.resumen || p.descripcion || '').toLowerCase().includes(q)
      );
    }

    if (proyectosFundacionState.categoria) {
      filtrados = filtrados.filter(p => (p.category || p.categoria) === proyectosFundacionState.categoria);
    }

    if (proyectosFundacionState.estado) {
      filtrados = filtrados.filter(p => (p.status || p.estado) === proyectosFundacionState.estado);
    }

    if (proyectosFundacionState.soloAplus) {
      filtrados = filtrados.filter(p => p.isAPlus || p.es_aplus || p.esAplus);
    }

    if (proyectosFundacionState.orden === 'impacto') {
      filtrados.sort((a, b) => Number(b.impactScore || b.indice_impacto || 0) - Number(a.impactScore || a.indice_impacto || 0));
    } else if (proyectosFundacionState.orden === 'sroi') {
      filtrados.sort((a, b) => Number(b.sroi || b.roi || 0) - Number(a.sroi || a.roi || 0));
    } else if (proyectosFundacionState.orden === 'inversion') {
      filtrados.sort((a, b) => Number(b.inversion_cop || b.investment || b.inversion || 0) - Number(a.inversion_cop || a.investment || a.inversion || 0));
    } else if (proyectosFundacionState.orden === 'reciente') {
      filtrados.sort((a, b) => new Date(b.createdAt || b.creado_en || 0) - new Date(a.createdAt || a.creado_en || 0));
    } else if (proyectosFundacionState.orden === 'alfa') {
      filtrados.sort((a, b) => (a.name || a.nombre || '').localeCompare(b.name || b.nombre || ''));
    }

    const esAdmin = puedeGestionarProyectosFundacion();

    if (todosProyectos.length === 0) {
      return `
        <div class="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-12 text-center my-6">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <h3 class="text-base font-bold text-ink">Aún no hay proyectos institucionales registrados</h3>
          <p class="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
            ${esAdmin ? 'Comienza a construir el portafolio social y territorial de la Fundación A+ haciendo clic en el botón superior.' : 'La administración de la Fundación A+ aún no ha publicado iniciativas en este portafolio.'}
          </p>
          ${esAdmin ? `
            <button type="button" onclick="abrirFormNuevoProyectoFundacion()" class="mt-4 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer">
              Registrar Primer Proyecto A+
            </button>
          ` : ''}
        </div>
      `;
    }

    if (filtrados.length === 0) {
      return `
        <div class="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-12 text-center my-6">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-gray-50 text-slate-400 flex items-center justify-center mb-4">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <h3 class="text-base font-bold text-ink">No se encontraron iniciativas</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">No hay proyectos que coincidan con los filtros seleccionados.</p>
          <button type="button" onclick="limpiarTodosFiltrosProyectosFundacion()" class="mt-4 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition cursor-pointer">Restablecer filtros</button>
        </div>
      `;
    }

    const esGrid = proyectosFundacionState.vista === 'grid';

    return `
      <div class="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
        <span>Mostrando <strong>${filtrados.length}</strong> iniciativa${filtrados.length === 1 ? '' : 's'}</span>
      </div>
      <div class="${esGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}" data-view="${proyectosFundacionState.vista}">
        ${filtrados.map(p => {
          const id = p.id;
          const nombre = escapeHtml(p.name || p.nombre || '');
          const categoria = escapeHtml(p.category || p.categoria || 'General');
          const estado = escapeHtml(p.status || p.estado || 'En evaluación');
          const esAplus = Boolean(p.isAPlus || p.es_aplus || p.esAplus);
          const resumen = escapeHtml(p.summary || p.resumen || '');
          const inversion = Number(p.investment || p.inversion || 0);
          const sroi = Number(p.roi || p.sroi || 0);
          const retorno = Number(p.projectedReturn || p.retorno_proyectado || (inversion * (sroi / 100)));
          const horizonte = Number(p.roiHorizonMonths || p.sroi_horizonte_meses || 12);
          const impacto = Number(p.impactScore || p.indice_impacto || 80);

          let estadoClase = 'bg-blue-50 text-blue-700 border-blue-200';
          if (estado === 'En ejecución') estadoClase = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          else if (estado === 'Completado') estadoClase = 'bg-purple-50 text-purple-700 border-purple-200';

          return `
            <article class="bg-white rounded-3xl border border-gray-200/80 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden p-5 sm:p-6 group">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">${escapeHtml(id)}</span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">${categoria}</span>
                    ${esAplus ? `
                      <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">A+ Alto Impacto</span>
                    ` : ''}
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoClase}">${estado}</span>
                    ${esAdmin ? `
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.visibleInversores !== false && p.visible_inversores !== 0 && p.visible_inversores !== '0' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'}" title="${p.visibleInversores !== false && p.visible_inversores !== 0 && p.visible_inversores !== '0' ? 'Visible en portafolio de Aliados y Donantes' : 'Solo visible para Administradores'}">
                        ${p.visibleInversores !== false && p.visible_inversores !== 0 && p.visible_inversores !== '0' ? 'Visible a Donantes' : 'Solo Administración'}
                      </span>
                    ` : ''}
                  </div>
                </div>

                <h3 class="text-base font-extrabold text-ink leading-snug group-hover:text-purple-700 transition cursor-pointer" onclick="abrirDetalleProyectoFundacion('${id}')">
                  ${nombre}
                </h3>

                <p class="text-xs text-slate-600 font-medium leading-relaxed mt-2.5 line-clamp-3">
                  ${resumen}
                </p>
              </div>

              <div class="mt-5 pt-4 border-t border-gray-100">
                <!-- Indicadores de Retorno Social -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p class="text-[10px] font-bold uppercase text-slate-400">Presupuesto</p>
                    <p class="text-xs font-black text-ink mt-0.5">${formatCOP(inversion).replace(' COP', '')}</p>
                  </div>
                  <div class="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                    <p class="text-[10px] font-bold uppercase text-purple-700">SROI Estimado</p>
                    <p class="text-xs font-black text-purple-900 mt-0.5">+${sroi}% <span class="text-[10px] font-normal text-slate-400">(${horizonte}m)</span></p>
                  </div>
                </div>

                <!-- Barra de Impacto Social -->
                <div class="mb-4">
                  <div class="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span class="text-slate-500">Índice Impacto Social</span>
                    <span class="text-purple-700">${impacto} / 100</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style="width: ${impacto}%"></div>
                  </div>
                </div>

                <!-- Botones de Acción -->
                <div class="flex items-center justify-between gap-2 pt-2">
                  <button type="button" onclick="abrirDetalleProyectoFundacion('${id}')" class="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <span>Ver Ficha Completa</span>
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>

                  ${esAdmin ? `
                    <div class="flex items-center gap-1">
                      <button type="button" onclick="editarProyectoFundacion('${id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer" title="Editar proyecto">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button type="button" onclick="eliminarProyectoFundacion('${id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer" title="Eliminar proyecto">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function onInputBusquedaProyectosFundacion(val) {
    proyectosFundacionState.busqueda = val;
    const btnClear = document.getElementById('pf_btn_clear_search');
    if (btnClear) btnClear.style.display = val ? 'flex' : 'none';
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function limpiarBusquedaProyectosFundacion() {
    proyectosFundacionState.busqueda = '';
    const inp = document.getElementById('pf_input_buscar');
    if (inp) inp.value = '';
    const btnClear = document.getElementById('pf_btn_clear_search');
    if (btnClear) btnClear.style.display = 'none';
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function onCambioFiltroCatProyectosFundacion(val) {
    proyectosFundacionState.categoria = val;
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function onCambioFiltroEstadoProyectosFundacion(val) {
    proyectosFundacionState.estado = val;
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function onToggleAplusProyectosFundacion(checked) {
    proyectosFundacionState.soloAplus = checked;
    const btnSwitch = document.querySelector('.aplus-switch[role="switch"]');
    if (btnSwitch) {
      btnSwitch.setAttribute('aria-checked', checked ? 'true' : 'false');
      btnSwitch.setAttribute('onclick', `onToggleAplusProyectosFundacion(${!checked})`);
    }
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function onCambioOrdenProyectosFundacion(val) {
    proyectosFundacionState.orden = val;
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
  }

  function cambiarVistaProyectosFundacion(vista) {
    proyectosFundacionState.vista = vista;
    const cont = document.getElementById('pf_lista_contenedor');
    if (cont && window.__cacheProyectosFundacion) {
      cont.innerHTML = renderFilasProyectosFundacion(window.__cacheProyectosFundacion);
    }
    document.querySelectorAll('.aplus-view-toggle__btn').forEach(btn => {
      const match = (btn.dataset.view === vista) ||
        (vista === 'grid' && btn.title.toLowerCase().includes('cuadrícula')) ||
        (vista === 'list' && btn.title.toLowerCase().includes('lista'));
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
  }

  function limpiarTodosFiltrosProyectosFundacion() {
    proyectosFundacionState.busqueda = '';
    proyectosFundacionState.categoria = '';
    proyectosFundacionState.estado = '';
    proyectosFundacionState.soloAplus = false;
    renderPanelProyectosFundacion();
  }

  // ---------- MODAL DETALLE PROYECTO FUNDACIÓN (BATMAN LIGHTBOX) ----------
  async function abrirDetalleProyectoFundacion(id) {
    let p = null;
    if (window.__cacheProyectosFundacion && Array.isArray(window.__cacheProyectosFundacion)) {
      p = window.__cacheProyectosFundacion.find(item => item.id === id);
    }
    if (!p) {
      try {
        p = await apiFetch('proyectos_fundacion?id=' + encodeURIComponent(id));
      } catch (err) {
        toast('No se pudo cargar la información del proyecto.', 'err');
        return;
      }
    }
    if (!p) {
      toast('Proyecto no encontrado.', 'err');
      return;
    }

    const modal = document.getElementById('modalDetalleProyectoFundacion');
    if (!modal) return;

    document.getElementById('dpf_codigo').textContent = p.id || 'APL';
    document.getElementById('dpf_categoria_badge').textContent = p.category || p.categoria || 'General';
    document.getElementById('dpf_nombre').textContent = p.name || p.nombre || 'Iniciativa A+';

    const esAplus = Boolean(p.isAPlus || p.es_aplus || p.esAplus);
    const badgeAplus = document.getElementById('dpf_aplus_badge');
    if (badgeAplus) badgeAplus.style.display = esAplus ? 'inline-block' : 'none';

    const estado = p.status || p.estado || 'En evaluación';
    document.getElementById('dpf_estado_badge').textContent = estado;

    // Métricas
    const inversion = Number(p.investment || p.inversion || 0);
    const sroi = Number(p.roi || p.sroi || 0);
    const retorno = Number(p.projectedReturn || p.retorno_proyectado || (inversion * (sroi / 100)));
    const horizonte = Number(p.roiHorizonMonths || p.sroi_horizonte_meses || 12);
    const impacto = Number(p.impactScore || p.indice_impacto || 80);

    document.getElementById('dpf_inversion').textContent = formatCOP(inversion);
    document.getElementById('dpf_sroi').textContent = '+' + sroi + '%';
    document.getElementById('dpf_horizonte').textContent = 'En horizonte de ' + horizonte + ' meses';
    document.getElementById('dpf_retorno_proy').textContent = formatCOP(retorno);
    document.getElementById('dpf_impacto_num').textContent = impacto;
    document.getElementById('dpf_impacto_bar').style.width = impacto + '%';

    // Resumen y párrafos de descripción
    document.getElementById('dpf_resumen').textContent = p.summary || p.resumen || '';

    const contDesc = document.getElementById('dpf_descripcion');
    let descArray = p.description || p.descripcion || [];
    if (typeof descArray === 'string') {
      try { descArray = JSON.parse(descArray); } catch(e) { descArray = [descArray]; }
    }
    if (Array.isArray(descArray) && descArray.length) {
      contDesc.innerHTML = descArray.map(parrafo => `<p>${escapeHtml(parrafo)}</p>`).join('');
    } else {
      contDesc.innerHTML = `<p>${escapeHtml(p.summary || p.resumen || '')}</p>`;
    }

    // Hitos de impacto
    const contHitos = document.getElementById('dpf_hitos');
    let hitos = p.highlights || p.hitos || [];
    if (typeof hitos === 'string') {
      try { hitos = JSON.parse(hitos); } catch(e) { hitos = [hitos]; }
    }
    if (Array.isArray(hitos) && hitos.length) {
      contHitos.innerHTML = hitos.map(h => `<li>${escapeHtml(h)}</li>`).join('');
    } else {
      contHitos.innerHTML = `<li class="text-slate-400 italic">No se han registrado hitos para esta iniciativa.</li>`;
    }

    // Ficha técnica specs
    const contSpecs = document.getElementById('dpf_specs');
    let specs = p.specs || p.ficha_tecnica || p.fichaTecnica || [];
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch(e) { specs = []; }
    }
    if (Array.isArray(specs) && specs.length) {
      contSpecs.innerHTML = specs.map(s => `
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <span class="text-slate-500 font-semibold">${escapeHtml(s.label || '')}</span>
          <span class="text-ink font-bold">${escapeHtml(s.value || '')}</span>
        </div>
      `).join('');
    } else {
      contSpecs.innerHTML = `<p class="text-slate-400 italic col-span-2">Ficha técnica en consolidación.</p>`;
    }

    // Desglose SROI
    const contRoi = document.getElementById('dpf_roi_breakdown');
    const wrapRoi = document.getElementById('dpf_roi_section');
    let roiBreak = p.roiBreakdown || p.desglose_sroi || p.desgloseSroi || [];
    if (typeof roiBreak === 'string') {
      try { roiBreak = JSON.parse(roiBreak); } catch(e) { roiBreak = []; }
    }
    if (Array.isArray(roiBreak) && roiBreak.length) {
      wrapRoi.classList.remove('hidden');
      contRoi.innerHTML = roiBreak.map(rb => `
        <div class="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p class="text-[10px] font-bold text-emerald-800 uppercase">${escapeHtml(rb.label || '')}</p>
          <p class="text-xs font-bold text-ink mt-0.5">${escapeHtml(rb.value || '')}</p>
        </div>
      `).join('');
    } else {
      wrapRoi.classList.add('hidden');
    }

    // Responsable y Territorio
    const owner = p.owner || {};
    const respNombre = owner.name || p.responsable_nombre || p.responsableNombre || 'Coordinación Fundación A+';
    const respCargo = owner.role || p.responsable_cargo || p.responsableCargo || '';
    const respEmail = owner.email || p.responsable_email || p.responsableEmail || 'contacto@fundacionamas.org.co';

    document.getElementById('dpf_responsable').textContent = respNombre + (respCargo ? ' · ' + respCargo : '');
    document.getElementById('dpf_email').textContent = respEmail;
    document.getElementById('dpf_region').textContent = p.region || 'Quibdó, Chocó';

    const fechaInicio = p.startDate || p.fecha_inicio || '';
    const fechaObj = p.targetDate || p.fecha_objetivo || '';
    let fechasTxt = '';
    if (fechaInicio) fechasTxt += 'Inicio: ' + fechaInicio;
    if (fechaObj) fechasTxt += (fechasTxt ? ' · ' : '') + 'Meta: ' + fechaObj;
    document.getElementById('dpf_fechas').textContent = fechasTxt;

    modal.classList.remove('hidden');
  }

  function cerrarDetalleProyectoFundacion() {
    const modal = document.getElementById('modalDetalleProyectoFundacion');
    if (modal) modal.classList.add('hidden');
  }

  // ---------- FORMULARIO CRUD PROYECTOS FUNDACIÓN ----------
  function abrirFormNuevoProyectoFundacion() {
    document.getElementById('formProyectoFundacionTitulo').textContent = 'Registrar Proyecto de la Fundación';
    document.getElementById('pf_id').value = '';
    document.getElementById('pf_codigo').value = '';
    document.getElementById('pf_nombre').value = '';
    document.getElementById('pf_categoria').value = 'Educación & IA';
    document.getElementById('pf_estado').value = 'En evaluación';
    document.getElementById('pf_prioridad').value = 'Alta';
    document.getElementById('pf_es_aplus').checked = true;
    const chkVisNuevo = document.getElementById('pf_visible_inversores');
    if (chkVisNuevo) chkVisNuevo.checked = true;
    document.getElementById('pf_resumen').value = '';
    document.getElementById('pf_descripcion').value = '';
    document.getElementById('pf_inversion').value = '';
    document.getElementById('pf_sroi').value = '';
    document.getElementById('pf_retorno_proyectado').value = '';
    document.getElementById('pf_indice_impacto').value = '85';
    document.getElementById('pf_sroi_horizonte').value = '24';
    document.getElementById('pf_payback').value = '6';
    document.getElementById('pf_riesgo').value = 'Bajo';
    document.getElementById('pf_fecha_inicio').value = '';
    document.getElementById('pf_fecha_objetivo').value = '';
    document.getElementById('pf_region').value = 'Quibdó, Chocó';
    document.getElementById('pf_resp_nombre').value = '';
    document.getElementById('pf_resp_cargo').value = '';
    document.getElementById('pf_resp_email').value = '';
    document.getElementById('pf_hitos').value = '';
    document.getElementById('pf_specs').value = '';

    document.getElementById('modalFormProyectoFundacion').classList.remove('hidden');
  }

  async function editarProyectoFundacion(id) {
    let p = (window.__cacheProyectosFundacion || []).find(item => item.id === id);
    if (!p) {
      p = await apiFetch('proyectos_fundacion?id=' + encodeURIComponent(id));
    }
    if (!p) {
      toast('Proyecto no encontrado', 'err');
      return;
    }

    document.getElementById('formProyectoFundacionTitulo').textContent = 'Editar Proyecto de la Fundación (' + (p.id || '') + ')';
    document.getElementById('pf_id').value = p.id || '';
    document.getElementById('pf_codigo').value = p.id || '';
    document.getElementById('pf_nombre').value = p.name || p.nombre || '';
    document.getElementById('pf_categoria').value = p.category || p.categoria || 'Educación & IA';
    document.getElementById('pf_estado').value = p.status || p.estado || 'En evaluación';
    document.getElementById('pf_prioridad').value = p.priority || p.prioridad || 'Alta';
    document.getElementById('pf_es_aplus').checked = Boolean(p.isAPlus || p.es_aplus || p.esAplus);
    const chkVisEdit = document.getElementById('pf_visible_inversores');
    if (chkVisEdit) chkVisEdit.checked = (p.visibleInversores !== false && p.visible_inversores !== 0 && p.visible_inversores !== '0');
    document.getElementById('pf_resumen').value = p.summary || p.resumen || '';

    let desc = p.description || p.descripcion || [];
    if (Array.isArray(desc)) desc = desc.join('\n');
    document.getElementById('pf_descripcion').value = desc || '';

    document.getElementById('pf_inversion').value = p.investment || p.inversion || '';
    document.getElementById('pf_sroi').value = p.roi || p.sroi || '';
    document.getElementById('pf_retorno_proyectado').value = p.projectedReturn || p.retorno_proyectado || '';
    document.getElementById('pf_indice_impacto').value = p.impactScore || p.indice_impacto || '85';
    document.getElementById('pf_sroi_horizonte').value = p.roiHorizonMonths || p.sroi_horizonte_meses || '24';
    document.getElementById('pf_payback').value = p.paybackMonths || p.payback_meses || '6';
    document.getElementById('pf_riesgo').value = p.risk || p.riesgo || 'Bajo';
    document.getElementById('pf_fecha_inicio').value = p.startDate || p.fecha_inicio || '';
    document.getElementById('pf_fecha_objetivo').value = p.targetDate || p.fecha_objetivo || '';
    document.getElementById('pf_region').value = p.region || 'Quibdó, Chocó';

    const owner = p.owner || {};
    document.getElementById('pf_resp_nombre').value = owner.name || p.responsable_nombre || p.responsableNombre || '';
    document.getElementById('pf_resp_cargo').value = owner.role || p.responsable_cargo || p.responsableCargo || '';
    document.getElementById('pf_resp_email').value = owner.email || p.responsable_email || p.responsableEmail || '';

    let hitos = p.highlights || p.hitos || [];
    if (Array.isArray(hitos)) hitos = hitos.join('\n');
    document.getElementById('pf_hitos').value = hitos || '';

    let specs = p.specs || p.ficha_tecnica || p.fichaTecnica || [];
    if (Array.isArray(specs)) specs = specs.map(s => `${s.label || ''}: ${s.value || ''}`).join('\n');
    document.getElementById('pf_specs').value = specs || '';

    document.getElementById('modalFormProyectoFundacion').classList.remove('hidden');
  }

  function cerrarFormProyectoFundacion() {
    const modal = document.getElementById('modalFormProyectoFundacion');
    if (modal) modal.classList.add('hidden');
  }

  async function guardarProyectoFundacion() {
    const nombre = document.getElementById('pf_nombre').value.trim();
    if (!nombre) {
      toast('Por favor ingresa el nombre del proyecto.', 'err');
      return;
    }

    const btn = document.getElementById('btnGuardarProyectoFundacion');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando...';
    }

    try {
      const id = document.getElementById('pf_id').value.trim() || document.getElementById('pf_codigo').value.trim();
      const rawDesc = document.getElementById('pf_descripcion').value;
      const descArray = rawDesc.split('\n').map(s => s.trim()).filter(Boolean);

      const rawHitos = document.getElementById('pf_hitos').value;
      const hitosArray = rawHitos.split('\n').map(s => s.trim()).filter(Boolean);

      const rawSpecs = document.getElementById('pf_specs').value;
      const specsArray = rawSpecs.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
        const parts = line.split(':');
        return {
          label: (parts[0] || '').trim(),
          value: (parts.slice(1).join(':') || '').trim()
        };
      });

      const inversion = parseFloat(document.getElementById('pf_inversion').value) || 0;
      const sroi = parseFloat(document.getElementById('pf_sroi').value) || 0;
      let retorno = parseFloat(document.getElementById('pf_retorno_proyectado').value);
      if (isNaN(retorno) || retorno <= 0) {
        retorno = inversion * Math.max(1, sroi / 100);
      }

      const chkVis = document.getElementById('pf_visible_inversores');
      const visibleInversores = chkVis ? chkVis.checked : true;

      const nuevoProyecto = {
        id: id || undefined,
        name: nombre,
        nombre: nombre,
        visibleInversores: visibleInversores,
        visible_inversores: visibleInversores ? 1 : 0,
        category: document.getElementById('pf_categoria').value,
        categoria: document.getElementById('pf_categoria').value,
        status: document.getElementById('pf_estado').value,
        estado: document.getElementById('pf_estado').value,
        priority: document.getElementById('pf_prioridad').value,
        isAPlus: document.getElementById('pf_es_aplus').checked,
        es_aplus: document.getElementById('pf_es_aplus').checked,
        summary: document.getElementById('pf_resumen').value.trim(),
        resumen: document.getElementById('pf_resumen').value.trim(),
        description: descArray,
        descripcion: descArray,
        investment: inversion,
        inversion: inversion,
        roi: sroi,
        sroi: sroi,
        projectedReturn: retorno,
        retorno_proyectado: retorno,
        impactScore: parseInt(document.getElementById('pf_indice_impacto').value) || 85,
        indice_impacto: parseInt(document.getElementById('pf_indice_impacto').value) || 85,
        roiHorizonMonths: parseInt(document.getElementById('pf_sroi_horizonte').value) || 24,
        sroi_horizonte_meses: parseInt(document.getElementById('pf_sroi_horizonte').value) || 24,
        paybackMonths: parseInt(document.getElementById('pf_payback').value) || 6,
        payback_meses: parseInt(document.getElementById('pf_payback').value) || 6,
        risk: document.getElementById('pf_riesgo').value,
        startDate: document.getElementById('pf_fecha_inicio').value || null,
        targetDate: document.getElementById('pf_fecha_objetivo').value || null,
        region: document.getElementById('pf_region').value.trim() || 'Quibdó, Chocó',
        owner: {
          name: document.getElementById('pf_resp_nombre').value.trim(),
          role: document.getElementById('pf_resp_cargo').value.trim(),
          email: document.getElementById('pf_resp_email').value.trim()
        },
        highlights: hitosArray,
        specs: specsArray
      };

      await Store.save('proyectos_fundacion', nuevoProyecto);
      Store.invalidate('proyectos_fundacion');

      cerrarFormProyectoFundacion();
      toast('Proyecto guardado con éxito.', 'ok');
      await renderPanelProyectosFundacion();
    } catch (err) {
      toast('Error al guardar el proyecto: ' + err.message, 'err');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Guardar Proyecto';
      }
    }
  }

  async function eliminarProyectoFundacion(id) {
    if (!confirm('¿Estás seguro de eliminar este proyecto del portafolio institucional?')) return;
    try {
      const resp = await apiFetch('proyectos_fundacion?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (resp && resp.error) throw new Error(resp.error);
      Store.invalidate('proyectos_fundacion');
      toast('Proyecto eliminado del portafolio.', 'ok');
      await renderPanelProyectosFundacion();
    } catch (err) {
      toast('Error al eliminar: ' + err.message, 'err');
    }
  }

  // ---------- PROYECTOS DE ESTUDIANTES (APARTADO PARA INVERSORES Y ADMIN) ----------
  async function renderPanelProyectosEstudiantes() {
    const mount = document.getElementById('mount-proyectos-estudiantes');
    if (!mount) return;

    let proyectos = await Store.list('proyectos_estudiantes');
    if (!proyectos || proyectos.length === 0) {
      proyectos = [];
    }

    const currentAdminUser = getAdminUser();
    const permitidas = cohortesPermitidasParaUsuario(currentAdminUser);
    if (permitidas && Array.isArray(permitidas) && permitidas.length > 0) {
      proyectos = proyectos.filter(p => permitidas.includes(p.cohorte || p.cohort || ''));
      if (proyectosEstudiantesState.cohorte && !permitidas.includes(proyectosEstudiantesState.cohorte)) {
        proyectosEstudiantesState.cohorte = '';
      }
    }

    window.__cacheProyectosEstudiantes = proyectos;

    const total = proyectos.length;
    const autoresUnicos = new Set(proyectos.map(p => p.estudiante_nombre || p.estudianteNombre).filter(Boolean)).size;
    const cohortesUnicas = permitidas && Array.isArray(permitidas) && permitidas.length > 0
      ? permitidas
      : Array.from(new Set(proyectos.map(p => p.cohorte).filter(Boolean))).sort();
    const categoriasUnicas = Array.from(new Set(proyectos.map(p => p.categoria || p.category).filter(Boolean))).sort();

    const esAdmin = puedeGestionarProyectosFundacion();

    mount.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="admin-panel-card p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-md relative overflow-hidden">
          <div class="relative z-10 max-w-3xl">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 border border-white/10 backdrop-blur-md">
              Talento Tecnológico Pacífico · Fundación A+
            </span>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Proyectos de Estudiantes</h1>
            <p class="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Explora las soluciones de software, prototipos de Inteligencia Artificial y aplicaciones prácticas desarrolladas por los estudiantes del TrAIning de 100 a 1000+.
            </p>
          </div>
        </div>

        <!-- KPIs Proyectos Estudiantiles -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proyectos Desarrollados</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${total}</p>
              <p class="text-[11px] text-slate-500 font-medium mt-0.5">Soluciones presentadas</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estudiantes Creadores</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${autoresUnicos}</p>
              <p class="text-[11px] text-amber-700 font-semibold mt-0.5">Jóvenes programadores</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categorías de Impacto</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${categoriasUnicas.length || 1}</p>
              <p class="text-[11px] text-emerald-700 font-semibold mt-0.5">Áreas de especialidad</p>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="admin-panel-card p-4 sm:p-5">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div class="sm:col-span-6">
              <label class="block font-bold text-slate-700 mb-1">Buscar proyecto o tecnología</label>
              <div class="relative">
                <input
                  type="text"
                  class="w-full rounded-xl border border-gray-300 p-2.5 pl-9 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Buscar por título, tecnología, estudiante..."
                  value="${escapeHtml(proyectosEstudiantesState.busqueda)}"
                  oninput="onInputBusquedaProyectosEstudiantes(this.value)"
                />
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>
            <div class="sm:col-span-3">
              <label class="block font-bold text-slate-700 mb-1">Filtrar por Cohorte</label>
              <select class="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none" onchange="onCambioCohorteProyectosEstudiantes(this.value)">
                <option value="">${permitidas && permitidas.length > 0 ? 'Tus Cohortes Asignadas' : 'Todas las Cohortes'}</option>
                ${cohortesUnicas.map(c => `<option value="${escapeHtml(c)}" ${proyectosEstudiantesState.cohorte === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>
            <div class="sm:col-span-3">
              <label class="block font-bold text-slate-700 mb-1">Filtrar por Categoría</label>
              <select class="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none" onchange="onCambioCategoriaProyectosEstudiantes(this.value)">
                <option value="">Todas las Categorías</option>
                ${categoriasUnicas.map(c => `<option value="${escapeHtml(c)}" ${proyectosEstudiantesState.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Lista / Grid de Proyectos Estudiantiles -->
        <div id="pe_lista_contenedor">
          ${renderFilasProyectosEstudiantes(proyectos)}
        </div>
      </div>
    `;
  }

  function renderFilasProyectosEstudiantes(proyectos) {
    let filtrados = proyectos || [];

    if (proyectosEstudiantesState.busqueda) {
      const q = proyectosEstudiantesState.busqueda.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.titulo || p.name || '').toLowerCase().includes(q) ||
        (p.descripcion || p.description || '').toLowerCase().includes(q) ||
        (p.tecnologias || '').toLowerCase().includes(q) ||
        (p.estudiante_nombre || p.estudianteNombre || '').toLowerCase().includes(q)
      );
    }

    if (proyectosEstudiantesState.cohorte) {
      filtrados = filtrados.filter(p => p.cohorte === proyectosEstudiantesState.cohorte);
    }

    if (proyectosEstudiantesState.categoria) {
      filtrados = filtrados.filter(p => (p.categoria || p.category) === proyectosEstudiantesState.categoria);
    }

    if (filtrados.length === 0) {
      return `
        <div class="admin-panel-card p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          </div>
          <h3 class="text-sm font-bold text-ink">No hay proyectos de estudiantes registrados</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Aún no se han publicado proyectos que coincidan con estos filtros. Los estudiantes pueden subir sus soluciones desde su portal.</p>
        </div>
      `;
    }

    const esAdmin = puedeGestionarProyectosFundacion();

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtrados.map(p => {
          const id = p.id;
          const titulo = escapeHtml(p.titulo || p.name || 'Proyecto Estudiantil');
          const cohorte = escapeHtml(p.cohorte || 'General');
          const categoria = escapeHtml(p.categoria || p.category || 'Tecnología');
          const descripcion = escapeHtml(p.descripcion || p.description || '');
          const autor = escapeHtml(p.estudiante_nombre || p.estudianteNombre || 'Estudiante TrAIning');
          const tecnologias = (p.tecnologias || '').split(',').map(t => t.trim()).filter(Boolean);
          const demoUrl = p.url_demo || p.urlDemo || '';
          const repoUrl = p.url_repositorio || p.urlRepositorio || '';
          const imagenUrl = p.imagen_url || p.imagenUrl || '';

          return `
            <article class="admin-panel-card bg-white rounded-3xl border border-gray-200/80 hover:border-amber-400 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
              <div>
                <!-- Imagen o Banner -->
                ${imagenUrl ? `
                  <div class="h-44 w-full bg-slate-100 overflow-hidden cursor-pointer" onclick="abrirDetalleProyectoEstudiante('${id}')">
                    <img src="${escapeHtml(imagenUrl)}" alt="${titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ` : `
                  <div class="h-32 w-full bg-gradient-to-br from-amber-50 via-purple-50 to-indigo-50 border-b border-gray-100 flex items-center justify-center cursor-pointer" onclick="abrirDetalleProyectoEstudiante('${id}')">
                    <div class="flex items-center gap-2 text-slate-400 font-mono text-xs font-bold">
                      <svg class="w-8 h-8 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                    </div>
                  </div>
                `}

                <div class="p-5">
                  <div class="flex items-center gap-1.5 flex-wrap mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${cohorte}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">${categoria}</span>
                  </div>

                  <h3 class="text-base font-extrabold text-ink leading-snug group-hover:text-amber-800 transition cursor-pointer" onclick="abrirDetalleProyectoEstudiante('${id}')">
                    ${titulo}
                  </h3>

                  <p class="text-[11px] text-slate-400 font-semibold mt-1">Por: <span class="text-ink">${autor}</span></p>

                  <p class="text-xs text-slate-600 font-medium leading-relaxed mt-2.5 line-clamp-3">
                    ${descripcion}
                  </p>

                  <!-- Tecnologías Chips -->
                  ${tecnologias.length ? `
                    <div class="flex flex-wrap gap-1 mt-3">
                      ${tecnologias.slice(0, 4).map(t => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">${escapeHtml(t)}</span>`).join('')}
                      ${tecnologias.length > 4 ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-slate-400">+${tecnologias.length - 4}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Footer Tarjeta con Botones -->
              <div class="p-5 pt-0">
                <div class="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button type="button" onclick="abrirDetalleProyectoEstudiante('${id}')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer">
                    Ver Detalles
                  </button>

                  <div class="flex items-center gap-1.5">
                    ${demoUrl ? `
                      <a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener" class="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition" title="Ver Demo en Vivo">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      </a>
                    ` : ''}
                    ${repoUrl ? `
                      <a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener" class="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Ver Repositorio GitHub">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                      </a>
                    ` : ''}
                    ${esAdmin ? `
                      <button type="button" onclick="eliminarProyectoEstudiante('${id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer" title="Eliminar proyecto">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function onInputBusquedaProyectosEstudiantes(val) {
    proyectosEstudiantesState.busqueda = val;
    const cont = document.getElementById('pe_lista_contenedor');
    if (cont && window.__cacheProyectosEstudiantes) {
      cont.innerHTML = renderFilasProyectosEstudiantes(window.__cacheProyectosEstudiantes);
    }
  }

  function onCambioCohorteProyectosEstudiantes(val) {
    proyectosEstudiantesState.cohorte = val;
    const cont = document.getElementById('pe_lista_contenedor');
    if (cont && window.__cacheProyectosEstudiantes) {
      cont.innerHTML = renderFilasProyectosEstudiantes(window.__cacheProyectosEstudiantes);
    }
  }

  function onCambioCategoriaProyectosEstudiantes(val) {
    proyectosEstudiantesState.categoria = val;
    const cont = document.getElementById('pe_lista_contenedor');
    if (cont && window.__cacheProyectosEstudiantes) {
      cont.innerHTML = renderFilasProyectosEstudiantes(window.__cacheProyectosEstudiantes);
    }
  }

  async function abrirDetalleProyectoEstudiante(id) {
    let p = (window.__cacheProyectosEstudiantes || []).find(item => item.id === id);
    if (!p) {
      try {
        p = await apiFetch('proyectos_estudiantes?id=' + encodeURIComponent(id));
      } catch (e) {
        toast('No se pudo cargar el proyecto', 'err');
        return;
      }
    }
    if (!p) return;

    document.getElementById('dpe_titulo').textContent = p.titulo || p.name || 'Proyecto';
    document.getElementById('dpe_cohorte').textContent = p.cohorte || 'General';
    document.getElementById('dpe_categoria').textContent = p.categoria || p.category || 'Tecnología';
    document.getElementById('dpe_autor').textContent = 'Creado por: ' + (p.estudiante_nombre || p.estudianteNombre || 'Estudiante TrAIning');
    document.getElementById('dpe_descripcion').textContent = p.descripcion || p.description || '';

    // Imagen
    const imgCont = document.getElementById('dpe_imagen_cont');
    const imgElem = document.getElementById('dpe_imagen');
    const imgUrl = p.imagen_url || p.imagenUrl || '';
    if (imgUrl) {
      imgElem.src = imgUrl;
      imgCont.classList.remove('hidden');
    } else {
      imgCont.classList.add('hidden');
    }

    // Tecnologías
    const contTec = document.getElementById('dpe_tecnologias');
    const tecs = (p.tecnologias || '').split(',').map(t => t.trim()).filter(Boolean);
    if (tecs.length) {
      contTec.innerHTML = tecs.map(t => `<span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">${escapeHtml(t)}</span>`).join('');
    } else {
      contTec.innerHTML = `<span class="text-slate-400 italic">No especificadas</span>`;
    }

    // Integrantes
    const wrapInt = document.getElementById('dpe_integrantes_wrap');
    const txtInt = document.getElementById('dpe_integrantes');
    if (p.integrantes && p.integrantes.trim()) {
      txtInt.textContent = p.integrantes;
      wrapInt.classList.remove('hidden');
    } else {
      wrapInt.classList.add('hidden');
    }

    // Links Demo / Repo
    const linkDemo = document.getElementById('dpe_link_demo');
    const linkRepo = document.getElementById('dpe_link_repo');
    const demoUrl = p.url_demo || p.urlDemo || '';
    const repoUrl = p.url_repositorio || p.urlRepositorio || '';

    if (demoUrl) {
      linkDemo.href = demoUrl;
      linkDemo.classList.remove('hidden');
    } else {
      linkDemo.classList.add('hidden');
    }

    if (repoUrl) {
      linkRepo.href = repoUrl;
      linkRepo.classList.remove('hidden');
    } else {
      linkRepo.classList.add('hidden');
    }

    document.getElementById('modalDetalleProyectoEstudiante').classList.remove('hidden');
  }

  function cerrarDetalleProyectoEstudiante() {
    const modal = document.getElementById('modalDetalleProyectoEstudiante');
    if (modal) modal.classList.add('hidden');
  }

  // ---------- PORTAL ESTUDIANTE: MIS PROYECTOS ----------
  async function renderMisProyectosEstudiante() {
    const mount = document.getElementById('mount-s-misProyectos');
    if (!mount) return;

    let currentEstudiante = getEstudianteActual();
    if (!currentEstudiante && typeof localStorage !== 'undefined') {
      const emailGuardado = localStorage.getItem('aplus_estudiante_email');
      if (emailGuardado) {
        try {
          const u = (await Store.list('usuarios')).find(x => x.email === emailGuardado || x.nombre === emailGuardado);
          if (u) currentEstudiante = u;
        } catch (e) {}
      }
    }

    const estId = currentEstudiante ? currentEstudiante.id : null;
    const estEmail = currentEstudiante ? currentEstudiante.email : null;

    let todos = [];
    try {
      todos = await Store.list('proyectos_estudiantes');
      if (!todos) todos = [];
    } catch (err) {
      console.warn('[renderMisProyectosEstudiante] Error al leer proyectos_estudiantes:', err);
      todos = [];
    }
    window.__cacheProyectosEstudiantes = todos;

    const misProyectos = (estId || estEmail)
      ? todos.filter(p =>
          (estId && (p.estudiante_id === estId || p.estudianteId === estId)) ||
          (estEmail && (p.estudiante_email === estEmail || p.estudianteEmail === estEmail))
        )
      : todos;

    mount.innerHTML = `
      <div class="space-y-6">
        <!-- Banner Header -->
        <div class="p-6 sm:p-8 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl text-white shadow-md flex items-center justify-between flex-wrap gap-4">
          <div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
              Portafolio de Desarrollo &amp; Empleabilidad · ${escapeHtml((currentEstudiante && currentEstudiante.cohorte) || 'TrAIning')}
            </span>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight">Mis Proyectos de Software e IA</h2>
            <p class="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
              Publica tus desarrollos para que inversores, reclutadores y aliados estratégicos de la Fundación A+ puedan conocer tus competencias y soluciones.
            </p>
          </div>
          <button type="button" onclick="abrirFormNuevoProyectoEstudiante()" class="px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-amber-900 font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>Subir Nuevo Proyecto</span>
          </button>
        </div>

        <!-- Lista de Proyectos del Estudiante -->
        ${misProyectos.length === 0 ? `
          <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
            <div class="w-14 h-14 mx-auto rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
            <h3 class="text-base font-bold text-ink">Aún no has publicado ningún proyecto</h3>
            <p class="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
              Sube el código de tus proyectos de clase, prototipos con Gemini AI, páginas web o soluciones comunitarias con el botón superior.
            </p>
            <button type="button" onclick="abrirFormNuevoProyectoEstudiante()" class="mt-4 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer">
              Comenzar a subir proyecto
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${misProyectos.map(p => {
              const id = p.id;
              const titulo = escapeHtml(p.titulo || p.name || 'Proyecto');
              const categoria = escapeHtml(p.categoria || p.category || 'General');
              const descripcion = escapeHtml(p.descripcion || p.description || '');
              const tecnologias = (p.tecnologias || '').split(',').map(t => t.trim()).filter(Boolean);
              const demoUrl = p.url_demo || p.urlDemo || '';
              const repoUrl = p.url_repositorio || p.urlRepositorio || '';
              const imagenUrl = p.imagen_url || p.imagenUrl || '';

              return `
                <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    ${imagenUrl ? `
                      <div class="h-40 w-full rounded-2xl overflow-hidden mb-3 border border-gray-100 bg-slate-50">
                        <img src="${escapeHtml(imagenUrl)}" alt="${titulo}" class="w-full h-full object-cover" />
                      </div>
                    ` : ''}

                    <div class="flex items-center gap-1.5 mb-2">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${escapeHtml(p.cohorte || (currentEstudiante && currentEstudiante.cohorte) || 'General')}</span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">${categoria}</span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Publicado</span>
                    </div>

                    <h3 class="text-base font-extrabold text-ink leading-snug">${titulo}</h3>
                    <p class="text-xs text-slate-600 font-medium leading-relaxed mt-2 line-clamp-3">${descripcion}</p>

                    ${tecnologias.length ? `
                      <div class="flex flex-wrap gap-1 mt-3">
                        ${tecnologias.map(t => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">${escapeHtml(t)}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>

                  <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      ${demoUrl ? `
                        <a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener" class="text-xs font-bold text-purple-700 hover:underline">Demo</a>
                      ` : ''}
                      ${repoUrl ? `
                        <a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener" class="text-xs font-bold text-slate-700 hover:underline">GitHub</a>
                      ` : ''}
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button type="button" onclick="editarProyectoEstudiante('${id}')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition cursor-pointer">
                        Editar
                      </button>
                      <button type="button" onclick="eliminarProyectoEstudiante('${id}')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer" title="Eliminar proyecto">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ---------- CRUD PROYECTOS DE ESTUDIANTE ----------
  function abrirFormNuevoProyectoEstudiante() {
    const currentEstudiante = getEstudianteActual();
    document.getElementById('formProyectoEstudianteTitulo').textContent = 'Subir Proyecto de Desarrollo';
    document.getElementById('pe_id').value = '';
    document.getElementById('pe_titulo').value = '';

    const cohorteEst = (currentEstudiante && currentEstudiante.cohorte) ? currentEstudiante.cohorte.trim() : '';
    const inputCohorte = document.getElementById('pe_cohorte');
    const badgeFijo = document.getElementById('pe_cohorte_badge_fijo');
    const ayudaFijo = document.getElementById('pe_cohorte_ayuda');

    if (inputCohorte) {
      inputCohorte.value = cohorteEst;
      if (cohorteEst) {
        inputCohorte.readOnly = true;
        inputCohorte.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-600', 'select-none');
        if (badgeFijo) badgeFijo.classList.remove('hidden');
        if (ayudaFijo) ayudaFijo.classList.remove('hidden');
      } else {
        inputCohorte.readOnly = false;
        inputCohorte.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-600', 'select-none');
        if (badgeFijo) badgeFijo.classList.add('hidden');
        if (ayudaFijo) ayudaFijo.classList.add('hidden');
      }
    }

    document.getElementById('pe_categoria').value = 'Inteligencia Artificial';
    document.getElementById('pe_tecnologias').value = '';
    document.getElementById('pe_integrantes').value = '';
    document.getElementById('pe_descripcion').value = '';
    document.getElementById('pe_url_demo').value = '';
    document.getElementById('pe_url_repo').value = '';
    document.getElementById('pe_imagen_file').value = '';
    document.getElementById('pe_imagen_base64').value = '';
    document.getElementById('pe_preview_cont').classList.add('hidden');

    document.getElementById('modalFormProyectoEstudiante').classList.remove('hidden');
  }

  async function editarProyectoEstudiante(id) {
    const currentEstudiante = getEstudianteActual();
    let p = (window.__cacheProyectosEstudiantes || []).find(item => item.id === id);
    if (!p) {
      p = await apiFetch('proyectos_estudiantes?id=' + encodeURIComponent(id));
    }
    if (!p) {
      toast('Proyecto no encontrado', 'err');
      return;
    }

    document.getElementById('formProyectoEstudianteTitulo').textContent = 'Editar Proyecto de Desarrollo';
    document.getElementById('pe_id').value = p.id || '';
    document.getElementById('pe_titulo').value = p.titulo || p.name || '';

    const cohorteEst = (currentEstudiante && currentEstudiante.cohorte) ? currentEstudiante.cohorte.trim() : '';
    const cohorteVal = p.cohorte || cohorteEst || '';
    const inputCohorte = document.getElementById('pe_cohorte');
    const badgeFijo = document.getElementById('pe_cohorte_badge_fijo');
    const ayudaFijo = document.getElementById('pe_cohorte_ayuda');

    if (inputCohorte) {
      inputCohorte.value = cohorteVal;
      if (cohorteEst) {
        inputCohorte.readOnly = true;
        inputCohorte.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-600', 'select-none');
        if (badgeFijo) badgeFijo.classList.remove('hidden');
        if (ayudaFijo) ayudaFijo.classList.remove('hidden');
      } else {
        inputCohorte.readOnly = false;
        inputCohorte.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-600', 'select-none');
        if (badgeFijo) badgeFijo.classList.add('hidden');
        if (ayudaFijo) ayudaFijo.classList.add('hidden');
      }
    }

    document.getElementById('pe_categoria').value = p.categoria || p.category || 'Inteligencia Artificial';
    document.getElementById('pe_tecnologias').value = p.tecnologias || '';
    document.getElementById('pe_integrantes').value = p.integrantes || '';
    document.getElementById('pe_descripcion').value = p.descripcion || p.description || '';
    document.getElementById('pe_url_demo').value = p.url_demo || p.urlDemo || '';
    document.getElementById('pe_url_repo').value = p.url_repositorio || p.urlRepositorio || '';

    const imgBase = p.imagen_url || p.imagenUrl || '';
    document.getElementById('pe_imagen_base64').value = imgBase;
    const previewCont = document.getElementById('pe_preview_cont');
    const previewImg = document.getElementById('pe_preview_img');
    if (imgBase) {
      previewImg.src = imgBase;
      previewCont.classList.remove('hidden');
    } else {
      previewCont.classList.add('hidden');
    }

    document.getElementById('modalFormProyectoEstudiante').classList.remove('hidden');
  }

  function cerrarFormProyectoEstudiante() {
    const modal = document.getElementById('modalFormProyectoEstudiante');
    if (modal) modal.classList.add('hidden');
  }

  function procesarImagenProyectoEstudiante(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 8 * 1024 * 1024) {
      toast('La imagen supera el límite de 8 MB.', 'err');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('pe_imagen_base64').value = e.target.result;
      document.getElementById('pe_preview_img').src = e.target.result;
      document.getElementById('pe_preview_cont').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  async function guardarProyectoEstudiante() {
    const currentEstudiante = getEstudianteActual();
    const titulo = document.getElementById('pe_titulo').value.trim();
    const descripcion = document.getElementById('pe_descripcion').value.trim();
    if (!titulo || !descripcion) {
      toast('Por favor completa el título y la descripción.', 'err');
      return;
    }

    const btn = document.getElementById('btnGuardarProyectoEstudiante');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando...';
    }

    try {
      const id = document.getElementById('pe_id').value.trim();
      const cohorteEst = (currentEstudiante && currentEstudiante.cohorte) ? currentEstudiante.cohorte.trim() : '';
      const cohorteFinal = cohorteEst || document.getElementById('pe_cohorte').value.trim() || 'General';

      const nuevo = {
        id: id || undefined,
        titulo: titulo,
        cohorte: cohorteFinal,
        categoria: document.getElementById('pe_categoria').value,
        tecnologias: document.getElementById('pe_tecnologias').value.trim(),
        integrantes: document.getElementById('pe_integrantes').value.trim(),
        descripcion: descripcion,
        url_demo: document.getElementById('pe_url_demo').value.trim(),
        url_repositorio: document.getElementById('pe_url_repo').value.trim(),
        imagen_url: document.getElementById('pe_imagen_base64').value || undefined,
        estudiante_id: currentEstudiante ? currentEstudiante.id : undefined,
        estudiante_nombre: currentEstudiante ? (currentEstudiante.nombre || '') : undefined,
        estudiante_email: currentEstudiante ? (currentEstudiante.email || '') : undefined,
        estado: 'Publicado'
      };

      await Store.save('proyectos_estudiantes', nuevo);
      Store.invalidate('proyectos_estudiantes');

      cerrarFormProyectoEstudiante();
      toast('Proyecto publicado con éxito.', 'ok');

      if (document.getElementById('mount-s-misProyectos')) {
        await renderMisProyectosEstudiante();
      }
      if (document.getElementById('mount-proyectos-estudiantes')) {
        await renderPanelProyectosEstudiantes();
      }
    } catch (err) {
      toast('Error al guardar el proyecto: ' + err.message, 'err');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Publicar Proyecto';
      }
    }
  }

  async function eliminarProyectoEstudiante(id) {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return;
    try {
      const resp = await apiFetch('proyectos_estudiantes?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (resp && resp.error) throw new Error(resp.error);
      Store.invalidate('proyectos_estudiantes');
      toast('Proyecto eliminado.', 'ok');

      if (document.getElementById('mount-s-misProyectos')) {
        await renderMisProyectosEstudiante();
      }
      if (document.getElementById('mount-proyectos-estudiantes')) {
        await renderPanelProyectosEstudiantes();
      }
    } catch (err) {
      toast('Error al eliminar: ' + err.message, 'err');
    }
  }

  // Exportar funciones a window
  window.renderPanelProyectosFundacion = renderPanelProyectosFundacion;
  window.renderPanelProyectosEstudiantes = renderPanelProyectosEstudiantes;
  window.renderMisProyectosEstudiante = renderMisProyectosEstudiante;
  window.onInputBusquedaProyectosFundacion = onInputBusquedaProyectosFundacion;
  window.limpiarBusquedaProyectosFundacion = limpiarBusquedaProyectosFundacion;
  window.onCambioFiltroCatProyectosFundacion = onCambioFiltroCatProyectosFundacion;
  window.onCambioFiltroEstadoProyectosFundacion = onCambioFiltroEstadoProyectosFundacion;
  window.onToggleAplusProyectosFundacion = onToggleAplusProyectosFundacion;
  window.onCambioOrdenProyectosFundacion = onCambioOrdenProyectosFundacion;
  window.cambiarVistaProyectosFundacion = cambiarVistaProyectosFundacion;
  window.limpiarTodosFiltrosProyectosFundacion = limpiarTodosFiltrosProyectosFundacion;
  window.abrirDetalleProyectoFundacion = abrirDetalleProyectoFundacion;
  window.cerrarDetalleProyectoFundacion = cerrarDetalleProyectoFundacion;
  window.abrirFormNuevoProyectoFundacion = abrirFormNuevoProyectoFundacion;
  window.editarProyectoFundacion = editarProyectoFundacion;
  window.cerrarFormProyectoFundacion = cerrarFormProyectoFundacion;
  window.guardarProyectoFundacion = guardarProyectoFundacion;
  window.eliminarProyectoFundacion = eliminarProyectoFundacion;

  window.onInputBusquedaProyectosEstudiantes = onInputBusquedaProyectosEstudiantes;
  window.onCambioCohorteProyectosEstudiantes = onCambioCohorteProyectosEstudiantes;
  window.onCambioCategoriaProyectosEstudiantes = onCambioCategoriaProyectosEstudiantes;
  window.abrirDetalleProyectoEstudiante = abrirDetalleProyectoEstudiante;
  window.cerrarDetalleProyectoEstudiante = cerrarDetalleProyectoEstudiante;
  window.abrirFormNuevoProyectoEstudiante = abrirFormNuevoProyectoEstudiante;
  window.editarProyectoEstudiante = editarProyectoEstudiante;
  window.cerrarFormProyectoEstudiante = cerrarFormProyectoEstudiante;
  window.procesarImagenProyectoEstudiante = procesarImagenProyectoEstudiante;
  window.guardarProyectoEstudiante = guardarProyectoEstudiante;
  window.eliminarProyectoEstudiante = eliminarProyectoEstudiante;


})();
