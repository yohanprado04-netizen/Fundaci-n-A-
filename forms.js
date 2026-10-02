/* forms.js — constructor de formularios (admin + vista pública) */

const FORMS_TIPOS = [
  { id: 'texto', label: 'Texto corto', placeholder: 'Ingresar texto' },
  { id: 'parrafo', label: 'Párrafo', placeholder: 'Escribe tu respuesta aquí' },
  { id: 'correo', label: 'Correo', placeholder: 'nombre@correo.com' },
  { id: 'numero', label: 'Número', placeholder: 'Solo números. Ej. 3001234567' },
  { id: 'fecha', label: 'Fecha', placeholder: 'AAAA-MM-DD' },
  { id: 'unica', label: 'Opción única', placeholder: 'Selecciona una opción' },
  { id: 'multiple', label: 'Opción múltiple', placeholder: 'Selecciona una o más opciones' },
  { id: 'desplegable', label: 'Lista desplegable', placeholder: 'Selecciona una opción' },
  { id: 'archivo', label: 'Subir archivo', placeholder: 'PDF, imagen, Word o Excel (máx. 8 MB)' },
  { id: 'seccion', label: 'Sección', placeholder: '' },
];

const FORMS_ESTADO_LABEL = {
  borrador: 'Borrador',
  publico: 'Público',
  autenticados: 'Solo autenticados',
  cerrado: 'Cerrado',
};

const FORMS_ESTADO_COLORS = {
  Borrador: { bg: '#5B647214', text: '#5B6472' },
  Público: { bg: '#1FC8C01A', text: '#0f8f89' },
  'Solo autenticados': { bg: '#8B5CF61A', text: '#8B5CF6' },
  Cerrado: { bg: '#F0455C1A', text: '#F0455C' },
  Archivado: { bg: '#5B647214', text: '#5B6472' },
};

let _formsPermisos = { ver: true, crear: true, editar: true, eliminar: true };
let _formsEditor = null;
let _formsVista = 'lista';
let _formsViewsOcultas = [];
let _formsPubPagina = 0;
let _formsPubDef = null;
let _formsPubRespuestas = {};
let _formsPreviewPagina = 0;

function formsUid(prefix) {
  if (typeof uid === 'function') return uid(prefix);
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formsSanitize(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (!['b', 'strong', 'i', 'em', 'u', 'a', 'br'].includes(tag)) {
          const text = document.createTextNode(child.textContent);
          child.replaceWith(text);
          return;
        }
        if (tag === 'a') {
          const href = child.getAttribute('href') || '';
          [...child.attributes].forEach((a) => child.removeAttribute(a.name));
          if (/^https?:\/\//i.test(href)) {
            child.setAttribute('href', href);
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          } else {
            child.replaceWith(document.createTextNode(child.textContent));
            return;
          }
        } else {
          [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        }
        walk(child);
      }
    });
  };
  walk(tmp);
  return tmp.innerHTML;
}

function formsPlain(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').trim();
}

function formsHtml(html) {
  return formsSanitize(html || '');
}

async function formsPermisosActuales() {
  if (typeof currentAdminRole !== 'undefined' && currentAdminRole === 'superadmin') {
    _formsPermisos = { ver: true, crear: true, editar: true, eliminar: true };
    return _formsPermisos;
  }
  if (typeof permisoUsuarioSobrePanel === 'function' && typeof currentAdminUser !== 'undefined') {
    _formsPermisos = await permisoUsuarioSobrePanel(currentAdminUser, 'admin.forms');
  }
  return _formsPermisos;
}

function formsToolbar(targetId) {
  return `<div class="forms-toolbar" data-target="${targetId}">
    <button type="button" title="Negrita" onclick="formsCmd('${targetId}','bold')"><strong>B</strong></button>
    <button type="button" title="Cursiva" onclick="formsCmd('${targetId}','italic')"><em>I</em></button>
    <button type="button" title="Subrayado" onclick="formsCmd('${targetId}','underline')"><span style="text-decoration:underline">U</span></button>
    <button type="button" title="Link" onclick="formsCmd('${targetId}','link')">
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
    </button>
    <button type="button" title="Quitar formato" onclick="formsCmd('${targetId}','removeFormat')">T̲×</button>
  </div>`;
}

function formsCmd(targetId, cmd) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.focus();
  if (cmd === 'link') {
    const url = prompt('URL del enlace (https://...)', 'https://');
    if (!url) return;
    document.execCommand('createLink', false, url);
  } else {
    document.execCommand(cmd, false, null);
  }
}

function formsReadRich(id) {
  const el = document.getElementById(id);
  return el ? formsSanitize(el.innerHTML) : '';
}

function formsTipoLabel(tipo) {
  return (FORMS_TIPOS.find((t) => t.id === tipo) || { label: tipo }).label;
}

function formsPlaceholder(tipo) {
  return (FORMS_TIPOS.find((t) => t.id === tipo) || {}).placeholder || '';
}

function formsPaginas(preguntas) {
  const pags = [{ seccion: null, items: [] }];
  (preguntas || []).forEach((p, i) => {
    if (p.tipo === 'seccion') pags.push({ seccion: p, items: [] });
    else pags[pags.length - 1].items.push({ p, i });
  });
  if (pags.length > 1 && !pags[0].seccion && !pags[0].items.length) pags.shift();
  return pags;
}

function formsHaySecciones(preguntas) {
  return (preguntas || []).some((p) => p.tipo === 'seccion');
}

function formsTieneHistorial() {
  const e = _formsEditor;
  if (!e || !e.id) return false;
  return !!(e.tieneRespuestas || ['publico', 'autenticados', 'cerrado'].includes(e.estado));
}

function formsLinkPublico(slug) {
  return window.location.origin + window.location.pathname.replace(/index\.html$/i, '') + '#formulario/' + encodeURIComponent(slug);
}

function formsToast(msg, kind) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) {
    if (typeof toast === 'function') toast(msg, kind);
    return;
  }
  const el = document.createElement('div');
  const colors = { ok: '#1FC8C0', err: '#F0455C', info: '#8B5CF6' };
  const c = colors[kind] || colors.info;
  el.className = 'bg-gradient-to-r from-morado to-turquesa text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-softLg flex items-center gap-2.5 opacity-0 translate-y-2 transition-all duration-300';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="w-2 h-2 rounded-full shrink-0" style="background:${c}"></span><span>${escapeHtml(msg)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => { el.classList.remove('opacity-0', 'translate-y-2'); });
  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

