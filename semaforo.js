/**
 * semaforo.js — Módulo de Semáforo de Riesgo Académico y Sistema de Alertas Tempranas
 * Fundación A+ (Adaptado de la arquitectura de seguimiento de Davinson)
 *
 * Características:
 *  - Cálculo determinista con escala institucional 0.0 - 10.0 (mínimo 6.0) y asistencia mínima (80%).
 *  - Dashboard interactivo con Chart.js (Donut de salud académica global).
 *  - Tarjetas de KPIs de impacto (Total, En Riesgo, En Observación, Óptimos, Tasa de Salud).
 *  - Feed de Alertas Críticas recientes con acceso directo a intervención ("Atender").
 *  - Tabla enriquecida con búsqueda en vivo, filtro por cohorte y filtro instantáneo por nivel de riesgo.
 *  - Panel lateral Drawer Master-Detail con evolución histórica del estudiante (100% no invasivo).
 *  - Modal de Registro de Acción Tutorial y Seguimiento Pedagógico conectado a MySQL (seguimiento_alertas).
 *  - Exportación en CSV con filtros activos.
 *  - Soporte dual: Panel de Administración/Coordinación y Portal Docente.
 *  - Garantía de scroll fluido: contenedores modales aislados y sin bloqueos de puntero (pointer-events).
 */

