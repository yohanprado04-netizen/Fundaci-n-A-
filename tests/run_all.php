<?php
/**
 * run_all.php — Ejecutor Maestro de la Suite de Pruebas Automatizadas
 * Fundación A+ — Plataforma de Gestión Académica
 */

require_once __DIR__ . '/test_helper.php';

$inicio = microtime(true);

echo "\n";
echo "====================================================================\n";
echo "    FUNDACIÓN A+ — SUITE CONSOLIDADA DE PRUEBAS AUTOMATIZADAS       \n";
echo "====================================================================\n";

// Ejecutar cada módulo de prueba
require_once __DIR__ . '/test_database.php';
require_once __DIR__ . '/test_auth_rbac.php';
require_once __DIR__ . '/test_endpoints.php';
require_once __DIR__ . '/test_recursos.php';
require_once __DIR__ . '/test_frontend.php';

$duracion = round((microtime(true) - $inicio) * 1000, 2);

echo "\n====================================================================\n";
echo " RESUMEN FINAL DE LA EJECUCIÓN\n";
echo "====================================================================\n";
echo "  Total de pruebas: " . TestRunner::$total . "\n";
echo "  Aprobadas:        \033[32m" . TestRunner::$passed . "\033[0m\n";
echo "  Fallidas:         \033[31m" . TestRunner::$failed . "\033[0m\n";
echo "  Tiempo total:     {$duracion} ms\n";
echo "====================================================================\n";

if (TestRunner::$failed > 0) {
    echo "\n\033[31m[ALERTA] Se detectaron " . TestRunner::$failed . " fallo(s):\033[0m\n";
    foreach (TestRunner::$failures as $f) {
        echo "  - $f\n";
    }
    echo "\n";
    exit(1);
} else {
    echo "\n\033[32m[ÉXITO] Todas las pruebas pasaron satisfactoriamente (100% OK).\033[0m\n\n";
    exit(0);
}
