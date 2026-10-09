<?php
/**
 * config.php — Conexión a MySQL y configuración compartida por todo el
 * backend PHP de la Fundación A+.
 *
 * Estado de la migración de localStorage -> MySQL: la lista completa de
 * entidades ya conectadas está en ENTIDADES_MYSQL (db.js, frontend) y
 * debe coincidir con los "case" del switch en api/index.php. Cualquier
 * entidad que NO esté en esa lista sigue en localStorage por ahora.
 *
 * Esta es la MISMA base de datos (Aiven) que ya usa backend_chat/db.py
 * (Python) — ambos backends leen/escriben la misma base "defaultdb",
 * cada uno responsable de una parte distinta (este de la app web, aquel
 * del chat de IA).
 *
 * EDITA SOLO LOS VALORES DE ABAJO para apuntar a tu MySQL real (Aiven en
 * producción, o tu MySQL local si vuelves a desarrollar sin conexión) —
 * el resto del archivo no necesita cambios.
 */

// ── Datos de conexión (Variables de Entorno con Fallback Resiliente) ─
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'fundacionamas_db');
define('DB_USER', getenv('DB_USER') ?: 'fundacion_user');
define('DB_PASSWORD', getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : 'fundacion_pass');
// ─────────────────────────────────────────────────────────────────────

// Compresión GZIP automática para minimizar tráfico de red en respuestas JSON
if (php_sapi_name() !== 'cli' && !ob_get_level()) {
    if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
        ob_start('ob_gzhandler');
    } else {
        ob_start();
    }
}

// ── CORS y Cabeceras de Seguridad ────────────────────────────────────
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
$origenPermitido = false;

