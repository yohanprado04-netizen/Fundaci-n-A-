"""
Autenticación del chat: el backend NUNCA confía en un rol o email que el
navegador diga tener "de palabra". En vez de eso:

1. El frontend llama POST /auth/login con email + password (las mismas
   credenciales que la persona ya usa para entrar a la app).
2. Este módulo las valida contra MySQL (tabla usuarios / superadmin_credentials
   — ver db.buscar_usuario_por_credenciales) y, si son correctas, emite un
   JWT firmado con SECRET_KEY que expira en unas horas.
3. En cada mensaje del chat, el frontend manda ese token (no el email/rol
   sueltos). El backend lo verifica con verificar_token(): si es válido,
   de ahí saca el email/rol REAL; si no, lo trata como visitante sin sesión.

Así, aunque alguien manipule el navegador para mandar "rol: Superadmin" a
mano, el backend lo ignora por completo — todo pasa por el token firmado.

Requiere la variable de entorno SECRET_KEY (ver .env.example): una cadena
larga y aleatoria, distinta en cada entorno. Sin ella, el backend genera
una al azar en cada arranque (los tokens emitidos antes de reiniciar
dejan de sumar validez) — funciona para probar, pero en producción real
SECRET_KEY debe fijarse en Render para que no expire toda sesión activa
en cada redeploy.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from dotenv import load_dotenv

from db import buscar_usuario_por_credenciales

# Igual que en db.py: se carga aquí también para no depender del orden de
# imports de quien use este módulo. Si SECRET_KEY no está en el .env, se
# genera una aleatoria como respaldo — pero entonces los tokens de sesión
# dejan de ser válidos cada vez que el servidor se reinicia, así que
# siempre conviene definir SECRET_KEY explícitamente en el .env real.
load_dotenv()

def _obtener_php_jwt_secret() -> Optional[str]:
    # 1. Variable de entorno directa
    env_secret = os.getenv("PHP_JWT_SECRET") or os.getenv("JWT_SECRET")
    if env_secret and len(env_secret.strip()) >= 32:
        return env_secret.strip()

    # 2. Archivo protegido .jwt_secret en api/ (despliegue local conjunto)
    posible_jwt_secret_path = os.path.join(os.path.dirname(__file__), "..", "api", ".jwt_secret")
    if os.path.exists(posible_jwt_secret_path):
        try:
            with open(posible_jwt_secret_path, "r", encoding="utf-8") as f:
                contenido = f.read().strip()
                if len(contenido) >= 32:
                    return contenido
        except Exception:
            pass

    # 3. Archivo .env en la raíz del proyecto
    posible_env_root = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(posible_env_root):
        try:
            with open(posible_env_root, "r", encoding="utf-8") as f:
                for linea in f:
                    linea = linea.strip()
                    if linea.startswith("JWT_SECRET="):
                        val = linea.split("=", 1)[1].strip(" '\"")
                        if len(val) >= 32:
                            return val
        except Exception:
            pass

    return None

SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
PHP_JWT_SECRET = _obtener_php_jwt_secret()
ALGORITHM = "HS256"
HORAS_EXPIRACION = 8


def crear_token(usuario: dict) -> str:
    """
    Genera y firma un token JWT con la información del usuario autenticado
    (email, nombre, rol, id y cohorte) y un tiempo de expiración determinado.
    """
    ahora = datetime.now(timezone.utc)
    payload = {
        "email": usuario["email"],
        "nombre": usuario["nombre"],
        "rol": usuario["rol"],
        "usuario_id": usuario.get("id"),
        "cohorte": usuario.get("cohorte"),
        "iat": ahora,
        "exp": ahora + timedelta(hours=HORAS_EXPIRACION),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token(token: str) -> Optional[dict]:
    """Devuelve el payload (email, nombre, rol, usuario_id, cohorte) si el
    token es válido y no expiró; None en cualquier otro caso — un token
    inválido/vencido NUNCA lanza error, simplemente se trata a quien
    pregunta como visitante sin sesión (mismo comportamiento que si no
    hubiera mandado token)."""
    if not token:
        return None
    # 1. Intentar con SECRET_KEY propia del backend de chat
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        pass

    # 2. Respaldo: intentar con JWT_SECRET de la aplicación web PHP si está configurado
    if PHP_JWT_SECRET:
        try:
            payload = jwt.decode(token, PHP_JWT_SECRET, algorithms=[ALGORITHM])
            if not payload.get("nombre"):
                from db import db_configurada, get_connection
                if db_configurada():
                    try:
                        with get_connection() as conn, conn.cursor() as cur:
                            if payload.get("rol") == "Superadmin":
                                payload["nombre"] = "Superadmin"
                            else:
                                cur.execute(
                                    "SELECT nombre, cohorte FROM usuarios WHERE LOWER(email) = %s LIMIT 1",
                                    ((payload.get("email") or "").strip().lower(),),
                                )
                                row = cur.fetchone()
                                if row:
                                    payload["nombre"] = row.get("nombre", "")
                                    if not payload.get("cohorte"):
                                        payload["cohorte"] = row.get("cohorte")
                    except Exception:
                        pass
            return payload
        except Exception:
            return None


def intentar_login(email: str, password: str) -> Optional[str]:
    """Valida contra MySQL y devuelve un token nuevo, o None si las
    credenciales no coinciden con ningún usuario activo."""
    usuario = buscar_usuario_por_credenciales(email, password)
    if not usuario:
        return None
    return crear_token(usuario)