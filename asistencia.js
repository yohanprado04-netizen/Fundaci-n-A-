/**
 * asistencia.js — Módulo de Control de Asistencia, Justificaciones y Códigos QR
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Generación y regeneración de tokens y códigos QR interactivos por cohorte y docente
 * 2. Visualización, copiado e impresión de códigos QR de aula
 * 3. Detección y validación de tokens efímeros anti-fraude y escaneo móvil (?qr=...)
 * 4. Registro de asistencia en vivo, control de tiempos de gracia y cálculo de horas
 * 5. Radicación de justificaciones médicas/laborales con soporte y visor de evidencia
 * 6. Landing de asistencia móvil estilo Google Forms con confirmación visual
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  let currentDocente = null;
  let currentEstudiante = null;
  const getDocente = () => (typeof window !== 'undefined' && typeof window.getCurrentDocente === 'function' ? window.getCurrentDocente() : (typeof window !== 'undefined' && window.currentDocente ? window.currentDocente : currentDocente));
  const getEstudiante = () => (typeof window !== 'undefined' && typeof window.getCurrentEstudiante === 'function' ? window.getCurrentEstudiante() : (typeof window !== 'undefined' && window.currentEstudiante ? window.currentEstudiante : currentEstudiante));

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

  const cursoDeDocenteEnCohorte = async (...args) => (typeof window !== 'undefined' && typeof window.cursoDeDocenteEnCohorte === 'function' ? await window.cursoDeDocenteEnCohorte(...args) : 'Curso asignado');
  const docenteEstudiantesDeCohorte = async (cohorte) => {
    if (typeof window !== 'undefined' && typeof window.docenteEstudiantesDeCohorte === 'function') return await window.docenteEstudiantesDeCohorte(cohorte);
    return (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && u.cohorte === cohorte);
  };
  const docenteModulosActivos = async () => {
    if (typeof window !== 'undefined' && typeof window.docenteModulosActivos === 'function') return await window.docenteModulosActivos();
    const doc = getDocente() || {};
    if (!doc.nombre) return [];
    const modulos = await Store.list('modulos');
    const pertenece = await Promise.all(modulos.map(m => (typeof window !== 'undefined' && window.docentesDeCohorte) ? window.docentesDeCohorte(m.nombre) : []));
    return modulos.filter((m, i) => pertenece[i] && pertenece[i].includes(doc.nombre));
  };
  const franjasActivas = (h) => (typeof window !== 'undefined' && typeof window.franjasActivas === 'function' ? window.franjasActivas(h) : (h && h.franjas ? h.franjas.filter(f => f.estado !== 'Inactivo') : []));
  const renderAsistenciaEstudiante = async (...args) => {
    if (typeof window !== 'undefined' && typeof window.renderAsistenciaEstudiante === 'function') return await window.renderAsistenciaEstudiante(...args);
  };

  function dataURItoBlob(dataURI, defaultMime = 'application/octet-stream') {
    if (!dataURI || !dataURI.includes(',')) return null;
    const parts = dataURI.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : defaultMime;
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  function descargarArchivoDirecto(url, nombre = 'archivo', mimeType = '') {
    if (!url) return;
    if (url.startsWith('data:')) {
      const blob = dataURItoBlob(url, mimeType);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const Store = {
    get: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[asistencia] window.Store no disponible'); return s.get(col, opts); },
    list: (col, opts) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[asistencia] window.Store no disponible'); return s.list(col, opts); },
    save: (col, item) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[asistencia] window.Store no disponible'); return s.save(col, item); },
    set: (col, items) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) throw new Error('[asistencia] window.Store no disponible'); return s.set(col, items); },
    invalidate: (col) => { const s = (typeof window !== 'undefined' && window.Store) || null; if (!s) return; return s.invalidate(col); }
  };

  // ---------- Códigos QR reales de asistencia (imprimibles y reutilizables) ----------
  // Cada cohorte tiene DOS códigos QR ESTABLES (se generan una sola vez y no
  // cambian día a día — se imprimen y listo, "al otro día es lo mismo"):
  //  - QR del DOCENTE: al abrirlo (escaneándolo con la cámara) activa la
  //    sesión de asistencia de HOY para esa cohorte.
  //  - QR del ESTUDIANTE: al abrirlo, pide el correo con el que fue
  //    registrado en el sistema y aplica su asistencia según la hora.
  // Ambos códigos codifican una URL real a esta misma página
  // (?qr=docente|estudiante&t=TOKEN) para que abrirlos con la cámara de un
  // celular funcione de verdad en cuanto el sitio esté publicado en una URL.
  function fechaHoyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }

  function horaHoyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${dia} ${h}:${min}:${s}`;
  }

  // async: 'qr_tokens' vía MySQL.
  // Genera un token aleatorio nuevo CADA DÍA para evitar fraude.
  // Los códigos QR de días anteriores expiran automáticamente.
  async function getOrCrearTokenQR(tipo, cohorteNombre, docenteNombre, forzarNuevo = false) {
    const hoy = fechaHoyLocal();
    const tokens = await Store.list('qr_tokens');
    let rec = tokens.find(t => t.tipo === tipo && t.cohorte === cohorteNombre && t.docente === docenteNombre);

    // Si ya existe y corresponde a hoy (y no se forzó nueva generación), reutilizar el de hoy
    if (rec && rec.fecha === hoy && !forzarNuevo) {
      return rec.token;
    }

    // Si no existía, o es de un día anterior, o se forzó regeneración:
    // Generar un token aleatorio completamente nuevo para el día de hoy
    const nuevoToken = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    if (rec) {
      rec.token = nuevoToken;
      rec.fecha = hoy;
    } else {
      rec = { id: uid('qr'), tipo, cohorte: cohorteNombre, docente: docenteNombre, token: nuevoToken, fecha: hoy };
      tokens.push(rec);
    }
    await Store.set('qr_tokens', tokens);
    return rec.token;
  }

  async function regenerarTokensQRCohorte(cohorteNombre, docenteNombre) {
    if (!confirm('¿Deseas generar nuevos códigos QR aleatorios para hoy? Los códigos anteriores quedarán invalidados de inmediato.')) return;
    const hoy = fechaHoyLocal();
    const tokens = await Store.list('qr_tokens');

    const nuevoTokenDoc = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    let recDoc = tokens.find(t => t.tipo === 'docente' && t.cohorte === cohorteNombre && t.docente === docenteNombre);
    if (recDoc) {
      recDoc.token = nuevoTokenDoc;
      recDoc.fecha = hoy;
    } else {
      tokens.push({ id: uid('qr'), tipo: 'docente', cohorte: cohorteNombre, docente: docenteNombre, token: nuevoTokenDoc, fecha: hoy });
    }

    const nuevoTokenEst = Math.random().toString(36).slice(2, 10) + (Date.now() + 7).toString(36).slice(-4);
    let recEst = tokens.find(t => t.tipo === 'estudiante' && t.cohorte === cohorteNombre && t.docente === docenteNombre);
    if (recEst) {
      recEst.token = nuevoTokenEst;
      recEst.fecha = hoy;
    } else {
      tokens.push({ id: uid('qr'), tipo: 'estudiante', cohorte: cohorteNombre, docente: docenteNombre, token: nuevoTokenEst, fecha: hoy });
    }

    await Store.set('qr_tokens', tokens);

    // Nota antifraude: la hora de inicio de la sesión de hoy nunca se altera; la clase solo se activa una vez al día.
    toast('¡Códigos QR renovados con éxito! Los anteriores han expirado.', 'ok');

    if (typeof renderCodigosQr === 'function') await renderCodigosQr();
    if (typeof renderAsistenciaDocente === 'function') await renderAsistenciaDocente();
  }
  window.regenerarTokensQRCohorte = regenerarTokensQRCohorte;

  // El curso que dicta un docente específico dentro de una cohorte, según
  // el Horario (solo franjas Activas). Si el docente tiene varias franjas,
  // se usa la primera como etiqueta.
  // async: 'horarios' vía MySQL.
  async function materiaDeDocenteEnCohorte(cohorteNombre, docenteNombre) {
    const horarios = (await Store.list('horarios')).filter(h => h.cohorte === cohorteNombre);
    for (const h of horarios) {
      const franja = franjasActivas(h).find(f => f.docente === docenteNombre && f.curso);
      if (franja) return franja.curso;
    }
    return null;
  }

  function urlQr(tipo, token, forzarLocal = false) {
    let origin = location.origin;
    // Si estamos en localhost y es para un código QR (que se escaneará desde un celular),
    // debemos usar la IP de la red local para que el celular no intente conectarse a sí mismo.
    if (!forzarLocal && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      const lanIp = (typeof window !== 'undefined' && window.SERVER_LAN_IP) ? window.SERVER_LAN_IP : '192.168.1.26';
      origin = location.protocol + '//' + lanIp + (location.port ? ':' + location.port : '');
    }
    return origin + location.pathname + '?qr=' + tipo + '&t=' + token;
  }

  function copiarLinkQr(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        if (typeof toast === 'function') toast('Enlace copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para el celular:', url);
      });
    } else {
      prompt('Copia este enlace para el celular:', url);
    }
  }
  window.copiarLinkQr = copiarLinkQr;

  // Dibuja un QR real (librería qrcodejs, cargada en index.html) dentro de divId.
  function pintarQrImprimible(divId, texto) {
    const cont = document.getElementById(divId);
    if (!cont) return;
    cont.innerHTML = '';
    if (typeof QRCode === 'undefined') {
      cont.innerHTML = '<p class="text-xs text-coral px-2">No se pudo cargar la librería de códigos QR (revisa tu conexión a internet).</p>';
      return;
    }
    new QRCode(cont, { text: texto, width: 152, height: 152, correctLevel: QRCode.CorrectLevel.M });
  }

  // Abre una ventana lista para imprimir/descargar el QR ya dibujado en divId.
  function imprimirQr(titulo, subtitulo, divId) {
    const cont = document.getElementById(divId);
    const el = cont ? cont.querySelector('img, canvas') : null;
    const src = el ? (el.tagName === 'CANVAS' ? el.toDataURL('image/png') : el.src) : '';
    if (!src) { toast('El código QR aún no está listo, espera un momento', 'err'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para imprimir el QR', 'err'); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#14181F;text-align:center;padding:60px 20px;}
      h1{font-size:20px;margin-bottom:4px;} p{color:#5B6472;font-size:13px;margin-top:0;}
      img{margin:28px 0;width:260px;height:260px;}
      button{margin-top:10px;border:none;border-radius:9999px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;background:#14181F;color:#fff;}
      @media print{button{display:none;}}
    </style></head><body>
    <button onclick="window.print()">Descargar / Imprimir</button>
    <h1>${escapeHtml(titulo)}</h1>
    <p>${escapeHtml(subtitulo)}</p>
    <img src="${src}" alt="Código QR" />
    <p>Fundación A+ — Training de 100 a 1000+</p>
    </body></html>`);
    win.document.close();
  }

  // ---------- Asistencia automatizada por código de sesión (docente + estudiante) ----------
  // El docente "habilita" el código de la sesión de hoy para su cohorte
  // (equivalente a mostrar el QR en el salón). A partir de esa hora de
  // inicio, el sistema calcula el estado de cada estudiante SOLO con el
  // tiempo transcurrido — nadie marca asistencia manualmente:
  //   0–20 min desde el inicio   -> Puntual (Presente)
  //   20–50 min desde el inicio  -> Tarde
  //   +50 min sin escanear       -> Ausente (Falla), se registra solo
  const VENTANA_PUNTUAL_MIN = 20;
  const VENTANA_TARDE_MIN = 50; // 20 + 30 minutos de tolerancia

  // ---------- No Repudio: Token Dinámico Efímero con Tolerancia Deslizante ----------
  // Evita reenvío de fotos por WhatsApp: el token cambia cada 15 segundos.
  // Para garantizar que nadie en el aula se quede por fuera por lentitud de conexión,
  // el validador acepta el token actual y los 3 anteriores (60 segundos de gracia).
  const TOKEN_ROTATIVO_SEGUNDOS = 15;

  function calcularTokenEfimeroSesion(codigoBase, timestamp = Date.now(), paso = TOKEN_ROTATIVO_SEGUNDOS) {
    if (!codigoBase) return 'APLUS';
    const ventana = Math.floor(timestamp / (paso * 1000));
    const semilla = String(codigoBase) + '_' + ventana;
    let hash = 0;
    for (let i = 0; i < semilla.length; i++) {
      hash = ((hash << 5) - hash) + semilla.charCodeAt(i);
      hash |= 0;
    }
    const alfabeto = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let token = '';
    let n = Math.abs(hash);
    for (let j = 0; j < 5; j++) {
      token += alfabeto[n % alfabeto.length];
      n = Math.floor(n / alfabeto.length);
    }
    return token;
  }
  window.calcularTokenEfimeroSesion = calcularTokenEfimeroSesion;

  function validarTokenSesionConGracia(codigoIngresado, codigoBase, paso = TOKEN_ROTATIVO_SEGUNDOS, ventanasGracia = 3) {
    if (!codigoIngresado || !codigoBase) return false;
    const normalizado = String(codigoIngresado).trim().toUpperCase();
    if (normalizado === String(codigoBase).trim().toUpperCase()) return true;
    const ahora = Date.now();
    for (let offset = 0; offset <= ventanasGracia; offset++) {
      const t = calcularTokenEfimeroSesion(codigoBase, ahora - (offset * paso * 1000), paso);
      if (normalizado === t) return true;
    }
    return false;
  }
  window.validarTokenSesionConGracia = validarTokenSesionConGracia;

  // ---------- Control de Justificaciones de Inasistencia (Foto / PDF) ----------
  let archivoJustificacionTemporal = null;

  function manejarSeleccionArchivoJustificacion(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      toast('El archivo supera el tamaño máximo permitido (3.5 MB). Comprime la imagen o PDF.', 'err');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      archivoJustificacionTemporal = {
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        tamano: file.size,
        base64: e.target.result
      };
      const label = document.getElementById('justFileLabel');
      if (label) {
        label.textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
        label.className = 'text-xs font-bold text-emerald-700';
      }
    };
    reader.readAsDataURL(file);
  }
  window.manejarSeleccionArchivoJustificacion = manejarSeleccionArchivoJustificacion;

  function abrirModalJustificarAsistencia(asistId, fecha, materia, docente) {
    archivoJustificacionTemporal = null;
    const modal = document.getElementById('modalJustificarAsistencia');
    if (!modal) return;
    document.getElementById('justInputAsistId').value = asistId || '';
    document.getElementById('justInputFecha').value = fecha || '';
    document.getElementById('justInputMateria').value = materia || '';
    document.getElementById('justInputDocente').value = docente || '';
    document.getElementById('justInfoClase').textContent = (materia || 'Materia') + ' · ' + fmtDate(fecha) + (docente ? (' (Docente: ' + docente + ')') : '');
    document.getElementById('justTextareaDetalle').value = '';
    const fileInput = document.getElementById('justFileInput');
    if (fileInput) fileInput.value = '';
    const label = document.getElementById('justFileLabel');
    if (label) {
      label.textContent = 'Seleccionar Foto o documento PDF';
      label.className = 'text-xs font-bold text-morado';
    }
    modal.classList.remove('hidden');
  }
  window.abrirModalJustificarAsistencia = abrirModalJustificarAsistencia;

  function cerrarModalJustificarAsistencia() {
    const modal = document.getElementById('modalJustificarAsistencia');
    if (modal) modal.classList.add('hidden');
    archivoJustificacionTemporal = null;
  }
  window.cerrarModalJustificarAsistencia = cerrarModalJustificarAsistencia;

  async function enviarJustificacionEstudiante() {
    const asistId = document.getElementById('justInputAsistId').value;
    const fecha = document.getElementById('justInputFecha').value;
    const materia = document.getElementById('justInputMateria').value;
    const docente = document.getElementById('justInputDocente').value;
    const motivo = document.getElementById('justSelectMotivo').value;
    const detalle = (document.getElementById('justTextareaDetalle').value || '').trim();
    const estudiante = estudianteNombre();

    if (!detalle && !archivoJustificacionTemporal) {
      toast('Por favor agrega una breve descripción o adjunta un soporte (foto/PDF).', 'err');
      return;
    }

    const nuevoRegistro = {
      id: uid('just'),
      asistenciaId: asistId,
      asistencia_id: asistId,
      estudiante,
      fecha,
      materia,
      docente,
      motivo,
      detalle,
      archivoNombre: archivoJustificacionTemporal ? archivoJustificacionTemporal.nombre : null,
      archivoTipo: archivoJustificacionTemporal ? archivoJustificacionTemporal.tipo : null,
      archivoBase64: archivoJustificacionTemporal ? archivoJustificacionTemporal.base64 : null,
      estado: 'Pendiente',
      creadoEn: new Date().toISOString()
    };
    await Store.save('justificaciones_asistencia', nuevoRegistro);

    cerrarModalJustificarAsistencia();
    toast('Justificación radicada exitosamente. Tu docente y la administración la revisarán.', 'ok');
    if (typeof renderAsistenciaEstudiante === 'function') renderAsistenciaEstudiante();
  }
  window.enviarJustificacionEstudiante = enviarJustificacionEstudiante;

  // Visor de justificación para Docente y Admin
  async function abrirModalVisorJustificacion(justId) {
    let justificaciones = await Store.list('justificaciones_asistencia');
    if (!Array.isArray(justificaciones) || justificaciones.length === 0) {
      justificaciones = SEED.justificaciones_asistencia || [];
    }
    const just = justificaciones.find(j => j.id === justId);
    if (!just) { toast('Justificación no encontrada', 'err'); return; }

    const modal = document.getElementById('modalVisorJustificacion');
    if (!modal) return;

    document.getElementById('visorJustId').value = just.id;
    const ini = (just.estudiante || 'E').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
    document.getElementById('visorJustIniciales').textContent = ini;
    document.getElementById('visorJustEstudiante').textContent = just.estudiante;
    document.getElementById('visorJustSubtitulo').textContent = `${escapeHtml(just.materia)} · ${fmtDate(just.fecha)}`;
    document.getElementById('visorJustMotivo').textContent = just.motivo || 'Motivo no especificado';
    document.getElementById('visorJustDescripcion').textContent = just.detalle || just.comentario || '(Sin descripción adicional)';

    const estadoBadge = document.getElementById('visorJustEstadoBadge');
    if (just.estado === 'Aprobada') {
      estadoBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';
      estadoBadge.textContent = 'Aprobada';
    } else if (just.estado === 'Rechazada') {
      estadoBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800';
      estadoBadge.textContent = 'Rechazada';
    } else {
      estadoBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800';
      estadoBadge.textContent = 'En revisión';
    }

    const contArchivo = document.getElementById('visorJustContenedorArchivo');
    const archivoSrc = just.archivoBase64 || just.archivoDatos;
    if (archivoSrc) {
      const esImg = (just.archivoTipo && (just.archivoTipo.startsWith('image/') || just.archivoTipo.includes('svg'))) || (archivoSrc.startsWith('data:image/'));
      if (esImg) {
        contArchivo.innerHTML = `
          <img src="${archivoSrc}" alt="Evidencia médica" class="max-h-60 rounded-xl object-contain shadow-xs border border-gray-100 mb-2 cursor-pointer hover:opacity-95 transition" onclick="abrirEvidenciaJustificacion('${just.id}')" />
          <p class="text-[11px] font-bold text-slate2">Haz clic sobre la imagen para verla en tamaño completo</p>`;
      } else {
        contArchivo.innerHTML = `
          <div class="p-4 flex flex-col items-center">
            <div class="w-12 h-14 bg-red-100 border border-red-200 rounded-lg flex flex-col items-center justify-center mb-2">
              <span class="text-red-700 font-extrabold text-xs">PDF</span>
            </div>
            <p class="text-xs font-bold text-ink">${escapeHtml(just.archivoNombre || 'Documento soporte.pdf')}</p>
            <div class="flex items-center gap-2 mt-2">
              <button type="button" onclick="abrirEvidenciaJustificacion('${just.id}')" class="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-ink text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
                <span>Abrir en nueva pestaña</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </button>
              <button type="button" onclick="descargarEvidenciaJustificacion('${just.id}')" class="px-3.5 py-1.5 rounded-full bg-morado text-white text-xs font-bold hover:bg-morado/90 transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
                <span>Descargar</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </button>
            </div>
          </div>`;
      }
    } else {
      contArchivo.innerHTML = '<p class="text-xs text-slate2 italic py-4">No se adjuntó archivo fotográfico ni documento PDF.</p>';
    }

    // Botones de acción según rol
    const contAcciones = document.getElementById('visorJustAcciones');
    const esPendiente = just.estado === 'Pendiente';
    if (esPendiente) {
      contAcciones.innerHTML = `
        <button type="button" onclick="cerrarModalVisorJustificacion()" class="px-4 py-2 rounded-full text-xs font-semibold text-slate2 hover:text-ink hover:bg-gray-100 transition cursor-pointer">
          Cerrar
        </button>
        <button type="button" onclick="window.rechazarJustificacionDocente('${just.id}')" class="px-4 py-2 rounded-full text-xs font-bold text-coral hover:bg-coral/10 transition cursor-pointer">
          Rechazar Justificación
        </button>
        <button type="button" onclick="window.aprobarJustificacionDocente('${just.id}')" class="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer inline-flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          <span>Aprobar como Falla Justificada</span>
        </button>`;
    } else {
      contAcciones.innerHTML = `
        <button type="button" onclick="cerrarModalVisorJustificacion()" class="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-ink text-xs font-bold transition cursor-pointer">
          Cerrar Visor
        </button>`;
    }

    modal.classList.remove('hidden');
  }
  window.abrirModalVisorJustificacion = abrirModalVisorJustificacion;

  async function abrirEvidenciaJustificacion(justId) {
    const justificaciones = await Store.list('justificaciones_asistencia');
    const just = justificaciones.find(j => j.id === justId);
    if (!just) return;
    const url = just.archivoBase64 || just.archivoDatos;
    if (!url) return;
    if (url.startsWith('data:')) {
      const blob = dataURItoBlob(url, just.archivoTipo || 'application/pdf');
      if (blob) {
        window.open(URL.createObjectURL(blob), '_blank');
        return;
      }
    }
    window.open(url, '_blank');
  }
  window.abrirEvidenciaJustificacion = abrirEvidenciaJustificacion;

  async function descargarEvidenciaJustificacion(justId) {
    const justificaciones = await Store.list('justificaciones_asistencia');
    const just = justificaciones.find(j => j.id === justId);
    if (!just) return;
    const url = just.archivoBase64 || just.archivoDatos;
    if (!url) return;
    descargarArchivoDirecto(url, just.archivoNombre || 'soporte_excusa.pdf', just.archivoTipo || '');
  }
  window.descargarEvidenciaJustificacion = descargarEvidenciaJustificacion;

  function cerrarModalVisorJustificacion() {
    const modal = document.getElementById('modalVisorJustificacion');
    if (modal) modal.classList.add('hidden');
  }
  window.cerrarModalVisorJustificacion = cerrarModalVisorJustificacion;

  async function aprobarJustificacionDocente(justId) {
    const justificaciones = await Store.list('justificaciones_asistencia', { forceRefresh: true });
    const just = justificaciones.find(j => j.id === justId);
    if (!just) return;

    just.estado = 'Aprobada';
    just.resueltoPor = (currentDocente && currentDocente.nombre) || (currentAdmin && currentAdmin.nombre) || 'Docente';
    just.resueltoEn = new Date().toISOString();
    await Store.save('justificaciones_asistencia', just);

    // Actualizar registro de asistencia a 'Justificada'
    const asistencias = await Store.list('asistencia', { forceRefresh: true });
    const match = asistencias.find(a =>
      (just.asistenciaId && a.id === just.asistenciaId) ||
      (a.estudiante === just.estudiante && a.fecha === just.fecha && (a.modulo === just.materia || a.materia === just.materia))
    );
    if (match) {
      match.estado = 'Justificada';
      match.motivoAjuste = 'Justificada por soporte: ' + just.motivo;
      await Store.save('asistencia', match);
    }

    cerrarModalVisorJustificacion();
    toast('Justificación aprobada: el estudiante ahora tiene Falla Justificada sin penalización.', 'ok');
    if (typeof renderAsistenciaDocente === 'function') renderAsistenciaDocente();
  }
  window.aprobarJustificacionDocente = aprobarJustificacionDocente;

  async function rechazarJustificacionDocente(justId) {
    const motivoRechazo = prompt('Indica el motivo del rechazo para que el estudiante lo conozca:', 'Soporte ilegible o no corresponde a la fecha');
    if (motivoRechazo === null) return;

    const justificaciones = await Store.list('justificaciones_asistencia', { forceRefresh: true });
    const just = justificaciones.find(j => j.id === justId);
    if (!just) return;

    just.estado = 'Rechazada';
    just.comentarioResolucion = motivoRechazo;
    just.resueltoPor = (currentDocente && currentDocente.nombre) || (currentAdmin && currentAdmin.nombre) || 'Docente';
    just.resueltoEn = new Date().toISOString();
    await Store.save('justificaciones_asistencia', just);

    cerrarModalVisorJustificacion();
    toast('Justificación rechazada.', 'info');
    if (typeof renderAsistenciaDocente === 'function') renderAsistenciaDocente();
  }
  window.rechazarJustificacionDocente = rechazarJustificacionDocente;

  // ---------- Control de Permanencia & Ajuste de Horas en Aula (Docente) ----------
  function abrirModalAjusteHorasDocente(estudianteNombre, sesionId, horasActuales, motivoActual, estadoActual) {
    const modal = document.getElementById('modalAjusteHorasDocente');
    if (!modal) return;

    document.getElementById('ajusteDocEstudianteInput').value = estudianteNombre;
    document.getElementById('ajusteDocSesionIdInput').value = sesionId || '';
    document.getElementById('ajusteDocEstudianteNombre').textContent = `Estudiante: ${estudianteNombre}`;
    document.getElementById('ajusteDocMotivoInput').value = motivoActual || '';

    const h = (horasActuales !== undefined && horasActuales !== null && !isNaN(horasActuales)) ? Number(horasActuales) : 4.0;
    document.getElementById('ajusteDocHorasInput').value = h.toFixed(1);
    actualizarCalculoHorasDocente(h);

    modal.classList.remove('hidden');
  }
  window.abrirModalAjusteHorasDocente = abrirModalAjusteHorasDocente;

  function cerrarModalAjusteHorasDocente() {
    const modal = document.getElementById('modalAjusteHorasDocente');
    if (modal) modal.classList.add('hidden');
  }
  window.cerrarModalAjusteHorasDocente = cerrarModalAjusteHorasDocente;

  function actualizarCalculoHorasDocente(val) {
    const num = Math.min(4.0, Math.max(0, parseFloat(val) || 0));
    const pct = Math.round((num / 4.0) * 100);
    const span = document.getElementById('ajusteDocPctCalculado');
    if (span) span.textContent = `${pct}% de asistencia`;
  }
  window.actualizarCalculoHorasDocente = actualizarCalculoHorasDocente;

  function setPresetAjusteHoras(tipo) {
    const inputH = document.getElementById('ajusteDocHorasInput');
    const inputM = document.getElementById('ajusteDocMotivoInput');
    if (tipo === 'COMPLETO') {
      inputH.value = '4.0';
      inputM.value = 'Presencia física completa verificada por docente';
    } else if (tipo === 'RETIRO') {
      inputH.value = '1.5';
      inputM.value = 'Retiro temprano del aula a mitad de clase';
    } else if (tipo === 'TARDIO') {
      inputH.value = '2.5';
      inputM.value = 'Llegada tardía presencial (no escaneó QR pero asistió)';
    } else if (tipo === 'AUSENTE') {
      inputH.value = '0.0';
      inputM.value = 'Ausente en aula (anulación de QR por suplantación/falta)';
    }
    actualizarCalculoHorasDocente(inputH.value);
  }
  window.setPresetAjusteHoras = setPresetAjusteHoras;

  async function guardarAjusteHorasDocente() {
    const estudianteNombre = document.getElementById('ajusteDocEstudianteInput').value;
    const sesionId = document.getElementById('ajusteDocSesionIdInput').value;
    const horas = Math.min(4.0, Math.max(0, parseFloat(document.getElementById('ajusteDocHorasInput').value) || 0));
    const motivo = (document.getElementById('ajusteDocMotivoInput').value || '').trim();
    const hoy = fechaHoyLocal();

    const registros = await Store.list('asistencia', { forceRefresh: true });
    let match = registros.find(r => r.estudiante === estudianteNombre && (r.sesionId === sesionId || r.fecha === hoy));

    let nuevoEstado = 'Presente';
    if (horas >= 3.8) nuevoEstado = 'Presente';
    else if (horas >= 2.0) nuevoEstado = (motivo.toLowerCase().includes('retiro') ? 'Asistencia Parcial' : 'Tarde');
    else if (horas > 0) nuevoEstado = 'Asistencia Parcial';
    else nuevoEstado = 'Falla';

    if (match) {
      match.estado = nuevoEstado;
      match.horasCumplidas = horas;
      match.motivoAjuste = motivo;
      match.ajustadoPorDocente = true;
    } else {
      registros.push({
        id: uid('as'),
        estudiante: estudianteNombre,
        sesionId,
        fecha: hoy,
        estado: nuevoEstado,
        horasCumplidas: horas,
        motivoAjuste: motivo,
        ajustadoPorDocente: true,
        automatico: false
      });
    }

    await Store.set('asistencia', registros);
    cerrarModalAjusteHorasDocente();
    toast(`Novedad guardada para ${estudianteNombre}: ${horas.toFixed(1)} hrs (${nuevoEstado}).`, 'ok');
    if (typeof renderAsistenciaDocente === 'function') renderAsistenciaDocente();
  }
  window.guardarAjusteHorasDocente = guardarAjusteHorasDocente;

  async function confirmarTodosPresentesDocente(sesionId) {
    if (!sesionId) return;
    const registros = await Store.list('asistencia', { forceRefresh: true });
    let actualizados = 0;
    registros.forEach(r => {
      if (r.sesionId === sesionId && (r.estado === 'Presente' || r.estado === 'Tarde')) {
        r.horasCumplidas = (r.horasCumplidas !== undefined) ? r.horasCumplidas : (r.estado === 'Presente' ? 4.0 : 3.0);
        r.verificadoAula = true;
        actualizados++;
      }
    });
    if (actualizados > 0) {
      await Store.set('asistencia', registros);
      toast(`Doble Check completado: presencia física confirmada para ${actualizados} estudiantes.`, 'ok');
      if (typeof renderAsistenciaDocente === 'function') renderAsistenciaDocente();
    } else {
      toast('No hay registros activos para confirmar en este momento.', 'info');
    }
  }
  window.confirmarTodosPresentesDocente = confirmarTodosPresentesDocente;

  function generarCodigoSesion() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  // async: 'sesiones_asistencia' vía MySQL.
  async function sesionAsistenciaHoy(cohorteNombre, docenteNombre) {
    const hoy = fechaHoyLocal();
    return (await Store.list('sesiones_asistencia')).find(s => s.cohorte === cohorteNombre && s.fecha === hoy && s.iniciadaPor === docenteNombre) || null;
  }

  function minutosTranscurridos(horaInicioStr) {
    if (!horaInicioStr) return 0;
    const s = String(horaInicioStr).trim();
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    const diffMs = Date.now() - d.getTime();
    return Math.max(0, diffMs / 60000);
  }

  function estadoPorTiempo(mins) {
    if (mins <= VENTANA_PUNTUAL_MIN) return 'Presente';
    if (mins <= VENTANA_TARDE_MIN) return 'Tarde';
    return 'Falla';
  }

  // ASISTENCIA AUTOMÁTICA: Solo cuando la ventana de tolerancia expira (> 50 min)
  // se registran las inasistencias definitivas ('Falla').
  // Los estudiantes nuevos que ingresaron a la plataforma después del inicio de la sesión
  // NO se marcan como Falla.
  // async: 'asistencia' vía MySQL.
  async function sincronizarAusentesSesion(sesion, estudiantesCohorte) {
    if (!sesion || !estudiantesCohorte || !estudiantesCohorte.length) return;
    const horaInicioRaw = sesion.horaInicio || sesion.hora_inicio;
    const mins = minutosTranscurridos(horaInicioRaw);
    // Si la sesión aún está dentro de los 50 minutos de tolerancia, no se registran fallas definitivas
    if (mins <= VENTANA_TARDE_MIN) return;

    const registros = await Store.list('asistencia', { forceRefresh: true });
    let cambiado = false;
    const horaSesionStr = horaInicioRaw ? (horaInicioRaw.includes('T') ? horaInicioRaw : horaInicioRaw.replace(' ', 'T')) : (sesion.fecha + 'T00:00:00');
    const tsSesion = new Date(horaSesionStr).getTime();
    const sesFechaDate = sesion.fecha || '';

    estudiantesCohorte.forEach(e => {
      // Si el estudiante se registró DESPUÉS de que inició la sesión o en fecha posterior, no se le penaliza
      const fechaReg = (e.creadoEn || e.creado_en || '').trim();
      if (fechaReg) {
        const fechaRegDate = fechaReg.slice(0, 10);
        if (sesFechaDate && fechaRegDate > sesFechaDate) return;
        const tsReg = new Date(fechaReg.includes('T') ? fechaReg : fechaReg.replace(' ', 'T')).getTime();
        if (tsReg > tsSesion) return;
      }
      const yaTiene = registros.some(r => r.estudiante === e.nombre && (r.sesionId === sesion.id || (r.fecha === sesion.fecha && (r.materia === sesion.materia || r.modulo === sesion.modulo))));
      if (!yaTiene) {
        registros.push({
          id: uid('as'),
          estudiante: e.nombre,
          modulo: sesion.modulo,
          docente: sesion.iniciadaPor,
          materia: sesion.materia || sesion.modulo,
          fecha: sesion.fecha,
          estado: 'Falla',
          sesionId: sesion.id,
          automatico: true
        });
        cambiado = true;
      }
    });
    if (cambiado) await Store.set('asistencia', registros);
  }

  function estadoVentanaSesion(sesion) {
    const mins = minutosTranscurridos(sesion.horaInicio || sesion.hora_inicio);
    if (mins <= VENTANA_PUNTUAL_MIN) return { texto: `Ventana de puntualidad activa — quedan ${Math.ceil(VENTANA_PUNTUAL_MIN - mins)} min`, color: '#0f8f89' };
    if (mins <= VENTANA_TARDE_MIN) return { texto: `Ventana de tolerancia (llegada tarde) activa — quedan ${Math.ceil(VENTANA_TARDE_MIN - mins)} min`, color: '#b5790f' };
    return { texto: 'Sesión cerrada — quien no escaneó quedó como ausente (Falla definitiva)', color: '#F0455C' };
  }

  // async: 'asistencia' vía MySQL.
  async function estadoActualEstudianteSesion(sesion, estudianteNombreVal, asistListPreloaded = null, estudianteObj = null) {
    if (!sesion) return { estado: 'Sin sesión', automatico: false };
    const list = asistListPreloaded || (await Store.list('asistencia'));
    const horaInicioRaw = sesion.horaInicio || sesion.hora_inicio;
    const mins = minutosTranscurridos(horaInicioRaw);

    // Verificar si el estudiante ingresó a la institución después de la sesión
    if (estudianteObj) {
      const fechaReg = (estudianteObj.creadoEn || estudianteObj.creado_en || '').trim();
      if (fechaReg) {
        const fechaRegDate = fechaReg.slice(0, 10);
        if (sesion.fecha && fechaRegDate > sesion.fecha) {
          return { estado: 'No aplica', automatico: false };
        }
        const tsReg = new Date(fechaReg.includes('T') ? fechaReg : fechaReg.replace(' ', 'T')).getTime();
        const horaSesionStr = horaInicioRaw ? (horaInicioRaw.includes('T') ? horaInicioRaw : horaInicioRaw.replace(' ', 'T')) : (sesion.fecha + 'T00:00:00');
        const tsSesion = new Date(horaSesionStr).getTime();
        if (tsReg > tsSesion) {
          return { estado: 'No aplica', automatico: false };
        }
      }
    }

    const todos = list.filter(r => r.estudiante === estudianteNombreVal && (r.sesionId === sesion.id || (r.fecha === sesion.fecha && (r.materia === sesion.materia || r.modulo === sesion.modulo))));
    if (todos.length > 0) {
      const prioridad = { Presente: 1, Tarde: 2, Justificada: 3, Falla: 4 };
      todos.sort((a, b) => (prioridad[a.estado] || 99) - (prioridad[b.estado] || 99));
      const mejor = todos[0];
      // Si el registro es Falla pero la sesión aún está activa (<= 50 min), el estudiante aún está a tiempo
      if (mejor.estado === 'Falla' && mins <= VENTANA_TARDE_MIN) {
        return { estado: 'Esperando escaneo', automatico: false };
      }
      return { estado: mejor.estado, automatico: !!mejor.automatico };
    }

    if (mins <= VENTANA_TARDE_MIN) {
      return { estado: 'Esperando escaneo', automatico: false };
    }
    return { estado: 'Falla', automatico: true };
  }

  // ---------- RENDER: Asistencia (QR automático) — docente ----------
  let docenteAsistCohorte = null;
  let asistenciaDocenteTimer = null;
  let docenteAsistFiltroTexto = '';
  let docenteAsistFiltroEstado = 'TODOS';
  let docenteAsistHistFiltroTexto = '';
  let docenteAsistHistFiltroEstado = 'TODOS';

  function filtrarAsistenciaDocenteLive(texto) {
    docenteAsistFiltroTexto = (texto || '').toLowerCase().trim();
    aplicarFiltrosTablaDocente();
  }
  window.filtrarAsistenciaDocenteLive = filtrarAsistenciaDocenteLive;

  function setFiltroEstadoDocente(estado) {
    docenteAsistFiltroEstado = estado;
    document.querySelectorAll('.btn-filtro-asist-doc').forEach(btn => {
      const e = btn.getAttribute('data-filtro-estado');
      if (e === estado) {
        btn.className = btn.getAttribute('data-class-active');
      } else {
        btn.className = btn.getAttribute('data-class-inactive');
      }
    });
    aplicarFiltrosTablaDocente();
  }
  window.setFiltroEstadoDocente = setFiltroEstadoDocente;

  function aplicarFiltrosTablaDocente() {
    const tbody = document.getElementById('tbody-asist-hoy');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-estudiante]');
    let visibles = 0;
    rows.forEach(r => {
      const nombre = (r.getAttribute('data-nombre') || '').toLowerCase();
      const estado = r.getAttribute('data-estado') || '';
      const coincideTexto = !docenteAsistFiltroTexto || nombre.includes(docenteAsistFiltroTexto);
      const coincideEstado = docenteAsistFiltroEstado === 'TODOS' || estado === docenteAsistFiltroEstado;
      if (coincideTexto && coincideEstado) {
        r.classList.remove('hidden');
        visibles++;
      } else {
        r.classList.add('hidden');
      }
    });
    const filaVacia = document.getElementById('fila-asist-vacia');
    if (filaVacia) filaVacia.classList.toggle('hidden', visibles > 0);
    const contadorVisibles = document.getElementById('contador-asist-visibles');
    if (contadorVisibles) contadorVisibles.textContent = `${visibles} estudiante${visibles === 1 ? '' : 's'}`;
  }
  window.aplicarFiltrosTablaDocente = aplicarFiltrosTablaDocente;

  function filtrarHistorialDocenteLive(texto) {
    docenteAsistHistFiltroTexto = (texto || '').toLowerCase().trim();
    aplicarFiltrosHistorialDocente();
  }
  window.filtrarHistorialDocenteLive = filtrarHistorialDocenteLive;

  function setFiltroEstadoHistorialDocente(filtro) {
    docenteAsistHistFiltroEstado = filtro;
    document.querySelectorAll('.btn-filtro-hist-doc').forEach(btn => {
      const f = btn.getAttribute('data-filtro-hist');
      if (f === filtro) {
        btn.className = btn.getAttribute('data-class-active');
      } else {
        btn.className = btn.getAttribute('data-class-inactive');
      }
    });
    aplicarFiltrosHistorialDocente();
  }
  window.setFiltroEstadoHistorialDocente = setFiltroEstadoHistorialDocente;

  function aplicarFiltrosHistorialDocente() {
    const tbody = document.getElementById('tbody-historial-doc');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-estudiante]');
    let visibles = 0;
    rows.forEach(r => {
      const nombre = (r.getAttribute('data-nombre') || '').toLowerCase();
      const pct = parseFloat(r.getAttribute('data-pct') || '-1');
      const coincideTexto = !docenteAsistHistFiltroTexto || nombre.includes(docenteAsistHistFiltroTexto);
      let coincideEstado = true;
      if (docenteAsistHistFiltroEstado === 'AL_DIA') {
        coincideEstado = pct >= 80;
      } else if (docenteAsistHistFiltroEstado === 'EN_RIESGO') {
        coincideEstado = pct >= 0 && pct < 80;
      }
      if (coincideTexto && coincideEstado) {
        r.classList.remove('hidden');
        visibles++;
      } else {
        r.classList.add('hidden');
      }
    });
    const filaVacia = document.getElementById('fila-hist-vacia');
    if (filaVacia) filaVacia.classList.toggle('hidden', visibles > 0);
  }
  window.aplicarFiltrosHistorialDocente = aplicarFiltrosHistorialDocente;

  // async: docenteEstudiantesDeCohorte ahora es async (usa 'usuarios' vía
  // MySQL). El setInterval de más abajo sigue funcionando igual con un
  // callback async — no espera a que termine antes de la siguiente vuelta,
  // mismo comportamiento que ya tenía.
  async function renderAsistenciaDocente() {
    if (asistenciaDocenteTimer) clearInterval(asistenciaDocenteTimer);
    const doc = currentDocente || {};

    const modulos = await docenteModulosActivos();
    if (!docenteAsistCohorte || !modulos.some(m => m.nombre === docenteAsistCohorte)) {
      docenteAsistCohorte = modulos.length ? modulos[0].nombre : null;
    }
    const moduloSel = modulos.find(m => m.nombre === docenteAsistCohorte) || null;

    if (!modulos.length) {
      document.getElementById('mount-t-asistencia').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas. El coordinador debe asignarte una desde el panel administrativo para poder abrir la asistencia.</p>
      </div>`;
      return;
    }

    const estudiantes = await docenteEstudiantesDeCohorte(moduloSel.nombre);
    const sesion = await sesionAsistenciaHoy(moduloSel.nombre, doc.nombre);
    if (sesion) await sincronizarAusentesSesion(sesion, estudiantes);

    const pillMap = { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'], 'Esperando escaneo': { bg: '#F5A62314', text: '#b5790f' }, 'Sin sesión': { bg: '#5B647214', text: '#5B6472' }, 'No aplica': { bg: '#5B647214', text: '#5B6472' } };

    const selector = `<select onchange="cambiarCohorteAsistDocente(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteAsistCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const materiaDoc = (await materiaDeDocenteEnCohorte(moduloSel.nombre, doc.nombre)) || moduloSel.modulo;
    const tokenDocente = await getOrCrearTokenQR('docente', moduloSel.nombre, doc.nombre);
    const tokenEstudiante = await getOrCrearTokenQR('estudiante', moduloSel.nombre, doc.nombre);

    const tarjetasQr = `
      <div class="grid sm:grid-cols-2 gap-5 mb-6">
        <!-- Tarjeta QR Docente -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-left">
              <div class="w-7 h-7 rounded-lg bg-morado/10 text-morado flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">Tu código de inicio de clase</p>
            </div>
            <span class="text-[10px] ${sesion ? 'bg-morado/10 text-morado border border-morado/20' : 'bg-emerald-100 text-emerald-800'} px-2 py-0.5 rounded-full font-semibold">${sesion ? 'Activada hoy (' + fmtHora(sesion.horaInicio) + ')' : 'Código de hoy'}</span>
          </div>
          <p class="text-xs text-slate2 mb-4 text-left">${sesion ? `Esta clase ya fue activada hoy a las <strong>${fmtHora(sesion.horaInicio)}</strong>. La asistencia solo se activa una vez al día; si vuelves a escanear o abrir el enlace, el sistema no volverá a activar la sesión.` : `Escanéalo con tu celular o ábrelo en el navegador para activar la asistencia de hoy en <strong>${escapeHtml(materiaDoc)}</strong>.`}</p>
          <div id="qrDocenteImg" class="flex justify-center mb-4 min-h-[160px] items-center"></div>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-100">
            <a href="${urlQr('docente', tokenDocente, true)}" target="_blank" class="text-xs font-semibold text-morado hover:underline flex items-center gap-1">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              ${sesion ? 'Ver estado de sesión' : 'Abrir enlace'}
            </a>
            <span class="text-slate2/40">•</span>
            <button type="button" onclick="copiarEnlaceDocente('${tokenDocente}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar enlace
            </button>
            <span class="text-slate2/40">•</span>
            <button onclick="imprimirQr('Código del docente — ${escapeHtml(materiaDoc)}','Escanéalo para activar la asistencia de hoy','qrDocenteImg')" class="text-xs font-semibold text-morado hover:underline">
              Imprimir
            </button>
            <span class="text-slate2/40">•</span>
            <button type="button" onclick="regenerarTokensQRCohorte('${escapeHtml(moduloSel.nombre)}', '${escapeHtml(doc.nombre)}')" class="text-xs font-semibold text-coral hover:underline flex items-center gap-1" title="Generar nuevo código para hoy">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Renovar QR
            </button>
          </div>
        </div>

        <!-- Tarjeta QR Estudiantes -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-left">
              <div class="w-7 h-7 rounded-lg bg-turquesa/10 text-turquesa flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">Código para tus estudiantes</p>
            </div>
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Código de hoy</span>
          </div>
          <p class="text-xs text-slate2 mb-3 text-left">Proyéctalo en clase o comparte el enlace. Al escanearlo, su asistencia se registrará automáticamente en el sistema.</p>
          
          ${sesion ? `
          <div class="mb-3.5 p-3 rounded-2xl bg-purple-50/80 border border-purple-200/70 flex items-center justify-between text-left">
            <div>
              <span class="text-[10px] uppercase font-bold text-morado tracking-wider block">Token Dinámico Anti-Fraude (15s)</span>
              <span id="tokenDinamicoDocenteTxt" class="text-base font-extrabold text-ink font-mono tracking-widest">${calcularTokenEfimeroSesion(sesion.codigo)}</span>
            </div>
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-purple-200 text-morado text-xs font-bold shadow-xs">
              <span class="w-2 h-2 rounded-full bg-morado animate-pulse"></span>
              <span id="tokenDinamicoDocenteTimer">15s</span>
            </div>
          </div>` : ''}

          <div id="qrEstudianteImg" class="flex justify-center mb-4 min-h-[160px] items-center"></div>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-100">
            <button type="button" onclick="copiarEnlaceEstudiante('${tokenEstudiante}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar enlace
            </button>
            <span class="text-slate2/40">•</span>
            <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(materiaDoc)}','Escanéalo para registrar tu asistencia','qrEstudianteImg')" class="text-xs font-semibold text-morado hover:underline">
              Descargar / Agrandar
            </button>
          </div>
        </div>
      </div>`;

    let tarjetaSesion;
    if (!sesion) {
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate2/10 text-slate2 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-ink">Asistencia de hoy: sin activar</p>
              <p class="text-xs text-slate2 mt-1">Para activar la clase de hoy, <strong>escanea tu código QR del docente</strong> o haz clic en <a href="${urlQr('docente', tokenDocente, true)}" target="_blank" class="text-turquesa font-semibold underline">Abrir enlace</a>. Al activarla, los estudiantes tienen <strong>${VENTANA_PUNTUAL_MIN} min</strong> para registrar llegada puntual y hasta <strong>${VENTANA_TARDE_MIN} min</strong> de tolerancia.</p>
            </div>
          </div>
        </div>`;
    } else {
      const ventana = estadoVentanaSesion(sesion);
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
          <p class="text-sm font-bold text-ink">Asistencia de hoy: ya activada (única activación del día)</p>
          <p class="text-xs text-slate2 mt-1">Activada a las ${fmtHora(sesion.horaInicio)}${sesion.iniciadaPor ? ' por ' + escapeHtml(sesion.iniciadaPor) : ''}. Los estudiantes tienen hasta ${VENTANA_TARDE_MIN} min desde el inicio para confirmar asistencia mediante QR o código. Por seguridad, esta clase no se puede volver a activar en el día.</p>
          <p class="text-xs font-bold mt-2" style="color:${ventana.color}">${ventana.texto}</p>
        </div>`;
    }

    const asistenciaTodos = await Store.list('asistencia');
    const justificacionesTodas = await Store.list('justificaciones_asistencia');
    const infoPorEstudiante = await Promise.all(estudiantes.map(e => estadoActualEstudianteSesion(sesion, e.nombre, asistenciaTodos, e)));
    let countPresentes = 0;
    let countTardes = 0;
    let countFallas = 0;
    let countPendientes = 0;

    const filasHoy = estudiantes.length ? estudiantes.map((e, i) => {
      const info = infoPorEstudiante[i];
      if (info.estado === 'Presente') countPresentes++;
      else if (info.estado === 'Tarde') countTardes++;
      else if (info.estado === 'Falla') countFallas++;
      else countPendientes++;

      const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
      const regEst = asistenciaTodos.find(a => a.estudiante === e.nombre && (a.sesionId === (sesion ? sesion.id : '') || (sesion && a.fecha === sesion.fecha && (a.materia === sesion.materia || a.modulo === sesion.modulo))));
      const justEst = justificacionesTodas.find(j => j.estudiante === e.nombre && (sesion && (j.fecha === sesion.fecha || (regEst && j.asistenciaId === regEst.id))));
      const horas = (regEst && regEst.horasCumplidas !== undefined && regEst.horasCumplidas !== null) ? Number(regEst.horasCumplidas) : (info.estado === 'Presente' ? 4.0 : (info.estado === 'Tarde' ? 3.0 : (info.estado === 'Justificada' ? 4.0 : 0.0)));
      const horasPct = Math.round((horas / 4.0) * 100);

      return `<tr data-estudiante="1" data-nombre="${escapeHtml(e.nombre.toLowerCase())}" data-estado="${escapeHtml(info.estado)}" class="border-b border-gray-50 last:border-0 hover:bg-slate-50/80 transition-colors">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-full bg-morado/10 text-morado text-[11px] font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
            <div>
              <p class="font-bold text-ink leading-tight">${escapeHtml(e.nombre)}</p>
              ${regEst && regEst.motivoAjuste ? `<span class="text-[10px] text-amber-700 italic block leading-tight mt-0.5">${escapeHtml(regEst.motivoAjuste)}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="py-2.5 px-4">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${statusPill(info.estado === 'Falla' ? 'Falla' : info.estado, pillMap)}
            ${info.automatico && info.estado === 'Falla' ? '<span class="hidden sm:inline-block text-[10px] text-coral font-medium bg-coral/10 px-2 py-0.5 rounded-full border border-coral/20">por inasistencia</span>' : ''}
          </div>
        </td>
        <td class="py-2.5 px-4 text-xs font-semibold text-ink">
          <span>${horas.toFixed(1)} / 4.0 hrs</span>
          <span class="text-[10px] text-slate2 ml-1">(${horasPct}%)</span>
        </td>
        <td class="py-2.5 px-4 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            ${justEst ? `
              <button type="button" onclick="window.abrirModalVisorJustificacion('${justEst.id}')" class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition" title="Ver soporte médico o excusa">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span>${justEst.estado === 'Aprobada' ? 'Justificada' : (justEst.estado === 'Rechazada' ? 'Rechazada' : 'Ver excusa')}</span>
              </button>
            ` : ''}
            <button type="button" onclick="window.abrirModalAjusteHorasDocente('${escapeHtml(e.nombre)}', '${sesion ? sesion.id : ''}', ${horas}, '${escapeHtml((regEst && regEst.motivoAjuste) || '')}', '${info.estado}')" class="px-2.5 py-1 rounded-lg border border-gray-200 hover:border-morado hover:text-morado text-slate2 font-semibold text-xs transition cursor-pointer">
              Novedad / Horas
            </button>
          </div>
        </td>
      </tr>`;
    }).join('') : '';
    let countHistAlDia = 0;
    let countHistEnRiesgo = 0;

    const historial = estudiantes.map(e => {
      const fechaRegE = (e.creadoEn || e.creado_en || '').trim();
      const fechaRegDate = fechaRegE ? fechaRegE.slice(0, 10) : '';

      const rawRegs = asistenciaTodos.filter(a => {
        if (a.estudiante !== e.nombre) return false;
        if (!(a.docente === doc.nombre || a.modulo === moduloSel.modulo || a.modulo === moduloSel.nombre || a.materia === materiaDoc || a.materia === moduloSel.modulo)) return false;
        if (fechaRegDate && a.fecha && a.fecha < fechaRegDate) return false;
        return true;
      });
      const porClase = new Map();
      rawRegs.forEach(r => {
        const k = r.sesionId ? ('ses_' + r.sesionId) : ('date_' + r.fecha);
        if (!porClase.has(k) || (r.estado === 'Presente' || r.estado === 'Tarde')) {
          porClase.set(k, r);
        }
      });
      const regs = Array.from(porClase.values()).filter(r => {
        if (sesion && r.sesionId === sesion.id && r.estado === 'Falla') {
          const minsS = minutosTranscurridos(sesion.horaInicio || sesion.hora_inicio);
          if (minsS <= VENTANA_TARDE_MIN) return false;
        }
        return true;
      });
      const presentes = regs.filter(r => r.estado === 'Presente').length;
      const pct = regs.length ? Math.round((presentes / regs.length) * 100) : null;
      if (pct !== null) {
        if (pct >= 80) countHistAlDia++;
        else countHistEnRiesgo++;
      }
      const badgeBg = pct === null ? 'bg-slate-100 text-slate-700' : pct >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : pct >= 60 ? 'bg-amber-50 text-amber-800 border border-amber-200/60' : 'bg-coral/10 text-coral border border-coral/20';
      const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';

      return `<tr data-estudiante="1" data-nombre="${escapeHtml(e.nombre.toLowerCase())}" data-pct="${pct !== null ? pct : -1}" class="border-b border-gray-50 last:border-0 hover:bg-slate-50/80 transition-colors">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
            <span class="truncate">${escapeHtml(e.nombre)}</span>
          </div>
        </td>
        <td class="py-2.5 px-4 text-sm text-slate2">${regs.length} sesión${regs.length === 1 ? '' : 'es'}</td>
        <td class="py-2.5 px-4 text-right sm:text-left">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}">${pct === null ? '—' : pct + '%'}</span>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-t-asistencia').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Asistencia de hoy — ${escapeHtml(moduloSel.modulo)}</p>
            <p class="text-xs text-slate2 mt-0.5">${fmtDate(fechaHoyLocal())} · Todo se calcula automáticamente por tiempo, sin marcado manual.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${tarjetaSesion}
      ${tarjetasQr}

      <!-- Control de Asistencia de Hoy: Compacto, con buscador y filtros para cohortes grandes -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <!-- Encabezado con métricas y buscador -->
        <div class="p-4 sm:p-5 border-b border-gray-100 bg-linear-to-r from-slate-50/60 to-white">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${sesion ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                <h3 class="text-sm font-bold text-ink">Estudiantes de la cohorte</h3>
                <span id="contador-asist-visibles" class="text-xs font-semibold text-morado bg-morado/10 px-2 py-0.5 rounded-full">${estudiantes.length} estudiantes</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Control optimizado: busca por nombre o filtra por estado sin desplazarte interminablemente.</p>
            </div>
            <!-- Mini KPIs de la sesión -->
            <div class="flex items-center gap-2 flex-wrap text-xs">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${countPresentes} Presente${countPresentes === 1 ? '' : 's'}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200/60">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>${countTardes} Tarde${countTardes === 1 ? '' : 's'}
              </span>
              ${countPendientes > 0 ? `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>${countPendientes} Pendiente${countPendientes === 1 ? '' : 's'}
              </span>` : ''}
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral/10 text-coral font-semibold border border-coral/20">
                <span class="w-1.5 h-1.5 rounded-full bg-coral"></span>${countFallas} Falla${countFallas === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <!-- Buscador y botones de filtro rápido -->
          <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div class="relative flex-1 max-w-sm">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-turquesa">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </span>
              <input type="text" id="filtroDocenteNombre" value="${escapeHtml(docenteAsistFiltroTexto)}" oninput="filtrarAsistenciaDocenteLive(this.value)" placeholder="Buscar estudiante por nombre..." class="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-turquesa/5 border border-turquesa/30 rounded-xl text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition-all">
            </div>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button type="button" onclick="setFiltroEstadoDocente('TODOS')" data-filtro-estado="TODOS" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-turquesa text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-white text-slate2 border border-gray-200 hover:bg-gray-50" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'TODOS' ? 'bg-turquesa text-white shadow-xs' : 'bg-white text-slate2 border border-gray-200 hover:bg-gray-50'}">Todos (${estudiantes.length})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Presente')" data-filtro-estado="Presente" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-600 text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Presente' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}">Presentes (${countPresentes})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Tarde')" data-filtro-estado="Tarde" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-amber-600 text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Tarde' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'}">Tardes (${countTardes})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Falla')" data-filtro-estado="Falla" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Falla' ? 'bg-coral text-white shadow-xs' : 'bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20'}">Fallas (${countFallas})</button>
            </div>
          </div>
        </div>

        <!-- Tabla con scroll vertical compacto (max-h-96) y encabezado sticky -->
        <div class="max-h-[380px] overflow-y-auto divide-y divide-gray-100 relative">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-white/95 backdrop-blur-xs z-10 shadow-xs border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-slate2">
              <tr>
                <th class="py-2.5 px-4 bg-white/95">Estudiante</th>
                <th class="py-2.5 px-4 text-right sm:text-left bg-white/95">Estado hoy</th>
              </tr>
            </thead>
            <tbody id="tbody-asist-hoy">
              ${filasHoy || '<tr><td colspan="2" class="text-sm text-slate2 text-center py-6">Esta cohorte aún no tiene estudiantes matriculados.</td></tr>'}
              <tr id="fila-asist-vacia" class="hidden">
                <td colspan="2" class="text-sm text-slate2 text-center py-8">
                  <div class="flex flex-col items-center justify-center gap-1">
                    <svg class="w-6 h-6 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>No se encontraron estudiantes con ese criterio de búsqueda.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historial de Asistencia: Compacto con sticky header y búsqueda -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-gray-100 bg-linear-to-r from-slate-50/60 to-white">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-ink">Historial acumulado — ${escapeHtml(moduloSel.modulo)}</h3>
                <span class="text-xs text-slate2 bg-slate-100 px-2 py-0.5 rounded-md font-medium">${estudiantes.length} estudiantes</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Porcentaje global de asistencia de cada estudiante en este módulo.</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="setFiltroEstadoHistorialDocente('TODOS')" data-filtro-hist="TODOS" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-turquesa text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-white text-slate2 border border-gray-200 hover:bg-gray-50" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'TODOS' ? 'bg-turquesa text-white shadow-xs' : 'bg-white text-slate2 border border-gray-200 hover:bg-gray-50'}">Todos</button>
              <button type="button" onclick="setFiltroEstadoHistorialDocente('AL_DIA')" data-filtro-hist="AL_DIA" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-600 text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'AL_DIA' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}">Al día (≥80%)</button>
              <button type="button" onclick="setFiltroEstadoHistorialDocente('EN_RIESGO')" data-filtro-hist="EN_RIESGO" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'EN_RIESGO' ? 'bg-coral text-white shadow-xs' : 'bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20'}">En riesgo (&lt;80%)</button>
            </div>
          </div>
          <div class="relative max-w-sm">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-turquesa">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input type="text" id="filtroHistDocenteNombre" value="${escapeHtml(docenteAsistHistFiltroTexto)}" oninput="filtrarHistorialDocenteLive(this.value)" placeholder="Buscar en historial por nombre..." class="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-turquesa/5 border border-turquesa/30 rounded-xl text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition-all">
          </div>
        </div>

        <div class="max-h-[320px] overflow-y-auto divide-y divide-gray-100 relative">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-white/95 backdrop-blur-xs z-10 shadow-xs border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-slate2">
              <tr>
                <th class="py-2.5 px-4 bg-white/95">Estudiante</th>
                <th class="py-2.5 px-4 bg-white/95">Sesiones</th>
                <th class="py-2.5 px-4 text-right sm:text-left bg-white/95">% Asistencia</th>
              </tr>
            </thead>
            <tbody id="tbody-historial-doc">
              ${historial || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Sin registros todavía.</td></tr>'}
              <tr id="fila-hist-vacia" class="hidden">
                <td colspan="3" class="text-sm text-slate2 text-center py-8">
                  <div class="flex flex-col items-center justify-center gap-1">
                    <svg class="w-6 h-6 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>No se encontraron estudiantes en el historial con ese criterio.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // Renderizar los códigos QR visibles en pantalla para el docente
    pintarQrImprimible('qrDocenteImg', urlQr('docente', tokenDocente));
    pintarQrImprimible('qrEstudianteImg', urlQr('estudiante', tokenEstudiante));

    // Aplicar filtros activos previamente
    aplicarFiltrosTablaDocente();
    aplicarFiltrosHistorialDocente();

    asistenciaDocenteTimer = setInterval(() => {
      const panel = document.getElementById('panel-t-asistencia');
      const inputActivo = document.activeElement && (document.activeElement.id === 'filtroDocenteNombre' || document.activeElement.id === 'filtroHistDocenteNombre');
      if (panel && !panel.classList.contains('hidden')) {
        if (!inputActivo) renderAsistenciaDocente();
      } else {
        clearInterval(asistenciaDocenteTimer);
      }
    }, 15000);
  }

  // ---------- RENDER: Códigos QR (admin) ----------
  // Junta, a partir del Horario, cada combinación real de Docente + Cohorte +
  // Materia, y genera (o reutiliza) el par de QR estables de cada una — así
  // el administrador puede imprimirlos todos sin depender de que cada
  // docente entre primero a su propio panel.
  // async: 'horarios' vía MySQL.
  async function combosDocenteCohorte() {
    const registros = await Store.list('horarios');
    const vistos = new Set();
    const combos = [];
    registros.forEach(h => {
      franjasActivas(h).forEach(f => {
        if (!f.docente) return;
        const key = f.docente + '|' + h.cohorte;
        if (vistos.has(key)) return;
        vistos.add(key);
        combos.push({ docente: f.docente, cohorte: h.cohorte, materia: f.curso || h.modulo || h.cohorte });
      });
    });
    combos.sort((a, b) => a.cohorte.localeCompare(b.cohorte) || a.docente.localeCompare(b.docente));
    return combos;
  }

  let filtroQrCohorte = '';

  function cambiarFiltroQrCohorte(cohorte) {
    filtroQrCohorte = cohorte || '';
    renderCodigosQr();
  }
  window.cambiarFiltroQrCohorte = cambiarFiltroQrCohorte;

  // async: 'modulos'/'horarios'/'qr_tokens' vía MySQL.
  async function renderCodigosQr() {
    const combos = await combosDocenteCohorte();
    const cohortes = await Store.list('modulos');

    if (!combos.length) {
      document.getElementById('mount-codigosqr').innerHTML = `
        <div class="admin-panel-card p-10 text-center">
          <p class="font-bold text-ink mb-1.5">Aún no hay códigos QR para generar</p>
          <p class="text-sm text-slate2">Primero asigna un docente a alguna franja en el panel <span class="font-semibold text-ink">Cohortes → Horario</span>. En cuanto un docente quede asignado a una materia, sus dos códigos (el suyo y el de sus estudiantes) aparecerán aquí listos para imprimir.</p>
        </div>`;
      return;
    }

    const cohortesUnicas = Array.from(new Set(combos.map(c => c.cohorte))).sort();
    if (filtroQrCohorte && !cohortesUnicas.includes(filtroQrCohorte)) {
      filtroQrCohorte = '';
    }

    const combosFiltrados = filtroQrCohorte
      ? combos.filter(c => c.cohorte === filtroQrCohorte)
      : combos;

    const tokensDoc = await Promise.all(combosFiltrados.map(c => getOrCrearTokenQR('docente', c.cohorte, c.docente)));
    const tokensEst = await Promise.all(combosFiltrados.map(c => getOrCrearTokenQR('estudiante', c.cohorte, c.docente)));

    const tarjetas = combosFiltrados.map((combo, i) => {
      const modulo = cohortes.find(c => c.nombre === combo.cohorte);
      const tokenDoc = tokensDoc[i];
      const tokenEst = tokensEst[i];
      const idDoc = 'qrAdminDoc_' + i;
      const idEst = 'qrAdminEst_' + i;
      return {
        html: `
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(combo.cohorte)}</p>
              <p class="text-xs text-slate2">${escapeHtml(combo.materia)} · ${modulo ? escapeHtml(modulo.modulo) : ''}</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="regenerarTokensQRCohorte('${escapeHtml(combo.cohorte)}', '${escapeHtml(combo.docente)}')" class="text-[11px] font-bold text-morado bg-morado/10 hover:bg-morado/20 px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer" title="Generar un nuevo código aleatorio inmediatamente para evitar fraude">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Renovar QR
              </button>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-morado/10 text-morado">${escapeHtml(combo.docente)}</span>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR del docente</p>
              <div id="${idDoc}" class="flex justify-center mb-3"></div>
              <div class="flex flex-col gap-2 mt-2">
                <button onclick="imprimirQr('Código del docente — ${escapeHtml(combo.docente)} · ${escapeHtml(combo.materia)}','Escanéalo para activar la asistencia de hoy','${idDoc}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
                <div class="flex items-center justify-center gap-2 text-[11px] pt-2 border-t border-gray-100">
                  <a href="${escapeHtml(urlQr('docente', tokenDoc, true))}" target="_blank" class="text-morado font-bold hover:underline flex items-center gap-1" title="Probar activación directamente en el navegador">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    Activar en PC
                  </a>
                  <span class="text-slate2">·</span>
                  <button type="button" onclick="copiarLinkQr('${escapeHtml(urlQr('docente', tokenDoc))}')" class="text-turquesa font-bold hover:underline flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copiar enlace
                  </button>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR de estudiantes</p>
              <div id="${idEst}" class="flex justify-center mb-3"></div>
              <div class="flex flex-col gap-2 mt-2">
                <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(combo.cohorte)} · ${escapeHtml(combo.materia)}','Escanéalo e ingresa tu correo institucional','${idEst}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
                <div class="flex items-center justify-center gap-2 text-[11px] pt-2 border-t border-gray-100">
                  <a href="${escapeHtml(urlQr('estudiante', tokenEst, true))}" target="_blank" class="text-morado font-bold hover:underline flex items-center gap-1" title="Probar formulario directamente en el navegador">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    Abrir en PC
                  </a>
                  <span class="text-slate2">·</span>
                  <button type="button" onclick="copiarLinkQr('${escapeHtml(urlQr('estudiante', tokenEst))}')" class="text-turquesa font-bold hover:underline flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copiar enlace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>`,
        idDoc, idEst, tokenDoc, tokenEst
      };
    });

    const fechaHoyStr = fmtDate(fechaHoyLocal());
    document.getElementById('mount-codigosqr').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center gap-2.5 mb-1">
          <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <h2 class="text-lg font-extrabold text-ink">Códigos QR de asistencia — Renovación diaria antifraude</h2>
        </div>
        <p class="text-sm text-slate2 mt-1">Los códigos QR de cada clase se <strong>actualizan aleatoriamente cada día de forma automática</strong>. De esta manera se evita el fraude: los enlaces de días anteriores expiran para asegurar que los estudiantes solo puedan registrar asistencia si están presentes en la clase del día.</p>
        <div class="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex font-medium">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          <span>Códigos activos generados para hoy: <strong>${fechaHoyStr}</strong></span>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <label for="filtroQrCohorteSelect" class="text-xs font-semibold text-slate2">Filtrar por cohorte:</label>
            <select id="filtroQrCohorteSelect" onchange="cambiarFiltroQrCohorte(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">
              <option value="">Todas las cohortes (${combos.length} combinaciones)</option>
              ${cohortesUnicas.map(c => {
                const cant = combos.filter(x => x.cohorte === c).length;
                return `<option value="${escapeHtml(c)}" ${filtroQrCohorte === c ? 'selected' : ''}>${escapeHtml(c)} (${cant})</option>`;
              }).join('')}
            </select>
          </div>
          <span class="text-xs font-medium text-slate2">Mostrando ${combosFiltrados.length} de ${combos.length} materias</span>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-5">${tarjetas.map(t => t.html).join('') || '<div class="col-span-full admin-panel-card p-10 text-center"><p class="text-sm text-slate2">No hay materias registradas para la cohorte seleccionada.</p></div>'}</div>`;

    // El QR se dibuja DESPUÉS de insertar el HTML (necesita el contenedor ya en el DOM).
    tarjetas.forEach(t => {
      pintarQrImprimible(t.idDoc, urlQr('docente', t.tokenDoc));
      pintarQrImprimible(t.idEst, urlQr('estudiante', t.tokenEst));
    });
  }

  function cambiarCohorteAsistDocente(value) {
    docenteAsistCohorte = value;
    docenteAsistFiltroTexto = '';
    docenteAsistFiltroEstado = 'TODOS';
    docenteAsistHistFiltroTexto = '';
    docenteAsistHistFiltroEstado = 'TODOS';
    renderAsistenciaDocente();
  }

  // async: docenteModulosActivos() ahora es async.
  async function habilitarSesionAsistenciaDocente() {
    const doc = currentDocente || {};
    const moduloSel = (await docenteModulosActivos()).find(m => m.nombre === docenteAsistCohorte);
    if (!moduloSel) return;
    if (await sesionAsistenciaHoy(moduloSel.nombre, doc.nombre)) { toast('Ya hay un código de asistencia activo hoy para tu materia', 'info'); renderAsistenciaDocente(); return; }
    const cursoNombre = (await cursoDeDocenteEnCohorte(doc.nombre, moduloSel.nombre)) || moduloSel.modulo;
    const sesiones = await Store.list('sesiones_asistencia');
    const nuevaSesId = uid('ses');
    const hoy = fechaHoyLocal();
    sesiones.push({
      id: nuevaSesId, cohorte: moduloSel.nombre, modulo: cursoNombre,
      materia: cursoNombre, fecha: hoy,
      horaInicio: horaHoyLocal(), codigo: generarCodigoSesion(), iniciadaPor: doc.nombre
    });
    await Store.set('sesiones_asistencia', sesiones);

    toast('Código habilitado: los estudiantes tienen ' + VENTANA_PUNTUAL_MIN + ' min para llegar puntuales (tolerancia hasta ' + VENTANA_TARDE_MIN + ' min)', 'ok');
    renderAsistenciaDocente();
  }

  /**
   * Escaneo de códigos QR de asistencia (?qr=docente|estudiante&t=TOKEN).
   * Identifica cohorte, docente y materia para activación o registro de asistencia.
   */

  function qrLandingShell(icono, color, titulo, subtitulo, cuerpoHtml) {
    return `
      <div class="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5" style="background:${color}1A">
        <span class="text-2xl">${icono}</span>
      </div>
      <h1 class="text-xl font-extrabold text-ink mb-1.5">${escapeHtml(titulo)}</h1>
      <p class="text-sm text-slate2 mb-6">${subtitulo}</p>
      ${cuerpoHtml}
      <p class="text-xs text-slate2 mt-8">Fundación A+ — Training de 100 a 1000+</p>`;
  }

  function fmtHora(iso) {
    if (!iso) return '—';
    const s = String(iso).trim();
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? iso : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Copia el enlace de activación para el docente
  function copiarEnlaceDocente(token) {
    const enlace = urlQr('docente', token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(enlace).then(() => {
        toast('Enlace del docente copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para activar la clase:', enlace);
      });
    } else {
      prompt('Copia este enlace para activar la clase:', enlace);
    }
  }
  window.copiarEnlaceDocente = copiarEnlaceDocente;

  // Copia el enlace de asistencia para compartirlo con los estudiantes
  function copiarEnlaceEstudiante(token) {
    const enlace = urlQr('estudiante', token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(enlace).then(() => {
        toast('Enlace de asistencia copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para tus estudiantes:', enlace);
      });
    } else {
      prompt('Copia este enlace para tus estudiantes:', enlace);
    }
  }
  window.copiarEnlaceEstudiante = copiarEnlaceEstudiante;

  // Re-consulta el estado del QR del estudiante (por si el docente recién lo activó)
  async function verificarSesionEstudianteQr(token) {
    toast('Verificando si el docente activó la clase...', 'info');
    await manejarQrEnURL();
  }
  window.verificarSesionEstudianteQr = verificarSesionEstudianteQr;

  // Re-consulta las asistencias en la pantalla del docente
  async function recargarEstadoDocenteQr(token) {
    await manejarQrEnURL();
    toast('Lista de asistencias actualizada', 'ok');
  }
  window.recargarEstadoDocenteQr = recargarEstadoDocenteQr;

  // async: 'qr_asistencia' endpoint en backend PHP.
  async function manejarQrEnURL() {
    const params = new URLSearchParams(location.search);
    const tipo = params.get('qr');
    const token = params.get('t');
    if (!tipo || !token) return;

    document.getElementById('siteView').classList.add('hidden');
    const qrView = document.getElementById('qrView');
    if (qrView) qrView.classList.remove('hidden');

    let devId = '';
    try {
      devId = localStorage.getItem('fa_dispositivo_id') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('fa_dispositivo_id', devId);
      }
    } catch (e) {}

    try {
      const resp = await fetch(API_BASE_URL + '/api/qr_asistencia?tipo=' + encodeURIComponent(tipo) + '&token=' + encodeURIComponent(token) + '&devId=' + encodeURIComponent(devId), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const datos = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        document.getElementById('qrViewCard').innerHTML = `
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md mx-auto">
            <div class="w-14 h-14 rounded-full bg-coral/10 text-coral flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h2 class="text-xl font-bold text-ink mb-2">Código no válido o expirado</h2>
            <p class="text-sm text-slate2 mb-6">${escapeHtml(datos.error || 'Este QR no corresponde a ninguna cohorte activa.')}</p>
            <a href="${location.pathname}" class="inline-block rounded-full bg-morado text-white text-xs font-semibold px-6 py-2.5 hover:opacity-90 transition">Volver al inicio</a>
          </div>`;
        return;
      }

      if (tipo === 'docente') {
        renderQrLandingDocente(datos);
      } else if (datos.yaRegistradoDispositivo) {
        // Antifraude: el dispositivo o IP ya registró asistencia en esta clase
        renderConfirmacionGoogleForm({
          estudiante: datos.estudianteRegistrado,
          estado: datos.estadoRegistrado,
          cohorte: (datos.registro && datos.registro.cohorte) || '',
          materia: (datos.sesion && datos.sesion.materia) || '',
          yaRegistrado: true,
          ipCliente: datos.ipCliente
        }, token);
      } else {
        renderQrLandingEstudianteGoogleForm(datos);
      }
    } catch (e) {
      document.getElementById('qrViewCard').innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md mx-auto">
          <div class="w-14 h-14 rounded-full bg-coral/10 text-coral flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-ink mb-2">Error de conexión</h2>
          <p class="text-sm text-slate2 mb-6">No se pudo conectar con el servidor local. Verifica que XAMPP (Apache y MySQL) esté iniciado.</p>
        </div>`;
    }
  }

  // ---- Landing del QR del DOCENTE: activa la sesión de hoy y proyecta el QR del estudiante ----
  function renderQrLandingDocente(datos) {
    const { registro, sesion, recienActivada, yaEstabaActivada, tokenEstudiante, totalAsistencias } = datos;
    const mins = minutosTranscurridos(sesion.horaInicio);
    const ventana = estadoVentanaSesion(sesion);
    const esCerrada = mins > VENTANA_TARDE_MIN;
    const idQrEst = 'qrDocenteEstudianteScreen';

    const qrEstudianteHtml = (tokenEstudiante && !esCerrada) ? `
      <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm text-center">
        <p class="text-xs font-bold text-morado tracking-wide uppercase mb-1">Código QR para tus estudiantes</p>
        <p class="text-sm font-semibold text-ink mb-4">Muestra este código a tus estudiantes para que lo escaneen y confirmen su asistencia:</p>
        <div id="${idQrEst}" class="flex justify-center mb-4"></div>
        <div class="flex items-center justify-center gap-3">
          <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(registro.cohorte)} · ${escapeHtml(sesion.materia)}','Escanéalo para ingresar tu usuario de asistencia','${idQrEst}')" class="text-xs font-semibold text-morado hover:underline flex items-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir / Agrandar
          </button>
          <span class="text-slate2/40">•</span>
          <button onclick="copiarEnlaceEstudiante('${tokenEstudiante}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar enlace
          </button>
        </div>
      </div>
    ` : (esCerrada ? `
      <div class="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-5 text-center">
        <div class="w-10 h-10 rounded-xl bg-gray-200 text-slate2 flex items-center justify-center mx-auto mb-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <p class="text-xs font-bold text-ink uppercase tracking-wide">Registro de asistencia cerrado</p>
        <p class="text-xs text-slate2 mt-1">El periodo de tolerancia concluyó. Los registros de asistencia para esta fecha ya han quedado consolidados.</p>
      </div>
    ` : '');

    const bannerEstado = recienActivada ? `
      <div class="rounded-2xl p-5 border-l-4" style="background:#1FC8C014; border-left-color:#1FC8C0">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-turquesa/20 text-turquesa flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="text-base font-extrabold text-ink">¡Asistencia de hoy activada!</p>
        </div>
        <p class="text-xs font-semibold mt-1" style="color:${ventana.color}">${ventana.texto}</p>
        <p class="text-xs text-slate2 mt-2">Hora de inicio: <strong>${fmtHora(sesion.horaInicio)}</strong></p>
      </div>` : `
      <div class="rounded-2xl p-5 border-l-4" style="background:#8B5CF614; border-left-color:#8B5CF6">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-morado/20 text-morado flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <p class="text-base font-extrabold text-ink">Asistencia ya activada el día de hoy</p>
        </div>
        <p class="text-xs text-slate2 mt-1">Esta clase ya fue activada a las <strong>${fmtHora(sesion.horaInicio)}</strong>. Por control antifraude, <strong>no es posible volver a activar la asistencia</strong> para este mismo día.</p>
        <p class="text-xs font-semibold mt-2" style="color:${ventana.color}">${ventana.texto}</p>
      </div>`;

    const cuerpo = `
      <div class="flex flex-col gap-4">
        ${bannerEstado}

        ${qrEstudianteHtml}

        <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-slate2">Asistencias registradas hoy en esta clase:</p>
              <p class="text-2xl font-extrabold text-ink mt-0.5" id="contadorAsistenciasHoy">${totalAsistencias} estudiante${totalAsistencias === 1 ? '' : 's'}</p>
            </div>
            <button onclick="recargarEstadoDocenteQr('${registro.token}')" class="rounded-xl border border-gray-200 text-slate2 hover:text-morado hover:bg-morado/5 text-xs font-semibold px-3 py-2 transition flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>
        </div>

        <div class="text-center mt-2">
          <a href="${location.pathname}" class="text-xs text-slate2 hover:text-ink underline">Ir al portal de la Fundación</a>
        </div>
      </div>`;

    document.getElementById('qrViewCard').innerHTML = `
      <div class="bg-white rounded-3xl shadow-softLg border border-gray-100 p-8 max-w-lg mx-auto">
        <div class="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 bg-morado/10 text-morado">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
        </div>
        <h1 class="text-xl font-extrabold text-ink mb-1">Docente: ${escapeHtml(registro.docente)}</h1>
        <p class="text-xs text-slate2 mb-6">Cohorte <strong class="text-ink">${escapeHtml(registro.cohorte)}</strong> · ${escapeHtml(sesion.materia)}</p>
        ${cuerpo}
      </div>`;

    if (tokenEstudiante) {
      pintarQrImprimible(idQrEst, urlQr('estudiante', tokenEstudiante));
    }
  }

  // ---- Landing del QR del ESTUDIANTE: Flujo 100% automatizado ----
  let timerEsperaDocenteQr = null;

  function renderQrLandingEstudianteGoogleForm(datos, errorInicial = '') {
    window.__ultimoQrDatosEstudiante = datos;
    if (timerEsperaDocenteQr) {
      clearInterval(timerEsperaDocenteQr);
      timerEsperaDocenteQr = null;
    }

    const { registro, sesionActiva, sesion } = datos;
    const token = registro.token;
    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Determinar si ya tenemos la identidad del estudiante guardada (login o escaneo previo)
    let savedEmail = '';
    try {
      savedEmail = (currentEstudiante && (currentEstudiante.email || currentEstudiante.nombre)) 
        || localStorage.getItem('aplus_estudiante_email') 
        || '';
    } catch (e) {}

    // Si la sesión está activa y tenemos la identidad y NO venimos de un error inicial:
    // PROCESO AUTOMÁTICO INMEDIATO:
    if (sesionActiva && savedEmail && !errorInicial) {
      document.getElementById('qrViewCard').innerHTML = `
        <div class="space-y-4 max-w-xl mx-auto">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center p-8">
            <div class="h-2.5 -mx-8 -mt-8 mb-6" style="background: #673ab7;"></div>
            <div class="w-16 h-16 rounded-full bg-morado/10 text-morado flex items-center justify-center mx-auto mb-4">
              <svg class="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
            <h2 class="text-xl font-extrabold text-ink mb-1">Registrando asistencia automáticamente...</h2>
            <p class="text-xs text-slate2 mb-3">Identificado como <strong class="text-morado font-bold">${escapeHtml(savedEmail)}</strong></p>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-turquesa/10 text-turquesa text-xs font-semibold">
              <span>Cohorte: ${escapeHtml(registro.cohorte)} · ${escapeHtml(sesion ? (sesion.materia || sesion.modulo) : '')}</span>
            </div>
          </div>
          <p class="text-center text-[11px] text-slate2">Sistema de Asistencia Automatizada · Fundación A+</p>
        </div>`;

      // Se ejecuta de inmediato el registro
      setTimeout(() => {
        enviarFormularioAsistencia(token, savedEmail);
      }, 350);
      return;
    }

    // Si la sesión no está activa, activamos sondeo cada 3 segundos
    if (!sesionActiva) {
      timerEsperaDocenteQr = setInterval(() => {
        const qrView = document.getElementById('qrView');
        if (qrView && !qrView.classList.contains('hidden')) {
          manejarQrEnURL();
        } else {
          clearInterval(timerEsperaDocenteQr);
          timerEsperaDocenteQr = null;
        }
      }, 3000);
    }

    let estadoSesionHtml = '';
    if (sesionActiva) {
      const ventana = estadoVentanaSesion(sesion);
      estadoSesionHtml = `
        <div class="rounded-xl p-3.5 mb-5 text-left flex items-start gap-2.5" style="background:#1FC8C014; border-left: 4px solid #1FC8C0;">
          <span class="relative flex h-3 w-3 mt-1 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <p class="text-xs font-bold text-ink">Sesión abierta por el docente</p>
            <p class="text-[11px] font-semibold mt-0.5" style="color:${ventana.color}">${ventana.texto}</p>
            <p class="text-[11px] text-coral font-medium mt-1.5 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Recuerda: tu asistencia inicia marcada como <strong>Falla (pérdida)</strong> por defecto hasta que confirmes tu usuario.</span>
            </p>
          </div>
        </div>`;
    } else {
      estadoSesionHtml = `
        <div class="rounded-xl p-3.5 mb-5 text-left flex items-start gap-2.5" style="background:#F5A62314; border-left: 4px solid #F5A623;">
          <div class="w-5 h-5 shrink-0 mt-0.5">
            <svg class="w-4 h-4 animate-spin text-oro" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
          <div>
            <p class="text-xs font-bold text-ink">Esperando activación de clase...</p>
            <p class="text-[11px] text-slate2 mt-0.5">El docente (${escapeHtml(registro.docente)}) aún no ha abierto la sesión. En cuanto la active, tu asistencia se registrará automáticamente en segundo plano.</p>
          </div>
        </div>`;
    }

    document.getElementById('qrViewCard').innerHTML = `
      <div class="space-y-4 max-w-xl mx-auto">
        <!-- Card 1: Encabezado estilo Google Forms con franja morada superior -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="h-3 w-full" style="background: #673ab7;"></div>
          <div class="p-6 text-left">
            <h1 class="text-2xl font-bold text-[#202124] tracking-tight mb-2">Registro de Asistencia — Fundación A+</h1>
            <div class="text-xs text-[#5f6368] space-y-1 mb-4">
              <p>Cohorte: <strong class="text-[#202124]">${escapeHtml(registro.cohorte)}</strong></p>
              <p>Docente: <strong class="text-[#202124]">${escapeHtml(registro.docente)}</strong></p>
              <p>Fecha: <span class="capitalize">${hoy}</span></p>
            </div>
            ${estadoSesionHtml}
            <div class="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-[#d93025]">
              <span>* Indica que la pregunta es obligatoria</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Pregunta / Formulario estilo Google Forms -->
        <div class="bg-white rounded-xl shadow-sm border ${errorInicial ? 'border-red-400' : 'border-gray-200'} p-6 text-left transition" id="cardPreguntaUsuario">
          <label for="googleFormUsuarioInput" class="block text-sm font-semibold text-[#202124] mb-1">
            Correo institucional o Usuario asignado <span class="text-[#d93025]">*</span>
          </label>
          <p class="text-xs text-[#5f6368] mb-4">Ingresa tu correo institucional o tu nombre de usuario para registrar tu asistencia automáticamente en esta y futuras clases.</p>
          
          <div class="relative mb-2">
            <input 
              id="googleFormUsuarioInput" 
              type="text" 
              autocomplete="email" 
              placeholder="Tu respuesta" 
              value="${escapeHtml(savedEmail)}"
              class="w-full text-sm text-[#202124] py-2.5 px-3 border-b-2 border-gray-300 focus:border-[#673ab7] focus:outline-none transition bg-transparent placeholder-gray-400"
            />
          </div>
          <div id="googleFormErrorMsg" class="${errorInicial ? '' : 'hidden'} text-xs text-[#d93025] mt-1.5 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            <span id="googleFormErrorText">${escapeHtml(errorInicial)}</span>
          </div>
        </div>

        <!-- Card 3: Botón de Enviar -->
        <div class="flex items-center justify-between pt-1">
          <button 
            type="button" 
            onclick="enviarFormularioAsistencia('${token}')" 
            id="btnEnviarAsistencia"
            class="rounded-lg text-white font-medium text-sm px-7 py-2.5 shadow hover:shadow-md transition flex items-center gap-2 cursor-pointer"
            style="background: #673ab7;"
          >
            <span id="btnEnviarText">Enviar</span>
            <svg id="btnEnviarSpinner" class="hidden animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </button>
          <button 
            type="button" 
            onclick="document.getElementById('googleFormUsuarioInput').value='';" 
            class="text-xs font-semibold text-[#5f6368] hover:text-[#202124] transition cursor-pointer"
          >
            Borrar formulario
          </button>
        </div>

        <div class="text-center pt-4">
          <p class="text-[11px] text-[#5f6368]">Formulario de asistencia automatizada · Fundación A+</p>
        </div>
      </div>`;

    const input = document.getElementById('googleFormUsuarioInput');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') enviarFormularioAsistencia(token);
      });
    }
  }

  // Envía la respuesta del formulario y la procesa en MySQL
  async function enviarFormularioAsistencia(token, valorDirecto) {
    const input = document.getElementById('googleFormUsuarioInput');
    const valor = ((valorDirecto !== undefined && valorDirecto !== null) ? valorDirecto : (input ? input.value : '')).trim();
    const errorEl = document.getElementById('googleFormErrorMsg');
    const errorText = document.getElementById('googleFormErrorText');
    const cardPregunta = document.getElementById('cardPreguntaUsuario');
    const btn = document.getElementById('btnEnviarAsistencia');
    const btnText = document.getElementById('btnEnviarText');
    const btnSpinner = document.getElementById('btnEnviarSpinner');

    if (!valor) {
      if (errorEl && errorText) {
        errorText.textContent = 'Esta pregunta es obligatoria';
        errorEl.classList.remove('hidden');
        if (cardPregunta) cardPregunta.classList.add('border-red-400');
        if (input) input.focus();
      }
      return;
    }

    if (errorEl) errorEl.classList.add('hidden');
    if (cardPregunta) cardPregunta.classList.remove('border-red-400');

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Enviando...';
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    let devId = '';
    try {
      devId = localStorage.getItem('fa_dispositivo_id') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('fa_dispositivo_id', devId);
      }
    } catch (e) {}

    try {
      const resp = await fetch(API_BASE_URL + '/api/qr_asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ token, usuario: valor, dispositivoId: devId })
      });
      const res = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Si falló en modo automático, renderizar formulario editable con el error
        if (!document.getElementById('googleFormUsuarioInput')) {
          renderQrLandingEstudianteGoogleForm(window.__ultimoQrDatosEstudiante || { registro: { token }, sesionActiva: true }, res.error || 'Error al registrar asistencia.');
          return;
        }
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Enviar';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (errorEl && errorText) {
          errorText.textContent = res.error || 'Error al registrar asistencia.';
          errorEl.classList.remove('hidden');
          if (cardPregunta) cardPregunta.classList.add('border-red-400');
        }
        return;
      }

      // Guardamos la identidad para futuros escaneos automatizados
      try {
        localStorage.setItem('aplus_estudiante_email', valor);
      } catch (e) {}

      renderConfirmacionGoogleForm(res, token);
    } catch (err) {
      if (!document.getElementById('googleFormUsuarioInput')) {
        renderQrLandingEstudianteGoogleForm(window.__ultimoQrDatosEstudiante || { registro: { token }, sesionActiva: true }, 'No se pudo comunicar con el servidor local.');
        return;
      }
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Enviar';
      if (btnSpinner) btnSpinner.classList.add('hidden');
      if (errorEl && errorText) {
        errorText.textContent = 'No se pudo comunicar con el servidor local.';
        errorEl.classList.remove('hidden');
      }
    }
  }
  window.enviarFormularioAsistencia = enviarFormularioAsistencia;

  // Pantalla de confirmación estilo Google Forms
  function renderConfirmacionGoogleForm(res, token) {
    if (timerEsperaDocenteQr) {
      clearInterval(timerEsperaDocenteQr);
      timerEsperaDocenteQr = null;
    }

    const estadoBadge = res.estado === 'Presente' 
      ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:#0f8f89;"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Presente (Puntual)</span>'
      : '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:#b5790f;"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Llegada con retraso (Tarde)</span>';

    document.getElementById('qrViewCard').innerHTML = `
      <div class="space-y-4 text-left max-w-xl mx-auto">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="h-3 w-full" style="background: #673ab7;"></div>
          <div class="p-6">
            <h1 class="text-2xl font-bold text-[#202124] tracking-tight mb-2">Registro de Asistencia — Fundación A+</h1>
            <p class="text-sm text-[#202124] mb-4">${res.yaRegistrado ? 'Tu asistencia ya había sido registrada previamente para esta clase.' : 'Se ha registrado tu respuesta correctamente en el sistema.'}</p>
            
            <div class="rounded-xl p-4 bg-gray-50 border border-gray-200 space-y-2 mb-6">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Estudiante:</span>
                <span class="text-sm font-bold text-ink">${escapeHtml(res.estudiante)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Estado:</span>
                <span>${estadoBadge}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Cohorte / Materia:</span>
                <span class="text-xs font-medium text-ink">${escapeHtml(res.cohorte)} · ${escapeHtml(res.materia)}</span>
              </div>
              ${res.hora ? `
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Hora de registro:</span>
                <span class="text-xs font-semibold text-slate2">${escapeHtml(res.hora)}</span>
              </div>` : ''}
            </div>

            <div class="pt-3 flex items-center gap-2.5 text-xs text-[#0f8f89] font-medium bg-[#1FC8C014] p-3 rounded-xl border border-[#1FC8C0]/30">
              <svg class="w-4 h-4 shrink-0 text-[#0f8f89]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span>Tu respuesta ha sido registrada y bloqueada para esta clase. No se permite enviar otra respuesta.</span>
            </div>
          </div>
        </div>

        <div class="text-center pt-2">
          <p class="text-[11px] text-[#5f6368]">Fundación A+ — Sistema de Control de Asistencia</p>
        </div>
      </div>`;
  }
  window.renderConfirmacionGoogleForm = renderConfirmacionGoogleForm;


  // Exportar funciones y estado al scope global (window)
  window.VENTANA_PUNTUAL_MIN = VENTANA_PUNTUAL_MIN;
  window.VENTANA_TARDE_MIN = VENTANA_TARDE_MIN;
  window.fechaHoyLocal = fechaHoyLocal;
  window.horaHoyLocal = horaHoyLocal;
  window.getOrCrearTokenQR = getOrCrearTokenQR;
  window.regenerarTokensQRCohorte = regenerarTokensQRCohorte;
  window.materiaDeDocenteEnCohorte = materiaDeDocenteEnCohorte;
  window.urlQr = urlQr;
  window.copiarLinkQr = copiarLinkQr;
  window.pintarQrImprimible = pintarQrImprimible;
  window.imprimirQr = imprimirQr;
  window.calcularTokenEfimeroSesion = calcularTokenEfimeroSesion;
  window.validarTokenSesionConGracia = validarTokenSesionConGracia;
  window.manejarSeleccionArchivoJustificacion = manejarSeleccionArchivoJustificacion;
  window.abrirModalJustificarAsistencia = abrirModalJustificarAsistencia;
  window.cerrarModalJustificarAsistencia = cerrarModalJustificarAsistencia;
  window.enviarJustificacionEstudiante = enviarJustificacionEstudiante;
  window.abrirModalVisorJustificacion = abrirModalVisorJustificacion;
  window.abrirEvidenciaJustificacion = abrirEvidenciaJustificacion;
  window.descargarEvidenciaJustificacion = descargarEvidenciaJustificacion;
  window.cerrarModalVisorJustificacion = cerrarModalVisorJustificacion;
  window.aprobarJustificacionDocente = aprobarJustificacionDocente;
  window.rechazarJustificacionDocente = rechazarJustificacionDocente;
  window.abrirModalAjusteHorasDocente = abrirModalAjusteHorasDocente;
  window.cerrarModalAjusteHorasDocente = cerrarModalAjusteHorasDocente;
  window.actualizarCalculoHorasDocente = actualizarCalculoHorasDocente;
  window.setPresetAjusteHoras = setPresetAjusteHoras;
  window.guardarAjusteHorasDocente = guardarAjusteHorasDocente;
  window.confirmarTodosPresentesDocente = confirmarTodosPresentesDocente;
  window.generarCodigoSesion = generarCodigoSesion;
  window.sesionAsistenciaHoy = sesionAsistenciaHoy;
  window.minutosTranscurridos = minutosTranscurridos;
  window.estadoPorTiempo = estadoPorTiempo;
  window.sincronizarAusentesSesion = sincronizarAusentesSesion;
  window.estadoVentanaSesion = estadoVentanaSesion;
  window.estadoActualEstudianteSesion = estadoActualEstudianteSesion;
  window.filtrarAsistenciaDocenteLive = filtrarAsistenciaDocenteLive;
  window.setFiltroEstadoDocente = setFiltroEstadoDocente;
  window.aplicarFiltrosTablaDocente = aplicarFiltrosTablaDocente;
  window.filtrarHistorialDocenteLive = filtrarHistorialDocenteLive;
  window.setFiltroEstadoHistorialDocente = setFiltroEstadoHistorialDocente;
  window.aplicarFiltrosHistorialDocente = aplicarFiltrosHistorialDocente;
  window.renderAsistenciaDocente = renderAsistenciaDocente;
  window.combosDocenteCohorte = combosDocenteCohorte;
  window.cambiarFiltroQrCohorte = cambiarFiltroQrCohorte;
  window.renderCodigosQr = renderCodigosQr;
  window.cambiarCohorteAsistDocente = cambiarCohorteAsistDocente;
  window.habilitarSesionAsistenciaDocente = habilitarSesionAsistenciaDocente;
  window.qrLandingShell = qrLandingShell;
  window.fmtHora = fmtHora;
  window.copiarEnlaceDocente = copiarEnlaceDocente;
  window.copiarEnlaceEstudiante = copiarEnlaceEstudiante;
  window.verificarSesionEstudianteQr = verificarSesionEstudianteQr;
  window.recargarEstadoDocenteQr = recargarEstadoDocenteQr;
  window.manejarQrEnURL = manejarQrEnURL;
  window.renderQrLandingDocente = renderQrLandingDocente;
  window.renderQrLandingEstudianteGoogleForm = renderQrLandingEstudianteGoogleForm;
  window.enviarFormularioAsistencia = enviarFormularioAsistencia;
  window.renderConfirmacionGoogleForm = renderConfirmacionGoogleForm;

})();
