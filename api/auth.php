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

// ── 1) Superadmin (tabla de una sola fila, sin relación con `usuarios`) ──
$stmt = $pdo->prepare('SELECT id, email, password FROM superadmin_credentials WHERE LOWER(email) = ? LIMIT 1');
$stmt->execute([$email]);
$superadmin = $stmt->fetch();

if ($superadmin) {
    if (passwordValidaConMigracion($pdo, $password, $superadmin['password'], 'superadmin_credentials', 'id', $superadmin['id'])) {
        $token = generarToken(['email' => $superadmin['email'], 'rol' => 'Superadmin']);
        registrarAuditoriaLogin($pdo, 'Exitoso', $email, 'Superadmin');
        responderJson(['token' => $token, 'usuario' => ['email' => $superadmin['email'], 'nombre' => 'Superadmin', 'rol' => 'Superadmin']]);
    }
    registrarAuditoriaLogin($pdo, 'Fallido', $email, 'Superadmin');
    responderError('Credenciales incorrectas.', 401);
}

// ── 2) usuarios (Coordinador, Administrador, Docente, Estudiante) ──
// estado_registro IS NULL descarta las cuentas de autorregistro que
// siguen 'Pendiente' de aprobación — mismo bloqueo que hacía
// submitLogin() en app.js antes de revisar el rol.
$stmt = $pdo->prepare(
    "SELECT id, nombre, email, password, rol, cohorte, estado, estado_registro, foto_url, descripcion
     FROM usuarios WHERE LOWER(email) = ? LIMIT 1"
);
$stmt->execute([$email]);
$usuario = $stmt->fetch();

if (!$usuario) {
    responderError('Credenciales incorrectas.', 401);
}

if ($usuario['estado_registro'] === 'Pendiente') {
    responderError('Tu registro está pendiente de aprobación por el Superadmin. Te avisaremos cuando puedas ingresar.', 403);
}

if ($usuario['estado'] !== 'Activo') {
    responderError('Tu cuenta está inactiva. Contacta al Superadmin.', 403);
}

if (!passwordValidaConMigracion($pdo, $password, $usuario['password'], 'usuarios', 'id', $usuario['id'])) {
    registrarAuditoriaLogin($pdo, 'Fallido', $email, $usuario['rol']);
    responderError('Credenciales incorrectas.', 401);
}

registrarAuditoriaLogin($pdo, 'Exitoso', $email, $usuario['rol']);

// Los perfiles asignados (usuario_perfiles) NO estaban en el objeto que
// devuelve el login — solo los devolvía el GET de /usuarios. Como
// currentDocente/currentEstudiante/currentAdminUser se llenan con ESTA
// respuesta de login (no con el GET de /usuarios), permisoUsuarioSobrePanel()
// siempre veía perfiles=[] sin importar lo que se asignara desde el panel
// de Usuarios, y por eso el aviso "no tiene ningún perfil asignado" nunca
// se iba aunque el perfil estuviera bien guardado en la base de datos.
$stmtPerfiles = $pdo->prepare('SELECT perfil_id FROM usuario_perfiles WHERE usuario_id = ?');
$stmtPerfiles->execute([$usuario['id']]);
$perfilesUsuario = array_column($stmtPerfiles->fetchAll(), 'perfil_id');

$token = generarToken([
    'id' => $usuario['id'], 'email' => $usuario['email'], 'rol' => $usuario['rol'],
    'cohorte' => $usuario['cohorte'],
]);
responderJson([
    'token' => $token,
    'usuario' => [
        'id' => $usuario['id'], 'nombre' => $usuario['nombre'], 'email' => $usuario['email'],
        'rol' => $usuario['rol'], 'cohorte' => $usuario['cohorte'],
        // CORREGIDO: faltaban estos dos campos aquí — currentEstudiante/
        // currentDocente en app.js se llenan directo con esta respuesta
        // del login (no siempre se refrescan con GET /api/usuarios), así
        // que aunque foto_url/descripcion ya estuvieran guardados en
        // MySQL, no se veían al entrar hasta que algo más disparara una
        // recarga completa de usuarios.
        'fotoUrl' => $usuario['foto_url'] ?? '',
        'descripcion' => $usuario['descripcion'] ?? '',
        'perfiles' => $perfilesUsuario,
    ],
]);

/**
 * Registra el intento en auditoria_login — mismo propósito que
 * registrarAuditoriaLogin() en app.js (visible en Configuración >
 * Auditoría para el Superadmin), ahora persistido en MySQL en vez de
 * localStorage.
 */
function registrarAuditoriaLogin(PDO $pdo, string $resultado, string $email, string $rol): void {
    $stmt = $pdo->prepare(
        'INSERT INTO auditoria_login (id, fecha, hora, resultado, email, rol) VALUES (?, CURDATE(), ?, ?, ?, ?)'
    );
    $stmt->execute([bin2hex(random_bytes(16)), date('H:i:s'), $resultado, $email, $rol]);
}