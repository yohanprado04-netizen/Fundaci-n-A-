<?php
/**
 * index.php — Enrutador Principal Modular del API REST.
 *
 * Arquitectura modular:
 * Las peticiones entrantes se despachan a controladores especializados en /api/controllers/:
 * - controllers/usuarios.php      -> Usuarios, perfiles y credenciales
 * - controllers/asistencia.php    -> Asistencia, sesiones QR y justificaciones
 * - controllers/academico.php     -> Módulos, cursos, pensum, notas, semáforo, agenda e informes
 * - controllers/comunicacion.php  -> PQR, memorandos, comunicados y correo
 * - controllers/auditoria.php     -> Auditoría de logins, acciones y horarios
 * - controllers/recursos.php      -> Préstamos e inventario de equipos
 * - controllers/institucional.php -> Portal público, configuración, trainee, proyectos y pagos
 * - formularios.php               -> Constructor de formularios dinámicos y respuestas
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

// La entidad llega por query string (?entidad=usuarios), reescrito desde
// una URL limpia /api/usuarios por el .htaccess de la raíz del sitio o router.php.
$entidad = $_GET['entidad'] ?? '';

// ── Puerta de Enlace de Seguridad (API Gateway & RBAC) ────────────────────────
// Valida sesión y roles permitidos en el punto de entrada ANTES de intentar
// abrir conexión a MySQL. Esto previene saturación y ataques DoS por agotamiento
// de conexiones a la base de datos con peticiones maliciosas o no autenticadas.
$metodoHttp = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rutasPublicas = ['public_info', 'registro', 'qr_asistencia', 'formulario_publico'];

if (!in_array($entidad, $rutasPublicas, true)) {
    // Matriz de permisos RBAC para mutaciones (POST, PUT, DELETE)
    $rolesMutacionPorEntidad = [
        'usuarios'                   => ['Superadmin'],
        'superadmin_credentials'     => ['Superadmin'],
        'configuracion'              => ['Superadmin'],
        'perfiles'                   => ['Superadmin'],
        'modulos'                    => ['Superadmin', 'Coordinador'],
        'cursos'                     => ['Superadmin', 'Coordinador'],
        'pensum'                     => ['Superadmin', 'Coordinador'],
        'chat_voz_conocimiento'      => ['Superadmin', 'Coordinador'],
        'memorandos'                 => ['Superadmin', 'Coordinador'],
        'formularios'                => ['Superadmin', 'Administrador', 'Coordinador'],
        'enviar_correo'              => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'horarios'                   => ['Superadmin', 'Coordinador', 'Docente'],
        'notas_modulos'              => ['Superadmin', 'Coordinador', 'Docente'],
        'asistencia'                 => ['Superadmin', 'Coordinador', 'Docente'],
        'sesiones_asistencia'        => ['Superadmin', 'Coordinador', 'Docente'],
        'qr_tokens'                  => ['Superadmin', 'Coordinador', 'Docente'],
        'informes_docente'           => ['Superadmin', 'Coordinador', 'Docente'],
        'agenda_docente'             => ['Superadmin', 'Coordinador', 'Docente'],
        'agenda_estudiante'          => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'trainee_archivos'           => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'pqr'                        => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'comunicados'                => ['Superadmin', 'Coordinador', 'Docente'],
        'notificaciones'             => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'pagos_docentes'             => ['Superadmin', 'Coordinador'],
        'pagos_estudiantes'          => ['Superadmin', 'Coordinador'],
        'justificaciones_asistencia' => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'proyectos_fundacion'        => ['Superadmin', 'Coordinador'],
        'proyectos_estudiantes'      => ['Superadmin', 'Coordinador', 'Docente', 'Estudiante'],
        'historial_prestamos'        => ['Superadmin', 'Coordinador'],
        'seguimiento_alertas'        => ['Superadmin', 'Coordinador', 'Docente'],
    ];

    if ($metodoHttp !== 'GET') {
        if (isset($rolesMutacionPorEntidad[$entidad])) {
            $sesion = exigirSesion($rolesMutacionPorEntidad[$entidad]);
        } else {
            $sesion = exigirSesion();
        }
        if (($sesion['rol'] ?? '') === 'Aliado' || ($sesion['rol'] ?? '') === 'Donante') {
            responderError('Los aliados y donantes tienen permisos exclusivos de solo lectura.', 403);
        }
    }
}

// ── Mapa de Enrutamiento a Controladores Modulares ───────────────────────────
$rutasEntidades = [
    // 1. Usuarios y Perfiles
    'usuarios'                   => ['controlador' => 'controllers/usuarios.php', 'handler' => 'manejarUsuarios'],
    'perfil_propio'              => ['controlador' => 'controllers/usuarios.php', 'handler' => 'manejarPerfilPropio'],
    'perfiles'                   => ['controlador' => 'controllers/usuarios.php', 'handler' => 'manejarPerfiles'],
    'superadmin_credentials'     => ['controlador' => 'controllers/usuarios.php', 'handler' => 'manejarSuperadminCredentials'],

    // 2. Asistencia y Códigos QR
    'asistencia'                 => ['controlador' => 'controllers/asistencia.php', 'handler' => 'manejarAsistencia'],
    'sesiones_asistencia'        => ['controlador' => 'controllers/asistencia.php', 'handler' => 'manejarSesionesAsistencia'],
    'qr_tokens'                  => ['controlador' => 'controllers/asistencia.php', 'handler' => 'manejarQrTokens'],
    'qr_asistencia'              => ['controlador' => 'controllers/asistencia.php', 'handler' => 'manejarQrAsistencia'],
    'justificaciones_asistencia' => ['controlador' => 'controllers/asistencia.php', 'handler' => 'manejarJustificacionesAsistencia'],

    // 3. Gestión Académica
    'modulos'                    => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarModulos'],
    'horarios'                   => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarHorarios'],
    'notas_modulos'              => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarNotasModulos'],
    'semaforo'                   => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarSemaforo'],
    'cursos'                     => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarCursos'],
    'pensum'                     => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarPensum'],
    'informes_docente'           => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarInformesDocente'],
    'agenda_docente'             => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarAgendaDocente'],
    'agenda_estudiante'          => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarAgendaEstudiante'],
    'seguimiento_alertas'        => ['controlador' => 'controllers/academico.php', 'handler' => 'manejarSeguimientoAlertas'],

    // 4. Comunicación y Notificaciones
    'pqr'                        => ['controlador' => 'controllers/comunicacion.php', 'handler' => 'manejarPqr'],
    'memorandos'                 => ['controlador' => 'controllers/comunicacion.php', 'handler' => 'manejarMemorandos'],
    'memorandos_leidos'          => ['controlador' => 'controllers/comunicacion.php', 'handler' => 'manejarMemorandosLeidos'],
    'comunicados'                => ['controlador' => 'controllers/comunicacion.php', 'handler' => 'manejarComunicados'],
    'notificaciones'             => ['controlador' => 'controllers/notificaciones.php', 'handler' => 'manejarNotificaciones'],
    'enviar_correo'              => ['controlador' => 'controllers/comunicacion.php', 'handler' => 'manejarEnviarCorreo'],

    // 5. Formularios Dinámicos
    'formularios'                => ['controlador' => 'formularios.php', 'handler' => 'manejarFormularios'],
    'formulario_publico'         => ['controlador' => 'formularios.php', 'handler' => 'manejarFormularioPublico'],

    // 6. Auditoría y Trazabilidad
    'auditoria_login'            => ['controlador' => 'controllers/auditoria.php', 'handler' => 'manejarAuditoriaLogin'],
    'auditoria_acciones'         => ['controlador' => 'controllers/auditoria.php', 'handler' => 'manejarAuditoriaAcciones'],
    'auditoria_horario'          => ['controlador' => 'controllers/auditoria.php', 'handler' => 'manejarAuditoriaHorario'],

    // 7. Recursos y Préstamos
    'historial_prestamos'        => ['controlador' => 'controllers/recursos.php', 'handler' => 'manejarHistorialPrestamos'],

    // 8. Institucional y General
    'public_info'                => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarPublicInfo'],
    'registro'                   => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarRegistroPublico'],
    'configuracion'              => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarConfiguracion'],
    'chat_voz_conocimiento'      => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarChatVozConocimiento'],
    'encuestas'                  => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarEncuestas'],
    'trainee_archivos'           => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarTraineeArchivos'],
    'pagos_docentes'             => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarPagosDocentes'],
    'pagos_estudiantes'          => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarPagosEstudiantes'],
    'proyectos_fundacion'        => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarProyectosFundacion'],
    'proyectos_estudiantes'      => ['controlador' => 'controllers/institucional.php', 'handler' => 'manejarProyectosEstudiantes'],
];

if (!isset($rutasEntidades[$entidad])) {
    responderError("Entidad \"$entidad\" no reconocida o todavía no migrada a la base de datos (sigue en localStorage por ahora).", 404);
}

// ── Conexión a Base de Datos y Despacho al Controlador ────────────────────────
try {
    $pdo = obtenerConexion();
} catch (PDOException $e) {
    responderError('No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo y los datos en config.php.', 500);
}

$rutaArchivo = __DIR__ . '/' . $rutasEntidades[$entidad]['controlador'];
$funcionHandler = $rutasEntidades[$entidad]['handler'];

if (!file_exists($rutaArchivo)) {
    responderError("Controlador para \"$entidad\" no encontrado en el servidor.", 500);
}

require_once $rutaArchivo;

if (!function_exists($funcionHandler)) {
    responderError("Manejador \"$funcionHandler\" no implementado en el controlador.", 500);
}

// Ejecutar el controlador correspondiente
$funcionHandler($pdo);