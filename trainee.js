/**
 * trainee.js — Módulo de Historial, Seguimiento Integral y Ficha Trainee
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Ficha centralizada y hoja de vida académica del estudiante (Trainee Profile)
 * 2. Radar de competencias, habilidades y talentos técnicos
 * 3. Trazabilidad completa de pagos, matrículas y mensualidades con filtros
 * 4. Asistencia acumulada, notas por módulo y memorandos institucionales asociados
 * 5. Repositorio de archivos, documentos y comprobantes del estudiante (PDF/imágenes)
 * 6. Generador e impresión de Ficha Trainee en PDF corporativo oficial
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : (typeof currentAdminRole !== 'undefined' ? currentAdminRole : 'superadmin'));
  const getAdminUser = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : (typeof currentAdminUser !== 'undefined' ? currentAdminUser : null));
  const showPanel = async (p) => { if (typeof window !== 'undefined' && typeof window.showPanel === 'function') return await window.showPanel(p); };

  const calificacionCualitativa = (nota) => {
    if (typeof window !== 'undefined' && typeof window.calificacionCualitativa === 'function') return window.calificacionCualitativa(nota);
    if (nota === null || nota === undefined || isNaN(nota)) return '—';
    if (nota >= 9) return 'Desempeño Superior';
    if (nota >= 7) return 'Desempeño Alto';
    if (nota >= 6) return 'Desempeño Básico';
    return 'Desempeño Bajo';
  };

  const colorCualitativa = (nota) => {
    if (typeof window !== 'undefined' && typeof window.colorCualitativa === 'function') return window.colorCualitativa(nota);
    if (nota === null || nota === undefined || isNaN(nota)) return '#5B6472';
    if (nota >= 9) return '#1FC8C0';
    if (nota >= 7) return '#0f8f89';
    if (nota >= 6) return '#F5A623';
    return '#EC4899';
  };

  const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesLabel = (mesValue) => {
    if (typeof window !== 'undefined' && typeof window.mesLabel === 'function') return window.mesLabel(mesValue);
    if (!mesValue || mesValue === '0000-00') return 'Periodo sin fecha registrada';
    const [y, m] = mesValue.split('-').map(Number);
    return (MESES_ES[m - 1] || '') + ' ' + y;
  };

  const statusPill = (value, map) => {
    if (typeof window !== 'undefined' && typeof window.statusPill === 'function') return window.statusPill(value, map);
    return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full">${escapeHtml(value)}</span>`;
  };

  const docentesDeCohorte = async (cohorte, horarios) => {
    if (typeof window !== 'undefined' && typeof window.docentesDeCohorte === 'function') return await window.docentesDeCohorte(cohorte, horarios);
    return [];
  };

  const mesesConNotasDocenteCohorte = async (docente, cohorte) => {
    if (typeof window !== 'undefined' && typeof window.mesesConNotasDocenteCohorte === 'function') return await window.mesesConNotasDocenteCohorte(docente, cohorte);
    return [];
  };

  const promedioGeneralEstudianteCohorte = async (estudiante, cohorte, mes) => {
    if (typeof window !== 'undefined' && typeof window.promedioGeneralEstudianteCohorte === 'function') return await window.promedioGeneralEstudianteCohorte(estudiante, cohorte, mes);
    return null;
  };

  const abrirMemorandoCarta = async (id) => {
    if (typeof window !== 'undefined' && typeof window.abrirMemorandoCarta === 'function') return await window.abrirMemorandoCarta(id);
  };

  const leerArchivoComoDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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

  const Store = {
    get: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[trainee] window.Store no disponible'); return s.get(col, opts); },
    list: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[trainee] window.Store no disponible'); return s.list(col, opts); },
    save: (col, item) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[trainee] window.Store no disponible'); return s.save(col, item); },
    invalidate: (col) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) return; return s.invalidate(col); }
  };

  const fetchApi = async (endpoint, opts) => {
    if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') return await window.apiFetch(endpoint, opts);
    throw new Error('apiFetch no disponible');
  };
  const apiFetch = fetchApi;

  // ---------- HISTORIAL TRAINEE (ficha centralizada del estudiante) ----------
  // Reúne, de solo lectura, todo lo que ya existe en otros módulos sobre un
  // estudiante puntual (Memorandos, Asistencia, PQR, Calificaciones), más
  // una sección de Archivos (imágenes/PDF) que SOLO existe aquí — se
  // guardan como Data URL en localStorage (Store 'trainee_archivos'), con
  // un límite de tamaño razonable por archivo para no saturar el navegador.
  const TRAINEE_ARCHIVO_MAX_BYTES = 3 * 1024 * 1024; // 3 MB por archivo
  let traineeState = { estudianteId: null, busquedaArchivo: '', filtroTipo: 'todos', archivosExpandidos: false };

  function toggleExpandirArchivosTrainee() {
    traineeState.archivosExpandidos = !traineeState.archivosExpandidos;
    renderTraineeFicha();
  }

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getBadgeArchivo(archivo) {
    const tipo = (archivo.tipo || '').toLowerCase();
    const nombre = (archivo.nombre || '').toLowerCase();
    if (tipo.includes('pdf') || nombre.endsWith('.pdf')) {
      return { label: 'PDF', bg: 'bg-rose-500 text-white', icon: 'pdf' };
    }
    if (tipo.includes('png') || nombre.endsWith('.png')) {
      return { label: 'PNG', bg: 'bg-indigo-600 text-white', icon: 'img' };
    }
    if (tipo.includes('jpeg') || tipo.includes('jpg') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg')) {
      return { label: 'JPG', bg: 'bg-amber-600 text-white', icon: 'img' };
    }
    if (tipo.includes('webp') || nombre.endsWith('.webp')) {
      return { label: 'WEBP', bg: 'bg-teal-600 text-white', icon: 'img' };
    }
    if (tipo.startsWith('image/')) {
      return { label: 'IMG', bg: 'bg-morado text-white', icon: 'img' };
    }
    return { label: 'DOC', bg: 'bg-slate-700 text-white', icon: 'doc' };
  }

  window.seleccionarHabilidadTrainee = function(h) {
    const input = document.getElementById('traineeBusquedaEmail');
    if (input) {
      input.value = h;
      onBuscaTraineeEmail(h);
      input.focus();
    }
  };

  async function renderTrainee() {
    const todosEstudiantes = (await Store.list('usuarios'))
      .filter(u => u.rol === 'Estudiante' || u.fueEstudiante)
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Extraer talentos y habilidades únicos de estudiantes
    const habilidadesEstudiantes = new Set();
    todosEstudiantes.forEach(u => {
      let habs = [];
      if (Array.isArray(u.habilidades)) habs = u.habilidades;
      else if (typeof u.habilidades === 'string' && u.habilidades.trim()) {
        try {
          const p = JSON.parse(u.habilidades);
          if (Array.isArray(p)) habs = p;
        } catch(e) {
          habs = u.habilidades.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      habs.forEach(h => {
        if (h && typeof h === 'string' && h.trim()) habilidadesEstudiantes.add(h.trim());
      });
    });
    const listaTopHabilidades = Array.from(habilidadesEstudiantes).sort();

    if (!traineeState.estudianteId && todosEstudiantes.length > 0) {
      traineeState.estudianteId = todosEstudiantes[0].id;
    }
    const estudianteActivo = todosEstudiantes.find(u => u.id === traineeState.estudianteId);

    const radarTalentosHtml = listaTopHabilidades.length > 0 ? `
      <div class="mt-3.5 pt-3 border-t border-morado/10">
        <p class="text-[11px] font-bold uppercase tracking-wider text-slate2 mb-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Radar de Talentos (Filtrar estudiantes por habilidad requerida):
        </p>
        <div class="flex flex-wrap gap-1.5">
          ${listaTopHabilidades.map(h => `
            <button type="button" onclick="seleccionarHabilidadTrainee('${escapeHtml(h)}')" class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-morado/10 text-morado border border-morado/20 hover:bg-morado hover:text-white transition cursor-pointer">
              ${escapeHtml(h)}
            </button>`).join('')}
        </div>
      </div>` : '';

    document.getElementById('mount-trainee').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Historial Trainee</h2>
        <p class="text-sm text-slate2 mt-0.5">Todo lo que ha pasado con un estudiante en la fundación: memorandos, asistencia, PQR, calificaciones y archivos. Incluye a quienes fueron estudiantes y ahora tienen otro rol.</p>
      </div>
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label class="block text-xs font-bold text-slate2 uppercase tracking-wide" for="traineeBusquedaEmail">Buscar por nombre, correo, documento o habilidad</label>
          <span class="text-xs text-slate2">${todosEstudiantes.length} trainees en plataforma</span>
        </div>
        <div class="relative w-full sm:max-w-md mb-3">
          <input id="traineeBusquedaEmail" type="text" value="${estudianteActivo ? escapeHtml(estudianteActivo.nombre + ' (' + estudianteActivo.email + ')') : ''}" oninput="onBuscaTraineeEmail(this.value)" autocomplete="off" placeholder="Escribe un nombre, documento o habilidad (ej. Python)..."
            class="w-full rounded-xl border border-morado/25 bg-morado/5 pl-9 pr-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          <svg class="w-4 h-4 text-slate2 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div id="traineeBusquedaResultados" class="mb-2"></div>
        ${radarTalentosHtml}
      </div>
      <div id="traineeFicha"></div>`;

    await renderTraineeFicha();
  }

  // Busca por coincidencia parcial de correo, nombre, documento, teléfono o habilidades,
  // y solo entre quienes son o fueron Estudiante.
  // async: 'usuarios' vía MySQL.
  async function onBuscaTraineeEmail(valor) {
    const wrap = document.getElementById('traineeBusquedaResultados');
    const q = valor.trim().toLowerCase();
    if (q.length < 1) { wrap.innerHTML = ''; return; }

    const todos = await Store.list('usuarios');
    const coincidencias = todos
      .filter(u => {
        if (u.rol !== 'Estudiante' && !u.fueEstudiante) return false;
        const nombreMatch = (u.nombre || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const docMatch = (u.documento || '').toLowerCase().includes(q);
        const telMatch = (u.telefono || '').toLowerCase().includes(q);
        let habMatch = false;
        let habs = [];
        if (Array.isArray(u.habilidades)) habs = u.habilidades;
        else if (typeof u.habilidades === 'string' && u.habilidades.trim()) {
          try {
            const p = JSON.parse(u.habilidades);
            if (Array.isArray(p)) habs = p;
          } catch(e) {
            habs = u.habilidades.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        habMatch = habs.some(h => String(h).toLowerCase().includes(q));
        return nombreMatch || emailMatch || docMatch || telMatch || habMatch;
      })
      .slice(0, 10);

    if (!coincidencias.length) {
      wrap.innerHTML = `<p class="text-xs text-slate2 mt-1">Sin coincidencias para "${escapeHtml(valor)}".</p>`;
      return;
    }
    wrap.innerHTML = `
      <div class="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden shadow-sm">
        ${coincidencias.map(u => {
          let habs = [];
          if (Array.isArray(u.habilidades)) habs = u.habilidades;
          else if (typeof u.habilidades === 'string' && u.habilidades.trim()) {
            try {
              const p = JSON.parse(u.habilidades);
              if (Array.isArray(p)) habs = p;
            } catch(e) {
              habs = u.habilidades.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          const matchHab = habs.find(h => String(h).toLowerCase().includes(q));
          return `
          <button onclick="onCambiaTraineeEstudiante('${u.id}')" class="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-between gap-3">
            <span class="min-w-0">
              <span class="block text-ink font-medium truncate">${escapeHtml(u.nombre)}</span>
              <span class="block text-xs text-slate2 truncate">${escapeHtml(u.email)}${u.documento ? ' · Doc: ' + escapeHtml(u.documento) : ''}${u.telefono ? ' · Tel: ' + escapeHtml(u.telefono) : ''}</span>
              ${matchHab ? `<span class="inline-block mt-1 text-[11px] font-bold text-morado bg-morado/10 border border-morado/20 px-2 py-0.5 rounded-md">Talento coincidente: ${escapeHtml(matchHab)}</span>` : ''}
            </span>
            <span class="text-xs text-slate2 shrink-0">${u.rol === 'Estudiante' ? '' : 'Fue estudiante · ahora ' + escapeHtml(u.rol)}</span>
          </button>`;
        }).join('')}
      </div>`;
  }

  async function onCambiaTraineeEstudiante(estudianteId) {
    traineeState.estudianteId = estudianteId;
    traineeState.busquedaArchivo = '';
    traineeState.filtroTipo = 'todos';
    traineeState.archivosExpandidos = false;
    const input = document.getElementById('traineeBusquedaEmail');
    const resWrap = document.getElementById('traineeBusquedaResultados');
    if (resWrap) resWrap.innerHTML = '';

    const wrap = document.getElementById('traineeFicha');
    if (wrap) {
      wrap.innerHTML = `<div class="admin-panel-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-10 h-10 border-4 border-morado/20 border-t-morado rounded-full animate-spin"></div>
        <p class="text-sm font-semibold text-ink">Cargando ficha del trainee...</p>
      </div>`;
    }

    const persona = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (input && persona) input.value = persona.nombre + ' (' + persona.email + ')';
    await renderTraineeFicha();
  }

  // Se puede llamar desde afuera (ej. desde el panel Usuarios) para abrir
  // directamente la ficha de un estudiante puntual.
  async function abrirHistorialTrainee(estudianteId) {
    traineeState.estudianteId = estudianteId;
    traineeState.busquedaArchivo = '';
    traineeState.filtroTipo = 'todos';
    traineeState.archivosExpandidos = false;
    await showPanel('trainee');
  }

  function toggleMostrarTodosPagosTrainee() {
    window.__traineeMostrarTodosPagos = !window.__traineeMostrarTodosPagos;
    renderTraineeFicha();
  }
  window.toggleMostrarTodosPagosTrainee = toggleMostrarTodosPagosTrainee;

  async function renderTraineeFicha() {
    const currentAdminRole = getAdminRole();
    const wrap = document.getElementById('traineeFicha');
    if (!wrap) return;
    if (!traineeState.estudianteId) {
      wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Selecciona un estudiante para ver su historial.</p></div>`;
      return;
    }
    const est = (await Store.list('usuarios')).find(u => u.id === traineeState.estudianteId);
    if (!est) { wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Este estudiante ya no existe.</p></div>`; return; }

    // Si ya no es Estudiante (cambió a Docente, Administrador, etc.), la
    // cohorte relevante para todo el historial es la que tenía CUANDO era
    // estudiante (cohorteAnterior, ver saveModal), no la actual — est.cohorte
    // puede estar vacía o ser otra cosa para un Docente/Administrador.
    const esEstudianteActual = est.rol === 'Estudiante';
    const cohorteHistorica = esEstudianteActual ? est.cohorte : est.cohorteAnterior;

    // ---- Memorandos: mismo criterio que memorandosParaEstudiante() (case-
    //      insensitive en el email, incluye envíos a "Todos", "Todos los
    //      estudiantes", o a toda la cohorte del estudiante), y solo los
    //      que ya están en estado "Enviado" — un Borrador tampoco debe
    //      aparecer aquí, igual que no aparece para el propio destinatario.
    //      Se recalcula aquí en vez de reusar esa función porque ella
    //      depende de currentEstudiante (la sesión activa), no de un id
    //      elegido. ----
    const emailLower = (est.email || '').toLowerCase();
    const memos = [...(await Store.list('memorandos'))].filter(m => {
      if (m.estado !== 'Enviado') return false;
      const dest = m.destinatario || '';
      return dest.toLowerCase() === emailLower
        || dest === 'Todos'
        || dest === 'Todos los estudiantes'
        || (cohorteHistorica && dest === cohorteHistorica);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    // ---- Asistencia ----
    const fechaRegEst = (est.creadoEn || est.creado_en || '').trim();
    const fechaRegDate = fechaRegEst ? fechaRegEst.slice(0, 10) : '';
    const hoyAsist = typeof fechaHoyLocal === 'function' ? fechaHoyLocal() : new Date().toISOString().slice(0, 10);
    const sesionesHoyTrainee = (typeof Store !== 'undefined') ? await Store.list('sesiones_asistencia') : [];

    const asistencia = [...(await Store.list('asistencia'))].filter(a => {
      if (a.estudiante !== est.nombre && a.estudiante !== est.email) return false;
      if (a.estado === 'Falla' && fechaRegDate && a.fecha && a.fecha < fechaRegDate) return false;
      if (a.estado === 'Falla' && a.fecha === hoyAsist) {
        const sesHoy = sesionesHoyTrainee.find(s => s.id === a.sesionId || s.materia === a.materia || s.modulo === a.modulo);
        if (sesHoy) {
          const minsHoy = (typeof minutosTranscurridos === 'function') ? minutosTranscurridos(sesHoy.horaInicio || sesHoy.hora_inicio) : 0;
          if (minsHoy <= (typeof VENTANA_TARDE_MIN !== 'undefined' ? VENTANA_TARDE_MIN : 50)) return false;
        }
      }
      return true;
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalesAsist = { Presente: 0, Tarde: 0, Falla: 0 };
    asistencia.forEach(a => { if (totalesAsist[a.estado] !== undefined) totalesAsist[a.estado]++; });
    const pctAsistencia = asistencia.length ? Math.round((totalesAsist.Presente / asistencia.length) * 100) : null;

    // ---- Calificaciones: promedio general por cohorte (reusa el mismo
    //      cálculo que ve Administración en el panel Calificaciones), MÁS
    //      el desglose mes a mes (unión de todos los meses con notas de
    //      cualquier docente de esa cohorte, ver Etapa 5). ----
    const promedioGeneral = cohorteHistorica ? await promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, null) : null;
    let calificacionesPorMes = [];
    if (cohorteHistorica) {
      const mesesUnicos = new Set();
      const docentesHistorico = await docentesDeCohorte(cohorteHistorica);
      for (const d of docentesHistorico) {
        (await mesesConNotasDocenteCohorte(d, cohorteHistorica)).forEach(m => mesesUnicos.add(m));
      }
      const mesesOrdenados = [...mesesUnicos].sort().reverse();
      const resultadosPorMes = await Promise.all(mesesOrdenados.map(m => promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, m)));
      calificacionesPorMes = mesesOrdenados.map((m, i) => ({
        mes: m,
        resultado: resultadosPorMes[i]
      })).filter(r => r.resultado); // solo meses donde este estudiante puntual sí tiene nota
    }

    // ---- Archivos (única sección con datos propios de este módulo) ----
    // Filtro por nombre: se aplica sobre TODOS los archivos de este
    // estudiante, sin importar mayúsculas/acentos, buscando coincidencia
    // parcial dentro del nombre que se le puso a cada archivo.
    // CORREGIDO: Store.list('trainee_archivos') se llamaba de forma
    // síncrona (sin await) — funcionaba "por accidente" porque esta
    // entidad vivía solo en localStorage y Store.get() para entidades NO
    // migradas es síncrono. Ahora que trainee_archivos SÍ está en
    // ENTIDADES_MYSQL (ver db.js), Store.list() devuelve una Promise; sin
    // el await, "archivosTodos" habría quedado como esa Promise en vez
    // del array, rompiendo el .filter() de abajo.
    const archivosTodos = (await Store.list('trainee_archivos', { query: 'estudiante_id=' + encodeURIComponent(est.id) + '&con_datos=1' })).filter(a => a.estudianteId === est.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalArchivos = archivosTodos.length;
    const totalImagenes = archivosTodos.filter(a => (a.tipo || '').startsWith('image/')).length;
    const totalPdfs = archivosTodos.filter(a => (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf'))).length;

    // ---- Pagos y Comprobantes del Estudiante ----
    let pagosEstudiante = [];
    try {
      pagosEstudiante = (await Store.list('pagos_estudiantes', { query: 'estudiante_id=' + encodeURIComponent(est.id), forceRefresh: true }))
        .filter(p => String(p.estudiante_id || p.estudianteId) === String(est.id))
        .sort((a, b) => (b.fecha_pago || b.fechaPago || '').localeCompare(a.fecha_pago || a.fechaPago || ''));
      window.__cachePagosTraineeActual = pagosEstudiante;
    } catch (e) {
      console.warn('Error al cargar pagos del estudiante:', e);
    }
    const totalPagadoEstudiante = pagosEstudiante.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

    const filtroTipo = traineeState.filtroTipo || 'todos';
    const filtroArchivo = (traineeState.busquedaArchivo || '').trim().toLowerCase();

    let archivos = archivosTodos;
    if (filtroTipo === 'imagenes') {
      archivos = archivos.filter(a => (a.tipo || '').startsWith('image/'));
    } else if (filtroTipo === 'pdfs') {
      archivos = archivos.filter(a => (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf')));
    }
    if (filtroArchivo) {
      archivos = archivos.filter(a => (a.nombre || '').toLowerCase().includes(filtroArchivo));
    }

    const limiteArchivos = 6;
    const mostrarVerMas = archivos.length > limiteArchivos;
    const archivosMostrados = (mostrarVerMas && !traineeState.archivosExpandidos)
      ? archivos.slice(0, limiteArchivos)
      : archivos;

    const promVal = promedioGeneral ? promedioGeneral.promedio : null;
    let semaforoBadge = { text: 'Sin datos suficientes', bg: 'bg-gray-100 text-slate2 border-gray-200', dot: 'bg-slate-400' };
    if (promVal !== null || pctAsistencia !== null) {
      const p = promVal !== null ? promVal : 7.0;
      const a = pctAsistencia !== null ? pctAsistencia : 100;
      const m = memos.length;
      if (p >= 7.0 && a >= 80 && m === 0) {
        semaforoBadge = { text: 'Rendimiento Óptimo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      } else if (p >= 6.0 && a >= 70 && m <= 1) {
        semaforoBadge = { text: 'En Seguimiento', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      } else {
        semaforoBadge = { text: 'Atención Requerida', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
      }
    }

    const iniciales = escapeHtml((est.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = est.fotoUrl
      ? `<img src="${escapeHtml(est.fotoUrl)}" alt="${escapeHtml(est.nombre)}" onclick="expandirFotoPerfil('${escapeHtml(est.fotoUrl)}', '${escapeHtml(est.nombre || '')}', '${escapeHtml(est.rol || 'Estudiante')}')" class="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-md shadow-morado/20 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-morado/40" title="Clic para ampliar foto" />`
      : `<div class="w-16 h-16 rounded-2xl grid place-items-center text-xl font-extrabold text-white shrink-0 shadow-md shadow-morado/20" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    wrap.innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            ${avatarHtml}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-lg font-extrabold text-ink">${escapeHtml(est.nombre)}</p>
                ${!esEstudianteActual ? `<span class="text-[10px] font-bold uppercase tracking-wide text-morado bg-morado/10 border border-morado/20 rounded-full px-2 py-0.5">Histórico · ${escapeHtml(est.rol)}</span>` : ''}
                ${statusPill(est.estado || 'Activo', ESTADO_COLORS)}
              </div>
              <p class="text-sm text-slate2 mt-0.5">${escapeHtml(est.email || '')} ${cohorteHistorica ? '· <span class="font-semibold text-ink">' + escapeHtml(cohorteHistorica) + '</span>' + (esEstudianteActual ? '' : ' (cohorte histórica)') : ''}</p>
              
              <!-- Documento y Contacto -->
              <div class="flex items-center gap-4 text-xs text-slate2 mt-2 flex-wrap">
                ${est.documento ? `<span><b class="text-ink">Documento:</b> ${escapeHtml(est.documento)}</span>` : ''}
                ${est.telefono ? `<span class="inline-flex items-center gap-1.5"><b class="text-ink">Teléfono:</b> ${escapeHtml(est.telefono)}${(() => {
                  const d = (est.telefono || '').replace(/\D/g, '');
                  if (d.length >= 10) {
                    const wa = d.length === 10 ? '57' + d : d;
                    return `<a href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 hover:bg-emerald-100 transition"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>WhatsApp</a>`;
                  }
                  return '';
                })()}</span>` : ''}
              </div>

              <!-- Habilidades y Destrezas Chips -->
              ${(() => {
                let habs = [];
                if (Array.isArray(est.habilidades)) habs = est.habilidades;
                else if (typeof est.habilidades === 'string' && est.habilidades.trim()) {
                  try {
                    const p = JSON.parse(est.habilidades);
                    if (Array.isArray(p)) habs = p;
                  } catch(e) {
                    habs = est.habilidades.split(',').map(s => s.trim()).filter(Boolean);
                  }
                }
                if (habs && habs.length > 0) {
                  return `<div class="flex items-center gap-1.5 flex-wrap mt-2.5">
                    <span class="text-[11px] font-bold text-slate2 uppercase tracking-wide mr-1">Talentos / Habilidades:</span>
                    ${habs.map(h => `<span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-morado/10 text-morado border border-morado/20">${escapeHtml(h)}</span>`).join('')}
                  </div>`;
                }
                return '';
              })()}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="exportarFichaTraineePDF('${est.id}')" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold shadow-md shadow-morado/20 hover:shadow-lg hover:shadow-morado/30 transition-all active:scale-[0.98]">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Exportar Ficha Oficial (PDF)</span>
            </button>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Asistencia Acumulada</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-black text-ink">${pctAsistencia !== null ? pctAsistencia + '%' : '—'}</p>
              ${pctAsistencia !== null ? `<span class="text-[11px] font-semibold ${pctAsistencia >= 85 ? 'text-emerald-600' : (pctAsistencia >= 75 ? 'text-amber-600' : 'text-rose-600')}">${pctAsistencia >= 85 ? 'Excelente' : (pctAsistencia >= 75 ? 'Regular' : 'Crítica')}</span>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-0.5">${asistencia.length} registros totales</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Promedio General</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-black" style="color:${promVal !== null ? colorCualitativa(promVal) : '#1E293B'}">${promVal !== null ? promVal.toFixed(1) : '—'}</p>
              ${promVal !== null ? `<span class="text-[11px] font-bold uppercase" style="color:${colorCualitativa(promVal)}">${calificacionCualitativa(promVal)}</span>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-0.5">Escala estándar 0 a 10</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Diagnóstico Académico</p>
            <div class="mt-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${semaforoBadge.bg}">
                <span class="w-2 h-2 rounded-full ${semaforoBadge.dot} animate-pulse"></span>
                ${semaforoBadge.text}
              </span>
            </div>
            <p class="text-[11px] text-slate2 mt-1">${memos.length} ${memos.length === 1 ? 'llamado registrado' : 'llamados registrados'}</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Cohorte y Estado</p>
            <p class="text-base font-extrabold text-ink mt-1 truncate" title="${escapeHtml(cohorteHistorica || 'Sin cohorte')}">${escapeHtml(cohorteHistorica || 'Sin cohorte')}</p>
            <p class="text-[11px] text-slate2 mt-0.5">${esEstudianteActual ? 'En formación activa' : 'Completó etapa formativa'}</p>
          </div>
        </div>
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 class="text-sm font-bold text-ink">Calificaciones por mes</h3>
            <p class="text-xs text-slate2">Rendimiento mensual consolidado según evaluaciones docentes</p>
          </div>
          <span class="text-xs text-slate2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">Promedio general: <span class="font-bold ml-1" style="color:${promVal !== null ? colorCualitativa(promVal) : '#5B6472'}">${promVal !== null ? promVal.toFixed(1) : '—'}</span></span>
        </div>
        ${calificacionesPorMes.length ? `
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-3">Mes</th><th class="py-2.5 px-3">Promedio</th><th class="py-2.5 px-3">Nivel Cualitativo</th><th class="py-2.5 px-3">Docentes Evaluadores</th></tr></thead>
            <tbody>${calificacionesPorMes.map(r => `
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition last:border-0">
                <td class="py-3 px-3 text-sm text-ink font-semibold capitalize">${escapeHtml(mesLabel(r.mes))}</td>
                <td class="py-3 px-3 text-sm"><span class="text-base font-black px-2 py-0.5 rounded-lg" style="color:${colorCualitativa(r.resultado.promedio)};background:${colorCualitativa(r.resultado.promedio)}15">${r.resultado.promedio.toFixed(1)}</span></td>
                <td class="py-3 px-3 text-xs font-bold uppercase" style="color:${colorCualitativa(r.resultado.promedio)}">${calificacionCualitativa(r.resultado.promedio)}</td>
                <td class="py-3 px-3 text-sm text-slate2">${r.resultado.profesores}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : '<p class="text-sm text-slate2 py-2">Sin calificaciones registradas por mes todavía.</p>'}
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-ink">Llamados de Atención y Memorandos</h3>
            <p class="text-xs text-slate2">Expediente disciplinario y compromisos formativos</p>
          </div>
          <span class="text-xs font-bold ${memos.length > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'} px-2.5 py-0.5 rounded-full">${memos.length} ${memos.length === 1 ? 'memorando' : 'memorandos'}</span>
        </div>
        ${memos.length ? memos.map(m => `
          <div class="flex items-start justify-between gap-3 py-3 px-3 rounded-xl hover:bg-gray-50/80 transition border-b border-gray-50 last:border-0">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-ink">${escapeHtml(m.titulo)}</p>
                <p class="text-xs text-slate2 mt-0.5">${fmtDate(m.fecha)}</p>
              </div>
            </div>
            <button onclick="abrirMemorandoCarta('${m.id}')" class="text-xs font-bold text-morado bg-morado/10 hover:bg-morado/20 px-3 py-1.5 rounded-lg transition shrink-0">Ver carta</button>
          </div>`).join('') : `
          <div class="py-3 px-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>Expediente impecable: no registra llamados de atención ni sanciones disciplinarias.</span>
          </div>`}
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-ink">Asistencia Reciente</h3>
            <p class="text-xs text-slate2">Últimos registros de asistencia a clases y talleres</p>
          </div>
          ${pctAsistencia !== null ? `<span class="text-xs font-bold text-ink bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">Asistencia: <span class="font-extrabold ${pctAsistencia >= 85 ? 'text-emerald-600' : 'text-amber-600'}">${pctAsistencia}%</span></span>` : ''}
        </div>
        ${asistencia.length ? `
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-3">Fecha</th><th class="py-2.5 px-3">Curso / Módulo</th><th class="py-2.5 px-3">Estado</th></tr></thead>
            <tbody>${asistencia.slice(0, 10).map(a => `
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition last:border-0">
                <td class="py-2.5 px-3 text-sm text-ink font-medium">${fmtDate(a.fecha)}</td>
                <td class="py-2.5 px-3 text-sm text-slate2">${escapeHtml(a.modulo || '—')}</td>
                <td class="py-2.5 px-3">${statusPill(a.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'] })}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        ${asistencia.length > 10 ? `<p class="text-xs text-slate2 mt-2">Mostrando los 10 registros más recientes de un total de ${asistencia.length}.</p>` : ''}` : '<p class="text-sm text-slate2 py-2">Sin registros de asistencia.</p>'}
      </div>

      <!-- SECCIÓN: HISTORIAL DE PAGOS Y COMPROBANTES DEL ESTUDIANTE -->
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-purple-50 text-morado flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-extrabold text-ink">Historial de Pagos y Comprobantes</h3>
                <span class="text-xs font-bold text-morado bg-morado/10 px-2.5 py-0.5 rounded-full">${pagosEstudiante.length}</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Control de matrículas, mensualidades y comprobantes adjuntos</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-morado text-xs font-black">
              Total Abonado: $ ${totalPagadoEstudiante.toLocaleString('es-CO')} COP
            </div>
            ${currentAdminRole !== 'aliado' ? `
              <button type="button" onclick="abrirFormPagoEstudiante('${est.id}')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-morado hover:bg-morado/90 transition shadow-sm cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Registrar Pago
              </button>
            ` : ''}
          </div>
        </div>

        ${pagosEstudiante.length ? (() => {
          const limitePagosTrainee = 10;
          const mostrarTodosTrainee = Boolean(window.__traineeMostrarTodosPagos);
          const pagosEstudianteRender = (mostrarTodosTrainee || pagosEstudiante.length <= limitePagosTrainee) ? pagosEstudiante : pagosEstudiante.slice(0, limitePagosTrainee);

          return `
          <div class="overflow-x-auto">
            <table class="w-full admin-table text-xs">
              <thead>
                <tr class="text-left font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
                  <th class="py-2.5 px-3">Fecha</th>
                  <th class="py-2.5 px-3">Concepto</th>
                  <th class="py-2.5 px-3">Mes Cubierto</th>
                  <th class="py-2.5 px-3">Monto</th>
                  <th class="py-2.5 px-3">Medio / Ref</th>
                  <th class="py-2.5 px-3">Comprobante</th>
                  ${currentAdminRole !== 'aliado' ? `<th class="py-2.5 px-3 text-right">Acciones</th>` : ''}
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${pagosEstudianteRender.map(p => {
                  const tieneComp = Boolean(p.comprobante_url || p.comprobanteUrl);
                  return `
                    <tr class="hover:bg-purple-50/20 transition">
                      <td class="py-3 px-3 font-semibold text-ink whitespace-nowrap">${fmtDate(p.fecha_pago || p.fechaPago)}</td>
                      <td class="py-3 px-3 font-bold text-ink">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
                          ${escapeHtml(p.concepto || 'Mensualidad')}
                        </span>
                      </td>
                      <td class="py-3 px-3 text-slate-600 font-mono text-[11px]">${escapeHtml(p.mes || '—')}</td>
                      <td class="py-3 px-3 font-black text-purple-700 text-xs whitespace-nowrap">$ ${Number(p.monto || 0).toLocaleString('es-CO')} COP</td>
                      <td class="py-3 px-3">
                        <p class="font-medium text-ink">${escapeHtml(p.medio_pago || p.medioPago || '—')}</p>
                        ${p.numero_referencia || p.numeroReferencia ? `<p class="text-[10px] text-slate-400 font-mono">${escapeHtml(p.numero_referencia || p.numeroReferencia)}</p>` : ''}
                      </td>
                      <td class="py-3 px-3 whitespace-nowrap">
                        ${tieneComp ? `
                          <div class="inline-flex items-center gap-1.5">
                            <button type="button" onclick="verComprobantePagoEstudiante('${p.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1 cursor-pointer" title="Ver captura o PDF">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              Ver
                            </button>
                            <button type="button" onclick="descargarComprobanteDirecto('${p.id}', 'estudiante')" class="p-1 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer" title="Descargar comprobante">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </button>
                          </div>
                        ` : `
                          <button type="button" onclick="abrirFormPagoEstudiante('${est.id}', '${p.id}', true)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]" title="Adjuntar soporte o captura para este pago">
                            <svg class="w-3.5 h-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span>Adjuntar captura</span>
                          </button>
                        `}
                      </td>
                      ${currentAdminRole !== 'aliado' ? `
                        <td class="py-3 px-3 text-right whitespace-nowrap">
                          <button type="button" onclick="abrirFormPagoEstudiante('${est.id}', '${p.id}')" class="text-xs font-bold text-purple-700 hover:underline mr-2.5 cursor-pointer">Editar</button>
                          <button type="button" onclick="eliminarPagoEstudiante('${p.id}')" class="text-xs font-bold text-red-600 hover:underline cursor-pointer">Eliminar</button>
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            ${pagosEstudiante.length > limitePagosTrainee ? `
              <div class="pt-3 px-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span class="text-slate2 font-medium">Mostrando ${pagosEstudianteRender.length} de ${pagosEstudiante.length} registros</span>
                <button type="button" onclick="toggleMostrarTodosPagosTrainee('${est.id}')" class="font-bold text-morado hover:underline cursor-pointer">
                  ${mostrarTodosTrainee ? 'Mostrar solo 10' : `Ver todos los pagos (${pagosEstudiante.length})`}
                </button>
              </div>
            ` : ''}
          </div>
          `;
        })() : `
          <div class="py-8 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
            <div class="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center mb-2.5">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <p class="text-xs font-bold text-ink">Sin registros de pago para este estudiante</p>
            <p class="text-[11px] text-slate2 mt-0.5 max-w-sm mx-auto">No se han registrado pagos de matrícula ni mensualidades para este perfil trainee.</p>
            ${currentAdminRole !== 'aliado' ? `
              <button type="button" onclick="abrirFormPagoEstudiante('${est.id}')" class="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-morado hover:bg-morado/90 transition shadow-sm cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Registrar primer pago
              </button>
            ` : ''}
          </div>
        `}
      </div>

      <div class="admin-panel-card p-6 md:p-8">
        <!-- Header con Icono y Botón de Subida -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-morado/15 to-turquesa/15 text-morado flex items-center justify-center shadow-inner shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-extrabold text-ink">Archivos y Evidencias</h3>
                <span class="text-xs font-bold text-morado bg-morado/10 px-2.5 py-0.5 rounded-full">${totalArchivos}</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Certificados, documentos de identidad o fotos del estudiante (hasta 3 MB).</p>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <label class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-4 py-2.5 shadow-md shadow-morado/20 hover:shadow-lg hover:shadow-morado/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span>Subir archivo</span>
              <input type="file" accept="image/*,.pdf,application/pdf" class="hidden" onchange="abrirNombreArchivoTrainee(this)" />
            </label>
          </div>
        </div>

        <!-- Filtros por tipo y Buscador -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-5">
          <!-- Filtros de Tipo -->
          <div class="inline-flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
            <button onclick="setFiltroTipoArchivoTrainee('todos')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'todos' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              Todos <span class="ml-1 opacity-75 text-[11px]">(${totalArchivos})</span>
            </button>
            <button onclick="setFiltroTipoArchivoTrainee('imagenes')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'imagenes' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              Imágenes <span class="ml-1 opacity-75 text-[11px]">(${totalImagenes})</span>
            </button>
            <button onclick="setFiltroTipoArchivoTrainee('pdfs')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'pdfs' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              PDFs <span class="ml-1 opacity-75 text-[11px]">(${totalPdfs})</span>
            </button>
          </div>

          <!-- Buscador -->
          <div class="relative w-full sm:w-64">
            <svg class="w-4 h-4 text-slate2 absolute left-3.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input id="traineeArchivoBusqueda" type="text" value="${escapeHtml(traineeState.busquedaArchivo || '')}" placeholder="Buscar por nombre..." oninput="buscarArchivoTrainee(this.value)" class="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs text-ink placeholder-slate2/60 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
            ${traineeState.busquedaArchivo ? `
              <button onclick="buscarArchivoTrainee('')" class="absolute right-2.5 top-2 text-slate2 hover:text-ink w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            ` : ''}
          </div>
        </div>

        <!-- Subida interactiva -->
        <div id="traineeArchivoNombreWrap"></div>

        <!-- Grid de Archivos -->
        <div id="traineeGridArchivos" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${archivosMostrados.map(a => {
            const badge = getBadgeArchivo(a);
            const esImg = (a.tipo || '').startsWith('image/');
            const esPdf = (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf'));

            return `
            <div class="trainee-archivo-card group relative rounded-2xl border border-gray-200/80 bg-white hover:border-morado/30 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden" data-nombre="${escapeHtml((a.nombre || '').toLowerCase())}">
              <!-- Thumbnail / Vista Previa -->
              ${esImg ? `
                <div class="relative h-44 sm:h-48 bg-gray-100 overflow-hidden cursor-pointer" onclick="verArchivoTraineeModal('${a.id}')">
                  <img src="${a.datos}" alt="${escapeHtml(a.nombre)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                  <div class="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                    <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-ink text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                      <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Ver imagen
                    </span>
                  </div>
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${badge.bg} shadow-md uppercase">
                    ${badge.label}
                  </span>
                </div>
              ` : `
                <div class="relative h-44 sm:h-48 bg-gradient-to-br from-rose-50 via-red-50/60 to-orange-50 border-b border-rose-100/60 flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden" onclick="verArchivoTraineeModal('${a.id}')">
                  <div class="w-16 h-20 bg-white rounded-xl shadow-md border border-rose-200/80 flex flex-col items-center justify-center relative group-hover:scale-110 transition-transform duration-300">
                    <div class="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <span class="text-[9px] font-black tracking-widest text-rose-700 uppercase">PDF</span>
                  </div>
                  <div class="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                    <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-ink text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                      <svg class="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Abrir PDF
                    </span>
                  </div>
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${badge.bg} shadow-md uppercase">
                    ${badge.label}
                  </span>
                </div>
              `}

              <!-- Card Details -->
              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-extrabold text-ink truncate mb-1.5" title="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)}</h4>
                  <div class="flex items-center gap-2 text-slate2 text-[11px] flex-wrap">
                    <span class="inline-flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      ${fmtDate(a.fecha)}
                    </span>
                    ${a.origen ? `
                      <span class="inline-block truncate max-w-[120px] font-semibold text-morado bg-morado/5 px-2 py-0.5 rounded-full" title="${escapeHtml(a.origen)}">
                        ${escapeHtml(a.origen)}
                      </span>
                    ` : ''}
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
                  <div class="flex items-center gap-1.5">
                    <button onclick="verArchivoTraineeModal('${a.id}')" title="Ver archivo" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-morado/10 text-slate2 hover:text-morado text-xs font-bold border border-gray-200/60 transition-all">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Ver
                    </button>
                    <a href="${a.datos}" download="${escapeHtml(a.nombre)}" title="Descargar archivo" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-turquesa/10 text-slate2 hover:text-turquesa text-xs font-bold border border-gray-200/60 transition-all">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Descargar
                    </a>
                  </div>
                  <button onclick="eliminarArchivoTrainee('${a.id}')" title="Eliminar archivo" class="w-8 h-8 rounded-xl text-slate2 hover:text-coral hover:bg-coral/10 flex items-center justify-center transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            </div>`;
          }).join('') || (filtroArchivo || filtroTipo !== 'todos' ? `
            <div class="col-span-full py-12 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <div class="w-12 h-12 rounded-full bg-gray-100 text-slate2 mx-auto flex items-center justify-center mb-3">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">No se encontraron archivos</p>
              <p class="text-xs text-slate2 mt-1">Ningún archivo coincide con los filtros aplicados.</p>
              <button onclick="traineeState.busquedaArchivo='';traineeState.filtroTipo='todos';renderTraineeFicha();" class="mt-3 text-xs font-bold text-morado hover:underline">Restablecer filtros</button>
            </div>
          ` : `
            <div class="col-span-full py-12 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <div class="w-14 h-14 rounded-2xl bg-morado/10 text-morado mx-auto flex items-center justify-center mb-3 shadow-inner">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">No hay archivos adjuntos</p>
              <p class="text-xs text-slate2 mt-1 max-w-sm mx-auto">Sube evidencias, notas, fotos o documentos relevantes para el historial de este estudiante.</p>
              <label class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-5 py-2.5 shadow-md hover:opacity-95 cursor-pointer transition">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Subir el primer archivo
                <input type="file" accept="image/*,.pdf,application/pdf" class="hidden" onchange="abrirNombreArchivoTrainee(this)" />
              </label>
            </div>
          `)}

          ${mostrarVerMas ? `
            <div class="col-span-full flex justify-center mt-2">
              <button onclick="toggleExpandirArchivosTrainee()" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-morado/30 bg-morado/5 hover:bg-morado/10 text-morado text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95">
                ${traineeState.archivosExpandidos ? `
                  <span>Mostrar menos archivos</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                ` : `
                  <span>Ver más archivos (${archivos.length - limiteArchivos} adicionales)</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                `}
              </button>
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  // Filtra los archivos directamente en el DOM para nunca perder el foco del input
  function buscarArchivoTrainee(valor) {
    traineeState.busquedaArchivo = valor;
    const q = (valor || '').toLowerCase().trim();
    const grid = document.getElementById('traineeGridArchivos');
    if (!grid) {
      renderTraineeFicha();
      return;
    }
    const cards = grid.querySelectorAll('.trainee-archivo-card');
    cards.forEach(c => {
      const nombre = c.getAttribute('data-nombre') || '';
      const match = !q || nombre.includes(q);
      c.classList.toggle('hidden', !match);
    });
  }

  function setFiltroTipoArchivoTrainee(tipo) {
    traineeState.filtroTipo = tipo;
    renderTraineeFicha();
  }

  // Paso intermedio entre elegir el archivo y guardarlo: pide el nombre
  // (opcional) antes de leerlo/guardarlo con una tarjeta visual interactiva.
  function abrirNombreArchivoTrainee(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (!wrap) { agregarArchivoTrainee(file, file.name); return; }

    window.__traineeArchivoPendiente = file;
    const fileSizeFmt = formatFileSize(file.size);
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    wrap.innerHTML = `
      <div class="rounded-2xl border-2 border-dashed border-morado/40 bg-gradient-to-br from-morado/5 via-white to-turquesa/5 p-4 sm:p-5 mb-5 animate-fadeIn">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl ${esPdf ? 'bg-rose-100 text-rose-600' : 'bg-morado/15 text-morado'} flex items-center justify-center shrink-0 mt-0.5">
            ${esPdf ? `
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            ` : `
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            `}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-extrabold text-ink truncate max-w-[280px]">${escapeHtml(file.name)}</span>
              ${fileSizeFmt ? `<span class="text-[11px] font-bold text-slate2 bg-gray-100 px-2 py-0.5 rounded-full">${fileSizeFmt}</span>` : ''}
              <span class="text-[10px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-full uppercase">${esPdf ? 'Documento PDF' : 'Imagen'}</span>
            </div>
            <label class="block text-xs font-semibold text-slate2 mt-2.5 mb-1" for="traineeArchivoNombreInput">Asignar un nombre o descripción (opcional):</label>
            <div class="flex items-center gap-2 flex-wrap">
              <input id="traineeArchivoNombreInput" type="text" placeholder="${escapeHtml(file.name)}" class="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-ink placeholder-slate2/60 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
              <button onclick="confirmarSubidaArchivoTrainee()" class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-4 py-2 hover:opacity-95 shadow-md shadow-morado/20 hover:scale-[1.02] active:scale-[0.98] transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Guardar archivo
              </button>
              <button onclick="cancelarSubidaArchivoTrainee()" class="px-3 py-2 text-xs font-semibold text-slate2 hover:text-coral hover:bg-coral/5 rounded-xl transition">
                Cancelar
              </button>
            </div>
            <p class="text-[11px] text-slate2/80 mt-1.5">Si lo dejas vacío, se guardará con su nombre de origen: <span class="font-medium text-ink">${escapeHtml(file.name)}</span></p>
          </div>
        </div>
      </div>`;
    const nombreInput = document.getElementById('traineeArchivoNombreInput');
    if (nombreInput) nombreInput.focus();
  }

  function cancelarSubidaArchivoTrainee() {
    window.__traineeArchivoPendiente = null;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (wrap) wrap.innerHTML = '';
  }

  function confirmarSubidaArchivoTrainee() {
    const file = window.__traineeArchivoPendiente;
    if (!file) return;
    const nombreInput = document.getElementById('traineeArchivoNombreInput');
    const nombrePersonalizado = nombreInput ? nombreInput.value.trim() : '';
    window.__traineeArchivoPendiente = null;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (wrap) wrap.innerHTML = '';
    agregarArchivoTrainee(file, nombrePersonalizado || file.name);
  }

  // CORREGIDO: guardaba con Store.set('trainee_archivos', arrayCompleto)
  // — eso solo persistía en localStorage (trainee_archivos no estaba en
  // ENTIDADES_MYSQL), por eso los archivos no aparecían al entrar desde
  // otro navegador o dispositivo. Ahora usa Store.agregarArchivo(), que
  // sube SOLO este archivo al servidor.
  async function agregarArchivoTrainee(file, nombre) {
    const esValido = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esValido) { toast('Solo se permiten imágenes o archivos PDF', 'err'); return; }
    if (file.size > TRAINEE_ARCHIVO_MAX_BYTES) { toast('El archivo no puede superar 3 MB', 'err'); return; }

    const datos = await leerArchivoComoDataURL(file);
    const nuevoRegistro = {
      id: 'ta_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
      estudianteId: traineeState.estudianteId,
      nombre: (nombre || file.name).trim() || file.name,
      tipo: file.type || 'application/pdf',
      datos,
      fecha: new Date().toISOString().slice(0, 10),
    };

    let resultado;
    if (typeof Store !== 'undefined' && typeof Store.agregarArchivo === 'function') {
      resultado = await Store.agregarArchivo(nuevoRegistro);
    } else if (typeof apiFetch === 'function') {
      try {
        await apiFetch('trainee_archivos', { method: 'POST', body: JSON.stringify(nuevoRegistro) });
        resultado = { ok: true, remoto: true };
      } catch (e) {
        resultado = { ok: false, remoto: false, error: e.message };
      }
    } else {
      resultado = { ok: false, remoto: false };
    }

    toast(resultado && resultado.remoto ? 'Archivo guardado en la base de datos' : 'No se pudo guardar el archivo en el servidor, intenta de nuevo', resultado && resultado.remoto ? 'ok' : 'err');
    renderTraineeFicha();
  }

  async function eliminarArchivoTrainee(archivoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.')) return;

    // Limpia del localStorage de inmediato por si el archivo provenía de caché local
    try {
      const locales = JSON.parse(localStorage.getItem('aplus_admin_v1_trainee_archivos') || '[]');
      localStorage.setItem('aplus_admin_v1_trainee_archivos', JSON.stringify(locales.filter(a => a.id !== archivoId)));
    } catch (e) {}

    let resultado;
    if (typeof Store !== 'undefined' && typeof Store.eliminarArchivo === 'function') {
      resultado = await Store.eliminarArchivo(archivoId);
    } else if (typeof apiFetch === 'function') {
      try {
        await apiFetch('trainee_archivos?id=' + encodeURIComponent(archivoId), {
          method: 'DELETE',
          body: JSON.stringify({ id: archivoId }),
        });
        resultado = { ok: true, remoto: true };
      } catch (e) {
        resultado = { ok: false, remoto: false, error: e.message };
      }
    } else {
      resultado = { ok: true, remoto: false };
    }

    toast(resultado && resultado.remoto ? 'Archivo eliminado de la base de datos' : 'Archivo eliminado', 'ok');
    renderTraineeFicha();
  }

  function handleEscapeTraineeModal(e) {
    if (e.key === 'Escape') cerrarArchivoTraineeModal();
  }

  async function verArchivoTraineeModal(archivoId) {
    let arch = null;
    try {
      arch = await Store.getArchivo('trainee_archivos', archivoId);
    } catch (e) {
      const archivos = await Store.list('trainee_archivos');
      arch = archivos.find(a => a.id === archivoId);
    }
    if (!arch || !arch.datos || arch.datos === '1') { toast('Archivo no encontrado o datos no disponibles', 'err'); return; }

    let modal = document.getElementById('traineeArchivoModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'traineeArchivoModal';
      document.body.appendChild(modal);
    }

    const esImagen = (arch.tipo || '').startsWith('image/');
    const esPdf = arch.tipo === 'application/pdf' || (arch.nombre || '').toLowerCase().endsWith('.pdf');
    const badge = getBadgeArchivo(arch);

    modal.innerHTML = `
      <div id="traineeArchivoModalBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-sm animate-fadeIn">
        <div class="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20" onclick="event.stopPropagation()">
          <!-- Header del visor -->
          <div class="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/80">
            <div class="flex items-center gap-3 min-w-0">
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badge.bg} shadow-sm shrink-0">
                ${badge.label}
              </span>
              <div class="min-w-0">
                <h4 class="text-sm font-extrabold text-ink truncate">${escapeHtml(arch.nombre)}</h4>
                <p class="text-[11px] text-slate2">${fmtDate(arch.fecha)}${arch.origen ? ' · ' + escapeHtml(arch.origen) : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a href="${arch.datos}" download="${escapeHtml(arch.nombre)}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Descargar</span>
              </a>
              <button onclick="cerrarArchivoTraineeModal()" class="w-8 h-8 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-ink flex items-center justify-center transition" aria-label="Cerrar">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Contenedor del visor -->
          <div class="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-gray-900/5 min-h-[350px]">
            ${esImagen ? `
              <img src="${arch.datos}" alt="${escapeHtml(arch.nombre)}" class="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg mx-auto" />
            ` : esPdf ? `
              <iframe src="${arch.datos}" class="w-full h-[72vh] rounded-xl border border-gray-200 bg-white shadow-inner" title="${escapeHtml(arch.nombre)}"></iframe>
            ` : `
              <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm">
                <div class="w-12 h-12 rounded-2xl bg-morado/10 text-morado mx-auto flex items-center justify-center mb-3">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <p class="text-sm font-bold text-ink">Vista previa no disponible</p>
                <p class="text-xs text-slate2 mt-1">Este formato de archivo se puede abrir tras descargarlo.</p>
                <a href="${arch.datos}" download="${escapeHtml(arch.nombre)}" class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-morado text-white text-xs font-bold shadow-md hover:bg-morado/90 transition">
                  Descargar ahora
                </a>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('traineeArchivoModalBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', cerrarArchivoTraineeModal);
    }
    window.addEventListener('keydown', handleEscapeTraineeModal);
  }

  function cerrarArchivoTraineeModal() {
    const modal = document.getElementById('traineeArchivoModal');
    if (modal) modal.remove();
    window.removeEventListener('keydown', handleEscapeTraineeModal);
  }

  // Genera el informe oficial completo del Trainee en formato membretado listo para imprimir o guardar en PDF
  async function exportarFichaTraineePDF(estudianteId) {
    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (!est) { toast('Estudiante no encontrado', 'err'); return; }

    const esEstudianteActual = est.rol === 'Estudiante';
    const cohorteHistorica = esEstudianteActual ? est.cohorte : (est.cohorteAnterior || est.cohorte);
    const emailLower = (est.email || '').toLowerCase();

    const [memosTodos, asistenciaTodas, archivosTodos] = await Promise.all([
      Store.list('memorandos'),
      Store.list('asistencia'),
      Store.list('trainee_archivos')
    ]);

    const memos = memosTodos.filter(m => {
      if (m.estado !== 'Enviado') return false;
      const dest = m.destinatario || '';
      return dest.toLowerCase() === emailLower
        || dest === 'Todos'
        || dest === 'Todos los estudiantes'
        || (cohorteHistorica && dest === cohorteHistorica);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const fechaRegEstAdmin = (est.creadoEn || est.creado_en || '').trim();
    const fechaRegDateAdmin = fechaRegEstAdmin ? fechaRegEstAdmin.slice(0, 10) : '';
    const hoyAsistAdmin = typeof fechaHoyLocal === 'function' ? fechaHoyLocal() : new Date().toISOString().slice(0, 10);
    const sesionesHoyAdmin = (typeof Store !== 'undefined') ? await Store.list('sesiones_asistencia') : [];

    const asistencia = asistenciaTodas.filter(a => {
      if (a.estudiante !== est.nombre && a.estudiante !== est.email) return false;
      if (a.estado === 'Falla' && fechaRegDateAdmin && a.fecha && a.fecha < fechaRegDateAdmin) return false;
      if (a.estado === 'Falla' && a.fecha === hoyAsistAdmin) {
        const sesHoy = sesionesHoyAdmin.find(s => s.id === a.sesionId || s.materia === a.materia || s.modulo === a.modulo);
        if (sesHoy) {
          const minsHoy = (typeof minutosTranscurridos === 'function') ? minutosTranscurridos(sesHoy.horaInicio || sesHoy.hora_inicio) : 0;
          if (minsHoy <= (typeof VENTANA_TARDE_MIN !== 'undefined' ? VENTANA_TARDE_MIN : 50)) return false;
        }
      }
      return true;
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalesAsist = { Presente: 0, Tarde: 0, Falla: 0 };
    asistencia.forEach(a => { if (totalesAsist[a.estado] !== undefined) totalesAsist[a.estado]++; });
    const pctAsistencia = asistencia.length ? Math.round((totalesAsist.Presente / asistencia.length) * 100) : null;

    const promedioGeneral = cohorteHistorica ? await promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, null) : null;
    let calificacionesPorMes = [];
    if (cohorteHistorica) {
      const mesesUnicos = new Set();
      const docentesHistorico = await docentesDeCohorte(cohorteHistorica);
      for (const d of docentesHistorico) {
        (await mesesConNotasDocenteCohorte(d, cohorteHistorica)).forEach(m => mesesUnicos.add(m));
      }
      const mesesOrdenados = [...mesesUnicos].sort().reverse();
      const resultadosPorMes = await Promise.all(mesesOrdenados.map(m => promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, m)));
      calificacionesPorMes = mesesOrdenados.map((m, i) => ({
        mes: m,
        resultado: resultadosPorMes[i]
      })).filter(r => r.resultado);
    }

    const archivos = archivosTodos.filter(a => a.estudianteId === est.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const semaforoColor = (promedioGeneral && promedioGeneral.promedio >= 7.0 && (pctAsistencia === null || pctAsistencia >= 85) && memos.length === 0)
      ? '#059669' // verde esmeralda
      : ((!promedioGeneral || promedioGeneral.promedio >= 6.0) && (pctAsistencia === null || pctAsistencia >= 75) && memos.length <= 1)
        ? '#D97706' // ambar
        : '#DC2626'; // rojo

    const semaforoTexto = semaforoColor === '#059669'
      ? 'Rendimiento Óptimo'
      : (semaforoColor === '#D97706' ? 'En Seguimiento' : 'Atención Requerida');

    const faseTexto = (cohorteHistorica || '').toLowerCase().includes('profundizacion') || (cohorteHistorica || '').toLowerCase().includes('fase 2') || (cohorteHistorica || '').toLowerCase().includes('fase dos')
      ? 'Profundización (Fase 2)'
      : 'Fundamentación (Fase 1)';

    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    let pdfHabs = [];
    if (Array.isArray(est.habilidades)) pdfHabs = est.habilidades;
    else if (typeof est.habilidades === 'string' && est.habilidades.trim()) {
      try {
        const p = JSON.parse(est.habilidades);
        if (Array.isArray(p)) pdfHabs = p;
      } catch(e) {
        pdfHabs = est.habilidades.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ficha Integral del Trainee — ${escapeHtml(est.nombre)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #14181F; background: #eef1f5; margin: 0; padding: 24px 16px; }
  .action-bar { max-width: 850px; margin: 0 auto 16px; display: flex; justify-content: flex-end; gap: 10px; }
  .action-bar button { border: none; border-radius: 9999px; padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer; background: #8B5CF6; color: #fff; box-shadow: 0 2px 8px rgba(139,92,246,0.3); transition: all 0.2s; }
  .action-bar button:hover { background: #7C3AED; }
  .action-bar button.close-btn { background: #5B6472; }
  .page { max-width: 850px; margin: 0 auto; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; padding: 40px 48px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #8B5CF6; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { height: 42px; width: auto; border-radius: 6px; }
  .brand-title { font-size: 18px; font-weight: 900; color: #14181F; margin: 0; }
  .brand-sub { font-size: 11px; font-weight: 600; color: #5B6472; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
  
  .doc-title { text-align: center; margin-bottom: 24px; }
  .doc-title h1 { font-size: 18px; font-weight: 900; color: #14181F; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title p { font-size: 12px; color: #5B6472; margin: 0; }
  
  .student-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
  .student-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; font-size: 13px; }
  .student-grid .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .student-grid .val { font-weight: 700; color: #0f172a; margin-top: 1px; }
  
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center; }
  .kpi-card .num { font-size: 20px; font-weight: 900; margin: 4px 0 2px; }
  .kpi-card .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
  
  .section-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 24px 0 12px; display: flex; align-items: center; justify-content: space-between; }
  
  table.data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  table.data-table th { background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 10px; text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; }
  table.data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
  table.data-table tr:nth-child(even) td { background: #f8fafc; }
  
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  
  .footer-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 48px; margin-top: 56px; padding-top: 16px; }
  .signature-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; }
  .signature-box .role { font-size: 11px; color: #64748b; margin-top: 2px; }
  
  .verification-note { margin-top: 36px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 10px; color: #64748b; text-align: center; }

  @media print {
    body { background: #fff; padding: 0; }
    .action-bar { display: none; }
    .page { border: none; box-shadow: none; padding: 20px 24px; max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="action-bar">
    <button onclick="window.print()"><svg style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>Descargar / Imprimir en PDF</button>
    <button class="close-btn" onclick="window.close()"><svg style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:4px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Cerrar</button>
  </div>
  
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="${LOGO_FUNDACION_DATAURL}" alt="Fundación A+" />
        <div>
          <h2 class="brand-title">Fundación A+</h2>
          <p class="brand-sub">Programa TrAIning de 100 a 1000+</p>
        </div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:11px;font-weight:700;color:#64748b;">EXPEDIENTE OFICIAL</span><br>
        <span style="font-size:12px;font-weight:800;color:#8B5CF6;">ID: TRAINEE-${escapeHtml(est.id.slice(-6).toUpperCase())}</span>
      </div>
    </div>

    <div class="doc-title">
      <h1>Ficha Integral y Expediente Académico del Trainee</h1>
      <p>Reporte oficial consolidado emitido el ${fechaHoy}</p>
    </div>

    <div class="student-box">
      <div class="student-grid">
        <div>
          <div class="label">Estudiante / Trainee</div>
          <div class="val">${escapeHtml(est.nombre)}</div>
        </div>
        <div>
          <div class="label">Documento de Identidad</div>
          <div class="val">${escapeHtml(est.documento || 'No registrado')}</div>
        </div>
        <div>
          <div class="label">Correo Electrónico</div>
          <div class="val">${escapeHtml(est.email || 'No registrado')}</div>
        </div>
        <div>
          <div class="label">Teléfono de Contacto</div>
          <div class="val">${escapeHtml(est.telefono || 'No registrado')}</div>
        </div>
        <div>
          <div class="label">Cohorte Académica</div>
          <div class="val">${escapeHtml(cohorteHistorica || 'Sin cohorte')} (${faseTexto})</div>
        </div>
        <div>
          <div class="label">Estado Actual</div>
          <div class="val">${escapeHtml(est.estado || 'Activo')}</div>
        </div>
        ${pdfHabs.length ? `
        <div style="grid-column: span 2;">
          <div class="label">Habilidades y Destrezas Destacadas</div>
          <div class="val" style="margin-top:4px;">
            ${pdfHabs.map(h => `<span style="display:inline-block;padding:2px 8px;margin-right:4px;margin-bottom:4px;font-size:11px;font-weight:700;background:#EDE9FE;color:#6D28D9;border-radius:6px;">${escapeHtml(h)}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="lbl">Asistencia Global</div>
        <div class="num" style="color:#0f172a;">${pctAsistencia !== null ? pctAsistencia + '%' : '—'}</div>
        <span style="font-size:10px;color:#64748b;">${totalesAsist.Presente} asistencias · ${totalesAsist.Falla} fallas</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Promedio General</div>
        <div class="num" style="color:${promedioGeneral ? colorCualitativa(promedioGeneral.promedio) : '#0f172a'};">
          ${promedioGeneral ? promedioGeneral.promedio.toFixed(1) : '—'}
        </div>
        <span style="font-size:10px;color:#64748b;">${promedioGeneral ? escapeHtml(calificacionCualitativa(promedioGeneral.promedio)) : 'Sin notas'}</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Salud Académica</div>
        <div class="num" style="font-size:14px;color:${semaforoColor};margin-top:7px;">
          ${semaforoTexto}
        </div>
        <span style="font-size:10px;color:#64748b;">Diagnóstico continuo</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Evidencias / Archivos</div>
        <div class="num" style="color:#8B5CF6;">${archivos.length}</div>
        <span style="font-size:10px;color:#64748b;">Documentos adjuntos</span>
      </div>
    </div>

    <div class="section-title">
      <span>1. Calificaciones Consolidadas por Mes</span>
      <span style="font-size:10px;color:#64748b;">${calificacionesPorMes.length} periodos evaluados</span>
    </div>
    ${calificacionesPorMes.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Promedio Numérico</th>
          <th>Evaluación Cualitativa</th>
          <th>Docentes Evaluadores</th>
        </tr>
      </thead>
      <tbody>
        ${calificacionesPorMes.map(r => `
          <tr>
            <td><b>${escapeHtml(mesLabel(r.mes))}</b></td>
            <td style="font-weight:800;color:${colorCualitativa(r.resultado.promedio)};">${r.resultado.promedio.toFixed(1)}</td>
            <td><span class="badge" style="background:${colorCualitativa(r.resultado.promedio)}20;color:${colorCualitativa(r.resultado.promedio)};">${escapeHtml(calificacionCualitativa(r.resultado.promedio))}</span></td>
            <td>${escapeHtml(r.resultado.profesores || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#64748b;font-style:italic;">No registra calificaciones periódicas en el sistema.</p>'}

    <div class="section-title">
      <span>2. Balance de Asistencia y Asistencia Reciente</span>
      <span style="font-size:10px;color:#64748b;">${asistencia.length} clases computadas</span>
    </div>
    ${asistencia.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Módulo / Curso</th>
          <th>Registro de Asistencia</th>
        </tr>
      </thead>
      <tbody>
        ${asistencia.slice(0, 8).map(a => `
          <tr>
            <td>${fmtDate(a.fecha)}</td>
            <td>${escapeHtml(a.modulo || '—')}</td>
            <td><b>${escapeHtml(a.estado)}</b></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${asistencia.length > 8 ? `<p style="font-size:10px;color:#64748b;margin-top:4px;">* Mostrando las 8 sesiones más recientes de un total de ${asistencia.length}.</p>` : ''}
    ` : '<p style="font-size:12px;color:#64748b;font-style:italic;">Sin registros de asistencia.</p>'}

    <div class="section-title">
      <span>3. Novedades y Memorandos Emitidos</span>
      <span style="font-size:10px;color:#64748b;">${memos.length} registros</span>
    </div>
    ${memos.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Título / Asunto del Memorando</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${memos.map(m => `
          <tr>
            <td>${fmtDate(m.fecha)}</td>
            <td><b>${escapeHtml(m.titulo)}</b></td>
            <td>Oficial / Enviado</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#059669;font-weight:600;display:flex;align-items:center;gap:6px;"><svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>El estudiante no cuenta con memorandos ni observaciones disciplinarias.</p>'}

    <div class="section-title">
      <span>4. Portafolio de Archivos y Evidencias Adjuntas</span>
      <span style="font-size:10px;color:#64748b;">${archivos.length} archivos</span>
    </div>
    ${archivos.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Nombre del Archivo / Documento</th>
          <th>Formato</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
        ${archivos.map(a => `
          <tr>
            <td>${fmtDate(a.fecha)}</td>
            <td><b>${escapeHtml(a.nombre)}</b></td>
            <td>${(a.tipo || '').includes('pdf') || (a.nombre || '').toLowerCase().endsWith('.pdf') ? 'Documento PDF' : 'Imagen'}</td>
            <td>${escapeHtml(a.origen || 'Carga directa')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#64748b;font-style:italic;">Sin evidencias registradas.</p>'}

    <div class="footer-signatures">
      <div class="signature-box">
        <b>Dirección Académica y Pedagógica</b>
        <div class="role">Fundación A+ · Programa TrAIning</div>
      </div>
      <div class="signature-box">
        <b>Coordinación de Programas y Alianzas</b>
        <div class="role">Fundación A+ · Litoral Pacífico</div>
      </div>
    </div>

    <div class="verification-note">
      Documento oficial generado por la Plataforma de Gestión Académica de la Fundación A+.
      Para verificar la autenticidad de esta ficha, comunicarse con info@fundacionamas.org.co.
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast('Habilita las ventanas emergentes para generar el PDF', 'err');
      return;
    }
    win.document.open();
    win.document.write(htmlDoc);
    win.document.close();
  }

  // Exposición explícita para llamadas desde onclick y otros módulos
  window.verArchivoTraineeModal = verArchivoTraineeModal;
  window.cerrarArchivoTraineeModal = cerrarArchivoTraineeModal;
  window.setFiltroTipoArchivoTrainee = setFiltroTipoArchivoTrainee;
  window.buscarArchivoTrainee = buscarArchivoTrainee;
  window.abrirNombreArchivoTrainee = abrirNombreArchivoTrainee;
  window.confirmarSubidaArchivoTrainee = confirmarSubidaArchivoTrainee;
  window.cancelarSubidaArchivoTrainee = cancelarSubidaArchivoTrainee;
  window.eliminarArchivoTrainee = eliminarArchivoTrainee;
  window.toggleExpandirArchivosTrainee = toggleExpandirArchivosTrainee;
  window.exportarFichaTraineePDF = exportarFichaTraineePDF;
  window.traineeState = traineeState;
  window.renderTrainee = renderTrainee;
  window.renderTraineeFicha = renderTraineeFicha;
  window.abrirHistorialTrainee = abrirHistorialTrainee;
  window.onCambiaTraineeEstudiante = onCambiaTraineeEstudiante;
  window.onBuscaTraineeEmail = onBuscaTraineeEmail;
  window.agregarArchivoTrainee = agregarArchivoTrainee;

})();
