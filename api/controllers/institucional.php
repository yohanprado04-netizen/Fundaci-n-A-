<?php
/**
 * Controlador Institucional: Portal Público, Configuración, Pagos, Trainee, Encuestas y Proyectos
 */

function asegurarColumnaPostulacionSlug(PDO $pdo): void {
    static $asegurado = false;
    if ($asegurado) return;
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM configuracion")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('postulacion_slug', $cols, true)) {
            $pdo->exec("ALTER TABLE configuracion ADD COLUMN postulacion_slug VARCHAR(120) DEFAULT 'postulaciones' AFTER postulacion_url");
        }
        $asegurado = true;
    } catch (Throwable $e) {}
}


function manejarPublicInfo(PDO $pdo): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        responderError('Método no permitido.', 405);
    }

    asegurarColumnaPostulacionSlug($pdo);

    $fila = $pdo->query(
        "SELECT nombre, ciudad, direccion, correo, telefono,
                postulacion_habilitada, postulacion_url, postulacion_slug
         FROM configuracion WHERE id = 1"
    )->fetch();

    $configuracion = [
        'nombre'                => $fila['nombre'] ?? 'Fundación A+',
        'ciudad'                => $fila['ciudad'] ?? 'Quibdó',
        'direccion'             => $fila['direccion'] ?? '',
        'correo'                => $fila['correo'] ?? 'info@fundacionamas.org.co',
        'telefono'              => $fila['telefono'] ?? '3214974708',
        'postulacionHabilitada' => !empty($fila['postulacion_habilitada']),
        'postulacionUrl'        => $fila['postulacion_url'] ?? '',
        'postulacionSlug'       => $fila['postulacion_slug'] ?? ($fila['postulacion_url'] ? preg_replace('/^#formulario\//', '', $fila['postulacion_url']) : 'postulaciones'),
    ];

    $stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'Estudiante' AND (estado_registro IS NULL OR estado_registro != 'Pendiente')");
    $filaCount = $stmtCount ? $stmtCount->fetch() : null;
    $totalEstudiantes = (int)($filaCount['total'] ?? 0);

    // Lista de estudiantes registrados con su nombre, foto de perfil y mensaje/descripción para la constelación
    $stmtEstudiantes = $pdo->query(
        "SELECT id, nombre, cohorte, foto_url, descripcion 
         FROM usuarios 
         WHERE rol = 'Estudiante' AND (estado_registro IS NULL OR estado_registro != 'Pendiente')
         ORDER BY id ASC"
    );
    $estudiantes = [];
    if ($stmtEstudiantes) {
        while ($r = $stmtEstudiantes->fetch(PDO::FETCH_ASSOC)) {
            $estudiantes[] = [
                'id'          => $r['id'],
                'nombre'      => $r['nombre'] ?? 'Estudiante A+',
                'cohorte'     => $r['cohorte'] ?: 'Comunidad A+',
                'fotoUrl'     => $r['foto_url'] ?? '',
                'descripcion' => $r['descripcion'] ?? '',
            ];
        }
    }

    responderJson([
        'configuracion'    => $configuracion,
        'totalEstudiantes' => $totalEstudiantes,
        'estudiantes'      => $estudiantes,
    ]);
}

/**
 * POST /api/registro — Registro público de estudiantes desde el sitio web.
 * No requiere sesión previa. Registra la solicitud en MySQL con estado_registro = 'Pendiente'.
 */

