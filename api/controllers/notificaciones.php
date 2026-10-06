<?php
/**
 * Controlador de Notificaciones y Comunicados
 * Gestiona avisos institucionales, circulares, alertas y seguimiento estudiantil.
 */

function manejarNotificaciones(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $sesion = exigirSesion();
    $rol = $sesion['rol'] ?? 'Estudiante';
    $miNombre = trim($sesion['nombre'] ?? '');
    $miEmail = trim($sesion['email'] ?? '');
    $miCohorte = trim($sesion['cohorte'] ?? '');

    // Asegurar tabla comunicados
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

    // ── 1. GET: Consultar notificaciones con filtrado por rol y búsqueda ─────
    if ($metodo === 'GET') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM comunicados WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $fila = $stmt->fetch();
            if (!$fila) responderError('Notificación no encontrada', 404);
            responderJson($fila);
            return;
        }

        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 500) : 200;
        $offset = isset($_GET['offset']) && is_numeric($_GET['offset']) ? max((int)$_GET['offset'], 0) : 0;
        $categoria = trim($_GET['categoria'] ?? '');
        $q = trim($_GET['q'] ?? '');

        $conds = [];
        $params = [];

        // Scoping por rol: Estudiante solo ve públicas y las dirigidas a él o su cohorte
        if ($rol === 'Estudiante') {
            $sub = ["LOWER(tipo) LIKE '%publi%'", "destinatarios LIKE '%todos%'", "destinatarios LIKE '%Todos%'"];
            if ($miNombre) {
                $sub[] = "LOWER(destinatarios) LIKE LOWER(?)";
                $params[] = '%' . $miNombre . '%';
            }
            if ($miEmail) {
                $sub[] = "LOWER(destinatarios) LIKE LOWER(?)";
                $params[] = '%' . $miEmail . '%';
            }
            if ($miCohorte) {
                $sub[] = "LOWER(destinatarios) LIKE LOWER(?)";
                $params[] = '%' . $miCohorte . '%';
            }
            $conds[] = '(' . implode(' OR ', $sub) . ')';
        } elseif ($rol === 'Docente') {
            $sub = ["LOWER(tipo) LIKE '%publi%'", "destinatarios LIKE '%docente%'", "destinatarios LIKE '%todos%'"];
            if ($miNombre) {
                $sub[] = "autor = ?";
                $params[] = $miNombre;
                $sub[] = "LOWER(destinatarios) LIKE LOWER(?)";
                $params[] = '%' . $miNombre . '%';
            }
            if ($miCohorte) {
                $sub[] = "LOWER(destinatarios) LIKE LOWER(?)";
                $params[] = '%' . $miCohorte . '%';
            }
            $conds[] = '(' . implode(' OR ', $sub) . ')';
        }

        if ($categoria) {
            $conds[] = 'categoria = ?';
            $params[] = $categoria;
        }

        if ($q) {
            $conds[] = '(titulo LIKE ? OR mensaje LIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }

        $sql = "SELECT * FROM comunicados";
        if (!empty($conds)) {
            $sql .= " WHERE " . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC LIMIT $limit OFFSET $offset";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();

        responderJson($filas);
        return;
    }

    // ── 2. POST: Crear nueva notificación institucional o tutorial ──────────
    if ($metodo === 'POST') {
        exigirSesion(['Superadmin', 'Coordinador', 'Docente']);
        $body = leerBodyJson();
        if (empty($body)) {
            responderError('Cuerpo de la petición vacío.', 400);
            return;
        }

        // Si es marcar todas como leídas
        if (!empty($body['marcarTodasLeidas'])) {
            $pdo->exec("UPDATE comunicados SET atendida = 1");
            responderJson(['ok' => true, 'mensaje' => 'Todas las notificaciones han sido marcadas como leídas.']);
            return;
        }

        $id = $body['id'] ?? ('notif_' . bin2hex(random_bytes(8)));
        $titulo = trim($body['titulo'] ?? '');
        $mensaje = trim($body['mensaje'] ?? '');
        if (!$titulo || !$mensaje) {
            responderError('Título y mensaje son obligatorios.', 400);
            return;
        }

        $tipo = $body['tipo'] ?? 'Publica';
        $dest = is_array($body['destinatarios'] ?? null) ? json_encode($body['destinatarios'], JSON_UNESCAPED_UNICODE) : ($body['destinatarios'] ?? '["Todos"]');
        $cat = $body['categoria'] ?? 'Institucional';
        $prio = $body['prioridad'] ?? 'Media';
        $autor = $body['autor'] ?? ($miNombre ?: 'Superadmin');
        $autorRol = $body['autor_rol'] ?? ($rol ?: 'Superadmin');
        $fecha = $body['fecha'] ?? date('Y-m-d H:i:s');
        $atendida = !empty($body['atendida']) ? 1 : 0;

        $stmt = $pdo->prepare("INSERT INTO comunicados (id, tipo, destinatarios, titulo, mensaje, categoria, prioridad, autor, autor_rol, fecha, atendida)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                tipo = VALUES(tipo),
                destinatarios = VALUES(destinatarios),
                titulo = VALUES(titulo),
                mensaje = VALUES(mensaje),
                categoria = VALUES(categoria),
                prioridad = VALUES(prioridad),
                autor = VALUES(autor),
                autor_rol = VALUES(autor_rol),
                fecha = VALUES(fecha),
                atendida = VALUES(atendida)");

        $stmt->execute([$id, $tipo, $dest, $titulo, $mensaje, $cat, $prio, $autor, $autorRol, $fecha, $atendida]);
        responderJson(['ok' => true, 'id' => $id, 'mensaje' => 'Notificación guardada exitosamente.']);
        return;
    }

    // ── 3. PATCH / PUT: Marcar como leída / atendida ─────────────────────────
    if ($metodo === 'PATCH' || $metodo === 'PUT') {
        $body = leerBodyJson();
        $id = $_GET['id'] ?? ($body['id'] ?? null);
        if (!$id) {
            responderError('ID no proporcionado.', 400);
            return;
        }
        $atendida = isset($body['atendida']) ? ($body['atendida'] ? 1 : 0) : 1;
        $stmt = $pdo->prepare("UPDATE comunicados SET atendida = ? WHERE id = ?");
        $stmt->execute([$atendida, $id]);
        responderJson(['ok' => true, 'mensaje' => 'Estado de notificación actualizado.']);
        return;
    }

    // ── 4. DELETE: Eliminar notificación ────────────────────────────────────
    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('ID no proporcionado.', 400);
            return;
        }
        $stmt = $pdo->prepare("DELETE FROM comunicados WHERE id = ?");
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Notificación eliminada.']);
        return;
    }

    responderError('Método no permitido.', 405);
}
