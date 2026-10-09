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

/**
 * Obtiene la clave secreta de firma JWT con protección criptográfica.
 * Prioridad:
 * 1. Variable de entorno del sistema o servidor web (JWT_SECRET)
 * 2. Archivo .env en la raíz del proyecto
 * 3. Archivo protegido local de clave persistente (.jwt_secret en api/)
 * 4. Generación automática y almacenamiento de una clave criptográfica de 256 bits única
 */
function obtenerJwtSecret(): string {
    // 1. Variable de entorno
    $envSecret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? ($_SERVER['JWT_SECRET'] ?? null));
    if (!empty($envSecret) && is_string($envSecret) && strlen(trim($envSecret)) >= 32) {
        return trim($envSecret);
    }

    // 2. Archivo .env en la raíz
    $envFile = dirname(__DIR__) . '/.env';
    if (file_exists($envFile) && is_readable($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            if (strpos($line, 'JWT_SECRET=') === 0) {
                $val = trim(substr($line, 11), " \t\n\r\0\x0B\"'");
                if (strlen($val) >= 32) {
                    return $val;
                }
            }
        }
    }

    // 3. Archivo persistente protegido local
    $secretFile = __DIR__ . '/.jwt_secret';
    if (file_exists($secretFile) && is_readable($secretFile)) {
        $key = trim((string)file_get_contents($secretFile));
        if (strlen($key) >= 32) {
            return $key;
        }
    }

    // 4. Si no existe, generar una clave criptográficamente segura única para esta instancia
    $nuevaClave = bin2hex(random_bytes(32));
    @file_put_contents($secretFile, $nuevaClave, LOCK_EX);
    @chmod($secretFile, 0600);
    return $nuevaClave;
}

define('JWT_SECRET', obtenerJwtSecret());
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
/**
 * Valida la vigencia activa del token contra la base de datos (Revocation / Session Versioning).
 * Si el usuario fue desactivado, o si se incrementó token_version (por cambio de contraseña,
 * reseteo administrativo o cierre de sesiones globales), invalida de inmediato el token JWT.
 */
function validarRevocacionSesion(array $payload): void {
    if (!isset($payload['v'])) return; // Compatibilidad con tokens legacy

    try {
        $pdo = obtenerConexion();
        $rol = $payload['rol'] ?? '';
        $versionEsperada = (int)$payload['v'];

        if ($rol === 'Superadmin') {
            $stmt = $pdo->prepare('SELECT token_version FROM superadmin_credentials WHERE id = 1 LIMIT 1');
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && (int)$row['token_version'] !== $versionEsperada) {
                responderError('Sesión invalidada por actualización de credenciales. Inicia sesión nuevamente.', 401);
            }
        } else {
            $id = $payload['id'] ?? null;
            $email = strtolower($payload['email'] ?? '');
            if ($id) {
                $stmt = $pdo->prepare('SELECT estado, token_version FROM usuarios WHERE id = ? LIMIT 1');
                $stmt->execute([$id]);
            } else {
                $stmt = $pdo->prepare('SELECT estado, token_version FROM usuarios WHERE LOWER(email) = ? LIMIT 1');
                $stmt->execute([$email]);
            }
            $row = $stmt->fetch();
            if (!$row) {
                responderError('Cuenta no encontrada o dada de baja.', 401);
            }
            if (strtolower(trim($row['estado'] ?? '')) !== 'activo') {
                responderError('Tu cuenta se encuentra inactiva. Contacta al administrador.', 403);
            }
            if ((int)$row['token_version'] !== $versionEsperada) {
                responderError('Sesión invalidada por cambio de clave o reseteo de seguridad. Inicia sesión nuevamente.', 401);
            }
        }
    } catch (Exception $e) {
        // En caso de falla temporal de red con la BD, permitir continuar para no degradar el servicio
    }
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
    validarRevocacionSesion($payload);
    if ($rolesPermitidos && !in_array($payload['rol'], $rolesPermitidos, true)) {
        responderError('No tienes permiso para esta acción.', 403);
    }
    return $payload;
}

/**
 * Obtiene la sesión autenticada actual si existe, sin responder error 401 si no hay token.
 */
function obtenerSesionOpcional(): ?array {
    $token = obtenerTokenDeCabecera();
    if (!$token) return null;
    $payload = verificarToken($token);
    if (!$payload) return null;
    if (isset($payload['v'])) {
        try {
            $pdo = obtenerConexion();
            $rol = $payload['rol'] ?? '';
            $v = (int)$payload['v'];
            if ($rol === 'Superadmin') {
                $stmt = $pdo->query('SELECT token_version FROM superadmin_credentials WHERE id = 1');
                $r = $stmt->fetch();
                if ($r && (int)$r['token_version'] !== $v) return null;
            } else {
                $id = $payload['id'] ?? null;
                $stmt = $pdo->prepare('SELECT estado, token_version FROM usuarios WHERE id = ? LIMIT 1');
                $stmt->execute([$id]);
                $r = $stmt->fetch();
                if (!$r || strtolower(trim($r['estado'] ?? '')) !== 'activo' || (int)$r['token_version'] !== $v) {
                    return null;
                }
            }
        } catch (Exception $e) {}
    }
    return $payload;
}

