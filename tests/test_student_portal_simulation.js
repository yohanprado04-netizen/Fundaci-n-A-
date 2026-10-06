/**
 * test_student_portal_simulation.js
 * Comprehensive end-to-end simulation of the student portal, login flow,
 * panel navigation, and module functionality.
 */
const fs = require('fs');
const path = require('path');

// 1. Mock minimal browser environment
const domElements = new Map();

function createElementMock(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => c && this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(c) { return this._classes.has(c); },
      toggle(c, force) {
        if (force === true) this.add(c);
        else if (force === false) this.remove(c);
        else if (this.contains(c)) this.remove(c);
        else this.add(c);
      }
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
    querySelector(selector) {
      if (selector.startsWith('#')) return domElements.get(selector.slice(1)) || null;
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        for (const elem of domElements.values()) {
          if (elem.classList.contains(cls)) return elem;
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      const res = [];
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        for (const elem of domElements.values()) {
          if (elem.classList.contains(cls)) res.push(elem);
        }
      }
      return res;
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] !== undefined ? this[k] : null; },
    removeAttribute(k) { delete this[k]; },
    focus() {},
    blur() {},
    click() {}
  };
  return el;
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
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} })
};

const documentMock = {
  getElementById,
  createElement: createElementMock,
  querySelector: (s) => {
    if (s.startsWith('#')) return getElementById(s.slice(1));
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === '.panel-tab-s') {
      const tabs = [];
      ['resumen', 'notificaciones', 'asistencia', 'academico', 'calificaciones', 'pensum', 'misProyectos', 'memorandos', 'pqr', 'agenda', 'solicitar_equipo'].forEach(name => {
        const t = createElementMock('button');
        t.dataset.spanel = name;
        tabs.push(t);
      });
      return tabs;
    }
    if (selector === '.panel-content-s') {
      const contents = [];
      ['resumen', 'notificaciones', 'perfil', 'asistencia', 'academico', 'calificaciones', 'pensum', 'misProyectos', 'memorandos', 'pqr', 'agenda', 'solicitar_equipo'].forEach(name => {
        contents.push(getElementById('panel-s-' + name));
      });
      return contents;
    }
    return [];
  },
  body: createElementMock('body'),
  documentElement: createElementMock('html'),
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.window = windowMock;
windowMock.document = documentMock;
global.document = documentMock;
global.localStorage = windowMock.localStorage;
global.sessionStorage = windowMock.sessionStorage;
global.navigator = windowMock.navigator;
global.location = windowMock.location;
global.HTMLElement = Object;
global.HTMLInputElement = Object;
global.HTMLSelectElement = Object;
global.customElements = { define: () => {} };
global.requestAnimationFrame = windowMock.requestAnimationFrame;
global.cancelAnimationFrame = windowMock.cancelAnimationFrame;

