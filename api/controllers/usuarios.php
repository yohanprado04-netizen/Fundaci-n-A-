<?php
/**
 * Controlador de Usuarios, Perfiles y Credenciales Superadmin
 */

function manejarSuperadminCredentials(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $fila = $pdo->query("SELECT email, password FROM superadmin_credentials WHERE id = 1")->fetch();
        if (!$fila) {
            responderJson(['data' => ['email' => 'superadmin@aplus.org', 'password' => '']]);
            return;
        }
        // NUNCA devolver el hash de la contraseña al frontend
        responderJson(['data' => ['email' => $fila['email'], 'password' => '']]);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $body  = leerBodyJson();
        $cred  = $body['data'] ?? $body;
        $email = trim($cred['email'] ?? '');
        $pass  = trim((string)($cred['password'] ?? ''));

        if (!$email) responderError('El correo no puede estar vacío.', 400);

        if ($pass !== '') {
            $hashFinal = esHashBcrypt($pass) ? $pass : password_hash($pass, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare(
                "INSERT INTO superadmin_credentials (id, email, password, token_version) VALUES (1, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE email = VALUES(email), password = VALUES(password), token_version = token_version + 1"
            );
            $stmt->execute([$email, $hashFinal]);
        } else {
            $stmt = $pdo->prepare(
                "INSERT INTO superadmin_credentials (id, email, password, token_version) VALUES (1, ?, '', 1)
                 ON DUPLICATE KEY UPDATE email = VALUES(email)"
            );
            $stmt->execute([$email]);
        }
        registrarEventoSeguridad($pdo, 'Seguridad: Credenciales Superadmin', $email, 'Superadmin', "Credenciales Superadmin actualizadas ($email). Token version incrementada.", null, 'SECURITY_ALERT');
        responderJson(['ok' => true]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * Perfiles y permisos (perfiles)
 * Listado y gestión con UPSERT atómico.
 * Solo Superadmin puede modificarlos; perfiles de sistema quedan protegidos.
 */

function manejarPerfiles(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        // Cualquier sesión válida puede LEER perfiles: Superadmin/Coordinador
        // los necesitan para el selector al crear usuarios, y Docente/
        // Estudiante los necesitan en cada login para que
        // asegurarPerfilesDeSistema() y permisoUsuarioSobrePanel() en app.js
        // resuelvan qué paneles ven. Antes esto exigía ['Superadmin',
        // 'Coordinador'], así que un Docente/Estudiante recibía 403 al pedir
        // /api/perfiles, Store.list('perfiles') caía a localStorage vacío, y
        // la cuenta parecía "sin perfil asignado" aunque sí lo tuviera en la
        // base de datos. El POST de más abajo sigue exigiendo Superadmin.
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, categoria, descripcion, es_sistema, permisos FROM perfiles')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id'          => $f['id'],
                'nombre'      => $f['nombre'],
                'categoria'   => $f['categoria'],
                'descripcion' => $f['descripcion'] ?? '',
                'esSistema'   => (bool)$f['es_sistema'],
                'permisos'    => json_decode($f['permisos'] ?? '{}', true) ?? [],
            ];
        }, $filas));
        return;
    }

    if ($metodo === 'DELETE') {
        $sesion = exigirSesion(['Superadmin']);
        $rawId = trim((string)($_GET['id'] ?? (leerBodyJson()['id'] ?? '')));
        $id = validarIdentificador($rawId);
        if (!$id) {
            responderError('Falta el ID del perfil a eliminar.', 400);
        }
        $stmtCheck = $pdo->prepare("SELECT es_sistema FROM perfiles WHERE id = ? LIMIT 1");
        $stmtCheck->execute([$id]);
        $esSistema = $stmtCheck->fetchColumn();
        if ($esSistema === false) {
            responderError('Perfil no encontrado.', 404);
        }
        if ((int)$esSistema === 1) {
            responderError('No se pueden eliminar los perfiles de sistema.', 403);
        }
        $stmtDel = $pdo->prepare("DELETE FROM perfiles WHERE id = ? AND es_sistema = 0");
        $stmtDel->execute([$id]);
        registrarEventoSeguridad($pdo, 'Perfiles: Eliminación de Perfil', $sesion['email'] ?? 'Superadmin', 'Superadmin', "Perfil de acceso eliminado (ID: $id)", null, 'WARN');
        responderJson(['ok' => true, 'mensaje' => 'Perfil eliminado correctamente.']);
        return;
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        exigirSesion(['Superadmin']);
        $body = leerBodyJson();
        if (!is_array($body)) responderError('Se esperaba un objeto o array de perfiles.', 400);

        $perfiles = isset($body[0]) ? $body : [$body];
        $debePodar = isset($_GET['prune']) && $_GET['prune'] === '1';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO perfiles (id, nombre, categoria, descripcion, es_sistema, permisos)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    categoria = VALUES(categoria),
                    descripcion = VALUES(descripcion),
                    es_sistema = VALUES(es_sistema),
                    permisos = VALUES(permisos)'
            );
            $ids = [];
            foreach ($perfiles as $p) {
                $id = $p['id'] ?? bin2hex(random_bytes(8));
                $ids[] = $id;
                $stmt->execute([
                    $id,
                    $p['nombre']      ?? 'Sin nombre',
                    $p['categoria']   ?? 'Administrativo',
                    $p['descripcion'] ?? '',
                    !empty($p['esSistema']) ? 1 : 0,
                    json_encode($p['permisos'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
            if ($debePodar) {
                if (!empty($ids)) {
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $stmtPrune = $pdo->prepare("DELETE FROM perfiles WHERE es_sistema = 0 AND id NOT IN ($placeholders)");
                    $stmtPrune->execute(array_values($ids));
                } else {
                    $pdo->exec("DELETE FROM perfiles WHERE es_sistema = 0");
                }
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($perfiles)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar los perfiles');
        }
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * GET: cualquier sesión válida puede LEER la lista de usuarios (varias
 * pantallas la necesitan: el selector de docentes en Horario, el buscador
 * de personas, etc.) — mismo alcance que tenía Store.list('usuarios') en
 * localStorage, que tampoco distinguía por rol para lectura.
 *
 * POST: reemplaza la tabla completa. Solo Superadmin y Coordinador crean/
 * editan/inactivan usuarios en la plataforma actual (ver panel Usuarios en
 * app.js) — se exige aquí también, del lado del servidor, para que ese
 * permiso no dependa solo de que el frontend oculte el botón.
 */

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

function manejarUsuarios(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    asegurarEsquemaPagosDocentes($pdo);

    if ($metodo === 'GET') {
        $sesion = exigirSesion(); // cualquier rol autenticado puede leer
        $esAdmin = in_array($sesion['rol'] ?? '', ['Superadmin', 'Coordinador'], true);

        // Eliminar el registro us_lorenliseth que fue rechazado por el Superadmin
        try {
            $pdo->query("DELETE FROM usuarios WHERE id = 'us_lorenliseth'");
        } catch (Exception $e) {}

        $miId = $sesion['id'] ?? null;
        $miEmail = $sesion['email'] ?? null;
        $miRol = $sesion['rol'] ?? '';
        $miCohorte = trim((string)($sesion['cohorte'] ?? ''));

        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        if ($miRol === 'Estudiante') {
            // Protección de Privacidad: Estudiantes solo pueden consultar a sus compañeros de cohorte y personal/docentes
            if ($miCohorte !== '') {
                $stmt = $pdo->prepare(
                    "SELECT id, nombre, email, rol, estado, estado_registro,
                            cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion,
                            tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta,
                            creado_en, actualizado_en
                     FROM usuarios
                     WHERE (rol = 'Estudiante' AND cohorte = ?) OR rol != 'Estudiante'"
                );
                $stmt->execute([$miCohorte]);
                $filas = $stmt->fetchAll();
            } else {
                $stmt = $pdo->prepare(
                    "SELECT id, nombre, email, rol, estado, estado_registro,
                            cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion,
                            tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta,
                            creado_en, actualizado_en
                     FROM usuarios
                     WHERE id = ? OR rol != 'Estudiante'"
                );
                $stmt->execute([$miId ?: '']);
                $filas = $stmt->fetchAll();
            }
        } elseif ($restriccion !== null) {
            $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
            $stmt = $pdo->prepare(
                "SELECT id, nombre, email, rol, estado, estado_registro,
                        cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion,
                        tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta,
                        creado_en, actualizado_en
                 FROM usuarios
                 WHERE cohorte IN ($inQuery) OR rol != 'Estudiante'"
            );
            $stmt->execute($restriccion);
            $filas = $stmt->fetchAll();
        } else {
            // NUNCA seleccionar password ni password_plano por seguridad
            $filas = $pdo->query(
                'SELECT id, nombre, email, rol, estado, estado_registro,
                        cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion,
                        tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta,
                        creado_en, actualizado_en
                 FROM usuarios'
            )->fetchAll();
        }
        // Los perfiles asignados viven en la tabla puente usuario_perfiles.
        // app.js los espera como un array de ids dentro de cada usuario
        // (usuario.perfiles), así que se cargan aquí y se adjuntan.
        $perfilesPorUsuario = [];
        foreach ($pdo->query('SELECT usuario_id, perfil_id FROM usuario_perfiles')->fetchAll() as $rel) {
            $perfilesPorUsuario[$rel['usuario_id']][] = $rel['perfil_id'];
        }
        responderJson(mapearUsuariosACamelCase($filas, $perfilesPorUsuario, $esAdmin, $miId, $miEmail));
        return;
    }

    if ($metodo === 'DELETE') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador']);
        $rawId = trim((string)($_GET['id'] ?? (leerBodyJson()['id'] ?? '')));
        $id = validarIdentificador($rawId);
        if (!$id) {
            responderError('Falta el ID del usuario a eliminar.', 400);
        }

        $stmtCheck = $pdo->prepare("SELECT nombre, email, rol FROM usuarios WHERE id = ? LIMIT 1");
        $stmtCheck->execute([$id]);
        $uTarget = $stmtCheck->fetch();
        if (!$uTarget) {
            responderError('Usuario no encontrado.', 404);
        }
        if ($uTarget['rol'] === 'Superadmin') {
            responderError('No se puede eliminar la cuenta de Superadmin.', 403);
        }

        $pdo->beginTransaction();
        try {
            $stmtDelPerfil = $pdo->prepare("DELETE FROM usuario_perfiles WHERE usuario_id = ?");
            $stmtDelPerfil->execute([$id]);

            $stmtDel = $pdo->prepare("DELETE FROM usuarios WHERE id = ? AND rol != 'Superadmin'");
            $stmtDel->execute([$id]);
            $pdo->commit();

            registrarEventoSeguridad(
                $pdo,
                'Usuarios: Eliminación de Cuenta',
                $sesion['email'] ?? ($sesion['nombre'] ?? 'Administrador'),
                $sesion['rol'] ?? 'Coordinador',
                "Usuario eliminado: {$uTarget['nombre']} ({$uTarget['email']}, Rol: {$uTarget['rol']}, ID: $id)",
                null,
                'WARN'
            );

            responderJson(['ok' => true, 'mensaje' => 'Usuario eliminado correctamente.']);
            return;
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'eliminar el usuario');
        }
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $body = leerBodyJson();
        if (!is_array($body)) {
            responderError('Se esperaba un objeto o array de usuarios en el body.', 400);
        }

        // Si es un objeto individual de usuario (no un array indexado por enteros)
        if (!empty($body) && !isset($body[0])) {
            $pdo->beginTransaction();
            try {
                $resultado = guardarUsuarioIndividual($pdo, $body);
                $pdo->commit();
                responderJson($resultado);
                return;
            } catch (Exception $e) {
                $pdo->rollBack();
                responderErrorDb($e, 'guardar el usuario');
            }
        }

        $debePodar = isset($_GET['prune']) && $_GET['prune'] === '1';
        reemplazarTablaUsuarios($pdo, $body, $debePodar);
        responderJson(['ok' => true, 'total' => count($body)]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * app.js trabaja internamente en camelCase (estadoRegistro, fueEstudiante,
 * creadoEn...) pero la tabla MySQL usa snake_case (estado_registro,
 * fue_estudiante, creado_en...) siguiendo la convención SQL normal. Esta
 * función traduce cada fila leída de la base hacia el formato que espera
 * el frontend, para no tener que renombrar esos campos en toda la lógica
 * de app.js.
 */

function mapearUsuariosACamelCase(array $filas, array $perfilesPorUsuario = [], bool $esAdmin = false, ?string $miId = null, ?string $miEmail = null): array {
    $miEmailNorm = strtolower(trim((string)$miEmail));
    return array_map(function ($fila) use ($perfilesPorUsuario, $esAdmin, $miId, $miEmailNorm) {
        $cohortesPermitidas = ['todas'];
        if (!empty($fila['cohortes_permitidas'])) {
            $dec = json_decode($fila['cohortes_permitidas'], true);
            $cohortesPermitidas = is_array($dec) ? $dec : array_map('trim', explode(',', $fila['cohortes_permitidas']));
        }
        $habilidadesArr = [];
        if (!empty($fila['habilidades'])) {
            $decHab = json_decode($fila['habilidades'], true);
            $habilidadesArr = is_array($decHab) ? $decHab : array_values(array_filter(array_map('trim', explode(',', $fila['habilidades']))));
        }

        // Protección PII (Habeas Data): Documento de identidad y teléfono solo visibles para Admins o para el usuario dueño del registro
        $esPropio = false;
        if (!empty($miId) && ($fila['id'] ?? '') === $miId) {
            $esPropio = true;
        } elseif (!empty($miEmailNorm) && strtolower(trim((string)($fila['email'] ?? ''))) === $miEmailNorm) {
            $esPropio = true;
        }
        $puedeVerPii = $esAdmin || $esPropio;

        return [
            'id' => $fila['id'],
            'nombre' => $fila['nombre'],
            'email' => $fila['email'],
            'password' => '',
            'passwordPlano' => '',
            'rol' => $fila['rol'],
            'estado' => $fila['estado'],
            'estadoRegistro' => $fila['estado_registro'],
            'cohorte' => $fila['cohorte'],
            'cohortesPermitidas' => $cohortesPermitidas,
            'telefono' => $puedeVerPii ? ($fila['telefono'] ?? '') : '',
            'documento' => $puedeVerPii ? ($fila['documento'] ?? '') : '',
            'habilidades' => $habilidadesArr,
            'fueEstudiante' => (bool)$fila['fue_estudiante'],
            'fotoUrl' => $fila['foto_url'] ?? '',
            'descripcion' => $fila['descripcion'] ?? '',
            'tarifaHora' => $esAdmin ? (float)($fila['tarifa_hora'] ?? 0) : 0,
            'tarifa_hora' => $esAdmin ? (float)($fila['tarifa_hora'] ?? 0) : 0,
            'banco' => $esAdmin ? ($fila['banco'] ?? '') : '',
            'tipoCuenta' => $esAdmin ? ($fila['tipo_cuenta'] ?? '') : '',
            'tipo_cuenta' => $esAdmin ? ($fila['tipo_cuenta'] ?? '') : '',
            'numeroCuenta' => $esAdmin ? ($fila['numero_cuenta'] ?? '') : '',
            'numero_cuenta' => $esAdmin ? ($fila['numero_cuenta'] ?? '') : '',
            'titularCuenta' => $esAdmin ? ($fila['titular_cuenta'] ?? '') : '',
            'titular_cuenta' => $esAdmin ? ($fila['titular_cuenta'] ?? '') : '',
            'documentoCuenta' => $esAdmin ? ($fila['documento_cuenta'] ?? '') : '',
            'documento_cuenta' => $esAdmin ? ($fila['documento_cuenta'] ?? '') : '',
            'perfiles' => $perfilesPorUsuario[$fila['id']] ?? [],
            'creadoEn' => $fila['creado_en'],
            'actualizadoEn' => $fila['actualizado_en'],
        ];
    }, $filas);
}

/**
 * Reemplaza TODA la tabla `usuarios` por el array que mandó el frontend —
 * réplica de Store.set('usuarios', arrayCompleto) pero en MySQL.
 *
 * Se hace dentro de una transacción: si algo falla a mitad de camino
 * (ej. un registro con un campo inválido), se revierte todo y la tabla
 * queda como estaba, en vez de quedar a medio borrar/insertar.
 *
 * OJO CONTRASEÑAS: si el frontend manda un usuario CON la misma
 * contraseña que ya tenía en la base (no la tocó), este código no la
 * vuelve a hashear dos veces gracias a esHashBcrypt() — evita el bug
 * clásico de "cada vez que edito el usuario, su contraseña deja de
 * funcionar" por hashear un hash. Si el valor recibido NO es un hash
 * bcrypt reconocible, se asume que es una contraseña nueva en texto
 * plano (alta de usuario, o cambio de contraseña) y se hashea ahora.
 * OJO PERFILES: la tabla `usuario_perfiles` tiene una clave foránea
 * hacia usuarios(id) con ON DELETE CASCADE, así que el DELETE de abajo
 * borra también TODAS las asignaciones de perfiles. Por eso este código
 * las vuelve a insertar a partir del campo `perfiles` (array de ids) que
 * manda app.js en cada usuario. Antes no se hacía, y el resultado era
 * que cada vez que se guardaba cualquier usuario, TODOS perdían sus
 * perfiles asignados y la app decía "tu cuenta no tiene perfil asignado".
 */

/**
 * Guarda o actualiza un único usuario de forma atómica y aislada (REST atómico),
 * sin bloquear ni podar la tabla completa de usuarios.
 */
function guardarUsuarioIndividual(PDO $pdo, array $u): array {
    $idUsuario = $u['id'] ?? bin2hex(random_bytes(16));
    $passRecibido = trim((string)($u['password'] ?? ''));

    $passwordFinal = '';
    if ($passRecibido === '') {
        $stmtOldPass = $pdo->prepare("SELECT password FROM usuarios WHERE id = ? LIMIT 1");
        $stmtOldPass->execute([$idUsuario]);
        $passwordFinal = $stmtOldPass->fetchColumn() ?: '';
    } elseif (esHashBcrypt($passRecibido)) {
        $passwordFinal = $passRecibido;
    } else {
        $passwordFinal = password_hash($passRecibido, PASSWORD_BCRYPT);
    }

    $cPerm = null;
    if (!empty($u['cohortesPermitidas'])) {
        $cPerm = is_array($u['cohortesPermitidas']) ? json_encode(array_values($u['cohortesPermitidas']), JSON_UNESCAPED_UNICODE) : (string)$u['cohortesPermitidas'];
    }

    $habRaw = $u['habilidades'] ?? null;
    $habVal = null;
    if ($habRaw !== null) {
        if (is_array($habRaw)) {
            $habVal = !empty($habRaw) ? json_encode(array_values(array_filter(array_map('trim', $habRaw))), JSON_UNESCAPED_UNICODE) : '[]';
        } else if (is_string($habRaw)) {
            $trimmed = trim($habRaw);
            if ($trimmed === '' || $trimmed === '[]') {
                $habVal = '[]';
            } else {
                $dec = json_decode($trimmed, true);
                if (is_array($dec)) {
                    $habVal = json_encode(array_values(array_filter(array_map('trim', $dec))), JSON_UNESCAPED_UNICODE);
                } else {
                    $partes = array_values(array_filter(array_map('trim', explode(',', $trimmed))));
                    $habVal = json_encode($partes, JSON_UNESCAPED_UNICODE);
                }
            }
        }
    }
    $docVal = !empty($u['documento']) ? trim((string)$u['documento']) : null;
    $telVal = !empty($u['telefono']) ? trim((string)$u['telefono']) : null;

    $stmt = $pdo->prepare(
        'INSERT INTO usuarios
            (id, nombre, email, password, password_plano, rol, estado, estado_registro, cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion, tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            email = VALUES(email),
            password = VALUES(password),
            password_plano = NULL,
            rol = VALUES(rol),
            estado = VALUES(estado),
            estado_registro = VALUES(estado_registro),
            cohorte = VALUES(cohorte),
            cohortes_permitidas = VALUES(cohortes_permitidas),
            telefono = VALUES(telefono),
            documento = VALUES(documento),
            habilidades = VALUES(habilidades),
            fue_estudiante = VALUES(fue_estudiante),
            foto_url = COALESCE(VALUES(foto_url), foto_url),
            descripcion = COALESCE(VALUES(descripcion), descripcion),
            tarifa_hora = COALESCE(VALUES(tarifa_hora), tarifa_hora),
            banco = COALESCE(VALUES(banco), banco),
            tipo_cuenta = COALESCE(VALUES(tipo_cuenta), tipo_cuenta),
            numero_cuenta = COALESCE(VALUES(numero_cuenta), numero_cuenta),
            titular_cuenta = COALESCE(VALUES(titular_cuenta), titular_cuenta),
            documento_cuenta = COALESCE(VALUES(documento_cuenta), documento_cuenta),
            token_version = IF(password != VALUES(password) OR estado != VALUES(estado), token_version + 1, token_version)'
    );

    $stmt->execute([
        $idUsuario,
        $u['nombre'] ?? '',
        strtolower($u['email'] ?? ''),
        $passwordFinal,
        $u['rol'] ?? 'Estudiante',
        $u['estado'] ?? 'Activo',
        $u['estadoRegistro'] ?? null,
        $u['cohorte'] ?? null,
        $cPerm,
        $telVal,
        $docVal,
        $habVal,
        !empty($u['fueEstudiante']) ? 1 : 0,
        $u['fotoUrl'] ?? null,
        $u['descripcion'] ?? null,
        (float)($u['tarifaHora'] ?? $u['tarifa_hora'] ?? 0),
        (string)($u['banco'] ?? ''),
        (string)($u['tipoCuenta'] ?? $u['tipo_cuenta'] ?? ''),
        (string)($u['numeroCuenta'] ?? $u['numero_cuenta'] ?? ''),
        (string)($u['titularCuenta'] ?? $u['titular_cuenta'] ?? ''),
        (string)($u['documentoCuenta'] ?? $u['documento_cuenta'] ?? ''),
    ]);

    if (isset($u['perfiles']) && is_array($u['perfiles'])) {
        $perfilesValidos = array_column($pdo->query('SELECT id FROM perfiles')->fetchAll(), 'id');
        $stmtPerfilDelete = $pdo->prepare('DELETE FROM usuario_perfiles WHERE usuario_id = ?');
        $stmtPerfilDelete->execute([$idUsuario]);
        $stmtPerfil = $pdo->prepare('INSERT INTO usuario_perfiles (usuario_id, perfil_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE perfil_id=VALUES(perfil_id)');
        foreach (array_unique($u['perfiles']) as $perfilId) {
            if (in_array($perfilId, $perfilesValidos, true)) {
                $stmtPerfil->execute([$idUsuario, $perfilId]);
            }
        }
    }

    $sesion = obtenerSesionOpcional();
    $actor = $sesion['email'] ?? ($sesion['nombre'] ?? 'Sistema');
    $rolActor = $sesion['rol'] ?? 'Admin';
    $nomTarget = $u['nombre'] ?? '';
    $emailTarget = $u['email'] ?? '';
    $rolTarget = $u['rol'] ?? 'Estudiante';
    $estadoTarget = $u['estado'] ?? 'Activo';

    registrarEventoSeguridad(
        $pdo,
        'Usuarios: Modificación de Cuenta',
        $actor,
        $rolActor,
        "Guardada cuenta: $nomTarget ($emailTarget, Rol: $rolTarget, Estado: $estadoTarget, ID: $idUsuario)",
        null,
        'INFO'
    );

    return ['ok' => true, 'id' => $idUsuario];
}

function reemplazarTablaUsuarios(PDO $pdo, array $usuarios, bool $debePodar = false): void {
    $pdo->beginTransaction();
    try {
        $passPrevioMap = [];
        try {
            $filasPass = $pdo->query("SELECT id, password FROM usuarios")->fetchAll();
            foreach ($filasPass as $fp) {
                $passPrevioMap[$fp['id']] = $fp['password'];
            }
        } catch (Exception $e) {}

        $stmt = $pdo->prepare(
            'INSERT INTO usuarios
                (id, nombre, email, password, password_plano, rol, estado, estado_registro, cohorte, cohortes_permitidas, telefono, documento, habilidades, fue_estudiante, foto_url, descripcion, tarifa_hora, banco, tipo_cuenta, numero_cuenta, titular_cuenta, documento_cuenta)
             VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                email = VALUES(email),
                password = VALUES(password),
                password_plano = NULL,
                rol = VALUES(rol),
                estado = VALUES(estado),
                estado_registro = VALUES(estado_registro),
                cohorte = VALUES(cohorte),
                cohortes_permitidas = VALUES(cohortes_permitidas),
                telefono = VALUES(telefono),
                documento = VALUES(documento),
                habilidades = VALUES(habilidades),
                fue_estudiante = VALUES(fue_estudiante),
                foto_url = COALESCE(VALUES(foto_url), foto_url),
                descripcion = COALESCE(VALUES(descripcion), descripcion),
                tarifa_hora = COALESCE(VALUES(tarifa_hora), tarifa_hora),
                banco = COALESCE(VALUES(banco), banco),
                tipo_cuenta = COALESCE(VALUES(tipo_cuenta), tipo_cuenta),
                numero_cuenta = COALESCE(VALUES(numero_cuenta), numero_cuenta),
                titular_cuenta = COALESCE(VALUES(titular_cuenta), titular_cuenta),
                documento_cuenta = COALESCE(VALUES(documento_cuenta), documento_cuenta),
                token_version = IF(password != VALUES(password) OR estado != VALUES(estado), token_version + 1, token_version)'
        );
        $stmtPerfilDelete = $pdo->prepare('DELETE FROM usuario_perfiles WHERE usuario_id = ?');
        $stmtPerfil = $pdo->prepare(
            'INSERT INTO usuario_perfiles (usuario_id, perfil_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE perfil_id=VALUES(perfil_id)'
        );
        // Ids de perfiles que existen de verdad: si app.js mandara un id
        // de un perfil ya borrado, el INSERT fallaría por la foreign key
        // y tumbaría el guardado completo de usuarios. Se filtran antes.
        $perfilesValidos = array_column($pdo->query('SELECT id FROM perfiles')->fetchAll(), 'id');

        $idsUsuariosEnviados = [];
        foreach ($usuarios as $u) {
            $idUsuario = $u['id'] ?? bin2hex(random_bytes(16));
            $idsUsuariosEnviados[] = $idUsuario;
            $passRecibido = trim((string)($u['password'] ?? ''));

            if ($passRecibido === '') {
                // Conservar contraseña existente en la BD
                $passwordFinal = $passPrevioMap[$idUsuario] ?? '';
            } elseif (esHashBcrypt($passRecibido)) {
                $passwordFinal = $passRecibido;
            } else {
                // Nueva contraseña en texto plano para hashear
                $passwordFinal = password_hash($passRecibido, PASSWORD_BCRYPT);
            }

            $cPerm = null;
            if (!empty($u['cohortesPermitidas'])) {
                $cPerm = is_array($u['cohortesPermitidas']) ? json_encode(array_values($u['cohortesPermitidas']), JSON_UNESCAPED_UNICODE) : (string)$u['cohortesPermitidas'];
            }

            $habRaw = $u['habilidades'] ?? null;
            $habVal = null;
            if ($habRaw !== null) {
                if (is_array($habRaw)) {
                    $habVal = !empty($habRaw) ? json_encode(array_values(array_filter(array_map('trim', $habRaw))), JSON_UNESCAPED_UNICODE) : '[]';
                } else if (is_string($habRaw)) {
                    $trimmed = trim($habRaw);
                    if ($trimmed === '' || $trimmed === '[]') {
                        $habVal = '[]';
                    } else {
                        $dec = json_decode($trimmed, true);
                        if (is_array($dec)) {
                            $habVal = json_encode(array_values(array_filter(array_map('trim', $dec))), JSON_UNESCAPED_UNICODE);
                        } else {
                            $partes = array_values(array_filter(array_map('trim', explode(',', $trimmed))));
                            $habVal = json_encode($partes, JSON_UNESCAPED_UNICODE);
                        }
                    }
                }
            }
            $docVal = !empty($u['documento']) ? trim((string)$u['documento']) : null;
            $telVal = !empty($u['telefono']) ? trim((string)$u['telefono']) : null;

            $stmt->execute([
                $idUsuario,
                $u['nombre'] ?? '',
                strtolower($u['email'] ?? ''),
                $passwordFinal,
                $u['rol'] ?? 'Estudiante',
                $u['estado'] ?? 'Activo',
                $u['estadoRegistro'] ?? null,
                $u['cohorte'] ?? null,
                $cPerm,
                $telVal,
                $docVal,
                $habVal,
                !empty($u['fueEstudiante']) ? 1 : 0,
                $u['fotoUrl'] ?? null,
                $u['descripcion'] ?? null,
                (float)($u['tarifaHora'] ?? $u['tarifa_hora'] ?? 0),
                (string)($u['banco'] ?? ''),
                (string)($u['tipoCuenta'] ?? $u['tipo_cuenta'] ?? ''),
                (string)($u['numeroCuenta'] ?? $u['numero_cuenta'] ?? ''),
                (string)($u['titularCuenta'] ?? $u['titular_cuenta'] ?? ''),
                (string)($u['documentoCuenta'] ?? $u['documento_cuenta'] ?? ''),
            ]);

            // Sincronizar los perfiles asignados a este usuario.
            $stmtPerfilDelete->execute([$idUsuario]);
            $perfilesUsuario = is_array($u['perfiles'] ?? null) ? $u['perfiles'] : [];
            foreach (array_unique($perfilesUsuario) as $perfilId) {
                if (in_array($perfilId, $perfilesValidos, true)) {
                    $stmtPerfil->execute([$idUsuario, $perfilId]);
                }
            }
        }

        // Poda segura de usuarios: SOLO se ejecuta si se solicita explícitamente mediante query param ?prune=1.
        // Por defecto, se realiza UPSERT atómico sin borrar concurrentemente a otros usuarios (Anti-Race-Condition).
        if ($debePodar) {
            if (!empty($idsUsuariosEnviados)) {
                $inPlaceholders = implode(',', array_fill(0, count($idsUsuariosEnviados), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM usuarios WHERE rol != 'Superadmin' AND id NOT IN ($inPlaceholders)");
                $stmtPrune->execute(array_values($idsUsuariosEnviados));
            } else {
                $pdo->exec("DELETE FROM usuarios WHERE rol != 'Superadmin'");
            }
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        responderErrorDb($e, 'guardar la lista de usuarios');
    }
}


function esHashBcrypt(string $valor): bool {
    return (bool)preg_match('/^\$2[aby]\$\d{2}\$/', $valor);
}

/**
 * PUT /api/perfil_propio — autoservicio de Docente/Estudiante para
 * actualizar SOLO su propia foto_url y/o descripcion.
 *
 * Por qué existe esta ruta separada: subirFotoPerfilDocente/Estudiante y
 * actualizarUsuarioDocenteActual/EstudianteActual en app.js llamaban a
 * Store.set('usuarios', arrayCompleto), que en el backend cae en
 * manejarUsuarios() POST — y ese endpoint exige rol Superadmin o
 * Coordinador (línea "exigirSesion(['Superadmin', 'Coordinador'])" más
 * arriba). Un Docente o Estudiante recibía 403 al intentar guardar su
 * propia foto/descripción; Store.set() atrapa ese error y devuelve
 * { ok:true, remoto:false } igual (para no romper la interfaz), así que
 * en pantalla se veía "Foto de perfil actualizada" aunque el dato solo
 * quedara en localStorage de ese navegador — nunca llegaba a MySQL, y
 * por eso no aparecía en otro dispositivo ni sobrevivía un borrado de
 * caché. Esta ruta permite que cualquier rol autenticado actualice, pero
 * ÚNICAMENTE su propio registro (el id sale del token, nunca del body) y
 * ÚNICAMENTE estos cuatro campos — nunca email, rol, estado, cohorte,
 * fueEstudiante, etc. (esos siguen exigiendo Superadmin/Coordinador vía
 * manejarUsuarios()). password se hashea aquí igual que en
 * reemplazarTablaUsuarios(), nunca se guarda en texto plano.
 */

function manejarPerfilPropio(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    $payload = exigirSesion();
    $id = $payload['id'] ?? '';
    $email = strtolower(trim($payload['email'] ?? ''));

    if ($metodo === 'GET') {
        $perfil = null;
        if (!empty($id)) {
            $stmt = $pdo->prepare('SELECT id, nombre, email, rol, cohorte, telefono, documento, habilidades, foto_url as fotoUrl, descripcion FROM usuarios WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $perfil = $stmt->fetch();
        }
        if (!$perfil && !empty($email)) {
            $stmt = $pdo->prepare('SELECT id, nombre, email, rol, cohorte, telefono, documento, habilidades, foto_url as fotoUrl, descripcion FROM usuarios WHERE LOWER(email) = ? LIMIT 1');
            $stmt->execute([$email]);
            $perfil = $stmt->fetch();
        }
        if (!$perfil) {
            responderJson([
                'id' => !empty($id) ? $id : 'superadmin',
                'nombre' => $payload['nombre'] ?? ($payload['email'] ?? 'Usuario'),
                'email' => $payload['email'] ?? '',
                'rol' => $payload['rol'] ?? '',
                'habilidades' => []
            ]);
        }
        if (!empty($perfil['habilidades'])) {
            $dec = json_decode($perfil['habilidades'], true);
            $perfil['habilidades'] = is_array($dec) ? $dec : array_values(array_filter(array_map('trim', explode(',', $perfil['habilidades']))));
        } else {
            $perfil['habilidades'] = [];
        }
        responderJson($perfil);
    }

    if ($metodo !== 'PUT' && $metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }

    $cambios = leerBodyJson();
    if (!is_array($cambios)) {
        responderError('Body inválido.', 400);
    }

    $campos = [];
    $valores = [];
    if (array_key_exists('fotoUrl', $cambios)) {
        $campos[] = 'foto_url = ?';
        $valores[] = $cambios['fotoUrl'] !== '' ? $cambios['fotoUrl'] : null;
    }
    if (array_key_exists('descripcion', $cambios)) {
        $campos[] = 'descripcion = ?';
        $valores[] = $cambios['descripcion'] !== '' ? $cambios['descripcion'] : null;
    }
    if (array_key_exists('nombre', $cambios) && trim((string)$cambios['nombre']) !== '') {
        $campos[] = 'nombre = ?';
        $valores[] = trim((string)$cambios['nombre']);
    }
    if (array_key_exists('telefono', $cambios)) {
        $campos[] = 'telefono = ?';
        $valores[] = trim((string)$cambios['telefono']) !== '' ? trim((string)$cambios['telefono']) : null;
    }
    if (array_key_exists('documento', $cambios)) {
        $campos[] = 'documento = ?';
        $valores[] = trim((string)$cambios['documento']) !== '' ? trim((string)$cambios['documento']) : null;
    }
    if (array_key_exists('habilidades', $cambios)) {
        $campos[] = 'habilidades = ?';
        $hab = $cambios['habilidades'];
        if (is_array($hab)) {
            $valores[] = json_encode(array_values(array_filter(array_map('trim', $hab))), JSON_UNESCAPED_UNICODE);
        } else if (is_string($hab)) {
            $trimmed = trim($hab);
            if ($trimmed === '' || $trimmed === '[]') {
                $valores[] = '[]';
            } else {
                $dec = json_decode($trimmed, true);
                if (is_array($dec)) {
                    $valores[] = json_encode(array_values(array_filter(array_map('trim', $dec))), JSON_UNESCAPED_UNICODE);
                } else {
                    $partes = array_values(array_filter(array_map('trim', explode(',', $trimmed))));
                    $valores[] = json_encode($partes, JSON_UNESCAPED_UNICODE);
                }
            }
        } else {
            $valores[] = null;
        }
    }
    $cambioClave = false;
    if (array_key_exists('password', $cambios) && (string)$cambios['password'] !== '') {
        $campos[] = 'password = ?';
        $valores[] = password_hash((string)$cambios['password'], PASSWORD_BCRYPT);
        $campos[] = 'token_version = token_version + 1';
        $cambioClave = true;
    }
    if (!$campos) {
        responderError('Nada para actualizar.', 400);
    }

    if (!empty($id)) {
        $valoresWithId = $valores;
        $valoresWithId[] = $id;
        $stmt = $pdo->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE id = ?');
        $stmt->execute($valoresWithId);
        if ($stmt->rowCount() === 0 && !empty($email)) {
            $valoresWithEmail = $valores;
            $valoresWithEmail[] = $email;
            $stmtEmail = $pdo->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE LOWER(email) = ?');
            $stmtEmail->execute($valoresWithEmail);
        }
    } else if (!empty($email)) {
        $valoresWithEmail = $valores;
        $valoresWithEmail[] = $email;
        $stmtEmail = $pdo->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE LOWER(email) = ?');
        $stmtEmail->execute($valoresWithEmail);
    } else {
        responderError('Identificador de usuario no válido en sesión.', 401);
    }

    if ($cambioClave) {
        registrarEventoSeguridad($pdo, 'Seguridad: Cambio de Contraseña', $email ?: $id, 'Usuario', "Contraseña actualizada para cuenta " . ($email ?: $id) . ". Sesiones previas revocadas.", null, 'WARN');
    }

    responderJson(['ok' => true]);
}

/**
 * Cohortes, Horarios, Notas y Asistencia
 * Operaciones con UPSERT atómico y filtrado indexado por cohorte y periodo.
 */

/**
 * Exige sesión válida (cualquier rol) y decodifica el body como array para
 * un POST — común a las entidades de esta fase, evita repetirlo.
 */