// ── Rate Limiting central contra ataques de fuerza bruta y DoS ───────────────
if (!function_exists('inicializarTablaRateLimit')) {
    function inicializarTablaRateLimit(PDO $pdo): void {
        static $verificado = false;
        if ($verificado) return;
        try {
            // Verificación DML ultra-rápida sin bloqueo de metadatos (MDL)
            $pdo->query("SELECT 1 FROM rate_limits LIMIT 1");
            $verificado = true;
        } catch (Exception $e) {
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
                    clave VARCHAR(128) PRIMARY KEY,
                    intentos INT NOT NULL DEFAULT 1,
                    bloqueado_hasta INT NOT NULL DEFAULT 0,
                    ultimo_intento INT NOT NULL DEFAULT 0,
                    INDEX idx_bloqueado (bloqueado_hasta),
                    INDEX idx_ultimo (ultimo_intento)
                ) ENGINE=InnoDB");
                $verificado = true;
            } catch (Exception $ex) {}
        }
    }
}

if (!function_exists('verificarRateLimit')) {
    function verificarRateLimit(PDO $pdo, string $clave, int $maxIntentos = 5, int $segundosVentana = 300): void {
        inicializarTablaRateLimit($pdo);
        $ahora = time();

        // Recolección probabilística de basura (1% de las peticiones) para evitar crecimiento infinito de la tabla
        if (mt_rand(1, 100) === 1) {
            try {
                $stmtPurge = $pdo->prepare("DELETE FROM rate_limits WHERE ultimo_intento < ? AND bloqueado_hasta < ?");
                $stmtPurge->execute([$ahora - 3600, $ahora]);
            } catch (Exception $e) {}
        }

        try {
            $stmt = $pdo->prepare("SELECT intentos, bloqueado_hasta, ultimo_intento FROM rate_limits WHERE clave = ? LIMIT 1");
            $stmt->execute([$clave]);
            $row = $stmt->fetch();
            if ($row) {
                if ($row['bloqueado_hasta'] > $ahora) {
                    $minutos = ceil(($row['bloqueado_hasta'] - $ahora) / 60);
                    responderError("Demasiados intentos. Tu acceso está temporalmente restringido por $minutos minuto(s).", 429);
                }
                if (($ahora - $row['ultimo_intento']) > $segundosVentana) {
                    $stmtReset = $pdo->prepare("UPDATE rate_limits SET intentos = 0, bloqueado_hasta = 0, ultimo_intento = ? WHERE clave = ?");
                    $stmtReset->execute([$ahora, $clave]);
                }
            }
        } catch (Exception $e) {}
    }
}

