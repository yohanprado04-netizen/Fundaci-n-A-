<?php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';
require_once __DIR__ . '/test_helper.php';

TestRunner::section("2. Autenticación JWT, RBAC y Seguridad");
$pdo = obtenerConexion();

// 1. Generación y verificación de Token JWT
$payloadOriginal = ['id' => 'test_user_01', 'email' => 'docente@aplus.org', 'rol' => 'Docente'];
$token = generarToken($payloadOriginal);
TestRunner::assert("Generación válida de token JWT (RFC 7519)", !empty($token) && count(explode('.', $token)) === 3);

$payloadVerificado = verificarToken($token);
TestRunner::assert("Verificación exitosa de token legítimo", $payloadVerificado !== null && ($payloadVerificado['email'] ?? '') === 'docente@aplus.org');

// 2. Resistencia contra manipulación / falsificación (Tampering)
$partes = explode('.', $token);
$header = $partes[0];
$payloadFalso = base64UrlEncode(json_encode(['id' => 'test_user_01', 'email' => 'docente@aplus.org', 'rol' => 'Superadmin']));
$tokenFalsificado = "$header.$payloadFalso.{$partes[2]}";
$verifFalsa = verificarToken($tokenFalsificado);
TestRunner::assert("Rechazo de token manipulado (Anti-Tampering)", $verifFalsa === null, "Firma inválida rechazada");

// 3. Expiración de tokens
$payloadExpirado = $payloadOriginal;
$payloadExpirado['exp'] = time() - 3600;
$header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
$bodyExp = base64UrlEncode(json_encode($payloadExpirado));
$firmaExp = base64UrlEncode(hash_hmac('sha256', "$header.$bodyExp", JWT_SECRET, true));
$tokenExpirado = "$header.$bodyExp.$firmaExp";
TestRunner::assert("Rechazo automático de token expirado", verificarToken($tokenExpirado) === null);

// 4. Rate Limiting en base de datos
try {
    $pdo = obtenerConexion();
    $claveTest = 'test_ip_rate_limit_' . bin2hex(random_bytes(4));
    limpiarRateLimit($pdo, $claveTest);

    // Registrar 4 intentos fallidos
    for ($i = 0; $i < 4; $i++) {
        registrarIntentoFallido($pdo, $claveTest, 5, 300);
    }
    $intentos = (int)$pdo->query("SELECT intentos FROM rate_limits WHERE clave = '$claveTest'")->fetchColumn();
    TestRunner::assert("Mecanismo de Rate Limiting incrementa intentos", $intentos === 4, "Intentos registrados: $intentos/5");

    limpiarRateLimit($pdo, $claveTest);
    $despues = $pdo->query("SELECT COUNT(*) FROM rate_limits WHERE clave = '$claveTest'")->fetchColumn();
    TestRunner::assert("Limpieza de Rate Limiting efectiva tras login exitoso", (int)$despues === 0);
} catch (Exception $e) {
    TestRunner::assert("Mecanismo de Rate Limiting", false, $e->getMessage());
}

// 5. Scoping de Cohortes para Aliados (IDOR Mitigation)
$sesionSuperadmin = ['rol' => 'Superadmin'];
$scopingSa = obtenerRestriccionCohortes($sesionSuperadmin, $pdo);
TestRunner::assert("Superadmin tiene acceso irrestricto (sin scoping)", $scopingSa === null);

$sesionAliado = ['rol' => 'Aliado', 'cohortes_permitidas' => ['Primera corte']];
$scopingAliado = obtenerRestriccionCohortes($sesionAliado, $pdo);
TestRunner::assert("Aliado restringido solo accede a sus cohortes asignadas", is_array($scopingAliado) && in_array('Primera corte', $scopingAliado, true));
