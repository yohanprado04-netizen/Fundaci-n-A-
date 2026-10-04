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
        if (!str_starts_with($m[1], '127.') && !str_starts_with($m[1], '169.254.') && !str_starts_with($m[1], '192.168.56.')) {
            return $m[1];
        }
    }
    return '192.168.1.26';
}

/**
 * Sirve el archivo index.html inyectando la IP local del servidor para los enlaces QR.
 */
function servirIndex(string $docRoot): void {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
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

// 2. Regla /api/auth/login y /api/auth/logout -> api/auth.php
if (preg_match('#^/api/auth/(login|logout)/?$#', $uri, $m)) {
    $_SERVER['SCRIPT_NAME'] = '/api/auth.php';
    if ($m[1] === 'logout') {
        $_GET['action'] = 'logout';
    }
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

// Bloqueo estricto de seguridad: archivos ocultos (.*), extensiones sensibles o código fuente privado
if (
    preg_match('#(^|/)\.#', $uri) ||
    preg_match('#\.(sql|log|bat|ps1|py|pem|env|lock|md|sh|exe|bak|conf|config|ini)$#i', $uri) ||
    preg_match('#^/(scratch|backend_chat)(/|$)#i', $uri) ||
    preg_match('#(composer\.(json|lock)|package(-lock)?\.json)$#i', $uri)
) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "403 Acceso Prohibido";
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
        'webp'  => 'image/webp',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'pdf'   => 'application/pdf',
    ];

    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
        header('X-Content-Type-Options: nosniff');
        $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origen) {
            $host = parse_url($origen, PHP_URL_HOST) ?? '';
            if ($host === 'localhost' || $host === '127.0.0.1' || preg_match('/^(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\./', $host) || preg_match('/(^|\.)fundacionamas\.org\.co$/i', $host)) {
                header("Access-Control-Allow-Origin: {$origen}");
                header('Access-Control-Allow-Credentials: true');
            }
        }
        readfile($file);
        exit;
    }

    http_response_code(404);
    echo "404 No encontrado";
    exit;
}

// 5. Fallback para Single Page Application
if (is_file($docRoot . '/index.html')) {
    servirIndex($docRoot);
}

http_response_code(404);
echo "404 No encontrado";
