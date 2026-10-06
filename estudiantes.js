/**
 * estudiantes.js — Portal del Estudiante, Calificaciones, Seguimiento y PQR
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Perfil del estudiante (avatar, biografía, talentos y habilidades)
 * 2. Resumen académico, métricas de avance y frases motivacionales dinámicas
 * 3. Consulta de calificaciones por módulo y corte mensual con escala oficial (A-F)
 * 4. Control de asistencia personal, registro de tardanzas y radicación de justificaciones
 * 5. Visualización del pensum académico por cohorte y descarga del programa
 * 6. Buzón de memorandos y reconocimientos institucionales recibidos
 * 7. Sistema de peticiones, quejas y reclamos (PQR) con soporte documental en PDF
 * 8. Agenda estudiantil de eventos y entregas
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  let currentEstudiante = null;
  let currentDocente = null;
  const getEstudiante = () => {
    if (typeof window !== 'undefined') {
      if (typeof window.getCurrentEstudiante === 'function') {
        const e = window.getCurrentEstudiante();
        if (e && (e.nombre || e.email || e.id)) {
          currentEstudiante = e;
          return e;
        }
      }
      if (window.currentEstudiante && (window.currentEstudiante.nombre || window.currentEstudiante.email || window.currentEstudiante.id)) {
        currentEstudiante = window.currentEstudiante;
        return window.currentEstudiante;
      }
    }
    if (!currentEstudiante && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('fundacion_current_estudiante');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.nombre || parsed.email || parsed.id)) {
            currentEstudiante = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return currentEstudiante || {};
  };
  const setEstudiante = (e) => {
    currentEstudiante = e;
    if (typeof window !== 'undefined') {
      window.currentEstudiante = e;
      if (typeof window.setCurrentEstudiante === 'function') window.setCurrentEstudiante(e);
    }
    if (typeof localStorage !== 'undefined' && e) {
      try { localStorage.setItem('fundacion_current_estudiante', JSON.stringify(e)); } catch (_) {}
    }
  };
  if (typeof window !== 'undefined') {
    const prevSetCurrentEstudiante = window.setCurrentEstudiante;
    window.setCurrentEstudiante = (e) => {
      currentEstudiante = e;
      if (typeof prevSetCurrentEstudiante === 'function') prevSetCurrentEstudiante(e);
    };
  }
  const getDocente = () => (typeof window !== 'undefined' && typeof window.getCurrentDocente === 'function' ? window.getCurrentDocente() : (typeof window !== 'undefined' && window.currentDocente ? window.currentDocente : currentDocente));
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : 'superadmin');

  const promedioGeneralEstudianteCohorte = async (estudiante, cohorte, mes) => {
    if (typeof window !== 'undefined' && typeof window.promedioGeneralEstudianteCohorte === 'function') {
      return await window.promedioGeneralEstudianteCohorte(estudiante, cohorte, mes);
    }
    return null;
  };

  const ICON_CLIP_SVG = (typeof window !== 'undefined' && window.ICON_CLIP_SVG) ? window.ICON_CLIP_SVG : '<svg class="w-3.5 h-3.5 inline-block shrink-0 align-middle mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>';
  const uid = (prefix) => (typeof window !== 'undefined' && typeof window.uid === 'function') ? window.uid(prefix) : (prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  const initTablesEnPanel = (...args) => (typeof window !== 'undefined' && typeof window.initTablesEnPanel === 'function') ? window.initTablesEnPanel(...args) : null;
  const expandirFotoPerfil = (...args) => (typeof window !== 'undefined' && typeof window.expandirFotoPerfil === 'function') ? window.expandirFotoPerfil(...args) : null;
  const calcularNotaFinal = (...args) => (typeof window !== 'undefined' && typeof window.calcularNotaFinal === 'function') ? window.calcularNotaFinal(...args) : null;
  const calificacionCualitativa = (...args) => (typeof window !== 'undefined' && typeof window.calificacionCualitativa === 'function') ? window.calificacionCualitativa(...args) : '';
  const letraEscalaNota = (...args) => (typeof window !== 'undefined' && typeof window.letraEscalaNota === 'function') ? window.letraEscalaNota(...args) : '—';
  const colorCualitativa = (...args) => (typeof window !== 'undefined' && typeof window.colorCualitativa === 'function') ? window.colorCualitativa(...args) : '#5B6472';
  const mesActualParaDocenteCohorte = (...args) => (typeof window !== 'undefined' && typeof window.mesActualParaDocenteCohorte === 'function') ? window.mesActualParaDocenteCohorte(...args) : new Date().toISOString().slice(0, 7);
  const getSlotsDocente = async (...args) => (typeof window !== 'undefined' && typeof window.getSlotsDocente === 'function') ? await window.getSlotsDocente(...args) : [];
  const docentesDeCohorte = async (...args) => (typeof window !== 'undefined' && typeof window.docentesDeCohorte === 'function') ? await window.docentesDeCohorte(...args) : [];
  const docenteEstudiantesDeCohorte = async (...args) => (typeof window !== 'undefined' && typeof window.docenteEstudiantesDeCohorte === 'function') ? await window.docenteEstudiantesDeCohorte(...args) : [];
  const mesLabel = (...args) => (typeof window !== 'undefined' && typeof window.mesLabel === 'function') ? window.mesLabel(...args) : (args[0] || '');
  const fechaHoyLocal = () => (typeof window !== 'undefined' && typeof window.fechaHoyLocal === 'function') ? window.fechaHoyLocal() : new Date().toISOString().slice(0, 10);
  const sincronizarAusentesSesion = async (...args) => (typeof window !== 'undefined' && typeof window.sincronizarAusentesSesion === 'function') ? await window.sincronizarAusentesSesion(...args) : null;
  const minutosTranscurridos = (...args) => (typeof window !== 'undefined' && typeof window.minutosTranscurridos === 'function') ? window.minutosTranscurridos(...args) : 0;
  const estadoVentanaSesion = (...args) => (typeof window !== 'undefined' && typeof window.estadoVentanaSesion === 'function') ? window.estadoVentanaSesion(...args) : { estado: 'Inactiva' };
  const validarTokenSesionConGracia = async (...args) => (typeof window !== 'undefined' && typeof window.validarTokenSesionConGracia === 'function') ? await window.validarTokenSesionConGracia(...args) : { valido: false };
  const estadoPorTiempo = (...args) => (typeof window !== 'undefined' && typeof window.estadoPorTiempo === 'function') ? window.estadoPorTiempo(...args) : 'Presente';
  const VENTANA_PUNTUAL_MIN = (typeof window !== 'undefined' && window.VENTANA_PUNTUAL_MIN) ? window.VENTANA_PUNTUAL_MIN : 20;
  const VENTANA_TARDE_MIN = (typeof window !== 'undefined' && window.VENTANA_TARDE_MIN) ? window.VENTANA_TARDE_MIN : 50;
  const franjasActivas = (...args) => (typeof window !== 'undefined' && typeof window.franjasActivas === 'function') ? window.franjasActivas(...args) : [];
  const minutosDesdeHora = (...args) => (typeof window !== 'undefined' && typeof window.minutosDesdeHora === 'function') ? window.minutosDesdeHora(...args) : 0;
  const horasFranja = (...args) => (typeof window !== 'undefined' && typeof window.horasFranja === 'function') ? window.horasFranja(...args) : 0;
  const seedIfEmpty = async () => (typeof window !== 'undefined' && typeof window.seedIfEmpty === 'function') ? await window.seedIfEmpty() : null;
  const updateMemorandosBadge = async () => (typeof window !== 'undefined' && typeof window.updateMemorandosBadge === 'function') ? await window.updateMemorandosBadge() : null;
  const permisoUsuarioSobrePanel = async (usuario, panelCodigo) => {
    if (typeof window !== 'undefined' && typeof window.permisoUsuarioSobrePanel === 'function') {
      return await window.permisoUsuarioSobrePanel(usuario, panelCodigo);
    }
    return { ver: true, crear: true, editar: true, eliminar: true };
  };

  const statusPill = (value, map) => {
    if (typeof window !== 'undefined' && typeof window.statusPill === 'function') return window.statusPill(value, map);
    return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full">${escapeHtml(value)}</span>`;
  };

  const ESTADO_COLORS = (typeof window !== 'undefined' && window.ESTADO_COLORS) ? window.ESTADO_COLORS : {
    'Activo': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Inactivo': { bg: '#5B647214', text: '#5B6472' },
    'En curso': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Planeada': { bg: '#F5A6231A', text: '#b5790f' }, 'Finalizada': { bg: '#5B647214', text: '#5B6472' },
    'Enviado': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Borrador': { bg: '#5B647214', text: '#5B6472' },
    'Abierto': { bg: '#EC48991A', text: '#EC4899' }, 'En proceso': { bg: '#F5A6231A', text: '#b5790f' }, 'Cerrado': { bg: '#1FC8C01A', text: '#0f8f89' },
    'Pendiente': { bg: '#F5A6231A', text: '#b5790f' },
    'Programada': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Realizada': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Cancelada': { bg: '#EC48991A', text: '#EC4899' },
    'Abierta': { bg: '#8B5CF61A', text: '#8B5CF6' },
    'Publicada': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Oculta': { bg: '#5B647214', text: '#5B6472' },
    'Presente': { bg: '#10B9811A', text: '#059669' },
    'Tarde': { bg: '#F59E0B1A', text: '#D97706' },
    'Justificada': { bg: '#10B9811A', text: '#059669' },
    'Asistencia Parcial': { bg: '#F59E0B1A', text: '#D97706' },
    'Falla': { bg: '#EF44441A', text: '#DC2626' }
  };

  const anilloProgreso = (pct, color, size, grosor) => {
    if (typeof window !== 'undefined' && typeof window.anilloProgreso === 'function') {
      return window.anilloProgreso(pct, color, size, grosor);
    }
    const s = size || 88;
    const stroke = grosor || 8;
    const r = (s - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const offset = c * (1 - clamped / 100);
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" class="-rotate-90">
      <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="${color}1F" stroke-width="${stroke}" />
      <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" style="transition:stroke-dashoffset .6s ease" />
    </svg>`;
  };

  const TableManager = (typeof window !== 'undefined' && window.TableManager) ? window.TableManager : {
    init: () => {},
    filter: () => {}
  };

  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  const habilitarEnterEnFormulario = (...args) => (typeof window !== 'undefined' && typeof window.habilitarEnterEnFormulario === 'function' ? window.habilitarEnterEnFormulario(...args) : null);
  const badgeCamisaDia = (...args) => (typeof window !== 'undefined' && typeof window.badgeCamisaDia === 'function' ? window.badgeCamisaDia(...args) : '');
  const parsearHabilidades = (val) => (typeof window !== 'undefined' && typeof window.parsearHabilidades === 'function')
    ? window.parsearHabilidades(val)
    : (Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []));
  const getInfoCamisaDia = (dia, cohorte) => (typeof window !== 'undefined' && typeof window.getInfoCamisaDia === 'function' ? window.getInfoCamisaDia(dia, cohorte) : null);

  const Store = {
    get: async (col, opts) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      if (!s) return null;
      try {
        return await s.get(col, opts);
      } catch (e) {
        console.warn('[estudiantes Store.get]', e);
        return null;
      }
    },
    list: async (col, opts) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      if (!s) return [];
      try {
        const res = await s.list(col, opts);
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      } catch (e) {
        console.warn('[estudiantes Store.list]', e);
        return [];
      }
    },
    save: async (col, item) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      if (!s) return null;
      return await s.save(col, item);
    },
    set: async (col, items) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      if (!s) return null;
      return await s.set(col, items);
    },
    invalidate: (col) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      if (!s) return;
      return s.invalidate(col);
    },
    actualizarPerfilPropio: async (cambios) => {
      const s = (typeof window !== 'undefined' && window.Store) || null;
      return s && typeof s.actualizarPerfilPropio === 'function' ? await s.actualizarPerfilPropio(cambios) : null;
    }
  };

  const fetchApi = async (endpoint, opts) => {
    if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') return await window.apiFetch(endpoint, opts);
    throw new Error('apiFetch no disponible');
  };
  const apiFetch = fetchApi;
  const memorandosParaEstudiante = async () => (typeof window !== 'undefined' && typeof window.memorandosParaEstudiante === 'function' ? await window.memorandosParaEstudiante() : []);

  /**
   * Panel Estudiante — módulos y seguimiento académico.
   */

  const PANEL_COLOR_ESTUDIANTE = '#D4AF37';

  const MENSAJES_MOTIVACIONALES = [
    'Cada tema que dominas hoy es un paso más cerca de tu meta. ¡Vas muy bien!',
    'Los errores no son fracasos, son la evidencia de que estás intentando aprender algo nuevo.',
    'Tu constancia de hoy es el resultado que vas a celebrar mañana.',
    'No compares tu proceso con el de otros: compáralo con el tuyo de la semana pasada.',
    'Un pequeño avance diario, sostenido en el tiempo, construye grandes resultados.',
    'Pregunta, participa y equivócate: así es como se aprende de verdad.',
    'Tu esfuerzo de hoy en el Training de 100 a 1000+ ya está marcando la diferencia.',
  ];

  const INSIGNIAS_CATALOGO = [
    { nombre: 'Primeros pasos', descripcion: 'Completaste tu primera semana en la plataforma.', color: '#1FC8C0' },
    { nombre: 'Asistencia perfecta', descripcion: 'Sin fallas durante un módulo completo.', color: '#F5A623' },
    { nombre: 'Mente analítica', descripcion: 'Obtuviste una nota sobresaliente en una evaluación.', color: '#8B5CF6' },
    { nombre: 'Participación activa', descripcion: 'Respondiste todas las encuestas de satisfacción disponibles.', color: '#EC4899' },
    { nombre: 'Ruta cumplida', descripcion: 'Completaste una ruta de aprendizaje sugerida por la IA.', color: '#7C3AED' },
    { nombre: 'Colaborador A+', descripcion: 'Participaste en una reunión virtual institucional.', color: '#9A5B3F' },
  ];

  function estudianteNombre() {
    const e = getEstudiante();
    return (e && e.nombre) || '';
  }

  // async: 'modulos' vía MySQL.
  async function estudianteModulo() {
    // El módulo activo del estudiante se deriva de su cohorte asignada.
    const doc = getEstudiante();
    const cohorteNorm = (doc.cohorte || '').trim().toLowerCase();
    const modulos = (await Store.list('modulos')) || [];
    if (!cohorteNorm) return modulos[0] || null;
    return modulos.find(m => {
      const nom = (m.nombre || '').trim().toLowerCase();
      const mod = (m.modulo || '').trim().toLowerCase();
      return nom === cohorteNorm || mod === cohorteNorm || nom.includes(cohorteNorm) || cohorteNorm.includes(nom);
    }) || modulos[0] || null;
  }

  // async porque hace await de seedIfEmpty() (que sí toca 'usuarios',
  // migrada a MySQL) — submitLogin ya la llama con await.
  async function initEstudiante() {
    await seedIfEmpty();
    const nombre = estudianteNombre();
    const msg = MENSAJES_MOTIVACIONALES[Math.abs(hashCode(nombre + new Date().toDateString())) % MENSAJES_MOTIVACIONALES.length];
    const box = document.getElementById('mensajeMotivacional');
    if (box) box.classList.remove('hidden');
    const txt = document.getElementById('mensajeMotivacionalTexto');
    if (txt) txt.textContent = msg;
    await updateMemorandosBadge();
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  let panelActivoEstudiante = null;
  async function showPanelEstudiante(panel) {
    const estActual = getEstudiante();
    const tab = document.querySelector('.panel-tab-s[data-spanel="' + panel + '"]');
    if (panel === 'misProyectos' && tab && tab.classList.contains('hidden')) {
      tab.classList.remove('hidden');
    } else if (tab && tab.classList.contains('hidden')) {
      return;
    }
    if (panel !== 'misProyectos') {
      const perm = await permisoUsuarioSobrePanel(estActual, 'estudiante.' + panel);
      if (!perm.ver) return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Ocultar de inmediato todos los demás paneles de estudiante y desmarcar tabs
    document.querySelectorAll('.panel-content-s').forEach(p => {
      if (p.id !== 'panel-s-' + panel) p.classList.add('hidden');
    });
    document.querySelectorAll('.panel-tab-s').forEach(t => {
      if (t.dataset.spanel !== panel) {
        t.classList.remove('font-semibold', 'is-active');
        t.style.borderLeftColor = '';
        t.style.background = '';
        t.style.color = '';
      }
    });

    const content = document.getElementById('panel-s-' + panel);
    if (content) content.classList.remove('hidden');
    if (tab) {
      tab.classList.add('font-semibold', 'is-active');
      tab.style.borderLeftColor = '';
      tab.style.background = '';
      tab.style.color = '';
    }
    panelActivoEstudiante = panel;
    if (typeof window !== 'undefined') window.panelActivoEstudiante = panel;

    const mount = document.getElementById('mount-s-' + panel);
    if (mount && (!mount.innerHTML.trim() || mount.innerHTML.includes('No se pudo cargar el módulo'))) {
      mount.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-[#F5A623]/25 border-t-[#F5A623] rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-slate2">Cargando...</p>
      </div>`;
    }

    if (panel === 'notificaciones' && typeof window.renderNotificacionesEstudiante === 'function') {
      try {
        await window.renderNotificacionesEstudiante();
        initTablesEnPanel('panel-s-' + panel);
        return;
      } catch (e) {
        console.error('[showPanelEstudiante] Error al cargar notificaciones:', e);
      }
    }

    if (panel === 'solicitar_equipo') {
      let triesSol = 0;
      while (triesSol < 15 && !(typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') && typeof renderSolicitarEquipoForm !== 'function') {
        await new Promise(r => setTimeout(r, 60));
        triesSol++;
      }
      try {
        if (typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') {
          await window.renderSolicitarEquipoForm('mount-s-solicitar_equipo');
          initTablesEnPanel('panel-s-' + panel);
          return;
        } else if (typeof renderSolicitarEquipoForm === 'function') {
          await renderSolicitarEquipoForm('mount-s-solicitar_equipo');
          initTablesEnPanel('panel-s-' + panel);
          return;
        }
      } catch (e) {
        console.error('[showPanelEstudiante] Error al cargar solicitar_equipo:', e);
      }
    }

    if (RENDERERS_ESTUDIANTE[panel]) {
      try {
        await RENDERERS_ESTUDIANTE[panel]();
        initTablesEnPanel('panel-s-' + panel);
      } catch (err) {
        console.error('[showPanelEstudiante] Error al cargar panel "' + panel + '":', err);
        if (mount) {
          mount.innerHTML = `<div class="bg-white rounded-2xl border border-coral/20 shadow-soft p-10 text-center flex flex-col items-center justify-center gap-3">
            <div class="w-10 h-10 rounded-full bg-coral/10 text-coral flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <p class="text-sm font-bold text-ink">No se pudo cargar el módulo</p>
            <p class="text-xs text-slate2 max-w-sm">${escapeHtml(err.message || 'Error inesperado al renderizar')}</p>
            <button onclick="showPanelEstudiante('${panel}')" class="mt-2 px-4 py-1.5 rounded-full bg-morado text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer">Reintentar</button>
          </div>`;
        }
      }
    }
  }
  window.showPanelEstudiante = showPanelEstudiante;

  // ---------- RESUMEN ----------
  // async: 'modulos' vía MySQL.
  async function renderResumenEstudiante() {
    const est = getEstudiante();
    const nombre = est.nombre || estudianteNombre();
    const mod = await estudianteModulo();
    const fechaRegEst = (est.creadoEn || est.creado_en || '').trim();
    const tsRegEst = fechaRegEst ? new Date(fechaRegEst.includes('T') ? fechaRegEst : fechaRegEst.replace(' ', 'T')).getTime() : 0;
    const fechaRegDate = fechaRegEst ? fechaRegEst.slice(0, 10) : '';

    const hoy = typeof fechaHoyLocal === 'function' ? fechaHoyLocal() : new Date().toISOString().slice(0, 10);
    const sesionesHoy = mod ? (await Store.list('sesiones_asistencia')).filter(s => s.cohorte === mod.nombre && s.fecha === hoy) : [];

    const asistenciaReg = (await Store.list('asistencia')).filter(a => {
      if (a.estudiante !== nombre && a.estudiante !== (est.email || '')) return false;
      if (a.estado === 'Falla' && fechaRegDate && a.fecha && a.fecha < fechaRegDate) return false;
      if (a.estado === 'Falla' && a.fecha === hoy) {
        const sesHoy = sesionesHoy.find(s => s.id === a.sesionId || s.materia === a.materia || s.modulo === a.modulo);
        if (sesHoy) {
          const minsHoy = (typeof minutosTranscurridos === 'function') ? minutosTranscurridos(sesHoy.horaInicio || sesHoy.hora_inicio) : 0;
          if (minsHoy <= (typeof VENTANA_TARDE_MIN !== 'undefined' ? VENTANA_TARDE_MIN : 50)) return false;
        }
      }
      return true;
    });
    const presentes = asistenciaReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistenciaReg.length ? Math.round((presentes / asistenciaReg.length) * 100) : null;
    const pctAsistenciaNum = pctAsistencia !== null ? pctAsistencia : 100;
    const pctAsistenciaTexto = pctAsistencia !== null ? `${pctAsistencia}%` : '—';
    const agenda = [...(await Store.list('agenda_estudiante'))].filter(a => a.estudiante === nombre)
      .sort((a, b) => (a.fecha || '').localeCompare(a.fecha || '')).slice(0, 3);

    // Promedio real: misma fuente que Calificaciones/Semáforo/Historial
    // Trainee, no la entidad genérica "calificaciones" (nunca se llena).
    const cohorteParaPromedio = est.cohorte || (mod && mod.nombre);
    const resultado = cohorteParaPromedio ? await promedioGeneralEstudianteCohorte(nombre, cohorteParaPromedio, null) : null;
    const promedio = resultado ? resultado.promedio.toFixed(1) : '—';

    const agendaRows = agenda.map(a => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(a.titulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}${a.hora ? ' · ' + escapeHtml(a.hora) : ''}</p>
        </div>
      </div>`).join('');

    const iniciales = escapeHtml((nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = est.fotoUrl
      ? `<img src="${escapeHtml(est.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(est.fotoUrl)}', '${escapeHtml(nombre || '')}', 'Estudiante')" class="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white/30 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-white/50" title="Clic para ampliar foto" />`
      : `<div class="w-14 h-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0 bg-white/15 border-2 border-white/30">${iniciales}</div>`;

    document.getElementById('mount-s-resumen').innerHTML = `
      <div class="dash-hero p-6 sm:p-8 mb-6" style="--hero-gradient:linear-gradient(120deg,#7C3AED 0%,#8B5CF6 50%,#EC4899 100%)">
        <div class="flex items-center gap-4">
          ${avatarHtml}
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Panel estudiante</p>
            <h2 class="font-display text-xl sm:text-2xl font-bold text-white truncate">${escapeHtml(nombre || 'Estudiante')}</h2>
            <p class="text-sm text-white/80 truncate">${mod ? escapeHtml(mod.modulo) + ' · ' + escapeHtml(mod.nombre) : 'Sin módulo asignado'}</p>
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="dash-stat-card flex items-center gap-4" style="--brand:#1FC8C0">
          <div class="relative shrink-0">
            ${anilloProgreso(pctAsistenciaNum, pctAsistencia !== null ? (pctAsistencia >= 90 ? '#1FC8C0' : pctAsistencia >= 75 ? '#F5A623' : '#F0455C') : '#1FC8C0', 64, 6)}
            <div class="absolute inset-0 grid place-items-center">
              <span class="font-display text-sm font-bold text-ink">${pctAsistenciaTexto}</span>
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Asistencia</p>
            <p class="text-xs text-slate2 mt-1">${asistenciaReg.length ? `${asistenciaReg.length} registro${asistenciaReg.length === 1 ? '' : 's'}` : 'Sin sesiones aún'}</p>
          </div>
        </div>
        <div class="dash-stat-card" style="--brand:#F5A623">
          <div class="dash-stat-icon mb-4" style="background:#F5A62314;color:#F5A623"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H6a1 1 0 01-1-1V6a2 2 0 012-2h10a2 2 0 012 2v10a1 1 0 01-1 1h-2"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Promedio</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${promedio}</p>
          <!-- CORREGIDO: decía "Sobre 5.0" pero el sistema califica sobre 10
               (ver calcularNotaFinal()/calificacionCualitativa()). -->
          <p class="text-xs text-slate2 mt-2">Sobre 10.0</p>
        </div>
        <div class="dash-stat-card" style="--brand:#8B5CF6">
          <div class="dash-stat-icon mb-4" style="background:#8B5CF614;color:#8B5CF6"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Módulo activo</p>
          <p class="font-display text-lg font-bold text-ink mt-1 leading-tight truncate">${mod ? escapeHtml(mod.modulo) : 'Sin asignar'}</p>
          <p class="text-xs text-slate2 mt-2 truncate">${mod ? escapeHtml(mod.nombre) : ''}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="admin-panel-card p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Próximo en tu agenda</p>
          ${agendaRows || '<p class="text-sm text-slate2 text-center py-4">No tienes eventos próximos en tu agenda personal.</p>'}
        </div>
        <div class="admin-panel-card p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Accesos rápidos</p>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="showPanelEstudiante('asistencia')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-turquesa hover:bg-turquesa/5 transition"><p class="text-sm font-semibold text-ink">Registrar asistencia</p><p class="text-xs text-slate2 mt-0.5">Escanea el QR de hoy</p></button>
            <button onclick="showPanelEstudiante('pensum')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-morado hover:bg-morado/5 transition"><p class="text-sm font-semibold text-ink">Ver pensum</p><p class="text-xs text-slate2 mt-0.5">Temas de tu módulo</p></button>
            <button onclick="showPanelEstudiante('calificaciones')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-oro hover:bg-oro/5 transition"><p class="text-sm font-semibold text-ink">Mis calificaciones</p><p class="text-xs text-slate2 mt-0.5">Por materia y mes</p></button>
            <button onclick="showPanelEstudiante('memorandos')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-coral hover:bg-coral/5 transition"><p class="text-sm font-semibold text-ink">Memorandos</p><p class="text-xs text-slate2 mt-0.5">Comunicaciones internas</p></button>
          </div>
        </div>
      </div>`;
  }

  // ---------- PERFIL ----------
  function renderPerfilEstudiante() {
    const doc = getEstudiante();
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Estudiante')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-amber-400/50 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    document.getElementById('mount-s-perfil').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 max-w-2xl">
        <div class="flex items-center gap-5 mb-6">
          ${avatarHtml}
          <div>
            <p class="text-base font-extrabold text-ink">${escapeHtml(doc.nombre || '')}</p>
            <p class="text-sm text-slate2">${escapeHtml(doc.cohorte || '')}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <label class="text-xs font-semibold text-morado hover:underline cursor-pointer">
                Cambiar foto
                <input id="perfil_foto_input" type="file" accept="image/*" class="hidden" onchange="subirFotoPerfilEstudiante(this)" />
              </label>
              ${doc.fotoUrl ? `<button onclick="quitarFotoPerfilEstudiante()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-1">Foto opcional · JPG o PNG, máx. 2 MB</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre completo</label>
            <input id="perfil_nombre" type="text" value="${escapeHtml(doc.nombre || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo electrónico</label>
            <input type="email" value="${escapeHtml(doc.email || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Documento de identidad</label>
            <input id="perfil_documento" type="text" value="${escapeHtml(doc.documento || '')}" placeholder="Ej. CC / TI 1023456789" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Número de teléfono / WhatsApp</label>
            <input id="perfil_telefono" type="tel" value="${escapeHtml(doc.telefono || '')}" placeholder="Ej. 300 123 4567" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Cohorte</label>
            <input type="text" value="${escapeHtml(doc.cohorte || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
            ${statusPill(doc.estado || 'Activo', ESTADO_COLORS)}
          </div>
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Descripción breve</label>
          <textarea id="perfil_descripcion" rows="3" maxlength="280" placeholder="Cuéntale algo breve sobre ti a tus profesores y compañeros (opcional)" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30 resize-none">${escapeHtml(doc.descripcion || '')}</textarea>
          <p class="text-[11px] text-slate2 mt-1">Opcional · máx. 280 caracteres</p>
        </div>

        <!-- Habilidades y Destrezas del Estudiante -->
        <div class="mb-6 p-5 rounded-2xl bg-gradient-to-br from-morado/5 via-turquesa/5 to-transparent border border-morado/20">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-morado">Habilidades y Destrezas</label>
              <p class="text-[11px] text-slate2">Agrega tus conocimientos técnicos, herramientas y talentos. La fundación y coordinadores consultan estas habilidades para vincularte a proyectos y convocatorias.</p>
            </div>
          </div>
          <div id="perfil_estudiante_habilidades_chips" class="flex flex-wrap gap-1.5 mb-3 min-h-[38px] p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs"></div>
          <div class="flex gap-2 mb-2.5">
            <input id="perfil_nueva_habilidad" type="text" maxlength="40" placeholder="Escribe una habilidad (ej. Python, Figma, React...) y presiona Enter" class="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-morado/30" onkeydown="if(event.key==='Enter'){event.preventDefault(); window.__agregarHabilidadEstudiante();}" />
            <button type="button" onclick="window.__agregarHabilidadEstudiante()" class="px-4 py-2 rounded-xl text-xs font-bold bg-morado text-white hover:bg-morado/90 transition shadow-sm cursor-pointer shrink-0">+ Añadir</button>
          </div>
          <div class="pt-2 border-t border-morado/10 flex flex-wrap gap-1.5 items-center">
            <span class="text-[10px] font-bold text-slate2 uppercase tracking-wider mr-1">Sugerencias rápidas:</span>
            ${['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'HTML/CSS', 'Git', 'Figma', 'Edición de Video', 'Marketing Digital', 'Redacción', 'Ventas', 'Excel', 'Liderazgo', 'Inglés B1/B2'].map(s => `<button type="button" onclick="window.__agregarHabilidadEstudiante('${escapeHtml(s)}')" class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-slate-700 hover:border-morado hover:text-morado transition cursor-pointer shadow-2xs">+ ${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>

        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="text" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
            <input id="perfil_pass2" type="text" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
        </div>
        <button onclick="guardarPerfilEstudiante()" class="mt-6 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Guardar cambios</button>
      </div>`;

    window.__habilidadesEstudianteActual = parsearHabilidades(doc.habilidades);
    window.__refrescarChipsEstudiante = () => {
      const cont = document.getElementById('perfil_estudiante_habilidades_chips');
      if (!cont) return;
      cont.innerHTML = window.__habilidadesEstudianteActual.length
        ? window.__habilidadesEstudianteActual.map((h, idx) => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-morado/10 text-morado border border-morado/20">
              <span>${escapeHtml(h)}</span>
              <button type="button" onclick="window.__removerHabilidadEstudiante(${idx})" class="w-3.5 h-3.5 rounded-full hover:bg-morado/20 text-morado inline-flex items-center justify-center cursor-pointer font-bold leading-none">&times;</button>
            </span>`).join('')
        : '<span class="text-xs text-slate2 italic">Sin habilidades asignadas aún. Añade tus destrezas y herramientas arriba.</span>';
    };
    window.__removerHabilidadEstudiante = (idx) => {
      window.__habilidadesEstudianteActual.splice(idx, 1);
      window.__refrescarChipsEstudiante();
    };
    window.__agregarHabilidadEstudiante = (texto) => {
      const input = document.getElementById('perfil_nueva_habilidad');
      const val = (texto || (input ? input.value : '')).trim();
      if (!val) return;
      const partes = val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      partes.forEach(p => {
        if (!window.__habilidadesEstudianteActual.some(h => h.toLowerCase() === p.toLowerCase())) {
          window.__habilidadesEstudianteActual.push(p);
        }
      });
      window.__refrescarChipsEstudiante();
      if (input) input.value = '';
    };
    setTimeout(window.__refrescarChipsEstudiante, 0);
    habilitarEnterEnFormulario('mount-s-perfil', null, false);
  }

  // async: 'usuarios' vía MySQL.
  async function actualizarUsuarioEstudianteActual(cambios) {
    const curEst = getEstudiante();
    const usuarios = (await Store.list('usuarios')).map(u => u.id === curEst.id ? { ...u, ...cambios } : u);
    await Store.set('usuarios', usuarios);
    setEstudiante({ ...curEst, ...cambios });
  }

  // CORREGIDO (2): mismo bug que en Docente — ver el comentario en
  // actualizarAvatarDocenteEnDom()/subirFotoPerfilDocente(). Al subir o
  // quitar la foto, ya no se reconstruye todo el formulario (eso borraba
  // la descripción que el usuario tuviera escrita y sin guardar); solo
  // se actualiza el avatar y el botón "Quitar foto" en el DOM.
  function actualizarAvatarEstudianteEnDom(fotoUrl) {
    const cont = document.getElementById('mount-s-perfil');
    if (!cont) return;
    const avatarActual = cont.querySelector('img[alt="Foto de perfil"], div.rounded-full.grid');
    if (avatarActual) {
      if (fotoUrl) {
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.alt = 'Foto de perfil';
        img.className = avatarActual.className.includes('w-20') ? avatarActual.className : 'w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100';
        avatarActual.replaceWith(img);
      } else if (avatarActual.tagName === 'IMG') {
        const doc = getEstudiante();
        const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
        const div = document.createElement('div');
        div.className = 'w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0';
        div.style = 'background:linear-gradient(135deg,#1FC8C0,#8B5CF6)';
        div.textContent = iniciales;
        avatarActual.replaceWith(div);
      }
    }
    const btnQuitar = cont.querySelector('button[onclick="quitarFotoPerfilEstudiante()"]');
    if (fotoUrl && !btnQuitar) {
      const label = cont.querySelector('label.cursor-pointer');
      if (label) label.insertAdjacentHTML('afterend', ' <button onclick="quitarFotoPerfilEstudiante()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>');
    } else if (!fotoUrl && btnQuitar) {
      btnQuitar.remove();
    }
  }

  function subirFotoPerfilEstudiante(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const resultado = await Store.actualizarPerfilPropio({ fotoUrl: reader.result });
      const cur = getEstudiante();
      setEstudiante({ ...cur, fotoUrl: reader.result });
      toast(resultado.remoto ? 'Foto de perfil actualizada' : 'Foto guardada solo en este navegador (sin conexión con el servidor)', resultado.remoto ? 'ok' : 'err');
      actualizarAvatarEstudianteEnDom(reader.result);
      actualizarHeaderUsuario('estudiante');
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  async function quitarFotoPerfilEstudiante() {
    const resultado = await Store.actualizarPerfilPropio({ fotoUrl: '' });
    const cur = getEstudiante();
    setEstudiante({ ...cur, fotoUrl: '' });
    toast(resultado.remoto ? 'Foto de perfil eliminada' : 'No se pudo eliminar la foto en el servidor', resultado.remoto ? 'ok' : 'err');
    actualizarAvatarEstudianteEnDom('');
    actualizarHeaderUsuario('estudiante');
  }

  async function guardarPerfilEstudiante() {
    const inputNuevaHab = document.getElementById('perfil_nueva_habilidad');
    if (inputNuevaHab && inputNuevaHab.value.trim()) {
      const partes = inputNuevaHab.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      if (!Array.isArray(window.__habilidadesEstudianteActual)) window.__habilidadesEstudianteActual = [];
      partes.forEach(p => {
        if (!window.__habilidadesEstudianteActual.some(h => h.toLowerCase() === p.toLowerCase())) {
          window.__habilidadesEstudianteActual.push(p);
        }
      });
      inputNuevaHab.value = '';
    }

    const nombre = document.getElementById('perfil_nombre').value.trim();
    const documento = document.getElementById('perfil_documento') ? document.getElementById('perfil_documento').value.trim() : '';
    const telefono = document.getElementById('perfil_telefono') ? document.getElementById('perfil_telefono').value.trim() : '';
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    const cambios = {};
    if (nombre) cambios.nombre = nombre;
    cambios.documento = documento;
    cambios.telefono = telefono;
    cambios.descripcion = descripcion;
    cambios.habilidades = window.__habilidadesEstudianteActual || [];
    if (p1) cambios.password = p1;

    const resultado = await Store.actualizarPerfilPropio(cambios);
    if (typeof Store.clearCache === 'function') Store.clearCache('usuarios');
    const cur = getEstudiante();
    const act = { ...cur, ...cambios };
    delete act.password;
    setEstudiante(act);
    toast(resultado.remoto ? 'Perfil actualizado correctamente' : 'No se pudo guardar en el servidor, intenta de nuevo', resultado.remoto ? 'ok' : 'err');
    renderPerfilEstudiante();
    actualizarHeaderUsuario('estudiante');
  }

  // ---------- VER PERFIL DE OTRA PERSONA (modal de solo lectura) ----------
  // Usado por el estudiante para ver el perfil de sus profesores asignados,
  // y por el docente para ver el perfil de sus estudiantes.
  // async: 'usuarios' vía MySQL.
  async function abrirPerfilPersonaPorNombreYRol(nombre, rol) {
    if (!nombre) return;
    const objetivo = nombre.trim().toLowerCase();
    const usuarios = await Store.list('usuarios');
    const usuario = usuarios.find(u => u.rol === rol && u.nombre && u.nombre.trim().toLowerCase() === objetivo);
    if (!usuario) { toast('No se encontró el perfil de ' + nombre, 'err'); return; }
    await abrirPerfilPersona(usuario.id);
  }

  async function abrirPerfilPersona(usuarioId) {
    const usuario = (await Store.list('usuarios')).find(u => u.id === usuarioId);
    if (!usuario) { toast('No se encontró ese perfil', 'err'); return; }

    const iniciales = escapeHtml((usuario.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = usuario.fotoUrl
      ? `<img src="${escapeHtml(usuario.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(usuario.fotoUrl)}', '${escapeHtml(usuario.nombre || '')}', '${escapeHtml(usuario.rol || '')}')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-morado/40 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    const esDocente = usuario.rol === 'Docente';
    const materiasDocente = esDocente ? (await Store.list('pensum')).filter(p => p.docente === usuario.nombre) : [];

    const telDigits = (usuario.telefono || '').replace(/\D/g, '');
    const waUrl = telDigits.length >= 10 ? `https://wa.me/${telDigits.length === 10 ? '57' + telDigits : telDigits}` : null;
    const telHtml = usuario.telefono ? `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Teléfono / WhatsApp</label>
        <div class="flex items-center gap-2">
          <p class="text-sm text-ink font-semibold">${escapeHtml(usuario.telefono)}</p>
          ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition" title="Enviar WhatsApp"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>WhatsApp</a>` : ''}
        </div>
      </div>` : `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Teléfono</label>
        <p class="text-sm text-slate2">No registrado</p>
      </div>`;

    const docHtml = `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Documento de Identidad</label>
        <p class="text-sm text-ink font-semibold">${escapeHtml(usuario.documento || 'No registrado')}</p>
      </div>`;

    const infoExtra = esDocente
      ? `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Rol</label>
              <p class="text-sm text-ink font-semibold">Docente</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
              ${statusPill(usuario.estado || 'Activo', ESTADO_COLORS)}
            </div>
            ${docHtml}
            ${telHtml}
            ${materiasDocente.length ? `
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Materias que dicta</label>
              <p class="text-sm text-ink">${escapeHtml([...new Set(materiasDocente.map(m => m.modulo))].join(', '))}</p>
            </div>` : ''}`
      : `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Cohorte</label>
              <p class="text-sm text-ink">${escapeHtml(usuario.cohorte || '—')}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
              ${statusPill(usuario.estado || 'Activo', ESTADO_COLORS)}
            </div>
            ${docHtml}
            ${telHtml}`;

    let listaHabilidades = parsearHabilidades(usuario.habilidades);

    const habilidadesHtml = listaHabilidades.length > 0 ? `
      <div class="border-t border-gray-100 pt-5">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2.5">Habilidades y Destrezas</p>
        <div class="flex flex-wrap gap-1.5">
          ${listaHabilidades.map(h => `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-morado/10 text-morado border border-morado/20">${escapeHtml(h)}</span>`).join('')}
        </div>
      </div>` : '';

    document.getElementById('perfilPersonaContenido').innerHTML = `
      <div class="flex items-center gap-5 mb-6">
        ${avatarHtml}
        <div>
          <p class="text-base font-extrabold text-ink">${escapeHtml(usuario.nombre || '')}</p>
          <p class="text-sm text-slate2">${escapeHtml(usuario.email || '')}</p>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">${infoExtra}</div>
      ${habilidadesHtml}
      ${usuario.descripcion ? `
      <div class="border-t border-gray-100 pt-5 mt-4">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Descripción</p>
        <p class="text-sm text-ink leading-relaxed">${escapeHtml(usuario.descripcion)}</p>
      </div>` : `
      <div class="border-t border-gray-100 pt-5 mt-4">
        <p class="text-sm text-slate2 italic">Esta persona aún no ha agregado una descripción.</p>
      </div>`}
    `;
    document.getElementById('perfilPersonaModal').classList.remove('hidden');
  }

  function cerrarPerfilPersonaModal() {
    document.getElementById('perfilPersonaModal').classList.add('hidden');
  }

  // Devuelve un <button> clicable con el nombre de una persona, que abre su
  // perfil de solo lectura. Se usa para reemplazar texto plano de nombres.
  function nombrePersonaClicable(nombre, rol) {
    if (!nombre) return '—';
    return `<button type="button" onclick="abrirPerfilPersonaPorNombreYRol('${escapeHtml(nombre).replace(/'/g, "\\'")}', '${rol}')" class="hover:underline hover:text-morado transition text-left">${escapeHtml(nombre)}</button>`;
  }

  // ---------- ASISTENCIA (QR) ----------
  let asistenciaEstudianteTimer = null;

  function toggleAsistenciaExtra() {
    const extras = document.querySelectorAll('.asist-row-extra');
    const btn = document.getElementById('asist-ver-mas-btn');
    const row = document.getElementById('asist-ver-mas-row');
    const visible = extras.length && !extras[0].classList.contains('hidden');
    extras.forEach(tr => tr.classList.toggle('hidden', visible));
    if (btn) btn.textContent = visible
      ? `Ver todos los registros (${extras.length}) ↓`
      : 'Ocultar registros anteriores ↑';
    if (row) {
      const tbody = row.parentElement;
      if (tbody && !visible) tbody.appendChild(row);
    }
  }
  window.toggleAsistenciaExtra = toggleAsistenciaExtra;

  // async: docenteEstudiantesDeCohorte ahora es async.
  async function renderAsistenciaEstudiante() {
    if (asistenciaEstudianteTimer) clearInterval(asistenciaEstudianteTimer);

    const estObj = getEstudiante();
    const nombre = estObj.nombre || estudianteNombre();
    const mod = await estudianteModulo();
    const fechaRegEst = (estObj.creadoEn || estObj.creado_en || '').trim();
    const tsRegEst = fechaRegEst ? new Date(fechaRegEst.includes('T') ? fechaRegEst : fechaRegEst.replace(' ', 'T')).getTime() : 0;

    const fechaRegDate = fechaRegEst ? fechaRegEst.slice(0, 10) : '';
    const hoy = typeof fechaHoyLocal === 'function' ? fechaHoyLocal() : new Date().toISOString().slice(0, 10);
    const sesionesHoyPre = mod ? (await Store.list('sesiones_asistencia')).filter(s => s.cohorte === mod.nombre && s.fecha === hoy) : [];

    const rawRegistros = [...(await Store.list('asistencia', { forceRefresh: true }))].filter(a => {
      if (a.estudiante !== nombre && a.estudiante !== (est.email || '')) return false;
      if (a.estado === 'Falla' && fechaRegDate && a.fecha && a.fecha < fechaRegDate) return false;
      if (a.estado === 'Falla' && a.fecha === hoy) {
        const sesHoy = sesionesHoyPre.find(s => s.id === a.sesionId || s.materia === a.materia || s.modulo === a.modulo);
        if (sesHoy) {
          const minsHoy = (typeof minutosTranscurridos === 'function') ? minutosTranscurridos(sesHoy.horaInicio || sesHoy.hora_inicio) : 0;
          if (minsHoy <= (typeof VENTANA_TARDE_MIN !== 'undefined' ? VENTANA_TARDE_MIN : 50)) return false;
        }
      }
      return true;
    });
    const justificaciones = await Store.list('justificaciones_asistencia');
    const justificacionesEst = justificaciones.filter(j => j.estudiante === nombre);

    const prioridad = { Presente: 1, Tarde: 2, 'Asistencia Parcial': 3, Justificada: 4, Falla: 5 };
    const porSesion = new Map();
    rawRegistros.forEach(r => {
      const key = r.sesionId ? ('ses_' + r.sesionId) : ('date_' + r.fecha + '_' + (r.materia || r.modulo));
      if (!porSesion.has(key)) {
        porSesion.set(key, r);
      } else {
        const actual = porSesion.get(key);
        if ((prioridad[r.estado] || 99) < (prioridad[actual.estado] || 99)) {
          porSesion.set(key, r);
        }
      }
    });
    const registros = Array.from(porSesion.values()).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totales = { Presente: 0, Tarde: 0, Falla: 0, Justificada: 0, 'Asistencia Parcial': 0 };
    registros.forEach(r => { if (totales[r.estado] !== undefined) totales[r.estado]++; });
    const presenciasEfectivas = totales.Presente + totales.Justificada + (totales.Tarde * 0.8) + (totales['Asistencia Parcial'] * 0.5);
    const pct = registros.length ? Math.min(100, Math.round((presenciasEfectivas / registros.length) * 100)) : null;
    const pctStr = pct !== null ? `${pct}%` : '—';

    let tarjetasSesiones;
    if (!mod) {
      tarjetasSesiones = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 text-center">
          <p class="text-sm text-slate2">No tienes un módulo activo asignado.</p>
        </div>`;
    } else {
      const hoy = fechaHoyLocal();
      const sesionesHoy = (await Store.list('sesiones_asistencia')).filter(s => s.cohorte === mod.nombre && s.fecha === hoy);

      if (!sesionesHoy.length) {
        tarjetasSesiones = `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
            <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 grid place-items-center shrink-0">
              <svg class="w-14 h-14 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h2M19 19h1"/></svg>
            </div>
            <div class="flex-1 text-center sm:text-left">
              <p class="text-sm font-bold text-ink">Código de asistencia de hoy</p>
              <p class="text-xs text-slate2 mt-1">Módulo: ${escapeHtml(mod.modulo)}</p>
              <p class="text-sm text-slate2 mt-3">Ninguno de tus docentes ha habilitado su código de asistencia todavía. Cada materia se activa por separado.</p>
            </div>
          </div>`;
      } else {
        const estudiantesCohorte = await docenteEstudiantesDeCohorte(mod.nombre);
        sesionesHoy.forEach(sesion => sincronizarAusentesSesion(sesion, estudiantesCohorte));
        tarjetasSesiones = sesionesHoy.map(sesion => {
          const materiaLabel = sesion.materia || sesion.modulo;
          const yaReg = registros.find(r => r.sesionId === sesion.id);
          const mins = minutosTranscurridos(sesion.horaInicio);
          const horaSesionStr = sesion.horaInicio ? (sesion.horaInicio.includes('T') ? sesion.horaInicio : sesion.horaInicio.replace(' ', 'T')) : (sesion.fecha + 'T23:59:59');
          const tsSesion = new Date(horaSesionStr).getTime();
          const ingresoDespues = (fechaRegDate && sesion.fecha && fechaRegDate > sesion.fecha) || (tsRegEst > 0 && tsRegEst > tsSesion);

          // Si el estudiante ya confirmó su asistencia y quedó en Presente o Tarde
          if (yaReg && (yaReg.estado === 'Presente' || yaReg.estado === 'Tarde')) {
            const color = yaReg.estado === 'Presente' ? '#0f8f89' : '#b5790f';
            const texto = yaReg.estado === 'Presente' ? 'Llegaste puntual' : 'Llegaste tarde';
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 grid place-items-center shrink-0" style="border-color:${color}">
                  <p class="text-sm font-extrabold text-center px-2" style="color:${color}">${texto}</p>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <p class="text-xs text-slate2 mt-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')} · ${fmtDate(sesion.fecha)}</p>
                  <div class="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:${color}"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ${yaReg.estado}</span>
                  </div>
                </div>
              </div>`;
          }

          // Si el estudiante ingresó a la plataforma después de esta clase, no se le penaliza
          if (ingresoDespues) {
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 border-gray-200 bg-gray-50 grid place-items-center shrink-0">
                  <div class="text-center p-2">
                    <span class="text-xs font-bold text-slate2 block">PREVIO</span>
                    <span class="text-[10px] text-slate2 block">A tu ingreso</span>
                  </div>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <p class="text-xs text-slate2 mt-1">Esta sesión inició antes de tu fecha de registro. No se computa inasistencia ni afecta tu porcentaje. Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                  <div class="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-slate2 border border-gray-200">No aplica</span>
                  </div>
                </div>
              </div>`;
          }

          // Si ya expiró la ventana de tolerancia (+50 min) y quedó con Falla definitiva
          if (mins > VENTANA_TARDE_MIN) {
            const yaRegFalla = registros.find(r => r.sesionId === sesion.id);
            const just = justificacionesEst.find(j => (j.asistenciaId && yaRegFalla && j.asistenciaId === yaRegFalla.id) || (j.fecha === sesion.fecha && j.materia === materiaLabel));
            let estadoAccionHtml = '';
            if (just) {
              if (just.estado === 'Aprobada') {
                estadoAccionHtml = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Justificada</span> <button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="text-xs font-bold text-morado hover:underline inline-flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> Ver soporte</button>`;
              } else if (just.estado === 'Pendiente') {
                estadoAccionHtml = `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Excusa en revisión</button>`;
              } else {
                estadoAccionHtml = `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 transition"><svg class="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg> Excusa rechazada</button>`;
              }
            } else {
              const asistId = yaRegFalla ? yaRegFalla.id : '';
              estadoAccionHtml = `
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-coral/15 text-coral border border-coral/20">Falla</span>
                <button type="button" onclick="abrirModalJustificarAsistencia('${asistId}', '${sesion.fecha}', '${escapeHtml(materiaLabel).replace(/'/g, "\\'")}', '${escapeHtml((sesion.iniciadaPor || '').replace(/'/g, "\\'"))}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-morado text-white hover:opacity-90 shadow-sm transition cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  Adjuntar excusa médica / laboral
                </button>`;
            }
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 border-coral grid place-items-center shrink-0">
                  <svg class="w-11 h-11 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)} — la ventana de clase ya cerró</p>
                  <p class="text-xs text-slate2 mt-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')} · Si tuviste una calamidad o motivo de fuerza mayor, puedes radicar tu soporte con foto o PDF para que sea validada.</p>
                  <div class="mt-3 flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                    ${estadoAccionHtml}
                  </div>
                </div>
              </div>`;
          }

          // Ventana de asistencia activa (<= 50 min): la sesión está en curso, PENDIENTE de registro
          const ventana = estadoVentanaSesion(sesion);
          return `
            <div class="bg-white rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
              <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 grid place-items-center shrink-0">
                <div class="text-center p-2">
                  <span class="text-xs font-extrabold text-amber-700 block">EN CURSO</span>
                  <span class="text-[10px] text-amber-600 block">Registra aquí</span>
                </div>
              </div>
              <div class="flex-1 text-center sm:text-left">
                <div class="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <span class="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">Sesión en curso</span>
                </div>
                <p class="text-xs text-slate2 mt-0.5 mb-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                <p class="text-xs font-bold mb-2" style="color:${ventana.color}">${ventana.texto}</p>
                <div class="p-3.5 bg-morado/5 rounded-xl border border-morado/15 max-w-lg">
                  <p class="text-xs text-morado font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                    <svg class="w-4 h-4 shrink-0 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                    Escanear QR o ingresar código de clase
                  </p>
                  <div class="mt-2.5 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <input type="text" id="codigo_qr_estudiante_${sesion.id}" placeholder="Código o token (ej: 8F2A)" maxlength="12" class="w-full sm:w-48 uppercase font-mono tracking-wider text-center text-xs font-bold rounded-xl border border-gray-200 px-3 py-2 bg-white text-ink focus:border-morado focus:ring-2 focus:ring-morado/20 outline-none" />
                    <button type="button" onclick="escanearAsistencia('${sesion.id}')" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-morado to-turquesa text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0">
                      Confirmar asistencia
                    </button>
                  </div>
                  <p class="text-[11px] text-slate2 mt-1.5">El token dinámico anti-fraude rota cada 15s con 60s de tolerancia ante lentitud de red en el aula.</p>
                </div>
              </div>
            </div>`;
        }).join('');
      }
    }

    function renderColumnaSoporteEstudiante(r) {
      const just = justificacionesEst.find(j => (j.asistenciaId && j.asistenciaId === r.id) || (j.fecha === r.fecha && j.materia === (r.materia || r.modulo)));
      if (r.estado === 'Justificada') {
        return `<div class="flex items-center gap-1.5 flex-wrap">
          <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"><svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Justificada</span>
          ${just ? `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="text-[11px] font-bold text-morado hover:underline cursor-pointer">Ver excusa</button>` : ''}
        </div>`;
      }
      if (just) {
        if (just.estado === 'Pendiente') {
          return `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition cursor-pointer">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Excusa en revisión
          </button>`;
        }
        if (just.estado === 'Rechazada') {
          return `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer">
            <svg class="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg> Soporte rechazado
          </button>`;
        }
        return `<button type="button" onclick="abrirModalVisorJustificacion('${just.id}')" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer">
          <svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Aprobada
        </button>`;
      }
      if (r.estado === 'Falla' || r.estado === 'Asistencia Parcial') {
        const mat = (r.materia || r.modulo || '').replace(/'/g, "\\'");
        const doc = (r.docente || '').replace(/'/g, "\\'");
        return `<button type="button" onclick="abrirModalJustificarAsistencia('${r.id || ''}', '${r.fecha}', '${mat}', '${doc}')" class="inline-flex items-center gap-1 text-[11px] font-bold text-morado bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition cursor-pointer shadow-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
          Adjuntar excusa
        </button>`;
      }
      return '<span class="text-xs text-slate2 font-medium">—</span>';
    }

    const MAX_FILAS_ASIST = 5;
    const rowsLimitadas = registros.slice(0, MAX_FILAS_ASIST).map(r => `
      <tr data-search="${escapeHtml((r.fecha + ' ' + (r.modulo || '') + ' ' + r.estado).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-ink">${fmtDate(r.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.modulo)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['En proceso'] || ESTADO_COLORS['Planeada'], Justificada: '#10B981', 'Asistencia Parcial': '#F59E0B', Falla: ESTADO_COLORS['Abierto'] })}${r.automatico ? '<span class="text-[10px] text-slate2 ml-2">automático</span>' : ''}</td>
        <td class="py-3 px-4">${renderColumnaSoporteEstudiante(r)}</td>
      </tr>`).join('');

    const rowsRestantes = registros.slice(MAX_FILAS_ASIST).map(r => `
      <tr data-search="${escapeHtml((r.fecha + ' ' + (r.modulo || '') + ' ' + r.estado).toLowerCase())}" class="border-b border-gray-50 last:border-0 asist-row-extra hidden">
        <td class="py-3 px-4 text-sm text-ink">${fmtDate(r.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.modulo)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['En proceso'] || ESTADO_COLORS['Planeada'], Justificada: '#10B981', 'Asistencia Parcial': '#F59E0B', Falla: ESTADO_COLORS['Abierto'] })}${r.automatico ? '<span class="text-[10px] text-slate2 ml-2">automático</span>' : ''}</td>
        <td class="py-3 px-4">${renderColumnaSoporteEstudiante(r)}</td>
      </tr>`).join('');

    const hayMas = registros.length > MAX_FILAS_ASIST;
    const botonVerMas = hayMas ? `
      <tr id="asist-ver-mas-row" class="border-0 admin-empty-state-row">
        <td colspan="4" class="py-3 px-4 text-center">
          <button onclick="window.toggleAsistenciaExtra()" id="asist-ver-mas-btn"
            class="text-xs font-bold text-morado hover:text-morado/80 underline underline-offset-2 transition cursor-pointer">
            Ver todos los registros (${registros.length}) ↓
          </button>
        </td>
      </tr>` : '';

    document.getElementById('mount-s-asistencia').innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">% Asistencia</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${pctStr}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Puntuales</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${totales.Presente}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Tardes / Parcial</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${totales.Tarde + (totales['Asistencia Parcial'] || 0)}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Inasistencias</p>
            ${totales.Justificada ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">${totales.Justificada} justif.</span>` : ''}
          </div>
          <p class="text-2xl font-extrabold text-coral mt-1">${totales.Falla}</p>
        </div>
      </div>
      ${tarjetasSesiones}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-slate2">Historial de asistencia</p>
            ${hayMas ? `<p class="text-[11px] text-slate2 mt-0.5">Mostrando los ${MAX_FILAS_ASIST} más recientes de ${registros.length} registros.</p>` : ''}
          </div>
          <div class="relative">
            <input data-table="table-estudiante-asistencia" oninput="TableManager.filter('table-estudiante-asistencia', this.value)" type="text" placeholder="Buscar fecha o materia..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-asistencia" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Fecha</th><th class="py-3 px-4">Materia</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4">Soporte / Excusa</th></tr></thead>
            <tbody>${rowsLimitadas || '<tr class="admin-empty-state-row"><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no tienes registros de asistencia.</td></tr>'}${rowsRestantes}${botonVerMas}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-asistencia');




    asistenciaEstudianteTimer = setInterval(() => {
      const panel = document.getElementById('panel-s-asistencia');
      if (panel && !panel.classList.contains('hidden')) renderAsistenciaEstudiante();
      else clearInterval(asistenciaEstudianteTimer);
    }, 15000);
  }

  // async: 'modulos', 'sesiones_asistencia' y 'asistencia' vía MySQL.
  async function escanearAsistencia(sesionId) {
    const nombre = estudianteNombre();
    const mod = await estudianteModulo();
    if (!mod) { toast('No tienes un módulo activo asignado', 'err'); return; }
    const hoy = fechaHoyLocal();
    const sesion = (await Store.list('sesiones_asistencia')).find(s => s.id === sesionId && s.cohorte === mod.nombre && s.fecha === hoy);
    if (!sesion) { toast('Esa sesión ya no está disponible', 'err'); renderAsistenciaEstudiante(); return; }
    const registros = await Store.list('asistencia');
    const registroExistente = registros.find(r => r.estudiante === nombre && r.sesionId === sesion.id);
    if (registroExistente && (registroExistente.estado === 'Presente' || registroExistente.estado === 'Tarde')) {
      toast('Ya registraste tu asistencia en esta materia hoy: ' + registroExistente.estado, 'info');
      renderAsistenciaEstudiante();
      return;
    }
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins > VENTANA_TARDE_MIN) {
      toast('La ventana de asistencia ya cerró', 'err'); renderAsistenciaEstudiante(); return;
    }
    const input = document.getElementById('codigo_qr_estudiante_' + sesionId);
    const codigo = (input ? input.value : '').trim().toUpperCase();
    if (!codigo) { toast('Ingresa el código o token que muestra tu docente', 'err'); return; }

    const esValido = (codigo === (sesion.codigo || '').toUpperCase()) || validarTokenSesionConGracia(codigo, sesion.codigo, 15, 3);
    if (!esValido) { 
      toast('Código o token incorrecto o expirado. Ingresa el código visible en pantalla.', 'err'); 
      return; 
    }

    const estado = estadoPorTiempo(mins);
    const horasCumplidas = estado === 'Presente' ? 4.0 : 3.0;
    if (registroExistente) {
      registroExistente.estado = estado;
      registroExistente.automatico = false;
      registroExistente.materia = sesion.materia || sesion.modulo;
      registroExistente.horasCumplidas = horasCumplidas;
      registroExistente.horasTotal = 4.0;
    } else {
      registros.push({
        id: uid('as'),
        estudiante: nombre,
        modulo: sesion.modulo,
        docente: sesion.iniciadaPor,
        materia: sesion.materia || sesion.modulo,
        fecha: sesion.fecha,
        estado,
        sesionId: sesion.id,
        horasCumplidas,
        horasTotal: 4.0,
        automatico: false
      });
    }
    await Store.set('asistencia', registros);
    const msg = estado === 'Presente' ? 'Asistencia registrada: llegaste puntual (4.0 hrs).' : 'Asistencia registrada: llegada tarde (3.0 hrs).';
    toast(msg, 'ok');
    renderAsistenciaEstudiante();
  }

  // ---------- MIS MATERIAS Y HORARIO ----------
  // Mes seleccionado por el estudiante para ver su horario (memoria de sesión)
  let estudianteHorarioMes = null;

  // Mes seleccionado en el filtro de calificaciones del estudiante
  let estudianteCalifMes = null;

  // Cambia el mes del filtro y re-renderiza
  function cambiarCalifMesEstudiante(mes) {
    estudianteCalifMes = mes;
    renderCalificacionesEstudiante();
  }
  window.cambiarCalifMesEstudiante = cambiarCalifMesEstudiante;

  async function renderCalificacionesEstudiante() {
    const nombre = estudianteNombre();
    const mod = await estudianteModulo();
    const mount = document.getElementById('mount-s-calificaciones');

    if (!mod) {
      mount.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes una cohorte activa asignada, así que todavía no hay calificaciones para mostrar.</p>
      </div>`;
      return;
    }

    // Todos los registros de la cohorte del estudiante
    const estCohorte = (getEstudiante() && getEstudiante().cohorte) || '';
    const registros = [...(await Store.list('notas_modulos'))]
      .filter(r => (r.cohorte === mod.nombre || (mod.cohorte && r.cohorte === mod.cohorte) || (estCohorte && r.cohorte === estCohorte)) && (r.criterios || []).length)
      .sort((a, b) => (b.mes || '').localeCompare(a.mes || '') || (a.docente || '').localeCompare(b.docente || ''));

    if (!registros.length) {
      mount.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Tu(s) docente(s) aún no han registrado notas en <strong class="text-ink">${escapeHtml(mod.nombre)}</strong>.</p>
      </div>`;
      return;
    }

    // Lista de meses únicos disponibles (más reciente primero)
    const mesesDisponibles = [...new Set(registros.map(r => r.mes).filter(Boolean))].sort((a, b) => b.localeCompare(a));

    // Si el mes seleccionado ya no existe, resetear al más reciente
    if (!estudianteCalifMes || !mesesDisponibles.includes(estudianteCalifMes)) {
      estudianteCalifMes = mesesDisponibles[0];
    }

    // Filtrar registros por mes seleccionado
    const registrosFiltrados = registros.filter(r => r.mes === estudianteCalifMes);

    const compañeros = await docenteEstudiantesDeCohorte(mod.nombre);

    // Cálculo de promedio general y ranking global de la cohorte en todas las materias
    const notasEstudiante = [];
    registros.forEach(rec => {
      const res = calcularNotaFinal(rec, nombre);
      if (res && res.valor !== null && !isNaN(res.valor)) {
        notasEstudiante.push(res.valor);
      }
    });
    const promGeneralEstudiante = notasEstudiante.length
      ? (notasEstudiante.reduce((acc, v) => acc + v, 0) / notasEstudiante.length)
      : null;
    const escalaGlobal = promGeneralEstudiante !== null ? letraEscalaNota(promGeneralEstudiante) : null;

    // Ranking global entre todos los compañeros de la cohorte
    const rankingGlobalCohorte = compañeros.map(u => {
      const notasU = [];
      registros.forEach(rec => {
        const res = calcularNotaFinal(rec, u.nombre);
        if (res && res.valor !== null && !isNaN(res.valor)) notasU.push(res.valor);
      });
      const promU = notasU.length ? (notasU.reduce((acc, v) => acc + v, 0) / notasU.length) : null;
      return { nombre: u.nombre, promedio: promU };
    }).filter(x => x.promedio !== null).sort((a, b) => b.promedio - a.promedio);

    const puestoGlobal = promGeneralEstudiante !== null
      ? (rankingGlobalCohorte.findIndex(x => x.nombre === nombre) + 1)
      : null;
    const totalEstudiantesRanking = rankingGlobalCohorte.length || compañeros.length;

    const resumenSuperior = `
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <!-- Puesto en la cohorte -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Puesto en la cohorte</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-extrabold text-ink">${puestoGlobal !== null ? `${puestoGlobal}º` : '—'}</p>
              <span class="text-xs text-slate2 font-medium">${puestoGlobal !== null ? `de ${totalEstudiantesRanking} estudiantes` : 'Sin ponderar aún'}</span>
            </div>
          </div>
        </div>

        <!-- Promedio general -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-turquesa/10 text-turquesa flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Promedio general de todas las materias</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-extrabold" style="color:${colorCualitativa(promGeneralEstudiante)}">${promGeneralEstudiante !== null ? promGeneralEstudiante.toFixed(1) : '—'}</p>
              ${escalaGlobal ? `<span class="text-xs font-bold px-2 py-0.5 rounded-md" style="background:${escalaGlobal.bg};color:${escalaGlobal.color}">Escala: ${escalaGlobal.letra} (${escalaGlobal.descripcion})</span>` : '<span class="text-xs text-slate2 font-medium">Pendiente</span>'}
            </div>
          </div>
        </div>
      </div>`;

    const esActualPorRegistro = await Promise.all(registrosFiltrados.map(rec => mesActualParaDocenteCohorte(rec.docente, mod.nombre)));
    const slotsPorRegistro = await Promise.all(registrosFiltrados.map(rec => getSlotsDocente(rec.docente)));

    const bloques = registrosFiltrados.map((rec, i) => {
      const esActual = rec.mes === esActualPorRegistro[i];
      const materias = [...new Set(slotsPorRegistro[i].filter(s => s.cohorte === mod.nombre && s.mes === rec.mes).map(s => s.materia))];
      const materiaLabel = materias.length ? materias.join(', ') : mod.modulo;

      const valores = (rec.valores && !Array.isArray(rec.valores) && rec.valores[nombre]) || {};
      const filasNotas = (rec.criterios || []).map(c => {
        const v = valores[c.id];
        const tieneValor = v !== undefined && v !== null && v !== '';
        return `<tr class="border-b border-gray-50 last:border-0">
          <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(c.nombre)}</td>
          <td class="py-2.5 px-4 text-sm text-slate2">${c.peso}%</td>
          <td class="py-2.5 px-4 text-sm font-bold text-right" style="color:${tieneValor ? '#14181F' : '#5B6472'}">${tieneValor ? Number(v).toFixed(1) : 'Pendiente'}</td>
        </tr>`;
      }).join('');

      const resultado = calcularNotaFinal(rec, nombre);
      const definitiva = resultado && resultado.valor !== null ? resultado.valor : null;
      const escala = definitiva !== null ? letraEscalaNota(definitiva) : null;

      const ranking = compañeros
        .map(u => {
          const r = calcularNotaFinal(rec, u.nombre);
          return { nombre: u.nombre, valor: r && r.valor !== null ? r.valor : null };
        })
        .filter(x => x.valor !== null)
        .sort((a, b) => b.valor - a.valor);
      const puesto = definitiva !== null ? ranking.findIndex(x => x.nombre === nombre) + 1 : null;

      return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <div class="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)} · ${escapeHtml(mesLabel(rec.mes))}</p>
            <p class="text-xs text-slate2 mt-0.5">Docente: ${nombrePersonaClicable(rec.docente, 'Docente')}</p>
          </div>
          <div class="flex items-center gap-2">
            ${esActual
              ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-turquesa/10 text-turquesa">Periodo actual</span>`
              : `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-slate2">Historial</span>`}
            ${definitiva !== null && escala ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${escala.bg};color:${escala.color}"><span class="w-4 h-4 inline-flex items-center justify-center rounded-full bg-white text-ink text-[10px] font-black mr-1 shadow-xs">${escala.letra}</span> ${calificacionCualitativa(definitiva)} (${escala.letra})</span>` : ''}
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-4">Nota</th><th class="py-2.5 px-4">Porcentaje</th><th class="py-2.5 px-4 text-right">Calificación</th></tr></thead>
            <tbody>${filasNotas || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Este docente aún no ha definido notas de evaluación.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 px-6 py-5 border-t border-gray-100">
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Nota definitiva</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-extrabold" style="color:${colorCualitativa(definitiva)}">${definitiva !== null ? definitiva.toFixed(1) : '—'}</p>
              ${escala ? `<span class="text-xs font-bold px-2 py-0.5 rounded-md" style="background:${escala.bg};color:${escala.color}">Escala: ${escala.letra} (${escala.descripcion})</span>` : ''}
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Puesto en la cohorte</p>
            <p class="text-2xl font-extrabold text-ink mt-1">${puesto !== null ? puesto + ' de ' + ranking.length : '—'}</p>
          </div>
        </div>
      </div>`;
    }).join('');

    // Selector de mes
    const selectorMes = mesesDisponibles.length > 1 ? `
      <div class="flex items-center gap-2 mb-5 flex-wrap">
        <span class="text-xs font-bold text-slate2 uppercase tracking-wide shrink-0">Filtrar por mes:</span>
        <div class="flex flex-wrap gap-2">
          ${mesesDisponibles.map(m => `
            <button onclick="cambiarCalifMesEstudiante('${m}')"
              class="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${m === estudianteCalifMes
                ? 'bg-morado text-white shadow-md shadow-morado/25'
                : 'bg-gray-100 text-slate2 hover:bg-morado/10 hover:text-morado'
              }">
              ${escapeHtml(mesLabel(m))}
            </button>`).join('')}
        </div>
      </div>` : '';

    mount.innerHTML = `
      ${resumenSuperior}
      <p class="text-xs text-slate2 mb-4">Cada mes y materia que te asignaron tiene su propia hoja de calificación — el periodo más reciente es el actual; los anteriores quedan como historial.</p>
      ${selectorMes}
      ${bloques || `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 text-center">
        <p class="text-sm text-slate2">No hay calificaciones registradas para <strong class="text-ink">${escapeHtml(mesLabel(estudianteCalifMes))}</strong>.</p>
      </div>`}`;
  }

  // async: 'modulos' vía MySQL.
  async function renderAcademicoEstudiante() {

    const mod = await estudianteModulo();
    const pensumItems = mod ? (await Store.list('pensum')).filter(p => p.modulo === mod.modulo) : [];
    const docentesCohorte = mod ? await docentesDeCohorte(mod.nombre) : [];
    document.getElementById('mount-s-academico').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Mi cohorte</p>
        ${mod ? `
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <p class="text-lg font-extrabold text-ink">${escapeHtml(mod.nombre)}</p>
            ${statusPill(mod.estado, ESTADO_COLORS)}
          </div>
          <p class="text-sm text-slate2">${escapeHtml(mod.modulo)}</p>
          <p class="text-sm text-slate2 mt-1">${fmtDate(mod.fechaInicio)} — ${fmtDate(mod.fechaFin)}</p>
          <div class="mt-3">
            <p class="text-xs font-semibold text-slate2 mb-1.5">Profesores de mi cohorte</p>
            <div class="flex flex-wrap gap-2">
              ${docentesCohorte.length
                ? docentesCohorte.map(d => `<span class="inline-flex items-center rounded-full bg-morado/10 px-3 py-1 text-sm font-semibold text-morado">${nombrePersonaClicable(d, 'Docente')}</span>`).join('')
                : '<span class="text-sm text-slate2">Sin docentes asignados aún.</span>'}
            </div>
          </div>
        ` : '<p class="text-sm text-slate2">No tienes un módulo activo asignado por el momento.</p>'}
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Temas / horario de tu módulo</p>
          <div class="relative">
            <input data-table="table-estudiante-academico" oninput="TableManager.filter('table-estudiante-academico', this.value)" type="text" placeholder="Buscar tema o docente..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-academico" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4">Docente</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr data-search="${escapeHtml((p.tema + ' ' + (p.docente || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-ink">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm text-slate2">${nombrePersonaClicable(p.docente, 'Docente')}</td>
              </tr>`).join('') || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no hay temas cargados para tu módulo.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      ${await renderHorarioEstudianteBloque(mod)}`;
    TableManager.init('table-estudiante-academico');
  }

  // ---------- Mi horario de clases (estudiante) ----------
  // async: 'horarios' vía MySQL.
  async function renderHorarioEstudianteBloque(mod) {
    if (!mod) return '';
    const registros = (await Store.list('horarios')).filter(h => h.cohorte === mod.nombre);
    if (!registros.length) {
      return `<div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-8 mt-6 text-center">
        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200/60">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <p class="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Mi horario de clases</p>
        <p class="text-sm text-slate2">Tu cohorte aún no tiene un horario publicado por la administración.</p>
      </div>`;
    }
    const meses = registros.map(r => r.mes).sort();
    if (!estudianteHorarioMes || !meses.includes(estudianteHorarioMes)) {
      const hoy = new Date();
      const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
      estudianteHorarioMes = meses.includes(mesActual) ? mesActual : meses[meses.length - 1];
    }
    const registro = registros.find(r => r.mes === estudianteHorarioMes);
    const dias = registro.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const franjas = franjasActivas(registro);

    const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = diasSemanaNombres[(new Date()).getDay()];

    const columnas = dias.map(dia => {
      const infoCamisa = getInfoCamisaDia(dia, mod.nombre);
      const franjasDelDia = franjas.filter(f => f.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
      const esHoy = dia === diaHoy;

      const tarjetas = franjasDelDia.map(f => `
        <div class="rounded-xl border border-gray-100 p-3 mb-2 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${infoCamisa.franjaBorder}; background: #ffffff;">
          <div class="flex items-center justify-between gap-1 mb-1">
            <p class="text-xs font-bold text-ink leading-snug">${escapeHtml(f.curso || '—')}</p>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-slate2" ${((minutosDesdeHora(f.fin) - minutosDesdeHora(f.inicio)) / 60 >= 8.5) ? 'title="Jornada completa: 8 horas (descontada 1 hora de almuerzo)"' : ''}>${horasFranja(f)}h</span>
          </div>
          <p class="text-[11px] text-slate2 mt-1.5 font-medium flex items-center gap-1">
            <svg class="w-3 h-3 text-slate2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>${f.inicio}–${f.fin}</span>
          </p>
          <div class="flex items-center gap-1 text-[11px] text-slate2 mt-1">
            <svg class="w-3 h-3 text-slate2/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span class="truncate">${nombrePersonaClicable(f.docente, 'Docente')}</span>
          </div>
        </div>`).join('');

      return `
        <div class="rounded-2xl p-3 border border-gray-200/70 shadow-2xs flex flex-col ${esHoy ? 'ring-2 ring-amber-400/40' : ''}" style="background:${infoCamisa.franjaBg};">
          <div class="flex flex-col gap-1.5 mb-2.5 pb-2 border-b border-gray-200/60">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1.5">
                ${esHoy ? '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>' : ''}
                <p class="text-xs font-extrabold uppercase tracking-wider text-ink">${dia}</p>
              </div>
              <span class="text-[10px] font-bold text-slate2 bg-white/85 px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">${franjasDelDia.length} clase${franjasDelDia.length === 1 ? '' : 'es'}</span>
            </div>
            <div class="w-full flex">
              ${badgeCamisaDia(dia, mod.nombre)}
            </div>
          </div>
          <div class="flex-1">
            ${tarjetas || '<div class="p-3 text-center rounded-xl bg-white/70 border border-dashed border-gray-200 text-[11px] text-slate2/70 italic">Sin clases</div>'}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden mt-6">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-amber-50/20">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <p class="text-xs font-bold uppercase tracking-wider text-amber-600">Mi horario de clases</p>
            </div>
            <h3 class="text-sm font-extrabold text-ink mt-0.5">${escapeHtml(mod.nombre)} · ${franjas.length} franja${franjas.length === 1 ? '' : 's'}</h3>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate2 font-semibold">Mes:</label>
              <select onchange="onCambiaMesEstudianteHorario(this.value)" class="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                ${meses.map(m => `<option value="${m}" ${m === estudianteHorarioMes ? 'selected' : ''}>${mesLabel(m)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="p-4 sm:p-6 overflow-x-auto">
          <div class="grid gap-3 min-w-[780px]" style="grid-template-columns:repeat(${dias.length}, minmax(160px, 1fr))">
            ${columnas}
          </div>
        </div>
      </div>`;
  }

  function onCambiaMesEstudianteHorario(mes) {
    estudianteHorarioMes = mes;
    renderAcademicoEstudiante();
  }

  // ---------- PENSUM CURRICULAR ----------
  // async: 'modulos' vía MySQL.
  async function renderPensumEstudiante() {
    const mod = await estudianteModulo();
    const pensumItems = [...(await Store.list('pensum'))].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    document.getElementById('mount-s-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <p class="text-sm font-bold text-ink tracking-tight">Pensum de ${mod ? escapeHtml(mod.modulo) : 'tu módulo'}</p>
            <p class="text-xs text-slate2 mt-0.5">${pensumItems.length} tema${pensumItems.length === 1 ? '' : 's'} en el plan de estudios</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <input data-table="table-estudiante-pensum" oninput="TableManager.filter('table-estudiante-pensum', this.value)" type="text" placeholder="Buscar tema..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
              <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="descargarPensumEstudiante()" class="text-xs font-semibold text-white bg-ink hover:bg-morado transition rounded-full px-4 py-2">Descargar PDF</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-pensum" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">#</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4" data-no-sort="true">Material</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr data-search="${escapeHtml((p.orden + ' ' + p.tema + ' ' + (p.archivoNombre || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-slate2">${p.orden}</td>
                <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verArchivoPensum('${p.id}')" class="text-xs font-semibold text-morado hover:underline inline-flex items-center gap-1">${ICON_CLIP_SVG}${escapeHtml(p.archivoNombre || 'Ver archivo')}</button>` : '<span class="text-xs text-slate2">Sin archivo</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Sin temas registrados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-pensum');
  }

  // async: 'modulos' vía MySQL. window.open() se llama SÍNCRONAMENTE antes
  // de cualquier await, para no activar el bloqueador de popups del
  // navegador (mismo cuidado que en abrirMemorandoCarta).
  async function descargarPensumEstudiante() {
    const win = window.open('', '_blank');
    const mod = await estudianteModulo();
    const pensumItems = [...(await Store.list('pensum'))].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    win.document.write(`<html><head><title>Pensum - ${escapeHtml(mod ? mod.modulo : '')}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#14181F}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}th{background:#f5f5f5}</style>
      </head><body><h1>Pensum curricular — ${escapeHtml(mod ? mod.modulo : '')}</h1>
      <p>Estudiante: ${escapeHtml(estudianteNombre())}</p>
      <table><thead><tr><th>#</th><th>Tema</th><th>Intensidad</th></tr></thead><tbody>
      ${pensumItems.map(p => `<tr><td>${p.orden}</td><td>${escapeHtml(p.tema)}</td><td>${p.horas} h</td></tr>`).join('')}
      </tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  // ---------- MEMORANDOS (solo lectura, formato carta) ----------
  async function renderMemorandosEstudiante() {
    const doc = getEstudiante();
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      memorandosParaEstudiante(),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    document.getElementById('mount-s-memorandos').innerHTML = `
      <div class="space-y-4">
        ${memos.map(m => {
          const noLeido = !(mapa[m.id] && mapa[m.id][email]);
          return `
          <button onclick="verMemorandoEstudiante('${m.id}')" class="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-soft p-5 hover:border-oro transition">
            <div class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${noLeido ? '#F5A623' : '#5B647233'}"></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3 mb-1">
                  <p class="text-sm ${noLeido ? 'font-bold text-ink' : 'font-semibold text-slate2'}">${escapeHtml(m.titulo)}</p>
                  ${statusPill(m.estado, ESTADO_COLORS)}
                </div>
                <p class="text-xs text-slate2 mb-2">${fmtDate(m.fecha)} · De: Equipo Directivo Fundación A+</p>
                <p class="text-sm text-slate2 flex items-center gap-1">${m.archivoDatos ? `${ICON_CLIP_SVG} ${escapeHtml(m.archivoNombre || 'Documento adjunto')}` : 'Sin archivo adjunto'}</p>
                <p class="text-xs font-semibold text-morado mt-2">Ver memorando en formato de carta →</p>
              </div>
            </div>
          </button>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes memorandos por el momento.</p>'}
      </div>`;
  }

  // Igual que renderMemorandosEstudiante, pero para el panel del Docente
  // (mount-t-memorandos) y usando verMemorandoUsuarioActual (que resuelve
  // solo por el correo real, sin depender de una cohorte).
  async function renderMemorandosDocente() {
    const doc = currentDocente || {};
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      memorandosParaUsuarioActual(),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    document.getElementById('mount-t-memorandos').innerHTML = `
      <div class="space-y-4">
        ${memos.map(m => {
          const noLeido = !(mapa[m.id] && mapa[m.id][email]);
          return `
          <button onclick="verMemorandoUsuarioActual('${m.id}')" class="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-soft p-5 hover:border-oro transition">
            <div class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${noLeido ? '#F5A623' : '#5B647233'}"></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3 mb-1">
                  <p class="text-sm ${noLeido ? 'font-bold text-ink' : 'font-semibold text-slate2'}">${escapeHtml(m.titulo)}</p>
                  ${statusPill(m.estado, ESTADO_COLORS)}
                </div>
                <p class="text-xs text-slate2 mb-2">${fmtDate(m.fecha)} · De: Equipo Directivo Fundación A+</p>
                <p class="text-sm text-slate2 flex items-center gap-1">${m.archivoDatos ? `${ICON_CLIP_SVG} ${escapeHtml(m.archivoNombre || 'Documento adjunto')}` : 'Sin archivo adjunto'}</p>
                <p class="text-xs font-semibold text-morado mt-2">Ver memorando en formato de carta →</p>
              </div>
            </div>
          </button>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes memorandos por el momento.</p>'}
      </div>`;
  }

  // ---------- PQR ----------
  // Helper compartido (Docente y Estudiante): sube una PQR como archivo PDF.
  // Devuelve true si se guardó correctamente.
  // Copia un archivo (ya en Data URL) a la sección "Archivos" de la ficha
  // del estudiante en Historial Trainee — usado SOLO para memorandos
  // dirigidos puntualmente a un estudiante (ver saveModal). Las PQR son
  // privadas y nunca generan copia aquí: no se mezclan con Historial
  // Trainee, que es visible para cualquier admin/coordinador con acceso a
  // ese panel. No aplica el límite de 3MB pensado para subida manual
  // (TRAINEE_ARCHIVO_MAX_BYTES): esta es una copia de algo que ya pasó su
  // propio límite de origen (el de saveModal en Memorandos), no una
  // subida nueva.
  // async: 'usuarios' vía MySQL.
  // CORREGIDO: mismo bug que agregarArchivoTrainee() — usaba Store.set()
  // con el array completo. Ahora usa Store.agregarArchivo() (POST
  // puntual). El campo "origen" ('PQR'/'Memorando') viaja en el mismo
  // body; ver la columna `origen` agregada a trainee_archivos en
  // migracion_trainee_archivos_origen.sql.
  async function copiarArchivoATraineeDeEstudiante(estudianteNombreOEmail, { nombre, tipo, datos, origen }) {
    if (!datos) return;
    const usuarios = await Store.list('usuarios');
    const est = usuarios.find(u =>
      u.rol === 'Estudiante' && (
        u.nombre === estudianteNombreOEmail ||
        (u.email || '').toLowerCase() === String(estudianteNombreOEmail || '').toLowerCase()
      ));
    if (!est) return; // no se pudo resolver a un estudiante real (ej. remitente ya no existe o no es estudiante) — no se guarda nada
    await Store.agregarArchivo({
      estudianteId: est.id,
      nombre: nombre || 'Archivo', tipo: tipo || 'application/pdf', datos,
      fecha: new Date().toISOString().slice(0, 10),
      origen: origen || null, // 'PQR' | 'Memorando' — solo informativo, para distinguir en la UI de dónde vino
    });
  }

  async function subirPqrArchivo({ tipoId, asuntoId, fileId, solicitante, remitenteRol }) {
    const tipo = document.getElementById(tipoId).value;
    const asunto = document.getElementById(asuntoId).value.trim();
    const fileInput = document.getElementById(fileId);
    const file = fileInput.files && fileInput.files[0];
    if (!asunto) { toast('Escribe el asunto de tu solicitud', 'err'); return false; }
    if (!file) { toast('Adjunta el PDF de tu solicitud', 'err'); return false; }
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) { toast('El archivo debe ser un PDF', 'err'); return false; }
    if (file.size > 8 * 1024 * 1024) { toast('El archivo no puede superar 8 MB', 'err'); return false; }

    const archivoDatos = await leerArchivoComoDataURL(file);
    const registros = await Store.list('pqr');
    registros.push({
      id: uid('pq'), tipo, solicitante, remitenteRol, asunto,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'Pendiente', fechaActivacion: null,
      archivoNombre: file.name, archivoTipo: file.type || 'application/pdf', archivoDatos,
    });
    await Store.set('pqr', registros);
    fileInput.value = '';

    // Las PQR son privadas: no se archiva ninguna copia en Historial
    // Trainee. Ese historial es visible para cualquier admin/coordinador
    // con acceso al panel "Historial Trainee", mientras que PQR tiene su
    // propio flujo de acceso (panel PQR) — mezclar ambos filtraría
    // contenido privado del estudiante a una vista que no debería tenerlo.
    return true;
  }

  // Fila reutilizable de "mis solicitudes" (Docente y Estudiante).
  function filaPqrPropia(p) {
    return `
      <tr data-search="${escapeHtml((p.tipo + ' ' + p.asunto + ' ' + p.estado).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.tipo)}</td>
        <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(p.asunto)}</td>
        <td class="py-3 px-4">${statusPill(p.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verPqrPropia('${p.id}')" class="text-xs font-semibold text-morado hover:underline inline-flex items-center gap-1">${ICON_CLIP_SVG}${escapeHtml(p.archivoNombre || 'Ver PDF')}</button>` : '—'}</td>
      </tr>`;
  }

  // Abre en una pestaña nueva el PDF que el propio Docente/Estudiante envió.
  // async: 'pqr' vía MySQL. window.open() se llama SÍNCRONAMENTE antes de
  // cualquier await, para no activar el bloqueador de popups.
  async function verPqrPropia(id) {
    const win = window.open('', '_blank');
    const p = (await Store.list('pqr')).find(r => r.id === id);
    if (!p || !p.archivoDatos) { toast('No se encontró el archivo', 'err'); win.close(); return; }
    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.asunto;
  }

  // async: 'pqr' vía MySQL.
  async function renderPqrEstudiante() {
    const nombre = estudianteNombre();
    const propias = [...(await Store.list('pqr'))].filter(p => p.solicitante === nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-s-pqr').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Enviar una nueva solicitud</p>
        <p class="text-xs text-slate2 mb-4">Adjunta tu petición, queja o reclamo como archivo PDF. Quedará en estado <span class="font-semibold text-ink">Pendiente</span> hasta que el administrador lo descargue.</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Tipo</label>
            <select id="pqr_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30">
              <option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asunto</label>
            <input id="pqr_asunto" type="text" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
        </div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Archivo PDF</label>
        <input id="pqr_archivo" type="file" accept=".pdf,application/pdf" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-oro/30" />
        <button onclick="enviarPqrEstudiante()" class="mt-4 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Mis solicitudes</p>
          <div class="relative">
            <input data-table="table-estudiante-pqr" oninput="TableManager.filter('table-estudiante-pqr', this.value)" type="text" placeholder="Buscar solicitud..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4" data-no-sort="true">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-pqr');
  }

  async function enviarPqrEstudiante() {
    const ok = await subirPqrArchivo({ tipoId: 'pqr_tipo', asuntoId: 'pqr_asunto', fileId: 'pqr_archivo', solicitante: estudianteNombre(), remitenteRol: 'Estudiante' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrEstudiante();
  }

  // "Calendario institucional" fue eliminado del panel Estudiante.

  // ---------- ENCUESTAS DE SATISFACCIÓN ----------
  // async: 'encuestas' vía MySQL.
  async function renderEncuestasEstudiante() {
    const est = getEstudiante();
    const encuestas = [...(await Store.list('encuestas'))]
      .filter(e => e.estado === 'Abierta' && e.cohorte === est.cohorte)
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-s-encuestas').innerHTML = `
      <div class="grid sm:grid-cols-2 gap-4">
        ${encuestas.map(e => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-sm font-bold text-ink">${escapeHtml(e.titulo)}</p>
              ${statusPill(e.estado, ESTADO_COLORS)}
            </div>
            <p class="text-xs text-slate2 mb-3">${fmtDate(e.fecha)}</p>
            <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-ink hover:bg-oro transition rounded-full px-4 py-2">
              Responder encuesta
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8 sm:col-span-2">No hay encuestas disponibles para tu cohorte por el momento.</p>'}
      </div>`;
  }

  // ---------- AGENDA PERSONAL INTELIGENTE ----------
  // async: 'agenda_estudiante' vía MySQL.
  async function renderAgendaEstudiante() {
    const nombre = estudianteNombre();
    const eventos = [...(await Store.list('agenda_estudiante', { forceRefresh: true }))].filter(a => a.estudiante === nombre).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const mount = document.getElementById('mount-s-agenda');
    if (!mount) return;
    mount.innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          <select id="ag_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30">
            <option>Taller</option><option>Quiz</option><option>Entrega</option><option>Evento</option><option>Recordatorio</option>
          </select>
          <input id="ag_fecha" type="date" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
        </div>
        <button onclick="agregarEventoAgenda()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Agregar</button>
      </div>
      <div class="space-y-3">
        ${eventos.map(a => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(a.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}${a.hora ? ' · ' + escapeHtml(a.hora) : ''}</p>
            </div>
            <button onclick="eliminarEventoAgenda('${a.id}')" class="text-xs font-semibold text-coral hover:underline shrink-0">Eliminar</button>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes eventos en tu agenda personal.</p>'}
      </div>`;
  }

  // async: 'agenda_estudiante' vía MySQL.
  async function agregarEventoAgenda() {
    const inputTitulo = document.getElementById('ag_titulo');
    const inputFecha = document.getElementById('ag_fecha');
    const inputTipo = document.getElementById('ag_tipo');
    const titulo = inputTitulo ? inputTitulo.value.trim() : '';
    const tipo = inputTipo ? inputTipo.value : 'Recordatorio';
    const fecha = inputFecha ? inputFecha.value : '';
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = await Store.list('agenda_estudiante', { forceRefresh: true });
    registros.push({ id: uid('ag'), estudiante: estudianteNombre(), titulo, tipo, fecha, hora: '', notas: '' });
    await Store.set('agenda_estudiante', registros);
    if (typeof Store.invalidate === 'function') Store.invalidate('agenda_estudiante');
    if (inputTitulo) inputTitulo.value = '';
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaEstudiante();
  }

  // async: 'agenda_estudiante' vía MySQL.
  async function eliminarEventoAgenda(id) {
    if (!id) return;
    try {
      if (typeof window.apiFetch === 'function') {
        await window.apiFetch('agenda_estudiante?id=' + encodeURIComponent(id), { method: 'DELETE' }).catch(err => console.warn('[eliminarEventoAgenda apiFetch]', err));
      }
    } catch (e) {
      console.warn('[eliminarEventoAgenda]', e);
    }
    const registros = (await Store.list('agenda_estudiante', { forceRefresh: true })).filter(a => a.id !== id);
    await Store.set('agenda_estudiante', registros);
    if (typeof Store.invalidate === 'function') Store.invalidate('agenda_estudiante');
    toast('Evento eliminado', 'ok');
    renderAgendaEstudiante();
  }

  const RENDERERS_ESTUDIANTE = {
    resumen: renderResumenEstudiante,
    notificaciones: async () => {
      let tries = 0;
      while (tries < 15 && !(typeof window !== 'undefined' && typeof window.renderNotificacionesEstudiante === 'function')) {
        await new Promise(r => setTimeout(r, 60));
        tries++;
      }
      if (typeof window !== 'undefined' && typeof window.renderNotificacionesEstudiante === 'function') {
        await window.renderNotificacionesEstudiante();
      } else if (typeof renderNotificacionesEstudiante === 'function') {
        await renderNotificacionesEstudiante();
      }
    },
    perfil: renderPerfilEstudiante,
    asistencia: renderAsistenciaEstudiante,
    academico: renderAcademicoEstudiante,
    calificaciones: renderCalificacionesEstudiante,
    pensum: renderPensumEstudiante,
    memorandos: renderMemorandosEstudiante,
    pqr: renderPqrEstudiante,
    agenda: renderAgendaEstudiante,
    misProyectos: async () => { if (typeof renderMisProyectosEstudiante === 'function') await renderMisProyectosEstudiante(); else if (typeof window !== 'undefined' && typeof window.renderMisProyectosEstudiante === 'function') await window.renderMisProyectosEstudiante(); },
    solicitar_equipo: async () => {
      let tries = 0;
      while (tries < 15 && !(typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') && typeof renderSolicitarEquipoForm !== 'function') {
        await new Promise(r => setTimeout(r, 60));
        tries++;
      }
      if (typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') {
        await window.renderSolicitarEquipoForm('mount-s-solicitar_equipo');
      } else if (typeof renderSolicitarEquipoForm === 'function') {
        await renderSolicitarEquipoForm('mount-s-solicitar_equipo');
      }
    },
  };


  // Exportar funciones y estado al scope global (window)
  window.initEstudiante = initEstudiante;
  window.showPanelEstudiante = showPanelEstudiante;
  window.renderResumenEstudiante = renderResumenEstudiante;
  window.renderPerfilEstudiante = renderPerfilEstudiante;
  window.renderCalificacionesEstudiante = renderCalificacionesEstudiante;
  window.renderAsistenciaEstudiante = renderAsistenciaEstudiante;
  window.renderPensumEstudiante = renderPensumEstudiante;
  window.renderMemorandosEstudiante = renderMemorandosEstudiante;
  window.renderPqrEstudiante = renderPqrEstudiante;
  window.renderAgendaEstudiante = renderAgendaEstudiante;
  window.renderEncuestasEstudiante = renderEncuestasEstudiante;
  window.subirPqrArchivo = subirPqrArchivo;
  window.filaPqrPropia = filaPqrPropia;
  window.enviarPqrEstudiante = enviarPqrEstudiante;
  window.verPqrPropia = verPqrPropia;
  window.descargarPensumEstudiante = descargarPensumEstudiante;
  window.abrirPerfilPersona = abrirPerfilPersona;
  window.abrirPerfilPersonaPorNombreYRol = abrirPerfilPersonaPorNombreYRol;
  window.cerrarPerfilPersonaModal = cerrarPerfilPersonaModal;
  window.actualizarAvatarEstudianteEnDom = actualizarAvatarEstudianteEnDom;
  window.actualizarUsuarioEstudianteActual = actualizarUsuarioEstudianteActual;
  window.renderAcademicoEstudiante = renderAcademicoEstudiante;
  window.subirFotoPerfilEstudiante = subirFotoPerfilEstudiante;
  window.quitarFotoPerfilEstudiante = quitarFotoPerfilEstudiante;
  window.guardarPerfilEstudiante = guardarPerfilEstudiante;
  window.agregarEventoAgenda = agregarEventoAgenda;
  window.eliminarEventoAgenda = eliminarEventoAgenda;
  window.escanearAsistencia = escanearAsistencia;
  window.cambiarCalifMesEstudiante = cambiarCalifMesEstudiante;
  window.onCambiaMesEstudianteHorario = onCambiaMesEstudianteHorario;
  window.getEstudiante = getEstudiante;
  window.setEstudiante = setEstudiante;
  window.estudianteModulo = estudianteModulo;
  window.estudianteNombre = estudianteNombre;
  window.toggleAsistenciaExtra = toggleAsistenciaExtra;
  if (!window.RENDERERS_ESTUDIANTE) window.RENDERERS_ESTUDIANTE = {};
  Object.assign(window.RENDERERS_ESTUDIANTE, RENDERERS_ESTUDIANTE);

})();