function manejarRegistroPublico(PDO $pdo): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        responderError('Método no permitido. Usa POST.', 405);
    }
    $ipCliente = obtenerIpCliente();
    verificarRateLimit($pdo, 'reg_pub:' . $ipCliente, 5, 900); // máx 5 registros por 15 min por IP

    $body = leerBodyJson();
    $nombre = trim($body['nombre'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $telefono = trim($body['telefono'] ?? '');
    $password = (string)($body['password'] ?? '');

    if (!$nombre || !$email || !$password) {
        responderError('Nombre, correo y contraseña son obligatorios.', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responderError('El correo electrónico no es válido.', 400);
    }

    if (strlen($password) < 6) {
        responderError('La contraseña debe tener al menos 6 caracteres.', 400);
    }

    $documento = trim((string)($datos['documento'] ?? ''));

    $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE LOWER(email) = ? LIMIT 1");
    $stmtCheck->execute([$email]);
    if ($stmtCheck->fetch()) {
        responderError('Ya existe una cuenta o solicitud registrada con ese correo.', 400);
    }

    $id = 'us_' . bin2hex(random_bytes(6));
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmtInsert = $pdo->prepare(
        "INSERT INTO usuarios (id, nombre, email, password, password_plano, rol, estado, estado_registro, cohorte, telefono, documento)
         VALUES (?, ?, ?, ?, NULL, 'Estudiante', 'Activo', 'Pendiente', '', ?, ?)"
    );
    $stmtInsert->execute([$id, $nombre, $email, $hash, $telefono ?: null, $documento ?: null]);

    responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Solicitud de registro enviada con éxito.']);
}

/**
 * Configuración institucional (configuracion)
 * Objeto único: la plataforma tiene UNA sola configuración, guardada en
 * la fila con id=1 de la tabla `configuracion`.
 * GET  → devuelve { data: { nombre, ciudad, correo, … } } (camelCase)
 * POST → recibe { data: { … } } (camelCase) y actualiza esa única fila.
 * Solo Superadmin puede leerla y modificarla.
 */

function manejarConfiguracion(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    asegurarColumnaPostulacionSlug($pdo);

    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $fila = $pdo->query(
            "SELECT nombre, ciudad, direccion, correo, telefono,
                    asistencia_minima, notificaciones_email, notificaciones_ia,
                    postulacion_habilitada, postulacion_url, postulacion_slug,
                    email_metodo, emailjs_public_key, emailjs_service_id, emailjs_template_id,
                    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure
             FROM configuracion WHERE id = 1"
        )->fetch();
        if (!$fila) {
            // Primera vez (la fila id=1 todavía no existe): valores por defecto.
            responderJson(['data' => [
                'nombre'                 => 'Fundación A+',
                'ciudad'                 => 'Quibdó',
                'direccion'              => '',
                'correo'                 => 'info@fundacionamas.org.co',
                'telefono'               => '3214974708',
                'asistenciaMinima'       => 80,
                'notificacionesEmail'    => true,
                'notificacionesIA'       => true,
                'postulacionHabilitada'  => false,
                'postulacionUrl'         => '',
                'postulacionSlug'        => 'postulaciones',
                'emailMetodo'            => 'emailjs',
                'emailjsPublicKey'       => 'elyshGVkR2fYZQJfO',
                'emailjsServiceId'       => 'service_20mxfgu',
                'emailjsTemplateId'      => 'template_qvmzl1l',
                'smtpHost'               => 'smtp.gmail.com',
                'smtpPort'               => 465,
                'smtpUser'               => '',
                'smtpPass'               => '',
                'smtpFrom'               => 'info@fundacionamas.org.co',
                'smtpSecure'             => 'ssl',
            ]]);
            return;
        }
        responderJson(['data' => [
            'nombre'                => $fila['nombre'],
            'ciudad'                => $fila['ciudad'],
            'direccion'             => $fila['direccion'],
            'correo'                => $fila['correo'],
            'telefono'              => $fila['telefono'],
            'asistenciaMinima'      => (float) $fila['asistencia_minima'],
            'notificacionesEmail'   => (bool) $fila['notificaciones_email'],
            'notificacionesIA'      => (bool) $fila['notificaciones_ia'],
            'postulacionHabilitada' => (bool) $fila['postulacion_habilitada'],
            'postulacionUrl'        => $fila['postulacion_url'],
            'postulacionSlug'       => $fila['postulacion_slug'] ?? ($fila['postulacion_url'] ? preg_replace('/^#formulario\//', '', $fila['postulacion_url']) : 'postulaciones'),
            'emailMetodo'           => $fila['email_metodo'] ?? 'emailjs',
            'emailjsPublicKey'      => $fila['emailjs_public_key'] ?? 'elyshGVkR2fYZQJfO',
            'emailjsServiceId'      => $fila['emailjs_service_id'] ?? 'service_20mxfgu',
            'emailjsTemplateId'     => $fila['emailjs_template_id'] ?? 'template_qvmzl1l',
            'smtpHost'              => $fila['smtp_host'] ?? 'smtp.gmail.com',
            'smtpPort'              => (int)($fila['smtp_port'] ?? 465),
            'smtpUser'              => $fila['smtp_user'] ?? '',
            'smtpPass'              => !empty($fila['smtp_pass']) ? '••••••••' : '',
            'smtpFrom'              => $fila['smtp_from'] ?? 'info@fundacionamas.org.co',
            'smtpSecure'            => $fila['smtp_secure'] ?? 'ssl',
        ]]);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $body = leerBodyJson();
        $cfg = $body['data'] ?? $body;
        if (!is_array($cfg)) {
            responderError('Se esperaba un objeto de configuración en body.data.', 400);
        }

        $postulacionSlug = trim($cfg['postulacionSlug'] ?? '');
        if (!$postulacionSlug && !empty($cfg['postulacionUrl'])) {
            $postulacionSlug = preg_replace('/^#formulario\//', '', $cfg['postulacionUrl']);
        }
        if (!$postulacionSlug) {
            $postulacionSlug = 'postulaciones';
        }
        $postulacionUrl = '#formulario/' . $postulacionSlug;

        // Si la contraseña SMTP viene vacía o con la máscara '••••••••'/'********', conservar la existente en la BD
        $passEnviada = trim((string)($cfg['smtpPass'] ?? ''));
        if ($passEnviada === '' || $passEnviada === '••••••••' || $passEnviada === '********') {
            $stmtPrev = $pdo->query("SELECT smtp_pass FROM configuracion WHERE id = 1");
            $passExistente = $stmtPrev ? $stmtPrev->fetchColumn() : '';
            $smtpPassFinal = $passExistente ?: '';
        } else {
            $smtpPassFinal = $passEnviada;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO configuracion
                (id, nombre, ciudad, direccion, correo, telefono, cupo_maximo,
                 notas_minima_aprobacion, asistencia_minima,
                 notificaciones_email, notificaciones_ia,
                 postulacion_habilitada, postulacion_url, postulacion_slug,
                 email_metodo, emailjs_public_key, emailjs_service_id, emailjs_template_id,
                 smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure)
             VALUES (1, ?, ?, ?, ?, ?, 30, 6.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre), ciudad = VALUES(ciudad),
                direccion = VALUES(direccion), correo = VALUES(correo),
                telefono = VALUES(telefono),
                asistencia_minima = VALUES(asistencia_minima),
                notificaciones_email = VALUES(notificaciones_email),
                notificaciones_ia = VALUES(notificaciones_ia),
                postulacion_habilitada = VALUES(postulacion_habilitada),
                postulacion_url = VALUES(postulacion_url),
                postulacion_slug = VALUES(postulacion_slug),
                email_metodo = VALUES(email_metodo),
                emailjs_public_key = VALUES(emailjs_public_key),
                emailjs_service_id = VALUES(emailjs_service_id),
                emailjs_template_id = VALUES(emailjs_template_id),
                smtp_host = VALUES(smtp_host),
                smtp_port = VALUES(smtp_port),
                smtp_user = VALUES(smtp_user),
                smtp_pass = VALUES(smtp_pass),
                smtp_from = VALUES(smtp_from),
                smtp_secure = VALUES(smtp_secure)"
        );
        $stmt->execute([
            $cfg['nombre'] ?? 'Fundación A+',
            $cfg['ciudad'] ?? 'Quibdó',
            $cfg['direccion'] ?? '',
            $cfg['correo'] ?? 'info@fundacionamas.org.co',
            $cfg['telefono'] ?? '3214974708',
            (float) ($cfg['asistenciaMinima'] ?? 80),
            !empty($cfg['notificacionesEmail']) ? 1 : 0,
            !empty($cfg['notificacionesIA']) ? 1 : 0,
            !empty($cfg['postulacionHabilitada']) ? 1 : 0,
            $postulacionUrl,
            $postulacionSlug,
            $cfg['emailMetodo'] ?? 'emailjs',
            $cfg['emailjsPublicKey'] ?? 'elyshGVkR2fYZQJfO',
            $cfg['emailjsServiceId'] ?? 'service_20mxfgu',
            $cfg['emailjsTemplateId'] ?? 'template_qvmzl1l',
            $cfg['smtpHost'] ?? 'smtp.gmail.com',
            (int)($cfg['smtpPort'] ?? 465),
            $cfg['smtpUser'] ?? '',
            $smtpPassFinal,
            $cfg['smtpFrom'] ?? 'info@fundacionamas.org.co',
            $cfg['smtpSecure'] ?? 'ssl',
        ]);
        registrarEventoSeguridad(
            $pdo,
            'Seguridad: Configuración del Sistema',
            $sesion['email'] ?? 'Superadmin',
            'Superadmin',
            'Parámetros globales y configuración institucional actualizados',
            null,
            'SECURITY_ALERT'
        );
        responderJson(['ok' => true]);
        return;
    }

    responderError('Método no permitido.', 405);
}

// Enviar correo (notificaciones vía SMTP o EmailJS)

if (!function_exists('asegurarEsquemaPagosDocentes')) {
function asegurarEsquemaPagosDocentes(PDO $pdo): void {
    static $asegurado = false;
    if ($asegurado) return;
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
        $alter = [];
        if (!in_array('documento', $cols, true)) {
            $alter[] = "ADD COLUMN documento VARCHAR(50) NULL AFTER telefono";
        }
        if (!in_array('habilidades', $cols, true)) {
            $alter[] = "ADD COLUMN habilidades LONGTEXT NULL AFTER documento";
        }
        if (!in_array('tarifa_hora', $cols, true)) {
            $alter[] = "ADD COLUMN tarifa_hora DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER descripcion";
        }
        if (!in_array('banco', $cols, true)) {
            $alter[] = "ADD COLUMN banco VARCHAR(100) NOT NULL DEFAULT '' AFTER tarifa_hora";
        }
        if (!in_array('tipo_cuenta', $cols, true)) {
            $alter[] = "ADD COLUMN tipo_cuenta VARCHAR(50) NOT NULL DEFAULT '' AFTER banco";
        }
        if (!in_array('numero_cuenta', $cols, true)) {
            $alter[] = "ADD COLUMN numero_cuenta VARCHAR(100) NOT NULL DEFAULT '' AFTER tipo_cuenta";
        }
        if (!in_array('titular_cuenta', $cols, true)) {
            $alter[] = "ADD COLUMN titular_cuenta VARCHAR(150) NOT NULL DEFAULT '' AFTER numero_cuenta";
        }
        if (!in_array('documento_cuenta', $cols, true)) {
            $alter[] = "ADD COLUMN documento_cuenta VARCHAR(50) NOT NULL DEFAULT '' AFTER titular_cuenta";
        }
        if (!empty($alter)) {
            $pdo->exec("ALTER TABLE usuarios " . implode(', ', $alter));
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS pagos_docentes (
            id VARCHAR(64) PRIMARY KEY,
            docente_id VARCHAR(64) NOT NULL,
            docente_nombre VARCHAR(150) NOT NULL,
            periodo VARCHAR(100) NOT NULL,
            mes VARCHAR(20) NOT NULL,
            horas DECIMAL(8,2) NOT NULL DEFAULT 0.00,
            tarifa_hora DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            total_pagado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            fecha_pago DATE NOT NULL,
            entidad_bancaria VARCHAR(100) NOT NULL DEFAULT '',
            numero_referencia VARCHAR(100) NOT NULL DEFAULT '',
            comprobante_nombre VARCHAR(255) NOT NULL DEFAULT '',
            comprobante_tipo VARCHAR(100) NOT NULL DEFAULT '',
            comprobante_url LONGTEXT NULL,
            observaciones TEXT NULL,
            estado VARCHAR(32) NOT NULL DEFAULT 'Pagado',
            creado_por VARCHAR(128) NOT NULL DEFAULT 'Superadmin',
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_docente_id (docente_id),
            INDEX idx_mes (mes),
            INDEX idx_fecha_pago (fecha_pago)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS pagos_estudiantes (
            id VARCHAR(64) PRIMARY KEY,
            estudiante_id VARCHAR(64) NOT NULL,
            estudiante_nombre VARCHAR(150) NOT NULL,
            cohorte VARCHAR(100) NOT NULL DEFAULT '',
            concepto VARCHAR(150) NOT NULL,
            mes VARCHAR(20) NOT NULL,
            monto DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            fecha_pago DATE NOT NULL,
            medio_pago VARCHAR(100) NOT NULL DEFAULT '',
            numero_referencia VARCHAR(100) NOT NULL DEFAULT '',
            comprobante_nombre VARCHAR(255) NULL DEFAULT NULL,
            comprobante_tipo VARCHAR(100) NULL DEFAULT NULL,
            comprobante_url LONGTEXT NULL,
            observaciones TEXT NULL,
            estado VARCHAR(32) NOT NULL DEFAULT 'Confirmado',
            creado_por VARCHAR(128) NOT NULL DEFAULT 'Superadmin',
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_estudiante_id (estudiante_id),
            INDEX idx_cohorte (cohorte),
            INDEX idx_mes (mes),
            INDEX idx_fecha_pago (fecha_pago)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Asegurar que comprobante_nombre y comprobante_tipo permitan NULL en instalaciones existentes
        try {
            $pdo->exec("ALTER TABLE pagos_estudiantes MODIFY comprobante_nombre VARCHAR(255) NULL DEFAULT NULL");
            $pdo->exec("ALTER TABLE pagos_estudiantes MODIFY comprobante_tipo VARCHAR(100) NULL DEFAULT NULL");
            $pdo->exec("ALTER TABLE pagos_docentes MODIFY comprobante_nombre VARCHAR(255) NULL DEFAULT NULL");
            $pdo->exec("ALTER TABLE pagos_docentes MODIFY comprobante_tipo VARCHAR(100) NULL DEFAULT NULL");
        } catch (Throwable $alterE) {}

        $asegurado = true;
    } catch (Throwable $e) {
        error_log('Error asegurando esquema pagos docentes: ' . $e->getMessage());
    }
}
}


function manejarEncuestas(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, url, cohorte, fecha, estado FROM encuestas')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'titulo' => $f['titulo'], 'url' => $f['url'], 'cohorte' => $f['cohorte'], 'fecha' => $f['fecha'], 'estado' => $f['estado']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO encuestas (id, titulo, url, cohorte, fecha, estado)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    url = VALUES(url),
                    cohorte = VALUES(cohorte),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['url'] ?? '',
                    $r['cohorte'] ?? '', $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Abierta',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM encuestas WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM encuestas");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Encuestas');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Cursos (catálogo general de programas con UPSERT atómico)

function manejarChatVozConocimiento(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, contenido, categoria, visibilidad, estado, creado_en FROM chat_voz_conocimiento ORDER BY creado_en DESC')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'titulo' => $f['titulo'], 'contenido' => $f['contenido'],
                'categoria' => $f['categoria'], 'visibilidad' => $f['visibilidad'],
                'estado' => $f['estado'], 'creadoEn' => $f['creado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO chat_voz_conocimiento (id, titulo, contenido, categoria, visibilidad, estado)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    contenido = VALUES(contenido),
                    categoria = VALUES(categoria),
                    visibilidad = VALUES(visibilidad),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['contenido'] ?? '',
                    $r['categoria'] ?? null, $r['visibilidad'] ?? 'Pública', $r['estado'] ?? 'Activa',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM chat_voz_conocimiento WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM chat_voz_conocimiento");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar la base de conocimiento del chat');
        }
        return;
    }
    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar registro de conocimiento.', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM chat_voz_conocimiento WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true]);
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Bitácoras de Auditoría
 * Registro y consulta de auditoría de logins, acciones de usuarios y cambios de horario.
 */

// Auditoría de ingresos (solo lectura: registrada durante el flujo de login con encadenamiento criptográfico)

function manejarTraineeArchivos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $miId = $sesion['id'] ?? '';

        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, estudiante_id, nombre, tipo, datos, fecha, origen FROM trainee_archivos WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Archivo no encontrado', 404); }

            // BOLA protection: un estudiante solo puede ver y descargar sus propios archivos
            if ($rol === 'Estudiante' && $f['estudiante_id'] !== $miId) {
                responderError('No tienes permiso para acceder a este archivo.', 403);
            }

            responderJson([
                'id'           => $f['id'],
                'estudianteId' => $f['estudiante_id'],
                'nombre'       => $f['nombre'],
                'tipo'         => $f['tipo'],
                'datos'        => $f['datos'],
                'fecha'        => $f['fecha'],
                'origen'       => $f['origen'] ?? '',
                'tieneArchivo' => !empty($f['datos']),
            ]);
            return;
        }

        $estudianteId = $_GET['estudiante_id'] ?? $_GET['estudianteId'] ?? null;
        // BOLA protection: si es estudiante, aislar forzosamente a su propio ID
        if ($rol === 'Estudiante') {
            $estudianteId = $miId;
        }

        $conDatos = isset($_GET['con_datos']) && $_GET['con_datos'] === '1';

        $columnas = $conDatos
            ? 'id, estudiante_id, nombre, tipo, datos, fecha, origen'
            : 'id, estudiante_id, nombre, tipo, (datos IS NOT NULL AND datos != "") AS tiene_datos, fecha, origen';

        if ($estudianteId) {
            $stmt = $pdo->prepare("SELECT $columnas FROM trainee_archivos WHERE estudiante_id = ? ORDER BY fecha DESC, id DESC");
            $stmt->execute([$estudianteId]);
            $filas = $stmt->fetchAll();
        } else {
            $filas = $pdo->query("SELECT $columnas FROM trainee_archivos ORDER BY fecha DESC, id DESC")->fetchAll();
        }
        responderJson(array_map(function ($f) use ($conDatos) {
            return [
                'id'           => $f['id'],
                'estudianteId' => $f['estudiante_id'],
                'nombre'       => $f['nombre'],
                'tipo'         => $f['tipo'],
                'datos'        => $conDatos ? ($f['datos'] ?? '') : (!empty($f['tiene_datos']) ? '1' : ''),
                'fecha'        => $f['fecha'],
                'origen'       => $f['origen'] ?? '',
                'tieneArchivo' => $conDatos ? !empty($f['datos']) : !empty($f['tiene_datos']),
            ];
        }, $filas));
        return;
    }

    if ($metodo === 'POST') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $miId = $sesion['id'] ?? '';
        $body = leerBodyJson();
        $esRegistroUnico = isset($body['estudianteId']) || isset($body['estudiante_id']) || isset($body['datos']);

        if ($esRegistroUnico) {
            $id = $body['id'] ?? bin2hex(random_bytes(16));
            $estudianteId = $body['estudianteId'] ?? $body['estudiante_id'] ?? '';
            // Si es estudiante, forzar que solo suba a su propio perfil
            if ($rol === 'Estudiante') {
                $estudianteId = $miId;
            }

            $nombre = trim($body['nombre'] ?? '') ?: 'Archivo';
            $tipo = $body['tipo'] ?? 'application/pdf';
            $datos = $body['datos'] ?? '';
            $fecha = $body['fecha'] ?? date('Y-m-d');
            $origen = $body['origen'] ?? null;

            if (!$estudianteId || !$datos) {
                responderError('El estudiante y los datos del archivo son obligatorios.', 400);
            }

            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO trainee_archivos (id, estudiante_id, nombre, tipo, datos, fecha, origen)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                         estudiante_id = VALUES(estudiante_id),
                         nombre = VALUES(nombre),
                         tipo = VALUES(tipo),
                         datos = VALUES(datos),
                         fecha = VALUES(fecha),
                         origen = VALUES(origen)'
                );
                $stmt->execute([$id, $estudianteId, $nombre, $tipo, $datos, $fecha, $origen]);
                responderJson(['ok' => true, 'id' => $id]);
            } catch (Exception $e) {
                responderErrorDb($e, 'guardar el archivo en la base de datos');
            }
            return;
        }

        $registros = is_array($body) ? $body : [];
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO trainee_archivos (id, estudiante_id, nombre, tipo, datos, fecha, origen)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                     estudiante_id = VALUES(estudiante_id),
                     nombre = VALUES(nombre),
                     tipo = VALUES(tipo),
                     datos = VALUES(datos),
                     fecha = VALUES(fecha),
                     origen = VALUES(origen)'
            );
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $estId = ($rol === 'Estudiante') ? $miId : ($r['estudianteId'] ?? $r['estudiante_id'] ?? '');
                if (!$estId || empty($r['datos'])) continue;
                $stmt->execute([
                    $id,
                    $estId,
                    $r['nombre'] ?? 'Archivo',
                    $r['tipo'] ?? 'application/pdf',
                    $r['datos'] ?? '',
                    $r['fecha'] ?? date('Y-m-d'),
                    $r['origen'] ?? null,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar los archivos en la base de datos');
        }
        return;
    }

    if ($metodo === 'DELETE') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $miId = $sesion['id'] ?? '';
        $id = $_GET['id'] ?? leerBodyJson()['id'] ?? null;
        if (!$id) {
            responderError('ID del archivo obligatorio para eliminar.', 400);
        }

        // BOLA protection: si es Estudiante, validar que el archivo sea suyo antes de borrar
        if ($rol === 'Estudiante') {
            $stmtCheck = $pdo->prepare('SELECT estudiante_id FROM trainee_archivos WHERE id = ?');
            $stmtCheck->execute([$id]);
            $f = $stmtCheck->fetch();
            if (!$f || $f['estudiante_id'] !== $miId) {
                responderError('No tienes permiso para eliminar este archivo.', 403);
            }
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM trainee_archivos WHERE id = ?');
            $stmt->execute([$id]);
            responderJson(['ok' => true]);
        } catch (Exception $e) {
            responderErrorDb($e, 'eliminar el archivo');
        }
        return;
    }

    responderError('Metodo no permitido.', 405);
}

