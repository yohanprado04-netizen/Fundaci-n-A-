# Módulo "Proyectos y Oportunidades A+"

Módulo web independiente para listar proyectos y oportunidades de negocio, con trato
destacado para las **oportunidades A+** (alto impacto financiero / ROI y prioridad
estratégica inmediata). Está hecho con HTML5, CSS moderno (variables CSS) y JavaScript
vanilla en módulos ES nativos: **cero dependencias**, sin frameworks, sin CDN y sin
fuentes externas (usa la tipografía del sistema).

## Estructura

```text
modulo-aplus/
├── index.html                    Página independiente (demo) con #aplus-module-root
├── css/
│   └── aplus-module.css          Estilos encapsulados (prefijo aplus-, bajo #aplus-module-root)
└── js/
    ├── app.js                    Punto de entrada: initAPlusModule() + auto-inicialización
    ├── components/
    │   ├── summaryMetrics.js     Resumen métrico del encabezado
    │   ├── filterBar.js          Búsqueda (debounce), switch A+, selects, orden, vista, limpiar
    │   ├── projectList.js        Contador, rejilla/lista, skeleton, vacío/error, paginación
    │   ├── projectCard.js        Tarjeta de proyecto + fragmentos compartidos (badges, medidor)
    │   └── projectModal.js       Modal de detalle accesible (ESC, clic fuera, trampa de foco)
    ├── services/
    │   └── projectService.js     Capa de datos (mock o API REST)
    ├── data/
    │   └── mockProjects.js       12 proyectos de ejemplo (6 A+) y contrato de datos
    └── utils/
        ├── helpers.js            Escape HTML, normalización, debounce, formatos
        └── icons.js              Iconos SVG inline
```

## Probarlo localmente

Los módulos ES **no se cargan desde `file://`**: hay que servir la carpeta por HTTP.
Cualquiera de estas opciones funciona:

```bash
# Desde la raíz del repositorio
npx serve modulo-aplus
# o, desde dentro de la carpeta
cd modulo-aplus
python -m http.server 8080
```

Después abre `http://localhost:8080/` (o la URL que indique `serve`).

## Insertarlo en la plataforma principal

1. **Copia la carpeta** `modulo-aplus/` (o solo `css/` y `js/`) dentro de la web.
2. **Enlaza la hoja de estilos** en el `<head>`:
   ```html
   <link rel="stylesheet" href="modulo-aplus/css/aplus-module.css" />
   ```
3. **Pega el bloque raíz** donde quieras mostrar el módulo (es el contenido de
   `#aplus-module-root` de `index.html`). Los atributos `data-aplus-*` son los ganchos
   que busca `app.js`:
   ```html
   <div id="aplus-module-root">
     <section class="aplus-module" aria-labelledby="aplus-title">
       <header class="aplus-header">
         <p class="aplus-header__eyebrow">Portafolio estratégico</p>
         <h1 class="aplus-header__title" id="aplus-title">Proyectos y Oportunidades A+</h1>
         <p class="aplus-header__subtitle">Texto explicativo…</p>
         <ul class="aplus-metrics" aria-label="Resumen del portafolio" data-aplus-metrics></ul>
       </header>
       <div data-aplus-filters></div>
       <div data-aplus-list></div>
     </section>
     <div data-aplus-modal-host></div>
   </div>
   ```
   Si en esa página ya existe otro `<h1>`, cambia el título del módulo a `<h2>`.
4. **Carga el script como módulo**. Se auto-inicializa al encontrar `#aplus-module-root`:
   ```html
   <script type="module" src="modulo-aplus/js/app.js"></script>
   ```

### Montaje manual (opciones)

Para controlar el arranque (otro tamaño de página, configurar antes la API, montarlo
después de una navegación SPA…), desactiva la auto-inicialización con
`data-aplus-autoinit="false"` en el root y llama tú a `initAPlusModule`:

```html
<div id="aplus-module-root" data-aplus-autoinit="false"> … </div>

<script type="module">
  import { initAPlusModule } from './modulo-aplus/js/app.js';

  const api = await initAPlusModule(document.getElementById('aplus-module-root'), { pageSize: 9 });
  // api.reload()            -> vuelve a consultar con los filtros actuales
  // api.openProject(p, el)  -> abre el modal con un proyecto
  // api.closeModal()        -> cierra el modal
</script>
```

`initAPlusModule` no monta dos veces el mismo root (marca `data-aplus-mounted="true"`).

### Evento para la web anfitriona

Cada vez que se abre un detalle, el root emite `aplus:project-open` (burbujea), útil para
analítica o integraciones:

```js
document.addEventListener('aplus:project-open', (event) => {
  console.log('Proyecto abierto:', event.detail.project.id);
});
```

## Pasar del mock a la API REST

Toda la UI habla solo con `js/services/projectService.js`. Basta con configurarlo antes de
montar el módulo (usa el montaje manual descrito arriba: el root debe llevar
`data-aplus-autoinit="false"`, o la auto-inicialización arrancaría con el mock):

