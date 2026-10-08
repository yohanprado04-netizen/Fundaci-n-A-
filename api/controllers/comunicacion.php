<?php
/**
 * Controlador de Comunicación: PQR, Memorandos, Comunicados y Correo
 */

function manejarEnviarCorreo(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }
    
    $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente', 'Estudiante']);
    if (file_exists(__DIR__ . '/../mailer.php')) {
        require_once __DIR__ . '/../mailer.php';
    } elseif (file_exists(__DIR__ . '/mailer.php')) {
        require_once __DIR__ . '/mailer.php';
    }

    $body = leerBodyJson();
    $destinatarioEmail = trim($body['destinatarioEmail'] ?? '');
    $destinatarioNombre = trim($body['destinatarioNombre'] ?? 'Estudiante');
    $asunto = trim($body['asunto'] ?? 'Notificación Fundación A+');
    $mensaje = trim($body['mensaje'] ?? '');
    $mensajeHtml = trim($body['mensajeHtml'] ?? '');

    if (!$destinatarioEmail || !filter_var($destinatarioEmail, FILTER_VALIDATE_EMAIL)) {
        responderError('El correo del destinatario es inválido o está vacío.', 400);
    }

    // Prevenir inyección CRLF en cabeceras de correo
    if (preg_match("/[\r\n]/", $destinatarioEmail) || preg_match("/[\r\n]/", $asunto) || preg_match("/[\r\n]/", $destinatarioNombre)) {
        responderError('Parámetros de correo inválidos.', 400);
    }

    $fila = $pdo->query('SELECT * FROM configuracion WHERE id = 1')->fetch();
    if (!$fila) {
        responderError('No se encontró la configuración institucional.', 500);
    }

    $metodoEnvio = $fila['email_metodo'] ?? 'emailjs';

    if ($metodoEnvio === 'smtp') {
        $res = enviarCorreoSmtp([
            'smtp_host' => $fila['smtp_host'] ?? '',
            'smtp_port' => (int)($fila['smtp_port'] ?? 465),
            'smtp_user' => $fila['smtp_user'] ?? '',
            'smtp_pass' => $fila['smtp_pass'] ?? '',
            'smtp_from' => $fila['smtp_from'] ?? 'info@fundacionamas.org.co',
            'smtp_from_name' => $fila['nombre'] ?? 'Fundación A+',
            'smtp_secure' => $fila['smtp_secure'] ?? 'ssl',
        ], $destinatarioEmail, $destinatarioNombre, $asunto, $mensaje, $mensajeHtml);

        if (!$res['ok']) {
            responderError($res['error'], 400);
        }

        responderJson(['ok' => true, 'metodo' => 'smtp', 'mensaje' => 'Correo enviado exitosamente vía SMTP']);
        return;
    }

    // Si es EmailJS
    responderJson([
        'ok' => true,
        'metodo' => 'emailjs',
        'config' => [
            'publicKey' => $fila['emailjs_public_key'] ?? '',
            'serviceId' => $fila['emailjs_service_id'] ?? '',
            'templateId' => $fila['emailjs_template_id'] ?? ''
        ]
    ]);
}

/**
 * Credenciales del Superadmin (superadmin_credentials)
 * Objeto único: una sola fila en la tabla `superadmin_credentials` con id = 1.
 * GET  → devuelve { data: { email, password } }
 * POST → recibe { data: { email, password } } y reemplaza con hash bcrypt.
 * Solo Superadmin puede leerlas y modificarlas.
 */

