<?php
/**
 * Controlador Académico: Módulos, Cursos, Pensum, Horarios, Notas, Semáforo, Agenda e Informes
 */

function manejarModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        if ($restriccion !== null) {
            $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
            $stmt = $pdo->prepare("SELECT id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado, creado_en FROM modulos WHERE nombre IN ($inQuery) ORDER BY nombre ASC");
            $stmt->execute($restriccion);
            $filas = $stmt->fetchAll();
        } else {
            $filas = $pdo->query('SELECT id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado, creado_en FROM modulos ORDER BY nombre ASC')->fetchAll();
        }
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'nombre' => $f['nombre'], 'modulo' => $f['modulo'],
                'fechaInicio' => $f['fecha_inicio'], 'fechaFin' => $f['fecha_fin'],
                'cupos' => (int)$f['cupos'], 'estado' => $f['estado'], 'creadoEn' => $f['creado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO modulos (id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    modulo = VALUES(modulo),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    cupos = VALUES(cupos),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['nombre'] ?? '', $r['modulo'] ?? '',
                    $r['fechaInicio'] ?? null, $r['fechaFin'] ?? null,
                    (int)($r['cupos'] ?? 25), $r['estado'] ?? 'Planeada',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM modulos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM modulos");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Cohortes');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Horarios (franjas por cohorte y mes)

function manejarHorarios(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        $conds = [];
        $params = [];
        if ($restriccion !== null) {
            if (!empty($_GET['cohorte'])) {
                if (!in_array($_GET['cohorte'], $restriccion, true)) {
                    responderJson([]);
                    return;
                }
                $conds[] = 'cohorte = ?';
                $params[] = $_GET['cohorte'];
            } else {
                $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                $conds[] = "cohorte IN ($inQuery)";
                foreach ($restriccion as $c) { $params[] = $c; }
            }
        } elseif (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, cohorte, mes, incluye_sabado, franjas, creado_en, actualizado_en FROM horarios';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $limitHorarios = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 1000;
        $sql .= " ORDER BY creado_en DESC LIMIT $limitHorarios";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'cohorte' => $f['cohorte'], 'mes' => $f['mes'],
                'incluyeSabado' => (bool)$f['incluye_sabado'],
                'franjas' => json_decode($f['franjas'], true) ?? [],
                'creadoEn' => $f['creado_en'], 'actualizadoEn' => $f['actualizado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO horarios (id, cohorte, mes, incluye_sabado, franjas)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    incluye_sabado = VALUES(incluye_sabado),
                    franjas = VALUES(franjas)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['cohorte'] ?? '', $r['mes'] ?? '',
                    !empty($r['incluyeSabado']) ? 1 : 0,
                    json_encode($r['franjas'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM horarios WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM horarios");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Horarios');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Calificaciones de módulos (criterios y notas)

function manejarNotasModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        $conds = [];
        $params = [];
        if ($restriccion !== null) {
            if (!empty($_GET['cohorte'])) {
                if (!in_array($_GET['cohorte'], $restriccion, true)) {
                    responderJson([]);
                    return;
                }
                $conds[] = 'cohorte = ?';
                $params[] = $_GET['cohorte'];
            } else {
                $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                $conds[] = "cohorte IN ($inQuery)";
                foreach ($restriccion as $c) { $params[] = $c; }
            }
        } elseif (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, docente, cohorte, mes, criterios, valores, creado_en, actualizado_en FROM notas_modulos';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $limitNotas = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 1000;
        $sql .= " ORDER BY creado_en DESC LIMIT $limitNotas";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            $valDecoded = json_decode($f['valores'] ?? '{}', true);
            $valoresObj = (!empty($valDecoded) && is_array($valDecoded)) ? (object)$valDecoded : new stdClass();
            return [
                'id' => $f['id'], 'docente' => $f['docente'], 'cohorte' => $f['cohorte'], 'mes' => $f['mes'],
                'criterios' => json_decode($f['criterios'] ?? '[]', true) ?? [],
                'valores' => $valoresObj,
                'creadoEn' => $f['creado_en'], 'actualizadoEn' => $f['actualizado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO notas_modulos (id, docente, cohorte, mes, criterios, valores)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    criterios = VALUES(criterios),
                    valores = VALUES(valores)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;

                $valores = $r['valores'] ?? null;
                if (empty($valores) || !is_array($valores)) {
                    $jsonValores = '{}';
                } else {
                    $jsonValores = json_encode((object)$valores, JSON_UNESCAPED_UNICODE);
                }

                $criterios = $r['criterios'] ?? [];
                $jsonCriterios = json_encode(is_array($criterios) ? array_values($criterios) : [], JSON_UNESCAPED_UNICODE);

                $stmt->execute([
                    $id,
                    $r['docente'] ?? '',
                    $r['cohorte'] ?? '',
                    $r['mes'] ?? '',
                    $jsonCriterios,
                    $jsonValores,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Calificaciones');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Asistencia (registro por estudiante y sesión con UPSERT atómico y filtrado indexado)

function manejarSemaforo(PDO $pdo): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        responderError('Método no permitido.', 405);
    }
    $sesion = exigirSesion();
    $restriccion = obtenerRestriccionCohortes($sesion, $pdo);

    $cohorteFiltro = trim($_GET['cohorte'] ?? '');
    $formatoCompleto = ($_GET['format'] ?? '') === 'full';

    // 1. Umbrales configurables
    $notaMinima = 6.0;
    $asistenciaMinima = 80.0;
    try {
        $stmtCfg = $pdo->query("SELECT asistencia_minima FROM configuracion WHERE id = 1");
        if ($cfg = $stmtCfg->fetch()) {
            $asistenciaMinima = (float)($cfg['asistencia_minima'] ?? 80.0);
        }
    } catch (Exception $e) {}

    // 2. Estudiantes activos
    $sqlEst = "SELECT id, nombre, cohorte, email, telefono FROM usuarios WHERE rol = 'Estudiante'";
    $paramsEst = [];
    if ($restriccion !== null) {
        if (!empty($cohorteFiltro)) {
            if (!in_array($cohorteFiltro, $restriccion, true)) {
                if ($formatoCompleto) {
                    responderJson(['data' => [], 'kpis' => ['total' => 0, 'enRiesgo' => 0, 'enAlerta' => 0, 'enVerde' => 0]]);
                } else {
                    responderJson([]);
                }
                return;
            }
            $sqlEst .= " AND cohorte = ?";
            $paramsEst[] = $cohorteFiltro;
        } else {
            $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
            $sqlEst .= " AND cohorte IN ($inQuery)";
            foreach ($restriccion as $c) { $paramsEst[] = $c; }
        }
    } elseif (!empty($cohorteFiltro)) {
        $sqlEst .= " AND cohorte = ?";
        $paramsEst[] = $cohorteFiltro;
    }
    $sqlEst .= " ORDER BY nombre ASC";
    $stmtEst = $pdo->prepare($sqlEst);
    $stmtEst->execute($paramsEst);
    $estudiantes = $stmtEst->fetchAll();

    if (empty($estudiantes)) {
        if ($formatoCompleto) {
            responderJson(['data' => [], 'kpis' => ['total' => 0, 'enRiesgo' => 0, 'enAlerta' => 0, 'enVerde' => 0]]);
        } else {
            responderJson([]);
        }
        return;
    }

    // 3. Agregación de asistencias en MySQL (excluyendo registros automáticos previos a la fecha/hora de registro del estudiante)
    $stmtAsis = $pdo->query("
        SELECT a.estudiante, COUNT(*) as total, SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END) as presentes 
        FROM asistencia a
        LEFT JOIN usuarios u ON u.nombre = a.estudiante
        LEFT JOIN sesiones_asistencia s ON s.id = a.sesion_id
        WHERE NOT (a.automatico = 1 AND u.creado_en IS NOT NULL AND (
            (s.hora_inicio IS NOT NULL AND u.creado_en > s.hora_inicio)
            OR (s.hora_inicio IS NULL AND DATE(a.fecha) < DATE(u.creado_en))
        ))
        GROUP BY a.estudiante
    ");
    $asistMap = [];
    foreach ($stmtAsis->fetchAll() as $row) {
        $tot = (int)$row['total'];
        $pres = (int)$row['presentes'];
        $asistMap[$row['estudiante']] = $tot > 0 ? round(($pres / $tot) * 100) : null;
    }

    // 4. Notas por cohorte
    $sqlNotas = "SELECT cohorte, criterios, valores FROM notas_modulos";
    $paramsNotas = [];
    if (!empty($cohorteFiltro)) {
        $sqlNotas .= " WHERE cohorte = ?";
        $paramsNotas[] = $cohorteFiltro;
    }
    $stmtNotas = $pdo->prepare($sqlNotas);
    $stmtNotas->execute($paramsNotas);
    $notasFilas = $stmtNotas->fetchAll();

    $cohorteNotas = [];
    foreach ($notasFilas as $nf) {
        $cohorteNotas[$nf['cohorte']][] = [
            'criterios' => json_decode($nf['criterios'] ?? '[]', true) ?: [],
            'valores'   => json_decode($nf['valores'] ?? '{}', true) ?: []
        ];
    }

    $promediosMap = [];
    foreach ($cohorteNotas as $coh => $hojas) {
        foreach ($estudiantes as $est) {
            if ($est['cohorte'] !== $coh) continue;
            $estNombre = $est['nombre'];
            $notasMeses = [];
            foreach ($hojas as $hoja) {
                $criterios = $hoja['criterios'];
                $valores = $hoja['valores'][$estNombre] ?? null;
                if (!empty($criterios) && is_array($valores)) {
                    $suma = 0.0;
                    $pesoTotal = 0.0;
                    foreach ($criterios as $crit) {
                        $cNombre = $crit['nombre'] ?? '';
                        $cId = $crit['id'] ?? '';
                        $cPeso = (float)($crit['peso'] ?? 0);
                        $vCrit = $valores[$cId] ?? $valores[$cNombre] ?? null;
                        if ($vCrit !== null && is_numeric($vCrit)) {
                            $suma += ((float)$vCrit) * ($cPeso / 100);
                            $pesoTotal += $cPeso;
                        }
                    }
                    if ($pesoTotal >= 99.0) {
                        $notasMeses[] = $suma;
                    }
                }
            }
            if (!empty($notasMeses)) {
                $promediosMap[$coh][$estNombre] = round(array_sum($notasMeses) / count($notasMeses), 1);
            }
        }
    }

    // 5. Consolidación de riesgos
    $resultado = [];
    $enRiesgo = 0;
    $enAlerta = 0;
    $enVerde = 0;

    foreach ($estudiantes as $e) {
        $nombre = $e['nombre'];
        $cohorte = $e['cohorte'];
        $promedio = $promediosMap[$cohorte][$nombre] ?? null;
        $asistencia = $asistMap[$nombre] ?? null;

        $riesgo = 'Verde';
        $motivo = '';

        $promedioBajo = $promedio !== null && $promedio < $notaMinima;
        $promedioAlerta = $promedio !== null && $promedio < $notaMinima + 0.5;
        $asistenciaBaja = $asistencia !== null && $asistencia < $asistenciaMinima;
        $asistenciaAlerta = $asistencia !== null && $asistencia < $asistenciaMinima + 10;

        if ($promedioBajo || $asistenciaBaja) {
            $riesgo = 'Rojo';
            $motivo = $promedioBajo ? 'Promedio bajo el mínimo' : 'Asistencia bajo el mínimo';
        } elseif ($promedioAlerta || $asistenciaAlerta) {
            $riesgo = 'Amarillo';
            $motivo = 'Cerca del mínimo';
        }

        if ($riesgo === 'Rojo') $enRiesgo++;
        elseif ($riesgo === 'Amarillo') $enAlerta++;
        else $enVerde++;

        $resultado[] = [
            'id'         => $e['id'],
            'nombre'     => $nombre,
            'cohorte'    => $cohorte,
            'email'      => $e['email'] ?? '',
            'telefono'   => $e['telefono'] ?? '',
            'promedio'   => $promedio !== null ? number_format($promedio, 1) : '—',
            'asistencia' => $asistencia !== null ? $asistencia : '—',
            'riesgo'     => $riesgo,
            'motivo'     => $motivo
        ];
    }

    if ($formatoCompleto) {
        responderJson([
            'data' => $resultado,
            'kpis' => [
                'total'    => count($resultado),
                'enRiesgo' => $enRiesgo,
                'enAlerta' => $enAlerta,
                'enVerde'  => $enVerde
            ]
        ]);
        return;
    }

    responderJson($resultado);
}

// Sesiones de asistencia (códigos QR de clase con UPSERT y filtros)

function manejarCursos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, descripcion, estado, creado_en FROM cursos ORDER BY nombre ASC')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'nombre' => $f['nombre'], 'descripcion' => $f['descripcion'], 'estado' => $f['estado'], 'creadoEn' => $f['creado_en']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO cursos (id, nombre, descripcion, estado)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    descripcion = VALUES(descripcion),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['nombre'] ?? '', $r['descripcion'] ?? null, $r['estado'] ?? 'Activo',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM cursos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM cursos");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Cursos');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Pensum curricular (temario curricular con UPSERT atómico y preservación de archivos)

function manejarPensum(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos FROM pensum WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Pensum no encontrado', 404); }
            responderJson([
                'id' => $f['id'], 'modulo' => $f['modulo'], 'tema' => $f['tema'], 'horas' => (int)$f['horas'],
                'docente' => $f['docente'], 'orden' => (int)$f['orden'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado optimizado: no transfiere el blob Base64 archivo_datos en masa
        $filas = $pdo->query('SELECT id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM pensum ORDER BY orden ASC')->fetchAll();
        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'modulo' => $f['modulo'], 'tema' => $f['tema'], 'horas' => (int)$f['horas'],
                'docente' => $f['docente'], 'orden' => (int)$f['orden'],
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
                'INSERT INTO pensum (id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    modulo = VALUES(modulo),
                    tema = VALUES(tema),
                    horas = VALUES(horas),
                    docente = VALUES(docente),
                    orden = VALUES(orden),
                    archivo_nombre = IF(VALUES(archivo_nombre) IS NOT NULL AND VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) IS NOT NULL AND VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) IS NOT NULL AND VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? null : $rawDatos;

                $stmt->execute([
                    $id, $r['modulo'] ?? '', $r['tema'] ?? '',
                    (int)($r['horas'] ?? 8), $r['docente'] ?? null, (int)($r['orden'] ?? 1),
                    $r['archivoNombre'] ?? null, $r['archivoTipo'] ?? null, $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM pensum WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            } else {
                $pdo->exec("DELETE FROM pensum");
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Pensum');
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Chat conocimiento — Base de conocimiento en MySQL con UPSERT atómico.
 */

function manejarInformesDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $rol = $sesion['rol'] ?? '';
        $restriccion = obtenerRestriccionCohortes($sesion, $pdo);
        $conds = [];
        $params = [];

        // BOLA / IDOR: Si es Estudiante, forzar que solo consulte sus propios informes
        if ($rol === 'Estudiante') {
            $nombreEst = $sesion['nombre'] ?? '';
            $emailEst = $sesion['email'] ?? '';
            $conds[] = '(estudiante = ? OR estudiante = ?)';
            $params[] = $nombreEst;
            $params[] = $emailEst;
        } else {
            if ($restriccion !== null) {
                if (!empty($_GET['cohorte'])) {
                    if (!in_array($_GET['cohorte'], $restriccion, true)) {
                        responderJson([]);
                        return;
                    }
                    $conds[] = 'cohorte = ?';
                    $params[] = $_GET['cohorte'];
                } else {
                    $inQuery = implode(',', array_fill(0, count($restriccion), '?'));
                    $conds[] = "cohorte IN ($inQuery)";
                    foreach ($restriccion as $c) { $params[] = $c; }
                }
            } elseif (!empty($_GET['cohorte'])) {
                $conds[] = 'cohorte = ?';
                $params[] = $_GET['cohorte'];
            }
            if (!empty($_GET['estudiante'])) {
                $conds[] = 'estudiante = ?';
                $params[] = $_GET['estudiante'];
            }
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        if (!empty($_GET['estado'])) {
            $conds[] = 'estado = ?';
            $params[] = $_GET['estado'];
        }
        $sql = 'SELECT id, docente, estudiante, cohorte, mes, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado FROM informes_docente';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha DESC, id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'docente' => $f['docente'], 'estudiante' => $f['estudiante'], 'cohorte' => $f['cohorte'],
                'mes' => $f['mes'] ?: substr($f['fecha'], 0, 7),
                'materia' => $f['materia'], 'fecha' => $f['fecha'],
                'asistenciaPct' => $f['asistencia_pct'] !== null ? (float)$f['asistencia_pct'] : null,
                'promedio' => $f['promedio'] !== null ? (float)$f['promedio'] : null,
                'cualitativa' => $f['cualitativa'], 'conclusion' => $f['conclusion'], 'observaciones' => $f['observaciones'],
                'estado' => $f['estado'] ?? 'Borrador',
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico(['Superadmin', 'Coordinador', 'Docente']);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO informes_docente
                    (id, docente, estudiante, cohorte, mes, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = IF(estado = "Enviado", docente, VALUES(docente)),
                    estudiante = IF(estado = "Enviado", estudiante, VALUES(estudiante)),
                    cohorte = IF(estado = "Enviado", cohorte, VALUES(cohorte)),
                    mes = VALUES(mes),
                    materia = IF(estado = "Enviado", materia, VALUES(materia)),
                    fecha = IF(estado = "Enviado", fecha, VALUES(fecha)),
                    asistencia_pct = IF(estado = "Enviado", asistencia_pct, VALUES(asistencia_pct)),
                    promedio = IF(estado = "Enviado", promedio, VALUES(promedio)),
                    cualitativa = IF(estado = "Enviado", cualitativa, VALUES(cualitativa)),
                    conclusion = IF(estado = "Enviado", conclusion, VALUES(conclusion)),
                    observaciones = IF(estado = "Enviado", observaciones, VALUES(observaciones)),
                    estado = IF(estado = "Enviado", "Enviado", VALUES(estado))'
            );
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $fecha = $r['fecha'] ?? date('Y-m-d');
                $mes = !empty($r['mes']) ? $r['mes'] : substr($fecha, 0, 7);
                $estadoNuevo = ($r['estado'] ?? 'Borrador') === 'Enviado' ? 'Enviado' : 'Borrador';
                $stmt->execute([
                    $id, $r['docente'] ?? '', $r['estudiante'] ?? '', $r['cohorte'] ?? '',
                    $mes,
                    $r['materia'] ?? null, $fecha,
                    $r['asistenciaPct'] ?? null, $r['promedio'] ?? null, $r['cualitativa'] ?? null,
                    $r['conclusion'] ?? null, $r['observaciones'] ?? null, $estadoNuevo,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar Informes de docentes');
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Agenda docente (con UPSERT atómico y poda acotada por docente)

function manejarAgendaDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        $sql = 'SELECT id, docente, titulo, tipo, fecha, hora, notas FROM agenda_docente';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha ASC, hora ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'DELETE') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar evento de la agenda.', 400);
        }
        if ($sesion['rol'] === 'Docente') {
            $stmt = $pdo->prepare('DELETE FROM agenda_docente WHERE id = ? AND (docente = ? OR docente = ?)');
            $stmt->execute([$id, $sesion['nombre'] ?? '', $sesion['email'] ?? '']);
        } else {
            $stmt = $pdo->prepare('DELETE FROM agenda_docente WHERE id = ?');
            $stmt->execute([$id]);
        }
        responderJson(['ok' => true]);
        return;
    }
    if ($metodo === 'POST') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente']);
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO agenda_docente (id, docente, titulo, tipo, fecha, hora, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    titulo = VALUES(titulo),
                    tipo = VALUES(tipo),
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    notas = VALUES(notas)'
            );
            $targetDocentes = [];
            if ($sesion['rol'] === 'Docente' && !empty($sesion['nombre'])) {
                $targetDocentes[$sesion['nombre']] = [];
            }
            if (!empty($_GET['docente'])) {
                $targetDocentes[$_GET['docente']] = [];
            }

            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $docNombre = $r['docente'] ?? '';
                if ($docNombre !== '') {
                    if (!isset($targetDocentes[$docNombre])) {
                        $targetDocentes[$docNombre] = [];
                    }
                    $targetDocentes[$docNombre][] = $id;
                }
                $stmt->execute([
                    $id, $docNombre, $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
            }

            foreach ($targetDocentes as $docNombre => $ids) {
                if (!empty($ids)) {
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $paramsPrune = array_merge([$docNombre], $ids);
                    $stmtPrune = $pdo->prepare("DELETE FROM agenda_docente WHERE docente = ? AND id NOT IN ($placeholders)");
                    $stmtPrune->execute($paramsPrune);
                } else {
                    $stmtPrune = $pdo->prepare("DELETE FROM agenda_docente WHERE docente = ?");
                    $stmtPrune->execute([$docNombre]);
                }
            }

            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar la Agenda del docente');
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Agenda estudiante (con UPSERT atómico y poda acotada por estudiante)

function manejarAgendaEstudiante(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['estudiante'])) {
            $conds[] = 'estudiante = ?';
            $params[] = $_GET['estudiante'];
        }
        $sql = 'SELECT id, estudiante, titulo, tipo, fecha, hora, notas FROM agenda_estudiante';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha ASC, hora ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'DELETE') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente', 'Estudiante']);
        $id = $_GET['id'] ?? (leerBodyJson()['id'] ?? null);
        if (!$id) {
            responderError('Falta id para eliminar evento de la agenda.', 400);
        }
        if ($sesion['rol'] === 'Estudiante') {
            $stmt = $pdo->prepare('DELETE FROM agenda_estudiante WHERE id = ? AND (estudiante = ? OR estudiante = ?)');
            $stmt->execute([$id, $sesion['nombre'] ?? '', $sesion['email'] ?? '']);
        } else {
            $stmt = $pdo->prepare('DELETE FROM agenda_estudiante WHERE id = ?');
            $stmt->execute([$id]);
        }
        responderJson(['ok' => true]);
        return;
    }
    if ($metodo === 'POST') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente', 'Estudiante']);
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO agenda_estudiante (id, estudiante, titulo, tipo, fecha, hora, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    estudiante = VALUES(estudiante),
                    titulo = VALUES(titulo),
                    tipo = VALUES(tipo),
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    notas = VALUES(notas)'
            );
            $targetEstudiantes = [];
            if ($sesion['rol'] === 'Estudiante' && !empty($sesion['nombre'])) {
                $targetEstudiantes[$sesion['nombre']] = [];
            }
            if (!empty($_GET['estudiante'])) {
                $targetEstudiantes[$_GET['estudiante']] = [];
            }

            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $estNombre = $r['estudiante'] ?? '';
                if ($estNombre !== '') {
                    if (!isset($targetEstudiantes[$estNombre])) {
                        $targetEstudiantes[$estNombre] = [];
                    }
                    $targetEstudiantes[$estNombre][] = $id;
                }
                $stmt->execute([
                    $id, $estNombre, $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
            }

            foreach ($targetEstudiantes as $estNombre => $ids) {
                if (!empty($ids)) {
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $paramsPrune = array_merge([$estNombre, $estNombre], $ids);
                    $stmtPrune = $pdo->prepare("DELETE FROM agenda_estudiante WHERE (estudiante = ? OR estudiante = ?) AND id NOT IN ($placeholders)");
                    $stmtPrune->execute($paramsPrune);
                } else {
                    $stmtPrune = $pdo->prepare("DELETE FROM agenda_estudiante WHERE estudiante = ? OR estudiante = ?");
                    $stmtPrune->execute([$estNombre, $estNombre]);
                }
            }

            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar la Agenda del estudiante');
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// -----------------------------------------------------------------------------
// Seguimiento de Alertas y Acciones Tutoriales (Módulo Semáforo en Riesgo)
// -----------------------------------------------------------------------------

function manejarSeguimientoAlertas(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $sesion = exigirSesion();
        $conds = [];
        $params = [];
        if (($sesion['rol'] ?? '') === 'Estudiante') {
            $conds[] = '(estudiante_id = ? OR estudiante_nombre = ?)';
            $params[] = $sesion['id'] ?? '';
            $params[] = $sesion['nombre'] ?? '';
        } else {
            if (!empty($_GET['estudiante_id'])) {
                $conds[] = 'estudiante_id = ?';
                $params[] = $_GET['estudiante_id'];
            }
            if (!empty($_GET['cohorte'])) {
                $conds[] = 'cohorte = ?';
                $params[] = $_GET['cohorte'];
            }
            if (!empty($_GET['estado'])) {
                $conds[] = 'estado = ?';
                $params[] = $_GET['estado'];
            }
        }
        $sql = 'SELECT id, estudiante_id, estudiante_nombre, cohorte, docente, tipo_accion, observaciones, compromiso, fecha_compromiso, estado, created_at FROM seguimiento_alertas';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 500';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson($filas);
        return;
    }
    if ($metodo === 'POST') {
        $sesion = exigirSesion(['Superadmin', 'Coordinador', 'Docente']);
        $body = leerBodyJson();
        if (empty($body)) {
            responderError('Datos incompletos o vacíos.', 400);
            return;
        }
        $registros = isset($body[0]) && is_array($body[0]) ? $body : [$body];
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO seguimiento_alertas (id, estudiante_id, estudiante_nombre, cohorte, docente, tipo_accion, observaciones, compromiso, fecha_compromiso, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    estudiante_id = VALUES(estudiante_id),
                    estudiante_nombre = VALUES(estudiante_nombre),
                    cohorte = VALUES(cohorte),
                    docente = VALUES(docente),
                    tipo_accion = VALUES(tipo_accion),
                    observaciones = VALUES(observaciones),
                    compromiso = VALUES(compromiso),
                    fecha_compromiso = VALUES(fecha_compromiso),
                    estado = VALUES(estado)'
            );
            $docenteSesion = $sesion['nombre'] ?? 'Docente/Tutor';
            $guardados = [];
            foreach ($registros as $r) {
                $id = !empty($r['id']) ? $r['id'] : bin2hex(random_bytes(16));
                $estId = $r['estudiante_id'] ?? $r['estudianteId'] ?? '';
                $estNom = $r['estudiante_nombre'] ?? $r['estudianteNombre'] ?? $r['estudiante'] ?? '';
                $coh = $r['cohorte'] ?? '';
                $doc = !empty($r['docente']) ? $r['docente'] : $docenteSesion;
                $tipoAcc = $r['tipo_accion'] ?? $r['tipoAccion'] ?? 'Llamada / Contacto';
                $obs = $r['observaciones'] ?? '';
                $comp = $r['compromiso'] ?? '';
                $fechaComp = !empty($r['fecha_compromiso']) ? $r['fecha_compromiso'] : (!empty($r['fechaCompromiso']) ? $r['fechaCompromiso'] : null);
                $estado = $r['estado'] ?? 'En seguimiento';

                $stmt->execute([
                    $id, $estId, $estNom, $coh, $doc, $tipoAcc, $obs, $comp, $fechaComp, $estado
                ]);
                $guardados[] = [
                    'id' => $id, 'estudiante_id' => $estId, 'estudiante_nombre' => $estNom,
                    'cohorte' => $coh, 'docente' => $doc, 'tipo_accion' => $tipoAcc,
                    'observaciones' => $obs, 'compromiso' => $comp, 'fecha_compromiso' => $fechaComp,
                    'estado' => $estado, 'created_at' => date('Y-m-d H:i:s')
                ];

                // Notificar automáticamente al estudiante en la bandeja de comunicados
                try {
                    $stmtNotif = $pdo->prepare(
                        'INSERT INTO comunicados (id, tipo, destinatarios, titulo, mensaje, categoria, prioridad, autor, autor_rol, fecha, atendida)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
                    );
                    // Buscar correo electrónico del estudiante para notificación personal
                    $estEmail = !empty($r['estudiante_email']) ? trim($r['estudiante_email']) : '';
                    if (!$estEmail) {
                        try {
                            $stmtUsr = $pdo->prepare('SELECT email FROM usuarios WHERE id = ? OR nombre = ? LIMIT 1');
                            $stmtUsr->execute([$estId, $estNom]);
                            $usrFila = $stmtUsr->fetch();
                            if (!empty($usrFila['email'])) $estEmail = trim($usrFila['email']);
                        } catch (Exception $eU) {}
                    }

                    $destArray = array_values(array_unique(array_filter([$estNom, $coh, $estEmail])));
                    $tituloNotif = "Acompañamiento Tutorial: " . $tipoAcc;
                    $mensajeNotif = "Hola " . $estNom . ",\n\n" .
                                    "Se ha registrado una intervención de seguimiento académico en tu ficha:\n" .
                                    "• Acción: " . $tipoAcc . "\n" .
                                    "• Observaciones / Diagnóstico: " . $obs . "\n" .
                                    (!empty($comp) ? ("• Compromiso acordado: " . $comp . "\n") : "") .
                                    (!empty($fechaComp) ? ("• Fecha límite: " . $fechaComp . "\n") : "") .
                                    "• Estado: " . $estado . "\n" .
                                    "• Tutor responsable: " . $doc;

                    $stmtNotif->execute([
                        $notifId,
                        'Privada',
                        json_encode($destArray, JSON_UNESCAPED_UNICODE),
                        $tituloNotif,
                        $mensajeNotif,
                        'Académico',
                        'Alta',
                        $doc,
                        $sesion['rol'] ?? 'Docente',
                        date('Y-m-d H:i:s')
                    ]);

                    // Si la configuración institucional tiene SMTP activo y hay correo de destino, enviar por correo
                    if (!empty($estEmail) && filter_var($estEmail, FILTER_VALIDATE_EMAIL)) {
                        try {
                            $cfgRow = $pdo->query('SELECT * FROM configuracion WHERE id = 1')->fetch();
                            if ($cfgRow && ($cfgRow['email_metodo'] ?? '') === 'smtp') {
                                if (file_exists(__DIR__ . '/../mailer.php')) {
                                    require_once __DIR__ . '/../mailer.php';
                                } elseif (file_exists(__DIR__ . '/mailer.php')) {
                                    require_once __DIR__ . '/mailer.php';
                                }
                                if (function_exists('enviarCorreoSmtp')) {
                                    enviarCorreoSmtp([
                                        'smtp_host' => $cfgRow['smtp_host'] ?? '',
                                        'smtp_port' => (int)($cfgRow['smtp_port'] ?? 465),
                                        'smtp_user' => $cfgRow['smtp_user'] ?? '',
                                        'smtp_pass' => $cfgRow['smtp_pass'] ?? '',
                                        'smtp_from' => $cfgRow['smtp_from'] ?? 'info@fundacionamas.org.co',
                                        'smtp_from_name' => $cfgRow['nombre'] ?? 'Fundación A+',
                                        'smtp_secure' => $cfgRow['smtp_secure'] ?? 'ssl',
                                    ], $estEmail, $estNom, $tituloNotif, $mensajeNotif);
                                }
                            }
                        } catch (Exception $eMail) {
                            error_log('[manejarSeguimientoAlertas] SMTP error: ' . $eMail->getMessage());
                        }
                    }
                } catch (Exception $eNotif) {
                    error_log('[manejarSeguimientoAlertas] Notif warning: ' . $eNotif->getMessage());
                }
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($guardados), 'data' => count($guardados) === 1 ? $guardados[0] : $guardados]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderErrorDb($e, 'guardar acción de seguimiento tutorial');
        }
        return;
    }
    if ($metodo === 'DELETE') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $id = $_GET['id'] ?? '';
        if (!$id) {
            responderError('ID no proporcionado.', 400);
            return;
        }
        $stmt = $pdo->prepare('DELETE FROM seguimiento_alertas WHERE id = ?');
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'mensaje' => 'Registro de seguimiento eliminado.']);
        return;
    }
    responderError('Método no permitido.', 405);
}
