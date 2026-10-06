/**
 * Test de verificación integral de eliminación y gestión de agenda
 * para Estudiantes y Docentes (Backend MySQL + Endpoints + Frontend logic)
 */
const http = require('http');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost';
const PORT = 80;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `${BASE_URL}:${PORT}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body !== undefined) {
      if (typeof options.body === 'object') {
        reqOptions.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, data: json });
      });
    });

    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

function generarTokenPhp(user) {
  const b64 = Buffer.from(JSON.stringify(user)).toString('base64');
  const code = `require 'api/config.php'; require 'api/middleware.php'; echo generarToken(json_decode(base64_decode('${b64}'), true));`;
  return execSync(`php -r "${code}"`, { cwd: 'c:/xampp/htdocs/fundacion-api' }).toString().trim();
}

async function run() {
  console.log('========================================================');
  console.log(' TEST: ELIMINACIÓN DE AGENDA (ESTUDIANTE Y DOCENTE)    ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ OK: ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FALLÓ: ${message}`);
      failed++;
    }
  }

  // 1. Obtener token de Estudiante (Yohan Andres Prado Palacios)
  console.log('[1] Generando token firmado para Estudiante: Yohan Andres Prado Palacios...');
  const studentToken = generarTokenPhp({
    id: 'us_mu0nm69p0mtdc',
    nombre: 'Yohan Andres Prado Palacios',
    email: 'yohanprado04@gmail.com',
    rol: 'Estudiante'
  });
  assert(!!studentToken, 'Token obtenido para Estudiante');

  // 2. Si existe el evento viejo "SJDJD" (ag_mux2sylmhnjcr) de la foto del usuario, eliminarlo
  console.log('\n[2] Eliminando evento "SJDJD" visto en la captura del usuario (ag_mux2sylmhnjcr)...');
  const resDelViejo = await request('/fundacion-api/api/agenda_estudiante?id=ag_mux2sylmhnjcr', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resDelViejo.status === 200, `Eliminación de evento previo ag_mux2sylmhnjcr respondió HTTP 200`);

  // Verificar que ag_mux2sylmhnjcr ya no esté en la base de datos
  const checkOld = await request('/fundacion-api/api/agenda_estudiante?estudiante=Yohan%20Andres%20Prado%20Palacios', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(!checkOld.data.some(e => e.id === 'ag_mux2sylmhnjcr'), 'El evento ag_mux2sylmhnjcr "SJDJD" fue eliminado con éxito de MySQL');

  // 3. Crear 2 eventos de prueba para estudiante
  console.log('\n[3] Creando 2 eventos de prueba en agenda_estudiante...');
  const ev1Id = 'test_ev_est_1';
  const ev2Id = 'test_ev_est_2';
  const postEst = await request('/fundacion-api/api/agenda_estudiante', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: [
      { id: ev1Id, estudiante: 'Yohan Andres Prado Palacios', titulo: 'Entrega Taller 1', tipo: 'Taller', fecha: '2026-10-15', hora: '10:00', notas: 'Nota 1' },
      { id: ev2Id, estudiante: 'Yohan Andres Prado Palacios', titulo: 'Quiz React', tipo: 'Quiz', fecha: '2026-10-16', hora: '14:00', notas: 'Nota 2' }
    ]
  });
  assert(postEst.status === 200, `POST agenda_estudiante exitoso (HTTP ${postEst.status})`);

  // Consultar agenda estudiante
  const getEst1 = await request('/fundacion-api/api/agenda_estudiante?estudiante=Yohan%20Andres%20Prado%20Palacios', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(Array.isArray(getEst1.data) && getEst1.data.some(e => e.id === ev1Id) && getEst1.data.some(e => e.id === ev2Id),
    'Los dos eventos aparecen en la consulta GET de agenda_estudiante');

  // 4. Eliminar el primer evento con DELETE
  console.log('\n[4] Eliminando primer evento mediante DELETE /api/agenda_estudiante?id=...');
  const delEst1 = await request(`/fundacion-api/api/agenda_estudiante?id=${ev1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(delEst1.status === 200, 'DELETE agenda_estudiante respondió HTTP 200');

  const getEst2 = await request('/fundacion-api/api/agenda_estudiante?estudiante=Yohan%20Andres%20Prado%20Palacios', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(!getEst2.data.some(e => e.id === ev1Id), 'El primer evento YA NO existe en la base de datos');
  assert(getEst2.data.some(e => e.id === ev2Id), 'El segundo evento aún permanece');

  // 5. Eliminar el segundo evento (quedando en 0 eventos) mediante DELETE
  console.log('\n[5] Eliminando segundo evento (quedando en 0 eventos)...');
  const delEst2 = await request(`/fundacion-api/api/agenda_estudiante?id=${ev2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(delEst2.status === 200, 'DELETE segundo evento respondió HTTP 200');

  const getEst3 = await request('/fundacion-api/api/agenda_estudiante?estudiante=Yohan%20Andres%20Prado%20Palacios', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(Array.isArray(getEst3.data) && getEst3.data.length === 0, 'La agenda del estudiante quedó completamente vacía (0 eventos en MySQL)');

  // 6. Probar poda de agenda de estudiante enviando array vacío [] vía POST
  console.log('\n[6] Probando poda de agenda de estudiante enviando array vacío [] vía POST...');
  await request('/fundacion-api/api/agenda_estudiante', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: [{ id: 'temp_ev_1', estudiante: 'Yohan Andres Prado Palacios', titulo: 'Temp', tipo: 'Evento', fecha: '2026-10-20' }]
  });
  const postPruneEst = await request('/fundacion-api/api/agenda_estudiante', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: []
  });
  assert(postPruneEst.status === 200, 'POST [] respondió HTTP 200');
  const getEst4 = await request('/fundacion-api/api/agenda_estudiante?estudiante=Yohan%20Andres%20Prado%20Palacios', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(Array.isArray(getEst4.data) && getEst4.data.length === 0, 'Poda de POST [] eliminó correctamente todos los eventos de la base de datos');


  // ==========================================
  // PRUEBAS DE AGENDA DOCENTE
  // ==========================================
  console.log('\n[7] Generando token para Docente: Freddy...');
  const docToken = generarTokenPhp({
    id: 'us_mu365lo73iq0d',
    nombre: 'Freddy',
    email: 'profesor@gmail.com',
    rol: 'Docente'
  });
  assert(!!docToken, 'Token obtenido para pruebas de Docente');

  console.log('\n[8] Creando 2 eventos de prueba en agenda_docente...');
  const evDoc1 = 'test_ev_doc_1';
  const evDoc2 = 'test_ev_doc_2';
  const postDoc = await request('/fundacion-api/api/agenda_docente', {
    method: 'POST',
    headers: { Authorization: `Bearer ${docToken}` },
    body: [
      { id: evDoc1, docente: 'Freddy', titulo: 'Clase Magistral Algoritmos', tipo: 'Clase', fecha: '2026-10-18', hora: '08:00', notas: 'Notas clase' },
      { id: evDoc2, docente: 'Freddy', titulo: 'Reunión de Coordinación', tipo: 'Reunión', fecha: '2026-10-19', hora: '16:00', notas: 'Notas reunión' }
    ]
  });
  assert(postDoc.status === 200, `POST agenda_docente exitoso (HTTP ${postDoc.status})`);

  // Consultar agenda docente
  const getDoc1 = await request('/fundacion-api/api/agenda_docente?docente=Freddy', {
    method: 'GET',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(Array.isArray(getDoc1.data) && getDoc1.data.some(e => e.id === evDoc1) && getDoc1.data.some(e => e.id === evDoc2),
    'Los dos eventos aparecen en la consulta GET de agenda_docente');

  // Eliminar primer evento con DELETE
  console.log('\n[9] Eliminando primer evento de docente mediante DELETE...');
  const delDoc1 = await request(`/fundacion-api/api/agenda_docente?id=${evDoc1}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(delDoc1.status === 200, 'DELETE agenda_docente respondió HTTP 200');

  const getDoc2 = await request('/fundacion-api/api/agenda_docente?docente=Freddy', {
    method: 'GET',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(!getDoc2.data.some(e => e.id === evDoc1), 'El primer evento de docente YA NO existe en la base de datos');
  assert(getDoc2.data.some(e => e.id === evDoc2), 'El segundo evento de docente permanece');

  // Eliminar segundo evento con DELETE (0 eventos)
  console.log('\n[10] Eliminando segundo evento de docente (quedando en 0 eventos)...');
  const delDoc2 = await request(`/fundacion-api/api/agenda_docente?id=${evDoc2}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(delDoc2.status === 200, 'DELETE segundo evento de docente respondió HTTP 200');

  const getDoc3 = await request('/fundacion-api/api/agenda_docente?docente=Freddy', {
    method: 'GET',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(Array.isArray(getDoc3.data) && getDoc3.data.length === 0, 'La agenda del docente quedó completamente vacía (0 eventos en MySQL)');

  // Probar poda de agenda docente con POST []
  console.log('\n[11] Probando poda de agenda de docente enviando array vacío [] vía POST...');
  await request('/fundacion-api/api/agenda_docente', {
    method: 'POST',
    headers: { Authorization: `Bearer ${docToken}` },
    body: [{ id: 'temp_doc_1', docente: 'Freddy', titulo: 'Clase Temp', tipo: 'Clase', fecha: '2026-10-22' }]
  });
  const postPruneDoc = await request('/fundacion-api/api/agenda_docente', {
    method: 'POST',
    headers: { Authorization: `Bearer ${docToken}` },
    body: []
  });
  assert(postPruneDoc.status === 200, 'POST [] docente respondió HTTP 200');
  const getDoc4 = await request('/fundacion-api/api/agenda_docente?docente=Freddy', {
    method: 'GET',
    headers: { Authorization: `Bearer ${docToken}` }
  });
  assert(Array.isArray(getDoc4.data) && getDoc4.data.length === 0, 'Poda de POST [] eliminó correctamente todos los eventos de la agenda docente en MySQL');

  // ==========================================
  // PRUEBA DE SEGURIDAD RBAC / IDOR
  // ==========================================
  console.log('\n[12] Verificando protección IDOR: Estudiante no puede mutar agenda de docente...');
  const idorDocente = await request('/fundacion-api/api/agenda_docente', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: [{ id: 'idor_doc_1', docente: 'Freddy', titulo: 'Hacked', tipo: 'Clase', fecha: '2026-10-22' }]
  });
  assert(idorDocente.status === 403, `Estudiante intentando mutar agenda_docente recibe HTTP 403 Prohibido (status: ${idorDocente.status})`);

  console.log('\n========================================================');
  console.log(` RESUMEN: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Error fatal durante la prueba:', err);
  process.exit(1);
});
