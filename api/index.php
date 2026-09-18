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

/* =====================================================================
   FASE 4 — Configuración institucional (configuracion)
   Objeto único: la plataforma tiene UNA sola configuración, guardada en
   la fila con id=1 de la tabla `configuracion` (columnas específicas:
   nombre, ciudad, direccion, correo, telefono, cupo_maximo,
   notas_minima_aprobacion, asistencia_minima, notificaciones_email,
   notificaciones_ia, postulacion_habilitada, postulacion_url).
   GET  → devuelve { data: { nombre, ciudad, correo, … } } (camelCase)
   POST → recibe { data: { … } } (camelCase) y actualiza esa única fila.
   Solo Superadmin puede leerla y modificarla.
   ===================================================================== */
function manejarConfiguracion(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $fila = $pdo->query(
            "SELECT nombre, ciudad, direccion, correo, telefono,
                    asistencia_minima, notificaciones_email, notificaciones_ia,
                    postulacion_habilitada, postulacion_url
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
            ]]);
            return;
        }
        // La tabla usa snake_case; el frontend espera camelCase.
        // cupoMaximo/notasMinimaAprobacion ya NO se exponen aquí: la nota
        // mínima quedó fija en el código (NOTA_MINIMA_APROBACION en
        // app.js, valor 6.0) y el cupo dejó de ser configurable — las
        // columnas siguen existiendo en MySQL por si se retoman más
        // adelante, pero este endpoint ya no las lee ni las escribe.
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
        ]]);
        return;
    }

    if ($metodo === 'POST') {
        exigirSesion(['Superadmin']);
        $body = leerBodyJson();
        // El frontend envía { data: { … } }
        $cfg = $body['data'] ?? $body;
        if (!is_array($cfg)) {
            responderError('Se esperaba un objeto de configuración en body.data.', 400);
        }
        // saveConfiguracion() en app.js hace un MERGE sobre la configuración
        // ya existente antes de mandar el POST, así que $cfg siempre debería
        // traer el objeto completo — pero por robustez, se lee cada campo
        // con un valor por defecto sensato si llegara a faltar alguno.
        // cupo_maximo/notas_minima_aprobacion se escriben con un valor fijo
        // (30 y 6.0) en vez de leerlos de $cfg: dejaron de ser
        // configurables desde el panel, pero las columnas siguen
        // existiendo en la tabla (NOT NULL en el esquema original), así
        // que se les manda un valor válido sin depender de lo que venga
        // en el body.
        $stmt = $pdo->prepare(
            "INSERT INTO configuracion
                (id, nombre, ciudad, direccion, correo, telefono, cupo_maximo,
                 notas_minima_aprobacion, asistencia_minima,
                 notificaciones_email, notificaciones_ia,
                 postulacion_habilitada, postulacion_url)
             VALUES (1, ?, ?, ?, ?, ?, 30, 6.0, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre), ciudad = VALUES(ciudad),
                direccion = VALUES(direccion), correo = VALUES(correo),
                telefono = VALUES(telefono),
                asistencia_minima = VALUES(asistencia_minima),
                notificaciones_email = VALUES(notificaciones_email),
                notificaciones_ia = VALUES(notificaciones_ia),
                postulacion_habilitada = VALUES(postulacion_habilitada),
                postulacion_url = VALUES(postulacion_url)"
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
        ]);
        responderJson(['ok' => true]);
        return;
    }

    responderError('Método no permitido.', 405);
}

/* =====================================================================
   FASE 4 — Credenciales del Superadmin (superadmin_credentials)
   Objeto único igual que configuracion: una sola fila en la tabla
   `superadmin_credentials` con id = 1 (columna tinyint, NO el string
   'default' — la tabla real define id TINYINT NOT NULL DEFAULT 1).
   GET  → devuelve { data: { email, password } }
   POST → recibe { data: { email, password } } y reemplaza.
   Solo Superadmin puede leerlas y modificarlas.
   La contraseña se guarda hasheada con bcrypt si no lo está ya.
   ===================================================================== */
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

