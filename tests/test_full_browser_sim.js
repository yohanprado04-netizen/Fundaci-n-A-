/**
 * test_full_browser_sim.js
 * Comprehensive automated simulation test that runs all renderers across all roles
 * in a simulated DOM environment to catch runtime JS exceptions, undefined globals,
 * or infinite recursion bugs.
 */
const fs = require('fs');
const path = require('path');

// 1. Mock minimal browser environment
const domElements = new Map();

function createElementMock(tag) {
  return {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    dataset: {},
    style: {},
    innerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    type: '',
    checked: false,
    disabled: false,
    children: [],
    childNodes: [],
    parentNode: null,
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    focus() {},
    blur() {},
    click() {}
  };
}

function getElementById(id) {
  if (!domElements.has(id)) {
    const el = createElementMock('div');
    el.id = id;
    domElements.set(id, el);
  }
  return domElements.get(id);
}

// Global window and document
const windowMock = {
  location: { href: 'http://localhost/fundacion-api/', search: '', pathname: '/', protocol: 'http:', hostname: 'localhost', origin: 'http://localhost' },
  navigator: { userAgent: 'NodeTest', serviceWorker: { register: () => Promise.resolve() } },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  alert: (msg) => console.log('[Sim Alert]', msg),
  confirm: () => true,
  prompt: () => '',
  scrollTo: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  open: () => ({ document: { open: () => {}, write: () => {}, close: () => {} } }),
  Chart: class { constructor() {} destroy() {} update() {} },
  QRCode: class { constructor() {} makeCode() {} clear() {} },
  emailjs: { send: () => Promise.resolve() },
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} })
};

const documentMock = {
  readyState: 'complete',
  documentElement: createElementMock('html'),
  getElementById,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getElementById(sel.slice(1));
    return createElementMock('div');
  },
  querySelectorAll: () => [],
  createElement: createElementMock,
  addEventListener: () => {},
  removeEventListener: () => {},
  body: createElementMock('body')
};

windowMock.document = documentMock;
global.window = windowMock;
global.document = documentMock;
global.localStorage = windowMock.localStorage;
global.sessionStorage = windowMock.sessionStorage;
global.navigator = windowMock.navigator;
global.location = windowMock.location;
global.alert = windowMock.alert;
global.confirm = windowMock.confirm;

// Mock fetch
const mockDataStore = {
  usuarios: [
    { id: 'usr-1', nombre: 'Admin Master', email: 'admin@fundacionamas.org.co', rol: 'Superadmin', cohorte: '', cohortes_permitidas: '*' },
    { id: 'usr-2', nombre: 'Docente Carlos', email: 'carlos@docente.org.co', rol: 'Docente', cohorte: 'Cohorte 1', materias: ['Python'] },
    { id: 'usr-3', nombre: 'Estudiante Ana', email: 'ana@estudiante.org.co', rol: 'Estudiante', cohorte: 'Cohorte 1', fueEstudiante: true },
    { id: 'usr-4', nombre: 'Aliado Global', email: 'aliado@global.com', rol: 'Aliado', cohorte: 'Cohorte 1', cohortes_permitidas: 'Cohorte 1' },
    { id: 'usr-5', nombre: 'Donante Solidario', email: 'donante@solidario.org', rol: 'Donante', cohorte: 'Cohorte 1', cohortes_permitidas: 'Cohorte 1' }
  ],
  configuracion: { institucion: 'Fundación A+', notaMinima: 6.0, valorMatricula: 50000, valorMensualidad: 30000 },
  pensum: [{ id: 'pen-1', materia: 'Python', modulo: 'Módulo 1', cohorte: 'Cohorte 1', docente: 'Docente Carlos', horas: 40 }],
  modulos: [{ id: 'mod-1', nombre: 'Módulo 1', materia: 'Python', cohorte: 'Cohorte 1', ponderacion: 100 }],
  cursos: [{ id: 'cur-1', nombre: 'TrAIning IA', cohorte: 'Cohorte 1' }],
  asistencia: [{ id: 'asist-1', estudiante: 'Estudiante Ana', cohorte: 'Cohorte 1', fecha: '2026-10-01', estado: 'Presente' }],
  calificaciones: [{ id: 'cal-1', estudiante: 'Estudiante Ana', materia: 'Python', cohorte: 'Cohorte 1', nota: 8.5, mes: '2026-10', docente: 'Docente Carlos' }],
  informes: [{ id: 'inf-1', estudiante: 'Estudiante Ana', cohorte: 'Cohorte 1', docente: 'Docente Carlos', mes: '2026-10', estado: 'Enviado', asistenciaPct: 95, promedio: 8.5 }],
  horarios: [],
  memorandos: [{ id: 'mem-1', asunto: 'Inicio Clases', destinatario: 'Todos', estado: 'Enviado', fecha: '2026-10-01' }],
  pqr: [{ id: 'pqr-1', remitente: 'Estudiante Ana', asunto: 'Duda con equipo', estado: 'Abierto', tipo: 'Petición' }],
  pagos_estudiantes: [{ id: 'pag-1', estudiante_id: 'usr-3', estudiante: 'Estudiante Ana', cohorte: 'Cohorte 1', tipo: 'Mensualidad', monto: 30000, estado: 'Aprobado', fecha_pago: '2026-10-02' }],
  proyectos_fundacion: [{ id: 'pf-1', titulo: 'IA para el Chocó', estado: 'Activo', cohorte: 'Cohorte 1' }],
  proyectos_estudiantes: [{ id: 'pe-1', titulo: 'Chatbot Comunitario', estudiante_id: 'usr-3', cohorte: 'Cohorte 1', estado: 'En curso' }],
  recursos: [{ id: 'rec-1', nombre: 'Laptop HP 1', tipo: 'Laptop', estado: 'Disponible' }],
  solicitudes_recursos: [],
  asignaciones_recursos: [],
  prestamos_equipos: [],
  trainee_archivos: [{ id: 'arc-1', estudianteId: 'usr-3', nombre: 'hoja_vida.pdf', tipo: 'application/pdf' }]
};

