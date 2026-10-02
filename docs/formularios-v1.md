# Formularios v1 — modelo estricto de publicación

Versión del constructor de formularios (panel **Formularios / Forms**) alineada con la rama `AndresDj-formularios-v1`.

## Qué incluye esta versión

- CRUD de formularios en el dashboard (Superadmin, Administrador, Coordinador).
- Estados: borrador, público, solo autenticados, cerrado; papelera (archivado suave).
- Tipos de pregunta: texto corto, párrafo, correo, número, fecha, opción única, opción múltiple, lista desplegable, archivo (máx. 8 MB) y sección.
- Placeholders por tipo en vista previa y en el formulario público.
- **Clonar / copiar** un formulario a un borrador nuevo (nuevos IDs de pregunta).
- Estructura **congelada** una vez publicado o cuando ya hay respuestas.

## Placeholders por tipo de input

| Tipo | Placeholder |
| --- | --- |
| Texto corto | Ingresar texto |
| Párrafo | Escribe tu respuesta aquí |
| Correo | nombre@correo.com |
| Número | Solo números. Ej. 3001234567 |
| Fecha | AAAA-MM-DD |
| Opción única | Selecciona una opción |
| Opción múltiple | Selecciona una o más opciones |
| Lista desplegable | Selecciona una opción |
| Subir archivo | PDF, imagen, Word o Excel (máx. 8 MB) |
| Sección | (sin campo de respuesta) |

El correo público del remitente (cuando no hay sesión) usa el mismo formato `nombre@correo.com`.

## Por qué la estructura queda bloqueada al publicar

Las respuestas no se guardan como una fila ancha con columnas fijas de Excel. Cada envío crea:

1. Una fila en `formulario_respuestas` (quién, cuándo, IP).
2. Una o más filas en `formulario_respuesta_valores`, **ancladas al `pregunta_id`** de ese momento.

El guardado de preguntas en el editor hace un reemplazo completo de `formulario_preguntas` (DELETE + INSERT). Si se edita un formulario ya publicado:

- Borrar o recrear una pregunta genera **celdas huérfanas**: valores cuyo `pregunta_id` ya no existe. En el CSV y en la tabla de respuestas esas celdas aparecen vacías o desaparecen de las columnas.
- Cambiar el tipo (por ejemplo de texto a múltiple) deja datos incompatibles: texto plano donde ahora se espera JSON, o un archivo donde ahora hay un select.
- Reordenar o fusionar enunciados **rompe el alineamiento** de columnas históricas: la misma posición deja de significar la misma pregunta.
- Volver a borrador no deshace los envíos ya recibidos; reabrir el mismo slug con otra estructura mezcla cohortes de datos distintos bajo el mismo enlace público.

Por eso, en esta versión, un formulario pasa a **estructura cerrada** si:

- el estado es `publico`, `autenticados` o `cerrado`, o
- ya tiene al menos una respuesta.

En ese estado se pueden ajustar título, fechas de vigencia y límites (por usuario / por IP), pero **no** las preguntas. Tampoco se puede devolver a borrador.

## Recomendación de uso

1. Crea el formulario en **Borrador**.
2. Completa enunciados, tipos, opciones, obligatoriedad y texto de ayuda.
3. Usa **Vista previa** y recorre cada tipo de campo (correo con formato, número, archivo, etc.).
4. Publica solo cuando el formulario esté verificado de punta a punta.
5. Si hay un error **después** de publicar, no edites las preguntas del original. Usa **Clonar**: se crea un borrador `… (copia)` con **nuevos IDs de pregunta**, sin copiar respuestas. Corrige ahí, verifica otra vez y publica la copia (tendrá un slug distinto; el original conserva su historial intacto).

Clonar es la vía de reparación de una publicación prematura. No reescribe el formulario vivo ni deja valores huérfanos.
