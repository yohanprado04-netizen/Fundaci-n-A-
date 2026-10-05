# Módulo de Seguimiento y Alertas Inteligentes — Fundación A+

Este proyecto es la implementación oficial, en **TypeScript**, **HTML5** y **Tailwind CSS**, del módulo independiente **“Seguimiento y Alertas Inteligentes”** diseñado para integrarse a la plataforma web institucional preexistente de la **Fundación A+**, replicando fielmente la interfaz visual y la jerarquía de componentes del diseño de referencia.

---

## 🚀 Arquitectura y Tecnologías
- **Lenguaje:** TypeScript 5.8+ (Modo estricto con interfaces completas).
- **Estilos:** Tailwind CSS v4 con tipografía *Plus Jakarta Sans*.
- **Visualización:** Chart.js para el gráfico Donut de distribución de riesgos y gráficos de evolución histórica mensual (Calificaciones y Asistencia de Enero a Mayo).
- **Iconografía:** Lucide Icons.
- **Patrón:** Master-Detail reactivo con motor de reglas declarativo y modal para registro de acciones tutoriales.

---

## 📁 Estructura del Código Fuente
```
modulo_seguimiento_alertas/
├── index.html                 # Layout HTML idéntico al diseño de referencia
├── package.json               # Dependencias y scripts de construcción
├── vite.config.ts             # Configuración de empaquetado Vite + Tailwind
├── src/
│   ├── main.ts                # Controlador principal del Dashboard, eventos y gráficos
│   ├── style.css              # Importación de Tailwind CSS y scrollbars
│   ├── types/
│   │   └── index.ts           # Definiciones TypeScript (Student, Alert, RiskLevel, etc.)
│   └── services/
│       ├── dataService.ts     # Adaptador de datos sin duplicación (80 estudiantes simulados)
│       └── riskEngine.ts      # Motor de evaluación de reglas condicionales y recomendaciones
└── dist/                      # Bundle de producción optimizado listo para desplegar
```

---

## 🛠️ Comandos de Ejecución

### 1. Iniciar en Modo Desarrollo (Hot Reload)
```bash
npm run dev
```
Abre automáticamente el servidor local en `http://localhost:3000/`.

### 2. Compilar para Producción
```bash
npm run build
```
Genera los archivos estáticos optimizados en la carpeta `dist/`.

### 3. Previsualizar la Versión de Producción
```bash
npm run preview
```

---

## 💻 Características Implementadas en la UI
1. **Sidebar Institucional:** Identidad `Fundación A+`, navegación preexistente (Inicio, Estudiantes, Horarios, Calificaciones, Asistencias, Memorandos, Correo Interno, Reportes) con el nuevo ítem resaltado `Seguimiento y Alertas`. Perfil inferior de `Laura Gómez - Docente`.
2. **KPIs de Riesgo:** Métricas consolidadas (Total: 80, Bajo: 52 / 65%, Medio: 18 / 22%, Alto: 10 / 13%).
3. **Alertas Recientes:** Feed priorizado con viñetas de colores y marcas de tiempo de atención.
4. **Distribución de Riesgos:** Gráfico Donut interactivo con el centro rotulado "80 estudiantes" y barras de tipologías de alertas.
5. **Tabla de Estudiantes con Filtros:** Búsqueda en tiempo real y filtrado por píldoras (*Todos*, *Bajo riesgo*, *Riesgo medio*, *Riesgo alto*).
6. **Ficha de Detalle Dinámica:**
   - Métricas puntuales: Promedio (2.7/5.0), Asistencia (71%), Inasistencias (8), Consecutivas (3).
   - Alertas activas detalladas.
   - Caja de recomendación asistiva.
   - Gráficas de evolución mensual de notas y asistencia (Ene a May).
   - Botón interactivo **"Registrar acción"** que abre el modal para asentar intervenciones docentes en la bitácora inmutable.