if (!function_exists('registrarIntentoFallido')) {
    function registrarIntentoFallido(PDO $pdo, string $clave, int $maxIntentos = 5, int $segundosBloqueo = 600): void {
        inicializarTablaRateLimit($pdo);
        $ahora = time();
        try {
            $stmt = $pdo->prepare("INSERT INTO rate_limits (clave, intentos, bloqueado_hasta, ultimo_intento)
                VALUES (?, 1, 0, ?)
                ON DUPLICATE KEY UPDATE
                    intentos = intentos + 1,
                    bloqueado_hasta = IF(intentos >= ?, ? + ?, bloqueado_hasta),
                    ultimo_intento = ?");
            $stmt->execute([$clave, $ahora, $maxIntentos, $ahora, $segundosBloqueo, $ahora]);
        } catch (Exception $e) {}
    }
}

if (!function_exists('limpiarRateLimit')) {
    function limpiarRateLimit(PDO $pdo, string $clave): void {
        try {
            $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE clave = ?");
            $stmt->execute([$clave]);
        } catch (Exception $e) {}
    }
}

if (!function_exists('obtenerRestriccionCohortes')) {
    /**
     * Determina si la sesión actual tiene restricción de cohortes (ej. Aliados y Donantes con cohortes asignadas).
     * Retorna array de strings con nombres de cohorte permitidos, o null si tiene acceso total.
     */
    function obtenerRestriccionCohortes(array $sesion, PDO $pdo): ?array {
        $rol = $sesion['rol'] ?? '';
        if ($rol === 'Superadmin' || $rol === 'Coordinador') {
            return null;
        }
        if ($rol === 'Aliado' || $rol === 'Donante') {
            $cohortes = $sesion['cohortes_permitidas'] ?? null;
            if ($cohortes === null && !empty($sesion['id'])) {
                $stmt = $pdo->prepare('SELECT cohortes_permitidas FROM usuarios WHERE id = ? LIMIT 1');
                $stmt->execute([$sesion['id']]);
                $val = $stmt->fetchColumn();
                if ($val) {
                    $dec = json_decode($val, true);
                    $cohortes = is_array($dec) ? $dec : array_map('trim', explode(',', $val));
                }
            }
            if (is_array($cohortes)) {
                if (in_array('todas', $cohortes, true) || empty($cohortes)) {
                    return null;
                }
                return array_values($cohortes);
            }
        }
        return null;
    }
}

if (!function_exists('prepararReemplazoGenerico')) {
    /**
     * Exige sesión válida (cualquier rol o especificados) y decodifica el body como array para
     * un POST/PUT masivo común.
     */
    function prepararReemplazoGenerico(array $rolesPermitidos = []): array {
        exigirSesion($rolesPermitidos);
        $datos = leerBodyJson();
        if (!is_array($datos)) {
            responderError('Se esperaba un array en el body.', 400);
        }
        return $datos;
    }
}

if (!function_exists('registrarEventoSeguridad')) {
    /**
     * Registra un evento de seguridad o auditoría administrativa en el servidor (SIEM-ready).
     * Garantiza encadenamiento criptográfico HMAC-SHA256 para integridad de la bitácora
     * e inmunidad contra manipulación externa o desautorizada.
     */
    function registrarEventoSeguridad(
        PDO $pdo,
        string $tipo,
        string $actor,
        string $rol,
        string $detalle,
        ?string $ip = null,
        string $severidad = 'INFO'
    ): void {
        try {
            $ip = $ip ?: (function_exists('obtenerIpCliente') ? obtenerIpCliente() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
            $id = bin2hex(random_bytes(16));
            $fecha = date('Y-m-d');
            $hora = date('H:i:s');

            $ultimoHash = 'GENESIS';
            try {
                $stmtH = $pdo->query('SELECT hash_integridad FROM auditoria_acciones WHERE hash_integridad IS NOT NULL ORDER BY fecha DESC, hora DESC LIMIT 1');
                $filaH = $stmtH ? $stmtH->fetch(PDO::FETCH_ASSOC) : null;
                if ($filaH && !empty($filaH['hash_integridad'])) {
                    $ultimoHash = $filaH['hash_integridad'];
                }
            } catch (Exception $e) {}

            $hashIntegridad = hash_hmac('sha256', "$id|$fecha|$hora|$tipo|$actor|$rol|$ultimoHash", JWT_SECRET);

            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO auditoria_acciones (id, fecha, hora, tipo, actor, rol, ip, severidad, detalle, hash_integridad)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([$id, $fecha, $hora, $tipo, $actor, $rol, $ip, $severidad, $detalle, $hashIntegridad]);
            } catch (Exception $eCol) {
                // Fallback si columnas ip o severidad no existen en la tabla
                $stmt = $pdo->prepare(
                    'INSERT INTO auditoria_acciones (id, fecha, hora, tipo, actor, rol, detalle, hash_integridad)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([$id, $fecha, $hora, $tipo, $actor, $rol, "[$severidad][IP: $ip] $detalle", $hashIntegridad]);
            }
        } catch (Exception $e) {
            error_log("[SECURITY_AUDIT_LOG_ERROR] " . $e->getMessage());
        }
    }
}

if (!function_exists('registrarAuditoriaLogin')) {
    /**
     * Registra el intento en auditoria_login con dirección IP y encadenamiento criptográfico (HMAC-SHA256)
     * para detectar e impedir la alteración o eliminación fraudulenta de trazas de auditoría.
     */
    function registrarAuditoriaLogin(PDO $pdo, string $resultado, string $email, string $rol, ?string $ip = null): void {
        $ip = $ip ?: (function_exists('obtenerIpCliente') ? obtenerIpCliente() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
        $id = bin2hex(random_bytes(16));
        $fecha = date('Y-m-d');
        $hora = date('H:i:s');

        $ultimoHash = 'GENESIS';
        try {
            $stmtH = $pdo->query('SELECT hash_integridad FROM auditoria_login WHERE hash_integridad IS NOT NULL ORDER BY fecha DESC, hora DESC LIMIT 1');
            $filaH = $stmtH ? $stmtH->fetch(PDO::FETCH_ASSOC) : null;
            if ($filaH && !empty($filaH['hash_integridad'])) {
                $ultimoHash = $filaH['hash_integridad'];
            }
        } catch (Exception $e) {}

        $hashIntegridad = hash_hmac('sha256', "$id|$fecha|$hora|$resultado|$email|$rol|$ultimoHash", JWT_SECRET);

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_login (id, fecha, hora, resultado, email, rol, ip, hash_integridad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$id, $fecha, $hora, $resultado, $email, $rol, $ip, $hashIntegridad]);
        } catch (Exception $e) {
            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_login (id, fecha, hora, resultado, email, rol, hash_integridad) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$id, $fecha, $hora, $resultado, $email, $rol, $hashIntegridad]);
        }
    }
}