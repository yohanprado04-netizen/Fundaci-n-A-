<?php
/**
 * router.php — Router para el servidor integrado de PHP.
 * Emula exactamente las reglas de reescritura de .htaccess:
 *   - /api/auth/login            -> api/auth.php
 *   - /api/<entidad>             -> api/index.php?entidad=<entidad>
 *   - Archivos estáticos (.js, .css, imágenes) con sus Content-Type y CORS correctos
 *   - / o /index.html            -> index.html con inyección de SERVER_LAN_IP
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$docRoot = __DIR__;

// Quitar prefijo /fundacion-api si la petición lo trae
if (strpos($uri, '/fundacion-api') === 0) {
    $uri = substr($uri, strlen('/fundacion-api'));
    if ($uri === '') $uri = '/';
}

/**
 * Obtiene la dirección IP de la interfaz de red local activa en Windows.
 */
function obtenerIpLocal(): string {
    $out = @shell_exec('route print 0.0.0.0');
    if ($out && preg_match('/0\.0\.0\.0\s+0\.0\.0\.0\s+\S+\s+(\d+\.\d+\.\d+\.\d+)/', $out, $m)) {
        if (!str_starts_with($m[1], '127.') && !str_starts_with($m[1], '169.254.')) {
            return $m[1];
        }
    }
    return '192.168.1.35';
}

/**
 * Sirve el archivo index.html inyectando la IP local del servidor para los enlaces QR.
 */
function servirIndex(string $docRoot): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    $html = file_get_contents($docRoot . '/index.html');
    $lanIp = obtenerIpLocal();
    $html = str_replace('<head>', "<head><script>window.SERVER_LAN_IP = '{$lanIp}';</script>", $html);
    echo $html;
    exit;
}

// 1. Ruta principal
if ($uri === '/' || $uri === '' || $uri === '/index.html') {
    servirIndex($docRoot);
}

// 2. Regla /api/auth/login -> api/auth.php
if (preg_match('#^/api/auth/login/?$#', $uri)) {
    $_SERVER['SCRIPT_NAME'] = '/api/auth.php';
    include $docRoot . '/api/auth.php';
    exit;
}

// 3. Reglas para /api/<entidad> y archivos PHP en /api
if (strpos($uri, '/api') === 0) {
    // Si apunta directamente a un archivo .php (ej. /api/index.php o /api/auth.php)
    $directFile = $docRoot . $uri;
    if (is_file($directFile) && pathinfo($directFile, PATHINFO_EXTENSION) === 'php') {
        include $directFile;
        exit;
    }

    // Si es /api/<entidad> (ej. /api/usuarios, /api/horarios, /api/qr_asistencia)
    if (preg_match('#^/api/([a-zA-Z0-9_]+)/?$#', $uri, $m)) {
        if (!isset($_GET['entidad']) || $_GET['entidad'] === '') {
            $_GET['entidad'] = $m[1];
        }
    }

    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    include $docRoot . '/api/index.php';
    exit;
}

// 4. Archivos físicos existentes (estáticos)
$file = $docRoot . $uri;
if (is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

    if ($ext === 'php') {
        include $file;
        exit;
    }

    $mimes = [
        'js'    => 'application/javascript; charset=utf-8',
        'css'   => 'text/css; charset=utf-8',
        'html'  => 'text/html; charset=utf-8',
        'json'  => 'application/json; charset=utf-8',
        'svg'   => 'image/svg+xml',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'pdf'   => 'application/pdf',
    ];

    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
        header('Access-Control-Allow-Origin: *');
        readfile($file);
        exit;
    }

    return false;
}

// 5. Fallback para Single Page Application
if (is_file($docRoot . '/index.html')) {
    servirIndex($docRoot);
}

http_response_code(404);
echo "404 No encontrado";
