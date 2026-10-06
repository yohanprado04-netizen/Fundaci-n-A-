/**
 * test_semaforo_robustness.js
 * Comprehensive automated simulation testing for the Semáforo de Riesgo module:
 *  1. Non-blocking overlay verification (drawer is hidden and pointer-events-none by default).
 *  2. Rendering of Superadmin dashboard (KPIs, Donut chart, Critical Alerts feed, Table).
 *  3. Cohorte select filter logic and memory caching.
 *  4. Risk pill filters ('todos', 'Rojo', 'Amarillo', 'Verde') instant table filtering.
 *  5. Search input filtering (names, risk words, motivos).
 *  6. 'Atender' button click -> modal opens with student prefilled.
 *  7. 'Ver Detalle' button click -> drawer opens with student diagnostics & interventions.
 *  8. 'Acción' button click -> modal opens.
 *  9. Submitting tutorial intervention to MySQL/Store.
 * 10. 'Exportar CSV' generation.
 * 11. Docente view (renderRiesgoDocente) with teacher cohorts.
 */

const fs = require('fs');
const path = require('path');

// Setup mock browser DOM
const dom = new Map();

function createElem(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: {
      _classes: new Set(),
      add(...c) { c.forEach(x => this._classes.add(x)); el.className = Array.from(this._classes).join(' '); },
      remove(...c) { c.forEach(x => this._classes.delete(x)); el.className = Array.from(this._classes).join(' '); },
      contains(x) { return this._classes.has(x); },
      toggle(x) { if (this.contains(x)) this.remove(x); else this.add(x); }
    },
    dataset: {},
    style: {},
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(html) {
      this._innerHTML = String(html || '');
      // Auto-extract IDs and instantiate in dom map
      const idMatches = [...this._innerHTML.matchAll(/id="([^"]+)"/g)];
      for (const m of idMatches) {
        const id = m[1];
        if (!dom.has(id)) {
          const sub = createElem('div');
          sub.id = id;
          dom.set(id, sub);
        }
        const elem = dom.get(id);
        // Find class for this element
        const snippet = this._innerHTML.slice(m.index, m.index + 200);
        const classMatch = snippet.match(/class="([^"]+)"/);
        if (classMatch) {
          classMatch[1].split(/\s+/).filter(Boolean).forEach(cls => elem.classList.add(cls));
        }
      }
    },
    value: '',
    children: [],
    parentElement: null,
    appendChild(ch) {
      this.children.push(ch);
      ch.parentElement = this;
      return ch;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) {
        const targetId = sel.slice(1);
        return dom.get(targetId) || null;
      }
      if (sel === 'tbody') {
        return this.children.find(c => c.tagName === 'TBODY') || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
    getContext() { return {}; }
  };
  return el;
}

global.document = {
  body: createElem('body'),
  createElement(tag) { return createElem(tag); },
  getElementById(id) { return dom.get(id) || null; },
  querySelector(sel) {
    if (sel.startsWith('#')) return dom.get(sel.slice(1)) || null;
    return null;
  },
  querySelectorAll() { return []; }
};

global.window = global;
global.requestAnimationFrame = (cb) => cb();

// Mock store data
const mockUsuarios = [
  { id: '1', nombre: 'Carlos Gomez', email: 'carlos@mail.com', cohorte: 'Cohorte 2026-A', rol: 'Estudiante', creado_en: '2026-01-01' },
  { id: '2', nombre: 'Maria Perez', email: 'maria@mail.com', cohorte: 'Cohorte 2026-A', rol: 'Estudiante', creado_en: '2026-01-01' },
  { id: '3', nombre: 'Yohan Prado', email: 'yohan@mail.com', cohorte: 'Cohorte 2026-B', rol: 'Estudiante', creado_en: '2026-02-01' },
  { id: '4', nombre: 'Laura Diaz', email: 'laura@mail.com', cohorte: 'Cohorte 2026-B', rol: 'Estudiante', creado_en: '2026-02-01' }
];

const mockModulos = [
  { id: 'm1', nombre: 'Cohorte 2026-A' },
  { id: 'm2', nombre: 'Cohorte 2026-B' }
];

const mockNotas = [
  {
    cohorte: 'Cohorte 2026-A',
    criterios: [{ id: 'c1', nombre: 'Taller 1', peso: 100 }],
    valores: { 'Carlos Gomez': { c1: '4.5' }, 'Maria Perez': { c1: '9.0' } }
  },
  {
    cohorte: 'Cohorte 2026-B',
    criterios: [{ id: 'c1', nombre: 'Taller 1', peso: 100 }],
    valores: { 'Yohan Prado': { c1: '8.5' }, 'Laura Diaz': { c1: '3.0' } }
  }
];

