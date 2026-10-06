<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . ($argv[1] ?? '');
$_GET['entidad'] = $argv[2] ?? '';
require __DIR__ . '/../api/index.php';