/**
 * Gestión de comunicados institucionales y notificaciones.
 * Soporta creación pública y dirigida por cohortes/roles.
 */

function manejarPagosDocentes(PDO $pdo): void {
    asegurarEsquemaPagosDocentes($pdo);
    $sesion = exigirSesion(['Superadmin', 'Coordinador']);
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($metodo === 'GET') {
        $docenteId = $_GET['docente_id'] ?? $_GET['docenteId'] ?? null;
        $id = $_GET['id'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM pagos_docentes WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) {
                responderError('Registro de pago no encontrado', 404);
            }
            responderJson(mapearPagoDocenteACamelCase($fila));
            return;
        }

        if ($docenteId) {
            $stmt = $pdo->prepare("SELECT * FROM pagos_docentes WHERE docente_id = ? ORDER BY fecha_pago DESC, creado_en DESC");
            $stmt->execute([$docenteId]);
            $filas = $stmt->fetchAll();
        } else {
            $filas = $pdo->query("SELECT * FROM pagos_docentes ORDER BY fecha_pago DESC, creado_en DESC")->fetchAll();
        }

        $resultado = array_map('mapearPagoDocenteACamelCase', $filas);
        responderJson($resultado);
        return;
    }

    if ($metodo === 'POST') {
        $body = leerBodyJson();

        // 1. Caso especial: actualizar sólo datos bancarios y tarifa por hora del docente
        if (isset($_GET['action']) && $_GET['action'] === 'datos_bancarios') {
            $docenteId = $body['docenteId'] ?? $body['docente_id'] ?? null;
            if (!$docenteId) {
                responderError('Falta docenteId para actualizar los datos bancarios.', 400);
            }
            $stmt = $pdo->prepare("UPDATE usuarios SET 
                tarifa_hora = ?,
                banco = ?,
                tipo_cuenta = ?,
                numero_cuenta = ?,
                titular_cuenta = ?,
                documento_cuenta = ?
                WHERE id = ?");
            $stmt->execute([
                (float)($body['tarifaHora'] ?? $body['tarifa_hora'] ?? 0),
                trim((string)($body['banco'] ?? '')),
                trim((string)($body['tipoCuenta'] ?? $body['tipo_cuenta'] ?? '')),
                trim((string)($body['numeroCuenta'] ?? $body['numero_cuenta'] ?? '')),
                trim((string)($body['titularCuenta'] ?? $body['titular_cuenta'] ?? '')),
                trim((string)($body['documentoCuenta'] ?? $body['documento_cuenta'] ?? '')),
                $docenteId
            ]);
            responderJson(['ok' => true, 'mensaje' => 'Datos bancarios y tarifa del docente actualizados con éxito.']);
            return;
        }

        // 2. Si el body es un array de pagos (reemplazo o sincronización Store.set)
        if (is_array($body) && isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO pagos_docentes 
                    (id, docente_id, docente_nombre, periodo, mes, horas, tarifa_hora, total_pagado, fecha_pago, entidad_bancaria, numero_referencia, comprobante_nombre, comprobante_tipo, comprobante_url, observaciones, estado, creado_por)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        docente_id = VALUES(docente_id),
                        docente_nombre = VALUES(docente_nombre),
                        periodo = VALUES(periodo),
                        mes = VALUES(mes),
                        horas = VALUES(horas),
                        tarifa_hora = VALUES(tarifa_hora),
                        total_pagado = VALUES(total_pagado),
                        fecha_pago = VALUES(fecha_pago),
                        entidad_bancaria = VALUES(entidad_bancaria),
                        numero_referencia = VALUES(numero_referencia),
                        comprobante_nombre = COALESCE(VALUES(comprobante_nombre), comprobante_nombre),
                        comprobante_tipo = COALESCE(VALUES(comprobante_tipo), comprobante_tipo),
                        comprobante_url = COALESCE(VALUES(comprobante_url), comprobante_url),
                        observaciones = VALUES(observaciones),
                        estado = VALUES(estado)");
                
                foreach ($body as $b) {
                    $id = $b['id'] ?? ('pago_' . bin2hex(random_bytes(8)));
                    $stmt->execute([
                        $id,
                        $b['docenteId'] ?? $b['docente_id'] ?? '',
                        $b['docenteNombre'] ?? $b['docente_nombre'] ?? '',
                        $b['periodo'] ?? '',
                        $b['mes'] ?? date('Y-m'),
                        (float)($b['horas'] ?? 0),
                        (float)($b['tarifaHora'] ?? $b['tarifa_hora'] ?? 0),
                        (float)($b['totalPagado'] ?? $b['total_pagado'] ?? 0),
                        $b['fechaPago'] ?? $b['fecha_pago'] ?? date('Y-m-d'),
                        $b['entidadBancaria'] ?? $b['entidad_bancaria'] ?? '',
                        $b['numeroReferencia'] ?? $b['numero_referencia'] ?? '',
                        $b['comprobanteNombre'] ?? $b['comprobante_nombre'] ?? '',
                        $b['comprobanteTipo'] ?? $b['comprobante_tipo'] ?? '',
                        $b['comprobanteUrl'] ?? $b['comprobante_url'] ?? null,
                        $b['observaciones'] ?? '',
                        $b['estado'] ?? 'Pagado',
                        $sesion['nombre'] ?? 'Superadmin'
                    ]);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'total' => count($body)]);
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar pagos: ' . $e->getMessage(), 500);
            }
            return;
        }

        // 3. Si es un registro individual de pago
        if (is_array($body)) {
            $docenteId = $body['docenteId'] ?? $body['docente_id'] ?? null;
            if (!$docenteId) {
                responderError('Falta docenteId para registrar el pago.', 400);
            }

            $id = !empty($body['id']) ? $body['id'] : ('pago_' . bin2hex(random_bytes(8)));
            $stmt = $pdo->prepare("INSERT INTO pagos_docentes 
                (id, docente_id, docente_nombre, periodo, mes, horas, tarifa_hora, total_pagado, fecha_pago, entidad_bancaria, numero_referencia, comprobante_nombre, comprobante_tipo, comprobante_url, observaciones, estado, creado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    docente_id = VALUES(docente_id),
                    docente_nombre = VALUES(docente_nombre),
                    periodo = VALUES(periodo),
                    mes = VALUES(mes),
                    horas = VALUES(horas),
                    tarifa_hora = VALUES(tarifa_hora),
                    total_pagado = VALUES(total_pagado),
                    fecha_pago = VALUES(fecha_pago),
                    entidad_bancaria = VALUES(entidad_bancaria),
                    numero_referencia = VALUES(numero_referencia),
                    comprobante_nombre = COALESCE(VALUES(comprobante_nombre), comprobante_nombre),
                    comprobante_tipo = COALESCE(VALUES(comprobante_tipo), comprobante_tipo),
                    comprobante_url = COALESCE(VALUES(comprobante_url), comprobante_url),
                    observaciones = VALUES(observaciones),
                    estado = VALUES(estado)");

            $stmt->execute([
                $id,
                $docenteId,
                $body['docenteNombre'] ?? $body['docente_nombre'] ?? '',
                $body['periodo'] ?? '',
                $body['mes'] ?? date('Y-m'),
                (float)($body['horas'] ?? 0),
                (float)($body['tarifaHora'] ?? $body['tarifa_hora'] ?? 0),
                (float)($body['totalPagado'] ?? $body['total_pagado'] ?? 0),
                $body['fechaPago'] ?? $body['fecha_pago'] ?? date('Y-m-d'),
                $body['entidadBancaria'] ?? $body['entidad_bancaria'] ?? '',
                $body['numeroReferencia'] ?? $body['numero_referencia'] ?? '',
                $body['comprobanteNombre'] ?? $body['comprobante_nombre'] ?? '',
                $body['comprobanteTipo'] ?? $body['comprobante_tipo'] ?? '',
                $body['comprobanteUrl'] ?? $body['comprobante_url'] ?? null,
                $body['observaciones'] ?? '',
                $body['estado'] ?? 'Pagado',
                $sesion['nombre'] ?? 'Superadmin'
            ]);

            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Pago registrado exitosamente']);
            return;
        }

        responderError('Estructura de pago inválida.', 400);
        return;
    }

    if ($metodo === 'DELETE') {
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar registro de pago.', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM pagos_docentes WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Registro de pago eliminado con éxito']);
        return;
    }

    responderError('Método no permitido', 405);
}


