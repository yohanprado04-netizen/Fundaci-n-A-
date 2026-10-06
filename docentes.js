/**
 * docentes.js — Módulo de Gestión Docente, Calificaciones e Informes Pedagógicos
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Perfil docente (avatar, biografía, especialidad y sincronización de datos)
 * 2. Resumen y Horario de clases por cohorte y franja horaria
 * 3. Semáforo y diagnóstico de riesgo académico de cohorte
 * 4. Sistema de Calificaciones por módulo, criterios ponderados y escala oficial (A-F)
 * 5. Informes pedagógicos y de rendimiento mensual (borrador, autoguardado y radicación)
 * 6. Visualización y descarga de Pensum académico institucional
 * 7. Agenda docente de eventos y radicación de solicitudes/PQR
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  let currentDocente = null;
  const getDocente = () => {
    if (typeof window !== 'undefined') {
      if (typeof window.getCurrentDocente === 'function') {
        const d = window.getCurrentDocente();
        if (d && d.nombre) return d;
      }
      if (window.currentDocente && window.currentDocente.nombre) return window.currentDocente;
    }
    return currentDocente || {};
  };
  const setDocente = (d) => {
    currentDocente = d;
    if (typeof window !== 'undefined') {
      window.currentDocente = d;
      if (typeof window.setCurrentDocente === 'function') window.setCurrentDocente(d);
    }
  };
  if (typeof window !== 'undefined') {
    const prevSetCurrentDocente = window.setCurrentDocente;
    window.setCurrentDocente = (d) => {
      currentDocente = d;
      if (typeof prevSetCurrentDocente === 'function') prevSetCurrentDocente(d);
    };
  }

  const coincideDocenteConNombre = (cand, nombreDoc) => {
    if (!cand || !nombreDoc) return false;
    const c = String(cand).trim().toLowerCase();
    const n = String(nombreDoc).trim().toLowerCase();
    if (c === n || c.includes(n) || n.includes(c)) return true;
    const partesC = c.split(/\s+/).filter(Boolean);
    const partesN = n.split(/\s+/).filter(Boolean);
    return partesN.some(p => partesC.includes(p));
  };
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : 'superadmin');
  const getAdminUser = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : null);

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

  const nombrePersonaClicable = (nombre, rol) => {
    if (typeof window !== 'undefined' && typeof window.nombrePersonaClicable === 'function') {
      return window.nombrePersonaClicable(nombre, rol);
    }
    if (!nombre) return '—';
    return `<button type="button" onclick="window.abrirPerfilPersonaPorNombreYRol ? window.abrirPerfilPersonaPorNombreYRol('${escapeHtml(nombre).replace(/'/g, "\\'")}', '${rol}') : null" class="hover:underline hover:text-morado transition text-left">${escapeHtml(nombre)}</button>`;
  };

  const TableManager = (typeof window !== 'undefined' && window.TableManager) ? window.TableManager : {
    init: () => {},
    filter: () => {}
  };

  const docentesDeCohorte = async (...args) => (typeof window !== 'undefined' && window.docentesDeCohorte ? await window.docentesDeCohorte(...args) : []);
  const cursoDeDocenteEnCohorte = async (...args) => (typeof window !== 'undefined' && window.cursoDeDocenteEnCohorte ? await window.cursoDeDocenteEnCohorte(...args) : 'Curso asignado');
  const mesLabel = (m) => (typeof window !== 'undefined' && typeof window.mesLabel === 'function' ? window.mesLabel(m) : m);
  const generarOpcionesMes = (...args) => (typeof window !== 'undefined' && typeof window.generarOpcionesMes === 'function' ? window.generarOpcionesMes(...args) : '');
  const getSlotsDocente = async (...args) => (typeof window !== 'undefined' && typeof window.getSlotsDocente === 'function' ? await window.getSlotsDocente(...args) : []);
  const computeSemaforo = async (...args) => (typeof window !== 'undefined' && typeof window.computeSemaforo === 'function' ? await window.computeSemaforo(...args) : []);
  const actualizarHeaderUsuario = (...args) => (typeof window !== 'undefined' && typeof window.actualizarHeaderUsuario === 'function' ? window.actualizarHeaderUsuario(...args) : null);
  const obtenerTiempoRestanteEdicionInforme = (...args) => (typeof window !== 'undefined' && typeof window.obtenerTiempoRestanteEdicionInforme === 'function' ? window.obtenerTiempoRestanteEdicionInforme(...args) : { horas: 0, minutos: 0, segundos: 0 });
  const reabrirInformeDocente = async (...args) => (typeof window !== 'undefined' && typeof window.reabrirInformeDocente === 'function' ? await window.reabrirInformeDocente(...args) : null);
  const abrirModalDetalleInforme = async (...args) => (typeof window !== 'undefined' && typeof window.abrirModalDetalleInforme === 'function' ? await window.abrirModalDetalleInforme(...args) : null);
  const subirPqrArchivo = async (...args) => (typeof window !== 'undefined' && typeof window.subirPqrArchivo === 'function' ? await window.subirPqrArchivo(...args) : false);
  const filaPqrPropia = (...args) => (typeof window !== 'undefined' && typeof window.filaPqrPropia === 'function' ? window.filaPqrPropia(...args) : '');

  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  const habilitarEnterEnFormulario = (...args) => (typeof window !== 'undefined' && typeof window.habilitarEnterEnFormulario === 'function' ? window.habilitarEnterEnFormulario(...args) : null);
  const badgeCamisaDia = (...args) => (typeof window !== 'undefined' && typeof window.badgeCamisaDia === 'function' ? window.badgeCamisaDia(...args) : '');
  const parsearHabilidades = (val) => (typeof window !== 'undefined' && typeof window.parsearHabilidades === 'function')
    ? window.parsearHabilidades(val)
    : (Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []));
  const getInfoCamisaDia = (dia, cohorte) => (typeof window !== 'undefined' && typeof window.getInfoCamisaDia === 'function' ? window.getInfoCamisaDia(dia, cohorte) : null);

  const Store = {
    get: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[docentes] window.Store no disponible'); return s.get(col, opts); },
    list: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[docentes] window.Store no disponible'); return s.list(col, opts); },
    save: (col, item) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[docentes] window.Store no disponible'); return s.save(col, item); },
    set: (col, items) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[docentes] window.Store no disponible'); return s.set(col, items); },
    invalidate: (col) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) return; return s.invalidate(col); },
    actualizarPerfilPropio: (cambios) => { const s = (typeof window !== 'undefined' && window.Store) || null; return s ? s.actualizarPerfilPropio(cambios) : null; }
  };

  const fetchApi = async (endpoint, opts) => {
    if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') return await window.apiFetch(endpoint, opts);
    throw new Error('apiFetch no disponible');
  };
  const apiFetch = fetchApi;

  /**
   * Panel Docente — módulos funcionales.
   */

  // Cohortes/módulos que dicta el docente que inició sesión.
  // Se calcula a partir del Horario real (docentesDeCohorte), que es la
  // única fuente de verdad de qué docente dicta qué cohorte — el campo
  // "docente" que traía la cohorte ya no se usa para esto.
  // async: 'modulos' vía MySQL.
  async function docenteModulosActivos() {
    const doc = getDocente();
    if (!doc || !doc.nombre) return [];
    const modulos = await Store.list('modulos');
    const pertenece = await Promise.all(modulos.map(async m => {
      const docs = await docentesDeCohorte(m.nombre);
      if (docs.some(d => coincideDocenteConNombre(d, doc.nombre))) return true;
      if (coincideDocenteConNombre(m.docente, doc.nombre)) return true;
      return false;
    }));

    let pensumCohortes = [];
    try {
      const pensumList = await Store.list('pensum');
      pensumCohortes = pensumList.filter(p => coincideDocenteConNombre(p.docente, doc.nombre)).map(p => p.cohorte || p.modulo);
    } catch (e) {}

    const resultado = modulos.filter((m, i) => pertenece[i] || pensumCohortes.includes(m.nombre) || (doc.cohorte && doc.cohorte === m.nombre));
    if (resultado.length === 0 && modulos.length > 0 && doc.cohorte) {
      const encontrada = modulos.filter(m => m.nombre === doc.cohorte);
      if (encontrada.length) return encontrada;
    }
    return resultado;
  }
  async function docenteEstudiantesDeCohorte(cohorteNombre) {
    const cNorm = String(cohorteNombre || '').trim().toLowerCase();
    return (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && String(u.cohorte || '').trim().toLowerCase() === cNorm);
  }
  if (typeof window !== 'undefined') {
    window.docenteModulosActivos = docenteModulosActivos;
    window.docenteEstudiantesDeCohorte = docenteEstudiantesDeCohorte;
  }

  // ---------- VISOR DE FOTOS DE PERFIL (LIGHTBOX) ----------
  function expandirFotoPerfil(url, nombre = 'Foto de perfil', rol = '') {
    if (!url) return;
    const modal = document.getElementById('lightboxFotoModal');
    const img = document.getElementById('lightboxFotoImg');
    const nombreEl = document.getElementById('lightboxFotoNombre');
    const rolEl = document.getElementById('lightboxFotoRol');
    const downloadBtn = document.getElementById('lightboxFotoDownload');
    if (!modal || !img) return;

    img.src = url;
    if (nombreEl) nombreEl.textContent = nombre || 'Foto de perfil';
    if (rolEl) rolEl.textContent = rol ? `Fundación A+ · ${rol}` : 'Fundación A+';
    if (downloadBtn) {
      downloadBtn.href = url;
      const safeName = (nombre || 'perfil').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      downloadBtn.download = `foto_${safeName}.jpg`;
    }
    modal.classList.remove('hidden');
  }
  window.expandirFotoPerfil = expandirFotoPerfil;

  function cerrarLightboxFoto() {
    const modal = document.getElementById('lightboxFotoModal');
    if (modal) modal.classList.add('hidden');
    const img = document.getElementById('lightboxFotoImg');
    if (img) img.src = '';
  }
  window.cerrarLightboxFoto = cerrarLightboxFoto;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      cerrarLightboxFoto();
    }
  });

  // ---------- RENDER: Resumen (docente) ----------
  // ---------- PERFIL (docente) ----------
  // Foto de perfil y descripción breve, ambas opcionales. Ambas viven en
  // Store('usuarios') (MySQL, columnas foto_url/descripcion) — la foto se
  // guarda como data URL (base64) directamente en esa columna.
  function renderPerfilDocente() {
    const doc = getDocente();
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Docente')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-turquesa/40 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    document.getElementById('mount-t-perfil').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 max-w-2xl">
        <div class="flex items-center gap-5 mb-6">
          ${avatarHtml}
          <div>
            <p class="text-base font-extrabold text-ink">${escapeHtml(doc.nombre || '')}</p>
            <p class="text-sm text-slate2">${escapeHtml(doc.email || '')}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <label class="text-xs font-semibold text-morado hover:underline cursor-pointer">
                Cambiar foto
                <input id="perfil_foto_input" type="file" accept="image/*" class="hidden" onchange="subirFotoPerfilDocente(this)" />
              </label>
              ${doc.fotoUrl ? `<button onclick="quitarFotoPerfilDocente()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-1">Foto opcional · JPG o PNG, máx. 2 MB</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre completo</label>
            <input id="perfil_nombre" type="text" value="${escapeHtml(doc.nombre || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo electrónico</label>
            <input type="email" value="${escapeHtml(doc.email || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Documento de identidad</label>
            <input id="perfil_documento" type="text" value="${escapeHtml(doc.documento || '')}" placeholder="Ej. CC 1023456789" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Número de teléfono / WhatsApp</label>
            <input id="perfil_telefono" type="tel" value="${escapeHtml(doc.telefono || '')}" placeholder="Ej. 300 123 4567" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Descripción breve</label>
          <textarea id="perfil_descripcion" rows="3" maxlength="280" placeholder="Ej: Docente de Desarrollo Web, apasionado por enseñar buenas prácticas de programación (opcional)" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30 resize-none">${escapeHtml(doc.descripcion || '')}</textarea>
          <p class="text-[11px] text-slate2 mt-1">Opcional · máx. 280 caracteres</p>
        </div>

        <!-- Habilidades y Especialidades del Docente -->
        <div class="mb-6 p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-turquesa/5 to-transparent border border-purple-200/60">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-purple-900">Especialidades y Habilidades</label>
              <p class="text-[11px] text-slate2">Registra tus tecnologías, áreas de conocimiento y especialidades docentes.</p>
            </div>
          </div>
          <div id="perfil_docente_habilidades_chips" class="flex flex-wrap gap-1.5 mb-3 min-h-[38px] p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs"></div>
          <div class="flex gap-2 mb-2.5">
            <input id="perfil_docente_nueva_habilidad" type="text" maxlength="40" placeholder="Escribe una especialidad (ej. React, Python, Inteligencia Artificial...) y presiona Enter" class="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" onkeydown="if(event.key==='Enter'){event.preventDefault(); window.__agregarHabilidadDocente();}" />
            <button type="button" onclick="window.__agregarHabilidadDocente()" class="px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 transition shadow-sm cursor-pointer shrink-0">+ Añadir</button>
          </div>
          <div class="pt-2 border-t border-purple-100 flex flex-wrap gap-1.5 items-center">
            <span class="text-[10px] font-bold text-slate2 uppercase tracking-wider mr-1">Sugerencias:</span>
            ${['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Bases de Datos', 'Inteligencia Artificial', 'Figma', 'Git', 'Metodologías Ágiles', 'Seguridad Web'].map(s => `<button type="button" onclick="window.__agregarHabilidadDocente('${escapeHtml(s)}')" class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-slate-700 hover:border-purple-600 hover:text-purple-700 transition cursor-pointer shadow-2xs">+ ${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>

        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="text" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
            <input id="perfil_pass2" type="text" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
        </div>
        <button onclick="guardarPerfilDocente()" class="mt-6 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Guardar cambios</button>
      </div>`;

    window.__habilidadesDocenteActual = parsearHabilidades(doc.habilidades);
    window.__refrescarChipsDocente = () => {
      const cont = document.getElementById('perfil_docente_habilidades_chips');
      if (!cont) return;
      cont.innerHTML = window.__habilidadesDocenteActual.length
        ? window.__habilidadesDocenteActual.map((h, idx) => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              <span>${escapeHtml(h)}</span>
              <button type="button" onclick="window.__removerHabilidadDocente(${idx})" class="w-3.5 h-3.5 rounded-full hover:bg-purple-200 text-purple-800 inline-flex items-center justify-center cursor-pointer font-bold leading-none">&times;</button>
            </span>`).join('')
        : '<span class="text-xs text-slate2 italic">Sin especialidades registradas aún. Añade tus habilidades técnicas arriba.</span>';
    };
    window.__removerHabilidadDocente = (idx) => {
      window.__habilidadesDocenteActual.splice(idx, 1);
      window.__refrescarChipsDocente();
    };
    window.__agregarHabilidadDocente = (texto) => {
      const input = document.getElementById('perfil_docente_nueva_habilidad');
      const val = (texto || (input ? input.value : '')).trim();
      if (!val) return;
      const partes = val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      partes.forEach(p => {
        if (!window.__habilidadesDocenteActual.some(h => h.toLowerCase() === p.toLowerCase())) {
          window.__habilidadesDocenteActual.push(p);
        }
      });
      window.__refrescarChipsDocente();
      if (input) input.value = '';
    };
    setTimeout(window.__refrescarChipsDocente, 0);
    habilitarEnterEnFormulario('mount-t-perfil', null, false);
  }

  // async: 'usuarios' vía MySQL.
  async function actualizarUsuarioDocenteActual(cambios) {
    const doc = getDocente();
    const usuarios = (await Store.list('usuarios')).map(u => u.id === doc.id ? { ...u, ...cambios } : u);
    await Store.set('usuarios', usuarios);
    setDocente({ ...doc, ...cambios });
  }

  // CORREGIDO (2): subir/quitar foto llamaba a renderPerfilDocente() al
  // terminar, que reconstruye TODO el formulario con innerHTML —
  // incluido el <textarea id="perfil_descripcion">, que se repone con
  // doc.descripcion (el valor guardado, no lo que el usuario tuviera
  // escrito sin guardar todavía). Si escribías la descripción y LUEGO
  // subías la foto, el texto se perdía antes de que pudieras darle a
  // "Guardar cambios" — parecía que la descripción "no se guardaba"
  // cuando en realidad se borraba sola de la pantalla. Ahora solo se
  // actualiza la imagen del avatar y el botón "Quitar foto" en el DOM,
  // sin tocar el resto del formulario.
  function actualizarAvatarDocenteEnDom(fotoUrl) {
    const cont = document.getElementById('mount-t-perfil');
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
        const doc = getDocente();
        const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
        const div = document.createElement('div');
        div.className = 'w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0';
        div.style = 'background:linear-gradient(135deg,#1FC8C0,#8B5CF6)';
        div.textContent = iniciales;
        avatarActual.replaceWith(div);
      }
    }
    const btnQuitar = cont.querySelector('button[onclick="quitarFotoPerfilDocente()"]');
    if (fotoUrl && !btnQuitar) {
      const label = cont.querySelector('label.cursor-pointer');
      if (label) label.insertAdjacentHTML('afterend', ' <button onclick="quitarFotoPerfilDocente()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>');
    } else if (!fotoUrl && btnQuitar) {
      btnQuitar.remove();
    }
  }

  function subirFotoPerfilDocente(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const resultado = await Store.actualizarPerfilPropio({ fotoUrl: reader.result });
      const doc = getDocente();
      setDocente({ ...doc, fotoUrl: reader.result });
      toast(resultado.remoto ? 'Foto de perfil actualizada' : 'Foto guardada solo en este navegador (sin conexión con el servidor)', resultado.remoto ? 'ok' : 'err');
      actualizarAvatarDocenteEnDom(reader.result);
      actualizarHeaderUsuario('docente');
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  async function quitarFotoPerfilDocente() {
    const resultado = await Store.actualizarPerfilPropio({ fotoUrl: '' });
    const doc = getDocente();
    setDocente({ ...doc, fotoUrl: '' });
    toast(resultado.remoto ? 'Foto de perfil eliminada' : 'No se pudo eliminar la foto en el servidor', resultado.remoto ? 'ok' : 'err');
    actualizarAvatarDocenteEnDom('');
    actualizarHeaderUsuario('docente');
  }

  // async: actualizarUsuarioDocenteActual ahora es async.
  async function guardarPerfilDocente() {
    const inputNuevaHab = document.getElementById('perfil_docente_nueva_habilidad');
    if (inputNuevaHab && inputNuevaHab.value.trim()) {
      const partes = inputNuevaHab.value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      if (!Array.isArray(window.__habilidadesDocenteActual)) window.__habilidadesDocenteActual = [];
      partes.forEach(p => {
        if (!window.__habilidadesDocenteActual.some(h => h.toLowerCase() === p.toLowerCase())) {
          window.__habilidadesDocenteActual.push(p);
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
    cambios.descripcion = descripcion; // opcional: puede quedar vacía
    cambios.habilidades = window.__habilidadesDocenteActual || [];
    if (p1) cambios.password = p1;

    const resultado = await Store.actualizarPerfilPropio(cambios);
    if (typeof Store.clearCache === 'function') Store.clearCache('usuarios');
    const doc = getDocente();
    const docActualizado = { ...doc, ...cambios };
    delete docActualizado.password; // no guardar el texto plano en memoria
    setDocente(docActualizado);
    toast(resultado.remoto ? 'Perfil actualizado correctamente' : 'No se pudo guardar en el servidor, intenta de nuevo', resultado.remoto ? 'ok' : 'err');
    renderPerfilDocente();
    actualizarHeaderUsuario('docente');
  }

  // async: Store.list() vía MySQL.
  async function renderResumenDocente() {
    const doc = getDocente() || {};
    if (!doc.nombre) {
      const mount = document.getElementById('mount-t-resumen');
      if (mount) {
        mount.innerHTML = `<div class="admin-panel-card p-10 text-center">
          <p class="font-bold text-ink mb-1.5">No hay sesión de docente activa</p>
          <p class="text-sm text-slate2">Para visualizar el resumen de tus cohortes y estudiantes, inicia sesión con una cuenta de docente.</p>
        </div>`;
      }
      return;
    }
    const [modulos, usuariosList, pensumList] = await Promise.all([
      docenteModulosActivos(),
      Store.list('usuarios'),
      Store.list('pensum')
    ]);
    const pensumItems = pensumList.filter(p => p.docente === doc.nombre);
    const inscritosPorModulo = modulos.map(m => usuariosList.filter(u => u.rol === 'Estudiante' && u.cohorte === m.nombre).length);
    const totalEstudiantes = inscritosPorModulo.reduce((a, b) => a + b, 0);
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;

    // Riesgo real de los estudiantes en sus cohortes (misma fuente que
    // renderRiesgoDocente), para el anillo de "en buen camino".
    const cohortesNombres = modulos.map(m => m.nombre);
    const semaforoDocente = (await computeSemaforo()).filter(s => cohortesNombres.includes(s.cohorte));
    const enRiesgo = semaforoDocente.filter(s => s.riesgo === 'Rojo').length;
    const pctBienEncaminados = semaforoDocente.length ? Math.round(((semaforoDocente.length - enRiesgo) / semaforoDocente.length) * 100) : 100;

    const modulosRows = modulos.map((m, i) => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(m.modulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(m.nombre)} · ${inscritosPorModulo[i]}/${m.cupos} estudiantes</p>
        </div>
        ${statusPill(m.estado, ESTADO_COLORS)}
      </div>`).join('');

    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Docente')" class="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white/30 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-white/50" title="Clic para ampliar foto" />`
      : `<div class="w-14 h-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0 bg-white/15 border-2 border-white/30">${iniciales}</div>`;

    document.getElementById('mount-t-resumen').innerHTML = `
      <div class="dash-hero p-6 sm:p-8 mb-6" style="--hero-gradient:linear-gradient(120deg,#0D9488 0%,#1FC8C0 55%,#0EA5A0 100%)">
        <div class="flex items-center gap-4">
          ${avatarHtml}
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Panel docente</p>
            <h2 class="font-display text-xl sm:text-2xl font-bold text-white truncate">${escapeHtml(doc.nombre || 'Docente')}</h2>
            <p class="text-sm text-white/80 truncate">${escapeHtml(doc.email || '')}</p>
          </div>
        </div>
        ${doc.descripcion ? `<p class="text-sm text-white/85 mt-4 italic border-t border-white/15 pt-4">"${escapeHtml(doc.descripcion)}"</p>` : ''}
      </div>

      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="dash-stat-card" style="--brand:#1FC8C0">
          <div class="dash-stat-icon mb-4" style="background:#1FC8C014;color:#1FC8C0"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25v13.5M4.75 8.5L12 6.25l7.25 2.25v9L12 19.75l-7.25-2.25v-9z"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Módulos asignados</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${modulos.length}</p>
          <p class="text-xs text-slate2 mt-2">${enCurso} en curso</p>
        </div>
        <div class="dash-stat-card" style="--brand:#8B5CF6">
          <div class="dash-stat-icon mb-4" style="background:#8B5CF614;color:#8B5CF6"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Estudiantes a cargo</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${totalEstudiantes}</p>
          <p class="text-xs text-slate2 mt-2">En tus cohortes activas</p>
        </div>
        <div class="dash-stat-card flex items-center gap-4" style="--brand:#F5A623">
          <div class="relative shrink-0">
            ${anilloProgreso(pctBienEncaminados, enRiesgo > 0 ? '#F5A623' : '#1FC8C0', 64, 6)}
            <div class="absolute inset-0 grid place-items-center">
              <span class="font-display text-sm font-bold text-ink">${pctBienEncaminados}%</span>
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">En buen camino</p>
            <p class="text-xs text-slate2 mt-1">${enRiesgo > 0 ? enRiesgo + ' en riesgo crítico' : 'Nadie en riesgo'}</p>
          </div>
        </div>
      </div>

      <div class="admin-panel-card p-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Tus módulos y cohortes</p>
          <p class="text-xs text-slate2">${pensumItems.length} tema${pensumItems.length === 1 ? '' : 's'} de pensum a tu cargo</p>
        </div>
        ${modulosRows || '<p class="text-sm text-slate2 text-center py-6">Aún no tienes módulos asignados. El administrador puede asignarlos desde el panel.</p>'}
      </div>`;
  }

  // ---------- RENDER: Mi horario (docente) ----------
  let docenteHorarioVista = 'agenda'; // 'agenda' | 'tabla'
  function setDocenteHorarioVista(v) {
    docenteHorarioVista = v;
    renderHorarioDocente();
  }
  window.setDocenteHorarioVista = setDocenteHorarioVista;

  // async: getSlotsDocente() ahora es async.
  async function renderHorarioDocente() {
    const doc = getDocente();
    const slots = await getSlotsDocente(doc.nombre);
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);

    const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoyFecha = new Date();
    const diaHoy = diasSemanaNombres[hoyFecha.getDay()];
    const mesActual = hoyFecha.getFullYear() + '-' + String(hoyFecha.getMonth() + 1).padStart(2, '0');

    // Clases programadas específicamente para el día de hoy
    const slotsHoy = slots.filter(s => s.dia === diaHoy);
    const cohorteRef = slotsHoy.length > 0 ? slotsHoy[0].cohorte : (slots.length > 0 ? slots[0].cohorte : null);
    const infoCamisaHoy = getInfoCamisaDia(diaHoy, cohorteRef);
    const badgeHoy = badgeCamisaDia(diaHoy, cohorteRef);
    const cohortesUnicas = [...new Set(slots.map(s => s.cohorte))];

    // Banner: Tu jornada de hoy y código de vestimenta
    let hoyBannerHtml = '';
    if (diaHoy === 'Domingo') {
      hoyBannerHtml = `
        <div class="rounded-3xl border border-gray-200/80 bg-gradient-to-r from-slate-50 to-white p-5 shadow-soft mb-6">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gray-100 text-slate2 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate2">Jornada de descanso</p>
                <h3 class="text-base font-extrabold text-ink">Hoy es Domingo</h3>
              </div>
            </div>
            <span class="text-xs font-medium text-slate2">No hay sesiones académicas regulares programadas hoy.</span>
          </div>
        </div>`;
    } else {
      const clasesHoyCards = slotsHoy.length > 0 ? slotsHoy.map(s => {
        const info = getInfoCamisaDia(s.dia, s.cohorte);
        return `
          <div class="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${info.franjaBorder};">
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-turquesa/10 text-turquesa border border-turquesa/20">${escapeHtml(s.cohorte)}</span>
              <span class="text-[11px] font-bold text-slate2">${s.horas} h</span>
            </div>
            <p class="text-xs font-bold text-ink truncate" title="${escapeHtml(s.materia)}">${escapeHtml(s.materia)}</p>
            <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-2 font-medium">
              <svg class="w-3.5 h-3.5 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${s.inicio} – ${s.fin}</span>
            </div>
          </div>`;
      }).join('') : `
        <div class="col-span-full p-4 rounded-2xl bg-white/80 border border-dashed border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate2">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>Hoy no tienes clases programadas en tu horario.</span>
          </div>
          <span class="text-[11px] text-slate2">Si visitas la sede, el código de hoy es <strong class="text-ink">Camisa ${escapeHtml(infoCamisaHoy.nombre)}</strong>.</span>
        </div>`;

      hoyBannerHtml = `
        <div class="rounded-3xl border border-turquesa/25 p-5 sm:p-6 shadow-soft mb-6 transition" style="background: linear-gradient(135deg, ${infoCamisaHoy.franjaBg}, #ffffff 80%);">
          <div class="flex items-center justify-between gap-3 flex-wrap pb-3 mb-3 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-turquesa/10 text-turquesa flex items-center justify-center shrink-0 border border-turquesa/20">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-extrabold text-ink">Tu jornada de hoy · ${diaHoy}</h3>
                  <span class="w-2 h-2 rounded-full bg-turquesa animate-pulse"></span>
                </div>
                <p class="text-xs text-slate2 mt-0.5">${slotsHoy.length} sesión${slotsHoy.length === 1 ? '' : 'es'} asignada${slotsHoy.length === 1 ? '' : 's'} para hoy</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-semibold text-slate2 hidden sm:inline">Código de vestimenta:</span>
              ${badgeHoy}
            </div>
          </div>
          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${clasesHoyCards}
          </div>
        </div>`;
    }

    // Agrupar por Cohorte + Mes
    const grupos = {};
    slots.forEach(s => {
      const k = s.cohorte + '|' + s.mes;
      (grupos[k] = grupos[k] || { cohorte: s.cohorte, mes: s.mes, items: [] }).items.push(s);
    });

    const gruposHtml = Object.keys(grupos).length ? Object.keys(grupos).map(k => {
      const g = grupos[k];
      const horasGrupo = g.items.reduce((acc, it) => acc + it.horas, 0);

      // Render según vista activa
      let cuerpoHtml = '';
      if (docenteHorarioVista === 'agenda') {
        const columnasDias = DIAS_HORARIO.map(dia => {
          const infoCamisa = getInfoCamisaDia(dia, g.cohorte);
          const slotsDia = g.items.filter(s => s.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
          const tarjetas = slotsDia.map(s => `
            <div class="p-3 mb-2 rounded-xl bg-white border border-gray-100 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${infoCamisa.franjaBorder};">
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-xs font-bold text-ink leading-snug line-clamp-2">${escapeHtml(s.materia)}</span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-slate2">${s.horas}h</span>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-1.5 font-medium">
                <svg class="w-3 h-3 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${s.inicio}–${s.fin}</span>
              </div>
            </div>`).join('');

          return `
            <div class="rounded-2xl p-3 border border-gray-200/70 shadow-2xs flex flex-col" style="background:${infoCamisa.franjaBg};">
              <div class="flex flex-col gap-1.5 mb-2.5 pb-2 border-b border-gray-200/60">
                <div class="flex items-center justify-between gap-1">
                  <p class="text-xs font-extrabold uppercase tracking-wider text-ink">${dia}</p>
                  <span class="text-[10px] font-bold text-slate2 bg-white/85 px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">${slotsDia.length} sesión${slotsDia.length === 1 ? '' : 'es'}</span>
                </div>
                <div class="w-full flex">
                  ${badgeCamisaDia(dia, g.cohorte)}
                </div>
              </div>
              <div class="flex-1">
                ${tarjetas || '<div class="p-3 text-center rounded-xl bg-white/70 border border-dashed border-gray-200 text-[11px] text-slate2/70 italic">Sin clases</div>'}
              </div>
            </div>`;
        }).join('');

        cuerpoHtml = `
          <div class="p-4 sm:p-6 overflow-x-auto">
            <div class="grid gap-3 min-w-[780px]" style="grid-template-columns:repeat(6, minmax(160px, 1fr))">
              ${columnasDias}
            </div>
          </div>`;
      } else {
        // Vista Tabla Detallada
        cuerpoHtml = `
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100 bg-gray-50/50">
                <th class="py-3 px-6">Día</th>
                <th class="py-3 px-4">Código de vestimenta</th>
                <th class="py-3 px-4">Horario</th>
                <th class="py-3 px-4">Materia</th>
                <th class="py-3 px-4 text-right">Horas</th>
              </tr></thead>
              <tbody>${g.items.map(s => {
                const infoCamisa = getInfoCamisaDia(s.dia, g.cohorte);
                const esHoy = s.dia === diaHoy;
                return `
                  <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition ${esHoy ? 'bg-turquesa/5 font-medium' : ''}">
                    <td class="py-3 px-6 text-sm font-semibold text-ink flex items-center gap-2">
                      ${esHoy ? '<span class="w-2 h-2 rounded-full bg-turquesa animate-pulse"></span>' : ''}
                      ${escapeHtml(s.dia)}
                    </td>
                    <td class="py-3 px-4">${badgeCamisaDia(s.dia, g.cohorte)}</td>
                    <td class="py-3 px-4 text-sm text-slate2 whitespace-nowrap font-medium">${s.inicio} – ${s.fin}</td>
                    <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(s.materia)}</td>
                    <td class="py-3 px-4 text-sm text-slate2 text-right">${s.horas} h</td>
                  </tr>`;
              }).join('')}
              </tbody>
            </table>
          </div>`;
      }

      return `
        <div class="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden mb-6">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-gray-50/40">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-turquesa"></span>
                <h4 class="text-sm font-extrabold text-ink">${escapeHtml(g.cohorte)}</h4>
              </div>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(mesLabel(g.mes))} · ${horasGrupo} horas programadas</p>
            </div>
            <button onclick="abrirModalColoresCamisa('${escapeHtml(g.cohorte)}')" title="Ver o ajustar colores de camisa para esta cohorte" class="rounded-full border border-morado/20 bg-morado/5 hover:bg-morado/15 text-morado text-xs font-bold px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5l2.5 2.5h2.5l2.5 4.5-2.5 2-1-1v8h-8v-8l-1 1-2.5-2 2.5-4.5h2.5L12 4.5z" />
              </svg>
              <span>Código de vestimenta</span>
            </button>
          </div>
          ${cuerpoHtml}
        </div>`;
    }).join('') : `
      <div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-10 text-center">
        <div class="w-12 h-12 rounded-2xl bg-turquesa/10 text-turquesa flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-base font-extrabold text-ink">Sin horarios asignados</h3>
        <p class="text-xs text-slate2 mt-1 max-w-md mx-auto">Aún no apareces en ningún horario. El administrador te asignará materias y horas desde el panel de Horario.</p>
      </div>`;

    document.getElementById('mount-t-modulos').innerHTML = `
      ${hoyBannerHtml}
      ${slots.length ? `
        <div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-6 flex-wrap">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Carga Semanal</p>
              <p class="text-2xl font-extrabold text-ink">${totalHoras} <span class="text-sm font-semibold text-slate2">horas</span></p>
            </div>
            <div class="h-8 w-px bg-gray-100 hidden sm:block"></div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Cohortes</p>
              <p class="text-xl font-bold text-ink">${cohortesUnicas.length}</p>
            </div>
            <div class="h-8 w-px bg-gray-100 hidden sm:block"></div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Sesiones</p>
              <p class="text-xl font-bold text-ink">${slots.length}</p>
            </div>
          </div>
          <div class="flex items-center bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
            <button onclick="setDocenteHorarioVista('agenda')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${docenteHorarioVista === 'agenda' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
              <span>Agenda semanal</span>
            </button>
            <button onclick="setDocenteHorarioVista('tabla')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${docenteHorarioVista === 'tabla' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>Tabla</span>
            </button>
          </div>
        </div>` : ''}
      ${gruposHtml}`;
  }



  let docenteRiesgoCohorte = '';

  async function cambiarDocenteRiesgoCohorte(cohorte) {
    docenteRiesgoCohorte = cohorte || '';
    if (typeof window.cambiarFiltroSemaforoCohorte === 'function') {
      await window.cambiarFiltroSemaforoCohorte(cohorte);
    }
    await renderRiesgoDocente();
  }
  window.cambiarDocenteRiesgoCohorte = cambiarDocenteRiesgoCohorte;

  // ---------- RENDER: Semáforo de riesgo — docente (Delegado a semaforo.js) ----------
  async function renderRiesgoDocente() {
    if (typeof window !== 'undefined' && typeof window.renderRiesgoDocente === 'function' && window.renderRiesgoDocente !== renderRiesgoDocente) {
      return await window.renderRiesgoDocente();
    }
  }

  // ---------- Calificaciones (docente) — notas de 0.0 a 10.0, ponderadas ----------
  // Una cohorte + docente + MES = un registro con "criterios" (notas
  // configurables por el docente: nombre + peso %) y "valores" (nota
  // 0.0–10.0 de cada estudiante por criterio). Arranca vacío: sin criterios
  // ni notas de ejemplo.
  //
  // Separación por mes: cada vez que se crea un Horario nuevo (nuevo mes)
  // para una cohorte, el docente asignado ve una hoja de calificación NUEVA
  // y en blanco para ese mes — las notas de meses anteriores no se tocan ni
  // se mezclan, quedan disponibles como historial de solo lectura (tanto
  // para el docente como para el estudiante, ver renderCalificacionesEstudiante).
  let docenteCalifSeleccion = null; // "cohorte__mes"

  // Mes calendario real de hoy, en el mismo formato "YYYY-MM" que usa el
  // campo `mes` en toda la plataforma — punto único de esta comparación,
  // usado por mesActualParaDocenteCohorte() y por el cálculo de "esFuturo"
  // en los selectores de Calificaciones e Informes.
  function mesActualReal() {
    const hoy = new Date();
    return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  }

  // Mes más reciente en el que un docente tiene una franja de Horario para
  // una cohorte dada, PERO nunca más adelante que el mes calendario real de
  // hoy — ese es el "periodo actual" y el único editable.
  // CORREGIDO: antes se tomaba el mes más reciente que existiera en el
  // Horario sin importar la fecha real, así que si ya se creaba el
  // horario de un mes futuro (ej. octubre creado en septiembre), ese mes
  // futuro quedaba marcado como "actual" y editable de inmediato — un
  // docente podía enviar calificaciones/informes de un mes que todavía no
  // había llegado. Ahora se compara contra hoy (formato "YYYY-MM", el
  // mismo que usa el campo `mes` en toda la plataforma, así que la
  // comparación de strings basta) y se toma el mes más reciente que no la
  // supere. Si el docente solo tiene franjas en meses futuros (ningún mes
  // ya llegó todavía), no hay ningún mes editable — se devuelve null.
  // async: getSlotsDocente() ahora es async.
  async function mesActualParaDocenteCohorte(docenteNombre, cohorteNombre) {
    const mesHoy = mesActualReal();
    const slots = await getSlotsDocente(docenteNombre);
    const cNorm = String(cohorteNombre || '').trim().toLowerCase();
    const meses = slots
      .filter(s => String(s.cohorte || '').trim().toLowerCase() === cNorm)
      .map(s => s.mes)
      .filter(Boolean)
      .filter(m => m <= mesHoy); // descarta cualquier mes que todavía no haya llegado
    if (!meses.length) return mesHoy;
    return meses.reduce((a, b) => (b > a ? b : a));
  }

  // Migración: asigna un "mes" a cualquier registro de notas_modulos que se
  // haya creado antes de separar las calificaciones por periodo. Se corre
  // una sola vez al cargar la página (ver el arranque, al final del archivo).
  // async: 'notas_modulos' vía MySQL + mesActualParaDocenteCohorte() (que
  // también es async, usa 'horarios' vía MySQL).
  async function migrarNotasModulosSinMes() {
    const registros = await Store.list('notas_modulos');
    const sinMes = registros.filter(r => !r.mes);
    if (!sinMes.length) return;
    const mesesResueltos = await Promise.all(sinMes.map(r => mesActualParaDocenteCohorte(r.docente, r.cohorte)));
    sinMes.forEach((r, i) => { r.mes = mesesResueltos[i] || '0000-00'; });
    await Store.set('notas_modulos', registros);
  }

  // async: 'notas_modulos' vía MySQL.
  async function getNotasModuloRecord(cohorteNombre, mes, crear) {
    const doc = getDocente();
    const registros = await Store.list('notas_modulos');
    let rec = registros.find(r => coincideDocenteConNombre(r.docente, doc.nombre) && r.cohorte === cohorteNombre && r.mes === mes);
    if (rec) {
      if (!rec.valores || Array.isArray(rec.valores)) rec.valores = {};
      if (!rec.criterios || !Array.isArray(rec.criterios)) rec.criterios = [];
    }
    if (!rec && crear) {
      // Migración suave: si existe un registro de antes de separar las notas
      // por mes (sin campo "mes") para este mismo docente+cohorte, se adopta
      // en vez de perder esas calificaciones ya cargadas.
      const legacy = registros.find(r => coincideDocenteConNombre(r.docente, doc.nombre) && r.cohorte === cohorteNombre && !r.mes);
      if (legacy) {
        legacy.mes = mes;
        if (!legacy.valores || Array.isArray(legacy.valores)) legacy.valores = {};
        if (!legacy.criterios || !Array.isArray(legacy.criterios)) legacy.criterios = [];
        rec = legacy;
        await Store.set('notas_modulos', registros);
      } else {
        rec = { id: uid('nm'), docente: doc.nombre || 'Docente', cohorte: cohorteNombre, mes, criterios: [], valores: {} };
        registros.push(rec);
        await Store.set('notas_modulos', registros);
      }
    }
    return rec || null;
  }

  // async: 'notas_modulos' vía MySQL.
  async function guardarNotasModuloRecord(rec) {
    if (!rec.valores || Array.isArray(rec.valores)) rec.valores = {};
    if (!rec.criterios || !Array.isArray(rec.criterios)) rec.criterios = [];
    // Asegurar que valores sea un objeto puro {} y no un Array [], para que JSON.stringify no descarte las notas
    const valoresLimpios = {};
    for (const est in rec.valores) {
      if (rec.valores.hasOwnProperty(est) && rec.valores[est] && typeof rec.valores[est] === 'object' && !Array.isArray(rec.valores[est])) {
        valoresLimpios[est] = { ...rec.valores[est] };
      }
    }
    rec.valores = valoresLimpios;

    const registros = await Store.list('notas_modulos');
    const idx = registros.findIndex(r => r.id === rec.id);
    if (idx >= 0) registros[idx] = rec; else registros.push(rec);
    const saveRes = await Store.set('notas_modulos', registros);
    if (saveRes && saveRes.error) {
      console.error('[guardarNotasModuloRecord] Error al persistir notas en MySQL:', saveRes.error);
      toast('Aviso: Las notas se guardaron localmente pero hubo error de sincronización: ' + saveRes.error, 'err');
    }
    // Deja rastro en "Actividad reciente" del dashboard: quién subió/editó
    // notas, en qué cohorte y mes. currentDocente siempre está disponible
    // aquí porque los 4 llamadores de esta función viven en el panel Docente.
    const curDoc = getDocente();
    if (curDoc && curDoc.nombre) {
      await registrarAuditoriaAccion('Notas actualizadas', curDoc.nombre, 'Docente', `${rec.cohorte || ''} · ${rec.mes || ''}`.trim());
    }
  }

  function pesoTotalCriterios(rec) {
    return (rec.criterios || []).reduce((a, c) => a + (Number(c.peso) || 0), 0);
  }

  // Nota cuantitativa ponderada (0.0–10.0). Se normaliza sobre el peso total
  // definido (aunque no sume exactamente 100%) para que el cálculo nunca
  // quede roto, pero la interfaz igual avisa si el peso no suma 100%.
  function calcularNotaFinal(rec, estudianteNombre) {
    const criterios = rec.criterios || [];
    if (!criterios.length) return null;
    const valores = (rec.valores && !Array.isArray(rec.valores) && rec.valores[estudianteNombre]) || {};
    let sumaPeso = 0, sumaPonderada = 0, faltan = false, notasPuestas = 0;
    let pesoCalificado = 0, sumaPonderadaCalificada = 0;
    criterios.forEach(c => {
      const peso = Number(c.peso) || 0;
      sumaPeso += peso;
      const v = valores[c.id];
      if (v === undefined || v === null || v === '') {
        faltan = true;
      } else {
        notasPuestas++;
        pesoCalificado += peso;
        sumaPonderada += Number(v) * peso;
        sumaPonderadaCalificada += Number(v) * peso;
      }
    });
    if (!sumaPeso && !notasPuestas) return null;
    // Si los pesos aún están en 0 (docente no configuró pesos todavía), calcula promedio aritmético simple
    if (!sumaPeso && notasPuestas > 0) {
      let sumaSimple = 0;
      criterios.forEach(c => {
        const v = valores[c.id];
        if (v !== undefined && v !== null && v !== '') sumaSimple += Number(v);
      });
      return { valor: sumaSimple / notasPuestas, pendiente: faltan, parcial: faltan };
    }
    if (faltan) {
      if (pesoCalificado > 0) {
        return { valor: sumaPonderadaCalificada / pesoCalificado, pendiente: true, parcial: true };
      }
      return { pendiente: true, valor: null };
    }
    return { valor: sumaPonderada / sumaPeso, pendiente: false, parcial: false };
  }

  function calificacionCualitativa(nota) {
    if (nota === null || nota === undefined || isNaN(nota)) return '—';
    if (nota >= 9) return 'Desempeño Superior';
    if (nota >= 7) return 'Desempeño Alto';
    if (nota >= 6) return 'Desempeño Básico';
    return 'Desempeño Bajo';
  }
  function colorCualitativa(nota) {
    if (nota === null || nota === undefined || isNaN(nota)) return '#5B6472';
    if (nota >= 9) return '#1FC8C0';
    if (nota >= 7) return '#0f8f89';
    if (nota >= 6) return '#F5A623';
    return '#EC4899';
  }
  if (typeof window !== 'undefined') {
    window.calificacionCualitativa = calificacionCualitativa;
    window.colorCualitativa = colorCualitativa;
  }

  // Escala académica por letras (A, B, C, D, F) según la escala oficial 0.0 - 10.0
  // A (Sobresaliente / Excelente): 9.0 a 10.0
  // B (Notable / Bueno): 7.5 a 8.9
  // C (Aprobado / Suficiente): 6.0 a 7.4
  // D (Insuficiente / Bajo): 5.0 a 5.9
  // F (Reprobado / Suspenso): Menor de 5.0
  function letraEscalaNota(nota) {
    if (nota === null || nota === undefined || isNaN(nota)) return null;
    const n = Math.round(Number(nota) * 10) / 10;
    if (n >= 9.0) return { letra: 'A', descripcion: 'Sobresaliente / Excelente', nivel: 'Sobresaliente', color: '#1FC8C0', bg: '#1FC8C01A' };
    if (n >= 7.5) return { letra: 'B', descripcion: 'Notable / Bueno', nivel: 'Notable', color: '#0f8f89', bg: '#0f8f891A' };
    if (n >= 6.0) return { letra: 'C', descripcion: 'Aprobado / Suficiente', nivel: 'Aprobado', color: '#F5A623', bg: '#F5A6231A' };
    if (n >= 5.0) return { letra: 'D', descripcion: 'Insuficiente / Bajo', nivel: 'Insuficiente', color: '#9A5B3F', bg: '#9A5B3F1A' };
    return { letra: 'F', descripcion: 'Reprobado / Suspenso', nivel: 'Reprobado', color: '#EC4899', bg: '#EC48991A' };
  }
  window.letraEscalaNota = letraEscalaNota;

  // Opciones para el selector de "Calificar estudiantes": una por cada
  // combinación real Cohorte+Mes que aparece en el Horario del docente
  // (no solo por cohorte). Más recientes primero.
  // async: getSlotsDocente() y mesActualParaDocenteCohorte() ahora son async.
  async function docenteCalifOpciones() {
    const doc = getDocente();
    if (!doc || !doc.nombre) return [];
    const mapa = new Map();
    const slots = await getSlotsDocente(doc.nombre);
    slots.forEach(s => {
      const mes = s.mes || mesActualReal();
      const key = s.cohorte + '__' + mes;
      if (!mapa.has(key)) mapa.set(key, { cohorte: s.cohorte, mes, materias: new Set() });
      if (s.materia) mapa.get(key).materias.add(s.materia);
    });

    try {
      const pensumList = await Store.list('pensum');
      pensumList.forEach(p => {
        if (coincideDocenteConNombre(p.docente, doc.nombre)) {
          const mes = p.mes || mesActualReal();
          const coh = p.cohorte || 'Cohorte 1';
          const key = coh + '__' + mes;
          if (!mapa.has(key)) mapa.set(key, { cohorte: coh, mes, materias: new Set() });
          if (p.materia || p.modulo || p.tema) mapa.get(key).materias.add(p.materia || p.modulo || p.tema);
        }
      });
    } catch (e) {}

    try {
      const modulosList = await Store.list('modulos');
      modulosList.forEach(m => {
        if (coincideDocenteConNombre(m.docente, doc.nombre)) {
          const mes = m.mes || mesActualReal();
          const coh = m.cohorte || m.nombre || 'Cohorte 1';
          const key = coh + '__' + mes;
          if (!mapa.has(key)) mapa.set(key, { cohorte: coh, mes, materias: new Set() });
          if (m.materia || m.nombre) mapa.get(key).materias.add(m.materia || m.nombre);
        }
      });
    } catch (e) {}

    if (mapa.size === 0 && (doc.cohorte || doc.materias)) {
      const coh = doc.cohorte || 'Cohorte 1';
      const mes = mesActualReal();
      const key = coh + '__' + mes;
      const mats = Array.isArray(doc.materias) ? doc.materias : (doc.materias ? [doc.materias] : ['Módulo Asignado']);
      mapa.set(key, { cohorte: coh, mes, materias: new Set(mats) });
    }

    const entradas = [...mapa.entries()];
    const esActualPorEntrada = await Promise.all(entradas.map(([, o]) => mesActualParaDocenteCohorte(doc.nombre, o.cohorte)));
    const mesHoy = mesActualReal();
    const arr = entradas.map(([key, o], i) => {
      const esAct = !esActualPorEntrada[i] || o.mes === esActualPorEntrada[i] || o.mes === mesHoy;
      return {
        key, cohorte: o.cohorte, mes: o.mes,
        materia: [...o.materias].filter(Boolean).join(' / ') || '(sin materia)',
        esActual: esAct,
        esFuturo: o.mes > mesHoy && !esAct,
      };
    });
    arr.sort((a, b) => b.mes.localeCompare(a.mes) || a.cohorte.localeCompare(b.cohorte));
    return arr;
  }

  // async: docenteEstudiantesDeCohorte ahora es async.
  async function renderCalificacionesDocente() {
    const opciones = await docenteCalifOpciones();
    if (!docenteCalifSeleccion || !opciones.some(o => o.key === docenteCalifSeleccion)) {
      docenteCalifSeleccion = opciones.length ? opciones[0].key : null;
    }
    const sel = opciones.find(o => o.key === docenteCalifSeleccion) || null;

    if (!opciones.length) {
      document.getElementById('mount-t-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes/módulos asignados. El coordinador debe asignarte uno desde el panel administrativo (Horario) para poder subir calificaciones.</p>
      </div>`;
      return;
    }

    const rec = (await getNotasModuloRecord(sel.cohorte, sel.mes, false)) || { criterios: [], valores: {} };
    if (!rec.valores || Array.isArray(rec.valores)) rec.valores = {};
    const pesoTotal = pesoTotalCriterios(rec);
    const pesoOk = pesoTotal === 100;
    const estudiantes = await docenteEstudiantesDeCohorte(sel.cohorte);
    const editable = sel.esActual;

    const selector = `<select onchange="cambiarCalifDocente(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
      ${opciones.map(o => `<option value="${escapeHtml(o.key)}" ${o.key === docenteCalifSeleccion ? 'selected' : ''}>${escapeHtml(o.cohorte)} — ${escapeHtml(mesLabel(o.mes))} — ${escapeHtml(o.materia)}${o.esActual ? '' : (o.esFuturo ? ' (aún no disponible)' : ' (historial)')}</option>`).join('')}
    </select>`;

    const avisoHistorial = !editable ? `<p class="text-xs font-semibold text-morado bg-morado/10 rounded-xl px-4 py-2.5 mb-4">Estás viendo un periodo anterior (${escapeHtml(mesLabel(sel.mes))}). Quedó guardado como historial y ya no se puede editar — el periodo activo para calificar es el mes más reciente que te asignaron en el Horario.</p>` : '';

    const criteriosFilas = (rec.criterios || []).map(c => `
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
        <input type="text" value="${escapeHtml(c.nombre)}" ${editable ? `onchange="actualizarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}','nombre', this.value)"` : 'disabled'} class="flex-1 bg-white text-sm font-semibold text-ink focus:outline-none disabled:opacity-60 rounded-lg border border-gray-100 px-2 py-1" placeholder="Nombre de la nota (ej. Taller 1)" />
        <div class="flex items-center gap-1.5 shrink-0">
          <input type="number" min="0" max="100" step="1" value="${c.peso}" ${editable ? `onchange="actualizarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}','peso', this.value)"` : 'disabled'} class="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right disabled:opacity-60" />
          <span class="text-xs text-slate2 font-semibold">%</span>
        </div>
        ${editable ? `<button onclick="eliminarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}')" class="text-coral hover:opacity-70 shrink-0" title="Eliminar nota">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>` : ''}
      </div>`).join('');

    let tablaNotas;
    if (!rec.criterios || !rec.criterios.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">${editable ? 'Agrega al menos una nota (por ejemplo, "Taller 1") para empezar a calificar a tus estudiantes.' : 'Este periodo no llegó a tener notas de evaluación definidas.'}</p>`;
    } else if (!estudiantes.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">Esta cohorte aún no tiene estudiantes matriculados.</p>`;
    } else {
      const headerCriterios = rec.criterios.map(c => `<th class="py-2.5 px-3 text-center">${escapeHtml(c.nombre)}<br/><span class="text-[10px] font-normal normal-case text-slate2">${c.peso}%</span></th>`).join('');
      const filas = estudiantes.map(e => {
        const valores = (rec.valores && !Array.isArray(rec.valores) && rec.valores[e.nombre]) || {};
        const celdas = rec.criterios.map(c => `
          <td class="py-2 px-3 text-center">
            <input type="number" min="0" max="10" step="0.1" value="${valores[c.id] !== undefined ? valores[c.id] : ''}" placeholder="0.0" ${editable ? '' : 'disabled'}
              onchange="guardarNotaCriterio('${sel.cohorte}','${sel.mes}','${e.id}','${c.id}', this.value)"
              class="w-16 rounded-lg border border-morado/25 bg-morado/5 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado disabled:opacity-60" />
          </td>`).join('');
        const resultado = calcularNotaFinal(rec, e.nombre);
        const nota = resultado && !resultado.pendiente ? resultado.valor : null;
        const cuantHtml = nota !== null ? `<span class="font-bold" style="color:${colorCualitativa(nota)}">${nota.toFixed(1)}</span>` : `<span class="text-slate2 text-xs">Incompleta</span>`;
        // Nota: la "Cualitativa" (Desempeño Superior/Alto/Básico/Bajo) ya NO se muestra
        // aquí. Esa valoración cualitativa vive únicamente en el Informe que el docente
        // genera para el estudiante/administrador (ver renderInformesDocente).
        return `<tr class="border-b border-gray-50 last:border-0">
          <td class="py-2.5 px-4 text-sm font-semibold text-ink whitespace-nowrap">${nombrePersonaClicable(e.nombre, 'Estudiante')}</td>
          ${celdas}
          <td class="py-2.5 px-3 text-center">${cuantHtml}</td>
        </tr>`;
      }).join('');
      tablaNotas = `<div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="w-full">
          <thead><tr class="text-left text-[10px] font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
            <th class="py-2.5 px-4">Estudiante</th>${headerCriterios}<th class="py-2.5 px-3 text-center">Cuantitativa</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    }

    document.getElementById('mount-t-calificaciones').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Calificaciones por cohorte y mes</p>
            <p class="text-xs text-slate2 mt-0.5">Escala de 0.0 a 10.0. Cada mes/materia asignada en tu Horario tiene su propia hoja de calificación — el mes más reciente es el periodo activo; los anteriores quedan como historial de solo lectura.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${avisoHistorial}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p class="text-sm font-bold text-ink">Notas de evaluación — ${escapeHtml(sel.materia)} · ${escapeHtml(mesLabel(sel.mes))}</p>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${pesoOk ? '#1FC8C01A' : '#EC48991A'};color:${pesoOk ? '#0f8f89' : '#EC4899'}">Peso total: ${pesoTotal}%${pesoOk ? '' : ' — debe sumar 100%'}</span>
        </div>
        <div class="space-y-2.5 mb-4">${criteriosFilas || '<p class="text-sm text-slate2">Aún no has definido notas para este periodo.</p>'}</div>
        ${editable ? `<button onclick="agregarCriterioCalif('${sel.cohorte}','${sel.mes}')" class="rounded-xl border border-dashed border-gray-300 text-slate2 hover:text-ink hover:border-ink text-sm font-semibold px-4 py-2.5 transition">+ Agregar nota</button>` : ''}
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <p class="text-sm font-bold text-ink mb-4">Calificar estudiantes</p>
        ${tablaNotas}
      </div>`;
  }

  function cambiarCalifDocente(value) {
    docenteCalifSeleccion = value;
    renderCalificacionesDocente();
  }

  // async: 'notas_modulos' vía MySQL.
  async function agregarCriterioCalif(cohorteNombre, mes) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    rec.criterios = rec.criterios || [];
    rec.criterios.push({ id: uid('cr'), nombre: 'Nota ' + (rec.criterios.length + 1), peso: 0 });
    await guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  async function actualizarCriterioCalif(cohorteNombre, mes, criterioId, campo, valor) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    const c = (rec.criterios || []).find(x => x.id === criterioId);
    if (!c) return;
    if (campo === 'peso') {
      let n = parseFloat(valor);
      if (isNaN(n) || n < 0) n = 0;
      if (n > 100) n = 100;
      c.peso = n;
    } else {
      c.nombre = valor.trim() || c.nombre;
    }
    await guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  async function eliminarCriterioCalif(cohorteNombre, mes, criterioId) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    rec.criterios = (rec.criterios || []).filter(c => c.id !== criterioId);
    Object.keys(rec.valores || {}).forEach(est => { if (rec.valores[est]) delete rec.valores[est][criterioId]; });
    await guardarNotasModuloRecord(rec);
    toast('Nota de evaluación eliminada', 'ok');
    renderCalificacionesDocente();
  }

  // async: 'usuarios' y 'notas_modulos' vía MySQL.
  async function guardarNotaCriterio(cohorteNombre, mes, estudianteId, criterioId, valorStr) {
    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (!est) return;
    let n = valorStr === '' ? null : parseFloat(valorStr);
    if (n !== null) {
      if (isNaN(n)) { toast('Ingresa un número válido entre 0.0 y 10.0', 'err'); renderCalificacionesDocente(); return; }
      if (n < 0) n = 0;
      if (n > 10) n = 10;
    }
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    if (!rec.valores || Array.isArray(rec.valores)) rec.valores = {};
    if (!rec.valores[est.nombre] || Array.isArray(rec.valores[est.nombre])) rec.valores[est.nombre] = {};
    if (n === null) delete rec.valores[est.nombre][criterioId];
    else rec.valores[est.nombre][criterioId] = n;
    await guardarNotasModuloRecord(rec);
    toast('Nota guardada: ' + (n !== null ? n.toFixed(1) : 'Eliminada') + ' (' + est.nombre + ')', 'ok');
    renderCalificacionesDocente();
  }

  // ---------- Informes docentes (autocompletado inteligente) ----------
  // Mismo patrón que docenteCalifSeleccion/docenteCalifOpciones (ver
  // arriba): un informe nuevo e independiente por cada combinación
  // Cohorte+Mes real que aparece en el Horario del docente. Al pasar a
  // octubre, en cuanto exista una franja de Horario de octubre para esa
  // cohorte, aparece un informe NUEVO y en blanco para ese mes — el
  // informe de septiembre (si ya fue Enviado) queda intacto, como
  // historial de solo lectura, y nunca se reabre ni se sobrescribe.
  let docenteInformesSeleccion = null; // "cohorte__mes"

  // async: 'asistencia' y 'notas_modulos' vía MySQL.
  async function generarDatosInformeEstudiante(estudianteNombre, cohorteNombre, cursoNombre, mes, docenteNombre, preloaded = null) {
    const asistList = (preloaded && preloaded.asistList) ? preloaded.asistList : await Store.list('asistencia');
    const usuarios = (preloaded && preloaded.usuarios) ? preloaded.usuarios : await Store.list('usuarios');
    const uEst = (usuarios || []).find(u => u.nombre === estudianteNombre);
    const fechaRegDate = (uEst && (uEst.creadoEn || uEst.creado_en)) ? (uEst.creadoEn || uEst.creado_en).slice(0, 10) : '';

    const asistReg = asistList.filter(a => {
      if (a.estudiante !== estudianteNombre) return false;
      if (fechaRegDate && a.fecha && a.fecha < fechaRegDate) return false;
      if (docenteNombre && a.docente && a.docente === docenteNombre) {
        if (mes && a.fecha && a.fecha.slice(0, 7) !== mes) return false;
        return true;
      }
      if (cursoNombre && (a.materia === cursoNombre || a.modulo === cursoNombre)) {
        if (mes && a.fecha && a.fecha.slice(0, 7) !== mes) return false;
        return true;
      }
      return false;
    });
    const presentes = asistReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistReg.length ? Math.round((presentes / asistReg.length) * 100) : null;

    // Si se pasa recNotas en preloaded (incluso si es null), se aprovecha directamente
    const rec = (preloaded && preloaded.recNotas !== undefined)
      ? preloaded.recNotas
      : await getNotasModuloRecord(cohorteNombre, mes, false);
    const resultado = rec ? calcularNotaFinal(rec, estudianteNombre) : null;
    const nota = resultado && !resultado.pendiente ? resultado.valor : null;

    const partes = [];
    if (pctAsistencia !== null) partes.push('una asistencia del ' + pctAsistencia + '%');
    if (nota !== null) partes.push('una nota cuantitativa de ' + nota.toFixed(1) + ' (' + calificacionCualitativa(nota) + ')');
    const conclusion = partes.length
      ? 'Durante el curso, el/la estudiante registró ' + partes.join(' y ') + '.'
      : 'Aún no hay suficientes datos de asistencia o calificaciones para generar una conclusión automática.';

    return { pctAsistencia, nota, cualitativa: nota !== null ? calificacionCualitativa(nota) : null, conclusion };
  }

  // Opciones para el selector de Informes: una por cada combinación real
  // Cohorte+Mes que aparece en el Horario del docente — igual que
  // docenteCalifOpciones(). "esActual" marca el mes más reciente (según
  // el Horario) para esa cohorte; los meses anteriores se muestran como
  // historial de solo lectura si ya fueron enviados.
  async function docenteInformesOpciones() {
    const doc = getDocente();
    if (!doc || !doc.nombre) return [];
    const mapa = new Map();
    const slots = await getSlotsDocente(doc.nombre);
    slots.forEach(s => {
      const mes = s.mes || mesActualReal();
      const key = s.cohorte + '__' + mes;
      if (!mapa.has(key)) mapa.set(key, { cohorte: s.cohorte, mes, materias: new Set() });
      if (s.materia) mapa.get(key).materias.add(s.materia);
    });

    try {
      const pensumList = await Store.list('pensum');
      pensumList.forEach(p => {
        if (coincideDocenteConNombre(p.docente, doc.nombre)) {
          const mes = p.mes || mesActualReal();
          const coh = p.cohorte || 'Cohorte 1';
          const key = coh + '__' + mes;
          if (!mapa.has(key)) mapa.set(key, { cohorte: coh, mes, materias: new Set() });
          if (p.materia || p.modulo || p.tema) mapa.get(key).materias.add(p.materia || p.modulo || p.tema);
        }
      });
    } catch (e) {}

    try {
      const modulosList = await Store.list('modulos');
      modulosList.forEach(m => {
        if (coincideDocenteConNombre(m.docente, doc.nombre)) {
          const mes = m.mes || mesActualReal();
          const coh = m.cohorte || m.nombre || 'Cohorte 1';
          const key = coh + '__' + mes;
          if (!mapa.has(key)) mapa.set(key, { cohorte: coh, mes, materias: new Set() });
          if (m.materia || m.nombre) mapa.get(key).materias.add(m.materia || m.nombre);
        }
      });
    } catch (e) {}

    if (mapa.size === 0 && (doc.cohorte || doc.materias)) {
      const coh = doc.cohorte || 'Cohorte 1';
      const mes = mesActualReal();
      const key = coh + '__' + mes;
      const mats = Array.isArray(doc.materias) ? doc.materias : (doc.materias ? [doc.materias] : ['Módulo Asignado']);
      mapa.set(key, { cohorte: coh, mes, materias: new Set(mats) });
    }

    const entradas = [...mapa.entries()];
    const esActualPorEntrada = await Promise.all(entradas.map(([, o]) => mesActualParaDocenteCohorte(doc.nombre, o.cohorte)));
    const mesHoy = mesActualReal();
    const arr = entradas.map(([key, o], i) => {
      const esAct = !esActualPorEntrada[i] || o.mes === esActualPorEntrada[i] || o.mes === mesHoy;
      return {
        key, cohorte: o.cohorte, mes: o.mes,
        materia: [...o.materias].filter(Boolean).join(' / ') || '(sin materia)',
        esActual: esAct,
        esFuturo: o.mes > mesHoy && !esAct,
      };
    });
    arr.sort((a, b) => b.mes.localeCompare(a.mes) || a.cohorte.localeCompare(b.cohorte));
    return arr;
  }

  // Estado del filtro del panel Informes del Docente:
  let docenteInformesCohorte = null; // cohorte seleccionada
  let docenteInformesMes = null;     // mes "YYYY-MM" seleccionado

  async function cambiarCohorteInformesDocente(cohorte) {
    docenteInformesCohorte = cohorte || null;
    docenteInformesMes = null;
    await renderInformesDocente();
  }
  window.cambiarCohorteInformesDocente = cambiarCohorteInformesDocente;

  async function cambiarMesInformesDocente(mes) {
    docenteInformesMes = mes || null;
    await renderInformesDocente();
  }
  window.cambiarMesInformesDocente = cambiarMesInformesDocente;

  // Estado para desplegar informes ya radicados
  let docenteInformesVerEnviados = false;
  function toggleVerInformesEnviadosDocente() {
    docenteInformesVerEnviados = !docenteInformesVerEnviados;
    const sec = document.getElementById('seccion-informes-enviados');
    const btn = document.getElementById('btn-toggle-informes-enviados');
    if (sec) sec.classList.toggle('hidden', !docenteInformesVerEnviados);
    if (btn) {
      btn.innerHTML = docenteInformesVerEnviados
        ? `<span>Ocultar informes enviados</span> <svg class="w-3.5 h-3.5 rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`
        : `<span>Ver detalles de informes enviados</span> <svg class="w-3.5 h-3.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`;
    }
  }
  window.toggleVerInformesEnviadosDocente = toggleVerInformesEnviadosDocente;

  // Temporizador para refrescar badges y estados mientras existan reportes en la ventana de 15 minutos
  let _timerVentanaEdicionDocente = null;
  function iniciarTimerVentanaEdicionSiAplica(tieneEditables) {
    if (_timerVentanaEdicionDocente) {
      clearInterval(_timerVentanaEdicionDocente);
      _timerVentanaEdicionDocente = null;
    }
    if (tieneEditables) {
      _timerVentanaEdicionDocente = setInterval(() => {
        const mount = document.getElementById('mount-t-informes');
        if (!mount) {
          clearInterval(_timerVentanaEdicionDocente);
          _timerVentanaEdicionDocente = null;
          return;
        }
        renderInformesDocente();
      }, 15000);
    }
  }

  // async: docenteEstudiantesDeCohorte y docenteModulosActivos son async.
  async function renderInformesDocente() {
    const currentDocente = getDocente();
    const doc = currentDocente || {};
    if (!doc.nombre) {
      const mount = document.getElementById('mount-t-informes');
      if (mount) {
        mount.innerHTML = `<div class="admin-panel-card p-10 text-center">
          <p class="font-bold text-ink mb-1.5">No hay sesión de docente activa</p>
          <p class="text-sm text-slate2">Para ver y generar informes pedagógicos, inicia sesión con una cuenta de docente.</p>
        </div>`;
      }
      return;
    }
    const modulosDoc = await docenteModulosActivos();

    if (!modulosDoc.length) {
      document.getElementById('mount-t-informes').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas para generar informes.</p>
      </div>`;
      return;
    }

    if (!docenteInformesCohorte || !modulosDoc.some(m => m.nombre === docenteInformesCohorte)) {
      docenteInformesCohorte = modulosDoc[0].nombre;
      docenteInformesMes = null;
    }

    const cohorteSel = modulosDoc.find(m => m.nombre === docenteInformesCohorte) || modulosDoc[0];
    const slotsDocente = await getSlotsDocente(doc.nombre);
    const slotsCohorte = slotsDocente.filter(s => s.cohorte === docenteInformesCohorte);
    
    // Meses del horario para esta cohorte
    let mesesCohorte = [...new Set(slotsCohorte.map(s => s.mes))].filter(Boolean).sort().reverse();
    if (!mesesCohorte.length) {
      mesesCohorte = generarOpcionesMes(cohorteSel).map(o => o.value).reverse();
    }
    if (!mesesCohorte.length) {
      mesesCohorte = [mesActualReal()];
    }

    const mesHoy = mesActualReal();
    const mesActualCohorte = await mesActualParaDocenteCohorte(doc.nombre, docenteInformesCohorte);

    if (!docenteInformesMes || !mesesCohorte.includes(docenteInformesMes)) {
      docenteInformesMes = (mesActualCohorte && mesesCohorte.includes(mesActualCohorte))
        ? mesActualCohorte
        : (mesesCohorte.find(m => m <= mesHoy) || mesesCohorte[0]);
    }

    const esFuturo = docenteInformesMes > mesHoy;
    const esMesActivo = (docenteInformesMes === mesActualCohorte) && !esFuturo;
    const esPeriodoEditable = esMesActivo;

    const estudiantes = await docenteEstudiantesDeCohorte(docenteInformesCohorte);
    const guardados = (await Store.list('informes_docente', {
      params: { docente: doc.nombre, cohorte: docenteInformesCohorte, mes: docenteInformesMes },
      forceRefresh: true
    })).filter(i => 
      i.docente === doc.nombre && 
      i.cohorte === docenteInformesCohorte && 
      (i.mes === docenteInformesMes || (i.fecha && i.fecha.slice(0, 7) === docenteInformesMes))
    );

    // Auto-cierre si expiró la ventana de 15 minutos en un borrador reabierto
    let huboCierreExpirado = false;
    for (const g of guardados) {
      if (g.estado === 'Borrador' && g.reabiertoParaEdicion) {
        const tiempo = obtenerTiempoRestanteEdicionInforme(g);
        if (!tiempo.editable) {
          g.estado = 'Enviado';
          g.reabiertoParaEdicion = false;
          huboCierreExpirado = true;
        }
      }
    }
    if (huboCierreExpirado) {
      Store.list('informes_docente').then(all => {
        let modificado = false;
        guardados.forEach(g => {
          const idx = all.findIndex(x => x.id === g.id);
          if (idx >= 0 && all[idx].estado === 'Borrador' && all[idx].reabiertoParaEdicion) {
            const tiempo = obtenerTiempoRestanteEdicionInforme(all[idx]);
            if (!tiempo.editable) {
              all[idx].estado = 'Enviado';
              all[idx].reabiertoParaEdicion = false;
              modificado = true;
            }
          }
        });
        if (modificado) Store.set('informes_docente', all);
      });
    }

    const cursoSel = await cursoDeDocenteEnCohorte(doc.nombre, docenteInformesCohorte, docenteInformesMes);
    const [asistList, recNotas] = await Promise.all([
      Store.list('asistencia'),
      getNotasModuloRecord(docenteInformesCohorte, docenteInformesMes, false)
    ]);
    const preloadedInf = { asistList, recNotas };
    const datosPorEstudiante = await Promise.all(estudiantes.map(e => generarDatosInformeEstudiante(e.nombre, docenteInformesCohorte, cursoSel, docenteInformesMes, doc.nombre, preloadedInf)));

    const listaCompleta = estudiantes.map((e, i) => {
      const datos = datosPorEstudiante[i];
      const guardado = guardados.find(g => g.estudiante === e.nombre);
      const enviado = !!(guardado && guardado.estado === 'Enviado');
      return { e, datos, guardado, enviado };
    });

    const pendientes = listaCompleta.filter(item => !item.enviado);
    const enviados = listaCompleta.filter(item => item.enviado);
    const enviadosCount = enviados.length;
    const todosEnviados = estudiantes.length > 0 && pendientes.length === 0;

    const tieneEditables = listaCompleta.some(item => {
      if (!item.guardado) return false;
      const t = obtenerTiempoRestanteEdicionInforme(item.guardado);
      return t.editable;
    });
    iniciarTimerVentanaEdicionSiAplica(tieneEditables);

    let avisoPeriodoHtml = '';
    if (esFuturo) {
      avisoPeriodoHtml = `
        <div class="rounded-xl p-4 mb-5 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
          <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="font-bold">Periodo planificado para el futuro — Aún no disponible (${escapeHtml(mesLabel(docenteInformesMes))})</p>
            <p class="text-slate2 mt-0.5">El horario de este mes ya está definido, pero los informes solo se pueden redactar y enviar durante el mes en curso. Actualmente estamos en <strong>${escapeHtml(mesLabel(mesHoy))}</strong>.</p>
          </div>
        </div>`;
    } else if (!esMesActivo) {
      avisoPeriodoHtml = `
        <div class="rounded-xl p-3.5 mb-5 bg-gray-50 border border-gray-200 text-slate2 flex items-start gap-2 text-xs">
          <div class="w-6 h-6 rounded-lg bg-gray-200 text-slate2 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <div>
            <p class="font-bold text-ink">Historial de informes (${escapeHtml(mesLabel(docenteInformesMes))})</p>
            <p class="mt-0.5">Estás consultando un periodo anterior cerrado. Los informes de meses pasados se conservan como historial en modo solo lectura.</p>
          </div>
        </div>`;
    }

    const selectorCohortes = `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5" for="docenteInfCohorteSelect">
          Cohorte ${modulosDoc.length > 1 ? `<span class="text-morado font-bold">(${modulosDoc.length} asignadas)</span>` : ''}
        </label>
        <select id="docenteInfCohorteSelect" onchange="cambiarCohorteInformesDocente(this.value)" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-semibold">
          ${modulosDoc.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteInformesCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)}</option>`).join('')}
        </select>
      </div>`;

    const selectorMeses = `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5" for="docenteInfMesSelect">Periodo (Mes)</label>
        <select id="docenteInfMesSelect" onchange="cambiarMesInformesDocente(this.value)" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-semibold">
          ${mesesCohorte.map(m => {
            const esFut = m > mesHoy;
            const esAct = m === mesActualCohorte;
            const tag = esFut ? ' (aún no disponible)' : (esAct ? ' (mes activo)' : ' (historial)');
            return `<option value="${m}" ${m === docenteInformesMes ? 'selected' : ''}>${mesLabel(m)}${tag}</option>`;
          }).join('')}
        </select>
      </div>`;

    let cuerpoInformesHtml = '';

    if (!estudiantes.length) {
      cuerpoInformesHtml = '<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 text-center text-sm text-slate2">Esta cohorte aún no tiene estudiantes matriculados.</div>';
    } else if (esFuturo) {
      cuerpoInformesHtml = '';
    } else if (!esMesActivo) {
      // Historial de meses cerrados: vista limpia y compacta con apertura de modal
      cuerpoInformesHtml = `
        <div class="space-y-3">
          ${listaCompleta.map(item => {
            const { e, datos, guardado, enviado } = item;
            const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
            return `
            <div onclick="abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 flex items-center justify-between gap-3 hover:border-morado/30 hover:bg-morado/5 transition cursor-pointer group" title="Clic para ver reporte completo">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">${escapeHtml(iniciales)}</span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-ink truncate">${escapeHtml(e.nombre)}</p>
                  <p class="text-xs text-slate2 truncate">Curso: <strong class="text-ink">${escapeHtml(cursoSel)}</strong> · Asist: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : '—'}</strong> · Nota: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : '—'}</strong></p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${enviado ? `<span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-turquesa/10 text-turquesa"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Enviado</span>` : `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">No radicado</span>`}
                ${datos.nota !== null ? `<span class="hidden sm:inline-block text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(datos.nota)}1A;color:${colorCualitativa(datos.nota)}">${datos.cualitativa}</span>` : ''}
                <button type="button" onclick="event.stopPropagation(); abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="px-3 py-1 rounded-full text-xs font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">
                  Ver reporte
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } else if (todosEnviados) {
      // Periodo activo: TODOS los informes de los estudiantes ya fueron enviados
      cuerpoInformesHtml = `
        <div class="bg-white rounded-2xl border border-emerald-200/90 shadow-soft p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/60 shadow-inner">
            <svg class="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-ink mb-1.5">Todos los informes enviados correctamente este mes</h3>
            <p class="text-xs sm:text-sm text-slate2 max-w-lg mx-auto">
              Has completado y enviado con éxito todos los informes de los estudiantes (${enviados.length} en total) para el periodo de <strong class="text-emerald-700">${escapeHtml(mesLabel(docenteInformesMes))}</strong> en la cohorte <strong class="text-ink">${escapeHtml(docenteInformesCohorte)}</strong>.
            </p>
          </div>
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>${enviados.length} de ${estudiantes.length} informes radicados en la administración</span>
          </div>
        </div>`;
    } else {
      // Periodo activo: Aún quedan estudiantes pendientes por informe (o reabiertos para corrección)
      cuerpoInformesHtml = `
        <div class="flex items-center justify-between gap-3 mb-5 flex-wrap bg-linear-to-r from-morado/5 to-turquesa/5 p-4 rounded-2xl border border-morado/15">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <p class="text-xs sm:text-sm font-bold text-ink">
              Informes pendientes o en edición: <span class="text-morado font-extrabold">${pendientes.length}</span> de ${estudiantes.length}
            </p>
          </div>
          <span class="text-xs text-slate2">Dispones de hasta 15 minutos tras el primer envío para realizar cualquier corrección.</span>
        </div>

        <div class="space-y-4">
          ${pendientes.map(item => {
            const { e, datos, guardado } = item;
            const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
            const tiempoEdicion = guardado ? obtenerTiempoRestanteEdicionInforme(guardado) : null;
            const esReabierto = Boolean(guardado && guardado.reabiertoParaEdicion && tiempoEdicion && tiempoEdicion.editable);
            return `
            <div id="card_informe_${e.id}" class="bg-white rounded-2xl border ${esReabierto ? 'border-amber-300 ring-2 ring-amber-100/70' : 'border-gray-100'} shadow-soft p-6 transition-all duration-300">
              <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-full ${esReabierto ? 'bg-amber-100 text-amber-800' : 'bg-morado/10 text-morado'} text-xs font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
                  <p class="text-sm font-bold text-ink">${escapeHtml(e.nombre)}</p>
                </div>
                <div class="flex items-center gap-2">
                  ${esReabierto ? `
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                      <svg class="w-3.5 h-3.5 shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>Edición activa: ${tiempoEdicion.texto}</span>
                    </span>
                  ` : `
                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">Pendiente de envío</span>
                  `}
                  ${datos.nota !== null ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(datos.nota)}1A;color:${colorCualitativa(datos.nota)}">${datos.cualitativa}</span>` : ''}
                </div>
              </div>
              ${esReabierto ? `
                <div class="mb-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                  <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <div>
                    <p class="font-bold">Informe reabierto para corrección</p>
                    <p class="mt-0.5 text-amber-800">Tienes hasta 15 minutos desde el primer envío para ajustar tus observaciones. Al hacer clic en reenviar se actualizará el reporte oficial.</p>
                  </div>
                </div>
              ` : ''}
              <p class="text-xs text-slate2 mb-2">Curso: <strong class="text-ink">${escapeHtml(cursoSel)}</strong> · Asistencia: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : 'Sin datos'}</strong> · Nota cuantitativa: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : 'Sin datos'}</strong></p>
              <p class="text-sm text-ink mb-3 bg-slate-50/70 rounded-xl p-3 border border-gray-100">${escapeHtml(datos.conclusion)}</p>
              <label class="block text-xs font-semibold text-slate2 mb-1.5" for="obs_${e.id}">Observaciones personales del docente</label>
              <textarea id="obs_${e.id}" rows="2" placeholder="Ej. Durante las clases mostró mayor liderazgo y compromiso." oninput="autoguardarBorradorInforme('${e.id}','${escapeHtml(docenteInformesCohorte)}','${escapeHtml(docenteInformesMes)}')" class="w-full rounded-xl border ${esReabierto ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-amber-50/20' : 'border-morado/25 focus:border-morado focus:ring-morado/30 bg-morado/5'} px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2">${escapeHtml(guardado ? guardado.observaciones : '')}</textarea>
              <div class="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <div class="flex items-center gap-3">
                  <button type="button" id="btn_enviar_${e.id}" onclick="enviarInformeDocente('${e.id}','${escapeHtml(docenteInformesCohorte)}','${escapeHtml(docenteInformesMes)}')" style="background: linear-gradient(135deg, #8B5CF6 0%, #1FC8C0 100%) !important; color: #ffffff !important;" class="cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                    <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    <span>${esReabierto ? 'Guardar corrección y reenviar' : 'Enviar informe'}</span>
                  </button>
                  <span id="autoguardado_${e.id}" class="text-xs text-slate2"></span>
                </div>
                <span class="text-[11px] ${esReabierto ? 'text-amber-800 font-semibold' : 'text-slate2'}">
                  ${esReabierto ? `Ventana de corrección: ${tiempoEdicion.texto}` : 'Podrás editarlo hasta 15 min después del envío'}
                </span>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    }

    // Sección desplegable de informes ya enviados (disponible cuando hay enviados en periodo activo)
    let seccionEnviadosHtml = '';
    if (esMesActivo && enviados.length > 0) {
      seccionEnviadosHtml = `
        <div class="mt-8 pt-6 border-t border-gray-200">
          <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate2">Informes ya enviados este mes (${enviados.length})</h4>
            </div>
            <button type="button" id="btn-toggle-informes-enviados" onclick="toggleVerInformesEnviadosDocente()" class="inline-flex items-center gap-1.5 text-xs font-semibold text-morado hover:text-morado/80 transition cursor-pointer">
              <span>${docenteInformesVerEnviados ? 'Ocultar informes enviados' : 'Ver detalles de informes enviados'}</span>
              <svg class="w-3.5 h-3.5 ${docenteInformesVerEnviados ? 'rotate-180' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
          <div id="seccion-informes-enviados" class="${docenteInformesVerEnviados ? '' : 'hidden'} space-y-3">
            ${enviados.map(item => {
              const { e, datos, guardado } = item;
              const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
              const tiempoEdicion = guardado ? obtenerTiempoRestanteEdicionInforme(guardado) : { editable: false, texto: '' };
              return `
              <div onclick="abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="bg-gray-50/80 rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-morado/30 hover:bg-morado/5 transition cursor-pointer group" title="Clic para ver reporte">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">${escapeHtml(iniciales)}</span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-ink truncate">${escapeHtml(e.nombre)}</p>
                    <p class="text-[11px] text-slate2 truncate">Asistencia: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : '—'}</strong> · Nota: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : '—'}</strong> · Radicado ${fmtDate(guardado ? guardado.fecha : '')}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  ${tiempoEdicion.editable ? `
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200" title="Ventana de 15 min activa para editar">
                      <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Editable (${tiempoEdicion.texto})
                    </span>
                    <button type="button" onclick="event.stopPropagation(); reabrirInformeDocente('${escapeHtml((guardado && guardado.id) || '')}')" class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition cursor-pointer flex items-center gap-1">
                      <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      <span>Editar</span>
                    </button>
                  ` : `
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Definitivo
                    </span>
                  `}
                  <button type="button" onclick="event.stopPropagation(); abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="px-3 py-1 rounded-full text-xs font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">
                    Ver reporte
                  </button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    document.getElementById('mount-t-informes').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 class="text-lg font-black text-ink">Informes mensuales de estudiantes</h2>
            <p class="text-xs text-slate2 mt-0.5 max-w-xl">El sistema autocompleta asistencia, notas y conclusión a partir de tus registros reales. Filtra por cohorte y mes para redactar tus observaciones y enviar los informes a la administración.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 shrink-0 text-right">
            <span class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Estado de envíos</span>
            <p class="text-sm font-extrabold ${todosEnviados ? 'text-turquesa' : 'text-morado'}">${enviadosCount} de ${estudiantes.length} enviados</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          ${selectorCohortes}
          ${selectorMeses}
        </div>
      </div>
      ${avisoPeriodoHtml}
      ${cuerpoInformesHtml}
      ${seccionEnviadosHtml}`;
  }

  // async: 'usuarios' vía MySQL.
  // guardarInformeDocenteInterno(): helper compartido por el autoguardado
  // de borrador y por el envío definitivo — arma y persiste el registro.
  async function guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, estadoFinal) {
    const mesHoy = mesActualReal();
    const mesComparar = mes || mesHoy;

    // REGLA: Un profesor no puede redactar ni enviar informes de un mes futuro (ej. octubre estando en septiembre)
    if (mesComparar > mesHoy) {
      return null;
    }

    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    const doc = getDocente();
    const modulosDoc = await docenteModulosActivos();
    const moduloSel = modulosDoc.find(m => m.nombre === cohorteNombre);
    if (!est || !moduloSel) return null;
    const textarea = document.getElementById('obs_' + estudianteId);
    const observaciones = textarea ? textarea.value.trim() : '';

    const curso = await cursoDeDocenteEnCohorte(doc.nombre, cohorteNombre, mes);

    const datos = await generarDatosInformeEstudiante(est.nombre, cohorteNombre, curso, mesComparar, doc.nombre);
    const registros = await Store.list('informes_docente', { forceRefresh: true });

    const idx = registros.findIndex(r => 
      coincideDocenteConNombre(r.docente, doc.nombre) && 
      r.estudiante === est.nombre && 
      r.cohorte === cohorteNombre && 
      (r.mes === mesComparar || (r.fecha && r.fecha.slice(0, 7) === mesComparar))
    );

    const registroPrevio = idx >= 0 ? registros[idx] : null;

    if (registroPrevio && registroPrevio.estado === 'Enviado' && estadoFinal === 'Borrador') {
      const tiempo = obtenerTiempoRestanteEdicionInforme(registroPrevio);
      if (!tiempo.editable) return registroPrevio;
    }

    const hoyStr = fechaHoyLocal();
    const fechaInforme = (mesComparar && mesComparar !== hoyStr.slice(0, 7)) ? `${mesComparar}-01` : hoyStr;
    const ahoraIso = new Date().toISOString();

    let primerEnvioEn = registroPrevio ? (registroPrevio.primerEnvioEn || null) : null;
    let enviadoEn = registroPrevio ? (registroPrevio.enviadoEn || null) : null;

    if (estadoFinal === 'Enviado') {
      if (!primerEnvioEn) {
        primerEnvioEn = ahoraIso;
      }
      enviadoEn = ahoraIso;
    }

    const registro = {
      id: idx >= 0 ? registros[idx].id : uid('inf'),
      docente: doc.nombre,
      estudiante: est.nombre,
      cohorte: cohorteNombre,
      curso: curso,
      materia: curso,
      mes: mesComparar,
      fecha: fechaInforme,
      asistenciaPct: datos.pctAsistencia,
      promedio: datos.nota,
      cualitativa: datos.cualitativa,
      conclusion: datos.conclusion,
      observaciones,
      estado: estadoFinal,
      primerEnvioEn: primerEnvioEn,
      enviadoEn: enviadoEn,
      reabiertoParaEdicion: (estadoFinal === 'Enviado') ? false : (registroPrevio ? Boolean(registroPrevio.reabiertoParaEdicion) : false),
      actualizadoEn: ahoraIso
    };

    if (idx >= 0) registros[idx] = registro;
    else registros.push(registro);

    await Store.set('informes_docente', registros);
    return registro;
  }

  // Autoguardado silencioso mientras el docente escribe la observación
  // (debounce de 900ms) — así el texto no se pierde si recarga la
  // página o cambia de cohorte antes de enviar. Queda como 'Borrador'.
  let _timersAutoguardadoInforme = {};
  function autoguardarBorradorInforme(estudianteId, cohorteNombre, mes) {
    const mesHoy = mesActualReal();
    if (mes && mes > mesHoy) return; // Bloquear guardado de meses futuros
    clearTimeout(_timersAutoguardadoInforme[estudianteId]);
    const indicador = document.getElementById('autoguardado_' + estudianteId);
    if (indicador) indicador.textContent = 'Guardando borrador…';
    _timersAutoguardadoInforme[estudianteId] = setTimeout(async () => {
      await guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, 'Borrador');
      const ind = document.getElementById('autoguardado_' + estudianteId);
      if (ind) ind.innerHTML = '<span class="inline-flex items-center gap-1 text-emerald-600 font-medium"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Borrador guardado automáticamente</span>';
    }, 900);
  }
  window.autoguardarBorradorInforme = autoguardarBorradorInforme;

  // Envío de informe con ventana de gracia de 15 minutos para corrección
  async function enviarInformeDocente(estudianteId, cohorteNombre, mes) {
    const doc = getDocente();
    const mesHoy = mesActualReal();
    if (mes && mes > mesHoy) {
      toast(`No puedes enviar informes de un mes futuro (${mesLabel(mes)}). El mes actual es ${mesLabel(mesHoy)}.`, 'err');
      return;
    }
    const mesActualCohorte = await mesActualParaDocenteCohorte(doc.nombre || '', cohorteNombre);
    if (mesActualCohorte && mes !== mesActualCohorte) {
      toast(`Solo se pueden enviar informes del mes actual activo (${mesLabel(mesActualCohorte)}).`, 'err');
      return;
    }

    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    const estNombre = est ? est.nombre : 'este estudiante';

    const informesPrevios = await Store.list('informes_docente');
    const infPrevio = informesPrevios.find(r => 
      coincideDocenteConNombre(r.docente, doc.nombre) && 
      r.estudiante === estNombre && 
      r.cohorte === cohorteNombre && 
      (r.mes === mes || (r.fecha && r.fecha.slice(0, 7) === mes))
    );

    const esReenvio = Boolean(infPrevio && infPrevio.primerEnvioEn);
    const tiempoRestante = esReenvio ? obtenerTiempoRestanteEdicionInforme(infPrevio) : null;

    let mensajeConfirm = '';
    if (esReenvio) {
      const tiempoTxt = (tiempoRestante && tiempoRestante.editable) ? tiempoRestante.texto : 'plazo por expirar';
      mensajeConfirm = `¿Guardar corrección y reenviar el informe de ${estNombre}?\n\nQuedan ${tiempoTxt} de la ventana de 15 minutos para ajustes.`;
    } else {
      mensajeConfirm = `¿Enviar el informe de ${estNombre}?\n\nUna vez enviado, dispondrás de una ventana de hasta 15 minutos para corregir o reabrir el reporte si necesitas realizar ajustes antes del radicado definitivo.`;
    }

    const confirmado = confirm(mensajeConfirm);
    if (!confirmado) return;

    // Animación inmediata de salida de la tarjeta para una respuesta visual instantánea
    const card = document.getElementById('card_informe_' + estudianteId);
    if (card) {
      card.style.transition = 'all 0.35s ease-out';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-12px) scale(0.96)';
      card.style.pointerEvents = 'none';
      setTimeout(() => { try { card.remove(); } catch(e) {} }, 350);
    }

    const registro = await guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, 'Enviado');
    if (registro) {
      if (typeof toast === 'function') {
        if (esReenvio) {
          toast(`Corrección guardada y reenviada: ${registro.estudiante}`, 'ok');
        } else {
          toast(`Informe enviado con éxito: ${registro.estudiante} (dispones de 15 min para editar si lo necesitas)`, 'ok');
        }
      }
    }
    await renderInformesDocente();
  }
  window.enviarInformeDocente = enviarInformeDocente;

  // ---------- Pensum curricular (docente) ----------
  async function renderPensumDocente() {
    const doc = getDocente();
    const items = [...(await Store.list('pensum'))].filter(p => coincideDocenteConNombre(p.docente, doc.nombre)).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const totalHoras = items.reduce((a, p) => a + (Number(p.horas) || 0), 0);

    const rows = items.map(p => `
      <tr data-search="${escapeHtml((p.modulo + ' ' + p.tema).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(p.modulo)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(p.tema)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${p.horas} h</td>
      </tr>`).join('');

    document.getElementById('mount-t-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-ink">Pensum curricular</p>
          <p class="text-xs text-slate2 mt-0.5">${items.length} tema${items.length === 1 ? '' : 's'} asignado${items.length === 1 ? '' : 's'} a tu perfil · ${totalHoras} h en total</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative">
            <input data-table="table-docente-pensum" oninput="TableManager.filter('table-docente-pensum', this.value)" type="text" placeholder="Buscar tema..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs sm:text-sm w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
            <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button onclick="descargarPensumDocente()" ${items.length ? '' : 'disabled'} class="rounded-xl ${items.length ? 'bg-gradient-to-r from-morado to-turquesa text-white hover:opacity-95 shadow-sm' : 'bg-gray-100 text-slate2 cursor-not-allowed'} font-semibold text-xs sm:text-sm py-2 px-4 transition">Descargar PDF</button>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden p-6">
        <div class="table-responsive-container">
          <table id="table-docente-pensum" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Módulo / Asignatura</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad horaria</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes temas asignados en el pensum.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-docente-pensum');
  }

  function descargarPensumDocente() {
    const doc = getDocente();
    // window.open() primero y de forma síncrona (mismo tick del clic) para
    // que el navegador no lo trate como popup bloqueado.
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para descargar el PDF', 'err'); return; }
    Store.list('pensum').then(registros => {
      const items = [...registros].filter(p => coincideDocenteConNombre(p.docente, doc.nombre)).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      if (!items.length) { win.close(); toast('Aún no tienes temas asignados en el pensum', 'info'); return; }
      const filas = items.map(p => `<tr><td>${escapeHtml(p.modulo)}</td><td>${escapeHtml(p.tema)}</td><td>${p.horas} h</td></tr>`).join('');
      win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pensum — ${escapeHtml(doc.nombre || '')}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#14181F;padding:40px;}
        h1{font-size:20px;margin-bottom:4px;} p.sub{color:#5B6472;margin-top:0;margin-bottom:24px;font-size:13px;}
        table{width:100%;border-collapse:collapse;} th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;}
        th{text-transform:uppercase;font-size:11px;letter-spacing:.05em;color:#5B6472;}
        button{margin-bottom:20px;border:none;border-radius:9999px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;background:#14181F;color:#fff;}
        @media print{button{display:none;}}
      </style></head><body>
      <button onclick="window.print()">Descargar / Imprimir</button>
      <h1>Pensum curricular — Fundación A+</h1>
      <p class="sub">Docente: ${escapeHtml(doc.nombre || '')}</p>
      <table><thead><tr><th>Módulo / Asignatura</th><th>Tema</th><th>Intensidad horaria</th></tr></thead><tbody>${filas}</tbody></table>
      </body></html>`);
      win.document.close();
    });
  }

  // ---------- Agenda personal (docente) ----------
  // async: 'agenda_docente' vía MySQL.
  async function renderAgendaDocente() {
    const doc = getDocente();
    const eventos = [...(await Store.list('agenda_docente', { forceRefresh: true }))].filter(a => coincideDocenteConNombre(a.docente, doc.nombre)).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const mount = document.getElementById('mount-t-agenda');
    if (!mount) return;
    mount.innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_t_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          <select id="ag_t_tipo" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
            <option>Clase</option><option>Taller</option><option>Quiz</option><option>Entrega</option><option>Reunión</option><option>Recordatorio</option>
          </select>
          <input id="ag_t_fecha" type="date" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
        </div>
        <button onclick="agregarEventoAgendaDocente()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Agregar</button>
      </div>
      <div class="space-y-3">
        ${eventos.map(a => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(a.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}</p>
            </div>
            <button onclick="eliminarEventoAgendaDocente('${a.id}')" class="text-xs font-semibold text-coral hover:underline shrink-0">Eliminar</button>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes eventos en tu agenda personal.</p>'}
      </div>`;
  }

  // async: 'agenda_docente' vía MySQL.
  async function agregarEventoAgendaDocente() {
    const doc = getDocente();
    const inputTitulo = document.getElementById('ag_t_titulo');
    const inputFecha = document.getElementById('ag_t_fecha');
    const inputTipo = document.getElementById('ag_t_tipo');
    const titulo = inputTitulo ? inputTitulo.value.trim() : '';
    const tipo = inputTipo ? inputTipo.value : 'Recordatorio';
    const fecha = inputFecha ? inputFecha.value : '';
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = await Store.list('agenda_docente', { forceRefresh: true });
    registros.push({ id: uid('ag'), docente: doc.nombre || 'Docente', titulo, tipo, fecha, hora: '', notas: '' });
    await Store.set('agenda_docente', registros);
    if (typeof Store.invalidate === 'function') Store.invalidate('agenda_docente');
    if (inputTitulo) inputTitulo.value = '';
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaDocente();
  }

  // async: 'agenda_docente' vía MySQL.
  async function eliminarEventoAgendaDocente(id) {
    if (!id) return;
    try {
      if (typeof window.apiFetch === 'function') {
        await window.apiFetch('agenda_docente?id=' + encodeURIComponent(id), { method: 'DELETE' }).catch(err => console.warn('[eliminarEventoAgendaDocente apiFetch]', err));
      }
    } catch (e) {
      console.warn('[eliminarEventoAgendaDocente]', e);
    }
    const registros = (await Store.list('agenda_docente', { forceRefresh: true })).filter(a => a.id !== id);
    await Store.set('agenda_docente', registros);
    if (typeof Store.invalidate === 'function') Store.invalidate('agenda_docente');
    toast('Evento eliminado', 'ok');
    renderAgendaDocente();
  }

  // ---------- Memorandos (docente) ----------
  async function renderMemorandosDocente() {
    const doc = (typeof getDocente === 'function' ? getDocente() : null) || {};
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      (typeof memorandosParaUsuarioActual === 'function' ? memorandosParaUsuarioActual() : (typeof window !== 'undefined' && typeof window.memorandosParaUsuarioActual === 'function' ? window.memorandosParaUsuarioActual() : [])),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    const mount = document.getElementById('mount-t-memorandos');
    if (!mount) return;
    const clipSvg = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>';
    mount.innerHTML = `
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
                <p class="text-sm text-slate2 flex items-center gap-1">${m.archivoDatos ? `${clipSvg} ${escapeHtml(m.archivoNombre || 'Documento adjunto')}` : 'Sin archivo adjunto'}</p>
                <p class="text-xs font-semibold text-morado mt-2">Ver memorando en formato de carta →</p>
              </div>
            </div>
          </button>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes memorandos por el momento.</p>'}
      </div>`;
  }
  window.renderMemorandosDocente = renderMemorandosDocente;

  const RENDERERS_DOCENTE = {
    resumen: renderResumenDocente,
    notificaciones: async () => {
      let tries = 0;
      while (tries < 15 && !(typeof window !== 'undefined' && typeof window.renderNotificacionesDocente === 'function')) {
        await new Promise(r => setTimeout(r, 60));
        tries++;
      }
      if (typeof window !== 'undefined' && typeof window.renderNotificacionesDocente === 'function') {
        await window.renderNotificacionesDocente();
      } else if (typeof renderNotificacionesDocente === 'function') {
        await renderNotificacionesDocente();
      }
    },
    perfil: renderPerfilDocente,
    asistencia: async () => { if (typeof renderAsistenciaDocente === 'function') await renderAsistenciaDocente(); else if (typeof window !== 'undefined' && typeof window.renderAsistenciaDocente === 'function') await window.renderAsistenciaDocente(); },
    riesgo: async () => {
      if (typeof window !== 'undefined' && typeof window.renderRiesgoDocente === 'function') {
        await window.renderRiesgoDocente();
      } else if (typeof renderRiesgoDocente === 'function') {
        await renderRiesgoDocente();
      }
    },
    informes: renderInformesDocente,
    modulos: renderHorarioDocente,
    calificaciones: renderCalificacionesDocente,
    pensum: renderPensumDocente,
    memorandos: renderMemorandosDocente,
    pqr: renderPqrDocente,
    agenda: renderAgendaDocente,
    solicitar_equipo: async () => {
      let tries = 0;
      while (tries < 15 && !(typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') && typeof renderSolicitarEquipoForm !== 'function') {
        await new Promise(r => setTimeout(r, 60));
        tries++;
      }
      if (typeof window !== 'undefined' && typeof window.renderSolicitarEquipoForm === 'function') {
        await window.renderSolicitarEquipoForm('mount-t-solicitar_equipo');
      } else if (typeof renderSolicitarEquipoForm === 'function') {
        await renderSolicitarEquipoForm('mount-t-solicitar_equipo');
      }
    },
  };

  // ---------- PQR (docente) ----------
  // Reutiliza subirPqrArchivo() y filaPqrPropia() (definidos en el módulo
  // PQR del panel Estudiante) para no duplicar la lógica de subida de PDF.
  // async: 'pqr' vía MySQL.
  async function renderPqrDocente() {
    const currentDocente = getDocente();
    const doc = currentDocente || {};
    const propias = [...(await Store.list('pqr'))].filter(p => p.solicitante === doc.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-t-pqr').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Enviar una nueva solicitud</p>
        <p class="text-xs text-slate2 mb-4">Adjunta tu petición, queja o reclamo como archivo PDF. Quedará en estado <span class="font-semibold text-ink">Pendiente</span> hasta que el administrador lo descargue.</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Tipo</label>
            <select id="pqr_t_tipo" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asunto</label>
            <input id="pqr_t_asunto" type="text" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
        </div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Archivo PDF</label>
        <input id="pqr_t_archivo" type="file" accept=".pdf,application/pdf" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-morado/15 file:text-morado file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
        <button onclick="enviarPqrDocente()" class="mt-4 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Mis solicitudes</p>
          <div class="relative">
            <input data-table="table-docente-pqr" oninput="TableManager.filter('table-docente-pqr', this.value)" type="text" placeholder="Buscar solicitud..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
            <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-docente-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4" data-no-sort="true">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-docente-pqr');
  }

  async function enviarPqrDocente() {
    const currentDocente = getDocente();
    const doc = currentDocente || {};
    const ok = await subirPqrArchivo({ tipoId: 'pqr_t_tipo', asuntoId: 'pqr_t_asunto', fileId: 'pqr_t_archivo', solicitante: doc.nombre, remitenteRol: 'Docente' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrDocente();
  }


  // Exportar funciones y estado al scope global (window)
  window.docenteModulosActivos = docenteModulosActivos;
  window.docenteEstudiantesDeCohorte = docenteEstudiantesDeCohorte;
  window.expandirFotoPerfil = expandirFotoPerfil;
  window.cerrarLightboxFoto = cerrarLightboxFoto;
  window.renderPerfilDocente = renderPerfilDocente;
  window.actualizarUsuarioDocenteActual = actualizarUsuarioDocenteActual;
  window.actualizarAvatarDocenteEnDom = actualizarAvatarDocenteEnDom;
  window.subirFotoPerfilDocente = subirFotoPerfilDocente;
  window.quitarFotoPerfilDocente = quitarFotoPerfilDocente;
  window.guardarPerfilDocente = guardarPerfilDocente;
  window.renderResumenDocente = renderResumenDocente;
  window.setDocenteHorarioVista = setDocenteHorarioVista;
  window.renderHorarioDocente = renderHorarioDocente;
  window.cambiarDocenteRiesgoCohorte = cambiarDocenteRiesgoCohorte;
  window.renderRiesgoDocente = renderRiesgoDocente;
  window.mesActualReal = mesActualReal;
  window.mesActualParaDocenteCohorte = mesActualParaDocenteCohorte;
  window.migrarNotasModulosSinMes = migrarNotasModulosSinMes;
  window.getNotasModuloRecord = getNotasModuloRecord;
  window.guardarNotasModuloRecord = guardarNotasModuloRecord;
  window.pesoTotalCriterios = pesoTotalCriterios;
  window.calcularNotaFinal = calcularNotaFinal;
  window.calificacionCualitativa = calificacionCualitativa;
  window.colorCualitativa = colorCualitativa;
  window.letraEscalaNota = letraEscalaNota;
  window.docenteCalifOpciones = docenteCalifOpciones;
  window.renderCalificacionesDocente = renderCalificacionesDocente;
  window.cambiarCalifDocente = cambiarCalifDocente;
  window.agregarCriterioCalif = agregarCriterioCalif;
  window.actualizarCriterioCalif = actualizarCriterioCalif;
  window.eliminarCriterioCalif = eliminarCriterioCalif;
  window.guardarNotaCriterio = guardarNotaCriterio;
  window.generarDatosInformeEstudiante = generarDatosInformeEstudiante;
  window.docenteInformesOpciones = docenteInformesOpciones;
  window.cambiarCohorteInformesDocente = cambiarCohorteInformesDocente;
  window.cambiarMesInformesDocente = cambiarMesInformesDocente;
  window.toggleVerInformesEnviadosDocente = toggleVerInformesEnviadosDocente;
  window.iniciarTimerVentanaEdicionSiAplica = iniciarTimerVentanaEdicionSiAplica;
  window.renderInformesDocente = renderInformesDocente;
  window.guardarInformeDocenteInterno = guardarInformeDocenteInterno;
  window.autoguardarBorradorInforme = autoguardarBorradorInforme;
  window.enviarInformeDocente = enviarInformeDocente;
  window.renderPensumDocente = renderPensumDocente;
  window.descargarPensumDocente = descargarPensumDocente;
  window.renderAgendaDocente = renderAgendaDocente;
  window.agregarEventoAgendaDocente = agregarEventoAgendaDocente;
  window.eliminarEventoAgendaDocente = eliminarEventoAgendaDocente;
  window.renderPqrDocente = renderPqrDocente;
  window.enviarPqrDocente = enviarPqrDocente;
  if (!window.RENDERERS_DOCENTE) window.RENDERERS_DOCENTE = {};
  Object.assign(window.RENDERERS_DOCENTE, RENDERERS_DOCENTE);

})();