/* =====================================================================
   FASE 4 — Perfiles y permisos (perfiles)
   Array de objetos. Mismo patrón de reemplazo total que el resto de
   entidades: GET devuelve el array, POST lo reemplaza completo.
   Solo Superadmin lee y modifica perfiles.
   Cada perfil tiene: id, nombre, categoria, descripcion, esSistema,
   permisos (objeto JSON con permisos por panel).
   ===================================================================== */
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
            $pdo->exec('DELETE FROM perfiles');
            $stmt = $pdo->prepare(
                'INSERT INTO perfiles (id, nombre, categoria, descripcion, es_sistema, permisos)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($perfiles as $p) {
                $stmt->execute([
                    $p['id']          ?? bin2hex(random_bytes(8)),
                    $p['nombre']      ?? 'Sin nombre',
                    $p['categoria']   ?? 'Administrativo',
                    $p['descripcion'] ?? '',
                    !empty($p['esSistema']) ? 1 : 0,
                    json_encode($p['permisos'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
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
            'SELECT id, nombre, email, password, rol, estado, estado_registro,
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
        $pdo->exec('DELETE FROM usuarios');
        $stmt = $pdo->prepare(
            'INSERT INTO usuarios
                (id, nombre, email, password, rol, estado, estado_registro, cohorte, telefono, fue_estudiante, foto_url, descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmtPerfil = $pdo->prepare(
            'INSERT INTO usuario_perfiles (usuario_id, perfil_id) VALUES (?, ?)'
        );
        // Ids de perfiles que existen de verdad: si app.js mandara un id
        // de un perfil ya borrado, el INSERT fallaría por la foreign key
        // y tumbaría el guardado completo de usuarios. Se filtran antes.
        $perfilesValidos = array_column($pdo->query('SELECT id FROM perfiles')->fetchAll(), 'id');

        foreach ($usuarios as $u) {
            $passwordFinal = esHashBcrypt($u['password'] ?? '')
                ? $u['password']
                : password_hash((string)($u['password'] ?? ''), PASSWORD_BCRYPT);

            $idUsuario = $u['id'] ?? bin2hex(random_bytes(16));

            $stmt->execute([
                $idUsuario,
                $u['nombre'] ?? '',
                strtolower($u['email'] ?? ''),
                $passwordFinal,
                $u['rol'] ?? 'Estudiante',
                $u['estado'] ?? 'Activo',
                $u['estadoRegistro'] ?? null,
                $u['cohorte'] ?? null,
                $u['telefono'] ?? null,
                !empty($u['fueEstudiante']) ? 1 : 0,
                $u['fotoUrl'] ?? null,
                $u['descripcion'] ?? null,
            ]);

            // Reinsertar los perfiles asignados a este usuario.
            $perfilesUsuario = is_array($u['perfiles'] ?? null) ? $u['perfiles'] : [];
            foreach (array_unique($perfilesUsuario) as $perfilId) {
                if (in_array($perfilId, $perfilesValidos, true)) {
                    $stmtPerfil->execute([$idUsuario, $perfilId]);
                }
            }
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

/* =====================================================================
   FASE 2 — Cohortes/Horarios/Notas/Asistencia
   Mismo patrón que 'usuarios': GET devuelve el array completo, POST
   reemplaza la tabla completa dentro de una transacción. Ninguna de estas
   entidades necesita lógica especial (como el hash de contraseñas de
   usuarios), así que el mapeo camelCase<->snake_case y el reemplazo son
   bastante mecánicos — quien lea/escriba puede ser cualquier rol
   autenticado, igual que ya se permitía en localStorage (no había
   distinción de permisos ahí, así que aquí tampoco se agrega una nueva).
   ===================================================================== */

/**
 * Exige sesión válida (cualquier rol) y decodifica el body como array para
 * un POST — común a las 6 entidades de esta fase, evita repetirlo 6 veces.
 */
function prepararReemplazoGenerico(): array {
    exigirSesion();
    $datos = leerBodyJson();
    if (!is_array($datos)) {
        responderError('Se esperaba un array en el body.', 400);
    }
    return $datos;
}

// ---- modulos (Cohortes) ----
function manejarModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado, creado_en FROM modulos')->fetchAll();
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
            $pdo->exec('DELETE FROM modulos');
            $stmt = $pdo->prepare('INSERT INTO modulos (id, nombre, modulo, fecha_inicio, fecha_fin, cupos, estado) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['nombre'] ?? '', $r['modulo'] ?? '',
                    $r['fechaInicio'] ?? null, $r['fechaFin'] ?? null,
                    (int)($r['cupos'] ?? 25), $r['estado'] ?? 'Planeada',
                ]);
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

// ---- horarios (franjas por cohorte+mes) ----
// 'franjas' es un array de objetos (dia, curso, docente, inicio, fin,
// estado...) — se guarda tal cual como JSON en una columna longtext,
// igual que ya vivía como JSON dentro del array de localStorage. PHP no
// necesita "entender" su contenido, solo pasarlo de ida y vuelta.
function manejarHorarios(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, cohorte, mes, incluye_sabado, franjas, creado_en, actualizado_en FROM horarios')->fetchAll();
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
            $pdo->exec('DELETE FROM horarios');
            $stmt = $pdo->prepare('INSERT INTO horarios (id, cohorte, mes, incluye_sabado, franjas) VALUES (?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['cohorte'] ?? '', $r['mes'] ?? '',
                    !empty($r['incluyeSabado']) ? 1 : 0,
                    json_encode($r['franjas'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
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

// ---- notas_modulos (criterios y valores de calificación) ----
// 'criterios' y 'valores' son también JSON anidado (mismo criterio que
// 'franjas' arriba).
function manejarNotasModulos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, docente, cohorte, mes, criterios, valores, creado_en, actualizado_en FROM notas_modulos')->fetchAll();
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
            $pdo->exec('DELETE FROM notas_modulos');
            $stmt = $pdo->prepare('INSERT INTO notas_modulos (id, docente, cohorte, mes, criterios, valores) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['docente'] ?? '', $r['cohorte'] ?? '', $r['mes'] ?? '',
                    json_encode($r['criterios'] ?? [], JSON_UNESCAPED_UNICODE),
                    json_encode($r['valores'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
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

// ---- asistencia (un registro por estudiante+sesión) ----
function manejarAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico FROM asistencia')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'estudiante' => $f['estudiante'], 'docente' => $f['docente'],
                'modulo' => $f['modulo'], 'materia' => $f['materia'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'sesionId' => $f['sesion_id'], 'automatico' => (bool)$f['automatico'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM asistencia');
            $stmt = $pdo->prepare('INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['estudiante'] ?? '', $r['docente'] ?? null,
                    $r['modulo'] ?? null, $r['materia'] ?? null, $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Falla', $r['sesionId'] ?? null, !empty($r['automatico']) ? 1 : 0,
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

// ---- sesiones_asistencia (códigos QR de una sesión de clase) ----
function manejarSesionesAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia')->fetchAll();
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
            $pdo->exec('DELETE FROM sesiones_asistencia');
            $stmt = $pdo->prepare('INSERT INTO sesiones_asistencia (id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['cohorte'] ?? '', $r['modulo'] ?? null, $r['materia'] ?? null,
                    $r['fecha'] ?? date('Y-m-d'), $r['horaInicio'] ?? date('Y-m-d H:i:s'),
                    $r['codigo'] ?? '', $r['iniciadaPor'] ?? '',
                ]);
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

// ---- qr_tokens (token vigente para escanear asistencia) ----
function manejarQrTokens(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, tipo, cohorte, docente, token FROM qr_tokens')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'tipo' => $f['tipo'], 'cohorte' => $f['cohorte'], 'docente' => $f['docente'], 'token' => $f['token']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM qr_tokens');
            $stmt = $pdo->prepare('INSERT INTO qr_tokens (id, tipo, cohorte, docente, token) VALUES (?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['tipo'] ?? 'estudiante', $r['cohorte'] ?? '',
                    $r['docente'] ?? '', $r['token'] ?? '',
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

// ---- qr_asistencia (punto público para escaneo de QR y registro de asistencia sin login previo) ----
function manejarQrAsistencia(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];

    // GET /api/qr_asistencia?tipo=docente|estudiante&token=XYZ
    if ($metodo === 'GET') {
        $tipo = trim($_GET['tipo'] ?? '');
        $token = trim($_GET['token'] ?? '');
        if (!$tipo || !$token) {
            responderError('Faltan parámetros tipo y token.', 400);
        }

        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token FROM qr_tokens WHERE tipo = ? AND token = ? LIMIT 1');
        $stmt->execute([$tipo, $token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr) {
            responderError('Código QR no encontrado o inválido.', 404);
        }

        $hoy = date('Y-m-d');

        // Buscar sesión de hoy para esta cohorte y docente
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        // Si es DOCENTE y aún no hay sesión hoy, activarla automáticamente
        if ($tipo === 'docente') {
            $recienActivada = false;
            if (!$sesion) {
                // Obtener nombre del módulo
                $stmtMod = $pdo->prepare('SELECT modulo FROM modulos WHERE nombre = ? LIMIT 1');
                $stmtMod->execute([$qr['cohorte']]);
                $modRow = $stmtMod->fetch(PDO::FETCH_ASSOC);
                $moduloNombre = $modRow ? $modRow['modulo'] : $qr['cohorte'];

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
            } else {
                $sesion = [
                    'id' => $sesion['id'], 'cohorte' => $sesion['cohorte'], 'modulo' => $sesion['modulo'],
                    'materia' => $sesion['materia'], 'fecha' => $sesion['fecha'], 'horaInicio' => $sesion['hora_inicio'],
                    'codigo' => $sesion['codigo'], 'iniciadaPor' => $sesion['iniciada_por']
                ];
            }

            // Buscar token del estudiante correspondiente para mostrar su QR en pantalla
            $stmtTokenEst = $pdo->prepare('SELECT token FROM qr_tokens WHERE tipo = "estudiante" AND cohorte = ? AND docente = ? LIMIT 1');
            $stmtTokenEst->execute([$qr['cohorte'], $qr['docente']]);
            $tokenEstRow = $stmtTokenEst->fetch(PDO::FETCH_ASSOC);
            $tokenEstudiante = $tokenEstRow ? $tokenEstRow['token'] : null;

            // Contar cuántos estudiantes ya registraron asistencia hoy en esta sesión
            $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM asistencia WHERE sesion_id = ?');
            $stmtCount->execute([$sesion['id']]);
            $totalAsistencias = (int)$stmtCount->fetchColumn();

            responderJson([
                'ok' => true,
                'tipo' => 'docente',
                'registro' => $qr,
                'sesion' => $sesion,
                'recienActivada' => $recienActivada,
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

        responderJson([
            'ok' => true,
            'tipo' => 'estudiante',
            'registro' => $qr,
            'sesionActiva' => $sesionActiva,
            'sesion' => $sesionData,
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

        // 1. Validar token del estudiante
        $stmt = $pdo->prepare('SELECT id, tipo, cohorte, docente, token FROM qr_tokens WHERE tipo = "estudiante" AND token = ? LIMIT 1');
        $stmt->execute([$token]);
        $qr = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$qr) {
            responderError('Código QR no válido o expirado.', 404);
        }

        $hoy = date('Y-m-d');

        // 2. Verificar que el docente haya iniciado la sesión de hoy
        $stmtSesion = $pdo->prepare('SELECT id, cohorte, modulo, materia, fecha, hora_inicio, codigo, iniciada_por FROM sesiones_asistencia WHERE cohorte = ? AND iniciada_por = ? AND fecha = ? ORDER BY id DESC LIMIT 1');
        $stmtSesion->execute([$qr['cohorte'], $qr['docente'], $hoy]);
        $sesion = $stmtSesion->fetch(PDO::FETCH_ASSOC);

        if (!$sesion) {
            responderError('Tu docente (' . $qr['docente'] . ') aún no ha activado la asistencia de hoy. Espera a que el profesor escanee su código QR.', 400);
        }

        // 3. Verificar ventana de tiempo
        $horaInicioTs = strtotime($sesion['hora_inicio']);
        $minsTranscurridos = $horaInicioTs > 0 ? (time() - $horaInicioTs) / 60 : 0;

        if ($minsTranscurridos > 50) {
            responderError('La ventana de registro de asistencia para esta clase ya cerró (superó los 50 minutos de tolerancia).', 400);
        }

        $estado = ($minsTranscurridos <= 20) ? 'Presente' : 'Tarde';

        // 4. Buscar al estudiante en usuarios por email, usuario o nombre
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
        $stmtYa = $pdo->prepare('SELECT id, estado, fecha FROM asistencia WHERE sesion_id = ? AND estudiante = ? LIMIT 1');
        $stmtYa->execute([$sesion['id'], $estudiante['nombre']]);
        $asistExistente = $stmtYa->fetch(PDO::FETCH_ASSOC);

        if ($asistExistente) {
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

        // 7. Insertar asistencia en MySQL
        $nuevoAsistId = 'as_' . bin2hex(random_bytes(6)) . time();
        $stmtInsAsist = $pdo->prepare('INSERT INTO asistencia (id, estudiante, docente, modulo, materia, fecha, estado, sesion_id, automatico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
        $stmtInsAsist->execute([
            $nuevoAsistId,
            $estudiante['nombre'],
            $sesion['iniciada_por'],
            $sesion['modulo'],
            $sesion['materia'],
            $sesion['fecha'],
            $estado,
            $sesion['id'],
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
/* =====================================================================
   FASE 3 — PQR/Memorandos/Encuestas/Cursos/Pensum
   Mismo patrón que las fases anteriores. Excepción: 'memorandos_leidos'
   no es un array plano en app.js sino un objeto anidado
   { memorandoId: { email: true } } — el GET reconstruye ese objeto a
   partir de las filas (memorando_id, email) y el POST lo vuelve a
   aplanar en filas, así app.js no necesita cambiar su forma de trabajar
   con esta entidad.
   ===================================================================== */

// ---- pqr (peticiones, quejas, reclamos, sugerencias) ----
function manejarPqr(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos FROM pqr')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'tipo' => $f['tipo'], 'solicitante' => $f['solicitante'],
                'remitenteRol' => $f['remitente_rol'], 'asunto' => $f['asunto'], 'fecha' => $f['fecha'],
                'estado' => $f['estado'], 'fechaActivacion' => $f['fecha_activacion'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'], 'archivoDatos' => $f['archivo_datos'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM pqr');
            $stmt = $pdo->prepare('INSERT INTO pqr (id, tipo, solicitante, remitente_rol, asunto, fecha, estado, fecha_activacion, archivo_nombre, archivo_tipo, archivo_datos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['tipo'] ?? 'Petición', $r['solicitante'] ?? '',
                    $r['remitenteRol'] ?? 'Estudiante', $r['asunto'] ?? '', $r['fecha'] ?? date('Y-m-d'),
                    $r['estado'] ?? 'Pendiente', $r['fechaActivacion'] ?? null,
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? 'application/pdf', $r['archivoDatos'] ?? '',
                ]);
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

// ---- memorandos ----
function manejarMemorandos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos FROM memorandos')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'titulo' => $f['titulo'], 'destinatario' => $f['destinatario'],
                'fecha' => $f['fecha'], 'estado' => $f['estado'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'], 'archivoDatos' => $f['archivo_datos'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM memorandos');
            $stmt = $pdo->prepare('INSERT INTO memorandos (id, titulo, destinatario, fecha, estado, archivo_nombre, archivo_tipo, archivo_datos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['titulo'] ?? '', $r['destinatario'] ?? '',
                    $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Borrador',
                    $r['archivoNombre'] ?? '', $r['archivoTipo'] ?? '', $r['archivoDatos'] ?? '',
                ]);
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

// ---- memorandos_leidos: objeto anidado { memorandoId: { email: true } },
// no un array — ver comentario de cabecera de esta sección.
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

// ---- encuestas ----
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
            $pdo->exec('DELETE FROM encuestas');
            $stmt = $pdo->prepare('INSERT INTO encuestas (id, titulo, url, cohorte, fecha, estado) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['titulo'] ?? '', $r['url'] ?? '',
                    $r['cohorte'] ?? '', $r['fecha'] ?? date('Y-m-d'), $r['estado'] ?? 'Abierta',
                ]);
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

// ---- cursos (catálogo de materias) ----
function manejarCursos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, nombre, descripcion, estado, creado_en FROM cursos')->fetchAll();
        responderJson(array_map(function ($f) {
            return ['id' => $f['id'], 'nombre' => $f['nombre'], 'descripcion' => $f['descripcion'], 'estado' => $f['estado'], 'creadoEn' => $f['creado_en']];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM cursos');
            $stmt = $pdo->prepare('INSERT INTO cursos (id, nombre, descripcion, estado) VALUES (?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['nombre'] ?? '', $r['descripcion'] ?? null, $r['estado'] ?? 'Activo',
                ]);
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

// ---- pensum (temario curricular por cohorte/módulo) ----
function manejarPensum(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos FROM pensum')->fetchAll();
        responderJson(array_map(function ($f) {
            return [
                'id' => $f['id'], 'modulo' => $f['modulo'], 'tema' => $f['tema'], 'horas' => (int)$f['horas'],
                'docente' => $f['docente'], 'orden' => (int)$f['orden'],
                'archivoNombre' => $f['archivo_nombre'], 'archivoTipo' => $f['archivo_tipo'], 'archivoDatos' => $f['archivo_datos'],
            ];
        }, $filas));
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM pensum');
            $stmt = $pdo->prepare('INSERT INTO pensum (id, modulo, tema, horas, docente, orden, archivo_nombre, archivo_tipo, archivo_datos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['modulo'] ?? '', $r['tema'] ?? '',
                    (int)($r['horas'] ?? 8), $r['docente'] ?? null, (int)($r['orden'] ?? 1),
                    $r['archivoNombre'] ?? null, $r['archivoTipo'] ?? null, $r['archivoDatos'] ?? null,
                ]);
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
 * Chat conocimiento (antes llamado "Chat de voz" en el panel) — la base
 * de conocimiento de texto libre que consulta el backend del chat
 * (backend_chat/db.py, tabla chat_voz_conocimiento) para responder
 * preguntas que no puede resolver solo con los datos propios del sistema.
 * Mismo patrón que manejarPensum: GET trae todo el array, POST reemplaza
 * la tabla completa.
 */
function manejarChatVozConocimiento(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, titulo, contenido, categoria, visibilidad, estado, creado_en FROM chat_voz_conocimiento')->fetchAll();
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
            $pdo->exec('DELETE FROM chat_voz_conocimiento');
            $stmt = $pdo->prepare('INSERT INTO chat_voz_conocimiento (id, titulo, contenido, categoria, visibilidad, estado) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['titulo'] ?? '', $r['contenido'] ?? '',
                    $r['categoria'] ?? null, $r['visibilidad'] ?? 'Pública', $r['estado'] ?? 'Activa',
                ]);
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

/* =====================================================================
   FASE 4 -- Auditoria (solo lectura para el Superadmin)
   Tres bitacoras:
   1) auditoria_login: la escribe directamente api/auth.php en cada
      intento de login (exitoso o fallido) -- aqui solo se expone su
      LECTURA para el panel Auditoria. No tiene POST: nada en el
      frontend debe poder reemplazar este historial completo.
   2) auditoria_acciones: acciones dentro del sistema (hoy, notas
      actualizadas por un docente). Mismo patron "reemplaza toda la
      tabla" que el resto de entidades, protegido con exigirSesion()
      igual que ya hacia Store.save() en localStorage (sin distincion de
      rol: cualquier usuario autenticado puede dejar su propio rastro).
   3) auditoria_horario: cambios de Materia/Docente en una celda del
      Horario (quien, cuando, valor anterior/nuevo).
   Las tres ordenan por fecha/hora descendente para que la mas reciente
   quede primera, igual que el unshift() que hacia el codigo viejo de
   localStorage.
   ===================================================================== */

// ---- auditoria_login (solo lectura: la escribe auth.php) ----
function manejarAuditoriaLogin(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $filas = $pdo->query('SELECT id, fecha, hora, resultado, email, rol FROM auditoria_login ORDER BY fecha DESC, hora DESC')->fetchAll();
        responderJson($filas);
        return;
    }
    responderError('Metodo no permitido: auditoria_login es de solo lectura (la registra el propio login).', 405);
}

// ---- auditoria_acciones ----
function manejarAuditoriaAcciones(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $filas = $pdo->query('SELECT id, fecha, hora, tipo, actor, rol, detalle FROM auditoria_acciones ORDER BY fecha DESC, hora DESC')->fetchAll();
        responderJson($filas);
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM auditoria_acciones');
            $stmt = $pdo->prepare('INSERT INTO auditoria_acciones (id, fecha, hora, tipo, actor, rol, detalle) VALUES (?, ?, ?, ?, ?, ?, ?)');
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

// ---- auditoria_horario ----
function manejarAuditoriaHorario(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion(['Superadmin']);
        $filas = $pdo->query('SELECT id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo FROM auditoria_horario ORDER BY fecha DESC, hora DESC')->fetchAll();
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
            $pdo->exec('DELETE FROM auditoria_horario');
            $stmt = $pdo->prepare('INSERT INTO auditoria_horario (id, fecha, hora, autor, cohorte, mes, franja, campo, valor_anterior, valor_nuevo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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

/* =====================================================================
   FASE 4 -- Informes de docentes (informes_docente)
   Un informe por (docente, estudiante, cohorte): el docente lo genera
   con datos reales (asistencia, nota, conclusion) y agrega su propia
   observacion. Lo lee tanto el propio Docente (sus informes) como el
   Superadmin/Coordinador (panel "Informes", agrupado por profesor) --
   por eso, igual que pqr/notas_modulos, no se restringe por rol: la
   misma ausencia de restriccion que ya tenia en localStorage.
   ===================================================================== */
function manejarInformesDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, docente, estudiante, cohorte, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado FROM informes_docente')->fetchAll();
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
        // Un informe ya 'Enviado' es definitivo: ni sus datos ni su
        // estado pueden volver a cambiar, ni siquiera si el docente
        // manipula el request a mano (esta ruta reemplaza la tabla
        // completa, así que la protección tiene que ir aquí, del lado
        // del servidor — el frontend deshabilita el textarea, pero eso
        // por sí solo es solo cosmético). Se leen los informes YA
        // enviados antes de aceptar el array nuevo, y esas filas se
        // preservan tal cual quedaron en la base, ignorando lo que haya
        // llegado del cliente para ese mismo id.
        $enviadosPrevios = [];
        foreach ($pdo->query("SELECT * FROM informes_docente WHERE estado = 'Enviado'")->fetchAll() as $fila) {
            $enviadosPrevios[$fila['id']] = $fila;
        }
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM informes_docente');
            $stmt = $pdo->prepare('INSERT INTO informes_docente (id, docente, estudiante, cohorte, materia, fecha, asistencia_pct, promedio, cualitativa, conclusion, observaciones, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $id = $r['id'] ?? bin2hex(random_bytes(16));
                if (isset($enviadosPrevios[$id])) {
                    // Ya estaba Enviado: se reinserta exactamente como
                    // estaba en la base, ignorando el resto del payload.
                    $previo = $enviadosPrevios[$id];
                    $stmt->execute([
                        $previo['id'], $previo['docente'], $previo['estudiante'], $previo['cohorte'],
                        $previo['materia'], $previo['fecha'], $previo['asistencia_pct'], $previo['promedio'],
                        $previo['cualitativa'], $previo['conclusion'], $previo['observaciones'], 'Enviado',
                    ]);
                    continue;
                }
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

/* =====================================================================
   FASE 4 -- Agenda personal (agenda_docente / agenda_estudiante)
   Misma agenda simple para ambos roles: cada quien ve y administra
   unicamente sus propios eventos (filtrado por docente/estudiante ya lo
   hacia app.js del lado del cliente). Igual que pqr/notas_modulos, no se
   restringe por rol a nivel de servidor -- cualquier sesion valida puede
   leer/reemplazar, mismo alcance que ya tenia en localStorage.
   ===================================================================== */

// ---- agenda_docente ----
function manejarAgendaDocente(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, docente, titulo, tipo, fecha, hora, notas FROM agenda_docente')->fetchAll();
        responderJson($filas);
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM agenda_docente');
            $stmt = $pdo->prepare('INSERT INTO agenda_docente (id, docente, titulo, tipo, fecha, hora, notas) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['docente'] ?? '', $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
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

// ---- agenda_estudiante ----
function manejarAgendaEstudiante(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $filas = $pdo->query('SELECT id, estudiante, titulo, tipo, fecha, hora, notas FROM agenda_estudiante')->fetchAll();
        responderJson($filas);
        return;
    }
    if ($metodo === 'POST') {
        $registros = prepararReemplazoGenerico();
        $pdo->beginTransaction();
        try {
            $pdo->exec('DELETE FROM agenda_estudiante');
            $stmt = $pdo->prepare('INSERT INTO agenda_estudiante (id, estudiante, titulo, tipo, fecha, hora, notas) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($registros as $r) {
                $stmt->execute([
                    $r['id'] ?? bin2hex(random_bytes(16)), $r['estudiante'] ?? '', $r['titulo'] ?? '',
                    $r['tipo'] ?? 'Recordatorio', $r['fecha'] ?? date('Y-m-d'), $r['hora'] ?? null, $r['notas'] ?? null,
                ]);
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

// ---- trainee_archivos (Archivos adjuntos del historial del estudiante / trainee) ----
function manejarTraineeArchivos(PDO $pdo): void {
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        exigirSesion();
        $estudianteId = $_GET['estudiante_id'] ?? $_GET['estudianteId'] ?? null;
        if ($estudianteId) {
            $stmt = $pdo->prepare('SELECT id, estudiante_id, nombre, tipo, datos, fecha, origen FROM trainee_archivos WHERE estudiante_id = ? ORDER BY fecha DESC, id DESC');
            $stmt->execute([$estudianteId]);
            $filas = $stmt->fetchAll();
        } else {
            $filas = $pdo->query('SELECT id, estudiante_id, nombre, tipo, datos, fecha, origen FROM trainee_archivos ORDER BY fecha DESC, id DESC')->fetchAll();
        }
        responderJson(array_map(function ($f) {
            return [
                'id'           => $f['id'],
                'estudianteId' => $f['estudiante_id'],
                'nombre'       => $f['nombre'],
                'tipo'         => $f['tipo'],
                'datos'        => $f['datos'],
                'fecha'        => $f['fecha'],
                'origen'       => $f['origen'] ?? '',
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