function manejarPqr(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos FROM pqr WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('PQR no encontrada', 404); }

            // BOLA protection: estudiantes y docentes solo ven sus propias PQR
            if (!in_array($rol, ['Superadmin', 'Coordinador'], true)) {
                $nombreSesion = strtolower(trim($sesion['nombre'] ?? ''));
                $emailSesion = strtolower(trim($sesion['email'] ?? ''));
                $solic = strtolower(trim($f['solicitante'] ?? ''));
                if ($solic !== $nombreSesion && $solic !== $emailSesion) {
                    responderError('No tienes permiso para ver esta PQR.', 403);
                }
            }

            responderJson([
                'id' => $f['id'], 'tipo' => $f['tipo'], 'solicitante' => $f['solicitante'],
                'remitenteRol' => $f['remitente_rol'], 'asunto' => $f['asunto'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'fechaActivacion' => $f['fecha_activacion'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado: administradores ven todo, usuarios regulares solo sus propias solicitudes
        if (in_array($rol, ['Superadmin', 'Coordinador'], true)) {
            $filas = $pdo->query('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM pqr ORDER BY fecha DESC LIMIT 1000')->fetchAll();
        } else {
            $nombreSesion = trim($sesion['nombre'] ?? '');
            $emailSesion = trim($sesion['email'] ?? '');
            $stmt = $pdo->prepare('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM pqr WHERE solicitante = ? OR solicitante = ? ORDER BY fecha DESC LIMIT 500');
            $stmt->execute([$nombreSesion, $emailSesion]);
            $filas = $stmt->fetchAll();
        }

        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'tipo' => $f['tipo'], 'solicitante' => $f['solicitante'],
                'remitenteRol' => $f['remitente_rol'], 'asunto' => $f['asunto'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'fechaActivacion' => $f['fecha_activacion'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $tiene ? '1' : '',
                'tieneArchivo' => $tiene,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO pqr (id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    tipo = VALUES(tipo),
                    solicitante = VALUES(solicitante),
                    remitente_rol = VALUES(remitente_rol),
                    asunto = VALUES(asunto),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado),
                    fecha_activacion = VALUES(fecha_activacion),
                    archivo_nombre = IF(VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? '' : $rawDatos;

                $stmt->execute([
                    $id, $r['tipo'] ?? 'Petición', $r['solicitante'] ?? '',
                    $r['remitenteRol'] ?? 'Estudiante', $r['asunto'] ?? '', $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Pendiente', $r['fechaActivacion'] ?? null,
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? 'application/pdf', $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                if (in_array($rol, ['Superadmin', 'Coordinador'], true)) {
                    $stmtPrune = $pdo->prepare("DELETE FROM pqr WHERE id NOT IN ($inQuery)");
                    $stmtPrune->execute(array_values($ids));
                } else {
                    $nombreSesion = trim($sesion['nombre'] ?? '');
                    $emailSesion = trim($sesion['email'] ?? '');
                    $stmtPrune = $pdo->prepare("DELETE FROM pqr WHERE (solicitante = ? OR solicitante = ?) AND id NOT IN ($inQuery)");
                    $stmtPrune->execute(array_merge([$nombreSesion, $emailSesion], array_values($ids)));
                }
            } else {
                if (in_array($rol, ['Superadmin', 'Coordinador'], true)) {
                    $pdo->exec("DELETE FROM pqr");
                } else {
                    $nombreSesion = trim($sesion['nombre'] ?? '');
                    $emailSesion = trim($sesion['email'] ?? '');
                    $stmtPrune = $pdo->prepare("DELETE FROM pqr WHERE solicitante = ? OR solicitante = ?");
                    $stmtPrune->execute([$nombreSesion, $emailSesion]);
                }
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar PQR');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Memorandos institucionales

function manejarMemorandos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos FROM memorandos WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Memorando no encontrado', 404); }
            responderJson([
                'id' => $f['id'], 'titulo' => $f['titulo'], 'destinatario' => $f['destinatario'],
                'fecha' => $f['fecha'], 'estado' => $f['estado'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado optimizado: no transfiere el blob Base64 archivo_datos en masa
        $filas = $pdo->query('SELECT id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM memorandos ORDER BY fecha DESC LIMIT 1000')->fetchAll();
        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'titulo' => $f['titulo'], 'destinatario' => $f['destinatario'],
                'fecha' => $f['fecha'], 'estado' => $f['estado'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $tiene ? '1' : '',
                'tieneArchivo' => $tiene,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO memorandos (id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    destinatario = VALUES(destinatario),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado),
                    archivo_nombre = IF(VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? '' : $rawDatos;

                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['destinatario'] ?? '',
                    $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Borrador',
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? '', $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM memorandos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM memorandos");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Memorandos');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Memorandos leídos (objeto asociativo { memorandoId: { email: true } })

function manejarMemorandosLeidos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT memorando_id, email FROM memorandos_leidos')->fetchAll();
        $mapa = new stdClass(); // objeto vacío -> {} en JSON, no [] (un array vacío rompería mapa[id][email] en JS)
        foreach ($filas as $f) {
            $id = $f['memorando_id'];
            if (!isset($mapa->$id)) $mapa->$id = new stdClass();
            $mapa->$id->{$f['email']} = true;
        }
        responderJson($mapa);
        return;
    }
    if ($metodo === 'POST') {
        exigirSesion();
        $mapa = leerBodyJson();
        if (!is_array($mapa)) {
            responderError('Se esperaba un objeto { memorandoId: { email: true } } en el body.', 400);
        }
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM memorandos_leidos');
            $stmt = $pdo->prepare('INSERT INTO memorandos_leidos (memorando_id, email) VALUES (?, ?)');
            $total = 0;
            foreach ($mapa as $memorandoId => $emails) {
                if (!is_array($emails)) continue;
                foreach (array_keys($emails) as $email) {
                    $stmt->execute([$memorandoId, $email]);
                    $total++;
                }
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => $total]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Memorandos leídos');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Encuestas de satisfacción

function manejarComunicados(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    $pdo->exec("CREATE TABLE IF NOT EXISTS comunicados (
        id VARCHAR(64) PRIMARY KEY,
        tipo VARCHAR(32) NOT NULL DEFAULT 'Publica',
        destinatarios TEXT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        categoria VARCHAR(64) NOT NULL DEFAULT 'Institucional',
        prioridad VARCHAR(32) NOT NULL DEFAULT 'Media',
        autor VARCHAR(128) NOT NULL DEFAULT 'Superadmin',
        autor_rol VARCHAR(64) NOT NULL DEFAULT 'Superadmin',
        fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atendida TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_tipo (tipo),
        INDEX idx_categoria (categoria),
        INDEX idx_fecha (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    if ($metodo === 'GET') {
        $limitCom = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 1000) : 500;
        $filas = $pdo->query("SELECT * FROM comunicados ORDER BY fecha DESC LIMIT $limitCom")->fetchAll();
        
        if (empty($filas)) {
            $semilla = [
                [
                    'id' => 'com_seed_01',
                    'tipo' => 'Publica',
                    'destinatarios' => json_encode(['Todos']),
                    'titulo' => 'Nuevas inscripciones para el semestre 2027',
                    'mensaje' => 'Se encuentran abiertas oficialmente las convocatorias e inscripciones para los nuevos programas y cohortes de la Fundación A+ para el siguiente periodo formativo.',
                    'categoria' => 'Institucional',
                    'prioridad' => 'Alta',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-01 09:00:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_02',
                    'tipo' => 'Privada',
                    'destinatarios' => json_encode(['Corte 1', 'Corte 2', 'Corte 8']),
                    'titulo' => 'Cambio de aula para la clase de Matemáticas',
                    'mensaje' => 'Por motivos de mantenimiento en el salón audiovisual, la sesión presencial de lógica y matemáticas se desarrollará temporalmente en la Sala Digital 2.',
                    'categoria' => 'Académico',
                    'prioridad' => 'Media',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-01 11:30:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_03',
                    'tipo' => 'Publica',
                    'destinatarios' => json_encode(['Todos']),
                    'titulo' => 'Nueva Beca de Excelencia \'A+\': Abiertas inscripciones',
                    'mensaje' => 'Participa y obtén una beca de formación técnica intensiva con certificación internacional para el próximo ciclo formativo.',
                    'categoria' => 'Institucional',
                    'prioridad' => 'Alta',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-01 14:00:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_04',
                    'tipo' => 'Publica',
                    'destinatarios' => json_encode(['Todos']),
                    'titulo' => 'Día Festivo Institucional',
                    'mensaje' => 'Informamos a toda la comunidad académica que el próximo lunes no habrá actividades formativas presenciales con motivo del festivo institucional.',
                    'categoria' => 'Institucional',
                    'prioridad' => 'Baja',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-01 16:00:00',
                    'atendida' => 1
                ],
                [
                    'id' => 'com_seed_05',
                    'tipo' => 'Publica',
                    'destinatarios' => json_encode(['Todos']),
                    'titulo' => 'Día de la Innovación: Conferencias y Workshops - 15 de Oct',
                    'mensaje' => 'Únete a nosotros para una jornada presencial y virtual con mentores internacionales en inteligencia artificial y desarrollo de software.',
                    'categoria' => 'Eventos',
                    'prioridad' => 'Media',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-01 17:30:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_06',
                    'tipo' => 'Privada',
                    'destinatarios' => json_encode(['Cohorte 8', 'Corte 8']),
                    'titulo' => 'Cambio de horario: Taller de Programación - Nueva hora: Mañana 10:30 AM',
                    'mensaje' => 'Estudiantes del Corte 8, por favor tomen nota del cambio de horario para la sesión presencial del taller de desarrollo.',
                    'categoria' => 'Académico',
                    'prioridad' => 'Media',
                    'autor' => 'Profesor Martínez',
                    'autor_rol' => 'Docente',
                    'fecha' => '2026-10-02 08:30:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_07',
                    'tipo' => 'Privada',
                    'destinatarios' => json_encode(['Cohorte 8', 'Corte 8']),
                    'titulo' => 'Calificaciones de la Tarea 3 disponibles',
                    'mensaje' => 'Las notas y retroalimentaciones para la Tarea 3 de Algoritmos han sido publicadas en el portal académico.',
                    'categoria' => 'Académico',
                    'prioridad' => 'Media',
                    'autor' => 'Profesor Martínez',
                    'autor_rol' => 'Docente',
                    'fecha' => '2026-10-02 10:00:00',
                    'atendida' => 0
                ],
                [
                    'id' => 'com_seed_08',
                    'tipo' => 'Privada',
                    'destinatarios' => json_encode(['Cohorte 8', 'Corte 8']),
                    'titulo' => 'Reunión de Coordinación de Corte 8 - Próximo lunes a las 2 PM',
                    'mensaje' => 'Sesión informativa presencial y virtual sobre el cronograma de entregas de proyectos finales de semestre.',
                    'categoria' => 'Administrativo',
                    'prioridad' => 'Baja',
                    'autor' => 'Superadmin',
                    'autor_rol' => 'Superadmin',
                    'fecha' => '2026-10-02 11:15:00',
                    'atendida' => 0
                ]
            ];
            $stmt = $pdo->prepare("INSERT INTO comunicados (id, tipo, destinatarios, titulo, mensaje, categoria, prioridad, autor, autor_rol, fecha, atendida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($semilla as $s) {
                $stmt->execute([$s['id'], $s['tipo'], $s['destinatarios'], $s['titulo'], $s['mensaje'], $s['categoria'], $s['prioridad'], $s['autor'], $s['autor_rol'], $s['fecha'], $s['atendida']]);
            }
            $filas = $pdo->query("SELECT * FROM comunicados ORDER BY fecha DESC")->fetchAll();
        }

        $resultado = array_map(function($f) {
            $dest = json_decode($f['destinatarios'] ?? '[]', true);
            if (!is_array($dest)) {
                $dest = !empty($f['destinatarios']) ? explode(',', $f['destinatarios']) : [];
            }
            return [
                'id' => $f['id'],
                'tipo' => $f['tipo'],
                'destinatarios' => $dest,
                'titulo' => $f['titulo'],
                'mensaje' => $f['mensaje'],
                'categoria' => $f['categoria'],
                'prioridad' => $f['prioridad'],
                'autor' => $f['autor'],
                'autorRol' => $f['autor_rol'],
                'fecha' => $f['fecha'],
                'atendida' => (bool)$f['atendida']
            ];
        }, $filas);

        responderJson($resultado);
        return;
    }

    if ($metodo === 'POST') {
        $body = leerBodyJson();
        
        // Si el body es un array de comunicados (reemplazo completo estilo Store.set)
        if (is_array($body) && isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $pdo->exec("DELETE FROM comunicados");
                $stmt = $pdo->prepare("INSERT INTO comunicados (id, tipo, destinatarios, titulo, mensaje, categoria, prioridad, autor, autor_rol, fecha, atendida) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($body as $b) {
                    $id = $b['id'] ?? ('com_' . bin2hex(random_bytes(8)));
                    $dest = is_array($b['destinatarios'] ?? null) ? json_encode($b['destinatarios'], JSON_UNESCAPED_UNICODE) : ($b['destinatarios'] ?? '[]');
                    $stmt->execute([
                        $id,
                        $b['tipo'] ?? 'Publica',
                        $dest,
                        $b['titulo'] ?? '',
                        $b['mensaje'] ?? '',
                        $b['categoria'] ?? 'Institucional',
                        $b['prioridad'] ?? 'Media',
                        $b['autor'] ?? 'Superadmin',
                        $b['autorRol'] ?? ($b['autor_rol'] ?? 'Superadmin'),
                        $b['fecha'] ?? date('Y-m-d H:i:s'),
                        !empty($b['atendida']) ? 1 : 0
                    ]);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'mensaje' => 'Comunicados actualizados con éxito']);
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar comunicados: ' . $e->getMessage(), 500);
            }
            return;
        }

        // Si es un objeto individual a insertar/actualizar
        if (is_array($body) && !empty($body['titulo'])) {
            $id = $body['id'] ?? ('com_' . bin2hex(random_bytes(8)));
            $dest = is_array($body['destinatarios'] ?? null) ? json_encode($body['destinatarios'], JSON_UNESCAPED_UNICODE) : ($body['destinatarios'] ?? '[]');
            $stmt = $pdo->prepare("INSERT INTO comunicados (id, tipo, destinatarios, titulo, mensaje, categoria, prioridad, autor, autor_rol, fecha, atendida)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    tipo = VALUES(tipo),
                    destinatarios = VALUES(destinatarios),
                    titulo = VALUES(titulo),
                    mensaje = VALUES(mensaje),
                    categoria = VALUES(categoria),
                    prioridad = VALUES(prioridad),
                    atendida = VALUES(atendida)");
            $stmt->execute([
                $id,
                $body['tipo'] ?? 'Publica',
                $dest,
                $body['titulo'] ?? '',
                $body['mensaje'] ?? '',
                $body['categoria'] ?? 'Institucional',
                $body['prioridad'] ?? 'Media',
                $body['autor'] ?? 'Superadmin',
                $body['autorRol'] ?? ($body['autor_rol'] ?? 'Superadmin'),
                $body['fecha'] ?? date('Y-m-d H:i:s'),
                !empty($body['atendida']) ? 1 : 0
            ]);
            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Comunicado guardado']);
            return;
        }

        responderError('Estructura de comunicado inválida', 400);
        return;
    }

    if ($metodo === 'DELETE') {
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta parámetro id para eliminar', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM comunicados WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Comunicado eliminado']);
        return;
    }
}

/**
 * Control confidencial de Honorarios y Pagos de Docentes.
 * Acceso exclusivo: Superadmin y Coordinador.
 * Profesores, Aliados y Estudiantes tienen prohibido el acceso (403 Forbidden).
 */

