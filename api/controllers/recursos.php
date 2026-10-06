<?php
/**
 * Controlador de Recursos y Préstamos de Equipos
 */

function asegurarEsquemaHistorialPrestamos(PDO $pdo): void {
    static $asegurado = false;
    if ($asegurado) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS historial_prestamos (
            id VARCHAR(64) PRIMARY KEY,
            recurso_id VARCHAR(64) NOT NULL,
            recurso_codigo VARCHAR(50),
            recurso_nombre VARCHAR(150),
            recurso_categoria VARCHAR(50),
            recurso_serial VARCHAR(100),
            usuario_id VARCHAR(64),
            usuario_nombre VARCHAR(150) NOT NULL,
            usuario_email VARCHAR(150),
            usuario_rol VARCHAR(50) DEFAULT 'Estudiante',
            cohorte VARCHAR(100),
            tipo_asignacion VARCHAR(50) DEFAULT 'Temporal',
            fecha_prestamo DATETIME NOT NULL,
            fecha_limite DATETIME NULL,
            fecha_devolucion DATETIME NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'Activo',
            motivo TEXT,
            observaciones_entrega TEXT,
            observaciones_devolucion TEXT,
            entregado_por VARCHAR(150),
            recibido_por VARCHAR(150),
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_prest_usr (usuario_nombre),
            INDEX idx_prest_email (usuario_email),
            INDEX idx_prest_rec (recurso_id),
            INDEX idx_prest_est (estado),
            INDEX idx_prest_fec (fecha_prestamo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $asegurado = true;
    } catch (Throwable $e) {
        error_log('Error asegurando esquema historial_prestamos: ' . $e->getMessage());
    }
}


function manejarHistorialPrestamos(PDO $pdo): void {
    asegurarEsquemaHistorialPrestamos($pdo);
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $sesion = exigirSesion();
    $rol = $sesion['rol'] ?? '';
    $miNombre = trim($sesion['nombre'] ?? '');
    $miEmail = trim($sesion['email'] ?? '');

    if ($metodo === 'GET') {
        // Scoping estricto contra BOLA / IDOR para Estudiantes y Docentes
        if ($rol === 'Estudiante' || $rol === 'Docente') {
            $stmt = $pdo->prepare("SELECT * FROM historial_prestamos 
                WHERE LOWER(TRIM(usuario_nombre)) = LOWER(TRIM(?)) OR (usuario_email IS NOT NULL AND LOWER(TRIM(usuario_email)) = LOWER(TRIM(?)))
                ORDER BY fecha_prestamo DESC");
            $stmt->execute([$miNombre, $miEmail]);
            $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            responderJson($filas);
            return;
        }

        // Para Superadmin, Coordinador y roles administrativos
        $usuarioParam = trim($_GET['usuario'] ?? '');
        $estadoParam = trim($_GET['estado'] ?? '');
        
        $sql = "SELECT * FROM historial_prestamos WHERE 1=1";
        $params = [];

        if ($usuarioParam !== '') {
            $sql .= " AND (LOWER(usuario_nombre) LIKE LOWER(?) OR LOWER(usuario_email) LIKE LOWER(?))";
            $params[] = "%$usuarioParam%";
            $params[] = "%$usuarioParam%";
        }

        if ($estadoParam !== '' && $estadoParam !== 'todos') {
            $sql .= " AND estado = ?";
            $params[] = $estadoParam;
        }

        $sql .= " ORDER BY fecha_prestamo DESC LIMIT 500";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        responderJson($filas);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $body = leerBodyJson();
        if (isset($body['data']) && is_array($body['data'])) {
            $items = $body['data'];
        } elseif (is_array($body) && isset($body[0])) {
            $items = $body;
        } else {
            $items = [$body];
        }

        $stmt = $pdo->prepare("INSERT INTO historial_prestamos (
            id, recurso_id, recurso_codigo, recurso_nombre, recurso_categoria, recurso_serial,
            usuario_id, usuario_nombre, usuario_email, usuario_rol, cohorte, tipo_asignacion,
            fecha_prestamo, fecha_limite, fecha_devolucion, estado, motivo, observaciones_entrega,
            observaciones_devolucion, entregado_por, recibido_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            recurso_codigo = VALUES(recurso_codigo),
            recurso_nombre = VALUES(recurso_nombre),
            recurso_categoria = VALUES(recurso_categoria),
            recurso_serial = VALUES(recurso_serial),
            usuario_nombre = VALUES(usuario_nombre),
            usuario_email = VALUES(usuario_email),
            usuario_rol = VALUES(usuario_rol),
            cohorte = VALUES(cohorte),
            tipo_asignacion = VALUES(tipo_asignacion),
            fecha_prestamo = VALUES(fecha_prestamo),
            fecha_limite = VALUES(fecha_limite),
            fecha_devolucion = VALUES(fecha_devolucion),
            estado = VALUES(estado),
            motivo = VALUES(motivo),
            observaciones_entrega = VALUES(observaciones_entrega),
            observaciones_devolucion = VALUES(observaciones_devolucion),
            entregado_por = VALUES(entregado_por),
            recibido_por = VALUES(recibido_por)");

        $pdo->beginTransaction();
        try {
            foreach ($items as $item) {
                if (empty($item['recurso_id']) || empty($item['usuario_nombre'])) continue;
                $id = $item['id'] ?? ('prest_' . bin2hex(random_bytes(12)));
                $fechaPrestamo = !empty($item['fecha_prestamo']) ? date('Y-m-d H:i:s', strtotime($item['fecha_prestamo'])) : date('Y-m-d H:i:s');
                $fechaLimite = !empty($item['fecha_limite']) ? date('Y-m-d H:i:s', strtotime($item['fecha_limite'])) : null;
                $fechaDevolucion = !empty($item['fecha_devolucion']) ? date('Y-m-d H:i:s', strtotime($item['fecha_devolucion'])) : null;

                $stmt->execute([
                    $id,
                    $item['recurso_id'],
                    $item['recurso_codigo'] ?? '',
                    $item['recurso_nombre'] ?? '',
                    $item['recurso_categoria'] ?? 'General',
                    $item['recurso_serial'] ?? '',
                    $item['usuario_id'] ?? null,
                    $item['usuario_nombre'],
                    $item['usuario_email'] ?? '',
                    $item['usuario_rol'] ?? 'Estudiante',
                    $item['cohorte'] ?? '',
                    $item['tipo_asignacion'] ?? 'Temporal',
                    $fechaPrestamo,
                    $fechaLimite,
                    $fechaDevolucion,
                    $item['estado'] ?? 'Activo',
                    $item['motivo'] ?? '',
                    $item['observaciones_entrega'] ?? '',
                    $item['observaciones_devolucion'] ?? '',
                    $item['entregado_por'] ?? $miNombre,
                    $item['recibido_por'] ?? null
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($items)]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            responderError('Error guardando registro en historial de préstamos: ' . $e->getMessage(), 500);
        }
        return;
    }

    if ($metodo === 'PUT') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $body = leerBodyJson();
        $id = $body['id'] ?? $_GET['id'] ?? null;
        if (!$id) {
            responderError('Se requiere el id del préstamo para actualizar.', 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM historial_prestamos WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $prestamo = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$prestamo) {
            responderError('Préstamo no encontrado.', 404);
        }

        $fechaDev = !empty($body['fecha_devolucion']) ? date('Y-m-d H:i:s', strtotime($body['fecha_devolucion'])) : date('Y-m-d H:i:s');
        $estado = $body['estado'] ?? 'Devuelto';
        $recibidoPor = $body['recibido_por'] ?? $miNombre;
        $obsDev = $body['observaciones_devolucion'] ?? $prestamo['observaciones_devolucion'];

        $stmtUpd = $pdo->prepare("UPDATE historial_prestamos SET 
            fecha_devolucion = ?, estado = ?, recibido_por = ?, observaciones_devolucion = ?
            WHERE id = ?");
        $stmtUpd->execute([$fechaDev, $estado, $recibidoPor, $obsDev, $id]);

        responderJson(['ok' => true, 'mensaje' => 'Préstamo actualizado exitosamente']);
        return;
    }

    responderError('Método no permitido.', 405);
}
