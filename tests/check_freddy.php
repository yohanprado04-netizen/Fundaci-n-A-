<?php
require_once __DIR__ . '/../api/config.php';
$pdo = getDbConnection();
echo "--- USUARIOS (Freddy / Docentes) ---\n";
$stmt = $pdo->query("SELECT id, nombre, email, rol, cohorte FROM usuarios WHERE rol = 'Docente' OR nombre LIKE '%Freddy%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- HORARIOS / CLASES PROGRAMADAS ---\n";
$stmt = $pdo->query("SELECT * FROM horarios");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- PENSUM ---\n";
$stmt = $pdo->query("SELECT * FROM pensum");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- MODULOS ---\n";
$stmt = $pdo->query("SELECT * FROM modulos");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