```js
import { configureProjectService } from './modulo-aplus/js/services/projectService.js';
import { initAPlusModule } from './modulo-aplus/js/app.js';

configureProjectService({
  useMock: false,
  apiBaseUrl: 'https://api.miempresa.com/v1',
  // Opcional: cabeceras, credenciales, tokens…
  requestInit: { headers: { Accept: 'application/json', Authorization: 'Bearer …' }, credentials: 'include' },
});

initAPlusModule(document.getElementById('aplus-module-root'));
```

Endpoints esperados (todas las respuestas en JSON):

| Método y ruta | Respuesta |
| --- | --- |
| `GET {apiBaseUrl}/projects?search=&onlyAPlus=&category=&status=&sort=&page=&pageSize=` | `{ items: Project[], total, page, pageSize, totalPages }` |
| `GET {apiBaseUrl}/projects/filters` | `{ categories: string[], statuses: string[] }` |
| `GET {apiBaseUrl}/projects/summary` | `{ total, aplusActive, avgRoiAPlus, aplusCapital }` |
| `GET {apiBaseUrl}/projects/:id` | `Project` (disponible en el servicio como `getProjectById`) |

- Los parámetros vacíos o `false` no se envían (`onlyAPlus=true` solo aparece si está activo).
- `sort` vale `impact` (mayor impacto), `recent` (más recientes) o `alpha` (alfabético).
- La búsqueda debe cubrir nombre, código/ID y resumen ejecutivo, idealmente sin distinguir
  mayúsculas ni tildes (como hace el mock).
- El contrato completo de `Project` está documentado al inicio de `js/data/mockProjects.js`.
- Si la petición falla (HTTP no 2xx o error de red) se muestra el estado de error con el
  botón **Reintentar**.

## Personalizar colores y estilo

Todos los tokens están en un único bloque `:root, #aplus-module-root { … }` al inicio de
`css/aplus-module.css`. Para cambiarlos desde la web anfitriona, **sobrescríbelos solo bajo
`#aplus-module-root`** (así no afectan al resto de la plataforma):

```css
#aplus-module-root {
  /* Color primario (por defecto BLANCO con tinta oscura) */
  --aplus-color-primary: #2563EB;
  --aplus-color-on-primary: #FFFFFF;
  --aplus-color-primary-border: #2563EB;
  --aplus-color-primary-hover: #1D4ED8;
  --aplus-color-on-primary-hover: #FFFFFF;
  --aplus-color-ink: #1D4ED8;      /* vista activa, página actual */
  --aplus-color-focus: #1D4ED8;    /* anillo de foco */

  /* Acento A+ */
  --aplus-color-emerald: #059669;
  --aplus-color-gold: #D4A017;
}
```

Por defecto el primario es **blanco** (`#FFFFFF`) con texto, borde y estados activos en
azul pizarra oscuro (`#0F172A`); el botón primario se rellena de oscuro en hover. Las
oportunidades A+ usan esmeralda (`#059669`) y dorado (`#D4A017` / `#B7791F`).

Encapsulamiento: todas las clases llevan el prefijo `aplus-` y todos los selectores nacen
bajo `#aplus-module-root`; el reset interno usa `:where()` para neutralizar los estilos
genéricos de la web anfitriona sin pisar las clases del módulo.

## Accesibilidad y comportamiento

- Búsqueda en tiempo real con debounce de 300 ms (Enter la aplica al instante).
- El switch "⭐ Solo Oportunidades A+" es un `role="switch"` con `aria-checked`.
- Contador de resultados con `aria-live="polite"`; listados con `aria-busy` durante la carga.
- Modal con `role="dialog"`, `aria-modal`, trampa de foco con Tab, cierre con ESC, clic en el
  fondo o botón Cerrar, y devolución del foco al botón que lo abrió.
- Respeta `prefers-reduced-motion` y muestra `:focus-visible` en todos los controles.
- Responsive: móvil (el modal pasa a hoja inferior), tablet y escritorio, sin scroll
  horizontal desde 360 px.

## Advertencias al integrar

- **El modal es `position: fixed` dentro del root.** Ningún ancestro de
  `#aplus-module-root` debe tener `transform`, `filter`, `perspective`, `contain` o
  `will-change` sobre esas propiedades: crearían un nuevo bloque contenedor y el modal
  dejaría de cubrir la ventana. Si la plataforma necesita una capa superior, ajusta
  `--aplus-z-modal` (por defecto `1000`).
- **El modal bloquea el scroll del `<body>`** mientras está abierto (`overflow: hidden` y
  compensación del ancho de la barra de scroll) y restaura los valores previos al cerrarse.
- Los IDs internos (`aplus-search-input`, `aplus-modal-title`, …) asumen **una sola
  instancia** del módulo por página.
- Los medidores de impacto aplican su ancho con CSSOM (`--aplus-meter-value`), sin
  `style="…"` en las plantillas, por compatibilidad con políticas CSP estrictas.
