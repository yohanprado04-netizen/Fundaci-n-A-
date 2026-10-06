<?php
require_once __DIR__ . '/../api/config.php';
$pdo = obtenerConexion();
$stmt = $pdo->query('SELECT * FROM cursos LIMIT 20');
echo "--- TABLE cursos ---\n" . json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

$stmt = $pdo->query('SELECT * FROM pensum LIMIT 20');
echo "--- TABLE pensum ---\n" . json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

$stmt = $pdo->query('SELECT * FROM notas_modulos LIMIT 20');
echo "--- TABLE notas_modulos ---\n" . json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
