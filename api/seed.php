<?php
/**
 * seed.php — Crea (o resetea la contraseña de) el primer Superadmin.
 *
 * CÓMO USARLO:
 *   1) Sube este archivo junto con el resto de /api a Hostinger.
 *   2) Ábrelo UNA VEZ en el navegador con parámetros en la URL, ej:
 *        https://tudominio.com/api/seed.php?clave_maestra=CAMBIA-ESTO&nombre=Ana%20Admin&email=admin@tudominio.com&password=UnaClaveFuerte123
 *   3) Verifica el mensaje de éxito.
 *   4) BORRA este archivo del servidor de inmediato (por seguridad, no
 *      debe quedar accesible: cualquiera con la URL podría crear cuentas).
 *
 * "clave_maestra" es solo una traba adicional para que no lo ejecute
 * cualquiera que adivine la URL mientras subes los archivos. Cámbiala
 * abajo antes de subir el archivo.
 */
require_once __DIR__ . '/db.php';

const CLAVE_MAESTRA = 'CAMBIA-ESTO-ANTES-DE-SUBIR';

header('Content-Type: text/plain; charset=utf-8');

if (($_GET['clave_maestra'] ?? '') !== CLAVE_MAESTRA) {
    http_response_code(403);
    echo "Clave maestra incorrecta. Edita seed.php y define la tuya antes de usarlo.";
    exit;
}

$nombre = trim($_GET['nombre'] ?? '');
$email = trim($_GET['email'] ?? '');
$password = (string)($_GET['password'] ?? '');

if ($nombre === '' || $email === '' || strlen($password) < 8) {
    http_response_code(400);
    echo "Faltan datos. Usa ?clave_maestra=...&nombre=...&email=...&password=... (password de al menos 8 caracteres).";
    exit;
}

$pdo = db();
$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$existente = $stmt->fetch();

if ($existente) {
    $stmt = $pdo->prepare('UPDATE usuarios SET nombre = ?, password_hash = ?, rol = ?, estado = ? WHERE id = ?');
    $stmt->execute([$nombre, $hash, 'Superadmin', 'Activo', $existente['id']]);
    echo "Listo: se actualizó el usuario existente ($email) como Superadmin con la nueva contraseña.\n";
} else {
    $id = uuidv4();
    $stmt = $pdo->prepare('INSERT INTO usuarios (id, nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $nombre, $email, $hash, 'Superadmin', 'Activo']);
    echo "Listo: se creó el Superadmin $email.\n";
}

echo "\nAhora BORRA este archivo (seed.php) del servidor.\n";
