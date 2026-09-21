"""
Conexión a MySQL/MariaDB y consultas de solo-lectura usadas por el chat
para armar el contexto real de cada rol (Superadmin, Coordinador/
Administrador, Docente, Estudiante) y la base de conocimiento pública.

Requiere las variables de entorno (ver .env.example):
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

Si estas variables no están configuradas, get_connection() lanza un error
claro — el chat sigue respondiendo (ver chat_backend.py), solo que sin
ningún contexto en vivo, igual que pasaba antes cuando faltaba
knowledge.json.

IMPORTANTE — esto es SOLO LECTURA: ninguna función de este archivo hace
INSERT/UPDATE/DELETE. El chat nunca modifica datos del sistema, solo los
consulta para responder con información real.

Esta lógica replica, campo por campo, la que ya usaba app.js en el
navegador (ver obtenerContextoSesionParaChat y sus funciones auxiliares:
computeSemaforo, promedioGeneralEstudianteCohorte,
desgloseNotasEstudianteCohorte, notasDocenteEnCohorte, calcularNotaFinal,
docentesDeCohorte, getSlotsDocente) — el objetivo de moverla aquí es que
el rol de quien pregunta quede verificado por un token firmado por el
servidor (ver auth.py), no que el contenido del contexto sea más pobre.
"""

import json as _json
import os
import re
import queue
import threading
from contextlib import contextmanager
from typing import Optional

import bcrypt
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Se carga aquí también (además de en chat_backend.py) para que este
# módulo lea las variables correctas sin importar desde dónde se importe
# (la app principal, un script suelto, una prueba, etc.). load_dotenv() no
# sobreescribe variables ya presentes en el entorno del proceso (por
# ejemplo las que pone Render en producción), así que es seguro llamarlo
# más de una vez.
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# DB_SSL_CA: ruta al certificado CA que exige un proveedor en la nube como
# Aiven (Configuration Overview > "CA certificate" del servicio, descarga
# el archivo y sube ese .pem junto a este proyecto, ej. backend_chat/ca.pem).
# En XAMPP local NO se define esta variable — get_connection() simplemente
# no manda ssl en ese caso, exactamente como funcionaba antes. En Render,
# se sube el .pem al repo (o como "Secret File") y se apunta DB_SSL_CA a
# esa ruta en las variables de entorno del servicio.
DB_SSL_CA = os.getenv("DB_SSL_CA")


def db_configurada() -> bool:
    """Verifica si las variables esenciales de conexión a MySQL están presentes."""
    return bool(DB_HOST and DB_USER and DB_NAME)


class MySQLConnectionPool:
    """Pool de conexiones thread-safe y resiliente para MySQL/MariaDB.
    Reutiliza conexiones TCP/SSL reduciendo drásticamente la latencia por consulta
    y validando automáticamente el estado de la conexión mediante ping activo."""

    def __init__(self, max_connections: int = 12):
        self.max_connections = max_connections
        self._pool = queue.Queue(maxsize=max_connections)
        self._lock = threading.Lock()
        self._created_connections = 0

    def _create_raw_connection(self):
        return pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=6,
            read_timeout=8,
            charset="utf8mb4",
            autocommit=True,
            **({"ssl": {"ca": DB_SSL_CA}} if DB_SSL_CA else {}),
        )

    def acquire(self):
        conn = None
        try:
            conn = self._pool.get_nowait()
        except queue.Empty:
            with self._lock:
                if self._created_connections < self.max_connections:
                    conn = self._create_raw_connection()
                    self._created_connections += 1
            if conn is None:
                try:
                    conn = self._pool.get(timeout=5.0)
                except queue.Empty:
                    raise RuntimeError("Tiempo de espera agotado: todas las conexiones del pool MySQL están en uso.")

        # Verificar vitalidad de la conexión y reconectar si se cayó o expiró
        try:
            conn.ping(reconnect=True)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
            conn = self._create_raw_connection()

        return conn

    def release(self, conn):
        if conn is None:
            return
        try:
            self._pool.put_nowait(conn)
        except queue.Full:
            try:
                conn.close()
            except Exception:
                pass
            with self._lock:
                self._created_connections -= 1


_global_pool: Optional[MySQLConnectionPool] = None
_pool_lock = threading.Lock()


def get_pool() -> MySQLConnectionPool:
    global _global_pool
    if _global_pool is None:
        with _pool_lock:
            if _global_pool is None:
                _global_pool = MySQLConnectionPool(max_connections=12)
    return _global_pool


@contextmanager
def get_connection():
    """Obtiene una conexión activa desde el pool persistente y la libera al finalizar."""
    if not db_configurada():
        raise RuntimeError(
            "La base de datos no está configurada (faltan DB_HOST/DB_USER/DB_NAME "
            "en las variables de entorno)."
        )
    pool = get_pool()
    conn = pool.acquire()
    try:
        yield conn
    finally:
        pool.release(conn)


def _as_list(valor):
    """Normaliza un valor a lista. Parsea cadenas JSON si es necesario."""
    if isinstance(valor, list):
        return valor
    if isinstance(valor, str):
        try:
            parsed = _json.loads(valor or "[]")
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _as_dict(valor):
    """Normaliza un valor a diccionario. Parsea cadenas JSON si es necesario."""
    if isinstance(valor, dict):
        return valor
    if isinstance(valor, str):
        try:
            parsed = _json.loads(valor or "{}")
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


# AUTENTICACIÓN — usada solo por auth.py para emitir el token de sesión.
# Nunca se expone la contraseña ni se usa fuera de esa verificación.

def _password_coincide(password_en_texto_plano: str, hash_guardado: str) -> bool:
    """Verifica una contraseña contra el hash guardado en MySQL.

    La API PHP nueva (api/auth.php) hashea las contraseñas con
    password_hash($password, PASSWORD_BCRYPT), que produce hashes con
    formato $2y$10$... — bcrypt real, NO texto plano. Antes esta función
    comparaba con "==" directo, lo cual SIEMPRE fallaba contra un hash
    bcrypt real (por eso el Superadmin/cualquier usuario terminaba
    tratado como visitante sin sesión: el login del chat nunca coincidía).

    Se usa la librería bcrypt de Python, que verifica ese mismo formato
    $2a$/$2b$/$2y$ sin importar cuál de los tres lo generó — son
    compatibles entre sí a efectos de verificación."""
    if not hash_guardado:
        return False
    # Compatibilidad hacia atrás: si por alguna razón la fila todavía
    # tiene una contraseña en texto plano (sin hashear), se permite ese
    # caso puntual en vez de fallar directo — pero el camino normal y
    # esperado es el hash bcrypt de abajo.
    if not hash_guardado.startswith(("$2a$", "$2b$", "$2y$")):
        return password_en_texto_plano == hash_guardado
    try:
        return bcrypt.checkpw(
            password_en_texto_plano.encode("utf-8"),
            hash_guardado.encode("utf-8"),
        )
    except (ValueError, TypeError):
        # Hash corrupto/formato inesperado: nunca truena la petición,
        # simplemente no autentica.
        return False


def buscar_usuario_por_credenciales(email: str, password: str) -> Optional[dict]:
    """Devuelve el usuario (sin la contraseña) si el email+password
    coinciden con superadmin_credentials o con la tabla usuarios (cuenta
    activa, no pendiente de aprobación). None si no coinciden con nada."""
    email = (email or "").strip().lower()
    if not email or not password:
        return None

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT email, password FROM superadmin_credentials WHERE LOWER(email) = %s LIMIT 1",
            (email,),
        )
        row = cur.fetchone()
        if row and _password_coincide(password, row["password"]):
            return {"email": row["email"], "nombre": "Superadmin", "rol": "Superadmin"}

        cur.execute(
            """SELECT id, nombre, email, password, rol, cohorte
               FROM usuarios
               WHERE LOWER(email) = %s AND estado = 'Activo' AND (estado_registro IS NULL OR estado_registro != 'Pendiente')
               LIMIT 1""",
            (email,),
        )
        row = cur.fetchone()
        if row and _password_coincide(password, row["password"]):
            return {
                "id": row["id"], "email": row["email"], "nombre": row["nombre"],
                "rol": row["rol"], "cohorte": row["cohorte"],
            }
    return None