(function () {
  'use strict';

  // Instancias activas de Chart.js para evitar memory leaks y superposiciones
  let donutChartAdmin = null;
  let donutChartDocente = null;

  // Estado local y caché en memoria para operaciones ultrarrápidas sin lag
  let semaforoCohorteFiltro = '';
  let semaforoRiesgoFiltro = 'todos'; // 'todos' | 'Rojo' | 'Amarillo' | 'Verde'
  let estudianteSeleccionadoDetalle = null;

  let _semaforoDataCache = null;
  let _semaforoAccionesCache = null;
  let _semaforoModulosCache = null;

  // Paleta oficial Fundación A+
  const PALETA = {
    verde: { hex: '#1FC8C0', bg: 'rgba(31, 200, 192, 0.12)', border: '#1FC8C0', text: '#0f8f89', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    amarillo: { hex: '#F5A623', bg: 'rgba(245, 166, 35, 0.12)', border: '#F5A623', text: '#b5790f', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    rojo: { hex: '#F0455C', bg: 'rgba(240, 69, 92, 0.12)', border: '#F0455C', text: '#dc2626', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    morado: '#8B5CF6',
    moradoDark: '#7C3AED',
    slateDark: '#0F172A',
    slateMuted: '#64748B'
  };

  /**
   * Helper para sanitizar strings y prevenir XSS
   */
  function escapeHtml(str) {
    if (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' && window.escapeHtml !== escapeHtml) {
      return window.escapeHtml(str);
    }
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Notificación Toast flotante segura
   */
  function notificar(msg, tipo = 'ok') {
    if (typeof window.toast === 'function') {
      window.toast(msg, tipo);
    } else {
      console.log(`[Semáforo ${tipo.toUpperCase()}]: ${msg}`);
    }
  }

  /**
   * Asegura que los contenedores globales de Drawer y Modal existan fuera de mount-semaforo
   * para evitar bloqueos de scroll/pointer-events y permitir reutilización total en Docente y Admin.
   */
  function asegurarModalesSemaforo() {
    let root = document.getElementById('semaforo-modals-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'semaforo-modals-root';
      document.body.appendChild(root);
    }

    if (!document.getElementById('drawer-estudiante-semaforo')) {
      root.innerHTML = `
        <!-- Drawer lateral Master-Detail para Historial del Estudiante -->
        <div id="drawer-estudiante-semaforo" class="fixed inset-0 z-50 overflow-hidden hidden pointer-events-none transition-opacity duration-300 opacity-0" aria-hidden="true">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer pointer-events-auto" onclick="window.cerrarDetalleEstudianteSemaforo()"></div>
          <div class="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-full pointer-events-auto" id="drawer-estudiante-content">
              <!-- Contenido dinámico del estudiante inyectado aquí -->
            </div>
          </div>
        </div>

        <!-- Modal para Registrar Acción Tutorial / Seguimiento MySQL -->
        <div id="modal-accion-seguimiento" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs hidden pointer-events-auto" onclick="if(event.target === this) window.cerrarModalAccionSeguimiento()">
          <div class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden transform transition-all animate-scaleIn">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-morado"></div>
                <h3 class="text-base font-bold text-slate-900">Registrar Intervención Tutorial</h3>
              </div>
              <button type="button" onclick="window.cerrarModalAccionSeguimiento()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form id="form-accion-seguimiento" onsubmit="window.guardarAccionSeguimiento(event)" class="p-6 space-y-4">
              <input type="hidden" id="seg-estudiante-id" name="estudiante_id" />
              <input type="hidden" id="seg-estudiante-email" name="estudiante_email" />
              <input type="hidden" id="seg-cohorte" name="cohorte" />

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Estudiante</label>
                <input type="text" id="seg-estudiante-nombre" readonly class="w-full rounded-xl border border-gray-200 bg-gray-100/70 px-3.5 py-2 text-sm font-semibold text-slate-800 cursor-not-allowed" />
                <p id="seg-estudiante-email-label" class="text-[11px] text-slate-500 mt-1"></p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="seg-tipo-accion" class="block text-xs font-bold text-slate-700 mb-1">Tipo de Acción *</label>
                  <select id="seg-tipo-accion" onchange="window.actualizarAyudaCompromiso(this.value)" required class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
                    <option value="Llamada / Contacto acudiente">Llamada / Contacto acudiente</option>
                    <option value="Tutoría pedagógica individual">Tutoría pedagógica individual</option>
                    <option value="Compromiso académico">Compromiso académico</option>
                    <option value="Remisión psicosocial">Remisión psicosocial</option>
                    <option value="Notificación formal de inasistencia">Notificación formal de inasistencia</option>
                    <option value="Plan de nivelación">Plan de nivelación</option>
                  </select>
                </div>
                <div>
                  <label for="seg-estado" class="block text-xs font-bold text-slate-700 mb-1">Estado de la Acción</label>
                  <select id="seg-estado" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
                    <option value="En seguimiento">En seguimiento</option>
                    <option value="Compromiso suscrito">Compromiso suscrito</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="seg-observaciones" class="block text-xs font-bold text-slate-700 mb-1">Diagnóstico / Observaciones de la Intervención *</label>
                <textarea id="seg-observaciones" required rows="3" placeholder="Describe los motivos identificados en la sesión o llamada (ej. dificultades laborales, conectividad, salud, bajo rendimiento)..." class="w-full rounded-xl border border-gray-200 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado"></textarea>
                <p class="text-[11px] text-slate-400 mt-1">Explica la situación o causa raíz detectada con el estudiante.</p>
              </div>

              <!-- Bloque Explicativo de Acuerdo / Compromiso de Mejora -->
              <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div class="flex items-start gap-2.5">
                  <div class="w-6 h-6 rounded-lg bg-morado/10 text-morado flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h4 class="text-xs font-bold text-slate-800">Acuerdo o Compromiso de Mejora <span class="text-[11px] font-normal text-slate-400">(Opcional)</span></h4>
                    <p id="seg-compromiso-ayuda" class="text-[11px] text-slate-500 leading-snug mt-0.5">Si durante el diálogo se pactó una meta, tarea correctiva o cita con el estudiante o acudiente, regístrala aquí para hacerle seguimiento.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div class="sm:col-span-2">
                    <label for="seg-compromiso" class="block text-[11px] font-bold text-slate-600 mb-1">Pacto o Tarea Acordada</label>
                    <input type="text" id="seg-compromiso" placeholder="Ej: Acudiente enviará soporte médico y supervisará asistencia virtual" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
                  </div>
                  <div>
                    <label for="seg-fecha-compromiso" class="block text-[11px] font-bold text-slate-600 mb-1">Fecha Límite</label>
                    <input type="date" id="seg-fecha-compromiso" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
                  </div>
                </div>
              </div>

              <!-- Casilla explícita de Envío de Notificación -->
              <div class="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                <input type="checkbox" id="seg-notificar-estudiante" checked class="mt-0.5 rounded text-morado focus:ring-morado/30 w-4 h-4 cursor-pointer" />
                <label for="seg-notificar-estudiante" class="text-[11px] text-slate-700 cursor-pointer">
                  <span class="font-bold text-slate-900 block">Enviar notificación por correo electrónico y al portal del estudiante</span>
                  El alumno recibirá un correo formal con el detalle de esta intervención tutorial, observaciones y fecha límite del compromiso.
                </label>
              </div>

              <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button type="button" onclick="window.cerrarModalAccionSeguimiento()" class="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 hover:bg-gray-50 text-xs font-semibold transition cursor-pointer">Cancelar</button>
                <button type="submit" id="btn-guardar-seguimiento" class="px-5 py-2 rounded-xl bg-morado text-white hover:bg-morado-dark text-xs font-bold transition shadow-sm cursor-pointer">Guardar en Bitácora</button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Cierre con tecla Escape
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('keydown', (evt) => {
          if (evt.key === 'Escape') {
            cerrarModalAccionSeguimiento();
            cerrarDetalleEstudianteSemaforo();
          }
        });
      }
    }
  }

  /**
   * Calcula o consulta el semáforo de riesgo académico
   * Consume /api/semaforo con fallback determinista en cliente
   */
  async function computeSemaforo(cohorteFiltro = '') {
    try {
      const q = cohorteFiltro ? ('?cohorte=' + encodeURIComponent(cohorteFiltro)) : '';
      if (typeof Store !== 'undefined' && Store.list) {
        const datos = await Store.list('semaforo' + q);
        if (Array.isArray(datos) && datos.length > 0) {
          return datos;
        }
      }
    } catch (e) {
      console.warn('[computeSemaforo] Fallback local determinista:', e.message);
    }

    if (typeof Store === 'undefined') return [];

    const usuarios = (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && (!cohorteFiltro || u.cohorte === cohorteFiltro));
    const asistenciaTodos = await Store.list('asistencia');
    const cfg = (await Store.get('configuracion')) || { asistenciaMinima: 80, notasMinimaAprobacion: 6.0 };
    const notaMin = parseFloat(cfg.notasMinimaAprobacion || 6.0);
    const asisMin = parseFloat(cfg.asistenciaMinima || 80.0);

    const fechaRegMap = new Map();
    const fechaRegDateMap = new Map();
    usuarios.forEach(u => {
      const f = (u.creadoEn || u.creado_en || '').trim();
      fechaRegMap.set(u.nombre, f ? new Date(f.includes('T') ? f : f.replace(' ', 'T')).getTime() : 0);
      fechaRegDateMap.set(u.nombre, f ? f.slice(0, 10) : '');
    });

    const hoy = typeof fechaHoyLocal === 'function' ? fechaHoyLocal() : new Date().toISOString().slice(0, 10);
    const sesionesHoy = (typeof Store !== 'undefined') ? await Store.list('sesiones_asistencia') : [];

    const asistenciaMap = new Map();
    for (const a of asistenciaTodos) {
      if (!a.estudiante) continue;
      const fRegDate = fechaRegDateMap.get(a.estudiante) || '';

      // Si la sesión ocurrió antes de que el estudiante se registrara en la plataforma, ignorar
      if (a.estado === 'Falla' && fRegDate && a.fecha && a.fecha < fRegDate) {
        continue;
      }
      // Si la sesión es de hoy y aún está activa (tolerancia <= 50m), no computar como Falla
      if (a.estado === 'Falla' && a.fecha === hoy) {
        const sesHoy = sesionesHoy.find(s => s.id === a.sesionId || s.materia === a.materia || s.modulo === a.modulo);
        if (sesHoy) {
          const minsHoy = (typeof minutosTranscurridos === 'function') ? minutosTranscurridos(sesHoy.horaInicio || sesHoy.hora_inicio) : 0;
          if (minsHoy <= (typeof VENTANA_TARDE_MIN !== 'undefined' ? VENTANA_TARDE_MIN : 50)) continue;
        }
      }

      let rec = asistenciaMap.get(a.estudiante);
      if (!rec) {
        rec = { total: 0, presentes: 0, fallasConsecutivas: 0, rachaFallas: 0 };
        asistenciaMap.set(a.estudiante, rec);
      }
      rec.total++;
      if (a.estado === 'Presente') {
        rec.presentes++;
        rec.rachaFallas = 0;
      } else if (a.estado === 'Falla') {
        rec.rachaFallas++;
        if (rec.rachaFallas > rec.fallasConsecutivas) rec.fallasConsecutivas = rec.rachaFallas;
      }
    }

    const notasModulos = await Store.list('notas_modulos');

    return usuarios.map(u => {
      // Cálculo del promedio ponderado en todas las notas de su cohorte
      let sumaNotas = 0;
      let cantNotas = 0;
      const notasEst = notasModulos.filter(nm => nm.cohorte === u.cohorte);
      notasEst.forEach(hoja => {
        const criterios = Array.isArray(hoja.criterios) ? hoja.criterios : [];
        const valores = hoja.valores ? (hoja.valores[u.nombre] || {}) : {};
        if (criterios.length > 0) {
          let sumaMes = 0;
          let pesoTotal = 0;
          criterios.forEach(c => {
            const v = valores[c.id] !== undefined ? valores[c.id] : valores[c.nombre];
            if (v !== undefined && v !== '' && !isNaN(v)) {
              sumaMes += parseFloat(v) * (parseFloat(c.peso || 0) / 100);
              pesoTotal += parseFloat(c.peso || 0);
            }
          });
          if (pesoTotal >= 99) {
            sumaNotas += sumaMes;
            cantNotas++;
          }
        }
      });

      const promedio = cantNotas > 0 ? (sumaNotas / cantNotas) : null;
      const asoc = asistenciaMap.get(u.nombre);
      const asistencia = (asoc && asoc.total > 0) ? Math.round((asoc.presentes / asoc.total) * 100) : null;
      const fallasSeguidas = asoc ? (asoc.fallasConsecutivas || 0) : 0;

      let riesgo = 'Verde';
      let motivo = '';

      const promedioBajo = promedio !== null && promedio < notaMin;
      const promedioAlerta = promedio !== null && promedio < notaMin + 0.9;
      const asistenciaBaja = asistencia !== null && asistencia < asisMin;
      const asistenciaAlerta = asistencia !== null && asistencia < asisMin + 9;
      const fallasCriticas = fallasSeguidas >= 3;

      if (promedioBajo || asistenciaBaja || fallasCriticas) {
        riesgo = 'Rojo';
        const causas = [];
        if (promedioBajo) causas.push(`Promedio crítico (${promedio.toFixed(1)} < ${notaMin})`);
        if (asistenciaBaja) causas.push(`Asistencia baja (${asistencia}% < ${asisMin}%)`);
        if (fallasCriticas) causas.push(`${fallasSeguidas} fallas consecutivas`);
        motivo = causas.join(' • ');
      } else if (promedioAlerta || asistenciaAlerta || fallasSeguidas === 2) {
        riesgo = 'Amarillo';
        const causas = [];
        if (promedioAlerta) causas.push(`Promedio en observación (${promedio.toFixed(1)})`);
        if (asistenciaAlerta) causas.push(`Asistencia en observación (${asistencia}%)`);
        if (fallasSeguidas === 2) causas.push('2 fallas consecutivas');
        motivo = causas.join(' • ');
      }

      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email || '',
        telefono: u.telefono || '',
        cohorte: u.cohorte || '',
        promedio: promedio !== null ? promedio.toFixed(1) : '—',
        asistencia: asistencia !== null ? asistencia : '—',
        fallasConsecutivas: fallasSeguidas,
        riesgo,
        motivo: motivo || 'Desempeño y asistencia óptimos'
      };
    });
  }

  /**
   * Genera el HTML de una fila de la tabla del semáforo
   */
  function generarFilaSemaforo(s, numAcciones) {
    const color = PALETA[s.riesgo === 'Rojo' ? 'rojo' : (s.riesgo === 'Amarillo' ? 'amarillo' : 'verde')];
    const iniciales = (s.nombre || 'E').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const searchable = (
      (s.nombre || '') + ' ' +
      (s.cohorte || '') + ' ' +
      (s.email || '') + ' ' +
      (s.riesgo === 'Rojo' ? 'rojo riesgo alto crítico' : (s.riesgo === 'Amarillo' ? 'amarillo observacion alerta' : 'verde optimo')) + ' ' +
      (s.motivo || '')
    ).toLowerCase();

    return `
      <tr data-search="${escapeHtml(searchable)}" class="border-b border-gray-100 hover:bg-slate-50/70 transition-colors">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm" style="background:${color.bg};color:${color.text};border:1px solid ${color.hex}33">
              ${escapeHtml(iniciales)}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-800 truncate">${escapeHtml(s.nombre)}</p>
              <p class="text-xs text-slate-500 truncate">${escapeHtml(s.email || s.cohorte || 'Estudiante')}</p>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-xs font-semibold text-slate-600">
          <span class="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200">${escapeHtml(s.cohorte || '—')}</span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono font-bold ${s.promedio !== '—' && parseFloat(s.promedio) < 6.0 ? 'text-rose-600' : 'text-slate-800'}">${s.promedio}</span>
            ${s.promedio !== '—' ? `<div class="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div class="h-full rounded-full ${parseFloat(s.promedio) >= 7.0 ? 'bg-teal-500' : (parseFloat(s.promedio) >= 6.0 ? 'bg-amber-500' : 'bg-rose-500')}" style="width:${Math.min(100, Math.max(0, (parseFloat(s.promedio)/10)*100))}%"></div></div>` : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-mono font-bold ${s.asistencia !== '—' && parseInt(s.asistencia) < 80 ? 'text-rose-600' : 'text-slate-800'}">${s.asistencia === '—' ? '—' : s.asistencia + '%'}</span>
            ${s.asistencia !== '—' ? `<div class="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div class="h-full rounded-full ${parseInt(s.asistencia) >= 85 ? 'bg-teal-500' : (parseInt(s.asistencia) >= 75 ? 'bg-amber-500' : 'bg-rose-500')}" style="width:${Math.min(100, Math.max(0, parseInt(s.asistencia)))}%"></div></div>` : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${color.badge} border">
            <span class="w-1.5 h-1.5 rounded-full" style="background:${color.hex}"></span>
            ${s.riesgo === 'Rojo' ? 'Riesgo Alto' : (s.riesgo === 'Amarillo' ? 'Observación' : 'Óptimo')}
          </span>
        </td>
        <td class="py-3 px-4 text-xs text-slate-500 max-w-xs">
          <span class="truncate block" title="${escapeHtml(s.motivo)}">${escapeHtml(s.motivo)}</span>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" onclick="window.verDetalleEstudianteSemaforo('${escapeHtml(s.id)}')" title="Ver Historial y Diagnóstico" class="p-1.5 rounded-lg border border-gray-200 text-slate-600 hover:text-morado hover:border-morado/40 hover:bg-morado/5 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button type="button" onclick="window.abrirModalAccionSeguimiento('${escapeHtml(s.id)}')" title="Registrar Acción Tutorial" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-morado text-white hover:bg-morado-dark transition shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Acción</span>
              ${numAcciones > 0 ? `<span class="ml-0.5 px-1 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">${numAcciones}</span>` : ''}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Cambia el filtro de cohorte en la vista de administración
   */
  async function cambiarFiltroSemaforoCohorte(cohorte) {
    semaforoCohorteFiltro = cohorte || '';
    await renderSemaforo(false);
  }

  /**
   * Cambia el filtro de nivel de riesgo instantáneamente ('todos', 'Rojo', 'Amarillo', 'Verde')
   * Filtra en memoria para evitar refrescos pesados o saltos en la pantalla.
   */
  function cambiarFiltroSemaforoRiesgo(riesgo) {
    semaforoRiesgoFiltro = riesgo || 'todos';

    // Actualizar estilo visual de los botones de filtro inmediatamente
    const pillTodos = document.getElementById('pill-semaforo-todos');
    const pillRojo = document.getElementById('pill-semaforo-rojo');
    const pillAmarillo = document.getElementById('pill-semaforo-amarillo');
    const pillVerde = document.getElementById('pill-semaforo-verde');

    if (pillTodos) {
      pillTodos.className = `px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'todos' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`;
    }
    if (pillRojo) {
      pillRojo.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Rojo' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}`;
    }
    if (pillAmarillo) {
      pillAmarillo.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Amarillo' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`;
    }
    if (pillVerde) {
      pillVerde.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Verde' ? 'bg-teal-600 text-white shadow-xs' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'}`;
    }

    // Actualizar filas de la tabla
    actualizarTablaSemaforoFiltrada();
  }

  /**
   * Actualiza el cuerpo de la tabla según los filtros activos de cohorte y riesgo
   */
  function actualizarTablaSemaforoFiltrada() {
    const table = document.getElementById('table-semaforo-modern');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const data = _semaforoDataCache || [];
    const acciones = _semaforoAccionesCache || [];

    const dataCohorte = semaforoCohorteFiltro
      ? data.filter(s => s.cohorte === semaforoCohorteFiltro)
      : data;

    const dataFinal = semaforoRiesgoFiltro === 'todos'
      ? dataCohorte
      : dataCohorte.filter(s => s.riesgo === semaforoRiesgoFiltro);

    const rowsHtml = dataFinal.map(s => {
      const numAcciones = acciones.filter(a => a.estudiante_id === s.id || a.estudiante_nombre === s.nombre).length;
      return generarFilaSemaforo(s, numAcciones);
    }).join('');

    tbody.innerHTML = rowsHtml || '<tr><td colspan="7" class="text-sm text-slate-400 text-center py-8">No se encontraron estudiantes para los filtros actuales.</td></tr>';

    // Reinicializar TableManager para actualizar paginación y orden
    if (typeof TableManager !== 'undefined' && TableManager.init) {
      TableManager.init('table-semaforo-modern');
    }
  }

  /**
   * Búsqueda en vivo y reactiva conectada a TableManager con fallback directo al DOM
   */
  function filtrarSemaforoLive(term) {
    const q = (term || '').trim().toLowerCase();
    const table = document.getElementById('table-semaforo-modern');
    if (!table) return;

    if (typeof TableManager !== 'undefined' && TableManager.filter) {
      TableManager.filter('table-semaforo-modern', q);
      return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr[data-search]'));
    let visibles = 0;
    rows.forEach(tr => {
      const searchData = tr.getAttribute('data-search') || tr.textContent.toLowerCase();
      const match = !q || searchData.includes(q);
      tr.style.display = match ? '' : 'none';
      if (match) visibles++;
    });

    let emptyRow = tbody.querySelector('.empty-filter-row');
    if (visibles === 0 && q) {
      if (!emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-filter-row';
        tbody.appendChild(emptyRow);
      }
      emptyRow.innerHTML = `<td colspan="7" class="py-8 text-center text-slate-400 text-xs">No se encontraron estudiantes para "${escapeHtml(q)}"</td>`;
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }

  /**
   * RENDER PRINCIPAL: Semáforo en Riesgo (Panel Administrador / Coordinador)
   */
  async function renderSemaforo(forzarRecarga = false) {
    const mount = document.getElementById('mount-semaforo');
    if (!mount) return;

    asegurarModalesSemaforo();

    if (forzarRecarga || !_semaforoDataCache) {
      const [data, modulos, accionesSeguimiento] = await Promise.all([
        computeSemaforo(),
        typeof Store !== 'undefined' ? Store.list('modulos') : [],
        cargarAccionesSeguimiento()
      ]);
      _semaforoDataCache = data;
      _semaforoModulosCache = modulos;
      _semaforoAccionesCache = accionesSeguimiento;
    }

    let data = _semaforoDataCache || [];
    let modulos = _semaforoModulosCache || [];
    const accionesSeguimiento = _semaforoAccionesCache || [];

    // Filtrado por permisos RBAC del usuario logueado
    if (typeof cohortesPermitidasParaUsuario === 'function' && typeof currentAdminUser !== 'undefined') {
      const permitidas = cohortesPermitidasParaUsuario(currentAdminUser);
      if (permitidas) {
        modulos = modulos.filter(m => permitidas.includes(m.nombre));
        data = data.filter(s => permitidas.includes(s.cohorte));
      }
    }

    const cohortes = Array.from(new Set([
      ...modulos.map(m => m.nombre).filter(Boolean),
      ...data.map(s => s.cohorte).filter(Boolean)
    ])).sort();

    if (semaforoCohorteFiltro && !cohortes.includes(semaforoCohorteFiltro)) {
      semaforoCohorteFiltro = '';
    }

    const dataFiltradaCohorte = semaforoCohorteFiltro
      ? data.filter(s => s.cohorte === semaforoCohorteFiltro)
      : data;

    const enRiesgo = dataFiltradaCohorte.filter(s => s.riesgo === 'Rojo');
    const enAlerta = dataFiltradaCohorte.filter(s => s.riesgo === 'Amarillo');
    const enVerde = dataFiltradaCohorte.filter(s => s.riesgo === 'Verde');

    const totalEstudiantes = dataFiltradaCohorte.length;
    const tasaSalud = totalEstudiantes > 0 ? Math.round((enVerde.length / totalEstudiantes) * 100) : 100;

    const dataFinal = semaforoRiesgoFiltro === 'todos'
      ? dataFiltradaCohorte
      : dataFiltradaCohorte.filter(s => s.riesgo === semaforoRiesgoFiltro);

    // Mapeo de filas de la tabla
    const rowsHtml = dataFinal.map(s => {
      const numAcciones = accionesSeguimiento.filter(a => a.estudiante_id === s.id || a.estudiante_nombre === s.nombre).length;
      return generarFilaSemaforo(s, numAcciones);
    }).join('');

    // Feed de estudiantes críticos prioritarios (top 4 en rojo)
    const alertasCriticas = enRiesgo.slice(0, 4);
    const feedAlertasHtml = alertasCriticas.length > 0
      ? alertasCriticas.map(s => `
          <div class="flex items-start justify-between gap-3 p-3 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition">
            <div class="flex items-start gap-2.5">
              <span class="w-2 h-2 mt-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
              <div>
                <p class="text-xs font-bold text-slate-800 leading-tight">${escapeHtml(s.nombre)}</p>
                <p class="text-[11px] text-slate-500">${escapeHtml(s.cohorte)} • <span class="text-rose-600 font-semibold">${escapeHtml(s.motivo)}</span></p>
              </div>
            </div>
            <button type="button" onclick="window.abrirModalAccionSeguimiento('${escapeHtml(s.id)}')" class="text-[11px] font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-100 px-2 py-1 rounded-md shrink-0 transition cursor-pointer">
              Atender
            </button>
          </div>
        `).join('')
      : `<p class="text-xs text-slate-400 py-4 text-center italic">No hay alertas críticas en esta selección.</p>`;

    mount.innerHTML = `
      <div class="space-y-6">
        <!-- Header con selector de cohorte y acciones -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-soft">
          <div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-morado animate-pulse"></div>
              <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Semáforo de Riesgo y Alertas Tempranas</h2>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-morado/10 text-morado">${totalEstudiantes} en cohorte</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Cálculo determinista en tiempo real con calificaciones ponderadas (escala 0.0 - 10.0) y asistencia institucional.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <label for="filtroSemaforoCohorte" class="text-xs font-bold text-slate-600">Cohorte:</label>
              <select id="filtroSemaforoCohorte" onchange="window.cambiarFiltroSemaforoCohorte(this.value)" class="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition cursor-pointer">
                <option value="">Todas las cohortes (${data.length})</option>
                ${cohortes.map(c => `
                  <option value="${escapeHtml(c)}" ${semaforoCohorteFiltro === c ? 'selected' : ''}>${escapeHtml(c)} (${data.filter(s => s.cohorte === c).length})</option>
                `).join('')}
              </select>
            </div>
            <button type="button" onclick="window.renderSemaforo(true)" title="Recargar datos en vivo" class="p-2 rounded-xl border border-gray-200 text-slate-600 hover:text-morado hover:bg-gray-50 transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
            <button type="button" onclick="window.exportarSemaforoCSV()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-gray-50 text-xs font-semibold transition cursor-pointer">
              <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <!-- Dashboard Analítico: KPIs + Donut Chart + Alertas Críticas -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Tarjetas KPI -->
          <div class="lg:col-span-4 grid grid-cols-2 gap-3.5">
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-soft">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Evaluados</span>
              <p class="text-2xl font-black text-slate-800 mt-1">${totalEstudiantes}</p>
              <div class="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>100% de la cohorte</span>
              </div>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-teal-100 shadow-soft bg-gradient-to-br from-white to-teal-50/30">
              <span class="text-xs font-bold text-teal-600 uppercase tracking-wider block">Salud Global</span>
              <p class="text-2xl font-black text-teal-600 mt-1">${tasaSalud}%</p>
              <div class="mt-2 flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>${enVerde.length} en buen camino</span>
              </div>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-rose-100 shadow-soft bg-gradient-to-br from-white to-rose-50/30">
              <span class="text-xs font-bold text-rose-600 uppercase tracking-wider block">Riesgo Alto</span>
              <p class="text-2xl font-black text-rose-600 mt-1">${enRiesgo.length}</p>
              <div class="mt-2 flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Intervención urgente</span>
              </div>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-amber-100 shadow-soft bg-gradient-to-br from-white to-amber-50/30">
              <span class="text-xs font-bold text-amber-600 uppercase tracking-wider block">Observación</span>
              <p class="text-2xl font-black text-amber-600 mt-1">${enAlerta.length}</p>
              <div class="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Monitoreo activo</span>
              </div>
            </div>
          </div>

          <!-- Gráfico Donut Interactivo -->
          <div class="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-soft flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Distribución de Riesgo</p>
              <span class="text-[11px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-full">Chart.js 4</span>
            </div>
            <div class="relative flex items-center justify-center my-auto" style="height: 170px;">
              <canvas id="chart-semaforo-admin"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-100">
              <button type="button" onclick="window.cambiarFiltroSemaforoRiesgo('Verde')" class="p-1 rounded-lg hover:bg-teal-50 transition cursor-pointer">
                <span class="block text-[10px] font-bold text-slate-400">Óptimo</span>
                <span class="text-xs font-extrabold text-teal-600">${enVerde.length}</span>
              </button>
              <button type="button" onclick="window.cambiarFiltroSemaforoRiesgo('Amarillo')" class="p-1 rounded-lg hover:bg-amber-50 transition cursor-pointer">
                <span class="block text-[10px] font-bold text-slate-400">Alerta</span>
                <span class="text-xs font-extrabold text-amber-600">${enAlerta.length}</span>
              </button>
              <button type="button" onclick="window.cambiarFiltroSemaforoRiesgo('Rojo')" class="p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer">
                <span class="block text-[10px] font-bold text-slate-400">Riesgo</span>
                <span class="text-xs font-extrabold text-rose-600">${enRiesgo.length}</span>
              </button>
            </div>
          </div>

          <!-- Feed de Alertas Críticas -->
          <div class="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-soft flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-700">Alertas Críticas</p>
              </div>
              <span class="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">${enRiesgo.length} caso${enRiesgo.length === 1 ? '' : 's'}</span>
            </div>
            <div class="space-y-2.5 overflow-y-auto max-h-[195px] pr-1">
              ${feedAlertasHtml}
            </div>
          </div>
        </div>

        <!-- Tabla Principal Filtrable -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" id="pill-semaforo-todos" onclick="window.cambiarFiltroSemaforoRiesgo('todos')" class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'todos' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}">
                Todos (${dataFiltradaCohorte.length})
              </button>
              <button type="button" id="pill-semaforo-rojo" onclick="window.cambiarFiltroSemaforoRiesgo('Rojo')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Rojo' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Rojo' ? 'bg-white' : 'bg-rose-500'}"></span>
                Riesgo Alto (${enRiesgo.length})
              </button>
              <button type="button" id="pill-semaforo-amarillo" onclick="window.cambiarFiltroSemaforoRiesgo('Amarillo')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Amarillo' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Amarillo' ? 'bg-white' : 'bg-amber-500'}"></span>
                Observación (${enAlerta.length})
              </button>
              <button type="button" id="pill-semaforo-verde" onclick="window.cambiarFiltroSemaforoRiesgo('Verde')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${semaforoRiesgoFiltro === 'Verde' ? 'bg-teal-600 text-white shadow-xs' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Verde' ? 'bg-white' : 'bg-teal-500'}"></span>
                Óptimo (${enVerde.length})
              </button>
            </div>

            <div class="relative">
              <input data-table="table-semaforo-modern" oninput="window.filtrarSemaforoLive(this.value)" type="text" placeholder="Buscar por nombre, motivo..." class="rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-1.5 text-xs sm:text-sm w-56 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <div class="table-responsive-container">
            <table id="table-semaforo-modern" class="w-full admin-table text-left">
              <thead>
                <tr class="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100">
                  <th class="py-3 px-4">Estudiante</th>
                  <th class="py-3 px-4">Cohorte</th>
                  <th class="py-3 px-4">Promedio (0-10)</th>
                  <th class="py-3 px-4">Asistencia</th>
                  <th class="py-3 px-4">Nivel Riesgo</th>
                  <th class="py-3 px-4">Diagnóstico</th>
                  <th class="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="7" class="text-sm text-slate-400 text-center py-8">No se encontraron estudiantes para los filtros actuales.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Inicializar TableManager si existe
    if (typeof TableManager !== 'undefined' && TableManager.init) {
      TableManager.init('table-semaforo-modern');
    }

    // Inicializar Chart.js Donut
    renderDonutChart('chart-semaforo-admin', enVerde.length, enAlerta.length, enRiesgo.length, false);
  }

  /**
   * RENDER DOCENTE: Semáforo en Riesgo adaptado a cohortes del profesor
   */
  async function renderRiesgoDocente(forzarRecarga = false) {
    const mount = document.getElementById('mount-t-riesgo');
    if (!mount) return;

    asegurarModalesSemaforo();

    let modulosDoc = [];
    if (typeof docenteModulosActivos === 'function') {
      modulosDoc = await docenteModulosActivos();
    } else if (typeof Store !== 'undefined') {
      modulosDoc = await Store.list('modulos');
    }

    const cohortes = Array.from(new Set(modulosDoc.map(m => m.nombre).filter(Boolean))).sort();

    if (forzarRecarga || !_semaforoDataCache) {
      const [dataTotal, accionesSeguimiento] = await Promise.all([
        computeSemaforo(),
        cargarAccionesSeguimiento()
      ]);
      _semaforoDataCache = dataTotal;
      _semaforoAccionesCache = accionesSeguimiento;
    }

    const dataTotal = _semaforoDataCache || [];
    const accionesSeguimiento = _semaforoAccionesCache || [];

    const dataSemaforo = dataTotal.filter(s => cohortes.includes(s.cohorte));
    const dataFiltrada = semaforoCohorteFiltro
      ? dataSemaforo.filter(s => s.cohorte === semaforoCohorteFiltro)
      : dataSemaforo;

    const enRiesgo = dataFiltrada.filter(s => s.riesgo === 'Rojo');
    const enAlerta = dataFiltrada.filter(s => s.riesgo === 'Amarillo');
    const enVerde = dataFiltrada.filter(s => s.riesgo === 'Verde');

    const rowsHtml = dataFiltrada.map(s => {
      const color = PALETA[s.riesgo === 'Rojo' ? 'rojo' : (s.riesgo === 'Amarillo' ? 'amarillo' : 'verde')];
      const iniciales = (s.nombre || 'E').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const numAcciones = accionesSeguimiento.filter(a => a.estudiante_id === s.id || a.estudiante_nombre === s.nombre).length;

      return `
        <tr data-search="${escapeHtml((s.nombre + ' ' + (s.cohorte || '') + ' ' + s.riesgo + ' ' + (s.motivo || '')).toLowerCase())}" class="border-b border-gray-100 hover:bg-slate-50/70 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0" style="background:${color.bg};color:${color.text}">
                ${escapeHtml(iniciales)}
              </div>
              <span class="text-xs sm:text-sm font-bold text-slate-800 truncate">${escapeHtml(s.nombre)}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-xs text-slate-600">${escapeHtml(s.cohorte || '—')}</td>
          <td class="py-3 px-4 text-xs sm:text-sm font-mono font-bold ${s.promedio !== '—' && parseFloat(s.promedio) < 6.0 ? 'text-rose-600' : 'text-slate-800'}">${s.promedio}</td>
          <td class="py-3 px-4 text-xs sm:text-sm font-mono font-bold ${s.asistencia !== '—' && parseInt(s.asistencia) < 80 ? 'text-rose-600' : 'text-slate-800'}">${s.asistencia === '—' ? '—' : s.asistencia + '%'}</td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${color.badge} border">
              <span class="w-1.5 h-1.5 rounded-full" style="background:${color.hex}"></span>
              ${s.riesgo}
            </span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">${escapeHtml(s.motivo)}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button type="button" onclick="window.verDetalleEstudianteSemaforo('${escapeHtml(s.id)}')" title="Ver Historial" class="p-1.5 rounded-lg border border-gray-200 text-slate-600 hover:text-turquesa hover:border-turquesa/40 transition cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
              <button type="button" onclick="window.abrirModalAccionSeguimiento('${escapeHtml(s.id)}')" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-turquesa text-white hover:bg-turquesa-dark transition shadow-xs cursor-pointer">
                <span>Registrar Acción</span>
                ${numAcciones > 0 ? `<span class="ml-0.5 px-1 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">${numAcciones}</span>` : ''}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    mount.innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-turquesa"></span>
              <h3 class="text-lg font-extrabold text-slate-900 tracking-tight">Semáforo de Riesgo Académico</h3>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-turquesa/10 text-turquesa">${dataFiltrada.length} alumnos</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Seguimiento preventivo para tus cohortes asignadas.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            ${cohortes.length > 1 ? `
              <div class="flex items-center gap-1.5">
                <label for="filtroDocenteRiesgoCohorte" class="text-xs font-semibold text-slate-600">Cohorte:</label>
                <select id="filtroDocenteRiesgoCohorte" onchange="window.cambiarFiltroSemaforoCohorte(this.value); window.renderRiesgoDocente();" class="rounded-xl border border-turquesa/25 bg-turquesa/5 px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition cursor-pointer">
                  <option value="">Todas mis cohortes (${dataSemaforo.length})</option>
                  ${cohortes.map(c => `
                    <option value="${escapeHtml(c)}" ${semaforoCohorteFiltro === c ? 'selected' : ''}>${escapeHtml(c)} (${dataSemaforo.filter(s => s.cohorte === c).length})</option>
                  `).join('')}
                </select>
              </div>
            ` : (cohortes.length === 1 ? `<span class="text-xs font-semibold px-3 py-1 bg-turquesa/10 text-turquesa rounded-xl border border-turquesa/20">Cohorte: ${escapeHtml(cohortes[0])}</span>` : '')}
            <div class="relative">
              <input data-table="table-docente-riesgo-modern" oninput="typeof TableManager !== 'undefined' && TableManager.filter('table-docente-riesgo-modern', this.value)" type="text" placeholder="Buscar alumno..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs sm:text-sm w-44 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
              <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>
        </div>

        <!-- Mini resumen de impacto -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 text-center">
            <span class="text-[11px] font-bold text-teal-700 uppercase">Óptimo</span>
            <p class="text-xl font-black text-teal-600 mt-0.5">${enVerde.length}</p>
          </div>
          <div class="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 text-center">
            <span class="text-[11px] font-bold text-amber-700 uppercase">Observación</span>
            <p class="text-xl font-black text-amber-600 mt-0.5">${enAlerta.length}</p>
          </div>
          <div class="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 text-center">
            <span class="text-[11px] font-bold text-rose-700 uppercase">En Riesgo</span>
            <p class="text-xl font-black text-rose-600 mt-0.5">${enRiesgo.length}</p>
          </div>
        </div>

        <div class="table-responsive-container">
          <table id="table-docente-riesgo-modern" class="w-full admin-table text-left">
            <thead>
              <tr class="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100">
                <th class="py-2.5 px-4">Estudiante</th>
                <th class="py-2.5 px-4">Cohorte</th>
                <th class="py-2.5 px-4">Promedio</th>
                <th class="py-2.5 px-4">Asistencia</th>
                <th class="py-2.5 px-4">Riesgo</th>
                <th class="py-2.5 px-4">Diagnóstico</th>
                <th class="py-2.5 px-4 text-right">Intervención</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" class="text-sm text-slate-400 text-center py-6">Aún no tienes estudiantes registrados en esta cohorte.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (typeof TableManager !== 'undefined' && TableManager.init) {
      TableManager.init('table-docente-riesgo-modern');
    }
  }

  /**
   * Renderiza el gráfico Donut con Chart.js
   */
  function renderDonutChart(canvasId, verde, amarillo, rojo, esDocente = false) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (esDocente && donutChartDocente) {
      donutChartDocente.destroy();
      donutChartDocente = null;
    } else if (!esDocente && donutChartAdmin) {
      donutChartAdmin.destroy();
      donutChartAdmin = null;
    }

    const total = verde + amarillo + rojo;
    const dataVals = total === 0 ? [1] : [verde, amarillo, rojo];
    const dataColors = total === 0 ? ['#E2E8F0'] : [PALETA.verde.hex, PALETA.amarillo.hex, PALETA.rojo.hex];

    const chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: total === 0 ? ['Sin datos'] : ['Óptimo (Verde)', 'Observación (Amarillo)', 'Riesgo Alto (Rojo)'],
        datasets: [{
          data: dataVals,
          backgroundColor: dataColors,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: total > 0,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const val = context.raw || 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    if (esDocente) donutChartDocente = chartInstance;
    else donutChartAdmin = chartInstance;
  }

  /**
   * Carga la bitácora de intervenciones tutoriales desde MySQL
   */
  async function cargarAccionesSeguimiento(estudianteId = '') {
    try {
      const q = estudianteId ? ('?estudiante_id=' + encodeURIComponent(estudianteId)) : '';
      if (typeof apiFetch === 'function') {
        const datos = await apiFetch('seguimiento_alertas' + q);
        return Array.isArray(datos) ? datos : [];
      }
      if (typeof Store !== 'undefined' && Store.list) {
        return await Store.list('seguimiento_alertas');
      }
    } catch (e) {
      console.warn('[cargarAccionesSeguimiento] Error al cargar bitácora:', e);
    }
    return [];
  }

  /**
   * Abre el Drawer Master-Detail con la evolución y diagnóstico del estudiante
   */
  async function verDetalleEstudianteSemaforo(estudianteId) {
    asegurarModalesSemaforo();
    const drawer = document.getElementById('drawer-estudiante-semaforo');
    const content = document.getElementById('drawer-estudiante-content');
    if (!drawer || !content) return;

    let data = _semaforoDataCache;
    if (!data || !data.length) {
      data = await computeSemaforo();
      _semaforoDataCache = data;
    }

    const estudiante = data.find(s => String(s.id) === String(estudianteId) || s.nombre === estudianteId);
    if (!estudiante) {
      notificar('No se encontró el estudiante especificado', 'err');
      return;
    }

    estudianteSeleccionadoDetalle = estudiante;
    const acciones = await cargarAccionesSeguimiento(estudiante.id);
    const color = PALETA[estudiante.riesgo === 'Rojo' ? 'rojo' : (estudiante.riesgo === 'Amarillo' ? 'amarillo' : 'verde')];
    const iniciales = (estudiante.nombre || 'E').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const accionesHtml = acciones.length > 0
      ? acciones.map(a => `
          <div class="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-morado">${escapeHtml(a.tipo_accion || 'Intervención')}</span>
              <span class="text-[10px] text-slate-400 font-mono">${(a.created_at || '').substring(0, 10)}</span>
            </div>
            <p class="text-xs text-slate-700">${escapeHtml(a.observaciones || '')}</p>
            ${a.compromiso ? `
              <div class="p-2 rounded-lg bg-white border border-gray-200/80 text-[11px] text-slate-600">
                <span class="font-bold text-slate-800">Compromiso:</span> ${escapeHtml(a.compromiso)}
                ${a.fecha_compromiso ? `<span class="block text-[10px] text-amber-700 font-semibold mt-0.5">Límite: ${escapeHtml(a.fecha_compromiso)}</span>` : ''}
              </div>
            ` : ''}
            <div class="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>Por: ${escapeHtml(a.docente || 'Tutor')}</span>
              <span class="font-bold px-2 py-0.5 rounded-full ${a.estado === 'Resuelto' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}">${escapeHtml(a.estado || 'En seguimiento')}</span>
            </div>
          </div>
        `).join('')
      : `<p class="text-xs text-slate-400 text-center py-6 italic">No hay intervenciones tutoriales registradas aún.</p>`;

    content.innerHTML = `
      <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm" style="background:${color.bg};color:${color.text};border:1px solid ${color.hex}44">
            ${escapeHtml(iniciales)}
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900 leading-tight">${escapeHtml(estudiante.nombre)}</h3>
            <p class="text-xs text-slate-500">${escapeHtml(estudiante.cohorte || 'Sin cohorte')} • ${escapeHtml(estudiante.email || '')}</p>
          </div>
        </div>
        <button type="button" onclick="window.cerrarDetalleEstudianteSemaforo()" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition cursor-pointer">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto flex-1">
        <!-- Tarjeta de Estado Actual -->
        <div class="p-4 rounded-2xl border ${color.badge}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider">Diagnóstico de Riesgo</span>
            <span class="text-xs font-black uppercase">${estudiante.riesgo}</span>
          </div>
          <p class="text-xs font-medium mt-1 leading-snug">${escapeHtml(estudiante.motivo)}</p>
          <div class="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-current/10">
            <div>
              <span class="text-[10px] font-bold uppercase opacity-80">Promedio General</span>
              <p class="text-xl font-black font-mono">${estudiante.promedio} / 10.0</p>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase opacity-80">Asistencia Acumulada</span>
              <p class="text-xl font-black font-mono">${estudiante.asistencia === '—' ? '—' : estudiante.asistencia + '%'}</p>
            </div>
          </div>
        </div>

        <!-- Botón para Registrar Acción Inmediata -->
        <button type="button" onclick="window.abrirModalAccionSeguimiento('${escapeHtml(estudiante.id)}')" class="w-full py-2.5 rounded-xl bg-morado text-white hover:bg-morado-dark text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>Nueva Intervención Tutorial</span>
        </button>

        <!-- Bitácora de Intervenciones -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Bitácora de Intervenciones (${acciones.length})</h4>
            <span class="text-[10px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-full">MySQL</span>
          </div>
          <div class="space-y-2.5">
            ${accionesHtml}
          </div>
        </div>
      </div>
    `;

    drawer.classList.remove('hidden');
    requestAnimationFrame(() => {
      drawer.classList.remove('pointer-events-none', 'opacity-0');
      drawer.classList.add('opacity-100');
      content.classList.remove('translate-x-full');
    });
  }

  /**
   * Cierra el Drawer Master-Detail
   */
  function cerrarDetalleEstudianteSemaforo() {
    const drawer = document.getElementById('drawer-estudiante-semaforo');
    const content = document.getElementById('drawer-estudiante-content');
    if (content) content.classList.add('translate-x-full');
    if (drawer) {
      drawer.classList.remove('opacity-100');
      drawer.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        if (drawer && drawer.classList.contains('opacity-0')) {
          drawer.classList.add('hidden');
        }
      }, 300);
    }
  }

  /**
   * Abre el Modal para registrar acción tutorial
   */
  async function abrirModalAccionSeguimiento(estudianteId) {
    asegurarModalesSemaforo();
    const modal = document.getElementById('modal-accion-seguimiento');
    if (!modal) return;

    let data = _semaforoDataCache;
    if (!data || !data.length) {
      data = await computeSemaforo();
      _semaforoDataCache = data;
    }

    const estudiante = data.find(s => String(s.id) === String(estudianteId) || s.nombre === estudianteId);
    if (!estudiante) {
      notificar('No se encontró el estudiante para registrar acción', 'err');
      return;
    }

    let emailEstudiante = estudiante.email || '';
    if (!emailEstudiante && typeof Store !== 'undefined' && Store.list) {
      try {
        const todosUsr = await Store.list('usuarios');
        const usrEncontrado = (todosUsr || []).find(u => String(u.id) === String(estudiante.id) || u.nombre === estudiante.nombre);
        if (usrEncontrado && usrEncontrado.email) {
          emailEstudiante = usrEncontrado.email;
        }
      } catch (e) {}
    }

    document.getElementById('seg-estudiante-id').value = estudiante.id;
    document.getElementById('seg-estudiante-nombre').value = estudiante.nombre;
    const inputEmail = document.getElementById('seg-estudiante-email');
    if (inputEmail) inputEmail.value = emailEstudiante;
    const lblEmail = document.getElementById('seg-estudiante-email-label');
    if (lblEmail) {
      lblEmail.textContent = emailEstudiante ? `Correo destino: ${emailEstudiante}` : 'Sin correo electrónico registrado en ficha';
    }
    document.getElementById('seg-cohorte').value = estudiante.cohorte;
    document.getElementById('seg-tipo-accion').value = 'Llamada / Contacto acudiente';
    document.getElementById('seg-estado').value = 'En seguimiento';
    document.getElementById('seg-observaciones').value = '';
    document.getElementById('seg-compromiso').value = '';
    document.getElementById('seg-fecha-compromiso').value = '';

    const chkNotif = document.getElementById('seg-notificar-estudiante');
    if (chkNotif) chkNotif.checked = true;

    actualizarAyudaCompromiso('Llamada / Contacto acudiente');

    modal.classList.remove('hidden');
  }

  /**
   * Adapta la guía y placeholder del compromiso según el tipo de acción tutorial
   */
  function actualizarAyudaCompromiso(tipo) {
    const lblAyuda = document.getElementById('seg-compromiso-ayuda');
    const inputComp = document.getElementById('seg-compromiso');
    if (!lblAyuda || !inputComp) return;

    switch (tipo) {
      case 'Remisión psicosocial':
        lblAyuda.textContent = 'Indica el acuerdo o la cita de orientación acordada con el estudiante (ej. Asistir a valoración con Bienestar/Psicología este viernes a las 10:00 AM).';
        inputComp.placeholder = 'Ej: Asistir a sesión de orientación psicosocial con Bienestar';
        break;
      case 'Compromiso académico':
        lblAyuda.textContent = 'Pacto académico que el estudiante asume para nivelar su promedio o entregar tareas atrasadas.';
        inputComp.placeholder = 'Ej: Entregar taller 2 pendiente y repasar módulo antes del examen';
        break;
      case 'Plan de nivelación':
        lblAyuda.textContent = 'Detalle de la actividad o examen de recuperación acordado con el docente para aprobar el módulo.';
        inputComp.placeholder = 'Ej: Presentar guía de recuperación y evaluación de refuerzo';
        break;
      case 'Llamada / Contacto acudiente':
        lblAyuda.textContent = 'Acuerdo pactado con el padre de familia o acudiente para solucionar la causa de inasistencia o notas.';
        inputComp.placeholder = 'Ej: Acudiente enviará soporte médico y supervisará asistencia virtual';
        break;
      case 'Notificación formal de inasistencia':
        lblAyuda.textContent = 'Compromiso de asistencia inmediata para evitar la pérdida del cupo institucional.';
        inputComp.placeholder = 'Ej: Asistir puntualmente a las próximas 4 sesiones sin faltas';
        break;
      default:
        lblAyuda.textContent = 'Si durante el diálogo se pactó una meta o tarea correctiva con el estudiante, regístrala para hacerle seguimiento.';
        inputComp.placeholder = 'Ej: Asistir a asesoría individual y entregar actividades';
    }
  }

  /**
   * Cierra el Modal de registrar acción tutorial
   */
  function cerrarModalAccionSeguimiento() {
    const modal = document.getElementById('modal-accion-seguimiento');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Envía la notificación formal de la intervención tutorial al correo del estudiante
   * Utiliza EmailJS (desde navegador) y Backend PHP (/api/enviar_correo) como respaldo
   */
  async function notificarIntervencionEstudiantePorCorreo(params = {}) {
    const destinatarioEmail = (params.estudianteEmail || '').trim();
    const destinatarioNombre = (params.estudianteNombre || 'Estudiante').trim();
    if (!destinatarioEmail || !destinatarioEmail.includes('@')) {
      console.warn('[notificarIntervencionEstudiantePorCorreo] Estudiante sin correo válido:', destinatarioEmail);
      return { ok: false, error: 'Sin correo' };
    }

    let cfg = {};
    if (typeof Store !== 'undefined' && Store.get) {
      try { cfg = (await Store.get('configuracion')) || {}; } catch (e) {}
    }

    const nombreFundacion = cfg.nombre || 'Fundación A+';
    const emailFundacion = cfg.correo || 'info@fundacionamas.org.co';
    const tipoAccion = params.tipoAccion || 'Acompañamiento Tutorial';
    const observaciones = params.observaciones || '';
    const compromiso = params.compromiso || '';
    const fechaCompromiso = params.fechaCompromiso || '';
    const estado = params.estado || 'En seguimiento';
    const tutor = params.tutor || 'Tutor Académico';
    const cohorte = params.cohorte || '';

    const asunto = `[${nombreFundacion}] Notificación de Seguimiento Académico: ${tipoAccion}`;

    const mensajeTexto = `Hola ${destinatarioNombre},\n\n` +
      `Te informamos que se ha registrado una intervención tutorial en tu ficha de seguimiento académico:\n\n` +
      `• Tipo de Acción: ${tipoAccion}\n` +
      `• Cohorte: ${cohorte || 'General'}\n` +
      `• Tutor Responsable: ${tutor}\n` +
      `• Diagnóstico / Observaciones: ${observaciones}\n` +
      (compromiso ? `• Compromiso Acordado: ${compromiso}\n` : '') +
      (fechaCompromiso ? `• Fecha Límite de Cumplimiento: ${fechaCompromiso}\n` : '') +
      `• Estado Actual: ${estado}\n\n` +
      `Recuerda que este acompañamiento busca brindarte el apoyo necesario para tu permanencia y éxito formativo.\n` +
      `Si tienes alguna inquietud o dificultad, responde a este correo o comunícate con tu tutor.\n\n` +
      `Atentamente,\nEquipo Académico — ${nombreFundacion}`;

    const mensajeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">${escapeHtml(nombreFundacion)}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Acompañamiento Tutorial y Permanencia Estudiantil</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px; margin-top: 0;">Estimado(a) <strong>${escapeHtml(destinatarioNombre)}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">Se ha registrado una intervención de seguimiento académico en tu ficha con el fin de apoyarte en tu proceso formativo:</p>
          
          <div style="background: #f8fafc; border-left: 4px solid #7c3aed; padding: 14px 16px; margin: 18px 0; border-radius: 0 10px 10px 0; font-size: 13px;">
            <p style="margin: 0 0 6px 0;"><strong>Tipo de Acción:</strong> ${escapeHtml(tipoAccion)}</p>
            <p style="margin: 0 0 6px 0;"><strong>Cohorte:</strong> ${escapeHtml(cohorte || 'No especificada')}</p>
            <p style="margin: 0 0 6px 0;"><strong>Tutor Responsable:</strong> ${escapeHtml(tutor)}</p>
            <p style="margin: 0;"><strong>Estado:</strong> <span style="background: #ede9fe; color: #6d28d9; padding: 2px 8px; border-radius: 6px; font-weight: 600;">${escapeHtml(estado)}</span></p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <strong style="color: #334155; display: block; margin-bottom: 6px;">Observaciones / Diagnóstico:</strong>
            <p style="margin: 0; color: #475569; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(observaciones)}</p>
          </div>

          ${compromiso ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
              <strong style="color: #1e40af; display: block; margin-bottom: 4px;">Pacto o Compromiso de Mejora:</strong>
              <p style="margin: 0 0 6px 0; color: #1e3a8a; font-weight: 500;">${escapeHtml(compromiso)}</p>
              ${fechaCompromiso ? `<p style="margin: 0; font-size: 12px; color: #2563eb;"><strong>Fecha Límite:</strong> ${escapeHtml(fechaCompromiso)}</p>` : ''}
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 20px;">
            En la Fundación A+ creemos en tu potencial y estamos comprometidos con tu crecimiento. Si requieres orientación adicional, por favor acércate a tu docente o responde directamente a este correo institucional.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          ${escapeHtml(nombreFundacion)} • ${escapeHtml(emailFundacion)} • Quibdó, Colombia
        </div>
      </div>
    `;

    // --- VÍA 1: EMAILJS (Navegador) ---
    let emailJsOk = false;
    try {
      const pubKey = cfg.emailjsPublicKey || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.publicKey : 'eIyshGVkR2fYZQJfO');
      const srvId = cfg.emailjsServiceId || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.serviceId : 'service_20mxfgu');
      const tmplId = cfg.emailjsTemplateId || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.templateId : 'template_qvmzl1l');

      if (typeof emailjs !== 'undefined' && pubKey && srvId && tmplId) {
        if (typeof asegurarEmailJsInicializado === 'function') asegurarEmailJsInicializado(pubKey);
        else if (typeof emailjs.init === 'function') emailjs.init({ publicKey: pubKey });

        await emailjs.send(srvId, tmplId, {
          to_email: destinatarioEmail,
          email: destinatarioEmail,
          user_email: destinatarioEmail,
          to_name: destinatarioNombre,
          name: destinatarioNombre,
          subject: asunto,
          asunto: asunto,
          message: mensajeTexto,
          mensaje: mensajeTexto,
          html_message: mensajeHtml,
          message_html: mensajeHtml,
          reply_to: emailFundacion,
          from_name: nombreFundacion,
          organization: nombreFundacion
        });
        emailJsOk = true;
        console.log(`[notificarIntervencionEstudiantePorCorreo] EmailJS enviado exitosamente a ${destinatarioEmail}`);
      }
    } catch (eEmailJs) {
      console.warn('[notificarIntervencionEstudiantePorCorreo] EmailJS aviso/error:', eEmailJs.message || eEmailJs);
    }

    // --- VÍA 2: BACKEND PHP /api/enviar_correo (SMTP) ---
    let smtpOk = false;
    try {
      const tokenSesion = typeof getAuthToken === 'function' ? getAuthToken() : (typeof localStorage !== 'undefined' ? (localStorage.getItem(typeof DB_PREFIX_TOKEN !== 'undefined' ? DB_PREFIX_TOKEN + 'authToken' : 'fundacion_authToken') || '') : '');
      const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
      const resp = await fetch(baseUrl + '/api/enviar_correo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenSesion ? { 'Authorization': 'Bearer ' + tokenSesion } : {})
        },
        body: JSON.stringify({
          destinatarioEmail: destinatarioEmail,
          destinatarioNombre: destinatarioNombre,
          asunto: asunto,
          mensaje: mensajeTexto,
          mensajeHtml: mensajeHtml
        })
      });
      if (resp.ok) {
        smtpOk = true;
        console.log(`[notificarIntervencionEstudiantePorCorreo] SMTP backend enviado a ${destinatarioEmail}`);
      }
    } catch (eSmtp) {
      console.warn('[notificarIntervencionEstudiantePorCorreo] SMTP backend aviso/error:', eSmtp.message || eSmtp);
    }

    if (emailJsOk || smtpOk) {
      const canales = [];
      if (emailJsOk) canales.push('EmailJS');
      if (smtpOk) canales.push('SMTP');
      if (typeof notificar === 'function') {
        notificar(`Notificación enviada al correo de ${destinatarioNombre} (${destinatarioEmail})`, 'ok');
      }
      return { ok: true, canales };
    }
    return { ok: false };
  }

  /**
   * Guarda la acción tutorial en la base de datos MySQL (tabla seguimiento_alertas)
   */
  async function guardarAccionSeguimiento(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = document.getElementById('btn-guardar-seguimiento');
    if (btn) btn.disabled = true;

    const estId = document.getElementById('seg-estudiante-id').value;
    const estEmail = document.getElementById('seg-estudiante-email') ? document.getElementById('seg-estudiante-email').value : '';
    const estNombre = document.getElementById('seg-estudiante-nombre').value;
    const cohorte = document.getElementById('seg-cohorte').value;
    const tipoAccion = document.getElementById('seg-tipo-accion').value;
    const estado = document.getElementById('seg-estado').value;
    const observaciones = document.getElementById('seg-observaciones').value.trim();
    const compromiso = document.getElementById('seg-compromiso').value.trim();
    const fechaCompromiso = document.getElementById('seg-fecha-compromiso').value;
    const notificarEstudiante = document.getElementById('seg-notificar-estudiante') ? document.getElementById('seg-notificar-estudiante').checked : true;

    if (!observaciones) {
      notificar('Las observaciones son obligatorias', 'err');
      if (btn) btn.disabled = false;
      return;
    }

    const payload = {
      id: 'seg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      estudiante_id: estId,
      estudiante_nombre: estNombre,
      estudiante_email: estEmail,
      cohorte: cohorte,
      tipo_accion: tipoAccion,
      observaciones: observaciones,
      compromiso: compromiso,
      fecha_compromiso: fechaCompromiso || null,
      estado: estado,
      notificar: notificarEstudiante
    };

    try {
      if (typeof apiFetch === 'function') {
        await apiFetch('seguimiento_alertas', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else if (typeof Store !== 'undefined' && Store.add) {
        await Store.add('seguimiento_alertas', payload);
      }
      notificar('Intervención guardada exitosamente en MySQL', 'ok');

      // Envío al correo electrónico del estudiante si la casilla está marcada
      if (notificarEstudiante && estEmail) {
        let tutorNom = 'Tutor Académico';
        if (typeof currentAdminUser !== 'undefined' && currentAdminUser && (currentAdminUser.nombre || currentAdminUser.email)) {
          tutorNom = currentAdminUser.nombre || currentAdminUser.email;
        } else if (typeof getSesionUsuario === 'function') {
          const ses = getSesionUsuario();
          if (ses && (ses.nombre || ses.email)) tutorNom = ses.nombre || ses.email;
        }

        notificarIntervencionEstudiantePorCorreo({
          estudianteEmail: estEmail,
          estudianteNombre: estNombre,
          cohorte: cohorte,
          tipoAccion: tipoAccion,
          observaciones: observaciones,
          compromiso: compromiso,
          fechaCompromiso: fechaCompromiso,
          estado: estado,
          tutor: tutorNom
        }).catch(errMail => console.warn('[guardarAccionSeguimiento] Envío email diferido:', errMail));
      }

      cerrarModalAccionSeguimiento();

      // Invalidar cache de acciones
      _semaforoAccionesCache = null;

      // Si el drawer lateral está abierto para este estudiante, refrescarlo
      if (estudianteSeleccionadoDetalle && String(estudianteSeleccionadoDetalle.id) === String(estId)) {
        await verDetalleEstudianteSemaforo(estId);
      }

      // Refrescar semáforo principal o docente
      if (document.getElementById('mount-semaforo')) await renderSemaforo(true);
      if (document.getElementById('mount-t-riesgo')) await renderRiesgoDocente(true);
    } catch (err) {
      console.error('[guardarAccionSeguimiento] Error:', err);
      notificar('Error al guardar la intervención: ' + err.message, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Exporta a CSV el semáforo con filtros activos
   * Incluye BOM UTF-8 (\uFEFF) y separador punto y coma (;) para compatibilidad perfecta con Excel en español.
   */
  async function exportarSemaforoCSV() {
    let data = _semaforoDataCache;
    if (!data || !data.length) {
      data = await computeSemaforo();
      _semaforoDataCache = data;
    }

    let dataFiltrada = semaforoCohorteFiltro
      ? data.filter(s => s.cohorte === semaforoCohorteFiltro)
      : data;

    if (semaforoRiesgoFiltro && semaforoRiesgoFiltro !== 'todos') {
      dataFiltrada = dataFiltrada.filter(s => s.riesgo === semaforoRiesgoFiltro);
    }

    if (!dataFiltrada.length) {
      notificar('No hay datos para exportar con los filtros seleccionados', 'err');
      return;
    }

    const separador = ';';
    const encabezados = ['Estudiante', 'Cohorte', 'Promedio (0-10)', 'Asistencia %', 'Nivel de Riesgo', 'Diagnóstico'];

    const limpiarCampo = (v) => {
      if (v === null || v === undefined || v === '—') return '""';
      const limpio = String(v).replace(/"/g, '""');
      return `"${limpio}"`;
    };

    const filas = dataFiltrada.map(r => {
      const prom = (r.promedio === '—' || !r.promedio) ? 'Sin calificaciones' : String(r.promedio);
      const asis = (r.asistencia === '—' || r.asistencia === null || r.asistencia === undefined) ? 'Sin registros' : (String(r.asistencia) + '%');
      const nivel = r.riesgo === 'Rojo' ? 'Riesgo Alto' : (r.riesgo === 'Amarillo' ? 'Observación' : 'Óptimo');
      const diag = r.motivo || 'Desempeño y asistencia óptimos';

      return [
        limpiarCampo(r.nombre),
        limpiarCampo(r.cohorte || 'Sin cohorte'),
        limpiarCampo(prom),
        limpiarCampo(asis),
        limpiarCampo(nivel),
        limpiarCampo(diag)
      ].join(separador);
    });

    const csvContent = '\uFEFF' + [encabezados.map(h => `"${h}"`).join(separador), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sufijoCohorte = semaforoCohorteFiltro ? '_' + semaforoCohorteFiltro.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const sufijoRiesgo = semaforoRiesgoFiltro !== 'todos' ? '_' + semaforoRiesgoFiltro.toLowerCase() : '';
    a.href = url;
    a.download = `semaforo_alertas_${new Date().toISOString().slice(0, 10)}${sufijoCohorte}${sufijoRiesgo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notificar('Archivo CSV exportado exitosamente con compatibilidad Excel', 'ok');
  }

  // ---------------------------------------------------------------------------
  // Exposición de API Global
  // ---------------------------------------------------------------------------
  window.computeSemaforo = computeSemaforo;
  window.renderSemaforo = renderSemaforo;
  window.renderRiesgoDocente = renderRiesgoDocente;
  window.cambiarFiltroSemaforoCohorte = cambiarFiltroSemaforoCohorte;
  window.cambiarFiltroSemaforoRiesgo = cambiarFiltroSemaforoRiesgo;
  window.filtrarSemaforoLive = filtrarSemaforoLive;
  window.verDetalleEstudianteSemaforo = verDetalleEstudianteSemaforo;
  window.cerrarDetalleEstudianteSemaforo = cerrarDetalleEstudianteSemaforo;
  window.abrirModalAccionSeguimiento = abrirModalAccionSeguimiento;
  window.cerrarModalAccionSeguimiento = cerrarModalAccionSeguimiento;
  window.guardarAccionSeguimiento = guardarAccionSeguimiento;
  window.exportarSemaforoCSV = exportarSemaforoCSV;
  window.asegurarModalesSemaforo = asegurarModalesSemaforo;

})();
