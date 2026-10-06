<?php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/middleware.php';
require_once __DIR__ . '/test_helper.php';

TestRunner::section("4. Módulo de Recursos y Préstamos de Equipos");

$pdo = obtenerConexion();

// 1. Inserción de prueba en historial_prestamos
$idTest = 'test_prestamo_' . bin2hex(random_bytes(6));
$stmt = $pdo->prepare("INSERT INTO historial_prestamos (
    id, recurso_id, recurso_codigo, recurso_nombre, recurso_categoria,
    usuario_nombre, usuario_email, usuario_rol, cohorte, tipo_asignacion,
    fecha_prestamo, fecha_limite, estado, motivo, entregado_por
) VALUES (
    ?, 'rec_test_01', 'EQ-TEST-99', 'Laptop HP Pavilion', 'Portátiles',
    'Estudiante Prueba', 'prueba@aplus.org', 'Estudiante', 'Segunda Cohorte', 'Temporal',
    NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'Activo', 'Práctica de laboratorio', 'Administración'
)");

$resIns = $stmt->execute([$idTest]);
TestRunner::assert("Radicación de préstamo de equipo en base de datos", $resIns);

// 2. Consulta y verificación
$stmtQuery = $pdo->prepare("SELECT * FROM historial_prestamos WHERE id = ? LIMIT 1");
$stmtQuery->execute([$idTest]);
$prestamo = $stmtQuery->fetch(PDO::FETCH_ASSOC);
TestRunner::assert("Lectura y consistencia de datos del préstamo", $prestamo && $prestamo['recurso_codigo'] === 'EQ-TEST-99');

// 3. Devolución / actualización de estado
$stmtDev = $pdo->prepare("UPDATE historial_prestamos SET estado = 'Devuelto', fecha_devolucion = NOW(), recibido_por = 'Superadmin' WHERE id = ?");
$resDev = $stmtDev->execute([$idTest]);
TestRunner::assert("Cierre y devolución de préstamo con fecha y custodio", $resDev);

// 4. Limpieza del registro de prueba
$pdo->prepare("DELETE FROM historial_prestamos WHERE id = ?")->execute([$idTest]);
$stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM historial_prestamos WHERE id = ?");
$stmtCheck->execute([$idTest]);
TestRunner::assert("Depuración de registro de prueba sin dejar residuos", (int)$stmtCheck->fetchColumn() === 0);
