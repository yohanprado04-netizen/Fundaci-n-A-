<?php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';
require_once __DIR__ . '/test_helper.php';

TestRunner::section("3. Enrutamiento Modular de la API REST (36 Entidades)");

$tokenSa = generarToken(['email' => 'superadmin@aplus.org', 'rol' => 'Superadmin']);

$entidades = [
    'public_info', 'configuracion', 'usuarios', 'perfiles', 'superadmin_credentials',
    'modulos', 'cursos', 'pensum', 'horarios', 'notas_modulos', 'asistencia',
    'semaforo', 'sesiones_asistencia', 'qr_tokens', 'justificaciones_asistencia',
    'informes_docente', 'agenda_docente', 'agenda_estudiante', 'pqr', 'memorandos',
    'memorandos_leidos', 'comunicados', 'notificaciones', 'seguimiento_alertas',
    'auditoria_login', 'auditoria_acciones', 'auditoria_horario', 'historial_prestamos',
    'encuestas', 'trainee_archivos', 'pagos_docentes', 'pagos_estudiantes',
    'proyectos_fundacion', 'proyectos_estudiantes', 'chat_voz_conocimiento', 'formularios'
];

$passCount = 0;
$failCount = 0;

$runnerHelper = __DIR__ . '/runner.php';

foreach ($entidades as $ent) {
    $cmd = 'php ' . escapeshellarg($runnerHelper) . ' ' . escapeshellarg($tokenSa) . ' ' . escapeshellarg($ent);
    $output = shell_exec($cmd . ' 2>&1');
    $json = json_decode($output, true);

    if ($json !== null && !isset($json['error'])) {
        $passCount++;
    } else {
        $failCount++;
    }
}

TestRunner::assert("Disponibilidad total de endpoints GET", $failCount === 0, "$passCount/" . count($entidades) . " endpoints responden con JSON válido");

// Probar entidad inexistente -> debe responder 404
$cmd404 = 'php ' . escapeshellarg($runnerHelper) . ' ' . escapeshellarg($tokenSa) . ' ' . escapeshellarg('entidad_que_no_existe_xyz');
$output404 = shell_exec($cmd404 . ' 2>&1');
$json404 = json_decode($output404, true);
TestRunner::assert("Controlador de error 404 para entidades no reconocidas", isset($json404['error']));
