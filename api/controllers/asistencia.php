<?php
/**
 * Controlador de Asistencia, Sesiones QR y Justificaciones
 */

function manejarAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesionAuth = exigirSesion();
        $rol = $sesionAuth['rol'] ?? '';
        $esAdmin = in_array($rol, ['Superadmin', 'Coordinador'], true);

        $conds = [];
        $params = [];

        // BOLA / IDOR Protection:
        // Si el usuario es Estudiante, forzar que SOLO pueda consultar su propia asistencia
        if ($rol === 'Estudiante') {
            $nombreEst = $sesionAuth['nombre'] ?? '';
            $emailEst = $sesionAuth['email'] ?? '';
            $idEst = $sesionAuth['id'] ?? '';
            if (empty($nombreEst) && (!empty($idEst) || !empty($emailEst))) {
                $stmtNom = $pdo->prepare('SELECT nombre FROM usuarios WHERE id = ? OR LOWER(email) = ? LIMIT 1');
                $stmtNom->execute([$idEst, strtolower($emailEst)]);
                $nombreEst = (string)($stmtNom->fetchColumn() ?: '');
            }
            $conds[] = '(estudiante = ? OR estudiante = ?)';
            $params[] = $nombreEst;
            $params[] = $emailEst;
        } else {
            $restriccion = obtenerRestriccionCohortes($sesionAuth, $pdo);
            if ($restriccion !== null) {
                // Restringir a estudiantes de las cohortes permitidas para Aliados
                $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                $conds[] = "estudiante IN (SELECT nombre FROM usuarios WHERE cohorte IN ($inQuery) UNION SELECT email FROM usuarios WHERE cohorte IN ($inQuery))";
                foreach ($restriccion as $c) { $params[] = $c; }
            }
            if (!empty($_GET['estudiante'])) {
                $conds[] = 'estudiante = ?';
                $params[] = $_GET['estudiante'];
            }
        }

        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        if (!empty($_GET['modulo'])) {
            $conds[] = 'modulo = ?';
            $params[] = $_GET['modulo'];
        }
        $sesion = $_GET['sesion_id'] ?? $_GET['sesionId'] ?? null;
        if (!empty($sesion)) {
            $conds[] = 'sesion_id = ?';
            $params[] = $sesion;
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id FROM asistencia';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $limitAsistencia = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 1000;
        $sql .= " ORDER BY fecha DESC LIMIT $limitAsistencia";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) use ($esAdmin) {
            return [
                'id' => $f['id'], 'estudiante' => $f['estudiante'], 'docente' => $f['docente'],
                'modulo' => $f['modulo'], 'materia' => $f['materia'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'sesionId' => $f['sesion_id'], 'automatico' => (bool)$f['automatico'],
                'ipOrigen' => $esAdmin ? ($f['ip_origen'] ?? null) : null,
                'dispositivoId' => $esAdmin ? ($f['dispositivo_id'] ?? null) : null,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    modulo = VALUES(modulo),
                    materia = VALUES(materia),
                    fecha = VALUES(fecha),
                    estado = IF(asistencia.estado IN (\'Presente\', \'Tarde\', \'Justificada\') AND VALUES(estado) = \'Falla\', asistencia.estado, VALUES(estado)),
                    sesion_id = VALUES(sesion_id),
                    automatico = IF(asistencia.estado IN (\'Presente\', \'Tarde\', \'Justificada\') AND VALUES(estado) = \'Falla\', 0, VALUES(automatico)),
                    ip_origen = COALESCE(asistencia.ip_origen, VALUES(ip_origen)),
                    dispositivo_id = COALESCE(asistencia.dispositivo_id, VALUES(dispositivo_id))'
            );
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['estudiante'] ?? '', $r['docente'] ?? null,
                    $r['modulo'] ?? null, $r['materia'] ?? null, $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Falla', $r['sesionId'] ?? $r['sesion_id'] ?? null,
                    !empty($r['automatico']) ? 1 : 0,
                    $r['ipOrigen'] ?? $r['ip_origen'] ?? null,
                    $r['dispositivoId'] ?? $r['dispositivo_id'] ?? null,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Asistencia');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Endpoint de cálculo de Semáforo de Riesgo Académico en MySQL.
 * Agregación pesada procesada en el motor relacional en ~7ms con índices compuestos.
 */

function manejarSesionesAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        if (!empty($_GET['iniciada_por'])) {
            $conds[] = 'iniciada_por = ?';
            $params[] = $_GET['iniciada_por'];
        }
        $sql = 'SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha DESC, hora_inicio DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'cohorte' => $f['cohorte'], 'modulo' => $f['modulo'], 'materia' => $f['materia'],
                'fecha' => $f['fecha'], 'horaInicio' => $f['hora_inicio'], 'codigo' => $f['codigo'],
                'iniciadaPor' => $f['iniciada_por'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO sesiones_asistencia (id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    cohorte = VALUES(cohorte),
                    modulo = VALUES(modulo),
                    materia = VALUES(materia),
                    fecha = VALUES(fecha),
                    hora_inicio = VALUES(hora_inicio),
                    codigo = VALUES(codigo),
                    iniciada_por = VALUES(iniciada_por)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['cohorte'] ?? '', $r['modulo'] ?? null, $r['materia'] ?? null,
                    $r['fecha'] ?? date('Y-m-d'), $r['horaInicio'] ?? date('Y-m-d H:i:s'),
                    $r['codigo'] ?? '', $r['iniciadaPor'] ?? '',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM sesiones_asistencia WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM sesiones_asistencia");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Sesiones de asistencia');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Tokens QR (token vigente para escanear asistencia)

function manejarQrTokens(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'tipo' => $f['tipo'], 'cohorte' => $f['cohorte'],
                'docente' => $f['docente'], 'token' => $f['token'], 'fecha' => $f['fecha'] ?? null
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM qr_tokens');
            $stmt = $pdo->prepare('INSERT INTO qr_tokens (id, tipo, cohorte, docente, token, fecha) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['tipo'] ?? 'estudiante', $r['cohorte'] ?? '',
                    $r['docente'] ?? '', $r['token'] ?? '', $r['fecha'] ?? date('Y-m-d'),
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Códigos QR');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Asistencia QR pública (escaneo de QR y registro de asistencia sin login previo)

function manejarQrAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    // GET /api/qr_asistencia?tipo=docente|estudiante&token=XYZ
    if ($metodo === 'GET') {
        $tipo = trim($_GET['tipo'] ?? '');
        $token = trim($_GET['token'] ?? '');
        if (!$tipo || !$token) {
            responderError('Faltan parámetros tipo y token.', 400);
        }

        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens WHERE tipo = ? AND token = ? LIMIT 1');
        $stmt->execute([$tipo, $token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr || !hash_equals((string)$qr['token'], (string)$token)) {
            responderError('Código QR no encontrado o inválido.', 404);
        }

        $hoy = date('Y-m-d');
        if (!empty($qr['fecha']) && $qr['fecha'] !== $hoy) {
            responderError('Este código QR ha expirado (corresponde al día ' . $qr['fecha'] . '). Para evitar fraude, cada día los códigos QR se actualizan. Escanea el código del día de hoy.', 403);
        }

        // Buscar sesión de hoy para esta cohorte y docente
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        // Si es DOCENTE
        if ($tipo === 'docente') {
            $recienActivada = false;
            $yaEstabaActivada = false;

            if (!$sesion) {
                // PRIMERA ACTIVACIÓN DEL DÍA: Se crea la sesión y se insertan las fallas por defecto
                // Obtener nombre del curso real del horario para esta cohorte y docente
                $stmtHor = $pdo->prepare('SELECT franjas FROM horarios WHERE cohorte = ?');
                $stmtHor->execute([$qr['cohorte']]);
                $moduloNombre = null;
                while ($hRow = $stmtHor->fetch(PDO::FETCH_ASSOC)) {
                    $franjas = json_decode($hRow['franjas'], true) ?? [];
                    foreach ($franjas as $f) {
                        if (($f['docente'] ?? '') === $qr['docente'] && !empty($f['curso']) && $f['curso'] !== 'Formacion') {
                            $moduloNombre = $f['curso'];
                            break 2;
                        }
                    }
                }
                if (!$moduloNombre) {
                    $stmtMod = $pdo->prepare('SELECT modulo FROM modulos WHERE nombre = ? LIMIT 1');
                    $stmtMod->execute([$qr['cohorte']]);
                    $modRow = $stmtMod->fetch(PDO::FETCH_ASSOC);
                    $moduloNombre = $modRow ? $modRow['modulo'] : $qr['cohorte'];
                }

                $nuevaSesId = 'ses_' . bin2hex(random_bytes(6)) . time();
                $horaInicio = date('Y-m-d H:i:s');
                $codigoSesion = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

                $stmtIns = $pdo->prepare('INSERT INTO sesiones_asistencia (id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $stmtIns->execute([$nuevaSesId, $qr['cohorte'], $moduloNombre, $moduloNombre, $hoy, $horaInicio, $codigoSesion, $qr['docente']]);

                $sesion = [
                    'id' => $nuevaSesId, 'cohorte' => $qr['cohorte'], 'modulo' => $moduloNombre,
                    'materia' => $moduloNombre, 'fecha' => $hoy, 'horaInicio' => $horaInicio,
                    'codigo' => $codigoSesion, 'iniciadaPor' => $qr['docente']
                ];
                $recienActivada = true;
            } else {
                // EL PROFESOR YA ACTIVÓ EL CÓDIGO QR HOY:
                // Si el sistema detecta que volvió a abrir el link o escanear el código,
                // NO PUEDE volver a activar la asistencia.
                // hora_inicio se mantiene inmutable y no se permite ninguna reactivación.
                $yaEstabaActivada = true;
                $sesion = [
                    'id' => $sesion['id'], 'cohorte' => $sesion['cohorte'], 'modulo' => $sesion['modulo'],
                    'materia' => $sesion['materia'], 'fecha' => $sesion['fecha'], 'horaInicio' => $sesion['hora_inicio'],
                    'codigo' => $sesion['codigo'], 'iniciadaPor' => $sesion['iniciada_por']
                ];
            }

            // Buscar token del estudiante correspondiente para mostrar su QR en pantalla (priorizar hoy)
            $stmtTokenEst = $pdo->prepare('SELECT token FROM qr_tokens WHERE tipo = "estudiante" AND cohorte = ? AND docente = ? ORDER BY (fecha = ?) DESC, id DESC LIMIT 1');
            $stmtTokenEst->execute([$qr['cohorte'], $qr['docente'], $hoy]);
            $tokenEstRow = $stmtTokenEst->fetch(PDO::FETCH_ASSOC);
            $tokenEstudiante = $tokenEstRow ? $tokenEstRow['token'] : null;

            // Contar cuántos estudiantes ya registraron asistencia hoy en esta sesión (Presente o Tarde)
            $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM asistencia WHERE sesion_id = ? AND estado IN ("Presente", "Tarde")');
            $stmtCount->execute([$sesion['id']]);
            $totalAsistencias = (int)$stmtCount->fetchColumn();

            responderJson([
                'ok' => true,
                'tipo' => 'docente',
                'registro' => $qr,
                'sesion' => $sesion,
                'recienActivada' => $recienActivada,
                'yaEstabaActivada' => $yaEstabaActivada,
                'tokenEstudiante' => $tokenEstudiante,
                'totalAsistencias' => $totalAsistencias,
            ]);
            return;
        }

        // Si es ESTUDIANTE
        $sesionActiva = !empty($sesion);
        $sesionData = null;
        if ($sesion) {
            $sesionData = [
                'id' => $sesion['id'], 'cohorte' => $sesion['cohorte'], 'modulo' => $sesion['modulo'],
                'materia' => $sesion['materia'], 'fecha' => $sesion['fecha'], 'horaInicio' => $sesion['hora_inicio'],
                'codigo' => $sesion['codigo'], 'iniciadaPor' => $sesion['iniciada_por']
            ];
        }

        // COMPROBACIÓN ANTIFRAUDE EN GET:
        // Si este dispositivo o IP ya confirmó la asistencia de un estudiante hoy para este docente/clase,
        // avisar al frontend para bloquear el formulario y mostrar de inmediato el estado confirmado.
        $ipCliente = obtenerIpCliente();
        $dispositivoId = trim($_GET['devId'] ?? '');

        $yaRegistradoDispositivo = false;
        $estudianteRegistrado = null;
        $estadoRegistrado = null;

        if ($sesion && $ipCliente && $ipCliente !== '0.0.0.0') {
            $stmtPrevioGet = $pdo->prepare('
                SELECT a.estudiante, a.estado, a.fecha, a.ip_origen 
                FROM asistencia a 
                WHERE (a.sesion_id = ? OR (a.fecha = ? AND a.docente = ?))
                  AND a.estado IN ("Presente", "Tarde") 
                  AND (
                    (a.ip_origen IS NOT NULL AND a.ip_origen != "" AND a.ip_origen = ?)
                    OR (? != "" AND a.dispositivo_id IS NOT NULL AND a.dispositivo_id != "" AND a.dispositivo_id = ?)
                  )
                ORDER BY a.id DESC
                LIMIT 1
            ');
            $stmtPrevioGet->execute([$sesion['id'], $hoy, $qr['docente'], $ipCliente, $dispositivoId, $dispositivoId]);
            $previoGet = $stmtPrevioGet->fetch(PDO::FETCH_ASSOC);
            if ($previoGet) {
                $yaRegistradoDispositivo = true;
                $estudianteRegistrado = $previoGet['estudiante'];
                $estadoRegistrado = $previoGet['estado'];
            }
        }

        responderJson([
            'ok' => true,
            'tipo' => 'estudiante',
            'registro' => $qr,
            'sesionActiva' => $sesionActiva,
            'sesion' => $sesionData,
            'yaRegistradoDispositivo' => $yaRegistradoDispositivo,
            'estudianteRegistrado' => $estudianteRegistrado,
            'estadoRegistrado' => $estadoRegistrado,
            'ipCliente' => $ipCliente,
        ]);
        return;
    }

    // POST /api/qr_asistencia: registro de asistencia del estudiante (formulario Google-style)
    if ($metodo === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($body['token'] ?? '');
        $usuarioEntrada = trim($body['usuario'] ?? ($body['email'] ?? ''));

        if (!$token || !$usuarioEntrada) {
            responderError('Ingresa tu correo institucional o nombre de usuario para confirmar tu asistencia.', 400);
        }

        // 1. Validar token del estudiante y verificar que corresponda a hoy
        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens WHERE tipo = "estudiante" AND token = ? LIMIT 1');
        $stmt->execute([$token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr || !hash_equals((string)$qr['token'], (string)$token)) {
            responderError('Código QR no válido o expirado.', 404);
        }

        $hoy = date('Y-m-d');
        if (!empty($qr['fecha']) && $qr['fecha'] !== $hoy) {
            responderError('Este código QR ha expirado (corresponde al día ' . $qr['fecha'] . '). Para evitar fraude, cada día los códigos QR se actualizan. Escanea el código del día de hoy.', 403);
        }

        // 2. Verificar que el docente haya iniciado la sesión de hoy
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        if (!$sesion) {
            responderError('Tu docente (' . $qr['docente'] . ') aún no ha activado la asistencia de hoy. Espera a que el profesor escanee su código QR.', 400);
        }

        // 3. CONTROL ANTIFRAUDE POR IP Y DISPOSITIVO (PRIMERO):
        // Si este dispositivo o IP ya confirmó la asistencia de un estudiante en esta sesión/clase,
        // se bloquea de inmediato cualquier intento de registrar a una persona distinta.
        $ipCliente = obtenerIpCliente();
        $dispositivoId = trim($body['dispositivoId'] ?? '');

        if ($ipCliente && $ipCliente !== '0.0.0.0') {
            $stmtPrevio = $pdo->prepare('
                SELECT a.estudiante, u.email 
                FROM asistencia a 
                LEFT JOIN usuarios u ON (u.nombre = a.estudiante OR u.email = a.estudiante) AND u.rol = "Estudiante"
                WHERE (a.sesion_id = ? OR (a.fecha = ? AND a.docente = ?))
                  AND a.estado IN ("Presente", "Tarde") 
                  AND (
                    (a.ip_origen IS NOT NULL AND a.ip_origen != "" AND a.ip_origen = ?)
                    OR (? != "" AND a.dispositivo_id IS NOT NULL AND a.dispositivo_id != "" AND a.dispositivo_id = ?)
                  )
                ORDER BY a.id DESC
                LIMIT 1
            ');
            $stmtPrevio->execute([$sesion['id'], $hoy, $qr['docente'], $ipCliente, $dispositivoId, $dispositivoId]);
            $previo = $stmtPrevio->fetch(PDO::FETCH_ASSOC);

            if ($previo) {
                // Verificar si la entrada corresponde al mismo estudiante que ya registró este dispositivo
                $emailPrevio = strtolower(trim($previo['email'] ?? ''));
                $userPartPrevio = $emailPrevio ? explode('@', $emailPrevio)[0] : '';
                $nomPrevio = strtolower(trim($previo['estudiante']));
                $entradaNorm = strtolower(trim($usuarioEntrada));

                // Buscar en usuarios para verificar equivalencia exacta
                $stmtCheckMismo = $pdo->prepare('
                    SELECT id, nombre, email FROM usuarios 
                    WHERE rol = "Estudiante" 
                      AND (
                        LOWER(TRIM(email)) = LOWER(?) 
                        OR LOWER(TRIM(nombre)) = LOWER(?) 
                        OR LOWER(TRIM(SUBSTRING_INDEX(email, "@", 1))) = LOWER(?)
                      )
                    LIMIT 1
                ');
                $stmtCheckMismo->execute([$usuarioEntrada, $usuarioEntrada, $usuarioEntrada]);
                $estEntrada = $stmtCheckMismo->fetch(PDO::FETCH_ASSOC);

                $esElMismo = false;
                if ($estEntrada) {
                    $esElMismo = (strtolower(trim($estEntrada['nombre'])) === $nomPrevio || ($emailPrevio && strtolower(trim($estEntrada['email'])) === $emailPrevio));
                } else {
                    $esElMismo = ($entradaNorm === $nomPrevio || ($emailPrevio && $entradaNorm === $emailPrevio) || ($userPartPrevio && $entradaNorm === $userPartPrevio));
                }

                if (!$esElMismo) {
                    responderError(
                        'Acceso no permitido: este dispositivo (IP: ' . $ipCliente . ') ya registró la asistencia de "' . $previo['estudiante'] . '" en esta clase. Por motivos de seguridad y prevención de fraude, no se permite registrar a otro compañero desde el mismo celular o computador.',
                        403
                    );
                }
            }
        }

        // 4. Verificar ventana de tiempo
        $horaInicioTs = strtotime($sesion['hora_inicio']);
        $minsTranscurridos = $horaInicioTs > 0 ? (time() - $horaInicioTs) / 60 : 0;

        if ($minsTranscurridos > 50) {
            responderError('La ventana de registro de asistencia para esta clase ya cerró (superó los 50 minutos de tolerancia).', 400);
        }

        $estado = ($minsTranscurridos <= 20) ? 'Presente' : 'Tarde';

        // 5. Buscar al estudiante en usuarios por email, usuario o nombre
        $stmtEst = $pdo->prepare('
            SELECT id, nombre, email, rol, cohorte, estado 
            FROM usuarios 
            WHERE rol = "Estudiante" 
              AND (
                LOWER(TRIM(email)) = LOWER(?) 
                OR LOWER(TRIM(nombre)) = LOWER(?) 
                OR LOWER(TRIM(SUBSTRING_INDEX(email, "@", 1))) = LOWER(?)
              )
            LIMIT 1
        ');
        $stmtEst->execute([$usuarioEntrada, $usuarioEntrada, $usuarioEntrada]);
        $estudiante = $stmtEst->fetch(PDO::FETCH_ASSOC);

        if (!$estudiante) {
            responderError('No encontramos ningún estudiante registrado con "' . htmlspecialchars($usuarioEntrada) . '". Verifica tu correo institucional o nombre de usuario.', 404);
        }

        // 5. Verificar que pertenezca a la cohorte
        if (trim(strtolower($estudiante['cohorte'])) !== trim(strtolower($qr['cohorte']))) {
            responderError('Perteneces a la cohorte "' . ($estudiante['cohorte'] ?: 'Sin cohorte') . '", pero este código es para la cohorte "' . $qr['cohorte'] . '".', 400);
        }

        // 6. Verificar si ya registró asistencia hoy en esta sesión
        $stmtYa = $pdo->prepare('SELECT id, estado, fecha, ip_origen FROM asistencia WHERE sesion_id = ? AND estudiante = ? LIMIT 1');
        $stmtYa->execute([$sesion['id'], $estudiante['nombre']]);
        $asistExistente = $stmtYa->fetch(PDO::FETCH_ASSOC);

        // Si ya confirmó con puntualidad o tardanza, asegurar que su IP actual quede vinculada y responder
        if ($asistExistente && ($asistExistente['estado'] === 'Presente' || $asistExistente['estado'] === 'Tarde')) {
            // Guardar o actualizar la IP y dispositivo del estudiante si aún no estaban guardados
            if (empty($asistExistente['ip_origen']) || $asistExistente['ip_origen'] !== $ipCliente) {
                $pdo->prepare('UPDATE asistencia SET ip_origen = ?, dispositivo_id = ? WHERE id = ?')
                    ->execute([$ipCliente, $dispositivoId ?: null, $asistExistente['id']]);
            }
            responderJson([
                'ok' => true,
                'yaRegistrado' => true,
                'estudiante' => $estudiante['nombre'],
                'estado' => $asistExistente['estado'],
                'cohorte' => $qr['cohorte'],
                'materia' => $sesion['materia'],
                'mensaje' => 'Ya habías registrado tu asistencia hoy: ' . $asistExistente['estado'] . '.',
            ]);
            return;
        }

        if ($asistExistente) {
            // Tenía 'Falla' (pérdida por defecto): actualizar al nuevo estado alcanzado (Presente o Tarde)
            $stmtUpd = $pdo->prepare('UPDATE asistencia SET estado = ?, automatico = 0, materia = ?, modulo = ?, docente = ?, fecha = ?, ip_origen = ?, dispositivo_id = ? WHERE id = ?');
            $stmtUpd->execute([
                $estado,
                $sesion['materia'],
                $sesion['modulo'],
                $sesion['iniciada_por'],
                $sesion['fecha'],
                $ipCliente,
                $dispositivoId ?: null,
                $asistExistente['id']
            ]);

            responderJson([
                'ok' => true,
                'yaRegistrado' => false,
                'estudiante' => $estudiante['nombre'],
                'estado' => $estado,
                'cohorte' => $qr['cohorte'],
                'materia' => $sesion['materia'],
                'docente' => $sesion['iniciada_por'],
                'hora' => date('h:i A'),
                'mensaje' => $estado === 'Presente' ? '¡Asistencia registrada con puntualidad!' : 'Asistencia registrada (llegada tarde).',
            ]);
            return;
        }

        // 7. Insertar asistencia en MySQL si no existía fila previa
        $nuevoAsistId = 'as_' . bin2hex(random_bytes(6)) . time();
        $stmtInsAsist = $pdo->prepare('INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)');
        $stmtInsAsist->execute([
            $nuevoAsistId,
            $estudiante['nombre'],
            $sesion['iniciada_por'],
            $sesion['modulo'],
            $sesion['materia'],
            $sesion['fecha'],
            $estado,
            $sesion['id'],
            $ipCliente,
            $dispositivoId ?: null,
        ]);

        responderJson([
            'ok' => true,
            'yaRegistrado' => false,
            'estudiante' => $estudiante['nombre'],
            'estado' => $estado,
            'cohorte' => $qr['cohorte'],
            'materia' => $sesion['materia'],
            'docente' => $sesion['iniciada_por'],
            'hora' => date('h:i A'),
            'mensaje' => '¡Asistencia registrada exitosamente!',
        ]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * PQR, Memorandos, Encuestas, Cursos y Pensum
 * Gestión de documentos y seguimiento institucional.
 */

// PQR (Peticiones, Quejas, Reclamos y Sugerencias)

function asegurarEsquemaJustificaciones(PDO $pdo): void {
    static $asegurado = false;
    if ($asegurado) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS justificaciones_asistencia (
            id VARCHAR(64) PRIMARY KEY,
            asistencia_id VARCHAR(64) NULL,
            estudiante VARCHAR(150) NOT NULL,
            fecha DATE NOT NULL,
            materia VARCHAR(150) NOT NULL,
            docente VARCHAR(150) NOT NULL DEFAULT '',
            motivo VARCHAR(100) NOT NULL,
            detalle TEXT NULL,
            archivo_nombre VARCHAR(255) NULL,
            archivo_tipo VARCHAR(100) NULL,
            archivo_base64 LONGTEXT NULL,
            estado VARCHAR(32) NOT NULL DEFAULT 'Pendiente',
            resuelto_por VARCHAR(150) NULL,
            resuelto_en DATETIME NULL,
            comentario_resolucion TEXT NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_estudiante (estudiante),
            INDEX idx_fecha (fecha),
            INDEX idx_estado (estado),
            INDEX idx_asistencia_id (asistencia_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $asegurado = true;
    } catch (Throwable $e) {
        error_log('Error asegurando esquema justificaciones: ' . $e->getMessage());
    }
}


function manejarJustificacionesAsistencia(PDO $pdo): void {
    asegurarEsquemaJustificaciones($pdo);
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $sesion = exigirSesion();

    if ($metodo === 'GET') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM justificaciones_asistencia WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) {
                responderError('Justificación no encontrada', 404);
            }
            $rol = $sesion['rol'] ?? '';
            if ($rol === 'Estudiante' && $fila['estudiante'] !== ($sesion['nombre'] ?? '') && $fila['estudiante'] !== ($sesion['email'] ?? '')) {
                responderError('No tienes permiso para acceder a esta justificación.', 403);
            }
            responderJson(mapearJustificacionACamelCase($fila));
            return;
        }

        $estudiante = $_GET['estudiante'] ?? null;
        $fecha = $_GET['fecha'] ?? null;
        $estado = $_GET['estado'] ?? null;

        $rol = $sesion['rol'] ?? '';
        if ($rol === 'Estudiante') {
            $estudiante = $sesion['nombre'] ?? '';
        }

        $conds = [];
        $params = [];

        if ($estudiante) {
            $conds[] = "estudiante = ?";
            $params[] = $estudiante;
        }
        if ($fecha) {
            $conds[] = "fecha = ?";
            $params[] = $fecha;
        }
        if ($estado) {
            $conds[] = "estado = ?";
            $params[] = $estado;
        }

        $sql = "SELECT * FROM justificaciones_asistencia";
        if (!empty($conds)) {
            $sql .= " WHERE " . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY creado_en DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();

        responderJson(array_map('mapearJustificacionACamelCase', $filas));
        return;
    }

    if ($metodo === 'POST') {
        $body = leerBodyJson();
        if (is_array($body) && isset($body[0]) && is_array($body[0])) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO justificaciones_asistencia 
                    (id, asistencia_id, estudiante, fecha, materia, docente, motivo, detalle, archivo_nombre, archivo_tipo, archivo_base64, estado, resuelto_por, resuelto_en, comentario_resolucion)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        asistencia_id = VALUES(asistencia_id),
                        estudiante = VALUES(estudiante),
                        fecha = VALUES(fecha),
                        materia = VALUES(materia),
                        docente = VALUES(docente),
                        motivo = VALUES(motivo),
                        detalle = VALUES(detalle),
                        archivo_nombre = COALESCE(VALUES(archivo_nombre), archivo_nombre),
                        archivo_tipo = COALESCE(VALUES(archivo_tipo), archivo_tipo),
                        archivo_base64 = COALESCE(VALUES(archivo_base64), archivo_base64),
                        estado = VALUES(estado),
                        resuelto_por = VALUES(resuelto_por),
                        resuelto_en = VALUES(resuelto_en),
                        comentario_resolucion = VALUES(comentario_resolucion)");
                foreach ($body as $b) {
                    $id = $b['id'] ?? ('just_' . bin2hex(random_bytes(8)));
                    $stmt->execute([
                        $id,
                        $b['asistenciaId'] ?? $b['asistencia_id'] ?? null,
                        $b['estudiante'] ?? ($sesion['nombre'] ?? ''),
                        $b['fecha'] ?? date('Y-m-d'),
                        $b['materia'] ?? '',
                        $b['docente'] ?? '',
                        $b['motivo'] ?? 'Médico',
                        $b['detalle'] ?? ($b['comentario'] ?? ''),
                        $b['archivoNombre'] ?? $b['archivo_nombre'] ?? null,
                        $b['archivoTipo'] ?? $b['archivo_tipo'] ?? null,
                        $b['archivoBase64'] ?? $b['archivo_base64'] ?? null,
                        $b['estado'] ?? 'Pendiente',
                        $b['resueltoPor'] ?? $b['resuelto_por'] ?? null,
                        $b['resueltoEn'] ?? $b['resuelto_en'] ?? null,
                        $b['comentarioResolucion'] ?? $b['comentario_resolucion'] ?? null
                    ]);
                }
                $pdo->commit();
                responderJson(['ok' => true, 'total' => count($body)]);
            } catch (Exception $e) {
                $pdo->rollBack();
                responderError('Error al guardar justificaciones: ' . $e->getMessage(), 500);
            }
            return;
        }

        if (is_array($body)) {
            $id = !empty($body['id']) ? $body['id'] : ('just_' . bin2hex(random_bytes(8)));
            $stmt = $pdo->prepare("INSERT INTO justificaciones_asistencia 
                (id, asistencia_id, estudiante, fecha, materia, docente, motivo, detalle, archivo_nombre, archivo_tipo, archivo_base64, estado, resuelto_por, resuelto_en, comentario_resolucion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    asistencia_id = VALUES(asistencia_id),
                    estudiante = VALUES(estudiante),
                    fecha = VALUES(fecha),
                    materia = VALUES(materia),
                    docente = VALUES(docente),
                    motivo = VALUES(motivo),
                    detalle = VALUES(detalle),
                    archivo_nombre = COALESCE(VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = COALESCE(VALUES(archivo_tipo), archivo_tipo),
                    archivo_base64 = COALESCE(VALUES(archivo_base64), archivo_base64),
                    estado = VALUES(estado),
                    resuelto_por = VALUES(resuelto_por),
                    resuelto_en = VALUES(resuelto_en),
                    comentario_resolucion = VALUES(comentario_resolucion)");
            $stmt->execute([
                $id,
                $body['asistenciaId'] ?? $body['asistencia_id'] ?? null,
                $body['estudiante'] ?? ($sesion['nombre'] ?? ''),
                $body['fecha'] ?? date('Y-m-d'),
                $body['materia'] ?? '',
                $body['docente'] ?? '',
                $body['motivo'] ?? 'Médico',
                $body['detalle'] ?? ($body['comentario'] ?? ''),
                $body['archivoNombre'] ?? $body['archivo_nombre'] ?? null,
                $body['archivoTipo'] ?? $body['archivo_tipo'] ?? null,
                $body['archivoBase64'] ?? $body['archivo_base64'] ?? null,
                $body['estado'] ?? 'Pendiente',
                $body['resueltoPor'] ?? $body['resuelto_por'] ?? null,
                $body['resueltoEn'] ?? $body['resuelto_en'] ?? null,
                $body['comentarioResolucion'] ?? $body['comentario_resolucion'] ?? null
            ]);
            responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Justificación guardada con éxito']);
            return;
        }

        responderError('Cuerpo de solicitud inválido', 400);
    }

    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar justificación.', 400);
        }
        $stmt = $pdo->prepare("DELETE FROM justificaciones_asistencia WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Justificación eliminada']);
        return;
    }

    responderError('Método no permitido', 405);
}


function mapearJustificacionACamelCase(array $f): array {
    return [
        'id'                   => $f['id'],
        'asistenciaId'         => $f['asistencia_id'],
        'asistencia_id'        => $f['asistencia_id'],
        'estudiante'           => $f['estudiante'],
        'fecha'                => $f['fecha'],
        'materia'              => $f['materia'],
        'docente'              => $f['docente'],
        'motivo'               => $f['motivo'],
        'detalle'              => $f['detalle'],
        'comentario'           => $f['detalle'],
        'archivoNombre'        => $f['archivo_nombre'],
        'archivo_nombre'       => $f['archivo_nombre'],
        'archivoTipo'          => $f['archivo_tipo'],
        'archivo_tipo'         => $f['archivo_tipo'],
        'archivoBase64'        => $f['archivo_base64'] ?? '',
        'archivo_base64'       => $f['archivo_base64'] ?? '',
        'estado'               => $f['estado'] ?? 'Pendiente',
        'resueltoPor'          => $f['resuelto_por'],
        'resuelto_por'         => $f['resuelto_por'],
        'resueltoEn'           => $f['resuelto_en'],
        'resuelto_en'          => $f['resuelto_en'],
        'comentarioResolucion' => $f['comentario_resolucion'],
        'comentario_resolucion'=> $f['comentario_resolucion'],
        'creadoEn'             => $f['creado_en'],
        'actualizadoEn'        => $f['actualizado_en'],
    ];
}

/**
 * Endpoint para Proyectos e Iniciativas de la Fundación A+ (Portafolio Batman)
 */

