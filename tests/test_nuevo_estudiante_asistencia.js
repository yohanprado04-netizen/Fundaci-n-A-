/**
 * Test: Verificación de regla institucional:
 * Un estudiante nuevo en un salón/cohorte que entra sin registrar asistencia
 * NO puede aparecer con Falla.
 * Las asistencias deben tomarse desde que entra; si no existía, no pueden ponerle falla.
 */

const assert = require('assert');
const fs = require('fs');

console.log('======================================================');
console.log(' TEST: ASISTENCIA DE ESTUDIANTE NUEVO EN EL SALÓN     ');
console.log('======================================================');

const domElements = new Map();

function createElementMock(tag) {
  return {
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
    style: { setProperty() {}, getPropertyValue() {} },
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
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] !== undefined ? this[k] : null; },
    removeAttribute(k) { delete this[k]; },
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
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  alert: () => {},
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
  createElementNS: (ns, tag) => createElementMock(tag),
  querySelector: () => null,
  querySelectorAll: () => [],
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

const hoyStr = new Date().toISOString().slice(0, 10);
const ahoraStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

// Mock Store en memoria
const mockDb = {
  usuarios: [
    { id: 'u_antiguo', nombre: 'Estudiante Antiguo', rol: 'Estudiante', cohorte: 'Cohorte A', creado_en: '2026-09-01 08:00:00' },
    { id: 'u_nuevo', nombre: 'Estudiante Nuevo', rol: 'Estudiante', cohorte: 'Cohorte A', creado_en: hoyStr + ' 09:30:00' }
  ],
  modulos: [
    { id: 'm1', nombre: 'Cohorte A', modulo: 'Desarrollo Web' }
  ],
  sesiones_asistencia: [
    // Sesión pasada (1 de octubre): el estudiante nuevo aún no existía
    { id: 'ses_pasada', cohorte: 'Cohorte A', modulo: 'Desarrollo Web', materia: 'Desarrollo Web', fecha: '2026-10-01', horaInicio: '2026-10-01 08:00:00', codigo: 'ABC123', iniciadaPor: 'Profesor X' },
    // Sesión de hoy que inició a las 08:00:00 (antes del registro del estudiante nuevo a las 09:30:00)
    { id: 'ses_hoy_previa', cohorte: 'Cohorte A', modulo: 'Desarrollo Web', materia: 'Desarrollo Web', fecha: hoyStr, horaInicio: hoyStr + ' 08:00:00', codigo: 'PREV12', iniciadaPor: 'Profesor X' },
    // Sesión de hoy activa que inició ahora mismo (dentro de los 50 min de tolerancia)
    { id: 'ses_hoy_activa', cohorte: 'Cohorte A', modulo: 'Desarrollo Web', materia: 'Desarrollo Web', fecha: hoyStr, horaInicio: ahoraStr, codigo: 'ACT123', iniciadaPor: 'Profesor X' }
  ],
  asistencia: [],
  justificaciones_asistencia: [],
  configuracion: { asistenciaMinima: 80, notasMinimaAprobacion: 6.0 },
  notas_modulos: []
};

const scriptsToLoad = ['db.js', 'app.js', 'asistencia.js', 'estudiantes.js', 'semaforo.js'];
for (const file of scriptsToLoad) {
  const code = fs.readFileSync(file, 'utf8');
  const fn = new Function(code);
  fn();
  if (file === 'db.js') {
    global.Store = windowMock.Store;
    global.apiFetch = windowMock.apiFetch;
  }
}

