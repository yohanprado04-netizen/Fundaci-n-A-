<?php
/**
 * auth.php — Login contra MySQL (fundacionamas_db).
 *
 * Reemplaza el bloque de submitLogin() en app.js que comparaba el
 * email+password contra 4 arrays cargados de localStorage
 * (superadmin_credentials, y usuarios filtrados por rol Coordinador/
 * Docente/Estudiante) — ahora es UNA petición POST a este archivo, y
 * TODA la verificación ocurre aquí, en el servidor.
 *
 * CONTRASEÑAS: este endpoint usa password_verify()/password_hash() de
 * PHP (bcrypt) — nunca compara contraseñas en texto plano. El .sql que
 * exportaste todavía tiene las contraseñas viejas en texto plano (ej.
 * 'Super2026#'), así que este archivo hace un fallback: si
 * password_verify() falla PERO el valor guardado es exactamente igual al
 * que mandaron (texto plano, como estaba antes), deja pasar y de una vez
 * la re-guarda ya hasheada en la base de datos. Así cada cuenta se
 * "migra" a hash sola, la primera vez que esa persona inicia sesión
 * después de este cambio — nadie queda bloqueado fuera de su cuenta, y
 * en poco tiempo ninguna contraseña queda en texto plano.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

// ── Soporte de Logout (cierre de sesión seguro y eliminación de cookie) ──
$accion = $_GET['action'] ?? '';
$uri = $_SERVER['REQUEST_URI'] ?? '';
if ($accion === 'logout' || stripos($uri, '/logout') !== false) {
    try {
        $pdo = obtenerConexion();
        $sesion = obtenerSesionOpcional();
        if ($sesion) {
            registrarEventoSeguridad($pdo, 'Autenticación: Cierre de Sesión', $sesion['email'] ?? 'Usuario', $sesion['rol'] ?? 'Usuario', 'Cierre voluntario de sesión desde IP ' . obtenerIpCliente(), null, 'INFO');
        }
    } catch (Exception $e) {}
    eliminarCookieAuth();
    responderJson(['ok' => true, 'mensaje' => 'Sesión cerrada correctamente.']);
}

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo !== 'POST') {
    responderError('Método no permitido. Usa POST.', 405);
}

$body = leerBodyJson();
$email = strtolower(trim($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');

if (!$email || !$password) {
    responderError('Correo y contraseña son obligatorios.', 400);
}

try {
    $pdo = obtenerConexion();
} catch (PDOException $e) {
    responderError('No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo y los datos en config.php.', 500);
}

/**
 * Compara $password contra $hashGuardado. Si el hash guardado en
 * realidad es texto plano de la migración anterior (ver comentario de
 * cabecera), y coincide, lo re-hashea en $tabla/$columnaId de una vez.
 * Devuelve true/false según si las credenciales son válidas.
 */
function passwordValidaConMigracion(PDO $pdo, string $password, string $hashGuardado, string $tabla, string $columnaId, $idValor): bool {
    if (password_verify($password, $hashGuardado)) {
        return true;
    }
    // Fallback de compatibilidad: contraseña vieja en texto plano.
    if (hash_equals($hashGuardado, $password)) {
        $nuevoHash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE `$tabla` SET password = ? WHERE `$columnaId` = ?");
        $stmt->execute([$nuevoHash, $idValor]);
        return true;
    }
    return false;
}

// ── Rate Limiting contra ataques de fuerza bruta (definido centralmente en middleware.php) ──
$ipCliente = obtenerIpCliente();
$claveIp = 'ip:' . $ipCliente;
$claveEmail = 'email:' . $email;

// Verificar bloqueos activos por IP o cuenta
verificarRateLimit($pdo, $claveIp);
verificarRateLimit($pdo, $claveEmail);

// ── 1) Superadmin (tabla de una sola fila, sin relación con `usuarios`) ──
$stmt = $pdo->prepare('SELECT id, email, password, token_version FROM superadmin_credentials WHERE LOWER(email) = ? LIMIT 1');
$stmt->execute([$email]);
$superadmin = $stmt->fetch();

if ($superadmin) {
    if (passwordValidaConMigracion($pdo, $password, $superadmin['password'], 'superadmin_credentials', 'id', $superadmin['id'])) {
        limpiarRateLimit($pdo, $claveIp);
        limpiarRateLimit($pdo, $claveEmail);
        $token = generarToken([
            'email' => $superadmin['email'],
            'rol' => 'Superadmin',
            'v' => (int)($superadmin['token_version'] ?? 1),
        ]);
        establecerCookieAuth($token);
        registrarAuditoriaLogin($pdo, 'Exitoso', $email, 'Superadmin', $ipCliente);
        registrarEventoSeguridad($pdo, 'Autenticación: Login Exitoso', $email, 'Superadmin', "Inicio de sesión Superadmin exitoso desde IP $ipCliente", $ipCliente, 'INFO');
        responderJson(['token' => $token, 'usuario' => ['email' => $superadmin['email'], 'nombre' => 'Superadmin', 'rol' => 'Superadmin']]);
    }
    registrarIntentoFallido($pdo, $claveIp);
    registrarIntentoFallido($pdo, $claveEmail);
    registrarAuditoriaLogin($pdo, 'Fallido', $email, 'Superadmin', $ipCliente);
    registrarEventoSeguridad($pdo, 'Autenticación: Contraseña Errónea', $email, 'Superadmin', "Intento fallido de login Superadmin desde IP $ipCliente", $ipCliente, 'WARN');
    responderError('Credenciales incorrectas.', 401);
}

