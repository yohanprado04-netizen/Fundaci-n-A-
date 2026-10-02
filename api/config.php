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

// ── Datos de conexión — MODO 100% LOCAL (XAMPP) ───────────────────────
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'fundacionamas_db');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
// ─────────────────────────────────────────────────────────────────────

// Compresión GZIP automática para minimizar tráfico de red en respuestas JSON
if (!ob_get_level()) {
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

if ($origenPermitido) {
    header("Access-Control-Allow-Origin: {$origen}");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Cabeceras de endurecimiento de seguridad HTTP (Hardening)
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
date_default_timezone_set('America/Bogota');

// Responder de inmediato a peticiones preflight (OPTIONS)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Abre una conexión PDO a MySQL. Se crea una nueva por request (nada de
 * pool persistente) — mismo criterio que usa db.py del backend de chat:
 * el volumen de esta plataforma no justifica la complejidad de un pool,
 * y así se evita lidiar con conexiones muertas de un MySQL compartido.
 *
 * Lanza una excepción clara si la conexión falla — index.php la atrapa y
 * responde 500 con un mensaje entendible, en vez de un error críptico de
 * PDO sin contexto.
 */
function obtenerConexion(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $opciones = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false, // usa prepared statements reales del driver, no emulados por PHP — más seguro contra inyección SQL
    ];
    // Aiven (y la mayoría de MySQL gestionados en la nube) exige SSL. Si
    // DB_SSL_CA está definido y el archivo existe, se activa — en un
    // MySQL local sin SSL (XAMPP), simplemente no definas esa constante
    // o deja que el archivo no exista, y la conexión sigue sin SSL.
    if (defined('DB_SSL_CA') && DB_SSL_CA && file_exists(DB_SSL_CA)) {
        $opciones[PDO::MYSQL_ATTR_SSL_CA] = DB_SSL_CA;
        $opciones[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }
    return new PDO($dsn, DB_USER, DB_PASSWORD, $opciones);
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
 * Lee y decodifica el body JSON de la petición actual (POST/PUT). Si el
 * body no es JSON válido, responde 400 y corta — así cada endpoint no
 * tiene que repetir esta validación.
 */
function leerBodyJson(): array {
    $crudo = file_get_contents('php://input');
    if ($crudo === '' || $crudo === false) return [];
    $datos = json_decode($crudo, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        responderError('El cuerpo de la petición no es JSON válido.', 400);
    }
    return $datos ?? [];
}

/**
 * Obtiene la dirección IP real del cliente que realiza la petición,
 * considerando proxies o conexión directa en la red local.
 */
function obtenerIpCliente(): string {
    $encabezados = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR'
    ];
    foreach ($encabezados as $header) {
        if (!empty($_SERVER[$header])) {
            $lista = explode(',', $_SERVER[$header]);
            $ip = trim($lista[0]);
            // Quitar puerto si viene incluido (ej. 192.168.1.34:54321)
            if (preg_match('/^(\d+\.\d+\.\d+\.\d+):\d+$/', $ip, $m)) {
                $ip = $m[1];
            }
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                if ($ip === '::1') {
                    return '127.0.0.1';
                }
                return $ip;
            }
        }
    }
    $rem = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if ($rem === '::1') {
        return '127.0.0.1';
    }
    return $rem;
}