# Formularios v1.1 — modelo editable (menos restrictivo)

Versión del constructor de formularios alineada con la rama `AndresDj-formularios-v1`.

La v1 congelaba la estructura al publicar. Esta v1.1 **permite editar preguntas y tipos de input** también en formularios publicados, y conserva un único candado: no borrar una pregunta que ya tiene respuestas.

## Qué incluye

- CRUD, estados, papelera, placeholders por tipo y **Clonar** (igual que v1).
- Editor siempre abierto: enunciado, tipo, opciones, orden, obligatoriedad y preguntas nuevas.
- Guardado por **UPSERT** (`UPDATE` si el `pregunta_id` existe, `INSERT` si es nueva). Los IDs no se regeneran, así las respuestas históricas siguen ancladas a la misma celda.
- Se puede volver a borrador o cambiar de estado sin clonar.

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

## Qué sigue restringido (celdas huérfanas)

Las respuestas viven en `formulario_respuesta_valores.pregunta_id`. Si se **elimina** una pregunta que ya tiene envíos, esos valores quedan huérfanos: desaparecen de columnas CSV y de la tabla de respuestas.

Por eso el API responde 409 al borrar una pregunta con valores. Sí se puede:

- Cambiar el enunciado.
- Cambiar el tipo de input (los envíos viejos quedan en el formato anterior; los nuevos usan el tipo nuevo).
- Reordenar.
- Agregar preguntas.
- Borrar preguntas **sin** respuestas.

## Recomendación

Editar en caliente sirve para corregir un typo o el tipo de un campo. Si el cambio es estructural grande (quitar bloques que ya se respondieron, o partir un formulario en dos), **Clonar** sigue siendo la vía limpia: borrador nuevo, IDs nuevos, historial del original intacto.
