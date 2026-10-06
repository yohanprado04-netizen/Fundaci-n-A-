<?php
require_once __DIR__ . '/../api/config.php';
$pdo = obtenerConexion();

echo "=== DOCENTES ===\n";
$stmt = $pdo->query("SELECT id, nombre, email, rol FROM usuarios WHERE LOWER(rol) = 'docente'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== HORARIOS ===\n";
$stmt = $pdo->query("SELECT * FROM horarios");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== PENSUM ===\n";
$stmt = $pdo->query("SELECT * FROM pensum");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== MODULOS ===\n";
$stmt = $pdo->query("SELECT * FROM modulos");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
