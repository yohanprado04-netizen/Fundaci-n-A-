/**
 * pagos.js — Módulo de Control de Honorarios, Matrículas y Tesorería
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Control confidencial de honorarios y pagos a docentes (cuentas bancarias, retenciones, comprobantes)
 * 2. Control de matrículas, mensualidades y pagos de estudiantes (por cohorte, recibos y trazabilidad)
 * 3. Visor y descarga de comprobantes de pago (PDFs, imágenes)
 * 4. Dashboard financiero y reportes de tesorería institucional
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const fmtDate = (iso) => (typeof window !== 'undefined' && typeof window.fmtDate === 'function' ? window.fmtDate(iso) : (iso ? String(iso).slice(0, 10) : '—'));
  const toast = (msg, tipo) => { if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(msg, tipo); else alert(msg); };
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : (typeof currentAdminRole !== 'undefined' ? currentAdminRole : 'superadmin'));
  const getDocente = () => (typeof window !== 'undefined' && typeof window.getCurrentDocente === 'function' ? window.getCurrentDocente() : (typeof currentDocente !== 'undefined' ? currentDocente : null));
  const getEstudiante = () => (typeof window !== 'undefined' && typeof window.getCurrentEstudiante === 'function' ? window.getCurrentEstudiante() : (typeof currentEstudiante !== 'undefined' ? currentEstudiante : null));
  const fetchApi = async (e, o) => {
    if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') return await window.apiFetch(e, o);
    if (typeof apiFetch === 'function') return await apiFetch(e, o);
    throw new Error('apiFetch no disponible');
  };

  // =========================================================================
  // CONTROL DE HONORARIOS Y PAGOS DE DOCENTES (SUPERADMIN / COORDINADOR)
  // Confidencial: Los profesores y aliados tienen acceso estrictamente prohibido.
  // =========================================================================

  function puedeGestionarPagosDocentes() {
    const r = getAdminRole();
    return (r === 'superadmin' || r === 'administracion') && !getDocente() && !getEstudiante();
  }

  let docentePagosActual = null;
  let comprobanteActualDoc = null;

  async function abrirModalPagosDocente(docenteId) {
    if (!puedeGestionarPagosDocentes()) {
      toast('Acceso no autorizado. Este módulo es exclusivo para Administradores.', 'err');
      return;
    }

    const todosUsuarios = await Store.list('usuarios', { forceRefresh: true });
    const docente = todosUsuarios.find(u => u.id === docenteId);
    if (!docente) {
      toast('Docente no encontrado.', 'err');
      return;
    }

    docentePagosActual = docente;

    // Header info
    document.getElementById('pagosDocenteNombre').textContent = docente.nombre || 'Docente';
    document.getElementById('pagosDocenteEmail').innerHTML = `<svg class="w-3.5 h-3.5 inline mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${escapeHtml(docente.email || '')}`;
    document.getElementById('pagosDocenteTelefono').innerHTML = `<svg class="w-3.5 h-3.5 inline mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${escapeHtml(docente.telefono || 'Sin teléfono')}`;
    document.getElementById('pagosDocenteCohortes').textContent = docente.cohorte ? `Cohorte: ${docente.cohorte}` : 'Sin cohorte directa';

    // Tarifa configurada
    const tarifaHora = Number(docente.tarifaHora || docente.tarifa_hora || 0);

    // Actualizar datos bancarios vista
    document.getElementById('bancoVistaNombre').textContent = docente.banco || 'No registrado';
    document.getElementById('bancoVistaTipo').textContent = docente.tipoCuenta || docente.tipo_cuenta || 'No registrado';
    document.getElementById('bancoVistaNumero').textContent = docente.numeroCuenta || docente.numero_cuenta || 'No registrado';
    document.getElementById('bancoVistaTitular').textContent = docente.titularCuenta || docente.titular_cuenta || docente.nombre || 'No registrado';
    document.getElementById('bancoVistaDoc').textContent = docente.documentoCuenta || docente.documento_cuenta || 'No registrado';

    // Prellenar form de edición de banco
    document.getElementById('editTarifaHora').value = tarifaHora || '';
    document.getElementById('editBanco').value = docente.banco || '';
    document.getElementById('editTipoCuenta').value = docente.tipoCuenta || docente.tipo_cuenta || 'Ahorros';
    document.getElementById('editNumeroCuenta').value = docente.numeroCuenta || docente.numero_cuenta || '';
    document.getElementById('editTitularCuenta').value = docente.titularCuenta || docente.titular_cuenta || docente.nombre || '';
    document.getElementById('editDocumentoCuenta').value = docente.documentoCuenta || docente.documento_cuenta || '';

    // Ocultar formulario de banco por defecto
    toggleEditarDatosBancarios(false);

    // Cargar historial de pagos y KPIs reales
    await renderTablaPagosDocente(docenteId, tarifaHora);

    document.getElementById('modalPagosDocente').classList.remove('hidden');
  }

  function cerrarModalPagosDocente() {
    document.getElementById('modalPagosDocente').classList.add('hidden');
    docentePagosActual = null;
    window.__docentePagosMostrarTodos = false;
  }

  function toggleMostrarTodosPagosDocente() {
    window.__docentePagosMostrarTodos = !window.__docentePagosMostrarTodos;
    if (docentePagosActual) {
      const tarifaHora = Number(docentePagosActual.tarifaHora || docentePagosActual.tarifa_hora || 0);
      renderTablaPagosDocente(docentePagosActual.id, tarifaHora);
    }
  }
  window.toggleMostrarTodosPagosDocente = toggleMostrarTodosPagosDocente;

  function toggleEditarDatosBancarios(mostrar) {
    const vista = document.getElementById('vistaDatosBancarios');
    const form = document.getElementById('formDatosBancarios');
    const btn = document.getElementById('btnToggleEditBanco');
    const debeMostrar = (mostrar !== undefined) ? mostrar : form.classList.contains('hidden');

    if (debeMostrar) {
      vista.classList.add('hidden');
      form.classList.remove('hidden');
      if (btn) btn.innerHTML = 'Ocultar edición';
    } else {
      vista.classList.remove('hidden');
      form.classList.add('hidden');
      if (btn) btn.innerHTML = '<svg class="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>Editar datos / tarifa';
    }
  }

  async function guardarDatosBancariosDocente() {
    if (!docentePagosActual) return;
    const docenteId = docentePagosActual.id;
    const nuevaTarifa = parseFloat(document.getElementById('editTarifaHora').value) || 0;
    const nuevoBanco = document.getElementById('editBanco').value.trim();
    const nuevoTipo = document.getElementById('editTipoCuenta').value;
    const nuevoNumero = document.getElementById('editNumeroCuenta').value.trim();
    const nuevoTitular = document.getElementById('editTitularCuenta').value.trim();
    const nuevoDoc = document.getElementById('editDocumentoCuenta').value.trim();

    try {
      await apiFetch('pagos_docentes?action=datos_bancarios', {
        method: 'POST',
        body: JSON.stringify({
          docenteId,
          tarifaHora: nuevaTarifa,
          banco: nuevoBanco,
          tipoCuenta: nuevoTipo,
          numeroCuenta: nuevoNumero,
          titularCuenta: nuevoTitular,
          documentoCuenta: nuevoDoc
        })
      });

      const usuarios = await Store.list('usuarios');
      const idx = usuarios.findIndex(u => u.id === docenteId);
      if (idx !== -1) {
        usuarios[idx].tarifaHora = nuevaTarifa;
        usuarios[idx].tarifa_hora = nuevaTarifa;
        usuarios[idx].banco = nuevoBanco;
        usuarios[idx].tipoCuenta = nuevoTipo;
        usuarios[idx].tipo_cuenta = nuevoTipo;
        usuarios[idx].numeroCuenta = nuevoNumero;
        usuarios[idx].numero_cuenta = nuevoNumero;
        usuarios[idx].titularCuenta = nuevoTitular;
        usuarios[idx].titular_cuenta = nuevoTitular;
        usuarios[idx].documentoCuenta = nuevoDoc;
        usuarios[idx].documento_cuenta = nuevoDoc;
      }

      toast('Datos bancarios y tarifa actualizados con éxito', 'ok');
      await abrirModalPagosDocente(docenteId);
    } catch (err) {
      toast('Error al actualizar datos bancarios: ' + err.message, 'err');
    }
  }

  async function renderTablaPagosDocente(docenteId, tarifaHora) {
    const tbody = document.getElementById('tablaPagosDocenteCuerpo');
    tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">Cargando pagos...</td></tr>`;

    let pagos = [];
    try {
      pagos = await Store.list('pagos_docentes?docente_id=' + encodeURIComponent(docenteId), { forceRefresh: true });
      if (!Array.isArray(pagos)) pagos = [];
    } catch (e) {
      pagos = [];
    }

    const pagosDocente = pagos.filter(p => (p.docenteId === docenteId || p.docente_id === docenteId));
    window.__cachePagosDocenteActual = pagosDocente;

    const totalHoras = pagosDocente.reduce((acc, p) => acc + (Number(p.horas) || 0), 0);
    const totalPagado = pagosDocente.reduce((acc, p) => acc + (Number(p.totalPagado || p.total_pagado) || 0), 0);

    // Actualizar Franja Financiera (calculada 100% de datos reales)
    document.getElementById('kpiTarifaHora').textContent = `$ ${Number(tarifaHora || 0).toLocaleString('es-CO')} COP`;
    const kpiTarifaSub = document.getElementById('kpiTarifaSub');
    if (kpiTarifaSub) kpiTarifaSub.textContent = (tarifaHora > 0) ? 'Asignada al perfil' : 'Sin tarifa configurada';

    const kpiHorasTotales = document.getElementById('kpiHorasTotales');
    if (kpiHorasTotales) kpiHorasTotales.textContent = `${totalHoras.toFixed(1)} h`;
    const kpiHorasSub = document.getElementById('kpiHorasSub');
    if (kpiHorasSub) kpiHorasSub.textContent = totalHoras > 0 ? `Total en ${pagosDocente.length} pago${pagosDocente.length === 1 ? '' : 's'}` : 'Sin horas registradas';

    document.getElementById('kpiTotalPagado').textContent = `$ ${Math.round(totalPagado).toLocaleString('es-CO')} COP`;
    document.getElementById('kpiPagosCount').textContent = `${pagosDocente.length} pago${pagosDocente.length === 1 ? '' : 's'} registrado${pagosDocente.length === 1 ? '' : 's'}`;

    const kpiUltimoMonto = document.getElementById('kpiUltimoPagoMonto');
    const kpiUltimoDet = document.getElementById('kpiUltimoPagoDetalle');
    if (pagosDocente.length > 0) {
      const u = pagosDocente[0];
      const uMonto = Number(u.totalPagado || u.total_pagado || 0);
      const uFecha = u.fechaPago || u.fecha_pago || '';
      const uFechaTxt = uFecha ? new Date(uFecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      if (kpiUltimoMonto) kpiUltimoMonto.textContent = `$ ${uMonto.toLocaleString('es-CO')} COP`;
      if (kpiUltimoDet) kpiUltimoDet.textContent = `${escapeHtml(u.periodo || 'Liquidación')} · ${uFechaTxt}`;
    } else {
      if (kpiUltimoMonto) kpiUltimoMonto.textContent = '$ 0 COP';
      if (kpiUltimoDet) kpiUltimoDet.textContent = 'Sin liquidaciones aún';
    }

    if (pagosDocente.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="p-8 text-center">
            <div class="max-w-xs mx-auto text-center space-y-2">
              <div class="w-10 h-10 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <p class="text-xs font-bold text-ink">Sin pagos registrados aún</p>
              <p class="text-[11px] text-slate-400">Registra el primer comprobante de transferencia y liquidación de honorarios con el botón de arriba.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    const limite = 10;
    const mostrarTodos = Boolean(window.__docentePagosMostrarTodos);
    const listaRender = (mostrarTodos || pagosDocente.length <= limite) ? pagosDocente : pagosDocente.slice(0, limite);

    let htmlFilas = listaRender.map(p => {
      const id = p.id;
      const periodo = escapeHtml(p.periodo || 'Periodo');
      const mes = escapeHtml(p.mes || '');
      const fecha = p.fechaPago || p.fecha_pago || '';
      const fechaTxt = fecha ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      const horas = Number(p.horas || 0);
      const tarifa = Number(p.tarifaHora || p.tarifa_hora || 0);
      const total = Number(p.totalPagado || p.total_pagado || 0);
      const ref = escapeHtml(p.numeroReferencia || p.numero_referencia || '—');
      const banco = escapeHtml(p.entidadBancaria || p.entidad_bancaria || '');
      const compUrl = p.comprobanteUrl || p.comprobante_url || '';
      const tieneComp = !!compUrl;

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="py-3 px-4">
            <p class="font-extrabold text-ink">${periodo}</p>
            <p class="text-[10px] text-slate-400 font-semibold">${mes}</p>
          </td>
          <td class="py-3 px-3 text-slate-600 font-medium">${fechaTxt}</td>
          <td class="py-3 px-3 text-center font-bold text-ink">${horas.toFixed(1)} h</td>
          <td class="py-3 px-3 text-right font-medium text-purple-700">$ ${tarifa.toLocaleString('es-CO')}</td>
          <td class="py-3 px-4 text-right font-black text-ink text-sm">$ ${total.toLocaleString('es-CO')}</td>
          <td class="py-3 px-3">
            <p class="font-mono text-[11px] font-semibold text-slate-700">${ref}</p>
            <p class="text-[10px] text-slate-400">${banco}</p>
          </td>
          <td class="py-3 px-3 text-center">
            ${tieneComp ? `
              <div class="inline-flex items-center gap-1.5 justify-center">
                <button type="button" onclick="verComprobantePagoDocente('${id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer shadow-2xs" title="Ver captura o PDF">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Ver
                </button>
                <button type="button" onclick="descargarComprobanteDirecto('${id}', 'docente')" class="p-1 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer" title="Descargar archivo adjunto">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </button>
              </div>` : `
              <span class="text-[11px] text-slate-400 italic">Sin adjunto</span>`}
          </td>
          <td class="py-3 px-3 text-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Pagado
            </span>
          </td>
          <td class="py-3 px-3 text-right whitespace-nowrap">
            <button type="button" onclick="eliminarPagoDocente('${id}')" class="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer" title="Eliminar este pago">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    if (pagosDocente.length > limite) {
      htmlFilas += `
        <tr class="bg-purple-50/40 border-t border-purple-100">
          <td colspan="9" class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-3 text-xs">
              <span class="text-slate-500 font-medium">Mostrando ${listaRender.length} de ${pagosDocente.length} liquidaciones</span>
              <button type="button" onclick="toggleMostrarTodosPagosDocente()" class="font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 transition cursor-pointer shadow-2xs">
                ${mostrarTodos ? 'Mostrar solo 10' : ('Ver las ' + (pagosDocente.length - limite) + ' restantes (Ver todas)')}
              </button>
            </div>
          </td>
        </tr>`;
    }

    tbody.innerHTML = htmlFilas;
  }

  function abrirFormNuevoPagoDocente() {
    if (!docentePagosActual) return;
    const docente = docentePagosActual;

    document.getElementById('formPagoTitulo').textContent = 'Registrar Pago / Liquidación';
    document.getElementById('formPagoSubtitulo').textContent = `Docente: ${docente.nombre}`;

    document.getElementById('pago_id').value = '';
    document.getElementById('pago_docente_id').value = docente.id;
    document.getElementById('pago_docente_nombre').value = docente.nombre;
    document.getElementById('pago_comprobante_url').value = '';
    document.getElementById('pago_comprobante_nombre').value = '';
    document.getElementById('pago_comprobante_tipo').value = '';

    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const mesStr = hoy.toISOString().slice(0, 7);
    const mesNom = hoy.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    document.getElementById('pago_periodo').value = `Honorarios ${mesNom.charAt(0).toUpperCase() + mesNom.slice(1)}`;
    document.getElementById('pago_mes').value = mesStr;
    document.getElementById('pago_fecha').value = hoyStr;
    document.getElementById('pago_banco').value = docente.banco || '';
    document.getElementById('pago_referencia').value = '';
    document.getElementById('pago_observaciones').value = '';

    const tarifa = Number(docente.tarifaHora || docente.tarifa_hora || 0);
    document.getElementById('pago_tarifa_hora').value = tarifa || '';
    document.getElementById('pago_horas').value = '';
    document.getElementById('pago_total').value = '';

    quitarComprobantePagoDocente();

    document.getElementById('modalFormPagoDocente').classList.remove('hidden');
  }

  function cerrarFormNuevoPagoDocente() {
    document.getElementById('modalFormPagoDocente').classList.add('hidden');
  }

  function calcularTotalPagoDocente() {
    const horas = parseFloat(document.getElementById('pago_horas').value) || 0;
    const tarifa = parseFloat(document.getElementById('pago_tarifa_hora').value) || 0;
    const total = horas * tarifa;
    document.getElementById('pago_total').value = Math.round(total);
  }

  function manejarComprobantePagoDocente(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast('El archivo no puede superar 8 MB', 'err');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      document.getElementById('pago_comprobante_url').value = dataUrl;
      document.getElementById('pago_comprobante_nombre').value = file.name;
      document.getElementById('pago_comprobante_tipo').value = file.type || 'image/png';

      document.getElementById('dropzonePrompt').classList.add('hidden');
      const prev = document.getElementById('dropzonePreview');
      prev.classList.remove('hidden');
      document.getElementById('previewNombreComprobante').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      const img = document.getElementById('previewImgComprobante');
      const pdfIcon = document.getElementById('previewPdfIcon');
      if (file.type === 'application/pdf') {
        img.classList.add('hidden');
        pdfIcon.classList.remove('hidden');
      } else {
        img.src = dataUrl;
        img.classList.remove('hidden');
        pdfIcon.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  function quitarComprobantePagoDocente(event) {
    if (event) event.stopPropagation();
    document.getElementById('pago_file_input').value = '';
    document.getElementById('pago_comprobante_url').value = '';
    document.getElementById('pago_comprobante_nombre').value = '';
    document.getElementById('pago_comprobante_tipo').value = '';
    document.getElementById('dropzonePrompt').classList.remove('hidden');
    document.getElementById('dropzonePreview').classList.add('hidden');
  }

  async function guardarNuevoPagoDocente() {
    const docenteId = document.getElementById('pago_docente_id').value;
    const docenteNombre = document.getElementById('pago_docente_nombre').value;
    const periodo = document.getElementById('pago_periodo').value.trim();
    const mes = document.getElementById('pago_mes').value;
    const horas = parseFloat(document.getElementById('pago_horas').value) || 0;
    const tarifaHora = parseFloat(document.getElementById('pago_tarifa_hora').value) || 0;
    const totalPagado = parseFloat(document.getElementById('pago_total').value) || 0;
    const fechaPago = document.getElementById('pago_fecha').value;
    const entidadBancaria = document.getElementById('pago_banco').value.trim();
    const numeroReferencia = document.getElementById('pago_referencia').value.trim();
    const observaciones = document.getElementById('pago_observaciones').value.trim();
    const comprobanteUrl = document.getElementById('pago_comprobante_url').value;
    const comprobanteNombre = document.getElementById('pago_comprobante_nombre').value;
    const comprobanteTipo = document.getElementById('pago_comprobante_tipo').value;

    if (!periodo || !fechaPago || totalPagado <= 0) {
      toast('Por favor completa el período, fecha y un total mayor a 0.', 'err');
      return;
    }

    const btn = document.getElementById('btnGuardarPago');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const payload = {
      docenteId,
      docenteNombre,
      periodo,
      mes,
      horas,
      tarifaHora,
      totalPagado,
      fechaPago,
      entidadBancaria,
      numeroReferencia,
      observaciones,
      comprobanteUrl,
      comprobanteNombre,
      comprobanteTipo,
      estado: 'Pagado'
    };

    try {
      await apiFetch('pagos_docentes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast('Registro de pago guardado exitosamente', 'ok');
      cerrarFormNuevoPagoDocente();
      if (docentePagosActual) {
        await abrirModalPagosDocente(docenteId);
      }
    } catch (err) {
      toast('Error al guardar el pago: ' + err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Registro de Pago';
    }
  }

  // =========================================================================
  // SISTEMA UNIVERSAL DE COMPROBANTES DE PAGO (DOCENTES Y ESTUDIANTES)
  // =========================================================================

  let comprobanteActualBlobUrl = null;

  function dataURItoBlob(dataURI, defaultMime = 'application/octet-stream') {
    if (!dataURI || typeof dataURI !== 'string' || !dataURI.startsWith('data:')) return null;
    try {
      const parts = dataURI.split(',');
      if (parts.length < 2) return null;
      const header = parts[0];
      const base64Data = parts[1];
      const mimeMatch = header.match(/:(.*?);/);
      const mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : defaultMime;
      const binary = atob(base64Data);
      const len = binary.length;
      const buffer = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        buffer[i] = binary.charCodeAt(i);
      }
      return new Blob([buffer], { type: mime });
    } catch (err) {
      console.warn('[Comprobante] Error al convertir dataURI a Blob:', err);
      return null;
    }
  }

  function obtenerUrlVisualizable(url, mimeType = '') {
    if (!url) return { url: '', isBlob: false };
    if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return { url, isBlob: false };
    }
    if (url.startsWith('data:')) {
      const blob = dataURItoBlob(url, mimeType);
      if (blob) {
        return { url: URL.createObjectURL(blob), isBlob: true };
      }
    }
    return { url, isBlob: false };
  }

  function descargarArchivoDirecto(url, nombre = 'comprobante', mimeType = '') {
    let target = url;
    let esBlobTemporal = false;
    if (url && url.startsWith('data:')) {
      const blob = dataURItoBlob(url, mimeType);
      if (blob) {
        target = URL.createObjectURL(blob);
        esBlobTemporal = true;
      }
    }
    const a = document.createElement('a');
    a.href = target;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (esBlobTemporal) {
      setTimeout(() => URL.revokeObjectURL(target), 15000);
    }
  }

  function abrirComprobanteEnPestana() {
    if (comprobanteActualBlobUrl) {
      window.open(comprobanteActualBlobUrl, '_blank');
      return;
    }
    if (!comprobanteActualDoc || !comprobanteActualDoc.comprobanteUrl) return;
    const url = comprobanteActualDoc.comprobanteUrl;
    if (url.startsWith('data:')) {
      const blob = dataURItoBlob(url, comprobanteActualDoc.comprobanteTipo);
      if (blob) {
        const bUrl = URL.createObjectURL(blob);
        window.open(bUrl, '_blank');
        return;
      }
    }
    window.open(url, '_blank');
  }
  window.abrirComprobanteEnPestana = abrirComprobanteEnPestana;

  async function verComprobantePago(pagoId, tipo = 'docente') {
    try {
      let pago = null;
      if (window.__cachePagosDocenteActual && Array.isArray(window.__cachePagosDocenteActual)) {
        const p = window.__cachePagosDocenteActual.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago && window.__cachePagosTraineeActual && Array.isArray(window.__cachePagosTraineeActual)) {
        const p = window.__cachePagosTraineeActual.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago && window.__cachePagosEstudiantes && Array.isArray(window.__cachePagosEstudiantes)) {
        const p = window.__cachePagosEstudiantes.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago || !(pago.comprobante_url || pago.comprobanteUrl)) {
        const endpoint = tipo === 'estudiante' ? ('pagos_estudiantes?id=' + encodeURIComponent(pagoId)) : ('pagos_docentes?id=' + encodeURIComponent(pagoId));
        pago = await apiFetch(endpoint);
      }
      const rawUrl = pago ? (pago.comprobante_url || pago.comprobanteUrl) : null;
      if (!pago || !rawUrl) {
        toast('No se encontró el comprobante para este registro.', 'err');
        return;
      }

      if (comprobanteActualBlobUrl) {
        try { URL.revokeObjectURL(comprobanteActualBlobUrl); } catch(e){}
        comprobanteActualBlobUrl = null;
      }

      const nombreArchivo = pago.comprobante_nombre || pago.comprobanteNombre || `comprobante_${pago.id || 'pago'}`;
      const cTipo = pago.comprobante_tipo || pago.comprobanteTipo || '';
      const persona = pago.estudiante_nombre || pago.estudianteNombre || pago.docente_nombre || pago.docenteNombre || 'Pago';
      const concepto = pago.concepto || pago.periodo || 'Liquidación';
      const monto = Number(pago.monto || pago.total_pagado || pago.totalPagado || 0);
      const fecha = fmtDate(pago.fecha_pago || pago.fechaPago || '');

      const isPdf = cTipo === 'application/pdf' || rawUrl.startsWith('data:application/pdf') || nombreArchivo.toLowerCase().endsWith('.pdf');

      const visual = obtenerUrlVisualizable(rawUrl, isPdf ? 'application/pdf' : cTipo);
      if (visual.isBlob) {
        comprobanteActualBlobUrl = visual.url;
      }

      comprobanteActualDoc = {
        comprobanteUrl: rawUrl,
        comprobanteNombre: nombreArchivo,
        comprobanteTipo: cTipo,
        id: pago.id
      };

      document.getElementById('visorComprobanteDocente').textContent = `${concepto} · ${persona}`;
      document.getElementById('visorComprobanteSubtitulo').textContent = `Monto: $ ${monto.toLocaleString('es-CO')} COP · Fecha: ${fecha} · Archivo: ${nombreArchivo}`;

      const img = document.getElementById('visorComprobanteImg');
      const pdfCont = document.getElementById('visorComprobantePdfContainer');
      const pdfFrame = document.getElementById('visorComprobantePdfFrame');
      const vacio = document.getElementById('visorComprobanteVacio');

      if (isPdf) {
        img.classList.add('hidden');
        img.src = '';
        pdfFrame.src = visual.url;
        pdfCont.classList.remove('hidden');
        vacio.classList.add('hidden');
      } else {
        pdfCont.classList.add('hidden');
        pdfFrame.src = 'about:blank';
        img.src = visual.url;
        img.classList.remove('hidden');
        vacio.classList.add('hidden');
      }

      document.getElementById('modalVisorComprobanteDocente').classList.remove('hidden');
    } catch (e) {
      toast('Error al cargar comprobante: ' + e.message, 'err');
    }
  }

  async function verComprobantePagoDocente(pagoId) {
    return verComprobantePago(pagoId, 'docente');
  }

  async function verComprobantePagoEstudiante(pagoId) {
    return verComprobantePago(pagoId, 'estudiante');
  }

  async function descargarComprobanteDirecto(pagoId, tipo = 'docente') {
    try {
      let pago = null;
      if (window.__cachePagosDocenteActual && Array.isArray(window.__cachePagosDocenteActual)) {
        const p = window.__cachePagosDocenteActual.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago && window.__cachePagosTraineeActual && Array.isArray(window.__cachePagosTraineeActual)) {
        const p = window.__cachePagosTraineeActual.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago && window.__cachePagosEstudiantes && Array.isArray(window.__cachePagosEstudiantes)) {
        const p = window.__cachePagosEstudiantes.find(x => x.id === pagoId);
        if (p && (p.comprobante_url || p.comprobanteUrl)) pago = p;
      }
      if (!pago || !(pago.comprobante_url || pago.comprobanteUrl)) {
        const endpoint = tipo === 'estudiante' ? ('pagos_estudiantes?id=' + encodeURIComponent(pagoId)) : ('pagos_docentes?id=' + encodeURIComponent(pagoId));
        pago = await apiFetch(endpoint);
      }
      const url = pago ? (pago.comprobante_url || pago.comprobanteUrl) : null;
      if (!pago || !url) {
        toast('No se encontró el archivo del comprobante.', 'err');
        return;
      }
      const nombreArchivo = pago.comprobante_nombre || pago.comprobanteNombre || `comprobante_${pago.id || 'pago'}`;
      const cTipo = pago.comprobante_tipo || pago.comprobanteTipo || '';
      descargarArchivoDirecto(url, nombreArchivo, cTipo);
    } catch (e) {
      toast('Error al descargar: ' + e.message, 'err');
    }
  }

  function cerrarVisorComprobanteDocente() {
    const m = document.getElementById('modalVisorComprobanteDocente');
    if (m) m.classList.add('hidden');
    const img = document.getElementById('visorComprobanteImg');
    if (img) img.src = '';
    const frame = document.getElementById('visorComprobantePdfFrame');
    if (frame) frame.src = 'about:blank';
    if (comprobanteActualBlobUrl) {
      try { URL.revokeObjectURL(comprobanteActualBlobUrl); } catch(e){}
      comprobanteActualBlobUrl = null;
    }
    comprobanteActualDoc = null;
  }

  function descargarComprobanteActual() {
    if (!comprobanteActualDoc || !comprobanteActualDoc.comprobanteUrl) return;
    const url = comprobanteActualDoc.comprobanteUrl;
    const nombre = comprobanteActualDoc.comprobanteNombre || `comprobante_${comprobanteActualDoc.id || 'pago'}`;
    const tipo = comprobanteActualDoc.comprobanteTipo || '';
    descargarArchivoDirecto(url, nombre, tipo);
  }

  async function eliminarPagoDocente(pagoId) {
    if (!confirm('¿Estás seguro de eliminar este registro de pago? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch('pagos_docentes?id=' + encodeURIComponent(pagoId), { method: 'DELETE' });
      toast('Registro de pago eliminado', 'ok');
      if (docentePagosActual) {
        await abrirModalPagosDocente(docentePagosActual.id);
      }
      if (document.getElementById('panel-pagos') && !document.getElementById('panel-pagos').classList.contains('hidden')) {
        renderPanelPagos();
      }
    } catch (err) {
      toast('Error al eliminar: ' + err.message, 'err');
    }
  }

  // =========================================================================
  // GESTIÓN DE PAGOS DE ESTUDIANTES (MATRÍCULAS / MENSUALIDADES)
  // =========================================================================

  let comprobanteEstudianteTemporal = null;

  async function abrirFormPagoEstudiante(estudianteId = null, pagoId = null, enfocarCaptura = false) {
    if (!puedeGestionarPagosDocentes()) {
      toast('Acceso no autorizado.', 'err');
      return;
    }

    const usuarios = await Store.list('usuarios');
    const estudiantes = usuarios.filter(u => u.rol === 'Estudiante' || u.rol === 'estudiante').sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    const select = document.getElementById('pago_estudiante_usuario_id');
    select.innerHTML = '<option value="">-- Seleccionar Estudiante --</option>' +
      estudiantes.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.nombre)} (${escapeHtml(e.cohorte || e.cohorteAnterior || 'Sin cohorte')})</option>`).join('');

    const modal = document.getElementById('modalFormPagoEstudiante');
    const form = document.getElementById('formRegistroPagoEstudiante');
    form.reset();
    comprobanteEstudianteTemporal = null;

    document.getElementById('dropzonePromptEstudiante').classList.remove('hidden');
    document.getElementById('dropzonePreviewEstudiante').classList.add('hidden');
    document.getElementById('previewImgComprobanteEstudiante').classList.add('hidden');
    document.getElementById('previewPdfIconEstudiante').classList.add('hidden');

    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    document.getElementById('pago_estudiante_fecha').value = hoy;
    document.getElementById('pago_estudiante_mes').value = mesActual;
    document.getElementById('pago_estudiante_id').value = pagoId || '';

    if (pagoId) {
      document.getElementById('formPagoEstudianteTitulo').textContent = enfocarCaptura ? 'Adjuntar Captura / Comprobante de Pago' : 'Editar Pago de Estudiante';
      const pago = await apiFetch('pagos_estudiantes?id=' + encodeURIComponent(pagoId));
      if (pago) {
        select.value = pago.estudiante_id || pago.estudianteId || '';
        document.getElementById('pago_estudiante_cohorte').value = pago.cohorte || '';
        document.getElementById('pago_estudiante_concepto').value = pago.concepto || 'Mensualidad';
        document.getElementById('pago_estudiante_mes').value = pago.mes || mesActual;
        document.getElementById('pago_estudiante_monto').value = pago.monto || '';
        document.getElementById('pago_estudiante_fecha').value = pago.fecha_pago || pago.fechaPago || hoy;
        document.getElementById('pago_estudiante_medio').value = pago.medio_pago || pago.medioPago || 'Bancolombia';
        document.getElementById('pago_estudiante_referencia').value = pago.numero_referencia || pago.numeroReferencia || '';
        document.getElementById('pago_estudiante_observaciones').value = pago.observaciones || '';
        if (pago.comprobante_url || pago.comprobanteUrl) {
          comprobanteEstudianteTemporal = {
            nombre: pago.comprobante_nombre || pago.comprobanteNombre || 'comprobante_existente',
            tipo: pago.comprobante_tipo || pago.comprobanteTipo || 'image/png',
            url: pago.comprobante_url || pago.comprobanteUrl
          };
          mostrarPreviewComprobanteEstudiante(comprobanteEstudianteTemporal.nombre, comprobanteEstudianteTemporal.tipo, comprobanteEstudianteTemporal.url);
        }
      }
    } else {
      document.getElementById('formPagoEstudianteTitulo').textContent = 'Registrar Pago de Estudiante';
      if (estudianteId) {
        select.value = estudianteId;
        await onSeleccionarEstudianteParaPago(estudianteId);
      }
    }

    const dropzone = document.getElementById('dropzoneComprobanteEstudiante');
    if (dropzone) {
      if (enfocarCaptura) {
        dropzone.classList.add('ring-4', 'ring-purple-400', 'bg-purple-100/40');
        setTimeout(() => {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        dropzone.classList.remove('ring-4', 'ring-purple-400', 'bg-purple-100/40');
      }
    }

    modal.classList.remove('hidden');
  }

  function cerrarFormPagoEstudiante() {
    const modal = document.getElementById('modalFormPagoEstudiante');
    if (modal) modal.classList.add('hidden');
    const dropzone = document.getElementById('dropzoneComprobanteEstudiante');
    if (dropzone) dropzone.classList.remove('ring-4', 'ring-purple-400', 'bg-purple-100/40');
    comprobanteEstudianteTemporal = null;
  }

  async function onSeleccionarEstudianteParaPago(usuarioId) {
    if (!usuarioId) return;
    const usuarios = await Store.list('usuarios');
    const u = usuarios.find(x => x.id === usuarioId);
    if (u) {
      const cohorteInput = document.getElementById('pago_estudiante_cohorte');
      if (cohorteInput) cohorteInput.value = u.cohorte || u.cohorteAnterior || '';
    }
  }

  function manejarComprobantePagoEstudiante(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast('El archivo supera el límite permitido de 8 MB.', 'err');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      comprobanteEstudianteTemporal = {
        nombre: file.name,
        tipo: file.type,
        url: e.target.result
      };
      mostrarPreviewComprobanteEstudiante(file.name, file.type, e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function mostrarPreviewComprobanteEstudiante(nombre, tipo, url) {
    document.getElementById('dropzonePromptEstudiante').classList.add('hidden');
    const prev = document.getElementById('dropzonePreviewEstudiante');
    prev.classList.remove('hidden');
    document.getElementById('previewNombreComprobanteEstudiante').textContent = nombre;

    const img = document.getElementById('previewImgComprobanteEstudiante');
    const pdf = document.getElementById('previewPdfIconEstudiante');

    if (tipo === 'application/pdf' || (url && url.startsWith('data:application/pdf'))) {
      img.classList.add('hidden');
      pdf.classList.remove('hidden');
    } else {
      pdf.classList.add('hidden');
      img.src = url;
      img.classList.remove('hidden');
    }
  }

  function quitarComprobantePagoEstudiante(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    comprobanteEstudianteTemporal = null;
    const input = document.getElementById('pago_estudiante_file_input');
    if (input) input.value = '';
    document.getElementById('dropzonePromptEstudiante').classList.remove('hidden');
    document.getElementById('dropzonePreviewEstudiante').classList.add('hidden');
    document.getElementById('previewImgComprobanteEstudiante').classList.add('hidden');
    document.getElementById('previewPdfIconEstudiante').classList.add('hidden');
  }

  async function guardarNuevoPagoEstudiante() {
    const estudianteId = document.getElementById('pago_estudiante_usuario_id').value;
    if (!estudianteId) {
      toast('Por favor selecciona el estudiante.', 'err');
      return;
    }
    const montoRaw = (document.getElementById('pago_estudiante_monto').value || '').trim();
    if (!montoRaw || !/^\d+$/.test(montoRaw)) {
      toast('El monto solo debe contener números (no se permiten letras ni símbolos).', 'err');
      return;
    }
    const monto = parseFloat(montoRaw);
    if (monto <= 0) {
      toast('El monto a pagar debe ser mayor a 0.', 'err');
      return;
    }
    const fechaPago = document.getElementById('pago_estudiante_fecha').value;
    const mes = document.getElementById('pago_estudiante_mes').value;
    const concepto = document.getElementById('pago_estudiante_concepto').value;
    const medioPago = document.getElementById('pago_estudiante_medio').value;
    const referencia = document.getElementById('pago_estudiante_referencia').value.trim();
    const observaciones = document.getElementById('pago_estudiante_observaciones').value.trim();
    const cohorte = document.getElementById('pago_estudiante_cohorte').value.trim();

    const usuarios = await Store.list('usuarios');
    const est = usuarios.find(u => u.id === estudianteId);
    const estudianteNombre = est ? est.nombre : 'Estudiante';

    const btn = document.getElementById('btnGuardarPagoEstudiante');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const pagoId = document.getElementById('pago_estudiante_id').value || null;

    const payload = {
      id: pagoId || ('pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      estudiante_id: estudianteId,
      estudiante_nombre: estudianteNombre,
      cohorte: cohorte,
      concepto: concepto,
      mes: mes,
      monto: monto,
      fecha_pago: fechaPago,
      medio_pago: medioPago,
      numero_referencia: referencia,
      observaciones: observaciones,
      estado: 'Aprobado',
      comprobante_nombre: comprobanteEstudianteTemporal ? comprobanteEstudianteTemporal.nombre : null,
      comprobante_tipo: comprobanteEstudianteTemporal ? comprobanteEstudianteTemporal.tipo : null,
      comprobante_url: comprobanteEstudianteTemporal ? comprobanteEstudianteTemporal.url : null
    };

    try {
      await apiFetch('pagos_estudiantes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      Store.invalidate('pagos_estudiantes');
      if (window.__cachePagosEstudiantes && Array.isArray(window.__cachePagosEstudiantes)) {
        const idx = window.__cachePagosEstudiantes.findIndex(p => p.id === payload.id);
        if (idx !== -1) {
          window.__cachePagosEstudiantes[idx] = {
            ...window.__cachePagosEstudiantes[idx],
            ...payload,
            comprobanteUrl: payload.comprobante_url,
            comprobanteNombre: payload.comprobante_nombre,
            comprobanteTipo: payload.comprobante_tipo
          };
        } else {
          window.__cachePagosEstudiantes.unshift({
            ...payload,
            comprobanteUrl: payload.comprobante_url,
            comprobanteNombre: payload.comprobante_nombre,
            comprobanteTipo: payload.comprobante_tipo
          });
        }
      }
      if (window.__cachePagosTraineeActual && Array.isArray(window.__cachePagosTraineeActual)) {
        const idxT = window.__cachePagosTraineeActual.findIndex(p => p.id === payload.id);
        if (idxT !== -1) {
          window.__cachePagosTraineeActual[idxT] = {
            ...window.__cachePagosTraineeActual[idxT],
            ...payload,
            comprobanteUrl: payload.comprobante_url,
            comprobanteNombre: payload.comprobante_nombre,
            comprobanteTipo: payload.comprobante_tipo
          };
        }
      }
      toast('Comprobante y pago guardados correctamente', 'ok');
      const chkMantener = document.getElementById('pago_estudiante_mantener_abierto');
      if (chkMantener && chkMantener.checked) {
        document.getElementById('pago_estudiante_id').value = '';
        document.getElementById('pago_estudiante_usuario_id').value = '';
        document.getElementById('pago_estudiante_referencia').value = '';
        document.getElementById('pago_estudiante_monto').value = '';
        quitarComprobantePagoEstudiante();
        document.getElementById('pago_estudiante_usuario_id').focus();
        toast('Listo para registrar el siguiente estudiante sin salir.', 'ok');
      } else {
        cerrarFormPagoEstudiante();
      }
      if (document.getElementById('panel-pagos') && !document.getElementById('panel-pagos').classList.contains('hidden')) {
        await renderPanelPagos();
      }
      if (document.getElementById('panel-trainee') && !document.getElementById('panel-trainee').classList.contains('hidden')) {
        await renderTraineeFicha();
      }
    } catch (e) {
      toast('Error al guardar el pago: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Pago de Estudiante';
    }
  }

  async function eliminarPagoEstudiante(pagoId) {
    if (!confirm('¿Estás seguro de eliminar este registro de pago de estudiante? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch('pagos_estudiantes?id=' + encodeURIComponent(pagoId), { method: 'DELETE' });
      Store.invalidate('pagos_estudiantes');
      toast('Pago de estudiante eliminado', 'ok');
      if (document.getElementById('panel-pagos') && !document.getElementById('panel-pagos').classList.contains('hidden')) {
        await renderPanelPagos();
      }
      if (document.getElementById('panel-trainee') && !document.getElementById('panel-trainee').classList.contains('hidden')) {
        await renderTraineeFicha();
      }
    } catch (err) {
      toast('Error al eliminar: ' + err.message, 'err');
    }
  }

  // =========================================================================
  // MÓDULO PRINCIPAL: PANEL DE PAGOS (TABS: ESTUDIANTES Y PROFESORES)
  // =========================================================================

  async function abrirModalPagosPorCohorte() {
    if (!puedeGestionarPagosDocentes()) {
      toast('Acceso no autorizado.', 'err');
      return;
    }
    const usuarios = await Store.list('usuarios');
    const estudiantes = usuarios.filter(u => u.rol === 'Estudiante' || u.rol === 'estudiante');
    
    // Contabilizar estudiantes por cohorte
    const cohortesMap = {};
    estudiantes.forEach(e => {
      const c = e.cohorte || e.cohorteAnterior;
      if (c) {
        cohortesMap[c] = (cohortesMap[c] || 0) + 1;
      }
    });

    const select = document.getElementById('pago_cohorte_seleccion');
    const listaCohortes = Object.keys(cohortesMap).sort();
    if (!listaCohortes.length) {
      select.innerHTML = '<option value="">-- No hay cohortes registradas con estudiantes --</option>';
    } else {
      select.innerHTML = '<option value="">-- Selecciona una Cohorte --</option>' +
        listaCohortes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${cohortesMap[c]} estudiantes)</option>`).join('');
    }

    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    document.getElementById('pago_cohorte_fecha').value = hoy;
    document.getElementById('pago_cohorte_mes').value = mesActual;
    document.getElementById('pago_cohorte_monto').value = '';
    document.getElementById('pago_cohorte_concepto').value = 'Mensualidad';
    document.getElementById('pago_cohorte_medio').value = 'Transferencia Bancaria';
    document.getElementById('pago_cohorte_observaciones').value = '';
    document.getElementById('pago_cohorte_resumen_estudiantes').classList.add('hidden');

    document.getElementById('modalPagosPorCohorte').classList.remove('hidden');
  }

  function cerrarModalPagosPorCohorte() {
    const modal = document.getElementById('modalPagosPorCohorte');
    if (modal) modal.classList.add('hidden');
  }

  async function onCambioCohorteGenerarPagos(cohorte) {
    const resumen = document.getElementById('pago_cohorte_resumen_estudiantes');
    const cantBadge = document.getElementById('pago_cohorte_cant_estudiantes');
    if (!cohorte) {
      if (resumen) resumen.classList.add('hidden');
      return;
    }
    const usuarios = await Store.list('usuarios');
    const enCohorte = usuarios.filter(u => (u.rol === 'Estudiante' || u.rol === 'estudiante') && (u.cohorte === cohorte || u.cohorteAnterior === cohorte));
    if (cantBadge) cantBadge.textContent = `${enCohorte.length} alumnos`;
    if (resumen) resumen.classList.remove('hidden');
  }

  async function generarPagosParaCohorte() {
    const cohorte = document.getElementById('pago_cohorte_seleccion').value;
    if (!cohorte) {
      toast('Por favor selecciona una cohorte.', 'err');
      return;
    }
    const fechaPago = document.getElementById('pago_cohorte_fecha').value;
    if (!fechaPago) {
      toast('Por favor selecciona la fecha de pago.', 'err');
      return;
    }
    const mes = document.getElementById('pago_cohorte_mes').value;
    if (!mes) {
      toast('Por favor selecciona el mes cubierto.', 'err');
      return;
    }
    const montoRaw = (document.getElementById('pago_cohorte_monto').value || '').trim();
    if (!montoRaw || !/^\d+$/.test(montoRaw)) {
      toast('El monto solo debe contener números (no se permiten letras ni símbolos).', 'err');
      return;
    }
    const monto = parseFloat(montoRaw);
    if (monto <= 0) {
      toast('El monto a cobrar debe ser mayor a 0.', 'err');
      return;
    }
    const concepto = (document.getElementById('pago_cohorte_concepto') ? document.getElementById('pago_cohorte_concepto').value : '') || 'Mensualidad';
    const medioPago = document.getElementById('pago_cohorte_medio').value;
    const observaciones = document.getElementById('pago_cohorte_observaciones').value.trim();

    const usuarios = await Store.list('usuarios');
    const estudiantes = usuarios.filter(u => (u.rol === 'Estudiante' || u.rol === 'estudiante') && (u.cohorte === cohorte || u.cohorteAnterior === cohorte));

    if (!estudiantes.length) {
      toast('No hay estudiantes registrados en la cohorte seleccionada.', 'err');
      return;
    }

    const confirmMsg = `¿Deseas generar el registro de pago para los ${estudiantes.length} estudiantes de la "${cohorte}" por valor de $ ${monto.toLocaleString('es-CO')} COP el día ${fechaPago}?`;
    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('btnGenerarPagosCohorte');
    btn.disabled = true;
    btn.textContent = `Generando para ${estudiantes.length} estudiantes...`;

    try {
      const lotePagos = estudiantes.map(e => ({
        id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + e.id,
        estudiante_id: e.id,
        estudiante_nombre: e.nombre || 'Estudiante',
        cohorte: cohorte,
        concepto: concepto,
        mes: mes,
        monto: monto,
        fecha_pago: fechaPago,
        medio_pago: medioPago,
        numero_referencia: '',
        comprobante_nombre: null,
        comprobante_tipo: null,
        comprobante_url: null,
        observaciones: observaciones,
        estado: 'Pendiente'
      }));

      await apiFetch('pagos_estudiantes', {
        method: 'POST',
        body: JSON.stringify(lotePagos)
      });

      toast(`¡Se crearon con éxito los ${lotePagos.length} registros de pago para la ${cohorte}!`, 'ok');
      cerrarModalPagosPorCohorte();
      if (document.getElementById('panel-pagos') && !document.getElementById('panel-pagos').classList.contains('hidden')) {
        await renderPanelPagos();
      }
    } catch (e) {
      toast('Error al generar pagos por cohorte: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generar Registros de Pago';
    }
  }

  const pagosState = {
    tab: 'estudiantes', // 'estudiantes' | 'profesores'
    filtroCohorteEst: '',
    filtroMesEst: '',
    busquedaEst: '',
    mostrarTodosEst: false,
    filtroCohorteDoc: '',
    busquedaDoc: '',
  };

  function cambiarTabPagos(tab) {
    pagosState.tab = tab;
    renderPanelPagos();
  }

  function limpiarFiltrosPagosEst() {
    pagosState.filtroCohorteEst = '';
    pagosState.filtroMesEst = '';
    pagosState.busquedaEst = '';
    pagosState.mostrarTodosEst = false;
    renderPanelPagos();
  }
  window.limpiarFiltrosPagosEst = limpiarFiltrosPagosEst;

  function toggleMostrarTodosPagosEst() {
    pagosState.mostrarTodosEst = !pagosState.mostrarTodosEst;
    const cuerpo = document.getElementById('tablaPagosEstudiantesCuerpo');
    if (cuerpo && window.__cachePagosEstudiantes) {
      cuerpo.innerHTML = renderFilasPagosEstudiantes(window.__cachePagosEstudiantes);
    }
  }
  window.toggleMostrarTodosPagosEst = toggleMostrarTodosPagosEst;

  function onInputBusquedaPagosEst(val) {
    pagosState.busquedaEst = val;
    const cuerpo = document.getElementById('tablaPagosEstudiantesCuerpo');
    if (cuerpo && window.__cachePagosEstudiantes) {
      cuerpo.innerHTML = renderFilasPagosEstudiantes(window.__cachePagosEstudiantes);
    }
  }

  function onInputBusquedaPagosDoc(val) {
    pagosState.busquedaDoc = val;
    const grid = document.getElementById('gridDocentesPagos');
    if (grid && window.__cacheDocentesPagos) {
      grid.innerHTML = renderTarjetasDocentesPagos(window.__cacheDocentesPagos.docentes, window.__cacheDocentesPagos.pagosDocentes);
    }
  }

  function formatearMesFiltro(m) {
    if (!m) return 'Sin mes';
    if (/^\d{4}-\d{2}$/.test(m)) {
      return mesLabel(m);
    }
    return m;
  }

  function renderFilasPagosEstudiantes(pagosEstudiantes) {
    let filtrados = pagosEstudiantes || [];
    if (pagosState.filtroCohorteEst) {
      filtrados = filtrados.filter(p => (p.cohorte || '').toLowerCase() === pagosState.filtroCohorteEst.toLowerCase());
    }
    if (pagosState.filtroMesEst) {
      filtrados = filtrados.filter(p => (p.mes || '').toLowerCase() === pagosState.filtroMesEst.toLowerCase());
    }
    if (pagosState.busquedaEst) {
      const q = pagosState.busquedaEst.toLowerCase().trim();
      filtrados = filtrados.filter(p => 
        (p.estudiante_nombre || p.estudianteNombre || '').toLowerCase().includes(q) ||
        (p.concepto || '').toLowerCase().includes(q) ||
        (p.numero_referencia || p.numeroReferencia || '').toLowerCase().includes(q) ||
        (p.medio_pago || p.medioPago || '').toLowerCase().includes(q) ||
        (p.mes || '').toLowerCase().includes(q)
      );
    }

    if (!filtrados.length) {
      return `
        <tr>
          <td colspan="8" class="text-center py-12">
            <div class="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p class="text-xs font-bold text-ink">No se encontraron pagos con los filtros seleccionados</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Prueba ajustando el mes, la cohorte o limpiando los filtros.</p>
          </td>
        </tr>
      `;
    }

    const limite = 10;
    const mostrarTodos = Boolean(pagosState.mostrarTodosEst);
    const listaRender = (mostrarTodos || filtrados.length <= limite) ? filtrados : filtrados.slice(0, limite);

    let htmlFilas = listaRender.map(p => {
      const id = p.id;
      const fecha = fmtDate(p.fecha_pago || p.fechaPago);
      const estNombre = escapeHtml(p.estudiante_nombre || p.estudianteNombre || 'Estudiante');
      const cohorte = escapeHtml(p.cohorte || 'Sin cohorte');
      const concepto = escapeHtml(p.concepto || 'Mensualidad');
      const mes = escapeHtml(p.mes || '—');
      const monto = Number(p.monto || 0);
      const medio = escapeHtml(p.medio_pago || p.medioPago || '—');
      const ref = escapeHtml(p.numero_referencia || p.numeroReferencia || '');
      const tieneComp = Boolean(p.comprobante_url || p.comprobanteUrl);

      return `
        <tr class="hover:bg-purple-50/20 transition">
          <td class="py-3.5 px-4 font-semibold text-ink whitespace-nowrap">${fecha}</td>
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                ${estNombre.charAt(0).toUpperCase()}
              </div>
              <span class="font-bold text-ink truncate max-w-[150px] sm:max-w-[200px]" title="${estNombre}">${estNombre}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${cohorte}</span>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <span class="font-bold text-ink">${concepto}</span>
            <span class="text-[10px] text-slate-400 font-mono ml-1">(${mes})</span>
          </td>
          <td class="py-3.5 px-4 font-black text-purple-800 whitespace-nowrap">$ ${monto.toLocaleString('es-CO')} <span class="text-[10px] font-semibold text-slate-400">COP</span></td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <p class="font-medium text-ink">${medio}</p>
            ${ref ? `<p class="text-[10px] text-slate-400 font-mono">${ref}</p>` : ''}
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            ${tieneComp ? `
              <div class="inline-flex items-center gap-1.5">
                <button type="button" onclick="verComprobantePagoEstudiante('${id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Ver captura o comprobante">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Ver
                </button>
                <button type="button" onclick="descargarComprobanteDirecto('${id}', 'estudiante')" class="p-1 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer" title="Descargar comprobante">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </button>
              </div>
            ` : `
              <button type="button" onclick="abrirFormPagoEstudiante('${p.estudiante_id || p.estudianteId}', '${id}', true)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]" title="Adjuntar soporte o captura para este pago">
                <svg class="w-3.5 h-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Adjuntar captura</span>
              </button>
            `}
          </td>
          <td class="py-3.5 px-4 text-right whitespace-nowrap">
            <button type="button" onclick="abrirFormPagoEstudiante(null, '${id}')" class="text-xs font-bold text-purple-700 hover:underline mr-2.5 cursor-pointer">Editar</button>
            <button type="button" onclick="eliminarPagoEstudiante('${id}')" class="text-xs font-bold text-red-600 hover:underline cursor-pointer">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');

    if (filtrados.length > limite) {
      htmlFilas += `
        <tr class="bg-purple-50/40 border-t border-purple-100">
          <td colspan="8" class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-3 text-xs">
              <span class="text-slate-500 font-medium">Mostrando ${listaRender.length} de ${filtrados.length} pagos de estudiantes</span>
              <button type="button" onclick="toggleMostrarTodosPagosEst()" class="font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 transition cursor-pointer shadow-2xs">
                ${mostrarTodos ? 'Mostrar solo 10' : `Ver los ${filtrados.length - limite} restantes (Ver todos)`}
              </button>
            </div>
          </td>
        </tr>`;
    }

    return htmlFilas;
  }

  function renderTarjetasDocentesPagos(docentes, pagosDocentes) {
    let filtrados = docentes || [];
    if (pagosState.filtroCohorteDoc) {
      filtrados = filtrados.filter(d => (d.cohorte || '').toLowerCase() === pagosState.filtroCohorteDoc.toLowerCase());
    }
    if (pagosState.busquedaDoc) {
      const q = pagosState.busquedaDoc.toLowerCase().trim();
      filtrados = filtrados.filter(d => 
        (d.nombre || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.cohorte || '').toLowerCase().includes(q)
      );
    }

    if (!filtrados.length) {
      return `
        <div class="col-span-full admin-panel-card p-10 text-center text-slate-400">
          <div class="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <p class="text-xs font-bold text-ink">No se encontraron profesores</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Verifica los filtros aplicados o registra docentes en el módulo de Usuarios.</p>
        </div>
      `;
    }

    return filtrados.map(d => {
      const tarifa = Number(d.tarifaHora || d.tarifa_hora || 0);
      const pagosDelDocente = (pagosDocentes || []).filter(p => String(p.docenteId || p.docente_id) === String(d.id));
      const totalPagado = pagosDelDocente.reduce((acc, p) => acc + Number(p.totalPagado || p.total_pagado || 0), 0);
      const tieneBanco = Boolean(d.banco && (d.numeroCuenta || d.numero_cuenta));

      return `
        <div class="admin-panel-card p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white flex items-center justify-center font-black text-sm shadow-sm">
                  ${(d.nombre || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 class="text-sm font-extrabold text-ink leading-snug">${escapeHtml(d.nombre || 'Docente')}</h4>
                  <p class="text-[11px] text-slate-400 truncate max-w-[160px]">${escapeHtml(d.email || '')}</p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tarifa > 0 ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
                ${tarifa > 0 ? `$ ${tarifa.toLocaleString('es-CO')} / h` : 'Sin tarifa'}
              </span>
            </div>

            <div class="space-y-2 py-3 border-y border-gray-100 text-xs">
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-[11px] font-semibold text-slate-400">Cohorte:</span>
                <span class="font-bold text-ink">${escapeHtml(d.cohorte || 'General')}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-[11px] font-semibold text-slate-400">Cuenta Bancaria:</span>
                <span class="font-bold text-ink">${tieneBanco ? `${escapeHtml(d.banco)} · ${escapeHtml(d.tipoCuenta || d.tipo_cuenta || 'Ahorros')}` : '<span class="text-amber-600 font-medium">Pendiente</span>'}</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-[11px] font-semibold text-slate-400">Total Liquidado:</span>
                <span class="font-extrabold text-emerald-700">$ ${totalPagado.toLocaleString('es-CO')} COP</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-[11px] font-semibold text-slate-400">Historial:</span>
                <span class="text-[11px] font-bold text-purple-700">${pagosDelDocente.length} liquidaciones</span>
              </div>
            </div>
          </div>

          <div class="pt-4 flex items-center gap-2">
            <button type="button" onclick="abrirModalPagosDocente('${d.id}')" class="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span>Ver Expediente & Liquidar</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  
  // =========================================================================
  // REGISTRO DE PAGOS POR COHORTE - TARJETAS DE ESTUDIANTES UNO A UNO
  // =========================================================================

  const tarjetasSoportesMap = {}; // Map of estId -> { nombre, tipo, url }

  async function abrirRegistroPagosEstudiantesCohorte(cohorteDefault = '') {
    if (!puedeGestionarPagosDocentes()) {
      toast('Acceso no autorizado.', 'err');
      return;
    }

    const modal = document.getElementById('modalRegistroPagosEstudiantesCohorte');
    if (!modal) return;

    const usuarios = await Store.list('usuarios');
    const estudiantes = usuarios.filter(u => u.rol === 'Estudiante' || u.rol === 'estudiante');

    const cohortesMap = {};
    estudiantes.forEach(e => {
      const c = e.cohorte || e.cohorteAnterior;
      if (c) {
        cohortesMap[c] = (cohortesMap[c] || 0) + 1;
      }
    });

    const select = document.getElementById('rpec_select_cohorte');
    const listaCohortes = Object.keys(cohortesMap).sort();
    if (!listaCohortes.length) {
      select.innerHTML = '<option value="">-- No hay cohortes registradas con estudiantes --</option>';
    } else {
      select.innerHTML = '<option value="">-- Selecciona una Cohorte --</option>' +
        listaCohortes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${cohortesMap[c]} estudiantes)</option>`).join('');
    }

    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    const defMes = document.getElementById('rpec_default_mes');
    if (defMes) defMes.value = mesActual;
    const defMonto = document.getElementById('rpec_default_monto');
    if (defMonto && !defMonto.value) defMonto.value = '1300000';
    const busq = document.getElementById('rpec_busqueda_estudiante');
    if (busq) busq.value = '';

    const cohorteASeleccionar = cohorteDefault || (listaCohortes.length ? listaCohortes[0] : '');
    if (cohorteASeleccionar && listaCohortes.includes(cohorteASeleccionar)) {
      select.value = cohorteASeleccionar;
    }

    modal.classList.remove('hidden');

    if (select.value) {
      await renderTarjetasEstudiantesCohorte(select.value);
    } else {
      const cont = document.getElementById('rpec_contenedor_cartas');
      if (cont) {
        cont.innerHTML = `
          <div class="text-center py-16 text-slate-400">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-60 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <p class="font-bold text-slate-600 text-sm">Selecciona una cohorte arriba para cargar las cartas de los estudiantes</p>
            <p class="text-xs text-slate-400 mt-1">Podrás registrar los pagos uno a uno sin necesidad de cerrar la ventana</p>
          </div>
        `;
      }
    }
  }

  function cerrarRegistroPagosEstudiantesCohorte() {
    const modal = document.getElementById('modalRegistroPagosEstudiantesCohorte');
    if (modal) modal.classList.add('hidden');
    if (document.getElementById('panel-pagos') && !document.getElementById('panel-pagos').classList.contains('hidden')) {
      renderPanelPagos();
    }
  }

  async function onCambioCohorteTarjetas(cohorte) {
    const busq = document.getElementById('rpec_busqueda_estudiante');
    if (busq) busq.value = '';
    await renderTarjetasEstudiantesCohorte(cohorte);
  }

  async function onCambioMesTarjetas() {
    const sel = document.getElementById('rpec_select_cohorte');
    if (sel && sel.value) {
      await renderTarjetasEstudiantesCohorte(sel.value);
    }
  }

  function aplicarValoresPorDefectoACartas() {
    const montoDef = (document.getElementById('rpec_default_monto')?.value || '').trim();
    const mesDef = document.getElementById('rpec_default_mes')?.value || '';
    if (!montoDef && !mesDef) {
      toast('Ingresa un monto o mes en la barra superior para autocompletar.', 'err');
      return;
    }
    const cards = document.querySelectorAll('.card-estudiante-pago');
    let modificados = 0;
    cards.forEach(card => {
      const inputMonto = card.querySelector('.input-tarjeta-monto');
      const inputMes = card.querySelector('.input-tarjeta-mes');
      if (inputMonto && (!inputMonto.value || inputMonto.value === '0') && montoDef) {
        inputMonto.value = montoDef;
        modificados++;
      }
      if (inputMes && !inputMes.value && mesDef) {
        inputMes.value = mesDef;
      }
    });
    toast(`Se autocompletaron los valores en las tarjetas pendientes (${modificados} actualizadas).`, 'ok');
  }

  function filtrarTarjetasEstudiantes(query) {
    const q = (query || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.card-estudiante-pago');
    cards.forEach(card => {
      const texto = (card.getAttribute('data-search') || '').toLowerCase();
      if (!q || texto.includes(q)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  function onSeleccionarSoporteTarjeta(estId, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('El comprobante no debe superar los 8 MB', 'err');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      tarjetasSoportesMap[estId] = {
        nombre: file.name,
        tipo: file.type,
        url: e.target.result
      };
      const badge = document.getElementById(`soporte_badge_${estId}`);
      if (badge) {
        badge.innerHTML = `<svg class="w-3 h-3 inline-block mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${escapeHtml(file.name.slice(0, 15))}...`;
        badge.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  async function renderTarjetasEstudiantesCohorte(cohorte) {
    const cont = document.getElementById('rpec_contenedor_cartas');
    if (!cont) return;

    if (!cohorte) {
      cont.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <p class="font-bold text-slate-600 text-sm">Selecciona una cohorte arriba para cargar las cartas</p>
        </div>
      `;
      document.getElementById('rpec_badge_contador').textContent = '0 / 0 registrados';
      return;
    }

    cont.innerHTML = `
      <div class="text-center py-16 text-purple-700">
        <svg class="w-8 h-8 mx-auto animate-spin mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <p class="text-xs font-bold">Cargando cartas de estudiantes para ${escapeHtml(cohorte)}...</p>
      </div>
    `;

    const [usuarios, pagos] = await Promise.all([
      Store.list('usuarios'),
      Store.list('pagos_estudiantes')
    ]);

    const estudiantes = usuarios.filter(u =>
      (u.rol === 'Estudiante' || u.rol === 'estudiante') &&
      (u.cohorte === cohorte || u.cohorteAnterior === cohorte)
    );

    if (!estudiantes.length) {
      cont.innerHTML = `
        <div class="text-center py-16 text-slate-400">
          <p class="font-bold text-slate-600 text-sm">No se encontraron estudiantes registrados en "${escapeHtml(cohorte)}"</p>
        </div>
      `;
      document.getElementById('rpec_badge_contador').textContent = '0 / 0 registrados';
      return;
    }

    const mesSeleccionado = document.getElementById('rpec_default_mes')?.value || new Date().toISOString().substring(0, 7);
    const montoDefault = document.getElementById('rpec_default_monto')?.value || '1300000';
    const hoy = new Date().toISOString().split('T')[0];

    let pagadosCount = 0;
    const cardsHtml = estudiantes.map(est => {
      const pagoExistente = pagos.find(p => p.estudiante_id === est.id && p.mes === mesSeleccionado);
      if (pagoExistente) pagadosCount++;

      const isPagado = !!pagoExistente;
      const montoVal = isPagado ? pagoExistente.monto : montoDefault;
      const fechaVal = isPagado ? (pagoExistente.fecha_pago || hoy) : hoy;
      const medioVal = isPagado ? (pagoExistente.medio_pago || 'Bancolombia') : 'Bancolombia';
      const conceptoVal = isPagado ? (pagoExistente.concepto || 'Mensualidad') : 'Mensualidad';
      const refVal = isPagado ? (pagoExistente.numero_referencia || '') : '';
      const tieneComprobante = isPagado && (pagoExistente.comprobante_url || pagoExistente.comprobanteUrl);

      const searchStr = `${est.nombre || ''} ${est.cedula || est.documento || ''} ${est.email || ''}`;

      return `
        <div class="card-estudiante-pago bg-white rounded-2xl border ${isPagado ? 'border-emerald-300 ring-2 ring-emerald-50 shadow-sm' : 'border-gray-200 hover:border-purple-300 shadow-2xs'} p-4 flex flex-col justify-between transition-all duration-200"
             id="card_est_${est.id}"
             data-est-id="${est.id}"
             data-search="${escapeHtml(searchStr)}">

          <div>
            <!-- Header de la Carta -->
            <div class="flex items-start justify-between gap-2.5 pb-3 border-b border-gray-100">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl ${isPagado ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'} flex items-center justify-center font-black text-sm shrink-0">
                  ${escapeHtml((est.nombre || 'E').slice(0, 2).toUpperCase())}
                </div>
                <div class="min-w-0">
                  <h4 class="font-extrabold text-xs text-ink truncate" title="${escapeHtml(est.nombre || 'Estudiante')}">
                    ${escapeHtml(est.nombre || 'Estudiante')}
                  </h4>
                  <p class="text-[11px] text-slate-500 truncate">
                    ${escapeHtml(est.documento || est.cedula || est.email || 'ID: ' + est.id)}
                  </p>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <span id="badge_status_${est.id}" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isPagado ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
                  ${isPagado 
                    ? '<svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>PAGADO</span>' 
                    : '<svg class="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>PENDIENTE</span>'}
                </span>
                ${tieneComprobante ? `
                  <button type="button" onclick="abrirVisorComprobanteDocente('${pagoExistente.id}', 'estudiante')" class="block text-[10px] text-purple-700 hover:underline font-bold mt-1">
                    Ver comprobante
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Formulario Inline de la Carta -->
            <div class="mt-3 space-y-2.5 text-xs">
              <input type="hidden" id="pago_id_${est.id}" value="${isPagado ? pagoExistente.id : ''}" />

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">Monto ($ COP)</label>
                  <input type="text" inputmode="numeric" id="monto_${est.id}" class="input-tarjeta-monto w-full rounded-xl border border-gray-300 p-2 text-xs font-bold text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none"
                         oninput="this.value=this.value.replace(/[^0-9]/g,'')" value="${escapeHtml(montoVal)}" placeholder="1300000" />
                </div>
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">Mes Cubierto</label>
                  <input type="month" id="mes_${est.id}" class="input-tarjeta-mes w-full rounded-xl border border-gray-300 p-2 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none"
                         value="${escapeHtml(mesSeleccionado)}" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">Fecha de Pago</label>
                  <input type="date" id="fecha_${est.id}" class="w-full rounded-xl border border-gray-300 p-2 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none"
                         value="${escapeHtml(fechaVal)}" />
                </div>
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">Medio de Pago</label>
                  <select id="medio_${est.id}" class="w-full rounded-xl border border-gray-300 p-2 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none font-medium">
                    <option value="Bancolombia" ${medioVal === 'Bancolombia' ? 'selected' : ''}>Bancolombia</option>
                    <option value="Nequi" ${medioVal === 'Nequi' ? 'selected' : ''}>Nequi</option>
                    <option value="Daviplata" ${medioVal === 'Daviplata' ? 'selected' : ''}>Daviplata</option>
                    <option value="Transferencia Bancaria" ${medioVal === 'Transferencia Bancaria' ? 'selected' : ''}>Transferencia</option>
                    <option value="Efectivo" ${medioVal === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                    <option value="PSE" ${medioVal === 'PSE' ? 'selected' : ''}>PSE</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">Concepto</label>
                  <select id="concepto_${est.id}" class="w-full rounded-xl border border-gray-300 p-2 text-xs text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none">
                    <option value="Mensualidad" ${conceptoVal === 'Mensualidad' ? 'selected' : ''}>Mensualidad</option>
                    <option value="Matrícula" ${conceptoVal === 'Matrícula' ? 'selected' : ''}>Matrícula</option>
                    <option value="Certificación" ${conceptoVal === 'Certificación' ? 'selected' : ''}>Certificación</option>
                    <option value="Cuota" ${conceptoVal === 'Cuota' ? 'selected' : ''}>Cuota</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-600 text-[11px] mb-0.5">N° Referencia</label>
                  <input type="text" id="ref_${est.id}" class="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono text-ink focus:ring-2 focus:ring-purple-400 focus:outline-none"
                         value="${escapeHtml(refVal)}" placeholder="REF-12345" />
                </div>
              </div>

              <!-- Adjuntar Captura / Comprobante -->
              <div class="pt-1">
                <div class="flex items-center justify-between gap-2">
                  <label class="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-100/60 text-purple-800 text-[11px] font-bold cursor-pointer transition">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    <span>Adjuntar captura</span>
                    <input type="file" accept="image/*,application/pdf" onchange="onSeleccionarSoporteTarjeta('${est.id}', this)" class="sr-only" />
                  </label>
                  <span id="soporte_badge_${est.id}" class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Botón de Guardado Inline -->
          <div class="mt-4 pt-3 border-t border-gray-100">
            <button type="button"
                    id="btn_guardar_${est.id}"
                    onclick="guardarPagoInlineTarjeta('${est.id}', '${escapeHtml(est.nombre || 'Estudiante')}', '${escapeHtml(cohorte)}')"
                    class="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white ${isPagado ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-700 hover:bg-purple-800'} shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span>${isPagado ? 'Actualizar Pago' : 'Guardar Pago'}</span>
            </button>
          </div>

        </div>
      `;
    }).join('');

    cont.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${cardsHtml}
      </div>
    `;

    document.getElementById('rpec_badge_contador').textContent = `${pagadosCount} / ${estudiantes.length} pagados`;
    const footerInfo = document.getElementById('rpec_footer_info');
    if (footerInfo) {
      footerInfo.textContent = `Cohorte: ${cohorte} | Total de alumnos: ${estudiantes.length} (${pagadosCount} con pago registrado este mes)`;
    }
  }

  async function guardarPagoInlineTarjeta(estId, estNombre, cohorte) {
    const card = document.getElementById(`card_est_${estId}`);
    const btn = document.getElementById(`btn_guardar_${estId}`);
    if (!card || !btn) return;

    const montoRaw = (document.getElementById(`monto_${estId}`)?.value || '').trim();
    if (!montoRaw || !/^\d+$/.test(montoRaw) || parseFloat(montoRaw) <= 0) {
      toast(`Por favor ingresa un monto válido para ${estNombre}`, 'err');
      return;
    }
    const monto = parseFloat(montoRaw);
    const mes = document.getElementById(`mes_${estId}`)?.value || '';
    if (!mes) {
      toast(`Selecciona el mes para ${estNombre}`, 'err');
      return;
    }
    const fecha = document.getElementById(`fecha_${estId}`)?.value || '';
    if (!fecha) {
      toast(`Selecciona la fecha para ${estNombre}`, 'err');
      return;
    }
    const medio = document.getElementById(`medio_${estId}`)?.value || 'Bancolombia';
    const concepto = document.getElementById(`concepto_${estId}`)?.value || 'Mensualidad';
    const ref = (document.getElementById(`ref_${estId}`)?.value || '').trim();
    const pagoIdExistente = document.getElementById(`pago_id_${estId}`)?.value || null;

    const soporte = tarjetasSoportesMap[estId] || null;

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="w-3.5 h-3.5 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Guardando...`;

    const payload = {
      id: pagoIdExistente || ('pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + estId),
      estudiante_id: estId,
      estudiante_nombre: estNombre,
      cohorte: cohorte,
      concepto: concepto,
      mes: mes,
      monto: monto,
      fecha_pago: fecha,
      medio_pago: medio,
      numero_referencia: ref,
      observaciones: '',
      estado: 'Aprobado',
      comprobante_nombre: soporte ? soporte.nombre : null,
      comprobante_tipo: soporte ? soporte.tipo : null,
      comprobante_url: soporte ? soporte.url : null
    };

    try {
      await apiFetch('pagos_estudiantes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      Store.invalidate('pagos_estudiantes');

      document.getElementById(`pago_id_${estId}`).value = payload.id;

      card.classList.remove('border-gray-200');
      card.classList.add('border-emerald-300', 'ring-2', 'ring-emerald-50');
      const badge = document.getElementById(`badge_status_${estId}`);
      if (badge) {
        badge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
        badge.innerHTML = '<svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>PAGADO</span>';
      }

      btn.className = 'w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer';
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>Guardado ($ ${monto.toLocaleString('es-CO')})</span>`;

      toast(`¡Pago de ${estNombre} registrado exitosamente!`, 'ok');

      const cards = document.querySelectorAll('.card-estudiante-pago');
      let pagados = 0;
      cards.forEach(c => {
        if (c.querySelector('[id^="badge_status_"]')?.textContent.includes('PAGADO')) pagados++;
      });
      document.getElementById('rpec_badge_contador').textContent = `${pagados} / ${cards.length} pagados`;

      // Ventana se mantiene abierta para seguir con el siguiente alumno
    } catch (err) {
      toast(`Error al guardar pago de ${estNombre}: ${err.message}`, 'err');
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }

  async function renderPanelPagos() {
    const mount = document.getElementById('mount-pagos');
    if (!mount) return;

    if (!puedeGestionarPagosDocentes()) {
      mount.innerHTML = `
        <div class="admin-panel-card p-10 text-center">
          <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h3 class="text-sm font-bold text-ink">Módulo Confidencial</h3>
          <p class="text-xs text-slate2 mt-1">Este módulo contiene información financiera reservada para Superadministradores y Coordinadores.</p>
        </div>`;
      return;
    }

    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <div class="w-8 h-8 border-3 border-morado border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;

    const [usuarios, pagosDocentes, pagosEstudiantes] = await Promise.all([
      Store.list('usuarios', { forceRefresh: true }),
      apiFetch('pagos_docentes').catch(() => []),
      apiFetch('pagos_estudiantes').catch(() => [])
    ]);

    const docentes = usuarios.filter(u => u.rol === 'Docente' || u.rol === 'docente');
    const estudiantes = usuarios.filter(u => u.rol === 'Estudiante' || u.rol === 'estudiante');

    window.__cachePagosEstudiantes = pagosEstudiantes || [];
    window.__cacheDocentesPagos = { docentes, pagosDocentes: pagosDocentes || [] };

    const totalDocentes = docentes.length;
    const totalEstudiantes = estudiantes.length;

    // Calcular KPIs
    const totalLiquidadoDocentes = (pagosDocentes || []).reduce((acc, p) => acc + (parseFloat(p.totalPagado || p.total_pagado || 0)), 0);

    // Meses únicos en pagos de estudiantes
    const mesesSet = new Set((pagosEstudiantes || []).map(p => p.mes).filter(Boolean));
    const hoyMes = new Date().toISOString().substring(0, 7);
    mesesSet.add(hoyMes);
    const mesesEstudiantes = Array.from(mesesSet).sort().reverse();

    // KPIs contextuales para estudiantes según filtros activos (cohorte / mes)
    const hayFiltroEstActivo = Boolean(pagosState.filtroCohorteEst || pagosState.filtroMesEst);
    const pagosEstKPI = (pagosEstudiantes || []).filter(p => {
      if (pagosState.filtroCohorteEst && (p.cohorte || '').toLowerCase() !== pagosState.filtroCohorteEst.toLowerCase()) return false;
      if (pagosState.filtroMesEst && (p.mes || '').toLowerCase() !== pagosState.filtroMesEst.toLowerCase()) return false;
      return true;
    });

    const totalRecaudadoEstudiantes = pagosEstKPI.reduce((acc, p) => acc + (parseFloat(p.monto || 0)), 0);
    const cantComprobantesEstudiantes = pagosEstKPI.length;
    const estudiantesConPagoIds = new Set(pagosEstKPI.map(p => p.estudiante_id || p.estudianteId));

    // Calcular tarifa promedio docentes
    const docentesConTarifa = docentes.filter(d => Number(d.tarifaHora || d.tarifa_hora || 0) > 0);
    const tarifaPromedio = docentesConTarifa.length ? Math.round(docentesConTarifa.reduce((acc, d) => acc + Number(d.tarifaHora || d.tarifa_hora), 0) / docentesConTarifa.length) : 0;

    // Cohortes únicas
    const cohortesDocentes = [...new Set(docentes.map(d => d.cohorte).filter(Boolean))].sort();
    const cohortesEstudiantes = [...new Set(estudiantes.map(e => e.cohorte || e.cohorteAnterior).filter(Boolean))].sort();

    const tabActiva = pagosState.tab || 'estudiantes';

    let html = `
      <div class="mb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </span>
              <h2 class="text-xl sm:text-2xl font-black text-ink">Gestión de Pagos y Finanzas</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">Confidencial</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Control integral de recaudos de estudiantes (matrículas/mensualidades) y liquidación de honorarios a profesores por horas.</p>
          </div>

          <!-- Selector de Pestañas Estudiantes vs Profesores -->
          <div class="flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200/80 shrink-0 self-start md:self-auto">
            <button type="button" onclick="cambiarTabPagos('estudiantes')" class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${tabActiva === 'estudiantes' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600 hover:text-ink'}">
              <span>Estudiantes</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${tabActiva === 'estudiantes' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-slate-600'}">${(pagosEstudiantes || []).length}</span>
            </button>
            <button type="button" onclick="cambiarTabPagos('profesores')" class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${tabActiva === 'profesores' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600 hover:text-ink'}">
              <span>Profesores</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${tabActiva === 'profesores' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-slate-600'}">${docentes.length}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    if (tabActiva === 'estudiantes') {
      html += `
        <!-- KPIs Estudiantes -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Recaudado</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">$ ${totalRecaudadoEstudiantes.toLocaleString('es-CO')} <span class="text-xs font-semibold text-slate-400">COP</span></p>
              <p class="text-[11px] text-emerald-600 font-semibold mt-0.5">${hayFiltroEstActivo ? 'Recaudo según filtros activos' : 'Recaudos totales registrados'}</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-morado flex items-center justify-center shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Comprobantes Registrados</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${cantComprobantesEstudiantes}</p>
              <p class="text-[11px] text-slate-500 font-medium mt-0.5">${hayFiltroEstActivo ? 'Comprobantes en el filtro seleccionado' : 'Con soporte documental adjunto'}</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estudiantes con Registro</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${estudiantesConPagoIds.size} <span class="text-xs font-semibold text-slate-400">/ ${totalEstudiantes}</span></p>
              <p class="text-[11px] text-indigo-600 font-semibold mt-0.5">${hayFiltroEstActivo ? 'Alumnos con registro en este filtro' : 'Alumnos con pagos activos'}</p>
            </div>
          </div>
        </div>

        <!-- Filtros y Botón de Acción -->
        <div class="admin-panel-card p-4 mb-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 flex-wrap">
              <div class="relative flex-1 min-w-[200px]">
                <input type="text" id="busquedaPagosEstudiante" value="${escapeHtml(pagosState.busquedaEst || '')}" oninput="onInputBusquedaPagosEst(this.value)" placeholder="Buscar por estudiante, concepto, referencia..." class="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <!-- Filtro por Mes -->
              <select id="filtroMesPagosEst" onchange="pagosState.filtroMesEst=this.value;renderPanelPagos();" class="rounded-xl border border-gray-200 py-2 px-3 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">Todos los meses</option>
                ${mesesEstudiantes.map(m => `<option value="${escapeHtml(m)}" ${pagosState.filtroMesEst === m ? 'selected' : ''}>${escapeHtml(formatearMesFiltro(m))}</option>`).join('')}
              </select>

              <!-- Filtro por Cohorte -->
              <select id="filtroCohortePagosEst" onchange="pagosState.filtroCohorteEst=this.value;renderPanelPagos();" class="rounded-xl border border-gray-200 py-2 px-3 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">Todas las cohortes</option>
                ${cohortesEstudiantes.map(c => `<option value="${escapeHtml(c)}" ${pagosState.filtroCohorteEst === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>

              ${(pagosState.filtroCohorteEst || pagosState.filtroMesEst || pagosState.busquedaEst) ? `
              <button type="button" onclick="limpiarFiltrosPagosEst()" class="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition cursor-pointer flex items-center gap-1 shadow-2xs" title="Limpiar filtros aplicados">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Limpiar</span>
              </button>` : ''}
            </div>

            <div class="flex items-center gap-2 flex-wrap shrink-0">
              <button type="button" onclick="abrirRegistroPagosEstudiantesCohorte()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:opacity-95 shadow-sm transition cursor-pointer" title="Registrar pagos viendo las cartas de todos los estudiantes uno a uno sin salir">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <span>+ Registrar por Cohorte (Tarjetas)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tabla de Pagos de Estudiantes -->
        <div class="admin-panel-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-gray-100 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th class="py-3.5 px-4">Fecha Pago</th>
                  <th class="py-3.5 px-4">Estudiante</th>
                  <th class="py-3.5 px-4">Cohorte</th>
                  <th class="py-3.5 px-4">Concepto / Mes</th>
                  <th class="py-3.5 px-4">Monto</th>
                  <th class="py-3.5 px-4">Medio & Ref</th>
                  <th class="py-3.5 px-4">Comprobante</th>
                  <th class="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody id="tablaPagosEstudiantesCuerpo" class="divide-y divide-gray-100">
                ${renderFilasPagosEstudiantes(pagosEstudiantes || [])}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      html += `
        <!-- KPIs Profesores -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v7"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Docentes en Nómina</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">${totalDocentes}</p>
              <p class="text-[11px] text-slate-500 font-medium mt-0.5">${docentesConTarifa.length} con tarifa / hora asignada</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-morado flex items-center justify-center shrink-0 font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tarifa Promedio por Hora</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">$ ${tarifaPromedio.toLocaleString('es-CO')} <span class="text-xs font-semibold text-slate-400">/ h</span></p>
              <p class="text-[11px] text-purple-700 font-semibold mt-0.5">Honorarios promedio calculados</p>
            </div>
          </div>
          <div class="admin-panel-card p-4 sm:p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Liquidado a Profesores</p>
              <p class="text-xl sm:text-2xl font-black text-ink mt-0.5">$ ${totalLiquidadoDocentes.toLocaleString('es-CO')} <span class="text-xs font-semibold text-slate-400">COP</span></p>
              <p class="text-[11px] text-emerald-600 font-semibold mt-0.5">${(pagosDocentes || []).length} pagos liquidados</p>
            </div>
          </div>
        </div>

        <!-- Filtros Profesores -->
        <div class="admin-panel-card p-4 mb-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 flex-wrap">
              <div class="relative flex-1 min-w-[200px]">
                <input type="text" id="busquedaPagosDocente" value="${escapeHtml(pagosState.busquedaDoc || '')}" oninput="onInputBusquedaPagosDoc(this.value)" placeholder="Buscar profesor por nombre, email..." class="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <select id="filtroCohortePagosDoc" onchange="pagosState.filtroCohorteDoc=this.value;renderPanelPagos();" class="rounded-xl border border-gray-200 py-2 px-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">Todas las cohortes</option>
                ${cohortesDocentes.map(c => `<option value="${escapeHtml(c)}" ${pagosState.filtroCohorteDoc === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Lista de Profesores -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="gridDocentesPagos">
          ${renderTarjetasDocentesPagos(docentes, pagosDocentes || [])}
        </div>
      `;
    }

    mount.innerHTML = html;
  }

  window.puedeGestionarPagosDocentes = puedeGestionarPagosDocentes;
  window.abrirModalPagosDocente = abrirModalPagosDocente;
  window.cerrarModalPagosDocente = cerrarModalPagosDocente;
  window.toggleEditarDatosBancarios = toggleEditarDatosBancarios;
  window.guardarDatosBancariosDocente = guardarDatosBancariosDocente;
  window.abrirFormNuevoPagoDocente = abrirFormNuevoPagoDocente;
  window.cerrarFormNuevoPagoDocente = cerrarFormNuevoPagoDocente;
  window.calcularTotalPagoDocente = calcularTotalPagoDocente;
  window.manejarComprobantePagoDocente = manejarComprobantePagoDocente;
  window.quitarComprobantePagoDocente = quitarComprobantePagoDocente;
  window.guardarNuevoPagoDocente = guardarNuevoPagoDocente;
  window.verComprobantePago = verComprobantePago;
  window.verComprobantePagoDocente = verComprobantePagoDocente;
  window.verComprobantePagoEstudiante = verComprobantePagoEstudiante;
  window.descargarComprobanteDirecto = descargarComprobanteDirecto;
  window.cerrarVisorComprobanteDocente = cerrarVisorComprobanteDocente;
  window.descargarComprobanteActual = descargarComprobanteActual;
  window.eliminarPagoDocente = eliminarPagoDocente;

  window.abrirFormPagoEstudiante = abrirFormPagoEstudiante;
  window.cerrarFormPagoEstudiante = cerrarFormPagoEstudiante;
  window.onSeleccionarEstudianteParaPago = onSeleccionarEstudianteParaPago;
  window.manejarComprobantePagoEstudiante = manejarComprobantePagoEstudiante;
  window.quitarComprobantePagoEstudiante = quitarComprobantePagoEstudiante;
  window.guardarNuevoPagoEstudiante = guardarNuevoPagoEstudiante;
  window.eliminarPagoEstudiante = eliminarPagoEstudiante;
  window.cambiarTabPagos = cambiarTabPagos;
  window.onInputBusquedaPagosEst = onInputBusquedaPagosEst;
  window.onInputBusquedaPagosDoc = onInputBusquedaPagosDoc;
  window.renderPanelPagos = renderPanelPagos;
  window.abrirModalPagosPorCohorte = abrirModalPagosPorCohorte;
  window.cerrarModalPagosPorCohorte = cerrarModalPagosPorCohorte;
  window.onCambioCohorteGenerarPagos = onCambioCohorteGenerarPagos;
  window.generarPagosParaCohorte = generarPagosParaCohorte;
  window.abrirRegistroPagosEstudiantesCohorte = abrirRegistroPagosEstudiantesCohorte;
  window.cerrarRegistroPagosEstudiantesCohorte = cerrarRegistroPagosEstudiantesCohorte;
  window.onCambioCohorteTarjetas = onCambioCohorteTarjetas;
  window.onCambioMesTarjetas = onCambioMesTarjetas;
  window.aplicarValoresPorDefectoACartas = aplicarValoresPorDefectoACartas;
  window.filtrarTarjetasEstudiantes = filtrarTarjetasEstudiantes;
  window.onSeleccionarSoporteTarjeta = onSeleccionarSoporteTarjeta;
  window.renderTarjetasEstudiantesCohorte = renderTarjetasEstudiantesCohorte;
  window.guardarPagoInlineTarjeta = guardarPagoInlineTarjeta;

})();
