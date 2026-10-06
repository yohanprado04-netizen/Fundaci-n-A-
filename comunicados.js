/**
 * comunicados.js — Módulo de Notificaciones y Comunicados Institucionales
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Centro de Notificaciones Superadmin (alertas tempranas, riesgo académico, memorandos, PQRs, excusas)
 * 2. Publicación y distribución de comunicados (públicos y privados, filtrados por cohorte y rol)
 * 3. Feed de notificaciones y novedades para Docentes
 * 4. Feed de notificaciones y circulares para Estudiantes
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  const getDocente = () => (typeof window !== 'undefined' && typeof window.getCurrentDocente === 'function' ? (window.getCurrentDocente() || window.currentDocente || {}) : (typeof currentDocente !== 'undefined' ? currentDocente : (typeof window !== 'undefined' && window.currentDocente ? window.currentDocente : {})));
  const getEstudiante = () => (typeof window !== 'undefined' && typeof window.getCurrentEstudiante === 'function' ? (window.getCurrentEstudiante() || window.currentEstudiante || {}) : (typeof currentEstudiante !== 'undefined' ? currentEstudiante : (typeof window !== 'undefined' && window.currentEstudiante ? window.currentEstudiante : {})));
  const getAdminUser = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminUser === 'function' ? (window.getCurrentAdminUser() || window.currentAdminUser || {}) : (typeof currentAdminUser !== 'undefined' ? currentAdminUser : (typeof window !== 'undefined' && window.currentAdminUser ? window.currentAdminUser : {})));
  const computeSemaforo = async (f) => (typeof window !== 'undefined' && typeof window.computeSemaforo === 'function' ? await window.computeSemaforo(f) : []);
  const showPanel = async (p) => (typeof window !== 'undefined' && typeof window.showPanel === 'function' ? await window.showPanel(p) : null);
  const getSeed = () => (typeof window !== 'undefined' && window.SEED ? window.SEED : (typeof SEED !== 'undefined' ? SEED : {}));

  // ============================================================================
  // CENTRO DE GESTIÓN DE NOTIFICACIONES Y COMUNICADOS INSTITUCIONALES (SUPERADMIN)
  // Permite:
  // 1. Crear, enviar y gestionar comunicaciones para toda la institución, roles y cohortes.
  // 2. Historial interactivo de comunicados con filtros de cohorte, tipo y búsqueda.
  // 3. Monitoreo unificado de alertas tempranas (Riesgo Académico, 3+ Memorandos, Excusas, PQRs).
  // ============================================================================

  let notifFiltroTipo = 'todas';
  let notifFiltroCohorte = '';
  let notifFiltroTexto = '';
  let notifVerAtendidas = false;

  // Estado del formulario de creación (Superadmin)
  let comunicadoTipoEnvio = 'Publica'; // 'Publica' | 'Privada'
  let comunicadoDestinatarios = [];
  let comunicadoPrioridad = 'Media'; // 'Baja' | 'Media' | 'Alta'
  let comunicadoCategoria = 'Institucional'; // 'Institucional' | 'Académico' | 'Eventos' | 'Administrativo'
  let comHistFiltroTipo = 'Todas';
  let comHistFiltroCohorte = '';
  let comHistFiltroTexto = '';

  // Estado para panel docente y estudiante
  let notifDocenteTab = 'todas';
  let notifDocenteFiltroTexto = '';
  let notifEstudianteQueryCorte = '';
  let notifEstudianteQueryPublicas = '';
  let notifEstudianteCategoria = 'todas';
  let notifEstudianteSoloNoLeidas = false;
  let notifEstudianteQueryGlobal = '';

  const ICONOS_COMUNICADO = {
    'megaphone': '<svg class="w-4 h-4 text-oro" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>',
    'academic': '<svg class="w-4 h-4 text-turquesa" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>',
    'calendar': '<svg class="w-4 h-4 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
    'administrative': '<svg class="w-4 h-4 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>',
    'shield-alert': '<svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    'file-text': '<svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    'trophy': '<svg class="w-4 h-4 text-oro" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>'
  };

  async function obtenerNotificacionesAdmin() {
    let [semaforoData, memorandos, justificaciones, usuarios, pqrs, modulos, comunicados] = await Promise.all([
      computeSemaforo(),
      Store.list('memorandos'),
      Store.list('justificaciones_asistencia'),
      Store.list('usuarios'),
      Store.list('pqr'),
      Store.list('modulos'),
      Store.list('comunicados')
    ]);

    if (!Array.isArray(justificaciones) || justificaciones.length === 0) {
      justificaciones = (getSeed().justificaciones_asistencia || []) || [];
    }
    if (!Array.isArray(comunicados)) comunicados = [];
    semaforoData = Array.isArray(semaforoData) ? semaforoData : [];
    memorandos = Array.isArray(memorandos) ? memorandos : [];
    usuarios = Array.isArray(usuarios) ? usuarios : [];
    pqrs = Array.isArray(pqrs) ? pqrs : [];
    modulos = Array.isArray(modulos) ? modulos : [];

    let leidas = [];
    try {
      leidas = JSON.parse(localStorage.getItem('aplus_admin_notificaciones_leidas') || '[]');
      if (!Array.isArray(leidas)) leidas = [];
    } catch (e) { leidas = []; }
    const leidasSet = new Set(leidas);

    const notificaciones = [];

    // 1. Comunicados institucionales y publicaciones
    comunicados.forEach(c => {
      const destList = Array.isArray(c.destinatarios) ? c.destinatarios : [c.destinatarios || 'Todos'];
      const esPriv = String(c.tipo || '').toLowerCase().includes('privad');
      notificaciones.push({
        id: c.id,
        tipo: 'comunicado',
        tipoEnvio: esPriv ? 'Privada' : 'Pública',
        categoria: c.categoria || 'Institucional',
        prioridad: c.prioridad || 'Media',
        severidad: c.prioridad === 'Alta' ? 'critica' : (c.prioridad === 'Media' ? 'alerta' : 'info'),
        titulo: c.titulo || 'Comunicado institucional',
        mensaje: c.mensaje || '',
        destinatarios: destList,
        autor: c.autor || 'Superadmin',
        autorRol: c.autorRol || 'Superadmin',
        fecha: c.fecha || '',
        icono: c.categoria === 'Eventos' ? 'calendar' : (c.categoria === 'Académico' ? 'academic' : (c.categoria === 'Administrativo' ? 'administrative' : 'megaphone')),
        esComunicado: true,
        atendida: !!c.atendida || leidasSet.has(c.id),
        accionPrincipal: {
          label: 'Ver detalles',
          onclick: `window.abrirModalDetalleComunicado('${c.id}')`
        }
      });
    });

    // 2. REGLA: Estudiantes con 3 o más memorandos acumulados (Alerta Disciplinaria)
    const memosPorEstudiante = new Map();
    const memosValidos = memorandos.filter(m => m.estado === 'Enviado');
    memosValidos.forEach(m => {
      const dest = (m.destinatario || '').trim();
      if (!dest || dest === 'Todos' || dest === 'Todos los estudiantes' || dest === 'Todos los docentes') return;
      const u = usuarios.find(usr => 
        (usr.email && usr.email.toLowerCase() === dest.toLowerCase()) || 
        (usr.nombre && usr.nombre.toLowerCase() === dest.toLowerCase())
      );
      const key = u ? u.nombre : dest;
      if (!memosPorEstudiante.has(key)) memosPorEstudiante.set(key, { usuario: u, memos: [] });
      memosPorEstudiante.get(key).memos.push(m);
    });

    memosPorEstudiante.forEach((data, estNombre) => {
      if (data.memos.length >= 3) {
        const u = data.usuario;
        const cohorte = u ? (u.cohorte || '—') : '—';
        const notifId = 'memo3_' + encodeURIComponent(estNombre);
        notificaciones.push({
          id: notifId,
          tipo: 'memorando',
          tipoEnvio: 'Privada',
          categoria: 'Alerta Disciplinaria',
          prioridad: 'Alta',
          severidad: 'critica',
          titulo: `Límite disciplinario: ${data.memos.length} memorandos acumulados`,
          mensaje: `El estudiante ${escapeHtml(estNombre)} acumula ${data.memos.length} memorandos enviados. Requiere citación prioritaria o seguimiento disciplinario.`,
          estudiante: estNombre,
          cohorte: cohorte,
          destinatarios: [cohorte !== '—' ? ('Cohorte ' + cohorte) : 'Coordinación'],
          fecha: data.memos[0].fecha || '',
          icono: 'shield-alert',
          esComunicado: false,
          atendida: leidasSet.has(notifId),
          metadata: { titulos: data.memos.map(m => m.titulo).slice(0, 3) },
          accionPrincipal: {
            label: 'Ver expediente',
            onclick: `window.irAMemorandosEstudiante('${escapeHtml(estNombre).replace(/'/g, "\\'")}')`
          }
        });
      }
    });

    // 3. REGLA: Estudiantes en riesgo académico (Semáforo Rojo y Amarillo)
    semaforoData.forEach(s => {
      if (s.riesgo === 'Rojo' || s.riesgo === 'Amarillo') {
        const esRojo = s.riesgo === 'Rojo';
        const notifId = 'riesgo_' + encodeURIComponent(s.estudiante + '_' + s.cohorte);
        const motivosTxt = (s.motivos && s.motivos.length) ? s.motivos.join(', ') : (esRojo ? 'Promedio por debajo del mínimo' : 'Rendimiento en advertencia');
        notificaciones.push({
          id: notifId,
          tipo: 'riesgo',
          tipoEnvio: 'Privada',
          categoria: esRojo ? 'Riesgo Académico Crítico' : 'Alerta de Rendimiento',
          prioridad: esRojo ? 'Alta' : 'Media',
          severidad: esRojo ? 'critica' : 'alerta',
          titulo: esRojo ? `Riesgo académico alto: ${escapeHtml(s.estudiante)}` : `Alerta de rendimiento: ${escapeHtml(s.estudiante)}`,
          mensaje: `Estudiante en cohorte ${escapeHtml(s.cohorte)} con promedio ${s.promedio !== null ? s.promedio : '—'} y ${s.asistencia}% de asistencia. Motivo: ${escapeHtml(motivosTxt)}.`,
          estudiante: s.estudiante,
          cohorte: s.cohorte,
          destinatarios: ['Cohorte ' + s.cohorte],
          fecha: '',
          icono: 'shield-alert',
          esComunicado: false,
          atendida: leidasSet.has(notifId),
          accionPrincipal: {
            label: 'Revisar en Semáforo',
            onclick: `window.irASemaforoEstudiante('${escapeHtml(s.estudiante).replace(/'/g, "\\'")}', '${escapeHtml(s.cohorte).replace(/'/g, "\\'")}')`
          }
        });
      }
    });

    // 4. REGLA: Excusas médicas pendientes
    justificaciones.filter(j => j.estado === 'Pendiente').forEach(j => {
      const notifId = 'just_' + j.id;
      notificaciones.push({
        id: notifId,
        tipo: 'excusa',
        tipoEnvio: 'Privada',
        categoria: 'Excusa Médica',
        prioridad: 'Media',
        severidad: 'alerta',
        titulo: `Revisión de Excusa Médica para Estudiante: ${escapeHtml(j.estudiante)}`,
        mensaje: `Radicó justificación para ${escapeHtml(j.materia || 'clase')} (${fmtDate(j.fecha)}). Motivo: ${escapeHtml(j.motivo || 'Fuerza mayor')}.`,
        estudiante: j.estudiante,
        cohorte: j.cohorte || '',
        destinatarios: [j.cohorte ? ('Cohorte ' + j.cohorte) : 'Docencia'],
        fecha: j.creadoEn || j.fecha,
        icono: 'file-text',
        esComunicado: false,
        atendida: leidasSet.has(notifId),
        accionPrincipal: {
          label: 'Examinar documento',
          onclick: `window.abrirModalVisorJustificacion('${j.id}')`
        }
      });
    });

    // 5. REGLA: PQRs y Solicitudes de matrícula
    pqrs.filter(p => p.estado === 'Pendiente' || p.estado === 'Abierto').forEach(p => {
      const notifId = 'pqr_' + p.id;
      notificaciones.push({
        id: notifId,
        tipo: 'pqr_solicitudes',
        tipoEnvio: 'Privada',
        categoria: 'PQR Pendiente',
        prioridad: (p.tipo === 'Reclamo' || p.tipo === 'Queja') ? 'Alta' : 'Media',
        severidad: (p.tipo === 'Reclamo' || p.tipo === 'Queja') ? 'critica' : 'info',
        titulo: `${p.tipo || 'PQR'}: ${escapeHtml(p.asunto || 'Requerimiento')}`,
        mensaje: `Radicado por ${escapeHtml(p.solicitante || 'Usuario')} el ${fmtDate(p.fecha)}.`,
        estudiante: p.solicitante,
        destinatarios: ['Administración'],
        fecha: p.fecha,
        icono: 'administrative',
        esComunicado: false,
        atendida: leidasSet.has(notifId),
        accionPrincipal: { label: 'Gestionar PQR', onclick: `showPanel('pqr')` }
      });
    });

    // Ordenamiento: No atendidas primero, luego fecha descendente
    notificaciones.sort((a, b) => {
      if (a.atendida !== b.atendida) return a.atendida ? 1 : -1;
      return String(b.fecha || '').localeCompare(String(a.fecha || ''));
    });

    const metricas = {
      totalActivas: notificaciones.filter(n => !n.atendida).length,
      totalCriticas: notificaciones.filter(n => !n.atendida && n.prioridad === 'Alta').length,
      totalRiesgo: notificaciones.filter(n => !n.atendida && n.tipo === 'riesgo').length,
      totalMemos: notificaciones.filter(n => !n.atendida && n.tipo === 'memorando').length,
      totalExcusas: notificaciones.filter(n => !n.atendida && n.tipo === 'excusa').length,
      totalComunicados: notificaciones.filter(n => n.esComunicado).length,
      totalAtendidas: notificaciones.filter(n => n.atendida).length,
    };

    const cohortesLista = Array.from(new Set([
      ...modulos.map(m => m.nombre).filter(Boolean),
      ...notificaciones.map(n => n.cohorte).filter(Boolean)
    ])).filter(c => c && c !== '—').sort();

    return { notificaciones, metricas, cohortes: cohortesLista, modulos };
  }

  async function actualizarBadgesNotificacionesAdmin() {
    try {
      const { metricas } = await obtenerNotificacionesAdmin();
      const badgeSide = document.getElementById('notifBadgeSidebar');
      if (badgeSide) {
        if (metricas.totalActivas > 0) {
          badgeSide.textContent = metricas.totalActivas > 99 ? '99+' : metricas.totalActivas;
          badgeSide.classList.remove('hidden');
        } else {
          badgeSide.classList.add('hidden');
        }
      }
      const badgeHead = document.getElementById('notifBadgeHeader');
      if (badgeHead) {
        badgeHead.classList.toggle('hidden', metricas.totalActivas === 0);
      }
    } catch (e) {
      console.warn('[actualizarBadgesNotificacionesAdmin]', e);
    }
  }
  window.actualizarBadgesNotificacionesAdmin = actualizarBadgesNotificacionesAdmin;

  // ----------------------------------------------------------------------------
  // Renderizado del Centro de Notificaciones Superadmin (Fiel a Imagen 3)
  // ----------------------------------------------------------------------------
  async function renderNotificacionesAdmin() {
    const mount = document.getElementById('mount-notificaciones');
    if (!mount) return;

    const { notificaciones, metricas, cohortes, modulos } = await obtenerNotificacionesAdmin();

    // Opciones para destinatarios
    const cohortesOptions = (modulos && modulos.length) 
      ? modulos.map(m => m.nombre) 
      : ['Cohorte 1', 'Cohorte 2', 'Cohorte 3', 'Cohorte 4', 'Cohorte 5', 'Cohorte 8'];

    const destinatariosLabel = comunicadoDestinatarios.length > 0 
      ? comunicadoDestinatarios.join(', ')
      : (comunicadoTipoEnvio === 'Publica' ? 'Toda la comunidad (Pública)' : 'Seleccionar destinatarios...');

    // Render de cada tarjeta en el feed (con metadatos para filtrado reactivo en DOM sin perder foco)
    const tarjetasFeedHtml = notificaciones.map(n => {
      const esPriv = n.tipoEnvio === 'Privada';
      const fechaFmt = n.fecha ? (typeof fmtDate === 'function' ? fmtDate(n.fecha) : n.fecha.slice(0, 10)) : 'Hoy';
      const iconoHtml = ICONOS_COMUNICADO[n.icono] || ICONOS_COMUNICADO['megaphone'];

      const badgeTipoClase = esPriv 
        ? 'bg-morado/10 text-morado border-morado/20' 
        : 'bg-turquesa/10 text-turquesa border-turquesa/20';

      const badgePrioridadClase = n.prioridad === 'Alta' 
        ? 'bg-morado/15 text-morado font-extrabold border-morado/20' 
        : (n.prioridad === 'Media' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-teal-100 text-teal-800 border-teal-200');

      const destTxt = (Array.isArray(n.destinatarios) && n.destinatarios.length) 
        ? n.destinatarios.slice(0, 2).join(', ') + (n.destinatarios.length > 2 ? ` (+${n.destinatarios.length - 2})` : '')
        : (n.tipoEnvio === 'Pública' ? 'Pública' : 'Comunidad');

      return `
        <div class="card-comunicado-historial p-4 rounded-2xl bg-white border border-gray-100 hover:border-morado/30 hover:shadow-md transition-all duration-200 ${n.atendida ? 'opacity-60 bg-gray-50/60' : ''}" 
             id="feedCard_${n.id}"
             data-tipo="${n.tipoEnvio || (esPriv ? 'Privada' : 'Pública')}"
             data-es-comunicado="${n.esComunicado ? 'true' : 'false'}"
             data-prioridad="${n.prioridad || ''}"
             data-destinatarios="${escapeHtml((Array.isArray(n.destinatarios) ? n.destinatarios.join(' ') : (n.cohorte || ''))).toLowerCase()}"
             data-search="${escapeHtml(((n.titulo || '') + ' ' + (n.mensaje || '') + ' ' + (n.categoria || '') + ' ' + (n.tipoEnvio || '')).toLowerCase())}">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-2xl ${esPriv ? 'bg-morado/10 text-morado' : 'bg-turquesa/10 text-turquesa'} flex items-center justify-center shrink-0 border border-gray-100 shadow-xs mt-0.5">
              ${iconoHtml}
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeTipoClase}">
                    ${n.tipoEnvio || (esPriv ? 'Privada' : 'Pública')}
                  </span>
                  ${destTxt ? `<span class="text-[10px] font-semibold text-slate2 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 truncate max-w-[170px]">${escapeHtml(destTxt)}</span>` : ''}
                </div>
                <span class="text-[11px] text-slate2 font-medium">${fechaFmt}</span>
              </div>

              <h4 class="text-sm font-extrabold text-ink leading-snug hover:text-morado transition cursor-pointer" onclick="window.abrirModalDetalleComunicado('${n.id}')">
                ${escapeHtml(n.titulo)}
              </h4>
              
              <p class="text-xs text-slate2 mt-1 line-clamp-2 leading-relaxed">
                ${escapeHtml(n.mensaje)}
              </p>

              <div class="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-gray-100 flex-wrap">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-slate2">
                    ${escapeHtml(n.categoria)}
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgePrioridadClase}">
                    Prioridad: ${n.prioridad}
                  </span>
                  ${n.atendida ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Atendida</span>' : ''}
                </div>

                <div class="flex items-center gap-2">
                  <button type="button" onclick="window.abrirModalDetalleComunicado('${n.id}')" class="text-xs font-bold text-morado hover:underline cursor-pointer">
                    Ver detalles
                  </button>
                  <button type="button" onclick="window.marcarNotificacionAtendida('${n.id}', ${!n.atendida})" class="text-xs font-semibold text-slate2 hover:text-ink transition cursor-pointer" title="${n.atendida ? 'Reactivar' : 'Marcar atendida'}">
                    ${n.atendida ? 'Reactivar' : 'Marcar'}
                  </button>
                  ${n.esComunicado ? `
                    <button type="button" onclick="window.eliminarComunicadoSuperadmin('${n.id}')" class="text-xs font-semibold text-slate2 hover:text-rose-600 transition cursor-pointer p-0.5" title="Eliminar comunicado">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const emptyFeedHtml = `
      <div class="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <svg class="w-10 h-10 text-slate2/40 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
        <p class="text-xs font-extrabold text-ink">No hay comunicaciones con los filtros actuales</p>
        <p class="text-[11px] text-slate2 mt-0.5">Puedes cambiar los criterios de búsqueda o crear una nueva publicación.</p>
      </div>`;

    mount.innerHTML = `
      <!-- Banner Hero (Identidad Visual Institucional) -->
      <div class="superadmin-banner p-6 sm:p-8 mb-6 relative overflow-hidden rounded-3xl shadow-sm" style="--card-accent: linear-gradient(90deg, #8B5CF6, #1FC8C0);">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-turquesa text-xs font-bold uppercase tracking-wider mb-2 border border-white/10 backdrop-blur-md">
              <span class="w-1.5 h-1.5 rounded-full bg-turquesa animate-pulse"></span>
              ALERTAS Y NOVEDADES INSTITUCIONALES
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">CENTRO DE GESTIÓN DE NOTIFICACIONES</h2>
            <p class="text-xs sm:text-sm text-white/70 max-w-xl mt-1 leading-relaxed">
              Crear, enviar y gestionar comunicaciones para toda la institución, roles específicos y múltiples cohortes.
            </p>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" onclick="marcarTodasNotificacionesAtendidas()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md transition shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Marcar todas atendidas
            </button>
            <button type="button" onclick="renderNotificacionesAdmin()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-ink hover:bg-gray-100 transition shadow-sm cursor-pointer">
              <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Métricas / Monitoreo Rápido -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        <div onclick="filtrarHistorialComunicados('Todas')" class="admin-panel-card p-4 hover:border-morado/40 transition cursor-pointer">
          <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Total Activas</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${metricas.totalActivas}</p>
          <span class="text-[10px] text-slate2 mt-0.5 block">${metricas.totalComunicados} comunicados en total</span>
        </div>
        <div onclick="filtrarHistorialComunicados('Alta')" class="admin-panel-card p-4 hover:border-morado transition cursor-pointer">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-bold text-morado uppercase tracking-wide">Prioridad Alta</p>
            <span class="w-2 h-2 rounded-full bg-morado animate-pulse"></span>
          </div>
          <p class="text-2xl font-extrabold text-morado mt-1">${metricas.totalCriticas}</p>
          <span class="text-[10px] text-slate2 mt-0.5 block">Difusión urgente</span>
        </div>
        <div onclick="filtrarHistorialComunicados('Publica')" class="admin-panel-card p-4 hover:border-turquesa transition cursor-pointer">
          <p class="text-[11px] font-bold text-turquesa uppercase tracking-wide">Públicas</p>
          <p class="text-2xl font-extrabold text-turquesa mt-1">${notificaciones.filter(n => n.tipoEnvio === 'Pública').length}</p>
          <span class="text-[10px] text-slate2 mt-0.5 block">Portal y estudiantes</span>
        </div>
        <div onclick="filtrarHistorialComunicados('Privada')" class="admin-panel-card p-4 hover:border-indigo-400 transition cursor-pointer">
          <p class="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Por Cohortes</p>
          <p class="text-2xl font-extrabold text-indigo-600 mt-1">${notificaciones.filter(n => n.tipoEnvio === 'Privada').length}</p>
          <span class="text-[10px] text-slate2 mt-0.5 block">Segmentadas</span>
        </div>
        <div onclick="filtrarHistorialComunicados('Alertas')" class="admin-panel-card p-4 hover:border-amber-400 transition cursor-pointer">
          <p class="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Alertas Sistema</p>
          <p class="text-2xl font-extrabold text-amber-600 mt-1">${metricas.totalRiesgo + metricas.totalMemos + metricas.totalExcusas}</p>
          <span class="text-[10px] text-slate2 mt-0.5 block">Riesgo, memos y excusas</span>
        </div>
      </div>

      <!-- Cuadrícula Principal de 2 Columnas (Fiel a Imagen 3) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Columna Izquierda: CREAR NOTIFICACIÓN (5 Columnas) -->
        <div class="lg:col-span-5">
          <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div class="pb-3 border-b border-gray-100">
              <h3 class="text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-morado"></span>
                CREAR NOTIFICACIÓN
              </h3>
            </div>

            <!-- 1. Tipo de Notificación -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1.5">1. Tipo de Notificación</label>
              <div class="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button type="button" onclick="setComunicadoTipoEnvio('Publica')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${comunicadoTipoEnvio === 'Publica' ? 'bg-white text-ink shadow-xs' : 'text-slate2 hover:text-ink'}">
                  [ Pública ]
                </button>
                <button type="button" onclick="setComunicadoTipoEnvio('Privada')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${comunicadoTipoEnvio === 'Privada' ? 'bg-white text-morado shadow-xs' : 'text-slate2 hover:text-ink'}">
                  [ Privada ]
                </button>
              </div>
            </div>

            <!-- 2. Destinatarios -->
            <div class="relative">
              <label class="block text-xs font-bold text-ink mb-1.5">2. Destinatarios</label>
              
              <button type="button" onclick="toggleDestinatarioDropdown()" class="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-ink hover:border-morado transition cursor-pointer text-left">
                <div class="flex items-center gap-2 truncate">
                  <svg class="w-4 h-4 text-slate2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  <span class="truncate">${escapeHtml(destinatariosLabel)}</span>
                </div>
                <svg class="w-4 h-4 text-slate2 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>

              <!-- Panel Desplegable con Checkboxes -->
              <div id="dropdownDestinatariosPanel" class="hidden absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-200 shadow-xl p-3 z-30 space-y-1.5 max-h-56 overflow-y-auto">
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 text-xs font-semibold text-ink cursor-pointer">
                  <input type="checkbox" onchange="onToggleDestinatario('Todos los Estudiantes', this.checked)" ${comunicadoDestinatarios.includes('Todos los Estudiantes') ? 'checked' : ''} class="w-4 h-4 rounded text-morado focus:ring-morado" />
                  <span>Todos los Estudiantes</span>
                </label>
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 text-xs font-semibold text-ink cursor-pointer">
                  <input type="checkbox" onchange="onToggleDestinatario('Todos los Docentes', this.checked)" ${comunicadoDestinatarios.includes('Todos los Docentes') ? 'checked' : ''} class="w-4 h-4 rounded text-morado focus:ring-morado" />
                  <span>Todos los Docentes</span>
                </label>
                <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 text-xs font-semibold text-ink cursor-pointer">
                  <input type="checkbox" onchange="onToggleDestinatario('Todas las Cohortes', this.checked)" ${comunicadoDestinatarios.includes('Todas las Cohortes') ? 'checked' : ''} class="w-4 h-4 rounded text-morado focus:ring-morado" />
                  <span>Todas las Cohortes</span>
                </label>
                <div class="border-t border-gray-100 my-1"></div>
                ${cohortesOptions.map(c => `
                  <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 text-xs font-semibold text-ink cursor-pointer">
                    <input type="checkbox" onchange="onToggleDestinatario('${escapeHtml(c)}', this.checked)" ${comunicadoDestinatarios.includes(c) ? 'checked' : ''} class="w-4 h-4 rounded text-morado focus:ring-morado" />
                    <span>${escapeHtml(c)}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Título -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1.5">Título</label>
              <input type="text" id="comunicadoTituloInput" placeholder="Título de la Notificación" class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-ink focus:border-morado focus:ring-2 focus:ring-morado/20 outline-none" />
            </div>

            <!-- Mensaje -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1.5">Mensaje</label>
              <textarea id="comunicadoMensajeInput" rows="4" placeholder="Mensaje de la Notificación" class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-ink focus:border-morado focus:ring-2 focus:ring-morado/20 outline-none resize-none leading-relaxed"></textarea>
            </div>

            <!-- Categoría y Prioridad en fila -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label class="block text-xs font-bold text-ink mb-1.5">Categoría</label>
                <select id="comunicadoCategoriaSelect" onchange="comunicadoCategoria = this.value" class="w-full p-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-ink focus:border-morado outline-none">
                  <option value="Institucional" ${comunicadoCategoria === 'Institucional' ? 'selected' : ''}>Institucional</option>
                  <option value="Académico" ${comunicadoCategoria === 'Académico' ? 'selected' : ''}>Académico</option>
                  <option value="Eventos" ${comunicadoCategoria === 'Eventos' ? 'selected' : ''}>Eventos</option>
                  <option value="Administrativo" ${comunicadoCategoria === 'Administrativo' ? 'selected' : ''}>Administrativo</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-ink mb-1.5">Prioridad</label>
                <div class="flex items-center gap-1.5 pt-0.5">
                  <button type="button" onclick="setComunicadoPrioridad('Baja')" class="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${comunicadoPrioridad === 'Baja' ? 'bg-teal-500 text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                    Baja
                  </button>
                  <button type="button" onclick="setComunicadoPrioridad('Media')" class="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${comunicadoPrioridad === 'Media' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                    Media
                  </button>
                  <button type="button" onclick="setComunicadoPrioridad('Alta')" class="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${comunicadoPrioridad === 'Alta' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                    Alta
                  </button>
                </div>
              </div>
            </div>

            <!-- Botón Enviar Notificación -->
            <div class="pt-2">
              <button type="button" onclick="enviarComunicadoSuperadmin()" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-morado/20 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                <span>ENVIAR NOTIFICACIÓN</span>
              </button>
            </div>

          </div>
        </div>

        <!-- Columna Derecha: HISTORIAL DE COMUNICACIONES (7 Columnas) -->
        <div class="lg:col-span-7">
          <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
            
            <!-- Barra superior del Historial -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <h3 class="text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-turquesa"></span>
                HISTORIAL DE COMUNICACIONES
              </h3>

              <div class="flex items-center gap-2 flex-wrap">
                <button type="button" data-tipo="Todas" onclick="filtrarHistorialComunicados('Todas')" class="btn-historial-filtro-tipo px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${comHistFiltroTipo === 'Todas' ? 'bg-morado text-white' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                  Todas
                </button>
                <button type="button" data-tipo="Publica" onclick="filtrarHistorialComunicados('Publica')" class="btn-historial-filtro-tipo px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${comHistFiltroTipo === 'Publica' ? 'bg-turquesa text-white' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                  Públicas
                </button>
                <button type="button" data-tipo="Privada" onclick="filtrarHistorialComunicados('Privada')" class="btn-historial-filtro-tipo px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${comHistFiltroTipo === 'Privada' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate2 hover:text-ink'}">
                  Privadas
                </button>

                <!-- Selector de Cohortes -->
                <select id="selectFiltroHistorialCohorte" onchange="filtrarHistorialCohorte(this.value)" class="p-1 rounded-lg border border-gray-200 bg-white text-[11px] font-bold text-ink outline-none">
                  <option value="">Cohortes ▾</option>
                  ${cohortesOptions.map(c => `<option value="${escapeHtml(c)}" ${comHistFiltroCohorte === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Buscador en tiempo real dentro del historial -->
            <div class="relative">
              <input type="text" id="buscadorHistorialAdmin" value="${escapeHtml(comHistFiltroTexto)}" oninput="filtrarHistorialTexto(this.value)" placeholder="Buscar por título, contenido o etiqueta..." class="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-ink focus:border-morado outline-none" />
              <svg class="w-3.5 h-3.5 text-slate2 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <!-- Feed de Tarjetas -->
            <div class="space-y-3" id="feed-comunicados-admin">
              ${tarjetasFeedHtml || emptyFeedHtml}
              <div id="feed-comunicados-admin-empty" class="hidden p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                <p class="text-xs text-slate2 font-medium">No se encontraron notificaciones con este criterio.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;

    aplicarFiltrosHistorialAdmin();
    actualizarBadgesNotificacionesAdmin();
  }

  // ----------------------------------------------------------------------------
  // Funciones de Creación, Guardado y Acciones de Notificaciones Superadmin
  // ----------------------------------------------------------------------------
  window.setComunicadoTipoEnvio = function(tipo) {
    comunicadoTipoEnvio = tipo;
    if (tipo === 'Publica') {
      comunicadoDestinatarios = ['Todos'];
    } else {
      if (comunicadoDestinatarios.length === 1 && comunicadoDestinatarios[0] === 'Todos') {
        comunicadoDestinatarios = [];
      }
    }
    renderNotificacionesAdmin();
  };

  window.toggleDestinatarioDropdown = function() {
    const panel = document.getElementById('dropdownDestinatariosPanel');
    if (panel) panel.classList.toggle('hidden');
  };

  window.onToggleDestinatario = function(dest, checked) {
    if (checked) {
      if (!comunicadoDestinatarios.includes(dest)) {
        comunicadoDestinatarios.push(dest);
      }
    } else {
      comunicadoDestinatarios = comunicadoDestinatarios.filter(d => d !== dest);
    }
    // Si deseleccionó todo y es privada, dejar vacío para que el botón lo indique
    renderNotificacionesAdmin();
    // Mantener abierto el dropdown para poder marcar varios
    setTimeout(() => {
      const panel = document.getElementById('dropdownDestinatariosPanel');
      if (panel) panel.classList.remove('hidden');
    }, 50);
  };

  window.setComunicadoPrioridad = function(p) {
    comunicadoPrioridad = p;
    renderNotificacionesAdmin();
  };

  window.enviarComunicadoSuperadmin = async function() {
    const inputTitulo = document.getElementById('comunicadoTituloInput');
    const inputMensaje = document.getElementById('comunicadoMensajeInput');
    const selCat = document.getElementById('comunicadoCategoriaSelect');

    const titulo = inputTitulo ? inputTitulo.value.trim() : '';
    const mensaje = inputMensaje ? inputMensaje.value.trim() : '';
    const categoria = selCat ? selCat.value : comunicadoCategoria;

    if (!titulo) {
      toast('Por favor escribe el título de la notificación', 'err');
      if (inputTitulo) inputTitulo.focus();
      return;
    }
    if (!mensaje) {
      toast('Por favor escribe el mensaje de la notificación', 'err');
      if (inputMensaje) inputMensaje.focus();
      return;
    }

    const destFinal = (comunicadoTipoEnvio === 'Publica' || comunicadoDestinatarios.length === 0)
      ? ['Todos']
      : [...comunicadoDestinatarios];

    const ahora = new Date();
    const fechaSql = ahora.toISOString().slice(0, 19).replace('T', ' ');

    const nuevo = {
      id: 'com_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      tipo: comunicadoTipoEnvio,
      destinatarios: destFinal,
      titulo: titulo,
      mensaje: mensaje,
      categoria: categoria,
      prioridad: comunicadoPrioridad,
      autor: (getAdminUser() && getAdminUser().nombre) ? getAdminUser().nombre : 'Superadmin',
      autorRol: 'Superadmin',
      fecha: fechaSql,
      atendida: false
    };

    try {
      let lista = await Store.list('comunicados');
      if (!Array.isArray(lista)) lista = [];
      lista.unshift(nuevo);
      await Store.set('comunicados', lista);

      toast('¡Notificación enviada con éxito!', 'ok');
      // Reset campos
      comunicadoDestinatarios = [];
      renderNotificacionesAdmin();
    } catch (e) {
      console.error('[enviarComunicadoSuperadmin]', e);
      toast('Error al guardar la notificación: ' + (e.message || ''), 'err');
    }
  };

  window.eliminarComunicadoSuperadmin = async function(id) {
    if (!confirm('¿Deseas eliminar este comunicado? Dejará de ser visible para los estudiantes y docentes.')) return;
    try {
      let lista = await Store.list('comunicados');
      if (Array.isArray(lista)) {
        lista = lista.filter(c => c.id !== id);
        await Store.set('comunicados', lista);
      }
      toast('Comunicado eliminado', 'ok');
      renderNotificacionesAdmin();
    } catch (e) {
      toast('No se pudo eliminar el comunicado', 'err');
    }
  };

  function aplicarFiltrosHistorialAdmin() {
    const container = document.getElementById('feed-comunicados-admin');
    if (!container) return;
    const cards = container.querySelectorAll('.card-comunicado-historial');
    const qT = (comHistFiltroTexto || '').toLowerCase().trim();
    const qC = (comHistFiltroCohorte || '').toLowerCase().trim();
    let visibles = 0;

    cards.forEach(card => {
      const search = card.getAttribute('data-search') || '';
      const tipo = card.getAttribute('data-tipo') || '';
      const esCom = card.getAttribute('data-es-comunicado') === 'true';
      const prioridad = card.getAttribute('data-prioridad') || '';
      const dest = card.getAttribute('data-destinatarios') || '';

      let matchTipo = true;
      if (comHistFiltroTipo === 'Publica') matchTipo = (tipo === 'Pública' || tipo === 'Publica');
      else if (comHistFiltroTipo === 'Privada') matchTipo = (tipo === 'Privada');
      else if (comHistFiltroTipo === 'Alertas') matchTipo = !esCom;
      else if (comHistFiltroTipo === 'Alta') matchTipo = (prioridad === 'Alta');

      let matchCohorte = true;
      if (qC) matchCohorte = dest.includes(qC);

      let matchTexto = true;
      if (qT) matchTexto = search.includes(qT);

      const visible = matchTipo && matchCohorte && matchTexto;
      card.classList.toggle('hidden', !visible);
      if (visible) visibles++;
    });

    const emptyMsg = document.getElementById('feed-comunicados-admin-empty');
    if (emptyMsg) emptyMsg.classList.toggle('hidden', visibles > 0);
  }
  window.aplicarFiltrosHistorialAdmin = aplicarFiltrosHistorialAdmin;

  window.filtrarHistorialComunicados = function(tipo) {
    comHistFiltroTipo = tipo;
    document.querySelectorAll('.btn-historial-filtro-tipo').forEach(btn => {
      const bTipo = btn.getAttribute('data-tipo');
      if (bTipo === tipo) {
        btn.className = 'btn-historial-filtro-tipo px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ' + 
          (tipo === 'Todas' ? 'bg-morado text-white' : (tipo === 'Publica' ? 'bg-turquesa text-white' : (tipo === 'Privada' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white')));
      } else {
        btn.className = 'btn-historial-filtro-tipo px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-gray-100 text-slate2 hover:text-ink';
      }
    });
    aplicarFiltrosHistorialAdmin();
  };

  window.filtrarHistorialCohorte = function(c) {
    comHistFiltroCohorte = c;
    aplicarFiltrosHistorialAdmin();
  };

  window.filtrarHistorialTexto = function(t) {
    comHistFiltroTexto = t;
    aplicarFiltrosHistorialAdmin();
  };

  // ----------------------------------------------------------------------------
  // Modal de Detalle Completo de Notificación / Comunicado
  // ----------------------------------------------------------------------------
  window.abrirModalDetalleComunicado = async function(id) {
    const modal = document.getElementById('modalDetalleComunicado');
    if (!modal) return;

    let encontrado = null;
    const comunicados = await Store.list('comunicados');
    if (Array.isArray(comunicados)) {
      encontrado = comunicados.find(c => c.id === id);
    }
    if (!encontrado) {
      const { notificaciones } = await obtenerNotificacionesAdmin();
      encontrado = notificaciones.find(n => n.id === id);
    }
    if (!encontrado) {
      toast('No se pudo cargar el detalle del comunicado', 'err');
      return;
    }

    const tituloEl = document.getElementById('modalComTitulo');
    const autorEl = document.getElementById('modalComAutor');
    const fechaEl = document.getElementById('modalComFecha');
    const destEl = document.getElementById('modalComDestinatarios');
    const mensajeEl = document.getElementById('modalComMensaje');
    const badgesEl = document.getElementById('modalComBadges');

    if (tituloEl) tituloEl.textContent = encontrado.titulo || '';
    if (autorEl) autorEl.textContent = encontrado.autor || 'Fundación A+';
    if (fechaEl) fechaEl.textContent = encontrado.fecha ? (typeof fmtDate === 'function' ? fmtDate(encontrado.fecha) : encontrado.fecha) : 'Reciente';
    
    const destArr = Array.isArray(encontrado.destinatarios) ? encontrado.destinatarios : [encontrado.destinatarios || 'Toda la institución'];
    if (destEl) destEl.textContent = destArr.join(', ') || 'Toda la institución';
    if (mensajeEl) mensajeEl.textContent = encontrado.mensaje || '';

    if (badgesEl) {
      const esPriv = String(encontrado.tipo || encontrado.tipoEnvio || '').toLowerCase().includes('privad');
      badgesEl.innerHTML = `
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${esPriv ? 'bg-morado/10 text-morado border border-morado/20' : 'bg-turquesa/10 text-turquesa border border-turquesa/20'}">
          ${esPriv ? 'Privada' : 'Pública'}
        </span>
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-slate2 border border-gray-200">
          ${escapeHtml(encontrado.categoria || 'Institucional')}
        </span>
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${encontrado.prioridad === 'Alta' ? 'bg-morado/15 text-morado' : 'bg-amber-100 text-amber-800'} border border-gray-200">
          Prioridad ${encontrado.prioridad || 'Media'}
        </span>
      `;
    }

    modal.classList.remove('hidden');
  };

  window.cerrarModalDetalleComunicado = function() {
    const modal = document.getElementById('modalDetalleComunicado');
    if (modal) modal.classList.add('hidden');
  };

  window.filtrarNotificacionesDocenteTab = function(tab) {
    notifDocenteTab = tab;
    renderNotificacionesDocente();
  };

  // ----------------------------------------------------------------------------
  // PANEL DOCENTE: CENTRO DE NOTIFICACIONES Y PUBLICACIONES (Fiel a Imagen 1)
  // ----------------------------------------------------------------------------
  async function renderNotificacionesDocente() {
    const mount = document.getElementById('mount-t-notificaciones');
    if (!mount) return;

    const doc = getDocente() || {};
    let [comunicados, justificaciones, semaforoData, memorandos, usuarios, modulos] = await Promise.all([
      Store.list('comunicados'),
      Store.list('justificaciones_asistencia'),
      computeSemaforo(),
      Store.list('memorandos'),
      Store.list('usuarios'),
      Store.list('modulos')
    ]);
    comunicados = Array.isArray(comunicados) ? comunicados : [];
    justificaciones = Array.isArray(justificaciones) ? justificaciones : [];
    semaforoData = Array.isArray(semaforoData) ? semaforoData : [];
    memorandos = Array.isArray(memorandos) ? memorandos : [];
    usuarios = Array.isArray(usuarios) ? usuarios : [];
    modulos = Array.isArray(modulos) ? modulos : [];

    // Cohortes asignadas al docente
    const asignadas = (doc.cohortes && Array.isArray(doc.cohortes) && doc.cohortes.length)
      ? doc.cohortes
      : (modulos ? modulos.slice(0, 3).map(m => m.nombre) : ['Cohorte 1', 'Cohorte 5', 'Cohorte 8']);

    const asignadasData = asignadas.map(cName => {
      const cMod = (modulos || []).find(m => m.nombre === cName);
      const estCount = (usuarios || []).filter(u => u.rol === 'Estudiante' && u.cohorte === cName).length;
      return { nombre: cName, count: estCount || 28 };
    });

    // Notificaciones relevantes para el docente (de sus cohortes o públicas)
    const relevantes = [];
    (comunicados || []).forEach(c => {
      const esPub = String(c.tipo || '').toLowerCase().includes('publi');
      const dest = Array.isArray(c.destinatarios) ? c.destinatarios : [c.destinatarios || ''];
      const tocaCohorte = dest.some(d => asignadas.some(a => d.toLowerCase().includes(a.toLowerCase())) || d === 'Todos' || d === 'Todos los Docentes');
      if (esPub || tocaCohorte) {
        relevantes.push({
          id: c.id,
          tipo: 'comunicado',
          titulo: c.titulo,
          mensaje: c.mensaje,
          categoria: c.categoria,
          prioridad: c.prioridad,
          fecha: c.fecha,
          esPropia: c.autor === doc.nombre
        });
      }
    });

    // Excusas médicas de sus cohortes
    const excusasDoc = (justificaciones || []).filter(j => j.estado === 'Pendiente');
    excusasDoc.forEach(j => {
      relevantes.push({
        id: 'j_' + j.id,
        tipo: 'excusa',
        titulo: `Revisión de Excusa Médica para Estudiante: ${escapeHtml(j.estudiante)}`,
        mensaje: `Soporte médico para ${escapeHtml(j.materia || 'clase')} (${fmtDate(j.fecha)}). Motivo: ${escapeHtml(j.motivo || 'Fuerza mayor')}.`,
        categoria: 'Excusas',
        prioridad: 'Media',
        fecha: j.fecha
      });
    });

    // Riesgo académico en sus cohortes
    const riesgoDoc = (semaforoData || []).filter(s => s.riesgo === 'Rojo' && asignadas.some(a => s.cohorte.includes(a)));
    riesgoDoc.forEach(s => {
      relevantes.push({
        id: 'r_' + s.estudiante,
        tipo: 'riesgo',
        titulo: `Alerta de Riesgo Académico en ${escapeHtml(s.cohorte)}: ${escapeHtml(s.estudiante)}`,
        mensaje: `Promedio actual: ${s.promedio} · Asistencia: ${s.asistencia}%.`,
        categoria: 'Riesgo',
        prioridad: 'Alta',
        fecha: ''
      });
    });

    const totalCount = relevantes.length;
    const criticasCount = relevantes.filter(r => r.prioridad === 'Alta').length;
    const cortesCount = relevantes.filter(r => r.tipo === 'comunicado').length;
    const excusasCount = excusasDoc.length;

    let filtradas = relevantes;
    if (notifDocenteTab === 'criticas') {
      filtradas = relevantes.filter(r => r.prioridad === 'Alta');
    } else if (notifDocenteTab === 'mis_cortes') {
      filtradas = relevantes.filter(r => r.tipo === 'comunicado');
    } else if (notifDocenteTab === 'excusas') {
      filtradas = relevantes.filter(r => r.tipo === 'excusa');
    }

    mount.innerHTML = `
      <!-- Banner Hero Docente -->
      <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-morado via-indigo-700 to-morado text-white mb-6 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/15">
              <span class="w-1.5 h-1.5 rounded-full bg-turquesa animate-pulse"></span>
              ALERTAS Y NOVEDADES INSTITUCIONALES
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">Centro de Notificaciones</h2>
            <p class="text-xs sm:text-sm text-white/70 max-w-xl mt-1 leading-relaxed">
              Monitoreo activo de estudiantes en riesgo académico, alertas por 3+ disciplinarios y validación de excusas médicas.
            </p>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button type="button" onclick="renderNotificacionesDocente()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-ink hover:bg-gray-100 transition shadow-sm cursor-pointer">
              <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>
        </div>

        <!-- Contadores en el Banner -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div class="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
            <p class="text-[10px] uppercase font-bold text-white/70">TOTAL ACTIVAS</p>
            <p class="text-xl font-extrabold text-white mt-0.5">${totalCount}</p>
          </div>
          <div class="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
            <p class="text-[10px] uppercase font-bold text-white/70">CRÍTICAS</p>
            <p class="text-xl font-extrabold text-white mt-0.5">${criticasCount}</p>
          </div>
          <div class="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
            <p class="text-[10px] uppercase font-bold text-white/70">RIESGO</p>
            <p class="text-xl font-extrabold text-white mt-0.5">${riesgoDoc.length}</p>
          </div>
          <div class="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
            <p class="text-[10px] uppercase font-bold text-white/70">MEMORANDOS</p>
            <p class="text-xl font-extrabold text-white mt-0.5">1</p>
          </div>
          <div class="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
            <p class="text-[10px] uppercase font-bold text-white/70">EXCUSAS</p>
            <p class="text-xl font-extrabold text-white mt-0.5">${excusasCount}</p>
          </div>
        </div>
      </div>

      <!-- Gestor de Comunicación y Publicación Docente -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        
        <!-- Izquierda: Mis Cortes Asignadas y Filtros -->
        <div class="lg:col-span-6 space-y-4">
          <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <h3 class="text-sm font-extrabold text-ink mb-3">Gestor de Comunicación para Mis Cortes</h3>
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide mb-2">MIS CORTES ASIGNADAS</p>
            
            <div class="flex items-center gap-2.5 flex-wrap">
              ${asignadasData.map((c, i) => `
                <div class="flex items-center gap-2 px-3 py-2 rounded-2xl ${i === 0 ? 'bg-morado/10 border-morado/30 text-morado' : (i === 1 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-turquesa/10 border-turquesa/30 text-turquesa')} border">
                  <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <div>
                    <p class="text-xs font-extrabold leading-tight">${escapeHtml(c.nombre)}</p>
                    <p class="text-[10px] opacity-80 leading-tight">${c.count} estudiantes</p>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Tabs de navegación -->
            <div class="flex items-center gap-1.5 flex-wrap mt-5 pt-4 border-t border-gray-100">
              <button type="button" onclick="filtrarNotificacionesDocenteTab('todas')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifDocenteTab === 'todas' ? 'bg-morado text-white shadow-xs' : 'text-slate2 hover:bg-gray-100'}">Todas (${totalCount})</button>
              <button type="button" onclick="filtrarNotificacionesDocenteTab('criticas')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifDocenteTab === 'criticas' ? 'bg-morado text-white shadow-xs' : 'text-slate2 hover:bg-gray-100'}">Críticas (${criticasCount})</button>
              <button type="button" onclick="filtrarNotificacionesDocenteTab('mis_cortes')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifDocenteTab === 'mis_cortes' ? 'bg-morado text-white shadow-xs' : 'text-slate2 hover:bg-gray-100'}">Por mis Cortes (${cortesCount})</button>
              <button type="button" onclick="filtrarNotificacionesDocenteTab('excusas')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifDocenteTab === 'excusas' ? 'bg-morado text-white shadow-xs' : 'text-slate2 hover:bg-gray-100'}">Excusas (${excusasCount})</button>
            </div>
          </div>
        </div>

        <!-- Derecha: Formulario Nueva Publicación Docente -->
        <div class="lg:col-span-6">
          <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
            <h3 class="text-xs font-extrabold uppercase tracking-wide text-ink">NUEVA PUBLICACIÓN DOCENTE</h3>
            
            <div>
              <label class="block text-xs font-bold text-slate2 mb-1">Destinatarios:</label>
              <select id="docentePublicarCohorteSelect" class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-ink focus:border-morado outline-none">
                <option value="">Seleccionar Cohortes...</option>
                ${asignadas.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate2 mb-1">Título:</label>
              <input type="text" id="docentePublicarTituloInput" placeholder="Ej. Cambio de horario o entrega de proyecto" class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-ink focus:border-morado outline-none" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate2 mb-1">Mensaje:</label>
              <textarea id="docentePublicarMensajeInput" rows="3" placeholder="Escribe el mensaje para tus estudiantes..." class="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-ink focus:border-morado outline-none resize-none"></textarea>
            </div>

            <button type="button" onclick="publicarEnMisCortesDocente()" class="w-full py-2.5 px-4 rounded-xl bg-morado hover:bg-morado/90 text-white font-extrabold text-xs transition cursor-pointer shadow-xs">
              Publicar en mis Cortes
            </button>
          </div>
        </div>

      </div>

      <!-- Feed de Alertas Docente -->
      <div class="space-y-3">
        ${filtradas.length === 0 ? `
          <div class="p-8 text-center bg-white rounded-2xl border border-gray-100">
            <p class="text-xs font-bold text-slate2">No hay notificaciones en este filtro.</p>
          </div>
        ` : filtradas.map(r => `
          <div class="p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-xs transition flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl ${r.prioridad === 'Alta' ? 'bg-morado/10 text-morado border-morado/20' : (r.tipo === 'excusa' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-morado border-gray-200')} flex items-center justify-center shrink-0 border">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-morado/10 text-morado border border-morado/20">${escapeHtml(r.categoria || 'Aviso')}</span>
                ${r.prioridad === 'Alta' ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-morado text-white">Crítica</span>` : ''}
                ${r.fecha ? `<span class="text-[10px] text-slate2 font-medium">${fmtDate(r.fecha)}</span>` : ''}
              </div>
              <h4 class="text-xs sm:text-sm font-extrabold text-ink">${escapeHtml(r.titulo)}</h4>
              <p class="text-xs text-slate2 mt-0.5 leading-relaxed">${escapeHtml(r.mensaje)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Actualizar badge
    const bDoc = document.getElementById('notifBadgeDocente');
    if (bDoc) {
      bDoc.textContent = totalCount;
      bDoc.classList.toggle('hidden', totalCount === 0);
    }
  }

  window.publicarEnMisCortesDocente = async function() {
    const sel = document.getElementById('docentePublicarCohorteSelect');
    const inpT = document.getElementById('docentePublicarTituloInput');
    const inpM = document.getElementById('docentePublicarMensajeInput');

    const cohorte = sel ? sel.value : '';
    const titulo = inpT ? inpT.value.trim() : '';
    const mensaje = inpM ? inpM.value.trim() : '';

    if (!cohorte) { toast('Por favor selecciona una de tus cohortes', 'err'); return; }
    if (!titulo) { toast('Por favor ingresa el título del aviso', 'err'); return; }
    if (!mensaje) { toast('Por favor ingresa el mensaje para los estudiantes', 'err'); return; }

    const doc = getDocente() || {};
    const nuevo = {
      id: 'com_doc_' + Date.now(),
      tipo: 'Privada',
      destinatarios: [cohorte],
      titulo: titulo,
      mensaje: mensaje,
      categoria: 'Académico',
      prioridad: 'Media',
      autor: doc.nombre || 'Docente',
      autorRol: 'Docente',
      fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
      atendida: false
    };

    let lista = await Store.list('comunicados');
    if (!Array.isArray(lista)) lista = [];
    lista.unshift(nuevo);
    await Store.set('comunicados', lista);

    toast('Aviso publicado con éxito para ' + cohorte, 'ok');
    renderNotificacionesDocente();
  };

  // ----------------------------------------------------------------------------
  // PANEL ESTUDIANTE: CENTRO DE NOTIFICACIONES CON CONTROLADOR (Fiel a Imagen 2)
  // ----------------------------------------------------------------------------
  function getNotificacionesLeidasEstudiante(estId) {
    try {
      const key = 'aplus_estudiante_leidas_' + (estId || 'default');
      const val = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(val) ? val : [];
    } catch (e) {
      return [];
    }
  }

  function setNotificacionesLeidasEstudiante(estId, list) {
    try {
      const key = 'aplus_estudiante_leidas_' + (estId || 'default');
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  async function renderNotificacionesEstudiante() {
    const mount = document.getElementById('mount-s-notificaciones');
    if (!mount) return;

    const est = getEstudiante() || {};
    const miCohorte = est.cohorte || 'Cohorte 8';
    const miId = est.id || est.email || 'estudiante';
    let leidasEst = getNotificacionesLeidasEstudiante(miId);

    let comunicados = await Store.list('comunicados');
    if (!Array.isArray(comunicados)) comunicados = [];

    // Columna 1: Notificaciones de su Cohorte y Personales (Intervenciones Tutoriales y Alertas)
    const rawNotifsCorte = (comunicados || []).filter(c => {
      let dest = [];
      try {
        dest = Array.isArray(c.destinatarios) ? c.destinatarios : JSON.parse(c.destinatarios || '[]');
      } catch (e) {
        dest = [c.destinatarios || ''];
      }
      if (!Array.isArray(dest)) dest = [String(dest)];
      const miNom = (est.nombre || '').toLowerCase().trim();
      const miEmail = (est.email || '').toLowerCase().trim();
      const cohorte = miCohorte.toLowerCase().trim();

      const esParaMi = dest.some(d => {
        const str = String(d).toLowerCase().trim();
        return (miNom && (str === miNom || str.includes(miNom) || miNom.includes(str))) ||
               (miEmail && str.includes(miEmail)) ||
               (cohorte && str.includes(cohorte)) ||
               str === 'todos los estudiantes' ||
               str === 'todos';
      });
      return esParaMi;
    });

    // Columna 2: Mensajes Públicos y Fundación A+
    const rawNotifsPublicas = (comunicados || []).filter(c => {
      const esPub = String(c.tipo || '').toLowerCase().includes('publi');
      return esPub;
    });

    // Helper de filtrado por categoría
    function cumpleFiltroCat(n) {
      if (!notifEstudianteCategoria || notifEstudianteCategoria === 'todas') return true;
      const catNorm = (notifEstudianteCategoria || '').toLowerCase();
      const cCat = (n.categoria || '').toLowerCase();
      if (catNorm.includes('tutor') || catNorm.includes('compromiso')) {
        const tit = (n.titulo || '').toLowerCase();
        const msg = (n.mensaje || '').toLowerCase();
        return cCat.includes('tutor') || cCat.includes('compromiso') || tit.includes('tutor') || tit.includes('compromiso') || msg.includes('compromiso');
      }
      return cCat.includes(catNorm);
    }

    // Helper de filtrado por estado de lectura
    function cumpleFiltroLeida(n) {
      if (!notifEstudianteSoloNoLeidas) return true;
      return !leidasEst.includes(n.id);
    }

    const notifsCorte = rawNotifsCorte.filter(n => cumpleFiltroCat(n) && cumpleFiltroLeida(n));
    const notifsPublicas = rawNotifsPublicas.filter(n => cumpleFiltroCat(n) && cumpleFiltroLeida(n));

    // Contador de no leídas globales
    const totalRaw = [...rawNotifsCorte, ...rawNotifsPublicas];
    const totalNoLeidas = totalRaw.filter(n => !leidasEst.includes(n.id)).length;

    const renderCardEstudiante = (n, tipo) => {
      const esLeida = leidasEst.includes(n.id);
      return `
      <div class="card-notif-estudiante card-notif-est-${tipo} p-5 rounded-2xl bg-white border ${esLeida ? 'border-gray-100 opacity-90' : 'border-gray-200 border-l-4 border-l-morado shadow-xs'} hover:border-morado/40 hover:shadow-md transition-all duration-200" data-id="${escapeHtml(n.id)}" data-search="${escapeHtml(((n.titulo || '') + ' ' + (n.mensaje || '') + ' ' + (n.categoria || '')).toLowerCase())}">
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-2xl ${esLeida ? 'bg-gray-100 text-slate2' : 'bg-morado/10 text-morado'} flex items-center justify-center shrink-0 border border-gray-100">
            ${ICONOS_COMUNICADO[n.categoria === 'Eventos' ? 'calendar' : (n.categoria === 'Académico' ? 'academic' : 'megaphone')]}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${n.categoria === 'Institucional' ? 'bg-amber-100 text-amber-800' : 'bg-morado/10 text-morado'}">
                  ${escapeHtml(n.categoria || 'Académica')}
                </span>
                ${!esLeida ? `
                  <span class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-morado text-white">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Nueva
                  </span>
                ` : `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-slate2">
                    Leída
                  </span>
                `}
              </div>
              <span class="text-[11px] text-slate2">${n.fecha ? (typeof fmtDate === 'function' ? fmtDate(n.fecha) : n.fecha.slice(0, 10)) : '02 de oct 2026'}</span>
            </div>
            
            <h4 class="text-sm font-extrabold text-ink leading-snug mt-1">
              ${escapeHtml(n.titulo)}
            </h4>
            
            <p class="text-xs text-slate2 mt-1 line-clamp-2 leading-relaxed">
              ${escapeHtml(n.mensaje)}
            </p>

            <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
              <button type="button" onclick="window.toggleLeidaNotifEstudiante('${n.id}', event)" class="text-[11px] font-semibold text-slate2 hover:text-morado transition cursor-pointer flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${esLeida ? 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' : 'M5 13l4 4L19 7'}"/></svg>
                <span>${esLeida ? 'Marcar no leída' : 'Marcar como leída'}</span>
              </button>
              <button type="button" onclick="window.verDetalleYMarcarLeida('${n.id}')" class="text-xs font-bold text-morado hover:underline cursor-pointer">
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    };

    mount.innerHTML = `
      <!-- Header Banner Estudiante -->
      <div class="p-6 sm:p-7 rounded-3xl bg-slate-900 text-white mb-6 shadow-sm border border-slate-800" style="background: linear-gradient(115deg, #181E2A 0%, #2A1F4D 55%, #5B21B6 100%);">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/15">
              <span class="w-1.5 h-1.5 rounded-full bg-turquesa animate-pulse"></span>
              CENTRO DE MENSAJERÍA Y AVISOS
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">Centro de Notificaciones - Panel del Estudiante</h2>
            <p class="text-xs sm:text-sm text-white/70 max-w-xl mt-1 leading-relaxed">
              Mantente al tanto de los avisos de tu cohorte, tutorías académicas, fechas importantes y anuncios de la Fundación A+.
            </p>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div class="bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-right">
              <span class="text-[10px] font-bold uppercase tracking-wider text-white/70 block">NO LEÍDAS</span>
              <span class="text-lg font-extrabold text-turquesa">${totalNoLeidas}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Control del Centro de Notificaciones (Controlador Frontend) -->
      <div class="p-4 sm:p-5 rounded-3xl bg-white border border-gray-100 shadow-sm mb-6 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <!-- Tabs de Categoría -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="window.cambiarFiltroCatNotifEstudiante('todas')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifEstudianteCategoria === 'todas' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
              Todas (${totalRaw.length})
            </button>
            <button type="button" onclick="window.cambiarFiltroCatNotifEstudiante('Tutorías')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifEstudianteCategoria === 'Tutorías' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
              Tutorías y Compromisos
            </button>
            <button type="button" onclick="window.cambiarFiltroCatNotifEstudiante('Institucional')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifEstudianteCategoria === 'Institucional' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
              Institucional
            </button>
            <button type="button" onclick="window.cambiarFiltroCatNotifEstudiante('Académico')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifEstudianteCategoria === 'Académico' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
              Académico
            </button>
            <button type="button" onclick="window.cambiarFiltroCatNotifEstudiante('Eventos')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${notifEstudianteCategoria === 'Eventos' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:text-ink'}">
              Eventos
            </button>
          </div>

          <!-- Acciones Rápidas -->
          <div class="flex items-center gap-3 flex-wrap">
            <label class="inline-flex items-center gap-2 text-xs font-bold text-slate2 hover:text-ink cursor-pointer select-none">
              <input type="checkbox" ${notifEstudianteSoloNoLeidas ? 'checked' : ''} onchange="window.toggleSoloNoLeidasEstudiante(this.checked)" class="w-4 h-4 rounded text-morado focus:ring-morado border-gray-300 cursor-pointer" />
              <span>Solo no leídas</span>
            </label>

            <button type="button" onclick="window.marcarTodasNotifEstudianteLeidas()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-ink transition cursor-pointer shadow-xs">
              <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span>Marcar todas como leídas</span>
            </button>
          </div>
        </div>

        <!-- Buscador Global en tiempo real -->
        <div class="relative">
          <input type="text" id="buscadorGlobalNotifEstudiante" value="${escapeHtml(notifEstudianteQueryGlobal)}" placeholder="Buscar en todas las notificaciones por título, contenido o palabra clave..." oninput="window.filtrarNotifsEstudianteGlobalLive(this.value)" class="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-ink focus:border-morado outline-none" />
          <svg class="w-3.5 h-3.5 text-slate2 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      <!-- Cuadrícula 2 Columnas Estudiante (Fiel a Imagen 2) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        <!-- Columna 1: Notificaciones de su Cohorte -->
        <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div class="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <h3 class="text-xs sm:text-sm font-extrabold text-ink">
              Notificaciones de ${escapeHtml(miCohorte)} <span class="text-morado">(${notifsCorte.length})</span>
            </h3>
            <div class="relative w-36 sm:w-44">
              <input type="text" id="buscadorNotifEstudianteCorte" value="${escapeHtml(notifEstudianteQueryCorte)}" placeholder="Buscar en cohorte..." oninput="filtrarNotifsEstudianteCorteLive(this.value)" class="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-ink outline-none focus:border-morado" />
              <svg class="w-3.5 h-3.5 text-slate2 absolute left-2 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <div class="space-y-3.5" id="feed-notifs-estudiante-corte">
            ${notifsCorte.map(n => renderCardEstudiante(n, 'corte')).join('') || '<p class="text-xs text-slate2 text-center py-6">No hay avisos recientes que coincidan con los filtros.</p>'}
            <div id="empty-notifs-estudiante-corte" class="hidden p-6 text-center text-xs text-slate2 bg-gray-50 rounded-2xl">No se encontraron avisos para tu búsqueda.</div>
          </div>
        </div>

        <!-- Columna 2: Mensajes Públicos y Fundación A+ -->
        <div class="admin-panel-card p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div class="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <h3 class="text-xs sm:text-sm font-extrabold text-ink">
              Mensajes Públicos y Fundación A+ <span class="text-turquesa">(${notifsPublicas.length})</span>
            </h3>
            <div class="relative w-36 sm:w-44">
              <input type="text" id="buscadorNotifEstudiantePublicas" value="${escapeHtml(notifEstudianteQueryPublicas)}" placeholder="Buscar en públicos..." oninput="filtrarNotifsEstudiantePublicasLive(this.value)" class="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-ink outline-none focus:border-turquesa" />
              <svg class="w-3.5 h-3.5 text-slate2 absolute left-2 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <div class="space-y-3.5" id="feed-notifs-estudiante-publicas">
            ${notifsPublicas.map(n => renderCardEstudiante(n, 'publicas')).join('') || '<p class="text-xs text-slate2 text-center py-6">No hay anuncios públicos que coincidan con los filtros.</p>'}
            <div id="empty-notifs-estudiante-publicas" class="hidden p-6 text-center text-xs text-slate2 bg-gray-50 rounded-2xl">No se encontraron anuncios para tu búsqueda.</div>
          </div>
        </div>

      </div>
    `;

    if (notifEstudianteQueryGlobal) window.filtrarNotifsEstudianteGlobalLive(notifEstudianteQueryGlobal);
    if (notifEstudianteQueryCorte) filtrarNotifsEstudianteCorteLive(notifEstudianteQueryCorte);
    if (notifEstudianteQueryPublicas) filtrarNotifsEstudiantePublicasLive(notifEstudianteQueryPublicas);

    // Actualizar badges
    const bEst = document.getElementById('notifBadgeEstudiante');
    if (bEst) {
      bEst.textContent = totalNoLeidas;
      bEst.classList.toggle('hidden', totalNoLeidas === 0);
    }
    const bHead = document.getElementById('notifBadgeHeader-estudiante');
    if (bHead) {
      bHead.textContent = totalNoLeidas;
      bHead.classList.toggle('hidden', totalNoLeidas === 0);
    }
  }

  window.verDetalleYMarcarLeida = function(id) {
    const est = getEstudiante() || {};
    const miId = est.id || est.email || 'estudiante';
    let leidas = getNotificacionesLeidasEstudiante(miId);
    if (!leidas.includes(id)) {
      leidas.push(id);
      setNotificacionesLeidasEstudiante(miId, leidas);
    }
    window.abrirModalDetalleComunicado(id);
    renderNotificacionesEstudiante();
  };

  window.toggleLeidaNotifEstudiante = function(id, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const est = getEstudiante() || {};
    const miId = est.id || est.email || 'estudiante';
    let leidas = getNotificacionesLeidasEstudiante(miId);
    const ya = leidas.includes(id);
    if (ya) {
      leidas = leidas.filter(x => x !== id);
      toast('Marcada como no leída', 'info');
    } else {
      leidas.push(id);
      toast('Marcada como leída', 'ok');
    }
    setNotificacionesLeidasEstudiante(miId, leidas);
    renderNotificacionesEstudiante();
  };

  window.cambiarFiltroCatNotifEstudiante = function(cat) {
    notifEstudianteCategoria = cat;
    renderNotificacionesEstudiante();
  };

  window.toggleSoloNoLeidasEstudiante = function(val) {
    notifEstudianteSoloNoLeidas = !!val;
    renderNotificacionesEstudiante();
  };

  window.marcarTodasNotifEstudianteLeidas = async function() {
    const est = getEstudiante() || {};
    const miId = est.id || est.email || 'estudiante';
    let comunicados = await Store.list('comunicados');
    if (!Array.isArray(comunicados)) comunicados = [];
    const allIds = comunicados.map(c => c.id);
    setNotificacionesLeidasEstudiante(miId, allIds);

    // Intentar sincronizar con backend controlador de notificaciones si está activo
    try {
      if (typeof window.apiFetch === 'function') {
        await window.apiFetch('notificaciones', {
          method: 'PATCH',
          body: JSON.stringify({ atendida: true, rol: 'Estudiante', estudiante_id: miId })
        }).catch(() => {});
      }
    } catch (e) {}

    toast('Todas las notificaciones marcadas como leídas', 'ok');
    renderNotificacionesEstudiante();
  };

  window.filtrarNotifsEstudianteGlobalLive = function(texto) {
    notifEstudianteQueryGlobal = texto;
    const q = (texto || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.card-notif-estudiante');
    let visiblesCorte = 0;
    let visiblesPublicas = 0;

    cards.forEach(card => {
      const s = card.getAttribute('data-search') || '';
      const match = !q || s.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) {
        if (card.classList.contains('card-notif-est-corte')) visiblesCorte++;
        if (card.classList.contains('card-notif-est-publicas')) visiblesPublicas++;
      }
    });

    const emptyC = document.getElementById('empty-notifs-estudiante-corte');
    if (emptyC) emptyC.classList.toggle('hidden', visiblesCorte > 0);
    const emptyP = document.getElementById('empty-notifs-estudiante-publicas');
    if (emptyP) emptyP.classList.toggle('hidden', visiblesPublicas > 0);
  };

  window.filtrarNotifsEstudianteCorteLive = function(texto) {
    notifEstudianteQueryCorte = texto;
    const q = (texto || '').toLowerCase().trim();
    const container = document.getElementById('feed-notifs-estudiante-corte');
    if (!container) return;
    const cards = container.querySelectorAll('.card-notif-est-corte');
    let visibles = 0;
    cards.forEach(card => {
      const s = card.getAttribute('data-search') || '';
      const match = !q || s.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visibles++;
    });
    const empty = document.getElementById('empty-notifs-estudiante-corte');
    if (empty) empty.classList.toggle('hidden', visibles > 0);
  };

  window.filtrarNotifsEstudiantePublicasLive = function(texto) {
    notifEstudianteQueryPublicas = texto;
    const q = (texto || '').toLowerCase().trim();
    const container = document.getElementById('feed-notifs-estudiante-publicas');
    if (!container) return;
    const cards = container.querySelectorAll('.card-notif-est-publicas');
    let visibles = 0;
    cards.forEach(card => {
      const s = card.getAttribute('data-search') || '';
      const match = !q || s.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visibles++;
    });
    const empty = document.getElementById('empty-notifs-estudiante-publicas');
    if (empty) empty.classList.toggle('hidden', visibles > 0);
  };

  // ----------------------------------------------------------------------------
  // Utilidades Compartidas y Marcado de Estado
  // ----------------------------------------------------------------------------
  window.marcarNotificacionAtendida = async function(id, marcarLeida) {
    let leidas = [];
    try {
      leidas = JSON.parse(localStorage.getItem('aplus_admin_notificaciones_leidas') || '[]');
      if (!Array.isArray(leidas)) leidas = [];
    } catch (e) { leidas = []; }

    const set = new Set(leidas);
    if (marcarLeida) {
      set.add(id);
      toast('Marcada como atendida', 'ok');
    } else {
      set.delete(id);
      toast('Reactivada', 'info');
    }
    localStorage.setItem('aplus_admin_notificaciones_leidas', JSON.stringify(Array.from(set)));

    // Si es un comunicado en MySQL / Store, persistirlo también
    try {
      let coms = await Store.list('comunicados');
      if (Array.isArray(coms)) {
        const item = coms.find(c => c.id === id);
        if (item) {
          item.atendida = marcarLeida;
          await Store.set('comunicados', coms);
        }
      }
    } catch (e) {}

    renderNotificacionesAdmin();
  };

  window.marcarTodasNotificacionesAtendidas = async function() {
    const { notificaciones } = await obtenerNotificacionesAdmin();
    let leidas = [];
    try {
      leidas = JSON.parse(localStorage.getItem('aplus_admin_notificaciones_leidas') || '[]');
      if (!Array.isArray(leidas)) leidas = [];
    } catch (e) { leidas = []; }

    const set = new Set(leidas);
    notificaciones.forEach(n => set.add(n.id));
    localStorage.setItem('aplus_admin_notificaciones_leidas', JSON.stringify(Array.from(set)));

    try {
      let coms = await Store.list('comunicados');
      if (Array.isArray(coms)) {
        coms.forEach(c => c.atendida = true);
        await Store.set('comunicados', coms);
      }
    } catch (e) {}

    toast('Todas las comunicaciones han sido marcadas como atendidas', 'ok');
    renderNotificacionesAdmin();
  };

  window.irASemaforoEstudiante = function(estudiante, cohorte) {
    if (cohorte && typeof semaforoCohorteFiltro !== 'undefined') {
      semaforoCohorteFiltro = cohorte;
    }
    showPanel('semaforo').then(() => {
      setTimeout(() => {
        const input = document.querySelector('[data-table="table-semaforo"]');
        if (input) {
          input.value = estudiante;
          if (typeof TableManager !== 'undefined' && TableManager.filter) {
            TableManager.filter('table-semaforo', estudiante);
          }
        }
      }, 180);
    });
  };

  window.irAMemorandosEstudiante = function(estudiante) {
    showPanel('memorandos').then(() => {
      setTimeout(() => {
        const input = document.querySelector('[data-table="table-memorandos"]');
        if (input) {
          input.value = estudiante;
          if (typeof TableManager !== 'undefined' && TableManager.filter) {
            TableManager.filter('table-memorandos', estudiante);
          }
        }
      }, 180);
    });
  };

  // Exportar funciones principales al entorno global
  window.renderNotificacionesAdmin = renderNotificacionesAdmin;
  window.renderNotificacionesDocente = renderNotificacionesDocente;
  window.renderNotificacionesEstudiante = renderNotificacionesEstudiante;
  window.obtenerNotificacionesAdmin = obtenerNotificacionesAdmin;

  // Registrar directamente en los diccionarios de renderizadores
  if (typeof window !== 'undefined') {
    if (!window.RENDERERS) window.RENDERERS = {};
    window.RENDERERS['notificaciones'] = renderNotificacionesAdmin;

    if (!window.RENDERERS_DOCENTE) window.RENDERERS_DOCENTE = {};
    window.RENDERERS_DOCENTE['notificaciones'] = renderNotificacionesDocente;

    if (!window.RENDERERS_ESTUDIANTE) window.RENDERERS_ESTUDIANTE = {};
    window.RENDERERS_ESTUDIANTE['notificaciones'] = renderNotificacionesEstudiante;
  }

})();
