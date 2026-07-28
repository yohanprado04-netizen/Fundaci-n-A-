<?php
/**
 * auth.php — Login propio (sin Supabase): valida contra usuarios.password_hash
 * y emite un token de sesión guardado en la tabla `sesiones`.
 */
require_once __DIR__ . '/db.php';

function crear_sesion(string $usuarioId): string {
    $pdo = db();
    $token = bin2hex(random_bytes(32));
    $expira = (new DateTime())->modify('+' . SESION_HORAS . ' hours')->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?, ?, ?)');
    $stmt->execute([$token, $usuarioId, $expira]);
    return $token;
}

function usuario_publico(array $u): array {
    unset($u['password_hash']);
    return $u;
}

/** Intenta autenticar; devuelve ['token'=>..., 'usuario'=>...] o lanza json_error. */
function intentar_login(string $email, string $password): array {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();

    if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
        json_error(401, 'Correo o contraseña incorrectos.');
    }
    if ($usuario['estado'] !== 'Activo') {
        json_error(403, 'Esta cuenta está inactiva. Contacta al administrador.');
    }
    $token = crear_sesion($usuario['id']);
    return ['token' => $token, 'usuario' => usuario_publico($usuario)];
}

/** Lee el token del header Authorization: Bearer ... y devuelve el usuario, o null. */
function usuario_actual(): ?array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) return null;
    $token = $m[1];

    $pdo = db();
    $stmt = $pdo->prepare('SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ? AND s.expira_en > NOW() LIMIT 1');
    $stmt->execute([$token]);
    $usuario = $stmt->fetch();
    return $usuario ?: null;
}

/** Exige que haya un usuario autenticado; corta la ejecución si no. */
function requerir_usuario(): array {
    $u = usuario_actual();
    if (!$u) json_error(401, 'Debes iniciar sesión.');
    return $u;
}

function cerrar_sesion_actual(): void {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
        $stmt = db()->prepare('DELETE FROM sesiones WHERE token = ?');
        $stmt->execute([$m[1]]);
    }
}
