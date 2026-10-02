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
        creado_por VARCHAR(160) NULL,
        creado_en DATETIME NOT NULL,
        actualizado_en DATETIME NOT NULL,
        archivado_en DATETIME NULL,
        UNIQUE KEY uq_formularios_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

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

function guardarPreguntas(PDO $pdo, string $formularioId, array $preguntas, bool $tieneRespuestas): void
{
    $existentes = [];
    $stmt = $pdo->prepare('SELECT id, tipo FROM formulario_preguntas WHERE formulario_id = ?');
    $stmt->execute([$formularioId]);
    foreach ($stmt->fetchAll() as $row) {
        $existentes[$row['id']] = $row['tipo'];
    }

    if ($tieneRespuestas) {
        $idsNuevos = array_column($preguntas, 'id');
        foreach ($existentes as $id => $tipo) {
            if (!in_array($id, $idsNuevos, true)) {
                responderError('No se pueden eliminar preguntas de un formulario que ya tiene respuestas. Agrégalas al final o archívalo.', 409);
            }
        }
        foreach ($preguntas as $p) {
            if (isset($existentes[$p['id']]) && $existentes[$p['id']] !== $p['tipo']) {
                responderError('No se puede cambiar el tipo de una pregunta con respuestas registradas.', 409);
            }
        }
    }

    $pdo->prepare('DELETE FROM formulario_preguntas WHERE formulario_id = ?')->execute([$formularioId]);
    $ins = $pdo->prepare(
        'INSERT INTO formulario_preguntas (id, formulario_id, orden, tipo, titulo, ayuda, obligatoria, opciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($preguntas as $p) {
        $ins->execute([
            $p['id'], $formularioId, $p['orden'], $p['tipo'], $p['titulo'], $p['ayuda'], $p['obligatoria'], $p['opciones'],
        ]);
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
    $ahora = date('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO formularios (id, titulo, slug, descripcion, estado, abre_en, cierra_en, limite_por_usuario, limite_por_ip, creado_por, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $titulo, $slug, mb_substr((string) ($body['descripcion'] ?? ''), 0, 4000), $estado,
        ($body['abreEn'] ?? null) ?: null, ($body['cierraEn'] ?? null) ?: null,
        isset($body['limitePorUsuario']) ? (int) !!$body['limitePorUsuario'] : 1,
        isset($body['limitePorIp']) ? (int) !!$body['limitePorIp'] : 0,
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
    $estructuraCerrada = in_array($f['estado'], ['publico', 'autenticados', 'cerrado'], true)
        || formularioTieneRespuestas($pdo, $id)
        || !empty($f['archivado_en']);
    if ($estructuraCerrada && $estado === 'borrador') {
        responderError('Un formulario publicado no puede volver a borrador. Clónalo para editar la estructura sin romper respuestas existentes.', 409);
    }
    if ($estructuraCerrada && isset($body['preguntas'])) {
        responderError('La estructura de un formulario publicado está congelada. Clónalo, corrige la copia y publícala.', 409);
    }
    $slug = $f['slug'];
    $pdo->prepare(
        'UPDATE formularios SET titulo=?, slug=?, descripcion=?, estado=?, abre_en=?, cierra_en=?, limite_por_usuario=?, limite_por_ip=?, actualizado_en=?
         WHERE id=?'
    )->execute([
        $titulo, $slug, mb_substr((string) ($body['descripcion'] ?? ''), 0, 4000), $estado,
        ($body['abreEn'] ?? null) ?: null, ($body['cierraEn'] ?? null) ?: null,
        isset($body['limitePorUsuario']) ? (int) !!$body['limitePorUsuario'] : (int) $f['limite_por_usuario'],
        isset($body['limitePorIp']) ? (int) !!$body['limitePorIp'] : (int) $f['limite_por_ip'],
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
    $header = ['Enviado', 'Correo', 'IP'];
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
        $row = [$r['enviado_en'], $r['email'], $r['ip']];
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
    $nombre = (string) ($archivo['nombre'] ?? '');
    $mime = (string) ($archivo['mime'] ?? '');
    $datos = (string) ($archivo['datos'] ?? '');
    if ($datos === '' || $nombre === '') {
        responderError('Archivo incompleto.', 400);
    }
    if (!preg_match('#^data:[^;]+;base64,#', $datos)) {
        responderError('El archivo debe enviarse como data URL.', 400);
    }
    $raw = base64_decode(substr($datos, strpos($datos, ',') + 1), true);
    if ($raw === false) {
        responderError('Archivo corrupto.', 400);
    }
    if (strlen($raw) > FORM_ARCHIVO_MAX) {
        responderError('El archivo no puede superar 8 MB.', 400);
    }
    $okExt = preg_match('/\.(pdf|png|jpe?g|gif|webp|docx?|xlsx?)$/i', $nombre);
    if (!$okExt && $mime && !in_array($mime, FORM_ARCHIVO_MIMES, true)) {
        responderError('Tipo de archivo no permitido. Usa PDF, imagen, Word o Excel.', 400);
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
            if (!$payload) {
                responderJson(array_merge(publicarDefinicionPublica($f, [], $vigencia), [
                    'disponible' => false,
                    'requiereAuth' => true,
                    'motivo' => 'Inicia sesión para responder este formulario.',
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
    if (!empty($vigencia['requiereAuth'])) {
        $sesion = exigirSesion();
    } else {
        $token = obtenerTokenDeCabecera();
        $sesion = verificarToken($token);
    }

    $preguntas = cargarPreguntas($pdo, $f['id']);
    $valoresIn = is_array($body['respuestas'] ?? null) ? $body['respuestas'] : [];
    $email = strtolower(trim((string) ($body['email'] ?? ($sesion['email'] ?? ''))));
    if ($sesion && !empty($sesion['email'])) {
        $email = strtolower((string) $sesion['email']);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responderError('Correo no válido.', 400);
    }
    if (!$sesion && $email === '') {
        responderError('Indica tu correo para enviar la respuesta.', 400);
    }

    $ip = obtenerIpCliente();
    if (!empty($f['limite_por_usuario'])) {
        if ($sesion && !empty($sesion['id'])) {
            $st = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ? AND usuario_id = ?');
            $st->execute([$f['id'], $sesion['id']]);
            if ((int) $st->fetchColumn() > 0) {
                responderError('Ya registraste una respuesta en este formulario.', 409);
            }
        }
        if ($email !== '') {
            $st = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ? AND email = ?');
            $st->execute([$f['id'], $email]);
            if ((int) $st->fetchColumn() > 0) {
                responderError('Ya hay una respuesta con este correo.', 409);
            }
        }
    }
    if (!empty($f['limite_por_ip'])) {
        $st = $pdo->prepare('SELECT COUNT(*) FROM formulario_respuestas WHERE formulario_id = ? AND ip = ?');
        $st->execute([$f['id'], $ip]);
        if ((int) $st->fetchColumn() > 0) {
            responderError('Ya se registró una respuesta desde esta red.', 409);
        }
    }

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
            $respuestaId, $f['id'], $sesion['id'] ?? null, $email ?: null, $ip,
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
    } catch (Exception $e) {
        $pdo->rollBack();
        responderError($e->getMessage() ?: 'No se pudo guardar la respuesta.', 400);
    }
    responderJson(['ok' => true, 'id' => $respuestaId]);
}
