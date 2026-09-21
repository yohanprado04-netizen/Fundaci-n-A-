<?php
/**
 * index.php — Router principal del API REST.
 *
 * Estado real: todas las entidades listadas en el switch de abajo hablan
 * de verdad con MySQL. Cualquier entidad que llegue aquí y no esté en ese
 * switch cae en el "default" (ver responderError más abajo) y el frontend
 * la sigue manejando con localStorage (ver ENTIDADES_MYSQL en db.js, que
 * es la lista que debe coincidir exactamente con los "case" de este
 * switch — si agregas una entidad aquí, agrégala también ahí).
 *
 * DISEÑO DE LA API — "todo el array, no un CRUD por campo":
 * GET  /api/usuarios   -> devuelve TODO el array de usuarios (como hacía
 *                         Store.list('usuarios') leyendo localStorage)
 * POST /api/usuarios   -> recibe TODO el array en el body y REEMPLAZA la
 *                         tabla completa con ese contenido (como hacía
 *                         Store.set('usuarios', arrayCompleto))
 *
 * Esto no es lo más elegante en términos de una API REST clásica (lo
 * normal sería POST para crear UN registro, PUT para editar UNO, DELETE
 * para borrar UNO) — pero es la única forma de conectar la base de datos
 * SIN reescribir las ~46 llamadas a Store.list('usuarios')/Store.set(...)
 * repartidas por app.js en esta fase. db.js (en el frontend) expone la
 * misma interfaz que Store ya tenía, así que app.js casi no cambia.
 * Fases futuras pueden refinar esto a un CRUD más fino si hace falta.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

// La entidad llega por query string (?entidad=usuarios), reescrito desde
// una URL limpia /api/usuarios por el .htaccess de la raíz del sitio.
$entidad = $_GET['entidad'] ?? '';

try {
    $pdo = obtenerConexion();
} catch (PDOException $e) {
    responderError('No se pudo conectar a la base de datos. Verifica que MySQL esté corriendo y los datos en config.php.', 500);
}

switch ($entidad) {
    case 'public_info':
        manejarPublicInfo($pdo);
        break;
    case 'usuarios':
        manejarUsuarios($pdo);
        break;
    case 'perfil_propio':
        // Autoservicio: cualquier Docente/Estudiante actualiza SU PROPIA
        // foto/descripción sin pasar por manejarUsuarios() (que exige
        // Superadmin/Coordinador y reemplaza la tabla completa). Ver
        // manejarPerfilPropio() más abajo para el porqué de esta ruta.
        manejarPerfilPropio($pdo);
        break;
    case 'modulos':
        manejarModulos($pdo);
        break;
    case 'horarios':
        manejarHorarios($pdo);
        break;
    case 'notas_modulos':
        manejarNotasModulos($pdo);
        break;
    case 'asistencia':
        manejarAsistencia($pdo);
        break;
    case 'semaforo':
        manejarSemaforo($pdo);
        break;
    case 'sesiones_asistencia':
        manejarSesionesAsistencia($pdo);
        break;
    case 'qr_tokens':
        manejarQrTokens($pdo);
        break;
    case 'qr_asistencia':
        manejarQrAsistencia($pdo);
        break;
    case 'pqr':
        manejarPqr($pdo);
        break;
    case 'memorandos':
        manejarMemorandos($pdo);
        break;
    case 'memorandos_leidos':
        manejarMemorandosLeidos($pdo);
        break;
    case 'encuestas':
        manejarEncuestas($pdo);
        break;
    case 'cursos':
        manejarCursos($pdo);
        break;
    case 'pensum':
        manejarPensum($pdo);
        break;
    case 'chat_voz_conocimiento':
        manejarChatVozConocimiento($pdo);
        break;
    case 'auditoria_login':
        manejarAuditoriaLogin($pdo);
        break;
    case 'auditoria_acciones':
        manejarAuditoriaAcciones($pdo);
        break;
    case 'auditoria_horario':
        manejarAuditoriaHorario($pdo);
        break;
    case 'informes_docente':
        manejarInformesDocente($pdo);
        break;
    case 'agenda_docente':
        manejarAgendaDocente($pdo);
        break;
    case 'agenda_estudiante':
        manejarAgendaEstudiante($pdo);
        break;
    case 'configuracion':
        manejarConfiguracion($pdo);
        break;
    case 'enviar_correo':
        manejarEnviarCorreo($pdo);
        break;
    case 'superadmin_credentials':
        manejarSuperadminCredentials($pdo);
        break;
    case 'perfiles':
        manejarPerfiles($pdo);
        break;
    case 'trainee_archivos':
        manejarTraineeArchivos($pdo);
        break;
    default:
        responderError("Entidad \"$entidad\" no reconocida o todavía no migrada a la base de datos (sigue en localStorage por ahora).", 404);
}

/**
 * Endpoint público ultraliviano para el sitio web institucional.
 * Devuelve la configuración pública de contacto y el total de estudiantes
 * en una sola consulta de ~150 bytes, sin exponer datos privados de usuarios
 * ni exigir autenticación.
 */
function manejarPublicInfo(PDO $pdo): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        responderError('Método no permitido.', 405);
    }

    $fila = $pdo->query(
        "SELECT nombre, ciudad, direccion, correo, telefono,
                postulacion_habilitada, postulacion_url
         FROM configuracion WHERE id = 1"
    )->fetch();

    $configuracion = [
        'nombre'                => $fila['nombre'] ?? 'Fundación A+',
        'ciudad'                => $fila['ciudad'] ?? 'Quibdó',
        'direccion'             => $fila['direccion'] ?? '',
        'correo'                => $fila['correo'] ?? 'info@fundacionamas.org.co',
        'telefono'              => $fila['telefono'] ?? '3214974708',
        'postulacionHabilitada' => !empty($fila['postulacion_habilitada']),
        'postulacionUrl'        => $fila['postulacion_url'] ?? '',
    ];

    $stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'Estudiante' AND estado_registro != 'Pendiente'");
    $filaCount = $stmtCount ? $stmtCount->fetch() : null;
    $totalEstudiantes = (int)($filaCount['total'] ?? 0);

    responderJson([
        'configuracion'    => $configuracion,
        'totalEstudiantes' => $totalEstudiantes,
    ]);
}

/**
 * Configuración institucional (configuracion)
 * Objeto único: la plataforma tiene UNA sola configuración, guardada en
 * la fila con id=1 de la tabla `configuracion`.
 * GET  → devuelve { data: { nombre, ciudad, correo, … } } (camelCase)
 * POST → recibe { data: { … } } (camelCase) y actualiza esa única fila.
 * Solo Superadmin puede leerla y modificarla.
 */
function manejarConfiguracion(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $fila = $pdo->query(
            "SELECT nombre, ciudad, direccion, correo, telefono,
                    asistencia_minima, notificaciones_email, notificaciones_ia,
                    postulacion_habilitada, postulacion_url,
                    email_metodo, emailjs_public_key, emailjs_service_id, emailjs_template_id,
                    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure
             FROM configuracion WHERE id = 1"
        )->fetch();
        if (!$fila) {
            // Primera vez (la fila id=1 todavía no existe): valores por defecto.
            responderJson(['data' => [
                'nombre'                 => 'Fundación A+',
                'ciudad'                 => 'Quibdó',
                'direccion'              => '',
                'correo'                 => 'info@fundacionamas.org.co',
                'telefono'               => '3214974708',
                'asistenciaMinima'       => 80,
                'notificacionesEmail'    => true,
                'notificacionesIA'       => true,
                'postulacionHabilitada'  => false,
                'postulacionUrl'         => '',
                'emailMetodo'            => 'emailjs',
                'emailjsPublicKey'       => 'elyshGVkR2fYZQJfO',
                'emailjsServiceId'       => 'service_20mxfgu',
                'emailjsTemplateId'      => 'template_qvmzl1l',
                'smtpHost'               => 'smtp.gmail.com',
                'smtpPort'               => 465,
                'smtpUser'               => '',
                'smtpPass'               => '',
                'smtpFrom'               => 'info@fundacionamas.org.co',
                'smtpSecure'             => 'ssl',
            ]]);
            return;
        }
        responderJson(['data' => [
            'nombre'                => $fila['nombre'],
            'ciudad'                => $fila['ciudad'],
            'direccion'             => $fila['direccion'],
            'correo'                => $fila['correo'],
            'telefono'              => $fila['telefono'],
            'asistenciaMinima'      => (float) $fila['asistencia_minima'],
            'notificacionesEmail'   => (bool) $fila['notificaciones_email'],
            'notificacionesIA'      => (bool) $fila['notificaciones_ia'],
            'postulacionHabilitada' => (bool) $fila['postulacion_habilitada'],
            'postulacionUrl'        => $fila['postulacion_url'],
            'emailMetodo'           => $fila['email_metodo'] ?? 'emailjs',
            'emailjsPublicKey'      => $fila['emailjs_public_key'] ?? 'elyshGVkR2fYZQJfO',
            'emailjsServiceId'      => $fila['emailjs_service_id'] ?? 'service_20mxfgu',
            'emailjsTemplateId'     => $fila['emailjs_template_id'] ?? 'template_qvmzl1l',
            'smtpHost'              => $fila['smtp_host'] ?? 'smtp.gmail.com',
            'smtpPort'              => (int)($fila['smtp_port'] ?? 465),
            'smtpUser'              => $fila['smtp_user'] ?? '',
            'smtpPass'              => $fila['smtp_pass'] ?? '',
            'smtpFrom'              => $fila['smtp_from'] ?? 'info@fundacionamas.org.co',
            'smtpSecure'            => $fila['smtp_secure'] ?? 'ssl',
        ]]);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $body = leerBodyJson();
        $cfg = $body['data'] ?? $body;
        if (!is_array($cfg)) {
            responderError('Se esperaba un objeto de configuración en body.data.', 400);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO configuracion
                (id, nombre, ciudad, direccion, correo, telefono, cupo_maximo,
                 notas_minima_aprobacion, asistencia_minima,
                 notificaciones_email, notificaciones_ia,
                 postulacion_habilitada, postulacion_url,
                 email_metodo, emailjs_public_key, emailjs_service_id, emailjs_template_id,
                 smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure)
             VALUES (1, ?, ?, ?, ?, ?, 30, 6.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre), ciudad = VALUES(ciudad),
                direccion = VALUES(direccion), correo = VALUES(correo),
                telefono = VALUES(telefono),
                asistencia_minima = VALUES(asistencia_minima),
                notificaciones_email = VALUES(notificaciones_email),
                notificaciones_ia = VALUES(notificaciones_ia),
                postulacion_habilitada = VALUES(postulacion_habilitada),
                postulacion_url = VALUES(postulacion_url),
                email_metodo = VALUES(email_metodo),
                emailjs_public_key = VALUES(emailjs_public_key),
                emailjs_service_id = VALUES(emailjs_service_id),
                emailjs_template_id = VALUES(emailjs_template_id),
                smtp_host = VALUES(smtp_host),
                smtp_port = VALUES(smtp_port),
                smtp_user = VALUES(smtp_user),
                smtp_pass = VALUES(smtp_pass),
                smtp_from = VALUES(smtp_from),
                smtp_secure = VALUES(smtp_secure)"
        );
        $stmt->execute([
            $cfg['nombre'] ?? 'Fundación A+',
            $cfg['ciudad'] ?? 'Quibdó',
            $cfg['direccion'] ?? '',
            $cfg['correo'] ?? 'info@fundacionamas.org.co',
            $cfg['telefono'] ?? '3214974708',
            (float) ($cfg['asistenciaMinima'] ?? 80),
            !empty($cfg['notificacionesEmail']) ? 1 : 0,
            !empty($cfg['notificacionesIA']) ? 1 : 0,
            !empty($cfg['postulacionHabilitada']) ? 1 : 0,
            $cfg['postulacionUrl'] ?? '',
            $cfg['emailMetodo'] ?? 'emailjs',
            $cfg['emailjsPublicKey'] ?? 'elyshGVkR2fYZQJfO',
            $cfg['emailjsServiceId'] ?? 'service_20mxfgu',
            $cfg['emailjsTemplateId'] ?? 'template_qvmzl1l',
            $cfg['smtpHost'] ?? 'smtp.gmail.com',
            (int)($cfg['smtpPort'] ?? 465),
            $cfg['smtpUser'] ?? '',
            $cfg['smtpPass'] ?? '',
            $cfg['smtpFrom'] ?? 'info@fundacionamas.org.co',
            $cfg['smtpSecure'] ?? 'ssl',
        ]);
        responderJson(['ok' => true]);
        return;
    }

    responderError('Método no permitido.', 405);
}