// Setup mock store data
const mockDataStore = {
  perfiles: [
    { id: 'perf_est', nombre: 'Estudiante', categoria: 'Estudiante', esSistema: true, permisos: {} }
  ],
  usuarios: [
    { id: 'u_est_1', nombre: 'Carlos Ruiz', correo: 'carlos@fundacion.org', rol: 'Estudiante', cohorte: 'Cohorte 1', estado: 'Activo', telefono: '3001234567', ciudad: 'Cali', habilidades: 'JavaScript, CSS, HTML' },
    { id: 'u_doc_1', nombre: 'Freddy Palacios', correo: 'docente@fundacion.org', rol: 'Docente', cohortes: ['Cohorte 1'], estado: 'Activo' }
  ],
  modulos: [
    { id: 'm1', nombre: 'Desarrollo Web Fullstack', cohorte: 'Cohorte 1', docente: 'Freddy Palacios', estado: 'Activo' }
  ],
  notas_modulos: [
    {
      id: 'cal_1',
      cohorte: 'Cohorte 1',
      modulo: 'Desarrollo Web Fullstack',
      materia: 'Desarrollo Web Fullstack',
      docente: 'Freddy Palacios',
      mes: '2026-10',
      criterios: [
        { id: 'crit_1', nombre: 'Taller 1', ponderacion: 100 }
      ],
      estudiantes: [
        { nombre: 'Carlos Ruiz', notas: { crit_1: 8.5 }, feedback: { crit_1: 'Excelente trabajo' } }
      ]
    }
  ],
  asistencia: [
    { id: 'as_1', estudiante: 'Carlos Ruiz', fecha: '2026-10-02', modulo: 'Desarrollo Web Fullstack', estado: 'Presente', cohorte: 'Cohorte 1' }
  ],
  sesiones_asistencia: [],
  justificaciones_asistencia: [],
  pensum: [
    { id: 'pen_1', cohorte: 'Cohorte 1', modulo: 'Desarrollo Web Fullstack', tema: 'Arquitectura Frontend', horas: 30, orden: 1, docente: 'Freddy Palacios' }
  ],
  memorandos: [
    { id: 'mem_1', usuario: 'Carlos Ruiz', tipo: 'Felicitación', descripcion: 'Excelente desempeño académico', estado: 'Visto', fecha: '2026-10-01' }
  ],
  pqr: [
    { id: 'pqr_1', usuario: 'Carlos Ruiz', asunto: 'Consulta de horario', estado: 'Resuelto', fecha: '2026-10-03', respuesta: 'Horarios actualizados en plataforma' }
  ],
  agenda_estudiante: [
    { id: 'ag_1', usuario: 'Carlos Ruiz', titulo: 'Entrega Proyecto Fase 1', fecha: '2026-10-15', hora: '18:00' }
  ],
  proyectos_estudiantes: [
    { id: 'proy_1', lider: 'Carlos Ruiz', titulo: 'Portal Comunitario', modulo: 'Desarrollo Web Fullstack', estado: 'En Progreso', descripcion: 'Plataforma para gestión barrial' }
  ],
  recursos: [
    { id: 'rec_1', serial: 'LAP-001', tipo: 'Portátil', modelo: 'Lenovo ThinkPad', estado: 'Disponible', cohorte: 'Cohorte 1' }
  ],
  solicitudes_recursos: [
    { id: 'sol_1', solicitante: 'Carlos Ruiz', serial: 'LAP-001', recurso: 'Portátil Lenovo', estado: 'Aprobado', fecha: '2026-10-01' }
  ],
  notificaciones: [
    { id: 'not_1', destinatario_usuario_id: 'u_est_1', titulo: 'Bienvenido al Portal Estudiante', mensaje: 'Tus clases inician esta semana.', leida: 0, fecha_envio: '2026-10-05 08:00:00' }
  ],
  horarios: [
    {
      id: 'hor_1',
      cohorte: 'Cohorte 1',
      mes: '2026-10',
      franjas: [
        { id: 'fr_1', dia: 'Lunes', inicio: '08:00', fin: '12:00', curso: 'Desarrollo Web Fullstack', docente: 'Freddy Palacios', estado: 'Activo' }
      ]
    }
  ]
};

// Global Store Mock
global.Store = {
  list: async (k) => mockDataStore[k] || [],
  get: async (k) => mockDataStore[k] || [],
  set: async (k, v) => { mockDataStore[k] = v; return true; },
  upsert: async (k, obj) => {
    if (!mockDataStore[k]) mockDataStore[k] = [];
    const idx = mockDataStore[k].findIndex(x => x.id === obj.id);
    if (idx !== -1) mockDataStore[k][idx] = obj;
    else mockDataStore[k].push(obj);
    return true;
  },
  delete: async (k, id) => {
    if (!mockDataStore[k]) return true;
    mockDataStore[k] = mockDataStore[k].filter(x => x.id !== id);
    return true;
  },
  clearCache: () => {}
};
global.fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const urlStr = String(url);
  for (const entity of Object.keys(mockDataStore)) {
    if (urlStr.includes('/' + entity) || urlStr.includes('=' + entity)) {
      if (method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => mockDataStore[entity]
        };
      }
      if (method === 'POST' && opts.body) {
        try {
          const parsed = JSON.parse(opts.body);
          mockDataStore[entity] = parsed.data !== undefined ? parsed.data : parsed;
        } catch (e) {}
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, id: 'mock-id' }) };
    }
  }
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

