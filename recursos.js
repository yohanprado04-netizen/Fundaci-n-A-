/**
 * recursos.js — Módulo Integral de Reserva y Gestión de Recursos
 * (Inventario, Asignaciones, Solicitudes y Préstamos de Equipos)
 */



(function() {
  'use strict';

  const escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
    ? window.escapeHtml
    : (str) => String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);

// Inmediata exportación de renderers en window para evitar bucle de carga o esperas no sincronizadas
if (typeof window !== 'undefined') {
  window.renderRecursos = renderRecursos;
  window.renderSolicitudesAdmin = renderSolicitudesAdmin;
  window.renderAsignacionesRecursos = renderAsignacionesRecursos;
  window.renderHistorialPrestamosAdmin = renderHistorialPrestamosAdmin;
  window.renderSolicitarEquipoForm = renderSolicitarEquipoForm;
  if (!window.RENDERERS_DOCENTE) window.RENDERERS_DOCENTE = {};
  window.RENDERERS_DOCENTE['solicitar_equipo'] = () => renderSolicitarEquipoForm('mount-t-solicitar_equipo');
  if (!window.RENDERERS_ESTUDIANTE) window.RENDERERS_ESTUDIANTE = {};
  window.RENDERERS_ESTUDIANTE['solicitar_equipo'] = () => renderSolicitarEquipoForm('mount-s-solicitar_equipo');
}

// =========================================================================
// SISTEMA DE NOTIFICACIONES POR CORREO PARA RECURSOS (EMAILJS + SMTP BACKEND)
// =========================================================================
async function notificarRecursoPorCorreo(tipo, params = {}) {
  let cfg = {};
  try {
    cfg = (typeof Store !== 'undefined' && Store.get) ? (await Store.get('configuracion') || {}) : {};
  } catch (e) {}

  const emailFundacion = cfg.correo || 'info@fundacionamas.org.co';
  const nombreFundacion = cfg.nombre || 'Fundación A+';

  let destinatarioEmail = '';
  let destinatarioNombre = '';
  let asunto = '';
  let mensajeTexto = '';
  let mensajeHtml = '';

  const pieInstitucionalAntispam = `
    <div style="background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">${escapeHtml(nombreFundacion)} &bull; Gestión y Préstamo de Recursos</p>
      <p style="margin: 0 0 6px 0;">Quibdó, Chocó, Colombia &bull; Contacto: <a href="mailto:${escapeHtml(emailFundacion)}" style="color: #6366f1; text-decoration: none;">${escapeHtml(emailFundacion)}</a></p>
      <p style="margin: 0; font-size: 10px; color: #94a3b8;">Recibes esta notificación transaccional porque estás registrado en la plataforma académica de ${escapeHtml(nombreFundacion)}. Este es un mensaje institucional automático para la trazabilidad de inventarios.</p>
    </div>
  `;

  if (tipo === 'solicitud_nueva') {
    destinatarioEmail = emailFundacion;
    destinatarioNombre = 'Coordinación ' + nombreFundacion;
    asunto = `${nombreFundacion} | Nueva solicitud de recurso radicada - ${params.solicitante || 'Usuario'}`;
    mensajeTexto = `Se ha recibido una nueva solicitud de recurso en la plataforma:\n\n` +
      `Solicitante: ${params.solicitante || 'No especificado'} (${params.rol || 'Estudiante'})\n` +
      `Correo: ${params.email || 'No registrado'}\n` +
      `Categoría: ${params.categoria || '-'}\n` +
      `Tipo: ${params.tipo || 'Temporal'}\n` +
      `Fecha límite requerida: ${params.fecha || 'No indicada'}\n` +
      `Motivo: ${params.motivo || '-'}\n\n` +
      `Por favor ingresa al panel de Solicitudes Pendientes para evaluar la petición.\n\n` +
      `Fundación A+ - Quibdó, Chocó - info@fundacionamas.org.co`;

    mensajeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #6B21A8; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">${escapeHtml(nombreFundacion)}</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Gestión de Recursos e Inventario</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Nueva Solicitud de Recurso Radicada</h3>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Un integrante de la comunidad académica ha solicitado un equipo físico a través de la plataforma:</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 0 0 8px 0;"><strong>Solicitante:</strong> ${escapeHtml(params.solicitante || '')} <span style="color:#6B21A8;">(${escapeHtml(params.rol || 'Estudiante')})</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Correo:</strong> ${escapeHtml(params.email || '')}</p>
            <p style="margin: 0 0 8px 0;"><strong>Recurso:</strong> ${escapeHtml(params.categoria || '')} (${escapeHtml(params.tipo || 'Temporal')})</p>
            ${params.fecha ? `<p style="margin: 0 0 8px 0;"><strong>Fecha límite solicitada:</strong> ${escapeHtml(params.fecha)}</p>` : ''}
            <div style="margin-top: 10px; padding: 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
              <strong style="color: #475569; font-size: 11px; text-transform: uppercase;">Justificación:</strong>
              <p style="margin: 4px 0 0 0; font-style: italic; color: #334155;">"${escapeHtml(params.motivo || '')}"</p>
            </div>
          </div>
          <p style="font-size: 12px; color: #64748b;">Ingresa a la plataforma institucional para evaluar esta solicitud en la bandeja de Solicitudes Pendientes.</p>
        </div>
        ${pieInstitucionalAntispam}
      </div>
    `;
  } else if (tipo === 'aprobada') {
    destinatarioEmail = (params.email || '').trim();
    destinatarioNombre = params.solicitante || 'Estudiante';
    asunto = `${nombreFundacion} | Solicitud de recurso aprobada - ${params.recursoNombre || params.categoria || 'Equipo'}`;
    mensajeTexto = `Hola ${params.solicitante || ''},\n\n` +
      `Tu solicitud de préstamo de equipo ha sido aprobada por la Coordinación.\n\n` +
      `Equipo asignado: ${params.recursoNombre || ''} (${params.recursoCodigo || ''})\n` +
      `Serial: ${params.serial || 'Asignado en sede'}\n` +
      `Fecha límite de devolución: ${params.fechaLimite || 'Pactada con Coordinación'}\n\n` +
      `Puedes acercarte a la sede central para el retiro físico del activo con tu documento de identidad.\n\n` +
      `Fundación A+ - Quibdó, Chocó - info@fundacionamas.org.co`;

    mensajeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0D9488; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">${escapeHtml(nombreFundacion)}</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Confirmación de Préstamo Aprobado</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <h3 style="margin-top: 0; font-size: 16px; color: #047857;">Tu solicitud ha sido aprobada</h3>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Hola <strong>${escapeHtml(params.solicitante || '')}</strong>, la Coordinación Académica ha revisado y autorizado tu petición de recurso tecnológico.</p>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 0 0 8px 0;"><strong>Equipo Asignado:</strong> ${escapeHtml(params.recursoNombre || params.categoria || '')}</p>
            <p style="margin: 0 0 8px 0;"><strong>Código de Activo:</strong> <span style="font-family: monospace; font-weight: bold; color: #065f46;">${escapeHtml(params.recursoCodigo || '-')}</span></p>
            ${params.serial ? `<p style="margin: 0 0 8px 0;"><strong>Serial:</strong> <span style="font-family: monospace;">${escapeHtml(params.serial)}</span></p>` : ''}
            <p style="margin: 0 0 8px 0;"><strong>Fecha Límite Improrrogable:</strong> <strong style="color: #b91c1c;">${params.fechaLimite ? new Date(params.fechaLimite).toLocaleString() : 'Pactada en sede'}</strong></p>
          </div>
          <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong>Compromisos del beneficiario:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 18px;">
              <li>Uso exclusivo para actividades formativas del programa.</li>
              <li>Presentar documento de identidad al recibir el activo.</li>
              <li>Devolver el equipo y sus accesorios a tiempo en la sede de la fundación.</li>
            </ul>
          </div>
        </div>
        ${pieInstitucionalAntispam}
      </div>
    `;
  } else if (tipo === 'rechazada') {
    destinatarioEmail = (params.email || '').trim();
    destinatarioNombre = params.solicitante || 'Estudiante';
    asunto = `${nombreFundacion} | Información sobre tu solicitud de recurso - ${params.categoria || 'Equipo'}`;
    mensajeTexto = `Hola ${params.solicitante || ''},\n\n` +
      `Te informamos que tu solicitud de recurso (${params.categoria || ''}) no pudo ser aprobada en este momento.\n\n` +
      `Observación: ${params.motivoRechazo || 'Disponibilidad limitada de equipos en inventario.'}\n\n` +
      `Te invitamos a consultar con tu docente o acercarte a la sala comunitaria de la sede.\n\n` +
      `Fundación A+ - Quibdó, Chocó - info@fundacionamas.org.co`;

    mensajeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #475569; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">${escapeHtml(nombreFundacion)}</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Estado de Solicitud de Recurso</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <h3 style="margin-top: 0; font-size: 16px; color: #334155;">Actualización sobre tu Solicitud</h3>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Hola <strong>${escapeHtml(params.solicitante || '')}</strong>, te informamos que en esta ocasión no fue posible autorizar el préstamo del recurso solicitado (${escapeHtml(params.categoria || '')}).</p>
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <strong style="color: #9f1239;">Motivo / Observación:</strong>
            <p style="margin: 6px 0 0 0; font-style: italic; color: #881337;">"${escapeHtml(params.motivoRechazo || 'Actualmente los equipos solicitados se encuentran asignados a talleres prioritarios o en mantenimiento.')}"</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Si requieres una alternativa para realizar tus actividades académicas, consulta con el docente de tu cohorte o acércate a la sala comunitaria en sede.</p>
        </div>
        ${pieInstitucionalAntispam}
      </div>
    `;
  }

  if (!destinatarioEmail || !destinatarioEmail.includes('@')) {
    console.warn('[notificarRecursoPorCorreo] Destinatario sin correo válido:', destinatarioEmail);
    return { ok: false, error: 'Sin correo de destinatario válido' };
  }

  // --- VÍA 1: EMAILJS (Principal desde el Navegador) ---
  let emailJsExitoso = false;
  try {
    const pubKey = cfg.emailjsPublicKey || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.publicKey : 'eIyshGVkR2fYZQJfO');
    const srvId = cfg.emailjsServiceId || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.serviceId : 'service_20mxfgu');
    const tmplId = cfg.emailjsTemplateId || (typeof EMAILJS_CONFIG !== 'undefined' ? EMAILJS_CONFIG.templateId : 'template_qvmzl1l');

    if (typeof emailjs !== 'undefined' && pubKey && srvId && tmplId) {
      if (typeof asegurarEmailJsInicializado === 'function') asegurarEmailJsInicializado(pubKey);
      await emailjs.send(srvId, tmplId, {
        to_email: destinatarioEmail,
        email: destinatarioEmail,
        user_email: destinatarioEmail,
        to_name: destinatarioNombre,
        name: destinatarioNombre,
        subject: asunto,
        reply_to: emailFundacion,
        from_name: nombreFundacion,
        organization: nombreFundacion,
        message: mensajeTexto,
        message_html: mensajeHtml,
      });
      emailJsExitoso = true;
      console.log(`[notificarRecursoPorCorreo] EmailJS enviado exitosamente a ${destinatarioEmail}`);
    }
  } catch (errEmailJs) {
    console.warn('[notificarRecursoPorCorreo] EmailJS reportó advertencia (intentando vía Backend PHP SMTP):', errEmailJs.message || errEmailJs);
  }

  // --- VÍA 2: BACKEND PHP SMTP (Secundaria / Servidor) ---
  let backendExitoso = false;
  try {
    const tokenSesion = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem(DB_PREFIX_TOKEN + 'authToken') || '');
    const resp = await fetch(API_BASE_URL + '/api/enviar_correo', {
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
        mensajeHtml: mensajeHtml,
      })
    });
    if (resp.ok) {
      backendExitoso = true;
      console.log(`[notificarRecursoPorCorreo] Backend PHP SMTP enviado a ${destinatarioEmail}`);
    }
  } catch (errBackend) {
    console.warn('[notificarRecursoPorCorreo] Fallo de respaldo SMTP backend:', errBackend.message || errBackend);
  }

  if (emailJsExitoso || backendExitoso) {
    const vias = [];
    if (emailJsExitoso) vias.push('EmailJS');
    if (backendExitoso) vias.push('SMTP');
    toast(`Notificación enviada a ${destinatarioEmail} (${vias.join(' + ')})`, 'ok');
  } else {
    toast(`Notificación procesada para ${destinatarioEmail}`, 'info');
  }
}
window.notificarRecursoPorCorreo = notificarRecursoPorCorreo;

// MÓDULO INTEGRAL DE RESERVA Y GESTIÓN DE RECURSOS (FASES 1 - 3+)
// =========================================================================

// --- UTILIDAD: IDENTIFICAR USUARIO ACTUAL EN SESIÓN ---
function getUsuarioSesionActual() {
  const doc = (typeof window.getCurrentDocente === 'function') ? window.getCurrentDocente() : (typeof currentDocente !== 'undefined' ? currentDocente : null);
  if (doc && doc.nombre) {
    return { nombre: doc.nombre, email: doc.email || '', rol: 'Docente', id: doc.id };
  }
  const est = (typeof window.getCurrentEstudiante === 'function') ? window.getCurrentEstudiante() : (typeof currentEstudiante !== 'undefined' ? currentEstudiante : null);
  if (est && est.nombre) {
    return { nombre: est.nombre, email: est.email || '', rol: 'Estudiante', id: est.id };
  }
  const admUser = (typeof window.getCurrentAdminUser === 'function') ? window.getCurrentAdminUser() : (typeof currentAdminUser !== 'undefined' ? currentAdminUser : null);
  if (admUser && admUser.nombre) {
    return { nombre: admUser.nombre, email: admUser.email || '', rol: admUser.rol || 'Administrador', id: admUser.id };
  }
  const admRole = (typeof window.getCurrentAdminRole === 'function') ? window.getCurrentAdminRole() : (typeof currentAdminRole !== 'undefined' ? currentAdminRole : null);
  if (admRole === 'superadmin') {
    return { nombre: 'Superadmin', email: 'admin@aplus.org', rol: 'Superadmin', id: 'admin-super' };
  }
  return { nombre: 'Usuario Plataforma', email: '', rol: 'Docente', id: null };
}
window.getUsuarioSesionActual = getUsuarioSesionActual;

// --- UTILIDAD: DETECCIÓN Y CÁLCULO DE RETRASO (OVERDUE) ---
function isOverdue(r) {
  if (!r || r.estado !== 'Prestado' || !r.fecha_limite) return false;
  const fechaLimite = new Date(r.fecha_limite);
  return !isNaN(fechaLimite.getTime()) && fechaLimite < new Date();
}
window.isOverdue = isOverdue;

function calcularRetraso(fechaLimiteStr) {
  if (!fechaLimiteStr) return { dias: 0, horas: 0, texto: '' };
  const limite = new Date(fechaLimiteStr);
  const ahora = new Date();
  if (limite >= ahora) return { dias: 0, horas: 0, texto: '' };
  const diffMs = ahora - limite;
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffHoras / 24);
  const horasRestantes = diffHoras % 24;
  let texto = '';
  if (diffDias > 0) {
    texto = `${diffDias} d${horasRestantes > 0 ? ` ${horasRestantes}h` : ''}`;
  } else {
    texto = `${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
  }
  return { dias: diffDias, horas: diffHoras, texto };
}
window.calcularRetraso = calcularRetraso;

// --- SEMILLAS INICIALES (MOCK OFFLINE SEED DATA) ---
let _datosInicialesAsegurados = false;
let _asegurarDatosPromise = null;

async function asegurarDatosInicialesRecursos() {
  if (_datosInicialesAsegurados) return;
  if (_asegurarDatosPromise) return _asegurarDatosPromise;

  _asegurarDatosPromise = (async () => {
    try {
      const recursos = await Store.list('recursos_inventario');
      if (!recursos || recursos.length === 0) {
        const ahora = new Date();
        const ayer = new Date(ahora.getTime() - 26 * 60 * 60 * 1000).toISOString().slice(0, 16);
        const enDosDias = new Date(ahora.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);

        const demoRecursos = [
          {
            id: 'rec_lap_001',
            codigo: 'LAP-001',
            nombre: 'MacBook Air M1 13"',
            categoria: 'Laptops',
            estado: 'Disponible',
            marca: 'Apple',
            modelo: 'A2337 Space Gray',
            serial: 'FVFX9081JHD2',
            responsable: null,
            tipo_asignacion: null,
            fecha_entrega: null,
            fecha_limite: null
          },
          {
            id: 'rec_lap_002',
            codigo: 'LAP-002',
            nombre: 'Lenovo ThinkPad T14 Gen 2',
            categoria: 'Laptops',
            estado: 'Prestado',
            marca: 'Lenovo',
            modelo: 'T14 Core i5',
            serial: 'PF2X981L77',
            responsable: 'Carlos Mendoza',
            tipo_asignacion: 'Temporal',
            fecha_entrega: new Date(ahora.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            fecha_limite: ayer
          },
          {
            id: 'rec_lap_003',
            codigo: 'LAP-003',
            nombre: 'Dell Latitude 5420',
            categoria: 'Laptops',
            estado: 'Asignado',
            marca: 'Dell',
            modelo: 'Latitude 5420 i7',
            serial: '87GH12J99',
            responsable: 'Laura Gómez',
            tipo_asignacion: 'Permanente',
            fecha_entrega: new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            fecha_limite: null
          },
          {
            id: 'rec_tab_001',
            codigo: 'TAB-001',
            nombre: 'iPad 10ma Generación 64GB',
            categoria: 'Tablets',
            estado: 'Disponible',
            marca: 'Apple',
            modelo: 'A2696 Silver',
            serial: 'DMP98217H4',
            responsable: null,
            tipo_asignacion: null,
            fecha_entrega: null,
            fecha_limite: null
          },
          {
            id: 'rec_av_001',
            codigo: 'AV-001',
            nombre: 'Proyector Epson PowerLite X49',
            categoria: 'Audio/Video',
            estado: 'En mantenimiento',
            marca: 'Epson',
            modelo: 'PowerLite X49',
            serial: 'X198273610',
            responsable: null,
            tipo_asignacion: null,
            fecha_entrega: null,
            fecha_limite: null,
            observaciones: 'En revisión de lámpara y filtro de polvo.'
          },
          {
            id: 'rec_av_002',
            codigo: 'AV-002',
            nombre: 'Micrófono Inalámbrico Shure BLX24',
            categoria: 'Audio/Video',
            estado: 'Disponible',
            marca: 'Shure',
            modelo: 'BLX24/PG58',
            serial: 'SH8721980',
            responsable: null,
            tipo_asignacion: null,
            fecha_entrega: null,
            fecha_limite: null
          },
          {
            id: 'rec_gen_001',
            codigo: 'GEN-001',
            nombre: 'Impresora HP LaserJet Pro',
            categoria: 'General',
            estado: 'Dado de baja',
            marca: 'HP',
            modelo: 'LaserJet 400 M401n',
            serial: 'HP982171A',
            responsable: null,
            tipo_asignacion: null,
            fecha_entrega: null,
            fecha_limite: null,
            observaciones: 'Tarjeta lógica dañada. Dado de baja por obsolescencia.'
          }
        ];
        await Store.save('recursos_inventario', demoRecursos);
      }

      // Asegurar solicitudes de prueba
      const solicitudes = await Store.list('solicitudes_recursos');
      if (!solicitudes || solicitudes.length === 0) {
        const demoSol = [
          {
            id: 'sol_demo_001',
            solicitante: 'Valentina Torres',
            email: 'valentina@aplus.org',
            rol_solicitante: 'Estudiante',
            categoria: 'Tablets',
            tipo_asignacion: 'Temporal',
            fecha_limite: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            motivo: 'Necesito una tablet para el taller de diseño gráfico e ilustración de este viernes.',
            estado: 'Pendiente',
            fecha_creacion: new Date().toISOString()
          }
        ];
        await Store.save('solicitudes_recursos', demoSol);
      }
    } catch (e) {
      console.warn('[asegurarDatosInicialesRecursos] Error:', e);
    } finally {
      _datosInicialesAsegurados = true;
      _asegurarDatosPromise = null;
    }
  })();

  return _asegurarDatosPromise;
}

// --- MODAL PERSONALIZADO REUTILIZABLE (HOISTED & ROBUSTO) ---
function mostrarModalPersonalizado(title, htmlContent, onSaveCallback, confirmText = 'Guardar') {
  let modalContainer = document.getElementById('recursosCustomModal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'recursosCustomModal';
    modalContainer.className = 'fixed inset-0 z-[200] hidden items-center justify-center p-4 sm:p-6';
    modalContainer.innerHTML = `
      <div class="absolute inset-0 bg-ink/60 backdrop-blur-md transition-opacity" onclick="cerrarModalPersonalizado()"></div>
      <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-springUp flex flex-col max-h-[90vh]">
        <!-- HEADER -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <h3 class="text-lg font-black text-ink tracking-tight" id="rcm-title">Título</h3>
          <button type="button" onclick="cerrarModalPersonalizado()" class="p-2 text-slate2 hover:text-coral hover:bg-coral/10 rounded-xl transition cursor-pointer" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- BODY -->
        <div class="p-6 overflow-y-auto overscroll-contain" id="rcm-content">
        </div>
        <!-- FOOTER -->
        <div class="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button type="button" id="rcm-cancel" onclick="cerrarModalPersonalizado()" class="px-5 py-2.5 text-sm font-bold text-slate2 hover:text-ink hover:bg-gray-200/50 rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button type="button" id="rcm-save" class="btn-glow-primary px-6 py-2.5 text-sm font-bold text-white bg-morado hover:bg-morado/90 rounded-xl shadow-md transition cursor-pointer">
            Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);
  }

  document.getElementById('rcm-title').textContent = title;
  document.getElementById('rcm-content').innerHTML = htmlContent;

  const btnSave = document.getElementById('rcm-save');
  const btnCancel = document.getElementById('rcm-cancel');

  if (onSaveCallback) {
    btnSave.classList.remove('hidden');
    btnSave.disabled = false;
    btnSave.textContent = confirmText || 'Guardar';
    if (btnCancel) btnCancel.textContent = 'Cancelar';
    btnSave.onclick = async () => {
      btnSave.disabled = true;
      btnSave.innerHTML = `<svg class="animate-spin h-4 w-4 text-white inline-block mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Procesando...`;
      
      try {
        let shouldClose = true;
        const result = await onSaveCallback();
        if (result === false) shouldClose = false;
        if (shouldClose) cerrarModalPersonalizado();
        else {
          btnSave.disabled = false;
          btnSave.textContent = confirmText || 'Guardar';
        }
      } catch (err) {
        console.error('[rcm-save] Error:', err);
        toast('Ocurrió un error: ' + err.message, 'error');
        btnSave.disabled = false;
        btnSave.textContent = confirmText || 'Guardar';
      }
    };
  } else {
    btnSave.classList.add('hidden');
    if (btnCancel) btnCancel.textContent = 'Cerrar';
  }

  modalContainer.classList.remove('hidden');
  modalContainer.classList.add('flex');
}
window.mostrarModalPersonalizado = mostrarModalPersonalizado;

function cerrarModalPersonalizado() {
  const m = document.getElementById('recursosCustomModal');
  if (m) {
    m.classList.remove('flex');
    m.classList.add('hidden');
  }
}
window.cerrarModalPersonalizado = cerrarModalPersonalizado;

// =========================================================================
// 1. DASHBOARD E INVENTARIO DE RECURSOS (ADMIN)
// =========================================================================
async function renderRecursos() {
  const mount = document.getElementById('mount-recursos');
  if (!mount) return;

  try {
    await asegurarDatosInicialesRecursos();
    const recursos = await Store.list('recursos_inventario') || [];

  // Estadísticas
  const total = recursos.length;
  const disponibles = recursos.filter(r => r.estado === 'Disponible').length;
  const asignados = recursos.filter(r => r.estado === 'Asignado').length;
  const prestados = recursos.filter(r => r.estado === 'Prestado').length;
  const enCustodia = asignados + prestados;
  const mantenimiento = recursos.filter(r => r.estado === 'En mantenimiento').length;
  const bajas = recursos.filter(r => r.estado === 'Dado de baja').length;
  const vencidos = recursos.filter(r => isOverdue(r)).length;

  mount.innerHTML = `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-ink tracking-tight">Inventario y Gestión de Recursos</h2>
          <p class="text-xs text-slate2 mt-0.5">Control de equipos físicos, asignaciones de planta y préstamos de la fundación.</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="abrirModalRecurso()" class="btn-glow-primary px-4 py-2.5 bg-morado text-white rounded-xl text-sm font-bold hover:bg-morado/90 transition shadow-md flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Nuevo Recurso
          </button>
        </div>
      </div>

      <!-- ALERTA SI HAY VENCIDOS -->
      ${vencidos > 0 ? `
        <div class="p-4 rounded-2xl bg-coral/10 border border-coral/30 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-coral animate-ping"></span>
            <div>
              <p class="text-sm font-bold text-coral">¡Hay ${vencidos} préstamo(s) temporal(es) con tiempo límite vencido!</p>
              <p class="text-xs text-slate2">Equipos fuera de plazo que requieren devolución o gestión de prórroga.</p>
            </div>
          </div>
          <button onclick="showPanel('asignaciones_recursos')" class="px-3 py-1.5 rounded-xl bg-coral text-white text-xs font-bold hover:bg-coral/90 transition shadow-sm shrink-0">
            Ver Préstamos Vencidos
          </button>
        </div>
      ` : ''}

      <!-- TARJETAS KPIS Y GRÁFICO -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-slate2 uppercase tracking-wider">Total Equipos</p>
            <span class="p-2 rounded-xl bg-gray-50 text-slate2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L4.2 15.3m15.6 0v1.473c0 .518-.314.974-.8 1.127l-2.434.76A11.023 11.023 0 0112 18.5a11.023 11.023 0 01-4.566-.84L5.001 16.9c-.486-.153-.8-.609-.8-1.127V15.3m15.6 0H4.2"/></svg>
            </span>
          </div>
          <p class="text-3xl font-black text-ink mt-3">${total}</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-emerald-100/60 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Disponibles</p>
            <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </span>
          </div>
          <p class="text-3xl font-black text-emerald-600 mt-3">${disponibles}</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-blue-100/60 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">En Custodia</p>
            <span class="p-2 rounded-xl bg-blue-50 text-blue-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.42 0-8 1.79-8 4v1a1 1 0 001 1h14a1 1 0 001-1v-1c0-2.21-3.58-4-8-4z"/></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <p class="text-3xl font-black text-blue-600">${enCustodia}</p>
            <span class="text-[11px] text-slate2 font-semibold">(${asignados} perm. / ${prestados} temp.)</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-amber-600 uppercase tracking-wider">Mantenimiento / Bajas</p>
            <span class="p-2 rounded-xl bg-amber-50 text-amber-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <p class="text-3xl font-black text-amber-600">${mantenimiento}</p>
            <span class="text-[11px] text-slate2 font-semibold">(${bajas} de baja)</span>
          </div>
        </div>
      </div>

      <!-- TABLA DE INVENTARIO CON FILTROS AVANZADOS -->
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div class="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-ink">Catálogo de Equipos</h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-slate2 font-bold">${total}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <input type="text" id="busquedaRecurso" oninput="filtrarRecursos()" placeholder="Buscar código, nombre, serial o custodio..." class="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-morado focus:ring-1 focus:ring-morado outline-none w-64 bg-white" />
            <select id="filtroCategoriaRecurso" onchange="filtrarRecursos()" class="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-morado outline-none bg-white font-semibold text-slate2">
              <option value="">Todas las categorías</option>
              <option value="Laptops">Laptops</option>
              <option value="Tablets">Tablets</option>
              <option value="Audio/Video">Audio / Video</option>
              <option value="General">General / Otros</option>
            </select>
            <select id="filtroEstadoRecurso" onchange="filtrarRecursos()" class="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-morado outline-none bg-white font-semibold text-slate2">
              <option value="">Todos los estados</option>
              <option value="Disponible">Disponibles</option>
              <option value="Prestado">Prestados (Temporal)</option>
              <option value="Asignado">Asignados (Permanente)</option>
              <option value="En mantenimiento">En mantenimiento</option>
              <option value="Dado de baja">Dados de baja</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2">
                <th class="p-4 font-bold w-12 text-center">Tipo</th>
                <th class="p-4 font-bold">Equipo / Especificaciones</th>
                <th class="p-4 font-bold">Etiqueta (Asset Tag)</th>
                <th class="p-4 font-bold">Categoría</th>
                <th class="p-4 font-bold">Estado</th>
                <th class="p-4 font-bold">Custodio Actual</th>
                <th class="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbody-recursos" class="text-xs text-ink divide-y divide-gray-50">
              <!-- Render dinámico -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderTablaRecursos(recursos);
  } catch (err) {
    console.error('[renderRecursos] Error al renderizar catálogo de recursos:', err);
    mount.innerHTML = `
      <div class="admin-panel-card p-10 text-center flex flex-col items-center justify-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-coral/10 text-coral flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">No se pudo cargar el inventario de recursos</p>
          <p class="text-xs text-slate2 mt-1 max-w-md">${escapeHtml(err.message || 'Error inesperado al cargar recursos')}</p>
        </div>
        <button onclick="renderRecursos()" class="mt-2 px-5 py-2 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition cursor-pointer">Reintentar</button>
      </div>`;
  }
}
window.renderRecursos = renderRecursos;

window.filtrarRecursos = async function() {
  const recursos = await Store.list('recursos_inventario') || [];
  renderTablaRecursos(recursos);
};

function renderTablaRecursos(recursos) {
  const tbody = document.getElementById('tbody-recursos');
  if (!tbody) return;

  if (!recursos || recursos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate2 text-sm">No hay recursos registrados en el inventario.</td></tr>`;
    return;
  }

  const query = (document.getElementById('busquedaRecurso')?.value || '').toLowerCase().trim();
  const catFiltro = document.getElementById('filtroCategoriaRecurso')?.value || '';
  const estadoFiltro = document.getElementById('filtroEstadoRecurso')?.value || '';

  const filtrados = recursos.filter(r => {
    const matchQuery = !query || 
      (r.nombre || '').toLowerCase().includes(query) ||
      (r.codigo || '').toLowerCase().includes(query) ||
      (r.serial || '').toLowerCase().includes(query) ||
      (r.marca || '').toLowerCase().includes(query) ||
      (r.modelo || '').toLowerCase().includes(query) ||
      (r.responsable || '').toLowerCase().includes(query);

    const matchCat = !catFiltro || r.categoria === catFiltro;
    const matchEstado = !estadoFiltro || r.estado === estadoFiltro;

    return matchQuery && matchCat && matchEstado;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate2 text-sm">No se encontraron equipos que coincidan con los filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(r => {
    let statusBadge = 'bg-gray-100 text-gray-700 border-gray-200';
    let statusDot = 'bg-gray-400';
    if (r.estado === 'Disponible') {
      statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      statusDot = 'bg-emerald-500';
    } else if (r.estado === 'Prestado') {
      const vencido = isOverdue(r);
      statusBadge = vencido ? 'bg-coral/10 text-coral border-coral/30' : 'bg-blue-50 text-blue-700 border-blue-200/60';
      statusDot = vencido ? 'bg-coral animate-ping' : 'bg-blue-500';
    } else if (r.estado === 'Asignado') {
      statusBadge = 'bg-purple-50 text-purple-700 border-purple-200/60';
      statusDot = 'bg-purple-500';
    } else if (r.estado === 'En mantenimiento') {
      statusBadge = 'bg-amber-50 text-amber-700 border-amber-200/60';
      statusDot = 'bg-amber-500';
    } else if (r.estado === 'Dado de baja') {
      statusBadge = 'bg-rose-50 text-rose-700 border-rose-200/60';
      statusDot = 'bg-rose-500';
    }

    // Icono por categoría
    let iconSvg = `<svg class="w-5 h-5 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L4.2 15.3m15.6 0v1.473c0 .518-.314.974-.8 1.127l-2.434.76A11.023 11.023 0 0112 18.5a11.023 11.023 0 01-4.566-.84L5.001 16.9c-.486-.153-.8-.609-.8-1.127V15.3m15.6 0H4.2"/></svg>`;
    if (r.categoria === 'Laptops') {
      iconSvg = `<svg class="w-5 h-5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
    } else if (r.categoria === 'Tablets') {
      iconSvg = `<svg class="w-5 h-5 text-turquesa" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
    } else if (r.categoria === 'Audio/Video') {
      iconSvg = `<svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
    }

    let delayTag = '';
    if (r.estado === 'Prestado' && isOverdue(r)) {
      const ret = calcularRetraso(r.fecha_limite);
      delayTag = `<div class="mt-1 flex items-center gap-1 text-[10px] font-black text-coral">
                    <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Retraso: ${ret.texto}
                  </div>`;
    }

    return `
      <tr class="hover:bg-gray-50/60 transition ${isOverdue(r) ? 'bg-coral/5' : ''}">
        <td class="p-3 text-center">
          <div class="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto shadow-2xs">
            ${iconSvg}
          </div>
        </td>
        <td class="p-3">
          <p class="font-bold text-ink text-sm">${escapeHtml(r.nombre || 'Sin nombre')}</p>
          <p class="text-[11px] text-slate2 mt-0.5">${escapeHtml(r.marca || '')} ${escapeHtml(r.modelo || '')}</p>
        </td>
        <td class="p-3">
          <p class="font-mono text-xs font-bold text-morado bg-morado/5 px-2 py-0.5 rounded-md inline-block border border-morado/15">${escapeHtml(r.codigo || '-')}</p>
          <p class="text-[10px] text-slate2 mt-1">SN: ${escapeHtml(r.serial || '-')}</p>
        </td>
        <td class="p-3">
          <span class="text-xs font-semibold text-slate2">${escapeHtml(r.categoria || 'General')}</span>
        </td>
        <td class="p-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge}">
            <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
            ${r.estado}
          </span>
          ${delayTag}
        </td>
        <td class="p-3 text-slate2">
          ${r.responsable ? `
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-morado/10 text-morado flex items-center justify-center text-[10px] font-bold shrink-0">
                ${r.responsable.charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="text-xs font-bold text-ink leading-tight">${escapeHtml(r.responsable)}</p>
                <p class="text-[10px] text-slate2">${r.tipo_asignacion === 'Permanente' ? 'Asignación Planta' : 'Préstamo Temporal'}</p>
              </div>
            </div>
          ` : '<span class="text-gray-400 italic text-xs">Sin asignar (En bodega)</span>'}
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            ${r.estado === 'Disponible' ? `
              <button onclick="accionCheckout('${r.id}')" class="px-3 py-1.5 rounded-xl bg-morado hover:bg-morado/90 text-white text-xs font-bold shadow-sm transition flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                Entregar
              </button>
            ` : (r.estado === 'Prestado' || r.estado === 'Asignado') ? `
              <button onclick="accionCheckin('${r.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                Recibir
              </button>
            ` : `
              <button onclick="abrirModalRecurso('${r.id}')" class="px-2.5 py-1.5 rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-100 text-xs font-bold transition">
                Gestionar
              </button>
            `}
            <button onclick="abrirModalRecurso('${r.id}')" class="p-2 text-slate2 hover:text-morado hover:bg-morado/10 rounded-xl transition" title="Editar características">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- CREAR O EDITAR RECURSO ---
window.abrirModalRecurso = async function(id = null) {
  let r = { codigo: '', nombre: '', categoria: 'Laptops', marca: '', modelo: '', serial: '', estado: 'Disponible', observaciones: '' };
  if (id) {
    const recursos = await Store.list('recursos_inventario') || [];
    r = recursos.find(x => x.id === id) || r;
  }

  const html = `
    <div class="p-1 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Código (Asset Tag)*</label>
          <input type="text" id="r_codigo" value="${escapeHtml(r.codigo || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado focus:ring-1 focus:ring-morado outline-none" placeholder="Ej: LAP-001" />
        </div>
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Nombre del Equipo*</label>
          <input type="text" id="r_nombre" value="${escapeHtml(r.nombre || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado focus:ring-1 focus:ring-morado outline-none" placeholder="Ej: MacBook Pro 13" />
        </div>
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Categoría</label>
          <select id="r_categoria" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none">
            <option value="Laptops" ${r.categoria==='Laptops'?'selected':''}>Laptops</option>
            <option value="Tablets" ${r.categoria==='Tablets'?'selected':''}>Tablets</option>
            <option value="Audio/Video" ${r.categoria==='Audio/Video'?'selected':''}>Audio / Video</option>
            <option value="General" ${r.categoria==='General'?'selected':''}>General / Otros</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Estado</label>
          <select id="r_estado" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none">
            <option value="Disponible" ${r.estado==='Disponible'?'selected':''}>Disponible</option>
            <option value="Prestado" ${r.estado==='Prestado'?'selected':''}>Prestado (Temporal)</option>
            <option value="Asignado" ${r.estado==='Asignado'?'selected':''}>Asignado (Permanente)</option>
            <option value="En mantenimiento" ${r.estado==='En mantenimiento'?'selected':''}>En mantenimiento</option>
            <option value="Dado de baja" ${r.estado==='Dado de baja'?'selected':''}>Dado de baja</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Marca</label>
          <input type="text" id="r_marca" value="${escapeHtml(r.marca || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" placeholder="Ej: Apple, Lenovo, Dell" />
        </div>
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Modelo</label>
          <input type="text" id="r_modelo" value="${escapeHtml(r.modelo || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" placeholder="Ej: ThinkPad T14" />
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-bold text-ink mb-1">Número de Serie (Serial)</label>
          <input type="text" id="r_serial" value="${escapeHtml(r.serial || '')}" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" placeholder="Ej: PF2X981L" />
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-bold text-ink mb-1">Ubicación / Notas / Observaciones</label>
          <textarea id="r_observaciones" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" placeholder="Bodega A, estante 2, detalles de mantenimiento, etc.">${escapeHtml(r.observaciones || '')}</textarea>
        </div>
      </div>
    </div>
  `;

  mostrarModalPersonalizado(id ? 'Editar Recurso' : 'Nuevo Recurso', html, async () => {
    const recursos = await Store.list('recursos_inventario') || [];
    const nuevo = {
      id: id || uid('rec'),
      codigo: document.getElementById('r_codigo').value.trim(),
      nombre: document.getElementById('r_nombre').value.trim(),
      categoria: document.getElementById('r_categoria').value,
      estado: document.getElementById('r_estado').value,
      marca: document.getElementById('r_marca').value.trim(),
      modelo: document.getElementById('r_modelo').value.trim(),
      serial: document.getElementById('r_serial').value.trim(),
      observaciones: document.getElementById('r_observaciones').value.trim(),
      responsable: r.responsable || null,
      tipo_asignacion: r.tipo_asignacion || null,
      fecha_limite: r.fecha_limite || null,
      fecha_entrega: r.fecha_entrega || null
    };

    if (!nuevo.codigo || !nuevo.nombre) {
      toast('Código y Nombre son obligatorios.', 'error');
      return false;
    }

    if (id) {
      const idx = recursos.findIndex(x => x.id === id);
      if (idx > -1) recursos[idx] = { ...recursos[idx], ...nuevo };
    } else {
      recursos.push(nuevo);
    }

    await Store.save('recursos_inventario', recursos);
    toast('Recurso guardado correctamente', 'success');

    if (typeof registrarAuditoriaAccion === 'function') {
      await registrarAuditoriaAccion(id ? 'Recurso modificado' : 'Nuevo recurso creado', 'Administrador', 'Recursos', `${nuevo.nombre} (${nuevo.codigo})`);
    }

    if (typeof renderRecursos === 'function') renderRecursos();
    if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
    return true;
  });
};

// --- CHECKOUT: ASIGNAR O PRESTAR UN EQUIPO ---
window.filtrarPersonasCheckout = function(term) {
  const select = document.getElementById('co_persona');
  if (!select) return;
  const q = (term || '').toLowerCase().trim();
  Array.from(select.options).forEach((opt, idx) => {
    if (idx === 0 || opt.value === '__tercero__') {
      opt.hidden = false;
      return;
    }
    const txt = (opt.textContent || '').toLowerCase();
    opt.hidden = !(!q || txt.includes(q));
  });
  if (q) {
    const primerVisible = Array.from(select.options).find((opt, idx) => idx > 1 && !opt.hidden);
    if (primerVisible) {
      select.value = primerVisible.value;
      const manualWrap = document.getElementById('co_persona_manual_wrap');
      if (manualWrap) manualWrap.classList.add('hidden');
    }
  }
};

window.accionCheckout = async function(id) {
  const usuarios = await Store.list('usuarios') || [];
  const optionsUsuarios = usuarios.map(u => `<option value="${escapeHtml(u.nombre)}">${escapeHtml(u.nombre)} (${escapeHtml(u.rol || 'Estudiante')}) - ${escapeHtml(u.email || '')}</option>`).join('');

  const html = `
    <div class="p-1 space-y-4">
      <div>
        <label class="block text-xs font-bold text-ink mb-1">Destinatario / Responsable del Equipo:</label>
        <div class="relative mb-2">
          <input type="text" id="co_buscar_persona" oninput="filtrarPersonasCheckout(this.value)" placeholder="Buscar por nombre, correo o rol..." class="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:border-morado focus:ring-1 focus:ring-morado outline-none bg-slate-50" />
          <svg class="w-4 h-4 text-slate2 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <select id="co_persona" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-morado outline-none" onchange="document.getElementById('co_persona_manual_wrap').classList.toggle('hidden', this.value !== '__tercero__')">
          <option value="">-- Seleccionar usuario de la plataforma --</option>
          <option value="__tercero__">+ Tercero / Persona externa (Escribir nombre abajo)</option>
          ${optionsUsuarios}
        </select>
        
        <div id="co_persona_manual_wrap" class="hidden mt-2">
          <label class="block text-[11px] font-bold text-morado mb-1">Nombre completo del Tercero / Externo:</label>
          <input type="text" id="co_persona_manual" class="w-full border border-morado/40 bg-morado/5 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" placeholder="Ej: Juan Martínez (Invitado / Tallerista externo)" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-ink mb-1">Modalidad de Asignación:</label>
        <div class="grid grid-cols-2 gap-3 mt-1.5">
          <label class="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-morado transition has-[:checked]:border-morado has-[:checked]:bg-morado/5">
            <input type="radio" name="co_tipo" value="Temporal" checked onchange="document.getElementById('co_fecha_div').classList.remove('hidden')" class="text-morado focus:ring-morado">
            <div>
              <p class="text-xs font-bold text-ink">Préstamo Temporal</p>
              <p class="text-[10px] text-slate2">Con fecha y hora límite de retorno</p>
            </div>
          </label>
          <label class="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-morado transition has-[:checked]:border-morado has-[:checked]:bg-morado/5">
            <input type="radio" name="co_tipo" value="Permanente" onchange="document.getElementById('co_fecha_div').classList.add('hidden')" class="text-morado focus:ring-morado">
            <div>
              <p class="text-xs font-bold text-ink">Asignación Permanente</p>
              <p class="text-[10px] text-slate2">Asignación fija de planta</p>
            </div>
          </label>
        </div>
      </div>

      <div id="co_fecha_div">
        <label class="block text-xs font-bold text-ink mb-1">Fecha y Hora Límite de Devolución:</label>
        <input type="datetime-local" id="co_fecha_limite" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-morado outline-none" />
        <p class="text-[10px] text-slate2 mt-1">El sistema alertará automáticamente tanto al administrador como al usuario si se excede este plazo.</p>
      </div>
    </div>
  `;

// --- TRAZABILIDAD Y REGISTRO EN HISTORIAL DE PRESTAMOS ---
async function registrarPrestamoEnHistorial({ recurso, persona, tipo = 'Temporal', fechaLimite = null, motivo = '', observaciones = '', entregadoPor = null }) {
  try {
    const usuarios = await Store.list('usuarios') || [];
    const pTrim = (persona || '').trim().toLowerCase();
    const uMatch = usuarios.find(u => (u.nombre || '').trim().toLowerCase() === pTrim || (u.email || '').trim().toLowerCase() === pTrim);
    const sesion = typeof getUsuarioSesionActual === 'function' ? getUsuarioSesionActual() : null;

    const item = {
      id: typeof uid === 'function' ? uid('prest') : ('prest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      recurso_id: recurso.id,
      recurso_codigo: recurso.codigo || '',
      recurso_nombre: recurso.nombre || '',
      recurso_categoria: recurso.categoria || 'General',
      recurso_serial: recurso.serial || '',
      usuario_id: uMatch ? uMatch.id : null,
      usuario_nombre: uMatch ? uMatch.nombre : persona,
      usuario_email: uMatch ? (uMatch.email || '') : (persona.includes('@') ? persona : ''),
      usuario_rol: uMatch ? (uMatch.rol || 'Estudiante') : 'Estudiante',
      cohorte: uMatch ? (uMatch.cohorte || '') : '',
      tipo_asignacion: tipo,
      fecha_prestamo: new Date().toISOString(),
      fecha_limite: fechaLimite || null,
      fecha_devolucion: null,
      estado: 'Activo',
      motivo: motivo || (tipo === 'Permanente' ? 'Asignacion fija institucional' : 'Prestamo para actividades formativas'),
      observaciones_entrega: observaciones || 'Equipo entregado en optimas condiciones operativas y fisicas.',
      observaciones_devolucion: null,
      entregado_por: entregadoPor || sesion?.nombre || 'Administracion',
      recibido_por: null
    };

    if (typeof apiFetch === 'function') {
      await apiFetch('historial_prestamos', {
        method: 'POST',
        body: JSON.stringify([item])
      }).catch(err => console.warn('[registrarPrestamoEnHistorial] Error API:', err.message));
    }

    if (typeof Store !== 'undefined' && Store.clearCache) {
      Store.clearCache('historial_prestamos');
    }
    return item;
  } catch (e) {
    console.error('[registrarPrestamoEnHistorial] Error:', e);
    return null;
  }
}
window.registrarPrestamoEnHistorial = registrarPrestamoEnHistorial;

async function cerrarPrestamoEnHistorial({ recursoId, anteriorCustodio, observaciones = '', recibidoPor = null }) {
  try {
    const sesion = typeof getUsuarioSesionActual === 'function' ? getUsuarioSesionActual() : null;
    const adminNombre = recibidoPor || sesion?.nombre || 'Administracion';

    let prestamos = [];
    try {
      prestamos = await Store.list('historial_prestamos', { forceRefresh: true }) || [];
    } catch (e) {
      prestamos = [];
    }

    const cTrim = (anteriorCustodio || '').trim().toLowerCase();
    const prestamoActivo = prestamos.find(p => 
      p.recurso_id === recursoId && 
      (p.estado === 'Activo' || p.estado === 'Retrasado') &&
      (!cTrim || (p.usuario_nombre || '').trim().toLowerCase() === cTrim || (p.usuario_email || '').trim().toLowerCase() === cTrim)
    ) || prestamos.find(p => p.recurso_id === recursoId && (p.estado === 'Activo' || p.estado === 'Retrasado'));

    const ahora = new Date();
    let nuevoEstado = 'Devuelto';
    if (prestamoActivo && prestamoActivo.fecha_limite) {
      const fLim = new Date(prestamoActivo.fecha_limite);
      if (ahora > fLim) {
        nuevoEstado = 'Devuelto con retraso';
      }
    }

    if (prestamoActivo && typeof apiFetch === 'function') {
      await apiFetch('historial_prestamos', {
        method: 'PUT',
        body: JSON.stringify({
          id: prestamoActivo.id,
          estado: nuevoEstado,
          fecha_devolucion: ahora.toISOString(),
          recibido_por: adminNombre,
          observaciones_devolucion: observaciones || 'Devolucion verificada en bodega.'
        })
      }).catch(err => console.warn('[cerrarPrestamoEnHistorial] Error PUT api:', err.message));
    }

    if (typeof Store !== 'undefined' && Store.clearCache) {
      Store.clearCache('historial_prestamos');
    }
  } catch (e) {
    console.error('[cerrarPrestamoEnHistorial] Error:', e);
  }
}
window.cerrarPrestamoEnHistorial = cerrarPrestamoEnHistorial;

  mostrarModalPersonalizado('Entregar Equipo (Checkout)', html, async () => {
    const selPersona = document.getElementById('co_persona').value;
    const manPersona = document.getElementById('co_persona_manual')?.value.trim();
    const persona = (selPersona === '__tercero__' ? manPersona : selPersona) || manPersona;

    if (!persona) {
      toast('Debe seleccionar o escribir a quién se le entrega el equipo.', 'error');
      return false;
    }

    const tipo = document.querySelector('input[name="co_tipo"]:checked').value;
    let fechaLimite = null;
    if (tipo === 'Temporal') {
      fechaLimite = document.getElementById('co_fecha_limite').value;
      if (!fechaLimite) {
        toast('Debe indicar la fecha límite de devolución para un préstamo temporal.', 'error');
        return false;
      }
    }

    const recursos = await Store.list('recursos_inventario') || [];
    const idx = recursos.findIndex(x => x.id === id);
    if (idx > -1) {
      const rec = recursos[idx];
      rec.estado = tipo === 'Permanente' ? 'Asignado' : 'Prestado';
      rec.responsable = persona;
      rec.tipo_asignacion = tipo;
      rec.fecha_limite = fechaLimite;
      rec.fecha_entrega = new Date().toISOString();

      await Store.save('recursos_inventario', recursos);

      // Guardar en historial permanente
      await registrarPrestamoEnHistorial({
        recurso: rec,
        persona: persona,
        tipo: tipo,
        fechaLimite: fechaLimite,
        motivo: tipo === 'Permanente' ? 'Asignacion fija institucional' : 'Prestamo temporal para actividades formativas'
      });

      toast(`Equipo entregado a ${persona} (${tipo})`, 'success');

      if (typeof registrarAuditoriaAccion === 'function') {
        await registrarAuditoriaAccion('Equipo entregado', persona, 'Recursos', `${rec.nombre} (${rec.codigo}) - ${tipo}`);
      }

      if (typeof renderRecursos === 'function') renderRecursos();
      if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
      if (typeof renderHistorialPrestamosAdmin === 'function') renderHistorialPrestamosAdmin();
      return true;
    }
    return false;
  });
};

// --- RECEPCION DIRECTA DE PRESTAMO (HISTORIAL & TRAZABILIDAD) ---
async function recibirEquipoHistorial(prestamoId, recursoId) {
  try {
    await asegurarDatosInicialesRecursos();

    let prestamos = window._ultimaListaHistorialPrestamos;
    if (!prestamos || prestamos.length === 0) {
      prestamos = await Store.list('historial_prestamos', { forceRefresh: true }) || [];
    }

    const p = prestamos.find(x => x.id === prestamoId || (recursoId && x.recurso_id === recursoId && (x.estado === 'Activo' || x.estado === 'Retrasado')));
    if (!p) {
      toast('No se encontró el registro del préstamo en el sistema.', 'error');
      return;
    }

    const ahora = new Date();
    const vencido = p.estado === 'Retrasado' || (p.fecha_limite && new Date(p.fecha_limite) < ahora);
    
    let detalleRetraso = '';
    if (vencido && p.fecha_limite) {
      const diffMs = ahora - new Date(p.fecha_limite);
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHoras = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      detalleRetraso = diffDias > 0 ? `${diffDias} día(s) y ${diffHoras} hora(s)` : `${diffHoras} hora(s)`;
    }

    const sesion = (typeof getUsuarioSesionActual === 'function' ? getUsuarioSesionActual() : null);
    const adminNombre = sesion?.nombre || 'Administración';

    const html = `
      <div class="space-y-4 text-xs">
        <!-- DETALLES DEL EQUIPO Y CUSTODIO -->
        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
          <div class="flex items-center justify-between">
            <p class="font-extrabold text-ink text-sm">${escapeHtml(p.recurso_nombre)}</p>
            <span class="font-mono text-[11px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-lg">${escapeHtml(p.recurso_codigo || '-')}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate2 pt-1 border-t border-slate-200/50">
            <p>Custodio: <strong class="text-ink">${escapeHtml(p.usuario_nombre)}</strong></p>
            <p>Correo: <span class="text-ink font-medium">${escapeHtml(p.usuario_email || 'Sin correo')}</span></p>
            <p>Modalidad: <span class="font-bold text-ink">${escapeHtml(p.tipo_asignacion || 'Temporal')}</span></p>
            <p>Préstamo: <span class="font-medium text-ink">${p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleDateString() : '-'}</span></p>
          </div>
          ${p.fecha_limite ? `
            <p class="text-[11px] text-slate2 pt-1">Fecha límite convenida: <strong class="${vencido ? 'text-coral' : 'text-ink'}">${new Date(p.fecha_limite).toLocaleString()}</strong></p>
          ` : ''}
        </div>

        <!-- ALERTA DE TIEMPO / ESTADO -->
        ${vencido ? `
          <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div>
              <p class="font-bold text-xs text-rose-900">Devolución extemporánea (${detalleRetraso ? 'retraso de ' + detalleRetraso : 'fecha límite vencida'})</p>
              <p class="text-[11px] text-rose-700/90 mt-0.5">El activo se marcará como <strong>Devuelto con retraso</strong> en la trazabilidad institucional.</p>
            </div>
          </div>
        ` : `
          <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5">
            <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="font-bold text-xs">Devolución dentro del plazo pactado. El activo se marcará como <strong>Devuelto</strong>.</p>
          </div>
        `}

        <!-- OBSERVACIONES DE RECEPCION -->
        <div>
          <label class="block text-xs font-bold text-ink mb-1">Estado físico y observaciones de recepción en bodega:</label>
          <textarea id="checkin_historial_obs" rows="3" class="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-morado outline-none" placeholder="Indica el estado del equipo al recibirlo...">Devolución verificada en bodega. Equipo recibido en óptimas condiciones físicas y operativas con accesorios completos.</textarea>
        </div>
      </div>
    `;

    mostrarModalPersonalizado('Recibir Equipo en Bodega (Checkin)', html, async () => {
      const obs = document.getElementById('checkin_historial_obs')?.value.trim() || 'Devolución verificada en bodega.';
      const nuevoEstado = vencido ? 'Devuelto con retraso' : 'Devuelto';
      const fechaDevIso = ahora.toISOString();

      // 1. Actualizar MySQL vía API
      const fetchFn = (typeof apiFetch === 'function' ? apiFetch : (window.apiFetch || null));
      if (fetchFn) {
        try {
          await fetchFn('historial_prestamos', {
            method: 'PUT',
            body: JSON.stringify({
              id: p.id,
              estado: nuevoEstado,
              fecha_devolucion: fechaDevIso,
              recibido_por: adminNombre,
              observaciones_devolucion: obs
            })
          });
        } catch (errApi) {
          console.warn('[recibirEquipoHistorial] Error llamando API PUT:', errApi.message);
        }
      }

      // 2. Limpiar caché de Store
      if (typeof Store !== 'undefined' && Store.clearCache) {
        Store.clearCache('historial_prestamos');
      }

      // 3. Actualizar memoria local para reactividad inmediata
      p.estado = nuevoEstado;
      p.fecha_devolucion = fechaDevIso;
      p.recibido_por = adminNombre;
      p.observaciones_devolucion = obs;

      // 4. Actualizar inventario (reincorporar recurso a Disponible)
      try {
        const recursos = await Store.list('recursos_inventario') || [];
        const rIdx = recursos.findIndex(r => r.id === p.recurso_id || (p.recurso_codigo && r.codigo === p.recurso_codigo));
        if (rIdx !== -1) {
          recursos[rIdx].estado = 'Disponible';
          recursos[rIdx].responsable = null;
          recursos[rIdx].tipo_asignacion = null;
          recursos[rIdx].fecha_entrega = null;
          recursos[rIdx].fecha_limite = null;
          await Store.save('recursos_inventario', recursos);
        }
      } catch (errInv) {
        console.warn('[recibirEquipoHistorial] Error actualizando inventario:', errInv);
      }

      // 5. Auditoría
      if (typeof registrarAuditoriaAccion === 'function') {
        await registrarAuditoriaAccion('Equipo devuelto', p.usuario_nombre || 'Custodio', 'Recursos', `${p.recurso_nombre} (${p.recurso_codigo || ''})`);
      }

      toast('Equipo recibido y reincorporado a bodega con éxito', 'ok');

      // 6. Refrescar vistas
      renderHistorialPrestamosAdmin();
      if (typeof renderRecursos === 'function') renderRecursos();
      if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
      return true;
    }, 'Confirmar Recepción');
  } catch (err) {
    console.error('[recibirEquipoHistorial] Error:', err);
    toast('Error al procesar recepción: ' + err.message, 'error');
  }
}
window.recibirEquipoHistorial = recibirEquipoHistorial;

// --- CHECKIN: DEVOLVER EQUIPO A DISPONIBLE CON REGISTRO HISTORICO ---
window.accionCheckin = async function(id) {
  // Si id corresponde a un préstamo activo en historial, delegar a recibirEquipoHistorial
  const prestamos = window._ultimaListaHistorialPrestamos || await Store.list('historial_prestamos') || [];
  const prestamo = prestamos.find(p => (p.id === id || p.recurso_id === id) && (p.estado === 'Activo' || p.estado === 'Retrasado'));
  if (prestamo) {
    return recibirEquipoHistorial(prestamo.id, prestamo.recurso_id);
  }

  await asegurarDatosInicialesRecursos();
  const recursos = await Store.list('recursos_inventario') || [];
  const idx = recursos.findIndex(x => x.id === id || x.codigo === id);
  if (idx === -1) {
    toast('No se encontró el equipo seleccionado en el inventario.', 'error');
    return;
  }

  const rec = recursos[idx];
  const anteriorCustodio = rec.responsable || 'Usuario no registrado';
  const vencido = isOverdue(rec);
  const retraso = calcularRetraso(rec.fecha_limite);

  const html = `
    <div class="space-y-4 text-xs">
      <div class="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
        <div class="flex items-center justify-between">
          <p class="font-extrabold text-ink text-sm">${escapeHtml(rec.nombre)}</p>
          <span class="font-mono text-[11px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-lg">${escapeHtml(rec.codigo || '-')}</span>
        </div>
        <p class="text-slate2">Custodio actual: <strong class="text-ink">${escapeHtml(anteriorCustodio)}</strong></p>
        <p class="text-slate2">Modalidad: <span class="font-bold text-ink">${escapeHtml(rec.tipo_asignacion || 'Temporal')}</span></p>
        ${rec.fecha_limite ? `<p class="text-slate2">Fecha limite pactada: <span class="font-bold">${new Date(rec.fecha_limite).toLocaleString()}</span></p>` : ''}
      </div>

      ${vencido ? `
        <div class="p-3 rounded-xl bg-coral/10 border border-coral/30 text-coral flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="font-bold">Devolución con retraso de ${retraso.texto}. Se registrará en la auditoría de cumplimiento.</p>
        </div>
      ` : `
        <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          <p class="font-bold">Devolución a tiempo dentro del plazo convenido.</p>
        </div>
      `}

      <div>
        <label class="block text-xs font-bold text-ink mb-1">Estado físico y observaciones de recepción:</label>
        <textarea id="checkin_obs" rows="3" class="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:border-morado outline-none" placeholder="Indica el estado del equipo al recibirlo...">Devolución verificada en bodega. Equipo recibido en óptimas condiciones físicas y operativas con accesorios completos.</textarea>
      </div>
    </div>
  `;

  mostrarModalPersonalizado('Recibir Equipo (Checkin)', html, async () => {
    const obs = document.getElementById('checkin_obs')?.value.trim() || 'Devolución verificada en bodega.';

    rec.estado = 'Disponible';
    rec.responsable = null;
    rec.tipo_asignacion = null;
    rec.fecha_limite = null;
    rec.fecha_entrega = null;

    await Store.save('recursos_inventario', recursos);

    // Cerrar prestamo en historial permanente
    await cerrarPrestamoEnHistorial({
      recursoId: rec.id,
      anteriorCustodio: anteriorCustodio,
      observaciones: obs
    });

    toast('Equipo recibido y reincorporado a Disponible', 'ok');

    if (typeof registrarAuditoriaAccion === 'function') {
      await registrarAuditoriaAccion('Equipo devuelto', anteriorCustodio || 'Admin', 'Recursos', `${rec.nombre} (${rec.codigo})`);
    }

    if (typeof renderRecursos === 'function') renderRecursos();
    if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
    if (typeof renderHistorialPrestamosAdmin === 'function') renderHistorialPrestamosAdmin();
    return true;
  }, 'Confirmar Recepción');
};

// =========================================================================
// 2. DASHBOARD DE PRÉSTAMOS, ASIGNACIONES Y PERSONAS SIN EQUIPO (ADMIN)
// =========================================================================
async function renderAsignacionesRecursos() {
  const mount = document.getElementById('mount-asignaciones_recursos');
  if (!mount) return;

  try {
    await asegurarDatosInicialesRecursos();
    const recursos = await Store.list('recursos_inventario') || [];
    let usuarios = [];
    try {
      usuarios = await Store.list('usuarios') || [];
    } catch (e) {
      usuarios = [];
    }

    const asignados = recursos.filter(r => r.estado === 'Asignado' || r.estado === 'Prestado');
    const asignacionesPermanentes = asignados.filter(r => r.tipo_asignacion === 'Permanente');
    const prestamosTemporales = asignados.filter(r => r.tipo_asignacion === 'Temporal');
    
    // Personas que tienen equipo activo
    const responsablesActivos = asignados.map(r => (r.responsable || '').toLowerCase().trim());
    const usuariosElegibles = usuarios.filter(u => u.rol === 'Docente' || u.rol === 'Estudiante');
    const sinEquipo = usuariosElegibles.filter(u => !responsablesActivos.includes((u.nombre || '').toLowerCase().trim()));

    // Conteo de vencidos
    const vencidosCount = prestamosTemporales.filter(r => isOverdue(r)).length;
    const activeTab = window.recursosAsignacionesTab || 'temporales';

    mount.innerHTML = `
      <div class="p-6 max-w-7xl mx-auto space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-ink tracking-tight">Préstamos y Asignaciones de Equipos</h2>
            <p class="text-xs text-slate2 mt-0.5">Seguimiento de préstamos con fecha límite, equipos de planta y personal sin dotación.</p>
          </div>
          ${vencidosCount > 0 ? `
            <span class="inline-flex items-center gap-2 bg-coral text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-sm animate-pulse">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ¡${vencidosCount} préstamo(s) con entrega retrasada!
            </span>
          ` : ''}
        </div>

        <!-- TABS DE NAVEGACIÓN -->
        <div class="flex items-center gap-2 border-b border-gray-200">
          <button onclick="window.recursosAsignacionesTab='temporales'; renderAsignacionesRecursos();" class="pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'temporales' ? 'border-morado text-morado' : 'border-transparent text-slate2 hover:text-ink'}">
            <span>Préstamos Temporales</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] ${vencidosCount > 0 ? 'bg-coral text-white' : 'bg-morado/10 text-morado'}">${prestamosTemporales.length}</span>
          </button>
          <button onclick="window.recursosAsignacionesTab='permanentes'; renderAsignacionesRecursos();" class="pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'permanentes' ? 'border-morado text-morado' : 'border-transparent text-slate2 hover:text-ink'}">
            <span>Asignaciones Permanentes</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-slate2">${asignacionesPermanentes.length}</span>
          </button>
          <button onclick="window.recursosAsignacionesTab='sinequipo'; renderAsignacionesRecursos();" class="pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'sinequipo' ? 'border-morado text-morado' : 'border-transparent text-slate2 hover:text-ink'}">
            <span>Personas sin Equipo</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">${sinEquipo.length}</span>
          </button>
        </div>

        <!-- CONTENIDO DEL TAB -->
        ${activeTab === 'temporales' ? renderPrestamosTemporalesHTML(prestamosTemporales) : 
          activeTab === 'permanentes' ? renderAsignacionesActivasHTML(asignacionesPermanentes) : 
          renderPersonasSinEquipoHTML(sinEquipo, recursos.filter(r => r.estado === 'Disponible'))}
      </div>
    `;
  } catch (err) {
    console.error('[renderAsignacionesRecursos] Error al renderizar asignaciones:', err);
    mount.innerHTML = `
      <div class="admin-panel-card p-10 text-center flex flex-col items-center justify-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-coral/10 text-coral flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">No se pudieron cargar los préstamos y asignaciones</p>
          <p class="text-xs text-slate2 mt-1 max-w-md">${escapeHtml(err.message || 'Error inesperado al cargar asignaciones')}</p>
        </div>
        <button onclick="renderAsignacionesRecursos()" class="mt-2 px-5 py-2 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition cursor-pointer">Reintentar</button>
      </div>`;
  }
}
window.renderAsignacionesRecursos = renderAsignacionesRecursos;

function renderPrestamosTemporalesHTML(prestamos) {
  if (prestamos.length === 0) {
    return `<div class="p-12 text-center text-slate2 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">No hay préstamos temporales activos en este momento.</div>`;
  }

  const rows = prestamos.map(r => {
    const vencido = isOverdue(r);
    const ret = calcularRetraso(r.fecha_limite);

    let alertaHtml = '';
    let rowClass = 'hover:bg-gray-50/60';
    if (vencido) {
      rowClass = 'bg-coral/5 hover:bg-coral/10';
      alertaHtml = `
        <div class="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-coral text-white text-[10px] font-black shadow-2xs">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Excedido por: ${ret.texto}
        </div>`;
    }

    return `
      <tr class="${rowClass} transition">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-morado/10 text-morado font-bold flex items-center justify-center text-xs shrink-0">
              ${r.responsable.charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-bold text-ink text-sm">${escapeHtml(r.responsable)}</p>
              ${alertaHtml}
            </div>
          </div>
        </td>
        <td class="p-4">
          <p class="font-bold text-ink text-sm">${escapeHtml(r.nombre)}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="font-mono text-[10px] font-bold text-morado bg-morado/5 px-2 py-0.5 rounded border border-morado/10">${escapeHtml(r.codigo || '-')}</span>
            <span class="text-[10px] text-slate2">SN: ${escapeHtml(r.serial || '-')}</span>
          </div>
        </td>
        <td class="p-4">
          <p class="text-xs font-bold ${vencido ? 'text-coral' : 'text-ink'}">${r.fecha_limite ? new Date(r.fecha_limite).toLocaleString() : 'Sin fecha límite'}</p>
          <p class="text-[10px] text-slate2 mt-0.5">Entregado: ${r.fecha_entrega ? new Date(r.fecha_entrega).toLocaleDateString() : '-'}</p>
        </td>
        <td class="p-4 text-center">
          <button onclick="accionCheckin('${r.id}')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
            Recibir Devolución
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2">
            <th class="p-4 font-bold">Responsable / Estado</th>
            <th class="p-4 font-bold">Equipo en Préstamo</th>
            <th class="p-4 font-bold">Fecha Límite de Retorno</th>
            <th class="p-4 font-bold text-center">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 text-xs">
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderAsignacionesActivasHTML(asignados) {
  if (asignados.length === 0) {
    return `<div class="p-12 text-center text-slate2 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">No hay equipos asignados permanentemente.</div>`;
  }

  const rows = asignados.map(r => `
    <tr class="hover:bg-gray-50/60 transition">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
            ${r.responsable.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-bold text-ink text-sm">${escapeHtml(r.responsable)}</p>
            <span class="text-[10px] text-purple-600 font-semibold">Dotación Permanente</span>
          </div>
        </div>
      </td>
      <td class="p-4">
        <p class="font-bold text-ink text-sm">${escapeHtml(r.nombre)}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="font-mono text-[10px] font-bold text-morado bg-morado/5 px-2 py-0.5 rounded border border-morado/10">${escapeHtml(r.codigo || '-')}</span>
          <span class="text-[10px] text-slate2">SN: ${escapeHtml(r.serial || '-')}</span>
        </div>
      </td>
      <td class="p-4 text-slate2 text-xs">
        <span class="px-2 py-0.5 rounded-md bg-gray-100 text-slate2 font-semibold">${escapeHtml(r.categoria || 'General')}</span>
      </td>
      <td class="p-4 text-slate2 text-xs">
        ${r.fecha_entrega ? new Date(r.fecha_entrega).toLocaleDateString() : '-'}
      </td>
      <td class="p-4 text-center">
        <button onclick="accionCheckin('${r.id}')" class="px-3 py-1.5 rounded-xl border border-gray-200 text-slate2 hover:text-coral hover:border-coral hover:bg-coral/5 text-xs font-bold transition shadow-2xs">
          Retirar Asignación
        </button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2">
            <th class="p-4 font-bold">Custodio / Dotación</th>
            <th class="p-4 font-bold">Equipo Asignado</th>
            <th class="p-4 font-bold">Categoría</th>
            <th class="p-4 font-bold">Fecha Asignación</th>
            <th class="p-4 font-bold text-center">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 text-xs">
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderPersonasSinEquipoHTML(sinEquipo, recursosDisponibles) {
  window._ultimaListaSinEquipo = sinEquipo || [];
  if (!sinEquipo || sinEquipo.length === 0) {
    return `
      <div class="p-10 text-center text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
        <svg class="w-8 h-8 mx-auto text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="font-bold text-sm">Cobertura total de equipos</p>
        <p class="text-xs text-emerald-600 mt-1">Todos los docentes y estudiantes activos cuentan actualmente con al menos un equipo asignado o prestado.</p>
      </div>
    `;
  }

  const filtroRol = window.recursosFiltroSinEquipo || 'todos';
  const busqueda = (window.recursosBusquedaSinEquipo || '').toLowerCase().trim();

  const filtrados = sinEquipo.filter(u => {
    if (filtroRol === 'docentes' && u.rol !== 'Docente') return false;
    if (filtroRol === 'estudiantes' && u.rol !== 'Estudiante') return false;
    if (busqueda) {
      const matchNombre = (u.nombre || '').toLowerCase().includes(busqueda);
      const matchEmail = (u.email || '').toLowerCase().includes(busqueda);
      const matchDoc = (u.documento || '').toLowerCase().includes(busqueda);
      const matchCohorte = (u.cohorte || '').toLowerCase().includes(busqueda);
      if (!matchNombre && !matchEmail && !matchDoc && !matchCohorte) return false;
    }
    return true;
  });

  const rows = filtrados.length > 0 ? filtrados.map(u => `
    <tr class="hover:bg-gray-50/60 transition">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${u.rol === 'Docente' ? 'bg-turquesa/10 text-turquesa' : 'bg-oro/15 text-amber-700'} font-bold flex items-center justify-center text-xs shrink-0">
            ${(u.nombre || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-bold text-ink text-sm">${escapeHtml(u.nombre)}</p>
            <p class="text-[11px] text-slate2">${escapeHtml(u.email || 'Sin correo registrado')}</p>
          </div>
        </div>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.rol === 'Docente' ? 'bg-teal-50 text-teal-700 border border-teal-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}">
          ${u.rol}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="asignarEquipoDesdeModal('${escapeHtml(u.nombre)}')" class="px-3.5 py-1.5 rounded-xl bg-morado text-white hover:bg-morado/90 text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Asignar Equipo
        </button>
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="3" class="p-10 text-center text-slate2 text-xs">
        <svg class="w-6 h-6 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <p class="font-bold">No se encontraron personas sin equipo</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Prueba con otro término de búsqueda o cambia el filtro de rol.</p>
      </td>
    </tr>
  `;

  return `
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <!-- HEADER CON BUSCADOR Y FILTROS -->
      <div class="p-4 border-b border-gray-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p class="text-sm font-bold text-ink flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>Usuarios sin dotación de equipo</span>
            <span id="badgeCountSinEquipo" class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">${filtrados.length}</span>
          </p>
          <p class="text-xs text-slate2 mt-0.5">Busca a la persona para asignarle un dispositivo en custodia o préstamo temporal.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- BUSCADOR EN TIEMPO REAL -->
          <div class="relative w-full sm:w-64">
            <input type="text" id="busquedaSinEquipo" value="${escapeHtml(window.recursosBusquedaSinEquipo || '')}" oninput="filtrarPersonasSinEquipoLive(this.value)" placeholder="Buscar por nombre o correo..." class="w-full text-xs border border-gray-200 rounded-xl pl-8 pr-7 py-2 focus:border-morado focus:ring-1 focus:ring-morado outline-none bg-white font-medium" />
            <svg class="w-4 h-4 text-slate2 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <button type="button" id="btnLimpiarBusquedaSinEquipo" onclick="limpiarBusquedaSinEquipo()" class="${window.recursosBusquedaSinEquipo ? '' : 'hidden'} absolute right-2.5 top-2.5 text-slate-400 hover:text-ink cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- FILTROS DE ROL -->
          <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
            <button onclick="window.recursosFiltroSinEquipo='todos'; renderAsignacionesRecursos();" class="px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${filtroRol === 'todos' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">Todos</button>
            <button onclick="window.recursosFiltroSinEquipo='docentes'; renderAsignacionesRecursos();" class="px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${filtroRol === 'docentes' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">Docentes</button>
            <button onclick="window.recursosFiltroSinEquipo='estudiantes'; renderAsignacionesRecursos();" class="px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${filtroRol === 'estudiantes' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">Estudiantes</button>
          </div>
        </div>
      </div>

      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2">
            <th class="p-4 font-bold">Usuario</th>
            <th class="p-4 font-bold">Rol Institucional</th>
            <th class="p-4 font-bold text-center">Acción Rápida</th>
          </tr>
        </thead>
        <tbody id="tbody-sinequipo" class="divide-y divide-gray-50 text-xs">
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

window.filtrarPersonasSinEquipoLive = function(texto) {
  window.recursosBusquedaSinEquipo = texto;
  const btnLimpiar = document.getElementById('btnLimpiarBusquedaSinEquipo');
  if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !texto);

  const sinEquipo = window._ultimaListaSinEquipo || [];
  const filtroRol = window.recursosFiltroSinEquipo || 'todos';
  const query = (texto || '').toLowerCase().trim();

  const filtrados = sinEquipo.filter(u => {
    if (filtroRol === 'docentes' && u.rol !== 'Docente') return false;
    if (filtroRol === 'estudiantes' && u.rol !== 'Estudiante') return false;
    if (query) {
      const matchNombre = (u.nombre || '').toLowerCase().includes(query);
      const matchEmail = (u.email || '').toLowerCase().includes(query);
      const matchDoc = (u.documento || '').toLowerCase().includes(query);
      const matchCohorte = (u.cohorte || '').toLowerCase().includes(query);
      if (!matchNombre && !matchEmail && !matchDoc && !matchCohorte) return false;
    }
    return true;
  });

  const badge = document.getElementById('badgeCountSinEquipo');
  if (badge) badge.textContent = filtrados.length;

  const tbody = document.getElementById('tbody-sinequipo');
  if (!tbody) return;

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="p-10 text-center text-slate2 text-xs">
          <svg class="w-6 h-6 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <p class="font-bold">No se encontraron personas sin equipo</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Prueba con otro término de búsqueda o cambia el filtro de rol.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map(u => `
    <tr class="hover:bg-gray-50/60 transition">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${u.rol === 'Docente' ? 'bg-turquesa/10 text-turquesa' : 'bg-oro/15 text-amber-700'} font-bold flex items-center justify-center text-xs shrink-0">
            ${(u.nombre || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-bold text-ink text-sm">${escapeHtml(u.nombre)}</p>
            <p class="text-[11px] text-slate2">${escapeHtml(u.email || 'Sin correo registrado')}</p>
          </div>
        </div>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.rol === 'Docente' ? 'bg-teal-50 text-teal-700 border border-teal-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}">
          ${u.rol}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="asignarEquipoDesdeModal('${escapeHtml(u.nombre)}')" class="px-3.5 py-1.5 rounded-xl bg-morado text-white hover:bg-morado/90 text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Asignar Equipo
        </button>
      </td>
    </tr>
  `).join('');
};

window.limpiarBusquedaSinEquipo = function() {
  window.recursosBusquedaSinEquipo = '';
  const input = document.getElementById('busquedaSinEquipo');
  if (input) {
    input.value = '';
    input.focus();
  }
  filtrarPersonasSinEquipoLive('');
};

window.asignarEquipoDesdeModal = async function(nombreUsuario) {
  const recursos = await Store.list('recursos_inventario') || [];
  const disponibles = recursos.filter(r => r.estado === 'Disponible');
  
  if (disponibles.length === 0) {
    toast('No hay equipos disponibles en bodega en este momento.', 'error');
    return;
  }

  const options = disponibles.map(r => `<option value="${r.id}">[${escapeHtml(r.categoria)}] ${escapeHtml(r.codigo || '-')} — ${escapeHtml(r.nombre)} (${escapeHtml(r.marca || '')})</option>`).join('');

  const html = `
    <div class="p-1 space-y-4">
      <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
        <p class="text-xs text-slate2">Asignando equipo a:</p>
        <p class="text-sm font-extrabold text-ink mt-0.5">${nombreUsuario}</p>
      </div>

      <div>
        <label class="block text-xs font-bold text-ink mb-1">Seleccionar Equipo Disponible:</label>
        <select id="sel_asignar_equipo" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-morado outline-none">
          ${options}
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-ink mb-1">Modalidad de Asignación:</label>
        <div class="grid grid-cols-2 gap-3 mt-1.5">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer has-[:checked]:border-morado has-[:checked]:bg-morado/5">
            <input type="radio" name="ae_tipo" value="Temporal" checked onchange="document.getElementById('ae_fecha_div').classList.remove('hidden')" class="text-morado focus:ring-morado">
            <div>
              <p class="text-xs font-bold text-ink">Préstamo Temporal</p>
              <p class="text-[10px] text-slate2">Con fecha límite de retorno</p>
            </div>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer has-[:checked]:border-morado has-[:checked]:bg-morado/5">
            <input type="radio" name="ae_tipo" value="Permanente" onchange="document.getElementById('ae_fecha_div').classList.add('hidden')" class="text-morado focus:ring-morado">
            <div>
              <p class="text-xs font-bold text-ink">Permanente</p>
              <p class="text-[10px] text-slate2">Dotación de planta</p>
            </div>
          </label>
        </div>
      </div>

      <div id="ae_fecha_div">
        <label class="block text-xs font-bold text-ink mb-1">Fecha y Hora Límite de Retorno:</label>
        <input type="datetime-local" id="ae_fecha_limite" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-morado outline-none" />
      </div>
    </div>
  `;

  mostrarModalPersonalizado('Entregar Equipo', html, async () => {
    const idRecurso = document.getElementById('sel_asignar_equipo').value;
    if (!idRecurso) return false;

    const tipo = document.querySelector('input[name="ae_tipo"]:checked').value;
    let fechaLimite = null;
    if (tipo === 'Temporal') {
      fechaLimite = document.getElementById('ae_fecha_limite').value;
      if (!fechaLimite) {
        toast('Debe indicar la fecha límite de devolución.', 'error');
        return false;
      }
    }

    const idx = recursos.findIndex(x => x.id === idRecurso);
    if (idx > -1) {
      const rec = recursos[idx];
      rec.estado = tipo === 'Permanente' ? 'Asignado' : 'Prestado';
      rec.responsable = nombreUsuario;
      rec.tipo_asignacion = tipo;
      rec.fecha_limite = fechaLimite;
      rec.fecha_entrega = new Date().toISOString();

      await Store.save('recursos_inventario', recursos);

      // Registrar en historial permanente
      await registrarPrestamoEnHistorial({
        recurso: rec,
        persona: nombreUsuario,
        tipo: tipo,
        fechaLimite: fechaLimite,
        motivo: tipo === 'Permanente' ? 'Dotacion de planta' : 'Prestamo temporal para actividades formativas'
      });

      toast(`Equipo entregado correctamente a ${nombreUsuario}`, 'success');

      if (typeof registrarAuditoriaAccion === 'function') {
        await registrarAuditoriaAccion('Equipo asignado', nombreUsuario, 'Recursos', `${rec.nombre} (${rec.codigo})`);
      }

      if (typeof renderRecursos === 'function') renderRecursos();
      if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
      if (typeof renderHistorialPrestamosAdmin === 'function') renderHistorialPrestamosAdmin();
      return true;
    }
    return false;
  });
};

// =========================================================================
// 3. PORTAL DOCENTE Y ESTUDIANTE: SOLICITAR EQUIPO Y VER ESTADO
// =========================================================================
if (typeof window !== 'undefined') {
  window.renderSolicitarEquipoForm = renderSolicitarEquipoForm;
  if (!window.RENDERERS_DOCENTE) window.RENDERERS_DOCENTE = {};
  window.RENDERERS_DOCENTE['solicitar_equipo'] = () => renderSolicitarEquipoForm('mount-t-solicitar_equipo');
  if (!window.RENDERERS_ESTUDIANTE) window.RENDERERS_ESTUDIANTE = {};
  window.RENDERERS_ESTUDIANTE['solicitar_equipo'] = () => renderSolicitarEquipoForm('mount-s-solicitar_equipo');
}

async function renderSolicitarEquipoForm(targetMountId = null) {
  let mountId = targetMountId;
  if (!mountId) {
    const tPanel = document.getElementById('panel-t-solicitar_equipo');
    const sPanel = document.getElementById('panel-s-solicitar_equipo');
    if (tPanel && !tPanel.classList.contains('hidden')) {
      mountId = 'mount-t-solicitar_equipo';
    } else if (sPanel && !sPanel.classList.contains('hidden')) {
      mountId = 'mount-s-solicitar_equipo';
    } else {
      const userTemp = getUsuarioSesionActual();
      if (userTemp && userTemp.rol && userTemp.rol.toLowerCase() === 'docente') {
        mountId = 'mount-t-solicitar_equipo';
      } else {
        mountId = 'mount-s-solicitar_equipo';
      }
    }
  }
  const mount = document.getElementById(mountId) || document.getElementById('mount-t-solicitar_equipo') || document.getElementById('mount-s-solicitar_equipo');
  if (!mount) return;

  try {
    await asegurarDatosInicialesRecursos();
    const user = getUsuarioSesionActual();

    let recursos = [];
    let solicitudes = [];
    let todosPrestamos = [];
    try { recursos = await Store.list('recursos_inventario') || []; } catch (e) { recursos = []; }
    try { solicitudes = await Store.list('solicitudes_recursos') || []; } catch (e) { solicitudes = []; }
    try { todosPrestamos = await Store.list('historial_prestamos') || []; } catch (e) { todosPrestamos = []; }

    const miHistorial = todosPrestamos.filter(p => {
      if (!user || !user.nombre) return true;
      const matchNom = p.usuario_nombre && p.usuario_nombre.toLowerCase().trim() === user.nombre.toLowerCase().trim();
      const matchEmail = (user.email && p.usuario_email && p.usuario_email.toLowerCase().trim() === user.email.toLowerCase().trim());
      return matchNom || matchEmail;
    });

    // Buscar equipo que tenga asignado esta persona
    const equipoActual = recursos.find(r => 
      (r.estado === 'Asignado' || r.estado === 'Prestado') && 
      r.responsable && r.responsable.toLowerCase().trim() === (user.nombre || '').toLowerCase().trim()
    );

    const misSolicitudes = solicitudes.filter(s => 
      s.solicitante && s.solicitante.toLowerCase().trim() === (user.nombre || '').toLowerCase().trim()
    );

  let equipoActualHtml = '';
  if (equipoActual) {
    const vencido = isOverdue(equipoActual);
    const ret = calcularRetraso(equipoActual.fecha_limite);

    equipoActualHtml = `
      <div class="bg-white p-6 border ${vencido ? 'border-coral/50 ring-2 ring-coral/20' : 'border-gray-100'} rounded-3xl shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${vencido ? 'bg-coral animate-ping' : 'bg-emerald-500'}"></span>
            <h3 class="text-sm font-extrabold text-ink uppercase tracking-wider">Mi Equipo Actualmente Asignado</h3>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${vencido ? 'bg-coral text-white' : 'bg-emerald-100 text-emerald-700'}">
            ${vencido ? '¡Plazo Vencido!' : 'En Custodia Activa'}
          </span>
        </div>

        ${vencido ? `
          <div class="p-4 rounded-2xl bg-coral/10 border border-coral/30 flex items-start gap-3">
            <svg class="w-5 h-5 text-coral shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div>
              <p class="text-xs font-black text-coral uppercase tracking-wide">Alerta de Devolución Excedida</p>
              <p class="text-xs text-ink font-semibold mt-0.5">El tiempo límite acordado expiró hace <strong>${ret.texto}</strong> (límite: ${new Date(equipoActual.fecha_limite).toLocaleString()}).</p>
              <p class="text-[11px] text-slate2 mt-1">Por favor acércate a Coordinación o Administración para devolver el equipo o gestionar una prórroga.</p>
            </div>
          </div>
        ` : ''}

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div class="bg-gray-50 p-3.5 rounded-2xl">
            <p class="text-[10px] uppercase font-bold text-slate2">Equipo</p>
            <p class="text-sm font-bold text-ink mt-0.5">${escapeHtml(equipoActual.nombre)}</p>
            <p class="text-xs text-slate2">${escapeHtml(equipoActual.marca || '')} ${escapeHtml(equipoActual.modelo || '')}</p>
          </div>
          <div class="bg-gray-50 p-3.5 rounded-2xl">
            <p class="text-[10px] uppercase font-bold text-slate2">Identificadores</p>
            <p class="font-mono text-xs font-bold text-morado mt-0.5">${escapeHtml(equipoActual.codigo || '-')}</p>
            <p class="text-[10px] text-slate2">SN: ${escapeHtml(equipoActual.serial || '-')}</p>
          </div>
          <div class="bg-gray-50 p-3.5 rounded-2xl">
            <p class="text-[10px] uppercase font-bold text-slate2">Modalidad & Fecha</p>
            <p class="text-xs font-bold text-ink mt-0.5">${equipoActual.tipo_asignacion === 'Permanente' ? 'Asignación Permanente' : 'Préstamo Temporal'}</p>
            <p class="text-[10px] ${vencido ? 'text-coral font-bold' : 'text-slate2'} mt-0.5">
              ${equipoActual.fecha_limite ? `Vence: ${new Date(equipoActual.fecha_limite).toLocaleDateString()}` : 'Sin fecha límite'}
            </p>
          </div>
        </div>
      </div>
    `;
  } else {
    equipoActualHtml = `
      <div class="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">Actualmente no tienes ningún equipo a tu cargo</p>
          <p class="text-xs text-slate2 mt-0.5">Si requieres una laptop, tablet o equipo audiovisual para tus clases o proyectos, completa el formulario de solicitud a continuación.</p>
        </div>
      </div>
    `;
  }

  mount.innerHTML = `
    <div class="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 class="text-2xl font-extrabold text-ink tracking-tight">Reserva y Préstamos de Equipos</h2>
        <p class="text-slate2 text-sm mt-0.5">Consulta el estado de tus equipos, gestiona solicitudes y revisa tu historial oficial de préstamos.</p>
      </div>

      <!-- SECCIÓN 1: EQUIPO ACTUAL -->
      ${equipoActualHtml}

      <!-- SECCIÓN 2: FORMULARIO DE SOLICITUD -->
      <div class="bg-white p-6 sm:p-8 border border-gray-100 rounded-3xl shadow-sm space-y-6">
        <div class="border-b border-gray-100 pb-4">
          <h3 class="text-base font-extrabold text-ink tracking-tight">Nueva Solicitud de Préstamo</h3>
          <p class="text-xs text-slate2 mt-0.5">Indica los detalles del recurso que necesitas para que la administración lo prepare.</p>
        </div>

        <form id="form-solicitud-equipo" onsubmit="event.preventDefault(); enviarSolicitudEquipo();" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-ink mb-1">Categoría del Equipo*</label>
              <select id="req_categoria" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-morado outline-none">
                <option value="Laptops">Laptops / Computadores Portátiles</option>
                <option value="Tablets">Tablets / Dibujo Digital</option>
                <option value="Audio/Video">Audio / Video (Proyector, Parlante, Micrófono)</option>
                <option value="General">Otros recursos generales</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-ink mb-1">Modalidad Requerida*</label>
              <select id="req_tipo" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-morado outline-none" onchange="document.getElementById('req_fecha_div').classList.toggle('hidden', this.value==='Permanente')">
                <option value="Temporal">Préstamo Temporal (por horas o días)</option>
                <option value="Permanente">Asignación Permanente (dotación regular)</option>
              </select>
            </div>
          </div>

          <div id="req_fecha_div">
            <label class="block text-xs font-bold text-ink mb-1">¿Hasta cuándo lo necesitas? (Fecha Límite)*</label>
            <input type="datetime-local" id="req_fecha" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-morado outline-none" />
            <p class="text-[10px] text-slate2 mt-1">Indica la fecha y hora en que te comprometes a devolver el equipo a la institución.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-ink mb-1">Motivo / Justificación Académica*</label>
            <textarea id="req_motivo" rows="3" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-morado outline-none" placeholder="Explica detalladamente para qué clase, módulo o proyecto requieres el equipo..."></textarea>
          </div>

          <button type="submit" class="w-full btn-glow-primary rounded-2xl bg-morado text-white font-bold text-sm py-3.5 shadow-md hover:bg-morado/90 transition flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            Enviar Solicitud a Administración
          </button>
        </form>
      </div>

      <!-- SECCIÓN 3: MIS SOLICITUDES ANTERIORES -->
      <div class="space-y-4">
        <h3 class="text-base font-extrabold text-ink">Historial de Mis Solicitudes</h3>
        ${misSolicitudes.length === 0 ? `
          <p class="text-slate2 text-xs text-center p-8 bg-white border border-gray-100 rounded-2xl">No has realizado ninguna solicitud de equipo todavía.</p>
        ` : `
          <div class="space-y-3">
            ${[...misSolicitudes].reverse().map(s => `
              <div class="p-5 border border-gray-100 rounded-2xl bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-sm text-ink">${s.categoria}</span>
                    <span class="text-xs text-slate2">(${s.tipo_asignacion})</span>
                  </div>
                  <p class="text-xs text-slate2 mt-1">"${escapeHtml(s.motivo || '')}"</p>
                  <p class="text-[10px] text-gray-400 mt-1">Solicitado el: ${new Date(s.fecha_creacion).toLocaleString()}</p>
                </div>
                <div>
                  <span class="px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
                    s.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800 border border-amber-200/60' :
                    s.estado === 'Aprobada' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' :
                    'bg-red-100 text-red-800 border border-red-200/60'
                  }">
                    ${s.estado}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- SECCIÓN 4: MI HISTORIAL DE PRÉSTAMOS DE EQUIPOS (TRAZABILIDAD Y ACTAS) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-extrabold text-ink">Mi Historial de Préstamos y Custodias</h3>
            <p class="text-xs text-slate2 mt-0.5">Trazabilidad oficial de equipos entregados, plazos de devolución y actas digitales de custodia.</p>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-morado/10 text-morado">${miHistorial.length} registro(s)</span>
        </div>

        ${miHistorial.length === 0 ? `
          <div class="text-center p-8 bg-white border border-gray-100 rounded-2xl">
            <svg class="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <p class="text-sm font-bold text-ink">No tienes registros históricos de préstamos</p>
            <p class="text-xs text-slate2 mt-0.5">Cuando te sea asignado un equipo o realices una solicitud aprobada, su trazabilidad aparecerá aquí.</p>
          </div>
        ` : `
          <div class="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2">
                    <th class="p-3.5 font-bold">Equipo Asignado</th>
                    <th class="p-3.5 font-bold">Modalidad</th>
                    <th class="p-3.5 font-bold">Fecha Entrega</th>
                    <th class="p-3.5 font-bold">Plazo Límite</th>
                    <th class="p-3.5 font-bold">Devolución</th>
                    <th class="p-3.5 font-bold text-center">Estado</th>
                    <th class="p-3.5 font-bold text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 text-xs">
                  ${miHistorial.map(p => {
                    const ahora = new Date();
                    let estado = p.estado;
                    if (estado === 'Activo' && p.fecha_limite && new Date(p.fecha_limite) < ahora) {
                      estado = 'Retrasado';
                    }
                    const badge = 
                      estado === 'Activo' ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Activo</span>' :
                      estado === 'Retrasado' ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-coral text-white shadow-2xs">Retrasado</span>' :
                      estado === 'Devuelto con retraso' ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Devuelto con retraso</span>' :
                      '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Devuelto</span>';

                    return `
                      <tr class="hover:bg-gray-50/60 transition">
                        <td class="p-3.5">
                          <p class="font-bold text-ink">${escapeHtml(p.recurso_nombre)}</p>
                          <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="font-mono text-[10px] font-bold text-morado bg-morado/5 px-1 py-0.5 rounded">${escapeHtml(p.recurso_codigo || '-')}</span>
                            <span class="text-[10px] text-slate2">${escapeHtml(p.recurso_categoria || 'General')}</span>
                          </div>
                        </td>
                        <td class="p-3.5 font-medium text-slate2">${escapeHtml(p.tipo_asignacion)}</td>
                        <td class="p-3.5 font-medium text-ink">${p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleDateString() : '-'}</td>
                        <td class="p-3.5 font-medium ${estado === 'Retrasado' ? 'text-coral font-bold' : 'text-slate2'}">${p.fecha_limite ? new Date(p.fecha_limite).toLocaleDateString() : 'Sin límite'}</td>
                        <td class="p-3.5 font-medium text-slate2">${p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString() : 'Pendiente'}</td>
                        <td class="p-3.5 text-center">${badge}</td>
                        <td class="p-3.5 text-center">
                          <button type="button" onclick="verComprobantePrestamo('${p.id}')" class="px-2.5 py-1 rounded-xl bg-morado/10 hover:bg-morado hover:text-white text-morado text-[11px] font-bold transition cursor-pointer flex items-center gap-1 mx-auto shadow-2xs">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <span>Ver Acta</span>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
  } catch (err) {
    console.error('[renderSolicitarEquipoForm] Error al renderizar formulario:', err);
    mount.innerHTML = `
      <div class="p-8 max-w-xl mx-auto text-center flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-coral/20 shadow-sm my-6">
        <div class="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">No se pudo cargar el módulo de préstamos</p>
          <p class="text-xs text-slate2 mt-1 max-w-sm">${escapeHtml(err.message || 'Error inesperado al cargar')}</p>
        </div>
        <button onclick="renderSolicitarEquipoForm('${mountId}')" class="px-5 py-2 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition cursor-pointer">Reintentar</button>
      </div>`;
  }
}
window.renderSolicitarEquipoForm = renderSolicitarEquipoForm;

window.enviarSolicitudEquipo = async function() {
  const categoria = document.getElementById('req_categoria').value;
  const tipo = document.getElementById('req_tipo').value;
  const motivo = document.getElementById('req_motivo').value.trim();
  const fecha = document.getElementById('req_fecha').value;
  const user = getUsuarioSesionActual();

  if (!motivo) {
    toast('Debes escribir un motivo o justificación.', 'error');
    return;
  }
  if (tipo === 'Temporal' && !fecha) {
    toast('Indica la fecha hasta cuándo necesitas el equipo.', 'error');
    return;
  }

  const solicitudes = await Store.list('solicitudes_recursos') || [];
  solicitudes.push({
    id: uid('sol'),
    solicitante: user.nombre,
    email: user.email,
    rol_solicitante: user.rol,
    categoria,
    tipo_asignacion: tipo,
    fecha_limite: tipo === 'Temporal' ? fecha : null,
    motivo,
    estado: 'Pendiente',
    fecha_creacion: new Date().toISOString()
  });

  await Store.save('solicitudes_recursos', solicitudes);
  toast('Solicitud enviada con éxito. La administración la revisará en breve.', 'success');

  // Notificación por correo a la fundación (EmailJS principal + SMTP backend)
  if (typeof notificarRecursoPorCorreo === 'function') {
    notificarRecursoPorCorreo('solicitud_nueva', {
      solicitante: user.nombre,
      email: user.email || '',
      rol: user.rol,
      categoria,
      tipo,
      fecha,
      motivo
    }).catch(e => console.warn('[enviarSolicitudEquipo] Error notificando nueva solicitud:', e));
  }

  if (typeof registrarAuditoriaAccion === 'function') {
    await registrarAuditoriaAccion('Solicitud de equipo enviada', user.nombre, user.rol, `Categoría: ${categoria} - ${tipo}`);
  }

  renderSolicitarEquipoForm();
};

// =========================================================================
// 4. BANDEJA DE SOLICITUDES DE RECURSOS (ADMIN)
if (typeof window !== 'undefined') {
  window.renderSolicitudesAdmin = renderSolicitudesAdmin;
  if (typeof RENDERERS !== 'undefined') RENDERERS['solicitudes_recursos'] = renderSolicitudesAdmin;
  else if (window.RENDERERS) window.RENDERERS['solicitudes_recursos'] = renderSolicitudesAdmin;
}

async function renderSolicitudesAdmin() {
  const mount = document.getElementById('mount-solicitudes_recursos');
  if (!mount) return;

  try {
    await asegurarDatosInicialesRecursos();
    const solicitudes = await Store.list('solicitudes_recursos') || [];
    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente');

    if (pendientes.length === 0) {
      mount.innerHTML = `
        <div class="p-6 max-w-4xl mx-auto space-y-6">
          <h2 class="text-2xl font-extrabold text-ink tracking-tight">Solicitudes de Equipos de la Plataforma</h2>
          <div class="p-12 text-center text-emerald-700 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm mt-4">
            <svg class="w-10 h-10 mx-auto text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="font-extrabold text-base">No hay solicitudes pendientes</p>
            <p class="text-xs text-emerald-600 mt-1">Todas las peticiones de estudiantes y docentes han sido procesadas.</p>
          </div>
        </div>
      `;
      return;
    }

    const rows = pendientes.map(s => `
      <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-5 justify-between items-start md:items-center">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${s.rol_solicitante === 'Docente' ? 'bg-turquesa/10 text-turquesa' : 'bg-oro/15 text-amber-700'}">
              ${s.rol_solicitante}
            </span>
            <p class="font-bold text-ink text-base">${escapeHtml(s.solicitante)}</p>
          </div>

          <p class="text-xs font-semibold text-ink">
            Solicita: <strong class="text-morado">${s.categoria}</strong> (${s.tipo_asignacion})
          </p>

          ${s.tipo_asignacion === 'Temporal' ? `
            <p class="text-xs text-coral font-bold">Fecha requerida: ${new Date(s.fecha_limite).toLocaleString()}</p>
          ` : ''}

          <p class="text-xs text-slate2 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
            "${escapeHtml(s.motivo)}"
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button onclick="responderSolicitud('${s.id}', 'Rechazada')" class="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 transition">
            Rechazar
          </button>
          <button onclick="responderSolicitud('${s.id}', 'Aprobada')" class="flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-morado text-white shadow-md hover:bg-morado/90 transition flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            Aprobar y Entregar
          </button>
        </div>
      </div>
    `).join('');

    mount.innerHTML = `
      <div class="p-6 max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-extrabold text-ink tracking-tight">Solicitudes de Equipos de la Plataforma</h2>
            <p class="text-xs text-slate2 mt-0.5">Peticiones de docentes y estudiantes pendientes de asignación y entrega.</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-morado/10 text-morado text-xs font-bold">${pendientes.length} pendiente(s)</span>
        </div>
        <div class="space-y-4">
          ${rows}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('[renderSolicitudesAdmin] Error al renderizar solicitudes:', err);
    mount.innerHTML = `
      <div class="admin-panel-card p-10 text-center flex flex-col items-center justify-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-coral/10 text-coral flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">No se pudieron cargar las solicitudes de equipos</p>
          <p class="text-xs text-slate2 mt-1 max-w-md">${escapeHtml(err.message || 'Error inesperado al cargar solicitudes')}</p>
        </div>
        <button onclick="renderSolicitudesAdmin()" class="mt-2 px-5 py-2 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition cursor-pointer">Reintentar</button>
      </div>`;
  }
}
window.renderSolicitudesAdmin = renderSolicitudesAdmin;

window.responderSolicitud = async function(idSolicitud, respuesta) {
  const solicitudes = await Store.list('solicitudes_recursos') || [];
  const idx = solicitudes.findIndex(x => x.id === idSolicitud);
  if (idx === -1) return;

  const sol = solicitudes[idx];

  if (respuesta === 'Rechazada') {
    if (!confirm(`¿Rechazar la solicitud de ${sol.solicitante} para ${sol.categoria}?`)) return;
    sol.estado = 'Rechazada';
    await Store.save('solicitudes_recursos', solicitudes);
    toast('Solicitud rechazada', 'info');

    // Notificación por correo al estudiante/docente (EmailJS principal + SMTP backend)
    if (typeof notificarRecursoPorCorreo === 'function') {
      notificarRecursoPorCorreo('rechazada', {
        solicitante: sol.solicitante,
        email: sol.email || '',
        rol: sol.rol_solicitante,
        categoria: sol.categoria,
        motivoRechazo: 'Disponibilidad limitada de equipos o revisión de prioridades académicas en sede.'
      }).catch(e => console.warn('[responderSolicitud] Error notificando rechazo:', e));
    }

    if (typeof registrarAuditoriaAccion === 'function') {
      await registrarAuditoriaAccion('Solicitud de equipo rechazada', sol.solicitante, 'Recursos', `Categoría: ${sol.categoria}`);
    }

    renderSolicitudesAdmin();
    return;
  }

  // Flujo Aprobar: Lanza el modal pre-llenado con los datos del recurso solicitado
  const recursos = await Store.list('recursos_inventario') || [];
  const disponibles = recursos.filter(r => r.estado === 'Disponible' && (r.categoria === sol.categoria || sol.categoria === 'General'));
  
  if (disponibles.length === 0) {
    toast(`No hay equipos disponibles en bodega para la categoría: ${sol.categoria}. Agrega o libera un equipo primero.`, 'error');
    return;
  }

  const options = disponibles.map(r => `<option value="${r.id}">[${escapeHtml(r.categoria)}] ${escapeHtml(r.codigo || '-')} — ${escapeHtml(r.nombre)} (${escapeHtml(r.marca || '')})</option>`).join('');

  const html = `
    <div class="p-1 space-y-4">
      <div class="bg-morado/5 p-4 rounded-2xl border border-morado/10 space-y-1">
        <p class="text-xs text-morado font-extrabold">Solicitante: <span class="text-ink font-bold">${sol.solicitante} (${sol.rol_solicitante})</span></p>
        <p class="text-xs text-morado font-extrabold">Categoría: <span class="text-ink font-bold">${sol.categoria}</span> (${sol.tipo_asignacion})</p>
        ${sol.fecha_limite ? `<p class="text-xs text-morado font-extrabold">Retorno previsto: <span class="text-ink font-bold">${new Date(sol.fecha_limite).toLocaleString()}</span></p>` : ''}
        <p class="text-xs text-slate2 italic mt-1">"${escapeHtml(sol.motivo || '')}"</p>
      </div>
      
      <div>
        <label class="block text-xs font-bold text-ink mb-1">Seleccionar el Equipo a Entregar:</label>
        <select id="sel_aprobar_equipo" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-morado outline-none">
          ${options}
        </select>
      </div>
    </div>
  `;

  mostrarModalPersonalizado('Aprobar y Entregar Equipo', html, async () => {
    const idRecurso = document.getElementById('sel_aprobar_equipo').value;
    if (!idRecurso) return false;

    const rIdx = recursos.findIndex(x => x.id === idRecurso);
    if (rIdx > -1) {
      const rec = recursos[rIdx];
      rec.estado = sol.tipo_asignacion === 'Permanente' ? 'Asignado' : 'Prestado';
      rec.responsable = sol.solicitante;
      rec.tipo_asignacion = sol.tipo_asignacion;
      rec.fecha_limite = sol.fecha_limite;
      rec.fecha_entrega = new Date().toISOString();
      await Store.save('recursos_inventario', recursos);
      
      sol.estado = 'Aprobada';
      sol.recurso_id = idRecurso;
      await Store.save('solicitudes_recursos', solicitudes);

      // Registrar en historial permanente
      await registrarPrestamoEnHistorial({
        recurso: rec,
        persona: sol.solicitante,
        tipo: sol.tipo_asignacion,
        fechaLimite: sol.fecha_limite,
        motivo: sol.motivo || 'Solicitud de equipo aprobada por Coordinacion'
      });

      toast(`Solicitud aprobada y equipo ${rec.codigo} entregado a ${sol.solicitante}`, 'success');

      // Notificación por correo al estudiante/docente (EmailJS principal + SMTP backend)
      if (typeof notificarRecursoPorCorreo === 'function') {
        notificarRecursoPorCorreo('aprobada', {
          solicitante: sol.solicitante,
          email: sol.email || '',
          rol: sol.rol_solicitante,
          categoria: sol.categoria,
          recursoNombre: rec.nombre,
          recursoCodigo: rec.codigo,
          serial: rec.serial,
          fechaLimite: sol.fecha_limite
        }).catch(e => console.warn('[responderSolicitud] Error notificando aprobación:', e));
      }

      if (typeof registrarAuditoriaAccion === 'function') {
        await registrarAuditoriaAccion('Solicitud aprobada y entregada', sol.solicitante, 'Recursos', `${rec.nombre} (${rec.codigo})`);
      }

      renderSolicitudesAdmin();
      if (typeof renderRecursos === 'function') renderRecursos();
      if (typeof renderAsignacionesRecursos === 'function') renderAsignacionesRecursos();
      if (typeof renderHistorialPrestamosAdmin === 'function') renderHistorialPrestamosAdmin();
      return true;
    }
    return false;
  });
};

// =========================================================================
// 5. HISTORIAL Y TRAZABILIDAD INSTITUCIONAL DE PRESTAMOS (ADMIN)
// =========================================================================
async function renderHistorialPrestamosAdmin() {
  const mount = document.getElementById('mount-historial_prestamos');
  if (!mount) return;

  try {
    await asegurarDatosInicialesRecursos();

  let prestamos = [];
  try {
    prestamos = await Store.list('historial_prestamos', { forceRefresh: true }) || [];
  } catch (e) {
    prestamos = [];
  }

  // Actualizar estado dinámico de retrasados si el préstamo sigue Activo pero su fecha límite expiró
  const ahora = new Date();
  prestamos.forEach(p => {
    if (p.estado === 'Activo' && p.fecha_limite && new Date(p.fecha_limite) < ahora) {
      p.estado = 'Retrasado';
    }
  });

  window._ultimaListaHistorialPrestamos = prestamos;

  // Métricas estadísticas
  const total = prestamos.length;
  const activos = prestamos.filter(p => p.estado === 'Activo').length;
  const retrasados = prestamos.filter(p => p.estado === 'Retrasado').length;
  const devueltos = prestamos.filter(p => p.estado === 'Devuelto' || p.estado === 'Devuelto con retraso').length;

  const fEstado = window.historialPrestamosFiltroEstado || 'todos';
  const fTipo = window.historialPrestamosFiltroTipo || 'todos';
  const busqueda = (window.historialPrestamosBusqueda || '').toLowerCase().trim();

  const filtrados = prestamos.filter(p => {
    if (fEstado !== 'todos' && p.estado !== fEstado) return false;
    if (fTipo !== 'todos' && p.tipo_asignacion !== fTipo) return false;
    if (busqueda) {
      const matchUsuario = (p.usuario_nombre || '').toLowerCase().includes(busqueda);
      const matchEmail = (p.usuario_email || '').toLowerCase().includes(busqueda);
      const matchRecurso = (p.recurso_nombre || '').toLowerCase().includes(busqueda);
      const matchCodigo = (p.recurso_codigo || '').toLowerCase().includes(busqueda);
      const matchSerial = (p.recurso_serial || '').toLowerCase().includes(busqueda);
      if (!matchUsuario && !matchEmail && !matchRecurso && !matchCodigo && !matchSerial) return false;
    }
    return true;
  });

  const fmtFecha = (f) => {
    if (!f) return '—';
    try {
      const d = new Date(typeof f === 'string' && f.includes(' ') && !f.includes('T') ? f.replace(' ', 'T') : f);
      if (isNaN(d.getTime())) return f;
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return f; }
  };

  const fmtHora = (f) => {
    if (!f) return '';
    try {
      const d = new Date(typeof f === 'string' && f.includes(' ') && !f.includes('T') ? f.replace(' ', 'T') : f);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) { return ''; }
  };

  const rows = filtrados.length > 0 ? filtrados.map(p => {
    const estadoBadge = 
      p.estado === 'Activo' ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Activo</span>' :
      p.estado === 'Retrasado' ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Retrasado</span>' :
      p.estado === 'Devuelto con retraso' ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Devuelto ext.</span>' :
      '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Devuelto</span>';

    return `
      <tr class="hover:bg-slate-50/70 border-b border-gray-100/80 last:border-0 transition-colors">
        <td class="py-3.5 px-4 align-middle">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-morado/10 text-morado font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              ${escapeHtml(p.recurso_categoria ? p.recurso_categoria.charAt(0).toUpperCase() : 'E')}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-ink text-xs sm:text-sm truncate" title="${escapeHtml(p.recurso_nombre)}">${escapeHtml(p.recurso_nombre)}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="font-mono text-[10px] font-bold text-morado bg-morado/10 px-1.5 py-0.5 rounded">${escapeHtml(p.recurso_codigo || '-')}</span>
                <span class="text-[10px] text-slate-400 font-medium">${escapeHtml(p.recurso_categoria || 'General')}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 align-middle">
          <div class="min-w-0">
            <p class="font-bold text-ink text-xs sm:text-sm truncate" title="${escapeHtml(p.usuario_nombre)}">${escapeHtml(p.usuario_nombre)}</p>
            <p class="text-[11px] text-slate-400 truncate" title="${escapeHtml(p.usuario_email || '')}">${escapeHtml(p.usuario_email || 'Sin correo')}</p>
            <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-500">${escapeHtml(p.usuario_rol || 'Estudiante')}${p.cohorte ? ' · ' + escapeHtml(p.cohorte) : ''}</span>
          </div>
        </td>
        <td class="py-3.5 px-4 align-middle whitespace-nowrap">
          <span class="inline-flex items-center text-xs font-semibold ${p.tipo_asignacion === 'Permanente' ? 'text-indigo-600 font-bold' : 'text-slate-600'}">
            ${escapeHtml(p.tipo_asignacion || 'Temporal')}
          </span>
        </td>
        <td class="py-3.5 px-4 align-middle whitespace-nowrap">
          <p class="text-xs font-semibold text-ink">${fmtFecha(p.fecha_prestamo)}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">${fmtHora(p.fecha_prestamo)}</p>
        </td>
        <td class="py-3.5 px-4 align-middle whitespace-nowrap">
          <p class="text-xs font-semibold ${p.estado === 'Retrasado' ? 'text-coral font-bold' : 'text-ink'}">${p.fecha_limite ? fmtFecha(p.fecha_limite) : 'Sin límite'}</p>
          <p class="text-[10px] ${p.estado === 'Retrasado' ? 'text-coral/80 font-medium' : 'text-slate-400'} mt-0.5">${p.fecha_limite ? fmtHora(p.fecha_limite) : ''}</p>
        </td>
        <td class="py-3.5 px-4 align-middle whitespace-nowrap">
          ${p.fecha_devolucion ? `
            <p class="text-xs font-semibold text-emerald-700">${fmtFecha(p.fecha_devolucion)}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">${fmtHora(p.fecha_devolucion)}</p>
          ` : `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200/60">
              Pendiente
            </span>
          `}
        </td>
        <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
          ${estadoBadge}
        </td>
        <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="verComprobantePrestamo('${p.id}')" title="Ver Comprobante Digital" class="w-8 h-8 rounded-xl bg-gray-100 hover:bg-morado hover:text-white text-slate-500 transition-all flex items-center justify-center cursor-pointer shadow-2xs">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </button>
            ${(p.estado === 'Activo' || p.estado === 'Retrasado') ? `
              <button onclick="recibirEquipoHistorial('${p.id}', '${p.recurso_id}')" title="Recibir Equipo en Bodega (Checkin)" class="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-emerald-600/20">
                <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>Recibir</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="8" class="p-12 text-center text-slate2 text-xs">
        <svg class="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p class="font-bold text-sm text-ink">No se encontraron registros de préstamos</p>
        <p class="text-slate2 mt-0.5">Prueba cambiando los filtros o el término de búsqueda.</p>
      </td>
    </tr>
  `;

  mount.innerHTML = `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- HEADER CON TITULO Y BOTON EXPORTAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-ink tracking-tight">Historial y Trazabilidad de Préstamos de Equipos</h2>
          <p class="text-xs text-slate2 mt-0.5">Registro institucional y trazabilidad completa de cada asignación, entrega y devolución de activos tecnológicos.</p>
        </div>
        <div class="flex items-center gap-2.5">
          <button onclick="exportarHistorialPrestamosCSV()" class="px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-black text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar Reporte CSV
          </button>
        </div>
      </div>

      <!-- METRICAS DE RESUMEN -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p class="text-[10px] uppercase font-bold text-slate2">Total Préstamos</p>
          <p class="text-2xl font-black text-ink mt-1">${total}</p>
          <p class="text-[10px] text-slate2 mt-0.5">Histórico acumulado</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p class="text-[10px] uppercase font-bold text-blue-600">Activos en Custodia</p>
          <p class="text-2xl font-black text-blue-700 mt-1">${activos}</p>
          <p class="text-[10px] text-slate2 mt-0.5">Equipos prestados ahora</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs ${retrasados > 0 ? 'border-coral/40 bg-coral/5' : ''}">
          <p class="text-[10px] uppercase font-bold ${retrasados > 0 ? 'text-coral' : 'text-slate2'}">Con Retraso</p>
          <p class="text-2xl font-black ${retrasados > 0 ? 'text-coral' : 'text-ink'} mt-1">${retrasados}</p>
          <p class="text-[10px] text-slate2 mt-0.5">Fecha límite vencida</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p class="text-[10px] uppercase font-bold text-emerald-600">Devueltos</p>
          <p class="text-2xl font-black text-emerald-700 mt-1">${devueltos}</p>
          <p class="text-[10px] text-slate2 mt-0.5">Reingresados a bodega</p>
        </div>
      </div>

      <!-- BARRA DE FILTROS Y BUSQUEDA -->
      <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div class="relative flex-1">
            <input type="text" id="busquedaHistorialPrestamos" value="${escapeHtml(window.historialPrestamosBusqueda || '')}" oninput="filtrarHistorialPrestamosLive(this.value)" placeholder="Buscar por custodio, correo, recurso, código o serial..." class="w-full h-10 text-xs border border-gray-200 rounded-xl pl-9 pr-8 py-2 focus:border-morado outline-none bg-white font-medium shadow-2xs" />
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <button type="button" id="btnLimpiarBusquedaHistorial" onclick="limpiarBusquedaHistorialPrestamos()" class="${window.historialPrestamosBusqueda ? '' : 'hidden'} absolute right-3 top-2.5 text-slate-400 hover:text-ink cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select onchange="window.historialPrestamosFiltroEstado=this.value; renderHistorialPrestamosAdmin();" class="h-10 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-ink font-semibold outline-none focus:border-morado cursor-pointer shadow-2xs">
              <option value="todos" ${fEstado === 'todos' ? 'selected' : ''}>Todos los Estados</option>
              <option value="Activo" ${fEstado === 'Activo' ? 'selected' : ''}>Activos</option>
              <option value="Retrasado" ${fEstado === 'Retrasado' ? 'selected' : ''}>Retrasados</option>
              <option value="Devuelto" ${fEstado === 'Devuelto' ? 'selected' : ''}>Devueltos</option>
              <option value="Devuelto con retraso" ${fEstado === 'Devuelto con retraso' ? 'selected' : ''}>Devueltos con retraso</option>
            </select>

            <select onchange="window.historialPrestamosFiltroTipo=this.value; renderHistorialPrestamosAdmin();" class="h-10 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-ink font-semibold outline-none focus:border-morado cursor-pointer shadow-2xs">
              <option value="todos" ${fTipo === 'todos' ? 'selected' : ''}>Todas las Modalidades</option>
              <option value="Temporal" ${fTipo === 'Temporal' ? 'selected' : ''}>Temporal</option>
              <option value="Permanente" ${fTipo === 'Permanente' ? 'selected' : ''}>Permanente</option>
            </select>
          </div>
        </div>
      </div>

      <!-- TABLA PRINCIPAL DE HISTORIAL -->
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-auto">
            <thead>
              <tr class="bg-slate-50/80 border-b border-gray-100 text-[11px] uppercase tracking-wider text-slate2 select-none">
                <th class="py-3.5 px-4 font-bold min-w-[210px]">Dispositivo / Recurso</th>
                <th class="py-3.5 px-4 font-bold min-w-[190px]">Custodio / Usuario</th>
                <th class="py-3.5 px-4 font-bold min-w-[95px]">Modalidad</th>
                <th class="py-3.5 px-4 font-bold min-w-[105px]">Préstamo</th>
                <th class="py-3.5 px-4 font-bold min-w-[105px]">Límite</th>
                <th class="py-3.5 px-4 font-bold min-w-[105px]">Devolución</th>
                <th class="py-3.5 px-4 font-bold min-w-[120px] text-center">Estado</th>
                <th class="py-3.5 px-4 font-bold min-w-[130px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbody-historial-prestamos" class="divide-y divide-gray-100 text-xs">
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  } catch (err) {
    console.error('[renderHistorialPrestamosAdmin] Error al renderizar historial:', err);
    mount.innerHTML = `
      <div class="admin-panel-card p-10 text-center flex flex-col items-center justify-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-coral/10 text-coral flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p class="text-sm font-bold text-ink">No se pudo cargar el historial de préstamos</p>
          <p class="text-xs text-slate2 mt-1 max-w-md">${escapeHtml(err.message || 'Error inesperado al cargar historial')}</p>
        </div>
        <button onclick="renderHistorialPrestamosAdmin()" class="mt-2 px-5 py-2 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition cursor-pointer">Reintentar</button>
      </div>`;
  }
}
window.renderHistorialPrestamosAdmin = renderHistorialPrestamosAdmin;

window.filtrarHistorialPrestamosLive = function(texto) {
  window.historialPrestamosBusqueda = texto;
  const btnLimpiar = document.getElementById('btnLimpiarBusquedaHistorial');
  if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !texto);
  renderHistorialPrestamosAdmin();
};

window.limpiarBusquedaHistorialPrestamos = function() {
  window.historialPrestamosBusqueda = '';
  const input = document.getElementById('busquedaHistorialPrestamos');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderHistorialPrestamosAdmin();
};

window.exportarHistorialPrestamosCSV = async function() {
  const lista = window._ultimaListaHistorialPrestamos || await Store.list('historial_prestamos') || [];
  if (lista.length === 0) {
    toast('No hay registros de prestamos para exportar.', 'info');
    return;
  }

  const encabezados = [
    'ID Prestamo',
    'Codigo Recurso',
    'Nombre Recurso',
    'Categoria',
    'Serial',
    'Custodio',
    'Rol',
    'Email',
    'Cohorte',
    'Modalidad',
    'Fecha Prestamo',
    'Fecha Limite',
    'Fecha Devolucion',
    'Estado',
    'Entregado Por',
    'Recibido Por',
    'Motivo',
    'Observaciones Entrega',
    'Observaciones Devolucion'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const filas = lista.map(p => [
    escapeCSV(p.id),
    escapeCSV(p.recurso_codigo),
    escapeCSV(p.recurso_nombre),
    escapeCSV(p.recurso_categoria),
    escapeCSV(p.recurso_serial),
    escapeCSV(p.usuario_nombre),
    escapeCSV(p.usuario_rol),
    escapeCSV(p.usuario_email),
    escapeCSV(p.cohorte),
    escapeCSV(p.tipo_asignacion),
    escapeCSV(p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleString() : ''),
    escapeCSV(p.fecha_limite ? new Date(p.fecha_limite).toLocaleString() : ''),
    escapeCSV(p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : ''),
    escapeCSV(p.estado),
    escapeCSV(p.entregado_por),
    escapeCSV(p.recibido_por || 'N/A'),
    escapeCSV(p.motivo),
    escapeCSV(p.observaciones_entrega),
    escapeCSV(p.observaciones_devolucion)
  ].join(';'));

  const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const hoy = new Date().toISOString().slice(0, 10);
  a.download = `historial_prestamos_fundacion_${hoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Reporte CSV exportado exitosamente', 'success');
};

window.verComprobantePrestamo = async function(idPrestamo) {
  const lista = await Store.list('historial_prestamos') || [];
  const p = lista.find(x => x.id === idPrestamo);
  if (!p) {
    toast('No se encontro el registro del prestamo.', 'error');
    return;
  }

  const fechaP = p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleString() : 'No registrada';
  const fechaL = p.fecha_limite ? new Date(p.fecha_limite).toLocaleString() : 'Sin limite (Permanente)';
  const fechaD = p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString() : 'Pendiente de devolucion';

  const estadoBadgeClass = 
    p.estado === 'Activo' ? 'bg-blue-100 text-blue-800 border-blue-200' :
    p.estado === 'Retrasado' ? 'bg-coral text-white border-coral' :
    p.estado === 'Devuelto con retraso' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    'bg-emerald-100 text-emerald-800 border-emerald-200';

  const html = `
    <div id="comprobante-imprimible" class="p-2 space-y-5 text-ink">
      <!-- HEADER INSTITUCIONAL -->
      <div class="border-b border-gray-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-morado text-white flex items-center justify-center font-extrabold text-base shadow-sm">
            A+
          </div>
          <div>
            <h4 class="text-base font-black text-ink tracking-tight uppercase">Fundacion A+</h4>
            <p class="text-[11px] text-slate2 font-medium">Nit: 901.810.053-1 | Sistema de Gestion de Activos Tecnologicos</p>
          </div>
        </div>
        <div class="text-left sm:text-right">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${estadoBadgeClass}">
            ${escapeHtml(p.estado)}
          </span>
          <p class="font-mono text-[11px] text-slate2 mt-1">Folio: ${escapeHtml(p.id)}</p>
        </div>
      </div>

      <div class="text-center bg-slate-50 py-2.5 px-4 rounded-xl border border-gray-200">
        <p class="text-xs font-black uppercase tracking-widest text-slate2">Acta y Comprobante Digital de Custodia de Equipo</p>
      </div>

      <!-- SECCION 1: BENEFICIARIO / CUSTODIO -->
      <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
        <p class="text-xs font-black uppercase tracking-wider text-morado flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Informacion del Custodio / Beneficiario
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Nombre Completo</p>
            <p class="font-bold text-ink mt-0.5">${escapeHtml(p.usuario_nombre)}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Rol Institucional</p>
            <p class="font-semibold text-ink mt-0.5">${escapeHtml(p.usuario_rol)}${p.cohorte ? ' — Cohorte ' + escapeHtml(p.cohorte) : ''}</p>
          </div>
          <div class="sm:col-span-2">
            <p class="text-[10px] uppercase font-bold text-slate2">Correo Electronico</p>
            <p class="font-mono text-ink mt-0.5">${escapeHtml(p.usuario_email || 'Sin correo registrado')}</p>
          </div>
        </div>
      </div>

      <!-- SECCION 2: DATOS DEL EQUIPO -->
      <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
        <p class="text-xs font-black uppercase tracking-wider text-turquesa flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          Especificaciones del Dispositivo
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Dispositivo / Equipo</p>
            <p class="font-bold text-ink mt-0.5">${escapeHtml(p.recurso_nombre)}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Codigo Institucional</p>
            <p class="font-mono font-bold text-morado mt-0.5">${escapeHtml(p.recurso_codigo || '-')}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Categoria</p>
            <p class="font-semibold text-ink mt-0.5">${escapeHtml(p.recurso_categoria || 'General')}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Numero de Serie (SN)</p>
            <p class="font-mono text-ink mt-0.5">${escapeHtml(p.recurso_serial || 'No especificado')}</p>
          </div>
        </div>
      </div>

      <!-- SECCION 3: CRONOGRAMA Y AUDITORIA -->
      <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
        <p class="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Tiempos y Responsables de Entrega / Recepcion
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Fecha de Prestamo</p>
            <p class="font-bold text-ink mt-0.5">${fechaP}</p>
            <p class="text-[10px] text-slate2">Entregado por: ${escapeHtml(p.entregado_por || 'Administracion')}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Plazo Limite</p>
            <p class="font-bold text-ink mt-0.5">${fechaL}</p>
            <p class="text-[10px] text-slate2">Modalidad: ${escapeHtml(p.tipo_asignacion)}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase font-bold text-slate2">Fecha de Devolucion</p>
            <p class="font-bold text-ink mt-0.5">${fechaD}</p>
            <p class="text-[10px] text-slate2">Recibido por: ${escapeHtml(p.recibido_por || 'N/A')}</p>
          </div>
        </div>
      </div>

      <!-- SECCION 4: OBSERVACIONES -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p class="text-[10px] uppercase font-bold text-slate2 mb-1">Observaciones en la Entrega:</p>
          <p class="italic text-ink">${escapeHtml(p.observaciones_entrega || 'Sin observaciones registradas.')}</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p class="text-[10px] uppercase font-bold text-slate2 mb-1">Observaciones en la Devolucion:</p>
          <p class="italic text-ink">${escapeHtml(p.observaciones_devolucion || 'Pendiente de recepcion final.')}</p>
        </div>
      </div>

      <!-- CLAUSULA LEGAL INSTITUCIONAL -->
      <div class="p-3 rounded-xl bg-slate-50 border border-gray-200 text-[10px] text-slate2 space-y-1">
        <p class="font-bold text-ink uppercase">Compromiso y Responsabilidad Institucional:</p>
        <p>El custodio declara recibir el equipo antes descrito a entera satisfaccion para su uso exclusivo en actividades de formacion de la Fundacion A+. Se compromete a cuidar el hardware y software, no instalar software no autorizado, y reintegrarlo en la fecha establecida en el mismo estado en que fue entregado.</p>
      </div>

      <!-- ACCIONES DEL COMPROBANTE -->
      <div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="button" onclick="window.print()" class="px-4 py-2 rounded-xl bg-ink text-white text-xs font-bold hover:bg-black transition flex items-center gap-2 cursor-pointer shadow-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Imprimir Comprobante Oficial
        </button>
      </div>
    </div>
  `;

  mostrarModalPersonalizado(`Comprobante Oficial de Prestamo #${p.id}`, html);
};
})();
