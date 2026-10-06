<?php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/test_helper.php';

TestRunner::section("1. Integridad de Base de Datos y Esquema DDL");

try {
    $pdo = obtenerConexion();
    TestRunner::assert("Conexión PDO a MySQL activa", true, "DB: " . DB_NAME);
} catch (Exception $e) {
    TestRunner::assert("Conexión PDO a MySQL activa", false, $e->getMessage());
    return;
}

// 1. Verificar existencia de las 38 tablas esperadas
$tablasEsperadas = [
    'agenda_docente', 'agenda_estudiante', 'asistencia', 'auditoria_acciones',
    'auditoria_horario', 'auditoria_login', 'chat_voz_conocimiento', 'comunicados',
    'configuracion', 'cursos', 'encuestas', 'formulario_preguntas',
    'formulario_respuesta_valores', 'formulario_respuestas', 'formularios',
    'historial_prestamos', 'horarios', 'informes_docente', 'justificaciones_asistencia',
    'memorandos', 'memorandos_leidos', 'modulos', 'notas_modulos', 'pagos_docentes',
    'pagos_estudiantes', 'pensum', 'perfiles', 'pqr', 'proyectos_estudiantes',
    'proyectos_fundacion', 'qr_tokens', 'rate_limits', 'seguimiento_alertas', 'sesiones_asistencia',
    'superadmin_credentials', 'trainee_archivos', 'usuario_perfiles', 'usuarios'
];

$stmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
$tablasReales = $stmt->fetchAll(PDO::FETCH_COLUMN);

$faltantes = array_diff($tablasEsperadas, $tablasReales);
TestRunner::assert("Total de 38 tablas operativas", empty($faltantes), empty($faltantes) ? "38/38 encontradas" : "Faltan: " . implode(', ', $faltantes));

// 2. Verificar nota mínima de aprobación = 6.0
$stmtCfg = $pdo->query("SELECT notas_minima_aprobacion FROM configuracion WHERE id = 1 LIMIT 1");
$notaMin = (float)$stmtCfg->fetchColumn();
TestRunner::assert("Nota mínima institucional configurada en 6.0", $notaMin === 6.0, "Valor en BD: $notaMin");

// 3. Verificar credenciales de Superadmin
$stmtSa = $pdo->query("SELECT COUNT(*) FROM superadmin_credentials WHERE email IS NOT NULL AND password IS NOT NULL");
$totalSa = (int)$stmtSa->fetchColumn();
TestRunner::assert("Credencial maestra de Superadmin presente", $totalSa >= 1, "Cuentas registradas: $totalSa");

// 4. Verificar existencia de perfiles del sistema
$stmtPerf = $pdo->query("SELECT COUNT(*) FROM perfiles WHERE es_sistema = 1");
$totalPerf = (int)$stmtPerf->fetchColumn();
TestRunner::assert("Perfiles de sistema precargados", $totalPerf >= 3, "Perfiles base: $totalPerf");

// 5. Verificar columnas críticas de seguridad
$colsUsuarios = $pdo->query("SHOW COLUMNS FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
TestRunner::assert("Columna token_version en usuarios (revocación activa)", in_array('token_version', $colsUsuarios, true));
TestRunner::assert("Columna cohortes_permitidas en usuarios (IDOR scoping)", in_array('cohortes_permitidas', $colsUsuarios, true));
