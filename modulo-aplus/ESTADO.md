# Estado del módulo "Proyectos y Oportunidades A+"

Especificación completa: [propmt.md](propmt.md). Este archivo resume decisiones y pendientes.

## Ubicación
Todo el módulo vive en `modulo-aplus/` para no chocar con `index.html`, `app.js` y `style.css`
de la plataforma principal (raíz del repo). **No modificar archivos fuera de `modulo-aplus/`.**

## Hecho (sin probar todavía)
- `js/data/mockProjects.js`, `js/services/projectService.js`
- `js/utils/helpers.js`, `js/utils/icons.js`
- `js/components/`: `projectCard`, `filterBar`, `projectList`, `projectModal`, `summaryMetrics`
- `js/app.js`

## Pendiente
1. `css/aplus-module.css` (todo con prefijo `aplus-*` bajo `#aplus-module-root`; variables en `:root, #aplus-module-root`).
2. `index.html` con `#aplus-module-root`. Los ganchos que espera `js/app.js` son atributos
   `data-aplus-metrics`, `data-aplus-filters`, `data-aplus-list` y `data-aplus-modal-host`
   dentro del root. `index.html` es una página independiente en `modulo-aplus/`.
3. `README.md` del módulo: cómo probarlo localmente (servidor HTTP; los módulos ES no cargan desde `file://`)
   y cómo insertarlo en la web principal.
4. Probar en navegador y corregir errores: búsqueda con debounce, filtros, toggle A+, orden,
   vista grid/lista, paginación, skeleton, estado vacío, modal (ESC, clic fuera, foco).

## Decisión de diseño: color primario BLANCO
El usuario pidió que el color primario sea blanco y que "combine bien":
- `--aplus-color-primary: #FFFFFF`, texto sobre primario y estados activos en azul-pizarra oscuro (`#0F172A`).
- Botón primario: fondo blanco, borde y texto oscuros; en hover se rellena de oscuro con texto blanco.
- Estados activos (vista grid/lista seleccionada, página actual, foco) usan el tono oscuro.
- Las oportunidades A+ mantienen su acento esmeralda (`#059669`) y dorado (`#B7791F` / `#D4A017`).
- Fondo `#F8FAFC`, tarjetas `#FFFFFF` con borde `#E2E8F0`. Todo el color primario debe quedar
  centralizado en variables CSS para poder cambiarlo en un solo bloque.