# BASE DE CONOCIMIENTO (reemplaza a knowledge.json)

def obtener_base_conocimiento() -> list:
    if not db_configurada():
        return []
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT titulo, contenido, categoria, visibilidad, estado
               FROM chat_voz_conocimiento
               WHERE estado = 'Activa'"""
        )
        return cur.fetchall()


# CONFIGURACIÓN — umbrales y estado del botón "Postular" (compartido por
# los 4 roles y también por visitantes sin sesión).

# Nota mínima de aprobación: fija en el código (igual que
# NOTA_MINIMA_APROBACION en app.js) — ya no es configurable desde el
# panel. Único criterio real de aprobación; la asistencia sigue siendo
# solo informativa (semáforo, informes), nunca decide si alguien aprueba.
NOTA_MINIMA_APROBACION = 6.0


def obtener_configuracion(cur) -> dict:
    cur.execute(
        """SELECT nombre, asistencia_minima,
                  postulacion_habilitada, postulacion_url
           FROM configuracion WHERE id = 1"""
    )
    row = cur.fetchone() or {}
    return {
        "nombre": row.get("nombre") or "Fundación A+",
        "notas_minima": NOTA_MINIMA_APROBACION,
        "asistencia_minima": float(row.get("asistencia_minima", 80)),
        "postulacion_habilitada": bool(row.get("postulacion_habilitada")),
        "postulacion_url": row.get("postulacion_url") or "",
    }


def contexto_postulacion(cur) -> str:
    cfg = obtener_configuracion(cur)
    abierta = cfg["postulacion_habilitada"] and cfg["postulacion_url"]
    base = (
        'ESTADO EN VIVO DEL BOTÓN "POSTULAR" DEL SITIO (dato técnico verificado, sobre si el '
        "botón está activo y con link ahora mismo): "
    )
    if abierta:
        base += (
            f'El botón "Postular" del sitio SÍ está activo ahora mismo y enlaza a: '
            f'{cfg["postulacion_url"]}. Las postulaciones/inscripciones YA ESTÁN ABIERTAS — '
            "comparte ese link cuando pregunten cómo inscribirse, postularse, aplicar o unirse a "
            "una cohorte/convocatoria. Como ya están abiertas, NO menciones ninguna fecha futura "
            "de apertura que puedas tener en la base de conocimiento de más abajo (aunque exista "
            "un texto ahí sobre cuándo abren): eso quedó desactualizado en cuanto se activó este "
            "botón, y mencionarlo sería contradictorio. Si la base de conocimiento trae otros "
            "datos vigentes sobre la convocatoria (requisitos, duración, modalidad), esos sí "
            "puedes usarlos con normalidad — la exclusión es solo sobre la fecha de apertura."
        )
    else:
        base += (
            'El botón "Postular" del sitio está inactivo ahora mismo (sin link cargado o '
            "deshabilitado por el Superadmin) — las postulaciones NO están abiertas todavía. Si "
            "en la base de conocimiento de más abajo hay información sobre fechas o condiciones "
            "de una próxima convocatoria, priorízala y compártela; si no hay nada al respecto, "
            "dilo con honestidad e invita a seguir las redes sociales o el WhatsApp oficial para "
            "enterarse cuando se abra."
        )
    base += (
        " Responde a cualquier forma de preguntar esto (inscribirme, aplicar, postular, "
        "anotarme, ser parte del training, cuándo abren cupos, etc.) usando la instrucción de "
        "arriba — no remitas solo a \"comunícate con nosotros\" si ya tienes algún dato útil, sea "
        "del botón o de la base de conocimiento."
    )
    return base


# CÁLCULO DE NOTAS — replica calcularNotaFinal() de app.js: si algún
# criterio no tiene valor cargado para ese estudiante, la nota se
# considera "pendiente" (no se cuenta como 0, se EXCLUYE del promedio).

def _calcular_nota_final(criterios: list, valores_estudiante: dict) -> Optional[float]:
    if not criterios:
        return None
    suma_peso, suma_ponderada, falta_algo = 0.0, 0.0, False
    for c in criterios:
        peso = float(c.get("peso") or 0)
        suma_peso += peso
        v = valores_estudiante.get(c.get("id"))
        if v is None or v == "":
            falta_algo = True
            continue
        suma_ponderada += float(v) * peso
    if not suma_peso or falta_algo:
        return None
    return suma_ponderada / suma_peso


def _docentes_de_cohorte(cur, cohorte: str) -> list:
    """Nombres únicos de docentes con al menos una franja activa
    (estado != 'Inactivo') en horarios.franjas para esta cohorte."""
    cur.execute("SELECT franjas FROM horarios WHERE cohorte = %s", (cohorte,))
    nombres = set()
    for fila in cur.fetchall():
        for franja in _as_list(fila["franjas"]):
            if franja.get("estado") != "Inactivo" and franja.get("docente"):
                nombres.add(franja["docente"])
    return list(nombres)


def _asignaciones_docente(cur, nombre: str) -> list:
    """Pares (cohorte, curso) únicos con al menos una franja activa
    (estado != 'Inactivo') asignada a este docente, leyendo horarios.franjas
    (JSON) — la tabla horarios NO tiene columnas docente/materia/estado
    propias, esos datos viven dentro de cada franja del JSON. Se usa tanto
    para el propio docente (contexto_docente) como para cuando el
    Superadmin/Coordinador pregunta por el perfil de un docente por nombre
    (_bloque_perfil_persona_administracion)."""
    cur.execute("SELECT cohorte, franjas FROM horarios")
    vistos = set()
    resultado = []
    for fila in cur.fetchall():
        for franja in _as_list(fila["franjas"]):
            if franja.get("docente") != nombre or franja.get("estado") == "Inactivo":
                continue
            clave = (fila["cohorte"], franja.get("curso") or "Sin materia")
            if clave not in vistos:
                vistos.add(clave)
                resultado.append(clave)
    return resultado


def _notas_registros_docente_cohorte(cur, docente: str, cohorte: str) -> list:
    cur.execute(
        "SELECT mes, criterios, valores FROM notas_modulos WHERE docente = %s AND cohorte = %s",
        (docente, cohorte),
    )
    return cur.fetchall()


def promedio_general_estudiante_cohorte(cur, estudiante: str, cohorte: str) -> Optional[float]:
    """Vista 'General': promedia, por cada docente de la cohorte, TODOS
    sus meses con notas de ese estudiante, y luego promedia entre
    docentes (un profesor con muchos periodos no pesa más que uno con
    pocos) — misma lógica que promedioGeneralEstudianteCohorte(...,
    mes=null) en app.js."""
    docentes = _docentes_de_cohorte(cur, cohorte)
    notas_por_profesor = []
    for docente in docentes:
        registros = _notas_registros_docente_cohorte(cur, docente, cohorte)
        valores_docente = []
        for reg in registros:
            criterios = _as_list(reg["criterios"])
            valores = _as_dict(reg["valores"]).get(estudiante)
            if not valores:
                continue
            nota = _calcular_nota_final(criterios, valores)
            if nota is not None:
                valores_docente.append(nota)
        if valores_docente:
            notas_por_profesor.append(sum(valores_docente) / len(valores_docente))
    if not notas_por_profesor:
        return None
    return sum(notas_por_profesor) / len(notas_por_profesor)


def desglose_notas_estudiante_cohorte(cur, estudiante: str, cohorte: str) -> list:
    """[{docente, nota|None}, ...] — misma lógica que
    desgloseNotasEstudianteCohorte() en app.js, sin colapsar en un único
    promedio, para poder decir en cuáles materias va bien/mal."""
    detalle = []
    for docente in _docentes_de_cohorte(cur, cohorte):
        registros = _notas_registros_docente_cohorte(cur, docente, cohorte)
        valores_docente = []
        for reg in registros:
            criterios = _as_list(reg["criterios"])
            valores = _as_dict(reg["valores"]).get(estudiante)
            if not valores:
                continue
            nota = _calcular_nota_final(criterios, valores)
            if nota is not None:
                valores_docente.append(nota)
        nota_final = sum(valores_docente) / len(valores_docente) if valores_docente else None
        detalle.append({"docente": docente, "nota": nota_final})
    return detalle


def notas_docente_en_cohorte(cur, docente: str, cohorte: str) -> list:
    """Notas que UN docente le puso a sus propios estudiantes en una
    cohorte, usando el mes más reciente con notas ahí — misma lógica que
    notasDocenteEnCohorte() en app.js (nunca mezcla notas de otros
    profesores)."""
    registros = _notas_registros_docente_cohorte(cur, docente, cohorte)
    meses = sorted([r["mes"] for r in registros if r["mes"]])
    if not meses:
        return []
    mes_reciente = meses[-1]
    reg = next((r for r in registros if r["mes"] == mes_reciente), None)
    if not reg:
        return []
    criterios = _as_list(reg["criterios"])
    valores = _as_dict(reg["valores"])
    cur.execute(
        "SELECT nombre FROM usuarios WHERE rol = 'Estudiante' AND cohorte = %s",
        (cohorte,),
    )
    estudiantes = [r["nombre"] for r in cur.fetchall()]
    resultado = []
    for nombre in estudiantes:
        valores_estudiante = valores.get(nombre)
        nota = _calcular_nota_final(criterios, valores_estudiante) if valores_estudiante else None
        resultado.append({"nombre": nombre, "nota": nota, "mes": mes_reciente})
    return resultado


def _asistencia_pct(cur, filtro_columna: str, filtro_valor: str) -> Optional[tuple]:
    cur.execute(
        f"SELECT estado, COUNT(*) AS n FROM asistencia WHERE {filtro_columna} = %s GROUP BY estado",
        (filtro_valor,),
    )
    conteos = {r["estado"]: r["n"] for r in cur.fetchall()}
    total = sum(conteos.values())
    if not total:
        return None
    presentes = conteos.get("Presente", 0)
    return round(presentes / total * 100), total


def calcular_semaforo(cur) -> list:
    """Réplica de computeSemaforo() en app.js: un registro por cada
    Estudiante, con su promedio general, % de asistencia, y nivel de
    riesgo (Verde/Amarillo/Rojo) según los umbrales de configuracion."""
    cfg = obtener_configuracion(cur)
    cur.execute("SELECT nombre, cohorte FROM usuarios WHERE rol = 'Estudiante'")
    estudiantes = cur.fetchall()

    resultado = []
    for e in estudiantes:
        nombre, cohorte = e["nombre"], e["cohorte"]
        promedio = promedio_general_estudiante_cohorte(cur, nombre, cohorte) if cohorte else None
        asis = _asistencia_pct(cur, "estudiante", nombre)
        asistencia_pct = asis[0] if asis else None

        riesgo = "Verde"
        motivo = ""
        promedio_bajo = promedio is not None and promedio < cfg["notas_minima"]
        promedio_alerta = promedio is not None and promedio < cfg["notas_minima"] + 0.5
        asistencia_baja = asistencia_pct is not None and asistencia_pct < cfg["asistencia_minima"]
        asistencia_alerta = asistencia_pct is not None and asistencia_pct < cfg["asistencia_minima"] + 10
        if promedio_bajo or asistencia_baja:
            riesgo = "Rojo"
            motivo = "Promedio bajo el mínimo" if promedio_bajo else "Asistencia bajo el mínimo"
        elif promedio_alerta or asistencia_alerta:
            riesgo = "Amarillo"
            motivo = "Cerca del mínimo"

        resultado.append({
            "nombre": nombre, "cohorte": cohorte, "promedio": promedio,
            "asistencia": asistencia_pct, "riesgo": riesgo, "motivo": motivo,
        })
    return resultado


# CONTEXTO PÚBLICO (visitante SIN sesión) — solo lo estrictamente
# necesario para reconocer si mencionan a alguien de la fundación por
# nombre, sin exponer ningún dato interno/privado.

def contexto_publico_persona_mencionada(texto_ultimo_mensaje: str) -> str:
    """Contexto en vivo para un visitante SIN sesión: siempre incluye el
    estado real del botón "Postular" (ver contexto_postulacion), que es
    la pregunta más común de un visitante externo (candidato) y antes NO
    se le pasaba — solo los usuarios con sesión (Superadmin, Coordinador,
    Docente, Estudiante) la recibían. Si además menciona el nombre y
    primer apellido de un Estudiante o Docente real, se agrega también el
    bloque institucional (ver _bloque_perfil_persona_publico) para que la
    IA le responda con un mensaje cálido — nunca datos privados."""
    with get_connection() as conn, conn.cursor() as cur:
        partes = [contexto_postulacion(cur)]
        persona = detectar_persona_mencionada(cur, texto_ultimo_mensaje)
        if persona:
            partes.append(_bloque_perfil_persona_publico(persona))
        return "\n".join(p for p in partes if p)


# CONTEXTO POR ROL — cada función asume que el email/rol YA fueron
# verificados por auth.py (nunca reciben el rol "de palabra" del cliente).

def contexto_estudiante(email: str, nombre: str, cohorte: Optional[str] = None) -> str:
    with get_connection() as conn, conn.cursor() as cur:
        if not cohorte and email:
            try:
                cur.execute("SELECT cohorte FROM usuarios WHERE LOWER(email) = %s LIMIT 1", (email.strip().lower(),))
                fila_u = cur.fetchone()
                if fila_u and fila_u.get("cohorte"):
                    cohorte = fila_u["cohorte"]
            except Exception:
                pass

        partes = [f"El usuario es el estudiante {nombre}.", contexto_postulacion(cur)]
        cfg = obtener_configuracion(cur)

        if cohorte:
            partes.append(f"Pertenece a la cohorte {cohorte}.")
            promedio = promedio_general_estudiante_cohorte(cur, nombre, cohorte)
            if promedio is not None:
                partes.append(f"Su promedio general (sobre 10.0) es {round(promedio, 1)}.")
            else:
                partes.append("Todavía no tiene notas registradas.")

            desglose = [d for d in desglose_notas_estudiante_cohorte(cur, nombre, cohorte) if d["nota"] is not None]
            if desglose:
                detalle = "; ".join(
                    f"{d['docente']}: {round(d['nota'], 1)}" + (" (bajo el mínimo, va mal)" if d["nota"] < cfg["notas_minima"] else "")
                    for d in desglose
                )
                partes.append(
                    f"La nota mínima de aprobación en la fundación es {cfg['notas_minima']:.1f}. "
                    f"Notas por docente/materia (sobre 10.0): {detalle}."
                )

        asis = _asistencia_pct(cur, "estudiante", nombre)
        if asis:
            pct, total = asis
            partes.append(
                f"La asistencia mínima requerida es {cfg['asistencia_minima']}%. Su asistencia actual "
                f"es {pct}%{' (por debajo del mínimo)' if pct < cfg['asistencia_minima'] else ''}, "
                f"de {total} clase(s) registrada(s)."
            )

        cur.execute(
            "SELECT tipo, asunto, estado FROM pqr WHERE solicitante = %s ORDER BY fecha DESC LIMIT 5",
            (nombre,),
        )
        pqrs = cur.fetchall()
        if pqrs:
            pendientes = [p for p in pqrs if p["estado"] == "Pendiente"]
            detalle = "; ".join(f"{p['tipo']} \"{p['asunto']}\" ({p['estado']})" for p in pqrs[:3])
            partes.append(f"Tiene {len(pqrs)} PQR enviada(s) ({len(pendientes)} sin resolver/cerrar). Más recientes: {detalle}.")

        cur.execute(
            "SELECT titulo, tipo, fecha FROM agenda_estudiante WHERE estudiante = %s AND fecha >= CURDATE() ORDER BY fecha ASC LIMIT 5",
            (nombre,),
        )
        eventos = cur.fetchall()
        if eventos:
            partes.append("Próximos eventos en su agenda: " + "; ".join(
                f"\"{e['titulo']}\" ({e['tipo']}, {e['fecha']})" for e in eventos
            ) + ".")

        destinos = [email, "Todos", "Todos los estudiantes"] + ([cohorte] if cohorte else [])
        formato = ",".join(["%s"] * len(destinos))
        cur.execute(
            f"""SELECT m.id, m.titulo,
                       (ml.email IS NOT NULL) AS leido
                FROM memorandos m
                LEFT JOIN memorandos_leidos ml ON ml.memorando_id = m.id AND ml.email = %s
                WHERE m.destinatario IN ({formato})""",
            [email] + destinos,
        )
        memos = cur.fetchall()
        if memos:
            no_leidos = [m for m in memos if not m["leido"]]
            partes.append(f"Tiene {len(memos)} memorando(s)/anuncio(s) dirigidos a él, {len(no_leidos)} sin leer." + (
                " Sin leer: " + "; ".join(f"\"{m['titulo']}\"" for m in no_leidos[:3]) + "." if no_leidos else ""
            ))

        if cohorte:
            cur.execute("SELECT modulo FROM modulos WHERE nombre = %s", (cohorte,))
            fila_modulo = cur.fetchone()
            if fila_modulo:
                cur.execute(
                    "SELECT COUNT(*) AS n, COALESCE(SUM(horas),0) AS horas FROM pensum WHERE modulo = %s",
                    (fila_modulo["modulo"],),
                )
                temas = cur.fetchone()
                if temas["n"]:
                    partes.append(f"Su módulo \"{fila_modulo['modulo']}\" tiene {temas['n']} tema(s) en el pensum, por un total de {temas['horas']} horas.")

        cur.execute(
            """SELECT ta.nombre, ta.tipo, ta.fecha FROM trainee_archivos ta
               JOIN usuarios u ON u.id = ta.estudiante_id
               WHERE u.email = %s ORDER BY ta.fecha DESC LIMIT 8""",
            (email,),
        )
        archivos = cur.fetchall()
        if archivos:
            partes.append(f"Tiene {len(archivos)} archivo(s) propio(s) subidos a su Historial Trainee: " + "; ".join(
                f"\"{a['nombre']}\" ({a['fecha']})" for a in archivos
            ) + ".")

        partes.append(
            "Responde con estos datos reales sobre sus propias notas, asistencia, PQR, agenda, "
            "memorandos, pensum y archivos de Historial Trainee — nunca inventes ni des datos de "
            "otros estudiantes."
        )
        return " ".join(partes)


def contexto_docente(email: str, nombre: str) -> str:
    with get_connection() as conn, conn.cursor() as cur:
        partes = [f"El usuario es el docente {nombre}.", contexto_postulacion(cur)]
        cfg = obtener_configuracion(cur)

        cur.execute("SELECT cohorte, mes, franjas FROM horarios")
        por_cohorte_materia = {}
        cohortes_dictadas = set()
        for fila in cur.fetchall():
            for franja in _as_list(fila["franjas"]):
                if franja.get("docente") != nombre or franja.get("estado") == "Inactivo":
                    continue
                cohortes_dictadas.add(fila["cohorte"])
                clave = (fila["cohorte"], franja.get("curso", "Sin materia"))
                por_cohorte_materia.setdefault(clave, 0.0)
                try:
                    hi, mi = map(int, franja["inicio"].split(":"))
                    hf, mf = map(int, franja["fin"].split(":"))
                    por_cohorte_materia[clave] += max((hf * 60 + mf) - (hi * 60 + mi), 0) / 60
                except Exception:
                    pass

        if por_cohorte_materia:
            partes.append("Dicta: " + "; ".join(
                f"{materia} en {cohorte} ({round(horas, 1)} h/semana)"
                for (cohorte, materia), horas in por_cohorte_materia.items()
            ) + ".")

            formato = ",".join(["%s"] * len(cohortes_dictadas))
            cur.execute(
                f"SELECT cohorte, COUNT(*) AS n FROM usuarios WHERE rol = 'Estudiante' AND cohorte IN ({formato}) GROUP BY cohorte",
                list(cohortes_dictadas),
            )
            conteos = {r["cohorte"]: r["n"] for r in cur.fetchall()}
            partes.append("Estudiantes por cohorte a su cargo: " + "; ".join(
                f"{c}: {conteos.get(c, 0)} estudiante(s)" for c in cohortes_dictadas
            ) + ".")

            partes.append(f"La nota mínima de aprobación en la fundación es {cfg['notas_minima']:.1f}.")
            for cohorte in cohortes_dictadas:
                notas = notas_docente_en_cohorte(cur, nombre, cohorte)
                con_nota = [n for n in notas if n["nota"] is not None]
                if con_nota:
                    mes = con_nota[0]["mes"]
                    detalle = "; ".join(
                        f"{n['nombre']}: {round(n['nota'], 1)}" + (" (bajo el mínimo, va mal)" if n["nota"] < cfg["notas_minima"] else "")
                        for n in con_nota
                    )
                    partes.append(f"Notas que puso en {cohorte} (mes {mes}, sobre 10.0): {detalle}.")
        else:
            partes.append("Todavía no tiene materias ni cohortes asignadas en el Horario.")

        cur.execute(
            "SELECT estado, COUNT(*) AS n FROM asistencia WHERE docente = %s GROUP BY estado",
            (nombre,),
        )
        conteos_asis = {r["estado"]: r["n"] for r in cur.fetchall()}
        total_asis = sum(conteos_asis.values())
        if total_asis:
            pct = round(conteos_asis.get("Presente", 0) / total_asis * 100)
            partes.append(f"La asistencia mínima requerida es {cfg['asistencia_minima']}%. En sus clases, la asistencia general de sus estudiantes es {pct}% (sobre {total_asis} registro(s)).")

        if cohortes_dictadas:
            semaforo_todos = calcular_semaforo(cur)
            semaforo_propio = [s for s in semaforo_todos if s["cohorte"] in cohortes_dictadas]
            en_riesgo = [s for s in semaforo_propio if s["riesgo"] == "Rojo"]
            if semaforo_propio:
                partes.append(f"Semáforo de riesgo de sus cohortes: {len(en_riesgo)} estudiante(s) en riesgo (Rojo) de {len(semaforo_propio)} evaluado(s)." + (
                    " En riesgo: " + "; ".join(f"{s['nombre']} ({s['cohorte']}, {s['motivo']})" for s in en_riesgo[:5]) + "." if en_riesgo else ""
                ))

        cur.execute(
            "SELECT tipo, asunto, estado FROM pqr WHERE solicitante = %s ORDER BY fecha DESC LIMIT 5",
            (nombre,),
        )
        pqrs = cur.fetchall()
        if pqrs:
            pendientes = [p for p in pqrs if p["estado"] == "Pendiente"]
            partes.append(f"Tiene {len(pqrs)} PQR enviada(s) ({len(pendientes)} sin resolver/cerrar).")

        cur.execute(
            "SELECT titulo, tipo, fecha FROM agenda_docente WHERE docente = %s AND fecha >= CURDATE() ORDER BY fecha ASC LIMIT 5",
            (nombre,),
        )
        eventos = cur.fetchall()
        if eventos:
            partes.append("Próximos eventos en su agenda: " + "; ".join(
                f"\"{e['titulo']}\" ({e['tipo']}, {e['fecha']})" for e in eventos
            ) + ".")

        cur.execute("SELECT COUNT(*) AS n, COALESCE(SUM(horas),0) AS horas FROM pensum WHERE docente = %s", (nombre,))
        temas = cur.fetchone()
        if temas["n"]:
            partes.append(f"Tiene {temas['n']} tema(s) a su cargo en el pensum, por un total de {temas['horas']} horas.")

        cur.execute("SELECT COUNT(*) AS n FROM informes_docente WHERE docente = %s", (nombre,))
        informes = cur.fetchone()["n"]
        if informes:
            partes.append(f"Ha generado {informes} informe(s) de estudiantes.")

        cur.execute(
            """SELECT titulo, (ml.email IS NOT NULL) AS leido
               FROM memorandos m
               LEFT JOIN memorandos_leidos ml ON ml.memorando_id = m.id AND ml.email = %s
               WHERE m.destinatario IN (%s, 'Todos', 'Todos los docentes')""",
            (email, email),
        )
        memos = cur.fetchall()
        if memos:
            no_leidos = sum(1 for m in memos if not m["leido"])
            partes.append(f"Tiene {len(memos)} memorando(s) reciente(s), {no_leidos} sin leer.")

        partes.append(
            "Trátalo como docente y responde solo sobre sus propias cohortes, materias, "
            "estudiantes, notas, asistencia, riesgo, PQR, agenda, pensum e informes a cargo "
            "(nunca de otros docentes). Si pregunta quién va bien o mal, usa este desglose real."
        )
        return " ".join(partes)


# Códigos de panel que deciden si un Coordinador puede ver ese módulo —
# mismo catálogo que CATALOGO_PANELES en app.js. Solo se listan los
# módulos que este contexto puede llegar a mencionar.
_PANEL_A_ETIQUETA = {
    "admin.modulos": "COHORTES",
    "admin.perfiles": "PERFILES Y PERMISOS",
    "admin.horario": "HORARIO (franjas de clase por cohorte)",
    "admin.pqr": "PQR (peticiones, quejas y reclamos)",
    "admin.memorandos": "MEMORANDOS/ANUNCIOS",
    "admin.semaforo": "SEMÁFORO DE RIESGO",
    "admin.encuestas": "ENCUESTAS",
    "admin.cursos": "CURSOS",
    "admin.informesAdmin": "INFORMES DE DOCENTES",
    "admin.pensum": "PENSUM",
    "admin.codigosqr": "CÓDIGOS QR DE ASISTENCIA",
    "admin.trainee": "HISTORIAL TRAINEE (archivos subidos por estudiantes)",
    "admin.configuracion": "CONFIGURACIÓN DE LA PLATAFORMA",
    "admin.auditoria": "AUDITORÍA (bitácoras de login, acciones y horario)",
}

# Códigos de módulo que, si el último mensaje menciona el nombre exacto de
# una cohorte, reciben el detalle completo de ESA cohorte (no de todas —
# sería carísimo en tokens). Antes solo informesAdmin tenía este trato.
_CODIGOS_CON_DETALLE_COHORTE = {"admin.informesAdmin", "admin.horario", "admin.modulos"}

# Subconjunto de _PANEL_A_ETIQUETA que SOLO ve el Superadmin, nunca el
# Coordinador/Administrador — coincide con data-super-only="true" en el
# sidebar (index.html). contexto_administracion() los excluye siempre,
# sin importar los permisos de su perfil (ese atributo es más fuerte que
# el sistema de permisos por perfil: ni el propio Superadmin puede
# delegárselo a un Coordinador desde "Perfiles y permisos").
_PANELES_SOLO_SUPERADMIN = {"admin.configuracion", "admin.auditoria"}


def _perfiles_de_usuario(cur, usuario_id: str) -> dict:
    cur.execute(
        """SELECT p.permisos FROM perfiles p
           JOIN usuario_perfiles up ON up.perfil_id = p.id
           WHERE up.usuario_id = %s""",
        (usuario_id,),
    )
    permisos_combinados = {}
    for fila in cur.fetchall():
        permisos = _as_dict(fila["permisos"])
        for codigo, acciones in permisos.items():
            if acciones.get("ver"):
                permisos_combinados[codigo] = True
    return permisos_combinados


def _nombres_cohortes(cur) -> list:
    cur.execute("SELECT nombre FROM modulos")
    return [r["nombre"] for r in cur.fetchall() if r.get("nombre")]


def detectar_cohorte_mencionada(cur, texto: str) -> Optional[str]:
    """Si el texto del último mensaje del usuario menciona el nombre de
    alguna cohorte real (coincidencia de subcadena, sin distinguir
    mayúsculas/acentos exactos), devuelve ese nombre tal como está guardado
    en la base de datos. None si no menciona ninguna. Se usa para decidir
    si vale la pena traer el detalle completo de informes de esa cohorte
    (no se puede mandar el de TODAS las cohortes en cada mensaje, sería
    carísimo en tokens y ruidoso para el modelo)."""
    if not texto:
        return None
    texto_norm = texto.lower()
    for nombre in _nombres_cohortes(cur):
        if nombre and nombre.lower() in texto_norm:
            return nombre
    return None


_EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def detectar_persona_mencionada(
    cur, texto: str, roles: tuple = ("Estudiante", "Docente"), permitir_email: bool = False
) -> Optional[dict]:
    """Busca si el texto del último mensaje menciona a un Estudiante o
    Docente real por nombre. Basta con que el texto contenga al menos las
    dos primeras palabras del nombre completo (nombre + primer apellido) —
    así funciona tanto si preguntan el nombre completo como si solo dan
    "nombre y primer apellido" (el caso típico de un visitante externo).
    Si varias personas coinciden con las mismas dos primeras palabras
    (nombres repetidos), devuelve None en vez de arriesgarse a traer o
    mostrar el perfil de la persona equivocada — es preferible que el chat
    pida un dato adicional para desambiguar.

    permitir_email=True (SOLO lo activan los contextos autenticados de
    Superadmin/Coordinador — nunca el de visitante público) hace que
    primero se intente reconocer un correo electrónico exacto en el texto
    y buscar a la persona por ese correo. Una coincidencia por correo es
    inequívoca por definición (es único en la tabla usuarios), así que no
    aplica la regla de ambigüedad por nombre repetido. Si el texto trae un
    correo pero no pertenece a nadie de los roles permitidos, se sigue
    intentando por nombre más abajo (por si el mensaje también menciona un
    nombre real en la misma frase).

    Devuelve {"nombre": ..., "rol": ..., "cohorte": ..., "estado": ...} o
    None si no hay una coincidencia única."""
    if not texto:
        return None
    texto_norm = texto.lower()

    if permitir_email:
        coincidencia_email = _EMAIL_REGEX.search(texto)
        if coincidencia_email:
            placeholders_email = ",".join(["%s"] * len(roles))
            cur.execute(
                f"SELECT nombre, rol, cohorte, estado FROM usuarios "
                f"WHERE LOWER(email) = %s AND rol IN ({placeholders_email})",
                (coincidencia_email.group(0).lower(), *roles),
            )
            fila = cur.fetchone()
            if fila:
                return fila

    placeholders = ",".join(["%s"] * len(roles))
    cur.execute(
        f"SELECT nombre, rol, cohorte, estado FROM usuarios WHERE rol IN ({placeholders})",
        roles,
    )
    personas = cur.fetchall()

    coincidencias = []
    for p in personas:
        palabras = (p["nombre"] or "").strip().split()
        if len(palabras) < 2:
            continue  # no hay "nombre y primer apellido" que exigir — se ignora para evitar falsos positivos de una sola palabra común
        clave = " ".join(palabras[:2]).lower()
        if clave in texto_norm:
            coincidencias.append(p)

    if len(coincidencias) == 1:
        return coincidencias[0]
    return None


def _bloque_informes_cohorte(cur, cohorte: str) -> str:
    """Detalle completo (uno por estudiante) de los informes de docentes
    guardados para esa cohorte — lo que el chat necesita para poder
    RESUMIR el informe de cada estudiante cuando el Superadmin/Coordinador
    lo pida por nombre de cohorte."""
    cur.execute(
        """SELECT docente, estudiante, materia, fecha, asistencia_pct,
                  promedio, cualitativa, conclusion, observaciones
           FROM informes_docente
           WHERE cohorte = %s
           ORDER BY estudiante, fecha DESC""",
        (cohorte,),
    )
    filas = cur.fetchall()
    if not filas:
        return f'No hay informes guardados todavía para la cohorte "{cohorte}".'

    # Un estudiante puede tener más de un informe (de distintos docentes o
    # fechas) — se listan todos, agrupados por estudiante, para que el
    # resumen que pida el Superadmin/Coordinador pueda cubrir cada materia.
    por_estudiante = {}
    for f in filas:
        por_estudiante.setdefault(f["estudiante"], []).append(f)

    bloques = [f'INFORMES DE LA COHORTE "{cohorte}" ({len(por_estudiante)} estudiante(s) con informe):']
    for estudiante, informes in por_estudiante.items():
        detalle_informes = []
        for inf in informes:
            partes_inf = [f"{inf['materia']} (docente {inf['docente']}, {inf['fecha']})"]
            if inf.get("promedio") is not None:
                partes_inf.append(f"promedio {inf['promedio']}")
            if inf.get("asistencia_pct") is not None:
                partes_inf.append(f"asistencia {inf['asistencia_pct']}%")
            if inf.get("cualitativa"):
                partes_inf.append(f"valoración cualitativa: {inf['cualitativa']}")
            if inf.get("conclusion"):
                partes_inf.append(f"conclusión del docente: {inf['conclusion']}")
            if inf.get("observaciones"):
                partes_inf.append(f"observaciones: {inf['observaciones']}")
            detalle_informes.append(" — ".join(partes_inf))
        bloques.append(f"- {estudiante}: " + " | ".join(detalle_informes))
    return "\n".join(bloques)


def _bloque_perfil_persona_administracion(cur, persona: dict) -> str:
    """Resumen completo de UN Estudiante o Docente específico, para
    Superadmin/Coordinador con sesión: estado (activo/inactivo), cohorte,
    notas/asistencia si es estudiante, materias a cargo si es docente, y
    riesgo. La IA agrega su propia valoración a partir de estos datos
    reales — nunca inventa cifras."""
    nombre, rol, cohorte, estado = persona["nombre"], persona["rol"], persona["cohorte"], persona["estado"]
    vigente = (estado or "Activo") == "Activo"
    partes = [
        f'PERFIL DE "{nombre}" ({rol}): estado actual = {"VIGENTE / activo" if vigente else "INACTIVO (dado de baja o suspendido)"}.'
    ]

    if rol == "Estudiante":
        if cohorte:
            partes.append(f"Pertenece a la cohorte {cohorte}.")
            promedio = promedio_general_estudiante_cohorte(cur, nombre, cohorte)
            if promedio is not None:
                cfg = obtener_configuracion(cur)
                partes.append(f"Promedio general: {promedio:.1f} sobre 10.0 (mínimo de aprobación: {cfg['notas_minima']:.1f}).")
            else:
                partes.append("Todavía no tiene notas registradas.")
        else:
            partes.append("No tiene cohorte asignada actualmente.")

        asis = _asistencia_pct(cur, "estudiante", nombre)
        if asis:
            pct, total = asis
            cfg = obtener_configuracion(cur)
            partes.append(f"Asistencia: {pct}% (sobre {total} registro(s); mínimo requerido: {cfg['asistencia_minima']}%).")

        if cohorte:
            semaforo = calcular_semaforo(cur)
            propio = next((s for s in semaforo if s["nombre"] == nombre), None)
            if propio:
                partes.append(f"Semáforo de riesgo: {propio['riesgo']}" + (f" ({propio['motivo']})." if propio["motivo"] else "."))

    elif rol == "Docente":
        asignaciones = _asignaciones_docente(cur, nombre)
        if asignaciones:
            partes.append("Dicta: " + "; ".join(f"{curso} en {cohorte}" for cohorte, curso in asignaciones) + ".")
        else:
            partes.append("No tiene materias ni cohortes asignadas actualmente en el Horario.")

        asis = _asistencia_pct(cur, "docente", nombre)
        if asis:
            pct, total = asis
            partes.append(f"Asistencia general registrada en sus clases: {pct}% (sobre {total} registro(s)).")

        cur.execute("SELECT COUNT(*) AS n FROM informes_docente WHERE docente = %s", (nombre,))
        n_informes = cur.fetchone()["n"]
        if n_informes:
            partes.append(f"Ha generado {n_informes} informe(s) de estudiantes.")

    partes.append(
        "Con estos datos reales, dale al Superadmin/Coordinador un resumen breve de la persona y "
        "agrega tu propia valoración honesta de cómo va (basada solo en las cifras de arriba, sin "
        "inventar nada) — por ejemplo si su desempeño/asistencia es sólido, si hay señales de "
        "alerta, o si falta información para opinar."
    )
    return "\n".join(partes)


def _bloque_perfil_persona_publico(persona: dict) -> str:
    """Para un VISITANTE SIN SESIÓN que pregunta por el nombre y primer
    apellido de un Estudiante o Docente real: nunca se comparte estado,
    notas, asistencia, cohorte ni ningún dato interno — solo se confirma
    que la persona hace parte de la fundación y se invita a la IA a
    redactar un mensaje cálido sobre lo que representa formar parte de la
    comunidad A+, sin datos privados."""
    nombre, rol = persona["nombre"], persona["rol"]
    rol_texto = "estudiante (trainee)" if rol == "Estudiante" else "docente"
    return (
        f'PERSONA MENCIONADA POR UN VISITANTE SIN SESIÓN: "{nombre}" es {rol_texto} de la Fundación A+. '
        "NO reveles su estado (activo/inactivo), notas, asistencia, cohorte, correo ni ningún otro dato "
        "interno — un visitante externo nunca debe recibir esa información. En vez de eso, respóndele con "
        "un mensaje breve, cálido y genuino sobre lo que esa persona representa para la fundación (parte "
        "de la comunidad A+, su rol como estudiante/docente en el propósito educativo del Litoral "
        "Pacífico, etc.), sin inventar logros, cifras o anécdotas específicas que no tengas — mantenlo "
        "general y sincero, como un reconocimiento institucional, no como una biografía."
    )


def _bloque_modulo(cur, codigo: str, cohorte_mencionada: Optional[str] = None) -> str:
    etiqueta = _PANEL_A_ETIQUETA[codigo]
    if codigo == "admin.modulos":
        cur.execute("SELECT nombre, modulo, estado, cupos, fecha_inicio, fecha_fin FROM modulos")
        filas = cur.fetchall()
        cur.execute(
            "SELECT cohorte, COUNT(*) AS n FROM usuarios "
            "WHERE rol = 'Estudiante' AND cohorte IS NOT NULL AND cohorte != '' GROUP BY cohorte"
        )
        inscritos_por_cohorte = {r["cohorte"]: r["n"] for r in cur.fetchall()}
        resumen = f"{etiqueta}: {len(filas)} cohorte(s) registrada(s)."
        if cohorte_mencionada:
            fila = next((f for f in filas if f["nombre"] == cohorte_mencionada), None)
            if fila:
                inscritos = inscritos_por_cohorte.get(cohorte_mencionada, 0)
                resumen += (
                    f' Cohorte "{cohorte_mencionada}": training/módulo "{fila["modulo"]}", '
                    f'estado {fila["estado"]}, {inscritos} estudiante(s) inscrito(s) de {fila["cupos"]} cupo(s)'
                    + (f", inicia {fila['fecha_inicio']}" if fila.get("fecha_inicio") else "")
                    + (f", termina {fila['fecha_fin']}" if fila.get("fecha_fin") else "") + "."
                )
            else:
                resumen += f' No encontré ninguna cohorte llamada exactamente "{cohorte_mencionada}".'
        elif filas:
            resumen += " " + "; ".join(
                f"{f['nombre']} ({f['estado']}, {inscritos_por_cohorte.get(f['nombre'], 0)}/{f['cupos']} cupos)"
                for f in filas[:10]
            ) + "."
        return resumen
    if codigo == "admin.perfiles":
        cur.execute("SELECT nombre, categoria FROM perfiles ORDER BY categoria, nombre")
        filas = cur.fetchall()
        if not filas:
            return f"{etiqueta}: no hay ningún perfil creado todavía."
        por_categoria = {}
        for f in filas:
            por_categoria.setdefault(f["categoria"], []).append(f["nombre"])
        detalle = "; ".join(f"{cat}: " + ", ".join(nombres) for cat, nombres in por_categoria.items())
        return f"{etiqueta}: {len(filas)} perfil(es) en total. {detalle}."
    if codigo == "admin.horario":
        cur.execute("SELECT cohorte, franjas FROM horarios")
        filas = cur.fetchall()
        total_franjas = 0
        docentes_asignados = set()
        cohortes_con_horario = set()
        franjas_cohorte_mencionada = None
        for fila in filas:
            activas = [f for f in _as_list(fila["franjas"]) if f.get("estado") != "Inactivo"]
            if not activas:
                continue
            cohortes_con_horario.add(fila["cohorte"])
            total_franjas += len(activas)
            for f in activas:
                if f.get("docente"):
                    docentes_asignados.add(f["docente"])
            if cohorte_mencionada and fila["cohorte"] == cohorte_mencionada:
                franjas_cohorte_mencionada = activas
        resumen = (
            f"{etiqueta}: {total_franjas} franja(s) de clase activa(s) en total, repartidas en "
            f"{len(cohortes_con_horario)} cohorte(s), con {len(docentes_asignados)} docente(s) distinto(s) asignado(s)."
        )
        if cohorte_mencionada:
            if franjas_cohorte_mencionada:
                resumen += f'\nHorario de la cohorte "{cohorte_mencionada}": ' + "; ".join(
                    f"{f.get('dia', '?')} {f.get('inicio', '?')}–{f.get('fin', '?')} "
                    f"{f.get('curso') or '(sin materia)'}" + (f" con {f['docente']}" if f.get("docente") else " (sin docente asignado)")
                    for f in franjas_cohorte_mencionada
                ) + "."
            else:
                resumen += f'\nLa cohorte "{cohorte_mencionada}" no tiene franjas de horario activas registradas.'
        return resumen
    if codigo == "admin.pqr":
        cur.execute("SELECT COUNT(*) AS n FROM pqr")
        total = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM pqr WHERE estado = 'Pendiente'")
        pendientes = cur.fetchone()["n"]
        resumen = f"{etiqueta}: {total} en total, {pendientes} pendiente(s)."
        if pendientes:
            cur.execute(
                "SELECT tipo, solicitante, remitente_rol, asunto, fecha FROM pqr "
                "WHERE estado = 'Pendiente' ORDER BY fecha DESC LIMIT 8"
            )
            pend = cur.fetchall()
            resumen += " Pendientes: " + "; ".join(
                f"{p['tipo']} de {p['solicitante']} ({p['remitente_rol']}) — \"{p['asunto']}\" ({p['fecha']})" for p in pend
            ) + "."
        return resumen
    if codigo == "admin.memorandos":
        cur.execute("SELECT COUNT(*) AS n FROM memorandos")
        total = cur.fetchone()["n"]
        resumen = f"{etiqueta}: {total} en total."
        if total:
            cur.execute("SELECT titulo, destinatario, estado, fecha FROM memorandos ORDER BY fecha DESC LIMIT 8")
            recientes = cur.fetchall()
            resumen += " Más recientes: " + "; ".join(
                f'"{m["titulo"]}" para {m["destinatario"]} ({m["estado"]}, {m["fecha"]})' for m in recientes
            ) + "."
        return resumen
    if codigo == "admin.semaforo":
        semaforo = calcular_semaforo(cur)
        en_riesgo = [s for s in semaforo if s["riesgo"] == "Rojo"]
        detalle = f"{etiqueta}: {len(en_riesgo)} estudiante(s) en riesgo (Rojo) de un total de {len(semaforo)} evaluados."
        if en_riesgo:
            detalle += " En riesgo: " + "; ".join(
                f"{s['nombre']} ({s['cohorte'] or 'sin cohorte'}, {s['motivo']})" for s in en_riesgo[:6]
            ) + "."
        return detalle
    if codigo == "admin.encuestas":
        cur.execute("SELECT COUNT(*) AS n FROM encuestas")
        total = cur.fetchone()["n"]
        resumen = f"{etiqueta}: {total} configurada(s)."
        if total:
            cur.execute("SELECT titulo, cohorte, estado, fecha FROM encuestas ORDER BY fecha DESC LIMIT 8")
            recientes = cur.fetchall()
            resumen += " Detalle: " + "; ".join(
                f'"{e["titulo"]}" ({e["cohorte"]}, {e["estado"]}, {e["fecha"]})' for e in recientes
            ) + "."
        return resumen
    if codigo == "admin.cursos":
        cur.execute("SELECT COUNT(*) AS n FROM cursos")
        total = cur.fetchone()["n"]
        resumen = f"{etiqueta}: {total} registrado(s)."
        if total:
            cur.execute("SELECT nombre, estado FROM cursos ORDER BY nombre LIMIT 10")
            filas = cur.fetchall()
            resumen += " " + "; ".join(f"{c['nombre']} ({c['estado']})" for c in filas) + "."
        return resumen
    if codigo == "admin.pensum":
        cur.execute("SELECT COUNT(*) AS n FROM pensum")
        total = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(DISTINCT modulo) AS n FROM pensum")
        modulos_con_pensum = cur.fetchone()["n"]
        return f"{etiqueta}: {total} tema(s) registrado(s), repartidos en {modulos_con_pensum} módulo(s)/cohorte(s)."
    if codigo == "admin.codigosqr":
        cur.execute("SELECT COUNT(*) AS n FROM qr_tokens")
        total = cur.fetchone()["n"]
        return f"{etiqueta}: {total} código(s) QR generado(s) en total (para registrar asistencia por escaneo)."
    if codigo == "admin.trainee":
        cur.execute("SELECT COUNT(*) AS n FROM trainee_archivos")
        total = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(DISTINCT estudiante_id) AS n FROM trainee_archivos")
        estudiantes_con_archivos = cur.fetchone()["n"]
        return f"{etiqueta}: {total} archivo(s) subido(s) en total, por {estudiantes_con_archivos} estudiante(s) distinto(s)."
    if codigo == "admin.configuracion":
        cfg = obtener_configuracion(cur)
        return (
            f"{etiqueta}: nombre de la fundación \"{cfg['nombre']}\", "
            f"nota mínima de aprobación {cfg['notas_minima']:.1f} (fija, ya no configurable), "
            f"asistencia mínima {cfg['asistencia_minima']}% (solo informativa, no decide la aprobación), "
            f"postulación pública {'habilitada' if cfg['postulacion_habilitada'] else 'deshabilitada'}."
        )
    if codigo == "admin.auditoria":
        cur.execute("SELECT COUNT(*) AS n FROM auditoria_login")
        total_login = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM auditoria_login WHERE resultado != 'Exitoso'")
        login_fallidos = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM auditoria_acciones")
        total_acciones = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM auditoria_horario")
        total_horario = cur.fetchone()["n"]
        resumen = (
            f"{etiqueta}: {total_login} intento(s) de inicio de sesión registrados ({login_fallidos} fallido(s)/no exitoso(s)), "
            f"{total_acciones} acción(es) administrativa(s) registradas, {total_horario} cambio(s) de horario registrados."
        )
        # Detalle de los intentos de login FALLIDOS: quién y cuándo — para
        # que si preguntan "¿de quién son esos fallidos y qué fecha?" (caso
        # real reportado) el chat pueda responder sin decir que no tiene el
        # dato. Con LIMIT 10 alcanza de sobra para una pregunta de
        # seguimiento sin inflar el prompt si hay muchísimos registros.
        if login_fallidos:
            cur.execute(
                "SELECT fecha, hora, email, rol FROM auditoria_login WHERE resultado != 'Exitoso' "
                "ORDER BY fecha DESC, hora DESC LIMIT 10"
            )
            fallidos_detalle = cur.fetchall()
            resumen += "\nIntentos de login fallidos (más recientes primero): " + "; ".join(
                f"{f['email']} ({f['rol']}) el {f['fecha']} a las {f['hora']}" for f in fallidos_detalle
            ) + "."
        # Detalle de las acciones más recientes: solo si la persona
        # explícitamente pregunta por auditoría (mismo criterio que el
        # detalle de informes por cohorte) — no hace falta adivinar aquí,
        # esta función solo se llama cuando el módulo ya está permitido y
        # el Superadmin/Coordinador está consultando ese tema.
        cur.execute("SELECT fecha, hora, tipo, actor, rol, detalle FROM auditoria_acciones ORDER BY fecha DESC, hora DESC LIMIT 8")
        recientes = cur.fetchall()
        if recientes:
            resumen += "\nÚltimas acciones registradas: " + "; ".join(
                f"{r['fecha']} {r['hora']} — {r['actor']} ({r['rol']}) {r['tipo']}" + (f": {r['detalle']}" if r['detalle'] else "")
                for r in recientes
            ) + "."
        return resumen
    if codigo == "admin.informesAdmin":
        cur.execute("SELECT COUNT(*) AS n FROM informes_docente")
        total = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(DISTINCT cohorte) AS n FROM informes_docente")
        cohortes_con_informes = cur.fetchone()["n"]
        resumen = f"{etiqueta}: {total} informe(s) guardado(s) en total, repartidos en {cohortes_con_informes} cohorte(s)."
        # Solo se trae el DETALLE completo (uno por estudiante) de la
        # cohorte que la persona mencionó en su pregunta — traer el de
        # todas las cohortes en cada mensaje sería carísimo en tokens.
        if cohorte_mencionada:
            resumen += "\n\n" + _bloque_informes_cohorte(cur, cohorte_mencionada)
        else:
            resumen += (
                ' Si el Superadmin/Coordinador pide el resumen o el detalle de los informes de UNA '
                'cohorte específica, pídele que te diga el nombre exacto de esa cohorte para poder '
                'traer el detalle completo de cada estudiante.'
            )
        return resumen
    return ""


def contexto_administracion(email: str, nombre: str, usuario_id: Optional[str], texto_ultimo_mensaje: str = "") -> str:
    """Coordinador/Administrador: SOLO ve los módulos que su perfil tiene
    habilitados con 'ver' (igual que el sidebar y que
    construirResumenModulosParaChat(currentAdminUser) en app.js)."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM usuarios")
        total_usuarios = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM modulos")
        total_cohortes = cur.fetchone()["n"]

        permisos = _perfiles_de_usuario(cur, usuario_id) if usuario_id else {}
        cohorte_mencionada = detectar_cohorte_mencionada(cur, texto_ultimo_mensaje)
        partes_modulos = [
            _bloque_modulo(cur, codigo, cohorte_mencionada if codigo in _CODIGOS_CON_DETALLE_COHORTE else None)
            for codigo in _PANEL_A_ETIQUETA
            if codigo in permisos and codigo not in _PANELES_SOLO_SUPERADMIN
        ]

        bloque_modulos = "\n".join(partes_modulos) if partes_modulos else (
            "No tiene permiso de \"ver\" habilitado sobre ningún módulo adicional "
            "(Cohortes, Perfiles y permisos, Horario, PQR, Memorandos, Semáforo, Encuestas, Cursos, "
            "Informes de docentes, Pensum, Códigos QR, Historial Trainee) según su perfil actual."
        )

        # Si menciona a un Estudiante/Docente real por nombre (o por correo
        # electrónico — coincidencia inequívoca, ver detectar_persona_mencionada),
        # se trae su perfil completo (estado, notas/asistencia o materias a
        # cargo) — disponible para el Coordinador igual que para el
        # Superadmin, ya que consultar personas no está gobernado por los
        # permisos de panel de arriba (es una consulta transversal, como el
        # buscador de usuarios que ya tiene en su propio panel de Usuarios).
        persona = detectar_persona_mencionada(cur, texto_ultimo_mensaje, permitir_email=True)
        bloque_persona = _bloque_perfil_persona_administracion(cur, persona) if persona else ""

        postulacion = contexto_postulacion(cur)

    return (
        f"El usuario es el administrador (Coordinador) {nombre}. Datos del sistema en vivo: "
        f"actualmente hay {total_usuarios} usuario(s) registrado(s) en la plataforma y {total_cohortes} cohorte(s).\n"
        f"{bloque_modulos}\n"
        "Trátalo como Coordinador. SOLO tiene acceso a los módulos listados arriba según su "
        "perfil — si pregunta por otro módulo que no aparezca ahí, dile con honestidad que no "
        "tiene permiso de verlo desde su perfil actual y que consulte al Superadmin. Si pidió "
        "resumir o comentar los informes de una cohorte y ves el detalle completo (por "
        "estudiante) más arriba, resume cada estudiante con sus datos reales (promedio, "
        "asistencia, valoración cualitativa, conclusión) — no listes los campos en crudo, "
        "redáctalo como un resumen breve y claro por estudiante.\n"
        f"{bloque_persona}\n"
        f"{postulacion}"
    )


