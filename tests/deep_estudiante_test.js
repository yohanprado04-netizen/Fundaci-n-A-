/**
 * deep_estudiante_test.js
 * Deep diagnostic: loads ALL scripts and simulates the full student login flow,
 * testing every panel renderer individually and capturing detailed error info.
 */
const fs = require('fs');
const path = require('path');

// ─── Minimal Browser Environment ────────────────────────────────────────────
const domElements = new Map();
function createEl(tag) {
  const el = {
    tagName: tag.toUpperCase(), id: '', className: '', value: '', type: '', checked: false,
    disabled: false, innerHTML: '', innerText: '', textContent: '', children: [], childNodes: [],
    parentNode: null, style: {}, dataset: {},
    classList: {
      _c: new Set(),
      add(...c) { c.forEach(x => this._c.add(x)); },
      remove(...c) { c.forEach(x => this._c.delete(x)); },
      contains(c) { return this._c.has(c); },
      toggle(c, f) { if (f === undefined ? this.contains(c) : !f) this.remove(c); else this.add(c); }
    },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i !== -1) this.children.splice(i, 1); return c; },
    querySelector(s) {
      if (s.startsWith('#')) return getElementById(s.slice(1));
      return null;
    },
    querySelectorAll(s) {
      // Support .panel-tab-s and .panel-content-s etc
      if (s.startsWith('.panel-tab-s')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-tab-s'));
      if (s.startsWith('.panel-content-s')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-content-s'));
      if (s.startsWith('.panel-tab-t')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-tab-t'));
      if (s.startsWith('.panel-content-t')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-content-t'));
      if (s.startsWith('.panel-tab')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-tab'));
      if (s.startsWith('.panel-content')) return Array.from(domElements.values()).filter(e => e.className && e.className.includes('panel-content'));
      return [];
    },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    removeAttribute() {}, focus() {}, blur() {}, click() {}, scrollTo() {}, closest() { return null; }
  };
  return el;
}
function getElementById(id) {
  if (!domElements.has(id)) {
    const el = createEl('div');
    el.id = id;
    domElements.set(id, el);
  }
  return domElements.get(id);
}

const location = { hash: '#', hostname: 'localhost', protocol: 'http:', href: 'http://localhost/' };
const windowMock = {
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  sessionStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  navigator: { onLine: true, userAgent: 'node-test' },
  location,
  alert: () => {}, confirm: () => true, prompt: () => null,
  scrollTo: () => {}, print: () => {},
  matchMedia: () => ({ matches: false, addListener: () => {}, removeEventListener: () => {} }),
  addEventListener: () => {}, removeEventListener: () => {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: null, console,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  performance: { now: Date.now },
  history: { pushState: () => {}, replaceState: () => {} }
};
const docMock = {
  readyState: 'complete',
  documentElement: createEl('html'),
  body: createEl('body'),
  getElementById,
  querySelector(s) { if (s.startsWith('#')) return getElementById(s.slice(1)); return createEl('div'); },
  querySelectorAll(s) {
    if (s.startsWith('.panel-tab-s')) return [];
    if (s.startsWith('.panel-content-s')) return [];
    return [];
  },
  createElement: createEl,
  addEventListener: () => {}, removeEventListener: () => {},
};
windowMock.document = docMock;
global.window = windowMock;
global.document = docMock;
global.localStorage = windowMock.localStorage;
global.sessionStorage = windowMock.sessionStorage;
global.navigator = windowMock.navigator;
global.location = location;
global.alert = windowMock.alert;
global.confirm = windowMock.confirm;

// Mock fetch with test data
const mockDB = {
  usuarios: [
    { id: 'u1', nombre: 'Admin', email: 'admin@test.co', rol: 'Superadmin', cohortes_permitidas: '*' },
    { id: 'u2', nombre: 'Docente Test', email: 'doc@test.co', rol: 'Docente', cohorte: 'Cohorte 1', materias: ['Python'] },
    { id: 'u3', nombre: 'Ana Estudiante', email: 'ana@test.co', rol: 'Estudiante', cohorte: 'Cohorte 1' }
  ],
  configuracion: { institucion: 'Fundación A+', notaMinima: 6.0 },
  modulos: [{ id: 'm1', nombre: 'Módulo 1', materia: 'Python', cohorte: 'Cohorte 1', ponderacion: 100 }],
  cursos: [{ id: 'c1', nombre: 'TrAIning IA', cohorte: 'Cohorte 1' }],
  pensum: [{ id: 'p1', materia: 'Python', modulo: 'Módulo 1', cohorte: 'Cohorte 1', docente: 'Docente Test', horas: 40 }],
  calificaciones: [{ id: 'cal1', estudiante: 'Ana Estudiante', materia: 'Python', cohorte: 'Cohorte 1', nota: 8.5, mes: '2026-10' }],
  asistencia: [{ id: 'a1', estudiante: 'Ana Estudiante', cohorte: 'Cohorte 1', fecha: '2026-10-01', estado: 'Presente' }],
  informes: [],
  memorandos: [],
  pqr: [],
  horarios: [],
  agenda_estudiante: [],
  perfiles: [{ id: 'perf1', nombre: 'Básico', permisos: {} }],
  recursos_inventario: [],
  solicitudes_equipos: [],
  prestamos_historial: [],
  notificaciones: [],
  proyectos_fundacion: [],
  proyectos_estudiantes: []
};
global.fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const urlStr = String(url);
  for (const entity of Object.keys(mockDB)) {
    if (urlStr.includes('/' + entity) || urlStr.includes('=' + entity)) {
      if (method === 'GET') {
        return { ok: true, json: async () => Array.isArray(mockDB[entity]) ? mockDB[entity] : mockDB[entity] };
      }
      return { ok: true, json: async () => ({ id: 'new-' + Date.now() }) };
    }
  }
  return { ok: true, json: async () => ({}) };
};

// Load scripts
const basePath = path.join(__dirname, '..');
const scripts = ['db.js', 'app.js', 'forms.js', 'recursos.js', 'comunicados.js', 'pagos.js', 'proyectos.js', 'trainee.js', 'chat.js', 'asistencia.js', 'docentes.js', 'estudiantes.js', 'semaforo.js'];

console.log('Loading scripts...');
for (const file of scripts) {
  try {
    const code = fs.readFileSync(path.join(basePath, file), 'utf8');
    const fn = new Function(code);
    fn();
    if (file === 'db.js') { global.Store = windowMock.Store; global.apiFetch = windowMock.apiFetch; }
    console.log(`  ✔ ${file}`);
  } catch (err) {
    console.error(`  ✖ ERROR in ${file}: ${err.message}`);
    process.exit(1);
  }
}

// ─── Test each estudiante renderer ─────────────────────────────────────────
async function runTests() {
  // Set up estudiante session
  const est = { id: 'u3', nombre: 'Ana Estudiante', email: 'ana@test.co', rol: 'Estudiante', cohorte: 'Cohorte 1' };
  if (typeof window.setCurrentEstudiante === 'function') window.setCurrentEstudiante(est);
  window.currentEstudiante = est;

  const panels = [
    { name: 'resumen', fn: () => window.renderResumenEstudiante && window.renderResumenEstudiante() },
    { name: 'perfil', fn: () => window.renderPerfilEstudiante && window.renderPerfilEstudiante() },
    { name: 'asistencia', fn: () => window.renderAsistenciaEstudiante && window.renderAsistenciaEstudiante() },
    { name: 'academico', fn: () => window.RENDERERS_ESTUDIANTE && window.RENDERERS_ESTUDIANTE.academico && window.RENDERERS_ESTUDIANTE.academico() },
    { name: 'calificaciones', fn: () => window.renderCalificacionesEstudiante && window.renderCalificacionesEstudiante() },
    { name: 'pensum', fn: () => window.renderPensumEstudiante && window.renderPensumEstudiante() },
    { name: 'memorandos', fn: () => window.renderMemorandosEstudiante && window.renderMemorandosEstudiante() },
    { name: 'pqr', fn: () => window.renderPqrEstudiante && window.renderPqrEstudiante() },
    { name: 'agenda', fn: () => window.renderAgendaEstudiante && window.renderAgendaEstudiante() },
    { name: 'solicitar_equipo', fn: () => window.renderSolicitarEquipoForm && window.renderSolicitarEquipoForm('mount-s-solicitar_equipo') },
  ];

  console.log('\n=== ESTUDIANTE PANEL DIAGNOSTICS ===');
  let passed = 0, failed = 0;
  for (const { name, fn } of panels) {
    const mountId = 'mount-s-' + name;
    // Make sure mount el exists
    getElementById(mountId);
    try {
      await fn();
      const mount = getElementById(mountId);
      const html = mount.innerHTML || '';
      if (html.length > 100) {
        console.log(`  ✔ ${name}: ${html.length} bytes rendered`);
        passed++;
      } else {
        console.log(`  ⚠ ${name}: Rendered but empty/short (${html.length} bytes) — checking window export...`);
        // Check if function is defined on window
        const winKey = 'render' + name.charAt(0).toUpperCase() + name.slice(1) + 'Estudiante';
        console.log(`    window.${winKey} = ${typeof window[winKey]}`);
        console.log(`    RENDERERS_ESTUDIANTE.${name} = ${typeof (window.RENDERERS_ESTUDIANTE && window.RENDERERS_ESTUDIANTE[name])}`);
        passed++;
      }
    } catch (e) {
      console.error(`  ✖ ${name}: ERROR — ${e.message}`);
      console.error(`    Stack: ${e.stack ? e.stack.split('\n').slice(0,4).join('\n    ') : 'N/A'}`);
      failed++;
    }
  }

  // Check all window exports
  console.log('\n=== WINDOW EXPORT AUDIT ===');
  const expectedExports = [
    'initEstudiante', 'showPanelEstudiante', 'renderResumenEstudiante',
    'renderPerfilEstudiante', 'renderCalificacionesEstudiante', 'renderAsistenciaEstudiante',
    'renderPensumEstudiante', 'renderMemorandosEstudiante', 'renderPqrEstudiante',
    'renderAgendaEstudiante', 'renderEncuestasEstudiante', 'RENDERERS_ESTUDIANTE'
  ];
  for (const key of expectedExports) {
    const type = typeof window[key];
    const status = (type === 'function' || type === 'object') ? '✔' : '✖ MISSING';
    console.log(`  ${status} window.${key}: ${type}`);
  }

  if (window.RENDERERS_ESTUDIANTE) {
    console.log('\n=== RENDERERS_ESTUDIANTE KEYS ===');
    Object.keys(window.RENDERERS_ESTUDIANTE).forEach(k => {
      console.log(`  ${k}: ${typeof window.RENDERERS_ESTUDIANTE[k]}`);
    });
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