function mapearPagoDocenteACamelCase(array $f): array {
    return [
        'id'                 => $f['id'],
        'docenteId'          => $f['docente_id'],
        'docente_id'         => $f['docente_id'],
        'docenteNombre'      => $f['docente_nombre'],
        'docente_nombre'     => $f['docente_nombre'],
        'periodo'            => $f['periodo'],
        'mes'                => $f['mes'],
        'horas'              => (float)$f['horas'],
        'tarifaHora'         => (float)$f['tarifa_hora'],
        'tarifa_hora'        => (float)$f['tarifa_hora'],
        'totalPagado'        => (float)$f['total_pagado'],
        'total_pagado'       => (float)$f['total_pagado'],
        'fechaPago'          => $f['fecha_pago'],
        'fecha_pago'         => $f['fecha_pago'],
        'entidadBancaria'    => $f['entidad_bancaria'],
        'entidad_bancaria'   => $f['entidad_bancaria'],
        'numeroReferencia'   => $f['numero_referencia'],
        'numero_referencia'  => $f['numero_referencia'],
        'comprobanteNombre'  => $f['comprobante_nombre'],
        'comprobante_nombre' => $f['comprobante_nombre'],
        'comprobanteTipo'    => $f['comprobante_tipo'],
        'comprobante_tipo'   => $f['comprobante_tipo'],
        'comprobanteUrl'     => $f['comprobante_url'] ?? '',
        'comprobante_url'    => $f['comprobante_url'] ?? '',
        'observaciones'      => $f['observaciones'] ?? '',
        'estado'             => $f['estado'] ?? 'Pagado',
        'creadoPor'          => $f['creado_por'],
        'creado_por'         => $f['creado_por'],
        'creadoEn'           => $f['creado_en'],
        'actualizadoEn'      => $f['actualizado_en'],
    ];
}