global.fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const urlStr = String(url);
  // Match entity
  for (const entity of Object.keys(mockDataStore)) {
    if (urlStr.includes('/' + entity) || urlStr.includes('=' + entity)) {
      if (method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => mockDataStore[entity]
        };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, id: 'mock-id' }) };
    }
  }
  if (urlStr.includes('public_info')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        configuracion: mockDataStore.configuracion,
        totalEstudiantes: 1,
        estudiantes: mockDataStore.usuarios.filter(u => u.rol === 'Estudiante')
      })
    };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

// 2. Load all scripts in order
const basePath = path.resolve(__dirname, '..');
const scriptsToLoad = [
  'db.js',
  'app.js',
  'forms.js',
  'recursos.js',
  'comunicados.js',
  'pagos.js',
  'proyectos.js',
  'trainee.js',
  'chat.js',
  'asistencia.js',
  'docentes.js',
  'estudiantes.js',
  'semaforo.js'
];

console.log('Loading scripts in dependency order...');
for (const file of scriptsToLoad) {
  const fullPath = path.join(basePath, file);
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    // Run in global scope
    const fn = new Function(code);
    fn();
    if (file === 'db.js') {
      global.Store = windowMock.Store;
      global.apiFetch = windowMock.apiFetch;
      global.API_BASE_URL = windowMock.API_BASE_URL;
    }
    console.log(`  ✔ Loaded: ${file}`);
  } catch (err) {
    console.error(`  ✖ ERROR loading ${file}:`, err);
    process.exit(1);
  }
}