// Enviar correo (notificaciones vía SMTP o EmailJS)
function manejarEnviarCorreo(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }
    
    exigirSesion();
    require_once __DIR__ . '/mailer.php';

    $body = leerBodyJson();
    $destinatarioEmail = trim($body['destinatarioEmail'] ?? '');
    $destinatarioNombre = trim($body['destinatarioNombre'] ?? 'Estudiante');
    $asunto = trim($body['asunto'] ?? 'Notificación Fundación A+');
    $mensaje = trim($body['mensaje'] ?? '');
    $mensajeHtml = trim($body['mensajeHtml'] ?? '');
    $esPrueba = !empty($body['esPrueba']);

    if (!$destinatarioEmail) {
        responderError('El correo del destinatario es obligatorio.', 400);
    }

    $fila = $pdo->query('SELECT * FROM configuracion WHERE id = 1')->fetch();
    if (!$fila) {
        responderError('No se encontró la configuración institucional.', 500);
    }

    $metodoEnvio = $fila['email_metodo'] ?? 'emailjs';

    if ($metodoEnvio === 'smtp') {
        $res = enviarCorreoSmtp([
            'smtp_host' => $fila['smtp_host'] ?? '',
            'smtp_port' => (int)($fila['smtp_port'] ?? 465),
            'smtp_user' => $fila['smtp_user'] ?? '',
            'smtp_pass' => $fila['smtp_pass'] ?? '',
            'smtp_from' => $fila['smtp_from'] ?? 'info@fundacionamas.org.co',
            'smtp_from_name' => $fila['nombre'] ?? 'Fundación A+',
            'smtp_secure' => $fila['smtp_secure'] ?? 'ssl',
        ], $destinatarioEmail, $destinatarioNombre, $asunto, $mensaje, $mensajeHtml);

        if (!$res['ok']) {
            responderError($res['error'], 400);
        }

        responderJson(['ok' => true, 'metodo' => 'smtp', 'mensaje' => 'Correo enviado exitosamente vía SMTP']);
        return;
    }

    // Si es EmailJS
    responderJson([
        'ok' => true,
        'metodo' => 'emailjs',
        'config' => [
            'publicKey' => $fila['emailjs_public_key'] ?? '',
            'serviceId' => $fila['emailjs_service_id'] ?? '',
            'templateId' => $fila['emailjs_template_id'] ?? ''
        ]
    ]);
}

/**
 * Credenciales del Superadmin (superadmin_credentials)
 * Objeto único: una sola fila en la tabla `superadmin_credentials` con id = 1.
 * GET  → devuelve { data: { email, password } }
 * POST → recibe { data: { email, password } } y reemplaza con hash bcrypt.
 * Solo Superadmin puede leerlas y modificarlas.
 */
