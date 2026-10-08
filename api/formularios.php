<?php
/**
 * Formularios dinámicos (constructor tipo Google Forms).
 * CRUD propio — no usa el reemplazo masivo de tablas.
 */

const FORM_ROLES_ADMIN = ['Superadmin', 'Administrador', 'Coordinador'];
const FORM_TIPOS = ['texto', 'parrafo', 'correo', 'numero', 'fecha', 'unica', 'multiple', 'desplegable', 'archivo', 'seccion'];
const FORM_ESTADOS = ['borrador', 'publico', 'autenticados', 'cerrado'];
const FORM_ARCHIVO_MAX = 8 * 1024 * 1024;
const FORM_ARCHIVO_MIMES = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function asegurarTablasFormularios(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS formularios (
        id VARCHAR(40) PRIMARY KEY,
        titulo MEDIUMTEXT NOT NULL,
        slug VARCHAR(120) NOT NULL,
        descripcion TEXT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        abre_en DATETIME NULL,
        cierra_en DATETIME NULL,
        limite_por_usuario TINYINT(1) NOT NULL DEFAULT 1,
        limite_por_ip TINYINT(1) NOT NULL DEFAULT 0,
        roles_permitidos TEXT NULL,
        cohortes_permitidas TEXT NULL,
        creado_por VARCHAR(160) NULL,
        creado_en DATETIME NOT NULL,
        actualizado_en DATETIME NOT NULL,
        archivado_en DATETIME NULL,
        UNIQUE KEY uq_formularios_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    try {
        $cols = $pdo->query("SHOW COLUMNS FROM formularios")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('roles_permitidos', $cols, true)) {
            $pdo->exec("ALTER TABLE formularios ADD COLUMN roles_permitidos TEXT NULL AFTER limite_por_ip");
        }
        if (!in_array('cohortes_permitidas', $cols, true)) {
            $pdo->exec("ALTER TABLE formularios ADD COLUMN cohortes_permitidas TEXT NULL AFTER roles_permitidos");
        }
    } catch (Throwable $e) {}

    $pdo->exec("CREATE TABLE IF NOT EXISTS formulario_preguntas (
        id VARCHAR(40) PRIMARY KEY,
        formulario_id VARCHAR(40) NOT NULL,
        orden INT NOT NULL DEFAULT 0,
        tipo VARCHAR(20) NOT NULL,
        titulo MEDIUMTEXT NOT NULL,
        ayuda TEXT NULL,
        obligatoria TINYINT(1) NOT NULL DEFAULT 0,
        opciones MEDIUMTEXT NULL,
        KEY idx_fp_formulario (formulario_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS formulario_respuestas (
        id VARCHAR(40) PRIMARY KEY,
        formulario_id VARCHAR(40) NOT NULL,
        usuario_id VARCHAR(40) NULL,
        email VARCHAR(190) NULL,
        ip VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        enviado_en DATETIME NOT NULL,
        KEY idx_fr_formulario (formulario_id),
        KEY idx_fr_email (email),
        KEY idx_fr_ip (ip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS formulario_respuesta_valores (
        id VARCHAR(40) PRIMARY KEY,
        respuesta_id VARCHAR(40) NOT NULL,
        pregunta_id VARCHAR(40) NOT NULL,
        valor_texto MEDIUMTEXT NULL,
        valor_json MEDIUMTEXT NULL,
        archivo_nombre VARCHAR(255) NULL,
        archivo_mime VARCHAR(120) NULL,
        archivo_datos LONGTEXT NULL,
        KEY idx_frv_respuesta (respuesta_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function formNuevoId(string $prefijo): string
{
    return $prefijo . '_' . bin2hex(random_bytes(8));
}

function sanitizarHtmlTitulo(?string $html): string
{
    $html = (string) $html;
    $html = preg_replace('#<(script|iframe|object|embed|form|svg|math)[^>]*>.*?</\1>#is', '', $html) ?? '';
    $html = strip_tags($html, '<b><strong><i><em><u><a>');
    $html = preg_replace_callback('#<a\s+[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>#i', function ($m) {
        $href = trim($m[1]);
        if (!preg_match('#^https?://#i', $href)) {
            return '<a>';
        }
        return '<a href="' . htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" target="_blank" rel="noopener noreferrer">';
    }, $html) ?? $html;
    $html = preg_replace('#<(b|strong|i|em|u)(\s[^>]*)?>#i', '<$1>', $html) ?? $html;
    return trim($html);
}

function textoPlanoTitulo(string $html): string
{
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function slugificar(string $texto): string
{
    $texto = textoPlanoTitulo($texto);
    $texto = mb_strtolower($texto, 'UTF-8');
    $repl = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u'];
    $texto = strtr($texto, $repl);
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto) ?? '';
    $texto = trim($texto, '-');
    if ($texto === '') {
        $texto = 'formulario';
    }
    return substr($texto, 0, 80);
}

function slugUnico(PDO $pdo, string $base, ?string $exceptoId = null): string
{
    $slug = $base;
    $n = 2;
    while (true) {
        $sql = 'SELECT id FROM formularios WHERE slug = ?';
        $params = [$slug];
        if ($exceptoId) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptoId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . '-' . $n;
        $n++;
    }
}

function formularioTieneRespuestas(PDO $pdo, string $id): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ?');
    $stmt->execute([$id]);
    return (int) $stmt->fetchColumn() > 0;
}

function mapFormulario(array $f, int $preguntas = 0, int $respuestas = 0): array
{
    return [
        'id' => $f['id'],
        'titulo' => $f['titulo'],
        'tituloPlano' => textoPlanoTitulo($f['titulo']),
        'slug' => $f['slug'],
        'descripcion' => $f['descripcion'] ?? '',
        'estado' => $f['estado'],
        'abreEn' => $f['abre_en'],
        'cierraEn' => $f['cierra_en'],
        'limitePorUsuario' => (bool) $f['limite_por_usuario'],
        'limitePorIp' => (bool) $f['limite_por_ip'],
        'rolesPermitidos' => !empty($f['roles_permitidos']) ? json_decode($f['roles_permitidos'], true) : ['Docente', 'Estudiante'],
        'cohortesPermitidas' => !empty($f['cohortes_permitidas']) ? json_decode($f['cohortes_permitidas'], true) : ['todas'],
        'creadoPor' => $f['creado_por'],
        'creadoEn' => $f['creado_en'],
        'actualizadoEn' => $f['actualizado_en'],
        'archivadoEn' => $f['archivado_en'],
        'preguntasCount' => $preguntas,
        'respuestasCount' => $respuestas,
        'tieneRespuestas' => $respuestas > 0,
    ];
}

function mapPregunta(array $p): array
{
    $opciones = [];
    if (!empty($p['opciones'])) {
        $dec = json_decode($p['opciones'], true);
        if (is_array($dec)) {
            $opciones = $dec;
        }
    }
    return [
        'id' => $p['id'],
        'orden' => (int) $p['orden'],
        'tipo' => $p['tipo'],
        'titulo' => $p['titulo'],
        'ayuda' => $p['ayuda'] ?? '',
        'obligatoria' => (bool) $p['obligatoria'],
        'opciones' => $opciones,
    ];
}

function cargarPreguntas(PDO $pdo, string $formularioId): array
{
    $stmt = $pdo->prepare('SELECT * FROM formulario_preguntas WHERE formulario_id = ? ORDER BY orden ASC, id ASC');
    $stmt->execute([$formularioId]);
    return array_map('mapPregunta', $stmt->fetchAll());
}

function vigenciaPublica(array $f): array
{
    $estado = $f['estado'];
    $ahora = time();
    $motivo = null;
    if (!empty($f['archivado_en'])) {
        return ['ok' => false, 'motivo' => 'Este formulario ya no está disponible.'];
    }
    if ($estado === 'borrador') {
        return ['ok' => false, 'motivo' => 'Este formulario no está publicado.'];
    }
    if ($estado === 'cerrado') {
        return ['ok' => false, 'motivo' => 'Este formulario está cerrado.'];
    }
    if (!empty($f['abre_en']) && strtotime($f['abre_en']) > $ahora) {
        return ['ok' => false, 'motivo' => 'Este formulario aún no abre.'];
    }
    if (!empty($f['cierra_en']) && strtotime($f['cierra_en']) < $ahora) {
        return ['ok' => false, 'motivo' => 'El plazo de este formulario ya venció.'];
    }
    return ['ok' => true, 'requiereAuth' => $estado === 'autenticados', 'motivo' => $motivo];
}

function verificarAudienciaFormulario(PDO $pdo, array $f, ?array $sesion): array
{
    if (($f['estado'] ?? '') !== 'autenticados') {
        return ['ok' => true];
    }
    if (!$sesion || empty($sesion['id'])) {
        return ['ok' => false, 'requiereAuth' => true, 'motivo' => 'Inicia sesión para responder este formulario.'];
    }

    $rol = trim((string) ($sesion['rol'] ?? ''));
    if (in_array($rol, ['Superadmin', 'Administrador', 'Coordinador'], true)) {
        return ['ok' => true];
    }

    $rolesRaw = $f['roles_permitidos'] ?? null;
    $roles = !empty($rolesRaw) ? json_decode($rolesRaw, true) : ['Docente', 'Estudiante'];
    if (!is_array($roles) || empty($roles)) {
        $roles = ['Docente', 'Estudiante'];
    }

    if ($rol === 'Docente') {
        if (!in_array('Docente', $roles, true)) {
            return ['ok' => false, 'requiereAuth' => false, 'motivo' => 'Este formulario está dirigido exclusivamente a estudiantes.'];
        }
        return ['ok' => true];
    }

    if ($rol === 'Estudiante') {
        if (!in_array('Estudiante', $roles, true)) {
            return ['ok' => false, 'requiereAuth' => false, 'motivo' => 'Este formulario está dirigido exclusivamente a profesores.'];
        }

        $cohortesRaw = $f['cohortes_permitidas'] ?? null;
        $cohortes = !empty($cohortesRaw) ? json_decode($cohortesRaw, true) : ['todas'];
        if (!is_array($cohortes) || empty($cohortes) || in_array('todas', $cohortes, true) || in_array('', $cohortes, true)) {
            return ['ok' => true];
        }

        $st = $pdo->prepare('SELECT cohorte FROM usuarios WHERE id = ?');
        $st->execute([$sesion['id']]);
        $cohorteEst = trim((string) $st->fetchColumn());

        if (!in_array($cohorteEst, $cohortes, true)) {
            $listaPermitidas = implode(', ', $cohortes);
            return [
                'ok' => false,
                'requiereAuth' => false,
                'motivo' => "Este formulario es exclusivo para la cohorte {$listaPermitidas}. Tu cohorte registrada es " . ($cohorteEst ? "\"{$cohorteEst}\"" : 'ninguna') . '.'
            ];
        }

        return ['ok' => true];
    }

    return ['ok' => false, 'requiereAuth' => false, 'motivo' => 'Tu rol no tiene acceso a este formulario.'];
}

function normalizarPreguntasEntrada(array $preguntas): array
{
    $out = [];
    $orden = 0;
    foreach ($preguntas as $p) {
        $tipo = $p['tipo'] ?? 'texto';
        if (!in_array($tipo, FORM_TIPOS, true)) {
            responderError('Tipo de pregunta no válido: ' . $tipo, 400);
        }
        $titulo = sanitizarHtmlTitulo($p['titulo'] ?? '');
        if (textoPlanoTitulo($titulo) === '' && $tipo !== 'seccion') {
            responderError('Cada pregunta necesita un enunciado.', 400);
        }
        $opciones = $p['opciones'] ?? [];
        if (!is_array($opciones)) {
            $opciones = [];
        }
        $opciones = array_values(array_filter(array_map('strval', $opciones), fn ($o) => trim($o) !== ''));
        if (in_array($tipo, ['unica', 'multiple', 'desplegable'], true) && count($opciones) < 2) {
            responderError('Las preguntas de opciones necesitan al menos dos alternativas.', 400);
        }
        $out[] = [
            'id' => preg_match('/^[a-zA-Z0-9_-]{4,40}$/', (string) ($p['id'] ?? '')) ? $p['id'] : formNuevoId('fp'),
            'orden' => $orden++,
            'tipo' => $tipo,
            'titulo' => $titulo !== '' ? $titulo : 'Sección',
            'ayuda' => mb_substr(trim((string) ($p['ayuda'] ?? '')), 0, 2000),
            'obligatoria' => $tipo === 'seccion' ? 0 : (!empty($p['obligatoria']) ? 1 : 0),
            'opciones' => json_encode($opciones, JSON_UNESCAPED_UNICODE),
        ];
    }
    return $out;
}

function preguntaIdsConValores(PDO $pdo, string $formularioId): array
{
    $stmt = $pdo->prepare(
        'SELECT DISTINCT v.pregunta_id
         FROM formulario_respuesta_valores v
         INNER JOIN formulario_respuestas r ON r.id = v.respuesta_id
         WHERE r.formulario_id = ?'
    );
    $stmt->execute([$formularioId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    return is_array($ids) ? $ids : [];
}

function guardarPreguntas(PDO $pdo, string $formularioId, array $preguntas, bool $tieneRespuestas): void
{
    $existentes = [];
    $stmt = $pdo->prepare('SELECT id FROM formulario_preguntas WHERE formulario_id = ?');
    $stmt->execute([$formularioId]);
    foreach ($stmt->fetchAll() as $row) {
        $existentes[$row['id']] = true;
    }

    $idsNuevos = array_column($preguntas, 'id');
    $conValores = $tieneRespuestas ? preguntaIdsConValores($pdo, $formularioId) : [];
    foreach (array_keys($existentes) as $id) {
        if (!in_array($id, $idsNuevos, true) && in_array($id, $conValores, true)) {
            responderError('No se puede eliminar una pregunta que ya tiene respuestas (dejaría celdas huérfanas). Edita el enunciado o el tipo, o clona el formulario.', 409);
        }
    }

    $upd = $pdo->prepare(
        'UPDATE formulario_preguntas
         SET orden=?, tipo=?, titulo=?, ayuda=?, obligatoria=?, opciones=?
         WHERE id=? AND formulario_id=?'
    );
    $ins = $pdo->prepare(
        'INSERT INTO formulario_preguntas (id, formulario_id, orden, tipo, titulo, ayuda, obligatoria, opciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($preguntas as $p) {
        if (!empty($existentes[$p['id']])) {
            $upd->execute([
                $p['orden'], $p['tipo'], $p['titulo'], $p['ayuda'], $p['obligatoria'], $p['opciones'],
                $p['id'], $formularioId,
            ]);
        } else {
            $ins->execute([
                $p['id'], $formularioId, $p['orden'], $p['tipo'], $p['titulo'], $p['ayuda'], $p['obligatoria'], $p['opciones'],
            ]);
        }
    }
    $del = $pdo->prepare('DELETE FROM formulario_preguntas WHERE id = ? AND formulario_id = ?');
    foreach (array_keys($existentes) as $id) {
        if (!in_array($id, $idsNuevos, true)) {
            $del->execute([$id, $formularioId]);
        }
    }
}

function listarFormularios(PDO $pdo, bool $papelera): array
{
    $sql = $papelera
        ? 'SELECT f.*, (SELECT COUNT(*) FROM formulario_preguntas p WHERE p.formulario_id = f.id) AS preguntas_count,
                  (SELECT COUNT(*) FROM formulario_respuestas r WHERE r.formulario_id = f.id) AS respuestas_count
           FROM formularios f WHERE f.archivado_en IS NOT NULL ORDER BY f.archivado_en DESC'
        : 'SELECT f.*, (SELECT COUNT(*) FROM formulario_preguntas p WHERE p.formulario_id = f.id) AS preguntas_count,
                  (SELECT COUNT(*) FROM formulario_respuestas r WHERE r.formulario_id = f.id) AS respuestas_count
           FROM formularios f WHERE f.archivado_en IS NULL ORDER BY f.actualizado_en DESC';
    $filas = $pdo->query($sql)->fetchAll();
    return array_map(fn ($f) => mapFormulario($f, (int) $f['preguntas_count'], (int) $f['respuestas_count']), $filas);
}

function obtenerFormularioAdmin(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare(
        'SELECT f.*, (SELECT COUNT(*) FROM formulario_respuestas r WHERE r.formulario_id = f.id) AS respuestas_count
         FROM formularios f WHERE f.id = ?'
    );
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $preguntas = cargarPreguntas($pdo, $id);
    $out = mapFormulario($f, count($preguntas), (int) $f['respuestas_count']);
    $out['preguntas'] = $preguntas;
    responderJson($out);
}

function crearFormulario(PDO $pdo, array $sesion, array $body): void
{
    $titulo = sanitizarHtmlTitulo($body['titulo'] ?? 'Formulario sin título');
    if (textoPlanoTitulo($titulo) === '') {
        $titulo = 'Formulario sin título';
    }
    $id = formNuevoId('fm');
    $slug = slugUnico($pdo, slugificar($titulo));
    $estado = in_array($body['estado'] ?? '', FORM_ESTADOS, true) ? $body['estado'] : 'borrador';
    $rolesPermitidos = isset($body['rolesPermitidos']) && is_array($body['rolesPermitidos'])
        ? json_encode(array_values(array_filter($body['rolesPermitidos'], 'is_string')), JSON_UNESCAPED_UNICODE)
        : json_encode(['Docente', 'Estudiante'], JSON_UNESCAPED_UNICODE);
    $cohortesPermitidas = isset($body['cohortesPermitidas']) && is_array($body['cohortesPermitidas'])
        ? json_encode(array_values(array_filter($body['cohortesPermitidas'], 'is_string')), JSON_UNESCAPED_UNICODE)
        : json_encode(['todas'], JSON_UNESCAPED_UNICODE);
    $ahora = date('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO formularios (id, titulo, slug, descripcion, estado, abre_en, cierra_en, limite_por_usuario, limite_por_ip, roles_permitidos, cohortes_permitidas, creado_por, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $titulo, $slug, mb_substr((string) ($body['descripcion'] ?? ''), 0, 4000), $estado,
        ($body['abreEn'] ?? null) ?: null, ($body['cierraEn'] ?? null) ?: null,
        isset($body['limitePorUsuario']) ? (int) !!$body['limitePorUsuario'] : 1,
        isset($body['limitePorIp']) ? (int) !!$body['limitePorIp'] : 0,
        $rolesPermitidos, $cohortesPermitidas,
        $sesion['email'] ?? $sesion['nombre'] ?? '',
        $ahora, $ahora,
    ]);
    $preguntas = normalizarPreguntasEntrada($body['preguntas'] ?? []);
    guardarPreguntas($pdo, $id, $preguntas, false);
    obtenerFormularioAdmin($pdo, $id);
}

function actualizarFormulario(PDO $pdo, array $body): void
{
    $id = $body['id'] ?? '';
    $stmt = $pdo->prepare('SELECT * FROM formularios WHERE id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $titulo = sanitizarHtmlTitulo($body['titulo'] ?? $f['titulo']);
    $estado = in_array($body['estado'] ?? '', FORM_ESTADOS, true) ? $body['estado'] : $f['estado'];
    if (!empty($f['archivado_en']) && isset($body['preguntas'])) {
        responderError('Restaura el formulario de la papelera para editar sus preguntas.', 409);
    }
    $slug = $f['slug'];
    $deseado = trim((string) ($body['slug'] ?? ''));
    if ($deseado !== '') {
        $slug = slugUnico($pdo, slugificar($deseado), $id);
    } elseif ($f['slug'] === 'formulario-sin-titulo' || str_starts_with($f['slug'], 'formulario-sin-titulo-')) {
        $slugBase = slugificar($titulo);
        if ($slugBase !== '' && $slugBase !== 'formulario-sin-titulo') {
            $slug = slugUnico($pdo, $slugBase, $id);
        }
    }
    $rolesPermitidos = isset($body['rolesPermitidos']) && is_array($body['rolesPermitidos'])
        ? json_encode(array_values(array_filter($body['rolesPermitidos'], 'is_string')), JSON_UNESCAPED_UNICODE)
        : ($f['roles_permitidos'] ?? json_encode(['Docente', 'Estudiante'], JSON_UNESCAPED_UNICODE));
    $cohortesPermitidas = isset($body['cohortesPermitidas']) && is_array($body['cohortesPermitidas'])
        ? json_encode(array_values(array_filter($body['cohortesPermitidas'], 'is_string')), JSON_UNESCAPED_UNICODE)
        : ($f['cohortes_permitidas'] ?? json_encode(['todas'], JSON_UNESCAPED_UNICODE));
    $pdo->prepare(
        'UPDATE formularios SET titulo=?, slug=?, descripcion=?, estado=?, abre_en=?, cierra_en=?, limite_por_usuario=?, limite_por_ip=?, roles_permitidos=?, cohortes_permitidas=?, actualizado_en=?
         WHERE id=?'
    )->execute([
        $titulo, $slug, mb_substr((string) ($body['descripcion'] ?? ''), 0, 4000), $estado,
        ($body['abreEn'] ?? null) ?: null, ($body['cierraEn'] ?? null) ?: null,
        isset($body['limitePorUsuario']) ? (int) !!$body['limitePorUsuario'] : (int) $f['limite_por_usuario'],
        isset($body['limitePorIp']) ? (int) !!$body['limitePorIp'] : (int) $f['limite_por_ip'],
        $rolesPermitidos, $cohortesPermitidas,
        date('Y-m-d H:i:s'), $id,
    ]);
    if (isset($body['preguntas']) && is_array($body['preguntas'])) {
        $preguntas = normalizarPreguntasEntrada($body['preguntas']);
        guardarPreguntas($pdo, $id, $preguntas, formularioTieneRespuestas($pdo, $id));
    }
    obtenerFormularioAdmin($pdo, $id);
}

function clonarFormulario(PDO $pdo, array $sesion, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM formularios WHERE id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $preguntas = cargarPreguntas($pdo, $id);
    $tituloBase = textoPlanoTitulo((string) $f['titulo']);
    if ($tituloBase === '') {
        $tituloBase = 'Formulario';
    }
    crearFormulario($pdo, $sesion, [
        'titulo' => $tituloBase . ' (copia)',
        'descripcion' => $f['descripcion'] ?? '',
        'estado' => 'borrador',
        'abreEn' => $f['abre_en'] ?? '',
        'cierraEn' => $f['cierra_en'] ?? '',
        'limitePorUsuario' => (bool) $f['limite_por_usuario'],
        'limitePorIp' => (bool) $f['limite_por_ip'],
        'rolesPermitidos' => !empty($f['roles_permitidos']) ? json_decode($f['roles_permitidos'], true) : ['Docente', 'Estudiante'],
        'cohortesPermitidas' => !empty($f['cohortes_permitidas']) ? json_decode($f['cohortes_permitidas'], true) : ['todas'],
        'preguntas' => array_map(static function (array $p): array {
            return [
                'tipo' => $p['tipo'],
                'titulo' => $p['titulo'],
                'ayuda' => $p['ayuda'] ?? '',
                'obligatoria' => !empty($p['obligatoria']),
                'opciones' => $p['opciones'] ?? [],
            ];
        }, $preguntas),
    ]);
}

function listarRespuestas(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM formularios WHERE id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $preguntas = cargarPreguntas($pdo, $id);
    $stmtR = $pdo->prepare('SELECT * FROM formulario_respuestas WHERE formulario_id = ? ORDER BY enviado_en DESC');
    $stmtR->execute([$id]);
    $respuestas = [];
    $stmtV = $pdo->prepare('SELECT pregunta_id, valor_texto, valor_json, archivo_nombre, archivo_mime FROM formulario_respuesta_valores WHERE respuesta_id = ?');
    foreach ($stmtR->fetchAll() as $r) {
        $stmtV->execute([$r['id']]);
        $valores = [];
        foreach ($stmtV->fetchAll() as $v) {
            $valores[$v['pregunta_id']] = [
                'texto' => $v['valor_texto'],
                'json' => $v['valor_json'] ? json_decode($v['valor_json'], true) : null,
                'archivoNombre' => $v['archivo_nombre'],
                'archivoMime' => $v['archivo_mime'],
                'tieneArchivo' => !empty($v['archivo_nombre']),
            ];
        }
        $respuestas[] = [
            'id' => $r['id'],
            'email' => $r['email'],
            'usuarioId' => $r['usuario_id'],
            'ip' => $r['ip'],
            'enviadoEn' => $r['enviado_en'],
            'valores' => $valores,
        ];
    }
    responderJson([
        'formulario' => mapFormulario($f, count($preguntas), count($respuestas)),
        'preguntas' => $preguntas,
        'respuestas' => $respuestas,
    ]);
}

function exportarCsv(PDO $pdo, string $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM formularios WHERE id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $preguntas = array_values(array_filter(cargarPreguntas($pdo, $id), fn ($p) => $p['tipo'] !== 'seccion'));
    $stmtR = $pdo->prepare('SELECT * FROM formulario_respuestas WHERE formulario_id = ? ORDER BY enviado_en ASC');
    $stmtR->execute([$id]);
    $stmtV = $pdo->prepare('SELECT pregunta_id, valor_texto, valor_json, archivo_nombre FROM formulario_respuesta_valores WHERE respuesta_id = ?');

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="formulario-' . $f['slug'] . '.csv"');
    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
    $header = ['Enviado', 'Correo'];
    foreach ($preguntas as $p) {
        $header[] = textoPlanoTitulo($p['titulo']);
    }
    fputcsv($out, $header, ';');
    foreach ($stmtR->fetchAll() as $r) {
        $stmtV->execute([$r['id']]);
        $map = [];
        foreach ($stmtV->fetchAll() as $v) {
            if ($v['archivo_nombre']) {
                $map[$v['pregunta_id']] = $v['archivo_nombre'];
            } elseif ($v['valor_json']) {
                $arr = json_decode($v['valor_json'], true);
                $map[$v['pregunta_id']] = is_array($arr) ? implode(', ', $arr) : (string) $v['valor_texto'];
            } else {
                $map[$v['pregunta_id']] = (string) $v['valor_texto'];
            }
        }
        $row = [$r['enviado_en'], $r['email'] ?? ''];
        foreach ($preguntas as $p) {
            $row[] = $map[$p['id']] ?? '';
        }
        fputcsv($out, $row, ';');
    }
    fclose($out);
    exit;
}

function manejarFormularios(PDO $pdo): void
{
    asegurarTablasFormularios($pdo);
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $sesion = exigirSesion(FORM_ROLES_ADMIN);

    if ($metodo === 'GET') {
        if (!empty($_GET['cohortes'])) {
            $cohortes = $pdo->query("SELECT DISTINCT cohorte FROM usuarios WHERE cohorte IS NOT NULL AND cohorte != '' UNION SELECT DISTINCT nombre AS cohorte FROM modulos WHERE nombre IS NOT NULL AND nombre != '' ORDER BY cohorte ASC")->fetchAll(PDO::FETCH_COLUMN);
            responderJson(['cohortes' => array_values(array_filter($cohortes))]);
            return;
        }
        if (!empty($_GET['csv']) && !empty($_GET['id'])) {
            exportarCsv($pdo, (string) $_GET['id']);
            return;
        }
        if (!empty($_GET['respuestas']) && !empty($_GET['id'])) {
            listarRespuestas($pdo, (string) $_GET['id']);
            return;
        }
        if (!empty($_GET['id'])) {
            obtenerFormularioAdmin($pdo, (string) $_GET['id']);
            return;
        }
        responderJson(listarFormularios($pdo, !empty($_GET['papelera'])));
        return;
    }

    if ($metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }

    $body = leerBodyJson();
    $accion = $body['accion'] ?? 'crear';

    if ($accion === 'crear') {
        crearFormulario($pdo, $sesion, $body);
        return;
    }
    if ($accion === 'actualizar') {
        actualizarFormulario($pdo, $body);
        return;
    }
    if ($accion === 'clonar') {
        $idClonar = $body['id'] ?? '';
        if ($idClonar === '') {
            responderError('Falta el id del formulario.', 400);
        }
        clonarFormulario($pdo, $sesion, $idClonar);
        return;
    }

    $id = $body['id'] ?? '';
    if ($id === '') {
        responderError('Falta el id del formulario.', 400);
    }
    $stmt = $pdo->prepare('SELECT id FROM formularios WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        responderError('Formulario no encontrado.', 404);
    }

    if ($accion === 'archivar') {
        $pdo->prepare('UPDATE formularios SET archivado_en = ?, estado = ?, actualizado_en = ? WHERE id = ?')
            ->execute([date('Y-m-d H:i:s'), 'cerrado', date('Y-m-d H:i:s'), $id]);
        responderJson(['ok' => true]);
        return;
    }
    if ($accion === 'restaurar') {
        $pdo->prepare('UPDATE formularios SET archivado_en = NULL, estado = ?, actualizado_en = ? WHERE id = ?')
            ->execute(['borrador', date('Y-m-d H:i:s'), $id]);
        responderJson(['ok' => true]);
        return;
    }
    if ($accion === 'destruir') {
        $chk = $pdo->prepare('SELECT id FROM formularios WHERE id = ? AND archivado_en IS NOT NULL');
        $chk->execute([$id]);
        if (!$chk->fetch()) {
            responderError('Solo se pueden destruir formularios que están en la papelera.', 409);
        }
        $idsR = $pdo->prepare('SELECT id FROM formulario_respuestas WHERE formulario_id = ?');
        $idsR->execute([$id]);
        $rids = $idsR->fetchAll(PDO::FETCH_COLUMN);
        if ($rids) {
            $in = implode(',', array_fill(0, count($rids), '?'));
            $pdo->prepare("DELETE FROM formulario_respuesta_valores WHERE respuesta_id IN ($in)")->execute(array_values($rids));
        }
        $pdo->prepare('DELETE FROM formulario_respuestas WHERE formulario_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM formulario_preguntas WHERE formulario_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM formularios WHERE id = ?')->execute([$id]);
        responderJson(['ok' => true]);
        return;
    }
    responderError('Acción no reconocida.', 400);
}

function publicarDefinicionPublica(array $f, array $preguntas, array $vigencia): array
{
    return [
        'id' => $f['id'],
        'titulo' => $f['titulo'],
        'descripcion' => $f['descripcion'] ?? '',
        'slug' => $f['slug'],
        'estado' => $f['estado'],
        'abreEn' => $f['abre_en'],
        'cierraEn' => $f['cierra_en'],
        'requiereAuth' => !empty($vigencia['requiereAuth']),
        'disponible' => $vigencia['ok'],
        'motivo' => $vigencia['motivo'],
        'preguntas' => $preguntas,
    ];
}

function validarArchivoFormulario(array $archivo): void
{
    $nombre = trim((string) ($archivo['nombre'] ?? ''));
    $mime = trim(strtolower((string) ($archivo['mime'] ?? '')));
    $datos = (string) ($archivo['datos'] ?? '');

    if ($datos === '' || $nombre === '') {
        responderError('Archivo incompleto.', 400);
    }

    // Mitigacion de Path Traversal y Null Byte Injection
    if (strpos($nombre, "\0") !== false || preg_match('/[\/\\\\]|\.\./', $nombre)) {
        responderError('Nombre de archivo inválido o sospechoso.', 400);
    }

    // Mitigacion de ataques con extensiones dobles ejecutables (ej. payload.php.png)
    if (preg_match('/\.(php|phtml|phar|sh|pl|py|cgi|exe|bat|cmd|vbs|js)\./i', $nombre)) {
        responderError('Nombre de archivo no permitido por razones de seguridad.', 400);
    }

    // Extension estrictamente permitida (SVG prohibido explicitamente por riesgo XSS almacenado)
    $okExt = preg_match('/\.(pdf|png|jpe?g|gif|webp|docx?|xlsx?)$/i', $nombre);
    if (!$okExt) {
        responderError('Extensión no permitida. Solo se admiten archivos PDF, imágenes (PNG, JPG, GIF, WEBP), Word o Excel.', 400);
    }

    if (!preg_match('#^data:[^;]+;base64,#', $datos)) {
        responderError('El archivo debe enviarse como data URL en base64.', 400);
    }

    $raw = base64_decode(substr($datos, strpos($datos, ',') + 1), true);
    if ($raw === false) {
        responderError('El archivo enviado está corrupto o mal codificado.', 400);
    }

    if (strlen($raw) > FORM_ARCHIVO_MAX) {
        responderError('El archivo no puede superar 8 MB.', 400);
    }

    // Validacion estricta de Content-Type MIME declarado
    if (!$mime || !in_array($mime, FORM_ARCHIVO_MIMES, true)) {
        responderError('Tipo MIME declarado no permitido. Usa PDF, imagen, Word o Excel.', 400);
    }

    // Validacion criptografica/binaria de Magic Bytes para neutralizar archivos políglotas y Web Shells
    $mimesRealesPermitidos = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', // DOCX y XLSX son tecnicamente contenedores ZIP
        'application/octet-stream',
    ];

    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $mimeDetectado = strtolower(finfo_buffer($finfo, $raw) ?: '');
            finfo_close($finfo);

            // Bloqueo inmediato si los magic bytes detectan scripts, ejecutables o SVG
            $mimesPeligrosos = ['text/x-php', 'text/html', 'application/x-dosexec', 'application/x-sh', 'image/svg+xml', 'application/javascript'];
            if (in_array($mimeDetectado, $mimesPeligrosos, true)) {
                responderError('Contenido binario no seguro detectado en el archivo.', 400);
            }

            if ($mimeDetectado !== '' && !in_array($mimeDetectado, $mimesRealesPermitidos, true)) {
                responderError('El contenido real del archivo no coincide con un formato permitido.', 400);
            }
        }
    }

    // Inspeccion preventiva de firmas de script en cabecera
    $primerosBytes = substr($raw, 0, 1024);
    if (stripos($primerosBytes, '<?php') !== false || stripos($primerosBytes, '<script') !== false) {
        responderError('Contenido no permitido en el archivo.', 400);
    }
}

function manejarFormularioPublico(PDO $pdo): void
{
    asegurarTablasFormularios($pdo);
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $slug = $_GET['slug'] ?? '';

    if ($metodo === 'GET') {
        if ($slug === '') {
            responderError('Falta el slug.', 400);
        }
        $stmt = $pdo->prepare('SELECT * FROM formularios WHERE slug = ?');
        $stmt->execute([$slug]);
        $f = $stmt->fetch();
        if (!$f) {
            responderError('Formulario no encontrado.', 404);
        }
        $vigencia = vigenciaPublica($f);
        $preguntas = $vigencia['ok'] ? cargarPreguntas($pdo, $f['id']) : [];
        if ($vigencia['ok'] && !empty($vigencia['requiereAuth'])) {
            $token = obtenerTokenDeCabecera();
            $payload = verificarToken($token);
            $checkAud = verificarAudienciaFormulario($pdo, $f, $payload);
            if (!$checkAud['ok']) {
                responderJson(array_merge(publicarDefinicionPublica($f, [], $checkAud), [
                    'disponible' => false,
                    'requiereAuth' => !empty($checkAud['requiereAuth']),
                    'motivo' => $checkAud['motivo'],
                ]));
                return;
            }
        }
        responderJson(publicarDefinicionPublica($f, $preguntas, $vigencia));
        return;
    }

    if ($metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }

    $ipCliente = obtenerIpCliente();
    verificarRateLimit($pdo, 'form_pub:' . $ipCliente, 15, 600);

    $body = leerBodyJson();
    $slug = $body['slug'] ?? $slug;
    $stmt = $pdo->prepare('SELECT * FROM formularios WHERE slug = ?');
    $stmt->execute([$slug]);
    $f = $stmt->fetch();
    if (!$f) {
        responderError('Formulario no encontrado.', 404);
    }
    $vigencia = vigenciaPublica($f);
    if (!$vigencia['ok']) {
        responderError($vigencia['motivo'] ?: 'Formulario no disponible.', 403);
    }

    $sesion = null;
    $usuarioId = null;
    $email = '';

    if (!empty($vigencia['requiereAuth'])) {
        $sesion = exigirSesion();
        $checkAud = verificarAudienciaFormulario($pdo, $f, $sesion);
        if (!$checkAud['ok']) {
            responderError($checkAud['motivo'] ?: 'Acceso restringido para este formulario.', 403);
        }
        $usuarioId = $sesion['id'] ?? null;
        $email = strtolower(trim((string) ($sesion['email'] ?? '')));
    } else {
        // Formulario público: NO tomar email ni usuario de sesión bajo ninguna circunstancia.
        if (!empty($body['email'])) {
            $email = strtolower(trim((string) $body['email']));
        }
    }

    $preguntas = cargarPreguntas($pdo, $f['id']);
    $valoresIn = is_array($body['respuestas'] ?? null) ? $body['respuestas'] : [];

    // Si aún no hay email y alguna pregunta de tipo 'correo' fue respondida, tomarla
    if ($email === '') {
        foreach ($preguntas as $p) {
            if ($p['tipo'] === 'correo' && !empty($valoresIn[$p['id']])) {
                $email = strtolower(trim((string) $valoresIn[$p['id']]));
                break;
            }
        }
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responderError('Correo no válido.', 400);
    }

    if (!empty($f['limite_por_usuario'])) {
        if ($usuarioId) {
            $st = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ? AND usuario_id = ?');
            $st->execute([$f['id'], $usuarioId]);
            if ((int) $st->fetchColumn() > 0) {
                responderError('Ya registraste una respuesta en este formulario.', 409);
            }
        } elseif ($email !== '') {
            $st = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ? AND email = ?');
            $st->execute([$f['id'], $email]);
            if ((int) $st->fetchColumn() > 0) {
                responderError('Ya hay una respuesta registrada con este correo.', 409);
            }
        }
    }

    // IP del que responde: NO se registra bajo ninguna circunstancia (privacidad).
    $ip = null;

    foreach ($preguntas as $p) {
        if ($p['tipo'] === 'seccion' || !$p['obligatoria']) {
            continue;
        }
        $val = $valoresIn[$p['id']] ?? null;
        $vacio = $val === null || $val === '' || $val === [] || (is_array($val) && empty($val['datos']) && empty($val['nombre']) && !isset($val[0]));
        if ($vacio) {
            responderError('Falta responder: ' . textoPlanoTitulo($p['titulo']), 400);
        }
    }

    $respuestaId = formNuevoId('fr');
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO formulario_respuestas (id, formulario_id, usuario_id, email, ip, user_agent, enviado_en)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $respuestaId, $f['id'], $usuarioId, $email ?: null, $ip,
            mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 250),
            date('Y-m-d H:i:s'),
        ]);
        $insV = $pdo->prepare(
            'INSERT INTO formulario_respuesta_valores (id, respuesta_id, pregunta_id, valor_texto, valor_json, archivo_nombre, archivo_mime, archivo_datos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($preguntas as $p) {
            if ($p['tipo'] === 'seccion') {
                continue;
            }
            $val = $valoresIn[$p['id']] ?? null;
            $texto = null;
            $json = null;
            $archNom = null;
            $archMime = null;
            $archDatos = null;
            if ($p['tipo'] === 'multiple') {
                $arr = is_array($val) ? array_values(array_map('strval', $val)) : [];
                $json = json_encode($arr, JSON_UNESCAPED_UNICODE);
            } elseif ($p['tipo'] === 'archivo') {
                if (is_array($val) && !empty($val['datos'])) {
                    validarArchivoFormulario($val);
                    $archNom = mb_substr((string) $val['nombre'], 0, 255);
                    $archMime = mb_substr((string) ($val['mime'] ?? ''), 0, 120);
                    $archDatos = (string) $val['datos'];
                }
            } elseif ($p['tipo'] === 'correo') {
                $texto = strtolower(trim((string) $val));
                if ($texto !== '' && !filter_var($texto, FILTER_VALIDATE_EMAIL)) {
                    throw new Exception('Correo no válido en una pregunta.');
                }
            } else {
                $texto = is_scalar($val) ? mb_substr(trim((string) $val), 0, 8000) : '';
            }
            $insV->execute([formNuevoId('fv'), $respuestaId, $p['id'], $texto, $json, $archNom, $archMime, $archDatos]);
        }
        $pdo->commit();
        $notificacion = notificarNuevaPostulacionPorCorreo($pdo, $f, $respuestaId, $preguntas, $valoresIn, $email);
    } catch (Exception $e) {
        $pdo->rollBack();
        responderError($e->getMessage() ?: 'No se pudo guardar la respuesta.', 400);
    }
    responderJson([
        'ok' => true,
        'id' => $respuestaId,
        'notificacion' => $notificacion,
    ]);
}

function notificarNuevaPostulacionPorCorreo(PDO $pdo, array $f, string $respuestaId, array $preguntas, array $valoresIn, string $emailAspirante): ?array
{
    try {
        $stmtCfg = $pdo->query('SELECT * FROM configuracion WHERE id = 1');
        $cfg = $stmtCfg ? $stmtCfg->fetch(PDO::FETCH_ASSOC) : null;
        if (!$cfg) return null;

        // Alertas de nuevas postulaciones dirigidas al correo institucional de la Fundación
        $destinatario = !empty($cfg['correo_postulaciones']) ? trim($cfg['correo_postulaciones']) : (!empty($cfg['correo']) ? trim($cfg['correo']) : 'info@fundacionamas.org.co');
        
        $nombreAspirante = '';
        $documento = '';
        $whatsapp = '';
        $direccion = '';
        $edad = '';
        $educacion = '';
        $motivacion = '';
        $correoAspirante = $emailAspirante;

        $detallesPreguntas = [];

        foreach ($preguntas as $p) {
            if ($p['tipo'] === 'seccion') continue;
            $val = $valoresIn[$p['id']] ?? '';
            $textoVal = '';
            if (is_array($val)) {
                if (!empty($val['nombre'])) {
                    $textoVal = '[Archivo: ' . $val['nombre'] . ']';
                } else {
                    $textoVal = implode(', ', array_map('strval', $val));
                }
            } else {
                $textoVal = trim((string)$val);
            }

            $tituloPlano = textoPlanoTitulo($p['titulo']);
            $tLower = mb_strtolower($tituloPlano);

            if (!$nombreAspirante && (strpos($tLower, 'nombre') !== false || strpos($tLower, 'aspirante') !== false)) {
                $nombreAspirante = $textoVal;
            } elseif (!$documento && strpos($tLower, 'documento') !== false) {
                $documento = $textoVal;
            } elseif (!$correoAspirante && ($p['tipo'] === 'correo' || strpos($tLower, 'correo') !== false || strpos($tLower, 'email') !== false)) {
                $correoAspirante = $textoVal;
            } elseif (!$whatsapp && (strpos($tLower, 'whatsapp') !== false || strpos($tLower, 'teléfono') !== false || strpos($tLower, 'telefono') !== false || strpos($tLower, 'celular') !== false)) {
                $whatsapp = $textoVal;
            } elseif (!$direccion && (strpos($tLower, 'dirección') !== false || strpos($tLower, 'direccion') !== false || strpos($tLower, 'municipio') !== false || strpos($tLower, 'barrio') !== false)) {
                $direccion = $textoVal;
            } elseif (!$edad && (strpos($tLower, 'años') !== false || strpos($tLower, 'edad') !== false)) {
                $edad = $textoVal;
            } elseif (!$educacion && (strpos($tLower, 'educativo') !== false || strpos($tLower, 'escolaridad') !== false)) {
                $educacion = $textoVal;
            } elseif (!$motivacion && (strpos($tLower, 'por qué') !== false || strpos($tLower, 'motivación') !== false || strpos($tLower, 'motiva') !== false || strpos($tLower, 'postular') !== false)) {
                $motivacion = $textoVal;
            }

            $detallesPreguntas[] = [
                'pregunta' => $tituloPlano,
                'respuesta' => $textoVal ?: '—'
            ];
        }

        if (!$nombreAspirante) {
            $nombreAspirante = $correoAspirante ? explode('@', $correoAspirante)[0] : 'Nuevo Aspirante';
        }

        $tituloFormulario = textoPlanoTitulo($f['titulo'] ?? 'Postulaciones');
        $asunto = "Fundación A+ | Nueva postulación recibida: {$nombreAspirante} - {$tituloFormulario}";
        $fechaHora = date('d/m/Y h:i A');

        // Construir mensaje en texto plano
        $mensajeTexto = "Nueva postulación recibida en tiempo real\n\n";
        $mensajeTexto .= "Formulario: {$tituloFormulario}\n";
        $mensajeTexto .= "Fecha: {$fechaHora}\n\n";
        $mensajeTexto .= "DATOS DEL ASPIRANTE:\n";
        $mensajeTexto .= "- Nombre: {$nombreAspirante}\n";
        if ($documento) $mensajeTexto .= "- Documento: {$documento}\n";
        if ($correoAspirante) $mensajeTexto .= "- Correo: {$correoAspirante}\n";
        if ($whatsapp) $mensajeTexto .= "- WhatsApp/Teléfono: {$whatsapp}\n";
        if ($direccion) $mensajeTexto .= "- Dirección: {$direccion}\n";
        if ($edad) $mensajeTexto .= "- Edad: {$edad}\n";
        if ($educacion) $mensajeTexto .= "- Nivel Educativo: {$educacion}\n\n";
        $mensajeTexto .= "RESPUESTAS DETALLADAS:\n";
        foreach ($detallesPreguntas as $item) {
            $mensajeTexto .= "- {$item['pregunta']}: {$item['respuesta']}\n";
        }
        $mensajeTexto .= "\nPuedes gestionar esta postulación ingresando al panel de administración de la Fundación A+.\n\nFundación A+ - Quibdó, Chocó - info@fundacionamas.org.co";

        // Construir mensaje en HTML profesional
        $filasRespuestas = '';
        foreach ($detallesPreguntas as $item) {
            $pregEsc = htmlspecialchars($item['pregunta'], ENT_QUOTES, 'UTF-8');
            $respEsc = nl2br(htmlspecialchars($item['respuesta'], ENT_QUOTES, 'UTF-8'));
            $filasRespuestas .= "
            <div style='background: #F8F9FA; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;'>
              <p style='margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;'>{$pregEsc}</p>
              <p style='margin: 0; font-size: 14px; color: #0E1726; font-weight: 500;'>{$respEsc}</p>
            </div>";
        }

        $waLink = '—';
        if ($whatsapp) {
            $soloNum = preg_replace('/[^\d]/', '', $whatsapp);
            if (strlen($soloNum) === 10) $soloNum = '57' . $soloNum;
            $waLink = "<a href='https://wa.me/{$soloNum}' target='_blank' style='color: #10B981; font-weight: 700; text-decoration: none;'>{$whatsapp} (Chatear en WhatsApp)</a>";
        }

        $mensajeHtml = "
        <div style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);'>
          <div style='background: linear-gradient(135deg, #8B5CF6 0%, #1FC8C0 100%); padding: 32px 24px; text-align: center; color: #ffffff;'>
            <h1 style='margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;'>Fundación A+</h1>
            <p style='margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;'>Nueva postulación recibida en tiempo real</p>
          </div>
          
          <div style='padding: 28px 24px;'>
            <div style='background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;'>
              <p style='margin: 0; font-size: 11px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;'>Convocatoria / Formulario</p>
              <p style='margin: 4px 0 0 0; font-size: 16px; color: #0E1726; font-weight: 800;'>{$tituloFormulario}</p>
            </div>

            <h2 style='font-size: 15px; color: #0E1726; font-weight: 800; margin: 0 0 14px 0; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;'>
              Ficha del Aspirante
            </h2>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 24px;'>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; width: 38%; font-weight: 600;'>Nombre completo:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726; font-weight: 700;'>{$nombreAspirante}</td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>Documento:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726;'>" . ($documento ?: '—') . "</td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>Correo electrónico:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #8B5CF6; font-weight: 600;'>
                  <a href='mailto:{$correoAspirante}' style='color: #8B5CF6; text-decoration: none;'>{$correoAspirante}</a>
                </td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>WhatsApp / Celular:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726;'>{$waLink}</td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>Dirección / Municipio:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726;'>" . ($direccion ?: '—') . "</td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>Edad:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726;'>" . ($edad ?: '—') . "</td>
              </tr>
              <tr>
                <td style='padding: 8px 0; font-size: 13px; color: #64748B; font-weight: 600;'>Nivel educativo:</td>
                <td style='padding: 8px 0; font-size: 14px; color: #0E1726;'>" . ($educacion ?: '—') . "</td>
              </tr>
            </table>

            <h2 style='font-size: 15px; color: #0E1726; font-weight: 800; margin: 24px 0 14px 0; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;'>
              Respuestas del Formulario
            </h2>
            {$filasRespuestas}

            <div style='margin-top: 32px; text-align: center;'>
              <a href='https://fundacionamas.org.co/#formularios' style='background: linear-gradient(135deg, #8B5CF6 0%, #1FC8C0 100%); color: #ffffff; padding: 14px 32px; border-radius: 9999px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);'>
                Ver Postulaciones en el Panel
              </a>
            </div>
          </div>

          <div style='background: #F8F9FA; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748B; line-height: 1.6;'>
            <p style='margin: 0 0 4px 0; font-weight: 700; color: #334155;'>Fundación A+ &bull; Notificación Administrativa</p>
            <p style='margin: 0 0 6px 0;'>Quibdó, Chocó, Colombia &bull; Contacto: <a href='mailto:info@fundacionamas.org.co' style='color: #8B5CF6; text-decoration: none;'>info@fundacionamas.org.co</a></p>
            <p style='margin: 0; font-size: 10px; color: #94A3B8;'>Notificación transaccional automática registrada el {$fechaHora}.</p>
          </div>
        </div>";

        // ── Mensaje de confirmación para el ASPIRANTE ──────────────────────────
        $asuntoAspirante = "Fundación A+ | Confirmación de postulación recibida: {$tituloFormulario}";
        $mensajeTextoAspirante = "Hola, {$nombreAspirante}:\n\n";
        $mensajeTextoAspirante .= "Te confirmamos que hemos recibido con éxito tu postulación al programa formativo:\n";
        $mensajeTextoAspirante .= "{$tituloFormulario}\n\n";
        $mensajeTextoAspirante .= "Tus datos y respuestas han quedado debidamente registrados en nuestra plataforma. En este momento, el equipo de admisiones y selección de la Fundación A+ se encuentra revisando tu postulación detalladamente.\n\n";
        $mensajeTextoAspirante .= "DATOS REGISTRADOS:\n";
        $mensajeTextoAspirante .= "- Nombre: {$nombreAspirante}\n";
        if ($documento) $mensajeTextoAspirante .= "- Documento: {$documento}\n";
        if ($correoAspirante) $mensajeTextoAspirante .= "- Correo: {$correoAspirante}\n";
        if ($whatsapp) $mensajeTextoAspirante .= "- WhatsApp / Contacto: {$whatsapp}\n";
        if ($direccion) $mensajeTextoAspirante .= "- Municipio / Residencia: {$direccion}\n\n";
        $mensajeTextoAspirante .= "¿QUÉ SIGUE A CONTINUACIÓN?\n";
        $mensajeTextoAspirante .= "Mantente atento(a) a tu correo electrónico y a tu línea de WhatsApp. Próximamente te estaremos contactando para comunicarte el avance de tu proceso.\n\n";
        $mensajeTextoAspirante .= "Gracias por tu interés en hacer parte de la Fundación A+.\n\n";
        $mensajeTextoAspirante .= "Atentamente,\nEquipo de Admisiones y Convocatorias\nFundación A+\nhttps://fundacionamas.org.co";

        $mensajeHtmlAspirante = "
        <div style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);'>
          <div style='background: linear-gradient(135deg, #8B5CF6 0%, #1FC8C0 100%); padding: 32px 24px; text-align: center; color: #ffffff;'>
            <h1 style='margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;'>Fundación A+</h1>
            <p style='margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;'>Postulación Recibida con Éxito</p>
          </div>
          
          <div style='padding: 28px 24px;'>
            <p style='font-size: 17px; font-weight: 800; color: #0E1726; margin: 0 0 12px 0;'>
              Hola, {$nombreAspirante}:
            </p>
            <p style='font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;'>
              Te confirmamos que hemos recibido exitosamente tu postulación al programa formativo <strong style='color: #7C3AED;'>{$tituloFormulario}</strong>.
            </p>

            <div style='background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 14px 18px; border-radius: 8px; margin-bottom: 22px;'>
              <p style='margin: 0; font-size: 11px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;'>Estado actual de tu postulación</p>
              <p style='margin: 4px 0 0 0; font-size: 15px; color: #0E1726; font-weight: 800;'>En proceso de revisión por el equipo de admisiones</p>
            </div>

            <div style='background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px;'>
              <p style='margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;'>Datos registrados en tu formulario:</p>
              <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>
                <tr><td style='padding: 5px 0; color: #64748B; width: 38%;'>Nombre completo:</td><td style='padding: 5px 0; color: #0E1726; font-weight: 700;'>{$nombreAspirante}</td></tr>
                " . ($documento ? "<tr><td style='padding: 5px 0; color: #64748B;'>Documento:</td><td style='padding: 5px 0; color: #0E1726; font-weight: 600;'>{$documento}</td></tr>" : "") . "
                " . ($correoAspirante ? "<tr><td style='padding: 5px 0; color: #64748B;'>Correo:</td><td style='padding: 5px 0; color: #0E1726; font-weight: 600;'>{$correoAspirante}</td></tr>" : "") . "
                " . ($whatsapp ? "<tr><td style='padding: 5px 0; color: #64748B;'>WhatsApp / Teléfono:</td><td style='padding: 5px 0; color: #0E1726; font-weight: 600;'>{$whatsapp}</td></tr>" : "") . "
                " . ($direccion ? "<tr><td style='padding: 5px 0; color: #64748B;'>Ubicación:</td><td style='padding: 5px 0; color: #0E1726; font-weight: 600;'>{$direccion}</td></tr>" : "") . "
              </table>
            </div>

            <div style='background: #ECFDF5; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;'>
              <p style='margin: 0; font-size: 12px; color: #065F46; font-weight: 700; text-transform: uppercase;'>¿Qué sigue a continuación?</p>
              <p style='margin: 4px 0 0 0; font-size: 13px; color: #047857; line-height: 1.5;'>
                Nuestro equipo de selección está revisando las respuestas recibidas. Te recomendamos estar pendiente de tu bandeja de entrada y de tu WhatsApp, donde te notificaremos los siguientes pasos del proceso.
              </p>
            </div>

            <p style='font-size: 13px; color: #64748B; margin: 0; line-height: 1.5;'>
              Muchas gracias por tu compromiso y por dar este paso junto a la Fundación A+.
            </p>
          </div>

          <div style='background: #F8F9FA; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748B; line-height: 1.6;'>
            <p style='margin: 0 0 4px 0; font-weight: 700; color: #334155;'>Fundación A+ &bull; Educación y Tecnología</p>
            <p style='margin: 0 0 6px 0;'>Sede Principal: Quibdó, Chocó, Colombia &bull; Contacto: <a href='mailto:info@fundacionamas.org.co' style='color: #8B5CF6; text-decoration: none;'>info@fundacionamas.org.co</a></p>
            <p style='margin: 0; font-size: 10px; color: #94A3B8;'>Recibiste este correo porque enviaste una postulación en fundacionamas.org.co. Si no realizaste esta solicitud, puedes desestimar este mensaje.</p>
          </div>
        </div>";

        $enviadoSmtp = false;
        // Si hay servidor SMTP configurado, enviar directo desde PHP
        if (!empty($cfg['smtp_user']) && !empty($cfg['smtp_pass']) && ($cfg['email_metodo'] ?? '') === 'smtp') {
            require_once __DIR__ . '/mailer.php';
            $smtpConfig = [
                'smtp_host' => $cfg['smtp_host'] ?? 'smtp.gmail.com',
                'smtp_port' => (int)($cfg['smtp_port'] ?? 465),
                'smtp_user' => $cfg['smtp_user'],
                'smtp_pass' => $cfg['smtp_pass'],
                'smtp_from' => $cfg['smtp_from'] ?? 'info@fundacionamas.org.co',
                'smtp_from_name' => $cfg['nombre'] ?? 'Fundación A+',
                'smtp_secure' => $cfg['smtp_secure'] ?? 'ssl',
            ];
            $resFund = enviarCorreoSmtp($smtpConfig, $destinatario, 'Fundación A+', $asunto, $mensajeTexto, $mensajeHtml);
            if ($correoAspirante && filter_var($correoAspirante, FILTER_VALIDATE_EMAIL)) {
                enviarCorreoSmtp($smtpConfig, $correoAspirante, $nombreAspirante, $asuntoAspirante, $mensajeTextoAspirante, $mensajeHtmlAspirante);
            }
            if (!empty($resFund['ok'])) {
                $enviadoSmtp = true;
            }
        }

        $emailjsConfig = [
            'publicKey' => $cfg['emailjs_public_key'] ?? 'eIyshGVkR2fYZQJfO',
            'serviceId' => $cfg['emailjs_service_id'] ?? 'service_20mxfgu',
            'templateId' => $cfg['emailjs_template_id'] ?? 'template_qvmzl1l',
        ];

        return [
            'enviadoSmtp' => $enviadoSmtp,
            'destinatario' => $destinatario,
            'nombreAspirante' => $nombreAspirante,
            'correoAspirante' => $correoAspirante,
            'asunto' => $asunto,
            'mensaje' => $mensajeTexto,
            'mensajeHtml' => $mensajeHtml,
            'emailjs' => $emailjsConfig,
            'notificacionFundacion' => [
                'destinatario' => $destinatario,
                'nombre' => 'Fundación A+',
                'asunto' => $asunto,
                'mensaje' => $mensajeTexto,
                'mensajeHtml' => $mensajeHtml,
            ],
            'notificacionAspirante' => ($correoAspirante && filter_var($correoAspirante, FILTER_VALIDATE_EMAIL)) ? [
                'destinatario' => $correoAspirante,
                'nombre' => $nombreAspirante,
                'asunto' => $asuntoAspirante,
                'mensaje' => $mensajeTextoAspirante,
                'mensajeHtml' => $mensajeHtmlAspirante,
            ] : null,
        ];
    } catch (Throwable $e) {
        error_log('[notificarNuevaPostulacionPorCorreo] Error: ' . $e->getMessage());
        return null;
    }
}