// ── 2) usuarios (Coordinador, Administrador, Docente, Estudiante) ──
// estado_registro IS NULL descarta las cuentas de autorregistro que
// siguen 'Pendiente' de aprobación — mismo bloqueo que hacía
// submitLogin() en app.js antes de revisar el rol.
$stmt = $pdo->prepare(
    "SELECT id, nombre, email, password, rol, cohorte, cohortes_permitidas, estado, estado_registro, foto_url, descripcion, telefono, documento, habilidades, token_version
     FROM usuarios WHERE LOWER(email) = ? LIMIT 1"
);
$stmt->execute([$email]);
$usuario = $stmt->fetch();

if (!$usuario) {
    registrarIntentoFallido($pdo, $claveIp);
    registrarIntentoFallido($pdo, $claveEmail);
    registrarAuditoriaLogin($pdo, 'Fallido', $email, 'Desconocido', $ipCliente);
    registrarEventoSeguridad($pdo, 'Autenticación: Cuenta No Encontrada', $email, 'Desconocido', "Intento de inicio de sesión con correo no registrado desde IP $ipCliente", $ipCliente, 'WARN');
    responderError('Credenciales incorrectas.', 401);
}

if ($usuario['estado_registro'] === 'Pendiente') {
    registrarAuditoriaLogin($pdo, 'Rechazado (Pendiente)', $email, $usuario['rol'] ?? 'Estudiante', $ipCliente);
    registrarEventoSeguridad($pdo, 'Autenticación: Registro Pendiente', $email, $usuario['rol'] ?? 'Estudiante', "Intento de acceso a cuenta pendiente de aprobación desde IP $ipCliente", $ipCliente, 'WARN');
    responderError('Tu registro está pendiente de aprobación por el Superadmin. Te avisaremos cuando puedas ingresar.', 403);
}

$estado = strtolower(trim((string)($usuario['estado'] ?? '')));
if ($estado !== 'activo') {
    registrarAuditoriaLogin($pdo, 'Rechazado (Inactivo)', $email, $usuario['rol'] ?? 'Usuario', $ipCliente);
    registrarEventoSeguridad($pdo, 'Autenticación: Cuenta Inactiva', $email, $usuario['rol'] ?? 'Usuario', "Intento de acceso a cuenta inactiva/bloqueada desde IP $ipCliente", $ipCliente, 'SECURITY_ALERT');
    responderError('Tu cuenta está inactiva. Contacta al Superadmin.', 403);
}

if (!passwordValidaConMigracion($pdo, $password, $usuario['password'], 'usuarios', 'id', $usuario['id'])) {
    registrarIntentoFallido($pdo, $claveIp);
    registrarIntentoFallido($pdo, $claveEmail);
    registrarAuditoriaLogin($pdo, 'Fallido', $email, $usuario['rol'] ?? 'Usuario', $ipCliente);
    registrarEventoSeguridad($pdo, 'Autenticación: Contraseña Errónea', $email, $usuario['rol'] ?? 'Usuario', "Intento fallido con contraseña incorrecta para {$usuario['rol']} desde IP $ipCliente", $ipCliente, 'WARN');
    responderError('Credenciales incorrectas.', 401);
}

limpiarRateLimit($pdo, $claveIp);
limpiarRateLimit($pdo, $claveEmail);
registrarAuditoriaLogin($pdo, 'Exitoso', $email, $usuario['rol'] ?? 'Usuario', $ipCliente);
registrarEventoSeguridad($pdo, 'Autenticación: Login Exitoso', $email, $usuario['rol'] ?? 'Usuario', "Inicio de sesión exitoso ({$usuario['rol']}) desde IP $ipCliente", $ipCliente, 'INFO');

$stmtPerfiles = $pdo->prepare('SELECT perfil_id FROM usuario_perfiles WHERE usuario_id = ?');
$stmtPerfiles->execute([$usuario['id']]);
$perfilesUsuario = array_column($stmtPerfiles->fetchAll(), 'perfil_id');

$cohortesPermitidas = ['todas'];
if (!empty($usuario['cohortes_permitidas'])) {
    $dec = json_decode($usuario['cohortes_permitidas'], true);
    $cohortesPermitidas = is_array($dec) ? $dec : array_map('trim', explode(',', $usuario['cohortes_permitidas']));
}

$habilidadesUsuario = [];
if (!empty($usuario['habilidades'])) {
    $decHab = json_decode($usuario['habilidades'], true);
    $habilidadesUsuario = is_array($decHab) ? $decHab : array_values(array_filter(array_map('trim', explode(',', $usuario['habilidades']))));
}

$token = generarToken([
    'id' => $usuario['id'],
    'nombre' => $usuario['nombre'],
    'email' => $usuario['email'],
    'rol' => $usuario['rol'],
    'cohorte' => $usuario['cohorte'],
    'cohortes_permitidas' => $cohortesPermitidas,
    'v' => (int)($usuario['token_version'] ?? 1),
]);
establecerCookieAuth($token);

responderJson([
    'token' => $token,
    'usuario' => [
        'id' => $usuario['id'], 'nombre' => $usuario['nombre'], 'email' => $usuario['email'],
        'rol' => $usuario['rol'], 'cohorte' => $usuario['cohorte'],
        'cohortesPermitidas' => $cohortesPermitidas,
        'telefono' => $usuario['telefono'] ?? '',
        'documento' => $usuario['documento'] ?? '',
        'habilidades' => $habilidadesUsuario,
        'fotoUrl' => $usuario['foto_url'] ?? '',
        'descripcion' => $usuario['descripcion'] ?? '',
        'perfiles' => $perfilesUsuario,
    ],
]);