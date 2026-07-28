<?php
/**
 * upload.php — Sube el archivo adjunto de una PQR (Docente/Estudiante).
 * El registro de la tabla `pqr` se crea aparte, vía index.php?entity=pqr,
 * usando la URL que devuelve este endpoint en "archivo_url".
 *
 * POST /api/upload.php  (multipart/form-data, campo "archivo")
 * Header: Authorization: Bearer <token>
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error(405, 'Método no permitido.');

$usuario = requerir_usuario();

if (empty($_FILES['archivo']) || $_FILES['archivo']['error'] !== UPLOAD_ERR_OK) {
    json_error(400, 'No se recibió ningún archivo válido (campo "archivo").');
}
$archivo = $_FILES['archivo'];

if ($archivo['size'] > UPLOAD_MAX_BYTES) {
    json_error(400, 'El archivo supera el tamaño máximo permitido.');
}

$extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
$permitidas = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
if (!in_array($extension, $permitidas, true)) {
    json_error(400, 'Tipo de archivo no permitido. Usa PDF, DOC, DOCX, JPG o PNG.');
}

if (!is_dir(UPLOADS_DIR)) mkdir(UPLOADS_DIR, 0755, true);

$nombreSeguro = uuidv4() . '.' . $extension;
$rutaDestino = UPLOADS_DIR . '/' . $nombreSeguro;

if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
    json_error(500, 'No se pudo guardar el archivo en el servidor.');
}

json_response([
    'archivo_nombre' => $archivo['name'],
    'archivo_tipo'   => $archivo['type'] ?: 'application/octet-stream',
    'archivo_url'    => rtrim(UPLOADS_URL_BASE, '/') . '/' . $nombreSeguro,
]);