def contexto_superadmin(texto_ultimo_mensaje: str = "") -> str:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT rol, COUNT(*) AS n FROM usuarios GROUP BY rol")
        conteos = {r["rol"]: r["n"] for r in cur.fetchall()}
        total_usuarios = sum(conteos.values())
        cur.execute("SELECT COUNT(*) AS n FROM modulos")
        total_cohortes = cur.fetchone()["n"]

        cohorte_mencionada = detectar_cohorte_mencionada(cur, texto_ultimo_mensaje)
        bloques_modulos = "\n".join(
            _bloque_modulo(cur, codigo, cohorte_mencionada if codigo in _CODIGOS_CON_DETALLE_COHORTE else None)
            for codigo in _PANEL_A_ETIQUETA
        )

        persona = detectar_persona_mencionada(cur, texto_ultimo_mensaje, permitir_email=True)
        bloque_persona = _bloque_perfil_persona_administracion(cur, persona) if persona else ""

        postulacion = contexto_postulacion(cur)

    trainees = conteos.get("Estudiante", 0)
    docentes = conteos.get("Docente", 0)
    coordinadores = conteos.get("Coordinador", 0) + conteos.get("Administrador", 0)

    return (
        "El usuario que está hablando es el SUPERADMIN de la Fundación A+ (máxima autoridad "
        "del sistema, con acceso a todos los módulos).\n"
        "Datos en tiempo real del sistema de la Fundación:\n"
        f"- Total de usuarios registrados en la plataforma: {total_usuarios} "
        f"({trainees} trainees/estudiantes, {docentes} docentes y {coordinadores} coordinadores).\n"
        f"- Cohortes totales registradas: {total_cohortes}.\n"
        f"{bloques_modulos}\n"
        "Trátalo reconociendo que es el Superadmin y responde siempre con estos datos oficiales "
        "de la plataforma si te pregunta por usuarios, estadísticas o cualquiera de los módulos "
        "anteriores (Cohortes, Perfiles y permisos, Horario, PQR, Memorandos, Semáforo de riesgo, "
        "Encuestas, Cursos, Informes de docentes, Pensum, Códigos QR de asistencia, Historial "
        "Trainee, Configuración de la plataforma, Auditoría). Si pregunta por un módulo o dato que "
        "no aparece aquí arriba, dilo con honestidad en vez de inventarlo. Si pidió resumir o "
        "comentar los informes de una cohorte y ves el detalle completo (por estudiante) más "
        "arriba, resume cada estudiante con sus datos reales (promedio, asistencia, valoración "
        "cualitativa, conclusión) — no listes los campos en crudo, redáctalo como un resumen breve "
        "y claro por estudiante.\n"
        f"{bloque_persona}\n"
        f"{postulacion}"
    )