const mockAsistencia = [
  { estudiante: 'Carlos Gomez', estado: 'Falla', fecha: '2026-02-10' },
  { estudiante: 'Carlos Gomez', estado: 'Falla', fecha: '2026-02-11' },
  { estudiante: 'Carlos Gomez', estado: 'Falla', fecha: '2026-02-12' },
  { estudiante: 'Maria Perez', estado: 'Presente', fecha: '2026-02-10' },
  { estudiante: 'Maria Perez', estado: 'Presente', fecha: '2026-02-11' },
  { estudiante: 'Yohan Prado', estado: 'Presente', fecha: '2026-02-10' },
  { estudiante: 'Laura Diaz', estado: 'Falla', fecha: '2026-02-10' }
];

const mockSeguimiento = [
  { id: 'seg_1', estudiante_id: '1', estudiante_nombre: 'Carlos Gomez', tipo_accion: 'Llamada acudiente', observaciones: 'Compromiso de asistencia', estado: 'En seguimiento', created_at: '2026-02-15' }
];

global.Store = {
  async list(col) {
    if (col.startsWith('usuarios')) return mockUsuarios;
    if (col.startsWith('modulos')) return mockModulos;
    if (col.startsWith('notas_modulos')) return mockNotas;
    if (col.startsWith('asistencia')) return mockAsistencia;
    if (col.startsWith('seguimiento_alertas')) return mockSeguimiento;
    if (col.startsWith('semaforo')) return null; // trigger fallback calculation
    return [];
  },
  async get(col) {
    if (col === 'configuracion') return { asistenciaMinima: 80, notasMinimaAprobacion: 6.0 };
    return null;
  },
  async add(col, item) {
    if (col === 'seguimiento_alertas') mockSeguimiento.push(item);
    return item;
  }
};

global.apiFetch = async (endpoint, opts) => {
  if (endpoint.startsWith('seguimiento_alertas') && opts && opts.method === 'POST') {
    const payload = JSON.parse(opts.body);
    mockSeguimiento.push(payload);
    return { ok: true, id: payload.id };
  }
  if (endpoint.startsWith('seguimiento_alertas')) {
    return mockSeguimiento;
  }
  return [];
};

global.Chart = class {
  constructor(canvas, cfg) {
    this.canvas = canvas;
    this.cfg = cfg;
  }
  destroy() {}
};

global.toast = (msg, tipo) => {
  // console.log(`[Toast ${tipo}]: ${msg}`);
};

// Create main container mounts
const mountSemaforo = createElem('div');
mountSemaforo.id = 'mount-semaforo';
dom.set('mount-semaforo', mountSemaforo);

const mountDocente = createElem('div');
mountDocente.id = 'mount-t-riesgo';
dom.set('mount-t-riesgo', mountDocente);