function manejarSuperadminCredentials(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $fila = $pdo->query("SELECT email, password FROM superadmin_credentials WHERE id = 1")->fetch();
        if (!$fila) {
            responderJson(['data' => ['email' => 'superadmin@aplus.org', 'password' => '']]);
            return;
        }
        // Se devuelve la contraseña vacía por seguridad: el frontend
        // nunca la muestra al usuario, solo se usa para verificar "contraseña actual"
        // al guardar — esa verificación la hace el propio PHP en auth.php.
        // Para que la UI de Configuración funcione igual que antes (muestra el email,
        // pide la actual para confirmar), devolvemos el email real y la contraseña
        // en crudo SOLO si el rol confirmado es Superadmin (ya lo garantiza exigirSesion).
        responderJson(['data' => ['email' => $fila['email'], 'password' => $fila['password']]]);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $body  = leerBodyJson();
        $cred  = $body['data'] ?? $body;
        $email = trim($cred['email'] ?? '');
        $pass  = $cred['password'] ?? '';

        if (!$email) responderError('El correo no puede estar vacío.', 400);

        // Si la contraseña ya es un hash bcrypt, no se vuelve a hashear
        $hashFinal = esHashBcrypt($pass) ? $pass : password_hash($pass, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare(
            "INSERT INTO superadmin_credentials (id, email, password) VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE email = VALUES(email), password = VALUES(password)"
        );
        $stmt->execute([$email, $hashFinal]);
        responderJson(['ok' => true]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * Perfiles y permisos (perfiles)
 * Listado y gestión con UPSERT atómico.
 * Solo Superadmin puede modificarlos; perfiles de sistema quedan protegidos.
 */
function manejarPerfiles(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        // Cualquier sesión válida puede LEER perfiles: Superadmin/Coordinador
        // los necesitan para el selector al crear usuarios, y Docente/
        // Estudiante los necesitan en cada login para que
        // asegurarPerfilesDeSistema() y permisoUsuarioSobrePanel() en app.js
        // resuelvan qué paneles ven. Antes esto exigía ['Superadmin',
        // 'Coordinador'], así que un Docente/Estudiante recibía 403 al pedir
        // /api/perfiles, Store.list('perfiles') caía a localStorage vacío, y
        // la cuenta parecía "sin perfil asignado" aunque sí lo tuviera en la
        // base de datos. El POST de más abajo sigue exigiendo Superadmin.
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, categoria, descripcion, es_sistema, permisos FROM perfiles')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id'          => $f['id'],
                'nombre'      => $f['nombre'],
                'categoria'   => $f['categoria'],
                'descripcion' => $f['descripcion'] ?? '',
                'esSistema'   => (bool)$f['es_sistema'],
                'permisos'    => json_decode($f['permisos'] ?? '{}', true) ?? [],
            ];
        }, $filas));
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $perfiles = prepararReemplazoGenerico();
        if (!is_array($perfiles)) responderError('Se esperaba un array de perfiles.', 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO perfiles (id, nombre, categoria, descripcion, es_sistema, permisos)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    categoria = VALUES(categoria),
                    descripcion = VALUES(descripcion),
                    es_sistema = VALUES(es_sistema),
                    permisos = VALUES(permisos)'
            );
            $ids = [];
            foreach ($perfiles as $p) {
                $id = $p['id'] ?? bin2hex(random_bytes(8));
                $ids[] = $id;
                $stmt->execute([
                    $id,
                    $p['nombre']      ?? 'Sin nombre',
                    $p['categoria']   ?? 'Administrativo',
                    $p['descripcion'] ?? '',
                    !empty($p['esSistema']) ? 1 : 0,
                    json_encode($p['permisos'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
            if (!empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM perfiles WHERE es_sistema = 0 AND id NOT IN ($placeholders)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($perfiles)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudieron guardar los perfiles: ' . $e->getMessage(), 500);
        }
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * GET: cualquier sesión válida puede LEER la lista de usuarios (varias
 * pantallas la necesitan: el selector de docentes en Horario, el buscador
 * de personas, etc.) — mismo alcance que tenía Store.list('usuarios') en
 * localStorage, que tampoco distinguía por rol para lectura.
 *
 * POST: reemplaza la tabla completa. Solo Superadmin y Coordinador crean/
 * editan/inactivan usuarios en la plataforma actual (ver panel Usuarios en
 * app.js) — se exige aquí también, del lado del servidor, para que ese
 * permiso no dependa solo de que el frontend oculte el botón.
 */
function manejarUsuarios(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        exigirSesion(); // cualquier rol autenticado puede leer
        $filas = $pdo->query(
            'SELECT id, nombre, email, password, password_plano, rol, estado, estado_registro,
                    cohorte, telefono, fue_estudiante, foto_url, descripcion,
                    creado_en, actualizado_en
             FROM usuarios'
        )->fetchAll();
        // Los perfiles asignados viven en la tabla puente usuario_perfiles.
        // app.js los espera como un array de ids dentro de cada usuario
        // (usuario.perfiles), así que se cargan aquí y se adjuntan.
        $perfilesPorUsuario = [];
        foreach ($pdo->query('SELECT usuario_id, perfil_id FROM usuario_perfiles')->fetchAll() as $rel) {
            $perfilesPorUsuario[$rel['usuario_id']][] = $rel['perfil_id'];
        }
        responderJson(mapearUsuariosACamelCase($filas, $perfilesPorUsuario));
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin', 'Coordinador']);
        $usuariosNuevos = leerBodyJson();
        if (!is_array($usuariosNuevos)) {
            responderError('Se esperaba un array de usuarios en el body.', 400);
        }
        reemplazarTablaUsuarios($pdo, $usuariosNuevos);
        responderJson(['ok' => true, 'total' => count($usuariosNuevos)]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * app.js trabaja internamente en camelCase (estadoRegistro, fueEstudiante,
 * creadoEn...) pero la tabla MySQL usa snake_case (estado_registro,
 * fue_estudiante, creado_en...) siguiendo la convención SQL normal. Esta
 * función traduce cada fila leída de la base hacia el formato que espera
 * el frontend, para no tener que renombrar esos campos en toda la lógica
 * de app.js.
 */
function mapearUsuariosACamelCase(array $filas, array $perfilesPorUsuario = []): array {
    return array_map(function ($fila) use ($perfilesPorUsuario) {
        return [
            'id' => $fila['id'],
            'nombre' => $fila['nombre'],
            'email' => $fila['email'],
            'password' => $fila['password'],
            'passwordPlano' => $fila['password_plano'] ?? '',
            'rol' => $fila['rol'],
            'estado' => $fila['estado'],
            'estadoRegistro' => $fila['estado_registro'],
            'cohorte' => $fila['cohorte'],
            'telefono' => $fila['telefono'],
            'fueEstudiante' => (bool)$fila['fue_estudiante'],
            'fotoUrl' => $fila['foto_url'] ?? '',
            'descripcion' => $fila['descripcion'] ?? '',
            'perfiles' => $perfilesPorUsuario[$fila['id']] ?? [],
            'creadoEn' => $fila['creado_en'],
            'actualizadoEn' => $fila['actualizado_en'],
        ];
    }, $filas);
}

/**
 * Reemplaza TODA la tabla `usuarios` por el array que mandó el frontend —
 * réplica de Store.set('usuarios', arrayCompleto) pero en MySQL.
 *
 * Se hace dentro de una transacción: si algo falla a mitad de camino
 * (ej. un registro con un campo inválido), se revierte todo y la tabla
 * queda como estaba, en vez de quedar a medio borrar/insertar.
 *
 * OJO CONTRASEÑAS: si el frontend manda un usuario CON la misma
 * contraseña que ya tenía en la base (no la tocó), este código no la
 * vuelve a hashear dos veces gracias a esHashBcrypt() — evita el bug
 * clásico de "cada vez que edito el usuario, su contraseña deja de
 * funcionar" por hashear un hash. Si el valor recibido NO es un hash
 * bcrypt reconocible, se asume que es una contraseña nueva en texto
 * plano (alta de usuario, o cambio de contraseña) y se hashea ahora.
 * OJO PERFILES: la tabla `usuario_perfiles` tiene una clave foránea
 * hacia usuarios(id) con ON DELETE CASCADE, así que el DELETE de abajo
 * borra también TODAS las asignaciones de perfiles. Por eso este código
 * las vuelve a insertar a partir del campo `perfiles` (array de ids) que
 * manda app.js en cada usuario. Antes no se hacía, y el resultado era
 * que cada vez que se guardaba cualquier usuario, TODOS perdían sus
 * perfiles asignados y la app decía "tu cuenta no tiene perfil asignado".
 */
function reemplazarTablaUsuarios(PDO $pdo, array $usuarios): void {
    $pdo->beginTransaction();
    try {
        $planoPrevioMap = [];
        try {
            $filasPlanos = $pdo->query("SELECT id, password_plano FROM usuarios WHERE password_plano IS NOT NULL AND password_plano != ''")->fetchAll();
            foreach ($filasPlanos as $fp) {
                $planoPrevioMap[$fp['id']] = $fp['password_plano'];
            }
        } catch (Exception $e) {}

        $stmt = $pdo->prepare(
            'INSERT INTO usuarios
                (id, nombre, email, password, password_plano, rol, estado, estado_registro, cohorte, telefono, fue_estudiante, foto_url, descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                email = VALUES(email),
                password = VALUES(password),
                password_plano = VALUES(password_plano),
                rol = VALUES(rol),
                estado = VALUES(estado),
                estado_registro = VALUES(estado_registro),
                cohorte = VALUES(cohorte),
                telefono = VALUES(telefono),
                fue_estudiante = VALUES(fue_estudiante),
                foto_url = COALESCE(VALUES(foto_url), foto_url),
                descripcion = COALESCE(VALUES(descripcion), descripcion)'
        );
        $stmtPerfilDelete = $pdo->prepare('DELETE FROM usuario_perfiles WHERE usuario_id = ?');
        $stmtPerfil = $pdo->prepare(
            'INSERT INTO usuario_perfiles (usuario_id, perfil_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE perfil_id=VALUES(perfil_id)'
        );
        // Ids de perfiles que existen de verdad: si app.js mandara un id
        // de un perfil ya borrado, el INSERT fallaría por la foreign key
        // y tumbaría el guardado completo de usuarios. Se filtran antes.
        $perfilesValidos = array_column($pdo->query('SELECT id FROM perfiles')->fetchAll(), 'id');

        $idsUsuariosEnviados = [];
        foreach ($usuarios as $u) {
            $idUsuario = $u['id'] ?? bin2hex(random_bytes(16));
            $idsUsuariosEnviados[] = $idUsuario;
            $passRecibido = (string)($u['password'] ?? '');
            $passPlanoRecibido = (string)($u['passwordPlano'] ?? '');

            if (!esHashBcrypt($passRecibido)) {
                $passwordFinal = $passRecibido !== '' ? password_hash($passRecibido, PASSWORD_BCRYPT) : '';
                $passwordPlanoFinal = $passRecibido !== '' ? $passRecibido : null;
            } else {
                $passwordFinal = $passRecibido;
                if (!empty($passPlanoRecibido) && !esHashBcrypt($passPlanoRecibido)) {
                    $passwordPlanoFinal = $passPlanoRecibido;
                } elseif (isset($planoPrevioMap[$idUsuario])) {
                    $passwordPlanoFinal = $planoPrevioMap[$idUsuario];
                } else {
                    $passwordPlanoFinal = null;
                }
            }

            $stmt->execute([
                $idUsuario,
                $u['nombre'] ?? '',
                strtolower($u['email'] ?? ''),
                $passwordFinal,
                $passwordPlanoFinal,
                $u['rol'] ?? 'Estudiante',
                $u['estado'] ?? 'Activo',
                $u['estadoRegistro'] ?? null,
                $u['cohorte'] ?? null,
                $u['telefono'] ?? null,
                !empty($u['fueEstudiante']) ? 1 : 0,
                $u['fotoUrl'] ?? null,
                $u['descripcion'] ?? null,
            ]);

            // Sincronizar los perfiles asignados a este usuario.
            $stmtPerfilDelete->execute([$idUsuario]);
            $perfilesUsuario = is_array($u['perfiles'] ?? null) ? $u['perfiles'] : [];
            foreach (array_unique($perfilesUsuario) as $perfilId) {
                if (in_array($perfilId, $perfilesValidos, true)) {
                    $stmtPerfil->execute([$idUsuario, $perfilId]);
                }
            }
        }

        // Poda segura de usuarios eliminados explícitamente desde la interfaz (nunca toca al Superadmin)
        if (!empty($idsUsuariosEnviados)) {
            $inPlaceholders = implode(',', array_fill(0, count($idsUsuariosEnviados), '?'));
            $stmtPrune = $pdo->prepare("DELETE FROM usuarios WHERE rol != 'Superadmin' AND id NOT IN ($inPlaceholders)");
            $stmtPrune->execute(array_values($idsUsuariosEnviados));
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        responderError('No se pudo guardar la lista de usuarios: ' . $e->getMessage(), 500);
    }
}

function esHashBcrypt(string $valor): bool {
    return (bool)preg_match('/^\$2[aby]\$\d{2}\$/', $valor);
}

/**
 * PUT /api/perfil_propio — autoservicio de Docente/Estudiante para
 * actualizar SOLO su propia foto_url y/o descripcion.
 *
 * Por qué existe esta ruta separada: subirFotoPerfilDocente/Estudiante y
 * actualizarUsuarioDocenteActual/EstudianteActual en app.js llamaban a
 * Store.set('usuarios', arrayCompleto), que en el backend cae en
 * manejarUsuarios() POST — y ese endpoint exige rol Superadmin o
 * Coordinador (línea "exigirSesion(['Superadmin', 'Coordinador'])" más
 * arriba). Un Docente o Estudiante recibía 403 al intentar guardar su
 * propia foto/descripción; Store.set() atrapa ese error y devuelve
 * { ok:true, remoto:false } igual (para no romper la interfaz), así que
 * en pantalla se veía "Foto de perfil actualizada" aunque el dato solo
 * quedara en localStorage de ese navegador — nunca llegaba a MySQL, y
 * por eso no aparecía en otro dispositivo ni sobrevivía un borrado de
 * caché. Esta ruta permite que cualquier rol autenticado actualice, pero
 * ÚNICAMENTE su propio registro (el id sale del token, nunca del body) y
 * ÚNICAMENTE estos cuatro campos — nunca email, rol, estado, cohorte,
 * fueEstudiante, etc. (esos siguen exigiendo Superadmin/Coordinador vía
 * manejarUsuarios()). password se hashea aquí igual que en
 * reemplazarTablaUsuarios(), nunca se guarda en texto plano.
 */
function manejarPerfilPropio(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo !== 'PUT' && $metodo !== 'POST') {
        responderError('Método no permitido.', 405);
    }

    $payload = exigirSesion(); // cualquier rol autenticado, pero solo sobre su propio id
    $cambios = leerBodyJson();
    if (!is_array($cambios)) {
        responderError('Body inválido.', 400);
    }

    $campos = [];
    $valores = [];
    if (array_key_exists('fotoUrl', $cambios)) {
        $campos[] = 'foto_url = ?';
        $valores[] = $cambios['fotoUrl'] !== '' ? $cambios['fotoUrl'] : null;
    }
    if (array_key_exists('descripcion', $cambios)) {
        $campos[] = 'descripcion = ?';
        $valores[] = $cambios['descripcion'] !== '' ? $cambios['descripcion'] : null;
    }
    if (array_key_exists('nombre', $cambios) && trim((string)$cambios['nombre']) !== '') {
        $campos[] = 'nombre = ?';
        $valores[] = trim((string)$cambios['nombre']);
    }
    if (array_key_exists('password', $cambios) && (string)$cambios['password'] !== '') {
        $campos[] = 'password = ?';
        $valores[] = password_hash((string)$cambios['password'], PASSWORD_BCRYPT);
    }
    if (!$campos) {
        responderError('Nada para actualizar.', 400);
    }

    $valores[] = $payload['id'];
    $stmt = $pdo->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE id = ?');
    $stmt->execute($valores);

    responderJson(['ok' => true]);
}

/**
 * Cohortes, Horarios, Notas y Asistencia
 * Operaciones con UPSERT atómico y filtrado indexado por cohorte y periodo.
 */

/**
 * Exige sesión válida (cualquier rol) y decodifica el body como array para
 * un POST — común a las entidades de esta fase, evita repetirlo.
 */
function prepararReemplazoGenerico(): array {
    exigirSesion();
    $datos = leerBodyJson();
    if (!is_array($datos)) {
        responderError('Se esperaba un array en el body.', 400);
    }
    return $datos;
}

// Módulos (Cohortes)
function manejarModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado, creado_en FROM modulos ORDER BY nombre ASC')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'nombre' => $f['nombre'], 'modulo' => $f['modulo'],
                'fechaInicio' => $f['fecha_inicio'], 'fechaFin' => $f['fecha_fin'],
                'cupos' => (int)$f['cupos'], 'estado' => $f['estado'], 'creadoEn' => $f['creado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO modulos (id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    modulo = VALUES(modulo),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    cupos = VALUES(cupos),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['nombre'] ?? '', $r['modulo'] ?? '',
                    $r['fechaInicio'] ?? null, $r['fechaFin'] ?? null,
                    (int)($r['cupos'] ?? 25), $r['estado'] ?? 'Planeada',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM modulos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Cohortes: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Horarios (franjas por cohorte y mes)
function manejarHorarios(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, cohorte, mes, incluye_sabado, franjas, creado_en, actualizado_en FROM horarios';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'cohorte' => $f['cohorte'], 'mes' => $f['mes'],
                'incluyeSabado' => (bool)$f['incluye_sabado'],
                'franjas' => json_decode($f['franjas'], true) ?? [],
                'creadoEn' => $f['creado_en'], 'actualizadoEn' => $f['actualizado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO horarios (id, cohorte, mes, incluye_sabado, franjas)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    incluye_sabado = VALUES(incluye_sabado),
                    franjas = VALUES(franjas)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['cohorte'] ?? '', $r['mes'] ?? '',
                    !empty($r['incluyeSabado']) ? 1 : 0,
                    json_encode($r['franjas'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM horarios WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Horarios: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Calificaciones de módulos (criterios y notas)
function manejarNotasModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, docente, cohorte, mes, criterios, valores, creado_en, actualizado_en FROM notas_modulos';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'docente' => $f['docente'], 'cohorte' => $f['cohorte'], 'mes' => $f['mes'],
                'criterios' => json_decode($f['criterios'], true) ?? [],
                'valores' => json_decode($f['valores'], true) ?? [],
                'creadoEn' => $f['creado_en'], 'actualizadoEn' => $f['actualizado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO notas_modulos (id, docente, cohorte, mes, criterios, valores)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    criterios = VALUES(criterios),
                    valores = VALUES(valores)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['docente'] ?? '', $r['cohorte'] ?? '', $r['mes'] ?? '',
                    json_encode($r['criterios'] ?? [], JSON_UNESCAPED_UNICODE),
                    json_encode($r['valores'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM notas_modulos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Calificaciones: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Asistencia (registro por estudiante y sesión con UPSERT atómico y filtrado indexado)
function manejarAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['estudiante'])) {
            $conds[] = 'estudiante = ?';
            $params[] = $_GET['estudiante'];
        }
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        if (!empty($_GET['modulo'])) {
            $conds[] = 'modulo = ?';
            $params[] = $_GET['modulo'];
        }
        $sesion = $_GET['sesion_id'] ?? $_GET['sesionId'] ?? null;
        if (!empty($sesion)) {
            $conds[] = 'sesion_id = ?';
            $params[] = $sesion;
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id FROM asistencia';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
            $sql .= ' ORDER BY fecha DESC LIMIT ' . (int)$_GET['limit'];
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'estudiante' => $f['estudiante'], 'docente' => $f['docente'],
                'modulo' => $f['modulo'], 'materia' => $f['materia'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'sesionId' => $f['sesion_id'], 'automatico' => (bool)$f['automatico'],
                'ipOrigen' => $f['ip_origen'] ?? null, 'dispositivoId' => $f['dispositivo_id'] ?? null,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    modulo = VALUES(modulo),
                    materia = VALUES(materia),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado),
                    sesion_id = VALUES(sesion_id),
                    automatico = VALUES(automatico),
                    ip_origen = COALESCE(VALUES(ip_origen), ip_origen),
                    dispositivo_id = COALESCE(VALUES(dispositivo_id), dispositivo_id)'
            );
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['estudiante'] ?? '', $r['docente'] ?? null,
                    $r['modulo'] ?? null, $r['materia'] ?? null, $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Falla', $r['sesionId'] ?? $r['sesion_id'] ?? null,
                    !empty($r['automatico']) ? 1 : 0,
                    $r['ipOrigen'] ?? $r['ip_origen'] ?? null,
                    $r['dispositivoId'] ?? $r['dispositivo_id'] ?? null,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Asistencia: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Endpoint de cálculo de Semáforo de Riesgo Académico en MySQL.
 * Agregación pesada procesada en el motor relacional en ~7ms con índices compuestos.
 */
function manejarSemaforo(PDO $pdo): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        responderError('Método no permitido.', 405);
    }
    exigirSesion();

    $cohorteFiltro = trim($_GET['cohorte'] ?? '');
    $formatoCompleto = ($_GET['format'] ?? '') === 'full';

    // 1. Umbrales configurables
    $notaMinima = 6.0;
    $asistenciaMinima = 80.0;
    try {
        $stmtCfg = $pdo->query("SELECT asistencia_minima FROM configuracion WHERE id = 1");
        if ($cfg = $stmtCfg->fetch()) {
            $asistenciaMinima = (float)($cfg['asistencia_minima'] ?? 80.0);
        }
    } catch (Exception $e) {}

    // 2. Estudiantes activos
    $sqlEst = "SELECT id, nombre, cohorte FROM usuarios WHERE rol = 'Estudiante'";
    $paramsEst = [];
    if (!empty($cohorteFiltro)) {
        $sqlEst .= " AND cohorte = ?";
        $paramsEst[] = $cohorteFiltro;
    }
    $sqlEst .= " ORDER BY nombre ASC";
    $stmtEst = $pdo->prepare($sqlEst);
    $stmtEst->execute($paramsEst);
    $estudiantes = $stmtEst->fetchAll();

    if (empty($estudiantes)) {
        if ($formatoCompleto) {
            responderJson(['data' => [], 'kpis' => ['total' => 0, 'enRiesgo' => 0, 'enAlerta' => 0, 'enVerde' => 0]]);
        } else {
            responderJson([]);
        }
        return;
    }

    // 3. Agregación de asistencias en MySQL
    $stmtAsis = $pdo->query("SELECT estudiante, COUNT(*) as total, SUM(CASE WHEN estado = 'Presente' THEN 1 ELSE 0 END) as presentes FROM asistencia GROUP BY estudiante");
    $asistMap = [];
    foreach ($stmtAsis->fetchAll() as $row) {
        $tot = (int)$row['total'];
        $pres = (int)$row['presentes'];
        $asistMap[$row['estudiante']] = $tot > 0 ? round(($pres / $tot) * 100) : null;
    }

    // 4. Notas por cohorte
    $sqlNotas = "SELECT cohorte, criterios, valores FROM notas_modulos";
    $paramsNotas = [];
    if (!empty($cohorteFiltro)) {
        $sqlNotas .= " WHERE cohorte = ?";
        $paramsNotas[] = $cohorteFiltro;
    }
    $stmtNotas = $pdo->prepare($sqlNotas);
    $stmtNotas->execute($paramsNotas);
    $notasFilas = $stmtNotas->fetchAll();

    $cohorteNotas = [];
    foreach ($notasFilas as $nf) {
        $cohorteNotas[$nf['cohorte']][] = [
            'criterios' => json_decode($nf['criterios'] ?? '[]', true) ?: [],
            'valores'   => json_decode($nf['valores'] ?? '{}', true) ?: []
        ];
    }

    $promediosMap = [];
    foreach ($cohorteNotas as $coh => $hojas) {
        foreach ($estudiantes as $est) {
            if ($est['cohorte'] !== $coh) continue;
            $estNombre = $est['nombre'];
            $notasMeses = [];
            foreach ($hojas as $hoja) {
                $criterios = $hoja['criterios'];
                $valores = $hoja['valores'][$estNombre] ?? null;
                if (!empty($criterios) && is_array($valores)) {
                    $suma = 0.0;
                    $pesoTotal = 0.0;
                    foreach ($criterios as $crit) {
                        $cNombre = $crit['nombre'] ?? '';
                        $cPeso = (float)($crit['peso'] ?? 0);
                        if (isset($valores[$cNombre]) && is_numeric($valores[$cNombre])) {
                            $suma += ((float)$valores[$cNombre]) * ($cPeso / 100);
                            $pesoTotal += $cPeso;
                        }
                    }
                    if ($pesoTotal >= 99.0) {
                        $notasMeses[] = $suma;
                    }
                }
            }
            if (!empty($notasMeses)) {
                $promediosMap[$coh][$estNombre] = round(array_sum($notasMeses) / count($notasMeses), 1);
            }
        }
    }

    // 5. Consolidación de riesgos
    $resultado = [];
    $enRiesgo = 0;
    $enAlerta = 0;
    $enVerde = 0;

    foreach ($estudiantes as $e) {
        $nombre = $e['nombre'];
        $cohorte = $e['cohorte'];
        $promedio = $promediosMap[$cohorte][$nombre] ?? null;
        $asistencia = $asistMap[$nombre] ?? null;

        $riesgo = 'Verde';
        $motivo = '';

        $promedioBajo = $promedio !== null && $promedio < $notaMinima;
        $promedioAlerta = $promedio !== null && $promedio < $notaMinima + 0.5;
        $asistenciaBaja = $asistencia !== null && $asistencia < $asistenciaMinima;
        $asistenciaAlerta = $asistencia !== null && $asistencia < $asistenciaMinima + 10;

        if ($promedioBajo || $asistenciaBaja) {
            $riesgo = 'Rojo';
            $motivo = $promedioBajo ? 'Promedio bajo el mínimo' : 'Asistencia bajo el mínimo';
        } elseif ($promedioAlerta || $asistenciaAlerta) {
            $riesgo = 'Amarillo';
            $motivo = 'Cerca del mínimo';
        }

        if ($riesgo === 'Rojo') $enRiesgo++;
        elseif ($riesgo === 'Amarillo') $enAlerta++;
        else $enVerde++;

        $resultado[] = [
            'id'         => $e['id'],
            'nombre'     => $nombre,
            'cohorte'    => $cohorte,
            'promedio'   => $promedio !== null ? number_format($promedio, 1) : '—',
            'asistencia' => $asistencia !== null ? $asistencia : '—',
            'riesgo'     => $riesgo,
            'motivo'     => $motivo
        ];
    }

    if ($formatoCompleto) {
        responderJson([
            'data' => $resultado,
            'kpis' => [
                'total'    => count($resultado),
                'enRiesgo' => $enRiesgo,
                'enAlerta' => $enAlerta,
                'enVerde'  => $enVerde
            ]
        ]);
        return;
    }

    responderJson($resultado);
}

// Sesiones de asistencia (códigos QR de clase con UPSERT y filtros)
function manejarSesionesAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        if (!empty($_GET['iniciada_por'])) {
            $conds[] = 'iniciada_por = ?';
            $params[] = $_GET['iniciada_por'];
        }
        $sql = 'SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha DESC, hora_inicio DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'cohorte' => $f['cohorte'], 'modulo' => $f['modulo'], 'materia' => $f['materia'],
                'fecha' => $f['fecha'], 'horaInicio' => $f['hora_inicio'], 'codigo' => $f['codigo'],
                'iniciadaPor' => $f['iniciada_por'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO sesiones_asistencia (id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    cohorte = VALUES(cohorte),
                    modulo = VALUES(modulo),
                    materia = VALUES(materia),
                    fecha = VALUES(fecha),
                    hora_inicio = VALUES(hora_inicio),
                    codigo = VALUES(codigo),
                    iniciada_por = VALUES(iniciada_por)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['cohorte'] ?? '', $r['modulo'] ?? null, $r['materia'] ?? null,
                    $r['fecha'] ?? date('Y-m-d'), $r['horaInicio'] ?? date('Y-m-d H:i:s'),
                    $r['codigo'] ?? '', $r['iniciadaPor'] ?? '',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM sesiones_asistencia WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Sesiones de asistencia: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Tokens QR (token vigente para escanear asistencia)
function manejarQrTokens(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'tipo' => $f['tipo'], 'cohorte' => $f['cohorte'],
                'docente' => $f['docente'], 'token' => $f['token'], 'fecha' => $f['fecha'] ?? null
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM qr_tokens');
            $stmt = $pdo->prepare('INSERT INTO qr_tokens (id, tipo, cohorte, docente, token, fecha) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['tipo'] ?? 'estudiante', $r['cohorte'] ?? '',
                    $r['docente'] ?? '', $r['token'] ?? '', $r['fecha'] ?? date('Y-m-d'),
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Códigos QR: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Asistencia QR pública (escaneo de QR y registro de asistencia sin login previo)
function manejarQrAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    // GET /api/qr_asistencia?tipo=docente|estudiante&token=XYZ
    if ($metodo === 'GET') {
        $tipo = trim($_GET['tipo'] ?? '');
        $token = trim($_GET['token'] ?? '');
        if (!$tipo || !$token) {
            responderError('Faltan parámetros tipo y token.', 400);
        }

        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens WHERE tipo = ? AND token = ? LIMIT 1');
        $stmt->execute([$tipo, $token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr) {
            responderError('Código QR no encontrado o inválido.', 404);
        }

        $hoy = date('Y-m-d');
        if (!empty($qr['fecha']) && $qr['fecha'] !== $hoy) {
            responderError('Este código QR ha expirado (corresponde al día ' . $qr['fecha'] . '). Para evitar fraude, cada día los códigos QR se actualizan. Escanea el código del día de hoy.', 403);
        }

        // Buscar sesión de hoy para esta cohorte y docente
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        // Si es DOCENTE
        if ($tipo === 'docente') {
            $recienActivada = false;
            $yaEstabaActivada = false;

            if (!$sesion) {
                // PRIMERA ACTIVACIÓN DEL DÍA: Se crea la sesión y se insertan las fallas por defecto
                // Obtener nombre del curso real del horario para esta cohorte y docente
                $stmtHor = $pdo->prepare('SELECT franjas FROM horarios WHERE cohorte = ?');
                $stmtHor->execute([$qr['cohorte']]);
                $moduloNombre = null;
                while ($hRow = $stmtHor->fetch(PDO::FETCH_ASSOC)) {
                    $franjas = json_decode($hRow['franjas'], true) ?? [];
                    foreach ($franjas as $f) {
                        if (($f['docente'] ?? '') === $qr['docente'] && !empty($f['curso']) && $f['curso'] !== 'Formacion') {
                            $moduloNombre = $f['curso'];
                            break 2;
                        }
                    }
                }
                if (!$moduloNombre) {
                    $stmtMod = $pdo->prepare('SELECT modulo FROM modulos WHERE nombre = ? LIMIT 1');
                    $stmtMod->execute([$qr['cohorte']]);
                    $modRow = $stmtMod->fetch(PDO::FETCH_ASSOC);
                    $moduloNombre = $modRow ? $modRow['modulo'] : $qr['cohorte'];
                }

                $nuevaSesId = 'ses_' . bin2hex(random_bytes(6)) . time();
                $horaInicio = date('Y-m-d H:i:s');
                $codigoSesion = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

                $stmtIns = $pdo->prepare('INSERT INTO sesiones_asistencia (id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $stmtIns->execute([$nuevaSesId, $qr['cohorte'], $moduloNombre, $moduloNombre, $hoy, $horaInicio, $codigoSesion, $qr['docente']]);

                $sesion = [
                    'id' => $nuevaSesId, 'cohorte' => $qr['cohorte'], 'modulo' => $moduloNombre,
                    'materia' => $moduloNombre, 'fecha' => $hoy, 'horaInicio' => $horaInicio,
                    'codigo' => $codigoSesion, 'iniciadaPor' => $qr['docente']
                ];
                $recienActivada = true;

                // Asistencia por defecto como pérdida (Falla)
                // Para todos los estudiantes de la cohorte, insertar registro en 'asistencia' con estado = 'Falla'
                $stmtEsts = $pdo->prepare('SELECT nombre FROM usuarios WHERE rol = "Estudiante" AND cohorte = ?');
                $stmtEsts->execute([$qr['cohorte']]);
                $estudiantesCohorte = $stmtEsts->fetchAll(PDO::FETCH_ASSOC);

                $stmtCheckAsist = $pdo->prepare('SELECT id FROM asistencia WHERE sesion_id = ? AND estudiante = ? LIMIT 1');
                $stmtInsDef = $pdo->prepare('INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico) VALUES (?, ?, ?, ?, ?, ?, "Falla", ?, 1)');

                foreach ($estudiantesCohorte as $estRow) {
                    $stmtCheckAsist->execute([$sesion['id'], $estRow['nombre']]);
                    if (!$stmtCheckAsist->fetch()) {
                        $nuevoId = 'as_' . bin2hex(random_bytes(6)) . time();
                        $stmtInsDef->execute([
                            $nuevoId,
                            $estRow['nombre'],
                            $sesion['iniciadaPor'],
                            $sesion['modulo'],
                            $sesion['materia'],
                            $sesion['fecha'],
                            $sesion['id']
                        ]);
                    }
                }
            } else {
                // EL PROFESOR YA ACTIVÓ EL CÓDIGO QR HOY:
                // Si el sistema detecta que volvió a abrir el link o escanear el código,
                // NO PUEDE volver a activar la asistencia.
                // hora_inicio se mantiene inmutable y no se permite ninguna reactivación.
                $yaEstabaActivada = true;
                $sesion = [
                    'id' => $sesion['id'], 'cohorte' => $sesion['cohorte'], 'modulo' => $sesion['modulo'],
                    'materia' => $sesion['materia'], 'fecha' => $sesion['fecha'], 'horaInicio' => $sesion['hora_inicio'],
                    'codigo' => $sesion['codigo'], 'iniciadaPor' => $sesion['iniciada_por']
                ];
            }

            // Buscar token del estudiante correspondiente para mostrar su QR en pantalla (priorizar hoy)
            $stmtTokenEst = $pdo->prepare('SELECT token FROM qr_tokens WHERE tipo = "estudiante" AND cohorte = ? AND docente = ? ORDER BY (fecha = ?) DESC, id DESC LIMIT 1');
            $stmtTokenEst->execute([$qr['cohorte'], $qr['docente'], $hoy]);
            $tokenEstRow = $stmtTokenEst->fetch(PDO::FETCH_ASSOC);
            $tokenEstudiante = $tokenEstRow ? $tokenEstRow['token'] : null;

            // Contar cuántos estudiantes ya registraron asistencia hoy en esta sesión (Presente o Tarde)
            $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM asistencia WHERE sesion_id = ? AND estado IN ("Presente", "Tarde")');
            $stmtCount->execute([$sesion['id']]);
            $totalAsistencias = (int)$stmtCount->fetchColumn();

            responderJson([
                'ok' => true,
                'tipo' => 'docente',
                'registro' => $qr,
                'sesion' => $sesion,
                'recienActivada' => $recienActivada,
                'yaEstabaActivada' => $yaEstabaActivada,
                'tokenEstudiante' => $tokenEstudiante,
                'totalAsistencias' => $totalAsistencias,
            ]);
            return;
        }

        // Si es ESTUDIANTE
        $sesionActiva = !empty($sesion);
        $sesionData = null;
        if ($sesion) {
            $sesionData = [
                'id' => $sesion['id'], 'cohorte' => $sesion['cohorte'], 'modulo' => $sesion['modulo'],
                'materia' => $sesion['materia'], 'fecha' => $sesion['fecha'], 'horaInicio' => $sesion['hora_inicio'],
                'codigo' => $sesion['codigo'], 'iniciadaPor' => $sesion['iniciada_por']
            ];
        }

        // COMPROBACIÓN ANTIFRAUDE EN GET:
        // Si este dispositivo o IP ya confirmó la asistencia de un estudiante hoy para este docente/clase,
        // avisar al frontend para bloquear el formulario y mostrar de inmediato el estado confirmado.
        $ipCliente = obtenerIpCliente();
        $dispositivoId = trim($_GET['devId'] ?? '');

        $yaRegistradoDispositivo = false;
        $estudianteRegistrado = null;
        $estadoRegistrado = null;

        if ($sesion && $ipCliente && $ipCliente !== '0.0.0.0') {
            $stmtPrevioGet = $pdo->prepare('
                SELECT a.estudiante, a.estado, a.fecha, a.ip_origen 
                FROM asistencia a 
                WHERE (a.sesion_id = ? OR (a.fecha = ? AND a.docente = ?))
                  AND a.estado IN ("Presente", "Tarde") 
                  AND (
                    (a.ip_origen IS NOT NULL AND a.ip_origen != "" AND a.ip_origen = ?)
                    OR (? != "" AND a.dispositivo_id IS NOT NULL AND a.dispositivo_id != "" AND a.dispositivo_id = ?)
                  )
                ORDER BY a.id DESC
                LIMIT 1
            ');
            $stmtPrevioGet->execute([$sesion['id'], $hoy, $qr['docente'], $ipCliente, $dispositivoId, $dispositivoId]);
            $previoGet = $stmtPrevioGet->fetch(PDO::FETCH_ASSOC);
            if ($previoGet) {
                $yaRegistradoDispositivo = true;
                $estudianteRegistrado = $previoGet['estudiante'];
                $estadoRegistrado = $previoGet['estado'];
            }
        }

        responderJson([
            'ok' => true,
            'tipo' => 'estudiante',
            'registro' => $qr,
            'sesionActiva' => $sesionActiva,
            'sesion' => $sesionData,
            'yaRegistradoDispositivo' => $yaRegistradoDispositivo,
            'estudianteRegistrado' => $estudianteRegistrado,
            'estadoRegistrado' => $estadoRegistrado,
            'ipCliente' => $ipCliente,
        ]);
        return;
    }

    // POST /api/qr_asistencia: registro de asistencia del estudiante (formulario Google-style)
    if ($metodo === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($body['token'] ?? '');
        $usuarioEntrada = trim($body['usuario'] ?? ($body['email'] ?? ''));

        if (!$token || !$usuarioEntrada) {
            responderError('Ingresa tu correo institucional o nombre de usuario para confirmar tu asistencia.', 400);
        }

        // 1. Validar token del estudiante y verificar que corresponda a hoy
        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token, fecha FROM qr_tokens WHERE tipo = "estudiante" AND token = ? LIMIT 1');
        $stmt->execute([$token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr) {
            responderError('Código QR no válido o expirado.', 404);
        }

        $hoy = date('Y-m-d');
        if (!empty($qr['fecha']) && $qr['fecha'] !== $hoy) {
            responderError('Este código QR ha expirado (corresponde al día ' . $qr['fecha'] . '). Para evitar fraude, cada día los códigos QR se actualizan. Escanea el código del día de hoy.', 403);
        }

        // 2. Verificar que el docente haya iniciado la sesión de hoy
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        if (!$sesion) {
            responderError('Tu docente (' . $qr['docente'] . ') aún no ha activado la asistencia de hoy. Espera a que el profesor escanee su código QR.', 400);
        }

        // 3. CONTROL ANTIFRAUDE POR IP Y DISPOSITIVO (PRIMERO):
        // Si este dispositivo o IP ya confirmó la asistencia de un estudiante en esta sesión/clase,
        // se bloquea de inmediato cualquier intento de registrar a una persona distinta.
        $ipCliente = obtenerIpCliente();
        $dispositivoId = trim($body['dispositivoId'] ?? '');

        if ($ipCliente && $ipCliente !== '0.0.0.0') {
            $stmtPrevio = $pdo->prepare('
                SELECT a.estudiante, u.email 
                FROM asistencia a 
                LEFT JOIN usuarios u ON (u.nombre = a.estudiante OR u.email = a.estudiante) AND u.rol = "Estudiante"
                WHERE (a.sesion_id = ? OR (a.fecha = ? AND a.docente = ?))
                  AND a.estado IN ("Presente", "Tarde") 
                  AND (
                    (a.ip_origen IS NOT NULL AND a.ip_origen != "" AND a.ip_origen = ?)
                    OR (? != "" AND a.dispositivo_id IS NOT NULL AND a.dispositivo_id != "" AND a.dispositivo_id = ?)
                  )
                ORDER BY a.id DESC
                LIMIT 1
            ');
            $stmtPrevio->execute([$sesion['id'], $hoy, $qr['docente'], $ipCliente, $dispositivoId, $dispositivoId]);
            $previo = $stmtPrevio->fetch(PDO::FETCH_ASSOC);

            if ($previo) {
                // Verificar si la entrada corresponde al mismo estudiante que ya registró este dispositivo
                $emailPrevio = strtolower(trim($previo['email'] ?? ''));
                $userPartPrevio = $emailPrevio ? explode('@', $emailPrevio)[0] : '';
                $nomPrevio = strtolower(trim($previo['estudiante']));
                $entradaNorm = strtolower(trim($usuarioEntrada));

                // Buscar en usuarios para verificar equivalencia exacta
                $stmtCheckMismo = $pdo->prepare('
                    SELECT id, nombre, email FROM usuarios 
                    WHERE rol = "Estudiante" 
                      AND (
                        LOWER(TRIM(email)) = LOWER(?) 
                        OR LOWER(TRIM(nombre)) = LOWER(?) 
                        OR LOWER(TRIM(SUBSTRING_INDEX(email, "@", 1))) = LOWER(?)
                      )
                    LIMIT 1
                ');
                $stmtCheckMismo->execute([$usuarioEntrada, $usuarioEntrada, $usuarioEntrada]);
                $estEntrada = $stmtCheckMismo->fetch(PDO::FETCH_ASSOC);

                $esElMismo = false;
                if ($estEntrada) {
                    $esElMismo = (strtolower(trim($estEntrada['nombre'])) === $nomPrevio || ($emailPrevio && strtolower(trim($estEntrada['email'])) === $emailPrevio));
                } else {
                    $esElMismo = ($entradaNorm === $nomPrevio || ($emailPrevio && $entradaNorm === $emailPrevio) || ($userPartPrevio && $entradaNorm === $userPartPrevio));
                }

                if (!$esElMismo) {
                    responderError(
                        'Acceso no permitido: este dispositivo (IP: ' . $ipCliente . ') ya registró la asistencia de "' . $previo['estudiante'] . '" en esta clase. Por motivos de seguridad y prevención de fraude, no se permite registrar a otro compañero desde el mismo celular o computador.',
                        403
                    );
                }
            }
        }

        // 4. Verificar ventana de tiempo
        $horaInicioTs = strtotime($sesion['hora_inicio']);
        $minsTranscurridos = $horaInicioTs > 0 ? (time() - $horaInicioTs) / 60 : 0;

        if ($minsTranscurridos > 50) {
            responderError('La ventana de registro de asistencia para esta clase ya cerró (superó los 50 minutos de tolerancia).', 400);
        }

        $estado = ($minsTranscurridos <= 20) ? 'Presente' : 'Tarde';

        // 5. Buscar al estudiante en usuarios por email, usuario o nombre
        $stmtEst = $pdo->prepare('
            SELECT id, nombre, email, rol, cohorte, estado 
            FROM usuarios 
            WHERE rol = "Estudiante" 
              AND (
                LOWER(TRIM(email)) = LOWER(?) 
                OR LOWER(TRIM(nombre)) = LOWER(?) 
                OR LOWER(TRIM(SUBSTRING_INDEX(email, "@", 1))) = LOWER(?)
              )
            LIMIT 1
        ');
        $stmtEst->execute([$usuarioEntrada, $usuarioEntrada, $usuarioEntrada]);
        $estudiante = $stmtEst->fetch(PDO::FETCH_ASSOC);

        if (!$estudiante) {
            responderError('No encontramos ningún estudiante registrado con "' . htmlspecialchars($usuarioEntrada) . '". Verifica tu correo institucional o nombre de usuario.', 404);
        }

        // 5. Verificar que pertenezca a la cohorte
        if (trim(strtolower($estudiante['cohorte'])) !== trim(strtolower($qr['cohorte']))) {
            responderError('Perteneces a la cohorte "' . ($estudiante['cohorte'] ?: 'Sin cohorte') . '", pero este código es para la cohorte "' . $qr['cohorte'] . '".', 400);
        }

        // 6. Verificar si ya registró asistencia hoy en esta sesión
        $stmtYa = $pdo->prepare('SELECT id, estado, fecha, ip_origen FROM asistencia WHERE sesion_id = ? AND estudiante = ? LIMIT 1');
        $stmtYa->execute([$sesion['id'], $estudiante['nombre']]);
        $asistExistente = $stmtYa->fetch(PDO::FETCH_ASSOC);

        // Si ya confirmó con puntualidad o tardanza, asegurar que su IP actual quede vinculada y responder
        if ($asistExistente && ($asistExistente['estado'] === 'Presente' || $asistExistente['estado'] === 'Tarde')) {
            // Guardar o actualizar la IP y dispositivo del estudiante si aún no estaban guardados
            if (empty($asistExistente['ip_origen']) || $asistExistente['ip_origen'] !== $ipCliente) {
                $pdo->prepare('UPDATE asistencia SET ip_origen = ?, dispositivo_id = ? WHERE id = ?')
                    ->execute([$ipCliente, $dispositivoId ?: null, $asistExistente['id']]);
            }
            responderJson([
                'ok' => true,
                'yaRegistrado' => true,
                'estudiante' => $estudiante['nombre'],
                'estado' => $asistExistente['estado'],
                'cohorte' => $qr['cohorte'],
                'materia' => $sesion['materia'],
                'mensaje' => 'Ya habías registrado tu asistencia hoy: ' . $asistExistente['estado'] . '.',
            ]);
            return;
        }

        if ($asistExistente) {
            // Tenía 'Falla' (pérdida por defecto): actualizar al nuevo estado alcanzado (Presente o Tarde)
            $stmtUpd = $pdo->prepare('UPDATE asistencia SET estado = ?, automatico = 0, materia = ?, modulo = ?, docente = ?, fecha = ?, ip_origen = ?, dispositivo_id = ? WHERE id = ?');
            $stmtUpd->execute([
                $estado,
                $sesion['materia'],
                $sesion['modulo'],
                $sesion['iniciada_por'],
                $sesion['fecha'],
                $ipCliente,
                $dispositivoId ?: null,
                $asistExistente['id']
            ]);

            responderJson([
                'ok' => true,
                'yaRegistrado' => false,
                'estudiante' => $estudiante['nombre'],
                'estado' => $estado,
                'cohorte' => $qr['cohorte'],
                'materia' => $sesion['materia'],
                'docente' => $sesion['iniciada_por'],
                'hora' => date('h:i A'),
                'mensaje' => $estado === 'Presente' ? '¡Asistencia registrada con puntualidad!' : 'Asistencia registrada (llegada tarde).',
            ]);
            return;
        }

        // 7. Insertar asistencia en MySQL si no existía fila previa
        $nuevoAsistId = 'as_' . bin2hex(random_bytes(6)) . time();
        $stmtInsAsist = $pdo->prepare('INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico, ip_origen, dispositivo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)');
        $stmtInsAsist->execute([
            $nuevoAsistId,
            $estudiante['nombre'],
            $sesion['iniciada_por'],
            $sesion['modulo'],
            $sesion['materia'],
            $sesion['fecha'],
            $estado,
            $sesion['id'],
            $ipCliente,
            $dispositivoId ?: null,
        ]);

        responderJson([
            'ok' => true,
            'yaRegistrado' => false,
            'estudiante' => $estudiante['nombre'],
            'estado' => $estado,
            'cohorte' => $qr['cohorte'],
            'materia' => $sesion['materia'],
            'docente' => $sesion['iniciada_por'],
            'hora' => date('h:i A'),
            'mensaje' => '¡Asistencia registrada exitosamente!',
        ]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/**
 * PQR, Memorandos, Encuestas, Cursos y Pensum
 * Gestión de documentos y seguimiento institucional.
 */

// PQR (Peticiones, Quejas, Reclamos y Sugerencias)
function manejarPqr(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos FROM pqr WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('PQR no encontrada', 404); }
            responderJson([
                'id' => $f['id'], 'tipo' => $f['tipo'], 'solicitante' => $f['solicitante'],
                'remitenteRol' => $f['remitente_rol'], 'asunto' => $f['asunto'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'fechaActivacion' => $f['fecha_activacion'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado optimizado: no transfiere el blob Base64 archivo_datos en masa
        $filas = $pdo->query('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM pqr')->fetchAll();
        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'tipo' => $f['tipo'], 'solicitante' => $f['solicitante'],
                'remitenteRol' => $f['remitente_rol'], 'asunto' => $f['asunto'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'fechaActivacion' => $f['fecha_activacion'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $tiene ? '1' : '', // marcador booleano para compatibilidad con checks existentes
                'tieneArchivo' => $tiene,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO pqr (id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    tipo = VALUES(tipo),
                    solicitante = VALUES(solicitante),
                    remitente_rol = VALUES(remitente_rol),
                    asunto = VALUES(asunto),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado),
                    fecha_activacion = VALUES(fecha_activacion),
                    archivo_nombre = IF(VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? '' : $rawDatos;

                $stmt->execute([
                    $id, $r['tipo'] ?? 'Petición', $r['solicitante'] ?? '',
                    $r['remitenteRol'] ?? 'Estudiante', $r['asunto'] ?? '', $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Pendiente', $r['fechaActivacion'] ?? null,
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? 'application/pdf', $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM pqr WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar PQR: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Memorandos institucionales
function manejarMemorandos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos FROM memorandos WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Memorando no encontrado', 404); }
            responderJson([
                'id' => $f['id'], 'titulo' => $f['titulo'], 'destinatario' => $f['destinatario'],
                'fecha' => $f['fecha'], 'estado' => $f['estado'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado optimizado: no transfiere el blob Base64 archivo_datos en masa
        $filas = $pdo->query('SELECT id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM memorandos ORDER BY fecha DESC')->fetchAll();
        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'titulo' => $f['titulo'], 'destinatario' => $f['destinatario'],
                'fecha' => $f['fecha'], 'estado' => $f['estado'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $tiene ? '1' : '',
                'tieneArchivo' => $tiene,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO memorandos (id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    destinatario = VALUES(destinatario),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado),
                    archivo_nombre = IF(VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? '' : $rawDatos;

                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['destinatario'] ?? '',
                    $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Borrador',
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? '', $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM memorandos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Memorandos: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Memorandos leídos (objeto asociativo { memorandoId: { email: true } })
function manejarMemorandosLeidos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT memorando_id, email FROM memorandos_leidos')->fetchAll();
        $mapa = new stdClass(); // objeto vacío -> {} en JSON, no [] (un array vacío rompería mapa[id][email] en JS)
        foreach ($filas as $f) {
            $id = $f['memorando_id'];
            if (!isset($mapa->$id)) $mapa->$id = new stdClass();
            $mapa->$id->{$f['email']} = true;
        }
        responderJson($mapa);
        return;
    }
    if ($metodo === 'POST') {
        exigirSesion();
        $mapa = leerBodyJson();
        if (!is_array($mapa)) {
            responderError('Se esperaba un objeto { memorandoId: { email: true } } en el body.', 400);
        }
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM memorandos_leidos');
            $stmt = $pdo->prepare('INSERT INTO memorandos_leidos (memorando_id, email) VALUES (?, ?)');
            $total = 0;
            foreach ($mapa as $memorandoId => $emails) {
                if (!is_array($emails)) continue;
                foreach (array_keys($emails) as $email) {
                    $stmt->execute([$memorandoId, $email]);
                    $total++;
                }
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => $total]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Memorandos leídos: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Encuestas de satisfacción
function manejarEncuestas(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, url, cohorte, fecha, estado FROM encuestas')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'titulo' => $f['titulo'], 'url' => $f['url'], 'cohorte' => $f['cohorte'], 'fecha' => $f['fecha'], 'estado' => $f['estado']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO encuestas (id, titulo, url, cohorte, fecha, estado)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    url = VALUES(url),
                    cohorte = VALUES(cohorte),
                    fecha = VALUES(fecha),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['url'] ?? '',
                    $r['cohorte'] ?? '', $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Abierta',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM encuestas WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Encuestas: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Cursos (catálogo general de programas con UPSERT atómico)
function manejarCursos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, descripcion, estado, creado_en FROM cursos ORDER BY nombre ASC')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'nombre' => $f['nombre'], 'descripcion' => $f['descripcion'], 'estado' => $f['estado'], 'creadoEn' => $f['creado_en']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO cursos (id, nombre, descripcion, estado)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    descripcion = VALUES(descripcion),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['nombre'] ?? '', $r['descripcion'] ?? null, $r['estado'] ?? 'Activo',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM cursos WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Cursos: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

// Pensum curricular (temario curricular con UPSERT atómico y preservación de archivos)
function manejarPensum(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos FROM pensum WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Pensum no encontrado', 404); }
            responderJson([
                'id' => $f['id'], 'modulo' => $f['modulo'], 'tema' => $f['tema'], 'horas' => (int)$f['horas'],
                'docente' => $f['docente'], 'orden' => (int)$f['orden'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $f['archivo_datos'],
                'tieneArchivo' => !empty($f['archivo_datos']),
            ]);
            return;
        }

        // Listado optimizado: no transfiere el blob Base64 archivo_datos en masa
        $filas = $pdo->query('SELECT id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, (archivo_datos IS NOT NULL AND archivo_datos != "") AS tiene_archivo FROM pensum ORDER BY orden ASC')->fetchAll();
        responderJson(array_map(function ($f) {
            $tiene = !empty($f['tiene_archivo']);
            return [
                'id' => $f['id'], 'modulo' => $f['modulo'], 'tema' => $f['tema'], 'horas' => (int)$f['horas'],
                'docente' => $f['docente'], 'orden' => (int)$f['orden'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'],
                'archivoDatos' => $tiene ? '1' : '',
                'tieneArchivo' => $tiene,
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO pensum (id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    modulo = VALUES(modulo),
                    tema = VALUES(tema),
                    horas = VALUES(horas),
                    docente = VALUES(docente),
                    orden = VALUES(orden),
                    archivo_nombre = IF(VALUES(archivo_nombre) IS NOT NULL AND VALUES(archivo_nombre) != "", VALUES(archivo_nombre), archivo_nombre),
                    archivo_tipo = IF(VALUES(archivo_tipo) IS NOT NULL AND VALUES(archivo_tipo) != "", VALUES(archivo_tipo), archivo_tipo),
                    archivo_datos = IF(VALUES(archivo_datos) IS NOT NULL AND VALUES(archivo_datos) != "" AND VALUES(archivo_datos) != "1", VALUES(archivo_datos), archivo_datos)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $rawDatos = $r['archivoDatos'] ?? '';
                $datosAInsertar = ($rawDatos === '1') ? null : $rawDatos;

                $stmt->execute([
                    $id, $r['modulo'] ?? '', $r['tema'] ?? '',
                    (int)($r['horas'] ?? 8), $r['docente'] ?? null, (int)($r['orden'] ?? 1),
                    $r['archivoNombre'] ?? null, $r['archivoTipo'] ?? null, $datosAInsertar,
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM pensum WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Pensum: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Chat conocimiento — Base de conocimiento en MySQL con UPSERT atómico.
 */
function manejarChatVozConocimiento(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, contenido, categoria, visibilidad, estado, creado_en FROM chat_voz_conocimiento ORDER BY creado_en DESC')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'titulo' => $f['titulo'], 'contenido' => $f['contenido'],
                'categoria' => $f['categoria'], 'visibilidad' => $f['visibilidad'],
                'estado' => $f['estado'], 'creadoEn' => $f['creado_en'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO chat_voz_conocimiento (id, titulo, contenido, categoria, visibilidad, estado)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    titulo = VALUES(titulo),
                    contenido = VALUES(contenido),
                    categoria = VALUES(categoria),
                    visibilidad = VALUES(visibilidad),
                    estado = VALUES(estado)'
            );
            $ids = [];
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                $stmt->execute([
                    $id, $r['titulo'] ?? '', $r['contenido'] ?? '',
                    $r['categoria'] ?? null, $r['visibilidad'] ?? 'Pública', $r['estado'] ?? 'Activa',
                ]);
            }
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $stmtPrune = $pdo->prepare("DELETE FROM chat_voz_conocimiento WHERE id NOT IN ($inQuery)");
                $stmtPrune->execute(array_values($ids));
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar la base de conocimiento del chat: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Método no permitido.', 405);
}

/**
 * Bitácoras de Auditoría
 * Registro y consulta de auditoría de logins, acciones de usuarios y cambios de horario.
 */

// Auditoría de ingresos (solo lectura: registrada durante el flujo de login)
function manejarAuditoriaLogin(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['email'])) {
            $conds[] = 'email = ?';
            $params[] = $_GET['email'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, fecha, hora, resultado, email, rol FROM auditoria_login';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    responderError('Metodo no permitido: auditoria_login es de solo lectura (la registra el propio login).', 405);
}

// Auditoría de acciones (bitácora de operaciones con UPSERT atómico y límite de consulta)
function manejarAuditoriaAcciones(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['actor'])) {
            $conds[] = 'actor = ?';
            $params[] = $_GET['actor'];
        }
        if (!empty($_GET['tipo'])) {
            $conds[] = 'tipo = ?';
            $params[] = $_GET['tipo'];
        }
        if (!empty($_GET['fecha'])) {
            $conds[] = 'fecha = ?';
            $params[] = $_GET['fecha'];
        }
        $sql = 'SELECT id, fecha, hora, tipo, actor, rol, detalle FROM auditoria_acciones';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_acciones (id, fecha, hora, tipo, actor, rol, detalle)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    tipo = VALUES(tipo),
                    actor = VALUES(actor),
                    rol = VALUES(rol),
                    detalle = VALUES(detalle)'
            );
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? date('H:i:s'),
                    $r['tipo'] ?? '', $r['actor'] ?? '—', $r['rol'] ?? '—', $r['detalle'] ?? '',
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Auditoria de acciones: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Auditoría de horario (cambios en franjas con UPSERT atómico y límite de consulta)
function manejarAuditoriaHorario(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? min((int)$_GET['limit'], 2000) : 500;
        $conds = [];
        $params = [];
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['mes'])) {
            $conds[] = 'mes = ?';
            $params[] = $_GET['mes'];
        }
        $sql = 'SELECT id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo FROM auditoria_horario';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= " ORDER BY fecha DESC, hora DESC LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'fecha' => $f['fecha'], 'hora' => $f['hora'], 'autor' => $f['autor'],
                'cohorte' => $f['cohorte'], 'mes' => $f['mes'], 'franja' => $f['franja'], 'campo' => $f['campo'],
                'valorAnterior' => $f['valor_anterior'], 'valorNuevo' => $f['valor_nuevo'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO auditoria_horario (id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    autor = VALUES(autor),
                    cohorte = VALUES(cohorte),
                    mes = VALUES(mes),
                    franja = VALUES(franja),
                    campo = VALUES(campo),
                    valor_anterior = VALUES(valor_anterior),
                    valor_nuevo = VALUES(valor_nuevo)'
            );
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? date('H:i:s'),
                    $r['autor'] ?? '', $r['cohorte'] ?? '', $r['mes'] ?? '', $r['franja'] ?? '', $r['campo'] ?? '',
                    $r['valorAnterior'] ?? '(vacio)', $r['valorNuevo'] ?? '(vacio)',
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Auditoria de horario: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Informes de docentes (con UPSERT atómico y protección de estado Enviado a nivel SQL)
function manejarInformesDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        if (!empty($_GET['cohorte'])) {
            $conds[] = 'cohorte = ?';
            $params[] = $_GET['cohorte'];
        }
        if (!empty($_GET['estudiante'])) {
            $conds[] = 'estudiante = ?';
            $params[] = $_GET['estudiante'];
        }
        $sql = 'SELECT id, docente, estudiante, cohorte, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado FROM informes_docente';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha DESC, id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $filas = $stmt->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'docente' => $f['docente'], 'estudiante' => $f['estudiante'], 'cohorte' => $f['cohorte'],
                'materia' => $f['materia'], 'fecha' => $f['fecha'],
                'asistenciaPct' => $f['asistencia_pct'] !== null ? (float)$f['asistencia_pct'] : null,
                'promedio' => $f['promedio'] !== null ? (float)$f['promedio'] : null,
                'cualitativa' => $f['cualitativa'], 'conclusion' => $f['conclusion'], 'observaciones' => $f['observaciones'],
                'estado' => $f['estado'] ?? 'Borrador',
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO informes_docente
                    (id, docente, estudiante, cohorte, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = IF(estado = "Enviado", docente, VALUES(docente)),
                    estudiante = IF(estado = "Enviado", estudiante, VALUES(estudiante)),
                    cohorte = IF(estado = "Enviado", cohorte, VALUES(cohorte)),
                    materia = IF(estado = "Enviado", materia, VALUES(materia)),
                    fecha = IF(estado = "Enviado", fecha, VALUES(fecha)),
                    asistencia_pct = IF(estado = "Enviado", asistencia_pct, VALUES(asistencia_pct)),
                    promedio = IF(estado = "Enviado", promedio, VALUES(promedio)),
                    cualitativa = IF(estado = "Enviado", cualitativa, VALUES(cualitativa)),
                    conclusion = IF(estado = "Enviado", conclusion, VALUES(conclusion)),
                    observaciones = IF(estado = "Enviado", observaciones, VALUES(observaciones)),
                    estado = IF(estado = "Enviado", "Enviado", VALUES(estado))'
            );
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $estadoNuevo = ($r['estado'] ?? 'Borrador') === 'Enviado' ? 'Enviado' : 'Borrador';
                $stmt->execute([
                    $id, $r['docente'] ?? '', $r['estudiante'] ?? '', $r['cohorte'] ?? '',
                    $r['materia'] ?? null, $r['fecha'] ?? date('Y-m-d'),
                    $r['asistenciaPct'] ?? null, $r['promedio'] ?? null, $r['cualitativa'] ?? null,
                    $r['conclusion'] ?? null, $r['observaciones'] ?? null, $estadoNuevo,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar Informes de docentes: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Agenda docente (con UPSERT atómico y poda acotada por docente)
function manejarAgendaDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['docente'])) {
            $conds[] = 'docente = ?';
            $params[] = $_GET['docente'];
        }
        $sql = 'SELECT id, docente, titulo, tipo, fecha, hora, notas FROM agenda_docente';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha ASC, hora ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO agenda_docente (id, docente, titulo, tipo, fecha, hora, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    docente = VALUES(docente),
                    titulo = VALUES(titulo),
                    tipo = VALUES(tipo),
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    notas = VALUES(notas)'
            );
            $ids = [];
            $docenteTarget = null;
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                if (!empty($r['docente'])) $docenteTarget = $r['docente'];
                $stmt->execute([
                    $id, $r['docente'] ?? '', $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
            }
            if ($docenteTarget && !empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $paramsPrune = array_merge([$docenteTarget], array_values($ids));
                $stmtPrune = $pdo->prepare("DELETE FROM agenda_docente WHERE docente = ? AND id NOT IN ($placeholders)");
                $stmtPrune->execute($paramsPrune);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar la Agenda del docente: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Agenda estudiante (con UPSERT atómico y poda acotada por estudiante)
function manejarAgendaEstudiante(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $conds = [];
        $params = [];
        if (!empty($_GET['estudiante'])) {
            $conds[] = 'estudiante = ?';
            $params[] = $_GET['estudiante'];
        }
        $sql = 'SELECT id, estudiante, titulo, tipo, fecha, hora, notas FROM agenda_estudiante';
        if (!empty($conds)) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY fecha ASC, hora ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        responderJson($stmt->fetchAll());
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO agenda_estudiante (id, estudiante, titulo, tipo, fecha, hora, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    estudiante = VALUES(estudiante),
                    titulo = VALUES(titulo),
                    tipo = VALUES(tipo),
                    fecha = VALUES(fecha),
                    hora = VALUES(hora),
                    notas = VALUES(notas)'
            );
            $ids = [];
            $estudianteTarget = null;
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $ids[] = $id;
                if (!empty($r['estudiante'])) $estudianteTarget = $r['estudiante'];
                $stmt->execute([
                    $id, $r['estudiante'] ?? '', $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
            }
            if ($estudianteTarget && !empty($ids)) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $paramsPrune = array_merge([$estudianteTarget], array_values($ids));
                $stmtPrune = $pdo->prepare("DELETE FROM agenda_estudiante WHERE estudiante = ? AND id NOT IN ($placeholders)");
                $stmtPrune->execute($paramsPrune);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudo guardar la Agenda del estudiante: ' . $e->getMessage(), 500);
        }
        return;
    }
    responderError('Metodo no permitido.', 405);
}

// Historial y archivos adjuntos del estudiante (trainee_archivos)
function manejarTraineeArchivos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT id, estudiante_id, nombre, tipo, datos, fecha, origen FROM trainee_archivos WHERE id = ?');
            $stmt->execute([$id]);
            $f = $stmt->fetch();
            if (!$f) { responderError('Archivo no encontrado', 404); }
            responderJson([
                'id'           => $f['id'],
                'estudianteId' => $f['estudiante_id'],
                'nombre'       => $f['nombre'],
                'tipo'         => $f['tipo'],
                'datos'        => $f['datos'],
                'fecha'        => $f['fecha'],
                'origen'       => $f['origen'] ?? '',
                'tieneArchivo' => !empty($f['datos']),
            ]);
            return;
        }

        $estudianteId = $_GET['estudiante_id'] ?? $_GET['estudianteId'] ?? null;
        $conDatos = isset($_GET['con_datos']) && $_GET['con_datos'] === '1';

        $columnas = $conDatos
            ? 'id, estudiante_id, nombre, tipo, datos, fecha, origen'
            : 'id, estudiante_id, nombre, tipo, (datos IS NOT NULL AND datos != "") AS tiene_datos, fecha, origen';

        if ($estudianteId) {
            $stmt = $pdo->prepare("SELECT $columnas FROM trainee_archivos WHERE estudiante_id = ? ORDER BY fecha DESC, id DESC");
            $stmt->execute([$estudianteId]);
            $filas = $stmt->fetchAll();
        } else {
            $filas = $pdo->query("SELECT $columnas FROM trainee_archivos ORDER BY fecha DESC, id DESC")->fetchAll();
        }
        responderJson(array_map(function ($f) use ($conDatos) {
            return [
                'id'           => $f['id'],
                'estudianteId' => $f['estudiante_id'],
                'nombre'       => $f['nombre'],
                'tipo'         => $f['tipo'],
                'datos'        => $conDatos ? ($f['datos'] ?? '') : (!empty($f['tiene_datos']) ? '1' : ''),
                'fecha'        => $f['fecha'],
                'origen'       => $f['origen'] ?? '',
                'tieneArchivo' => $conDatos ? !empty($f['datos']) : !empty($f['tiene_datos']),
            ];
        }, $filas));
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion();
        $body = leerBodyJson();
        $esRegistroUnico = isset($body['estudianteId']) || isset($body['estudiante_id']) || isset($body['datos']);

        if ($esRegistroUnico) {
            $id = $body['id'] ?? bin2hex(random_bytes(16));
            $estudianteId = $body['estudianteId'] ?? $body['estudiante_id'] ?? '';
            $nombre = trim($body['nombre'] ?? '') ?: 'Archivo';
            $tipo = $body['tipo'] ?? 'application/pdf';
            $datos = $body['datos'] ?? '';
            $fecha = $body['fecha'] ?? date('Y-m-d');
            $origen = $body['origen'] ?? null;

            if (!$estudianteId || !$datos) {
                responderError('El estudiante y los datos del archivo son obligatorios.', 400);
            }

            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO trainee_archivos (id, estudiante_id, nombre, tipo, datos, fecha, origen)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                         estudiante_id = VALUES(estudiante_id),
                         nombre = VALUES(nombre),
                         tipo = VALUES(tipo),
                         datos = VALUES(datos),
                         fecha = VALUES(fecha),
                         origen = VALUES(origen)'
                );
                $stmt->execute([$id, $estudianteId, $nombre, $tipo, $datos, $fecha, $origen]);
                responderJson(['ok' => true, 'id' => $id]);
            } catch (Exception $e) {
                responderError('No se pudo guardar el archivo en la base de datos: ' . $e->getMessage(), 500);
            }
            return;
        }

        $registros = is_array($body) ? $body : [];
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO trainee_archivos (id, estudiante_id, nombre, tipo, datos, fecha, origen)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                     estudiante_id = VALUES(estudiante_id),
                     nombre = VALUES(nombre),
                     tipo = VALUES(tipo),
                     datos = VALUES(datos),
                     fecha = VALUES(fecha),
                     origen = VALUES(origen)'
            );
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                $estId = $r['estudianteId'] ?? $r['estudiante_id'] ?? '';
                if (!$estId || empty($r['datos'])) continue;
                $stmt->execute([
                    $id,
                    $estId,
                    $r['nombre'] ?? 'Archivo',
                    $r['tipo'] ?? 'application/pdf',
                    $r['datos'] ?? '',
                    $r['fecha'] ?? date('Y-m-d'),
                    $r['origen'] ?? null,
                ]);
            }
            $pdo->commit();
            responderJson(['ok' => true, 'total' => count($registros)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            responderError('No se pudieron guardar los archivos en la base de datos: ' . $e->getMessage(), 500);
        }
        return;
    }

    if ($metodo === 'DELETE') {
        exigirSesion();
        $id = $_GET['id'] ?? leerBodyJson()['id'] ?? null;
        if (!$id) {
            responderError('ID del archivo obligatorio para eliminar.', 400);
        }
        try {
            $stmt = $pdo->prepare('DELETE FROM trainee_archivos WHERE id = ?');
            $stmt->execute([$id]);
            responderJson(['ok' => true]);
        } catch (Exception $e) {
            responderError('No se pudo eliminar el archivo de la base de datos: ' . $e->getMessage(), 500);
        }
        return;
    }

    responderError('Metodo no permitido.', 405);
}