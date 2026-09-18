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

// CORS: mientras desarrollas en local (ej. Live Server en 127.0.0.1:5500
// hablando con este backend en otro puerto), el navegador exige estos
// headers para permitir la petición cruzada. En producción, si sirves
// app.js y este backend desde el MISMO dominio, esto sigue funcionando
// sin problema (los headers de más no estorban).
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
date_default_timezone_set('America/Bogota');

// Una petición OPTIONS es el "preflight" que manda el navegador antes de
// la petición real (POST/PUT/DELETE) para confirmar que el CORS de arriba
// la permite — no lleva datos, solo se responde 200 y se corta aquí.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
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