/**
 * Control de Pagos de Estudiantes (Matrículas, Mensualidades, Cuotas con comprobante).
 * - Superadmin y Coordinador: Acceso total para consultar, registrar, editar o eliminar.
 * - Estudiante: Puede consultar únicamente sus propios pagos (BOLA protection).
 */

function manejarPagosEstudiantes(PDO $pdo): void {
    asegurarEsquemaPagosDocentes($pdo);
    $sesion = exigirSesion();
    $rol = $sesion['rol'] ?? '';
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($metodo === 'GET') {
        $id = $_GET['id'] ?? null;
        $estudianteId = $_GET['estudiante_id'] ?? $_GET['estudianteId'] ?? null;
        $cohorte = $_GET['cohorte'] ?? null;

        // BOLA Protection: Si es un estudiante, SOLO puede ver sus propios pagos
        if ($rol === 'Estudiante') {
            $estudianteId = $sesion['id'] ?? '';
        }

        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM pagos_estudiantes WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) {
                responderError('Registro de pago no encontrado', 404);
            }
            if ($rol === 'Estudiante' && $fila['estudiante_id'] !== ($sesion['id'] ?? '')) {
                responderError('No tienes permiso para acceder a este registro.', 403);
            }
            responderJson(mapearPagoEstudianteACamelCase($fila));
            return;
        }

        $params = [];
        $where = [];

        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        if ($restriccion !== null) {
            if ($cohorte) {
                if (!in_array($cohorte, $restriccion, true)) {
                    responderJson([]);
                    return;
                }
                $where[] = "cohorte = ?";
                $params[] = $cohorte;
            } else {
                $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                $where[] = "cohorte IN ($inQuery)";
                foreach ($restriccion as $rc) { $params[] = $rc; }
            }
        } elseif ($cohorte) {
            $where[] = "cohorte = ?";
            $params[] = $cohorte;
        }

        if ($estudianteId) {
            $where[] = "estudiante_id = ?";
            $params[] = $estudianteId;
        }

        $sql = "SELECT * FROM pagos_estudiantes";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY fecha_pago DESC, creado_en DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();

        $resultado = array_map('mapearPagoEstudianteACamelCase', $filas);
        responderJson($resultado);
        return;
    }

    if ($metodo === 'POST') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador']);
        $body = leerBodyJson();

        // 1. Array de pagos (sincronización masiva o Store.set)
        if (is_array($body) && isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO pagos_estudiantes 
                    (id, estudiante_id, estudiante_nombre, cohorte, concepto, mes, monto, fecha_pago, medio_pago, numero_referencia, comprobante_nombre, comprobante_tipo, comprobante_url, observaciones, estado, creado_por)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        estudiante_id = VALUES(estudiante_id),
                        estudiante_nombre = VALUES(estudiante_nombre),
                        cohorte = VALUES(cohorte),
                        concepto = VALUES(concepto),
                        mes = VALUES(mes),
                        monto = VALUES(monto),
                        fecha_pago = VALUES(fecha_pago),
                        medio_pago = VALUES(medio_pago),
                        numero_referencia = VALUES(numero_referencia),
                        comprobante_nombre = COALESCE(VALUES(comprobante_nombre), comprobante_nombre),
                        comprobante_tipo = COALESCE(VALUES(comprobante_tipo), comprobante_tipo),
                        comprobante_url = COALESCE(VALUES(comprobante_url), comprobante_url),
                        observaciones = VALUES(observaciones),
                        estado = VALUES(estado)");

                foreach ($body as $b) {
                    $id = $b['id'] ?? ('pago_est_' . bin2hex(random_bytes(8)));
                    $stmt->execute([
                        $id,
                        $b['estudianteId'] ?? $b['estudiante_id'] ?? '',
                        $b['estudianteNombre'] ?? $b['estudiante_nombre'] ?? '',
                        $b['cohorte'] ?? '',
                        $b['concepto'] ?? 'Matrícula',
                        $b['mes'] ?? date('Y-m'),
                        (float)($b['monto'] ?? 0),
                        $b['fechaPago'] ?? $b['fecha_pago'] ?? date('Y-m-d'),
                        $b['medioPago'] ?? $b['medio_pago'] ?? '',
                        $b['numeroReferencia'] ?? $b['numero_referencia'] ?? '',
                        $b['comprobanteNombre'] ?? $b['comprobante_nombre'] ?? null,
                        $b['comprobanteTipo'] ?? $b['comprobante_tipo'] ?? null,
                        $b['comprobanteUrl'] ?? $b['comprobante_url'] ?? null,
                        $b['observaciones'] ?? '',
                        $b['estado'] ?? 'Pendiente',
                        $sesion['nombre'] ?? 'Superadmin'
                    ]);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'total' => count($body)]);
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar pagos de estudiantes: ' . $e->getMessage(), 500);
            }
            return;
        }

        // 2. Registro individual
        if (is_array($body)) {
            $estudianteId = $body['estudianteId'] ?? $body['estudiante_id'] ?? null;
            if (!$estudianteId) {
                responderError('Falta estudianteId para registrar el pago.', 400);
            }

            $id = !empty($body['id']) ? $body['id'] : ('pago_est_' . bin2hex(random_bytes(8)));
            $stmt = $pdo->prepare("INSERT INTO pagos_estudiantes 
                (id, estudiante_id, estudiante_nombre, cohorte, concepto, mes, monto, fecha_pago, medio_pago, numero_referencia, comprobante_nombre, comprobante_tipo, comprobante_url, observaciones, estado, creado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    estudiante_id = VALUES(estudiante_id),
                    estudiante_nombre = VALUES(estudiante_nombre),
                    cohorte = VALUES(cohorte),
                    concepto = VALUES(concepto),
                    mes = VALUES(mes),
                    monto = VALUES(monto),
                    fecha_pago = VALUES(fecha_pago),
                    medio_pago = VALUES(medio_pago),
                    numero_referencia = VALUES(numero_referencia),
                    comprobante_nombre = COALESCE(VALUES(comprobante_nombre), comprobante_nombre),
                    comprobante_tipo = COALESCE(VALUES(comprobante_tipo), comprobante_tipo),
                    comprobante_url = COALESCE(VALUES(comprobante_url), comprobante_url),
                    observaciones = VALUES(observaciones),
                    estado = VALUES(estado)");

            $stmt->execute([
                $id,
                $estudianteId,
                $body['estudianteNombre'] ?? $body['estudiante_nombre'] ?? '',
                $body['cohorte'] ?? '',
                $body['concepto'] ?? 'Matrícula',
                $body['mes'] ?? date('Y-m'),
                (float)($body['monto'] ?? 0),
                $body['fechaPago'] ?? $body['fecha_pago'] ?? date('Y-m-d'),
                $body['medioPago'] ?? $body['medio_pago'] ?? '',
                $body['numeroReferencia'] ?? $body['numero_referencia'] ?? '',
                $body['comprobanteNombre'] ?? $body['comprobante_nombre'] ?? '',
                $body['comprobanteTipo'] ?? $body['comprobante_tipo'] ?? '',
                $body['comprobanteUrl'] ?? $body['comprobante_url'] ?? null,
                $body['observaciones'] ?? '',
                $body['estado'] ?? 'Confirmado',
                $sesion['nombre'] ?? 'Superadmin'
            ]);

            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Pago de estudiante registrado exitosamente']);
            return;
        }

        responderError('Estructura de pago inválida.', 400);
        return;
    }

    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar registro de pago.', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM pagos_estudiantes WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Registro de pago de estudiante eliminado con éxito']);
        return;
    }

    responderError('Método no permitido', 405);
}