global.TableManager = {
  init: () => {},
  sort: () => {},
  filter: () => {}
};
global.window.TableManager = global.TableManager;

// Load application scripts
const scriptOrder = [
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

for (const s of scriptOrder) {
  const code = fs.readFileSync(path.join(__dirname, '..', s), 'utf8');
  eval(code);
}

async function runStudentTests() {
  console.log('======================================================');
  console.log(' SIMULACIÓN INTEGRAL DEL PORTAL DE ESTUDIANTES        ');
  console.log('======================================================\n');

  const studentUser = mockDataStore.usuarios.find(u => u.rol === 'Estudiante');
  console.log(`[1] Simulando inicio de sesión como Estudiante: ${studentUser.nombre} (${studentUser.cohorte})`);

  // Set the current student as app.js and estudiantes.js expect
  window.setCurrentEstudiante(studentUser);
  window.currentEstudiante = studentUser;
  window.currentUser = studentUser;
  localStorage.setItem('fundacion_current_estudiante', JSON.stringify(studentUser));

  // Initialize student portal
  await window.initEstudiante();
  console.log('✔ initEstudiante() completado con éxito.\n');

  const panelsToTest = [
    { key: 'resumen', label: 'Resumen y Dashboard General' },
    { key: 'notificaciones', label: 'Centro de Notificaciones' },
    { key: 'asistencia', label: 'Registro y Marcación de Asistencia' },
    { key: 'academico', label: 'Módulo Académico y Horarios' },
    { key: 'calificaciones', label: 'Calificaciones y Retroalimentación' },
    { key: 'pensum', label: 'Pensum y Material de Estudio' },
    { key: 'misProyectos', label: 'Mis Proyectos e Iniciativas' },
    { key: 'memorandos', label: 'Memorandos y Reconocimientos' },
    { key: 'pqr', label: 'PQR y Solicitudes' },
    { key: 'agenda', label: 'Agenda y Calendario Personal' },
    { key: 'solicitar_equipo', label: 'Solicitud y Préstamo de Equipos' },
    { key: 'perfil', label: 'Perfil de Estudiante y Habilidades' }
  ];

  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log('[2] Verificando carga y renderizado de cada módulo:');
  for (const p of panelsToTest) {
    process.stdout.write(`  - Panel '${p.key}' (${p.label})... `);
    try {
      await window.showPanelEstudiante(p.key);
      const mount = getElementById('mount-s-' + p.key);
      if (!mount) {
        throw new Error(`Contenedor mount-s-${p.key} no existe en el DOM`);
      }
      const html = mount.innerHTML || '';
      if (!html.trim()) {
        throw new Error(`mount-s-${p.key} está completamente vacío`);
      }
      if (html.includes('No se pudo cargar el módulo')) {
        throw new Error(`mount-s-${p.key} mostró cartel de error: "No se pudo cargar el módulo"`);
      }
      if (html.includes('animate-spin') && html.length < 250) {
        throw new Error(`mount-s-${p.key} quedó congelado en estado de carga (spinner)`);
      }

      console.log(`✔ OK (${html.length} bytes renderizados)`);
      passed++;
    } catch (err) {
      console.log(`✖ FALLÓ: ${err.message}`);
      failed++;
      failures.push({ panel: p.key, error: err.stack || err.message });
    }
  }

  console.log('\n[3] Verificando interacciones dinámicas del estudiante:');

  // Interacción 1: Calificaciones - Cambio de mes
  try {
    process.stdout.write('  - Cambio de mes en Calificaciones (cambiarCalifMesEstudiante)... ');
    if (typeof window.cambiarCalifMesEstudiante !== 'function') {
      throw new Error('window.cambiarCalifMesEstudiante no está expuesta');
    }
    await window.cambiarCalifMesEstudiante('2026-10');
    const calMount = getElementById('mount-s-calificaciones');
    if (!calMount || !calMount.innerHTML.includes('Taller 1')) {
      throw new Error('Las calificaciones no se actualizaron con el filtro de mes');
    }
    console.log('✔ OK');
    passed++;
  } catch (err) {
    console.log(`✖ FALLÓ: ${err.message}`);
    failed++;
    failures.push({ panel: 'calificaciones-interaccion', error: err.message });
  }

  // Interacción 2: Horarios - Cambio de mes
  try {
    process.stdout.write('  - Cambio de mes en Horarios (onCambiaMesEstudianteHorario)... ');
    if (typeof window.onCambiaMesEstudianteHorario !== 'function') {
      throw new Error('window.onCambiaMesEstudianteHorario no está expuesta');
    }
    await window.onCambiaMesEstudianteHorario('2026-10');
    console.log('✔ OK');
    passed++;
  } catch (err) {
    console.log(`✖ FALLÓ: ${err.message}`);
    failed++;
    failures.push({ panel: 'horario-interaccion', error: err.message });
  }

  // Interacción 3: Toggle asistencia extra
  try {
    process.stdout.write('  - Desplegar asistencia histórica (toggleAsistenciaExtra)... ');
    if (typeof window.toggleAsistenciaExtra !== 'function') {
      throw new Error('window.toggleAsistenciaExtra no está expuesta');
    }
    window.toggleAsistenciaExtra();
    console.log('✔ OK');
    passed++;
  } catch (err) {
    console.log(`✖ FALLÓ: ${err.message}`);
    failed++;
    failures.push({ panel: 'asistencia-interaccion', error: err.message });
  }

  // Interacción 4: Agenda - Añadir y eliminar evento
  try {
    process.stdout.write('  - Gestión de eventos de agenda (agregarEventoAgenda)... ');
    getElementById('ag_titulo').value = 'Estudiar para Evaluación';
    getElementById('ag_fecha').value = '2026-10-20';
    getElementById('ag_tipo').value = 'Taller';

    await window.agregarEventoAgenda();
    const agendaList = mockDataStore.agenda_estudiante;
    const added = agendaList.find(a => a.titulo === 'Estudiar para Evaluación');
    if (!added) throw new Error('El evento de agenda no se persistió en Store');
    await window.eliminarEventoAgenda(added.id);
    const stillThere = mockDataStore.agenda_estudiante.find(a => a.id === added.id);
    if (stillThere) throw new Error('El evento de agenda no fue eliminado correctamente');
    console.log('✔ OK (Añadir y eliminar evento verificado)');
    passed++;
  } catch (err) {
    console.log(`✖ FALLÓ: ${err.message}`);
    failed++;
    failures.push({ panel: 'agenda-interaccion', error: err.message });
  }

  console.log('\n======================================================');
  console.log(` RESUMEN DE PRUEBAS DE ESTUDIANTE: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('======================================================\n');

  if (failed > 0) {
    console.error('Detalle de errores:');
    failures.forEach(f => console.error(`- [${f.panel}]: ${f.error}`));
    process.exit(1);
  } else {
    console.log('¡TODOS LOS MÓDULOS DE ESTUDIANTE ESTÁN 100% OPERATIVOS Y VERIFICADOS!');
    process.exit(0);
  }
}

runStudentTests().catch(err => {
  console.error('Error fatal durante la simulación:', err);
  process.exit(1);
});
