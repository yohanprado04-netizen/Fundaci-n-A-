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
  // ---------- Login inline (Calificaciones) — 4 perfiles separados ----------
  // Cada perfil tiene sus propias credenciales; ya no se "adivina" el rol
  // probando contra todos los usuarios. El selector de pestañas define qué
  // credenciales se validan en submitLogin().
  //
  // 1) Superadmin: cuenta única y fija (control total de la plataforma).
  const SUPERADMIN_CREDENTIALS = { email: 'superadmin@aplus.org', password: 'Super2026#' };
  // 2) Administración: cualquier usuario con rol "Coordinador" en el Store
  //    (ver SEED.usuarios, ej. diana.rios@aplus.org) + esta contraseña.
  const ADMIN_DEMO_PASSWORD = 'coordinacion2026';
  // 3) Profesores: cualquier usuario con rol "Docente" (ej. ovidio.perea@aplus.org).
  const DOCENTE_DEMO_PASSWORD = 'docente2026';
  // 4) Estudiantes: cualquier usuario con rol "Estudiante" (ej. loren.restrepo@aplus.org).
  const ESTUDIANTE_DEMO_PASSWORD = 'estudiante2026';

  let currentDocente = null;
  let currentEstudiante = null;
  let currentAdminRole = null; // 'superadmin' | 'administracion'
  let loginRole = 'estudiante';

  const LOGIN_ROLE_HINTS = {
    superadmin: 'Acceso total a la plataforma. Demo: superadmin@aplus.org / Super2026#',
    administracion: 'Coordinación académica. Demo: diana.rios@aplus.org / coordinacion2026',
    docente: 'Panel docente. Demo: ovidio.perea@aplus.org / docente2026',
    estudiante: 'Panel del estudiante. Demo: loren.restrepo@aplus.org / estudiante2026',
  };

  function setLoginRole(role) {
    loginRole = role;
    document.querySelectorAll('.login-role-tab').forEach(btn => {
      const active = btn.dataset.role === role;
      btn.classList.toggle('bg-ink', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('border-ink', active);
      btn.classList.toggle('border-gray-200', !active);
      btn.classList.toggle('text-slate2', !active);
    });
    document.getElementById('loginRoleHint').textContent = LOGIN_ROLE_HINTS[role] || '';
    document.getElementById('loginError').classList.add('hidden');
  }

  function submitLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    if (!email || !password) {
      errorEl.textContent = 'Completa tu correo y contraseña para continuar.';
      errorEl.classList.remove('hidden');
      return;
    }
    seedIfEmpty();

    if (loginRole === 'superadmin') {
      if (email.toLowerCase() === SUPERADMIN_CREDENTIALS.email && password === SUPERADMIN_CREDENTIALS.password) {
        errorEl.classList.add('hidden');
        currentAdminRole = 'superadmin';
        document.getElementById('siteView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        applyAdminRoleUI();
        initAdmin();
        showPanel('resumen');
        window.scrollTo(0, 0);
        return;
      }
    } else if (loginRole === 'administracion') {
      const coordinador = Store.list('usuarios').find(u =>
        u.rol === 'Coordinador' && u.email.toLowerCase() === email.toLowerCase());
      if (coordinador && password === ADMIN_DEMO_PASSWORD) {
        errorEl.classList.add('hidden');
        currentAdminRole = 'administracion';
        document.getElementById('siteView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        applyAdminRoleUI(coordinador);
        initAdmin();
        showPanel('resumen');
        window.scrollTo(0, 0);
        return;
      }
    } else if (loginRole === 'docente') {
      const docente = Store.list('usuarios').find(u =>
        u.rol === 'Docente' && u.email.toLowerCase() === email.toLowerCase());
      if (docente && password === DOCENTE_DEMO_PASSWORD) {
        errorEl.classList.add('hidden');
        currentDocente = docente;
        document.getElementById('siteView').classList.add('hidden');
        document.getElementById('teacherView').classList.remove('hidden');
        showPanelDocente('resumen');
        window.scrollTo(0, 0);
        return;
      }
    } else if (loginRole === 'estudiante') {
      const estudiante = Store.list('usuarios').find(u =>
        u.rol === 'Estudiante' && u.email.toLowerCase() === email.toLowerCase());
      if (estudiante && password === ESTUDIANTE_DEMO_PASSWORD) {
        errorEl.classList.add('hidden');
        currentEstudiante = estudiante;
        document.getElementById('siteView').classList.add('hidden');
        document.getElementById('studentView').classList.remove('hidden');
        initEstudiante();
        showPanelEstudiante('resumen');
        window.scrollTo(0, 0);
        return;
      }
    }

    errorEl.textContent = 'Credenciales incorrectas para el perfil "' + (LOGIN_ROLE_LABELS[loginRole] || loginRole) + '". Verifica el correo y la contraseña.';
    errorEl.classList.remove('hidden');
  }

  const LOGIN_ROLE_LABELS = {
    superadmin: 'Superadmin', administracion: 'Administración', docente: 'Profesores', estudiante: 'Estudiantes'
  };

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
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function logoutDocente() {
    currentDocente = null;
    document.getElementById('teacherView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    window.scrollTo(0, 0);
  }

  function logoutEstudiante() {
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
  const SEED = {
    usuarios: [
      { id: uid('u'), nombre: 'Loren Liseth Restrepo', email: 'loren.restrepo@aplus.org', rol: 'Estudiante', cohorte: 'Cohorte Agosto 2026', estado: 'Activo' },
      { id: uid('u'), nombre: 'Mateo Córdoba Palacios', email: 'mateo.cordoba@aplus.org', rol: 'Estudiante', cohorte: 'Cohorte Agosto 2026', estado: 'Activo' },
      { id: uid('u'), nombre: 'Ana Sofía Mosquera', email: 'ana.mosquera@aplus.org', rol: 'Estudiante', cohorte: 'Cohorte Agosto 2026', estado: 'Activo' },
      { id: uid('u'), nombre: 'Kevin Andrés Mena', email: 'kevin.mena@aplus.org', rol: 'Estudiante', cohorte: 'Cohorte Julio 2026', estado: 'Activo' },
      { id: uid('u'), nombre: 'Ovidio Perea', email: 'ovidio.perea@aplus.org', rol: 'Docente', cohorte: 'Base de Datos', estado: 'Activo' },
      { id: uid('u'), nombre: 'Diana Carolina Ríos', email: 'diana.rios@aplus.org', rol: 'Coordinador', cohorte: '—', estado: 'Activo' },
    ],
    modulos: [
      { id: uid('m'), nombre: 'Cohorte Agosto 2026', modulo: 'Fundamentos de Programación', docente: 'Ovidio Perea', fechaInicio: '2026-08-03', fechaFin: '2026-09-25', cupos: 30, inscritos: 24, estado: 'En curso' },
      { id: uid('m'), nombre: 'Cohorte Julio 2026', modulo: 'Base de Datos', docente: 'Ovidio Perea', fechaInicio: '2026-07-06', fechaFin: '2026-08-14', cupos: 28, inscritos: 26, estado: 'En curso' },
      { id: uid('m'), nombre: 'Cohorte Mayo 2026', modulo: 'Desarrollo Web', docente: 'Diana Carolina Ríos', fechaInicio: '2026-05-04', fechaFin: '2026-06-26', cupos: 25, inscritos: 25, estado: 'Finalizada' },
    ],
    pensum: [
      { id: uid('p'), modulo: 'Fundamentos de Programación', tema: 'Lógica y algoritmos', horas: 20, docente: 'Ovidio Perea', orden: 1 },
      { id: uid('p'), modulo: 'Fundamentos de Programación', tema: 'Estructuras de datos', horas: 16, docente: 'Ovidio Perea', orden: 2 },
      { id: uid('p'), modulo: 'Base de Datos', tema: 'Modelo relacional y SQL', horas: 24, docente: 'Ovidio Perea', orden: 1 },
      { id: uid('p'), modulo: 'Desarrollo Web', tema: 'HTML, CSS y JavaScript', horas: 30, docente: 'Diana Carolina Ríos', orden: 1 },
    ],
    memorandos: [
      { id: uid('mm'), titulo: 'Actualización de horarios módulo agosto', destinatario: 'Cohorte Agosto 2026', fecha: '2026-07-20', estado: 'Enviado', contenido: 'Se informa el nuevo horario de clases a partir de la próxima semana.' },
      { id: uid('mm'), titulo: 'Recordatorio de entrega de talleres', destinatario: 'Todos los docentes', fecha: '2026-07-22', estado: 'Enviado', contenido: 'Favor calificar los talleres pendientes antes del viernes.' },
      { id: uid('mm'), titulo: 'Seguimiento al desempeño en el programa Training de 100 a 1000+', destinatario: 'loren.restrepo@aplus.org', fecha: '2026-07-22', estado: 'Enviado', contenido: 'La Fundación A+, en el marco del programa Training de 100 a 1000+, valora tu participación y el compromiso demostrado durante el proceso de formación integral.\nA la fecha se ha completado aproximadamente el 50% de la primera fase del programa, denominada fase de Fundamentación. En este contexto, consideramos importante y pertinente compartir información particular sobre tu desempeño, así como algunas recomendaciones orientadas a fortalecer tu proceso de aprendizaje y promover tu mejoramiento continuo en búsqueda de la excelencia personal y profesional.' },
    ],
    // PQR: cada solicitud se envía como archivo PDF (la enviaron Docente o
    // Estudiante). estado empieza en 'Pendiente' y pasa a 'Activo' de forma
    // automática la primera vez que el administrador abre/descarga el PDF
    // (ver descargarPqrAdmin). No se edita manualmente.
    pqr: [
      { id: uid('pq'), tipo: 'Petición', solicitante: 'Kevin Andrés Mena', remitenteRol: 'Estudiante', asunto: 'Certificado de estudios', fecha: '2026-07-21', estado: 'Pendiente', fechaActivacion: null, archivoNombre: 'peticion-certificado-kevin-mena.pdf', archivoTipo: 'application/pdf', archivoDatos: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMzI4ID4+CnN0cmVhbQpCVCAvRjEgMTYgVGYgNzIgNzYwIFRkIChQZXRpY2lvbiAtIENlcnRpZmljYWRvIGRlIGVzdHVkaW9zKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNzIwIFRkIChTb2xpY2l0YW50ZTogS2V2aW4gQW5kcmVzIE1lbmEpIFRqIEVUCkJUIC9GMSAxMSBUZiA3MiA3MDAgVGQgKFRpcG86IFBldGljaW9uKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNjgwIFRkIChGZWNoYTogMjAyNi0wNy0yMSkgVGogRVQKQlQgL0YxIDExIFRmIDcyIDY2MCBUZCAoKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNjQwIFRkIChTb2xpY2l0byBjZXJ0aWZpY2FkbyBwYXJhIHRyYW1pdGUgbGFib3JhbC4pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDAzMTEgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo2OTAKJSVFT0Y=' },
      { id: uid('pq'), tipo: 'Queja', solicitante: 'Ovidio Perea', remitenteRol: 'Docente', asunto: 'Conectividad en clase virtual', fecha: '2026-07-19', estado: 'Activo', fechaActivacion: '2026-07-20', archivoNombre: 'queja-conectividad-ovidio-perea.pdf', archivoTipo: 'application/pdf', archivoDatos: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMzg2ID4+CnN0cmVhbQpCVCAvRjEgMTYgVGYgNzIgNzYwIFRkIChRdWVqYSAtIENvbmVjdGl2aWRhZCBlbiBjbGFzZSB2aXJ0dWFsKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNzIwIFRkIChTb2xpY2l0YW50ZTogT3ZpZGlvIFBlcmVhKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNzAwIFRkIChSb2w6IERvY2VudGUpIFRqIEVUCkJUIC9GMSAxMSBUZiA3MiA2ODAgVGQgKFRpcG86IFF1ZWphKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNjYwIFRkIChGZWNoYTogMjAyNi0wNy0xOSkgVGogRVQKQlQgL0YxIDExIFRmIDcyIDY0MCBUZCAoKSBUaiBFVApCVCAvRjEgMTEgVGYgNzIgNjIwIFRkIChMYSBzYWxhIHZpcnR1YWwgcHJlc2VudG8gZmFsbGFzIGR1cmFudGUgbGEgc2VzaW9uIGRlbCBtYXJ0ZXMuKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwMzExIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNzQ4CiUlRU9G' },
    ],
    reuniones: [
      { id: uid('r'), titulo: 'Comité académico mensual', fecha: '2026-08-01', hora: '09:00', enlace: 'https://meet.google.com/aplus-comite', participantes: 'Coordinación, Docentes', estado: 'Programada' },
      { id: uid('r'), titulo: 'Seguimiento estudiantes en riesgo', fecha: '2026-07-29', hora: '15:00', enlace: 'https://meet.google.com/aplus-riesgo', participantes: 'Coordinación, Ovidio Perea', estado: 'Programada' },
    ],
    calificaciones: [
      { id: uid('g'), estudiante: 'Loren Liseth Restrepo', modulo: 'Fundamentos de Programación', nota: 4.9, fecha: '2026-07-18' },
      { id: uid('g'), estudiante: 'Mateo Córdoba Palacios', modulo: 'Fundamentos de Programación', nota: 4.8, fecha: '2026-07-18' },
      { id: uid('g'), estudiante: 'Ana Sofía Mosquera', modulo: 'Fundamentos de Programación', nota: 4.7, fecha: '2026-07-18' },
      { id: uid('g'), estudiante: 'Kevin Andrés Mena', modulo: 'Base de Datos', nota: 2.8, fecha: '2026-07-17' },
    ],
    // "encuestas" (Encuestas de satisfacción) fue eliminado del sitio: ya no
    // existe en el panel Admin ni en el panel Estudiante.
    materiales: [
      { id: uid('mt'), modulo: 'Fundamentos de Programación', tipo: 'PDF', titulo: 'Guía 1 — Lógica y algoritmos', mes: 'Agosto 2026', fecha: '2026-08-04' },
      { id: uid('mt'), modulo: 'Fundamentos de Programación', tipo: 'Video', titulo: 'Introducción a pseudocódigo', mes: 'Agosto 2026', fecha: '2026-08-05' },
      { id: uid('mt'), modulo: 'Base de Datos', tipo: 'Taller', titulo: 'Taller de consultas SQL básicas', mes: 'Julio 2026', fecha: '2026-07-10' },
      { id: uid('mt'), modulo: 'Base de Datos', tipo: 'PDF', titulo: 'Modelo entidad-relación (teoría)', mes: 'Julio 2026', fecha: '2026-07-08' },
      { id: uid('mt'), modulo: 'Desarrollo Web', tipo: 'Ejercicio', titulo: 'Maquetación con Flexbox', mes: 'Mayo 2026', fecha: '2026-05-12' },
    ],
    asistencia: [
      { id: uid('as'), estudiante: 'Loren Liseth Restrepo', modulo: 'Fundamentos de Programación', fecha: '2026-07-20', estado: 'Presente' },
      { id: uid('as'), estudiante: 'Loren Liseth Restrepo', modulo: 'Fundamentos de Programación', fecha: '2026-07-21', estado: 'Presente' },
      { id: uid('as'), estudiante: 'Loren Liseth Restrepo', modulo: 'Fundamentos de Programación', fecha: '2026-07-22', estado: 'Tarde' },
      { id: uid('as'), estudiante: 'Kevin Andrés Mena', modulo: 'Base de Datos', fecha: '2026-07-20', estado: 'Falla' },
      { id: uid('as'), estudiante: 'Kevin Andrés Mena', modulo: 'Base de Datos', fecha: '2026-07-21', estado: 'Presente' },
    ],
    insignias_estudiantes: [
      { id: uid('ie'), estudiante: 'Loren Liseth Restrepo', insignia: 'Primeros pasos', fecha: '2026-07-10' },
      { id: uid('ie'), estudiante: 'Loren Liseth Restrepo', insignia: 'Asistencia perfecta', fecha: '2026-07-24' },
    ],
    agenda_estudiante: [
      { id: uid('ag'), estudiante: 'Loren Liseth Restrepo', titulo: 'Quiz de lógica de programación', tipo: 'Quiz', fecha: '2026-08-06', hora: '10:00', notas: 'Temas 1 y 2 del pensum.' },
      { id: uid('ag'), estudiante: 'Loren Liseth Restrepo', titulo: 'Entrega taller de algoritmos', tipo: 'Entrega', fecha: '2026-08-10', hora: '23:59', notas: '' },
    ],
    correos_estudiante: [
      { id: uid('co'), estudiante: 'Loren Liseth Restrepo', de: 'Coordinación Académica', asunto: 'Bienvenida a la Cohorte Agosto 2026', fecha: '2026-08-01', leido: false, contenido: 'Te damos la bienvenida al programa. Revisa tu horario y materiales en la plataforma.' },
      { id: uid('co'), estudiante: 'Loren Liseth Restrepo', de: 'Ovidio Perea', asunto: 'Material de la próxima clase', fecha: '2026-08-03', leido: false, contenido: 'Adjunto encontrarás la guía de lógica y algoritmos para la sesión del lunes.' },
    ],
    semaforo_overrides: {},
    configuracion: {
      nombre: 'Fundación A+',
      ciudad: 'Quibdó',
      correo: 'contacto@fundacionaplus.org',
      telefono: '+57 300 000 0000',
      cupoMaximo: 30,
      notasMinimaAprobacion: 3.0,
      asistenciaMinima: 80,
      notificacionesEmail: true,
      notificacionesIA: true
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
    Object.keys(SEED).forEach(key => localStorage.removeItem(DB_PREFIX + key));
    seedIfEmpty();
    Object.keys(RENDERERS).forEach(p => RENDERERS[p]());
    toast('Datos de demostración restaurados', 'ok');
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
        // Las opciones reales de "rol" se calculan en openModal() a partir de
        // ROLES_CREACION_USUARIO (siempre Estudiante/Docente, al crear Y al editar).
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
        { key: 'docente', label: 'Docente responsable', type: 'text' },
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

  // Roles que el administrador puede asignar al CREAR un usuario nuevo.
  // Coordinador/Administrador solo se crean por otras vías (p. ej. "Crear Cohorte + Administrador").
  const ROLES_CREACION_USUARIO = ['Estudiante', 'Docente'];

  function openModal(entity, id) {
    const schema = SCHEMAS[entity];
    if (!schema) return;
    modalCtx = { entity, id: id || null };
    const record = id ? Store.list(entity).find(r => r.id === id) : null;

    document.getElementById('modalEyebrow').textContent = id ? 'Editar' : 'Crear nuevo';
    document.getElementById('modalTitle').textContent = schema.label;

    const form = document.getElementById('modalForm');
    form.innerHTML = schema.fields.map(f => {
      const val = record ? record[f.key] : (f.default !== undefined ? f.default : '');
      const idAttr = 'field_' + f.key;
      if (f.type === 'select') {
        // El rol solo puede ser Estudiante o Docente, tanto al crear como al editar
        // (Coordinador/Administrador se crean solo por "Crear Cohorte + Administrador").
        let opciones = f.options;
        if (entity === 'usuarios' && f.key === 'rol') {
          opciones = ROLES_CREACION_USUARIO;
        } else if (entity === 'usuarios' && f.key === 'cohorte') {
          // Cohortes existentes, tomadas de las que ya armó el administrador (Store 'modulos').
          opciones = Store.list('modulos').map(m => m.nombre);
          if (val && !opciones.includes(val)) opciones = [val, ...opciones]; // conserva un valor legado que ya no exista
          opciones = ['', ...opciones]; // primera opción = sin asignar
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
      return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
        <input id="${idAttr}" type="${f.type}" ${step} value="${escapeHtml(val)}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30" /></div>`;
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

  // Usuario "activo" en la simulación de roles.
  // role: 'superadmin' -> sin filtro, ve todas las cohortes.
  // role: 'admin'      -> filtrado estricto por cohorteId.
  let usuarioSimulado = { role: 'superadmin', cohorteId: null, nombre: 'Superadmin (control total)' };

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
    if (passwordAdmin.length < 4) { toast('La contraseña debe tener al menos 4 caracteres', 'err'); return null; }

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

    // ---- 4) Alumnos demo de la cohorte, SOLO para ilustrar el aislamiento en el simulador ----
    const alumnosDemo = Store.list('alumnos_cohorte');
    ['Alumno demo 1', 'Alumno demo 2'].forEach((n, i) => {
      alumnosDemo.push({ id: uid('al'), cohorteId, nombre: n + ' — ' + nombreCohorte, promedio: (3.5 + i * 0.6).toFixed(1) });
    });
    Store.save('alumnos_cohorte', alumnosDemo);

    toast('Cohorte "' + nombreCohorte + '" creada con administrador ' + nombreAdmin, 'ok');

    if (RENDERERS['modulos']) RENDERERS['modulos']();
    renderSimuladorRoles();

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

  // ---------- Reglas de aislamiento: qué ve cada rol ----------
  // Estas dos funciones son el corazón del "multi-tenant básico": todo
  // el resto de la UI (tablas, métricas, alumnos, calificaciones...)
  // debería consultar SIEMPRE a través de funciones como estas, nunca
  // leer Store.list(...) directo, para que el filtro no se pueda saltar.
  function getCohortesVisibles() {
    const todas = Store.list('modulos');
    if (usuarioSimulado.role === 'superadmin') return todas; // control total
    return todas.filter(c => c.cohorteId === usuarioSimulado.cohorteId); // SOLO la suya
  }
  function getAlumnosVisibles() {
    const todos = Store.list('alumnos_cohorte');
    if (usuarioSimulado.role === 'superadmin') return todos;
    return todos.filter(a => a.cohorteId === usuarioSimulado.cohorteId);
  }

  // ---------- Simulador de roles (botones de prueba) ----------
  function simularSuperadmin() {
    usuarioSimulado = { role: 'superadmin', cohorteId: null, nombre: 'Superadmin (control total)' };
    renderSimuladorRoles();
  }
  function simularAdmin(cohorteId) {
    const admin = Store.list('administradores').find(a => a.cohorteId === cohorteId);
    if (!admin) return;
    usuarioSimulado = { role: 'admin', cohorteId: cohorteId, nombre: admin.nombre };
    renderSimuladorRoles();
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
      <div id="mount-simulador-roles" class="admin-panel-card p-6 mb-6"></div>
    `;

    renderSimuladorRoles();
  }

  // ---------- Render: Simulador de roles + vista filtrada en vivo ----------
  function renderSimuladorRoles() {
    const mount = document.getElementById('mount-simulador-roles');
    if (!mount) return; // el panel "Cohortes" aún no se ha montado en el DOM

    const admins = Store.list('administradores');

    const botonSuper = `
      <button onclick="simularSuperadmin()" class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${usuarioSimulado.role === 'superadmin' ? 'bg-ink text-white' : 'border border-gray-200 text-slate2 hover:bg-gray-50'}">
        Superadmin
      </button>`;

    const botonesAdmins = admins.map(a => {
      const activo = usuarioSimulado.role === 'admin' && usuarioSimulado.cohorteId === a.cohorteId;
      return `<button onclick="simularAdmin('${a.cohorteId}')" class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${activo ? 'bg-morado text-white' : 'border border-gray-200 text-slate2 hover:bg-gray-50'}">
        Admin: ${escapeHtml(a.nombre)}
      </button>`;
    }).join('');

    const cohortesVisibles = getCohortesVisibles();
    const alumnosVisibles = getAlumnosVisibles();

    const listaCohortes = cohortesVisibles.map(c =>
      `<li class="py-2 border-b border-gray-50 last:border-0 text-sm text-ink font-medium">${escapeHtml(c.nombre)}</li>`
    ).join('') || '<li class="py-4 text-sm text-slate2 text-center">No hay cohortes visibles para este rol.</li>';

    const listaAlumnos = alumnosVisibles.map(a =>
      `<li class="py-2 border-b border-gray-50 last:border-0 text-sm text-slate2 flex justify-between"><span>${escapeHtml(a.nombre)}</span><span class="font-semibold text-ink">${a.promedio}</span></li>`
    ).join('') || '<li class="py-4 text-sm text-slate2 text-center">No hay alumnos visibles para este rol.</li>';

    mount.innerHTML = `
      <h2 class="text-lg font-extrabold text-ink mb-1">Simulador de roles</h2>
      <p class="text-sm text-slate2 mb-4 pb-5 border-b border-gray-100">Cambia de usuario de prueba y verifica que un Administrador Normal SOLO ve los datos de su propia cohorte.</p>
      <div class="flex flex-wrap gap-2 mb-6">${botonSuper}${botonesAdmins}</div>
      <div class="rounded-xl bg-morado/5 border border-morado/10 p-4 mb-5">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2">Sesión simulada actual</p>
        <p class="text-sm font-semibold text-ink mt-1">
          ${escapeHtml(usuarioSimulado.nombre)}
          ${usuarioSimulado.role === 'superadmin'
            ? '· Ve todas las cohortes (sin filtro)'
            : '· Filtrado por cohorteId: <span class="font-mono text-xs">' + escapeHtml(usuarioSimulado.cohorteId) + '</span>'}
        </p>
      </div>
      <div class="grid sm:grid-cols-2 gap-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Cohortes visibles (${cohortesVisibles.length})</p>
          <ul>${listaCohortes}</ul>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Alumnos visibles (${alumnosVisibles.length})</p>
          <ul>${listaAlumnos}</ul>
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
        <button onclick="resetDemoData()" class="text-xs font-semibold text-slate2 hover:text-ink transition">Restaurar datos de demostración</button>
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
    const records = Store.list('usuarios');
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
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(m.modulo)}</td>
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
              <th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Módulo</th><th class="py-2.5 px-4">Fechas</th><th class="py-2.5 px-4">Cupos</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(7)}</tbody>
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

  // ---------- RENDER: Encuestas de satisfacción ----------
  function renderEncuestas() {
    const puedeEditar = currentAdminRole === 'superadmin';
    const records = Store.list('encuestas');
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
      </div>`;
  }

  function saveConfiguracion() {
    const cfg = {
      nombre: document.getElementById('cfg_nombre').value.trim(),
      ciudad: document.getElementById('cfg_ciudad').value.trim(),
      correo: document.getElementById('cfg_correo').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim(),
      cupoMaximo: parseFloat(document.getElementById('cfg_cupo').value) || 0,
      notasMinimaAprobacion: parseFloat(document.getElementById('cfg_nota').value) || 0,
      asistenciaMinima: parseFloat(document.getElementById('cfg_asistencia').value) || 0,
      notificacionesEmail: document.getElementById('cfg_notifEmail').checked,
      notificacionesIA: document.getElementById('cfg_notifIA').checked,
    };
    Store.set('configuracion', cfg);
    toast('Configuración guardada', 'ok');
    renderSemaforo();
    renderResumen();
  }

  const RENDERERS = {
    resumen: renderResumen,
    usuarios: renderUsuarios,
    modulos: renderModulos,
    pensum: renderPensum,
    semaforo: renderSemaforo,
    memorandos: renderMemorandos,
    pqr: renderPqr,
    reuniones: renderReuniones,
    calificaciones: renderCalificaciones,
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
        <h2 class="text-base font-extrabold text-ink mb-1">Bienvenido, ${escapeHtml(doc.nombre || 'Docente')}</h2>
        <p class="text-sm text-slate2 mb-4">${escapeHtml(doc.email || '')} · Este es tu panel docente.</p>
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

  // ---------- RENDER: Asistencia (QR) — docente ----------
  let docenteAsistCohorte = null;

  function renderAsistenciaDocente() {
    const modulos = docenteModulosActivos();
    if (!docenteAsistCohorte || !modulos.some(m => m.nombre === docenteAsistCohorte)) {
      docenteAsistCohorte = modulos.length ? modulos[0].nombre : null;
    }
    const moduloSel = modulos.find(m => m.nombre === docenteAsistCohorte) || null;

    if (!modulos.length) {
      document.getElementById('mount-t-asistencia').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas. El coordinador debe asignarte una desde el panel administrativo para poder tomar asistencia.</p>
      </div>`;
      return;
    }

    const estudiantes = docenteEstudiantesDeCohorte(moduloSel.nombre);
    const hoy = new Date().toISOString().slice(0, 10);
    const registrosHoy = Store.list('asistencia').filter(a => a.modulo === moduloSel.modulo && a.fecha === hoy);
    const pillMap = { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'], 'Sin registrar': { bg: '#5B647214', text: '#5B6472' } };

    const selector = `<select onchange="cambiarCohorteAsistDocente(this.value)" class="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteAsistCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const filasHoy = estudiantes.length ? estudiantes.map(e => {
      const reg = registrosHoy.find(r => r.estudiante === e.nombre);
      const estado = reg ? reg.estado : 'Sin registrar';
      return `<tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.nombre)}</td>
        <td class="py-3 px-4">${statusPill(estado, pillMap)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="marcarAsistenciaDocente('${e.id}','Presente')" class="text-xs font-semibold text-turquesa hover:underline mr-3">Puntual</button>
          <button onclick="marcarAsistenciaDocente('${e.id}','Tarde')" class="text-xs font-semibold text-oro hover:underline mr-3">Tarde</button>
          <button onclick="marcarAsistenciaDocente('${e.id}','Falla')" class="text-xs font-semibold text-coral hover:underline">Ausente</button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Esta cohorte aún no tiene estudiantes matriculados.</td></tr>`;

    const historial = estudiantes.map(e => {
      const regs = Store.list('asistencia').filter(a => a.estudiante === e.nombre && a.modulo === moduloSel.modulo);
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
            <p class="text-sm font-bold text-ink">Asistencia de hoy</p>
            <p class="text-xs text-slate2 mt-0.5">${escapeHtml(moduloSel.modulo)} · ${fmtDate(hoy)} · El código QR de la sesión queda habilitado automáticamente; también puedes marcar el estado manualmente aquí.</p>
          </div>
          ${selector}
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Estudiante</th><th class="py-3 px-4">Estado hoy</th><th class="py-3 px-4"></th></tr></thead>
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
  }

  function cambiarCohorteAsistDocente(value) {
    docenteAsistCohorte = value;
    renderAsistenciaDocente();
  }

  function marcarAsistenciaDocente(estudianteId, estado) {
    const est = Store.list('usuarios').find(u => u.id === estudianteId);
    const moduloSel = docenteModulosActivos().find(m => m.nombre === docenteAsistCohorte);
    if (!est || !moduloSel) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const registros = Store.list('asistencia');
    const idx = registros.findIndex(r => r.estudiante === est.nombre && r.modulo === moduloSel.modulo && r.fecha === hoy);
    if (idx >= 0) registros[idx].estado = estado;
    else registros.push({ id: uid('as'), estudiante: est.nombre, modulo: moduloSel.modulo, fecha: hoy, estado });
    Store.set('asistencia', registros);
    toast('Asistencia actualizada: ' + est.nombre, 'ok');
    renderAsistenciaDocente();
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
          <td class="py-2.5 px-4 text-sm font-semibold text-ink whitespace-nowrap">${escapeHtml(e.nombre)}</td>
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
    updateCorreoBadge();
    updateMemorandosBadge();
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  function updateCorreoBadge() {
    const nombre = estudianteNombre();
    const noLeidos = Store.list('correos_estudiante').filter(c => c.estudiante === nombre && !c.leido).length;
    const badge = document.getElementById('correoBadge');
    if (noLeidos > 0) { badge.textContent = noLeidos; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
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
    const insignias = Store.list('insignias_estudiantes').filter(i => i.estudiante === nombre);
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
      <div class="grid sm:grid-cols-4 gap-5 mb-6">
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
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
          <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Insignias</p>
          <p class="text-2xl font-extrabold text-ink mt-1">${insignias.length}</p>
          <p class="text-xs text-slate2 mt-1">de ${INSIGNIAS_CATALOGO.length} disponibles</p>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
          <h2 class="text-base font-extrabold text-ink mb-1">Bienvenido/a, ${escapeHtml(nombre || 'Estudiante')}</h2>
          <p class="text-sm text-slate2 mb-4">Este es tu panel personal. Explora el menú lateral para revisar tu asistencia, materiales, agenda y herramientas con IA.</p>
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
    document.getElementById('mount-s-perfil').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 max-w-2xl">
        <div class="flex items-center gap-5 mb-6">
          <div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">
            ${escapeHtml((doc.nombre || '?').split(' ').slice(0,2).map(w => w[0]).join(''))}
          </div>
          <div>
            <p class="text-base font-extrabold text-ink">${escapeHtml(doc.nombre || '')}</p>
            <p class="text-sm text-slate2">${escapeHtml(doc.cohorte || '')}</p>
            <button onclick="toast('La foto de perfil se actualizará al conectar el almacenamiento institucional.', 'info')" class="text-xs font-semibold text-morado mt-1.5 hover:underline">Cambiar foto</button>
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

  function guardarPerfilEstudiante() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    if (nombre) {
      const usuarios = Store.list('usuarios').map(u => u.id === currentEstudiante.id ? { ...u, nombre } : u);
      Store.set('usuarios', usuarios);
      currentEstudiante = { ...currentEstudiante, nombre };
    }
    toast('Perfil actualizado correctamente', 'ok');
    renderPerfilEstudiante();
  }

  // ---------- ASISTENCIA (QR) ----------
  function renderAsistenciaEstudiante() {
    const nombre = estudianteNombre();
    const mod = estudianteModulo();
    const registros = [...Store.list('asistencia')].filter(a => a.estudiante === nombre)
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totales = { Presente: 0, Tarde: 0, Falla: 0 };
    registros.forEach(r => { if (totales[r.estado] !== undefined) totales[r.estado]++; });
    const pct = registros.length ? Math.round((totales.Presente / registros.length) * 100) : 100;
    const hoy = new Date().toISOString().slice(0, 10);
    const yaHoy = registros.some(r => r.fecha === hoy);

    const rows = registros.map(r => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-ink">${fmtDate(r.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.modulo)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['En proceso'] || ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'] })}</td>
      </tr>`).join('');

    document.getElementById('mount-s-asistencia').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">% Asistencia</p><p class="text-2xl font-extrabold text-ink mt-1">${pct}%</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Llegadas tarde</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Tarde}</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Fallas</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Falla}</p></div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
        <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 grid place-items-center shrink-0">
          <svg class="w-14 h-14 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h2M19 19h1"/></svg>
        </div>
        <div class="flex-1 text-center sm:text-left">
          <p class="text-sm font-bold text-ink">Código QR de la sesión de hoy</p>
          <p class="text-xs text-slate2 mt-1 mb-4">${mod ? 'Módulo: ' + escapeHtml(mod.modulo) : 'No tienes un módulo activo asignado.'}</p>
          <button onclick="escanearAsistencia()" ${yaHoy || !mod ? 'disabled' : ''} class="rounded-full ${yaHoy || !mod ? 'bg-gray-100 text-slate2 cursor-not-allowed' : 'bg-ink text-white hover:bg-morado'} font-semibold text-sm py-3 px-6 transition">
            ${yaHoy ? 'Asistencia ya registrada hoy' : 'Escanear QR y registrar asistencia'}
          </button>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 px-6 pt-5 pb-2">Historial mensual</p>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Fecha</th><th class="py-3 px-4">Módulo</th><th class="py-3 px-4">Estado</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes registros de asistencia.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function escanearAsistencia() {
    const nombre = estudianteNombre();
    const mod = estudianteModulo();
    if (!mod) { toast('No tienes un módulo activo asignado', 'err'); return; }
    const hoy = new Date().toISOString().slice(0, 10);
    const registros = Store.list('asistencia');
    if (registros.some(r => r.estudiante === nombre && r.fecha === hoy)) { toast('Ya registraste tu asistencia hoy', 'info'); return; }
    registros.push({ id: uid('as'), estudiante: nombre, modulo: mod.modulo, fecha: hoy, estado: 'Presente' });
    Store.set('asistencia', registros);
    toast('Asistencia registrada con éxito', 'ok');
    renderAsistenciaEstudiante();
  }

  // ---------- ANÁLISIS ACADÉMICO IA ----------
  function renderIaAnalisisEstudiante() {
    const nombre = estudianteNombre();
    const califs = Store.list('calificaciones').filter(c => c.estudiante === nombre);
    const asistenciaReg = Store.list('asistencia').filter(a => a.estudiante === nombre);
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const promedio = califs.length ? califs.reduce((a, c) => a + Number(c.nota || 0), 0) / califs.length : null;
    const presentes = asistenciaReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistenciaReg.length ? Math.round((presentes / asistenciaReg.length) * 100) : null;

    const fortalezas = [];
    const porFortalecer = [];
    if (promedio !== null && promedio >= (cfg.notasMinimaAprobacion + 1)) fortalezas.push('Tu promedio académico está sólidamente por encima del mínimo de aprobación.');
    if (promedio !== null && promedio < cfg.notasMinimaAprobacion + 0.5) porFortalecer.push('Tu promedio está cerca del mínimo de aprobación; refuerza los temas con menor nota.');
    if (pctAsistencia !== null && pctAsistencia >= cfg.asistenciaMinima) fortalezas.push('Mantienes una asistencia constante, por encima del mínimo institucional.');
    if (pctAsistencia !== null && pctAsistencia < cfg.asistenciaMinima) porFortalecer.push('Tu asistencia está por debajo del mínimo requerido (' + cfg.asistenciaMinima + '%).');
    if (asistenciaReg.some(a => a.estado === 'Tarde')) porFortalecer.push('Se registran llegadas tarde; procura ingresar puntualmente a cada sesión.');
    if (!fortalezas.length) fortalezas.push('Estás construyendo tu historial académico; sigue participando activamente.');
    if (!porFortalecer.length) porFortalecer.push('No se detectan aspectos críticos por el momento. ¡Sigue así!');

    const recomendacion = promedio !== null && promedio < cfg.notasMinimaAprobacion + 0.5
      ? 'Se recomienda revisar el Banco de recursos IA y agendar una sesión de refuerzo con tu docente.'
      : 'Se recomienda explorar la Ruta de aprendizaje sugerida para seguir avanzando a tu propio ritmo.';

    document.getElementById('mount-s-ia-analisis').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-morado/10 grid place-items-center"><svg class="w-5 h-5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg></div>
          <h2 class="text-base font-extrabold text-ink">Reporte individual generado por IA</h2>
        </div>
        <p class="text-sm text-slate2 mb-6">Promedio actual: <strong class="text-ink">${promedio !== null ? promedio.toFixed(1) : 'Sin datos'}</strong> · Asistencia: <strong class="text-ink">${pctAsistencia !== null ? pctAsistencia + '%' : 'Sin datos'}</strong></p>
        <div class="grid sm:grid-cols-2 gap-6">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-turquesa mb-3">Fortalezas</p>
            <ul class="space-y-2">${fortalezas.map(f => `<li class="text-sm text-ink flex gap-2"><span class="text-turquesa">●</span>${escapeHtml(f)}</li>`).join('')}</ul>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-coral mb-3">Aspectos por fortalecer</p>
            <ul class="space-y-2">${porFortalecer.map(f => `<li class="text-sm text-ink flex gap-2"><span class="text-coral">●</span>${escapeHtml(f)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="mt-6 rounded-xl bg-oro/10 border border-oro/20 p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-oro mb-1">Recomendación</p>
          <p class="text-sm text-ink">${escapeHtml(recomendacion)}</p>
        </div>
      </div>`;
  }

  // ---------- MIS MATERIAS Y HORARIO ----------
  // Mes seleccionado por el estudiante para ver su horario (memoria de sesión)
  let estudianteHorarioMes = null;

  function renderAcademicoEstudiante() {
    const mod = estudianteModulo();
    const pensumItems = mod ? Store.list('pensum').filter(p => p.modulo === mod.modulo) : [];
    document.getElementById('mount-s-academico').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Mi módulo actual</p>
        ${mod ? `
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <p class="text-lg font-extrabold text-ink">${escapeHtml(mod.modulo)}</p>
            ${statusPill(mod.estado, ESTADO_COLORS)}
          </div>
          <p class="text-sm text-slate2">${escapeHtml(mod.nombre)} · Docente: ${(() => { const ds = docentesDeCohorte(mod.nombre); return ds.length ? escapeHtml(ds.join(', ')) : 'Sin asignar'; })()}</p>
          <p class="text-sm text-slate2 mt-1">${fmtDate(mod.fechaInicio)} — ${fmtDate(mod.fechaFin)}</p>
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
                <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.docente)}</td>
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
          <p class="text-[11px] text-slate2">${escapeHtml(c.docente || '')}</p>
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

  // ---------- MATERIALES DE ESTUDIO ----------
  function renderMaterialesEstudiante() {
    const mod = estudianteModulo();
    const materiales = Store.list('materiales').filter(m => !mod || m.modulo === mod.modulo);
    const iconos = { PDF: '📄', Video: '🎬', Taller: '🛠️', Ejercicio: '✏️' };
    document.getElementById('mount-s-materiales').innerHTML = `
      <div class="grid sm:grid-cols-2 gap-4">
        ${materiales.map(m => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-start gap-4">
            <div class="w-11 h-11 rounded-xl bg-gray-50 grid place-items-center text-xl shrink-0">${iconos[m.tipo] || '📁'}</div>
            <div class="flex-1">
              <p class="text-sm font-bold text-ink">${escapeHtml(m.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(m.tipo)} · ${escapeHtml(m.mes)}</p>
              <button onclick="toast('Descargando: ${escapeHtml(m.titulo)}', 'ok')" class="text-xs font-semibold text-morado mt-2 hover:underline">Consultar material</button>
            </div>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8 sm:col-span-2">Tu docente aún no ha subido materiales para tu módulo.</p>'}
      </div>`;
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

  // ---------- BANCO DE RECURSOS IA ----------
  function renderRecursosIaEstudiante() {
    const nombre = estudianteNombre();
    const califs = Store.list('calificaciones').filter(c => c.estudiante === nombre);
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const debil = califs.filter(c => Number(c.nota) < cfg.notasMinimaAprobacion + 1).sort((a, b) => a.nota - b.nota)[0];
    const tema = debil ? debil.modulo : (estudianteModulo() ? estudianteModulo().modulo : 'tu proceso académico');

    const recursos = [
      { tipo: 'Video', titulo: `Refuerzo visual: fundamentos de ${tema}` },
      { tipo: 'PDF', titulo: `Guía de práctica — ${tema}` },
      { tipo: 'Taller', titulo: `Taller guiado paso a paso — ${tema}` },
      { tipo: 'Ejercicio', titulo: `Batería de ejercicios de repaso — ${tema}` },
    ];
    const iconos = { PDF: '📄', Video: '🎬', Taller: '🛠️', Ejercicio: '✏️' };
    document.getElementById('mount-s-recursos-ia').innerHTML = `
      <div class="rounded-2xl bg-morado/10 border border-morado/20 p-5 mb-6">
        <p class="text-sm text-ink"><strong>Recomendación IA:</strong> según tu desempeño reciente, estos recursos sobre <strong>${escapeHtml(tema)}</strong> pueden ayudarte a reforzar tu aprendizaje.</p>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        ${recursos.map(r => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-start gap-4">
            <div class="w-11 h-11 rounded-xl bg-gray-50 grid place-items-center text-xl shrink-0">${iconos[r.tipo]}</div>
            <div class="flex-1">
              <p class="text-sm font-bold text-ink">${escapeHtml(r.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(r.tipo)}</p>
              <button onclick="toast('Abriendo recurso recomendado', 'ok')" class="text-xs font-semibold text-morado mt-2 hover:underline">Abrir recurso</button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // ---------- RUTA DE APRENDIZAJE IA ----------
  function renderRutaIaEstudiante() {
    const nombre = estudianteNombre();
    const califs = Store.list('calificaciones').filter(c => c.estudiante === nombre);
    const cfg = Store.get('configuracion') || SEED.configuracion;
    const promedio = califs.length ? califs.reduce((a, c) => a + Number(c.nota || 0), 0) / califs.length : null;

    const pasos = promedio !== null && promedio < cfg.notasMinimaAprobacion + 0.5
      ? [
          { titulo: 'Repasar fundamentos con el Banco de recursos IA', estado: 'Pendiente' },
          { titulo: 'Agendar sesión de refuerzo con tu docente', estado: 'Pendiente' },
          { titulo: 'Presentar evaluación de recuperación', estado: 'Pendiente' },
          { titulo: 'Confirmar mejora con tu docente', estado: 'Pendiente' },
        ]
      : [
          { titulo: 'Completar los temas restantes del pensum', estado: 'En curso' },
          { titulo: 'Explorar un recurso avanzado sugerido por la IA', estado: 'Pendiente' },
          { titulo: 'Participar en la próxima reunión virtual', estado: 'Pendiente' },
          { titulo: 'Postularte a un reto de cierre de módulo', estado: 'Pendiente' },
        ];

    document.getElementById('mount-s-ruta-ia').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8">
        <p class="text-xs font-bold uppercase tracking-wide text-morado mb-1">Plan de mejora sugerido por IA</p>
        <p class="text-sm text-slate2 mb-6">Basado en tu promedio actual (${promedio !== null ? promedio.toFixed(1) : 'sin datos'}) y tu progreso en el módulo.</p>
        <div class="space-y-3">
          ${pasos.map((p, i) => `
            <div class="flex items-center gap-4 rounded-xl border border-gray-100 p-4">
              <div class="w-8 h-8 rounded-full bg-morado/10 text-morado font-bold text-sm grid place-items-center shrink-0">${i + 1}</div>
              <p class="text-sm text-ink flex-1">${escapeHtml(p.titulo)}</p>
              ${statusPill(p.estado, ESTADO_COLORS)}
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ---------- CORREO INSTITUCIONAL ----------
  function renderCorreoEstudiante() {
    const nombre = estudianteNombre();
    const correos = [...Store.list('correos_estudiante')].filter(c => c.estudiante === nombre)
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-s-correo').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft divide-y divide-gray-50">
        ${correos.map(c => `
          <button onclick="abrirCorreoEstudiante('${c.id}')" class="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-50/60 transition">
            <span class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${c.leido ? '#5B647233' : '#F5A623'}"></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm ${c.leido ? 'font-medium text-slate2' : 'font-bold text-ink'} truncate">${escapeHtml(c.asunto)}</p>
                <p class="text-xs text-slate2 shrink-0">${fmtDate(c.fecha)}</p>
              </div>
              <p class="text-xs text-slate2 mt-0.5">De: ${escapeHtml(c.de)}</p>
              <p class="text-xs text-slate2 mt-1 truncate">${escapeHtml(c.contenido)}</p>
            </div>
          </button>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes correos institucionales.</p>'}
      </div>`;
  }

  function abrirCorreoEstudiante(id) {
    const correos = Store.list('correos_estudiante');
    const correo = correos.find(c => c.id === id);
    if (!correo) return;
    if (!correo.leido) {
      correo.leido = true;
      Store.set('correos_estudiante', correos);
      updateCorreoBadge();
    }
    renderCorreoEstudiante();
    toast(correo.asunto + ' — ' + correo.contenido, 'info');
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

  // ---------- LOGROS E INSIGNIAS ----------
  function renderLogrosEstudiante() {
    const nombre = estudianteNombre();
    const obtenidas = Store.list('insignias_estudiantes').filter(i => i.estudiante === nombre);
    const obtenidasNombres = obtenidas.map(i => i.insignia);
    document.getElementById('mount-s-logros').innerHTML = `
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${INSIGNIAS_CATALOGO.map(b => {
          const lograda = obtenidasNombres.includes(b.nombre);
          const fecha = lograda ? (obtenidas.find(i => i.insignia === b.nombre) || {}).fecha : null;
          return `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 text-center ${lograda ? '' : 'opacity-45 grayscale'}">
            <div class="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3 text-2xl" style="background:${b.color}1A">🏅</div>
            <p class="text-sm font-bold text-ink">${escapeHtml(b.nombre)}</p>
            <p class="text-xs text-slate2 mt-1 leading-relaxed">${escapeHtml(b.descripcion)}</p>
            ${lograda ? `<p class="text-xs font-semibold text-turquesa mt-2">Obtenida el ${fmtDate(fecha)}</p>` : '<p class="text-xs font-semibold text-slate2 mt-2">Aún no obtenida</p>'}
          </div>`;
        }).join('')}
      </div>`;
  }

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
    'ia-analisis': renderIaAnalisisEstudiante,
    academico: renderAcademicoEstudiante,
    materiales: renderMaterialesEstudiante,
    pensum: renderPensumEstudiante,
    'recursos-ia': renderRecursosIaEstudiante,
    'ruta-ia': renderRutaIaEstudiante,
    correo: renderCorreoEstudiante,
    memorandos: renderMemorandosEstudiante,
    pqr: renderPqrEstudiante,
    reuniones: renderReunionesEstudiante,
    logros: renderLogrosEstudiante,
    encuestas: renderEncuestasEstudiante,
    agenda: renderAgendaEstudiante,
  };