// Configurar Store mock
Store.list = async (entidad) => JSON.parse(JSON.stringify(mockDb[entidad] || []));
Store.get = async (entidad) => JSON.parse(JSON.stringify(mockDb[entidad] || null));
Store.set = async (entidad, datos) => { mockDb[entidad] = JSON.parse(JSON.stringify(datos)); return { ok: true }; };

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(nombre, fn) {
    total++;
    try {
      fn();
      console.log(`  ✔ PASS: ${nombre}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ FAIL: ${nombre}`);
      console.error('    Error:', err.message);
    }
  }

  console.log('\n▶ 1. Verificación de estado en sesión activa y sesiones previas');

  const estadoActualEstudianteSesion = windowMock.estadoActualEstudianteSesion;
  const sincronizarAusentesSesion = windowMock.sincronizarAusentesSesion;
  const computeSemaforo = windowMock.computeSemaforo;
  const renderResumenEstudiante = windowMock.renderResumenEstudiante;
  const renderAsistenciaEstudiante = windowMock.renderAsistenciaEstudiante;

  const sesPasada = mockDb.sesiones_asistencia[0];
  const sesPrevia = mockDb.sesiones_asistencia[1];
  const sesActiva = mockDb.sesiones_asistencia[2];
  const estNuevo = mockDb.usuarios[1];
  const estAntiguo = mockDb.usuarios[0];

  global.uid = (p) => p + '_' + Math.random().toString(36).substring(2, 9);

  // Caso 1: Estudiante nuevo consulta sesión pasada donde NO existía
  const estadoPrevio = await estadoActualEstudianteSesion(sesPasada, estNuevo.nombre, mockDb.asistencia, estNuevo);
  test('Estudiante nuevo en sesión pasada retorna "No aplica" (no Falla)', () => {
    assert.strictEqual(estadoPrevio.estado, 'No aplica');
    assert.strictEqual(estadoPrevio.automatico, false);
  });

  // Caso 2: Estudiante nuevo en sesión previa de hoy que inició antes de su matrícula
  const estadoPreviaHoy = await estadoActualEstudianteSesion(sesPrevia, estNuevo.nombre, mockDb.asistencia, estNuevo);
  test('Estudiante nuevo en sesión previa de hoy retorna "No aplica" (no Falla)', () => {
    assert.strictEqual(estadoPreviaHoy.estado, 'No aplica');
    assert.strictEqual(estadoPreviaHoy.automatico, false);
  });

  // Caso 3: Estudiante nuevo en sesión activa que aún no ha escaneado
  const estadoActiva = await estadoActualEstudianteSesion(sesActiva, estNuevo.nombre, mockDb.asistencia, estNuevo);
  test('Estudiante nuevo en sesión activa retorna "Esperando escaneo" (no Falla)', () => {
    assert.strictEqual(estadoActiva.estado, 'Esperando escaneo');
    assert.strictEqual(estadoActiva.automatico, false);
  });

  // Caso 4: Al estar en sesión activa, sincronizarAusentes NO debe registrar Falla
  windowMock.currentDocente = { nombre: 'Profesor X' };
  windowMock.docenteAsistCohorte = 'Cohorte A';
  mockDb.asistencia = []; // Vacío

  await sincronizarAusentesSesion(sesActiva, mockDb.usuarios);
  test('sincronizarAusentesSesion durante sesión activa NO genera ninguna Falla en BD', () => {
    assert.strictEqual(mockDb.asistencia.length, 0);
  });

  console.log('\n▶ 2. Verificación de Semáforo para estudiante nuevo');
  const listaSemaforo = await computeSemaforo('Cohorte A');
  const semNuevo = listaSemaforo.find(s => s.nombre === estNuevo.nombre);

  test('Semáforo no penaliza a estudiante nuevo con fallas acumuladas', () => {
    assert.ok(semNuevo, 'Estudiante nuevo encontrado en semáforo');
    assert.strictEqual(semNuevo.fallasConsecutivas, 0);
    assert.strictEqual(semNuevo.asistencia, '—');
    assert.strictEqual(semNuevo.riesgo, 'Verde');
  });

  console.log('\n▶ 3. Verificación de portal estudiante (Resumen y Asistencia)');
  // Simular sesión iniciada del estudiante nuevo
  windowMock.currentUser = { rol: 'Estudiante', nombre: estNuevo.nombre, cohorte: 'Cohorte A' };
  windowMock.currentEstudiante = estNuevo;

  await renderResumenEstudiante();
  const resumenHtml = getElementById('mount-s-resumen').innerHTML;
  test('Resumen de estudiante nuevo no muestra fallas previas ni asistencia 0%', () => {
    assert.ok(!resumenHtml.includes('0% de asistencia'), 'No debe mostrar 0% de asistencia');
  });

  await renderAsistenciaEstudiante();
  const asistHtml = getElementById('mount-s-asistencia').innerHTML;
  test('Panel asistencia muestra tarjeta de clase en curso y 0 fallas computadas', () => {
    assert.ok(asistHtml.includes('Sesión en curso') || asistHtml.includes('Escanear QR'), 'Debe mostrar tarjeta de sesión en curso');
    assert.ok(asistHtml.includes('Esta sesión inició antes de tu fecha de registro') || asistHtml.includes('No aplica'), 'Debe indicar que la sesión previa no aplica');
    // Inasistencias computadas debe ser 0
    assert.ok(asistHtml.includes('<p class="text-2xl font-extrabold text-coral mt-1">0</p>'), 'Total inasistencias computadas debe ser 0');
  });

  console.log('\n======================================================');
  console.log(` RESULTADO: ${passed}/${total} pruebas pasadas`);
  console.log('======================================================');

  if (passed === total) {
    console.log('[ÉXITO] Todas las reglas de asistencia para estudiantes nuevos verificadas (100% OK).');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
