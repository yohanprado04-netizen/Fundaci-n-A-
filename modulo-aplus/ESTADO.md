# Estado del módulo "Proyectos e Iniciativas A+" — Fundación A+

Especificación completa: [propmt.md](propmt.md). Guía de uso e integración: [README.md](README.md).
Este archivo resume el estado, las decisiones y lo pendiente.

## Ubicación
Todo el módulo vive en `modulo-aplus/` para no chocar con `index.html`, `app.js` y `style.css`
de la plataforma principal (raíz del repo). **No modificar archivos fuera de `modulo-aplus/`.**

## Hecho y probado en navegador
- `index.html` (página independiente con `#aplus-module-root` y los ganchos `data-aplus-*`).
- `css/aplus-module.css` (encapsulado bajo `#aplus-module-root`, prefijo `aplus-`, variables en
  `:root, #aplus-module-root`, responsive, `prefers-reduced-motion`, `:focus-visible`).
- `js/` completo: datos mock, servicio, utilidades, componentes y `app.js`.
- `README.md` con prueba local, integración, paso a API REST, personalización y advertencias.

Pruebas automatizadas con Chrome headless (Playwright, fuera del repo), 60/60 correctas y
sin errores de consola: skeleton inicial → 6 tarjetas (12 proyectos, 6 por página), métricas,
búsqueda con debounce ("solar", "APL-006", "energia" sin tildes, Enter inmediato), switch A+
(6 proyectos), selects de categoría y estado, los tres órdenes, vista grid/lista sin volver a
consultar, paginación, botón limpiar (deshabilitado sin filtros), estado vacío y su botón,
modal (ESC, clic en el fondo, botón Cerrar, foco devuelto al disparador, Tab atrapado,
bloqueo de scroll, evento `aplus:project-open`), modo REST con fetch interceptado, estado de
error + Reintentar, y layouts a 360/375/768/1280 px sin scroll horizontal.

## Correcciones aplicadas durante las pruebas
- Modal: si se reabría durante la animación de cierre (200 ms), el listener de teclado no se
  volvía a registrar y ESC/Tab dejaban de funcionar. Ahora se usa un estado `isOpen` explícito.
- `app.js`: la auto-inicialización montaba el módulo antes de que la web anfitriona pudiera
  llamar a `initAPlusModule(root, { pageSize })` o configurar la API. Ahora se puede
  desactivar con `data-aplus-autoinit="false"` en el root.
- `helpers.js`: el rango de diacríticos de `normalizeText` usaba caracteres combinantes
  literales; se cambió a escapes `̀-ͯ` (mismo comportamiento, más robusto).

## Decisión de diseño: color primario BLANCO
El usuario pidió que el color primario sea blanco y que "combine bien":
- `--aplus-color-primary: #FFFFFF`, texto sobre primario y estados activos en azul-pizarra oscuro (`#0F172A`).
- Botón primario: fondo blanco, borde y texto oscuros; en hover se rellena de oscuro con texto blanco.
- Estados activos (vista grid/lista seleccionada, página actual, foco) usan el tono oscuro.
- Las oportunidades A+ mantienen su acento esmeralda (`#059669`) y dorado (`#B7791F` / `#D4A017`).
- Fondo `#F8FAFC`, tarjetas `#FFFFFF` con borde `#E2E8F0`. Todo el color primario está
  centralizado en el bloque de variables de `css/aplus-module.css`.

## Pendiente / fuera de alcance
- Integración real en la web principal (`index.html` raíz): no se tocó por regla del proyecto;
  los pasos están en el README.
- API REST real: el servicio está listo (`configureProjectService`), pero el backend con los
  endpoints `/projects`, `/projects/filters` y `/projects/summary` no existe todavía.
- Probado solo en Chrome (headless, motor Chromium). Falta una pasada manual en Safari/iOS y
  Firefox, y con lector de pantalla.
- Una sola instancia por página (los IDs internos son fijos).