function mapearPagoEstudianteACamelCase(array $f): array {
    return [
        'id'                 => $f['id'],
        'estudianteId'       => $f['estudiante_id'],
        'estudiante_id'      => $f['estudiante_id'],
        'estudianteNombre'   => $f['estudiante_nombre'],
        'estudiante_nombre'  => $f['estudiante_nombre'],
        'cohorte'            => $f['cohorte'],
        'concepto'           => $f['concepto'],
        'mes'                => $f['mes'],
        'monto'              => (float)$f['monto'],
        'fechaPago'          => $f['fecha_pago'],
        'fecha_pago'         => $f['fecha_pago'],
        'medioPago'          => $f['medio_pago'],
        'medio_pago'         => $f['medio_pago'],
        'numeroReferencia'   => $f['numero_referencia'],
        'numero_referencia'  => $f['numero_referencia'],
        'comprobanteNombre'  => $f['comprobante_nombre'],
        'comprobante_nombre' => $f['comprobante_nombre'],
        'comprobanteTipo'    => $f['comprobante_tipo'],
        'comprobante_tipo'   => $f['comprobante_tipo'],
        'comprobanteUrl'     => $f['comprobante_url'] ?? '',
        'comprobante_url'    => $f['comprobante_url'] ?? '',
        'observaciones'      => $f['observaciones'] ?? '',
        'estado'             => $f['estado'] ?? 'Confirmado',
        'creadoPor'          => $f['creado_por'],
        'creado_por'         => $f['creado_por'],
        'creadoEn'           => $f['creado_en'],
        'actualizadoEn'      => $f['actualizado_en'],
    ];
}

/**
 * Gestión de justificaciones y excusas de asistencia médica / laboral.
 * Permite a los estudiantes radicar excusas con soporte (foto/PDF)
 * y a docentes / coordinadores / superadmins revisarlas, aprobarlas o rechazarlas.
 */

