// Mobile menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const iconOpen = document.getElementById('iconOpen');
  const iconClose = document.getElementById('iconClose');
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    iconOpen.classList.toggle('hidden');
    iconClose.classList.toggle('hidden');
  });
  document.querySelectorAll('#mobileMenu a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    });
  });

  // Active nav link on scroll
  const sections = ['inicio','nosotros','programa','impacto','calificaciones'];
  const navLinks = document.querySelectorAll('.nav-link');
  const onScroll = () => {
    let current = sections[0];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 100) current = id;
    }
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', onScroll);

  // Signature visual: growth constellation (100 -> 1000+)
  const colors = ['#1FC8C0', '#8B5CF6', '#F5A623', '#9A5B3F', '#EC4899', '#F0455C'];
  const container = document.getElementById('constellation');
  const NODE_COUNT = 140;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  const rand = seededRandom(42);

  for (let i = 0; i < NODE_COUNT; i++) {
    const node = document.createElement('div');
    // distribute with a slight center bias, avoiding the label chips at bottom
    const x = rand() * 92 + 2;
    const y = rand() * 90 + 3;
    const size = 4 + rand() * 10;
    const color = colors[Math.floor(rand() * colors.length)];
    const delay = rand() * 1.4;
    const opacity = 0.55 + rand() * 0.45;

    node.className = 'node' + (reduceMotion ? '' : ' drift');
    node.style.left = x + '%';
    node.style.top = y + '%';
    node.style.width = size + 'px';
    node.style.height = size + 'px';
    node.style.background = color;
    node.style.setProperty('--op', opacity);
    node.style.setProperty('--delay', delay + 's');
    node.style.setProperty('--dx', (rand() * 10 - 5) + 'px');
    node.style.setProperty('--dy', (rand() * 10 - 5) + 'px');
    node.style.animationDelay = delay + 's, ' + delay + 's';
    container.appendChild(node);
  }
  // ---------- Login inline (Calificaciones) — un solo formulario ----------
  // Ya no hay pestañas de perfil: el correo y la contraseña ingresados se
  // comparan automáticamente contra las 4 fuentes de credenciales posibles
  // (Superadmin, Administración, Docente, Estudiante) y se entra al panel
  // que corresponda según cuál coincida. Ver submitLogin().
  //
  // 1) Superadmin: una única cuenta con control total. Sus credenciales YA
  //    NO son fijas en el código — se guardan en Store('superadmin_credentials')
  //    y se pueden cambiar desde Configuración > Seguridad del Superadmin
  //    (ver guardarCredencialesSuperadmin()). SEED.superadmin_credentials
  //    define el correo/contraseña iniciales.
  // 2) Administración, Docentes y Estudiantes: cada usuario tiene su PROPIA
  //    contraseña (campo "password" en Store 'usuarios'), definida por el
  //    administrador al crear/editar el usuario. El login siempre es con
  //    su correo + esa contraseña individual (ver submitLogin()).

  let currentDocente = null;
  let currentEstudiante = null;
  let currentAdminRole = null; // 'superadmin' | 'administracion'

  /* =====================================================================
     SEGURIDAD DEL LOGIN — 3 capas
     1) Bloqueo temporal tras varios intentos fallidos (anti fuerza bruta).
     2) Cierre de sesión automático por inactividad (ver iniciarControlInactividad).
     3) Contraseñas con una fortaleza mínima al crearlas (ver validarFortalezaPassword,
        usado tanto en el modal de Usuarios como en Crear Cohorte + Administrador).
     ===================================================================== */

  function validarFortalezaPassword(pw) {
    return typeof pw === 'string' && pw.length >= 6 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
  }

  // ---- Capa 1: bloqueo por intentos fallidos ----
  const LOGIN_MAX_INTENTOS = 5;
  const LOGIN_BLOQUEO_MS = 60000; // 60 segundos
  let loginIntentosFallidos = 0;
  let loginBloqueadoHasta = 0;

  function segundosRestantesBloqueo() {
    return Math.max(0, Math.ceil((loginBloqueadoHasta - Date.now()) / 1000));
  }

  // ---- Mostrar/ocultar contraseña ----
  function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const mostrando = input.type === 'text';
    input.type = mostrando ? 'password' : 'text';
    const open = btnEl.querySelector('.pw-eye-open');
    const closed = btnEl.querySelector('.pw-eye-closed');
    if (open) open.classList.toggle('hidden', !mostrando);
    if (closed) closed.classList.toggle('hidden', mostrando);
  }

  function toggleLoginPasswordVisibility() {
    const input = document.getElementById('loginPassword');
    const mostrando = input.type === 'text';
    input.type = mostrando ? 'password' : 'text';
    document.getElementById('loginPwEyeOpen').classList.toggle('hidden', !mostrando);
    document.getElementById('loginPwEyeClosed').classList.toggle('hidden', mostrando);
  }

  // ---- Capa 2: cierre de sesión automático por inactividad ----
  const INACTIVIDAD_LIMITE_MS = 20 * 60 * 1000; // 20 minutos
  let inactividadTimer = null;

  function iniciarControlInactividad() {
    detenerControlInactividad();
    const reiniciar = () => {
      clearTimeout(inactividadTimer);
      inactividadTimer = setTimeout(cerrarSesionPorInactividad, INACTIVIDAD_LIMITE_MS);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, reiniciar));
    inactividadListeners = reiniciar;
    reiniciar();
  }
  let inactividadListeners = null;

  function detenerControlInactividad() {
    clearTimeout(inactividadTimer);
    if (inactividadListeners) {
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => document.removeEventListener(ev, inactividadListeners));
      inactividadListeners = null;
    }
  }

  function cerrarSesionPorInactividad() {
    if (currentAdminRole) logout();
    else if (currentDocente) logoutDocente();
    else if (currentEstudiante) logoutEstudiante();
    else return;
    toast('Tu sesión se cerró automáticamente por inactividad', 'info');
  }



  function submitLogin(event) {
    if (event && event.preventDefault) event.preventDefault();

    const errorEl = document.getElementById('loginError');

    if (Date.now() < loginBloqueadoHasta) {
      errorEl.textContent = 'Demasiados intentos fallidos. Espera ' + segundosRestantesBloqueo() + ' segundos antes de volver a intentar.';
      errorEl.classList.remove('hidden');
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) {
      errorEl.textContent = 'Completa tu correo y contraseña para continuar.';
      errorEl.classList.remove('hidden');
      return;
    }
    seedIfEmpty();

    const registrarExito = () => {
      loginIntentosFallidos = 0;
      loginBloqueadoHasta = 0;
      errorEl.classList.add('hidden');
      iniciarControlInactividad();
      window.scrollTo(0, 0);
    };

    // Sin pestañas de perfil: se prueba el correo/contraseña contra cada
    // fuente de credenciales, en este orden, y se entra al panel que
    // corresponda con la primera coincidencia.
    const cred = Store.get('superadmin_credentials') || SEED.superadmin_credentials;
    if (email.toLowerCase() === cred.email.toLowerCase() && password === cred.password) {
      currentAdminRole = 'superadmin';
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('dashboardView').classList.remove('hidden');
      applyAdminRoleUI();
      initAdmin();
      showPanel('resumen');
      registrarExito();
      return;
    }

    const coordinador = Store.list('usuarios').find(u =>
      u.rol === 'Coordinador' && u.email.toLowerCase() === email.toLowerCase());
    if (coordinador && password === coordinador.password) {
      currentAdminRole = 'administracion';
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('dashboardView').classList.remove('hidden');
      applyAdminRoleUI(coordinador);
      initAdmin();
      showPanel('resumen');
      registrarExito();
      return;
    }

    const docente = Store.list('usuarios').find(u =>
      u.rol === 'Docente' && u.email.toLowerCase() === email.toLowerCase());
    if (docente && password === docente.password) {
      currentDocente = docente;
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('teacherView').classList.remove('hidden');
      showPanelDocente('resumen');
      registrarExito();
      return;
    }

    const estudiante = Store.list('usuarios').find(u =>
      u.rol === 'Estudiante' && u.email.toLowerCase() === email.toLowerCase());
    if (estudiante && password === estudiante.password) {
      currentEstudiante = estudiante;
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('studentView').classList.remove('hidden');
      initEstudiante();
      showPanelEstudiante('resumen');
      registrarExito();
      return;
    }

    // ---- Intento fallido: cuenta para el bloqueo (Capa 1) ----
    loginIntentosFallidos++;
    if (loginIntentosFallidos >= LOGIN_MAX_INTENTOS) {
      loginBloqueadoHasta = Date.now() + LOGIN_BLOQUEO_MS;
      loginIntentosFallidos = 0;
      errorEl.textContent = 'Demasiados intentos fallidos. Espera ' + segundosRestantesBloqueo() + ' segundos antes de volver a intentar.';
    } else {
      const restantes = LOGIN_MAX_INTENTOS - loginIntentosFallidos;
      errorEl.textContent = 'Credenciales incorrectas. Verifica tu correo y contraseña. Te quedan ' + restantes + ' intento' + (restantes === 1 ? '' : 's') + ' antes de un bloqueo temporal.';
    }
    errorEl.classList.remove('hidden');
  }

  // Ajusta el panel administrativo según el perfil: Superadmin ve todo;
  // Administración (Coordinador) no gestiona cuentas de usuario ni la
  // configuración global de la plataforma.
  function applyAdminRoleUI(coordinador) {
    const isSuper = currentAdminRole === 'superadmin';
    const label = document.getElementById('adminPanelLabel');
    const eyebrow = document.getElementById('adminEyebrow');
    if (label) label.textContent = isSuper ? 'Panel Superadmin' : 'Panel Administración';
    if (eyebrow) eyebrow.textContent = isSuper ? 'Superadmin' : 'Administración';
    const bannerText = document.getElementById('adminBannerText');
    if (bannerText) {
      bannerText.textContent = isSuper
        ? 'Desde aquí administrarás usuarios, cohortes y calificaciones del Training de 100 a 1000+.'
        : 'Gestiona cohortes, calificaciones y el seguimiento académico del programa A+ Smart.';
    }
    document.querySelectorAll('.panel-tab[data-super-only="true"]').forEach(tab => {
      tab.classList.toggle('hidden', !isSuper);
    });
    // Superadmin ve un menú reducido (Resumen, Administradores, Usuarios,
    // Cohortes, Calificaciones, Configuración); Administración conserva el
    // menú completo (sin el apartado de Administradores).
    document.querySelectorAll('.panel-tab[data-admin-hide="true"]').forEach(tab => {
      tab.classList.toggle('hidden', isSuper);
      if (isSuper && tab.dataset.panel) {
        const panelEl = document.getElementById('panel-' + tab.dataset.panel);
        if (panelEl && !panelEl.classList.contains('hidden')) {
          showPanel('resumen');
        }
      }
    });
    document.querySelectorAll('[data-admin-hide-group="true"]').forEach(group => {
      group.classList.toggle('hidden', isSuper);
    });
    const restrictedNote = document.getElementById('adminRestrictedNote');
    if (restrictedNote) restrictedNote.classList.toggle('hidden', isSuper);
    const roleChip = document.getElementById('adminRoleChip');
    if (roleChip) roleChip.textContent = isSuper ? 'Superadmin' : 'Administración';
  }

  // Mini-estadísticas dentro del banner de bienvenida del panel admin.
  function renderAdminBannerStats() {
    const el = document.getElementById('adminBannerStats');
    if (!el) return;
    const usuarios = Store.list('usuarios');
    const modulos = Store.list('modulos');
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const stats = [
      { label: 'Usuarios', value: usuarios.length },
      { label: 'Cohortes en curso', value: enCurso },
      { label: 'Cohortes totales', value: modulos.length },
    ];
    el.innerHTML = stats.map(s => `
      <div class="superadmin-banner-stat px-4 py-2.5">
        <p class="text-[11px] font-semibold text-white/60 uppercase tracking-wide">${s.label}</p>
        <p class="text-lg font-extrabold text-white leading-tight mt-0.5">${s.value}</p>
      </div>`).join('');
  }

  function logout() {
    detenerControlInactividad();
    currentAdminRole = null;
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function logoutDocente() {
    detenerControlInactividad();
    currentDocente = null;
    document.getElementById('teacherView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function logoutEstudiante() {
    detenerControlInactividad();
    currentEstudiante = null;
    document.getElementById('studentView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  // ---------- Navegación del panel Docente ----------
  const PANEL_COLOR_DOCENTE = '#1FC8C0';
  function showPanelDocente(panel) {
    document.querySelectorAll('.panel-content-t').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'panel-t-' + panel);
    });
    document.querySelectorAll('.panel-tab-t').forEach(tab => {
      const isActive = tab.dataset.tpanel === panel;
      tab.classList.toggle('font-semibold', isActive);
      tab.style.borderLeftColor = isActive ? PANEL_COLOR_DOCENTE : 'transparent';
      tab.style.background = isActive ? PANEL_COLOR_DOCENTE + '0D' : '';
      tab.style.color = isActive ? '#14181F' : '#5B6472';
    });
    if (RENDERERS_DOCENTE[panel]) RENDERERS_DOCENTE[panel]();
  }

  // ---------- Navegación del panel Superadmin ----------
  const PANEL_COLOR = '#8B5CF6';
  function showPanel(panel) {
    document.querySelectorAll('.panel-content').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'panel-' + panel);
    });
    document.querySelectorAll('.panel-tab').forEach(tab => {
      const isActive = tab.dataset.panel === panel;
      tab.classList.toggle('superadmin-tab-active', isActive);
    });
    const banner = document.getElementById('superadminBanner');
    if (banner) banner.classList.toggle('hidden', panel !== 'resumen');
    if (panel === 'resumen') renderAdminBannerStats();
    if (RENDERERS[panel]) RENDERERS[panel]();
  }

  /* =====================================================================
     PANEL ADMINISTRATIVO — motor de datos y CRUD
     Persistencia: localStorage (namespace "aplus_admin_v1")
     ===================================================================== */

  const DB_PREFIX = 'aplus_admin_v1_';
  let ADMIN_BOOTED = false;

  // ---------- Capa de almacenamiento ----------
  const Store = {
    get(entity) {
      try {
        const raw = localStorage.getItem(DB_PREFIX + entity);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    set(entity, data) {
      try {
        localStorage.setItem(DB_PREFIX + entity, JSON.stringify(data));
        return true;
      } catch (e) { return false; }
    },
    list(entity) {
      return this.get(entity) || [];
    },
    save(entity, records) {
      this.set(entity, records);
    }
  };

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* =====================================================================
     HORARIO (antes "Módulos y cohortes") — franjas fijas + días de la semana.
     El administrador elige una Cohorte y un Mes; el sistema arma la grilla
     automáticamente para que la llene con Materia + Docente por celda.
     Persistencia: Store('horarios'), un registro por Cohorte + Mes.
     ===================================================================== */
  const BLOQUES_HORARIO = [
    { inicio: '08:00', fin: '09:50' },
    { inicio: '10:10', fin: '12:00' },
    { inicio: '12:00', fin: '13:00', almuerzo: true },
    { inicio: '13:10', fin: '15:00' },
    { inicio: '15:10', fin: '17:00' },
  ];
  const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function minutosDesdeHora(hhmm) {
    const [h, m] = (hhmm || '0:0').split(':').map(Number);
    return h * 60 + m;
  }
  function horasBloque(bloque) {
    return Math.round(((minutosDesdeHora(bloque.fin) - minutosDesdeHora(bloque.inicio)) / 60) * 100) / 100;
  }
  function celdaKey(dia, bloqueIdx) { return dia + '|' + bloqueIdx; }
  function mesLabel(mesValue) {
    if (!mesValue) return '';
    const [y, m] = mesValue.split('-').map(Number);
    return (MESES_ES[m - 1] || '') + ' ' + y;
  }
  // Genera opciones de mes: si la cohorte tiene fechaInicio/fechaFin válidas, cubre ese rango;
  // si no, ofrece un rango amplio alrededor del mes actual.
  function generarOpcionesMes(cohorte) {
    let start, end;
    const ini = cohorte && cohorte.fechaInicio ? new Date(cohorte.fechaInicio + 'T00:00:00') : null;
    const fin = cohorte && cohorte.fechaFin ? new Date(cohorte.fechaFin + 'T00:00:00') : null;
    if (ini && !isNaN(ini) && fin && !isNaN(fin)) {
      start = new Date(ini.getFullYear(), ini.getMonth(), 1);
      end = new Date(fin.getFullYear(), fin.getMonth(), 1);
    } else {
      const hoy = new Date();
      start = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      end = new Date(hoy.getFullYear(), hoy.getMonth() + 6, 1);
    }
    const opciones = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const value = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
      opciones.push({ value, label: mesLabel(value) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return opciones;
  }
  function getHorario(cohorteNombre, mes) {
    return Store.list('horarios').find(h => h.cohorte === cohorteNombre && h.mes === mes) || null;
  }

  // ---------- Datos semilla (solo se cargan la primera vez) ----------
  // La plataforma arranca EN BLANCO: no hay estudiantes, docentes ni
  // coordinadores/administradores de ejemplo. El ÚNICO acceso inicial es
  // el Superadmin (superadmin_credentials). Todo lo demás se crea desde
  // la plataforma (Usuarios, Cohortes, Pensum, etc.) una vez inicias sesión.
  const SEED = {
    // Credenciales del Superadmin: se guardan en el Store (editables desde
    // Configuración), ya no son una constante fija en el código.
    superadmin_credentials: { email: 'superadmin@aplus.org', password: 'Super2026#' },
    usuarios: [],
    modulos: [],
    pensum: [],
    memorandos: [],
    // PQR: cada solicitud se envía como archivo PDF (la enviaron Docente o
    // Estudiante). estado empieza en 'Pendiente' y pasa a 'Activo' de forma
    // automática la primera vez que el administrador abre/descarga el PDF
    // (ver descargarPqrAdmin). No se edita manualmente.
    pqr: [],
    reuniones: [],
    calificaciones: [],
    // "encuestas" (Encuestas de satisfacción) fue eliminado del sitio: ya no
    // existe en el panel Admin ni en el panel Estudiante.
    materiales: [],
    asistencia: [],
    insignias_estudiantes: [],
    agenda_estudiante: [],
    correos_estudiante: [],
    semaforo_overrides: {},
    configuracion: {
      nombre: 'Fundación A+',
      ciudad: 'Quibdó',
      direccion: '',
      correo: 'contacto@fundacionaplus.org',
      telefono: '+57 300 000 0000',
      cupoMaximo: 30,
      notasMinimaAprobacion: 3.0,
      asistenciaMinima: 80,
      notificacionesEmail: true,
      notificacionesIA: true,
      // Postulación pública: el Superadmin activa/desactiva el botón "Postular"
      // del sitio y define el link del cuestionario externo (Google Forms, etc.)
      // donde los interesados dejan sus datos.
      postulacionHabilitada: false,
      postulacionUrl: ''
    }
  };

  function seedIfEmpty() {
    Object.keys(SEED).forEach(key => {
      if (key === 'configuracion') {
        if (!Store.get('configuracion')) Store.set('configuracion', SEED.configuracion);
      } else if (key === 'semaforo_overrides') {
        if (!Store.get('semaforo_overrides')) Store.set('semaforo_overrides', {});
      } else {
        if (!Store.get(key)) Store.set(key, SEED[key]);
      }
    });
  }

  function resetDemoData() {
    // Antes solo se borraban las claves listadas explícitamente en SEED, lo
    // que dejaba residuos de módulos añadidos después (notas_modulos,
    // horarios, informes_docente, encuestas, agenda_docente, qr_tokens,
    // administradores, sesiones/asistencia de reuniones, etc.) y la
    // plataforma no quedaba realmente en blanco. Ahora se borra CUALQUIER
    // clave de localStorage que pertenezca a esta app (prefijo DB_PREFIX),
    // sin importar si está o no en SEED, y luego se vuelve a sembrar solo
    // lo mínimo (Superadmin + Configuración por defecto).
    Object.keys(localStorage)
      .filter(k => k.indexOf(DB_PREFIX) === 0)
      .forEach(k => localStorage.removeItem(k));
    seedIfEmpty();
    Object.keys(RENDERERS).forEach(p => RENDERERS[p]());
    toast('Plataforma reiniciada: todo en blanco, solo queda el Superadmin', 'ok');
  }

  // ---------- Toasts ----------
  function toast(msg, kind) {
    const wrap = document.getElementById('toastWrap');
    const el = document.createElement('div');
    const colors = { ok: '#1FC8C0', err: '#F0455C', info: '#8B5CF6' };
    const c = colors[kind] || colors.info;
    el.className = 'bg-ink text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-softLg flex items-center gap-2.5 opacity-0 translate-y-2 transition-all duration-300';
    el.innerHTML = `<span class="w-2 h-2 rounded-full shrink-0" style="background:${c}"></span><span>${escapeHtml(msg)}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => { el.classList.remove('opacity-0', 'translate-y-2'); });
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---------- Esquemas de formulario por entidad ----------
  const SCHEMAS = {
    usuarios: {
      label: 'Usuario', icon: 'Usuarios',
      fields: [
        { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
        // Contraseña de acceso: el usuario inicia sesión con su correo + esta
        // contraseña. Al editar, se puede dejar en blanco para conservar la
        // que ya tenía (ver manejo especial en saveModal).
        { key: 'password', label: 'Contraseña de acceso', type: 'password' },
        // Las opciones reales de "rol" se calculan en openModal() a partir de
        // rolesCreacionUsuario(): Estudiante/Docente para Administración, y
        // además Coordinador ("Administrador") si quien crea es el Superadmin.
        { key: 'rol', label: 'Rol', type: 'select', options: ['Estudiante', 'Docente', 'Coordinador', 'Administrador'], required: true },
        // Las opciones reales de "cohorte" se calculan en openModal() a partir de
        // las cohortes existentes (Store('modulos')) — ver bloque "select" más abajo.
        { key: 'cohorte', label: 'Cohorte', type: 'select', options: [] },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], default: 'Activo' },
      ]
    },
    modulos: {
      label: 'Cohorte', icon: 'Módulos',
      fields: [
        { key: 'nombre', label: 'Nombre de la cohorte', type: 'text', required: true },
        { key: 'modulo', label: 'Módulo del Training', type: 'text', required: true },
        // El docente ya NO se escribe aquí: se asigna desde el panel "Horario"
        // (celda por celda) y se calcula automáticamente para toda la app.
        { key: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
        { key: 'fechaFin', label: 'Fecha de finalización', type: 'date' },
        { key: 'cupos', label: 'Cupos totales', type: 'number', default: 25 },
        // "Inscritos" tampoco se escribe a mano: se cuenta solo a partir de
        // los estudiantes que realmente tienen esta cohorte asignada.
        { key: 'estado', label: 'Estado', type: 'select', options: ['Planeada', 'En curso', 'Finalizada'], default: 'Planeada' },
      ]
    },
    pensum: {
      label: 'Tema curricular', icon: 'Pensum',
      fields: [
        { key: 'modulo', label: 'Módulo', type: 'text', required: true },
        { key: 'tema', label: 'Tema / unidad', type: 'text', required: true },
        { key: 'horas', label: 'Horas', type: 'number', default: 8 },
        { key: 'docente', label: 'Docente responsable', type: 'select', options: [] },
        { key: 'orden', label: 'Orden dentro del módulo', type: 'number', default: 1 },
        // Archivo que el estudiante podrá ver/descargar desde su Pensum curricular.
        // Se maneja aparte en openModal()/saveModal() (lee el File y lo guarda como
        // data URL en archivoNombre/archivoTipo/archivoDatos del registro).
        { key: 'archivo', label: 'Archivo (PDF u otro documento)', type: 'file' },
      ]
    },
    memorandos: {
      label: 'Memorando', icon: 'Memorandos',
      fields: [
        { key: 'titulo', label: 'Asunto', type: 'text', required: true },
        // Opciones reales calculadas en openModal(): usuarios existentes (valor = su correo)
        // + grupos ('Todos', 'Todos los estudiantes', 'Todos los docentes').
        { key: 'destinatario', label: 'Destinatario', type: 'select', options: [], required: true },
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Borrador', 'Enviado'], default: 'Borrador' },
        { key: 'contenido', label: 'Contenido', type: 'textarea', required: true, rows: 14 },
      ]
    },
    // "pqr" ya no tiene schema de edición: el administrador no puede editar
    // ni crear PQR manualmente. Cada solicitud la sube como PDF el Docente
    // o el Estudiante (ver renderPqrDocente/renderPqrEstudiante) y su estado
    // ("Pendiente" -> "Activo") lo actualiza automáticamente el sistema
    // cuando el administrador descarga el PDF (ver descargarPqrAdmin).
    reuniones: {
      label: 'Reunión virtual', icon: 'Reuniones',
      fields: [
        { key: 'titulo', label: 'Título', type: 'text', required: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'hora', label: 'Hora', type: 'time' },
        { key: 'enlace', label: 'Enlace de la reunión', type: 'text' },
        { key: 'participantes', label: 'Participantes', type: 'text' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Programada', 'Realizada', 'Cancelada'], default: 'Programada' },
      ]
    },
    // "calendario" (Calendario institucional) fue eliminado del sitio: ya no
    // existe en el panel Admin ni en el panel Estudiante.
    encuestas: {
      label: 'Encuesta de satisfacción', icon: 'Encuestas',
      fields: [
        { key: 'titulo', label: 'Título de la encuesta', type: 'text', required: true },
        { key: 'fecha', label: 'Fecha de publicación', type: 'date', required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Abierta', 'Cerrada'], default: 'Abierta' },
        // "respuestas" y "promedio" NO son campos editables: se calculan solo
        // a partir de lo que respondan los estudiantes (ver renderEncuestas).
      ]
    },
    calificaciones: {
      label: 'Calificación', icon: 'Calificaciones',
      fields: [
        { key: 'estudiante', label: 'Estudiante', type: 'text', required: true },
        { key: 'modulo', label: 'Módulo', type: 'text', required: true },
        { key: 'nota', label: 'Nota (0.0 - 10.0)', type: 'number', step: '0.1', required: true },
        { key: 'fecha', label: 'Fecha', type: 'date' },
      ]
    },
    // "encuestas" (Encuestas de satisfacción) fue eliminado del sitio: ya no
    // existe en el panel Admin ni en el panel Estudiante.
  };

  // ---------- Estado del modal ----------
  let modalCtx = { entity: null, id: null };
  let deleteCtx = { entity: null, id: null };

  // Roles que se pueden asignar al CREAR/EDITAR un usuario desde el panel
  // genérico "Usuarios" (Estudiantes y Docentes). Los Administradores ya NO
  // se crean aquí: tienen su propio apartado exclusivo del Superadmin (ver
  // panel "Administradores" / renderAdministradores() / openModal(..., 'Coordinador')).
  function rolesCreacionUsuario() {
    return ['Estudiante', 'Docente'];
  }

  function openModal(entity, id, forcedRole) {
    const schema = SCHEMAS[entity];
    if (!schema) return;
    const record0 = id ? Store.list(entity).find(r => r.id === id) : null;

    // Solo el Superadmin puede editar cuentas de Administrador (Coordinador).
    if (entity === 'usuarios' && record0 && (record0.rol === 'Coordinador' || record0.rol === 'Administrador') && currentAdminRole !== 'superadmin') {
      toast('Solo el Superadmin puede editar una cuenta de Administrador', 'err');
      return;
    }

    modalCtx = { entity, id: id || null };
    const record = record0;

    document.getElementById('modalEyebrow').textContent = id ? 'Editar' : 'Crear nuevo';
    document.getElementById('modalTitle').textContent = forcedRole === 'Coordinador' ? 'Administrador' : schema.label;

    const form = document.getElementById('modalForm');
    form.innerHTML = schema.fields.map(f => {
      const val = record ? record[f.key] : (f.default !== undefined ? f.default : '');
      const idAttr = 'field_' + f.key;

      // Apartado exclusivo de Administradores: el rol ya viene fijo
      // (Coordinador) y no aplica cohorte, así que esos dos campos se
      // guardan como ocultos en vez de mostrarse en el formulario.
      if (entity === 'usuarios' && forcedRole && f.key === 'rol') {
        return `<input type="hidden" id="${idAttr}" value="${escapeHtml(forcedRole)}" />`;
      }
      if (entity === 'usuarios' && forcedRole === 'Coordinador' && f.key === 'cohorte') {
        return `<input type="hidden" id="${idAttr}" value="" />`;
      }

      if (f.type === 'select') {
        // El rol disponible depende de quién crea el usuario: ver rolesCreacionUsuario().
        let opciones = f.options;
        if (entity === 'usuarios' && f.key === 'rol') {
          opciones = rolesCreacionUsuario();
        } else if (entity === 'usuarios' && f.key === 'cohorte') {
          // Cohortes existentes, tomadas de las que ya armó el administrador (Store 'modulos').
          opciones = Store.list('modulos').map(m => m.nombre);
          if (val && !opciones.includes(val)) opciones = [val, ...opciones]; // conserva un valor legado que ya no exista
          opciones = ['', ...opciones]; // primera opción = sin asignar
        } else if (entity === 'pensum' && f.key === 'docente') {
          // Lista real de docentes (Store 'usuarios'), no texto libre — así el
          // nombre siempre coincide exactamente con su usuario y su perfil se
          // puede abrir con un clic desde el Pensum del estudiante.
          const docentesReales = Store.list('usuarios').filter(u => u.rol === 'Docente').map(u => u.nombre);
          if (val && !docentesReales.includes(val)) docentesReales.push(val); // conserva un valor legado que ya no exista
          opciones = ['', ...docentesReales];
        } else if (entity === 'memorandos' && f.key === 'destinatario') {
          // El valor guardado es el CORREO del usuario destinatario (o un grupo).
          // Así el panel del estudiante puede saber con certeza para quién es cada memorando.
          const usuarios = [...Store.list('usuarios')].sort((a, b) => a.nombre.localeCompare(b.nombre));
          opciones = [
            { value: '', label: 'Selecciona un destinatario…' },
            { value: 'Todos', label: '— Todos los usuarios —' },
            { value: 'Todos los estudiantes', label: '— Todos los estudiantes —' },
            { value: 'Todos los docentes', label: '— Todos los docentes —' },
            ...usuarios.map(u => ({ value: u.email, label: `${u.nombre} (${u.email}) · ${u.rol}` })),
          ];
        }
        // Normaliza a {value,label} para poder mezclar strings simples con pares dinámicos.
        opciones = opciones.map(o => (o && typeof o === 'object') ? o : { value: o, label: (o === '' ? 'Sin asignar' : o) });
        const opts = opciones.map(o => `<option value="${escapeHtml(o.value)}" ${val === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <select id="${idAttr}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30">${opts}</select></div>`;
      }
      if (f.type === 'textarea') {
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <textarea id="${idAttr}" rows="${f.rows || 3}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30">${escapeHtml(val)}</textarea></div>`;
      }
      if (f.type === 'file') {
        const actual = record && record.archivoNombre
          ? `<p class="text-xs text-slate2 mt-1.5">Archivo actual: <span class="font-semibold text-ink">${escapeHtml(record.archivoNombre)}</span> — sube uno nuevo para reemplazarlo, o deja el campo vacío para conservarlo.</p>`
          : '';
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <input id="${idAttr}" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30" />
          ${actual}</div>`;
      }
      const step = f.step ? `step="${f.step}"` : '';
      if (f.type === 'password') {
        const ayudaPassword = (entity === 'usuarios' && f.key === 'password')
          ? (record ? 'Déjala en blanco para conservar la contraseña actual. ' : '') + 'Mínimo 6 caracteres, con al menos una letra y un número.'
          : '';
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <div class="relative">
            <input id="${idAttr}" type="password" value="" autocomplete="new-password" class="w-full rounded-xl border border-gray-200 pl-3.5 pr-11 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30" />
            <button type="button" onclick="togglePasswordVisibility('${idAttr}', this)" aria-label="Mostrar u ocultar contraseña" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate2 hover:text-ink transition">
              <svg class="pw-eye-open w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <svg class="pw-eye-closed w-4.5 h-4.5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.5a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
            </button>
          </div>
          ${ayudaPassword ? `<p class="text-xs text-slate2 mt-1.5">${ayudaPassword}</p>` : ''}</div>`;
      }
      return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
        <input id="${idAttr}" type="${f.type}" ${step} value="${escapeHtml(val)}" autocomplete="new-password" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30" /></div>`;
    }).join('');

    // ---- Usuarios: si el registro YA existe y es Docente, permitir asignar
    //      materias y horas (tomadas del pensum creado a partir del calendario
    //      de cohortes que ya armó el administrador). Solo aplica al EDITAR,
    //      nunca al crear, porque primero hay que guardar al docente. ----
    if (entity === 'usuarios') {
      const materiasWrap = document.createElement('div');
      materiasWrap.id = 'materiasAsignadasContainer';
      form.appendChild(materiasWrap);

      const rolSelect = document.getElementById('field_rol');
      const refrescarSeccionMaterias = () => {
        materiasWrap.innerHTML = (id && rolSelect.value === 'Docente') ? renderMateriasAssignSection(record) : '';
      };
      rolSelect.addEventListener('change', refrescarSeccionMaterias);
      refrescarSeccionMaterias();
    }

    // ---- Cohortes: mostrar (solo lectura) el docente y los cupos reales,
    //      calculados automáticamente — ver contarInscritos()/docentesDeCohorte(). ----
    if (entity === 'modulos' && id) {
      const docentesAsignados = docentesDeCohorte(record.nombre);
      const inscritosReales = contarInscritos(record.nombre);
      const info = document.createElement('div');
      info.className = 'rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-slate2 space-y-1';
      info.innerHTML = `
        <p><span class="font-semibold text-ink">Docente(s) asignado(s):</span> ${docentesAsignados.length ? escapeHtml(docentesAsignados.join(', ')) : 'Sin asignar — ve al panel "Horario" y escribe el nombre del docente en la celda correspondiente'}</p>
        <p><span class="font-semibold text-ink">Estudiantes matriculados:</span> ${inscritosReales} de ${record.cupos || 0} cupos ${inscritosReales >= (record.cupos || 0) && record.cupos ? '<span class="text-coral font-semibold">· Cupos llenos</span>' : ''}</p>`;
      form.appendChild(info);
    }

    document.getElementById('adminModal').classList.remove('hidden');
  }

  // Devuelve, para un Docente, todas las franjas del Horario donde aparece
  // asignado (en cualquier cohorte/mes), ordenadas de más reciente a más
  // antiguo y por día/hora dentro de cada mes.
  function getSlotsDocente(nombreDocente) {
    if (!nombreDocente) return [];
    const registros = Store.list('horarios');
    const slots = [];
    registros.forEach(h => {
      const celdas = h.celdas || {};
      Object.keys(celdas).forEach(key => {
        const c = celdas[key];
        if (c && c.docente === nombreDocente) {
          const [dia, bloqueIdxStr] = key.split('|');
          const bloque = BLOQUES_HORARIO[Number(bloqueIdxStr)];
          if (!bloque) return;
          slots.push({ cohorte: h.cohorte, mes: h.mes, dia, inicio: bloque.inicio, fin: bloque.fin, horas: horasBloque(bloque), materia: c.materia || '(sin materia)' });
        }
      });
    });
    slots.sort((a, b) => (b.mes || '').localeCompare(a.mes || '') || (DIAS_HORARIO.indexOf(a.dia) - DIAS_HORARIO.indexOf(b.dia)) || a.inicio.localeCompare(b.inicio));
    return slots;
  }

  // Número REAL de estudiantes matriculados en una cohorte: se cuenta a
  // partir de los usuarios con rol Estudiante cuyo campo "cohorte" apunta
  // a esta cohorte. Ya NO es un número que el administrador escribe a mano
  // (evita que quede desincronizado de la matrícula real).
  function contarInscritos(nombreCohorte) {
    if (!nombreCohorte) return 0;
    return Store.list('usuarios').filter(u => u.rol === 'Estudiante' && u.cohorte === nombreCohorte).length;
  }

  // Docente(s) que aparecen asignados a una cohorte, calculado a partir del
  // Horario (única fuente de verdad). Puede haber más de uno si distintas
  // materias/franjas de la misma cohorte las dicta gente distinta.
  function docentesDeCohorte(nombreCohorte) {
    const nombres = new Set();
    Store.list('horarios').filter(h => h.cohorte === nombreCohorte).forEach(h => {
      Object.values(h.celdas || {}).forEach(c => { if (c && c.docente) nombres.add(c.docente); });
    });
    return [...nombres];
  }

  // Construye la sección "Materias y horas asignadas" para un Docente.
  // Es de SOLO LECTURA a propósito: la única forma de asignarle (o quitarle)
  // una materia y sus horas es entrando al panel "Horario" y escribiendo su
  // nombre en la celda correspondiente. Así nunca queda una materia asignada
  // que no exista en el horario real.
  function renderMateriasAssignSection(userRecord) {
    const nombreDocente = userRecord ? userRecord.nombre : null;
    const slots = getSlotsDocente(nombreDocente);
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);

    const filasHtml = slots.length ? slots.map(s => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-2 px-3 text-xs text-ink font-semibold">${escapeHtml(s.materia)}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(s.cohorte)}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(mesLabel(s.mes))}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(s.dia)}</td>
        <td class="py-2 px-3 text-xs text-slate2 whitespace-nowrap">${s.inicio}–${s.fin}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="text-xs text-slate2 text-center py-4">Este docente aún no aparece en ninguna franja del Horario.</td></tr>`;

    return `<div class="pt-4 mt-2 border-t border-gray-100">
      <p class="text-sm font-bold text-ink mb-1">Materias y horas asignadas</p>
      <p class="text-xs text-slate2 mb-3">Solo lectura: se calcula a partir del panel <span class="font-semibold text-ink">Horario</span>. Para asignar o quitar una materia a este docente, ve a Horario y escribe (o borra) su nombre en la celda correspondiente — no es posible asignarle una materia que no exista en el horario.</p>
      <div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="w-full">
          <thead><tr class="text-left text-[10px] font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
            <th class="py-2 px-3">Materia</th><th class="py-2 px-3">Cohorte</th><th class="py-2 px-3">Mes</th><th class="py-2 px-3">Día</th><th class="py-2 px-3">Horario</th>
          </tr></thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </div>
      ${slots.length ? `<p class="text-xs text-slate2 mt-2">Total: <span class="font-bold text-ink">${totalHoras} h</span> por semana en ${slots.length} franja${slots.length === 1 ? '' : 's'}.</p>` : ''}
    </div>`;
  }

  function closeModal() {
    document.getElementById('adminModal').classList.add('hidden');
    modalCtx = { entity: null, id: null };
  }

  // Convierte un File (input type="file") a data URL, para poder guardarlo
  // en localStorage sin backend de archivos.
  function leerArchivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function saveModal() {
    const { entity, id } = modalCtx;
    const schema = SCHEMAS[entity];
    if (!schema) return;

    const data = {};
    for (const f of schema.fields) {
      const el = document.getElementById('field_' + f.key);

      if (f.type === 'file') {
        const nuevoArchivo = el.files && el.files[0];
        if (nuevoArchivo) {
          if (nuevoArchivo.size > 8 * 1024 * 1024) {
            toast('El archivo no puede superar 8 MB', 'err');
            return;
          }
          try {
            data.archivoNombre = nuevoArchivo.name;
            data.archivoTipo = nuevoArchivo.type || 'application/octet-stream';
            data.archivoDatos = await leerArchivoComoDataURL(nuevoArchivo);
          } catch (e) {
            toast('No se pudo leer el archivo', 'err');
            return;
          }
        } else if (id) {
          // Edición sin subir un archivo nuevo: conserva el que ya existía.
          const previo = Store.list(entity).find(r => r.id === id) || {};
          if (previo.archivoNombre) {
            data.archivoNombre = previo.archivoNombre;
            data.archivoTipo = previo.archivoTipo;
            data.archivoDatos = previo.archivoDatos;
          }
        }
        continue;
      }

      if (f.key === 'password' && entity === 'usuarios') {
        const v = el.value;
        if (v === '') {
          if (!id) {
            el.classList.add('ring-2', 'ring-coral');
            el.focus();
            toast('Completa el campo "' + f.label + '"', 'err');
            return;
          }
          // Editando y se dejó en blanco: conserva la contraseña que ya tenía.
          const previo = Store.list(entity).find(r => r.id === id) || {};
          data.password = previo.password || '';
        } else {
          if (!validarFortalezaPassword(v)) {
            el.classList.add('ring-2', 'ring-coral');
            el.focus();
            toast('La contraseña debe tener mínimo 6 caracteres, con al menos una letra y un número', 'err');
            return;
          }
          data.password = v;
        }
        continue;
      }

      let v = el.value;
      if (f.type === 'number') v = v === '' ? 0 : parseFloat(v);
      if (f.required && (v === '' || v === null || v === undefined)) {
        el.classList.add('ring-2', 'ring-coral');
        el.focus();
        toast('Completa el campo "' + f.label + '"', 'err');
        return;
      }
      data[f.key] = v;
    }

    // ---- Usuarios: el correo es único (es el usuario de login) ----
    if (entity === 'usuarios' && data.email) {
      const emailDuplicado = Store.list('usuarios').some(u => u.id !== id && u.email.toLowerCase() === data.email.toLowerCase());
      if (emailDuplicado) {
        toast('Ya existe otro usuario con el correo "' + data.email + '"', 'err');
        return;
      }
    }

    // ---- Usuarios: no permitir matricular un estudiante en una cohorte sin cupos ----
    // Se cuentan los inscritos reales (contarInscritos) contra el total de cupos de
    // la cohorte. Si el estudiante ya pertenecía a esa misma cohorte, no se bloquea
    // (no está ocupando un cupo nuevo, solo se está editando su registro).
    if (entity === 'usuarios' && data.rol === 'Estudiante' && data.cohorte) {
      const cohorteObj = Store.list('modulos').find(m => m.nombre === data.cohorte);
      if (cohorteObj) {
        const registroPrevio = id ? Store.list('usuarios').find(r => r.id === id) : null;
        const yaEstabaEnEstaCohorte = registroPrevio && registroPrevio.cohorte === data.cohorte;
        const inscritosActuales = contarInscritos(data.cohorte);
        if (!yaEstabaEnEstaCohorte && cohorteObj.cupos && inscritosActuales >= cohorteObj.cupos) {
          toast('La cohorte "' + data.cohorte + '" ya no tiene cupos disponibles (' + inscritosActuales + '/' + cohorteObj.cupos + ')', 'err');
          return;
        }
      }
    }

    // ---- Usuarios: mantener el Horario consistente con el nombre/rol del Docente ----
    // El Horario es la ÚNICA fuente para asignar materias a un docente (ver
    // renderMateriasAssignSection), así que aquí solo se hace mantenimiento:
    // si le cambian el nombre, se renombra en sus celdas; si deja de ser
    // Docente, se liberan las celdas donde aparecía.
    let horariosChanged = false;
    if (entity === 'usuarios' && id) {
      const previousRecord = Store.list('usuarios').find(r => r.id === id);
      const previousNombre = previousRecord ? previousRecord.nombre : null;
      const dejaDeSerDocente = previousRecord && previousRecord.rol === 'Docente' && data.rol !== 'Docente';
      const cambioNombre = previousRecord && previousNombre && previousNombre !== data.nombre;

      if (previousRecord && previousRecord.rol === 'Docente' && (dejaDeSerDocente || cambioNombre)) {
        const registrosHorario = Store.list('horarios');
        registrosHorario.forEach(h => {
          Object.keys(h.celdas || {}).forEach(key => {
            const c = h.celdas[key];
            if (c && c.docente === previousNombre) {
              c.docente = dejaDeSerDocente ? '' : data.nombre;
              horariosChanged = true;
            }
          });
        });
        if (horariosChanged) Store.save('horarios', registrosHorario);
      }
    }

    const records = Store.list(entity);
    if (id) {
      const idx = records.findIndex(r => r.id === id);
      if (idx > -1) records[idx] = { ...records[idx], ...data };
      toast(schema.label + ' actualizado correctamente', 'ok');
    } else {
      data.id = uid(entity.slice(0, 2));
      records.unshift(data);
      toast(schema.label + ' creado correctamente', 'ok');
    }
    Store.save(entity, records);
    closeModal();
    if (RENDERERS[entity]) RENDERERS[entity]();
    if (horariosChanged && RENDERERS['modulos']) RENDERERS['modulos']();
    if (RENDERERS['resumen']) RENDERERS['resumen']();
  }

  function askDelete(entity, id) {
    if (entity === 'usuarios') {
      const record = Store.list('usuarios').find(r => r.id === id);
      if (record && (record.rol === 'Coordinador' || record.rol === 'Administrador') && currentAdminRole !== 'superadmin') {
        toast('Solo el Superadmin puede eliminar una cuenta de Administrador', 'err');
        return;
      }
    }
    deleteCtx = { entity, id };
    document.getElementById('confirmModal').classList.remove('hidden');
  }
  function closeConfirm() {
    document.getElementById('confirmModal').classList.add('hidden');
    deleteCtx = { entity: null, id: null };
  }
  function confirmDelete() {
    const { entity, id } = deleteCtx;
    if (!entity || !id) return closeConfirm();
    const records = Store.list(entity).filter(r => r.id !== id);
    Store.save(entity, records);
    closeConfirm();
    if (RENDERERS[entity]) RENDERERS[entity]();
    if (RENDERERS['resumen']) RENDERERS['resumen']();
    toast('Registro eliminado', 'ok');
  }

  /* =====================================================================
     MÓDULO: Cohortes + Administrador exclusivo (aislamiento multi-tenant)
     ---------------------------------------------------------------------
     - Cada Cohorte se guarda en Store('modulos') junto a un 'cohorteId'.
     - Cada Administrador Normal se guarda en Store('administradores') con
       ESE MISMO 'cohorteId'. Esa es la única llave de enlace entre ambos.
     - Cuando un Administrador Normal "inicia sesión" (real o simulada),
       toda consulta de datos se filtra por su cohorteId: nunca ve nada
       de otra cohorte.
     - El Superadmin no filtra nada: siempre ve el listado completo.
     ===================================================================== */

  // ---------- Aislamiento de datos por cohorte ----------
  // Nota: el filtrado real por cohorteId para un Administrador que inicia
  // sesión de verdad se aplica en cada panel (Usuarios, Calificaciones,
  // etc.) a partir de `Store.list('administradores')`. El simulador de
  // roles usado durante el desarrollo (que generaba alumnos de prueba)
  // fue retirado: ya no hace falta y no debe crear datos ficticios.

  /**
   * Crea una Cohorte y, en el mismo flujo, registra el Administrador
   * exclusivo para esa cohorte. Inserta ambos registros en sus arrays
   * (Store 'modulos' y Store 'administradores') enlazados por un mismo
   * 'cohorteId' recién generado.
   *
   * @param {string} nombreCohorte - Nombre visible de la cohorte
   * @param {{nombre:string, email:string, password:string}} datosAdmin
   * @returns {{cohorte:object, admin:object}|null} null si hay error de validación
   */
  function crearCohorteConAdmin(nombreCohorte, datosAdmin) {
    nombreCohorte = (nombreCohorte || '').trim();
    const nombreAdmin = ((datosAdmin && datosAdmin.nombre) || '').trim();
    const emailAdmin = ((datosAdmin && datosAdmin.email) || '').trim().toLowerCase();
    const passwordAdmin = ((datosAdmin && datosAdmin.password) || '').trim();

    // ---- Validaciones básicas ----
    if (!nombreCohorte) { toast('El nombre de la cohorte es obligatorio', 'err'); return null; }
    if (!nombreAdmin || !emailAdmin || !passwordAdmin) { toast('Completa nombre, correo y contraseña del administrador', 'err'); return null; }
    if (!validarFortalezaPassword(passwordAdmin)) { toast('La contraseña debe tener mínimo 6 caracteres, con al menos una letra y un número', 'err'); return null; }

    const admins = Store.list('administradores');
    if (admins.some(a => a.email === emailAdmin)) {
      toast('Ya existe un administrador registrado con ese correo', 'err');
      return null;
    }

    // ---- 1) cohorteId: la llave que enlaza cohorte <-> administrador ----
    const cohorteId = uid('cohorte');

    // ---- 2) Insertar la Cohorte (reutiliza el mismo entity 'modulos' que ya usa el panel "Cohortes") ----
    const nuevaCohorte = {
      id: cohorteId,
      cohorteId: cohorteId, // se repite a propósito: deja el enlace explícito y fácil de leer
      nombre: nombreCohorte,
      modulo: 'Sin asignar',
      // docente e inscritos ya no se guardan a mano: se calculan siempre
      // desde el Horario (docentesDeCohorte) y la matrícula real (contarInscritos).
      fechaInicio: '', fechaFin: '',
      cupos: 25,
      estado: 'Planeada',
    };
    const cohortesActuales = Store.list('modulos');
    cohortesActuales.unshift(nuevaCohorte);
    Store.save('modulos', cohortesActuales);

    // ---- 3) Insertar el Administrador, enlazado por el MISMO cohorteId ----
    const nuevoAdmin = {
      id: uid('adm'),
      cohorteId: cohorteId, // <-- CLAVE DE AISLAMIENTO DE DATOS
      nombre: nombreAdmin,
      email: emailAdmin,
      password: passwordAdmin, // Nota: en un backend real esto se guarda hasheado, nunca en texto plano
      rol: 'Administrador',
      estado: 'Activo',
    };
    admins.unshift(nuevoAdmin);
    Store.save('administradores', admins);

    toast('Cohorte "' + nombreCohorte + '" creada con administrador ' + nombreAdmin, 'ok');

    if (RENDERERS['modulos']) RENDERERS['modulos']();

    return { cohorte: nuevaCohorte, admin: nuevoAdmin };
  }

  // ---------- Apertura / cierre / guardado del modal "Crear Cohorte y Administrador" ----------
  function abrirModalCohorteAdmin() {
    document.getElementById('ccNombreCohorte').value = '';
    document.getElementById('ccAdminNombre').value = '';
    document.getElementById('ccAdminEmail').value = '';
    document.getElementById('ccAdminPassword').value = '';
    document.getElementById('modalCohorteAdmin').classList.remove('hidden');
  }
  function cerrarModalCohorteAdmin() {
    document.getElementById('modalCohorteAdmin').classList.add('hidden');
  }
  function guardarCohorteAdmin() {
    const nombreCohorte = document.getElementById('ccNombreCohorte').value;
    const datosAdmin = {
      nombre: document.getElementById('ccAdminNombre').value,
      email: document.getElementById('ccAdminEmail').value,
      password: document.getElementById('ccAdminPassword').value,
    };
    const resultado = crearCohorteConAdmin(nombreCohorte, datosAdmin);
    if (resultado) cerrarModalCohorteAdmin();
  }

  // ---------- Render: consola del Superadmin (listado total cohorte <-> admin) ----------
  function renderCohorteAdminModule() {
    const cohortes = Store.list('modulos');
    const admins = Store.list('administradores');

    const filas = cohortes.map(c => {
      const admin = admins.find(a => a.cohorteId === c.cohorteId);
      return `<tr class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(c.nombre)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${admin ? escapeHtml(admin.nombre) : '<span class="text-coral">Sin administrador asignado</span>'}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${admin ? escapeHtml(admin.email) : '—'}</td>
        <td class="py-2.5 px-4 text-xs text-slate2 font-mono">${escapeHtml(c.cohorteId || c.id)}</td>
      </tr>`;
    }).join('');

    document.getElementById('mount-cohorte-admin').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Cohortes y administradores</h2>
            <p class="text-sm text-slate2 mt-0.5">Vista de Superadmin: control total sobre todas las cohortes y quién las administra.</p>
          </div>
          <button onclick="abrirModalCohorteAdmin()" class="rounded-xl bg-ink text-white text-sm font-semibold px-4 py-2 hover:bg-black transition flex items-center gap-1.5 whitespace-nowrap shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Crear Cohorte y Administrador
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Administrador</th><th class="py-2.5 px-4">Correo</th><th class="py-2.5 px-4">cohorteId</th>
            </tr></thead>
            <tbody>${filas || '<tr><td colspan="4"><div class="admin-empty-state"><svg class="w-8 h-8 text-slate2/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg><p class="text-sm">Aún no hay cohortes con administrador. Crea la primera con el botón de arriba.</p></div></td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---------- Exportar CSV ----------
  function exportCSV(entity, excludeKeys) {
    excludeKeys = excludeKeys || [];
    const records = Store.list(entity);
    if (!records.length) { toast('No hay datos para exportar', 'err'); return; }
    const keys = Object.keys(records[0]).filter(k => k !== 'id' && !excludeKeys.includes(k));
    const rows = [keys.join(',')].concat(
      records.map(r => keys.map(k => '"' + String(r[k] ?? '').replace(/"/g, '""') + '"').join(','))
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = entity + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Archivo CSV exportado', 'ok');
  }

  // ---------- Búsqueda de tablas ----------
  function filterTable(entity, term) {
    term = term.toLowerCase();
    document.querySelectorAll('#table-' + entity + ' tbody tr').forEach(tr => {
      tr.style.display = tr.dataset.search.includes(term) ? '' : 'none';
    });
  }

  // ---------- Helper: encabezado de sección con botón "Nuevo" + buscador ----------
  function sectionHeader(entity, title, subtitle, extraBtn, showNewButton, csvExcludeKeys) {
    if (showNewButton === undefined) showNewButton = true;
    const excludeArg = csvExcludeKeys && csvExcludeKeys.length ? ', ' + JSON.stringify(csvExcludeKeys) : '';
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
        <div>
          <h2 class="text-lg font-extrabold text-ink">${title}</h2>
          <p class="text-sm text-slate2 mt-0.5">${subtitle}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <input oninput="filterTable('${entity}', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            <svg class="w-4 h-4 text-slate2 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button onclick="exportCSV('${entity}'${excludeArg})" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-sm font-semibold px-3.5 py-2 transition">CSV</button>
          ${extraBtn || ''}
          ${showNewButton ? `<button onclick="openModal('${entity}')" class="rounded-xl bg-ink text-white text-sm font-semibold px-4 py-2 hover:bg-black transition flex items-center gap-1.5 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Nuevo
          </button>` : ''}
        </div>
      </div>`;
  }

  function emptyRow(colspan, entity) {
    return `<tr><td colspan="${colspan}">
      <div class="admin-empty-state">
        <svg class="w-8 h-8 text-slate2/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-6-4h6m2 11H7a2 2 0 01-2-2V4a2 2 0 012-2h7l5 5v12a2 2 0 01-2 2z"/></svg>
        <p class="text-sm">Aún no hay registros. Haz clic en <span class="text-ink font-semibold">"Nuevo"</span> para crear el primero.</p>
      </div>
    </td></tr>`;
  }

  function statusPill(value, map) {
    const c = (map && map[value]) || { bg: '#5B647214', text: '#5B6472' };
    return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${c.bg};color:${c.text}">${escapeHtml(value)}</span>`;
  }

  const ESTADO_COLORS = {
    'Activo': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Inactivo': { bg: '#5B647214', text: '#5B6472' },
    'En curso': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Planeada': { bg: '#F5A6231A', text: '#b5790f' }, 'Finalizada': { bg: '#5B647214', text: '#5B6472' },
    'Enviado': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Borrador': { bg: '#5B647214', text: '#5B6472' },
    'Abierto': { bg: '#F0455C1A', text: '#F0455C' }, 'En proceso': { bg: '#F5A6231A', text: '#b5790f' }, 'Cerrado': { bg: '#1FC8C01A', text: '#0f8f89' },
    'Pendiente': { bg: '#F5A6231A', text: '#b5790f' },
    'Programada': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Realizada': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Cancelada': { bg: '#F0455C1A', text: '#F0455C' },
    'Abierta': { bg: '#8B5CF61A', text: '#8B5CF6' },
  };

  // ---------- Superadmin — vista Resumen (diseño corporativo) ----------
  const SUPERADMIN_CARD_ICONS = {
    usuarios: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg>',
    cohortes: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25v13.5M4.75 8.5L12 6.25l7.25 2.25v9L12 19.75l-7.25-2.25v-9z"/></svg>',
    calificaciones: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H6a1 1 0 01-1-1V6a2 2 0 012-2h10a2 2 0 012 2v10a1 1 0 01-1 1h-2"/></svg>',
    configuracion: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function renderSuperadminSummaryCard(opts) {
    return `
      <article class="superadmin-card cursor-pointer" onclick="showPanel('${opts.panel}')">
        <div class="flex items-start justify-between">
          <div class="superadmin-card-icon" style="background:${opts.color}1A;color:${opts.color}">${SUPERADMIN_CARD_ICONS[opts.icon] || ''}</div>
          <span class="superadmin-card-dot ${opts.dot}"></span>
        </div>
        <h3 class="superadmin-card-title">${escapeHtml(opts.title)}</h3>
        <p class="superadmin-card-value">${escapeHtml(String(opts.value))}</p>
        <p class="superadmin-card-text">${escapeHtml(opts.text)}</p>
      </article>`;
  }

  function renderResumenSuperadmin() {
    const usuarios = Store.list('usuarios');
    const modulos = Store.list('modulos');
    const calificaciones = Store.list('calificaciones');
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const promedio = calificaciones.length ? (calificaciones.reduce((a, c) => a + Number(c.nota || 0), 0) / calificaciones.length).toFixed(1) : '—';

    const cards = [
      {
        panel: 'usuarios', icon: 'usuarios', title: 'Usuarios', dot: 'bg-turquesa', color: '#1FC8C0',
        value: usuarios.length,
        text: usuarios.length > 0 ? 'Cuentas activas en la plataforma.' : 'Aún no hay usuarios registrados.',
      },
      {
        panel: 'modulos', icon: 'cohortes', title: 'Cohortes', dot: 'bg-morado', color: '#8B5CF6',
        value: modulos.length,
        text: enCurso > 0 ? enCurso + ' en curso actualmente.' : 'Aún no hay cohortes en curso.',
      },
      {
        panel: 'calificaciones', icon: 'calificaciones', title: 'Calificaciones', dot: 'bg-oro', color: '#F5A623',
        value: calificaciones.length,
        text: calificaciones.length > 0 ? 'Promedio general: ' + promedio + ' / 5.0.' : 'Aún no hay calificaciones publicadas.',
      },
      {
        panel: 'configuracion', icon: 'configuracion', title: 'Configuración', dot: 'bg-coral', color: '#F0455C',
        value: 'A+',
        text: 'Parámetros generales de la fundación.',
      },
    ];

    document.getElementById('mount-resumen').innerHTML = `
      <div class="superadmin-cards mb-8">
        ${cards.map(c => renderSuperadminSummaryCard(c)).join('')}
      </div>
      <div class="admin-panel-card p-6 sm:p-7">
        <h3 class="text-sm font-extrabold text-ink mb-1">Accesos rápidos</h3>
        <p class="text-xs text-slate2 mb-5">Atajos a las tareas administrativas más frecuentes.</p>
        <div class="grid sm:grid-cols-3 gap-3">
          <button onclick="openModal('usuarios')" class="text-left rounded-xl border border-gray-100 hover:border-morado/30 hover:bg-morado/5 transition p-4">
            <p class="text-sm font-bold text-ink">+ Nuevo usuario</p>
            <p class="text-xs text-slate2 mt-1">Registrar estudiante, docente o coordinador.</p>
          </button>
          <button onclick="openModal('modulos')" class="text-left rounded-xl border border-gray-100 hover:border-morado/30 hover:bg-morado/5 transition p-4">
            <p class="text-sm font-bold text-ink">+ Nueva cohorte</p>
            <p class="text-xs text-slate2 mt-1">Crear un módulo o grupo formativo.</p>
          </button>
          <button onclick="showPanel('configuracion')" class="text-left rounded-xl border border-gray-100 hover:border-morado/30 hover:bg-morado/5 transition p-4">
            <p class="text-sm font-bold text-ink">Ajustar configuración</p>
            <p class="text-xs text-slate2 mt-1">Cupos, notas mínimas y notificaciones.</p>
          </button>
        </div>
      </div>`;
  }

  // ---------- RENDER: Resumen ----------
  function renderResumen() {
    if (currentAdminRole === 'superadmin') {
      renderResumenSuperadmin();
      return;
    }

    const usuarios = Store.list('usuarios');
    const modulos = Store.list('modulos');
    const calificaciones = Store.list('calificaciones');
    const pqr = Store.list('pqr');
    const semaforo = computeSemaforo();

    const docentes = usuarios.filter(u => u.rol === 'Docente' && u.estado === 'Activo').length;
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const promedio = calificaciones.length ? (calificaciones.reduce((a, c) => a + Number(c.nota || 0), 0) / calificaciones.length).toFixed(1) : '—';
    const enRiesgo = semaforo.filter(s => s.riesgo === 'Rojo').length;
    const pqrAbiertos = pqr.filter(p => p.estado === 'Pendiente').length;
    const cupos = modulos.reduce((a, m) => a + Number(m.cupos || 0), 0);
    const inscritos = modulos.reduce((a, m) => a + Number(m.inscritos || 0), 0);
    const ocupacion = cupos ? Math.round((inscritos / cupos) * 100) : 0;

    const cards = [
      { label: 'Usuarios registrados', value: usuarios.length, sub: docentes + ' docentes activos', color: 'turquesa' },
      { label: 'Estudiantes en riesgo', value: enRiesgo, sub: 'Requieren acompañamiento', color: 'coral' },
      { label: 'Promedio general', value: promedio, sub: 'Sobre 5.0', color: 'oro' },
      { label: 'Cohortes en curso', value: enCurso, sub: modulos.length + ' registradas en total', color: 'morado' },
      { label: 'Ocupación de cupos', value: ocupacion + '%', sub: inscritos + ' de ' + cupos + ' cupos', color: 'magenta' },
      { label: 'PQR pendientes', value: pqrAbiertos, sub: 'A la espera de que se descargue el PDF', color: 'marron' },
      { label: 'Calificaciones cargadas', value: calificaciones.length, sub: 'En el sistema', color: 'turquesa' },
      { label: 'Alertas de riesgo', value: enRiesgo + semaforo.filter(s => s.riesgo === 'Amarillo').length, sub: 'Rojas + amarillas', color: 'coral' },
    ];

    const colorMap = { turquesa: '#1FC8C0', coral: '#F0455C', oro: '#F5A623', morado: '#8B5CF6', magenta: '#EC4899', marron: '#9A5B3F' };

    const cardsHtml = cards.map(c => `
      <div class="admin-panel-card p-6">
        <div class="w-9 h-9 rounded-lg grid place-items-center mb-4" style="background:${colorMap[c.color]}1A">
          <span class="w-2.5 h-2.5 rounded-full" style="background:${colorMap[c.color]}"></span>
        </div>
        <p class="text-xs text-slate2">${c.label}</p>
        <p class="text-2xl font-extrabold text-ink mt-1">${c.value}</p>
        <p class="text-xs text-slate2 mt-1">${c.sub}</p>
      </div>`).join('');

    const ranking = [...calificaciones].sort((a, b) => b.nota - a.nota).slice(0, 5);
    const rankHtml = ranking.length ? ranking.map((r, i) => `
      <div class="flex items-center gap-3">
        <span class="w-6 h-6 rounded-full ${i === 0 ? 'bg-oro/15 text-oro' : 'bg-gray-100 text-slate2'} text-xs font-bold grid place-items-center">${i + 1}</span>
        <span class="flex-1 text-sm text-ink font-medium">${escapeHtml(r.estudiante)}</span>
        <span class="text-sm font-bold text-ink">${Number(r.nota).toFixed(1)}</span>
      </div>`).join('') : `<p class="text-sm text-slate2">Aún no hay calificaciones registradas.</p>`;

    const alerts = [];
    semaforo.filter(s => s.riesgo === 'Rojo').forEach(s => alerts.push({ c: '#F0455C', txt: `<span class="text-ink font-semibold">${escapeHtml(s.nombre)}:</span> riesgo crítico (asistencia ${s.asistencia}%, promedio ${s.promedio}).` }));
    pqr.filter(p => p.estado === 'Pendiente').forEach(p => alerts.push({ c: '#F5A623', txt: `<span class="text-ink font-semibold">PQR ${escapeHtml(p.tipo)} de ${escapeHtml(p.solicitante)}:</span> "${escapeHtml(p.asunto)}" — PDF sin descargar.` }));
    modulos.filter(m => m.cupos && m.inscritos >= m.cupos).forEach(m => alerts.push({ c: '#8B5CF6', txt: `<span class="text-ink font-semibold">${escapeHtml(m.nombre)}:</span> cupos completos.` }));
    const alertsHtml = alerts.length ? alerts.slice(0, 6).map(a => `
      <div class="flex items-start gap-3">
        <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${a.c}"></span>
        <p class="text-sm text-slate2">${a.txt}</p>
      </div>`).join('') : `<p class="text-sm text-slate2">No hay alertas activas por ahora.</p>`;

    document.getElementById('mount-resumen').innerHTML = `
      <div class="flex items-center justify-end -mt-2 mb-3">
        <button onclick="resetDemoData()" class="text-xs font-semibold text-slate2 hover:text-ink transition">Reiniciar plataforma (dejar todo en blanco)</button>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">${cardsHtml}</div>
      <div class="grid lg:grid-cols-2 gap-5 mt-5">
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between mb-5">
            <p class="font-bold text-ink text-sm">Ranking académico</p>
            <span class="text-xs text-slate2">Top 5</span>
          </div>
          <div class="space-y-3">${rankHtml}</div>
        </div>
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between mb-5">
            <p class="font-bold text-ink text-sm">Alertas del sistema</p>
            <span class="w-2 h-2 rounded-full bg-coral animate-pulse"></span>
          </div>
          <div class="space-y-4">${alertsHtml}</div>
        </div>
      </div>`;
  }

  // Resumen de materias/horas que un Docente tiene asignadas, según el Horario
  function getDocenteResumenMaterias(nombreDocente) {
    const slots = getSlotsDocente(nombreDocente);
    if (!slots.length) return null;
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);
    return { count: slots.length, totalHoras };
  }

  // ---------- RENDER: Usuarios ----------
  function renderUsuarios() {
    // Los Administradores (rol Coordinador) ya no aparecen aquí: tienen su
    // propio apartado exclusivo del Superadmin (ver renderAdministradores()).
    const records = Store.list('usuarios').filter(u => u.rol !== 'Coordinador' && u.rol !== 'Administrador');
    const rows = records.map(u => {
      let cohorteCell = escapeHtml(u.cohorte || '—');
      if (u.rol === 'Docente') {
        const resumen = getDocenteResumenMaterias(u.nombre);
        cohorteCell = resumen
          ? `${resumen.count} materia${resumen.count === 1 ? '' : 's'} · ${resumen.totalHoras} h`
          : '<span class="text-slate2">Sin materias asignadas</span>';
      }
      return `
      <tr data-search="${escapeHtml((u.nombre + ' ' + u.email + ' ' + u.rol + ' ' + u.cohorte).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(u.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.email)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.rol)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${cohorteCell}</td>
        <td class="py-3 px-4">${statusPill(u.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-usuarios').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('usuarios', 'Usuarios', records.length + ' cuentas registradas en la plataforma')}
        <div class="overflow-x-auto">
          <table id="table-usuarios" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Nombre</th><th class="py-2.5 px-4">Correo</th><th class="py-2.5 px-4">Rol</th><th class="py-2.5 px-4">Cohorte / Materias</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- ADMINISTRADORES (apartado exclusivo del Superadmin) ----------
  // A diferencia de "Usuarios" (Estudiantes/Docentes), este apartado solo
  // existe para que el Superadmin cree, edite o elimine cuentas con rol
  // "Coordinador" (mostradas aquí como "Administrador"). Reutiliza el mismo
  // modal/CRUD de 'usuarios', pero con el rol fijo en 'Coordinador' y sin
  // mostrar los campos de rol/cohorte (openModal('usuarios', id, 'Coordinador')).
  function renderAdministradores() {
    const records = Store.list('usuarios').filter(u => u.rol === 'Coordinador' || u.rol === 'Administrador');
    const rows = records.map(u => `
      <tr data-search="${escapeHtml((u.nombre + ' ' + u.email).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(u.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.email)}</td>
        <td class="py-3 px-4">${statusPill(u.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('usuarios','${u.id}','Coordinador')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-administradores').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Administradores</h2>
            <p class="text-sm text-slate2 mt-0.5">${records.length} administrador${records.length === 1 ? '' : 'es'} con acceso al panel de Administración.</p>
          </div>
          <button onclick="openModal('usuarios', null, 'Coordinador')" class="rounded-xl bg-ink text-white text-sm font-semibold px-4 py-2 hover:bg-black transition flex items-center gap-1.5 whitespace-nowrap shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Nuevo administrador
          </button>
        </div>
        <div class="overflow-x-auto">
          <table id="table-administradores" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Nombre</th><th class="py-2.5 px-4">Correo</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(4)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- HORARIO (antes "Módulos y cohortes") ----------
  // Estado en memoria de la grilla que se está armando/editando.
  let horarioState = { cohorte: null, mes: null, incluyeSabado: false };

  function renderModulos() {
    const cohortes = Store.list('modulos');

    const rows = cohortes.map(m => {
      const inscritos = contarInscritos(m.nombre);
      const docentes = docentesDeCohorte(m.nombre);
      const pct = m.cupos ? Math.min(100, Math.round((inscritos / m.cupos) * 100)) : 0;
      const llena = m.cupos && inscritos >= m.cupos;
      return `
      <tr data-search="${escapeHtml((m.nombre + ' ' + m.modulo + ' ' + docentes.join(' ')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(m.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(m.fechaInicio)} – ${fmtDate(m.fechaFin)}</td>
        <td class="py-3 px-4 text-sm text-slate2 min-w-[110px]">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div class="h-full ${llena ? 'bg-coral' : 'bg-morado'}" style="width:${pct}%"></div></div>
            <span class="text-xs shrink-0">${inscritos}/${m.cupos}</span>
          </div>
        </td>
        <td class="py-3 px-4">${statusPill(m.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('modulos','${m.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('modulos','${m.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-modulos').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Horario</h2>
            <p class="text-sm text-slate2 mt-0.5">Elige una cohorte y un mes: la grilla aparece automáticamente para asignar materia y docente en cada franja.</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="horarioCohorteSelect">Cohorte</label>
            <select id="horarioCohorteSelect" onchange="onCambiaHorarioCohorte()" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30">
              <option value="">Selecciona una cohorte...</option>
              ${cohortes.map(c => `<option value="${escapeHtml(c.nombre)}" ${horarioState.cohorte === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="horarioMesSelect">Mes</label>
            <select id="horarioMesSelect" onchange="onCambiaHorarioMes()" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30" ${horarioState.cohorte ? '' : 'disabled'}>
              <option value="">Selecciona un mes...</option>
            </select>
          </div>
          <div class="flex items-end pb-1">
            <label class="inline-flex items-center gap-2 text-sm text-slate2 select-none">
              <input id="horarioSabadoCheck" type="checkbox" onchange="onToggleHorarioSabado()" class="w-4 h-4 rounded border-gray-300 text-morado focus:ring-morado/30" ${horarioState.incluyeSabado ? 'checked' : ''} />
              Incluir sábado <span class="text-slate2/70">(opcional)</span>
            </label>
          </div>
        </div>
        <div id="horarioGridWrap" class="mt-5"></div>
      </div>

      <div class="admin-panel-card p-6">
        ${sectionHeader('modulos', 'Cohortes registradas', cohortes.length + ' cohortes del Training de 100 a 1000+')}
        <div class="overflow-x-auto">
          <table id="table-modulos" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Fechas</th><th class="py-2.5 px-4">Cupos</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;

    poblarMesesHorario();
    renderHorarioGrid();
  }

  function poblarMesesHorario() {
    const mesSelect = document.getElementById('horarioMesSelect');
    if (!mesSelect) return;
    if (!horarioState.cohorte) {
      mesSelect.innerHTML = '<option value="">Selecciona un mes...</option>';
      mesSelect.disabled = true;
      return;
    }
    const cohorte = Store.list('modulos').find(c => c.nombre === horarioState.cohorte);
    const opciones = generarOpcionesMes(cohorte);
    mesSelect.disabled = false;
    mesSelect.innerHTML = '<option value="">Selecciona un mes...</option>' +
      opciones.map(o => `<option value="${o.value}" ${horarioState.mes === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
  }

  function onCambiaHorarioCohorte() {
    const sel = document.getElementById('horarioCohorteSelect');
    horarioState.cohorte = sel.value || null;
    horarioState.mes = null;
    horarioState.incluyeSabado = false;
    poblarMesesHorario();
    renderHorarioGrid();
  }

  function onCambiaHorarioMes() {
    const sel = document.getElementById('horarioMesSelect');
    horarioState.mes = sel.value || null;
    const existente = (horarioState.cohorte && horarioState.mes) ? getHorario(horarioState.cohorte, horarioState.mes) : null;
    horarioState.incluyeSabado = existente ? !!existente.incluyeSabado : false;
    const chk = document.getElementById('horarioSabadoCheck');
    if (chk) chk.checked = horarioState.incluyeSabado;
    renderHorarioGrid();
  }

  function onToggleHorarioSabado() {
    const chk = document.getElementById('horarioSabadoCheck');
    horarioState.incluyeSabado = chk.checked;
    renderHorarioGrid();
  }

  function renderHorarioGrid() {
    const wrap = document.getElementById('horarioGridWrap');
    if (!wrap) return;
    if (!horarioState.cohorte || !horarioState.mes) {
      wrap.innerHTML = `<p class="text-sm text-slate2 text-center py-10 border border-dashed border-gray-200 rounded-2xl">Selecciona una cohorte y un mes para que aparezca el horario por llenar.</p>`;
      return;
    }
    const existente = getHorario(horarioState.cohorte, horarioState.mes);
    const celdas = existente ? existente.celdas : {};
    const dias = horarioState.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const docentesActivos = Store.list('usuarios').filter(u => u.rol === 'Docente');

    const filas = BLOQUES_HORARIO.map((bloque, idx) => {
      if (bloque.almuerzo) {
        return `<tr class="bg-gray-50">
          <td class="py-2 px-3 text-xs font-bold text-slate2 whitespace-nowrap">${bloque.inicio} – ${bloque.fin}</td>
          <td colspan="${dias.length}" class="py-2 px-3 text-center text-xs font-extrabold tracking-widest uppercase text-slate2">Almuerzo</td>
        </tr>`;
      }
      const celdasHtml = dias.map(dia => {
        const key = celdaKey(dia, idx);
        const c = celdas[key] || {};
        const docenteNoListado = c.docente && !docentesActivos.some(d => d.nombre === c.docente);
        const opcionesDocente = ['<option value="">— Sin asignar —</option>']
          .concat(docentesActivos.map(d => `<option value="${escapeHtml(d.nombre)}" ${c.docente === d.nombre ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`))
          .concat(docenteNoListado ? [`<option value="${escapeHtml(c.docente)}" selected>${escapeHtml(c.docente)} (no listado)</option>`] : []);
        return `<td class="py-2 px-2 align-top">
          <div class="space-y-1.5">
            <input type="text" placeholder="Materia" value="${escapeHtml(c.materia || '')}" data-dia="${dia}" data-bloque="${idx}" class="horario-materia w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-morado/30" />
            <select data-dia="${dia}" data-bloque="${idx}" class="horario-docente w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-morado/30">${opcionesDocente.join('')}</select>
          </div>
        </td>`;
      }).join('');
      return `<tr class="border-b border-gray-50">
        <td class="py-2 px-3 text-xs font-bold text-slate2 whitespace-nowrap align-top">${bloque.inicio} – ${bloque.fin}<br/><span class="text-[10px] font-normal text-slate2/70">${horasBloque(bloque)} h</span></td>
        ${celdasHtml}
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-separate" style="border-spacing:0">
          <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2">
            <th class="py-2 px-3">Horas</th>
            ${dias.map(d => `<th class="py-2 px-3">${d}</th>`).join('')}
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <div class="flex justify-end mt-4">
        <button onclick="guardarHorario()" class="rounded-xl bg-ink text-white text-sm font-semibold px-5 py-2.5 hover:bg-black transition">Guardar horario</button>
      </div>`;
  }

  function guardarHorario() {
    if (!horarioState.cohorte || !horarioState.mes) { toast('Selecciona una cohorte y un mes primero', 'err'); return; }
    const celdas = {};
    document.querySelectorAll('.horario-materia').forEach(input => {
      const dia = input.getAttribute('data-dia');
      const bloque = input.getAttribute('data-bloque');
      const key = celdaKey(dia, bloque);
      celdas[key] = celdas[key] || {};
      celdas[key].materia = input.value.trim();
    });
    document.querySelectorAll('.horario-docente').forEach(sel => {
      const dia = sel.getAttribute('data-dia');
      const bloque = sel.getAttribute('data-bloque');
      const key = celdaKey(dia, bloque);
      celdas[key] = celdas[key] || {};
      celdas[key].docente = sel.value;
    });
    Object.keys(celdas).forEach(k => { if (!celdas[k].materia && !celdas[k].docente) delete celdas[k]; });

    const registros = Store.list('horarios');
    const idx = registros.findIndex(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    const registro = { id: idx > -1 ? registros[idx].id : uid('ho'), cohorte: horarioState.cohorte, mes: horarioState.mes, incluyeSabado: horarioState.incluyeSabado, celdas };
    if (idx > -1) registros[idx] = registro; else registros.push(registro);
    Store.save('horarios', registros);
    toast('Horario de ' + mesLabel(horarioState.mes) + ' guardado correctamente', 'ok');
    if (RENDERERS['usuarios']) RENDERERS['usuarios']();
  }

  // ---------- RENDER: Pensum curricular ----------
  // Abre en una pestaña nueva el archivo adjunto de un tema del pensum
  // (guardado como data URL). Usado desde el panel admin y el de estudiante.
  function verArchivoPensum(id) {
    const p = Store.list('pensum').find(x => x.id === id);
    if (!p || !p.archivoDatos) { toast('Este tema aún no tiene un archivo adjunto', 'info'); return; }
    const win = window.open();
    if (!win) { toast('Habilita las ventanas emergentes para ver el archivo', 'err'); return; }
    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.tema;
  }

  function renderPensum() {
    const records = [...Store.list('pensum')].sort((a, b) => (a.modulo > b.modulo ? 1 : -1) || (a.orden - b.orden));
    const grouped = {};
    records.forEach(p => { (grouped[p.modulo] = grouped[p.modulo] || []).push(p); });

    const groupsHtml = Object.keys(grouped).length ? Object.keys(grouped).map(mod => `
      <div class="mb-5 last:mb-0">
        <p class="text-xs font-bold uppercase tracking-wide text-morado mb-2">${escapeHtml(mod)}</p>
        <div class="rounded-xl border border-gray-100 divide-y divide-gray-50">
          ${grouped[mod].map(p => `
            <div data-search="${escapeHtml((p.modulo + ' ' + p.tema + ' ' + p.docente).toLowerCase())}" class="flex items-center gap-3 px-4 py-3">
              <span class="w-6 h-6 rounded-full bg-gray-100 text-slate2 text-xs font-bold grid place-items-center shrink-0">${p.orden}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">${escapeHtml(p.tema)}</p>
                <p class="text-xs text-slate2">${escapeHtml(p.docente || '—')} · ${p.horas} h${p.archivoNombre ? ' · 📎 ' + escapeHtml(p.archivoNombre) : ''}</p>
              </div>
              ${p.archivoDatos ? `<button onclick="verArchivoPensum('${p.id}')" class="text-xs font-semibold text-turquesa hover:underline mr-3">Ver archivo</button>` : ''}
              <button onclick="openModal('pensum','${p.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
              <button onclick="askDelete('pensum','${p.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
            </div>`).join('')}
        </div>
      </div>`).join('') : `<p class="text-sm text-slate2 text-center py-10">Aún no hay temas curriculares. Haz clic en "Nuevo" para crear el primero.</p>`;

    document.getElementById('mount-pensum').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('pensum', 'Pensum curricular', records.length + ' temas distribuidos por módulo', null, true, ['archivoDatos'])}
        <div id="table-pensum">${groupsHtml}</div>
      </div>`;
  }

  // ---------- Semáforo de riesgo (calculado a partir de calificaciones + overrides manuales) ----------
  function computeSemaforo() {
    const usuarios = Store.list('usuarios').filter(u => u.rol === 'Estudiante');
    const calificaciones = Store.list('calificaciones');
    const overrides = Store.get('semaforo_overrides') || {};
    const cfg = Store.get('configuracion') || SEED.configuracion;

    return usuarios.map(u => {
      const notas = calificaciones.filter(c => c.estudiante === u.nombre).map(c => Number(c.nota));
      const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;
      const ov = overrides[u.id] || {};
      const asistencia = ov.asistencia !== undefined ? ov.asistencia : 90;
      let riesgo = 'Verde';
      if (promedio !== null && (promedio < cfg.notasMinimaAprobacion || asistencia < cfg.asistenciaMinima)) riesgo = 'Rojo';
      else if (promedio !== null && (promedio < cfg.notasMinimaAprobacion + 0.5 || asistencia < cfg.asistenciaMinima + 10)) riesgo = 'Amarillo';
      if (ov.riesgo) riesgo = ov.riesgo;
      return {
        id: u.id, nombre: u.nombre, cohorte: u.cohorte,
        promedio: promedio !== null ? promedio.toFixed(1) : '—',
        asistencia, riesgo, motivo: ov.motivo || ''
      };
    });
  }

  function setSemaforoOverride(id, field, value) {
    const overrides = Store.get('semaforo_overrides') || {};
    overrides[id] = { ...(overrides[id] || {}), [field]: value };
    Store.set('semaforo_overrides', overrides);
    renderSemaforo();
    renderResumen();
  }

  function renderSemaforo() {
    const data = computeSemaforo();
    const riesgoColor = { Verde: { bg: '#1FC8C01A', text: '#0f8f89', dot: '#1FC8C0' }, Amarillo: { bg: '#F5A6231A', text: '#b5790f', dot: '#F5A623' }, Rojo: { bg: '#F0455C1A', text: '#F0455C', dot: '#F0455C' } };

    const rows = data.map(s => `
      <tr data-search="${escapeHtml((s.nombre + ' ' + s.cohorte).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">
          <span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${riesgoColor[s.riesgo].dot}"></span>${escapeHtml(s.nombre)}
        </td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.cohorte || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2">${s.promedio}</td>
        <td class="py-3 px-4 text-sm text-slate2">
          <input type="number" min="0" max="100" value="${s.asistencia}" onchange="setSemaforoOverride('${s.id}','asistencia', parseFloat(this.value))" class="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm" />%
        </td>
        <td class="py-3 px-4">
          <select onchange="setSemaforoOverride('${s.id}','riesgo', this.value)" class="text-xs font-semibold rounded-full px-2.5 py-1 border-0" style="background:${riesgoColor[s.riesgo].bg};color:${riesgoColor[s.riesgo].text}">
            <option ${s.riesgo === 'Verde' ? 'selected' : ''}>Verde</option>
            <option ${s.riesgo === 'Amarillo' ? 'selected' : ''}>Amarillo</option>
            <option ${s.riesgo === 'Rojo' ? 'selected' : ''}>Rojo</option>
          </select>
        </td>
        <td class="py-3 px-4">
          <input type="text" placeholder="Motivo / observación" value="${escapeHtml(s.motivo)}" onchange="setSemaforoOverride('${s.id}','motivo', this.value)" class="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs" />
        </td>
      </tr>`).join('');

    document.getElementById('mount-semaforo').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Semáforo de riesgo</h2>
            <p class="text-sm text-slate2 mt-0.5">Calculado automáticamente según promedio y asistencia. Puedes ajustar manualmente.</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input oninput="filterTable('semaforo', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-morado/30" />
              <svg class="w-4 h-4 text-slate2 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportCSV('semaforo_overrides')" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-sm font-semibold px-3.5 py-2 transition">CSV</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table id="table-semaforo" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Promedio</th><th class="py-2.5 px-4">Asistencia</th><th class="py-2.5 px-4">Riesgo</th><th class="py-2.5 px-4">Observación</th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
        ${!data.length ? '<p class="text-sm text-slate2 text-center py-4">Crea usuarios con rol "Estudiante" para que aparezcan aquí.</p>' : ''}
      </div>`;
  }

  // ---------- Memorandos: helpers compartidos (admin + estudiante) ----------
  function usuarioPorEmail(email) {
    const e = (email || '').toLowerCase();
    return Store.list('usuarios').find(u => (u.email || '').toLowerCase() === e) || null;
  }

  function rolLabelCarta(rol) {
    const map = { Estudiante: 'Trainee', Docente: 'Docente', Coordinador: 'Coordinador', Administrador: 'Administrador' };
    return map[rol] || (rol || '');
  }

  // Etiqueta amigable del destinatario para las tablas del panel admin
  // (el valor guardado en el registro es el correo del usuario, o un grupo).
  function destinatarioLabelAdmin(destinatario) {
    const u = usuarioPorEmail(destinatario);
    if (u) return `${u.nombre} (${u.rol})`;
    return destinatario || '—';
  }

  // Memorandos dirigidos al estudiante actualmente logueado: por su correo
  // exacto, por grupo, o (compatibilidad con datos antiguos) por su cohorte.
  function memorandosParaEstudiante() {
    const doc = currentEstudiante || {};
    const email = (doc.email || '').toLowerCase();
    return [...Store.list('memorandos')].filter(m => {
      const dest = m.destinatario || '';
      return dest.toLowerCase() === email
        || dest === 'Todos'
        || dest === 'Todos los estudiantes'
        || (doc.cohorte && dest === doc.cohorte);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }

  // Seguimiento de lectura por estudiante: { [memorandoId]: { [email]: true } }.
  // Se guarda aparte (no en el registro del memorando) porque un mismo memorando
  // puede estar dirigido a varios destinatarios (grupo) y cada uno lee por su lado.
  function memorandoLeidoPorEmail(memorandoId, email) {
    const mapa = Store.get('memorandos_leidos') || {};
    return !!(mapa[memorandoId] && mapa[memorandoId][email]);
  }
  function marcarMemorandoLeidoPorEmail(memorandoId, email) {
    if (!email) return;
    const mapa = Store.get('memorandos_leidos') || {};
    if (!mapa[memorandoId]) mapa[memorandoId] = {};
    if (mapa[memorandoId][email]) return;
    mapa[memorandoId][email] = true;
    Store.set('memorandos_leidos', mapa);
  }
  function updateMemorandosBadge() {
    const doc = currentEstudiante || {};
    const email = (doc.email || '').toLowerCase();
    const noLeidos = memorandosParaEstudiante().filter(m => !memorandoLeidoPorEmail(m.id, email)).length;
    const badge = document.getElementById('memorandosBadge');
    if (!badge) return;
    if (noLeidos > 0) { badge.textContent = noLeidos; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  }

  // Construye el HTML completo del memorando en formato de carta institucional
  // (logo Fundación A+, marca Training, encabezado PARA/DE/ASUNTO, cuerpo libre
  // de hasta decenas de miles de caracteres) y lo abre en una pestaña nueva,
  // lista para imprimir o "Guardar como PDF" desde el navegador.
  function construirCartaMemorandoHTML(m) {
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const destinatarioUsuario = usuarioPorEmail(m.destinatario);
    const nombreDestinatario = destinatarioUsuario ? destinatarioUsuario.nombre : (
      m.destinatario === 'Todos los docentes' ? 'Docentes de la Fundación A+' :
      m.destinatario === 'Todos los estudiantes' ? 'Trainees de la Fundación A+' :
      m.destinatario === 'Todos' ? 'Comunidad Fundación A+' : (m.destinatario || '—')
    );
    const rolDestinatario = destinatarioUsuario ? rolLabelCarta(destinatarioUsuario.rol) : '';
    const parrafos = (m.contenido || '').split(/\n+/).filter(p => p.trim() !== '')
      .map(p => `<p>${escapeHtml(p)}</p>`).join('') || '<p>&nbsp;</p>';

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Memorando — ${escapeHtml(m.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#14181F; background:#e9e9ec; margin:0; padding:32px 16px; }
  .hoja { max-width: 800px; margin: 0 auto 32px; background:#fff; border:1px solid #14181F; padding: 48px 56px 64px; }
  .encabezado { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-bottom:8px; }
  .marca { display:flex; align-items:center; gap:10px; font-family:'Inter',Arial,sans-serif; }
  .dots { position:relative; width:30px; height:30px; flex-shrink:0; }
  .dots span { position:absolute; width:13px; height:13px; border-radius:9999px; }
  .dots .d1 { background:#1FC8C0; top:0; left:0; } .dots .d2 { background:#8B5CF6; top:0; right:0; }
  .dots .d3 { background:#F5A623; bottom:0; left:0; } .dots .d4 { background:#F0455C; bottom:0; right:0; }
  .marca-texto { font-size:16px; font-weight:800; color:#14181F; }
  .marca-texto b { color:#F0455C; }
  .training-mark { display:flex; align-items:center; gap:6px; font-family:'Inter',Arial,sans-serif; color:#14181F; }
  .training-mark .chevron { font-size:24px; color:#F5A623; font-weight:900; line-height:1; }
  .training-mark .txt { font-size:14px; font-weight:800; letter-spacing:.2px; }
  .training-mark .txt .ai { color:#8B5CF6; }
  .training-mark .num { font-size:11px; font-weight:700; color:#5B6472; margin-left:2px; }
  hr.linea { border:none; border-top:2px solid #14181F; margin: 18px 0 26px; }
  h1.titulo-memo { text-align:center; font-size:16px; letter-spacing:2.5px; margin: 0 0 26px; }
  .meta-fecha { margin-bottom: 22px; font-size:14px; }
  table.campos { width:100%; border-collapse:collapse; margin-bottom: 24px; font-size:14px; }
  table.campos td { padding: 3px 0; vertical-align:top; }
  table.campos td.etiqueta { width:82px; font-weight:700; }
  .cuerpo { font-size:14px; line-height:1.7; }
  .cuerpo p { margin: 0 0 14px; text-align: justify; }
  .firma { margin-top: 48px; font-size:14px; }
  .barra-accion { max-width:800px; margin: 0 auto 18px; display:flex; justify-content:flex-end; font-family:'Inter',Arial,sans-serif; }
  .barra-accion button { border:none; border-radius:9999px; padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer; background:#14181F; color:#fff; }
  .barra-accion button:hover { background:#8B5CF6; }
  @media print {
    body { background:#fff; padding:0; }
    .hoja { border:1px solid #14181F; margin:0; max-width:none; }
    .barra-accion { display:none; }
  }
</style></head>
<body>
  <div class="barra-accion"><button onclick="window.print()">Descargar / Imprimir</button></div>
  <div class="hoja">
    <div class="encabezado">
      <div class="marca">
        <span class="dots"><span class="d1"></span><span class="d2"></span><span class="d3"></span><span class="d4"></span></span>
        <span class="marca-texto">Fundación A<b>+</b></span>
      </div>
      <div class="training-mark">
        <span class="chevron">‹</span>
        <span class="txt">Tr<span class="ai">AI</span>ning</span>
        <span class="num">100 → 1000+</span>
      </div>
    </div>
    <hr class="linea" />
    <h1 class="titulo-memo">MEMORANDO</h1>
    <p class="meta-fecha">${escapeHtml(cfg.ciudad || 'Quibdó')}, ${fmtDate(m.fecha)}</p>
    <table class="campos">
      <tr><td class="etiqueta">PARA:</td><td>${escapeHtml(nombreDestinatario)}${rolDestinatario ? ', ' + escapeHtml(rolDestinatario) : ''}</td></tr>
      <tr><td class="etiqueta">DE:</td><td>EQUIPO DIRECTIVO FUNDACIÓN A+</td></tr>
      <tr><td class="etiqueta">ASUNTO:</td><td>${escapeHtml(m.titulo)}</td></tr>
    </table>
    <div class="cuerpo">
      <p>Estimado/a ${escapeHtml(destinatarioUsuario ? nombreDestinatario.split(' ')[0] : nombreDestinatario)},</p>
      ${parrafos}
      <div class="firma">
        <p>Cordialmente,</p>
        <p><strong>Equipo Directivo</strong><br/>Fundación A+</p>
      </div>
    </div>
  </div>
</body></html>`;
  }

  // Abre el memorando ya renderizado como carta en una pestaña nueva.
  function abrirMemorandoCarta(id) {
    const m = Store.list('memorandos').find(x => x.id === id);
    if (!m) { toast('No se encontró el memorando', 'err'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para ver el memorando', 'err'); return; }
    win.document.write(construirCartaMemorandoHTML(m));
    win.document.close();
  }

  // Igual que abrirMemorandoCarta, pero además marca el memorando como leído
  // por el estudiante actual y refresca su badge de notificaciones.
  function verMemorandoEstudiante(id) {
    const email = (currentEstudiante && currentEstudiante.email || '').toLowerCase();
    marcarMemorandoLeidoPorEmail(id, email);
    abrirMemorandoCarta(id);
    updateMemorandosBadge();
    renderMemorandosEstudiante();
  }

  // ---------- RENDER: Memorandos ----------
  function renderMemorandos() {
    const records = Store.list('memorandos');
    const rows = records.map(m => `
      <tr data-search="${escapeHtml((m.titulo + ' ' + destinatarioLabelAdmin(m.destinatario)).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(m.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(destinatarioLabelAdmin(m.destinatario))}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(m.fecha)}</td>
        <td class="py-3 px-4">${statusPill(m.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="abrirMemorandoCarta('${m.id}')" class="text-xs font-semibold text-turquesa hover:underline mr-3">Ver carta</button>
          <button onclick="openModal('memorandos','${m.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('memorandos','${m.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-memorandos').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('memorandos', 'Memorandos', records.length + ' comunicaciones internas')}
        <div class="overflow-x-auto">
          <table id="table-memorandos" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Título</th><th class="py-2.5 px-4">Destinatario</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(5)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- RENDER: PQR ----------
  // El administrador (Superadmin o Administración) NO puede editar ni crear
  // PQR: cada solicitud la envía el Docente o el Estudiante como archivo PDF.
  // El estado pasa de "Pendiente" a "Activo" automáticamente la primera vez
  // que el administrador abre/descarga el PDF (ver descargarPqrAdmin).
  function renderPqr() {
    const records = [...Store.list('pqr')].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const rows = records.map(p => `
      <tr data-search="${escapeHtml((p.tipo + ' ' + p.solicitante + ' ' + p.asunto).toLowerCase())}" class="border-b border-gray-50 last:border-0 align-top">
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.tipo)}</td>
        <td class="py-3 px-4 text-sm">
          <p class="font-semibold text-ink">${escapeHtml(p.solicitante)}</p>
          <p class="text-xs text-slate2 mt-0.5">${escapeHtml(p.remitenteRol || '—')}</p>
        </td>
        <td class="py-3 px-4 text-sm text-ink max-w-xs">${escapeHtml(p.asunto)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(p.fecha)}</td>
        <td class="py-3 px-4">${statusPill(p.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          ${p.archivoDatos
            ? `<button onclick="descargarPqrAdmin('${p.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Descargar PDF</button>`
            : `<span class="text-xs text-slate2 mr-3">Sin archivo</span>`}
          <button onclick="askDelete('pqr','${p.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-pqr').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">PQR</h2>
            <p class="text-sm text-slate2 mt-0.5">${records.length} peticiones, quejas y reclamos enviados por docentes y estudiantes como PDF</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input oninput="filterTable('pqr', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
              <svg class="w-4 h-4 text-slate2 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportCSV('pqr', ['archivoDatos'])" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-sm font-semibold px-3.5 py-2 transition">CSV</button>
          </div>
        </div>
        <p class="text-xs text-slate2 -mt-2 mb-4">Solo lectura: el administrador no puede editar ni crear PQR. El estado cambia a <span class="font-semibold text-ink">Activo</span> automáticamente al descargar el PDF por primera vez.</p>
        <div class="overflow-x-auto">
          <table id="table-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Tipo</th><th class="py-2.5 px-4">Remitente</th><th class="py-2.5 px-4">Asunto</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // Abre el PDF de una PQR en una pestaña nueva y, la primera vez que el
  // administrador lo hace, cambia el estado de "Pendiente" a "Activo".
  function descargarPqrAdmin(id) {
    const registros = Store.list('pqr');
    const p = registros.find(r => r.id === id);
    if (!p || !p.archivoDatos) { toast('Esta PQR no tiene un archivo adjunto', 'info'); return; }

    const win = window.open('', '_blank');
    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.asunto;

    if (p.estado !== 'Activo') {
      p.estado = 'Activo';
      p.fechaActivacion = new Date().toISOString().slice(0, 10);
      Store.set('pqr', registros);
      renderPqr();
      toast('PDF descargado. Estado actualizado a Activo.', 'ok');
    }
  }

  // ---------- RENDER: Reuniones virtuales ----------
  function renderReuniones() {
    const records = [...Store.list('reuniones')].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const rows = records.map(r => `
      <tr data-search="${escapeHtml((r.titulo + ' ' + r.participantes).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(r.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(r.fecha)} ${r.hora || ''}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.participantes || '—')}</td>
        <td class="py-3 px-4 text-sm">${r.enlace ? `<a href="${escapeHtml(r.enlace)}" target="_blank" rel="noopener" class="text-morado font-semibold hover:underline">Unirse</a>` : '—'}</td>
        <td class="py-3 px-4">${statusPill(r.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('reuniones','${r.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('reuniones','${r.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-reuniones').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('reuniones', 'Reuniones virtuales', records.length + ' reuniones programadas')}
        <div class="overflow-x-auto">
          <table id="table-reuniones" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Título</th><th class="py-2.5 px-4">Fecha y hora</th><th class="py-2.5 px-4">Participantes</th><th class="py-2.5 px-4">Enlace</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- Promedio general del administrador (todas las notas, todos los profesores) ----------
  // El Administrador (Coordinador) NO ve notas individuales ni la valoración
  // cualitativa de cada docente: solo el promedio general de un estudiante en
  // su cohorte, calculado sobre las notas de TODOS los profesores que le
  // dictan clase en esa cohorte.
  function promedioGeneralEstudianteCohorte(estudianteNombre, cohorteNombre) {
    const docentes = docentesDeCohorte(cohorteNombre);
    const registros = Store.list('notas_modulos');
    const notasPorProfesor = [];
    docentes.forEach(docenteNombre => {
      const rec = registros.find(r => r.docente === docenteNombre && r.cohorte === cohorteNombre);
      if (!rec) return;
      const resultado = calcularNotaFinal(rec, estudianteNombre);
      if (resultado && !resultado.pendiente) notasPorProfesor.push(resultado.valor);
    });
    if (!notasPorProfesor.length) return null;
    const promedio = notasPorProfesor.reduce((a, b) => a + b, 0) / notasPorProfesor.length;
    return { promedio, profesores: notasPorProfesor.length };
  }

  // ---------- RENDER: Calificaciones ----------
  function renderCalificaciones() {
    // Vista de SOLO LECTURA para Superadmin y Administración (Coordinador):
    // por cada cohorte, cada estudiante, el PROMEDIO GENERAL calculado sobre
    // las notas de TODOS los profesores que le dictan clase en esa cohorte.
    // No se muestran notas individuales por docente ni la valoración
    // cualitativa (esa vive solo en el Informe del docente).
    const cohortes = Store.list('modulos');

    const bloquesCohorte = cohortes.map(cohorte => {
      const estudiantes = Store.list('usuarios').filter(u => u.rol === 'Estudiante' && u.cohorte === cohorte.nombre);
      const docentesCohorte = docentesDeCohorte(cohorte.nombre);

      const filas = estudiantes.map(e => {
        const resultado = promedioGeneralEstudianteCohorte(e.nombre, cohorte.nombre);
        const promedioHtml = resultado
          ? `<span class="font-bold" style="color:${colorCualitativa(resultado.promedio)}">${resultado.promedio.toFixed(1)}</span>
             <span class="text-[11px] text-slate2 ml-1">(${resultado.profesores} profesor${resultado.profesores !== 1 ? 'es' : ''})</span>`
          : `<span class="text-slate2 text-xs">Sin notas aún</span>`;
        return `
        <tr data-search="${escapeHtml((e.nombre + ' ' + cohorte.nombre).toLowerCase())}" class="border-b border-gray-50 last:border-0">
          <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.nombre)}</td>
          <td class="py-3 px-4 text-sm">${promedioHtml}</td>
        </tr>`;
      }).join('');

      return `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-sm font-bold text-ink">${escapeHtml(cohorte.nombre)}</p>
          <span class="text-xs text-slate2">${docentesCohorte.length} profesor${docentesCohorte.length !== 1 ? 'es' : ''} · ${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Promedio general</th>
            </tr></thead>
            <tbody>${filas || emptyRow(2)}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    document.getElementById('mount-calificaciones').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Calificaciones</h2>
        <p class="text-sm text-slate2 mt-0.5">Solo lectura: promedio general por estudiante en cada cohorte, calculado con las notas de todos sus profesores. No se muestran notas individuales ni la valoración cualitativa de cada docente.</p>
      </div>
      ${bloquesCohorte || `<div class="admin-panel-card p-8 text-center"><p class="text-sm text-slate2">Aún no hay cohortes registradas.</p></div>`}`;
  }

  // ---------- RENDER: Informes enviados por docentes (agrupados por profesor) ----------
  function renderInformesAdmin() {
    // Vista de SOLO LECTURA para Superadmin y Administración: agrupa todos
    // los informes que los docentes han guardado (ver guardarInformeDocente),
    // agrupados por profesor, para que el administrador pueda revisarlos
    // sin tener que entrar cohorte por cohorte.
    const informes = Store.list('informes_docente');

    const porDocente = {};
    informes.forEach(i => {
      (porDocente[i.docente] = porDocente[i.docente] || []).push(i);
    });
    const docentesConInformes = Object.keys(porDocente).sort((a, b) => a.localeCompare(b));

    const bloquesDocente = docentesConInformes.map(nombreDocente => {
      const lista = porDocente[nombreDocente].slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      const filas = lista.map(i => `
        <tr class="border-b border-gray-50 last:border-0">
          <td class="py-3 px-4 text-sm font-semibold text-ink">${nombrePersonaClicable(i.estudiante, 'Estudiante')}</td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(i.cohorte || '—')}</td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(i.materia || '—')}</td>
          <td class="py-3 px-4 text-sm text-slate2">${i.fecha ? fmtDate(i.fecha) : '—'}</td>
          <td class="py-3 px-4 text-sm text-slate2">${i.asistenciaPct !== null && i.asistenciaPct !== undefined ? i.asistenciaPct + '%' : 'Sin datos'}</td>
          <td class="py-3 px-4 text-sm">${i.promedio !== null && i.promedio !== undefined
            ? `<span class="font-bold" style="color:${colorCualitativa(i.promedio)}">${Number(i.promedio).toFixed(1)}</span> <span class="text-[11px] text-slate2">(${escapeHtml(i.cualitativa || '')})</span>`
            : '<span class="text-slate2 text-xs">Sin datos</span>'}</td>
          <td class="py-3 px-4 text-sm text-ink max-w-xs">${i.observaciones ? escapeHtml(i.observaciones) : '<span class="text-slate2 italic">Sin observaciones</span>'}</td>
        </tr>`).join('');

      return `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-sm font-bold text-ink">${nombrePersonaClicable(nombreDocente, 'Docente')}</p>
          <span class="text-xs text-slate2">${lista.length} informe${lista.length !== 1 ? 's' : ''} enviado${lista.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Materia</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Asistencia</th><th class="py-2.5 px-4">Nota</th><th class="py-2.5 px-4">Observaciones</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    document.getElementById('mount-informes-admin').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Informes de docentes</h2>
        <p class="text-sm text-slate2 mt-0.5">Solo lectura: informes que cada docente ha enviado sobre sus estudiantes, agrupados por profesor.</p>
      </div>
      ${bloquesDocente || `<div class="admin-panel-card p-8 text-center"><p class="text-sm text-slate2">Aún no hay informes enviados por los docentes.</p></div>`}`;
  }

  // ---------- RENDER: Encuestas de satisfacción ----------
  function renderEncuestas() {
    // Tanto Superadmin como Administración pueden crear y editar encuestas.
    const puedeEditar = true;
    const respuestasTodas = Store.list('encuestas_respuestas');
    const records = Store.list('encuestas').map(e => {
      const propias = respuestasTodas.filter(r => r.encuestaId === e.id);
      const promedio = propias.length ? propias.reduce((a, r) => a + Number(r.calificacion || 0), 0) / propias.length : 0;
      return { ...e, respuestas: propias.length, promedio };
    });
    const rows = records.map(e => `
      <tr data-search="${escapeHtml(e.titulo.toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(e.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${e.respuestas}</td>
        <td class="py-3 px-4 text-sm font-bold text-ink">${Number(e.promedio).toFixed(1)} / 5</td>
        <td class="py-3 px-4">${statusPill(e.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          ${puedeEditar ? `<button onclick="openModal('encuestas','${e.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('encuestas','${e.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>` : `<span class="text-xs text-slate2">Solo lectura</span>`}
        </td>
      </tr>`).join('');

    const avgAll = records.length ? (records.reduce((a, e) => a + Number(e.promedio || 0), 0) / records.length).toFixed(1) : '—';

    document.getElementById('mount-encuestas').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('encuestas', 'Encuestas de satisfacción', 'Satisfacción promedio general: ' + avgAll + ' / 5', null, puedeEditar)}
        ${!puedeEditar ? `<p class="text-xs text-slate2 -mt-2 mb-4">Acceso de solo lectura: la cuenta de Administración puede consultar las encuestas, pero no editarlas ni crear nuevas.</p>` : ''}
        <div class="overflow-x-auto">
          <table id="table-encuestas" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Encuesta</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Respuestas</th><th class="py-2.5 px-4">Promedio</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- RENDER: Configuración ----------
  function renderConfiguracion() {
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const cred = Store.get('superadmin_credentials') || SEED.superadmin_credentials;
    const seguridadSuperadmin = currentAdminRole === 'superadmin' ? `
      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl mt-6">
        <h2 class="text-lg font-extrabold text-ink mb-1">Seguridad del Superadmin</h2>
        <p class="text-sm text-slate2 mb-6">Cambia el correo y/o la contraseña con los que inicias sesión como Superadmin. Debes confirmar tu contraseña actual para guardar cambios.</p>
        <form onsubmit="return false;" class="grid gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo de acceso</label>
            <input id="sa_email" type="email" value="${escapeHtml(cred.email)}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Contraseña actual</label>
            <input id="sa_actual" type="password" autocomplete="off" placeholder="Requerida para confirmar el cambio" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nueva contraseña</label>
            <input id="sa_nueva" type="password" autocomplete="new-password" placeholder="Déjala en blanco para no cambiarla" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="guardarCredencialesSuperadmin()" class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition shadow-sm">Guardar credenciales</button>
        </div>
      </div>` : '';

    document.getElementById('mount-configuracion').innerHTML = `
      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl">
        <h2 class="text-lg font-extrabold text-ink mb-1">Configuración general</h2>
        <p class="text-sm text-slate2 mb-6">Parámetros institucionales que usa el panel para calcular alertas y el semáforo de riesgo.</p>
        <form id="configForm" onsubmit="return false;" class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre de la fundación</label>
            <input id="cfg_nombre" type="text" value="${escapeHtml(cfg.nombre)}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Ciudad (para cartas y memorandos)</label>
            <input id="cfg_ciudad" type="text" value="${escapeHtml(cfg.ciudad || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Dirección</label>
            <input id="cfg_direccion" type="text" placeholder="Ej: Calle 10 #5-20, Quibdó" value="${escapeHtml(cfg.direccion || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo de contacto</label>
            <input id="cfg_correo" type="email" value="${escapeHtml(cfg.correo)}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Teléfono</label>
            <input id="cfg_telefono" type="text" value="${escapeHtml(cfg.telefono)}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Cupo máximo por cohorte</label>
            <input id="cfg_cupo" type="number" value="${cfg.cupoMaximo}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nota mínima de aprobación</label>
            <input id="cfg_nota" type="number" step="0.1" value="${cfg.notasMinimaAprobacion}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asistencia mínima (%)</label>
            <input id="cfg_asistencia" type="number" value="${cfg.asistenciaMinima}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
          <div class="sm:col-span-2 flex items-center gap-6 mt-1">
            <label class="flex items-center gap-2 text-sm text-ink"><input id="cfg_notifEmail" type="checkbox" ${cfg.notificacionesEmail ? 'checked' : ''} class="rounded" /> Notificaciones por correo</label>
            <label class="flex items-center gap-2 text-sm text-ink"><input id="cfg_notifIA" type="checkbox" ${cfg.notificacionesIA ? 'checked' : ''} class="rounded" /> Alertas generadas por IA</label>
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="saveConfiguracion()" class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition shadow-sm">Guardar configuración</button>
        </div>
      </div>

      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl mt-6">
        <h2 class="text-lg font-extrabold text-ink mb-1">Postulación pública</h2>
        <p class="text-sm text-slate2 mb-6">Controla el botón "Postular" del sitio público. Pega aquí el link del cuestionario externo (Google Forms u otro) donde los interesados dejan sus datos, y actívalo cuando quieras recibir postulaciones.</p>
        <form onsubmit="return false;" class="grid gap-4">
          <label class="flex items-center gap-2 text-sm text-ink">
            <input id="cfg_postulacionHabilitada" type="checkbox" ${cfg.postulacionHabilitada ? 'checked' : ''} class="rounded" />
            Habilitar postulación en el sitio público
          </label>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Link del cuestionario</label>
            <input id="cfg_postulacionUrl" type="url" placeholder="https://forms.gle/..." value="${escapeHtml(cfg.postulacionUrl || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
            <p class="text-xs text-slate2 mt-1.5">Mientras esté deshabilitada, el botón "Postular" del sitio mostrará un aviso de que las postulaciones están cerradas, sin importar el link que hayas guardado aquí.</p>
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="saveConfiguracion()" class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition shadow-sm">Guardar configuración</button>
        </div>
      </div>
      ${seguridadSuperadmin}`;
  }

  // Cambia el correo y/o la contraseña con los que se inicia sesión como
  // Superadmin. Exige la contraseña actual para confirmar el cambio; si
  // "Nueva contraseña" se deja en blanco, conserva la que ya tenía.
  function guardarCredencialesSuperadmin() {
    const cred = Store.get('superadmin_credentials') || SEED.superadmin_credentials;
    const nuevoEmail = document.getElementById('sa_email').value.trim();
    const actual = document.getElementById('sa_actual').value;
    const nueva = document.getElementById('sa_nueva').value;

    if (!nuevoEmail) { toast('El correo no puede quedar vacío', 'err'); return; }
    if (actual !== cred.password) { toast('La contraseña actual no es correcta', 'err'); return; }

    Store.set('superadmin_credentials', { email: nuevoEmail, password: nueva !== '' ? nueva : cred.password });
    document.getElementById('sa_actual').value = '';
    document.getElementById('sa_nueva').value = '';
    toast('Credenciales del Superadmin actualizadas', 'ok');
  }

  function saveConfiguracion() {
    const urlPostulacion = document.getElementById('cfg_postulacionUrl').value.trim();
    const habilitarPostulacion = document.getElementById('cfg_postulacionHabilitada').checked;

    if (habilitarPostulacion && !urlPostulacion) {
      toast('Para habilitar la postulación primero pega el link del cuestionario', 'err');
      return;
    }

    const cfg = {
      nombre: document.getElementById('cfg_nombre').value.trim(),
      ciudad: document.getElementById('cfg_ciudad').value.trim(),
      direccion: document.getElementById('cfg_direccion').value.trim(),
      correo: document.getElementById('cfg_correo').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim(),
      cupoMaximo: parseFloat(document.getElementById('cfg_cupo').value) || 0,
      notasMinimaAprobacion: parseFloat(document.getElementById('cfg_nota').value) || 0,
      asistenciaMinima: parseFloat(document.getElementById('cfg_asistencia').value) || 0,
      notificacionesEmail: document.getElementById('cfg_notifEmail').checked,
      notificacionesIA: document.getElementById('cfg_notifIA').checked,
      postulacionHabilitada: habilitarPostulacion,
      postulacionUrl: urlPostulacion,
    };
    Store.set('configuracion', cfg);
    toast('Configuración guardada', 'ok');
    renderSemaforo();
    renderResumen();
    // El sitio público (Contáctanos + botón Postular) vive en el mismo
    // documento que el panel Admin, así que se actualiza al instante.
    renderContactoPublico();
    actualizarBotonesPostular();
  }

  // ---------- Sitio público: Contáctanos + Postular (alimentados por Configuración) ----------

  /** Pinta el bloque "Contacto" del footer público con los datos reales de la fundación. */
  function renderContactoPublico() {
    const el = document.getElementById('contactoPublico');
    if (!el) return; // el sitio público aún no está en el DOM (no debería pasar, pero por seguridad)
    const cfg = Store.get('configuracion') || SEED.configuracion;

    const filas = [];
    if (cfg.correo) filas.push(`<a href="mailto:${escapeHtml(cfg.correo)}" class="flex items-center gap-2 hover:text-ink transition">${escapeHtml(cfg.correo)}</a>`);
    if (cfg.telefono) filas.push(`<a href="tel:${escapeHtml(cfg.telefono.replace(/\s+/g, ''))}" class="flex items-center gap-2 hover:text-ink transition">${escapeHtml(cfg.telefono)}</a>`);
    if (cfg.direccion) filas.push(`<span class="flex items-center gap-2">${escapeHtml(cfg.direccion)}${cfg.ciudad ? ', ' + escapeHtml(cfg.ciudad) : ''}</span>`);
    else if (cfg.ciudad) filas.push(`<span class="flex items-center gap-2">${escapeHtml(cfg.ciudad)}</span>`);

    el.innerHTML = filas.join('') || '<span class="text-slate2">Datos de contacto próximamente.</span>';
  }

  /** Activa/desactiva y enlaza los botones "Postular" del sitio con el link que definió el Superadmin. */
  function actualizarBotonesPostular() {
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const habilitada = !!(cfg.postulacionHabilitada && cfg.postulacionUrl);
    document.querySelectorAll('.btn-postular').forEach(btn => {
      btn.classList.toggle('opacity-50', !habilitada);
      btn.title = habilitada ? 'Postula al programa' : 'Las postulaciones no están abiertas en este momento';
    });
  }

  /** onclick de los botones "Postular": abre el cuestionario externo o avisa que está cerrado. */
  function abrirPostulacion(event) {
    if (event && event.preventDefault) event.preventDefault();
    const cfg = Store.get('configuracion') || SEED.configuracion;
    if (cfg.postulacionHabilitada && cfg.postulacionUrl) {
      window.open(cfg.postulacionUrl, '_blank', 'noopener');
    } else {
      toast('Las postulaciones no están abiertas en este momento. Vuelve pronto.', 'info');
    }
  }

  const RENDERERS = {
    resumen: renderResumen,
    usuarios: renderUsuarios,
    administradores: renderAdministradores,
    modulos: renderModulos,
    codigosqr: renderCodigosQr,
    pensum: renderPensum,
    semaforo: renderSemaforo,
    memorandos: renderMemorandos,
    pqr: renderPqr,
    reuniones: renderReuniones,
    calificaciones: renderCalificaciones,
    informesAdmin: renderInformesAdmin,
    encuestas: renderEncuestas,
    configuracion: renderConfiguracion,
  };

  function initAdmin() {
    seedIfEmpty();
    if (!ADMIN_BOOTED) {
      ADMIN_BOOTED = true;
    }
  }

  /* =====================================================================
     PANEL DOCENTE — módulos funcionales
     Persistencia: localStorage (misma capa Store del panel administrativo).
     Todas las entidades nuevas (notas_modulos, informes_docente,
     agenda_docente) arrancan vacías: sin datos ficticios, listas para que
     el docente las llene con información real.
     ===================================================================== */

  // Cohortes/módulos que dicta el docente que inició sesión.
  // Se calcula a partir del Horario real (docentesDeCohorte), que es la
  // única fuente de verdad de qué docente dicta qué cohorte — el campo
  // "docente" que traía la cohorte ya no se usa para esto.
  function docenteModulosActivos() {
    const doc = currentDocente || {};
    if (!doc.nombre) return [];
    return Store.list('modulos').filter(m => docentesDeCohorte(m.nombre).includes(doc.nombre));
  }
  // Estudiantes matriculados en una cohorte (por nombre de cohorte).
  function docenteEstudiantesDeCohorte(cohorteNombre) {
    return Store.list('usuarios').filter(u => u.rol === 'Estudiante' && u.cohorte === cohorteNombre);
  }

  // ---------- RENDER: Resumen (docente) ----------
  // ---------- PERFIL (docente) ----------
  // Foto de perfil y descripción breve, ambas opcionales. La foto se guarda
  // como data URL (base64) dentro del propio registro de usuario en
  // localStorage (Store 'usuarios'); no requiere backend de archivos.
  function renderPerfilDocente() {
    const doc = currentDocente || {};
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100" />`
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
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Descripción breve</label>
          <textarea id="perfil_descripcion" rows="3" maxlength="280" placeholder="Ej: Docente de Desarrollo Web, apasionado por enseñar buenas prácticas de programación (opcional)" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30 resize-none">${escapeHtml(doc.descripcion || '')}</textarea>
          <p class="text-[11px] text-slate2 mt-1">Opcional · máx. 280 caracteres</p>
        </div>
        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="password" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
            <input id="perfil_pass2" type="password" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
        </div>
        <button onclick="guardarPerfilDocente()" class="mt-6 rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Guardar cambios</button>
      </div>`;
  }

  function actualizarUsuarioDocenteActual(cambios) {
    const usuarios = Store.list('usuarios').map(u => u.id === currentDocente.id ? { ...u, ...cambios } : u);
    Store.set('usuarios', usuarios);
    currentDocente = { ...currentDocente, ...cambios };
  }

  function subirFotoPerfilDocente(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      actualizarUsuarioDocenteActual({ fotoUrl: reader.result });
      toast('Foto de perfil actualizada', 'ok');
      renderPerfilDocente();
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  function quitarFotoPerfilDocente() {
    actualizarUsuarioDocenteActual({ fotoUrl: '' });
    toast('Foto de perfil eliminada', 'ok');
    renderPerfilDocente();
  }

  function guardarPerfilDocente() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    const cambios = {};
    if (nombre) cambios.nombre = nombre;
    cambios.descripcion = descripcion; // opcional: puede quedar vacía
    actualizarUsuarioDocenteActual(cambios);
    toast('Perfil actualizado correctamente', 'ok');
    renderPerfilDocente();
  }

  function renderResumenDocente() {
    const doc = currentDocente || {};
    const modulos = docenteModulosActivos();
    const pensumItems = Store.list('pensum').filter(p => p.docente === doc.nombre);
    const totalEstudiantes = modulos.reduce((a, m) => a + contarInscritos(m.nombre), 0);
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;

    const modulosRows = modulos.map(m => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(m.modulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(m.nombre)} · ${contarInscritos(m.nombre)}/${m.cupos} estudiantes</p>
        </div>
        ${statusPill(m.estado, ESTADO_COLORS)}
      </div>`).join('');

    document.getElementById('mount-t-resumen').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Módulos asignados</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${modulos.length}</p>
          <p class="text-xs text-slate2 mt-1">${enCurso} en curso</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Estudiantes a cargo</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${totalEstudiantes}</p>
          <p class="text-xs text-slate2 mt-1">En tus cohortes activas</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Temas del pensum</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${pensumItems.length}</p>
          <p class="text-xs text-slate2 mt-1">Asignados a tu perfil</p>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <div class="flex items-start gap-4 mb-4">
          ${doc.fotoUrl
            ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" class="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100" />`
            : `<div class="w-12 h-12 rounded-full grid place-items-center text-sm font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${escapeHtml((doc.nombre || '?').split(' ').slice(0,2).map(w => w[0]).join(''))}</div>`}
          <div>
            <h2 class="text-base font-extrabold text-ink mb-1">Bienvenido, ${escapeHtml(doc.nombre || 'Docente')}</h2>
            <p class="text-sm text-slate2">${escapeHtml(doc.email || '')} · Este es tu panel docente.</p>
            ${doc.descripcion ? `<p class="text-sm text-slate2 mt-1.5 italic">"${escapeHtml(doc.descripcion)}"</p>` : ''}
          </div>
        </div>
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Tus módulos y cohortes</p>
        ${modulosRows || '<p class="text-sm text-slate2 text-center py-6">Aún no tienes módulos asignados. El coordinador puede asignarlos desde el panel administrativo.</p>'}
      </div>`;
  }

  // ---------- RENDER: Mi horario (docente) ----------
  function renderHorarioDocente() {
    const doc = currentDocente || {};
    const slots = getSlotsDocente(doc.nombre);
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);

    // Agrupar por Cohorte + Mes para mostrar mini-tablas separadas
    const grupos = {};
    slots.forEach(s => {
      const k = s.cohorte + '|' + s.mes;
      (grupos[k] = grupos[k] || { cohorte: s.cohorte, mes: s.mes, items: [] }).items.push(s);
    });

    const gruposHtml = Object.keys(grupos).length ? Object.keys(grupos).map(k => {
      const g = grupos[k];
      return `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-5">
        <div class="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p class="text-sm font-bold text-ink">${escapeHtml(g.cohorte)}</p>
            <p class="text-xs text-slate2">${escapeHtml(mesLabel(g.mes))}</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-6">Día</th><th class="py-2.5 px-4">Horario</th><th class="py-2.5 px-4">Materia</th><th class="py-2.5 px-4">Horas</th>
            </tr></thead>
            <tbody>${g.items.map(s => `
              <tr class="border-b border-gray-50 last:border-0">
                <td class="py-2.5 px-6 text-sm font-semibold text-ink">${escapeHtml(s.dia)}</td>
                <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${s.inicio}–${s.fin}</td>
                <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(s.materia)}</td>
                <td class="py-2.5 px-4 text-sm text-slate2">${s.horas} h</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('') : `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no apareces en ningún horario. El administrador te asignará materias y horas desde el panel "Horario".</p>
      </div>`;

    document.getElementById('mount-t-modulos').innerHTML = `
      ${slots.length ? `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 mb-5 flex items-center justify-between flex-wrap gap-3">
        <p class="text-sm text-slate2">Total de horas semanales asignadas</p>
        <p class="text-2xl font-extrabold text-ink">${totalHoras} h</p>
      </div>` : ''}
      ${gruposHtml}`;
  }

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
  function getOrCrearTokenQR(tipo, cohorteNombre, docenteNombre) {
    const tokens = Store.list('qr_tokens');
    let rec = tokens.find(t => t.tipo === tipo && t.cohorte === cohorteNombre && t.docente === docenteNombre);
    if (!rec) {
      rec = { id: uid('qr'), tipo, cohorte: cohorteNombre, docente: docenteNombre, token: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) };
      tokens.push(rec);
      Store.set('qr_tokens', tokens);
    }
    return rec.token;
  }

  // La materia/tema que dicta un docente específico dentro de una cohorte,
  // según la grilla de horarios (celdas con docente asignado). Si el
  // docente tiene varias celdas, se usa la primera como etiqueta.
  function materiaDeDocenteEnCohorte(cohorteNombre, docenteNombre) {
    const horarios = Store.list('horarios').filter(h => h.cohorte === cohorteNombre);
    for (const h of horarios) {
      const celdas = Object.values(h.celdas || {});
      const celda = celdas.find(c => c && c.docente === docenteNombre && c.tema);
      if (celda) return celda.tema;
    }
    return null;
  }

  function urlQr(tipo, token) {
    return location.origin + location.pathname + '?qr=' + tipo + '&t=' + token;
  }

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

  function generarCodigoSesion() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function sesionAsistenciaHoy(cohorteNombre, docenteNombre) {
    const hoy = new Date().toISOString().slice(0, 10);
    return Store.list('sesiones_asistencia').find(s => s.cohorte === cohorteNombre && s.fecha === hoy && s.iniciadaPor === docenteNombre) || null;
  }

  function minutosTranscurridos(horaInicioISO) {
    return (Date.now() - new Date(horaInicioISO).getTime()) / 60000;
  }

  function estadoPorTiempo(mins) {
    if (mins <= VENTANA_PUNTUAL_MIN) return 'Presente';
    if (mins <= VENTANA_TARDE_MIN) return 'Tarde';
    return 'Falla';
  }

  // Una vez cerrada la ventana (50 min), a quien nunca escaneó se le crea
  // automáticamente el registro "Falla". Se llama cada vez que se pinta el
  // panel de asistencia (docente o estudiante), así todo queda al día solo.
  // Se compara por sesionId (única por docente+cohorte+día), así la
  // asistencia de cada materia queda completamente separada.
  function sincronizarAusentesSesion(sesion, estudiantesCohorte) {
    if (!sesion) return;
    if (minutosTranscurridos(sesion.horaInicio) <= VENTANA_TARDE_MIN) return;
    const registros = Store.list('asistencia');
    let cambiado = false;
    estudiantesCohorte.forEach(e => {
      const yaTiene = registros.some(r => r.estudiante === e.nombre && r.sesionId === sesion.id);
      if (!yaTiene) {
        registros.push({ id: uid('as'), estudiante: e.nombre, modulo: sesion.modulo, docente: sesion.iniciadaPor, materia: sesion.materia || sesion.modulo, fecha: sesion.fecha, estado: 'Falla', sesionId: sesion.id, automatico: true });
        cambiado = true;
      }
    });
    if (cambiado) Store.set('asistencia', registros);
  }

  function estadoVentanaSesion(sesion) {
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins <= VENTANA_PUNTUAL_MIN) return { texto: `Ventana de puntualidad activa — quedan ${Math.ceil(VENTANA_PUNTUAL_MIN - mins)} min`, color: '#0f8f89' };
    if (mins <= VENTANA_TARDE_MIN) return { texto: `Ventana de tolerancia (llegada tarde) activa — quedan ${Math.ceil(VENTANA_TARDE_MIN - mins)} min`, color: '#b5790f' };
    return { texto: 'Sesión cerrada — quien no escaneó quedó automáticamente como ausente', color: '#F0455C' };
  }

  function estadoActualEstudianteSesion(sesion, estudianteNombreVal) {
    if (!sesion) return { estado: 'Sin sesión', automatico: false };
    const registro = Store.list('asistencia').find(r => r.estudiante === estudianteNombreVal && r.sesionId === sesion.id);
    if (registro) return { estado: registro.estado, automatico: !!registro.automatico };
    return minutosTranscurridos(sesion.horaInicio) <= VENTANA_TARDE_MIN
      ? { estado: 'Esperando escaneo', automatico: false }
      : { estado: 'Falla', automatico: true };
  }

  // ---------- RENDER: Asistencia (QR automático) — docente ----------
  let docenteAsistCohorte = null;
  let asistenciaDocenteTimer = null;

  function renderAsistenciaDocente() {
    if (asistenciaDocenteTimer) clearInterval(asistenciaDocenteTimer);
    const doc = currentDocente || {};

    const modulos = docenteModulosActivos();
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

    const estudiantes = docenteEstudiantesDeCohorte(moduloSel.nombre);
    const sesion = sesionAsistenciaHoy(moduloSel.nombre, doc.nombre);
    if (sesion) sincronizarAusentesSesion(sesion, estudiantes);

    const pillMap = { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'], 'Esperando escaneo': { bg: '#5B647214', text: '#5B6472' }, 'Sin sesión': { bg: '#5B647214', text: '#5B6472' } };

    const selector = `<select onchange="cambiarCohorteAsistDocente(this.value)" class="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteAsistCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const materiaDoc = materiaDeDocenteEnCohorte(moduloSel.nombre, doc.nombre) || moduloSel.modulo;
    const tokenDocente = getOrCrearTokenQR('docente', moduloSel.nombre, doc.nombre);
    const tokenEstudiante = getOrCrearTokenQR('estudiante', moduloSel.nombre, doc.nombre);

    const tarjetasQr = `
      <div class="grid sm:grid-cols-2 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <p class="text-sm font-bold text-ink mb-1">Tu código — actívalo cada día</p>
          <p class="text-xs text-slate2 mb-4">Este código es solo tuyo, para <strong>${escapeHtml(materiaDoc)}</strong>. Imprímelo una sola vez. Escanéalo al empezar tu clase para activar la ventana de asistencia de hoy; al día siguiente funciona igual.</p>
          <div id="qrDocenteImg" class="flex justify-center mb-4"></div>
          <button onclick="imprimirQr('Código del docente — ${escapeHtml(materiaDoc)}','Escanéalo para activar la asistencia de hoy','qrDocenteImg')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <p class="text-sm font-bold text-ink mb-1">Código para tus estudiantes</p>
          <p class="text-xs text-slate2 mb-4">Imprímelo y pégalo en el salón. Solo aplica para <strong>${escapeHtml(materiaDoc)}</strong>: cada estudiante lo escanea, escribe su correo registrado y su asistencia se aplica sola según la hora.</p>
          <div id="qrEstudianteImg" class="flex justify-center mb-4"></div>
          <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(materiaDoc)}','Escanéalo e ingresa tu correo institucional','qrEstudianteImg')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
        </div>
      </div>`;

    let tarjetaSesion;
    if (!sesion) {
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-ink">Asistencia de hoy: sin activar</p>
            <p class="text-xs text-slate2 mt-1">Actívala escaneando tu código QR de arriba, o con este botón si estás en este mismo dispositivo. Desde ahí, tus estudiantes tendrán ${VENTANA_PUNTUAL_MIN} minutos para llegar puntuales y hasta ${VENTANA_TARDE_MIN} para llegar tarde. Después, quien no escaneó queda ausente solo.</p>
          </div>
          <button onclick="habilitarSesionAsistenciaDocente()" class="rounded-full bg-ink text-white font-semibold text-sm py-2.5 px-6 hover:bg-morado transition shrink-0">Activar ahora</button>
        </div>`;
    } else {
      const ventana = estadoVentanaSesion(sesion);
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
          <p class="text-sm font-bold text-ink">Asistencia de hoy: activa</p>
          <p class="text-xs text-slate2 mt-1">Activada a las ${new Date(sesion.horaInicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}${sesion.iniciadaPor ? ' por ' + escapeHtml(sesion.iniciadaPor) : ''}.</p>
          <p class="text-xs font-bold mt-2" style="color:${ventana.color}">${ventana.texto}</p>
        </div>`;
    }

    const filasHoy = estudiantes.length ? estudiantes.map(e => {
      const info = estadoActualEstudianteSesion(sesion, e.nombre);
      const etiqueta = info.estado === 'Falla' && info.automatico ? 'Falla (automático)' : info.estado;
      return `<tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.nombre)}</td>
        <td class="py-3 px-4">${statusPill(info.estado === 'Falla' ? 'Falla' : info.estado, pillMap)}${info.automatico && info.estado === 'Falla' ? '<span class="text-[10px] text-slate2 ml-2">automático</span>' : ''}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="2" class="text-sm text-slate2 text-center py-6">Esta cohorte aún no tiene estudiantes matriculados.</td></tr>`;

    const historial = estudiantes.map(e => {
      const regs = Store.list('asistencia').filter(a => a.estudiante === e.nombre && a.modulo === moduloSel.modulo && a.docente === doc.nombre);
      const presentes = regs.filter(r => r.estado === 'Presente').length;
      const pct = regs.length ? Math.round((presentes / regs.length) * 100) : null;
      const color = pct === null ? '#5B6472' : pct >= 80 ? '#0f8f89' : pct >= 60 ? '#b5790f' : '#F0455C';
      return `<tr class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(e.nombre)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${regs.length} sesión${regs.length === 1 ? '' : 'es'} registrada${regs.length === 1 ? '' : 's'}</td>
        <td class="py-2.5 px-4 text-sm font-bold" style="color:${color}">${pct === null ? '—' : pct + '%'}</td>
      </tr>`;
    }).join('');

    document.getElementById('mount-t-asistencia').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Asistencia de hoy — ${escapeHtml(moduloSel.modulo)}</p>
            <p class="text-xs text-slate2 mt-0.5">${fmtDate(new Date().toISOString().slice(0, 10))} · Todo se calcula automáticamente por tiempo, sin marcado manual.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${tarjetaSesion}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Estudiante</th><th class="py-3 px-4">Estado hoy</th></tr></thead>
            <tbody>${filasHoy}</tbody>
          </table>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Historial de asistencia — ${escapeHtml(moduloSel.modulo)}</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Sesiones</th><th class="py-2.5 px-4">% Asistencia</th></tr></thead>
            <tbody>${historial || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Sin registros todavía.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    asistenciaDocenteTimer = setInterval(() => {
      const panel = document.getElementById('panel-t-asistencia');
      if (panel && !panel.classList.contains('hidden')) renderAsistenciaDocente();
      else clearInterval(asistenciaDocenteTimer);
    }, 15000);
  }

  // ---------- RENDER: Códigos QR (admin) ----------
  // Junta, a partir del Horario, cada combinación real de Docente + Cohorte +
  // Materia, y genera (o reutiliza) el par de QR estables de cada una — así
  // el administrador puede imprimirlos todos sin depender de que cada
  // docente entre primero a su propio panel.
  function combosDocenteCohorte() {
    const registros = Store.list('horarios');
    const vistos = new Set();
    const combos = [];
    registros.forEach(h => {
      Object.values(h.celdas || {}).forEach(c => {
        if (!c || !c.docente) return;
        const key = c.docente + '|' + h.cohorte;
        if (vistos.has(key)) return;
        vistos.add(key);
        combos.push({ docente: c.docente, cohorte: h.cohorte, materia: c.tema || h.modulo || h.cohorte });
      });
    });
    combos.sort((a, b) => a.cohorte.localeCompare(b.cohorte) || a.docente.localeCompare(b.docente));
    return combos;
  }

  function renderCodigosQr() {
    const combos = combosDocenteCohorte();
    const cohortes = Store.list('modulos');

    if (!combos.length) {
      document.getElementById('mount-codigosqr').innerHTML = `
        <div class="admin-panel-card p-10 text-center">
          <p class="font-bold text-ink mb-1.5">Aún no hay códigos QR para generar</p>
          <p class="text-sm text-slate2">Primero asigna un docente a alguna franja en el panel <span class="font-semibold text-ink">Cohortes → Horario</span>. En cuanto un docente quede asignado a una materia, sus dos códigos (el suyo y el de sus estudiantes) aparecerán aquí listos para imprimir.</p>
        </div>`;
      return;
    }

    const tarjetas = combos.map((combo, i) => {
      const modulo = cohortes.find(c => c.nombre === combo.cohorte);
      const tokenDoc = getOrCrearTokenQR('docente', combo.cohorte, combo.docente);
      const tokenEst = getOrCrearTokenQR('estudiante', combo.cohorte, combo.docente);
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
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-morado/10 text-morado">${escapeHtml(combo.docente)}</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR del docente</p>
              <div id="${idDoc}" class="flex justify-center mb-3"></div>
              <button onclick="imprimirQr('Código del docente — ${escapeHtml(combo.docente)} · ${escapeHtml(combo.materia)}','Escanéalo para activar la asistencia de hoy','${idDoc}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
            </div>
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR de estudiantes</p>
              <div id="${idEst}" class="flex justify-center mb-3"></div>
              <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(combo.cohorte)} · ${escapeHtml(combo.materia)}','Escanéalo e ingresa tu correo institucional','${idEst}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
            </div>
          </div>
        </div>`,
        idDoc, idEst, tokenDoc, tokenEst
      };
    });

    document.getElementById('mount-codigosqr').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <h2 class="text-lg font-extrabold text-ink">Códigos QR de asistencia</h2>
        <p class="text-sm text-slate2 mt-1">Un par de códigos estables por cada docente + cohorte, calculados a partir del panel <span class="font-semibold text-ink">Horario</span>. Imprímelos una sola vez y entrégalos: el docente escanea el suyo para activar la clase, los estudiantes escanean el de la cohorte para registrar su asistencia.</p>
      </div>
      <div class="grid lg:grid-cols-2 gap-5">${tarjetas.map(t => t.html).join('')}</div>`;

    // El QR se dibuja DESPUÉS de insertar el HTML (necesita el contenedor ya en el DOM).
    tarjetas.forEach(t => {
      pintarQrImprimible(t.idDoc, urlQr('docente', t.tokenDoc));
      pintarQrImprimible(t.idEst, urlQr('estudiante', t.tokenEst));
    });
  }

  function cambiarCohorteAsistDocente(value) {
    docenteAsistCohorte = value;
    renderAsistenciaDocente();
  }

  function habilitarSesionAsistenciaDocente() {
    const doc = currentDocente || {};
    const moduloSel = docenteModulosActivos().find(m => m.nombre === docenteAsistCohorte);
    if (!moduloSel) return;
    if (sesionAsistenciaHoy(moduloSel.nombre, doc.nombre)) { toast('Ya hay un código de asistencia activo hoy para tu materia', 'info'); renderAsistenciaDocente(); return; }
    const sesiones = Store.list('sesiones_asistencia');
    sesiones.push({
      id: uid('ses'), cohorte: moduloSel.nombre, modulo: moduloSel.modulo,
      materia: materiaDeDocenteEnCohorte(moduloSel.nombre, doc.nombre) || moduloSel.modulo, fecha: new Date().toISOString().slice(0, 10),
      horaInicio: new Date().toISOString(), codigo: generarCodigoSesion(), iniciadaPor: doc.nombre
    });
    Store.set('sesiones_asistencia', sesiones);
    toast('Código habilitado: los estudiantes tienen ' + VENTANA_PUNTUAL_MIN + ' minutos para llegar puntuales', 'ok');
    renderAsistenciaDocente();
  }

  /* =====================================================================
     ESCANEO REAL DE LOS QR IMPRESOS (?qr=docente|estudiante&t=TOKEN)
     ---------------------------------------------------------------------
     Al abrir con la cámara del celular la URL codificada en el QR, esta
     pantalla (qrView) toma el control ANTES de cualquier login: el token
     ya identifica sin ambigüedad la cohorte + docente + materia, así que
     no hace falta iniciar sesión para activar o registrar asistencia.
     ===================================================================== */

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

  function manejarQrEnURL() {
    const params = new URLSearchParams(location.search);
    const tipo = params.get('qr');
    const token = params.get('t');
    if (!tipo || !token) return;

    document.getElementById('siteView').classList.add('hidden');
    document.getElementById('qrView').classList.remove('hidden');

    const registro = Store.list('qr_tokens').find(r => r.tipo === tipo && r.token === token);
    if (!registro) {
      document.getElementById('qrViewCard').innerHTML = qrLandingShell('⚠️', '#F0455C', 'Código no válido',
        'Este QR no corresponde a ninguna cohorte activa. Pide al docente o al administrador que lo genere de nuevo desde el panel.', '');
      return;
    }

    if (tipo === 'docente') renderQrLandingDocente(registro);
    else renderQrLandingEstudiante(registro);
  }

  // ---- Landing del QR del DOCENTE: activa la sesión de hoy con un toque ----
  function renderQrLandingDocente(registro) {
    const materia = registro.materia || registro.cohorte;
    let sesion = sesionAsistenciaHoy(registro.cohorte, registro.docente);
    const recienActivada = !sesion;

    // Activación automática: si aún no había sesión hoy para esta cohorte+docente,
    // se crea en el momento mismo de abrir el enlace del QR — sin botones ni pasos extra.
    if (!sesion) {
      sesion = crearSesionAsistencia(registro);
    }

    const ventana = estadoVentanaSesion(sesion);
    const cuerpo = `
      <div class="rounded-2xl p-4" style="background:#1FC8C01A">
        <p class="text-sm font-bold text-ink">${recienActivada ? '✅ Asistencia activada' : 'Ya estaba activa hoy'}</p>
        <p class="text-xs font-semibold mt-1" style="color:${ventana.color}">${ventana.texto}</p>
      </div>
      <p class="text-xs text-slate2 mt-4">Tus estudiantes ya pueden escanear su propio código: tienen ${VENTANA_PUNTUAL_MIN} minutos para llegar puntuales y hasta ${VENTANA_TARDE_MIN} para llegar tarde. Puedes cerrar esta ventana.</p>`;

    document.getElementById('qrViewCard').innerHTML = qrLandingShell('👨‍🏫', '#8B5CF6',
      recienActivada ? 'Asistencia activada — ' + registro.docente : 'Activar asistencia — ' + registro.docente,
      'Cohorte <strong class="text-ink">' + escapeHtml(registro.cohorte) + '</strong> · ' + escapeHtml(materia), cuerpo);
  }

  function crearSesionAsistencia(registro) {
    const modulo = Store.list('modulos').find(m => m.nombre === registro.cohorte);
    const sesiones = Store.list('sesiones_asistencia');
    const nueva = {
      id: uid('ses'), cohorte: registro.cohorte, modulo: modulo ? modulo.modulo : registro.cohorte,
      materia: registro.materia || (modulo ? modulo.modulo : registro.cohorte), fecha: new Date().toISOString().slice(0, 10),
      horaInicio: new Date().toISOString(), codigo: generarCodigoSesion(), iniciadaPor: registro.docente
    };
    sesiones.push(nueva);
    Store.set('sesiones_asistencia', sesiones);
    return nueva;
  }


  // ---- Landing del QR del ESTUDIANTE: pide el correo y aplica su asistencia ----
  function renderQrLandingEstudiante(registro, mensaje) {
    const materia = registro.materia || registro.cohorte;
    const cuerpo = `
      ${mensaje ? `<p class="text-sm font-semibold mb-4" style="color:${mensaje.color}">${escapeHtml(mensaje.texto)}</p>` : ''}
      <label class="block text-xs font-semibold text-slate2 mb-1.5 text-left" for="qrEmailInput">Tu correo institucional</label>
      <input id="qrEmailInput" type="email" placeholder="nombre@aplus.org" class="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 mb-4" />
      <button onclick="registrarAsistenciaDesdeQr('${registro.id}')" class="w-full rounded-xl bg-ink text-white font-semibold text-sm py-3.5 hover:bg-morado transition">Registrar mi asistencia</button>`;

    document.getElementById('qrViewCard').innerHTML = qrLandingShell('🎓', '#1FC8C0',
      'Registrar asistencia', 'Cohorte <strong class="text-ink">' + escapeHtml(registro.cohorte) + '</strong> · ' + escapeHtml(materia), cuerpo);

    const input = document.getElementById('qrEmailInput');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => { if (e.key === 'Enter') registrarAsistenciaDesdeQr(registro.id); });
    }
  }

  function registrarAsistenciaDesdeQr(registroId) {
    const registro = Store.list('qr_tokens').find(r => r.id === registroId);
    if (!registro) return;
    const email = (document.getElementById('qrEmailInput').value || '').trim().toLowerCase();
    if (!email) { renderQrLandingEstudiante(registro, { texto: 'Escribe tu correo institucional para continuar.', color: '#F0455C' }); return; }

    const estudiante = Store.list('usuarios').find(u => u.rol === 'Estudiante' && (u.email || '').toLowerCase() === email);
    if (!estudiante) { renderQrLandingEstudiante(registro, { texto: 'No encontramos ese correo entre los estudiantes registrados.', color: '#F0455C' }); return; }
    if (estudiante.cohorte !== registro.cohorte) { renderQrLandingEstudiante(registro, { texto: 'Este código es de otra cohorte — no perteneces a "' + registro.cohorte + '".', color: '#F0455C' }); return; }

    const sesion = sesionAsistenciaHoy(registro.cohorte, registro.docente);
    if (!sesion) { renderQrLandingEstudiante(registro, { texto: 'Tu docente aún no ha activado la asistencia de hoy. Espera a que escanee su código.', color: '#b5790f' }); return; }

    const registros = Store.list('asistencia');
    const yaExiste = registros.find(r => r.estudiante === estudiante.nombre && r.sesionId === sesion.id);
    if (yaExiste) {
      renderQrLandingEstudiante(registro, { texto: 'Ya habías registrado tu asistencia hoy: ' + yaExiste.estado + '.', color: '#5B6472' });
      return;
    }
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins > VENTANA_TARDE_MIN) {
      renderQrLandingEstudiante(registro, { texto: 'La ventana de asistencia de hoy ya cerró.', color: '#F0455C' });
      return;
    }
    const estado = estadoPorTiempo(mins);
    registros.push({ id: uid('as'), estudiante: estudiante.nombre, modulo: sesion.modulo, docente: sesion.iniciadaPor, materia: sesion.materia || sesion.modulo, fecha: sesion.fecha, estado, sesionId: sesion.id, automatico: false });
    Store.set('asistencia', registros);
    renderQrLandingEstudiante(registro, { texto: '¡Listo, ' + estudiante.nombre.split(' ')[0] + '! Quedaste registrado como: ' + estado + '.', color: estado === 'Presente' ? '#0f8f89' : '#b5790f' });
  }


  // ---------- RENDER: Semáforo de riesgo — docente ----------
  function renderRiesgoDocente() {
    const cohortes = docenteModulosActivos().map(m => m.nombre);
    const data = computeSemaforo().filter(s => cohortes.includes(s.cohorte));
    const riesgoColor = { Verde: { bg: '#1FC8C01A', text: '#0f8f89', dot: '#1FC8C0' }, Amarillo: { bg: '#F5A6231A', text: '#b5790f', dot: '#F5A623' }, Rojo: { bg: '#F0455C1A', text: '#F0455C', dot: '#F0455C' } };

    const rows = data.map(s => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink"><span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${riesgoColor[s.riesgo].dot}"></span>${escapeHtml(s.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.cohorte || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2">${s.promedio}</td>
        <td class="py-3 px-4 text-sm text-slate2">${s.asistencia}%</td>
        <td class="py-3 px-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${riesgoColor[s.riesgo].bg};color:${riesgoColor[s.riesgo].text}">${s.riesgo}</span></td>
        <td class="py-3 px-4"><input type="text" placeholder="Observación de seguimiento" value="${escapeHtml(s.motivo)}" onchange="setSemaforoOverrideDocente('${s.id}', this.value)" class="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs" /></td>
      </tr>`).join('');

    document.getElementById('mount-t-riesgo').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <div class="mb-5">
          <p class="text-sm font-bold text-ink">Semáforo de riesgo académico</p>
          <p class="text-xs text-slate2 mt-0.5">Calculado automáticamente a partir del promedio de notas y la asistencia de tus estudiantes. Agrega una observación para dar seguimiento a quien lo necesite.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Promedio</th><th class="py-2.5 px-4">Asistencia</th><th class="py-2.5 px-4">Riesgo</th><th class="py-2.5 px-4">Observación</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-sm text-slate2 text-center py-6">Aún no tienes estudiantes en tus cohortes asignadas.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function setSemaforoOverrideDocente(id, motivo) {
    setSemaforoOverride(id, 'motivo', motivo);
    renderRiesgoDocente();
  }

  // ---------- Calificaciones (docente) — notas de 0.0 a 10.0, ponderadas ----------
  // Una cohorte + docente = un registro con "criterios" (notas configurables
  // por el docente: nombre + peso %) y "valores" (nota 0.0–10.0 de cada
  // estudiante por criterio). Arranca vacío: sin criterios ni notas de ejemplo.
  let docenteCalifCohorte = null;

  function getNotasModuloRecord(cohorteNombre, crear) {
    const doc = currentDocente || {};
    const registros = Store.list('notas_modulos');
    let rec = registros.find(r => r.docente === doc.nombre && r.cohorte === cohorteNombre);
    if (!rec && crear) {
      rec = { id: uid('nm'), docente: doc.nombre, cohorte: cohorteNombre, criterios: [], valores: {} };
      registros.push(rec);
      Store.set('notas_modulos', registros);
    }
    return rec || null;
  }

  function guardarNotasModuloRecord(rec) {
    const registros = Store.list('notas_modulos');
    const idx = registros.findIndex(r => r.id === rec.id);
    if (idx >= 0) registros[idx] = rec; else registros.push(rec);
    Store.set('notas_modulos', registros);
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
    const valores = (rec.valores && rec.valores[estudianteNombre]) || {};
    let sumaPeso = 0, sumaPonderada = 0, faltan = false;
    criterios.forEach(c => {
      const peso = Number(c.peso) || 0;
      sumaPeso += peso;
      const v = valores[c.id];
      if (v === undefined || v === null || v === '') { faltan = true; return; }
      sumaPonderada += Number(v) * peso;
    });
    if (!sumaPeso) return null;
    if (faltan) return { pendiente: true };
    return { valor: sumaPonderada / sumaPeso, pendiente: false };
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
    return '#F0455C';
  }

  function renderCalificacionesDocente() {
    const modulos = docenteModulosActivos();
    if (!docenteCalifCohorte || !modulos.some(m => m.nombre === docenteCalifCohorte)) {
      docenteCalifCohorte = modulos.length ? modulos[0].nombre : null;
    }
    const moduloSel = modulos.find(m => m.nombre === docenteCalifCohorte) || null;

    if (!modulos.length) {
      document.getElementById('mount-t-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes/módulos asignados. El coordinador debe asignarte uno desde el panel administrativo para poder subir calificaciones.</p>
      </div>`;
      return;
    }

    const rec = getNotasModuloRecord(moduloSel.nombre, false) || { criterios: [], valores: {} };
    const pesoTotal = pesoTotalCriterios(rec);
    const pesoOk = pesoTotal === 100;
    const estudiantes = docenteEstudiantesDeCohorte(moduloSel.nombre);

    const selector = `<select onchange="cambiarCohorteCalifDocente(this.value)" class="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteCalifCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const criteriosFilas = (rec.criterios || []).map(c => `
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
        <input type="text" value="${escapeHtml(c.nombre)}" onchange="actualizarCriterioCalif('${moduloSel.nombre}','${c.id}','nombre', this.value)" class="flex-1 bg-transparent text-sm font-semibold text-ink focus:outline-none" placeholder="Nombre de la nota (ej. Taller 1)" />
        <div class="flex items-center gap-1.5 shrink-0">
          <input type="number" min="0" max="100" step="1" value="${c.peso}" onchange="actualizarCriterioCalif('${moduloSel.nombre}','${c.id}','peso', this.value)" class="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right" />
          <span class="text-xs text-slate2 font-semibold">%</span>
        </div>
        <button onclick="eliminarCriterioCalif('${moduloSel.nombre}','${c.id}')" class="text-coral hover:opacity-70 shrink-0" title="Eliminar nota">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>`).join('');

    let tablaNotas;
    if (!rec.criterios || !rec.criterios.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">Agrega al menos una nota (por ejemplo, "Taller 1") para empezar a calificar a tus estudiantes.</p>`;
    } else if (!estudiantes.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">Esta cohorte aún no tiene estudiantes matriculados.</p>`;
    } else {
      const headerCriterios = rec.criterios.map(c => `<th class="py-2.5 px-3 text-center">${escapeHtml(c.nombre)}<br/><span class="text-[10px] font-normal normal-case text-slate2">${c.peso}%</span></th>`).join('');
      const filas = estudiantes.map(e => {
        const valores = (rec.valores && rec.valores[e.nombre]) || {};
        const celdas = rec.criterios.map(c => `
          <td class="py-2 px-3 text-center">
            <input type="number" min="0" max="10" step="0.1" value="${valores[c.id] !== undefined ? valores[c.id] : ''}" placeholder="0.0"
              onchange="guardarNotaCriterio('${moduloSel.nombre}','${e.id}','${c.id}', this.value)"
              class="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-morado/30" />
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
            <p class="text-sm font-bold text-ink">Calificaciones por cohorte</p>
            <p class="text-xs text-slate2 mt-0.5">Escala de 0.0 a 10.0. Define cuántas notas subirás y el peso (%) de cada una; el sistema calcula la nota cuantitativa y su equivalente cualitativo automáticamente.</p>
          </div>
          ${selector}
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p class="text-sm font-bold text-ink">Notas de evaluación — ${escapeHtml(moduloSel.modulo)}</p>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${pesoOk ? '#1FC8C01A' : '#F0455C1A'};color:${pesoOk ? '#0f8f89' : '#F0455C'}">Peso total: ${pesoTotal}%${pesoOk ? '' : ' — debe sumar 100%'}</span>
        </div>
        <div class="space-y-2.5 mb-4">${criteriosFilas || '<p class="text-sm text-slate2">Aún no has definido notas para esta cohorte.</p>'}</div>
        <button onclick="agregarCriterioCalif('${moduloSel.nombre}')" class="rounded-xl border border-dashed border-gray-300 text-slate2 hover:text-ink hover:border-ink text-sm font-semibold px-4 py-2.5 transition">+ Agregar nota</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <p class="text-sm font-bold text-ink mb-4">Calificar estudiantes</p>
        ${tablaNotas}
      </div>`;
  }

  function cambiarCohorteCalifDocente(value) {
    docenteCalifCohorte = value;
    renderCalificacionesDocente();
  }

  function agregarCriterioCalif(cohorteNombre) {
    const rec = getNotasModuloRecord(cohorteNombre, true);
    rec.criterios = rec.criterios || [];
    rec.criterios.push({ id: uid('cr'), nombre: 'Nota ' + (rec.criterios.length + 1), peso: 0 });
    guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  function actualizarCriterioCalif(cohorteNombre, criterioId, campo, valor) {
    const rec = getNotasModuloRecord(cohorteNombre, true);
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
    guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  function eliminarCriterioCalif(cohorteNombre, criterioId) {
    const rec = getNotasModuloRecord(cohorteNombre, true);
    rec.criterios = (rec.criterios || []).filter(c => c.id !== criterioId);
    Object.keys(rec.valores || {}).forEach(est => { if (rec.valores[est]) delete rec.valores[est][criterioId]; });
    guardarNotasModuloRecord(rec);
    toast('Nota de evaluación eliminada', 'ok');
    renderCalificacionesDocente();
  }

  function guardarNotaCriterio(cohorteNombre, estudianteId, criterioId, valorStr) {
    const est = Store.list('usuarios').find(u => u.id === estudianteId);
    if (!est) return;
    let n = valorStr === '' ? null : parseFloat(valorStr);
    if (n !== null) {
      if (isNaN(n)) { toast('Ingresa un número válido entre 0.0 y 10.0', 'err'); renderCalificacionesDocente(); return; }
      if (n < 0) n = 0;
      if (n > 10) n = 10;
    }
    const rec = getNotasModuloRecord(cohorteNombre, true);
    rec.valores = rec.valores || {};
    rec.valores[est.nombre] = rec.valores[est.nombre] || {};
    if (n === null) delete rec.valores[est.nombre][criterioId];
    else rec.valores[est.nombre][criterioId] = n;
    guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  // ---------- Informes docentes (autocompletado inteligente) ----------
  let docenteInformesCohorte = null;

  function generarDatosInformeEstudiante(estudianteNombre, cohorteNombre, materiaNombre) {
    const asistReg = Store.list('asistencia').filter(a => a.estudiante === estudianteNombre && a.modulo === materiaNombre);
    const presentes = asistReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistReg.length ? Math.round((presentes / asistReg.length) * 100) : null;

    const rec = getNotasModuloRecord(cohorteNombre, false);
    const resultado = rec ? calcularNotaFinal(rec, estudianteNombre) : null;
    const nota = resultado && !resultado.pendiente ? resultado.valor : null;

    const partes = [];
    if (pctAsistencia !== null) partes.push('una asistencia del ' + pctAsistencia + '%');
    if (nota !== null) partes.push('una nota cuantitativa de ' + nota.toFixed(1) + ' (' + calificacionCualitativa(nota) + ')');
    const conclusion = partes.length
      ? 'Durante el módulo, el/la estudiante registró ' + partes.join(' y ') + '.'
      : 'Aún no hay suficientes datos de asistencia o calificaciones para generar una conclusión automática.';

    return { pctAsistencia, nota, cualitativa: nota !== null ? calificacionCualitativa(nota) : null, conclusion };
  }

  function renderInformesDocente() {
    const modulos = docenteModulosActivos();
    if (!docenteInformesCohorte || !modulos.some(m => m.nombre === docenteInformesCohorte)) {
      docenteInformesCohorte = modulos.length ? modulos[0].nombre : null;
    }
    const moduloSel = modulos.find(m => m.nombre === docenteInformesCohorte) || null;

    if (!modulos.length) {
      document.getElementById('mount-t-informes').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas para generar informes.</p>
      </div>`;
      return;
    }

    const estudiantes = docenteEstudiantesDeCohorte(moduloSel.nombre);
    const doc = currentDocente || {};
    const guardados = Store.list('informes_docente').filter(i => i.docente === doc.nombre && i.cohorte === moduloSel.nombre);

    const selector = `<select onchange="cambiarCohorteInformesDocente(this.value)" class="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteInformesCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const tarjetas = estudiantes.length ? estudiantes.map(e => {
      const datos = generarDatosInformeEstudiante(e.nombre, moduloSel.nombre, moduloSel.modulo);
      const guardado = guardados.find(g => g.estudiante === e.nombre);
      return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4">
        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p class="text-sm font-bold text-ink">${escapeHtml(e.nombre)}</p>
          ${datos.nota !== null ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(datos.nota)}1A;color:${colorCualitativa(datos.nota)}">${datos.cualitativa}</span>` : ''}
        </div>
        <p class="text-xs text-slate2 mb-1">Asistencia: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : 'Sin datos'}</strong> · Nota cuantitativa: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : 'Sin datos'}</strong></p>
        <p class="text-sm text-ink mb-3">${escapeHtml(datos.conclusion)}</p>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Observaciones personales del docente</label>
        <textarea id="obs_${e.id}" rows="2" placeholder="Ej. Durante las clases mostró mayor liderazgo." class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">${escapeHtml(guardado ? guardado.observaciones : '')}</textarea>
        <div class="flex items-center gap-3 mt-3">
          <button onclick="guardarInformeDocente('${e.id}','${moduloSel.nombre}')" class="rounded-xl bg-ink text-white font-semibold text-xs py-2.5 px-5 hover:bg-morado transition">Guardar informe</button>
          ${guardado ? `<span class="text-xs text-turquesa font-semibold">Guardado el ${fmtDate(guardado.fecha)}</span>` : ''}
        </div>
      </div>`;
    }).join('') : '<p class="text-sm text-slate2 text-center py-8">Esta cohorte aún no tiene estudiantes matriculados.</p>';

    document.getElementById('mount-t-informes').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Autocompletado inteligente de informes</p>
            <p class="text-xs text-slate2 mt-0.5">El sistema completa asistencia, nota y conclusión automáticamente a partir de tus datos reales. Tú solo agregas la observación personal.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${tarjetas}`;
  }

  function cambiarCohorteInformesDocente(value) {
    docenteInformesCohorte = value;
    renderInformesDocente();
  }

  function guardarInformeDocente(estudianteId, cohorteNombre) {
    const est = Store.list('usuarios').find(u => u.id === estudianteId);
    const doc = currentDocente || {};
    const moduloSel = docenteModulosActivos().find(m => m.nombre === cohorteNombre);
    if (!est || !moduloSel) return;
    const textarea = document.getElementById('obs_' + estudianteId);
    const observaciones = textarea ? textarea.value.trim() : '';
    const datos = generarDatosInformeEstudiante(est.nombre, cohorteNombre, moduloSel.modulo);
    const registros = Store.list('informes_docente');
    const idx = registros.findIndex(r => r.docente === doc.nombre && r.estudiante === est.nombre && r.cohorte === cohorteNombre);
    const registro = {
      id: idx >= 0 ? registros[idx].id : uid('inf'),
      docente: doc.nombre, estudiante: est.nombre, cohorte: cohorteNombre, materia: moduloSel.modulo,
      fecha: new Date().toISOString().slice(0, 10),
      asistenciaPct: datos.pctAsistencia, promedio: datos.nota, cualitativa: datos.cualitativa,
      conclusion: datos.conclusion, observaciones
    };
    if (idx >= 0) registros[idx] = registro; else registros.push(registro);
    Store.set('informes_docente', registros);
    toast('Informe guardado: ' + est.nombre, 'ok');
    renderInformesDocente();
  }

  // ---------- Pensum curricular (docente) ----------
  function renderPensumDocente() {
    const doc = currentDocente || {};
    const items = [...Store.list('pensum')].filter(p => p.docente === doc.nombre).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const totalHoras = items.reduce((a, p) => a + (Number(p.horas) || 0), 0);

    const rows = items.map(p => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(p.modulo)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(p.tema)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${p.horas} h</td>
      </tr>`).join('');

    document.getElementById('mount-t-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="text-sm font-bold text-ink">Pensum curricular</p>
          <p class="text-xs text-slate2 mt-0.5">${items.length} tema${items.length === 1 ? '' : 's'} asignado${items.length === 1 ? '' : 's'} a tu perfil · ${totalHoras} h en total</p>
        </div>
        <button onclick="descargarPensumDocente()" ${items.length ? '' : 'disabled'} class="rounded-xl ${items.length ? 'bg-ink text-white hover:bg-morado' : 'bg-gray-100 text-slate2 cursor-not-allowed'} font-semibold text-sm py-2.5 px-5 transition">Descargar PDF</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Módulo / Asignatura</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad horaria</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes temas asignados en el pensum.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function descargarPensumDocente() {
    const doc = currentDocente || {};
    const items = [...Store.list('pensum')].filter(p => p.docente === doc.nombre).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    if (!items.length) return;
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para descargar el PDF', 'err'); return; }
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
  }

  // ---------- Reuniones virtuales (docente) ----------
  function renderReunionesDocente() {
    const doc = currentDocente || {};
    const cohortes = docenteModulosActivos().map(m => m.nombre);
    const records = [...Store.list('reuniones')].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const relevantes = records.filter(r =>
      r.creadoPor === doc.nombre ||
      (r.participantes || '').includes(doc.nombre) ||
      cohortes.some(c => (r.participantes || '').includes(c)) ||
      /docentes/i.test(r.participantes || ''));

    const rows = relevantes.map(r => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(r.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(r.fecha)} ${r.hora || ''}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.participantes || '—')}</td>
        <td class="py-3 px-4 text-sm">${r.enlace ? `<a href="${escapeHtml(r.enlace)}" target="_blank" rel="noopener" class="text-morado font-semibold hover:underline">Unirse</a>` : '—'}</td>
        <td class="py-3 px-4">${statusPill(r.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">${r.creadoPor === doc.nombre ? `<button onclick="eliminarReunionDocente('${r.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>` : ''}</td>
      </tr>`).join('');

    const opcionesCohorte = docenteModulosActivos().map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('');

    document.getElementById('mount-t-reuniones').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Crear reunión virtual</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <input id="reu_t_titulo" type="text" placeholder="Título" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          <select id="reu_t_cohorte" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
            ${opcionesCohorte || '<option value="">Sin cohortes asignadas</option>'}
          </select>
          <input id="reu_t_fecha" type="date" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          <input id="reu_t_hora" type="time" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          <input id="reu_t_enlace" type="url" placeholder="Enlace (ej. https://meet.google.com/...)" class="sm:col-span-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
        </div>
        <button onclick="crearReunionDocente()" ${opcionesCohorte ? '' : 'disabled'} class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed">Programar y notificar a la cohorte</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Tus reuniones</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Título</th><th class="py-3 px-4">Fecha y hora</th><th class="py-3 px-4">Participantes</th><th class="py-3 px-4">Enlace</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4"></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-sm text-slate2 text-center py-6">Aún no tienes reuniones programadas.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function crearReunionDocente() {
    const doc = currentDocente || {};
    const titulo = document.getElementById('reu_t_titulo').value.trim();
    const cohorte = document.getElementById('reu_t_cohorte').value;
    const fecha = document.getElementById('reu_t_fecha').value;
    const hora = document.getElementById('reu_t_hora').value;
    const enlace = document.getElementById('reu_t_enlace').value.trim();
    if (!titulo || !cohorte || !fecha) { toast('Completa título, cohorte y fecha', 'err'); return; }
    const registros = Store.list('reuniones');
    registros.push({ id: uid('r'), titulo, fecha, hora, enlace, participantes: cohorte, estado: 'Programada', creadoPor: doc.nombre });
    Store.set('reuniones', registros);
    toast('Reunión programada y notificada a ' + cohorte, 'ok');
    renderReunionesDocente();
  }

  function eliminarReunionDocente(id) {
    const doc = currentDocente || {};
    const registros = Store.list('reuniones').filter(r => !(r.id === id && r.creadoPor === doc.nombre));
    Store.set('reuniones', registros);
    toast('Reunión eliminada', 'ok');
    renderReunionesDocente();
  }

  // ---------- Agenda personal (docente) ----------
  function renderAgendaDocente() {
    const doc = currentDocente || {};
    const eventos = [...Store.list('agenda_docente')].filter(a => a.docente === doc.nombre).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    document.getElementById('mount-t-agenda').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_t_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          <select id="ag_t_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
            <option>Clase</option><option>Taller</option><option>Quiz</option><option>Entrega</option><option>Reunión</option><option>Recordatorio</option>
          </select>
          <input id="ag_t_fecha" type="date" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
        </div>
        <button onclick="agregarEventoAgendaDocente()" class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Agregar</button>
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

  function agregarEventoAgendaDocente() {
    const doc = currentDocente || {};
    const titulo = document.getElementById('ag_t_titulo').value.trim();
    const tipo = document.getElementById('ag_t_tipo').value;
    const fecha = document.getElementById('ag_t_fecha').value;
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = Store.list('agenda_docente');
    registros.push({ id: uid('ag'), docente: doc.nombre, titulo, tipo, fecha, hora: '', notas: '' });
    Store.set('agenda_docente', registros);
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaDocente();
  }

  function eliminarEventoAgendaDocente(id) {
    const doc = currentDocente || {};
    const registros = Store.list('agenda_docente').filter(a => !(a.id === id && a.docente === doc.nombre));
    Store.set('agenda_docente', registros);
    toast('Evento eliminado', 'ok');
    renderAgendaDocente();
  }

  const RENDERERS_DOCENTE = {
    resumen: renderResumenDocente,
    perfil: renderPerfilDocente,
    asistencia: renderAsistenciaDocente,
    riesgo: renderRiesgoDocente,
    informes: renderInformesDocente,
    modulos: renderHorarioDocente,
    calificaciones: renderCalificacionesDocente,
    pensum: renderPensumDocente,
    reuniones: renderReunionesDocente,
    pqr: renderPqrDocente,
    agenda: renderAgendaDocente,
  };

  // ---------- PQR (docente) ----------
  // Reutiliza subirPqrArchivo() y filaPqrPropia() (definidos en el módulo
  // PQR del panel Estudiante) para no duplicar la lógica de subida de PDF.
  function renderPqrDocente() {
    const doc = currentDocente || {};
    const propias = [...Store.list('pqr')].filter(p => p.solicitante === doc.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-t-pqr').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Enviar una nueva solicitud</p>
        <p class="text-xs text-slate2 mb-4">Adjunta tu petición, queja o reclamo como archivo PDF. Quedará en estado <span class="font-semibold text-ink">Pendiente</span> hasta que el administrador lo descargue.</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Tipo</label>
            <select id="pqr_t_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
              <option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asunto</label>
            <input id="pqr_t_asunto" type="text" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30" />
          </div>
        </div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Archivo PDF</label>
        <input id="pqr_t_archivo" type="file" accept=".pdf,application/pdf" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30" />
        <button onclick="enviarPqrDocente()" class="mt-4 rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Mis solicitudes</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  async function enviarPqrDocente() {
    const doc = currentDocente || {};
    const ok = await subirPqrArchivo({ tipoId: 'pqr_t_tipo', asuntoId: 'pqr_t_asunto', fileId: 'pqr_t_archivo', solicitante: doc.nombre, remitenteRol: 'Docente' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrDocente();
  }

  /* =====================================================================
     PANEL ESTUDIANTE — módulo completo
     Persistencia: localStorage (misma capa Store del panel administrativo)
     ===================================================================== */

  const PANEL_COLOR_ESTUDIANTE = '#F5A623';

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
    { nombre: 'Ruta cumplida', descripcion: 'Completaste una ruta de aprendizaje sugerida por la IA.', color: '#F0455C' },
    { nombre: 'Colaborador A+', descripcion: 'Participaste en una reunión virtual institucional.', color: '#9A5B3F' },
  ];

  function estudianteNombre() {
    return (currentEstudiante && currentEstudiante.nombre) || '';
  }

  function estudianteModulo() {
    // El módulo activo del estudiante se deriva de su cohorte asignada.
    const doc = currentEstudiante || {};
    const modulos = Store.list('modulos');
    return modulos.find(m => m.nombre === doc.cohorte) || null;
  }

  function initEstudiante() {
    seedIfEmpty();
    const nombre = estudianteNombre();
    const msg = MENSAJES_MOTIVACIONALES[Math.abs(hashCode(nombre + new Date().toDateString())) % MENSAJES_MOTIVACIONALES.length];
    const box = document.getElementById('mensajeMotivacional');
    document.getElementById('mensajeMotivacionalTexto').textContent = msg;
    box.classList.remove('hidden');
    updateMemorandosBadge();
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  function showPanelEstudiante(panel) {
    document.querySelectorAll('.panel-content-s').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'panel-s-' + panel);
    });
    document.querySelectorAll('.panel-tab-s').forEach(tab => {
      const isActive = tab.dataset.spanel === panel;
      tab.classList.toggle('font-semibold', isActive);
      tab.style.borderLeftColor = isActive ? PANEL_COLOR_ESTUDIANTE : 'transparent';
      tab.style.background = isActive ? PANEL_COLOR_ESTUDIANTE + '0D' : '';
      tab.style.color = isActive ? '#14181F' : '#5B6472';
    });
    if (RENDERERS_ESTUDIANTE[panel]) RENDERERS_ESTUDIANTE[panel]();
  }

  // ---------- RESUMEN ----------
  function renderResumenEstudiante() {
    const nombre = estudianteNombre();
    const mod = estudianteModulo();
    const asistenciaReg = Store.list('asistencia').filter(a => a.estudiante === nombre);
    const presentes = asistenciaReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistenciaReg.length ? Math.round((presentes / asistenciaReg.length) * 100) : 100;
    const agenda = [...Store.list('agenda_estudiante')].filter(a => a.estudiante === nombre)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).slice(0, 3);
    const califs = Store.list('calificaciones').filter(c => c.estudiante === nombre);
    const promedio = califs.length ? (califs.reduce((a, c) => a + Number(c.nota || 0), 0) / califs.length).toFixed(1) : '—';

    const agendaRows = agenda.map(a => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(a.titulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}${a.hora ? ' · ' + escapeHtml(a.hora) : ''}</p>
        </div>
      </div>`).join('');

    document.getElementById('mount-s-resumen').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Módulo activo</p>
          <p class="text-base font-extrabold text-ink mt-1">${mod ? escapeHtml(mod.modulo) : 'Sin asignar'}</p>
          <p class="text-xs text-slate2 mt-1">${mod ? escapeHtml(mod.nombre) : ''}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Asistencia</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${pctAsistencia}%</p>
          <p class="text-xs text-slate2 mt-1">${asistenciaReg.length} registros</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Promedio</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${promedio}</p>
          <p class="text-xs text-slate2 mt-1">${califs.length} evaluaciones</p>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
          <h2 class="text-base font-extrabold text-ink mb-1">Bienvenido/a, ${escapeHtml(nombre || 'Estudiante')}</h2>
          <p class="text-sm text-slate2 mb-4">Este es tu panel personal. Explora el menú lateral para revisar tu asistencia, tus materias y tu agenda.</p>
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Próximo en tu agenda</p>
          ${agendaRows || '<p class="text-sm text-slate2 text-center py-4">No tienes eventos próximos en tu agenda personal.</p>'}
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Accesos rápidos</p>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="showPanelEstudiante('asistencia')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-turquesa transition"><p class="text-sm font-semibold text-ink">Registrar asistencia</p><p class="text-xs text-slate2 mt-0.5">Escanea el QR de hoy</p></button>
            <button onclick="showPanelEstudiante('materiales')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-morado transition"><p class="text-sm font-semibold text-ink">Ver materiales</p><p class="text-xs text-slate2 mt-0.5">Del mes actual</p></button>
            <button onclick="showPanelEstudiante('ia-analisis')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-oro transition"><p class="text-sm font-semibold text-ink">Mi análisis IA</p><p class="text-xs text-slate2 mt-0.5">Fortalezas y recomendaciones</p></button>
            <button onclick="showPanelEstudiante('pqr')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-coral transition"><p class="text-sm font-semibold text-ink">Enviar PQR</p><p class="text-xs text-slate2 mt-0.5">Petición, queja o reclamo</p></button>
          </div>
        </div>
      </div>`;
  }

  // ---------- PERFIL ----------
  function renderPerfilEstudiante() {
    const doc = currentEstudiante || {};
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100" />`
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
        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="password" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
            <input id="perfil_pass2" type="password" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
        </div>
        <button onclick="guardarPerfilEstudiante()" class="mt-6 rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Guardar cambios</button>
      </div>`;
  }

  function actualizarUsuarioEstudianteActual(cambios) {
    const usuarios = Store.list('usuarios').map(u => u.id === currentEstudiante.id ? { ...u, ...cambios } : u);
    Store.set('usuarios', usuarios);
    currentEstudiante = { ...currentEstudiante, ...cambios };
  }

  function subirFotoPerfilEstudiante(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      actualizarUsuarioEstudianteActual({ fotoUrl: reader.result });
      toast('Foto de perfil actualizada', 'ok');
      renderPerfilEstudiante();
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  function quitarFotoPerfilEstudiante() {
    actualizarUsuarioEstudianteActual({ fotoUrl: '' });
    toast('Foto de perfil eliminada', 'ok');
    renderPerfilEstudiante();
  }

  function guardarPerfilEstudiante() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    const cambios = {};
    if (nombre) cambios.nombre = nombre;
    cambios.descripcion = descripcion; // opcional: puede quedar vacía
    actualizarUsuarioEstudianteActual(cambios);
    toast('Perfil actualizado correctamente', 'ok');
    renderPerfilEstudiante();
  }

  // ---------- VER PERFIL DE OTRA PERSONA (modal de solo lectura) ----------
  // Usado por el estudiante para ver el perfil de sus profesores asignados,
  // y por el docente para ver el perfil de sus estudiantes.
  function abrirPerfilPersonaPorNombreYRol(nombre, rol) {
    if (!nombre) return;
    const objetivo = nombre.trim().toLowerCase();
    const usuarios = Store.list('usuarios');
    const usuario = usuarios.find(u => u.rol === rol && u.nombre && u.nombre.trim().toLowerCase() === objetivo);
    if (!usuario) { toast('No se encontró el perfil de ' + nombre, 'err'); return; }
    abrirPerfilPersona(usuario.id);
  }

  function abrirPerfilPersona(usuarioId) {
    const usuario = Store.list('usuarios').find(u => u.id === usuarioId);
    if (!usuario) { toast('No se encontró ese perfil', 'err'); return; }

    const iniciales = escapeHtml((usuario.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = usuario.fotoUrl
      ? `<img src="${escapeHtml(usuario.fotoUrl)}" alt="Foto de perfil" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    const esDocente = usuario.rol === 'Docente';
    const infoExtra = esDocente
      ? (() => {
          const materias = Store.list('pensum').filter(p => p.docente === usuario.nombre);
          return `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Rol</label>
              <p class="text-sm text-ink font-semibold">Docente</p>
            </div>
            ${materias.length ? `
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Materias que dicta</label>
              <p class="text-sm text-ink">${escapeHtml([...new Set(materias.map(m => m.modulo))].join(', '))}</p>
            </div>` : ''}`;
        })()
      : `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Cohorte</label>
              <p class="text-sm text-ink">${escapeHtml(usuario.cohorte || '—')}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
              ${statusPill(usuario.estado || 'Activo', ESTADO_COLORS)}
            </div>`;

    document.getElementById('perfilPersonaContenido').innerHTML = `
      <div class="flex items-center gap-5 mb-6">
        ${avatarHtml}
        <div>
          <p class="text-base font-extrabold text-ink">${escapeHtml(usuario.nombre || '')}</p>
          <p class="text-sm text-slate2">${escapeHtml(usuario.email || '')}</p>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">${infoExtra}</div>
      ${usuario.descripcion ? `
      <div class="border-t border-gray-100 pt-5">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Descripción</p>
        <p class="text-sm text-ink leading-relaxed">${escapeHtml(usuario.descripcion)}</p>
      </div>` : `
      <div class="border-t border-gray-100 pt-5">
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

  function renderAsistenciaEstudiante() {
    if (asistenciaEstudianteTimer) clearInterval(asistenciaEstudianteTimer);

    const nombre = estudianteNombre();
    const mod = estudianteModulo();
    const registros = [...Store.list('asistencia')].filter(a => a.estudiante === nombre)
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totales = { Presente: 0, Tarde: 0, Falla: 0 };
    registros.forEach(r => { if (totales[r.estado] !== undefined) totales[r.estado]++; });
    const pct = registros.length ? Math.round((totales.Presente / registros.length) * 100) : 100;

    const rows = registros.map(r => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-ink">${fmtDate(r.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.modulo)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['En proceso'] || ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'] })}${r.automatico ? '<span class="text-[10px] text-slate2 ml-2">automático</span>' : ''}</td>
      </tr>`).join('');

    let tarjetasSesiones;
    if (!mod) {
      tarjetasSesiones = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 text-center">
          <p class="text-sm text-slate2">No tienes un módulo activo asignado.</p>
        </div>`;
    } else {
      const hoy = new Date().toISOString().slice(0, 10);
      const sesionesHoy = Store.list('sesiones_asistencia').filter(s => s.cohorte === mod.nombre && s.fecha === hoy);

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
        tarjetasSesiones = sesionesHoy.map(sesion => {
          sincronizarAusentesSesion(sesion, docenteEstudiantesDeCohorte(mod.nombre));
          const info = estadoActualEstudianteSesion(sesion, nombre);
          const materiaLabel = sesion.materia || sesion.modulo;
          const yaReg = registros.find(r => r.sesionId === sesion.id);

          if (yaReg) {
            const color = yaReg.estado === 'Presente' ? '#0f8f89' : yaReg.estado === 'Tarde' ? '#b5790f' : '#F0455C';
            const texto = yaReg.estado === 'Presente' ? 'Llegaste puntual' : yaReg.estado === 'Tarde' ? 'Llegaste tarde' : 'Quedaste ausente';
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 grid place-items-center shrink-0" style="border-color:${color}">
                  <p class="text-sm font-extrabold text-center px-2" style="color:${color}">${texto}</p>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <p class="text-xs text-slate2 mt-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')} · ${fmtDate(sesion.fecha)}</p>
                </div>
              </div>`;
          }
          if (info.estado === 'Falla') {
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 border-coral grid place-items-center shrink-0">
                  <svg class="w-11 h-11 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)} — la ventana ya cerró</p>
                  <p class="text-xs text-slate2 mt-1">Quedaste registrado como ausente automáticamente. Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                </div>
              </div>`;
          }
          const ventana = estadoVentanaSesion(sesion);
          return `
            <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
              <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 grid place-items-center shrink-0">
                <svg class="w-12 h-12 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h2M19 19h1"/></svg>
              </div>
              <div class="flex-1 text-center sm:text-left">
                <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                <p class="text-xs text-slate2 mt-1 mb-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                <p class="text-xs font-bold mb-3" style="color:${ventana.color}">${ventana.texto}</p>
                <div class="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto sm:mx-0">
                  <input id="codigo_qr_estudiante_${sesion.id}" type="text" maxlength="6" placeholder="Código (ej. 7F3K9A)" class="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-morado/30" />
                  <button onclick="escanearAsistencia('${sesion.id}')" class="rounded-xl bg-ink text-white font-semibold text-sm py-2.5 px-5 hover:bg-morado transition">Escanear</button>
                </div>
              </div>
            </div>`;
        }).join('');
      }
    }

    document.getElementById('mount-s-asistencia').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">% Asistencia</p><p class="text-2xl font-extrabold text-ink mt-1">${pct}%</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Llegadas tarde</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Tarde}</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Fallas</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Falla}</p></div>
      </div>
      ${tarjetasSesiones}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Historial mensual</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Fecha</th><th class="py-3 px-4">Materia</th><th class="py-3 px-4">Estado</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes registros de asistencia.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    asistenciaEstudianteTimer = setInterval(() => {
      const panel = document.getElementById('panel-s-asistencia');
      if (panel && !panel.classList.contains('hidden')) renderAsistenciaEstudiante();
      else clearInterval(asistenciaEstudianteTimer);
    }, 15000);
  }

  function escanearAsistencia(sesionId) {
    const nombre = estudianteNombre();
    const mod = estudianteModulo();
    if (!mod) { toast('No tienes un módulo activo asignado', 'err'); return; }
    const hoy = new Date().toISOString().slice(0, 10);
    const sesion = Store.list('sesiones_asistencia').find(s => s.id === sesionId && s.cohorte === mod.nombre && s.fecha === hoy);
    if (!sesion) { toast('Esa sesión ya no está disponible', 'err'); renderAsistenciaEstudiante(); return; }
    const registros = Store.list('asistencia');
    if (registros.some(r => r.estudiante === nombre && r.sesionId === sesion.id)) {
      toast('Ya registraste tu asistencia en esta materia hoy', 'info'); renderAsistenciaEstudiante(); return;
    }
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins > VENTANA_TARDE_MIN) {
      toast('La ventana de asistencia ya cerró', 'err'); renderAsistenciaEstudiante(); return;
    }
    const input = document.getElementById('codigo_qr_estudiante_' + sesionId);
    const codigo = (input ? input.value : '').trim().toUpperCase();
    if (!codigo) { toast('Ingresa el código que muestra tu docente', 'err'); return; }
    if (codigo !== sesion.codigo) { toast('El código no coincide con el de la sesión de hoy', 'err'); return; }

    const estado = estadoPorTiempo(mins);
    registros.push({ id: uid('as'), estudiante: nombre, modulo: sesion.modulo, docente: sesion.iniciadaPor, materia: sesion.materia || sesion.modulo, fecha: sesion.fecha, estado, sesionId: sesion.id });
    Store.set('asistencia', registros);
    const msg = estado === 'Presente' ? 'Asistencia registrada: llegaste puntual.' : 'Asistencia registrada: llegaste tarde.';
    toast(msg, 'ok');
    renderAsistenciaEstudiante();
  }

  // ---------- MIS MATERIAS Y HORARIO ----------
  // Mes seleccionado por el estudiante para ver su horario (memoria de sesión)
  let estudianteHorarioMes = null;

  // ---------- Calificaciones (estudiante) — solo lectura ----------
  // Muestra, por cada docente que le sube notas en su cohorte: cuántas notas
  // hay, el porcentaje (peso) de cada una, la nota definitiva y el puesto
  // que ocupa entre sus compañeros de esa misma cohorte. Nada más.
  function renderCalificacionesEstudiante() {
    const nombre = estudianteNombre();
    const mod = estudianteModulo();

    if (!mod) {
      document.getElementById('mount-s-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes una cohorte activa asignada, así que todavía no hay calificaciones para mostrar.</p>
      </div>`;
      return;
    }

    const registros = Store.list('notas_modulos').filter(r => r.cohorte === mod.nombre);

    if (!registros.length) {
      document.getElementById('mount-s-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Tu(s) docente(s) aún no han registrado notas en <strong class="text-ink">${escapeHtml(mod.nombre)}</strong>.</p>
      </div>`;
      return;
    }

    const compañeros = docenteEstudiantesDeCohorte(mod.nombre);

    const bloques = registros.map(rec => {
      const materias = [...new Set(getSlotsDocente(rec.docente).filter(s => s.cohorte === mod.nombre).map(s => s.materia))];
      const materiaLabel = materias.length ? materias.join(', ') : mod.modulo;

      const valores = (rec.valores && rec.valores[nombre]) || {};
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
      const definitiva = resultado && !resultado.pendiente ? resultado.valor : null;

      const ranking = compañeros
        .map(u => {
          const r = calcularNotaFinal(rec, u.nombre);
          return { nombre: u.nombre, valor: r && !r.pendiente ? r.valor : null };
        })
        .filter(x => x.valor !== null)
        .sort((a, b) => b.valor - a.valor);
      const puesto = definitiva !== null ? ranking.findIndex(x => x.nombre === nombre) + 1 : null;

      return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <div class="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
            <p class="text-xs text-slate2 mt-0.5">Docente: ${nombrePersonaClicable(rec.docente, 'Docente')}</p>
          </div>
          ${definitiva !== null ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(definitiva)}1A;color:${colorCualitativa(definitiva)}">${calificacionCualitativa(definitiva)}</span>` : ''}
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
            <p class="text-2xl font-extrabold mt-1" style="color:${colorCualitativa(definitiva)}">${definitiva !== null ? definitiva.toFixed(1) : '—'}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Puesto en la cohorte</p>
            <p class="text-2xl font-extrabold text-ink mt-1">${puesto !== null ? puesto + ' de ' + ranking.length : '—'}</p>
          </div>
        </div>
      </div>`;
    }).join('');

    document.getElementById('mount-s-calificaciones').innerHTML = bloques;
  }

  function renderAcademicoEstudiante() {
    const mod = estudianteModulo();
    const pensumItems = mod ? Store.list('pensum').filter(p => p.modulo === mod.modulo) : [];
    const docentesCohorte = mod ? docentesDeCohorte(mod.nombre) : [];
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
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Temas / horario de tu módulo</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4">Docente</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-ink">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm text-slate2">${nombrePersonaClicable(p.docente, 'Docente')}</td>
              </tr>`).join('') || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no hay temas cargados para tu módulo.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      ${renderHorarioEstudianteBloque(mod)}`;
  }

  // ---------- Mi horario de clases (estudiante) ----------
  function renderHorarioEstudianteBloque(mod) {
    if (!mod) return '';
    const registros = Store.list('horarios').filter(h => h.cohorte === mod.nombre);
    if (!registros.length) {
      return `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mt-6">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Mi horario de clases</p>
        <p class="text-sm text-slate2">Tu cohorte aún no tiene un horario publicado por el administrador.</p>
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
    const celdas = registro.celdas || {};

    const filas = BLOQUES_HORARIO.map((bloque, idx) => {
      if (bloque.almuerzo) {
        return `<tr class="bg-gray-50">
          <td class="py-2 px-3 text-xs font-bold text-slate2 whitespace-nowrap">${bloque.inicio}–${bloque.fin}</td>
          <td colspan="${dias.length}" class="py-2 px-3 text-center text-xs font-extrabold tracking-widest uppercase text-slate2">Almuerzo</td>
        </tr>`;
      }
      const celdasHtml = dias.map(dia => {
        const c = celdas[celdaKey(dia, idx)] || {};
        return `<td class="py-2 px-3 align-top">
          <p class="text-xs font-semibold text-ink">${escapeHtml(c.materia || '—')}</p>
          <p class="text-[11px] text-slate2">${nombrePersonaClicable(c.docente, 'Docente')}</p>
        </td>`;
      }).join('');
      return `<tr class="border-b border-gray-50">
        <td class="py-2 px-3 text-xs font-bold text-slate2 whitespace-nowrap align-top">${bloque.inicio}–${bloque.fin}</td>
        ${celdasHtml}
      </tr>`;
    }).join('');

    return `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mt-6">
      <div class="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2">Mi horario de clases</p>
        <select onchange="onCambiaMesEstudianteHorario(this.value)" class="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-oro/30">
          ${meses.map(m => `<option value="${m}" ${m === estudianteHorarioMes ? 'selected' : ''}>${mesLabel(m)}</option>`).join('')}
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
            <th class="py-2 px-3">Horas</th>${dias.map(d => `<th class="py-2 px-3">${d}</th>`).join('')}
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
  }

  function onCambiaMesEstudianteHorario(mes) {
    estudianteHorarioMes = mes;
    renderAcademicoEstudiante();
  }

  // ---------- PENSUM CURRICULAR ----------
  function renderPensumEstudiante() {
    const mod = estudianteModulo();
    const pensumItems = [...Store.list('pensum')].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    document.getElementById('mount-s-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <div class="flex items-center justify-between px-6 pt-5 pb-2">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Pensum de ${mod ? escapeHtml(mod.modulo) : 'tu módulo'}</p>
          <button onclick="descargarPensumEstudiante()" class="text-xs font-semibold text-white bg-ink hover:bg-morado transition rounded-full px-4 py-2">Descargar PDF</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">#</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4">Material</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-slate2">${p.orden}</td>
                <td class="py-3 px-4 text-sm text-ink">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verArchivoPensum('${p.id}')" class="text-xs font-semibold text-morado hover:underline">📎 ${escapeHtml(p.archivoNombre || 'Ver archivo')}</button>` : '<span class="text-xs text-slate2">Sin archivo</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Sin temas registrados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function descargarPensumEstudiante() {
    const mod = estudianteModulo();
    const pensumItems = [...Store.list('pensum')].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    const win = window.open('', '_blank');
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
  function renderMemorandosEstudiante() {
    const doc = currentEstudiante || {};
    const email = (doc.email || '').toLowerCase();
    const memos = memorandosParaEstudiante();
    document.getElementById('mount-s-memorandos').innerHTML = `
      <div class="space-y-4">
        ${memos.map(m => {
          const noLeido = !memorandoLeidoPorEmail(m.id, email);
          const extracto = (m.contenido || '').replace(/\s+/g, ' ').slice(0, 220);
          const truncado = (m.contenido || '').length > 220 ? '…' : '';
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
                <p class="text-sm text-slate2">${escapeHtml(extracto)}${truncado}</p>
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
    const registros = Store.list('pqr');
    registros.push({
      id: uid('pq'), tipo, solicitante, remitenteRol, asunto,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'Pendiente', fechaActivacion: null,
      archivoNombre: file.name, archivoTipo: file.type || 'application/pdf', archivoDatos,
    });
    Store.set('pqr', registros);
    fileInput.value = '';
    return true;
  }

  // Fila reutilizable de "mis solicitudes" (Docente y Estudiante).
  function filaPqrPropia(p) {
    return `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.tipo)}</td>
        <td class="py-3 px-4 text-sm text-ink">${escapeHtml(p.asunto)}</td>
        <td class="py-3 px-4">${statusPill(p.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verPqrPropia('${p.id}')" class="text-xs font-semibold text-morado hover:underline">📎 ${escapeHtml(p.archivoNombre || 'Ver PDF')}</button>` : '—'}</td>
      </tr>`;
  }

  // Abre en una pestaña nueva el PDF que el propio Docente/Estudiante envió.
  function verPqrPropia(id) {
    const p = Store.list('pqr').find(r => r.id === id);
    if (!p || !p.archivoDatos) { toast('No se encontró el archivo', 'err'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.asunto;
  }

  function renderPqrEstudiante() {
    const nombre = estudianteNombre();
    const propias = [...Store.list('pqr')].filter(p => p.solicitante === nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
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
        <button onclick="enviarPqrEstudiante()" class="mt-4 rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Mis solicitudes</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  async function enviarPqrEstudiante() {
    const ok = await subirPqrArchivo({ tipoId: 'pqr_tipo', asuntoId: 'pqr_asunto', fileId: 'pqr_archivo', solicitante: estudianteNombre(), remitenteRol: 'Estudiante' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrEstudiante();
  }

  // ---------- REUNIONES VIRTUALES ----------
  function renderReunionesEstudiante() {
    const nombre = estudianteNombre();
    const reuniones = [...Store.list('reuniones')].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const asistenciaReuniones = Store.get('reuniones_asistencia_' + nombre) || {};
    document.getElementById('mount-s-reuniones').innerHTML = `
      <div class="space-y-4">
        ${reuniones.map(r => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(r.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${fmtDate(r.fecha)} · ${escapeHtml(r.hora)} · ${escapeHtml(r.participantes)}</p>
            </div>
            <div class="flex items-center gap-3">
              ${statusPill(r.estado, ESTADO_COLORS)}
              <button onclick="unirseReunionEstudiante('${r.id}')" class="text-xs font-semibold text-white bg-ink hover:bg-morado transition rounded-full px-4 py-2">${asistenciaReuniones[r.id] ? 'Asistencia registrada ✓' : 'Unirme'}</button>
            </div>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No hay reuniones programadas.</p>'}
      </div>`;
  }

  function unirseReunionEstudiante(id) {
    const nombre = estudianteNombre();
    const key = 'reuniones_asistencia_' + nombre;
    const asistencia = Store.get(key) || {};
    asistencia[id] = true;
    Store.set(key, asistencia);
    const reunion = Store.list('reuniones').find(r => r.id === id);
    if (reunion && reunion.enlace) window.open(reunion.enlace, '_blank');
    toast('Tu asistencia a la reunión se registró automáticamente', 'ok');
    renderReunionesEstudiante();
  }

  // "Calendario institucional" fue eliminado del panel Estudiante.

  // ---------- ENCUESTAS DE SATISFACCIÓN ----------
  function renderEncuestasEstudiante() {
    const nombre = estudianteNombre();
    const encuestas = Store.list('encuestas');
    const respuestas = Store.list('encuestas_respuestas').filter(r => r.estudiante === nombre);
    document.getElementById('mount-s-encuestas').innerHTML = `
      <div class="grid sm:grid-cols-2 gap-4">
        ${encuestas.map(e => {
          const respondida = respuestas.find(r => r.encuestaId === e.id);
          return `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-sm font-bold text-ink">${escapeHtml(e.titulo)}</p>
              ${statusPill(e.estado, ESTADO_COLORS)}
            </div>
            <p class="text-xs text-slate2 mb-3">${fmtDate(e.fecha)}</p>
            ${respondida
              ? `<p class="text-xs font-semibold text-turquesa">Ya respondiste — calificación: ${respondida.calificacion}/5</p>`
              : `<div class="flex items-center gap-1 mb-3" id="stars_${e.id}">${[1,2,3,4,5].map(n => `<button onclick="calificarEncuesta('${e.id}',${n})" class="text-xl text-oro/30 hover:text-oro transition">★</button>`).join('')}</div>
                 <p class="text-xs text-slate2">Toca una estrella para responder</p>`}
          </div>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8 sm:col-span-2">No hay encuestas disponibles.</p>'}
      </div>`;
  }

  function calificarEncuesta(encuestaId, calificacion) {
    const registros = Store.list('encuestas_respuestas');
    registros.push({ id: uid('er'), estudiante: estudianteNombre(), encuestaId, calificacion, fecha: new Date().toISOString().slice(0, 10) });
    Store.set('encuestas_respuestas', registros);
    toast('Gracias por responder la encuesta', 'ok');
    renderEncuestasEstudiante();
  }

  // ---------- AGENDA PERSONAL INTELIGENTE ----------
  function renderAgendaEstudiante() {
    const nombre = estudianteNombre();
    const eventos = [...Store.list('agenda_estudiante')].filter(a => a.estudiante === nombre).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    document.getElementById('mount-s-agenda').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          <select id="ag_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30">
            <option>Taller</option><option>Quiz</option><option>Entrega</option><option>Evento</option><option>Recordatorio</option>
          </select>
          <input id="ag_fecha" type="date" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
        </div>
        <button onclick="agregarEventoAgenda()" class="rounded-xl bg-ink text-white font-semibold text-sm py-3 px-6 hover:bg-black transition">Agregar</button>
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

  function agregarEventoAgenda() {
    const titulo = document.getElementById('ag_titulo').value.trim();
    const tipo = document.getElementById('ag_tipo').value;
    const fecha = document.getElementById('ag_fecha').value;
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = Store.list('agenda_estudiante');
    registros.push({ id: uid('ag'), estudiante: estudianteNombre(), titulo, tipo, fecha, hora: '', notas: '' });
    Store.set('agenda_estudiante', registros);
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaEstudiante();
  }

  function eliminarEventoAgenda(id) {
    const registros = Store.list('agenda_estudiante').filter(a => a.id !== id);
    Store.set('agenda_estudiante', registros);
    toast('Evento eliminado', 'ok');
    renderAgendaEstudiante();
  }

  const RENDERERS_ESTUDIANTE = {
    resumen: renderResumenEstudiante,
    perfil: renderPerfilEstudiante,
    asistencia: renderAsistenciaEstudiante,
    academico: renderAcademicoEstudiante,
    calificaciones: renderCalificacionesEstudiante,
    pensum: renderPensumEstudiante,
    memorandos: renderMemorandosEstudiante,
    pqr: renderPqrEstudiante,
    reuniones: renderReunionesEstudiante,
    encuestas: renderEncuestasEstudiante,
    agenda: renderAgendaEstudiante,
  };
  // Si la URL trae ?qr=... (viene de escanear un código impreso con la
  // cámara), toma el control ANTES que cualquier otra cosa.
  manejarQrEnURL();

  // Pinta el sitio público (Contáctanos + botón Postular) con lo que el
  // Superadmin haya guardado en Configuración. Se ejecuta al cargar la
  // página para que cualquier visitante vea siempre los datos vigentes.
  seedIfEmpty();
  // Limpieza única: 'alumnos_cohorte' fue una entidad de prueba del
  // simulador de roles (ya retirado) que llegó a guardar alumnos ficticios
  // en el localStorage de instalaciones anteriores. Se borra para dejar
  // la base de datos local realmente en blanco.
  localStorage.removeItem(DB_PREFIX + 'alumnos_cohorte');
  renderContactoPublico();
  actualizarBotonesPostular();