// 3. Test runner for modules across roles
async function runTests() {
  console.log('\n======================================================');
  console.log(' TESTING RENDERERS ACROSS ALL ROLES');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const errors = [];

  async function testRenderer(role, panelName, renderFn) {
    process.stdout.write(`  [${role}] Panel '${panelName}'... `);
    try {
      // Set current session
      const user = mockDataStore.usuarios.find(u => u.rol.toLowerCase() === role.toLowerCase()) || mockDataStore.usuarios[0];
      if (typeof window.setCurrentAdminRole === 'function') window.setCurrentAdminRole(role.toLowerCase());
      if (typeof window.setCurrentAdminUser === 'function') window.setCurrentAdminUser(user);
      if (typeof window.setCurrentDocente === 'function' && role.toLowerCase() === 'docente') window.setCurrentDocente(user);
      if (typeof window.setCurrentEstudiante === 'function' && role.toLowerCase() === 'estudiante') window.setCurrentEstudiante(user);

      await renderFn();

      // Check if mount element caught error text
      const mountEls = Array.from(domElements.values());
      const erroredMount = mountEls.find(el => (el.innerHTML || '').includes('No se pudo cargar el módulo') || (el.innerHTML || '').includes('is not defined') || (el.innerHTML || '').includes('call stack'));
      if (erroredMount) {
        const match = erroredMount.innerHTML.match(/<p class="text-xs text-slate2 mt-1[^"]*">([^<]+)<\/p>/);
        const detail = match ? match[1] : erroredMount.innerHTML.slice(0, 150);
        throw new Error(`Renderer produced failure in HTML: ${detail}`);
      }

      console.log('✔ OK');
      passed++;
    } catch (err) {
      console.log(`✖ FAIL: ${err.message}`);
      failed++;
      errors.push({ role, panelName, error: err.stack || err.message });
    }
  }

  // A. Superadmin Renderers
  console.log('--- 1. SUPERADMIN PANELS ---');
  const RENDERERS = window.RENDERERS || {};
  for (const [panel, fn] of Object.entries(RENDERERS)) {
    await testRenderer('Superadmin', panel, fn);
  }

  // B. Docente Renderers
  console.log('\n--- 2. DOCENTE PANELS ---');
  const RENDERERS_DOCENTE = window.RENDERERS_DOCENTE || {};
  for (const [panel, fn] of Object.entries(RENDERERS_DOCENTE)) {
    await testRenderer('Docente', panel, fn);
  }

  // C. Estudiante Renderers
  console.log('\n--- 3. ESTUDIANTE PANELS ---');
  const RENDERERS_ESTUDIANTE = window.RENDERERS_ESTUDIANTE || {};
  for (const [panel, fn] of Object.entries(RENDERERS_ESTUDIANTE)) {
    await testRenderer('Estudiante', panel, fn);
  }

  // D. Aliado & Donante
  console.log('\n--- 4. ALIADO & DONANTE RBAC PANELS ---');
  for (const role of ['Aliado', 'Donante']) {
    for (const panel of ['resumen', 'proyectosFundacion', 'proyectosEstudiantes', 'calificaciones', 'asistencia']) {
      if (RENDERERS[panel]) {
        await testRenderer(role, panel, RENDERERS[panel]);
      }
    }
  }

  // E. Specific Freddy Scheduled Classes & Calificaciones Test
  console.log('\n--- 5. FREDDY (DOCENTE CON CLASES ASIGNADAS) VERIFICATION ---');
  try {
    process.stdout.write('  [Freddy] Verificando asignación de clases y panel Calificaciones... ');
    const freddyTeacher = { id: 'usr_freddy', nombre: 'Freddy Palacios', email: 'freddy@aplus.org', rol: 'Docente', estadoRegistro: 'Aprobado' };
    mockDataStore.usuarios.push(freddyTeacher);
    mockDataStore.horarios.push({
      id: 'hor_freddy_1',
      cohorte: 'Cohorte 1',
      mes: '2026-10',
      franjas: [
        { id: 'fr_f1', dia: 'Lunes', inicio: '08:00', fin: '12:00', curso: 'Desarrollo Web', docente: 'Freddy', estado: 'Activo' },
        { id: 'fr_f2', dia: 'Miércoles', inicio: '08:00', fin: '12:00', curso: 'Desarrollo Web', docente: 'Freddy Palacios', estado: 'Activo' }
      ]
    });
    mockDataStore.pensum.push({
      id: 'pen_f1', cohorte: 'Cohorte 1', modulo: 'Desarrollo Web', tema: 'Fundamentos', horas: 20, docente: 'Freddy Palacios', orden: 1
    });

    if (typeof Store.clearCache === 'function') {
      Store.clearCache('horarios');
      Store.clearCache('pensum');
      Store.clearCache('usuarios');
    }
    await Store.set('horarios', mockDataStore.horarios);

    window.setCurrentDocente(freddyTeacher);
    const slotsFreddy = await window.getSlotsDocente('Freddy');
    if (!slotsFreddy.length) throw new Error('getSlotsDocente("Freddy") no devolvió franjas!');

    const slotsFreddyPalacios = await window.getSlotsDocente('Freddy Palacios');
    if (!slotsFreddyPalacios.length) throw new Error('getSlotsDocente("Freddy Palacios") no devolvió franjas!');

    const opcionesCalificaciones = await window.docenteCalifOpciones();
    if (!opcionesCalificaciones.length) throw new Error('docenteCalifOpciones() devolvió lista vacía para Freddy!');

    await window.renderCalificacionesDocente();
    const califMount = domElements.get('mount-t-calificaciones');
    if (!califMount || califMount.innerHTML.includes('Aún no tienes cohortes/módulos asignados')) {
      throw new Error('Calificaciones sigue mostrando que no tiene cohortes/módulos asignados!');
    }
    console.log('✔ OK (Opciones encontradas: ' + opcionesCalificaciones.length + ')');
    passed++;

    process.stdout.write('  [Freddy] Verificando panel Equipos y Préstamos (solicitar_equipo)... ');
    await window.renderSolicitarEquipoForm('mount-t-solicitar_equipo');
    const eqMount = domElements.get('mount-t-solicitar_equipo');
    if (!eqMount || eqMount.innerHTML.includes('skeleton-pulse') || !eqMount.innerHTML.includes('Reserva y Préstamos de Equipos')) {
      throw new Error('El panel solicitar_equipo quedó en skeleton o no renderizó el formulario!');
    }
    console.log('✔ OK (Formulario renderizado correctamente sin bloqueo)');
    passed++;
  } catch (err) {
    console.log('✖ FAIL: ' + err.message);
    failed++;
    errors.push({ role: 'Docente (Freddy)', panelName: 'calificaciones/solicitar_equipo', error: err.stack || err.message });
  }

  // F. Dedicated Notificaciones Verification Across Roles
  console.log('\n--- 6. NOTIFICACIONES RENDERING VERIFICATION ACROSS ALL ROLES ---');
  try {
    process.stdout.write('  [Superadmin] Verificando Centro de Notificaciones... ');
    await window.renderNotificacionesAdmin();
    const adminNotifMount = domElements.get('mount-notificaciones');
    if (!adminNotifMount || adminNotifMount.innerHTML.length < 500 || !adminNotifMount.innerHTML.includes('CENTRO DE GESTIÓN DE NOTIFICACIONES')) {
      throw new Error('mount-notificaciones no contiene el Centro de Gestión de Notificaciones!');
    }
    console.log(`✔ OK (${adminNotifMount.innerHTML.length} bytes renderizados)`);
    passed++;

    process.stdout.write('  [Docente] Verificando Centro de Notificaciones... ');
    const docUser = mockDataStore.usuarios.find(u => u.rol === 'Docente') || { nombre: 'Freddy Palacios', rol: 'Docente', cohortes: ['Cohorte 1'] };
    window.setCurrentDocente(docUser);
    await window.renderNotificacionesDocente();
    const docNotifMount = domElements.get('mount-t-notificaciones');
    if (!docNotifMount || docNotifMount.innerHTML.length < 500 || !docNotifMount.innerHTML.includes('Centro de Notificaciones')) {
      throw new Error('mount-t-notificaciones no contiene el Centro de Notificaciones Docente!');
    }
    console.log(`✔ OK (${docNotifMount.innerHTML.length} bytes renderizados)`);
    passed++;

    process.stdout.write('  [Estudiante] Verificando Centro de Notificaciones... ');
    const estUser = mockDataStore.usuarios.find(u => u.rol === 'Estudiante') || { nombre: 'Carlos Ruiz', rol: 'Estudiante', cohorte: 'Cohorte 1' };
    window.setCurrentEstudiante(estUser);
    await window.renderNotificacionesEstudiante();
    const estNotifMount = domElements.get('mount-s-notificaciones');
    if (!estNotifMount || estNotifMount.innerHTML.length < 500 || !estNotifMount.innerHTML.includes('Centro de Notificaciones')) {
      throw new Error('mount-s-notificaciones no contiene el Centro de Notificaciones Estudiante!');
    }
    console.log(`✔ OK (${estNotifMount.innerHTML.length} bytes renderizados)`);
    passed++;
  } catch (err) {
    console.log('✖ FAIL: ' + err.message);
    failed++;
    errors.push({ role: 'Notificaciones Suite', panelName: 'notificaciones', error: err.stack || err.message });
  }

  // G. Dedicated Inventario y Recursos Verification Across Superadmin, Docentes y Estudiantes
  console.log('\n--- 7. INVENTARIO Y RECURSOS: ANTI-BUCLE INFINITO EN SUPERADMIN, DOCENTES Y ESTUDIANTES ---');
  try {
    // 7.1 Superadmin: Recursos (Inventario general)
    process.stdout.write('  [Superadmin] Verificando Catálogo e Inventario de Recursos... ');
    await window.renderRecursos();
    const adminRecMount = domElements.get('mount-recursos');
    if (!adminRecMount || adminRecMount.innerHTML.length < 500 || adminRecMount.innerHTML.includes('skeleton-pulse')) {
      throw new Error('mount-recursos quedó en estado esqueleto o incompleto!');
    }
    console.log(`✔ OK (${adminRecMount.innerHTML.length} bytes renderizados)`);
    passed++;

    // 7.2 Superadmin: Solicitudes de Recursos
    process.stdout.write('  [Superadmin] Verificando Bandeja de Solicitudes de Recursos... ');
    await window.renderSolicitudesAdmin();
    const adminSolMount = domElements.get('mount-solicitudes_recursos');
    if (!adminSolMount || adminSolMount.innerHTML.length < 200 || adminSolMount.innerHTML.includes('skeleton-pulse')) {
      throw new Error('mount-solicitudes_recursos quedó en estado esqueleto o incompleto!');
    }
    console.log(`✔ OK (${adminSolMount.innerHTML.length} bytes renderizados)`);
    passed++;

    // 7.3 Superadmin: Asignaciones de Recursos
    process.stdout.write('  [Superadmin] Verificando Asignaciones y Préstamos Activos... ');
    await window.renderAsignacionesRecursos();
    const adminAsigMount = domElements.get('mount-asignaciones_recursos');
    if (!adminAsigMount || adminAsigMount.innerHTML.length < 500 || adminAsigMount.innerHTML.includes('skeleton-pulse')) {
      throw new Error('mount-asignaciones_recursos quedó en estado esqueleto o incompleto!');
    }
    console.log(`✔ OK (${adminAsigMount.innerHTML.length} bytes renderizados)`);
    passed++;

    // 7.4 Superadmin: Historial de Préstamos
    process.stdout.write('  [Superadmin] Verificando Historial y Trazabilidad Institucional... ');
    await window.renderHistorialPrestamosAdmin();
    const adminHistMount = domElements.get('mount-historial_prestamos');
    if (!adminHistMount || adminHistMount.innerHTML.length < 500 || adminHistMount.innerHTML.includes('skeleton-pulse')) {
      throw new Error('mount-historial_prestamos quedó en estado esqueleto o incompleto!');
    }
    console.log(`✔ OK (${adminHistMount.innerHTML.length} bytes renderizados)`);
    passed++;

    // 7.5 Docente: Solicitar Equipo / Préstamos
    process.stdout.write('  [Docente] Verificando Equipos y Préstamos (solicitar_equipo)... ');
    const docUser = mockDataStore.usuarios.find(u => u.rol === 'Docente') || { nombre: 'Freddy Palacios', rol: 'Docente' };
    window.setCurrentDocente(docUser);
    await window.renderSolicitarEquipoForm('mount-t-solicitar_equipo');
    const docEquipoMount = domElements.get('mount-t-solicitar_equipo');
    if (!docEquipoMount || docEquipoMount.innerHTML.length < 500 || docEquipoMount.innerHTML.includes('animate-spin')) {
      throw new Error('mount-t-solicitar_equipo quedó en bucle de carga o incompleto!');
    }
    console.log(`✔ OK (${docEquipoMount.innerHTML.length} bytes renderizados)`);
    passed++;

    // 7.6 Estudiante: Solicitar Equipo / Préstamos
    process.stdout.write('  [Estudiante] Verificando Equipos y Préstamos (solicitar_equipo)... ');
    const estUser = mockDataStore.usuarios.find(u => u.rol === 'Estudiante') || { nombre: 'Carlos Ruiz', rol: 'Estudiante' };
    window.setCurrentEstudiante(estUser);
    await window.renderSolicitarEquipoForm('mount-s-solicitar_equipo');
    const estEquipoMount = domElements.get('mount-s-solicitar_equipo');
    if (!estEquipoMount || estEquipoMount.innerHTML.length < 500 || estEquipoMount.innerHTML.includes('animate-spin')) {
      throw new Error('mount-s-solicitar_equipo quedó en bucle de carga o incompleto!');
    }
    console.log(`✔ OK (${estEquipoMount.innerHTML.length} bytes renderizados)`);
    passed++;
  } catch (err) {
    console.log('✖ FAIL: ' + err.message);
    failed++;
    errors.push({ role: 'Inventario Suite', panelName: 'recursos', error: err.stack || err.message });
  }

  console.log('\n======================================================');
  console.log(` RESULTADOS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('======================================================\n');

  if (failed > 0) {
    console.error('Detalle de fallos:');
    errors.forEach(e => {
      console.error(`- [${e.role}] '${e.panelName}': ${e.error}`);
    });
    process.exit(1);
  } else {
    console.log('¡TODOS LOS PANELES Y ROLES RENDERIZAN PERFECTAMENTE (100% OK)!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