function manejarProyectosFundacion(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($metodo === 'GET') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM proyectos_fundacion WHERE id = ?");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) {
                responderError('Proyecto no encontrado', 404);
            }
            responderJson(mapearProyectoFundacion($fila));
            return;
        }

        $categoria = $_GET['category'] ?? $_GET['categoria'] ?? null;
        $estado = $_GET['status'] ?? $_GET['estado'] ?? null;
        $onlyAPlus = isset($_GET['onlyAPlus']) && ($_GET['onlyAPlus'] === 'true' || $_GET['onlyAPlus'] === '1');
        $search = trim($_GET['search'] ?? $_GET['q'] ?? '');

        $sql = "SELECT * FROM proyectos_fundacion WHERE 1=1";
        $params = [];

        $sesion = obtenerSesionOpcional();
        if ($sesion && ($sesion['rol'] ?? '') === 'Aliado') {
            responderError('Los aliados no tienen acceso a portafolios y proyectos.', 403);
        }
        $esInversorODonante = $sesion && ($sesion['rol'] ?? '') === 'Donante';
        if ($esInversorODonante || (isset($_GET['para_inversores']) && $_GET['para_inversores'] === '1')) {
            $sql .= " AND visible_inversores = 1";
        }

        if ($categoria) {
            $sql .= " AND categoria = ?";
            $params[] = $categoria;
        }
        if ($estado) {
            $sql .= " AND estado = ?";
            $params[] = $estado;
        }
        if ($onlyAPlus) {
            $sql .= " AND es_aplus = 1";
        }
        if ($search !== '') {
            $sql .= " AND (nombre LIKE ? OR id LIKE ? OR resumen LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= " ORDER BY es_aplus DESC, indice_impacto DESC, nombre ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();

        $resultado = array_map('mapearProyectoFundacion', $filas);
        responderJson($resultado);
        return;
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Administrador']);
        $body = leerBodyJson();

        $upsertUno = function(array $p) use ($pdo): string {
            $id = trim($p['id'] ?? '');
            if (!$id) {
                $maxNum = 1;
                $ultimo = $pdo->query("SELECT id FROM proyectos_fundacion WHERE id LIKE 'APL-%' ORDER BY id DESC LIMIT 1")->fetchColumn();
                if ($ultimo && preg_match('/APL-(\d+)/', $ultimo, $m)) {
                    $maxNum = ((int)$m[1]) + 1;
                }
                $id = 'APL-' . str_pad($maxNum, 3, '0', STR_PAD_LEFT);
            }

            $nombre = trim($p['name'] ?? $p['nombre'] ?? 'Iniciativa A+');
            $categoria = trim($p['category'] ?? $p['categoria'] ?? 'Educación & IA');
            $estado = trim($p['status'] ?? $p['estado'] ?? 'En evaluación');
            $esAPlus = (!empty($p['isAPlus']) || !empty($p['es_aplus']) || !empty($p['esAplus'])) ? 1 : 0;
            $visibleInversores = isset($p['visibleInversores']) ? ($p['visibleInversores'] ? 1 : 0) : (isset($p['visible_inversores']) ? ($p['visible_inversores'] ? 1 : 0) : 1);
            $resumen = trim($p['summary'] ?? $p['resumen'] ?? '');

            $desc = $p['description'] ?? $p['descripcion'] ?? [];
            if (!is_array($desc)) {
                $desc = array_filter(array_map('trim', explode("\n", (string)$desc)));
            }
            $descJson = json_encode(array_values($desc), JSON_UNESCAPED_UNICODE);

            $sroi = (float)($p['roi'] ?? $p['sroi'] ?? 0);
            $sroiHorizonte = (int)($p['roiHorizonMonths'] ?? $p['sroi_horizonte_meses'] ?? 12);
            $inversion = (float)($p['investment'] ?? $p['inversion'] ?? 0);
            $retornoProy = (float)($p['projectedReturn'] ?? $p['retorno_proyectado'] ?? ($inversion * max(1, $sroi / 100)));
            $payback = (int)($p['paybackMonths'] ?? $p['payback_meses'] ?? 6);
            $impacto = (int)($p['impactScore'] ?? $p['indice_impacto'] ?? 80);
            $prioridad = trim($p['priority'] ?? $p['prioridad'] ?? 'Alta');
            $riesgo = trim($p['risk'] ?? $p['riesgo'] ?? 'Bajo');
            $fechaInicio = !empty($p['startDate'] ?? $p['fecha_inicio']) ? ($p['startDate'] ?? $p['fecha_inicio']) : null;
            $fechaObj = !empty($p['targetDate'] ?? $p['fecha_objetivo']) ? ($p['targetDate'] ?? $p['fecha_objetivo']) : null;
            $region = trim($p['region'] ?? 'Quibdó, Chocó');

            $owner = $p['owner'] ?? [];
            $respNombre = trim($owner['name'] ?? $p['responsable_nombre'] ?? $p['responsableNombre'] ?? '');
            $respCargo = trim($owner['role'] ?? $p['responsable_cargo'] ?? $p['responsableCargo'] ?? '');
            $respEmail = trim($owner['email'] ?? $p['responsable_email'] ?? $p['responsableEmail'] ?? '');

            $hitos = $p['highlights'] ?? $p['hitos'] ?? [];
            if (!is_array($hitos)) {
                $hitos = array_filter(array_map('trim', explode("\n", (string)$hitos)));
            }
            $hitosJson = json_encode(array_values($hitos), JSON_UNESCAPED_UNICODE);

            $specs = $p['specs'] ?? $p['ficha_tecnica'] ?? [];
            $specsJson = is_array($specs) ? json_encode($specs, JSON_UNESCAPED_UNICODE) : '[]';

            $roiBreakdown = $p['roiBreakdown'] ?? $p['desglose_sroi'] ?? [];
            $roiBreakJson = is_array($roiBreakdown) ? json_encode($roiBreakdown, JSON_UNESCAPED_UNICODE) : '[]';

            $stmt = $pdo->prepare("INSERT INTO proyectos_fundacion (
                id, nombre, categoria, estado, es_aplus, visible_inversores, resumen, descripcion,
                sroi, sroi_horizonte_meses, inversion, retorno_proyectado, payback_meses,
                indice_impacto, prioridad, riesgo, fecha_inicio, fecha_objetivo,
                region, responsable_nombre, responsable_cargo, responsable_email,
                hitos, ficha_tecnica, desglose_sroi
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?
            ) ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                categoria = VALUES(categoria),
                estado = VALUES(estado),
                es_aplus = VALUES(es_aplus),
                visible_inversores = VALUES(visible_inversores),
                resumen = VALUES(resumen),
                descripcion = VALUES(descripcion),
                sroi = VALUES(sroi),
                sroi_horizonte_meses = VALUES(sroi_horizonte_meses),
                inversion = VALUES(inversion),
                retorno_proyectado = VALUES(retorno_proyectado),
                payback_meses = VALUES(payback_meses),
                indice_impacto = VALUES(indice_impacto),
                prioridad = VALUES(prioridad),
                riesgo = VALUES(riesgo),
                fecha_inicio = VALUES(fecha_inicio),
                fecha_objetivo = VALUES(fecha_objetivo),
                region = VALUES(region),
                responsable_nombre = VALUES(responsable_nombre),
                responsable_cargo = VALUES(responsable_cargo),
                responsable_email = VALUES(responsable_email),
                hitos = VALUES(hitos),
                ficha_tecnica = VALUES(ficha_tecnica),
                desglose_sroi = VALUES(desglose_sroi)");

            $stmt->execute([
                $id, $nombre, $categoria, $estado, $esAPlus, $visibleInversores, $resumen, $descJson,
                $sroi, $sroiHorizonte, $inversion, $retornoProy, $payback,
                $impacto, $prioridad, $riesgo, $fechaInicio, $fechaObj,
                $region, $respNombre, $respCargo, $respEmail,
                $hitosJson, $specsJson, $roiBreakJson
            ]);

            return $id;
        };

        if (isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $ids = [];
                foreach ($body as $item) {
                    if (is_array($item)) $ids[] = $upsertUno($item);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'total' => count($ids), 'ids' => $ids]);
                return;
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar proyectos: ' . $e->getMessage(), 500);
            }
        } elseif (is_array($body)) {
            $id = $upsertUno($body);
            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Proyecto guardado con éxito']);
            return;
        }

        responderError('Cuerpo de solicitud inválido', 400);
    }

    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id del proyecto para eliminar.', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM proyectos_fundacion WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Proyecto eliminado correctamente']);
        return;
    }

    responderError('Método no permitido', 405);
}


function mapearProyectoFundacion(array $f): array {
    $desc = json_decode($f['descripcion'] ?? '[]', true) ?: [];
    $hitos = json_decode($f['hitos'] ?? '[]', true) ?: [];
    $specs = json_decode($f['ficha_tecnica'] ?? '[]', true) ?: [];
    $roiBreak = json_decode($f['desglose_sroi'] ?? '[]', true) ?: [];

    return [
        'id'               => $f['id'],
        'name'             => $f['nombre'],
        'nombre'           => $f['nombre'],
        'category'         => $f['categoria'],
        'categoria'        => $f['categoria'],
        'status'           => $f['estado'],
        'estado'           => $f['estado'],
        'isAPlus'          => (bool)$f['es_aplus'],
        'esAplus'          => (bool)$f['es_aplus'],
        'es_aplus'         => (bool)$f['es_aplus'],
        'visibleInversores'=> isset($f['visible_inversores']) ? (bool)$f['visible_inversores'] : true,
        'visible_inversores'=> isset($f['visible_inversores']) ? (int)$f['visible_inversores'] : 1,
        'summary'          => $f['resumen'] ?? '',
        'resumen'          => $f['resumen'] ?? '',
        'description'      => $desc,
        'descripcion'      => $desc,
        'roi'              => (float)$f['sroi'],
        'sroi'             => (float)$f['sroi'],
        'roiHorizonMonths' => (int)$f['sroi_horizonte_meses'],
        'sroiHorizonte'    => (int)$f['sroi_horizonte_meses'],
        'investment'       => (float)$f['inversion'],
        'inversion'        => (float)$f['inversion'],
        'projectedReturn'  => (float)$f['retorno_proyectado'],
        'retornoProyectado'=> (float)$f['retorno_proyectado'],
        'paybackMonths'    => (int)$f['payback_meses'],
        'paybackMeses'     => (int)$f['payback_meses'],
        'impactScore'      => (int)$f['indice_impacto'],
        'indiceImpacto'    => (int)$f['indice_impacto'],
        'priority'         => $f['prioridad'],
        'prioridad'        => $f['prioridad'],
        'risk'             => $f['riesgo'],
        'riesgo'           => $f['riesgo'],
        'startDate'        => $f['fecha_inicio'],
        'fechaInicio'      => $f['fecha_inicio'],
        'targetDate'       => $f['fecha_objetivo'],
        'fechaObjetivo'    => $f['fecha_objetivo'],
        'region'           => $f['region'],
        'owner'            => [
            'name'  => $f['responsable_nombre'] ?? '',
            'role'  => $f['responsable_cargo'] ?? '',
            'email' => $f['responsable_email'] ?? ''
        ],
        'responsableNombre'=> $f['responsable_nombre'] ?? '',
        'responsableCargo' => $f['responsable_cargo'] ?? '',
        'responsableEmail' => $f['responsable_email'] ?? '',
        'highlights'       => $hitos,
        'hitos'            => $hitos,
        'specs'            => $specs,
        'fichaTecnica'     => $specs,
        'roiBreakdown'     => $roiBreak,
        'desgloseSroi'     => $roiBreak,
        'createdAt'        => $f['creado_en'],
        'creadoEn'         => $f['creado_en'],
        'actualizadoEn'    => $f['actualizado_en']
    ];
}

