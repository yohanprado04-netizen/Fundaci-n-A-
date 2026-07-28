<?php
/**
 * index.php — Punto de entrada único de la API.
 *
 * Endpoints de autenticación:
 *   POST  /api/index.php?action=login   { email, password }
 *   POST  /api/index.php?action=logout
 *   GET   /api/index.php?action=me
 *
 * CRUD genérico (todas requieren header Authorization: Bearer <token>,
 * salvo login):
 *   GET    /api/index.php?entity=usuarios            -> lista
 *   GET    /api/index.php?entity=usuarios&id=XYZ      -> un registro
 *   POST   /api/index.php?entity=usuarios             -> crea (body JSON)
 *   PUT    /api/index.php?entity=usuarios&id=XYZ      -> edita (body JSON)
 *   DELETE /api/index.php?entity=usuarios&id=XYZ      -> elimina
 *
 * "entity" debe existir en entidades.php (lista blanca). Cualquier otro
 * nombre devuelve 404.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/entidades.php';

// ---------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty(CORS_ALLOWED_ORIGINS) || in_array($origin, CORS_ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Vary: Origin');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// ---------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------
if ($action === 'login') {
    if ($method !== 'POST') json_error(405, 'Método no permitido.');
    $body = json_body();
    $email = trim($body['email'] ?? '');
    $password = (string)($body['password'] ?? '');
    if ($email === '' || $password === '') json_error(400, 'Correo y contraseña son obligatorios.');
    json_response(intentar_login($email, $password));
}

if ($action === 'logout') {
    if ($method !== 'POST') json_error(405, 'Método no permitido.');
    cerrar_sesion_actual();
    json_response(['ok' => true]);
}

if ($action === 'me') {
    $u = requerir_usuario();
    json_response(usuario_publico($u));
}

// ---------------------------------------------------------------------
// CRUD GENÉRICO
// ---------------------------------------------------------------------
$entityKey = $_GET['entity'] ?? null;
if (!$entityKey || !isset(ENTIDADES[$entityKey])) {
    json_error(404, 'Entidad no reconocida: ' . htmlspecialchars((string)$entityKey));
}

$cfg = ENTIDADES[$entityKey];
$table = $cfg['table'];
$isSingleton = !empty($cfg['singleton']);
$id = $_GET['id'] ?? null;

$usuario = requerir_usuario();
$rol = $usuario['rol'];

$scopeRoles = array_values(array_filter(array_merge(
    isset($cfg['scope_role']) && $cfg['scope_role'] ? [$cfg['scope_role']] : [],
    $cfg['scope_roles'] ?? []
)));
$scopeField = $cfg['scope_field'] ?? null;
$estaEscopado = $scopeField && in_array($rol, $scopeRoles, true);

function rol_permitido($permiso, string $rol): bool {
    if ($permiso === 'all') return true;
    return is_array($permiso) && in_array($rol, $permiso, true);
}

/** Columnas reales de la tabla (cacheadas por request) para filtrar el body entrante. */
function columnas_tabla(string $table): array {
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    $stmt = db()->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`');
    $cols = array_map(fn($r) => $r['Field'], $stmt->fetchAll());
    return $cache[$table] = $cols;
}

function filtrar_body(array $body, array $columnas, array $excluir = ['id', 'creado_en', 'actualizado_en']): array {
    $out = [];
    foreach ($columnas as $col) {
        if (in_array($col, $excluir, true)) continue;
        if (array_key_exists($col, $body)) $out[$col] = $body[$col];
    }
    return $out;
}

// ---- GET (lista o un registro) ----
if ($method === 'GET') {
    if (!rol_permitido($cfg['read'], $rol)) json_error(403, 'No tienes permiso para leer esta información.');

    if ($isSingleton) {
        $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = 1 LIMIT 1");
        $stmt->execute();
        json_response($stmt->fetch() ?: null);
    }

    if ($id) {
        $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_error(404, 'Registro no encontrado.');
        if ($estaEscopado && ($row[$scopeField] ?? null) !== $usuario['id']) {
            json_error(403, 'No tienes permiso para ver este registro.');
        }
        json_response($row);
    }

    $sql = "SELECT * FROM `$table`";
    $params = [];
    if ($estaEscopado) {
        $sql .= " WHERE `$scopeField` = ?";
        $params[] = $usuario['id'];
    }
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

// A partir de aquí todas las operaciones son de escritura
if (!rol_permitido($cfg['write'], $rol)) json_error(403, 'No tienes permiso para modificar esta información.');

// ---- POST (crear) ----
if ($method === 'POST') {
    if ($isSingleton) json_error(405, 'Este recurso no admite creación (usa PUT).');
    $body = json_body();
    $columnas = columnas_tabla($table);
    $datos = filtrar_body($body, $columnas);

    if ($estaEscopado) $datos[$scopeField] = $usuario['id']; // el cliente no puede suplantar a otro usuario

    $nuevoId = (isset($body['id']) && is_string($body['id']) && preg_match('/^[0-9a-f-]{36}$/i', $body['id'])) ? $body['id'] : uuidv4();
    $datos['id'] = $nuevoId;

    $cols = array_keys($datos);
    $placeholders = array_fill(0, count($cols), '?');
    $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', $placeholders) . ")";
    $stmt = db()->prepare($sql);
    $stmt->execute(array_values($datos));

    $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
    $stmt->execute([$nuevoId]);
    json_response($stmt->fetch(), 201);
}

// ---- PUT (actualizar) ----
if ($method === 'PUT') {
    if (!$isSingleton && !$id) json_error(400, 'Falta el parámetro id.');
    $targetId = $isSingleton ? 1 : $id;

    if ($estaEscopado) {
        $stmt = db()->prepare("SELECT `$scopeField` FROM `$table` WHERE id = ? LIMIT 1");
        $stmt->execute([$targetId]);
        $row = $stmt->fetch();
        if (!$row) json_error(404, 'Registro no encontrado.');
        if ($row[$scopeField] !== $usuario['id']) json_error(403, 'No tienes permiso para modificar este registro.');
    }

    $body = json_body();
    $columnas = columnas_tabla($table);
    $datos = filtrar_body($body, $columnas);
    if ($estaEscopado) unset($datos[$scopeField]); // no puede reasignarse a sí mismo otro dueño
    if (empty($datos)) json_error(400, 'No enviaste campos para actualizar.');

    $set = implode(',', array_map(fn($c) => "`$c` = ?", array_keys($datos)));
    $sql = "UPDATE `$table` SET $set WHERE id = ?";
    $stmt = db()->prepare($sql);
    $stmt->execute([...array_values($datos), $targetId]);

    $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
    $stmt->execute([$targetId]);
    json_response($stmt->fetch());
}

// ---- DELETE ----
if ($method === 'DELETE') {
    if ($isSingleton) json_error(405, 'Este recurso no admite eliminación.');
    if (!$id) json_error(400, 'Falta el parámetro id.');

    if ($estaEscopado) {
        $stmt = db()->prepare("SELECT `$scopeField` FROM `$table` WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_error(404, 'Registro no encontrado.');
        if ($row[$scopeField] !== $usuario['id']) json_error(403, 'No tienes permiso para eliminar este registro.');
    }

    $stmt = db()->prepare("DELETE FROM `$table` WHERE id = ?");
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_error(405, 'Método no permitido.');
