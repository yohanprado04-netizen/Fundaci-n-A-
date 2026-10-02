<?php
/**
 * middleware.php — Autenticación por token para el backend PHP.
 *
 * El token es un JWT simple, firmado con HMAC-SHA256 usando SECRET_KEY.
 * No se usa ninguna librería externa (evita depender de Composer en
 * shared hosting, donde a veces no está disponible) — es una
 * implementación mínima de lo que un JWT necesita para este caso: emitir
 * un token que el frontend guarda tras el login, y verificarlo en cada
 * petición siguiente para saber quién y con qué rol está pidiendo qué.
 *
 * IMPORTANTE: cambia SECRET_KEY de abajo por una cadena propia antes de
 * ir a producción — con
 *     php -r "echo bin2hex(random_bytes(32));"
 * (mismo criterio que SECRET_KEY en backend_chat/.env, pero esta es una
 * clave DISTINTA — no compartas la misma entre los dos backends).
 */

define('JWT_SECRET', getenv('JWT_SECRET') ?: 'b3149d8969c6d07a440812a28e60ec03d5605b54c3df86e7dabb6835e0807794');
define('JWT_TTL_SEGUNDOS', 60 * 60 * 12); // el token expira a las 12 horas — la persona vuelve a loguearse pasado ese tiempo

function base64UrlEncode(string $datos): string {
    return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
}

function base64UrlDecode(string $datos): string {
    return base64_decode(strtr($datos, '-_', '+/'));
}

/**
 * Genera un token firmado para este usuario cumpliendo con las normas RFC 7519.
 * Incluye claims estándar: iat (emitido en), exp (expiración), nbf (no antes de),
 * iss (emisor), jti (identificador único contra ataques de repetición).
 */
function generarToken(array $payload): string {
    $ahora = time();
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['iat'] = $ahora;
    $payload['nbf'] = $ahora;
    $payload['exp'] = $ahora + JWT_TTL_SEGUNDOS;
    $payload['iss'] = 'fundacionamas.org.co';
    if (!isset($payload['sub'])) {
        $payload['sub'] = (string)($payload['id'] ?? $payload['email'] ?? 'usuario');
    }
    $payload['jti'] = bin2hex(random_bytes(16));

    $headerCodificado = base64UrlEncode(json_encode($header));
    $payloadCodificado = base64UrlEncode(json_encode($payload));
    $firma = base64UrlEncode(hash_hmac('sha256', "$headerCodificado.$payloadCodificado", JWT_SECRET, true));

    return "$headerCodificado.$payloadCodificado.$firma";
}

/**
 * Verifica un token: firma válida, emisor legítimo y no expirado.
 * Devuelve el payload decodificado si es válido, o null si fue alterado o expiró.
 */
function verificarToken(?string $token): ?array {
    if (!$token) return null;
    $partes = explode('.', $token);
    if (count($partes) !== 3) return null;
    [$headerCodificado, $payloadCodificado, $firmaRecibida] = $partes;

    $firmaEsperada = base64UrlEncode(hash_hmac('sha256', "$headerCodificado.$payloadCodificado", JWT_SECRET, true));
    if (!hash_equals($firmaEsperada, $firmaRecibida)) return null; // Comparación a tiempo constante contra timing attacks

    $payload = json_decode(base64UrlDecode($payloadCodificado), true);
    if (!$payload) return null;

    $ahora = time();
    if (isset($payload['exp']) && $payload['exp'] < $ahora) return null;
    if (isset($payload['nbf']) && $payload['nbf'] > $ahora) return null;

    return $payload;
}

/**
 * Establece la cookie de autenticación de forma segura (HttpOnly, SameSite, Secure).
 */
function establecerCookieAuth(string $token, int $ttl = JWT_TTL_SEGUNDOS): void {
    $esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
               (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

    setcookie('auth_token', $token, [
        'expires'  => time() + $ttl,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $esHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Elimina la cookie de autenticación al cerrar sesión.
 */
function eliminarCookieAuth(): void {
    $esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
               (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

    setcookie('auth_token', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $esHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Extrae el token de la petición actual.
 * Prioridad:
 * 1. Cabecera "Authorization: Bearer <token>" (para clientes API, mobile o microservicios)
 * 2. Cookie HttpOnly "auth_token" (para navegación web protegida contra XSS)
 */
function obtenerTokenDeCabecera(): ?string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? null);
    if ($auth && stripos($auth, 'Bearer ') === 0) {
        $token = trim(substr($auth, 7));
        if ($token !== '') return $token;
    }

    if (!empty($_COOKIE['auth_token'])) {
        return trim((string)$_COOKIE['auth_token']);
    }

    return null;
}

/**
 * Exige una sesión válida para continuar — si no hay token o es
 * inválido/expirado, responde 401 y corta la ejecución ahí mismo. Si es
 * válido, devuelve el payload (id, email, rol, cohorte) para que el
 * endpoint sepa a nombre de quién actuar.
 *
 * $rolesPermitidos: si se pasa (ej. ['Superadmin', 'Coordinador']),
 * además exige que el rol del token esté en esa lista — responde 403 si
 * no. Vacío = cualquier rol autenticado puede pasar.
 */
function exigirSesion(array $rolesPermitidos = []): array {
    $token = obtenerTokenDeCabecera();
    $payload = verificarToken($token);
    if (!$payload) {
        responderError('Sesión inválida o expirada. Vuelve a iniciar sesión.', 401);
    }
    if ($rolesPermitidos && !in_array($payload['rol'], $rolesPermitidos, true)) {
        responderError('No tienes permiso para esta acción.', 403);
    }
    return $payload;
}