if ($origen) {
    $parsed = parse_url($origen);
    $host = $parsed['host'] ?? '';

    // Validar si el host está en la lista blanca (localhost, IPs privadas LAN o dominios institucionales)
    if (
        $host === 'localhost' ||
        $host === '127.0.0.1' ||
        preg_match('/^192\.168\.\d{1,3}\.\d{1,3}$/', $host) ||
        preg_match('/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $host) ||
        preg_match('/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/', $host) ||
        preg_match('/(^|\.)fundacionamas\.org\.co$/i', $host) ||
        (isset($_SERVER['HTTP_HOST']) && $host === parse_url('http://' . $_SERVER['HTTP_HOST'], PHP_URL_HOST))
    ) {
        $origenPermitido = true;
    }
}

if (!headers_sent()) {
    if ($origenPermitido) {
        header("Access-Control-Allow-Origin: {$origen}");
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    // Cabeceras de endurecimiento de seguridad HTTP (Hardening)
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
    header('Cross-Origin-Opener-Policy: same-origin-allow-popups');
    header('Cross-Origin-Resource-Policy: cross-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob: https:; connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 https://api.anthropic.com; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';");

    // Enforce HSTS en conexiones HTTPS seguras
    $esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
               (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
    if ($esHttps) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }

    // Ocultar huellas de tecnología del servidor
    header_remove('X-Powered-By');
    @ini_set('expose_php', '0');

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}
date_default_timezone_set('America/Bogota');

// Responder de inmediato a peticiones preflight (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Abre una conexión PDO a MySQL. Utiliza un patrón Singleton por ciclo de vida
 * de la petición (request-scoped singleton) para reutilizar la misma conexión
 * en todas las consultas del mismo request, evitando el agotamiento de sockets
 * TCP y mitigando el error 500 por "Too many connections" bajo concurrencia.
 */
function obtenerConexion(): PDO {
    static $instanciaPdo = null;
    if ($instanciaPdo !== null) {
        return $instanciaPdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $opciones = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false, // usa prepared statements reales del driver, no emulados por PHP
    ];
    // Aiven / Cloud MySQL SSL
    if (defined('DB_SSL_CA') && DB_SSL_CA && file_exists(DB_SSL_CA)) {
        $opciones[PDO::MYSQL_ATTR_SSL_CA] = DB_SSL_CA;
        $opciones[PDO::MYSQL_ATTR_VERIFY_SERVER_CERT] = false;
    }

    try {
        $instanciaPdo = new PDO($dsn, DB_USER, DB_PASSWORD, $opciones);
    } catch (PDOException $e) {
        if (!getenv('DB_USER') && DB_USER === 'fundacion_user') {
            try {
                $instanciaPdo = new PDO($dsn, 'root', '', $opciones);
                return $instanciaPdo;
            } catch (PDOException $e2) {
                // Relanzar la excepción original si el fallback también falla
            }
        }
        throw $e;
    }
    return $instanciaPdo;
}

/**
 * Responde con un JSON y termina la ejecución — evita repetir
 * json_encode/header/exit en cada endpoint.
 */
function responderJson($datos, int $codigoHttp = 200): void {
    http_response_code($codigoHttp);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Atajo para responder un error con un mensaje consistente — mismo
 * formato { "error": "..." } en todo el backend, para que db.js sepa
 * siempre dónde mirar el mensaje.
 */
function responderError(string $mensaje, int $codigoHttp = 400): void {
    responderJson(['error' => $mensaje], $codigoHttp);
}

/**
 * Responde un error seguro al cliente y registra los detalles reales en el log interno
 * del servidor, evitando la fuga de nombres de tablas, columnas y rutas (CWE-209).
 */
function responderErrorDb(Exception $e, string $accion = 'procesar la solicitud'): void {
    error_log("[DB_ERROR] " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    responderError("No se pudo $accion. Intenta nuevamente o contacta al administrador.", 500);
}

/**
 * Sanitiza recursivamente valores de entrada para neutralizar inyecciones
 * de scripts (Stored XSS), bytes nulos (\0) y caracteres de control binarios
 * sin alterar estructuras JSON válidas ni URLs legítimas (Defense in Depth / CWE-79).
 */
function sanitizarEntrada(mixed $datos): mixed {
    if (is_string($datos)) {
        // 1. Eliminar bytes nulos (\0) usados en ataques de inyección y evasión
        $limpio = str_replace(chr(0), '', $datos);

        // 2. Eliminar caracteres de control ASCII (excepto tabulaciones y saltos de línea estándar)
        $limpio = preg_replace('/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $limpio);

        // 3. Neutralizar inyecciones directas de script y pseudo-protocolos en cadenas de texto
        $limpio = preg_replace('/<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is', '', $limpio);
        $limpio = preg_replace('/<\s*script\b[^>]*>/is', '', $limpio);
        $limpio = preg_replace('/javascript\s*:/i', 'blocked_js:', $limpio);
        $limpio = preg_replace('/vbscript\s*:/i', 'blocked_vbs:', $limpio);
        $limpio = preg_replace('/data\s*:\s*text\/html/i', 'blocked_html', $limpio);

        return $limpio;
    }

    if (is_array($datos)) {
        $resultado = [];
        foreach ($datos as $clave => $valor) {
            $claveLimpia = is_string($clave) ? sanitizarEntrada($clave) : $clave;
            $resultado[$claveLimpia] = sanitizarEntrada($valor);
        }
        return $resultado;
    }

    return $datos;
}

/**
 * Valida y normaliza un identificador (ID) de entidad contra inyecciones y caracteres no válidos.
 * Acepta únicamente cadenas alfanuméricas, guiones bajos, guiones y dos puntos (UUIDs, IDs prefijados).
 */
function validarIdentificador(?string $id): ?string {
    if ($id === null) return null;
    $id = trim($id);
    if ($id === '') return null;
    if (strlen($id) > 128 || !preg_match('/^[a-zA-Z0-9_\-\.:]+$/', $id)) {
        responderError('Identificador inválido o mal formado.', 400);
    }
    return $id;
}

/**
 * Lee y decodifica el body JSON de la petición actual (POST/PUT). Si el
 * body no es JSON válido, responde 400 y corta — así cada endpoint no
 * tiene que repetir esta validación. Aplica sanitización profunda contra XSS.
 */
function leerBodyJson(): array {
    $crudo = file_get_contents('php://input');
    if ($crudo === '' || $crudo === false) return [];

    $cType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if ($cType !== '' && stripos($cType, 'application/json') === false && stripos($cType, 'multipart/form-data') === false) {
        responderError('Content-Type no soportado. Debe ser application/json.', 415);
    }

    $datos = json_decode($crudo, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        responderError('El cuerpo de la petición no es JSON válido.', 400);
    }
    return is_array($datos) ? sanitizarEntrada($datos) : [];
}

/**
 * Obtiene la dirección IP real del cliente que realiza la petición.
 * ENDURECIMIENTO DE SEGURIDAD (Anti-Spoofing / CWE-290):
 * Solo confía en cabeceras de proxy (X-Forwarded-For, CF-Connecting-IP, etc.)
 * si la conexión TCP directa (REMOTE_ADDR) proviene de un proxy de confianza
 * configurado (reverse proxy local, balanceador de carga o Cloudflare).
 * Si no proviene de un proxy confiable, se descarta cualquier cabecera cliente
 * y se utiliza estrictamente REMOTE_ADDR, impidiendo la evasión de rate limiting
 * y el fraude en asistencias QR.
 */
function obtenerIpCliente(): string {
    $rem = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if ($rem === '::1') {
        $rem = '127.0.0.1';
    }

    // Lista de IPs de proxies confiables
    $envProxies = getenv('TRUSTED_PROXIES') ?: ($_ENV['TRUSTED_PROXIES'] ?? ($_SERVER['TRUSTED_PROXIES'] ?? ''));
    $proxiesConfiables = ['127.0.0.1', '::1'];
    if (!empty($envProxies)) {
        $proxiesConfiables = array_merge($proxiesConfiables, array_map('trim', explode(',', $envProxies)));
    }
    if (defined('TRUSTED_PROXIES') && is_array(TRUSTED_PROXIES)) {
        $proxiesConfiables = array_merge($proxiesConfiables, TRUSTED_PROXIES);
    }

    $esProxyConfiable = in_array($rem, $proxiesConfiables, true);

    // Si NO proviene de un proxy de confianza, REMOTE_ADDR es la única fuente verídica
    if (!$esProxyConfiable) {
        return filter_var($rem, FILTER_VALIDATE_IP) ? $rem : '0.0.0.0';
    }

    // Si proviene de un proxy confiable, evaluamos cabeceras en orden de autoridad
    $encabezados = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_CLIENT_IP'
    ];
    foreach ($encabezados as $header) {
        if (!empty($_SERVER[$header])) {
            $lista = explode(',', (string)$_SERVER[$header]);
            $ip = trim($lista[0]);
            // Quitar puerto si viene incluido (ej. 192.168.1.34:54321)
            if (preg_match('/^(\d+\.\d+\.\d+\.\d+):\d+$/', $ip, $m)) {
                $ip = $m[1];
            }
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return ($ip === '::1') ? '127.0.0.1' : $ip;
            }
        }
    }

    return filter_var($rem, FILTER_VALIDATE_IP) ? $rem : '0.0.0.0';
}

/**
 * Optimización de Rendimiento y Escalabilidad (Composite Indexes):
 * Asegura la existencia de índices compuestos en tablas de alta concurrencia
 * para prevenir escaneos completos de tabla (full-table scans), optimizando
 * los picos de escaneo QR y consultas de asistencias.
 */
function asegurarIndicesRendimiento(PDO $pdo): void {
    static $asegurado = false;
    if ($asegurado) return;

    $indicesDeseados = [
        'asistencia' => [
            'idx_asist_sesion_estado' => '(`sesion_id`, `estado`)',
            'idx_asist_doc_fecha_est' => '(`docente`, `fecha`, `estado`)',
        ],
        'sesiones_asistencia' => [
            'idx_ses_cohorte_doc_fecha' => '(`cohorte`, `iniciada_por`, `fecha`)',
        ],
        'usuarios' => [
            'idx_usr_cohorte_rol' => '(`cohorte`, `rol`)',
            'idx_usr_rol_estado' => '(`rol`, `estado`)',
        ],
        'rate_limits' => [
            'idx_rate_bloqueado' => '(`bloqueado_hasta`)',
            'idx_rate_ultimo' => '(`ultimo_intento`)',
        ],
        'qr_tokens' => [
            'idx_qr_fecha_tipo' => '(`fecha`, `tipo`)',
        ],
        'auditoria_login' => [
            'idx_audit_login_ip' => '(`ip`)',
        ],
        'auditoria_acciones' => [
            'idx_audit_acc_severidad' => '(`severidad`)',
            'idx_audit_acc_ip' => '(`ip`)',
        ],
    ];

    try {
        // Garantizar columnas de auditoría forense y severidad si no existen
        try {
            $colsLog = $pdo->query("SHOW COLUMNS FROM `auditoria_login` LIKE 'ip'")->fetchAll();
            if (empty($colsLog)) {
                $pdo->exec("ALTER TABLE `auditoria_login` ADD COLUMN `ip` VARCHAR(45) NULL AFTER `rol`");
            }
        } catch (Exception $e) {}

        try {
            $colsAccIp = $pdo->query("SHOW COLUMNS FROM `auditoria_acciones` LIKE 'ip'")->fetchAll();
            if (empty($colsAccIp)) {
                $pdo->exec("ALTER TABLE `auditoria_acciones` ADD COLUMN `ip` VARCHAR(45) NULL AFTER `rol`");
            }
            $colsAccSev = $pdo->query("SHOW COLUMNS FROM `auditoria_acciones` LIKE 'severidad'")->fetchAll();
            if (empty($colsAccSev)) {
                $pdo->exec("ALTER TABLE `auditoria_acciones` ADD COLUMN `severidad` VARCHAR(20) DEFAULT 'INFO' AFTER `ip`");
            }
        } catch (Exception $e) {}

        foreach ($indicesDeseados as $tabla => $indices) {
            $stmtCheck = $pdo->prepare("SHOW TABLES LIKE ?");
            $stmtCheck->execute([$tabla]);
            if (!$stmtCheck->fetch()) continue;

            $stmtIdx = $pdo->query("SHOW INDEX FROM `$tabla`");
            $existentes = [];
            while ($row = $stmtIdx->fetch(PDO::FETCH_ASSOC)) {
                $existentes[$row['Key_name']] = true;
            }

            foreach ($indices as $nombreIdx => $cols) {
                if (empty($existentes[$nombreIdx])) {
                    try {
                        $pdo->exec("ALTER TABLE `$tabla` ADD INDEX `$nombreIdx` $cols");
                    } catch (Exception $eIdx) {}
                }
            }
        }
        $asegurado = true;
    } catch (Exception $e) {}
}