async function renderFormularios() {
  _formsVista = 'lista';
  await formsPermisosActuales();
  if (_formsEditor) {
    await formsPintarEditor(_formsEditor.id);
    return;
  }
  const lista = await apiFetch('formularios');
  const mount = document.getElementById('mount-formularios');
  if (!mount) return;
  const extra = _formsPermisos.crear
    ? `<button onclick="formsNuevo()" class="btn-glow-primary rounded-xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white text-xs sm:text-sm font-bold px-4 py-2 hover:opacity-95 transition flex items-center gap-1.5 shadow-md shadow-morado/20">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Nuevo
      </button>`
    : '';
  const header = typeof sectionHeader === 'function'
    ? sectionHeader('formularios', 'Forms', 'Crea, publica y restringe formularios. La papelera está en el menú Formularios.', extra, false)
    : `<div class="mb-5"><h2 class="text-lg font-extrabold">Forms</h2></div>`;
  const rows = (lista || []).map((f) => {
    const label = FORMS_ESTADO_LABEL[f.estado] || f.estado;
    const pill = typeof statusPill === 'function' ? statusPill(label, FORMS_ESTADO_COLORS) : label;
    return `<tr class="border-b border-gray-50 hover:bg-gray-50/80" data-search="${escapeHtml((f.tituloPlano || '') + ' ' + f.slug)}">
      <td class="py-3 px-4 text-sm font-semibold text-ink">${formsHtml(f.titulo)}</td>
      <td class="py-3 px-4 text-xs text-slate2">${escapeHtml(f.slug)}</td>
      <td class="py-3 px-4">${pill}</td>
      <td class="py-3 px-4 text-xs text-slate2">${f.preguntasCount} · ${f.respuestasCount} resp.</td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <button onclick="formsAbrirEditor('${f.id}')" class="text-xs font-semibold text-morado hover:underline mr-2">Editar</button>
        ${_formsPermisos.crear ? `<button onclick="formsClonar('${f.id}')" class="text-xs font-semibold text-slate2 hover:text-ink hover:underline mr-2">Clonar</button>` : ''}
        <button onclick="formsVerRespuestas('${f.id}')" class="text-xs font-semibold text-slate2 hover:text-ink hover:underline mr-2">Respuestas</button>
        ${_formsPermisos.eliminar ? `<button onclick="formsArchivar('${f.id}')" class="text-xs font-semibold text-coral hover:underline">Archivar</button>` : ''}
      </td>
    </tr>`;
  }).join('') || (typeof emptyRow === 'function' ? emptyRow(5, 'formularios') : '<tr><td colspan="5" class="py-8 text-center text-sm text-slate2">Aún no hay formularios.</td></tr>');

  mount.innerHTML = `<div class="admin-panel-card overflow-hidden p-6 sm:p-7">
    ${header}
    <div class="table-responsive-container px-0">
      <table id="table-formularios" class="w-full admin-table">
        <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
          <th class="py-3 px-4">Título</th><th class="py-3 px-4">Slug</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4">Actividad</th><th class="py-3 px-4" data-no-sort="true"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function renderFormulariosPapelera() {
  _formsEditor = null;
  await formsPermisosActuales();
  const lista = await apiFetch('formularios?papelera=1');
  const mount = document.getElementById('mount-formulariosPapelera');
  if (!mount) return;
  const header = typeof sectionHeader === 'function'
    ? sectionHeader('formularios-papelera', 'Papelera', 'Formularios archivados. Restaura o destruye de forma definitiva.', '', false)
    : '';
  const rows = (lista || []).map((f) => `<tr class="border-b border-gray-50" data-search="${escapeHtml(f.tituloPlano || '')}">
      <td class="py-3 px-4 text-sm font-semibold text-ink">${formsHtml(f.titulo)}</td>
      <td class="py-3 px-4 text-xs text-slate2">${escapeHtml(f.archivadoEn || '')}</td>
      <td class="py-3 px-4 text-xs text-slate2">${f.respuestasCount} respuestas</td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        ${_formsPermisos.editar ? `<button onclick="formsRestaurar('${f.id}')" class="text-xs font-semibold text-morado hover:underline mr-2">Restaurar</button>` : ''}
        ${_formsPermisos.eliminar ? `<button onclick="formsDestruir('${f.id}')" class="text-xs font-semibold text-coral hover:underline">Destruir</button>` : ''}
      </td>
    </tr>`).join('') || '<tr><td colspan="4" class="py-10 text-center text-sm text-slate2">La papelera está vacía.</td></tr>';
  mount.innerHTML = `<div class="admin-panel-card overflow-hidden p-6 sm:p-7">${header}
    <table id="table-formularios-papelera" class="w-full admin-table">
      <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
        <th class="py-3 px-4">Título</th><th class="py-3 px-4">Archivado</th><th class="py-3 px-4">Respuestas</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function formsPreguntaVacia(tipo) {
  return {
    id: formsUid('fp'),
    tipo: tipo || 'texto',
    titulo: tipo === 'seccion' ? 'Nueva sección' : 'Pregunta sin título',
    ayuda: '',
    obligatoria: tipo !== 'seccion',
    opciones: tipo === 'unica' || tipo === 'multiple' || tipo === 'desplegable' ? ['Opción 1', 'Opción 2'] : [],
  };
}

async function formsNuevo() {
  _formsEditor = {
    id: null,
    titulo: 'Formulario sin título',
    slug: '',
    descripcion: '',
    estado: 'borrador',
    abreEn: '',
    cierraEn: '',
    limitePorUsuario: true,
    limitePorIp: false,
    preguntas: [formsPreguntaVacia('texto')],
    tieneRespuestas: false,
    respuestasCount: 0,
  };
  await formsPintarEditor(null);
}

async function formsAbrirEditor(id) {
  const data = await apiFetch('formularios?id=' + encodeURIComponent(id));
  _formsEditor = data;
  await formsPintarEditor(id);
}

function formsCollect() {
  const e = _formsEditor;
  e.titulo = formsReadRich('formsTitulo');
  e.descripcion = (document.getElementById('formsDescripcion') || {}).value || '';
  e.estado = (document.getElementById('formsEstado') || {}).value || 'borrador';
  e.abreEn = (document.getElementById('formsAbre') || {}).value || '';
  e.cierraEn = (document.getElementById('formsCierra') || {}).value || '';
  e.limitePorUsuario = !!document.getElementById('formsLimiteUser')?.checked;
  e.limitePorIp = !!document.getElementById('formsLimiteIp')?.checked;
  e.preguntas = (e.preguntas || []).map((p, i) => {
    const tituloEl = document.getElementById('formsQTitulo_' + i);
    const titulo = tituloEl ? (formsReadRich('formsQTitulo_' + i) || p.titulo) : p.titulo;
    const ayudaEl = document.getElementById('formsQAyuda_' + i);
    const ayuda = ayudaEl ? ayudaEl.value : (p.ayuda || '');
    const tipoEl = document.getElementById('formsQTipo_' + i);
    const tipo = tipoEl ? tipoEl.value : p.tipo;
    const reqEl = document.getElementById('formsQReq_' + i);
    const obligatoria = reqEl ? !!reqEl.checked : !!p.obligatoria;
    let opciones = p.opciones || [];
    const optEls = document.querySelectorAll('[data-opt="' + i + '"]');
    if (optEls.length) {
      opciones = [...optEls].map((el) => el.value.trim()).filter(Boolean);
    }
    return { ...p, titulo, ayuda, tipo, obligatoria, opciones };
  });
  return e;
}

function formsBloqueado() {
  return false;
}

function formsNumeroPregunta(i) {
  return (_formsEditor.preguntas || []).slice(0, i + 1).filter((p) => p.tipo !== 'seccion').length;
}

function formsCardPregunta(p, i) {
  const locked = formsBloqueado();
  const total = (_formsEditor.preguntas || []).length;
  const posOpts = Array.from({ length: total }, (_, k) => `<option value="${k}" ${k === i ? 'selected' : ''}>${k + 1}</option>`).join('');
  const mover = !locked ? `<label class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate2">
          Pos.
          <select onchange="formsMoverA(${i}, this.value)" class="rounded-lg border border-gray-200 px-1.5 py-1 text-xs font-semibold text-ink normal-case tracking-normal" title="Mover a esta posición">${posOpts}</select>
        </label>
        <button type="button" ${i === 0 ? 'disabled' : ''} class="w-7 h-7 rounded-lg border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" onclick="formsMover(${i},-1)" title="Subir" aria-label="Subir">↑</button>
        <button type="button" ${i === total - 1 ? 'disabled' : ''} class="w-7 h-7 rounded-lg border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" onclick="formsMover(${i},1)" title="Bajar" aria-label="Bajar">↓</button>
        <button type="button" class="text-xs text-coral font-semibold px-1" onclick="formsQuitarPregunta(${i})">Eliminar</button>
        ${p.tipo !== 'seccion' ? `<button type="button" class="text-[10px] font-semibold text-morado px-1" onclick="formsAddSeccionDespues(${i})">Sección debajo</button>` : ''}` : '<span class="text-[10px] text-amber-700">Estructura bloqueada</span>';

  if (p.tipo === 'seccion') {
    return `<div class="forms-seccion-bloque" data-q="${i}" id="formsCard_${i}">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-morado">Sección</span>
        <div class="flex items-center gap-1.5">${mover}</div>
      </div>
      ${locked ? '' : formsToolbar('formsQTitulo_' + i)}
      <div id="formsQTitulo_${i}" contenteditable="${locked ? 'false' : 'true'}" class="forms-rich text-xl font-extrabold text-ink tracking-tight min-h-[2.6rem] rounded-xl border border-gray-200 bg-white px-3 py-2 mb-2">${formsHtml(p.titulo)}</div>
      <input type="hidden" id="formsQTipo_${i}" value="seccion" />
      <p class="text-xs text-slate2">Desde aquí continúa el formulario. Las preguntas de abajo pertenecen a esta sección.</p>
    </div>`;
  }

  const esOpciones = ['unica', 'multiple', 'desplegable'].includes(p.tipo);
  const opts = (p.opciones || []).map((o, j) => `<input data-opt="${i}" class="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm mb-1" value="${escapeHtml(o)}" ${locked ? 'readonly' : ''} placeholder="Opción ${j + 1}" />`).join('');
  return `<div class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 mb-3" data-q="${i}" id="formsCard_${i}">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate2">Pregunta ${formsNumeroPregunta(i)}</span>
      <div class="flex items-center gap-1.5">${mover}</div>
    </div>
    ${locked ? '' : formsToolbar('formsQTitulo_' + i)}
    <div id="formsQTitulo_${i}" contenteditable="${locked ? 'false' : 'true'}" class="forms-rich min-h-[2.2rem] rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-ink mb-2 ${locked ? 'bg-gray-50 cursor-default' : ''}">${formsHtml(p.titulo)}</div>
    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <label class="text-[11px] font-semibold text-slate2">Tipo</label>
        <select id="formsQTipo_${i}" ${locked ? 'disabled' : ''} onchange="formsCambiarTipo(${i}, this.value)" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
          ${FORMS_TIPOS.map((t) => `<option value="${t.id}" ${t.id === p.tipo ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <label class="flex items-center gap-2 mt-6 text-sm text-ink"><input id="formsQReq_${i}" type="checkbox" ${p.obligatoria ? 'checked' : ''} ${locked ? 'disabled' : ''} class="rounded border-gray-300 text-morado"/> Obligatoria</label>
    </div>
    <input id="formsQAyuda_${i}" ${locked ? 'readonly' : ''} class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs ${locked ? 'bg-gray-50' : ''}" placeholder="Texto de ayuda (opcional)" value="${escapeHtml(p.ayuda || '')}" />
    ${esOpciones ? `<div class="mt-3"><p class="text-[11px] font-semibold text-slate2 mb-1">Opciones</p>${opts}${!locked ? `<button type="button" class="text-xs font-semibold text-morado mt-1" onclick="formsAddOpcion(${i})">+ Opción</button>` : ''}</div>` : ''}
  </div>`;
}

async function formsPintarEditor(id) {
  await formsPermisosActuales();
  const e = _formsEditor;
  const mount = document.getElementById('mount-formularios');
  if (!mount || !e) return;
  const historial = formsTieneHistorial();
  const link = e.slug ? formsLinkPublico(e.slug) : '';
  const lockedNote = historial
    ? `<p class="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">Versión editable: puedes cambiar enunciados y el tipo de cada campo. Las respuestas ya enviadas siguen ligadas al mismo ID de pregunta. No elimines una pregunta con envíos (celdas huérfanas); si necesitas un historial limpio, <button type="button" class="font-bold underline" onclick="formsClonar('${e.id}')">clónalo</button>.</p>`
    : `<p class="text-xs text-slate2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-4">Puedes editar preguntas y tipos en cualquier momento. Si ya hay respuestas, no borres esas preguntas: cambia el texto o el tipo, o clona el formulario.</p>`;
  mount.innerHTML = `<div class="admin-panel-card p-5 sm:p-7">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
      <button type="button" onclick="_formsEditor=null; renderFormularios()" class="text-sm font-semibold text-slate2 hover:text-ink">Volver atrás</button>
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="formsTogglePreview()" class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold">Vista previa</button>
        ${e.id ? `<button type="button" onclick="formsVerRespuestas('${e.id}')" class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold">Respuestas</button>` : ''}
        ${e.id && _formsPermisos.crear ? `<button type="button" onclick="formsClonar('${e.id}')" class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold">Clonar</button>` : ''}
        ${_formsPermisos.editar || _formsPermisos.crear ? `<button type="button" onclick="formsGuardar()" class="btn-glow-primary rounded-xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white text-xs font-bold px-4 py-2">Guardar</button>` : ''}
      </div>
    </div>
    ${lockedNote}
    ${formsToolbar('formsTitulo')}
    <div id="formsTitulo" contenteditable="true" class="forms-rich text-xl font-extrabold text-ink tracking-tight min-h-[2.6rem] rounded-xl border border-gray-200 px-3 py-2 mb-4">${formsHtml(e.titulo)}</div>
    <div class="grid sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="text-[11px] font-semibold text-slate2">Estado</label>
        <select id="formsEstado" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
          ${Object.entries(FORMS_ESTADO_LABEL).map(([k, v]) => `<option value="${k}" ${e.estado === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-[11px] font-semibold text-slate2">Link</label>
        ${link
          ? `<a id="formsLink" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="Abrir formulario publicado" class="mt-1 flex w-full items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-morado hover:bg-morado/5 truncate" onclick="formsCopiarEnlace()">${escapeHtml(link)}</a>`
          : `<div class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate2 select-none cursor-not-allowed">Se genera al guardar</div>`}
      </div>
      <div>
        <label class="text-[11px] font-semibold text-slate2">Fecha apertura</label>
        <input id="formsAbre" type="datetime-local" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value="${escapeHtml((e.abreEn || '').replace(' ', 'T').slice(0, 16))}" />
      </div>
      <div>
        <label class="text-[11px] font-semibold text-slate2">Fecha cierre</label>
        <input id="formsCierra" type="datetime-local" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value="${escapeHtml((e.cierraEn || '').replace(' ', 'T').slice(0, 16))}" />
      </div>
    </div>
    <textarea id="formsDescripcion" rows="2" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-4" placeholder="Descripción interna / instrucciones">${escapeHtml(e.descripcion || '')}</textarea>
    <div class="mb-5">
      <p class="text-[11px] font-semibold text-slate2">Restricciones</p>
      <div class="mt-2 flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2"><input id="formsLimiteUser" type="checkbox" ${e.limitePorUsuario ? 'checked' : ''} class="rounded border-gray-300 text-morado"/> Una respuesta por usuario/correo</label>
        <label class="flex items-center gap-2"><input id="formsLimiteIp" type="checkbox" ${e.limitePorIp ? 'checked' : ''} class="rounded border-gray-300 text-morado"/> Una respuesta por IP</label>
      </div>
    </div>
    <div id="formsPreguntas"></div>
    <div class="mt-2 flex flex-col sm:flex-row gap-2">
      <button type="button" onclick="formsAddPregunta()" class="rounded-xl border border-dashed border-morado/40 text-morado text-sm font-semibold px-4 py-2.5 flex-1 hover:bg-morado/5">+ Agregar pregunta</button>
      <button type="button" onclick="formsAddSeccion()" class="rounded-xl border border-dashed border-gray-300 text-slate2 text-sm font-semibold px-4 py-2.5 hover:bg-gray-50">+ Nueva sección</button>
    </div>
    <div id="formsPreviewBox" class="hidden mt-6 border-t border-gray-100 pt-5"></div>
  </div>`;
  formsRenderPreguntas();
}

function formsSyncFromDom() {
  if (_formsEditor) formsCollect();
}

function formsRenderPreguntas() {
  const box = document.getElementById('formsPreguntas');
  if (!box || !_formsEditor) return;
  (_formsEditor.preguntas || []).forEach((p, idx) => { p.orden = idx; });
  box.innerHTML = (_formsEditor.preguntas || []).map(formsCardPregunta).join('');
}

function formsScrollPregunta(i) {
  const el = document.getElementById('formsCard_' + i);
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function formsReordenar(desde, hasta) {
  if (formsBloqueado()) return false;
  formsSyncFromDom();
  const arr = _formsEditor.preguntas || [];
  const i = Number(desde);
  const j = Number(hasta);
  if (!Number.isInteger(i) || !Number.isInteger(j) || i === j || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
    return false;
  }
  const [item] = arr.splice(i, 1);
  arr.splice(j, 0, item);
  formsRenderPreguntas();
  formsScrollPregunta(j);
  return true;
}

function formsAddPregunta() {
  formsSyncFromDom();
  _formsEditor.preguntas.push(formsPreguntaVacia('texto'));
  formsRenderPreguntas();
  formsScrollPregunta(_formsEditor.preguntas.length - 1);
}

function formsAddSeccion() {
  formsSyncFromDom();
  const at = (_formsEditor.preguntas || []).length;
  _formsEditor.preguntas.push(formsPreguntaVacia('seccion'));
  _formsEditor.preguntas.push(formsPreguntaVacia('texto'));
  formsRenderPreguntas();
  formsScrollPregunta(at);
}

function formsAddSeccionDespues(i) {
  formsSyncFromDom();
  _formsEditor.preguntas.splice(i + 1, 0, formsPreguntaVacia('seccion'));
  formsRenderPreguntas();
  formsScrollPregunta(i + 1);
}

function formsQuitarPregunta(i) {
  formsSyncFromDom();
  const p = _formsEditor.preguntas[i];
  if (_formsEditor.tieneRespuestas && p && p.id) {
    if (!confirm('Si esta pregunta ya tiene respuestas, el servidor impedirá borrarla para no dejar celdas huérfanas. ¿Quitar de todas formas?')) return;
  }
  _formsEditor.preguntas.splice(i, 1);
  formsRenderPreguntas();
}

function formsMover(i, dir) {
  formsReordenar(i, i + dir);
}

function formsMoverA(i, dest) {
  if (!formsReordenar(i, dest)) formsRenderPreguntas();
}

function formsCambiarTipo(i, tipo) {
  const prev = (_formsEditor.preguntas[i] || {}).tipo;
  formsSyncFromDom();
  const p = _formsEditor.preguntas[i];
  if (_formsEditor.tieneRespuestas && prev !== tipo) {
    if (!confirm('Ya hay respuestas. El tipo nuevo vale para envíos futuros; los anteriores quedan en el formato viejo, ligados al mismo ID. ¿Cambiar tipo?')) {
      p.tipo = prev;
      formsRenderPreguntas();
      return;
    }
  }
  p.tipo = tipo;
  if (tipo === 'seccion') {
    p.obligatoria = false;
    p.opciones = [];
    if (!formsPlain(p.titulo) || p.titulo === 'Pregunta sin título') p.titulo = 'Nueva sección';
  } else if (['unica', 'multiple', 'desplegable'].includes(tipo) && (!p.opciones || p.opciones.length < 2)) {
    p.opciones = ['Opción 1', 'Opción 2'];
  }
  formsRenderPreguntas();
}

function formsAddOpcion(i) {
  formsSyncFromDom();
  _formsEditor.preguntas[i].opciones = _formsEditor.preguntas[i].opciones || [];
  _formsEditor.preguntas[i].opciones.push('Opción ' + (_formsEditor.preguntas[i].opciones.length + 1));
  formsRenderPreguntas();
}

function formsTogglePreview() {
  formsSyncFromDom();
  const box = document.getElementById('formsPreviewBox');
  if (!box) return;
  box.classList.toggle('hidden');
  if (!box.classList.contains('hidden')) {
    _formsPreviewPagina = 0;
    formsPintarPreview();
  }
}

function formsPintarPreview() {
  const box = document.getElementById('formsPreviewBox');
  if (!box || !_formsEditor) return;
  const pags = formsPaginas(_formsEditor.preguntas);
  const multi = formsHaySecciones(_formsEditor.preguntas) && pags.length > 1;
  const idx = multi ? Math.max(0, Math.min(_formsPreviewPagina, pags.length - 1)) : 0;
  _formsPreviewPagina = idx;
  const last = idx >= pags.length - 1;
  const nav = multi
    ? `<div class="mt-8 flex items-stretch gap-5">
        ${idx > 0 ? `<button type="button" class="rounded-2xl border border-gray-200 text-ink font-semibold py-2.5 px-6 min-w-[8.5rem] text-sm" onclick="_formsPreviewPagina--; formsPintarPreview()">Atrás</button>` : ''}
        ${last
          ? `<button type="button" class="flex-1 rounded-2xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white font-bold py-2.5 text-sm" onclick="formsToast('Así se finalizaría el formulario', 'ok')">Finalizar</button>`
          : `<button type="button" class="flex-1 rounded-2xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white font-bold py-2.5 text-sm" onclick="_formsPreviewPagina++; formsPintarPreview()">Siguiente</button>`}
      </div>`
    : '';
  box.innerHTML = `<p class="text-xs font-bold uppercase tracking-wider text-slate2 mb-3">Vista previa</p>${formsRenderCampos(_formsEditor, true, multi ? idx : null)}${nav}`;
}

function formsDtLocalToSql(v) {
  if (!v) return '';
  return v.replace('T', ' ') + (v.length === 16 ? ':00' : '');
}

async function formsCopiarEnlace() {
  const slug = _formsEditor && _formsEditor.slug;
  if (!slug) return;
  const link = formsLinkPublico(slug);
  try {
    await navigator.clipboard.writeText(link);
    toast('Enlace copiado', 'ok');
  } catch (err) {
    toast('No se pudo copiar el enlace', 'err');
  }
}

async function formsGuardar() {
  formsSyncFromDom();
  const e = _formsEditor;
  const payload = {
    accion: e.id ? 'actualizar' : 'crear',
    id: e.id,
    titulo: e.titulo,
    slug: e.slug,
    descripcion: e.descripcion,
    estado: e.estado,
    abreEn: formsDtLocalToSql(e.abreEn),
    cierraEn: formsDtLocalToSql(e.cierraEn),
    limitePorUsuario: e.limitePorUsuario,
    limitePorIp: e.limitePorIp,
    preguntas: e.preguntas,
  };
  try {
    const saved = await apiFetch('formularios', { method: 'POST', body: JSON.stringify(payload) });
    _formsEditor = saved;
    if (saved.estado === 'publico') toast('Formulario publicado. El enlace ya está activo.', 'ok');
    else if (saved.estado === 'autenticados') toast('Formulario publicado para usuarios con sesión.', 'ok');
    else toast('Formulario guardado', 'ok');
    await formsPintarEditor(saved.id);
  } catch (err) {
    toast(err.message || 'No se pudo guardar', 'err');
  }
}

async function formsClonar(id) {
  try {
    await apiFetch('formularios', { method: 'POST', body: JSON.stringify({ accion: 'clonar', id }) });
    _formsEditor = null;
    await renderFormularios();
    formsToast('Clonado exitoso', 'ok');
  } catch (err) {
    formsToast(err.message || 'No se pudo clonar', 'err');
  }
}

async function formsArchivar(id) {
  if (!confirm('¿Archivar este formulario? Pasará a la papelera.')) return;
  await apiFetch('formularios', { method: 'POST', body: JSON.stringify({ accion: 'archivar', id }) });
  toast('Enviado a la papelera', 'ok');
  _formsEditor = null;
  renderFormularios();
}

async function formsRestaurar(id) {
  await apiFetch('formularios', { method: 'POST', body: JSON.stringify({ accion: 'restaurar', id }) });
  toast('Restaurado como borrador', 'ok');
  renderFormulariosPapelera();
}

async function formsDestruir(id) {
  if (!confirm('Esto borra el formulario y todas sus respuestas de forma permanente. ¿Continuar?')) return;
  await apiFetch('formularios', { method: 'POST', body: JSON.stringify({ accion: 'destruir', id }) });
  toast('Eliminado definitivamente', 'ok');
  renderFormulariosPapelera();
}

async function formsVerRespuestas(id) {
  const data = await apiFetch('formularios?respuestas=1&id=' + encodeURIComponent(id));
  const mount = document.getElementById('mount-formularios');
  const preguntas = (data.preguntas || []).filter((p) => p.tipo !== 'seccion');
  const rows = (data.respuestas || []).map((r) => {
    const cells = preguntas.map((p) => {
      const v = (r.valores || {})[p.id];
      if (!v) return '<td class="py-2 px-3 text-xs text-slate2" title="">—</td>';
      if (v.tieneArchivo) {
        const nom = v.archivoNombre || 'archivo';
        return `<td class="py-2 px-3 text-xs" title="${escapeHtml(nom)}">${escapeHtml(nom)}</td>`;
      }
      if (v.json) {
        const txt = (v.json || []).join(', ');
        return `<td class="py-2 px-3 text-xs" title="${escapeHtml(txt)}">${escapeHtml(txt)}</td>`;
      }
      const txt = v.texto || '';
      return `<td class="py-2 px-3 text-xs" title="${escapeHtml(txt)}">${escapeHtml(txt)}</td>`;
    }).join('');
    return `<tr class="border-b border-gray-50"><td class="py-2 px-3 text-xs">${escapeHtml(r.enviadoEn || '')}</td><td class="py-2 px-3 text-xs" title="${escapeHtml(r.email || '')}">${escapeHtml(r.email || '')}</td>${cells}</tr>`;
  }).join('') || `<tr><td colspan="${preguntas.length + 2}" class="py-8 text-center text-sm text-slate2">Sin respuestas todavía.</td></tr>`;
  mount.innerHTML = `<div class="admin-panel-card overflow-hidden p-5 sm:p-6 min-w-0 max-w-full">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <button type="button" onclick="formsAbrirEditor('${id}')" class="text-sm font-semibold text-slate2">← Volver al editor</button>
      <button type="button" onclick="formsDescargarCsv('${id}')" class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold">Exportar CSV</button>
    </div>
    <h2 class="text-lg font-extrabold text-ink mb-1">${formsHtml(data.formulario.titulo)}</h2>
    <p class="text-xs text-slate2 mb-4">${data.respuestas.length} respuesta(s)</p>
    <div class="table-responsive-container forms-respuestas-scroll px-0">
      <table class="admin-table text-left forms-respuestas-table">
        <thead><tr class="text-xs font-bold uppercase text-slate2 border-b">
          <th class="py-2 px-3">Enviado</th><th class="py-2 px-3">Correo</th>
          ${preguntas.map((p) => `<th class="py-2 px-3" title="${escapeHtml(formsPlain(p.titulo))}">${escapeHtml(formsPlain(p.titulo))}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

async function formsDescargarCsv(id) {
  try {
    const resp = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/formularios?csv=1&id=' + encodeURIComponent(id), {
      headers: typeof getAuthToken === 'function' && getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {},
    });
    if (!resp.ok) throw new Error('No se pudo exportar');
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'formulario.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    toast(err.message, 'err');
  }
}

function formsRenderCampos(def, preview, paginaIdx) {
  const disabled = preview ? 'disabled' : '';
  const pags = formsPaginas(def.preguntas);
  const multi = formsHaySecciones(def.preguntas) && pags.length > 1 && paginaIdx != null;
  const pag = multi ? (pags[paginaIdx] || pags[0]) : null;
  let html = `<div class="space-y-4">`;
  if ((!multi || paginaIdx === 0) && def.descripcion) html += `<p class="text-sm text-slate2">${escapeHtml(def.descripcion)}</p>`;
  if (multi && pag && pag.seccion) html += `<h3 class="text-xl font-extrabold text-ink tracking-tight">${formsHtml(pag.seccion.titulo)}</h3>`;
  if (!multi) {
    (def.preguntas || []).forEach((p) => {
      if (p.tipo === 'seccion') {
        html += `<div class="pt-6 mt-2 border-t border-gray-200"><h3 class="text-xl font-extrabold text-ink tracking-tight">${formsHtml(p.titulo)}</h3></div>`;
        return;
      }
      html += formsHtmlCampo(p, disabled);
    });
  } else {
    (pag.items || []).forEach(({ p }) => { html += formsHtmlCampo(p, disabled); });
  }
  html += '</div>';
  return html;
}

function formsHtmlCampo(p, disabled) {
  const req = p.obligatoria ? '<span class="text-coral">*</span>' : '';
  const help = p.ayuda ? `<p class="text-xs text-slate2 mt-1">${escapeHtml(p.ayuda)}</p>` : '';
  const ph = escapeHtml(formsPlaceholder(p.tipo));
  let field = '';
  if (p.tipo === 'parrafo') field = `<textarea ${disabled} data-qid="${p.id}" rows="4" placeholder="${ph}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"></textarea>`;
  else if (p.tipo === 'correo') field = `<input ${disabled} data-qid="${p.id}" type="email" inputmode="email" autocomplete="email" placeholder="${ph}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />`;
  else if (p.tipo === 'numero') field = `<input ${disabled} data-qid="${p.id}" type="number" inputmode="numeric" placeholder="${ph}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />`;
  else if (p.tipo === 'fecha') field = `<input ${disabled} data-qid="${p.id}" type="date" placeholder="${ph}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /><p class="text-xs text-slate2 mt-1">${ph}</p>`;
  else if (p.tipo === 'unica') field = `<p class="text-xs text-slate2 mt-1">${ph}</p>` + (p.opciones || []).map((o) => `<label class="flex items-center gap-2 text-sm mt-1"><input ${disabled} type="radio" name="q_${p.id}" value="${escapeHtml(o)}"/> ${escapeHtml(o)}</label>`).join('');
  else if (p.tipo === 'multiple') field = `<p class="text-xs text-slate2 mt-1">${ph}</p>` + (p.opciones || []).map((o) => `<label class="flex items-center gap-2 text-sm mt-1"><input ${disabled} type="checkbox" data-qid="${p.id}" value="${escapeHtml(o)}"/> ${escapeHtml(o)}</label>`).join('');
  else if (p.tipo === 'desplegable') field = `<select ${disabled} data-qid="${p.id}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">${ph || 'Selecciona una opción'}</option>${(p.opciones || []).map((o) => `<option>${escapeHtml(o)}</option>`).join('')}</select>`;
  else if (p.tipo === 'archivo') field = `<input ${disabled} data-qid="${p.id}" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx" class="mt-1 w-full text-sm" /><p class="text-xs text-slate2 mt-1">${ph}</p>`;
  else field = `<input ${disabled} data-qid="${p.id}" type="text" placeholder="${ph}" class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />`;
  return `<div><label class="text-sm font-semibold text-ink">${formsHtml(p.titulo)} ${req}</label>${help}${field}</div>`;
}

function formsLeerArchivo(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 8 * 1024 * 1024) return reject(new Error('El archivo no puede superar 8 MB'));
    const reader = new FileReader();
    reader.onload = () => resolve({ nombre: file.name, mime: file.type, datos: reader.result });
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function formsPubLeerPagina() {
  const def = _formsPubDef;
  if (!def) return;
  const pags = formsPaginas(def.preguntas);
  const multi = formsHaySecciones(def.preguntas) && pags.length > 1;
  const lista = multi ? ((pags[_formsPubPagina] || {}).items || []) : (def.preguntas || []).map((p, i) => ({ p, i })).filter(({ p }) => p.tipo !== 'seccion');
  for (const { p } of lista) {
    if (p.tipo === 'unica') {
      const sel = document.querySelector('input[name="q_' + p.id + '"]:checked');
      _formsPubRespuestas[p.id] = sel ? sel.value : '';
    } else if (p.tipo === 'multiple') {
      _formsPubRespuestas[p.id] = [...document.querySelectorAll('input[data-qid="' + p.id + '"]:checked')].map((el) => el.value);
    } else if (p.tipo === 'archivo') {
      const input = document.querySelector('input[data-qid="' + p.id + '"]');
      _formsPubRespuestas[p.id] = await formsLeerArchivo(input && input.files && input.files[0]);
    } else {
      const input = document.querySelector('[data-qid="' + p.id + '"]');
      _formsPubRespuestas[p.id] = input ? input.value : '';
    }
  }
  const emailEl = document.getElementById('formsPubEmail');
  if (emailEl) def._email = emailEl.value;
}

function formsPubPaginaOk() {
  const def = _formsPubDef;
  const err = document.getElementById('formsPubError');
  const mostrar = (msg) => { if (err) { err.textContent = msg; err.classList.remove('hidden'); } return false; };
  if (_formsPubPagina === 0) {
    const emailEl = document.getElementById('formsPubEmail');
    if (emailEl && !emailEl.value.trim()) return mostrar('Indica tu correo');
  }
  const pags = formsPaginas(def.preguntas);
  const multi = formsHaySecciones(def.preguntas) && pags.length > 1;
  const lista = multi ? ((pags[_formsPubPagina] || {}).items || []) : (def.preguntas || []).map((p, i) => ({ p, i })).filter(({ p }) => p.tipo !== 'seccion');
  for (const { p } of lista) {
    if (!p.obligatoria) continue;
    const v = _formsPubRespuestas[p.id];
    const vacio = p.tipo === 'multiple' ? !v || !v.length : (p.tipo === 'archivo' ? !v : (v === '' || v == null));
    if (vacio) return mostrar('Completa los campos obligatorios antes de continuar');
  }
  if (err) err.classList.add('hidden');
  return true;
}

async function formsPubPaso(dir) {
  await formsPubLeerPagina();
  if (dir > 0 && !formsPubPaginaOk()) return;
  const pags = formsPaginas(_formsPubDef.preguntas);
  _formsPubPagina = Math.max(0, Math.min(pags.length - 1, _formsPubPagina + dir));
  formsPubPintarCuerpo();
}

function formsPubRestaurarValores() {
  const def = _formsPubDef;
  if (!def) return;
  const emailEl = document.getElementById('formsPubEmail');
  if (emailEl && def._email) emailEl.value = def._email;
  const pags = formsPaginas(def.preguntas);
  const multi = formsHaySecciones(def.preguntas) && pags.length > 1;
  const lista = multi ? ((pags[_formsPubPagina] || {}).items || []) : [];
  for (const { p } of lista) {
    const v = _formsPubRespuestas[p.id];
    if (v == null || v === '') continue;
    if (p.tipo === 'unica') {
      document.querySelectorAll('input[name="q_' + p.id + '"]').forEach((el) => { el.checked = el.value === v; });
    } else if (p.tipo === 'multiple' && Array.isArray(v)) {
      document.querySelectorAll('input[data-qid="' + p.id + '"]').forEach((el) => { el.checked = v.includes(el.value); });
    } else if (p.tipo !== 'archivo') {
      const input = document.querySelector('[data-qid="' + p.id + '"]');
      if (input) input.value = v;
    }
  }
}

function formsPubPintarCuerpo() {
  const def = _formsPubDef;
  const campos = document.getElementById('formsPubCampos');
  const nav = document.getElementById('formsPubNav');
  const emailWrap = document.getElementById('formsPubEmailWrap');
  if (!def || !campos) return;
  const pags = formsPaginas(def.preguntas);
  const multi = formsHaySecciones(def.preguntas) && pags.length > 1;
  const idx = multi ? _formsPubPagina : 0;
  campos.innerHTML = formsRenderCampos(def, false, multi ? idx : null);
  formsPubRestaurarValores();
  if (emailWrap) emailWrap.classList.toggle('hidden', multi && idx !== 0);
  const last = !multi || idx >= pags.length - 1;
  if (nav) {
    nav.innerHTML = `${multi && idx > 0 ? `<button type="button" class="rounded-2xl border border-gray-200 text-ink font-semibold py-3.5 px-6 min-w-[8.5rem]" onclick="formsPubPaso(-1)">Atrás</button>` : ''}
      ${last
        ? `<button type="submit" class="flex-1 rounded-2xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white font-bold py-3.5">${multi ? 'Finalizar' : 'Enviar'}</button>`
        : `<button type="button" class="flex-1 rounded-2xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white font-bold py-3.5" onclick="formsPubPaso(1)">Siguiente</button>`}`;
  }
}

async function formsEnviarPublico(slug, def) {
  await formsPubLeerPagina();
  if (!formsPubPaginaOk()) throw new Error(document.getElementById('formsPubError')?.textContent || 'Completa el formulario');
  const emailEl = document.getElementById('formsPubEmail');
  const body = { slug, email: (emailEl && emailEl.value) || def._email || '', respuestas: _formsPubRespuestas };
  return apiFetch('formulario_publico', { method: 'POST', body: JSON.stringify(body) });
}

async function formsMostrarPublico(slug) {
  const view = document.getElementById('formularioPublicoView');
  const card = document.getElementById('formularioPublicoCard');
  if (!view || !card) return;
  _formsViewsOcultas = [];
  ['siteView', 'dashboardView', 'teacherView', 'studentView', 'qrView'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) {
      _formsViewsOcultas.push(id);
      el.classList.add('hidden');
    }
  });
  view.classList.remove('hidden');
  window.scrollTo(0, 0);
  card.innerHTML = `<div class="bg-white rounded-3xl shadow-soft p-8 text-center text-sm text-slate2">Cargando formulario…</div>`;
  try {
    const def = await apiFetch('formulario_publico?slug=' + encodeURIComponent(slug));
    if (!def.disponible) {
      card.innerHTML = `<div class="bg-white rounded-3xl shadow-soft p-8 text-center">
        <h1 class="text-xl font-extrabold text-ink mb-2">${formsHtml(def.titulo || 'Formulario')}</h1>
        <p class="text-sm text-slate2 mb-4">${escapeHtml(def.motivo || 'No disponible')}</p>
        ${def.requiereAuth ? `<a href="#calificaciones" class="inline-flex rounded-full bg-gradient-to-r from-morado to-turquesa text-white text-sm font-semibold px-5 py-2.5" onclick="sessionStorage.setItem('formsReturnHash', location.hash)">Iniciar sesión</a>` : `<a href="#inicio" class="text-sm font-semibold text-morado">Volver al inicio</a>`}
      </div>`;
      return;
    }
    const logged = typeof getAuthToken === 'function' && getAuthToken();
    _formsPubDef = def;
    _formsPubPagina = 0;
    _formsPubRespuestas = {};
    card.innerHTML = `<div class="bg-white rounded-3xl shadow-soft p-6 sm:p-9">
      <p class="text-xs font-bold uppercase tracking-[0.2em] text-morado mb-2">Fundación A+</p>
      <h1 class="text-2xl font-extrabold text-ink mb-4">${formsHtml(def.titulo)}</h1>
      <form id="formsPubForm" class="space-y-1">
        ${!logged ? `<div id="formsPubEmailWrap"><input id="formsPubEmail" type="email" inputmode="email" autocomplete="email" placeholder="nombre@correo.com" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-4" /></div>` : '<div id="formsPubEmailWrap" class="hidden"></div>'}
        <div id="formsPubCampos"></div>
        <div id="formsPubNav" class="mt-10 flex items-stretch gap-5"></div>
      </form>
      <p id="formsPubError" class="hidden text-xs text-coral mt-3"></p>
    </div>`;
    formsPubPintarCuerpo();
    document.getElementById('formsPubForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const err = document.getElementById('formsPubError');
      try {
        await formsEnviarPublico(slug, def);
        card.innerHTML = `<div class="bg-white rounded-3xl shadow-soft p-10 text-center">
          <h2 class="text-xl font-extrabold text-ink mb-2">Respuesta enviada</h2>
          <p class="text-sm text-slate2">Gracias. Ya registramos tu formulario.</p>
        </div>`;
      } catch (e) {
        err.textContent = e.message || 'No se pudo enviar';
        err.classList.remove('hidden');
      }
    });
  } catch (err) {
    card.innerHTML = `<div class="bg-white rounded-3xl shadow-soft p-8 text-center"><p class="text-sm text-coral">${escapeHtml(err.message || 'No encontrado')}</p></div>`;
  }
}

function formsCerrarPublico() {
  const view = document.getElementById('formularioPublicoView');
  if (view) view.classList.add('hidden');
  if (_formsViewsOcultas.length) {
    _formsViewsOcultas.forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
  } else {
    document.getElementById('siteView')?.classList.remove('hidden');
  }
}

function formsRutaHash() {
  const h = (location.hash || '').replace(/^#/, '');
  const m = h.match(/^formulario\/([^/?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function formsOnHash() {
  const slug = formsRutaHash();
  if (slug) formsMostrarPublico(slug);
  else formsCerrarPublico();
}

window.addEventListener('hashchange', formsOnHash);
window.addEventListener('DOMContentLoaded', () => {
  const pending = sessionStorage.getItem('formsReturnHash');
  if (pending && typeof getAuthToken === 'function' && getAuthToken()) {
    sessionStorage.removeItem('formsReturnHash');
    location.hash = pending;
  }
  formsOnHash();
});

if (typeof RENDERERS === 'object' && RENDERERS) {
  RENDERERS.formularios = renderFormularios;
  RENDERERS.formulariosPapelera = renderFormulariosPapelera;
}