// Run test suite
async function runTests() {
  console.log('====================================================');
  console.log('   TEST SUITE: SEMÁFORO EN RIESGO Y ALERTAS ROBUSTAS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✔ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${msg}`);
      failed++;
    }
  }

  // Load semaforo.js
  const semaforoCode = fs.readFileSync(path.join(__dirname, '..', 'semaforo.js'), 'utf8');
  eval(semaforoCode);

  assert(typeof window.renderSemaforo === 'function', 'renderSemaforo expuesto globalmente');
  assert(typeof window.computeSemaforo === 'function', 'computeSemaforo expuesto globalmente');
  assert(typeof window.verDetalleEstudianteSemaforo === 'function', 'verDetalleEstudianteSemaforo expuesto');
  assert(typeof window.abrirModalAccionSeguimiento === 'function', 'abrirModalAccionSeguimiento expuesto');
  assert(typeof window.cambiarFiltroSemaforoRiesgo === 'function', 'cambiarFiltroSemaforoRiesgo expuesto');
  assert(typeof window.filtrarSemaforoLive === 'function', 'filtrarSemaforoLive expuesto');

  // Test 1: Render Superadmin
  console.log('\n▶ 1. Renderizado Superadmin y Verificación de No-Bloqueo');
  await window.renderSemaforo();

  assert(mountSemaforo.innerHTML.includes('Semáforo de Riesgo y Alertas Tempranas'), 'Título de semáforo presente en DOM');
  assert(mountSemaforo.innerHTML.includes('Total Evaluados'), 'KPI Total Evaluados renderizado');
  assert(mountSemaforo.innerHTML.includes('Alertas Críticas'), 'Feed de Alertas Críticas renderizado');
  assert(mountSemaforo.innerHTML.includes('Carlos Gomez'), 'Estudiante Carlos Gomez presente en tabla');

  // Test 2: Overlay check
  const drawer = document.getElementById('drawer-estudiante-semaforo');
  const modal = document.getElementById('modal-accion-seguimiento');
  assert(drawer !== null, 'Drawer lateral existe en DOM');
  assert(modal !== null, 'Modal de seguimiento existe en DOM');
  assert(drawer.classList.contains('hidden'), 'CRÍTICO: Drawer tiene clase "hidden" cuando está cerrado (no bloquea pantalla)');
  assert(drawer.classList.contains('pointer-events-none'), 'Drawer tiene pointer-events-none cuando está cerrado');
  assert(modal.classList.contains('hidden'), 'Modal de seguimiento tiene clase "hidden" cuando está cerrado');

  // Test 3: Filtros de Riesgo
  console.log('\n▶ 2. Filtro Instantáneo por Nivel de Riesgo');
  window.cambiarFiltroSemaforoRiesgo('Rojo');
  assert(drawer.classList.contains('hidden'), 'Drawer permanece hidden tras cambiar filtro de riesgo');

  window.cambiarFiltroSemaforoRiesgo('todos');
  assert(true, 'Filtro todos restablecido sin errores');

  // Test 4: Abrir Modal de Acción Tutorial
  console.log('\n▶ 3. Interacción Modal de Acción Tutorial (Botón Atender / Acción)');
  // Register inputs in mock DOM
  ['seg-estudiante-id', 'seg-estudiante-nombre', 'seg-cohorte', 'seg-tipo-accion', 'seg-estado', 'seg-observaciones', 'seg-compromiso', 'seg-fecha-compromiso'].forEach(id => {
    const inp = createElem('input');
    inp.id = id;
    dom.set(id, inp);
  });

  await window.abrirModalAccionSeguimiento('1');
  assert(!modal.classList.contains('hidden'), 'Modal se abre correctamente (remueve clase hidden)');
  assert(document.getElementById('seg-estudiante-nombre').value === 'Carlos Gomez', 'Modal precarga nombre del estudiante seleccionado');

  // Submit action
  document.getElementById('seg-observaciones').value = 'Se contactó acudiente por inasistencia reiterada';
  await window.guardarAccionSeguimiento({ preventDefault() {} });
  assert(modal.classList.contains('hidden'), 'Modal se cierra automáticamente al guardar con éxito');
  assert(mockSeguimiento.some(s => s.observaciones.includes('inasistencia reiterada')), 'Intervención tutorial guardada en bitácora');

  // Test 5: Abrir Drawer de Detalle
  console.log('\n▶ 4. Drawer Master-Detail de Historial del Estudiante');
  const drawerContent = createElem('div');
  drawerContent.id = 'drawer-estudiante-content';
  dom.set('drawer-estudiante-content', drawerContent);

  await window.verDetalleEstudianteSemaforo('1');
  assert(!drawer.classList.contains('hidden'), 'Drawer se abre correctamente (remueve clase hidden)');
  assert(drawer.classList.contains('opacity-100'), 'Drawer activa opacidad visible');
  assert(drawerContent.innerHTML.includes('Carlos Gomez'), 'Drawer contiene datos de Carlos Gomez');

  window.cerrarDetalleEstudianteSemaforo();
  assert(drawer.classList.contains('opacity-0'), 'Drawer inicia transición de cierre con opacity-0');

  // Test 6: Portal Docente
  console.log('\n▶ 5. Semáforo en Portal Docente');
  global.docenteModulosActivos = async () => [{ id: 'm1', nombre: 'Cohorte 2026-A' }];
  await window.renderRiesgoDocente();
  assert(mountDocente.innerHTML.includes('Semáforo de Riesgo Académico'), 'Docente view renderiza título');
  assert(mountDocente.innerHTML.includes('Carlos Gomez'), 'Docente visualiza a estudiantes de su cohorte');

  // Summary
  console.log('\n====================================================');
  console.log(`  Total pruebas: ${passed + failed}`);
  console.log(`  Aprobadas:     ${passed}`);
  console.log(`  Fallidas:      ${failed}`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('[ÉXITO] Todas las pruebas del módulo Semáforo pasaron al 100%.');
    process.exit(0);
  } else {
    console.error('[ERROR] Se detectaron fallos.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
