<?php
require_once __DIR__ . '/test_helper.php';

TestRunner::section("5. Integridad del Frontend y Compilación JavaScript");

$rootDir = dirname(__DIR__);

// 1. Compilación de scripts con Node.js
$scripts = ['app.js', 'recursos.js', 'comunicados.js', 'pagos.js', 'proyectos.js', 'trainee.js', 'chat.js', 'asistencia.js', 'docentes.js', 'estudiantes.js', 'semaforo.js', 'forms.js', 'db.js'];
foreach ($scripts as $js) {
    $file = "$rootDir/$js";
    $output = shell_exec("node -c \"$file\" 2>&1");
    TestRunner::assert("Sintaxis JS válida en $js", empty(trim($output ?? '')), empty(trim($output ?? '')) ? "Compilación Node OK" : $output);
}

// 2. Verificación de inclusión de scripts en index.html
$html = file_get_contents("$rootDir/index.html");
TestRunner::assert("Inclusión de db.js en index.html", strpos($html, 'db.js') !== false);
TestRunner::assert("Inclusión de app.js en index.html", strpos($html, 'app.js') !== false);
TestRunner::assert("Inclusión de forms.js en index.html", strpos($html, 'forms.js') !== false);
TestRunner::assert("Inclusión de recursos.js en index.html", strpos($html, 'recursos.js') !== false);
TestRunner::assert("Inclusión de comunicados.js en index.html", strpos($html, 'comunicados.js') !== false);
TestRunner::assert("Inclusión de pagos.js en index.html", strpos($html, 'pagos.js') !== false);
TestRunner::assert("Inclusión de proyectos.js en index.html", strpos($html, 'proyectos.js') !== false);
TestRunner::assert("Inclusión de trainee.js en index.html", strpos($html, 'trainee.js') !== false);
TestRunner::assert("Inclusión de chat.js en index.html", strpos($html, 'chat.js') !== false);
TestRunner::assert("Inclusión de asistencia.js en index.html", strpos($html, 'asistencia.js') !== false);
TestRunner::assert("Inclusión de docentes.js en index.html", strpos($html, 'docentes.js') !== false);
TestRunner::assert("Inclusión de estudiantes.js en index.html", strpos($html, 'estudiantes.js') !== false);
TestRunner::assert("Inclusión de semaforo.js en index.html", strpos($html, 'semaforo.js') !== false);

// 3. Verificación de getters de sesión y modularidad en app.js
$appJs = file_get_contents("$rootDir/app.js");
TestRunner::assert("Getters reactivos de sesión expuestos en app.js", strpos($appJs, 'getCurrentDocente') !== false && strpos($appJs, 'getCurrentEstudiante') !== false);

// 4. Verificación de optimización de caché (query string v100 presente)
TestRunner::assert("Control de versiones de caché unificado (v100) en index.html", strpos($html, 'v=20261006-v100') !== false);