/**
 * Endpoint para Proyectos creados y subidos por Estudiantes
 */

function manejarProyectosEstudiantes(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($metodo === 'GET') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM proyectos_estudiantes WHERE id = ?");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) {
                responderError('Proyecto de estudiante no encontrado', 404);
            }
            responderJson(mapearProyectoEstudiante($fila));
            return;
        }

        $estudianteId = $_GET['estudiante_id'] ?? $_GET['estudianteId'] ?? null;
        $cohorte = $_GET['cohorte'] ?? null;
        $estado = $_GET['estado'] ?? null;
        $search = trim($_GET['search'] ?? $_GET['q'] ?? '');

        $sql = "SELECT * FROM proyectos_estudiantes WHERE 1=1";
        $params = [];

        $sesion = obtenerSesionOpcional();
        if ($sesion) {
            if (($sesion['rol'] ?? '') === 'Aliado') {
                responderError('Los aliados no tienen acceso a portafolios y proyectos.', 403);
            }
            $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
            if ($restriccion !== null) {
                if (empty($restriccion)) {
                    $sql .= " AND 1=0";
                } else {
                    $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                    $sql .= " AND cohorte IN ($inQuery)";
                    foreach ($restriccion as $rc) {
                        $params[] = $rc;
                    }
                }
            }
        }

        if ($estudianteId) {
            $sql .= " AND estudiante_id = ?";
            $params[] = $estudianteId;
        }
        if ($cohorte) {
            $sql .= " AND cohorte = ?";
            $params[] = $cohorte;
        }
        if ($estado) {
            $sql .= " AND estado = ?";
            $params[] = $estado;
        }
        if ($search !== '') {
            $sql .= " AND (titulo LIKE ? OR descripcion LIKE ? OR tecnologias LIKE ? OR estudiante_nombre LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= " ORDER BY creado_en DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();

        responderJson(array_map('mapearProyectoEstudiante', $filas));
        return;
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Administrador', 'Docente', 'Estudiante']);
        $body = leerBodyJson();

        $upsertUno = function(array $p) use ($pdo, $sesion): string {
            $id = trim($p['id'] ?? '');
            if (!$id) {
                $id = 'proy_est_' . bin2hex(random_bytes(6));
            }

            // Si es estudiante, vinculamos a su propia cuenta
            $estudianteId = $p['estudianteId'] ?? $p['estudiante_id'] ?? ($sesion['id'] ?? null);
            $estudianteNombre = $p['estudianteNombre'] ?? $p['estudiante_nombre'] ?? ($sesion['nombre'] ?? '');
            $estudianteEmail = $p['estudianteEmail'] ?? $p['estudiante_email'] ?? ($sesion['email'] ?? '');
            $cohorte = $p['cohorte'] ?? ($sesion['cohorte'] ?? '');

            $titulo = trim($p['titulo'] ?? $p['name'] ?? 'Proyecto Estudiantil');
            $categoria = trim($p['categoria'] ?? $p['category'] ?? 'Tecnología & IA');
            $descripcion = trim($p['descripcion'] ?? $p['description'] ?? '');
            $tecnologias = trim($p['tecnologias'] ?? $p['technologies'] ?? '');
            $integrantes = trim($p['integrantes'] ?? $p['team'] ?? '');
            $urlDemo = trim($p['urlDemo'] ?? $p['url_demo'] ?? '');
            $urlRepositorio = trim($p['urlRepositorio'] ?? $p['url_repositorio'] ?? '');
            $imagenUrl = $p['imagenUrl'] ?? $p['imagen_url'] ?? null;
            $estado = trim($p['estado'] ?? 'Publicado');

            $stmt = $pdo->prepare("INSERT INTO proyectos_estudiantes (
                id, titulo, cohorte, categoria, descripcion, tecnologias, integrantes,
                url_demo, url_repositorio, imagen_url, estudiante_id, estudiante_nombre,
                estudiante_email, estado
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?
            ) ON DUPLICATE KEY UPDATE
                titulo = VALUES(titulo),
                cohorte = VALUES(cohorte),
                categoria = VALUES(categoria),
                descripcion = VALUES(descripcion),
                tecnologias = VALUES(tecnologias),
                integrantes = VALUES(integrantes),
                url_demo = VALUES(url_demo),
                url_repositorio = VALUES(url_repositorio),
                imagen_url = COALESCE(VALUES(imagen_url), imagen_url),
                estado = VALUES(estado)");

            $stmt->execute([
                $id, $titulo, $cohorte, $categoria, $descripcion, $tecnologias, $integrantes,
                $urlDemo, $urlRepositorio, $imagenUrl, $estudianteId, $estudianteNombre,
                $estudianteEmail, $estado
            ]);

            return $id;
        };

        if (isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $ids = [];
                foreach ($body as $item) {
                    if (is_array($item)) $ids[] = $upsertUno($item);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'total' => count($ids), 'ids' => $ids]);
                return;
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar proyectos estudiantiles: ' . $e->getMessage(), 500);
            }
        } elseif (is_array($body)) {
            $id = $upsertUno($body);
            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Proyecto estudiantil guardado con éxito']);
            return;
        }

        responderError('Cuerpo de solicitud inválido', 400);
    }

    if ($metodo === 'DELETE') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Administrador', 'Estudiante']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar proyecto.', 400);
        }

        // Si es estudiante, verificar que sea el autor
        if ($sesion['rol'] === 'Estudiante') {
            $stmt = $pdo->prepare("SELECT estudiante_id FROM proyectos_estudiantes WHERE id = ?");
            $stmt->execute([$id]);
            $owner = $stmt->fetchColumn();
            if ($owner && $owner !== $sesion['id']) {
                responderError('No tienes permisos para eliminar este proyecto', 403);
            }
        }

        $stmt = $pdo->prepare("DELETE FROM proyectos_estudiantes WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Proyecto eliminado correctamente']);
        return;
    }

    responderError('Método no permitido', 405);
}


function mapearProyectoEstudiante(array $f): array {
    return [
        'id'               => $f['id'],
        'titulo'           => $f['titulo'],
        'name'             => $f['titulo'],
        'cohorte'          => $f['cohorte'],
        'categoria'        => $f['categoria'],
        'category'         => $f['categoria'],
        'descripcion'      => $f['descripcion'],
        'description'      => $f['descripcion'],
        'tecnologias'      => $f['tecnologias'],
        'integrantes'      => $f['integrantes'],
        'urlDemo'          => $f['url_demo'] ?? '',
        'url_demo'         => $f['url_demo'] ?? '',
        'urlRepositorio'   => $f['url_repositorio'] ?? '',
        'url_repositorio'  => $f['url_repositorio'] ?? '',
        'imagenUrl'        => $f['imagen_url'] ?? '',
        'imagen_url'       => $f['imagen_url'] ?? '',
        'estudianteId'     => $f['estudiante_id'],
        'estudiante_id'    => $f['estudiante_id'],
        'estudianteNombre' => $f['estudiante_nombre'],
        'estudiante_nombre'=> $f['estudiante_nombre'],
        'estudianteEmail'  => $f['estudiante_email'],
        'estudiante_email' => $f['estudiante_email'],
        'estado'           => $f['estado'],
        'creadoEn'         => $f['creado_en'],
        'actualizadoEn'    => $f['actualizado_en']
    ];
}

/**
 * =========================================================================
 * HISTORIAL DE PRÉSTAMOS DE EQUIPO (historial_prestamos)
 * =========================================================================
 * Trazabilidad integral de préstamos, custodias, entregas y devoluciones.
 * Superadmin / Administradores: Acceso global con filtros por usuario, estado y activo.
 * Estudiantes / Docentes: Scoping estricto solo a su propio historial personal.
 */

