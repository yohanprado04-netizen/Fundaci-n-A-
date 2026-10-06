<?php
/**
 * Controlador de Auditoría: Logins, Acciones y Horarios
 */

function manejarAuditoriaLogin(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);

        // Verificación de integridad criptográfica contra manipulación o borrado de registros
        if (($_GET['action'] ?? '') === 'verificar_integridad') {
            $filas = $pdo->query('SELECT id, fecha, hora, resultado, email, rol, hash_integridad FROM auditoria_login ORDER BY fecha ASC, hora ASC')->fetchAll();
            $ultimoHash = 'GENESIS';
            $tamperDetected = false;
            $alterados = [];

            foreach ($filas as $f) {
                if (empty($f['hash_integridad'])) {
                    $ultimoHash = 'GENESIS';
                    continue; // Registros preexistentes antes de activar la cadena criptográfica
                }
                $esperado = hash_hmac('sha256', "{$f['id']}|{$f['fecha']}|{$f['hora']}|{$f['resultado']}|{$f['email']}|{$f['rol']}|$ultimoHash", JWT_SECRET);
                if (!hash_equals($esperado, (string)$f['hash_integridad'])) {
                    $tamperDetected = true;
                    $alterados[] = $f['id'];
                }
                $ultimoHash = $f['hash_integridad'];
            }

            responderJson([
                'ok' => true,
                'integro' => !$tamperDetected,
                'total_registros' => count($filas),
                'registros_comprometidos' => $alterados,
                'mensaje' => $tamperDetected ? 'Se detectaron discrepancias en la integridad criptográfica de la auditoría de login.' : 'Cadena criptográfica verificada: los registros de auditoría no han sido alterados.'
            ]);
            return;
        }

        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['email'])) {
            $conds[] = 'email = ?';
            $params[] = $_GET['email'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, fecha, hora, resultado, email, rol, hash_integridad FROM auditoria_login';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    responderError('Metodo no permitido: auditoria_login es de solo lectura (la registra el propio login).', 405);
}

// Auditoría de acciones (bitácora de operaciones con UPSERT atómico, límite y encadenamiento criptográfico)

function manejarAuditoriaAcciones(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);

        // Verificación de integridad criptográfica contra manipulación o borrado de registros
        if (($_GET['action'] ?? '') === 'verificar_integridad') {
            $filas = $pdo->query('SELECT id, fecha, hora, tipo, actor, rol, detalle, hash_integridad FROM auditoria_acciones ORDER BY fecha ASC, hora ASC')->fetchAll();
            $ultimoHash = 'GENESIS';
            $tamperDetected = false;
            $alterados = [];

            foreach ($filas as $f) {
                if (empty($f['hash_integridad'])) {
                    $ultimoHash = 'GENESIS';
                    continue;
                }
                $esperado = hash_hmac('sha256', "{$f['id']}|{$f['fecha']}|{$f['hora']}|{$f['tipo']}|{$f['actor']}|{$f['rol']}|$ultimoHash", JWT_SECRET);
                if (!hash_equals($esperado, (string)$f['hash_integridad'])) {
                    $tamperDetected = true;
                    $alterados[] = $f['id'];
                }
                $ultimoHash = $f['hash_integridad'];
            }

            responderJson([
                'ok' => true,
                'integro' => !$tamperDetected,
                'total_registros' => count($filas),
                'registros_comprometidos' => $alterados,
                'mensaje' => $tamperDetected ? 'Se detectaron discrepancias en la integridad criptográfica de la bitácora de acciones.' : 'Cadena criptográfica verificada: la bitácora de acciones se mantiene íntegra.'
            ]);
            return;
        }

        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['actor'])) {
            $conds[] = 'actor = ?';
            $params[] = $_GET['actor'];
        }
        if (!empty($_GET['tipo'])) {
            $conds[] = 'tipo = ?';
            $params[] = $_GET['tipo'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, fecha, hora, tipo, actor, rol, detalle, hash_integridad FROM auditoria_acciones';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $ultimoHash = 'GENESIS';
            try {
                $stmtH = $pdo->query('SELECT hash_integridad FROM auditoria_acciones WHERE hash_integridad IS NOT NULL ORDER BY fecha DESC, hora DESC LIMIT 1');
                $filaH = $stmtH ? $stmtH->fetch(PDO::FETCH_ASSOC) : null;
                if ($filaH && !empty($filaH['hash_integridad'])) {
                    $ultimoHash = $filaH['hash_integridad'];
                }
            } catch (Exception $e) {}

            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_acciones (id, fecha, hora, tipo, actor, rol, detalle, hash_integridad)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    tipo = VALUES(tipo),
                    actor = VALUES(actor),
                    rol = VALUES(rol),
                    detalle = VALUES(detalle),
                    hash_integridad = VALUES(hash_integridad)'
            );
            foreach ($registros as $r) {
                $rId = $r['id'] ?? bin2hex(random_bytes(16));
                $rFecha = $r['fecha'] ?? date('Y-m-d');
                $rHora = $r['hora'] ?? date('H:i:s');
                $rTipo = $r['tipo'] ?? '';
                $rActor = $r['actor'] ?? '—';
                $rRol = $r['rol'] ?? '—';
                $rDetalle = $r['detalle'] ?? '';
                $hashIntegridad = hash_hmac('sha256', "$rId|$rFecha|$rHora|$rTipo|$rActor|$rRol|$ultimoHash", JWT_SECRET);
                $ultimoHash = $hashIntegridad;

                $stmt->execute([
                    $rId, $rFecha, $rHora, $rTipo, $rActor, $rRol, $rDetalle, $hashIntegridad,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar registros de auditoria');
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Auditoría de horario (cambios en franjas con UPSERT atómico y límite de consulta)

function manejarAuditoriaHorario(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo FROM auditoria_horario';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'fecha' => $f['fecha'], 'hora' => $f['hora'], 'autor' => $f['autor'],
                'cohorte' => $f['cohorte'], 'mes' => $f['mes'], 'franja' => $f['franja'], 'campo' => $f['campo'],
                'valorAnterior' => $f['valor_anterior'], 'valorNuevo' => $f['valor_nuevo'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_horario (id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    autor = VALUES(autor),
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    franja = VALUES(franja),
                    campo = VALUES(campo),
                    valor_anterior = VALUES(valor_anterior),
                    valor_nuevo = VALUES(valor_nuevo)'
            );
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? date('H:i:s'),
                    $r['autor'] ?? '', $r['cohorte'] ?? '', $r['mes'] ?? '', $r['franja'] ?? '', $r['campo'] ?? '',
                    $r['valorAnterior'] ?? '(vacio)', $r['valorNuevo'] ?? '(vacio)',
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Auditoria de horario');
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Informes de docentes (con UPSERT atómico y protección de estado Enviado a nivel SQL)

