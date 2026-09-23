// Mobile menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const iconOpen = document.getElementById('iconOpen');
  const iconClose = document.getElementById('iconClose');
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    iconOpen.classList.toggle('hidden');
    iconClose.classList.toggle('hidden');
  });
  document.querySelectorAll('#mobileMenu a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
    });
  });

  // Active nav link on scroll
  const sections = ['inicio','programa','calificaciones'];
  const navLinks = document.querySelectorAll('.nav-link');
  const onScroll = () => {
    let current = sections[0];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 100) current = id;
    }
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', onScroll);

  // Signature visual: growth constellation (100 -> 1000+)
  // Antes eran 140 nodos decorativos con posiciones aleatorias fijas, sin
  // relación con datos reales. Ahora: un nodo por cada estudiante realmente
  // inscrito (Store('usuarios') con rol 'Estudiante'). Se mantiene un
  // mínimo visual (MIN_NODOS) para que la constelación nunca se vea vacía
  // mientras la fundación recién está arrancando y aún no tiene
  // estudiantes cargados; en cuanto el número real de estudiantes supera
  // ese mínimo, se muestran todos los reales.
  // NOTA: no se implementan aún los tooltips/mensajes por nodo (queda para
  // una fase posterior) — por ahora cada nodo sigue siendo decorativo,
  // solo que la CANTIDAD ya es real.
  const CONSTELLATION_COLORS = ['#1FC8C0', '#8B5CF6', '#F5A623', '#9A5B3F', '#EC4899', '#F0455C'];
  const CONSTELLATION_MIN_NODOS = 60;
  const constellationReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICON_CLIP_SVG = '<svg class="w-3.5 h-3.5 inline-block shrink-0 align-middle mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>';

  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // Se llama después de seedIfEmpty() (al final del archivo), así ya hay
  // datos reales de usuarios disponibles en Store. Si aún no hay Store
  // (no debería pasar, pero por seguridad) cae al mínimo visual.
  // async: Store.list('usuarios') ahora habla con MySQL (ver db.js) — las
  // 4 llamadas a esta función son "fire and forget" (no esperan su
  // resultado), así que no hace falta await en cada punto de llamada.
  const EXPERIENCIAS_CHOCOANAS = [
    "¡Manín, esto es una berraquera! Llegué sin saber qué era una variable y hoy ya le monté la web al negocio de mi tía en pleno Quibdó.",
    "Aquí ni los aguaceros del Chocó nos frenan. Si se cae el internet, sacamos cuaderno, repasamos la lógica y seguimos firmes tirando código.",
    "Ver que desde la orilla del Atrato podemos programar software que compite con cualquier parte del mundo me llena de un orgullo el berraco.",
    "El profe nos explicó cómo conectar MySQL con el backend y cuando vi los datos guardarse en vivo dije: ¡esto sí es lo mío, carajo!",
    "Lo más bacano es el compañerismo chocoano: si un hermano se traba con un error de código, entre todos nos sentamos a ayudarlo hasta que corra.",
    "En mi casa nadie sabía de sistemas. Hoy soy el que le mete mano a la tecnología y ayuda a digitalizar los emprendimientos del barrio.",
    "Yo le tenía pavor a los algoritmos, pero con la paciencia de los profes le agarré el ritmo. ¡En el Chocó hay talento y ganas de sobrar!",
    "Tirar código después de clase viendo el atardecer en el Malecón con los compañeros es una experiencia sabrosa y transformadora.",
    "Pasé de solo estar pegado al celular viendo redes a entender cómo funciona la web por dentro y maquetar mis propias aplicaciones.",
    "La Fundación A+ no solo nos enseña código; nos enseña a ser líderes y a demostrar la casta y el empuje de nuestra juventud.",
    "Nunca imaginé que a mis 19 años iba a estar programando con Tailwind y creando bases de datos para resolver problemas del territorio.",
    "Aquí se siente una energía única, puro calor humano y ganas de salir adelante con la tecnología como herramienta de progreso.",
    "Hicimos una app comunitaria para organizar datos del barrio y ver a los vecinos usarla fue una emoción que no me cabe en el pecho.",
    "Las asesorías me salvaron la vida cuando me enredé con las funciones asíncronas. Los profes te explican sin rodeos y con puro cariño.",
    "Demostrando que en el Chocó no solo somos potencia pal deporte y la música, sino también pa la innovación, la ciencia y el software.",
    "Cada módulo terminado es una fiesta. Salir de clase con un proyecto funcionando pa mostrárselo a mi mamá es lo más grande de la vida.",
    "El código se pone duro a veces, pero como buenos chocoanos somos berracos y no nos dejamos ganar de ningún bug que se atraviese.",
    "Descubrí mi vocación en este training. Ahora sé con certeza que desde mi tierra puedo trabajar y prestar servicios pal mundo entero.",
    "Aprender desarrollo web aquí me abrió los ojos. La tecnología es el camino pa transformar a Quibdó y a todo nuestro Pacífico.",
    "Aquí no hay excusas, mi vale: con disciplina, buenos mentores y el apoyo de la fundación, estamos construyendo nuestro propio destino.",
    "Dejé el miedo atrás y me enamoré de la programación. Ver tu primera página web publicada en internet con tu nombre te cambia la vida.",
    "Puro sabor y berraquera chocoana metida en cada línea de código. ¡Vamos con toda por ese futuro digital de nuestra tierra!"
  ];

  const DEFAULT_ESTUDIANTES_CONSTELLATION = [
    { id: 'def_1', nombre: 'Yohan Prado', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: '¡Manín, esto es una berraquera! Llegué sin saber qué era una variable y hoy ya le monté la web al negocio de mi tía en pleno Quibdó.' },
    { id: 'def_2', nombre: 'Keiner Mosquera', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Aquí ni los aguaceros del Chocó nos frenan. Si se cae el internet, sacamos cuaderno, repasamos la lógica y seguimos firmes tirando código.' },
    { id: 'def_3', nombre: 'Danna Bejarano', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Ver que desde la orilla del Atrato podemos programar software que compite con cualquier parte del mundo me llena de un orgullo el berraco.' },
    { id: 'def_4', nombre: 'Carlos Mendoza', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'El profe nos explicó cómo conectar MySQL con el backend y cuando vi los datos guardarse en vivo dije: ¡esto sí es lo mío, carajo!' },
    { id: 'def_5', nombre: 'Wendy Palacios', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Lo más bacano es el compañerismo chocoano: si un hermano se traba con un error de código, entre todos nos sentamos a ayudarlo hasta que corra.' },
    { id: 'def_6', nombre: 'Mayra Mosquera', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Tirar código después de clase viendo el atardecer en el Malecón con los compañeros es una experiencia sabrosa y transformadora.' },
    { id: 'def_7', nombre: 'Jefferson Ibargüen', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Nunca imaginé que a mis 19 años iba a estar programando con Tailwind y creando bases de datos para resolver problemas del territorio.' },
    { id: 'def_8', nombre: 'Leidy Hurtado', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Aquí se siente una energía única, puro calor humano y ganas de salir adelante con la tecnología como herramienta de progreso.' },
    { id: 'def_9', nombre: 'Didier Chaverra', cohorte: 'TrAIning 100 a 1000+', fotoUrl: '', descripcion: 'Demostrando que en el Chocó no solo somos potencia pal deporte y la música, sino también pa la innovación, la ciencia y el software.' }
  ];

  async function renderConstellation(totalEstudiantesDirecto, estudiantesDirecto) {
    const container = document.getElementById('constellation');
    if (!container) return;

    // Limpiar temporizadores previos de la constelación (tanto intervalos como timeouts)
    if (window._constellationTimers) {
      window._constellationTimers.forEach(t => {
        try { clearInterval(t); } catch (e) {}
        try { clearTimeout(t); } catch (e) {}
      });
    }
    window._constellationTimers = [];

    container.innerHTML = '';

    let estudiantes = Array.isArray(estudiantesDirecto) && estudiantesDirecto.length ? [...estudiantesDirecto] : null;
    let totalEstudiantes = typeof totalEstudiantesDirecto === 'number' && totalEstudiantesDirecto > 0 ? totalEstudiantesDirecto : 0;

    if (!estudiantes || !estudiantes.length) {
      if (typeof currentAdminRole !== 'undefined' && currentAdminRole) {
        try {
          const todos = await Store.list('usuarios');
          const ests = todos.filter(u => u.rol === 'Estudiante' && (!u.estadoRegistro || u.estadoRegistro !== 'Pendiente'));
          if (ests.length) {
            totalEstudiantes = ests.length;
            estudiantes = ests.map(u => ({
              id: u.id,
              nombre: u.nombre || 'Estudiante A+',
              cohorte: u.cohorte || 'Comunidad A+',
              fotoUrl: u.fotoUrl || '',
              descripcion: u.descripcion || ''
            }));
          }
        } catch (e) {
          // Modo offline / sin sesión
        }
      }
    }

    if (!estudiantes || !estudiantes.length) {
      estudiantes = DEFAULT_ESTUDIANTES_CONSTELLATION;
      totalEstudiantes = estudiantes.length;
    }

    const nodeCount = Math.max(CONSTELLATION_MIN_NODOS, totalEstudiantes);
    const rand = seededRandom(42);

    // Contenedor SVG para líneas estelares
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'constellation-svg');
    container.appendChild(svg);

    // Capa de tarjetas flotantes (pointer-events: none en el contenedor, auto en las tarjetas)
    const cardsLayer = document.createElement('div');
    cardsLayer.className = 'absolute inset-0 pointer-events-none z-20 overflow-visible';
    container.appendChild(cardsLayer);

    const nodesData = [];

    for (let i = 0; i < nodeCount; i++) {
      const x = rand() * 88 + 6;
      const y = rand() * 84 + 8;
      const size = 5 + rand() * 8;
      const color = CONSTELLATION_COLORS[Math.floor(rand() * CONSTELLATION_COLORS.length)];
      const delay = rand() * 1.4;
      const opacity = 0.55 + rand() * 0.45;

      const node = document.createElement('div');
      node.className = 'node' + (constellationReduceMotion ? '' : ' drift');
      node.style.left = x + '%';
      node.style.top = y + '%';
      node.style.width = size + 'px';
      node.style.height = size + 'px';
      node.style.background = color;
      node.style.color = color;
      node.style.setProperty('--op', opacity);
      node.style.setProperty('--delay', delay + 's');
      node.style.setProperty('--dx', (rand() * 10 - 5) + 'px');
      node.style.setProperty('--dy', (rand() * 10 - 5) + 'px');
      node.style.animationDelay = delay + 's, ' + delay + 's';

      nodesData.push({ el: node, x, y, color, size, index: i });
      container.appendChild(node);
    }

    // Líneas de conexión tenues entre nodos cercanos (< 17% distancia)
    for (let i = 0; i < nodesData.length; i++) {
      for (let j = i + 1; j < nodesData.length; j++) {
        const dx = nodesData[i].x - nodesData[j].x;
        const dy = nodesData[i].y - nodesData[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 17 && (i + j) % 3 === 0) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'constellation-line');
          line.setAttribute('x1', nodesData[i].x + '%');
          line.setAttribute('y1', nodesData[i].y + '%');
          line.setAttribute('x2', nodesData[j].x + '%');
          line.setAttribute('y2', nodesData[j].y + '%');
          line.setAttribute('stroke', nodesData[i].color);
          line.setAttribute('stroke-opacity', '0.12');
          line.setAttribute('stroke-width', '1');
          svg.appendChild(line);
        }
      }
    }

    if (!estudiantes || estudiantes.length === 0) return;

    // Clasificar nodos disponibles en 2 zonas verticales disjuntas para GARANTIZAR cero superposiciones
    // Zona Superior (y <= 46%) y Zona Inferior (y >= 54%)
    // De esta manera una tarjeta superior NUNCA puede tocar una tarjeta inferior
    const topNodes = nodesData.filter(n => n.y <= 44);
    const bottomNodes = nodesData.filter(n => n.y >= 54);

    // Preparar lista de estudiantes asignándoles una experiencia auténtica y chocoana
    const studentList = estudiantes.map((est, idx) => {
      const mensaje = (est.descripcion && est.descripcion.trim().length > 0)
        ? est.descripcion.trim()
        : EXPERIENCIAS_CHOCOANAS[idx % EXPERIENCIAS_CHOCOANAS.length];
      return { ...est, mensaje, originalIndex: idx };
    });

    // Asignar nodos a los estudiantes repartiéndolos equitativamente entre las 2 zonas
    const studentNodes = [];
    studentList.forEach((st, idx) => {
      const isTop = (idx % 2 === 0);
      const zoneList = isTop ? (topNodes.length > 0 ? topNodes : nodesData) : (bottomNodes.length > 0 ? bottomNodes : nodesData);
      const nodeObj = zoneList[idx % zoneList.length];
      const node = nodeObj.el;

      const studentInfo = {
        ...st,
        nodeObj,
        color: nodeObj.color,
        isTopZone: nodeObj.y < 50
      };

      node.classList.add('node--student');
      node.style.width = Math.max(12, nodeObj.size + 3) + 'px';
      node.style.height = Math.max(12, nodeObj.size + 3) + 'px';
      node.title = `${st.nombre} - Clic para ver experiencia`;

      if (!node.querySelector('.node-pulse-ring')) {
        const ring = document.createElement('span');
        ring.className = 'node-pulse-ring';
        node.appendChild(ring);
      }

      node.__studentData = studentInfo;
      studentNodes.push(studentInfo);

      // Interacción directa por hover o toque en el nodo
      node.addEventListener('mouseenter', () => {
        abrirTarjetaEnModoLectura(studentInfo);
      });
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirTarjetaEnModoLectura(studentInfo, true);
      });
    });

    // ── GESTIÓN DE ROTACIÓN ALEATORIA Y CERO SUPERPOSICIONES ──
    // Se muestran exactamente 2 tarjetas simultáneas:
    // Slot 0 -> Exclusivamente en Zona Superior (y <= 46%)
    // Slot 1 -> Exclusivamente en Zona Inferior (y >= 54%)
    // La brecha de >10% vertical asegura que FÍSICAMENTE NUNCA SE VEAN UNA ENCIMA DE OTRA.
    const activeSlots = [null, null];
    let isUserHoveringConstellation = false;
    let isExpandedCardOpen = false;

    container.addEventListener('mouseenter', () => { isUserHoveringConstellation = true; });
    container.addEventListener('mouseleave', () => {
      isUserHoveringConstellation = false;
    });

    // Cierra cualquier tarjeta si se hace clic afuera del contenedor
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        if (expandedCardObj && expandedCardObj.cardEl) {
          expandedCardObj.cardEl.classList.remove('is-expanded');
          expandedCardObj = null;
          isExpandedCardOpen = false;
        }
        if (manualCard) {
          cerrarTarjetaCompleta(manualCard, manualStudent);
        }
      }
    });

    function crearElementoTarjeta(student, startExpanded = false) {
      const card = document.createElement('div');
      card.className = 'constellation-card' + (startExpanded ? ' is-expanded' : '');

      // Coordenadas del nodo
      const x = student.nodeObj.x;
      const y = student.nodeObj.y;

      // Si el nodo está a la derecha (x > 52%), la tarjeta se abre hacia la izquierda
      const toLeft = x > 52;
      // Si el nodo está en la zona superior, la tarjeta se expande hacia abajo; si está en zona inferior, hacia arriba
      const toTop = y > 58;

      if (toLeft) {
        card.style.right = `calc(${100 - x}% + 14px)`;
        card.style.setProperty('--origin-x', '100%');
      } else {
        card.style.left = `calc(${x}% + 14px)`;
        card.style.setProperty('--origin-x', '0%');
      }

      if (toTop) {
        card.style.bottom = `calc(${100 - y}% - 10px)`;
        card.style.setProperty('--origin-y', '100%');
      } else {
        card.style.top = `calc(${y}% - 10px)`;
        card.style.setProperty('--origin-y', '0%');
      }

      const iniciales = escapeHtml((student.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase());
      const avatarHtml = student.fotoUrl
        ? `<img src="${escapeHtml(student.fotoUrl)}" alt="${escapeHtml(student.nombre)}" class="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm" />`
        : `<div class="w-8 h-8 rounded-full grid place-items-center text-[11px] font-extrabold text-white shrink-0 shadow-sm" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-2 min-w-0">
            ${avatarHtml}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1">
                <p class="text-xs font-bold text-ink truncate">${escapeHtml(student.nombre)}</p>
                <svg class="w-3 h-3 text-turquesa shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              </div>
              <p class="text-[10px] text-slate2 truncate flex items-center gap-1 font-medium">
                <span class="w-1.5 h-1.5 rounded-full inline-block" style="background:${student.color}"></span>
                ${escapeHtml(student.cohorte || 'Comunidad A+')}
              </p>
            </div>
          </div>
          <button type="button" class="card-close-btn w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer" title="Cerrar mensaje">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="card-message-text text-[11px] text-slate-700 leading-snug italic relative pl-2.5 mb-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          <span class="absolute left-0 top-0 text-morado font-serif text-xs leading-none font-bold">“</span>${escapeHtml(student.mensaje)}<span class="text-morado font-serif text-xs leading-none font-bold">”</span>
        </div>
        <div class="card-hint-read flex items-center justify-between mt-1 pt-1 border-t border-gray-100/80">
          <span class="text-[9.5px] font-semibold text-morado flex items-center gap-1">
            <span>Toca para leer completo</span>
            <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
          </span>
          <span class="w-1.5 h-1.5 rounded-full" style="background:${student.color}"></span>
        </div>
        <div class="mt-1.5 h-0.5 w-full rounded-full opacity-60" style="background:linear-gradient(90deg, ${student.color}, transparent)"></div>
      `;

      // Evento directo en el botón de cierre para que siempre cierre de inmediato
      const closeBtn = card.querySelector('.card-close-btn');
      if (closeBtn) {
        const onCerrarClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          cerrarTarjetaCompleta(card, student);
        };
        closeBtn.addEventListener('click', onCerrarClick);
        closeBtn.addEventListener('pointerdown', onCerrarClick);
      }

      // Evento de clic en el cuerpo de la tarjeta para alternar modo lectura
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-close-btn')) return;
        e.stopPropagation();
        toggleExpansorTarjeta(card, student);
      });

      return card;
    }

    let expandedCardObj = null;

    function toggleExpansorTarjeta(cardEl, student) {
      if (cardEl.classList.contains('is-expanded')) {
        cardEl.classList.remove('is-expanded');
        if (expandedCardObj && expandedCardObj.cardEl === cardEl) {
          expandedCardObj = null;
          isExpandedCardOpen = false;
        }
      } else {
        if (expandedCardObj && expandedCardObj.cardEl !== cardEl) {
          expandedCardObj.cardEl.classList.remove('is-expanded');
        }
        cardEl.classList.add('is-expanded');
        isExpandedCardOpen = true;
        expandedCardObj = { cardEl, student };
      }
    }

    function cerrarTarjetaCompleta(cardEl, student) {
      if (!cardEl) return;
      cardEl.classList.remove('is-expanded');
      cardEl.classList.add('is-leaving');
      if (student && student.nodeObj && student.nodeObj.el) {
        student.nodeObj.el.classList.remove('is-active');
      }
      if (expandedCardObj && expandedCardObj.cardEl === cardEl) {
        expandedCardObj = null;
        isExpandedCardOpen = false;
      }
      if (manualCard === cardEl) {
        manualCard = null;
        manualStudent = null;
      }
      for (let i = 0; i < activeSlots.length; i++) {
        if (activeSlots[i] && activeSlots[i].cardEl === cardEl) {
          activeSlots[i] = null;
        }
      }
      setTimeout(() => {
        if (cardEl && cardEl.parentNode) cardEl.remove();
      }, 300);
    }

    let manualCard = null;
    let manualStudent = null;

    function abrirTarjetaEnModoLectura(student, expand = true) {
      if (manualCard) {
        manualCard.remove();
        if (manualStudent && manualStudent.nodeObj.el) {
          manualStudent.nodeObj.el.classList.remove('is-active');
        }
        manualCard = null;
        manualStudent = null;
      }

      student.nodeObj.el.classList.add('is-active');
      const card = crearElementoTarjeta(student, expand);
      card.style.zIndex = '55';
      cardsLayer.appendChild(card);
      manualCard = card;
      manualStudent = student;
      if (expand) {
        isExpandedCardOpen = true;
        expandedCardObj = { cardEl: card, student };
      }
    }

    // ── ROTADOR DINÁMICO ESCALABLE PARA CUALQUIER NÚMERO DE USUARIOS ──
    // Se divide el pool de estudiantes entre ambas zonas (Top y Bottom)
    // Se mezclan aleatoriamente (Fisher-Yates) para que el orden sea impredecible
    function shuffleArray(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    const studentsTopZone = studentNodes.filter(s => s.isTopZone);
    const studentsBottomZone = studentNodes.filter(s => !s.isTopZone);

    // Si una zona quedó sin estudiantes (ej. pocos usuarios), se comparten
    const poolTop = studentsTopZone.length > 0 ? studentsTopZone : studentNodes;
    const poolBottom = studentsBottomZone.length > 0 ? studentsBottomZone : studentNodes;

    let deckTop = shuffleArray(poolTop);
    let deckBottom = shuffleArray(poolBottom);
    let topPointer = 0;
    let bottomPointer = 0;

    function siguienteEstudianteDeZona(isTop) {
      if (isTop) {
        if (topPointer >= deckTop.length) {
          deckTop = shuffleArray(poolTop);
          topPointer = 0;
        }
        const st = deckTop[topPointer % deckTop.length];
        topPointer++;
        return st;
      } else {
        if (bottomPointer >= deckBottom.length) {
          deckBottom = shuffleArray(poolBottom);
          bottomPointer = 0;
        }
        const st = deckBottom[bottomPointer % deckBottom.length];
        bottomPointer++;
        return st;
      }
    }

    function rotarSlotZona(slotIndex) {
      // Si el usuario tiene una tarjeta expandida leyendo o está pasando el cursor, pausar
      if (isUserHoveringConstellation || isExpandedCardOpen) return;

      const isTop = (slotIndex === 0);
      const candidato = siguienteEstudianteDeZona(isTop);
      if (!candidato || !candidato.nodeObj || !candidato.nodeObj.el) return;

      // Retirar con suavidad la tarjeta anterior de este slot
      if (activeSlots[slotIndex]) {
        const prev = activeSlots[slotIndex];
        if (prev.nodeEl) prev.nodeEl.classList.remove('is-active');
        if (prev.cardEl) {
          // Si por casualidad la tarjeta estaba expandida, no cerrarla abruptamente
          if (prev.cardEl.classList.contains('is-expanded')) return;
          prev.cardEl.classList.add('is-leaving');
          setTimeout(() => {
            if (prev.cardEl && prev.cardEl.parentNode) prev.cardEl.remove();
          }, 360);
        }
      }

      // Activar nuevo estudiante en su zona correspondiente
      candidato.nodeObj.el.classList.add('is-active');
      const card = crearElementoTarjeta(candidato, false);
      cardsLayer.appendChild(card);

      activeSlots[slotIndex] = {
        cardEl: card,
        nodeEl: candidato.nodeObj.el,
        studentInfo: candidato
      };
    }

    // Arrancar Slot 0 (Zona Superior) inmediatamente a los 80ms y rotar cada 5.8s
    const t0 = setTimeout(() => {
      rotarSlotZona(0);
      const i0 = setInterval(() => { rotarSlotZona(0); }, 5800);
      window._constellationTimers.push(i0);
    }, 80);
    window._constellationTimers.push(t0);

    // Slot 1 (Zona Inferior) arranca a los 1100ms y rota cada 6.2s
    const t1 = setTimeout(() => {
      rotarSlotZona(1);
      const i1 = setInterval(() => { rotarSlotZona(1); }, 6200);
      window._constellationTimers.push(i1);
    }, 1100);
    window._constellationTimers.push(t1);
  }
  // ---------- Login inline (Calificaciones) — un solo formulario ----------
  // Ya no hay pestañas de perfil: el correo y la contraseña ingresados se
  // comparan automáticamente contra las 4 fuentes de credenciales posibles
  // (Superadmin, Administración, Docente, Estudiante) y se entra al panel
  // que corresponda según cuál coincida. Ver submitLogin().
  //
  // 1) Superadmin: una única cuenta con control total. Sus credenciales YA
  //    NO son fijas en el código — se guardan en Store('superadmin_credentials')
  //    y se pueden cambiar desde Configuración > Seguridad del Superadmin
  //    (ver guardarCredencialesSuperadmin()). SEED.superadmin_credentials
  //    define el correo/contraseña iniciales.
  // 2) Administración, Docentes y Estudiantes: cada usuario tiene su PROPIA
  //    contraseña (campo "password" en Store 'usuarios'), definida por el
  //    administrador al crear/editar el usuario. El login siempre es con
  //    su correo + esa contraseña individual (ver submitLogin()).

  let currentDocente = null;
  let currentEstudiante = null;
  let currentAdminRole = null; // 'superadmin' | 'administracion'
  let currentAdminUser = null; // registro del usuario Coordinador cuando currentAdminRole === 'administracion'

  // El contexto del chat por rol (notas, asistencia, PQR, memorandos,
  // agenda, semáforo, permisos por perfil, etc.) YA NO se arma aquí en el
  // navegador — se calcula del lado del servidor, consultando MySQL, una
  // vez verificado el rol real de quien pregunta con un token firmado.
  // Ver backend_chat/db.py (contexto_estudiante, contexto_docente,
  // contexto_administracion, contexto_superadmin) y backend_chat/auth.py.
  // Este archivo solo se encarga de obtener y guardar ese token tras el
  // login (ver iniciarSesionChat, más abajo) y mandarlo en cada mensaje.


  /**
   * Auditoría del sistema (solo lectura para el Superadmin).
   * 1) auditoria_login: intentos de login registrados en backend PHP.
   * 2) auditoria_acciones: acciones operativas registradas por los usuarios.
   * 3) auditoria_horario: cambios de franjas horarias y asignación docente.
   */
  function fechaHoraActual() {
    const ahora = new Date();
    return {
      fecha: ahora.toISOString().slice(0, 10),
      hora: ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    };
  }

  // Bitácora de acciones relevantes dentro del sistema
  async function registrarAuditoriaAccion(tipo, actor, rol, detalle) {
    const { fecha, hora } = fechaHoraActual();
    const registros = await Store.list('auditoria_acciones');
    registros.unshift({ id: uid('aa'), fecha, hora, tipo, actor: actor || '—', rol: rol || '—', detalle: detalle || '' });
    await Store.save('auditoria_acciones', registros.slice(0, 500));
  }

  // Nombre a mostrar de quien realiza la acción administrativa actual
  function actorAdminActual() {
    if (currentAdminRole === 'superadmin') return 'Superadmin';
    if (currentAdminRole === 'administracion' && currentAdminUser) return currentAdminUser.nombre + ' (Administración)';
    return 'Desconocido';
  }

  // Etiqueta descriptiva de una franja de horario
  function franjaLabel(franja) {
    return franja ? (franja.dia + ' ' + franja.inicio + '–' + franja.fin) : '';
  }

  // Auditoría de cambios en el horario
  async function registrarAuditoriaHorario(cohorte, mes, franjaEtiqueta, campo, valorAnterior, valorNuevo) {
    const { fecha, hora } = fechaHoraActual();
    const registros = await Store.list('auditoria_horario');
    registros.unshift({
      id: uid('ah'), fecha, hora, autor: actorAdminActual(),
      cohorte, mes: mesLabel(mes), franja: franjaEtiqueta,
      campo, valorAnterior: valorAnterior || '(vacío)', valorNuevo: valorNuevo || '(vacío)'
    });
    await Store.save('auditoria_horario', registros.slice(0, 1000));
  }

  /**
   * Seguridad del login y control de acceso:
   * 1) Bloqueo temporal tras intentos fallidos consecutivos.
   * 2) Cierre de sesión automático tras periodo de inactividad.
   * 3) Validación de fortaleza mínima en contraseñas.
   */
  function validarFortalezaPassword(pw) {
    return typeof pw === 'string' && pw.length >= 6 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
  }

  // ---- Capa 1: bloqueo por intentos fallidos ----
  const LOGIN_MAX_INTENTOS = 5;
  const LOGIN_BLOQUEO_MS = 60000; // 60 segundos
  let loginIntentosFallidos = 0;
  let loginBloqueadoHasta = 0;

  function segundosRestantesBloqueo() {
    return Math.max(0, Math.ceil((loginBloqueadoHasta - Date.now()) / 1000));
  }

  // (Se quitó el ojito de mostrar/ocultar contraseña: por pedido, las
  // contraseñas ahora se ven siempre como texto plano en todos los
  // formularios, así que no hace falta alternar el tipo del input.)

  // ---- Capa 2: cierre de sesión automático por inactividad ----
  const INACTIVIDAD_LIMITE_MS = 20 * 60 * 1000; // 20 minutos
  let inactividadTimer = null;

  function iniciarControlInactividad() {
    detenerControlInactividad();
    const reiniciar = () => {
      clearTimeout(inactividadTimer);
      inactividadTimer = setTimeout(cerrarSesionPorInactividad, INACTIVIDAD_LIMITE_MS);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, reiniciar));
    inactividadListeners = reiniciar;
    reiniciar();
  }
  let inactividadListeners = null;

  function detenerControlInactividad() {
    clearTimeout(inactividadTimer);
    if (inactividadListeners) {
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => document.removeEventListener(ev, inactividadListeners));
      inactividadListeners = null;
    }
  }

  function cerrarSesionPorInactividad() {
    if (currentAdminRole) logout();
    else if (currentDocente) logoutDocente();
    else if (currentEstudiante) logoutEstudiante();
    else return;
    toast('Tu sesión se cerró automáticamente por inactividad', 'info');
  }



  // ---------- Guardado nativo de contraseña (sin recargar la SPA) ----------
  // El navegador (Chrome/Edge/Firefox/Safari) solo ofrece guardar una
  // contraseña cuando ve un <form> completar un submit real con campos
  // username/password. Como el login de esta app es 100% manejado por JS
  // (no debe recargar ni navegar, para no perder el estado de la SPA), ese
  // submit real se hace en un <form> aparte, oculto, apuntando a un
  // <iframe> también oculto (target) — así el navegador SÍ ve un submit
  // real y ofrece guardar la contraseña, pero la navegación ocurre solo
  // dentro de ese iframe invisible y la página visible nunca se mueve.
  // El guardado nativo de contraseñas (Chrome, Edge, Firefox, Safari...)
  // exige dos cosas: (1) un <form> visible y real —no oculto ni de tamaño
  // 0— que (2) complete un submit real sin que JavaScript lo bloquee con
  // preventDefault. Intentos anteriores fallaron por no cumplir esto:
  // - PasswordCredential/navigator.credentials.store ya no existe en
  //   navegadores modernos (API retirada).
  // - Un <form> paralelo oculto con estilo width:0;height:0 es ignorado
  //   a propósito por los navegadores (protección anti-phishing: no
  //   confían en formularios invisibles para ofrecer guardar credenciales).
  // Ahora es el propio loginForm (real, visible, el que el usuario llenó)
  // el que hace el submit — con target="loginTargetFrame" (ver
  // index.html) apuntando a un iframe casi invisible, así la navegación
  // real ocurre pero nunca se nota y la SPA no se recarga ni pierde su
  // estado. submitLogin() solo deja pasar este submit cuando el login es
  // exitoso; en cualquier otro caso sigue cancelándose con preventDefault.
  function guardarCredencialEnNavegador() {
    try {
      const form = document.getElementById('loginForm');
      if (form) form.submit();
    } catch (e) { /* nunca debe interrumpir el login si algo falla acá */ }
  }

  // El guardado nativo de contraseñas (Chrome, Edge, Firefox, Safari...)
  // depende únicamente de que el <form> de login complete un submit real,
  // sin JavaScript bloqueándolo con preventDefault. La antigua Credential
  // Management API (PasswordCredential / navigator.credentials.store), que
  // este archivo usaba para forzar el guardado, fue retirada de los
  // navegadores y ya no existe — por eso nunca guardaba la contraseña.
  // Ahora el <form> visible de login NUNCA navega (siempre preventDefault):
  // el guardado se logra con un submit real, pero en un <form>/<iframe>
  // ocultos aparte (ver guardarCredencialEnNavegador), así la SPA nunca se
  // recarga ni pierde su estado.

  // Muestra u oculta el texto de la contraseña en el login al hacer clic en
  // el ícono del ojo. Antes este botón no hacía nada porque esta función
  // nunca se había definido (el onclick del HTML la llamaba en el vacío).
  function toggleLoginPasswordVisibility() {
    const input = document.getElementById('loginPassword');
    const eyeOpen = document.getElementById('loginPwEyeOpen');
    const eyeClosed = document.getElementById('loginPwEyeClosed');
    if (!input) return;
    const estabaOculta = input.type === 'password';
    input.type = estabaOculta ? 'text' : 'password';
    if (eyeOpen) eyeOpen.classList.toggle('hidden', estabaOculta);
    if (eyeClosed) eyeClosed.classList.toggle('hidden', !estabaOculta);
  }

  // async: ahora llama al backend real (apiLogin, ver db.js) en vez de
  // comparar contraseñas en memoria — la verificación de credenciales
  // ocurre en el servidor (auth.php), nunca en el navegador. onsubmit del
  // formulario acepta una función async sin problema (preventDefault ya
  // se llama de forma síncrona al inicio, antes de cualquier await).
  async function submitLogin(event) {
    const errorEl = document.getElementById('loginError');
    // El submit real del formulario solo se deja pasar en caso de éxito
    // (ver registrarExito -> guardarCredencialEnNavegador): es lo que el
    // navegador necesita ver para ofrecer guardar la contraseña. En
    // cualquier otro caso (error, campos vacíos, bloqueo) se cancela aquí
    // mismo para no navegar ni perder el formulario con el error visible.
    if (event && event.preventDefault) event.preventDefault();

    if (Date.now() < loginBloqueadoHasta) {
      errorEl.textContent = 'Demasiados intentos fallidos. Espera ' + segundosRestantesBloqueo() + ' segundos antes de volver a intentar.';
      errorEl.classList.remove('hidden');
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) {
      errorEl.textContent = 'Completa tu correo y contraseña para continuar.';
      errorEl.classList.remove('hidden');
      return;
    }

    const registrarExito = async () => {
      loginIntentosFallidos = 0;
      loginBloqueadoHasta = 0;
      errorEl.classList.add('hidden');
      iniciarControlInactividad();
      window.scrollTo(0, 0);
      guardarCredencialEnNavegador();
      // Espera el token que el chat necesita para reconocer el rol real
      // de esta sesión (ver iniciarSesionChat)
      await iniciarSesionChat(email, password);
      if (window.aplusChatResetSession) window.aplusChatResetSession();
    };

    const registrarFallo = (mensaje) => {
      loginIntentosFallidos++;
      if (loginIntentosFallidos >= LOGIN_MAX_INTENTOS) {
        loginBloqueadoHasta = Date.now() + LOGIN_BLOQUEO_MS;
        loginIntentosFallidos = 0;
        errorEl.textContent = 'Demasiados intentos fallidos. Espera ' + segundosRestantesBloqueo() + ' segundos antes de volver a intentar.';
      } else {
        errorEl.textContent = mensaje;
      }
      errorEl.classList.remove('hidden');
    };

    // apiLogin (ver db.js) hace TODA la verificación en el servidor
    // (auth.php): revisa superadmin_credentials y usuarios en MySQL,
    // valida el hash de la contraseña, y devuelve el rol real — nunca se
    // compara ninguna contraseña aquí en el navegador. Si las
    // credenciales no son válidas, o la cuenta está pendiente/inactiva,
    // apiLogin lanza un Error con el mensaje exacto que debe verse.
    let resultado;
    try {
      resultado = await apiLogin(email, password);
    } catch (e) {
      // Fallo de red (backend caído, sin conexión) se distingue del
      // mensaje de credenciales para no confundir a la persona.
      const mensaje = (e && e.message) || 'Credenciales incorrectas. Verifica tu correo y contraseña.';
      registrarFallo(mensaje.includes('conectar') || mensaje.includes('servidor')
        ? mensaje
        : mensaje + (mensaje.includes('incorrectas') ? ' Te quedan ' + (LOGIN_MAX_INTENTOS - loginIntentosFallidos - 1) + ' intento(s) antes de un bloqueo temporal.' : ''));
      return;
    }

    const usuario = resultado.usuario;
    if (usuario.rol === 'Superadmin') {
      currentAdminRole = 'superadmin';
      currentAdminUser = null;
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('dashboardView').classList.remove('hidden');
      applyAdminRoleUI();
      await initAdmin();
      showPanel('resumen');
      await registrarExito();
      return;
    }

    if (usuario.rol === 'Coordinador' || usuario.rol === 'Administrador') {
      currentAdminRole = 'administracion';
      currentAdminUser = usuario;
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('dashboardView').classList.remove('hidden');
      applyAdminRoleUI(usuario);
      await initAdmin();
      await abrirPrimerPanelSegunPermisos('admin', usuario, '.panel-tab', '.panel-content', showPanel, 'resumen');
      await registrarExito();
      return;
    }

    if (usuario.rol === 'Docente') {
      currentDocente = usuario;
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('teacherView').classList.remove('hidden');
      await abrirPrimerPanelSegunPermisos('docente', usuario, '.panel-tab-t', '.panel-content-t', showPanelDocente, 'resumen');
      await updateMemorandosBadge();
      await registrarExito();
      return;
    }

    if (usuario.rol === 'Estudiante') {
      currentEstudiante = usuario;
      try { localStorage.setItem('aplus_estudiante_email', usuario.email || usuario.nombre); } catch (e) {}
      document.getElementById('siteView').classList.add('hidden');
      document.getElementById('studentView').classList.remove('hidden');
      await initEstudiante();
      await abrirPrimerPanelSegunPermisos('estudiante', usuario, '.panel-tab-s', '.panel-content-s', showPanelEstudiante, 'resumen');
      await registrarExito();
      return;
    }

    // No debería llegar aquí: apiLogin ya validó el rol contra los
    // valores válidos de la columna `rol` en MySQL. Si de todos modos
    // llega un rol no reconocido, se trata como fallo de credenciales en
    // vez de dejar a la persona en un estado indefinido.
    registrarFallo('No se pudo determinar tu rol en la plataforma. Contacta al Superadmin.');
  }

  // ---------- AUTORREGISTRO PÚBLICO (solo Estudiante) ----------
  // Formulario mínimo, visible sin sesión iniciada. El usuario elige su
  // propia contraseña y queda con estadoRegistro='Pendiente' — no puede
  // iniciar sesión (ver bloqueo en submitLogin) hasta que el Superadmin lo
  // apruebe y le asigne un perfil, desde el panel "Solicitudes de registro".
  function abrirRegistroPublico() {
    document.getElementById('registroPublicoContenido').innerHTML = `
      <img src="logo.jpg" alt="Fundación A+" class="h-12 w-auto mx-auto mb-4" />
      <h3 class="text-xl font-extrabold text-ink text-center">Registro de estudiante</h3>
      <p class="text-sm text-slate2 mt-1 text-center">Completa tus datos. Un administrador revisará tu solicitud antes de activar tu acceso.</p>
      <div class="mt-6 space-y-3">
        <input id="reg_nombre" type="text" placeholder="Nombre completo" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-4 py-3 text-sm text-ink placeholder:text-slate2 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
        <input id="reg_email" type="email" placeholder="Correo electrónico" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-4 py-3 text-sm text-ink placeholder:text-slate2 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
        <input id="reg_telefono" type="tel" placeholder="Teléfono / WhatsApp" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-4 py-3 text-sm text-ink placeholder:text-slate2 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
        <div class="relative">
          <input id="reg_password" type="text" autocomplete="new-password" placeholder="Crea una contraseña" class="w-full rounded-xl border border-morado/25 bg-morado/5 pl-4 pr-4 py-3 text-sm text-ink placeholder:text-slate2 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
        </div>
        <p class="text-xs text-slate2">Mínimo 6 caracteres, con al menos una letra y un número.</p>
      </div>
      <p id="registroPublicoError" class="hidden text-xs text-coral mt-3"></p>
      <button onclick="withBotonCargando(this, enviarRegistroPublico)" class="w-full mt-5 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold py-3.5 hover:bg-morado transition">
        Enviar solicitud
      </button>`;
    document.getElementById('registroPublicoModal').classList.remove('hidden');
    habilitarEnterEnFormulario('registroPublicoContenido');
  }

  function cerrarRegistroPublico() {
    document.getElementById('registroPublicoModal').classList.add('hidden');
  }

  async function enviarRegistroPublico() {
    const errorEl = document.getElementById('registroPublicoError');
    const nombre = document.getElementById('reg_nombre').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const telefono = document.getElementById('reg_telefono').value.trim();
    const password = document.getElementById('reg_password').value;

    if (!nombre || !email || !password) {
      errorEl.textContent = 'Completa nombre, correo y contraseña.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (!validarFortalezaPassword(password)) {
      errorEl.textContent = 'La contraseña debe tener mínimo 6 caracteres, con al menos una letra y un número.';
      errorEl.classList.remove('hidden');
      return;
    }
    const yaExiste = (await Store.list('usuarios')).some(u => u.email.toLowerCase() === email.toLowerCase());
    if (yaExiste) {
      errorEl.textContent = 'Ya existe una cuenta con ese correo. Si es tuya, inicia sesión o espera la aprobación.';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      const urlApi = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/registro';
      const resp = await fetch(urlApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, telefono, password })
      });
      const res = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(res.error || 'No se pudo enviar la solicitud.');
      }
    } catch (err) {
      console.warn('[enviarRegistroPublico] Falló /api/registro, guardando localmente:', err.message);
      const usuarios = await Store.list('usuarios');
      usuarios.unshift({
        id: uid('us'),
        nombre, email, telefono, password,
        passwordPlano: password,
        rol: 'Estudiante',
        cohorte: '',
        estado: 'Activo',
        estadoRegistro: 'Pendiente',
        perfiles: [],
        creadoEn: new Date().toISOString()
      });
      await Store.set('usuarios', usuarios);
    }

    if (typeof Store.clearCache === 'function') Store.clearCache('usuarios');
    cerrarRegistroPublico();
    toast('Tu solicitud fue enviada con éxito. Te avisaremos cuando esté aprobada.', 'ok');
    if (panelActivoAdmin === 'usuarios' && RENDERERS['usuarios']) {
      await RENDERERS['usuarios']();
    }
  }

  // Ajusta el panel administrativo según el perfil: Superadmin ve todo;
  // Administración (Coordinador) no gestiona cuentas de usuario ni la
  // configuración global de la plataforma.
  function applyAdminRoleUI(coordinador) {
    const isSuper = currentAdminRole === 'superadmin';

    // Reset SIEMPRE primero y completo: cada login (Superadmin o
    // Administración) parte de un estado limpio y conocido —
    // TODOS los tabs visibles y TODOS los panel-content ocultos excepto
    // "resumen" — antes de aplicar sus propias reglas. Sin este doble
    // reset (tabs Y contenidos), tanto el menú como el panel que haya
    // quedado abierto en una sesión anterior (Superadmin o de otro
    // Administrador, con otro perfil) se quedan pegados y contaminan la
    // vista siguiente, en cualquiera de los dos sentidos.
    document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('hidden'));
    document.querySelectorAll('.panel-content').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== 'panel-resumen');
    });
    // Mismo reset para los TÍTULOS de sección del sidebar (ver
    // ocultarSeccionesSidebarVacias): sin esto, una sección que quedó
    // oculta en el login de un Coordinador anterior (o de otro perfil)
    // seguía oculta para el Superadmin o para el siguiente Coordinador,
    // aunque su perfil sí tuviera módulos ahí.
    document.querySelectorAll('aside .mb-6').forEach(seccion => seccion.classList.remove('hidden'));
    panelActivoAdmin = 'resumen';

    const label = document.getElementById('adminPanelLabel');
    const eyebrow = document.getElementById('adminEyebrow');
    if (label) label.textContent = isSuper ? 'Panel Superadmin' : 'Panel Administración';
    if (eyebrow) eyebrow.textContent = isSuper ? 'Superadmin' : 'Administración';
    const bannerText = document.getElementById('adminBannerText');
    if (bannerText) {
      bannerText.textContent = isSuper
        ? 'Desde aquí administrarás usuarios, cohortes y calificaciones del Training de 100 a 1000+.'
        : 'Gestiona cohortes, calificaciones y el seguimiento académico del programa A+ Smart.';
    }
    document.querySelectorAll('.panel-tab[data-super-only="true"]').forEach(tab => {
      tab.classList.toggle('hidden', !isSuper);
    });
    // El grupo/sección "Superadmin" del menú (título + contenedor) solo
    // se muestra para el Superadmin — igual que sus botones internos.
    document.querySelectorAll('[data-super-only-group="true"]').forEach(group => {
      group.classList.toggle('hidden', !isSuper);
    });
    // Superadmin ve un menú reducido (Resumen, Administradores, Usuarios,
    // Cohortes, Calificaciones, Configuración); Administración conserva el
    // menú completo (sin el apartado de Administradores).
    document.querySelectorAll('.panel-tab[data-admin-hide="true"]').forEach(tab => {
      tab.classList.toggle('hidden', isSuper);
    });
    document.querySelectorAll('[data-admin-hide-group="true"]').forEach(group => {
      group.classList.toggle('hidden', isSuper);
    });
    const restrictedNote = document.getElementById('adminRestrictedNote');
    if (restrictedNote) restrictedNote.classList.toggle('hidden', isSuper);
    const roleChip = document.getElementById('adminRoleChip');
    if (roleChip) roleChip.textContent = isSuper ? 'Superadmin' : 'Administración';
  }

  // async (fire-and-forget desde showPanel, ver más abajo): Store('usuarios')
  // ahora habla con MySQL. 'modulos' sigue síncrono (localStorage, Fase 2
  // pendiente) — Promise.all solo espera lo que de verdad es asíncrono.
  async function renderAdminBannerStats() {
    const el = document.getElementById('adminBannerStats');
    if (!el) return;
    const [usuarios, modulos] = await Promise.all([Store.list('usuarios'), Store.list('modulos')]);
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const stats = [
      { label: 'Usuarios', value: usuarios.length },
      { label: 'Cohortes en curso', value: enCurso },
      { label: 'Cohortes totales', value: modulos.length },
    ];
    el.innerHTML = stats.map(s => `
      <div class="superadmin-banner-stat px-4 py-2.5">
        <p class="text-[11px] font-semibold text-white/60 uppercase tracking-wide">${s.label}</p>
        <p class="text-lg font-extrabold text-white leading-tight mt-0.5">${s.value}</p>
      </div>`).join('');
  }

  function logout() {
    detenerControlInactividad();
    currentAdminRole = null;
    currentAdminUser = null;
    panelActivoAdmin = null;
    semaforoCohorteFiltro = '';
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    quitarAvisoSinAcceso('.panel-content');
    window.scrollTo(0, 0);
    cerrarSesionChat();
    if (typeof setAuthToken === 'function') setAuthToken(null);
    localStorage.removeItem(DB_PREFIX_TOKEN + 'authToken');
    localStorage.removeItem('aplus_chat_token');
    if (window.aplusChatResetSession) window.aplusChatResetSession();
  }

  function logoutDocente() {
    detenerControlInactividad();
    currentDocente = null;
    panelActivoDocente = null;
    docenteRiesgoCohorte = '';
    document.getElementById('teacherView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    quitarAvisoSinAcceso('.panel-content-t');
    document.querySelectorAll('#teacherView .mb-6').forEach(seccion => seccion.classList.remove('hidden'));
    window.scrollTo(0, 0);
    cerrarSesionChat();
    if (typeof setAuthToken === 'function') setAuthToken(null);
    localStorage.removeItem(DB_PREFIX_TOKEN + 'authToken');
    localStorage.removeItem('aplus_chat_token');
    if (window.aplusChatResetSession) window.aplusChatResetSession();
  }

  function logoutEstudiante() {
    detenerControlInactividad();
    currentEstudiante = null;
    panelActivoEstudiante = null;
    document.getElementById('studentView').classList.add('hidden');
    document.getElementById('siteView').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    quitarAvisoSinAcceso('.panel-content-s');
    document.querySelectorAll('#studentView .mb-6').forEach(seccion => seccion.classList.remove('hidden'));
    window.scrollTo(0, 0);
    cerrarSesionChat();
    if (typeof setAuthToken === 'function') setAuthToken(null);
    localStorage.removeItem(DB_PREFIX_TOKEN + 'authToken');
    localStorage.removeItem('aplus_chat_token');
    if (window.aplusChatResetSession) window.aplusChatResetSession();
  }

  // ---------- Navegación del panel Docente ----------
  const PANEL_COLOR_DOCENTE = '#008080';
  let panelActivoDocente = null;
  async function showPanelDocente(panel) {
    const tab = document.querySelector('.panel-tab-t[data-tpanel="' + panel + '"]');
    if (tab && tab.classList.contains('hidden')) return;
    if (!(await permisoUsuarioSobrePanel(currentDocente, 'docente.' + panel)).ver) return;

    // Ocultar todos los demás paneles y desactivar tabs docentes de forma sincronizada e instantánea
    document.querySelectorAll('.panel-content-t').forEach(p => {
      if (p.id !== 'panel-t-' + panel) p.classList.add('hidden');
    });
    document.querySelectorAll('.panel-tab-t').forEach(t => {
      if (t.dataset.tpanel !== panel) {
        t.classList.remove('font-semibold', 'is-active');
        t.style.borderLeftColor = '';
        t.style.background = '';
        t.style.color = '';
      }
    });

    const content = document.getElementById('panel-t-' + panel);
    if (content) content.classList.remove('hidden');
    if (tab) {
      tab.classList.add('font-semibold', 'is-active');
      tab.style.borderLeftColor = '';
      tab.style.background = '';
      tab.style.color = '';
    }
    panelActivoDocente = panel;

    const mount = document.getElementById('mount-t-' + panel);
    if (mount && (!mount.innerHTML.trim() || mount.innerHTML.includes('No se pudo cargar el módulo'))) {
      mount.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-turquesa/20 border-t-turquesa rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-slate2">Cargando módulo...</p>
      </div>`;
    }

    if (RENDERERS_DOCENTE[panel]) {
      try {
        await RENDERERS_DOCENTE[panel]();
        initTablesEnPanel('panel-t-' + panel);
      } catch (err) {
        console.error('[showPanelDocente] Error al cargar panel "' + panel + '":', err);
        if (mount) {
          mount.innerHTML = `<div class="bg-white rounded-2xl border border-coral/20 shadow-soft p-10 text-center flex flex-col items-center justify-center gap-3">
            <div class="w-10 h-10 rounded-full bg-coral/10 text-coral flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <p class="text-sm font-bold text-ink">No se pudo cargar el módulo</p>
            <p class="text-xs text-slate2 max-w-sm">${escapeHtml(err.message || 'Error inesperado al renderizar')}</p>
            <button onclick="showPanelDocente('${panel}')" class="mt-2 px-4 py-1.5 rounded-full bg-turquesa text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer">Reintentar</button>
          </div>`;
        }
      }
    }
  }

  // ---------- Navegación del panel Superadmin ----------
  const PANEL_COLOR = '#6A1B9A';
  let panelActivoAdmin = null;
  async function showPanel(panel) {
    if (currentAdminRole === 'administracion' && currentAdminUser) {
      const tabDelPanel = document.querySelector('.panel-tab[data-panel="' + panel + '"]');
      if (tabDelPanel && (tabDelPanel.dataset.superOnly === 'true' || tabDelPanel.classList.contains('hidden'))) return;
      if (!(await permisoUsuarioSobrePanel(currentAdminUser, 'admin.' + panel)).ver) return;
    }

    // Ocultar de inmediato TODOS los demás paneles administrativos para evitar solapamientos
    document.querySelectorAll('.panel-content').forEach(p => {
      if (p.id !== 'panel-' + panel) p.classList.add('hidden');
    });
    document.querySelectorAll('.panel-tab').forEach(t => {
      if (t.dataset.panel !== panel) t.classList.remove('superadmin-tab-active', 'is-active');
    });

    const content = document.getElementById('panel-' + panel);
    if (content) content.classList.remove('hidden');
    const tab = document.querySelector('.panel-tab[data-panel="' + panel + '"]');
    if (tab) tab.classList.add('superadmin-tab-active', 'is-active');
    panelActivoAdmin = panel;

    // Si el contenedor está vacío o contiene error previo, mostrar skeleton de carga inmediata
    const mountId = 'mount-' + (panel === 'informesAdmin' ? 'informes-admin' : panel);
    const mount = document.getElementById(mountId);
    if (mount && (!mount.innerHTML.trim() || mount.innerHTML.includes('No se pudo cargar el módulo'))) {
      mount.innerHTML = `<div class="admin-panel-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-morado/20 border-t-morado rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-slate2">Cargando módulo...</p>
      </div>`;
    }

    const banner = document.getElementById('superadminBanner');
    if (banner) banner.classList.toggle('hidden', panel !== 'resumen');

    try {
      if (panel === 'resumen') await renderAdminBannerStats();
      if (RENDERERS[panel]) {
        await RENDERERS[panel]();
        initTablesEnPanel('panel-' + panel);
      }
      actualizarBadgePqrAdmin();
    } catch (err) {
      console.error('[showPanel] Error al cargar panel "' + panel + '":', err);
      if (mount) {
        mount.innerHTML = `<div class="admin-panel-card p-10 text-center flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 rounded-full bg-coral/10 text-coral flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <p class="text-sm font-bold text-ink">No se pudo cargar el módulo</p>
          <p class="text-xs text-slate2 max-w-sm">${escapeHtml(err.message || 'Error inesperado al renderizar')}</p>
          <button onclick="showPanel('${panel}')" class="mt-2 px-4 py-1.5 rounded-full bg-morado text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer">Reintentar</button>
        </div>`;
      }
    }
  }

  /**
   * Panel administrativo — motor de datos y CRUD.
   */

  const DB_PREFIX = 'aplus_admin_v1_';
  let ADMIN_BOOTED = false;

  // Nota mínima de aprobación: fija en el código, ya NO es configurable
  // desde el panel (antes vivía en configuracion.notasMinimaAprobacion).
  // Único criterio real de aprobación — la asistencia se sigue mostrando
  // como dato informativo (semáforo, informes) pero no decide si alguien
  // aprueba o no.
  const NOTA_MINIMA_APROBACION = 6.0;

  // ---------- Capa de almacenamiento ----------
  // Store ahora vive en db.js (cargado antes que este archivo en
  // index.html): la entidad 'usuarios' habla con MySQL vía el backend
  // PHP, el resto sigue en localStorage tal como antes. Ver el
  // comentario de cabecera de db.js para el detalle completo.

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Horario — franjas de horario libres por cohorte y mes.
   * Cada franja incluye: día, curso, trainer, hora inicio/fin y estado.
   * Persistencia: Store('horarios'), un registro por cohorte + mes.
   */
  // Logo real de la Fundación A+ (logo.jpg), incrustado como Data URL para
  // usarlo en documentos que se abren en una ventana/pestaña nueva sin DOM
  // compartido con index.html (ej. la carta de memorando en
  // construirCartaMemorandoHTML) — ahí una ruta relativa "logo.jpg" no
  // siempre resuelve de forma confiable, así que se incrusta directamente.
  const LOGO_FUNDACION_DATAURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAesBlwMBEQACEQEDEQH/xAAcAAEAAgMBAQEAAAAAAAAAAAAABgcBBAUDAgj/xABREAACAgECAgYFBwcHCQcFAAAAAQIDBAURBiEHEjFBUWETFCJxgTJCUpGhscEIFSMzcoLRJENic5Sy4RYXNDU3RFV0szZTdZOi0vCDksLT8f/EABoBAQACAwEAAAAAAAAAAAAAAAABAgMEBQb/xAAyEQEAAgIBAwQABAUEAgMAAAAAAQIDEQQFEjETIUFRIjJhcRQzQqGxUoGRwSPwFSQ0/9oADAMBAAIRAxEAPwC8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbgY3XiA3XiA3XiBkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANbOy6cOiV18urGK+L8kTEbnTDnzUw077+ESzOJMy6f8maor8knJ/WbEYo+Xm8/WM1p1i9oac9Y1GcUnmWfu8i/ZX6ak9R5U+by9sLXs/GmnOx3w74Wc2/cys4qyy4OqcjFP4p7oTPAyq8zGhfU94yXxXka0xqdPVYM1c2OL18S2SGYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYYES4zul6zjUb+wo9fbz32/A2MP2831y891KfHlHTM4IAAlfBc5PGyY/NVi2+rma+aNS9N0OZnFaJ+0lMLuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADDAifGcH6xiz29nqyjv57mxhn2eb67We6lv0RwzOEBABLeC4tYWT/Xcn4+yjXzeXp+hx/4bz+v/UJGYXbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADn6zp8dRxHV8mxc4S8GWpbtnbU5vFjk4pp8oHlUWYtrqvg4TXc+/3G3E7h43Nivht23jTzJY49/D7pqnfbGqqDnOT2ikJmIXxY7ZLdtI90/0jCWBhQo5OS5zku9vtNO07l7XiceOPhinz8t4q2QAwNDO1XDwZ9XIt2k/mpbstFJnw1M3Nw4J1e2pfeFn42bFyxrVPbtXevgJrMeWTDycWeN47bbhVnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABh9gHE1biCrAvdEKXdZHt9rqqJlrjm0bcrmdUpx7dkRuWNJ4ghn5Cx50+hskm4+3unt8ERfH2xtHC6pTkX9Oa6l3F2GN1mQAADwyMarJi431Qsj4SW5MTMMd8VMn5420paDpslzxYL3Not32as9N4s+aQ2cTAxsPljUxh5rtIm0z5Z8XGxYf5dYhtIqzsgAPi2ca65Tk9lFbtkwi09sTM/CuMzIeVl3Xyb3nNvm+xdyNysah4TkZZy5LXn5l1OEuu9WfVfs+ifW+tbGPN4dHovd/Ee3jSao1nq2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiXYBBeJcWWPqttj+Rc+vF/ebWKfw6eP6rhmnJm/xZzabZUWwtre04PrRfuLT7tDHecdu+PMLEwMqGXiVX184zjv7jUtGp09zgyxlxxePlskMwAAAAAAAAA4vFOX6vpcoJ7Tul1F7u/wCwyY43LmdVz+lx518+yE93n3m08hHt7Jhwli+iwZZDiutc+T/orl/E1sttzp6no2CKYPU+bO+jE7LIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMPsEiL6px7omm5NmPZO+66qTjONNW+zXdu9kbePhZskRPiJZK4rTDRo6TdFssUbMfOpi/nzri0vftJsyW6bmiNxqUzhtCW4OfjahjxyMO+u6qXZKD3/wD4aNqzSdWjTHMTDZfNEIcbijC9Z02VkI72Uvrx813r6vuMmO2pczq3HnNx5mvmPdCe02XkUk4Rztpzw5t8/bhv9q/Ew5a/Lv8AReT5wT+8JYYHogAAAAAAADD7AITxTl+n1D0MXvCldX49/wCBs466jbyfWM/qZvTjxX/LkVwdlkYR5yk9l8TJvUbcylZveKx5lZGJRHHxqqYrZVwUfqNOZ293hxxjx1pHxD2IZHzKWy33SXmRM6GnbquHVLqzyIb+XP7jXvzMNZ1NmavHy28VMfVcTItVdVqc32JprcjHzMOS3bWfcvx8tI3aG6jaYWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGH2AQbjXgirU1Zn6XCNed8qUFyV38JeZv8TnWxapf3hmpl17SqqcJ12ShOLhOL2lF9sX4M7kTExuJbDoaDreboWYsjBs2T/WVt+zYvNfiYc/HpmrqfKtqxbyurh7W8XXsCvMxJPmtrK2+dcu9M89mw2w37bNW1ZrOnTsSlFxa3TWzRjUmN+yu9TxXhZ91G3sxlvD9l9huUncPD8vBODNanx8fs8ca6eNfXfW9pVy6yJtHsx4cs4skXj4lYmFkwy8au+t+zNb+405jUvb4M0ZccXj5bBDMAAAAAAA09Sy44WJbfJ/JXJeL7kWrHdLX5OeMOKbyryUpTlKc3vKUm2/Fs24eHtabW7p8unw1jesarW2vYqTm/w+37imSdV06PSsPqcmJnxHuncTVeveWRdCiuVlktoRXNlL5K0jut4TWs2nVUW1PVLcyfVi3CldkfH3nn+Vzb5vavtDs8bi1xxu3lz0nttFd/YjSiNzqG7MxHvKTaLpSxlG+9N3Pmk/mf4nf4XDjHEXt5cXlcqck9tfDso6LSAAAAAAAAAAAAAAAAAAAAAAAADG4DdDYboDIAABhrcCvOknhZW1y1jAr/Sw55MIr5cfpLzXf/gdLg8vtn07+Phmx3+JVkdrTZdrhTX7dA1SGQnJ49nsZFa74+O3ijW5XHjPTXzCl690Lxx7q8iiF1MlOuyKlGS7JJ955yYmJ1Pw00e4xwt4V5kVzh7E35Ps/wDnmZsVvfTg9a48dkZo+PKLGw84kXCWeqrXhWS9mftV7+PejDmr8u70bldtpwW+feEtT3Nd6RkAAAAAMbgQ/i3O9LkRxK37FfOfnL/A2MVfl5rrPJ7rxhr8eXAMzhphwjieiwpZMl7V0uX7K7DWy23L1PRsHZg758z/AId5tJc+RidhFNa1B5lzrrb9DB8v6T8Tz3O5U5bdlfEO1w+P6cd0+XN7Dnt53dA07rbZd0eX82n952On8WP5lnK5vJn8lUhXYdlzGQAADG6AboBugMgAAAAAAAAAAAAAAAAHzKSim32LtAhWtdI2nYV06MCqeZOD2c4vqw39/eb+Hp+TJG7ezNXFMuBPpQ1Fy3hp2Ko9yc5NmzHS6a97St6LYxulG/0i9a0uDh3+ite/1NFbdL9vw2JwrB0rUsXVcGvMw7FZTNcn3p96a7mcu9LY7dtvLBMTHtLdKoAAHzOKmmmk01s0x+wpTjrh56DqrlTFrDyW5VeEX3x+H3Hf4XI9anbPmG3jt3QjfuN1kWZ0V676Smei5M/bqTsx2++HfH4b/acbqODtt6sfLXzV+YT7Lpjk0WU2LeE49VnNidS1MuOMtJpPyrvKoni5NlFi2lB7e83IncbeGz4pw5Jpb4edc5VzjZGTUoS60Wu5kzG41KtLTS0Xr5hYWk5sM7DhdHZN8pLwl3mnaNTp7biciORii8f7t0q2QAAAAaOq5scDFnfJrrJbQT75dxatdy1uVnjBim8/7K/nOVtkrLHvOT3k/Fs29ah4i15tM2t5l6YePLKya6K/lTlty7vFkWnUbZMGKc2SMf2sXHqjRTXVBbQhFRS8kaczuXuaUilYrHiHL4gzvQ0+gre1lnb5I5vUeR2U7I8y6HCwepfunxCNHAdrxDb0rC9dylBreuPOb8ja4nH9a+vhrcrP6VP1TCEFBKMVslySPTRERGocHcz7y+yQAAeV+RXRU7LZKMV3spkvWle60+y1a2vOqw493EVabVVEpecnscy/VKRP4Yb1On3mPedNWfEGQ/k01L37swT1XJ8RDPHTqfMtnD19TnGGTWoJ/Pi+SM+DqcXnV40wZeBNYmaO7FprdHWc9kAAAAAAAAAAAAAAABEOk7Ntw+G5RpscJZFiqk129XZtr7Dd4GOL5o38MmKN2U72HfbYAAsXohy5+k1HCbfo9oXRXg+x/h9RyOqVj8N2vnjxKzEcpgAAADj8UaNXrukXYc0uv8uqX0Zrsf4GXBlnFki0LVt2ztRN1U6bZ1WwcbK5OE4v5rT2a+s9NWYtWLR4luRO4e+l59umajj5tD/SUzUtvFd6+K5FM2OMtJpKLRuNL+wMmrNw6MqiSlVdBTg13prc8xas1tMT8NKY1LhcW6d161m1LeVa2sS+j4mXFfU6cPrHEm9fWrHvHlFTYeadfhzUvUsz0dr2puaTf0X3MxZK7jbp9L5XoZe235bJvFtms9c+gAAD5k9gIRxJqPrmb6Kt7007pbfOl3s2cddR7vJdV5nr5eyviv8AlyDK5aU8I6f1YyzbI85ezX7u/wC418tviHoui8XVfXt8+EjtnGqErJvaMVu2zXtaKxMy78RMzqEKy75ZWRO6fbJ8l4LwPK58s5ck3l6LBj9OkVeSTk0ordvkkjFWNzqGSbREblL9JwliYsYbe3LnN+Z6ji4Iw44j5cDkZZy5Jn4b5ssAAAwwIxxJkSnlxo+bCKe3mzhdTyTN/T+nW6fjjtm7kbHK8+XSZAxsT7IlMNFm56dS29+W278men4VptgrMvP8qsVzWiG+bTAAAAAAAAAAAAAAAAQTpchKWi4kl8lZPP4xex0emzrLP7MuH8yqTttoCACwuiClvK1O/ujXCH1tv8Dk9Vt+GsfuwZp8LPXYclgAAADGyAqrpS0RYudXqtEH6PKfUt27FNLk/il9h2Om591nHPw2cNvhBPsOozLY6KdT9Y0W3T5y9vEs9ld/UlzX27nC6jj7MvdHy1cse+02nCM4uMlumtmmaEezDasWiYlAdb06WnZjgk3TPnXLy8PgbeO3dDxvP4k8bLqPE+GgXloJjwxqfrOP6vdLe6tcn9KP8TWyU17vV9K5frY/Tt+aHeXYYnXZAMDh8S6n6njehqltdauX9GPiZMde6XK6nzfRx9tfzSha5Gy8n7/Lb0vCnqGZCiO8Y9s5eCItbths8PjW5OWKR4WBTVCquNda2jGKSS7tjTmXtqVilYrXxDk8S5PUxo46fOx7v3I5fUs3bj7I+XQ4GLuv3fSOHCdmHW4fw/TZPrE17Ffyd++R0+m8fuv6k+Ic/n5u2vZHmUnR3nIZAAAMMCK8Rx21HrfTgmee6nWYz7dnp1t4tOYc5vgAlEpZoC20un4/eek4H/56uDzP59nSN1rAAAAAAAAAAAAAAAHI4p0ha3ouThclZJKVUvozXNfw+JlwZZxZIutS2p2onJotxMmzGyYOu6qXVnB9qZ6WlovXur4bkTt5lg32TfdsNfYuHoy0q3T+H5XZEHG3Lt9L1X2qOyUfu3+J5/n5YyZNR4hq5LblMDTYwAAAAc3iHS69Y0fJwbF+sh7Mn82S5p/XsXw5JxXi8LVnU7UHdXOm2ym2PVsrm4SXemns/uPUVtFo39tyPdJejfP9R4oorb2ry4umXv23i/rW37xpdQx9+GZ+mPLG6roXYcFqtPU8CvUMWVNvLvjL6LLVt2y1uXxq8nFNLIDlY9uLfKi6PVnD7fM2onfu8Xnw2wXml/JjX2Yt8L6n7cHuvPyJmNwYMtsV4vTzCfabnU52LG6ppd0o/Rfgado1L2vG5FeRj76tzchsNXUc2rBxpX3Pkvkx75PwLVjcsHIz0wU7rIBl5FmXkTvuftyfZ4eRtxHbGnis+e2fJOS3y8q4Stmq64uU29lFdrJ3DHWtrT21jcp3oemLTsVRaTunzsl5+BqXt3S9lwOJHGx6+Z8um/klG8h2sZHrGfY0/Zh7Mfh/ieZ52X1M0y73Dx9mKP1acYynKMYc5SaS95rUrNpiIZ72isTMprgY0cTFrpj2pc34vvPU4MUYscUh57LknJebS2TMxgAABhgcbiHCnfVC6pbyr7Uu9HN6lx5yUi1fMN7hZox2ms/KNJr3HAdo3IGa4SsnGFa3lN7JF61m9orHype0Vjcpth0er41VXb1IpN+LPVYaenSK/TzmS/febfbYMqoAAAAAAAAAAAAAAAA5eraBpmrpfnDErtklspvlJL3oyYs2TF70nS0WmvhHMnoz0ax70X5mOvCE019qZt16jmjzqWSM1m1pPR/ounXRukrcuyLTXrDTW/jskkUy87NkjXiFZy2lLIrZbGmxsgAAAABh9gFQ9J+krC11ZtaSqzI9aX7a5P6+R2+nZe7H2fTZw23GkTwsiWLm4+RF9V1Wxnv7nub+SvdSY+4ZZjcS/RFclOEZrskk0eVaL6fYBzdX0qrUqkpvq2x+RZ4f4F6XmrS5nCpyq6nyhudpuVgTavrfV7px5xZs1vEvK8jh5sE6tHs8cXLuxrFZj2yhL+i+34CY2w4c98M7xzp0/wDKTUVDqt1e9w5lfRq6H/zPI18Obl5V+XPr5FsrH3b9i9yLxWIaGfkXzzvJO3xRTZkWqqiDnN90RMq48dsttUjaZaFoscCHpbdpZMl2/RXgjXvfu9nqun9Prxo77fmn+ztGJ1Hll2+ixrbPoxbMeW3bSbfS+OvdeKoM22933nkpnc7l6OsajTr8OYnpcmWRJbxq+T+0dPpmHvvOSfhodQy6rFI+UnR3nIZAAAAADDQGhlaRiZMutKDjLxg9jUy8LFlncxpsY+Tkx+Ja3+T+L/3lv1owR0zF8zLN/H5PqG5h6Zj4bcqo7zfzpc2bODiYsP5Ya+XkZMv5m4kbLCyAAAAAAAAAAAAAAAAAAAAAAAAAAAABFOkrTfXuGLrIR3txJK+PuXKX2N/UbfByenmj9WTHbVlLz2cZd/JnoYbT9EaTP0ml4c/pUQf2I8tkjV5hpW8tsohgDDjv280Ea37S1LdLwbudmJVJ+PV2Ld1vtgvxMF/zUh4PQNNf+7Je6TJ9S32wT0ziz/QLQNNX+6p+9tjvt9pjpvFj+hvUYtGPHq0VQrX9FbFZmZbVMVKfljT1RDIyBz9bk1pl+3ht9pqc6dYLNjiRvNVEGeZ/R35nSZaTjLGwaq2tpNdaXvZ6ji4vSxRV57kZPUyTLdNlhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA88iqN9M6preE4uMl5NDep2PzxqGM8PLysWXyqbZ1v4Nr8D1OO/fSLfbeid6X7oP+pMD/l6/wC6jzWX+Zb92lby3jGgAAAAAAAAAc7XP9V3+5feanPj/wCvZs8P+fVGtOpV+dTXLsc938OZweJTvzVh1+TftxTKaRPUQ8++iQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbgAAAAAAAAAADEgPz/wATXQyNe1S6nZxnk2dRrv59vxPTcaNYabblPyr30uv0Wm4lf0aYL7EebvO7TLUny2iqAAAAAAAAABrahV6fDur+lFmHkU78VqsmK3ZeLIjgX+rZlVzXKMua8jzfHyelli0u5np6mOappXKM4qUWmmt0z1NZiY3Dz8xMe0vskAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK46WcrMonpqottqpfXbdcmt5rbbfY6fTaUt3d0blnw699o3pnHWvaeowlkxy6l8zIj1nt+0uf17m5l4OC/vHt+y84q2SfC6T8eSSz9Otrfe6ZqS+3Y0r9MvH5bMc4J+HaxukHhy/ZTy7KJPutomtvik19pgtwM8eI2pOO0OtjcRaLlcsfVMOx+Ebo7mC2HJX81ZV7Zb0MrHn8i+qXummU1P0jT0U4y7Gn7mQPrcBuB52X1VpudsI7fSkkNT9GkI4143xMbDtwdIyI3Zk11JWVveNKfbz7HI3+JwrZLRa8ahmx49+8q64cwJanruDhxTl6S1OflFc2/qTOvyLxjxWmPjwz3nVV/xWySXYeZaTIAAAAAAAAABh80BFNb06WNkSugn6Cb35fNfeef53EtjtN6x7S7PD5MWrFbeYfGn6tfhxVbXpKu6LfNe4px+ffDGpndU5+HTJO49pderX8OS3s9JD3x3X2HSp1LBbzOmjbg5atuvVMG1ezkwX7T2+82KcvBbxZhnj5Y/pbEcimfybYP3SRmjLSfEwxzS0eYfanF9j3LbhVnckNwMOcV2tL4kd0J1L4nk0QW87YRXi5IrOSlfMpilp8Q1LtYwav57rvwgtzXvzsFP6mavFy2+Gxh5dWXUraW3Hfbn2oy4c1M1e6nhiyY7Y7dtmwZlAAAAAAAAAAAAAAAAAA52taNh63hSxM+vrQb3jJcpQfin4mTFlvit3UlMWmJ3CHW9F2K2/RapfFdylXFm/HVL/NWWM8tK7otyP5nVK/LrUv+JevVPuq3rfo1LejLV1+rysSfv3X4GSOp4/mE+tDTu6OuIYLlViWL+jf/ABSMkdSwT9/8J9WrTs4K4kx3y0qxrxqth/7jJHOwT/Un1Ky8paLxLj/7hqkP2ITf3E+txrfMJ7qS1rY63V+tWpV/tKxfeXi2CfGv7J3Vryys5fLycte+yZbtxfER/Y9mvZdOz9bY5/ty3+8yRWPiE6bGDp+ZqFypwMW2+x9irjuvr7EUvlpj972NxHlbHAvCP5irll5rjLPtj1X1Xuqo/RT7/NnC5nK9edR4a2TJ3eyYLsNNiAAAAAAAAAAAB8TgpxcZJNPtTRE1i0akiZj3hycnQMexuVMpVSfPZc19RzsvTcdp3WdN3Hzslfa3u03w7eucb6370zVnpV/9TZjqNfmrynoGYuz0Uv3jFbpmePGpXjqGOfO3i9Fz4vlQn5qSMc8DkR4heObhn5fEtP1Cv+Yt/de/3Ff4bk1+JT/EcefmHxKrOh8qvJXwkRNORH2tF8E/MPJzvXbK1PzbMc2y/r/dePT+Nf2fLnPvnL6ykzb5WitPjT55eZVbUHk9thCdpLwzCccKcp77SnvH6jvdMrMYfdxefMTl9naOm0gAAAAAAAAAAAAAAAAAAAMbAZAxsA2RGg2ROhkjQ8501T+XVCXvimWiZhO3lLT8KXysPHfvqRPfb7k3L1qpqpj1aq4wj4QWyI3M+UT7vtLYgZAAAAAAAAAAAAAAAxsAaAbANvIgNiRhxT7UmRqB8Oip9tUH74orOOk+YTFrR8vKeBiT+VjVP90xzx8U/wBMLxmyR4tLz/NGDv8A6LAp/BYP9ML/AMTl/wBTchBQioxW0V2JGzFYiNQwTO53L6JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY3AzuBjdANwG6AbgNwG6AyAAAAAAAAAAAAAABjcBuBkAAAAAAAAAAAAAAAAAAAAAAAAAAMN7AcvI4j0fGm67tQoU12xUt9vqMNuRir5sy1w5LeIadvGehw/3uU/2K5P8DFPOwR8sn8Jm/0tWfHujR36iyZ+6rb7zHPUcK8cLLLVs6RMJfq9PypftOK/FlJ6jT4rK0cC/wAzDVt6RX/NaWn5zyPwUSk9Rn4r/daOnz82a1nSFnv9Xg40V5ylL+BSeo2/0rx0+v8Aqa1vHmry+THFr90P4spPUcn6QvHAx/q1J8Z63P8A32Ef2a0jHPOyz/UyRwsUfEtezibWre3U7v3Wl+BSeXln+r/3/haOLijxVq26pqN363Py5f8A1pbfeUtlvPm0rxipHisPivUM6uW9WdlRa7NrpfxIi94ncWn/AJTOOkxrX9nf0bjXUMSyEc5+tUfO35TS8n3/ABNzFzr0n8fvDUy8Olo3TysrCyqczFrycaSnVZHeMl3o69LxesWjxLl2iazqWwXQAAAAAAAAAAADla9rlGi0RndCVlk+UK49r/gRM6bXE4mTk21X4RSfHWY/1eHjxX9Jyl/Ap6jsx0LH83n/AISrhzVJ6tpscm2uMLOtKMlF7rdF4ncbcfm8aONmnHE7h1iWoAAAAAAAAAAAAAAAAAAAAAAAAADgcbW3U8OZk8eTjL2Yyku1Rckma3Lm0YZ7WfjRE5YiVTJdaSjBdZvsS5tnBiN/G3bmYh18LhjWM3Z14UoRfZK32F9vM2KcXNfxDXvysVPMu3i9HuZNJ5efRUu9Vwc/texs16fefNtMFufX4q6uP0f6bD9fkZNvluor7EZq9Pxx5nbBPOyT4jToVcGaHWlviOf7dkmZY4OCP6VJ5eaflt1cN6LV8nTMb96HW+8yRxsMeKwpPIyz5s2IaPpkPk6dhr3UR/gZIxUjxDHN7T8vRadhRXLDx17qo/wJ7K/R3W+3zPS8Cfy8HFl76Yv8COyv0d9vt4z0HSJ/K0zD+FEV+BWcOOfNVoy3j5czVODdJy6Zegp9Vt+bOp8k/NdhhycPHaPaNMtOVkpPvO1a6ngZGmZ1uJkpKyD7uxrua8jjZMc47TWXWx5IyV7oTno0y5WYGThuX6mzrRXgpdv27/WdPp9vwTVzudSIvFvtNjotEAAAAAAAAAAAEJ6R098GXzfaX3GPI7/Q5j8cIUYnoU66O8hPDyqH2wsU/g1t+Bmxz7PNdcpMZa3+4Su6+uiDldONcV86UkkXcWtbWnURtyMrivScZtesO6Xcqo9b7ewrNohu4+m8m/8ATr93Iu48g5bY+BNrxssUX9iZX1Ib9Oh3n814/wBnV0LijF1ez0HUlRkbb9STTUvcy1bRLR5fTsvGjun3h3k9yzQZAAAAAAAAAAAAAAAAAAAAB53VV3VzrthGcJraUZLdNeBWYifaSJ1O4auFpOn4MnLDwqKZPtlCtJ/WUphx0/LC9sl7fmlvGVQAAAAAAAAAYYFfdJtNUcnBu5eklCUX5pdn3s5PUYjurLpcCfa0PPow3/OGcvm+ij97I6d+eyeoeIWMddzAAAAAAAAAAAxuBE+kOtS0zGt5bwu2+DT/AIFMnh1+i21nmPuEBML1LZwdQy8B2Swr5VOcerLq96JiZjwwZ+Niz69SN6eV992TPr5Ntls/Gybk/tHdMr48OPH+SsR+zzIZDz+0Dd0ZWvWMFUb9f08Ozw35/ZuWr5avM7f4e/d9LdiZ3iWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxICqOO9Q9d1+yuD3qxl6Jecvnfby+Bw+bk78uvp2OHj7ce/t3OjGn2c+/bvjBP4bmx06Pa1mvz594hPDqOeAAAAAAAAAPmbUY7vZJd7BrfhDtc4xhVKVGmRVk09ndL5Kfku8pa+vDtcPpFskd+WdR/dD8zOys630mXfO2X9KXJe5dxim0y7+Hj4sMax101yrOAN138veBt4mm5uY/5Ni22LxUeX1lopMtfJy8OP81odvC4K1K7Z5U6cePhv1pfUuX2loxz8udl61hr7UiZSfQ+GsTSZ+mTldkbbekl833IyVrEONyuoZeTHbPtH07qWxZosgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABztf1GGlaTkZk3zrj7C8ZPkl9Ziz5Ix0m0smKk3vFYUxOUpzlOx7zk25PxZ52dzO58u9EREahZ3R3j+i4ejbJbO62cvgn1fwO1wa6xOPzLd2X9kqN1qsbgN0Bhziu1pe8Ee/h8PIpXbdWv3kForafh8+uYzeyyKn++gn07/AFL0VkZLeLTXigpMTD6T3AyBo645LR8xw+V6GW31ET4Z+Nr1qb+4VEttuRr7e58EU5SUYptvsS5tjyiZ15ZacW00012p9wImJjcMdxCVi8Kabpd2k4uXXiVu2UfbnNdZ9Zcn2mxWI08jz8/IjNak2nSRxgorZcl4Is5s+77AAAAAAAAAAAAAAAAAAAAAAAAAHlZfXUt7bIQXbvJ7ETaI8ymImfDnX8S6LjtqzUsbddqhLrfduYZ5OKPNmSuDJbxBh8RaTm2KvFzqZ2Psi94t+5PYV5GK86i3uWwZaRuauqnujOxMgAAAABh9gkVz0jar6fLr02qXs0e3bt9Nrkvgn9pyOfliZ9OHT4OLX/klDoxlOUYQW8pNJLxb7DnxEzOm9M6iZldekYiwdMxcVfzVUYv37c/tPR4admOKuDkt3WmzcfYZFHD1/iPG0iPo9vTZLW6qT2282+4ra0Vb3D4GTle/iPtCc3ibVsyUutkumD+ZSuqvr7ftMc3mXocPTONij8u5+5c5WZWTPqqy+2bfKKk5N/Ar7y2pphxxuYiIbf5g1eUOv+bsjbzXP6m9ye2zB/H8SJ13x/7/ALNC7Hsx7OpkUSrsXzZx2ZGpht48tMld0tuHriZ2Xhz6+Lk21P8Aoy5fV2CJmGLJxsOWNWrEpvw1xUs6axc/qV3v5E1yjPy8mZa237S89z+mThib4/ev+ErT3LuQ+b4KyqVcluppxa94ImY94Q/E4Fqjc3lZcp1Jvqwrj1Xt5sp6cO5k63kmuqV1KR4Gjafp8UsTFhW/pdsvrfMvERDlZuTmzfntMoBxnh+p67bKK2helZH3vk/t3fxMN/L03Scvfx4r8w4ZR0056PMzejJwpS5wkrIp+D7TLj8PNdbxayVyR8+yYrs5mRxGQAADAGOsEClu+4JfQAAAAAAAAAAAAAAAAByeJdWWjaXblbKVnKNUX2OT/wDm/wADByM0Ysc2ZcOOcl4qqPOzcnUL5XZtsrZye/tdi9y7jg3va/vaXbpjrT2rDwKLg0ahZfR9q1+dp92NkzdlmM4qM5Pm4Ps+rZ/Ydrg5pvWYt8OPzMUUtEx8pcbzUAAAABoazqNel6bfl2c1XHdL6Uu5fWYsuSMdJtK+OnfaKqZyLp5F9l90utZZJzk33tnnrTM2mZ+XfrXtrEOzwVp/r/EFHWW9eP8ApZ/DsX1/czY4ePvyxvw1uXk7McrbXYd5xnF4m1uOj4fsNSybeVUX3eb8kVtbthu8Hhzysmv6Y8qyttndbO22bnZN7yk+1swTMzO3sMdK0r218Q9MLEtzcqrGx472TlsvLxb8hEblXPmphxze/iFn6Lo+NpWMq6Yp2Ne3a1zk/wCBsRGnjeVysnIv3Xn/AGdTqktZoavpeNqmK6cmG/0Zpe1B+KImNs2DkZOPfupKrtRwL9Ny54uRHacOyS7JLuaMFo1L2fG5FORjjJX5aq5PdPZ+JDPMb8rG4Q156lT6rlS/ldS5t/Pj4+/xM1Lb9nkupcH+Hv31/LKSl3MNgAES4/wvS6fVlxj7VE9pfsy5ffsUyRuHY6Nm7M0458T/ANICYXqHa4RzPU9dx93tC79FL49n27FqT76c7quGMnGn7j3WfFmd5B9AAAGpqGdRgY08jJn1K4L6/JCZiGTFivlvFKRuVd6xxPn6jNxpnLHx+6EHs372YbXn4eo4nSsOGN395aOm6rl4GZXfC+1pSXXi5NqUe8rFpiWzyeJiy45rMLbg91ubDxT6AAAAAAAAAAAAAAAAQvpO635uw9vk+me/1HO6j/Lj929wP5k/sro5LqAACbdGD/lefHxrg/tZ0enfms0Of4qsM6zmAAABjcCtukLV/WsyGnUy3qxnvZt3z8PgvtOPzs3dbsjxDqcHF2x3z8oh3o5/hvrO6PtMeJo/rdkf0uW+vz7ofN/j8Tt8HFNMfdPy43Myd+TX0keZk14mPZkXSUa649aTZutelLXtFa+ZVRq2oW6pn2ZVze8n7Mfox7ka9p3L2vE41ePiikNP47FWysTgzRfUcR5eRH+UXrdf0Y+BnpXUPJ9U5nrZOyv5YSddhdywABHuL9FWp4XpKV/KqU3D+ku+JW1dw6HTuZ/D5dW/LPlWv/zsMD2G3vhZduDl15VD2srluvPyJrOp2w58Nc2OaW+Vs6bmVZ2HTlUveFkU15PvRnidw8TmxWxZJpbzDbJYwDXzsaGZiXY9i3hbBxfxC2PJOO8Xj4VFmY1uFlWY18XGyt7Pf7zXmNTp7nDlrlpF6+JfNDksir0fy/SR6vv3FfJm16dpnxqVyw36q37duZsPCPoAB8yArHirV3qmoOFcv5LQ2q19J97MN7bet6Zw/Qxd0/ms4hR02JfJYjyifyrpp/VQ/ZRsvA28y+wgAAAAAAAAAAAAAAAjnHuLLJ4dvlCLcqJRt5LuXJ/Y2anNp3YZ/Rs8S3blhVJw3aAgAn3RjjNUZ2U17M5xri/ct396Op06v4bWczn2/FFU7Om0AAAA43E+sR0bTLL916aXsUx8Zf4dpr8jN6VNs2DF6t9KgsnKycpzblKTcpSfa2+04MzMzuXciIiNQ6GgabLVtWow0m4N9a1r5sF2/wAPiZMGL1ckVYs+T08cyuWqMa4RhBJRitkl3I9DEajThTPvuUK4/wBT3lDTapbdllv4L8SmS2o07/ReN5zT+0IYYXoXe4Q0n85akrLY74+PtOXm+5GSkbcrqvL9HF2V82WXFbIzPKPoAAA+ZLcCuONNK9Q1BZNMf0GQ29l82fevxMV4ep6Ty5y4/Tt5r/hHTG66YcAam4XWabY/ZmnZV5PvX4/Ay45+Hn+tceNRmj9pTpPcyPPsgAObqmi4Oqbet0qUlyU4vaS+JExEtjj8rNx/5c6auncMabp16vprnOyPyXZLrdX3ERWIZs/UeRmr22n2dtckWaLIADl8SZLxNFy7ovaarcYvwb5ETOobPDxxk5FKz9qoS2Wy7DXl7YCXri0yycmqiK3dk1HbybJrG5Y814pjtafhckeS2Nh4N9AAAAAAAAAAAAAAAAPmcVJOMlumtmiJjYgWu8CWStnfpFkOpJ7uix7dX3M5mfgTM7xy6OHmxEavDgWcJ65CfV9QlLzjJNGrPDzR8f3bP8Xi+21g8E6vkXRjkQhjV7+1OUlJpeSXeXpwcsz+L2UvzccR+HysnS8CnTcGrEx47V1rZefmzsY6RSsVhyr3m890tsuqAAPO2arjKU5KMYrdt9iREzo8qi4p1p61qcrYt+r17wpXl4/E4PJzerf9Ha42H06b+3HZrthZ/Aei/m/TfWr49XIykpbPthDuX4na4WH06d0+Zcfl5e++o8QkeVbDHosuse0K4uUn5I3fENatZtaKwqHNyZ5uZdk285Wz6z/A17TuXucGKMOOKR8PKMXOSjFbyk9kvFkaZbWisTM+FrcPaZHS9Mqx1+sftWS8ZPtNisah4nmcieRmm8/7fs6hLWAAAABzdd06OqaddivZSa3hJ90l2MTG2fi55wZYyQqeUZQlKFianFtNeDXajW09vW0Wjujw9sHKlhZlOVDfeqaly8O8ms6Y+RijNitjn5XBRYra42Qe8ZpST8mbHw8LaJrPbPw9AAAAAAAAOfruDLUdLvxYNKc4+y32brsImNwz8XL6OauT6VZmYOXgzcMvHsra73F7fB9hgmsw9ji5WHLG6Wh4VxlbJRqi5yfdHmxESzWvWsbmdJzwhw3Zi3LP1BdWz+aq+j5vz8jJSmnm+p9Qrl/8WLx8ymJkcUAAAAAAAAAAAAAAAAAMbLwAbIBsNDIAABhvYCCdIOv7R/NOJL2n/pEk+xfR/iczm8nUdlW/w8G/x2QI5f6OmkvBWhPU89ZGRHfEoe73Xy5dy93ibnDwepbunxDU5eeKV7a+ZWlFbe47bkI3x7l+g0b0EXtLImo/urm/uX1lbzqrqdIxd/J7vr3V0YIesSXgbTfWtTeXYt6sbmvBzfZ9RfHG/dxuscnsxRjjzb/CxUtjM8wyAAAAAGGgK544071TVVkwj+jyU2/KS7fwMWSNTt6jo/I9TDOOfNf8I2Y3YWbwVk+s6BRFvd071fBdn2bGes7h4/qmPs5Vv193eLOeAAAAAAAw1v2gYcU1ttyBHs+Y1Qi94win4pAmbT7TL7SS7AMgAAAAAAAAAAAAAAAAAAAAAAAGGBGOLuJq9JpePitTzZrku6teL8/BGlyuTGKO2PLZ4/HnLO58KvnOVk3OcnKcnu23u2zi+8z7uzEajUOnw/omRreX6KpdSmL/AEt23KK8PNmbBgtltqPDDnzxhrv5W3p2FTp+LVi4tfUqrWyX4vzO9SkUrFY+HFtabWm0touqr7pByevqdGOnuq6ut8ZP/AxZPp6XomPWK2T7lFfgY3a8QtThfT/zdo9FTX6Sa69n7T/w2XwNisajTxXOz+vyLX+HXJaoAAAAAADhcX4DztFuUF+kp2thv5dv2blbxuG907P6PIrM+J9lY77+0ma72SbdHV28M2jfmnGa+78DNjec65T8dLpouwyOEyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABh9gEK1rgaefn3ZdGf1JWycnGyHW2fvTOdl4HfebRLew83sr2zDww+jza1Szs9TrXbCqvq7/FtlKdO9/wAVvZa/P3H4Y90zwcHHwMeGPiUwqqj2KP3vxfmdGmOtK9tYaNrTad2ltF1WJAVTxRf6xxBmy33UZ+jX7qS+9MwX8vY9Mp2cWn6+754dw/XtaxaWt4dfrz/Zjz/gviKRuVuoZvR41rR58f8AK14ozvGPoAAAAAAAD5nFTi4yW6a2aCYnU7hT2o43qeoZOM1zqslFPy35fYa9o1OnuONk9TDW/wCjvdH93U1u2rusx39aa/iy+Nzut03grb6lYqMry4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD5sfVi5PuW4Ijc6U1kWO7Ittl2znKT+LNafL3mGvbjrX6hKujzG62Zl5LXyIKCfv5/gjJjcXrmTVa0j909RledAAAAAAAAD7AK044o9Fr05pcra4y+PZ+CMOSPfb1fR793G7fqZeHB9vouIsR77KXWi/jFkU8snVa93Ft+mloozvIQyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD5mt0BXuscIZ1WVZPToq6iTcorrJOPk9zFak79npeJ1fFNIrl9phJeD9Lu0vTpxyoqF1ljlKPWT2W2y7C9Y1DldS5NeRm7qeNO+Wc8AwBhy2A+JX1xW8rYLzbSHsmKzPiGa7YWc4SUl4pphExMe0vQAAYED6RatsrDtXzoSj9TX8THkeh6Hb2vX9pR/QVN61g+j+V6aJjp+Z1Od2/w19/S2o9hsPFPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGwGQAADlcQaxXo+E7prrWS9muG/yn/AiZ1Da4nEtycnZHj5Vxn6xn583PIyZtN/Ig9or4IwzaZerw8HBhjVa7aEm5fKk5Lze5VtdsR4bGFnZWBbGzDulVJdy7H713kxMwxZ+Pjz11eNrQ4f1SGr6fDJilGe/Vsgnv1ZIzxO/d47l8aeNlnHPj4dMlrMPsA5ut6NjazTCvJc4uEt4zh2oiY3DZ4vKyca3dRqaRwtg6VkesVyttuSajKxr2U/BERWIZuV1HNya9lvaP0d2PJFmgyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMCA9Ikp/nHEi3+iVLaXnvz+zYxZHpOhxHp3n9UTMbuBAe4kTno5UvVc5t+x6SKS89uf4GbH4ea65/Or+3/AGmSLuIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMCD9I2PLr4eVz6iUq5PwfavxMeSPZ3+h5I3fH8+UNMT0IQD7CRYHR5XKOlZM2tlZe2vcopGbH4eX63aJzxEfEJWXccAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANPVMGnUsOzFyFvGa5NfNfcyJjbLhzWw5IyV8wrbV+H8/S5y69crqV2XVrdP3+BitSYes4vUMOeNb1P1LkSko/Kaj7ympb0TEuhpWkZerXKvGrag37Vsl7Mf4+4tFdtTlc3Fx67mdz9LS0zCq0/DqxqfkVx2Tff5mfWnj8uW2XJN7eZbQYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY2CHy64yW0oprzQWiZjwyopLZJJe4I8+X0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxuBkAAAAAAAAAAAAAAAAAAAAAAAAAAK/z+l/hbBzsjDu9fdmPbKqbhjbxcovZ7PfxRMRtG3gumrhN/N1L+y/4jtk2f56uE/o6l/Zf8R2ybTjRNWxdb0rG1LAcnjZMOvW5rZ7eaIS3wAAAAAAAAAABH+NeK8Tg/Soahm0X3xncqowp23bab72ltyA9+E+IcfijQsfVsOm2mq5zj6O7brRcZOL7G12oDsgAAAAAAAcziPV69C0PN1W6qdteJU7JQg0nLbuQEb4A6RMbjPMy8WrT7sSzHrjZ7dimpJvbuJmNI2m5CXndbCiqdtsowrhFylKT2UUu1sCpZdLmo6pxFLS+FdCrz65T6tE7LHGU0u2bSWyj5t9nvJ0ja2qJTdMPSpKzZdZJ7pPwIS9AAAAAAAAIZxN0mcPcNarLTNQllTyYRUpqinrqO/Ym9+0nQkmh6via7pePqWnzc8bIh1oOS2a8mu5kDfA8MjMxsayuGRfVVKx7QU5pOT8t+0D3AAAAAAAAAAAAD8yaHpWHrnSzPTdSrlbiX6hlKyCm49ZJWSXNc+1IvvUIjyuD/NFwV/wu7+2Xf+4ruUs/5ouCv+GXf2y7/wBw3Il2mafh6NplODg1qnExq+rXFyb6sV5vn9ZA+sLUcPOclh5dGR1fleisUtvqA2gNTM1LCwpxhl5lFEpLdK2xRbXxA2t+W6A1adSwr75Y9GZj2Xx361cLE5LZ7PkgNHUeK+H9Lu9DqOtYGPb/AN3ZfFSXw33A29N1fTtVpd2mZ+Nl1p7OdFqml9TA3l2AedlsKq3ZbOMIR5uUnskBw3xvwsrnS+ItLU09tvWodvh2gQ3p6urv4Jw7abI2VyzoOMoS3T9mfgTHlEut0Jf7OsD+tv8A+rIT5ITmdihFyk0klu2yEuFkcbcL41zpv4g0yFiezi8mO6fnz5AdXA1LC1KhX6fl4+VU+ydFimvrQG0uwDztvqorlZfZCuuPbKUtkviBwpcdcKKfUfEeldb/AJqG317gdvGyqMqqNuNdXbXLsnXJST+KA8tTxMTOwMjG1GuFmJbW43Qm9k49+/gBxeEdB4W0ieRbwxTjRnYlG6dORK17dqT3k9hM7Elk9kBFOOsnhzN0u7R9f16nT67tnOKyY1zmk+zZ89vIDW4Aw+DdKonjcLZ+FlX2c7rY5EbLp+Ce3NLwRImncQNbL1DDwur65lUUdf5PpbFHre7cD4zdVwNPxvWc/Nx8ajbf0t1sYxfxbA0cDi7hzUb1Rg65p19zeyrryIuT9y3A7Se4GQAHhnZdWDh35eTLq00VuycvBJbsD8xaVpOo8f6tr+p81dCizMku1dZv2K/qTX7pfelVg/k968rcTP0K2zeVL9Zx0/oS5TS90tn+8RbztMLP4g4g0vhzDhma1lxxcediqjOUZS3k02lsk+5P6iqVPdJfF+ga5r3DOVpmoQyKcLJVmRJVTj6OPWi9+aW/Y+wtEKzKzdI6QeFtZ1GrT9M1aF2Xa2q6/Q2Rctlu+copdiK6WSgAAAAAAAAAAAfmnhfNxdO6YfW87Iqx8avUcvr23TUIR3ViW7fJc2i8+Ffle3+W3CnfxLpH9tr/AIlEn+W3Cu/LiXSP7bX/ABHulscWyUuENZlFpp6fe00+39HICovycopanrOyS3xquxebL2VrK9Siz89flERT4vxG0ntpkNv/ADLC9fCs+V+ab/q7F/qYfciiz8sYNmq18Z5lXD8pQ1HMyr8aEobKW0pvfn3cl29xb4R8rTwOg3TvVd9R1bLnmTW850qKipfHdvn4sjZpA+ItF1rov4lx8nT82Uo2e3j5CjsrUn7UJx7+1b+/kWj3H6I4f1SrW9DwNUoTjXl0RtUX2x3XNP3PdfAolR/SrxDqXFPFy4X0mU5Y1Fyx1TF7K6/5zl5R7PDky0R7bRKSaf0H6asFLP1XLlkyj7TpjGMIvwSabI2aV/x3w9rPBkY6JdmzydFyLPT4z22j1luuz5slvz25Pff3WgXF0Jf7OsD+tv8A+rIrPlKLdLv+VeucQY/D2lYWatLlGClZVW/R3Tk+blJcurHwb8fIQh0NP6EdAqxa452Zn3ZCXtzqsjXHfyj1WO40gPEWnZ/RTxji36ZmWzxrIq+MnsldBS2nXNdj9/8ASTXMmJ2P0XiZEMrEpya3+jtrU4+5rcql+eNe1LVulDjP81afdJaepuNFbb9FCqL52yS+U32r4LkW8ITevoP0dYvUs1XPlkbfrEobb/s7EdxpAasvWeibi/1ey92Yj2nZVD5GRS/nJPskufxXmW9phHhfHGE42cHatZW94ywrHF+KcSiyq/ycElla9skv0WP2e+wtZFfCWdMfGORw5pFGFplnos/Ockre+qtdsl5t7JfFkRGyZQ3gTooWv6bVrXEOZkVrMj6WuuqXtzg+ycpPft7fcyZk0+OPOiuXDeBPXOH83IthifpLYWPayqK7ZwlHbs7X5CJNJx0PcYZHE2i24upWqzUMFqM7H221v5Mn592/fsRaNESiP5RcYyzdCUktnVd98SaolqcIcA6lx9iUa1xLqV9WGoqrDqglu648t0nyjHl4bvtEzo09ON+h+OkaRdqWiZl+T6tB2WY9yXWcVzbi1tzS57eXIRKdJF0G8WZWr4eTo+pXyvvw1GdFsnvJ1Pl1W+/Z9/gyLQQtUhIBWnTtr35t4WhplU9r9Tn1GvCqOzm/7q+JasbRLY6EtC/NPB8cy2HVyNSn6eTa59Tsgvq5/FkW95IVtkJ9HfS36Vfo8B39bfuWPb2r3Re/wiT5g+V+6rpOm63ixxtVw6M2hSVkYXQUoqWzSa379m/rKpVB0p8OaHpXEHC1Gn6XiY1WVlKF0K61FWrrw5Px7WTCFpafwfw3puZXmafomDj5Ne/UtrpSlHdbcn7mQl3AAAAAAAAAAAB+W8TRI8R9JeRo9l8seOVqGSnbCKk49Xry7H+yX3qFVh/5icP/AI/lf2eP8SO9PaPoHwmmnr+U0+T/AJPD+JHcaWJxJQsXgfVaItuNWmXQTfa0qmiISqj8nRbanrH/AC1X3svZSq9Ci789/lDf9rsX/wALj/1LS9VZ8r703/V2L/Uw+5FFn596La42dLc+vFPq25cl5PrPn9paZ9kfL9FIqlU35RFcXomj2Ne3HMlFPydb3+5E18olKeiJt9Hejb7/AKuX9+QnyR4VJ0aJZXS+7L11pesZlvP6Xtc/tJ+EfL9FoqsrD8oKuuXCWHbJLrwzoqLfat4S3JjyiXU6Ev8AZ1gf1t//AFZCfKYZ426TdI4WyJYMYzztRgk5Y9LSVe/Z15di93aIgRCrj3pJ1x9fQ+GIVUT+ROWLN/8ArnKMX9Q1CEH6SXxfK7Ds416qvlTZ6vCPo11Y7rrfI5du3ey1dD9BYdkquBKrK/lQ0zrR96rKJVB+TtXGXEWoTkk3DBj1X4byW5a3iEQv8qlz9Q0bTNTnCeoYGNlSgtoO6pScfduBp8ZJLhDV0lslh2bf/aBVf5OP+la9/U4/32FrK18OZ+ULOT4oxIt+zHBey8N5MR4J8r602uFOn4tVaShCmEYpdiSSKrPLWq43aRnV2JShLHsTi+x+ywKP/J2skuIdRhv7M8GDa8Wpf4stZEN78ozlmaG12qq/74k1RK1OBoRr4N0SNcVGKwqtkv2UVlZ1sqKnjWxkk04NNPvWxA/Pv5PsmuL7Ip8pYEt147OP+JafCseX6IKrMMD829KOrU8SdIMsa7LjTp+JOOI7nzVa3/SS5ee/xRaI9lZXBj9I3A+LRXj0a9ixqqgoQioz5JLZLsI1KytOmnWeGeI6dPztF1SjJzKJOm2qCknKqS335pdjX/qJqrKzeinXPz5wXg2W2dfJxY+rXvv60OSb962ZExqUwlduPTdKMrKq5yh8lyim17iEvYAAAAAAAAAAAAPzhwT/ALba/wDxHM/uWlp/KiPL9HlUgGrquIs/TMzDl2ZFE6n+9Fr8QPz10Ra5Rwhxbk4etyWNVdD1a2yb2VVkZct33J8+fuLz7wrHl+hLtTwaMWWVdm49ePGPWldK2Kgl4777FFn5m6VuI8fijinIzMKXXxKKI41M9tuuouTcvc3J/AvWFZfpvTf9XYv9TD7kUWfn/oq/2uXft5n95k/CPl+iEQlVH5RH/Z7Sf+ef/TkTXyiUn6Iv9nej/wBXL+/IT5I8KezbbOAulu7LyYP1eGZO5dVfKot35rx26zX7pbW4R4l+hMDV9O1HDhl4Obj3481urIWJrYospXpw4vw9WtxdG0vIhkVY03ZkW1y60evtsop9j23e/gWrCJTzoS/2c6ft2+lv/wCrIifKVUcI24NXSxbZxX1UvWr9pXv2Y3dZ9Trb922+2/fsW+EP0ZPIoqpd07a40qPWc3JKKXjv2bFB+bOmPibG4m4k62nWq3Cwsf0Ndkeycm25SXl2Je4vWNIl+g9BqjfwtgU2L2bMKEX7nBIosoTo61NcA8eZGHrcvQ07SxMixrZQ2e8Zv+i+X1lp94Vh+iYZ2JZjLJryaJ0NdZWxsTi14777bFVlLcb9KGr5HEscDgrKjOhbUwlXXGz09rfc3vy7Eu7tLa9kbWpxcprgzVPStOz1GfWa7N+rzKpVb+Tj/pevf1WP99haytfD7/KH0e12aZrEYv0HVli2yXzW/aj9ezFfpMp/0c8WYXEXDuHtkVfnCmiMMqjrJSjJLZy2+i+1MiYHl0m8W4XD3DuXWsit6lkVSrx8dNOTbW3Wa7orfdsiINoV+Tzo1lUdS1iyLVVijjUN/O6u7k/r2+otYhr/AJRn+maH/VX/AP4k1RK1uCf+yGi/8lV/dRSVnWyP1Fn7L+4fI/PX5P3/AGxn/wAhL+9EtPhSPMv0SVXcTjPW48PcM6hqja69NL9En3zfKK+tomPIojou4Eq41t1G/VMnLqxcfqxVtEo9a22XN7uSfds3+0TM69kaWD/mN4c/4nrH/mU//rI7pNQ8sroO0NY9rxtT1X0/Ufo+vOpx623Lf9H2bjuk1CL9BWsW6XxRmaDl71xy4vaMuXUvrezXxXWX7qJt9kSv1FUsgAAAAAAAAAAA+wCutF6LqdJ42/yl/O1lu19t0cd0pbOxSWzlv2LrPuJ37aRpYiISyAAr7jnot03ijMlqONkzwNQnHaycIKcLfByjy5+aZMTpGkQw+ge31iLztdqVKe+1GL7Xw3ey+0nZp3tf6GdK1GODVpufZgVY1TqmvRKyVzct3Jvdc+bI2aWdRWqaK6ottQiopvyRCUB4W6MqeH+Lrdfjqll3XdrjQ6VHbrvd7y357e5AWEBFOkPg6HGmm42HLNliPHv9LGar66fstbNbrxJidDp8J6JDhzh/D0eF8shY0HH0so9Vy3bbe3d2kSOfxrwPpfF+JCGb6SnJp/U5VW3Xh4rn2ryJidEq0l0D5Tv/ANe4rq3+U8R9b6utsTtGkjl0M6RDhx6bjZlsMydsLJ506lJvq7+yo7raPPx+sjZpM+DOHo8LcPY+kQyXk+hlOTtlHq9Zyk5dnd2kJR7jrox0rivJlnV3TwdRaSnbCClG3w68e/ly3TRMToQ+joNzG41ZvEUXiL+bqol9ilLZE9yNO7rfQvpGZp+Biabm2YPqyn6S2VSsne5dXdye65+zy7iNmlkafiRwcDGxISco0VRrUn2vZbbkJRbjfo70ji6SyL3ZiZ8Y9WOVSlu13KSfKS+p+ZMTpGlfPoIzVNxWv43oW9+eLLn8OtsT3Gk64H6M9I4VvWa7LM7UEto33RSVf7EV2e/myNmks1jBjqelZeBKx1xyKpVOaW7juttyEot0c8AV8Eyzpx1GeZPLVcXvUoKKj1tu9/SZMztERpK9T07E1TBuwdQohfjXR6tlc1upIhKpdW6DKpZLt0TW50Q33hXkVdZ1+SnFp/YTtGmdJ6Dao5Ct1vWp5EN95149XUc/Jzbb2+G/mTsiFtafgYumYVOHg0woxqY9WuuC2UUVSiXSL0fw42swZy1KeHLFjOO0alNSUtvNeBMTpEwlejYEdL0rE0+E5WQxqY1Kcls5KK23IS2rI9aEo+K2Ar/gLoyp4O1mzUa9UtyutS6YVypUOqm0+b3e75eRO/ZGlhEJRjj/AITfGOkVad+cJ4UYXK2Uo1qantvya3Xjv8CYnQ2OCeGcfhPQatLx7Xc4ylOy6Ueq7JN83t9nwIHfAw+wCusvotps43XEuHqtmJL1pZMseFCft/O2e/Lrc9+Xeydo0sWPYQlkAAAAAAAAAAAAMbAZAAAAABsAAAAAAAA2AxsgM7AAGwDYAAAAAAAAAAxsBkDGyAyAAAAAAAAAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//9k=';
  const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function minutosDesdeHora(hhmm) {
    const [h, m] = (hhmm || '0:0').split(':').map(Number);
    return h * 60 + m;
  }
  function horasFranja(franja) {
    return Math.round(((minutosDesdeHora(franja.fin) - minutosDesdeHora(franja.inicio)) / 60) * 100) / 100;
  }
  function mesLabel(mesValue) {
    if (!mesValue || mesValue === '0000-00') return 'Periodo sin fecha registrada';
    const [y, m] = mesValue.split('-').map(Number);
    return (MESES_ES[m - 1] || '') + ' ' + y;
  }
  // Genera opciones de mes: si la cohorte tiene fechaInicio/fechaFin válidas, cubre ese rango;
  // si no, ofrece un rango amplio alrededor del mes actual.
  function generarOpcionesMes(cohorte) {
    let start, end;
    const ini = cohorte && cohorte.fechaInicio ? new Date(cohorte.fechaInicio + 'T00:00:00') : null;
    const fin = cohorte && cohorte.fechaFin ? new Date(cohorte.fechaFin + 'T00:00:00') : null;
    if (ini && !isNaN(ini) && fin && !isNaN(fin)) {
      start = new Date(ini.getFullYear(), ini.getMonth(), 1);
      end = new Date(fin.getFullYear(), fin.getMonth(), 1);
    } else {
      const hoy = new Date();
      start = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      end = new Date(hoy.getFullYear(), hoy.getMonth() + 6, 1);
    }
    const opciones = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const value = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
      opciones.push({ value, label: mesLabel(value) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return opciones;
  }
  // async: 'horarios' vía MySQL.
  async function getHorario(cohorteNombre, mes) {
    return (await Store.list('horarios')).find(h => h.cohorte === cohorteNombre && h.mes === mes) || null;
  }
  // Solo las franjas Activas cuentan para todo lo demás (carga de un
  // docente, vista del estudiante, etc.) — una franja Inactiva queda en el
  // historial pero no aparece en ningún cálculo ni vista de consumo.
  function franjasActivas(horario) {
    return horario && horario.franjas ? horario.franjas.filter(f => f.estado !== 'Inactivo') : [];
  }

  // ── Código de Vestimenta (Color de Camisa por Día y Cohorte) ────────
  const COLORES_CAMISA_DEFAULT = {
    'Lunes': 'Blanco',
    'Martes': 'Morado',
    'Miércoles': 'Azul',
    'Jueves': 'Palo de rosa',
    'Viernes': 'Gris',
    'Sábado': 'Blanco',
  };

  const COLORES_CAMISA_INFO = {
    'Blanco': {
      nombre: 'Blanco',
      hex: '#FFFFFF',
      badgeBg: '#F8FAFC',
      badgeText: '#334155',
      badgeBorder: '#CBD5E1',
      franjaBorder: '#94A3B8',
      franjaBg: '#F8FAFC80',
      swatchClass: 'bg-white border border-gray-400',
    },
    'Morado': {
      nombre: 'Morado',
      hex: '#8B5CF6',
      badgeBg: '#8B5CF614',
      badgeText: '#7C3AED',
      badgeBorder: '#8B5CF640',
      franjaBorder: '#8B5CF6',
      franjaBg: '#8B5CF60A',
      swatchClass: 'bg-[#8B5CF6]',
    },
    'Azul': {
      nombre: 'Azul',
      hex: '#3B82F6',
      badgeBg: '#3B82F614',
      badgeText: '#1D4ED8',
      badgeBorder: '#3B82F640',
      franjaBorder: '#3B82F6',
      franjaBg: '#3B82F60A',
      swatchClass: 'bg-[#3B82F6]',
    },
    'Palo de rosa': {
      nombre: 'Palo de rosa',
      hex: '#E08397',
      badgeBg: '#E083971A',
      badgeText: '#B84D67',
      badgeBorder: '#E083974D',
      franjaBorder: '#E08397',
      franjaBg: '#E083970D',
      swatchClass: 'bg-[#E08397]',
    },
    'Gris': {
      nombre: 'Gris',
      hex: '#64748B',
      badgeBg: '#64748B14',
      badgeText: '#475569',
      badgeBorder: '#64748B40',
      franjaBorder: '#64748B',
      franjaBg: '#64748B0A',
      swatchClass: 'bg-[#64748B]',
    },
    'Verde': {
      nombre: 'Verde',
      hex: '#10B981',
      badgeBg: '#10B98114',
      badgeText: '#047857',
      badgeBorder: '#10B98140',
      franjaBorder: '#10B981',
      franjaBg: '#10B9810A',
      swatchClass: 'bg-[#10B981]',
    },
    'Turquesa': {
      nombre: 'Turquesa',
      hex: '#1FC8C0',
      badgeBg: '#1FC8C014',
      badgeText: '#0D9488',
      badgeBorder: '#1FC8C040',
      franjaBorder: '#1FC8C0',
      franjaBg: '#1FC8C00A',
      swatchClass: 'bg-[#1FC8C0]',
    },
    'Negro': {
      nombre: 'Negro',
      hex: '#1E293B',
      badgeBg: '#1E293B14',
      badgeText: '#0F172A',
      badgeBorder: '#1E293B40',
      franjaBorder: '#1E293B',
      franjaBg: '#1E293B08',
      swatchClass: 'bg-[#1E293B]',
    },
    'Amarillo': {
      nombre: 'Amarillo',
      hex: '#F59E0B',
      badgeBg: '#F59E0B14',
      badgeText: '#B45309',
      badgeBorder: '#F59E0B40',
      franjaBorder: '#F59E0B',
      franjaBg: '#F59E0B0A',
      swatchClass: 'bg-[#F59E0B]',
    },
    'Naranja': {
      nombre: 'Naranja',
      hex: '#F97316',
      badgeBg: '#F9731614',
      badgeText: '#C2410C',
      badgeBorder: '#F9731640',
      franjaBorder: '#F97316',
      franjaBg: '#F973160A',
      swatchClass: 'bg-[#F97316]',
    },
    'Rojo': {
      nombre: 'Rojo',
      hex: '#EF4444',
      badgeBg: '#EF444414',
      badgeText: '#B91C1C',
      badgeBorder: '#EF444440',
      franjaBorder: '#EF4444',
      franjaBg: '#EF44440A',
      swatchClass: 'bg-[#EF4444]',
    },
    'Libre': {
      nombre: 'Libre / Sin uniforme',
      hex: '#94A3B8',
      badgeBg: '#94A3B814',
      badgeText: '#64748B',
      badgeBorder: '#94A3B840',
      franjaBorder: '#CBD5E1',
      franjaBg: '#FFFFFF',
      swatchClass: 'bg-[#94A3B8]',
    },
  };

  function getColoresCamisaCohorte(nombreCohorte) {
    if (!nombreCohorte) return Object.assign({}, COLORES_CAMISA_DEFAULT);
    try {
      const stored = localStorage.getItem('aplus_colores_camisa_' + nombreCohorte);
      if (stored) {
        return Object.assign({}, COLORES_CAMISA_DEFAULT, JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error leyendo colores de camisa de cohorte:', e);
    }
    return Object.assign({}, COLORES_CAMISA_DEFAULT);
  }

  function guardarColoresCamisaCohorte(nombreCohorte, mapping) {
    if (!nombreCohorte) return;
    try {
      localStorage.setItem('aplus_colores_camisa_' + nombreCohorte, JSON.stringify(mapping));
    } catch (e) {
      console.error('Error guardando colores de camisa:', e);
    }
  }

  function getInfoCamisaDia(dia, cohorte = null) {
    const config = getColoresCamisaCohorte(cohorte);
    const colorNombre = config[dia] || COLORES_CAMISA_DEFAULT[dia] || 'Blanco';
    return COLORES_CAMISA_INFO[colorNombre] || COLORES_CAMISA_INFO['Blanco'];
  }
  window.getInfoCamisaDia = getInfoCamisaDia;

  function badgeCamisaDia(dia, cohorte = null) {
    const info = getInfoCamisaDia(dia, cohorte);
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-2xs select-none"
            style="background:${info.badgeBg};color:${info.badgeText};border:1px solid ${info.badgeBorder};"
            title="Código de vestimenta para ${dia}: Camisa ${info.nombre}">
        <span class="w-2.5 h-2.5 rounded-full shrink-0 ${info.swatchClass}" style="box-shadow: 0 0 0 1px ${info.badgeBorder};"></span>
        <span class="truncate">Camisa ${escapeHtml(info.nombre)}</span>
      </span>`;
  }

  function abrirModalColoresCamisa(cohorte) {
    const cohorteActual = cohorte || horarioState.cohorte;
    if (!cohorteActual) {
      toast('Selecciona una cohorte primero', 'err');
      return;
    }

    const config = getColoresCamisaCohorte(cohorteActual);
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const filasHtml = dias.map(d => {
      const colorActual = config[d] || COLORES_CAMISA_DEFAULT[d] || 'Blanco';
      const infoActual = COLORES_CAMISA_INFO[colorActual] || COLORES_CAMISA_INFO['Blanco'];
      const opciones = Object.keys(COLORES_CAMISA_INFO).map(col => {
        const item = COLORES_CAMISA_INFO[col];
        return `<option value="${col}" ${col === colorActual ? 'selected' : ''}>${escapeHtml(item.nombre)}</option>`;
      }).join('');

      return `
        <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100/60 transition">
          <div class="flex items-center gap-2.5">
            <span id="swatch_preview_${d}" class="w-4 h-4 rounded-full shrink-0 ${infoActual.swatchClass} border border-gray-300"></span>
            <div>
              <p class="text-xs font-bold text-ink">${d}</p>
              <p class="text-[10px] text-slate2">${d === 'Sábado' ? 'Opcional / refuerzo' : 'Jornada regular'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select id="sel_color_camisa_${d}" onchange="actualizarSwatchCamisaModal('${d}', this.value)"
              class="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              ${opciones}
            </select>
          </div>
        </div>`;
    }).join('');

    const modalHtml = `
      <div id="modalColoresCamisa" class="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) cerrarModalColoresCamisa()">
        <div class="bg-white rounded-3xl shadow-softLg max-w-lg w-full overflow-hidden">
          <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-morado/10 text-morado flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5l2.5 2.5h2.5l2.5 4.5-2.5 2-1-1v8h-8v-8l-1 1-2.5-2 2.5-4.5h2.5L12 4.5z" />
                  </svg>
                </div>
                <h3 class="text-base font-extrabold text-ink">Código de Vestimenta por Cohorte</h3>
              </div>
              <p class="text-xs text-slate2 mt-1">Configura el color de camisa para cada día en la cohorte <strong class="text-ink">${escapeHtml(cohorteActual)}</strong>.</p>
            </div>
            <button onclick="cerrarModalColoresCamisa()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate2 hover:text-coral transition flex items-center justify-center shrink-0 cursor-pointer" title="Cerrar">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-6 space-y-2.5 max-h-[60vh] overflow-y-auto">
            <div class="p-3 rounded-xl bg-blue-50/70 border border-blue-100/80 mb-3 flex items-start gap-2.5">
              <svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-xs text-blue-800 leading-relaxed">
                Personaliza el color que deben usar los estudiantes y profesores cada día de la semana. Los colores seleccionados se reflejarán en las franjas y encabezados de los horarios.
              </p>
            </div>
            ${filasHtml}
          </div>

          <div class="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <button type="button" onclick="restablecerColoresCamisaDefault('${escapeHtml(cohorteActual)}')" class="text-xs font-semibold text-slate2 hover:text-morado underline transition cursor-pointer">
              Restablecer estándar
            </button>
            <div class="flex items-center gap-2">
              <button type="button" onclick="cerrarModalColoresCamisa()" class="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-slate2 hover:bg-gray-100 transition cursor-pointer">
                Cancelar
              </button>
              <button type="button" onclick="guardarColoresCamisaModal('${escapeHtml(cohorteActual)}')" class="px-5 py-2 rounded-full bg-gradient-to-r from-morado to-turquesa text-white text-xs font-bold shadow-sm hover:opacity-95 transition cursor-pointer">
                Guardar colores
              </button>
            </div>
          </div>
        </div>
      </div>`;

    let container = document.getElementById('modalColoresCamisaContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modalColoresCamisaContainer';
      document.body.appendChild(container);
    }
    container.innerHTML = modalHtml;
  }
  window.abrirModalColoresCamisa = abrirModalColoresCamisa;

  function cerrarModalColoresCamisa() {
    const el = document.getElementById('modalColoresCamisaContainer');
    if (el) el.innerHTML = '';
  }
  window.cerrarModalColoresCamisa = cerrarModalColoresCamisa;

  function actualizarSwatchCamisaModal(dia, colorKey) {
    const swatch = document.getElementById('swatch_preview_' + dia);
    if (!swatch) return;
    const info = COLORES_CAMISA_INFO[colorKey] || COLORES_CAMISA_INFO['Blanco'];
    swatch.className = `w-4 h-4 rounded-full shrink-0 ${info.swatchClass} border border-gray-300`;
  }
  window.actualizarSwatchCamisaModal = actualizarSwatchCamisaModal;

  function guardarColoresCamisaModal(cohorte) {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const mapping = {};
    dias.forEach(d => {
      const sel = document.getElementById('sel_color_camisa_' + d);
      if (sel) mapping[d] = sel.value;
    });
    guardarColoresCamisaCohorte(cohorte, mapping);
    cerrarModalColoresCamisa();
    toast('Código de vestimenta actualizado para ' + cohorte, 'ok');
    if (panelActivoAdmin === 'modulos') renderHorarioGrid();
    if (panelActivoDocente === 'modulos') renderHorarioDocente();
    if (panelActivoEstudiante === 'academico') renderAcademicoEstudiante();
  }
  window.guardarColoresCamisaModal = guardarColoresCamisaModal;

  function restablecerColoresCamisaDefault(cohorte) {
    guardarColoresCamisaCohorte(cohorte, Object.assign({}, COLORES_CAMISA_DEFAULT));
    cerrarModalColoresCamisa();
    toast('Colores restablecidos a valores estándar para ' + cohorte, 'ok');
    if (panelActivoAdmin === 'modulos') renderHorarioGrid();
    if (panelActivoDocente === 'modulos') renderHorarioDocente();
    if (panelActivoEstudiante === 'academico') renderAcademicoEstudiante();
  }
  window.restablecerColoresCamisaDefault = restablecerColoresCamisaDefault;

  // ---------- Datos semilla (solo se cargan la primera vez) ----------
  // La plataforma arranca EN BLANCO: no hay estudiantes, docentes ni
  // coordinadores/administradores de ejemplo. El ÚNICO acceso inicial es
  // el Superadmin (superadmin_credentials). Todo lo demás se crea desde
  // la plataforma (Usuarios, Cohortes, Pensum, etc.) una vez inicias sesión.
  const SEED = {
    // Credenciales del Superadmin: se guardan en el Store (editables desde
    // Configuración), ya no son una constante fija en el código.
    superadmin_credentials: { email: 'superadmin@aplus.org', password: 'Super2026#' },
    usuarios: [],
    // Perfiles: conjuntos de permisos con nombre que el Superadmin arma
    // marcando, panel por panel, si el perfil puede Ver / Crear / Editar /
    // Eliminar. Un usuario puede tener VARIOS perfiles asignados (union de
    // permisos). Se explican con más detalle en CATALOGO_PANELES más abajo.
    perfiles: [],
    modulos: [],
    cursos: [],
    // Base de conocimiento del chat de voz (módulo pendiente, ver SCHEMAS
    // arriba y renderChatVozConocimiento() más abajo para el contexto).
    chat_voz_conocimiento: [],
    trainee_archivos: [],
    pensum: [],
    memorandos: [],
    // PQR: cada solicitud se envía como archivo PDF (la enviaron Docente o
    // Estudiante). estado empieza en 'Pendiente' y pasa a 'Activo' de forma
    // automática la primera vez que el administrador abre/descarga el PDF
    // (ver descargarPqrAdmin). No se edita manualmente.
    pqr: [],
    asistencia: [],
    agenda_estudiante: [],
    semaforo_overrides: {},
    // LIMPIEZA: se retiraron de aquí 4 entidades que nunca se leían ni se
    // escribían en ningún panel (código/datos muertos, siempre quedaban
    // vacías): "calificaciones" (schema genérico reemplazado hace tiempo
    // por notas_modulos), "encuestas" tenía un comentario obsoleto que
    // decía que se había eliminado del sitio cuando en realidad el panel
    // Encuestas sí sigue activo — solo se corrigió el comentario, la
    // entidad se mantiene—, y "materiales", "insignias_estudiantes",
    // "correos_estudiante", que no tenían ningún panel ni función que las
    // usara. Quitarlas no afecta nada visible.
    // Auditoría (solo lectura, Superadmin): ver panel "Auditoría" en Sistema.
    auditoria_login: [],
    auditoria_acciones: [],
    auditoria_horario: [],
    configuracion: {
      nombre: 'Fundación A+',
      ciudad: 'Quibdó',
      direccion: '',
      correo: 'info@fundacionamas.org.co',
      telefono: '3214974708',
      asistenciaMinima: 80,
      notificacionesEmail: true,
      notificacionesIA: true,
      // Postulación pública: el Superadmin activa/desactiva el botón "Postular"
      // del sitio y define el link del cuestionario externo (Google Forms, etc.)
      // donde los interesados dejan sus datos.
      postulacionHabilitada: false,
      postulacionUrl: ''
    }
  };

  // async: Store.get/set ahora son asíncronos para cualquier entidad (ver
  // db.js) — 'usuarios' se excluye explícitamente del sembrado: esa
  // entidad ya vive en MySQL con datos reales, y jamás debe
  // sobrescribirse con el array vacío de SEED.usuarios. El Superadmin
  // también vive en MySQL (superadmin_credentials, gestionado aparte del
  // seed) desde la Fase 1 de la migración.
  async function seedIfEmpty() {
    for (const key of Object.keys(SEED)) {
      if (key === 'usuarios') continue;
      if (key === 'configuracion') {
        if (!(await Store.get('configuracion'))) await Store.set('configuracion', SEED.configuracion);
      } else if (key === 'semaforo_overrides') {
        if (!(await Store.get('semaforo_overrides'))) await Store.set('semaforo_overrides', {});
      } else {
        if (!(await Store.get(key))) await Store.set(key, SEED[key]);
      }
    }
    await asegurarPerfilesDeSistema();
  }

  // ---------- Enter para avanzar/enviar en formularios sin <form> real ----------
  // Muchos formularios de la app (modales de registro, PQR, agenda, etc.)
  // son un <div> con inputs sueltos + un botón, no un <form>, así que Enter
  // no hacía nada y había que ir a buscar el botón con el mouse. Esta
  // función activa, dentro de un contenedor dado:
  //   - Enter en un input de texto  -> salta al siguiente campo visible
  //   - Enter en el ÚLTIMO campo    -> hace clic en el botón principal
  // No afecta <textarea> (ahí Enter sigue siendo salto de línea) ni
  // <select>/checkbox (Enter no tiene un uso natural ahí).
  // Se llama una vez, justo después de pintar el formulario con innerHTML.
  // Por defecto también enfoca el primer campo (para modales que se abren
  // desde cero); pasa autofocus=false en secciones de pestaña ya visibles,
  // donde robarle el foco al usuario al cargar la página sería molesto.
  function habilitarEnterEnFormulario(containerId, botonSelector, autofocus) {
    if (autofocus === undefined) autofocus = true;
    const cont = document.getElementById(containerId);
    if (!cont) return;
    const seleccionCampos = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select';
    const campos = Array.from(cont.querySelectorAll(seleccionCampos));

    campos.forEach((campo, i) => {
      campo.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const siguiente = campos[i + 1];
        if (siguiente) {
          siguiente.focus();
          if (siguiente.select) siguiente.select();
        } else {
          const boton = botonSelector
            ? (cont.querySelector(botonSelector) || document.querySelector(botonSelector))
            : cont.querySelector('button:not([data-cancelar])');
          if (boton) boton.click();
        }
      });
    });

    if (!autofocus) return;
    // El primer campo visible recibe el foco automáticamente, para poder
    // empezar a escribir apenas se abre el formulario sin tener que hacer
    // clic primero.
    const primero = campos.find(c => c.offsetParent !== null);
    if (primero) setTimeout(() => primero.focus(), 50);
  }

  // ---------- Toasts ----------
  function toast(msg, kind) {
    const wrap = document.getElementById('toastWrap');
    const el = document.createElement('div');
    const colors = { ok: '#1FC8C0', err: '#F0455C', info: '#8B5CF6' };
    const c = colors[kind] || colors.info;
    el.className = 'bg-gradient-to-r from-morado to-turquesa text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-softLg flex items-center gap-2.5 opacity-0 translate-y-2 transition-all duration-300';
    el.innerHTML = `<span class="w-2 h-2 rounded-full shrink-0" style="background:${c}"></span><span>${escapeHtml(msg)}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => { el.classList.remove('opacity-0', 'translate-y-2'); });
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 300);
    }, 1000);
  }

  // Feedback inmediato de clic para acciones async (previene envíos duplicados)
  async function withBotonCargando(boton, fnAsync, textoCargando) {
    if (!boton || boton.dataset.cargando === '1') return;
    const textoOriginal = boton.innerHTML;
    boton.dataset.cargando = '1';
    boton.disabled = true;
    boton.classList.add('opacity-70', 'cursor-wait');
    boton.innerHTML = `<span class="inline-flex items-center gap-2 justify-center w-full"><svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>${escapeHtml(textoCargando || 'Guardando…')}</span>`;
    try {
      await fnAsync();
    } finally {
      boton.dataset.cargando = '0';
      boton.disabled = false;
      boton.classList.remove('opacity-70', 'cursor-wait');
      boton.innerHTML = textoOriginal;
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Sistema de perfiles y permisos granulares.
   * Permite definir permisos por panel (Ver, Crear, Editar, Eliminar)
   * asignables a usuarios con combinación aditiva.
   */

  // Catálogo fijo de paneles reales del sistema — mismo código que usa
  // data-panel-code en los botones de menú de index.html. Namespaced por
  // categoría (admin./docente./estudiante.) porque hay nombres repetidos
  // (ej. "pqr") que son datos y vistas distintas según el contexto.
  const CATALOGO_PANELES = [
    { codigo: 'admin.resumen', categoria: 'Administrativo', etiqueta: 'Resumen' },
    { codigo: 'admin.usuarios', categoria: 'Administrativo', etiqueta: 'Usuarios' },
    { codigo: 'admin.perfiles', categoria: 'Administrativo', etiqueta: 'Perfiles y permisos' },
    { codigo: 'admin.modulos', categoria: 'Administrativo', etiqueta: 'Cohortes' },
    { codigo: 'admin.cursos', categoria: 'Administrativo', etiqueta: 'Cursos' },
    { codigo: 'admin.horario', categoria: 'Administrativo', etiqueta: 'Horario' },
    { codigo: 'admin.codigosqr', categoria: 'Administrativo', etiqueta: 'Códigos QR' },
    { codigo: 'admin.pensum', categoria: 'Administrativo', etiqueta: 'Pensum' },
    { codigo: 'admin.semaforo', categoria: 'Administrativo', etiqueta: 'Semáforo en riesgo' },
    { codigo: 'admin.memorandos', categoria: 'Administrativo', etiqueta: 'Memorandos' },
    { codigo: 'admin.pqr', categoria: 'Administrativo', etiqueta: 'PQR' },
    { codigo: 'admin.calificaciones', categoria: 'Administrativo', etiqueta: 'Calificaciones' },
    { codigo: 'admin.informesAdmin', categoria: 'Administrativo', etiqueta: 'Informes' },
    { codigo: 'admin.encuestas', categoria: 'Administrativo', etiqueta: 'Encuestas de satisfacción' },
    { codigo: 'admin.trainee', categoria: 'Administrativo', etiqueta: 'Historial Trainee' },
    { codigo: 'admin.auditoria', categoria: 'Administrativo', etiqueta: 'Auditoría' },
    { codigo: 'admin.chatvoz', categoria: 'Administrativo', etiqueta: 'Chat conocimiento — Base de conocimiento' },
    { codigo: 'admin.configuracion', categoria: 'Administrativo', etiqueta: 'Configuración' },
    { codigo: 'docente.resumen', categoria: 'Docente', etiqueta: 'Resumen' },
    { codigo: 'docente.perfil', categoria: 'Docente', etiqueta: 'Mi perfil' },
    { codigo: 'docente.asistencia', categoria: 'Docente', etiqueta: 'Asistencia' },
    { codigo: 'docente.riesgo', categoria: 'Docente', etiqueta: 'Riesgo académico' },
    { codigo: 'docente.informes', categoria: 'Docente', etiqueta: 'Informes' },
    { codigo: 'docente.modulos', categoria: 'Docente', etiqueta: 'Horario' },
    { codigo: 'docente.calificaciones', categoria: 'Docente', etiqueta: 'Calificaciones' },
    { codigo: 'docente.pensum', categoria: 'Docente', etiqueta: 'Pensum' },
    { codigo: 'docente.memorandos', categoria: 'Docente', etiqueta: 'Memorandos' },
    { codigo: 'docente.pqr', categoria: 'Docente', etiqueta: 'PQR' },
    { codigo: 'docente.agenda', categoria: 'Docente', etiqueta: 'Agenda' },
    { codigo: 'estudiante.resumen', categoria: 'Estudiante', etiqueta: 'Resumen' },
    { codigo: 'estudiante.perfil', categoria: 'Estudiante', etiqueta: 'Mi perfil' },
    { codigo: 'estudiante.asistencia', categoria: 'Estudiante', etiqueta: 'Asistencia' },
    { codigo: 'estudiante.academico', categoria: 'Estudiante', etiqueta: 'Académico' },
    { codigo: 'estudiante.calificaciones', categoria: 'Estudiante', etiqueta: 'Calificaciones' },
    { codigo: 'estudiante.pensum', categoria: 'Estudiante', etiqueta: 'Pensum' },
    { codigo: 'estudiante.memorandos', categoria: 'Estudiante', etiqueta: 'Memorandos' },
    { codigo: 'estudiante.pqr', categoria: 'Estudiante', etiqueta: 'PQR' },
    { codigo: 'estudiante.encuestas', categoria: 'Estudiante', etiqueta: 'Encuestas' },
    { codigo: 'estudiante.agenda', categoria: 'Estudiante', etiqueta: 'Agenda' },
  ];

  // Nombres de los 2 perfiles "de sistema" que dan acceso completo a su
  // categoría — se auto-crean si no existen, para que Docente/Estudiante
  // sigan viendo todo lo que veían antes de activar este sistema.
  const PERFIL_SISTEMA_DOCENTE = 'Docente Estándar';
  const PERFIL_SISTEMA_ESTUDIANTE = 'Estudiante Estándar';

  // Crea (si no existen) los perfiles de sistema con acceso total a su
  // categoría, y asigna ese perfil a cualquier Docente/Estudiante que
  // todavía no tenga ningún perfil — así nadie pierde acceso el día que
  // se activa este sistema sobre datos ya existentes.
  // async: toca tanto 'perfiles' (localStorage, Fase 4) como 'usuarios'
  // (MySQL desde la Fase 1) — ver comentario de seedIfEmpty(), que ahora
  // hace await de esta función.
  async function asegurarPerfilesDeSistema() {
    let perfiles = await Store.list('perfiles');
    let cambiosPerfiles = false;

    [{ nombre: PERFIL_SISTEMA_DOCENTE, categoria: 'Docente' },
     { nombre: PERFIL_SISTEMA_ESTUDIANTE, categoria: 'Estudiante' }].forEach(base => {
      let p = perfiles.find(x => x.nombre === base.nombre);
      if (!p) {
        p = {
          id: uid('perf'), nombre: base.nombre, categoria: base.categoria,
          descripcion: 'Acceso completo — perfil de sistema, no se puede eliminar.',
          esSistema: true,
          permisos: {}, // panel_codigo -> {ver,crear,editar,eliminar}
        };
        perfiles.push(p);
        cambiosPerfiles = true;
      }
      // Se re-normaliza siempre (no solo al crear) para que un panel nuevo
      // agregado en el futuro a CATALOGO_PANELES quede también cubierto.
      CATALOGO_PANELES.filter(pan => pan.categoria === base.categoria).forEach(pan => {
        if (!p.permisos[pan.codigo] || !p.permisos[pan.codigo].ver) {
          p.permisos[pan.codigo] = { ver: true, crear: true, editar: true, eliminar: true };
          cambiosPerfiles = true;
        }
      });
    });

    if (cambiosPerfiles) await Store.set('perfiles', perfiles);

    const usuarios = await Store.list('usuarios');
    let cambiosUsuarios = false;
    usuarios.forEach(u => {
      if ((u.rol === 'Docente' || u.rol === 'Estudiante') && (!u.perfiles || !u.perfiles.length)) {
        const nombreBuscado = u.rol === 'Docente' ? PERFIL_SISTEMA_DOCENTE : PERFIL_SISTEMA_ESTUDIANTE;
        const perfilSistema = perfiles.find(p => p.nombre === nombreBuscado); // reutiliza 'perfiles' ya cargado arriba, en vez de otra llamada a Store
        if (perfilSistema) { u.perfiles = [perfilSistema.id]; cambiosUsuarios = true; }
      }
    });
    if (cambiosUsuarios) await Store.set('usuarios', usuarios);
  }

  // Devuelve el permiso combinado (unión) de un usuario sobre un panel.
  // usuario null/undefined => sin acceso a nada (defensivo).
  // Cache en memoria para navegación instantánea sin peticiones de red repetitivas en cada clic.
  let _perfilesMemoryCache = null;
  let _perfilesMemoryCacheTime = 0;
  function invalidarCachePerfiles() { _perfilesMemoryCache = null; }

  async function permisoUsuarioSobrePanel(usuario, panelCodigo) {
    const vacio = { ver: false, crear: false, editar: false, eliminar: false };
    if (!usuario) return vacio;
    // El Superadmin (currentAdminRole === 'superadmin') no pasa por esta
    // función: se resuelve aparte en applyPermisosPanelesAdmin() con
    // acceso total, para que nunca dependa de datos editables.
    const idsPerfiles = usuario.perfiles || [];
    if (!idsPerfiles.length) return vacio;
    if (!_perfilesMemoryCache || (Date.now() - _perfilesMemoryCacheTime > 45000)) {
      _perfilesMemoryCache = await Store.list('perfiles');
      _perfilesMemoryCacheTime = Date.now();
    }
    const perfiles = _perfilesMemoryCache.filter(p => idsPerfiles.includes(p.id));
    const combinado = { ...vacio };
    perfiles.forEach(p => {
      const perm = (p.permisos || {})[panelCodigo];
      if (!perm) return;
      combinado.ver = combinado.ver || !!perm.ver;
      combinado.crear = combinado.crear || !!perm.crear;
      combinado.editar = combinado.editar || !!perm.editar;
      combinado.eliminar = combinado.eliminar || !!perm.eliminar;
    });
    return combinado;
  }

  // Se llama UNA VEZ justo después del login: oculta del menú los tabs sin
  // permiso de "ver" y navega al primer panel que el usuario sí puede ver.
  // Si no tiene ningún permiso (sin perfil asignado), muestra el aviso.
  async function abrirPrimerPanelSegunPermisos(prefijo, usuario, tabSelector, contentSelector, showFn, panelPreferido) {
    // Antes de decidir nada: si quedó un aviso de "sin perfil asignado"
    // de una sesión anterior en ESTE MISMO contenedor (logout() no borra
    // el HTML, solo oculta la vista — ver logout()/logoutDocente()/
    // logoutEstudiante()), se quita ahora. Sin esto, el aviso de un login
    // anterior sin perfil quedaba visible por encima de cualquier panel
    // nuevo, incluso el del Superadmin, que comparte el mismo
    // dashboardView/.panel-content que Coordinador/Administración.
    quitarAvisoSinAcceso(contentSelector);

    // El Superadmin siempre ve todo: nunca se filtra nada para él.
    if (prefijo === 'admin' && currentAdminRole === 'superadmin') {
      showFn(panelPreferido);
      return;
    }
    let primerVisible = null;
    let preferidoVisible = false;
    // for...of (no forEach) porque cada vuelta necesita esperar la
    // Promise real de permisoUsuarioSobrePanel — un forEach normal NO
    // espera awaits dentro de su callback, así que antes cada `permiso`
    // era la Promise en sí (no el objeto {ver, crear...}), permiso.ver
    // siempre salía undefined, y TODOS los tabs quedaban ocultos sin
    // importar el perfil real asignado.
    for (const tab of document.querySelectorAll(tabSelector)) {
      // Techo estructural por rol: un tab exclusivo de Superadmin
      // (data-super-only) o vedado a Administración (data-admin-hide)
      // permanece oculto sin importar lo que diga el perfil asignado.
      // El perfil solo puede RESTRINGIR dentro de lo que el rol ya
      // permite, nunca AMPLIAR más allá de esas fronteras.
      if (prefijo === 'admin' && (tab.dataset.superOnly === 'true' || tab.dataset.adminHide === 'true')) {
        tab.classList.add('hidden');
        continue;
      }
      const codigo = tab.dataset.panelCode;
      if (!codigo) continue; // tab sin código = no gestionado por permisos
      const permiso = await permisoUsuarioSobrePanel(usuario, codigo);
      tab.classList.toggle('hidden', !permiso.ver);
      if (permiso.ver) {
        const clave = tab.dataset.panel || tab.dataset.tpanel || tab.dataset.spanel;
        if (!primerVisible) primerVisible = clave;
        if (clave === panelPreferido) preferidoVisible = true;
      }
    }
    if (preferidoVisible) showFn(panelPreferido);
    else if (primerVisible) showFn(primerVisible);
    else mostrarSinAcceso(contentSelector);

    // Oculta el título de cada sección del sidebar (ej. "Gestión académica",
    // "Comunicación") cuando NINGUNO de sus botones quedó visible tras el
    // filtro de permisos de arriba — antes esos títulos se quedaban
    // siempre visibles, mostrando encabezados "vacíos" sin nada debajo
    // para un usuario cuyo perfil no incluye ningún módulo de esa sección.
    ocultarSeccionesSidebarVacias(tabSelector);
  }

  function ocultarSeccionesSidebarVacias(tabSelector) {
    // Cada sección es el <div class="mb-6" (...)> más cercano que contiene
    // al <nav> con los tabs — mismo patrón en los sidebars de Admin,
    // Docente y Estudiante. Se agrupan los tabs por esa sección y se
    // oculta la sección completa (título incluido) si ninguno quedó visible.
    document.querySelectorAll(tabSelector).forEach(tab => {
      const seccion = tab.closest('nav')?.parentElement;
      if (!seccion) return;
      const algunoVisible = Array.from(seccion.querySelectorAll(tabSelector)).some(t => !t.classList.contains('hidden'));
      seccion.classList.toggle('hidden', !algunoVisible);
    });
  }

  // Quita el aviso de "sin perfil asignado" de un login anterior, si
  // quedó huérfano en este contenedor (ver comentario en
  // abrirPrimerPanelSegunPermisos). Se usa tanto antes de recalcular los
  // permisos como en cada logout, para no depender de un solo punto.
  function quitarAvisoSinAcceso(contentSelector) {
    const contenedor = document.querySelector(contentSelector)?.parentElement;
    if (!contenedor) return;
    const avisoViejo = contenedor.querySelector('.sin-acceso-aviso');
    if (avisoViejo) avisoViejo.remove();
  }

  // Pantalla de aviso cuando el usuario no tiene ningún panel visible.
  function mostrarSinAcceso(contentSelector) {
    document.querySelectorAll(contentSelector).forEach(el => el.classList.add('hidden'));
    const contenedor = document.querySelector(contentSelector)?.parentElement;
    if (!contenedor) return;
    // Se recrea desde cero en vez de reutilizar un nodo previo: así nunca
    // hay dos avisos duplicados ni uno "hidden" que alguien vuelva a
    // mostrar por error.
    quitarAvisoSinAcceso(contentSelector);
    const aviso = document.createElement('div');
    aviso.className = 'sin-acceso-aviso bg-white rounded-2xl border border-gray-100 shadow-soft p-10 text-center';
    aviso.innerHTML = `
      <p class="text-base font-bold text-ink mb-2">Tu cuenta no tiene ningún perfil asignado todavía</p>
      <p class="text-sm text-slate2">Contacta al Superadmin para que te asigne un perfil con las funcionalidades que necesitas.</p>`;
    contenedor.appendChild(aviso);
  }

  // ---------- Esquemas de formulario por entidad ----------
  const SCHEMAS = {
    usuarios: {
      label: 'Usuario', icon: 'Usuarios',
      fields: [
        { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
        // Contraseña de acceso: el usuario inicia sesión con su correo + esta
        // contraseña. Al editar, se puede dejar en blanco para conservar la
        // que ya tenía (ver manejo especial en saveModal).
        { key: 'password', label: 'Contraseña de acceso', type: 'password' },
        // Las opciones reales de "rol" se calculan en openModal() a partir de
        // rolesCreacionUsuario(): Estudiante/Docente para Administración, y
        // además Coordinador ("Administrador") si quien crea es el Superadmin.
        { key: 'rol', label: 'Rol', type: 'select', options: ['Estudiante', 'Docente', 'Coordinador', 'Administrador'], required: true },
        // Las opciones reales de "cohorte" se calculan en openModal() a partir de
        // las cohortes existentes (Store('modulos')) — ver bloque "select" más abajo.
        { key: 'cohorte', label: 'Cohorte', type: 'select', options: [] },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], default: 'Activo' },
      ]
    },
    modulos: {
      label: 'Cohorte', icon: 'Módulos',
      fields: [
        { key: 'nombre', label: 'Nombre de la cohorte', type: 'text', required: true },
        { key: 'modulo', label: 'Módulo del Training', type: 'text', required: true },
        // El docente ya NO se escribe aquí: se asigna desde el panel "Horario"
        // (celda por celda) y se calcula automáticamente para toda la app.
        { key: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
        { key: 'fechaFin', label: 'Fecha de finalización', type: 'date' },
        { key: 'cupos', label: 'Cupos totales', type: 'number', default: 25 },
        // "Inscritos" tampoco se escribe a mano: se cuenta solo a partir de
        // los estudiantes que realmente tienen esta cohorte asignada, vía
        // contarInscritos(). CORREGIDO: el Resumen (Superadmin y
        // Administración) todavía leía un campo "m.inscritos" que nunca se
        // llenó — daba siempre 0 y hacía que "Ocupación de cupos" y la
        // alerta "cupos completos" fueran incorrectas. Ya se corrigió para
        // usar contarInscritos() ahí también (ver renderResumenSuperadmin()
        // y renderResumen()).
        { key: 'estado', label: 'Estado', type: 'select', options: ['Planeada', 'En curso', 'Finalizada'], default: 'Planeada' },
      ]
    },
    // "Cursos" es una entidad NUEVA e independiente de "Pensum" (que sigue
    // existiendo tal cual, para los temas curriculares dentro de una
    // cohorte). Cursos es el catálogo general de programas que ofrece la
    // fundación — solo nombre, descripción y si está activo u ofertándose.
    cursos: {
      label: 'Curso', icon: 'Cursos',
      fields: [
        { key: 'nombre', label: 'Nombre del curso', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', rows: 4 },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], default: 'Activo' },
      ]
    },
    // Base de conocimiento del chat con IA (tabla chat_voz_conocimiento)
    // El chat de texto (widget flotante, backend_chat/ con Groq/Gemini) ya
    // está implementado y responde preguntas usando IA real. Esta base de
    // conocimiento es la fuente que consulta para lo que no puede resolver
    // solo con los datos propios del sistema (ej. "¿Cuándo se abren las
    // convocatorias?"). Vive en MySQL (tabla chat_voz_conocimiento — el
    // nombre interno de la tabla se mantuvo por compatibilidad aunque el
    // panel visible se llama "Chat conocimiento"), así que lo que se
    // guarda aquí lo lee el backend en cada pregunta, sin pasos manuales.
    //
    // Cada entrada tiene un TEMA (título de referencia, no una pregunta
    // exacta), su contenido/información completa, y un campo "visibilidad"
    // clave para la regla de negocio ya acordada:
    //   - "Pública": el chat puede usarla tanto con visitantes sin sesión
    //     como con usuarios logueados.
    //   - "Solo usuarios con sesión": el chat NUNCA debe usar esta entrada
    //     para responderle a alguien sin login. Esto es aparte de los datos
    //     propios del usuario (notas, asistencia, etc.), que salen de las
    //     entidades reales (usuarios, notas_modulos, asistencia...), no de
    //     aquí — esta base es solo para información de tipo FAQ que no
    //     vive en ninguna otra tabla.
    // La IA reformula esta información con sus propias palabras al
    // responder — no la lee literal ni busca coincidencia exacta de texto
    // (buscarEnBaseConocimientoChatVoz() más abajo es un placeholder viejo
    // que ya no usa el chat real; el backend en Python lee la tabla
    // directo vía api/index.php -> manejarChatVozConocimiento).
    chat_voz_conocimiento: {
      label: 'Entrada de conocimiento', icon: 'ChatVoz',
      fields: [
        { key: 'titulo', label: 'Tema (ej. "Convocatorias: cuándo abren y cómo aplicar", NO una pregunta exacta)', type: 'text', required: true },
        { key: 'contenido', label: 'Información completa sobre ese tema (el chat la reformula con IA, no la lee literal)', type: 'textarea', rows: 5, required: true },
        { key: 'visibilidad', label: 'Quién puede recibir esta respuesta', type: 'select', options: ['Pública', 'Solo usuarios con sesión'], default: 'Pública' },
        { key: 'categoria', label: 'Categoría (opcional, para organizar)', type: 'text' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activa', 'Inactiva'], default: 'Activa' },
      ]
    },
    pensum: {
      label: 'Tema curricular', icon: 'Pensum',
      fields: [
        { key: 'modulo', label: 'Módulo', type: 'text', required: true },
        { key: 'tema', label: 'Tema / unidad', type: 'text', required: true },
        { key: 'horas', label: 'Horas', type: 'number', default: 8 },
        { key: 'docente', label: 'Docente responsable', type: 'select', options: [] },
        { key: 'orden', label: 'Orden dentro del módulo', type: 'number', default: 1 },
        // Archivo que el estudiante podrá ver/descargar desde su Pensum curricular.
        // Se maneja aparte en openModal()/saveModal() (lee el File y lo guarda como
        // data URL en archivoNombre/archivoTipo/archivoDatos del registro).
        { key: 'archivo', label: 'Archivo (PDF u otro documento)', type: 'file' },
      ]
    },
    memorandos: {
      label: 'Memorando', icon: 'Memorandos',
      fields: [
        { key: 'titulo', label: 'Asunto', type: 'text', required: true },
        // Antes era un <select> con TODOS los usuarios precargados; ahora es
        // un buscador (escribe nombre o correo y elige de la lista filtrada)
        // — mismo valor guardado (correo del usuario, o un grupo especial),
        // solo cambia cómo se elige. Ver renderizado en type 'buscar_destinatario'.
        { key: 'destinatario', label: 'Destinatario', type: 'buscar_destinatario', required: true },
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Borrador', 'Enviado'], default: 'Borrador' },
        // El memorando ya NO lleva un campo de texto largo ("Contenido"):
        // el documento en sí (PDF/Word/PowerPoint) ES el memorando, y por
        // eso el archivo es obligatorio aquí (a diferencia del patrón que
        // sigue PQR/Pensum, donde es opcional). Ver saveModal() para la
        // validación de obligatoriedad de este campo en particular.
        { key: 'archivo', label: 'Archivo del memorando (PDF, Word o PowerPoint)', type: 'file', required: true },
      ]
    },
    // "pqr" ya no tiene schema de edición: el administrador no puede editar
    // ni crear PQR manualmente. Cada solicitud la sube como PDF el Docente
    // o el Estudiante (ver renderPqrDocente/renderPqrEstudiante) y su estado
    // ("Pendiente" -> "Activo") lo actualiza automáticamente el sistema
    // cuando el administrador descarga el PDF (ver descargarPqrAdmin).
    // "calendario" (Calendario institucional) fue eliminado del sitio: ya no
    // existe en el panel Admin ni en el panel Estudiante.
    // Encuestas de satisfacción: ya NO es un formulario interno con
    // calificación de estrellas — es un LINK EXTERNO (típicamente Google
    // Forms) que se le envía a los estudiantes de una cohorte. La app solo
    // guarda el título, el link, y a qué cohorte va dirigida; las
    // respuestas y su análisis viven en la herramienta externa, no aquí.
    encuestas: {
      label: 'Encuesta de satisfacción', icon: 'Encuestas',
      fields: [
        { key: 'titulo', label: 'Título de la encuesta', type: 'text', required: true },
        { key: 'url', label: 'Link de la encuesta (Google Forms u otro)', type: 'text', required: true },
        { key: 'cohorte', label: 'Cohorte destinataria', type: 'select', options: [], required: true },
        { key: 'fecha', label: 'Fecha de publicación', type: 'date', required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Abierta', 'Cerrada'], default: 'Abierta' },
      ]
    },
    // "calificaciones" (schema genérico {estudiante, modulo, nota, fecha})
    // se retiró: era código muerto — nunca se leía ni se guardaba en
    // Store('calificaciones') desde ningún panel. El sistema real de
    // calificaciones usa Store('notas_modulos') con criterios ponderados
    // por docente/cohorte/mes (ver calcularNotaFinal(),
    // promedioGeneralEstudianteCohorte(), renderCalificaciones*()). El
    // panel visible "Calificaciones" del menú usa esas funciones, no este
    // schema — nunca hubo un botón "Crear calificación" que lo abriera.
  };

  // ---------- Estado del modal ----------
  let modalCtx = { entity: null, id: null };
  let deleteCtx = { entity: null, id: null };

  // Roles que se pueden asignar al CREAR/EDITAR un usuario desde el panel
  // genérico "Usuarios" (Estudiantes y Docentes). Los Administradores ya NO
  // se crean aquí: tienen su propio apartado exclusivo del Superadmin (ver
  // panel "Administradores" / renderAdministradores() / openModal(..., 'Coordinador')).
  function rolesCreacionUsuario() {
    return ['Estudiante', 'Docente'];
  }

  // async: 'usuarios' habla con MySQL ahora. Se precargan aquí, ANTES del
  // .map() síncrono de más abajo (que genera el HTML de cada campo del
  // formulario), porque ese .map() no puede usar await dentro de sus
  // callbacks. record0 también depende de esto cuando entity=='usuarios'.
  async function openModal(entity, id, forcedRole, options = {}) {
    const schema = SCHEMAS[entity];
    if (!schema) return;
    const listaEntidadActual = await Store.list(entity); // funciona igual para 'usuarios' (MySQL) y cualquier otra entidad (localStorage, ver Store híbrido en db.js)
    const record0 = id ? listaEntidadActual.find(r => r.id === id) : null;

    // Solo el Superadmin puede editar cuentas de Administrador (Coordinador).
    if (entity === 'usuarios' && record0 && (record0.rol === 'Coordinador' || record0.rol === 'Administrador') && currentAdminRole !== 'superadmin') {
      toast('Solo el Superadmin puede editar una cuenta de Administrador', 'err');
      return;
    }

    modalCtx = { entity, id: id || null, ...(options || {}) };
    const record = record0;

    // Precarga de listas usadas DENTRO de los .map()/callbacks síncronos
    // de más abajo (no pueden hacer await): 'usuarios' vía MySQL, el resto
    // vía localStorage — Store.list ya maneja ambos casos por igual.
    // Si la entidad que se está editando YA ES 'usuarios', se reutiliza
    // listaEntidadActual (evita pedirla dos veces a MySQL en la misma
    // apertura de modal); si es otra entidad pero el formulario necesita
    // el catálogo de usuarios (buscador de destinatario, docente del
    // pensum...), se pide aparte.
    const necesitaUsuarios = entity === 'usuarios' || schema.fields.some(f => f.type === 'buscar_destinatario' || (entity === 'pensum' && f.key === 'docente'));
    const usuariosPrecargados = necesitaUsuarios
      ? (entity === 'usuarios' ? listaEntidadActual : await Store.list('usuarios'))
      : null;
    const necesitaModulos = schema.fields.some(f => (entity === 'usuarios' && f.key === 'cohorte') || (entity === 'encuestas' && f.key === 'cohorte'));
    const modulosPrecargados = necesitaModulos
      ? (entity === 'modulos' ? listaEntidadActual : await Store.list('modulos'))
      : null;

    const esDocenteModal = (forcedRole === 'Docente') || (record0 && record0.rol === 'Docente');
    const esEstudianteModal = (forcedRole === 'Estudiante') || (record0 && record0.rol === 'Estudiante');
    let labelModal = schema.label;
    if (forcedRole === 'Coordinador') labelModal = 'Administrador';
    else if (esDocenteModal) labelModal = 'Profesor / Docente';
    else if (esEstudianteModal) labelModal = 'Estudiante';

    document.getElementById('modalEyebrow').textContent = modalCtx.esAprobacion ? 'Aprobación de Registro' : (id ? 'Editar' : 'Crear nuevo');
    document.getElementById('modalTitle').textContent = modalCtx.esAprobacion ? 'Aprobar y Configurar Estudiante' : labelModal;

    const form = document.getElementById('modalForm');
    let bannerAprobacion = '';
    if (modalCtx.esAprobacion && record) {
      bannerAprobacion = `
        <div class="sm:col-span-2 rounded-2xl bg-gradient-to-r from-morado/15 via-turquesa/10 to-transparent border border-morado/30 p-4 mb-2">
          <div class="flex items-center gap-3.5">
            <img src="logo.jpg" alt="Fundación A+" class="h-11 w-auto rounded-xl shadow-sm border border-white/80 shrink-0" />
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-morado bg-morado/20 rounded-full px-2.5 py-0.5">Aprobando Solicitud</span>
                <h4 class="text-sm font-extrabold text-ink">${escapeHtml(record.nombre)}</h4>
              </div>
              <p class="text-xs text-slate2 mt-1">
                Asigna una <strong>cohorte</strong> y <strong>perfiles</strong>. Si ingresas una contraseña abajo, se le asignará como <strong>nueva credencial</strong>; si la dejas en blanco, conservará la que ingresó al registrarse. Al guardar, se enviará automáticamente el correo con sus credenciales y el logo institucional.
              </p>
            </div>
          </div>
        </div>`;
    }

    let bannerFotoUsuario = '';
    if (entity === 'usuarios' && record && record.fotoUrl && !modalCtx.esAprobacion) {
      bannerFotoUsuario = `
        <div class="sm:col-span-2 rounded-2xl bg-gray-50/80 border border-gray-100 p-3.5 mb-2 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="${escapeHtml(record.fotoUrl)}" alt="${escapeHtml(record.nombre || '')}" onclick="expandirFotoPerfil('${escapeHtml(record.fotoUrl)}', '${escapeHtml(record.nombre || '')}', '${escapeHtml(record.rol || '')}')" class="w-12 h-12 rounded-xl object-cover border border-gray-200 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-morado/40 shadow-sm" title="Clic para ampliar foto" />
            <div>
              <p class="text-xs font-bold text-ink">Foto de perfil actual</p>
              <p class="text-[11px] text-slate2">Haz clic en la imagen para verla en tamaño completo.</p>
            </div>
          </div>
          <button type="button" onclick="expandirFotoPerfil('${escapeHtml(record.fotoUrl)}', '${escapeHtml(record.nombre || '')}', '${escapeHtml(record.rol || '')}')" class="text-xs font-semibold text-morado bg-morado/10 hover:bg-morado/20 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0">Ampliar foto</button>
        </div>`;
    }

    form.innerHTML = bannerAprobacion + bannerFotoUsuario + schema.fields.map(f => {
      const val = record ? record[f.key] : (f.default !== undefined ? f.default : '');
      const idAttr = 'field_' + f.key;

      // Apartado exclusivo de Administradores: el rol ya viene fijo
      // (Coordinador) y no aplica cohorte, así que esos dos campos se
      // guardan como ocultos en vez de mostrarse en el formulario.
      if (entity === 'usuarios' && forcedRole && f.key === 'rol') {
        return `<input type="hidden" id="${idAttr}" value="${escapeHtml(forcedRole)}" />`;
      }
      if (entity === 'usuarios' && forcedRole === 'Coordinador' && f.key === 'cohorte') {
        return `<input type="hidden" id="${idAttr}" value="" />`;
      }

      // Buscador de destinatario para Memorandos: escribe nombre o correo y
      // elige de una lista filtrada en vivo, en vez de desplazarse por un
      // <select> con todos los usuarios precargados. El grupo especial
      // ('Todos', 'Todos los estudiantes', 'Todos los docentes') sigue
      // disponible como resultado más al escribir "todos". El valor real
      // que lee saveModal() (el correo o el nombre de grupo) vive en el
      // input oculto con el mismo id que espera saveModal(); el input
      // visible solo muestra el nombre/correo elegido y es puramente de UI.
      if (f.type === 'buscar_destinatario') {
        const usuarios = [...usuariosPrecargados].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const grupos = [
          { value: 'Todos', label: '— Todos los usuarios —' },
          { value: 'Todos los estudiantes', label: '— Todos los estudiantes —' },
          { value: 'Todos los docentes', label: '— Todos los docentes —' },
        ];
        const catalogo = [
          ...grupos,
          ...usuarios.map(u => ({ value: u.email, label: `${u.nombre} (${u.email}) · ${u.rol}` })),
        ];
        window.__catalogoDestinatarios = catalogo; // leído por buscarDestinatarioInput()
        const actual = catalogo.find(o => o.value === val);
        const textoInicial = actual ? actual.label : (val || '');
        return `<div class="sm:col-span-2 relative">
          <label class="block text-xs font-semibold text-slate2 mb-1.5" for="destinatarioBuscar">${f.label}</label>
          <input id="destinatarioBuscar" type="text" autocomplete="off" value="${escapeHtml(textoInicial)}"
            placeholder="Escribe un nombre, correo, o 'todos'…"
            oninput="buscarDestinatarioInput(this.value)"
            onfocus="buscarDestinatarioInput(this.value)"
            onblur="setTimeout(() => { const c = document.getElementById('destinatarioResultados'); if (c) c.classList.add('hidden'); }, 150)"
            class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
          <input id="${idAttr}" type="hidden" value="${escapeHtml(val)}" />
          <div id="destinatarioResultados" class="hidden absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"></div>
        </div>`;
      }

      if (f.type === 'select') {
        // El rol disponible depende de quién crea el usuario: ver rolesCreacionUsuario().
        let opciones = f.options;
        if (entity === 'usuarios' && f.key === 'rol') {
          opciones = rolesCreacionUsuario();
        } else if (entity === 'usuarios' && f.key === 'cohorte') {
          const esDocente = (forcedRole === 'Docente') || (record && record.rol === 'Docente');
          if (esDocente) {
            // Profesores: pueden ser asignados a cualquier cohorte sin restricción de cupos de estudiante
            opciones = [{ value: '', label: '— Sin cohorte asignada —' }];
            (modulosPrecargados || []).forEach(m => {
              opciones.push({
                value: m.nombre,
                label: m.nombre,
                disabled: false
              });
            });
          } else {
            // Estudiantes: cálculo estricto de cupos para no permitir sobrecupos
            const conteoPorCohorte = {};
            (usuariosPrecargados || []).forEach(u => {
              if (u.rol === 'Estudiante' && u.cohorte && u.estadoRegistro !== 'Rechazado') {
                conteoPorCohorte[u.cohorte] = (conteoPorCohorte[u.cohorte] || 0) + 1;
              }
            });
            opciones = [{ value: '', label: 'Sin asignar' }];
            (modulosPrecargados || []).forEach(m => {
              const inscritos = conteoPorCohorte[m.nombre] || 0;
              const cuposMax = Number(m.cupos || 0);
              const esMismaCohorte = record && record.cohorte === m.nombre;
              const lleno = cuposMax > 0 && inscritos >= cuposMax && !esMismaCohorte;
              const tagCupos = cuposMax > 0 ? ` (${inscritos}/${cuposMax} cupos${lleno ? ' - Lleno' : ''})` : '';
              opciones.push({
                value: m.nombre,
                label: m.nombre + tagCupos,
                disabled: lleno
              });
            });
          }
          if (val && !opciones.some(o => o.value === val)) {
            opciones.push({ value: val, label: val });
          }
        } else if (entity === 'pensum' && f.key === 'docente') {
          // Lista real de docentes (Store 'usuarios'), no texto libre — así el
          // nombre siempre coincide exactamente con su usuario y su perfil se
          // puede abrir con un clic desde el Pensum del estudiante.
          const docentesReales = usuariosPrecargados.filter(u => u.rol === 'Docente').map(u => u.nombre);
          if (val && !docentesReales.includes(val)) docentesReales.push(val); // conserva un valor legado que ya no exista
          opciones = ['', ...docentesReales];
        } else if (entity === 'encuestas' && f.key === 'cohorte') {
          // Cohortes reales (Store 'modulos'): el link llega a todos los
          // estudiantes con ese valor exacto en usuarios.cohorte.
          const cohortesReales = modulosPrecargados.map(m => m.nombre);
          if (val && !cohortesReales.includes(val)) cohortesReales.push(val); // conserva un valor legado que ya no exista
          opciones = [{ value: '', label: 'Selecciona una cohorte…' }, ...cohortesReales.map(c => ({ value: c, label: c }))];
        }
        // Normaliza a {value,label} para poder mezclar strings simples con pares dinámicos.
        opciones = opciones.map(o => (o && typeof o === 'object') ? o : { value: o, label: (o === '' ? 'Sin asignar' : o) });
        const opts = opciones.map(o => `<option value="${escapeHtml(o.value)}" ${val === o.value ? 'selected' : ''} ${o.disabled ? 'disabled class="text-coral bg-gray-100"' : ''}>${escapeHtml(o.label)}</option>`).join('');
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <select id="${idAttr}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">${opts}</select></div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="sm:col-span-2"><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <textarea id="${idAttr}" rows="${f.rows || 3}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">${escapeHtml(val)}</textarea></div>`;
      }
      if (f.type === 'file') {
        const actual = record && record.archivoNombre
          ? `<p class="text-xs text-slate2 mt-1.5">Archivo actual: <span class="font-semibold text-ink">${escapeHtml(record.archivoNombre)}</span> — sube uno nuevo para reemplazarlo, o deja el campo vacío para conservarlo.</p>`
          : '';
        return `<div class="sm:col-span-2"><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <input id="${idAttr}" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-morado/15 file:text-morado file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
          ${actual}</div>`;
      }
      const step = f.step ? `step="${f.step}"` : '';
      if (f.type === 'password') {
        const ayudaPassword = (entity === 'usuarios' && f.key === 'password')
          ? (modalCtx.esAprobacion
              ? 'Escribe una nueva contraseña para asignársela, o déjala en blanco para conservar la que el estudiante definió al registrarse. (Mínimo 6 caracteres, letra y número).'
              : ((record ? 'Déjala en blanco para conservar la contraseña actual. ' : '') + 'Mínimo 6 caracteres, con al menos una letra y un número.'))
          : '';
        return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
          <input id="${idAttr}" type="text" value="" placeholder="${modalCtx.esAprobacion ? 'Nueva contraseña (opcional)' : ''}" autocomplete="new-password" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
          ${ayudaPassword ? `<p class="text-xs text-slate2 mt-1.5">${ayudaPassword}</p>` : ''}</div>`;
      }
      return `<div><label class="block text-xs font-semibold text-slate2 mb-1.5" for="${idAttr}">${f.label}</label>
        <input id="${idAttr}" type="${f.type}" ${step} value="${escapeHtml(val)}" autocomplete="new-password" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" /></div>`;
    }).join('');

    // ---- Usuarios: si el registro YA existe y es Docente, permitir asignar
    //      materias y horas (tomadas del pensum creado a partir del calendario
    //      de cohortes que ya armó el administrador). Solo aplica al EDITAR,
    //      nunca al crear, porque primero hay que guardar al docente. ----
    if (entity === 'usuarios') {
      const materiasWrap = document.createElement('div');
      materiasWrap.id = 'materiasAsignadasContainer';
      materiasWrap.className = 'sm:col-span-2';
      form.appendChild(materiasWrap);

      const rolSelect = document.getElementById('field_rol');
      const refrescarSeccionMaterias = async () => {
        materiasWrap.innerHTML = (id && rolSelect.value === 'Docente') ? await renderMateriasAssignSection(record) : '';
      };
      rolSelect.addEventListener('change', refrescarSeccionMaterias);
      await refrescarSeccionMaterias();
    }

    // ---- Usuarios: selector múltiple de perfiles. Se filtran a los
    //      perfiles cuya categoría corresponde al rol elegido (Estudiante/
    //      Docente => su categoría; Coordinador/Administrador => categoría
    //      Administrativo) y se recalculan si el usuario cambia el rol en
    //      el propio formulario, antes de guardar. ----
    if (entity === 'usuarios') {
      const perfilesWrap = document.createElement('div');
      perfilesWrap.id = 'perfilesAsignadosContainer';
      perfilesWrap.className = 'sm:col-span-2';
      form.appendChild(perfilesWrap);

      const rolSelectParaPerfiles = document.getElementById('field_rol');
      let perfilesYaAsignados = record ? (record.perfiles || []) : [];
      const refrescarSeccionPerfiles = async () => {
        const rolActual = forcedRole || (rolSelectParaPerfiles ? rolSelectParaPerfiles.value : 'Estudiante');
        const categoriaDelRol = (rolActual === 'Docente') ? 'Docente' : (rolActual === 'Estudiante') ? 'Estudiante' : 'Administrativo';
        const disponibles = (await Store.list('perfiles')).filter(p => p.categoria === categoriaDelRol);
        let asignadosParaMarcar = [...perfilesYaAsignados];
        if (modalCtx.esAprobacion && asignadosParaMarcar.length === 0 && disponibles.length > 0) {
          const defecto = disponibles.find(p => p.nombre.toLowerCase().includes('estudiante') || p.nombre.toLowerCase().includes('estándar')) || disponibles[0];
          if (defecto) asignadosParaMarcar.push(defecto.id);
        }
        perfilesWrap.innerHTML = `
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Perfiles asignados (funcionalidades que puede usar)</label>
            ${disponibles.length ? `
              <div class="border border-morado/20 bg-morado/5 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                ${disponibles.map(p => `
                  <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <input type="checkbox" class="perfil-asignado-checkbox w-4 h-4 rounded border-morado/40 text-morado focus:ring-morado/40" value="${p.id}" ${asignadosParaMarcar.includes(p.id) ? 'checked' : ''} />
                    ${escapeHtml(p.nombre)}
                  </label>`).join('')}
              </div>
              <p class="text-xs text-slate2 mt-1.5">Puedes marcar más de uno. Si no marcas ninguno, el usuario podrá iniciar sesión pero no verá ningún panel.</p>
            ` : `<p class="text-xs text-slate2 border border-dashed border-morado/25 bg-morado/5 rounded-xl p-3">Aún no hay perfiles creados para esta categoría — ve a "Perfiles y permisos" para crear uno.</p>`}
          </div>`;
      };
      if (rolSelectParaPerfiles) rolSelectParaPerfiles.addEventListener('change', refrescarSeccionPerfiles);
      refrescarSeccionPerfiles();
    }

    if (entity === 'usuarios') {
      const notifWrap = document.createElement('div');
      notifWrap.className = 'sm:col-span-2 pt-3 border-t border-gray-100 flex items-center justify-between gap-3';
      notifWrap.innerHTML = `
        <label class="flex items-center gap-2.5 text-xs font-semibold text-ink cursor-pointer select-none">
          <input id="field_notificar_correo" type="checkbox" ${modalCtx.esAprobacion ? 'checked' : ''} class="w-4 h-4 rounded border-morado/40 text-morado focus:ring-morado/40" />
          <span>Enviar notificación por correo con credenciales de acceso y logo institucional</span>
        </label>
        <span class="text-[11px] text-slate2 font-medium">EmailJS / SMTP</span>`;
      form.appendChild(notifWrap);
    }

    const btnGuardar = document.querySelector('#adminModal button[onclick="saveModal()"]');
    if (btnGuardar) {
      btnGuardar.textContent = modalCtx.esAprobacion ? 'Aprobar y Enviar Credenciales' : 'Guardar';
    }

    //      calculados automáticamente — ver contarInscritos()/docentesDeCohorte(). ----
    if (entity === 'modulos' && id) {
      const docentesAsignados = await docentesDeCohorte(record.nombre);
      const inscritosReales = await contarInscritos(record.nombre);
      const info = document.createElement('div');
      info.className = 'sm:col-span-2 rounded-xl bg-turquesa/5 border border-turquesa/20 px-4 py-3 text-xs text-slate2 space-y-1';
      info.innerHTML = `
        <p><span class="font-semibold text-ink">Docente(s) asignado(s):</span> ${docentesAsignados.length ? escapeHtml(docentesAsignados.join(', ')) : 'Sin asignar — ve al panel "Horario" y escribe el nombre del docente en la celda correspondiente'}</p>
        <p><span class="font-semibold text-ink">Estudiantes matriculados:</span> ${inscritosReales} de ${record.cupos || 0} cupos ${inscritosReales >= (record.cupos || 0) && record.cupos ? '<span class="text-coral font-semibold">· Cupos llenos</span>' : ''}</p>`;
      form.appendChild(info);
    }

    document.getElementById('adminModal').classList.remove('hidden');
  }

  // Devuelve, para un Docente, todas las franjas del Horario donde aparece
  // asignado (en cualquier cohorte/mes), ordenadas de más reciente a más
  // antiguo y por día/hora dentro de cada mes. Solo cuenta franjas Activas.
  // async: 'horarios' vía MySQL.
  async function getSlotsDocente(nombreDocente) {
    if (!nombreDocente) return [];
    const registros = await Store.list('horarios');
    const slots = [];
    registros.forEach(h => {
      franjasActivas(h).forEach(f => {
        if (f.docente === nombreDocente) {
          slots.push({ cohorte: h.cohorte, mes: h.mes, dia: f.dia, inicio: f.inicio, fin: f.fin, horas: horasFranja(f), curso: f.curso || '(sin curso)', materia: f.curso || '(sin curso)' });
        }
      });
    });
    slots.sort((a, b) => (b.mes || '').localeCompare(a.mes || '') || (DIAS_HORARIO.indexOf(a.dia) - DIAS_HORARIO.indexOf(b.dia)) || a.inicio.localeCompare(b.inicio));
    return slots;
  }

  // Número REAL de estudiantes matriculados en una cohorte: se cuenta a
  // partir de los usuarios con rol Estudiante cuyo campo "cohorte" apunta
  // a esta cohorte. Ya NO es un número que el administrador escribe a mano
  // (evita que quede desincronizado de la matrícula real).
  // async: 'usuarios' ahora vive en MySQL. Todo punto que llame a esta
  // función debe usar await (y por tanto, ser async ella misma) — ver la
  // cadena completa de funciones convertidas más abajo por este motivo.
  async function contarInscritos(nombreCohorte, usuariosList = null) {
    if (!nombreCohorte) return 0;
    const lista = usuariosList || (await Store.list('usuarios'));
    return lista.filter(u => u.rol === 'Estudiante' && u.cohorte === nombreCohorte).length;
  }

  // Docente(s) que aparecen asignados a una cohorte, calculado a partir del
  // Horario (única fuente de verdad). Puede haber más de uno si distintas
  // franjas de la misma cohorte las dicta gente distinta. Solo cuenta
  // franjas Activas.
  // async: 'horarios' vía MySQL.
  async function docentesDeCohorte(nombreCohorte, horariosList = null) {
    const nombres = new Set();
    const lista = horariosList || (await Store.list('horarios'));
    lista.filter(h => h.cohorte === nombreCohorte).forEach(h => {
      franjasActivas(h).forEach(f => { if (f.docente) nombres.add(f.docente); });
    });
    return [...nombres];
  }

  // Construye la sección "Materias y horas asignadas" para un Docente.
  // Es de SOLO LECTURA a propósito: la única forma de asignarle (o quitarle)
  // una materia y sus horas es entrando al panel "Horario" y escribiendo su
  // nombre en la celda correspondiente. Así nunca queda una materia asignada
  // que no exista en el horario real.
  // async: getSlotsDocente() ahora es async.
  async function renderMateriasAssignSection(userRecord) {
    const nombreDocente = userRecord ? userRecord.nombre : null;
    const slots = await getSlotsDocente(nombreDocente);
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);

    const filasHtml = slots.length ? slots.map(s => `
      <tr class="border-b border-gray-50 last:border-0">
        <td class="py-2 px-3 text-xs text-ink font-semibold">${escapeHtml(s.materia)}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(s.cohorte)}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(mesLabel(s.mes))}</td>
        <td class="py-2 px-3 text-xs text-slate2">${escapeHtml(s.dia)}</td>
        <td class="py-2 px-3 text-xs text-slate2 whitespace-nowrap">${s.inicio}–${s.fin}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="text-xs text-slate2 text-center py-4">Este docente aún no aparece en ninguna franja del Horario.</td></tr>`;

    return `<div class="pt-4 mt-2 border-t border-gray-100">
      <p class="text-sm font-bold text-ink mb-1">Materias y horas asignadas</p>
      <p class="text-xs text-slate2 mb-3">Solo lectura: se calcula a partir del panel <span class="font-semibold text-ink">Horario</span>. Para asignar o quitar una materia a este docente, ve a Horario y escribe (o borra) su nombre en la celda correspondiente — no es posible asignarle una materia que no exista en el horario.</p>
      <div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="w-full">
          <thead><tr class="text-left text-[10px] font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
            <th class="py-2 px-3">Materia</th><th class="py-2 px-3">Cohorte</th><th class="py-2 px-3">Mes</th><th class="py-2 px-3">Día</th><th class="py-2 px-3">Horario</th>
          </tr></thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </div>
      ${slots.length ? `<p class="text-xs text-slate2 mt-2">Total: <span class="font-bold text-ink">${totalHoras} h</span> por semana en ${slots.length} franja${slots.length === 1 ? '' : 's'}.</p>` : ''}
    </div>`;
  }

  function closeModal() {
    document.getElementById('adminModal').classList.add('hidden');
    const btnGuardar = document.querySelector('#adminModal button[onclick="saveModal()"]');
    if (btnGuardar) btnGuardar.textContent = 'Guardar';
    modalCtx = { entity: null, id: null };
  }

  // Convierte un File (input type="file") a data URL, para poder guardarlo
  // en localStorage sin backend de archivos.
  function leerArchivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function saveModal() {
    const { entity, id } = modalCtx;
    const schema = SCHEMAS[entity];
    if (!schema) return;

    const data = {};
    for (const f of schema.fields) {
      const el = document.getElementById('field_' + f.key);

      if (f.type === 'file') {
        const nuevoArchivo = el.files && el.files[0];
        if (nuevoArchivo) {
          if (nuevoArchivo.size > 8 * 1024 * 1024) {
            toast('El archivo no puede superar 8 MB', 'err');
            return;
          }
          try {
            data.archivoNombre = nuevoArchivo.name;
            data.archivoTipo = nuevoArchivo.type || 'application/octet-stream';
            data.archivoDatos = await leerArchivoComoDataURL(nuevoArchivo);
          } catch (e) {
            toast('No se pudo leer el archivo', 'err');
            return;
          }
        } else if (id) {
          // Edición sin subir un archivo nuevo: conserva el que ya existía.
          // await: Store.list puede hablar con MySQL (devuelve Promise).
          const previo = (await Store.list(entity)).find(r => r.id === id) || {};
          if (previo.archivoNombre) {
            data.archivoNombre = previo.archivoNombre;
            data.archivoTipo = previo.archivoTipo;
            data.archivoDatos = previo.archivoDatos;
          }
        }
        // Campo de archivo obligatorio (ej. memorandos, donde el documento
        // ES el contenido): sin archivo nuevo y sin uno previo que
        // conservar, no se puede guardar.
        if (f.required && !data.archivoDatos) {
          el.classList.add('ring-2', 'ring-coral');
          toast('Adjunta el archivo de "' + f.label + '"', 'err');
          return;
        }
        continue;
      }

      if (f.key === 'password' && entity === 'usuarios') {
        const v = el.value;
        if (v === '') {
          if (!id) {
            el.classList.add('ring-2', 'ring-coral');
            el.focus();
            toast('Completa el campo "' + f.label + '"', 'err');
            return;
          }
          // Editando y se dejó en blanco: conserva la contraseña que ya tenía.
          // await: Store.list('usuarios') habla con MySQL y devuelve una
          // Promise — sin el await, .find() se llamaba sobre la promesa y
          // reventaba con "Store.list(...).find is not a function",
          // interrumpiendo el guardado completo.
          const previo = (await Store.list(entity)).find(r => r.id === id) || {};
          data.password = previo.password || '';
          data.passwordPlano = previo.passwordPlano || '';
          data._passwordModificada = false;
        } else {
          if (!validarFortalezaPassword(v)) {
            el.classList.add('ring-2', 'ring-coral');
            el.focus();
            toast('La contraseña debe tener mínimo 6 caracteres, con al menos una letra y un número', 'err');
            return;
          }
          data.password = v;
          data.passwordPlano = v;
          data._passwordModificada = true;
        }
        continue;
      }

      let v = el.value;
      if (f.type === 'number') v = v === '' ? 0 : parseFloat(v);
      if (f.required && (v === '' || v === null || v === undefined)) {
        // El buscador de destinatario guarda su valor real en un input
        // oculto (id="field_destinatario"): el resaltado de error visual
        // se aplica al input visible que sí ve el usuario.
        const elVisible = (f.type === 'buscar_destinatario') ? document.getElementById('destinatarioBuscar') : el;
        elVisible.classList.add('ring-2', 'ring-coral');
        elVisible.focus();
        toast('Completa el campo "' + f.label + '"', 'err');
        return;
      }
      data[f.key] = v;
    }

    // ---- Usuarios: el correo es único (es el usuario de login) ----
    if (entity === 'usuarios' && data.email) {
      const emailDuplicado = (await Store.list('usuarios')).some(u => u.id !== id && u.email.toLowerCase() === data.email.toLowerCase());
      if (emailDuplicado) {
        toast('Ya existe otro usuario con el correo "' + data.email + '"', 'err');
        return;
      }
    }

    // ---- Usuarios: no permitir matricular un estudiante en una cohorte sin cupos ----
    // Se cuentan los inscritos reales (contarInscritos) contra el total de cupos de
    // la cohorte. Si el estudiante ya pertenecía a esa misma cohorte, no se bloquea
    // (no está ocupando un cupo nuevo, solo se está editando su registro).
    if (entity === 'usuarios' && data.rol === 'Estudiante' && data.cohorte) {
      const cohorteObj = (await Store.list('modulos')).find(m => m.nombre === data.cohorte);
      if (cohorteObj) {
        const registroPrevio = id ? (await Store.list('usuarios')).find(r => r.id === id) : null;
        const yaEstabaEnEstaCohorte = registroPrevio && registroPrevio.cohorte === data.cohorte;
        const inscritosActuales = await contarInscritos(data.cohorte);
        if (!yaEstabaEnEstaCohorte && cohorteObj.cupos && inscritosActuales >= cohorteObj.cupos) {
          toast('La cohorte "' + data.cohorte + '" ya no tiene cupos disponibles (' + inscritosActuales + '/' + cohorteObj.cupos + ')', 'err');
          return;
        }
      }
    }

    // ---- Usuarios: mantener el Horario consistente con el nombre/rol del Docente ----
    // El Horario es la ÚNICA fuente para asignar materias a un docente (ver
    // renderMateriasAssignSection), así que aquí solo se hace mantenimiento:
    // si le cambian el nombre, se renombra en sus celdas; si deja de ser
    // Docente, se liberan las celdas donde aparecía.
    let horariosChanged = false;
    if (entity === 'usuarios' && id) {
      const previousRecord = (await Store.list('usuarios')).find(r => r.id === id);
      const previousNombre = previousRecord ? previousRecord.nombre : null;
      const dejaDeSerDocente = previousRecord && previousRecord.rol === 'Docente' && data.rol !== 'Docente';
      const cambioNombre = previousRecord && previousNombre && previousNombre !== data.nombre;

      if (previousRecord && previousRecord.rol === 'Docente' && (dejaDeSerDocente || cambioNombre)) {
        const registrosHorario = await Store.list('horarios');
        registrosHorario.forEach(h => {
          (h.franjas || []).forEach(f => {
            if (f.docente === previousNombre) {
              f.docente = dejaDeSerDocente ? '' : data.nombre;
              horariosChanged = true;
            }
          });
        });
        if (horariosChanged) await Store.save('horarios', registrosHorario);
      }

      // ---- Si deja de ser Estudiante (pasa a Docente, Administrador, etc.):
      //      se marca fueEstudiante=true y se conserva su última cohorte en
      //      cohorteAnterior, ANTES de que data.cohorte la pise. Así el
      //      Historial Trainee lo sigue encontrando y muestra que fue
      //      estudiante, con todo lo que ya tenía (memorandos, asistencia,
      //      PQR, notas, archivos) intacto — esos datos ya estaban
      //      guardados por su nombre/id y no se tocan. ----
      const dejaDeSerEstudiante = previousRecord && previousRecord.rol === 'Estudiante' && data.rol !== 'Estudiante';
      if (dejaDeSerEstudiante) {
        data.fueEstudiante = true;
        data.cohorteAnterior = previousRecord.cohorte || '';
      }
    }

    // ---- Usuarios: perfiles seleccionados (checkboxes fuera de schema.fields) ----
    if (entity === 'usuarios') {
      data.perfiles = Array.from(document.querySelectorAll('.perfil-asignado-checkbox:checked')).map(chk => chk.value);
    }

    const esAprobacion = !!modalCtx.esAprobacion;
    const passwordFueModificada = !!data._passwordModificada;
    delete data._passwordModificada;

    if (entity === 'usuarios' && esAprobacion) {
      delete data.estadoRegistro;
      data.estadoRegistro = null;
    }

    const records = await Store.list(entity);
    const esEdicion = !!id;
    if (id) {
      const idx = records.findIndex(r => r.id === id);
      if (idx > -1) {
        records[idx] = { ...records[idx], ...data };
        if (esAprobacion) {
          records[idx].estadoRegistro = null;
          delete records[idx].estadoRegistro;
        }
      }
    } else {
      data.id = uid(entity.slice(0, 2));
      records.unshift(data);
    }
    // El aviso se da DESPUÉS de guardar y según el resultado real: antes
    // se mostraba "creado/actualizado correctamente" antes siquiera de
    // intentar el guardado, así que un fallo del servidor quedaba oculto
    // y parecía que sí se había guardado.
    const resultado = await Store.save(entity, records);
    if (resultado && resultado.remoto === false) {
      toast('No se pudo guardar en el servidor — el cambio solo quedó en este navegador. Revisa la conexión con la base de datos.', 'err');
    } else {
      toast(esAprobacion ? 'Estudiante aprobado exitosamente' : (schema.label + (esEdicion ? ' actualizado correctamente' : ' creado correctamente')), 'ok');
    }

    // Leemos el checkbox de notificación ANTES de cerrar el modal
    const chkNotificar = document.getElementById('field_notificar_correo');
    const debeNotificar = chkNotificar ? chkNotificar.checked : esAprobacion;
    const passwordParaNotificar = data.passwordPlano || (passwordFueModificada ? data.password : '');

    // Cerramos el modal y re-renderizamos inmediatamente para que la interfaz responda al instante
    closeModal();
    if (panelActivoAdmin && RENDERERS[panelActivoAdmin]) await RENDERERS[panelActivoAdmin]();
    if (RENDERERS[entity] && panelActivoAdmin !== entity) await RENDERERS[entity]();
    if (horariosChanged && panelActivoAdmin !== 'modulos' && RENDERERS['modulos']) await RENDERERS['modulos']();
    if (panelActivoAdmin === 'resumen') await renderAdminBannerStats();
    if (entity === 'usuarios') renderConstellation();
    if (esAprobacion) {
      if (RENDERERS['usuarios']) await RENDERERS['usuarios']();
      await renderAdminBannerStats();
      renderConstellation();
    }

    // Notificación por correo con credenciales y logo institucional en segundo plano
    if (entity === 'usuarios' && (esAprobacion || debeNotificar)) {
      toast(esAprobacion ? 'Enviando correo con credenciales...' : 'Enviando credenciales por correo...', 'ok');
      notificarEstadoRegistroPorCorreo(data.email, data.nombre, 'aprobado', {
        password: passwordParaNotificar,
        passwordModificada: passwordFueModificada,
        cohorte: data.cohorte || '',
      }).catch(err => {
        console.warn('Error al notificar por correo:', err);
      });
    }

    // Memorando ENVIADO (no Borrador) con archivo dirigido a UN estudiante
    // puntual (por su correo exacto, no a "Todos"/"Todos los
    // estudiantes"/una cohorte completa): se archiva también una copia en
    // su Historial Trainee. Un Borrador no genera copia todavía — recién
    // cuando se edita y pasa a "Enviado" debe aparecer.
    if (entity === 'memorandos' && data.estado === 'Enviado' && data.archivoDatos && data.destinatario) {
      const destinatarioEsEstudiante = (await Store.list('usuarios')).some(u =>
        u.rol === 'Estudiante' && (u.email || '').toLowerCase() === String(data.destinatario).toLowerCase());
      if (destinatarioEsEstudiante) {
        copiarArchivoATraineeDeEstudiante(data.destinatario, {
          nombre: data.archivoNombre, tipo: data.archivoTipo, datos: data.archivoDatos,
          origen: `Memorando: ${data.titulo || ''}`,
        });
      }
    }
  }

  // async: 'usuarios' habla con MySQL ahora.
  async function askDelete(entity, id) {
    if (entity === 'usuarios') {
      const record = (await Store.list('usuarios')).find(r => r.id === id);
      if (record && (record.rol === 'Coordinador' || record.rol === 'Administrador') && currentAdminRole !== 'superadmin') {
        toast('Solo el Superadmin puede eliminar una cuenta de Administrador', 'err');
        return;
      }
    }
    if (entity === 'perfiles') {
      const perfil = (await Store.list('perfiles')).find(r => r.id === id);
      if (perfil && perfil.esSistema) {
        toast('Este es un perfil de sistema y no se puede eliminar', 'err');
        return;
      }
      const enUso = (await Store.list('usuarios')).filter(u => (u.perfiles || []).includes(id)).length;
      if (enUso > 0) {
        toast(`No se puede eliminar: ${enUso} usuario${enUso === 1 ? '' : 's'} tiene${enUso === 1 ? '' : 'n'} este perfil asignado`, 'err');
        return;
      }
    }
    deleteCtx = { entity, id };
    document.getElementById('confirmModal').classList.remove('hidden');
  }
  function closeConfirm() {
    document.getElementById('confirmModal').classList.add('hidden');
    deleteCtx = { entity: null, id: null };
  }
  // async: 'usuarios' habla con MySQL ahora (aplica cuando entity==='usuarios').
  async function confirmDelete() {
    const { entity, id } = deleteCtx;
    if (!entity || !id) return closeConfirm();
    const records = (await Store.list(entity)).filter(r => r.id !== id);
    await Store.save(entity, records);
    closeConfirm();
    if (panelActivoAdmin && RENDERERS[panelActivoAdmin]) await RENDERERS[panelActivoAdmin]();
    if (RENDERERS[entity] && panelActivoAdmin !== entity) await RENDERERS[entity]();
    if (panelActivoAdmin === 'resumen') await renderAdminBannerStats();
    if (entity === 'usuarios') renderConstellation();
    toast('Registro eliminado', 'ok');
  }

  // Nota histórica: módulo "Cohortes + Administrador exclusivo" retirado;
  // la administración se centraliza en el rol Coordinador gestionado desde panel Administradores.

  // Exportar CSV
  // async porque algunas entidades (pqr, auditoria_*, y las que se vayan
  // migrando) ya viven en MySQL vía Store — Store.list() para esas
  // devuelve una Promise, no un array directo.
  async function exportCSV(entity, excludeKeys) {
    excludeKeys = excludeKeys || [];
    const records = await Store.list(entity);
    if (!records.length) { toast('No hay datos para exportar', 'err'); return; }
    const keys = Object.keys(records[0]).filter(k => k !== 'id' && !excludeKeys.includes(k));
    const rows = [keys.join(',')].concat(
      records.map(r => keys.map(k => '"' + String(r[k] ?? '').replace(/"/g, '""') + '"').join(','))
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = entity + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Archivo CSV exportado', 'ok');
  }

  // (Se quitó exportarKnowledgeJsonParaChat: ahora que chat_voz_conocimiento
  // vive en MySQL, ver-el-backend/db.py lee esa tabla directamente en cada
  // pregunta — ya no hace falta exportar/subir un knowledge.json a mano.)

  /**
   * Gestor universal de tablas y grandes volúmenes de datos (TableManager).
   * Paginación dinámica, búsqueda en tiempo real con contador,
   * ordenamiento por columnas, sticky headers y estado vacío inteligente.
   */

  const TableManager = {
    states: {}, // { [tableId]: { page: 1, pageSize: 15, search: '', sortCol: -1, sortAsc: true } }

    getState(tableId) {
      if (!this.states[tableId]) {
        this.states[tableId] = {
          page: 1,
          pageSize: 15,
          search: '',
          sortCol: -1,
          sortAsc: true
        };
      }
      return this.states[tableId];
    },

    init(tableId, options = {}) {
      const table = typeof tableId === 'string' ? document.getElementById(tableId) : tableId;
      if (!table || table.dataset.noPaginate === 'true' || table.classList.contains('campos')) return;
      const id = table.id || ('tbl_' + Math.random().toString(36).slice(2, 7));
      if (!table.id) table.id = id;

      const state = this.getState(id);
      if (options.pageSize !== undefined) state.pageSize = options.pageSize;

      // Asignar contenedor con scroll ergonómico
      const wrapper = table.closest('.overflow-x-auto') || table.parentElement;
      if (wrapper && !wrapper.classList.contains('table-responsive-container')) {
        wrapper.classList.add('table-responsive-container');
      }

      // Hacer los <th> ordenables si aún no lo están
      const ths = table.querySelectorAll('thead th');
      ths.forEach((th, idx) => {
        if (idx === ths.length - 1 && (!th.textContent.trim() || th.textContent.includes('Acci'))) return;
        if (!th.dataset.sortInitialized) {
          th.dataset.sortInitialized = 'true';
          th.classList.add('th-sortable');
          th.title = 'Clic para ordenar por esta columna';
          th.addEventListener('click', () => this.toggleSort(id, idx));
        }
      });

      this.update(id);
    },

    toggleSort(tableId, colIndex) {
      const state = this.getState(tableId);
      if (state.sortCol === colIndex) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortCol = colIndex;
        state.sortAsc = true;
      }
      this.update(tableId);
    },

    setPage(tableId, page) {
      const state = this.getState(tableId);
      state.page = page;
      this.update(tableId);
    },

    setPageSize(tableId, size) {
      const state = this.getState(tableId);
      state.pageSize = size === 'all' ? 999999 : parseInt(size, 10);
      state.page = 1;
      this.update(tableId);
    },

    filter(tableId, term) {
      const state = this.getState(tableId);
      state.search = (term || '').trim().toLowerCase();
      state.page = 1;
      this.update(tableId);
    },

    clearFilter(tableId) {
      const state = this.getState(tableId);
      state.search = '';
      state.page = 1;
      const entity = tableId.replace(/^table-/, '');
      const inputs = document.querySelectorAll(`input[oninput*="${entity}"], input[data-table="${tableId}"]`);
      inputs.forEach(inp => { inp.value = ''; });
      this.update(tableId);
    },

    update(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return;
      const state = this.getState(tableId);
      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      // Actualizar indicadores visuales de ordenación en <th>
      const ths = table.querySelectorAll('thead th');
      ths.forEach((th, idx) => {
        let icon = th.querySelector('.th-sort-icon');
        if (state.sortCol === idx) {
          if (!icon) {
            icon = document.createElement('span');
            icon.className = 'th-sort-icon';
            th.appendChild(icon);
          }
          icon.textContent = state.sortAsc ? '▲' : '▼';
        } else if (icon) {
          icon.remove();
        }
      });

      // Obtener filas válidas
      const allRows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.classList.contains('empty-filter-row') && !tr.classList.contains('admin-empty-state-row'));
      if (!allRows.length) {
        this.renderPaginationBar(tableId, 0, 0, 0);
        return;
      }

      // 1. Filtrar filas
      let filteredRows = allRows;
      if (state.search) {
        filteredRows = allRows.filter(tr => {
          const searchData = tr.dataset.search || tr.textContent.toLowerCase();
          return searchData.toLowerCase().includes(state.search);
        });
      }

      // 2. Ordenar filas
      if (state.sortCol >= 0) {
        filteredRows.sort((a, b) => {
          const cellA = a.children[state.sortCol]?.textContent.trim() || '';
          const cellB = b.children[state.sortCol]?.textContent.trim() || '';
          const numA = parseFloat(cellA.replace(/[^\d.-]/g, ''));
          const numB = parseFloat(cellB.replace(/[^\d.-]/g, ''));
          let cmp = 0;
          if (!isNaN(numA) && !isNaN(numB) && !cellA.includes('@') && !cellA.includes('/') && !cellA.includes('-')) {
            cmp = numA - numB;
          } else {
            cmp = cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: 'base' });
          }
          return state.sortAsc ? cmp : -cmp;
        });
      }

      // 3. Paginación
      const totalFiltered = filteredRows.length;
      const pageSize = state.pageSize;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;

      const startIndex = (state.page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalFiltered);

      // Ocultar todas las filas
      allRows.forEach(tr => { tr.style.display = 'none'; });

      // Estado vacío en caso de que la búsqueda no arroje resultados
      let emptyFilterRow = tbody.querySelector('.empty-filter-row');
      if (totalFiltered === 0 && state.search) {
        if (!emptyFilterRow) {
          emptyFilterRow = document.createElement('tr');
          emptyFilterRow.className = 'empty-filter-row';
          tbody.appendChild(emptyFilterRow);
        }
        emptyFilterRow.innerHTML = `
          <td colspan="${ths.length || 1}" class="py-10 text-center text-slate2 bg-slate-50/40">
            <div class="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
              <svg class="w-8 h-8 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p class="text-sm font-semibold text-ink">Sin coincidencias</p>
              <p class="text-xs text-slate2">No se encontraron registros para "<strong class="text-ink">${escapeHtml(state.search)}</strong>"</p>
              <button type="button" onclick="TableManager.clearFilter('${tableId}')" class="mt-2 text-xs font-bold text-morado bg-morado/10 hover:bg-morado/20 rounded-xl px-3 py-1.5 transition">
                Limpiar búsqueda
              </button>
            </div>
          </td>`;
        emptyFilterRow.style.display = '';
      } else if (emptyFilterRow) {
        emptyFilterRow.remove();
      }

      // Re-ordenar y mostrar solo las filas de la página actual
      filteredRows.forEach((tr, idx) => {
        if (idx >= startIndex && idx < endIndex) {
          tr.style.display = '';
          tbody.appendChild(tr);
        }
      });

      // 4. Renderizar barra de paginación
      this.renderPaginationBar(tableId, totalFiltered, allRows.length, totalPages);
    },

    renderPaginationBar(tableId, filteredCount, totalCount, totalPages) {
      const table = document.getElementById(tableId);
      if (!table) return;
      const state = this.getState(tableId);

      let bar = document.getElementById('pagination-' + tableId);
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pagination-' + tableId;
        bar.className = 'table-pagination-bar';
        const container = table.closest('.table-responsive-container') || table.closest('.overflow-x-auto') || table;
        container.insertAdjacentElement('afterend', bar);
      }

      if (totalCount <= 5 && !state.search) {
        bar.innerHTML = `<div class="table-pagination-info"><span class="text-xs text-slate2 font-medium">Total: <strong class="text-ink font-semibold">${totalCount}</strong> registro${totalCount === 1 ? '' : 's'}</span></div>`;
        return;
      }

      const startIndex = filteredCount === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
      const endIndex = Math.min(state.page * state.pageSize, filteredCount);

      let infoText = '';
      if (state.search) {
        infoText = `Mostrando <strong class="text-ink">${filteredCount}</strong> de ${totalCount} (filtrado)`;
      } else {
        infoText = `Mostrando <strong class="text-ink">${startIndex}–${endIndex}</strong> de ${totalCount} registros`;
      }

      let pagesHtml = '';
      if (totalPages > 1) {
        pagesHtml += `
          <button type="button" class="table-page-btn" ${state.page === 1 ? 'disabled' : ''} onclick="TableManager.setPage('${tableId}', ${state.page - 1})" title="Página anterior">
            ‹ Anterior
          </button>`;

        for (let p = 1; p <= totalPages; p++) {
          if (p === 1 || p === totalPages || (p >= state.page - 1 && p <= state.page + 1)) {
            pagesHtml += `
              <button type="button" class="table-page-btn ${p === state.page ? 'active' : ''}" onclick="TableManager.setPage('${tableId}', ${p})">
                ${p}
              </button>`;
          } else if (p === state.page - 2 || p === state.page + 2) {
            pagesHtml += `<span class="px-1 text-slate2 text-xs">…</span>`;
          }
        }

        pagesHtml += `
          <button type="button" class="table-page-btn" ${state.page === totalPages ? 'disabled' : ''} onclick="TableManager.setPage('${tableId}', ${state.page + 1})" title="Página siguiente">
            Siguiente ›
          </button>`;
      }

      bar.innerHTML = `
        <div class="table-pagination-info">
          <span>${infoText}</span>
          <div class="flex items-center gap-1.5 text-xs text-slate2">
            <span>Mostrar:</span>
            <select class="table-page-size-select" onchange="TableManager.setPageSize('${tableId}', this.value)">
              <option value="10" ${state.pageSize === 10 ? 'selected' : ''}>10</option>
              <option value="15" ${state.pageSize === 15 ? 'selected' : ''}>15</option>
              <option value="25" ${state.pageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50</option>
              <option value="all" ${state.pageSize > 1000 ? 'selected' : ''}>Todos</option>
            </select>
          </div>
        </div>
        <div class="table-pagination-nav">
          ${pagesHtml}
        </div>`;
    }
  };
  window.TableManager = TableManager;

  // ---------- Inicializador de tablas en un contenedor ----------
  function initTablesEnPanel(containerId) {
    setTimeout(() => {
      const root = containerId ? (document.getElementById(containerId) || document) : document;
      root.querySelectorAll('table.admin-table, table[id^="table-"], .admin-panel-card table').forEach(tbl => {
        if (!tbl.dataset.noPaginate && !tbl.classList.contains('campos')) {
          TableManager.init(tbl);
        }
      });
    }, 60);
  }
  window.initTablesEnPanel = initTablesEnPanel;

  // ---------- Búsqueda de tablas (enlazada con TableManager) ----------
  function filterTable(entity, term) {
    const tableId = 'table-' + entity;
    const tbl = document.getElementById(tableId);
    if (tbl) {
      TableManager.filter(tableId, term);
    } else {
      term = (term || '').toLowerCase();
      document.querySelectorAll('#table-' + entity + ' tbody tr, [data-entity="' + entity + '"] tbody tr').forEach(tr => {
        const text = tr.dataset.search || tr.textContent.toLowerCase();
        tr.style.display = text.includes(term) ? '' : 'none';
      });
    }
  }

  // ---------- Recarga en vivo bajo demanda (al clic) ----------
  async function recargarPanelActual() {
    if (typeof Store.clearCache === 'function') Store.clearCache();
    if (currentAdminRole || currentAdminUser) {
      if (panelActivoAdmin && RENDERERS[panelActivoAdmin]) {
        await RENDERERS[panelActivoAdmin]();
        initTablesEnPanel('panel-' + panelActivoAdmin);
      }
      if (panelActivoAdmin === 'resumen') await renderAdminBannerStats();
      actualizarBadgePqrAdmin();
    } else if (currentDocente) {
      if (panelActivoDocente && RENDERERS_DOCENTE[panelActivoDocente]) {
        await RENDERERS_DOCENTE[panelActivoDocente]();
        initTablesEnPanel('panel-t-' + panelActivoDocente);
      }
    } else if (currentEstudiante) {
      if (panelActivoEstudiante && RENDERERS_ESTUDIANTE[panelActivoEstudiante]) {
        await RENDERERS_ESTUDIANTE[panelActivoEstudiante]();
        initTablesEnPanel('panel-s-' + panelActivoEstudiante);
      }
    }
    toast('Datos actualizados en vivo', 'ok');
  }
  window.recargarPanelActual = recargarPanelActual;

  // ---------- Helper: encabezado de sección con botón "Nuevo" + buscador ----------
  function sectionHeader(entity, title, subtitle, extraBtn, showNewButton, csvExcludeKeys) {
    if (showNewButton === undefined) showNewButton = true;
    const excludeArg = csvExcludeKeys && csvExcludeKeys.length ? ', ' + JSON.stringify(csvExcludeKeys) : '';
    const tableId = 'table-' + entity;
    // Auto-programar inicialización de la tabla
    setTimeout(() => {
      const tbl = document.getElementById(tableId);
      if (tbl) TableManager.init(tbl);
    }, 80);

    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
        <div>
          <h2 class="text-lg font-extrabold text-ink tracking-tight">${title}</h2>
          <p class="text-xs text-slate2 mt-0.5">${subtitle}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div class="relative">
            <input data-table="${tableId}" oninput="filterTable('${entity}', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-xs sm:text-sm w-40 sm:w-56 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado text-ink transition" />
            <svg class="w-4 h-4 text-slate2 absolute left-3 top-2.5 sm:top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button onclick="recargarPanelActual()" title="Actualizar datos en vivo" class="rounded-xl border border-gray-200 text-slate2 hover:text-morado hover:bg-morado/5 text-xs sm:text-sm font-semibold px-3 py-2 transition flex items-center gap-1.5 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span class="hidden md:inline">Actualizar</span>
          </button>
          <button onclick="exportCSV('${entity}'${excludeArg})" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3.5 py-2 transition shadow-sm">CSV</button>
          ${extraBtn || ''}
          ${showNewButton ? `<button onclick="openModal('${entity}')" class="btn-glow-primary rounded-xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white text-xs sm:text-sm font-bold px-4 py-2 hover:opacity-95 transition flex items-center gap-1.5 shadow-md shadow-morado/20 hover:scale-[1.02] active:scale-[0.98]">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Nuevo
          </button>` : ''}
        </div>
      </div>`;
  }

  function emptyRow(colspan, entity) {
    return `<tr><td colspan="${colspan}">
      <div class="admin-empty-state">
        <svg class="w-8 h-8 text-slate2/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-6-4h6m2 11H7a2 2 0 01-2-2V4a2 2 0 012-2h7l5 5v12a2 2 0 01-2 2z"/></svg>
        <p class="text-sm">Aún no hay registros. Haz clic en <span class="text-ink font-semibold">"Nuevo"</span> para crear el primero.</p>
      </div>
    </td></tr>`;
  }

  function statusPill(value, map) {
    const c = (map && map[value]) || { bg: '#5B647214', text: '#5B6472' };
    return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${c.bg};color:${c.text}">${escapeHtml(value)}</span>`;
  }

  const ESTADO_COLORS = {
    'Activo': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Inactivo': { bg: '#5B647214', text: '#5B6472' },
    'En curso': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Planeada': { bg: '#F5A6231A', text: '#b5790f' }, 'Finalizada': { bg: '#5B647214', text: '#5B6472' },
    'Enviado': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Borrador': { bg: '#5B647214', text: '#5B6472' },
    'Abierto': { bg: '#F0455C1A', text: '#F0455C' }, 'En proceso': { bg: '#F5A6231A', text: '#b5790f' }, 'Cerrado': { bg: '#1FC8C01A', text: '#0f8f89' },
    'Pendiente': { bg: '#F5A6231A', text: '#b5790f' },
    'Programada': { bg: '#8B5CF61A', text: '#8B5CF6' }, 'Realizada': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Cancelada': { bg: '#F0455C1A', text: '#F0455C' },
    'Abierta': { bg: '#8B5CF61A', text: '#8B5CF6' },
    'Publicada': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Oculta': { bg: '#5B647214', text: '#5B6472' },
  };

  // ---------- Superadmin — vista Resumen (diseño corporativo) ----------
  const SUPERADMIN_CARD_ICONS = {
    usuarios: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg>',
    cohortes: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25v13.5M4.75 8.5L12 6.25l7.25 2.25v9L12 19.75l-7.25-2.25v-9z"/></svg>',
    calificaciones: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H6a1 1 0 01-1-1V6a2 2 0 012-2h10a2 2 0 012 2v10a1 1 0 01-1 1h-2"/></svg>',
    configuracion: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    riesgo: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z"/></svg>',
  };

  // Sistema visual de dashboards: compartido por Resumen (Superadmin, Docente, Estudiante).

  // Anillo de progreso SVG hecho a mano (sin librerías): recibe 0-100 y
  // devuelve un <svg> circular con el trazo proporcional al valor. track
  // es el color de fondo del anillo (siempre tenue); color es el trazo.
  function anilloProgreso(pct, color, size, grosor) {
    const s = size || 88;
    const stroke = grosor || 8;
    const r = (s - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const offset = c * (1 - clamped / 100);
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" class="-rotate-90">
        <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="${color}1F" stroke-width="${stroke}" />
        <circle cx="${s/2}" cy="${s/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" style="transition:stroke-dashoffset .6s ease" />
      </svg>`;
  }

  // Tarjeta de estadística con degradado de marca sutil e icono — el
  // reemplazo con más carácter de la tarjeta plana genérica. clickPanel es
  // opcional: si se da, la tarjeta completa navega a ese panel.
  function statCardBrand(opts) {
    const clickAttr = opts.clickPanel ? `onclick="showPanel${opts.showPanelFn || ''}('${opts.clickPanel}')" role="button" tabindex="0"` : '';
    return `
      <div ${clickAttr} class="dash-stat-card group ${opts.clickPanel ? 'cursor-pointer' : ''}" style="--brand:${opts.color}">
        <div class="flex items-start justify-between mb-4">
          <div class="dash-stat-icon" style="background:${opts.color}14;color:${opts.color}">${opts.icon || ''}</div>
          ${opts.trend !== undefined ? `<span class="text-[11px] font-bold ${opts.trend >= 0 ? 'text-turquesa' : 'text-coral'} flex items-center gap-0.5">${opts.trend >= 0 ? '↑' : '↓'} ${Math.abs(opts.trend)}%</span>` : ''}
        </div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">${escapeHtml(opts.label)}</p>
        <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${escapeHtml(String(opts.value))}</p>
        <p class="text-xs text-slate2 mt-2">${escapeHtml(opts.sub || '')}</p>
      </div>`;
  }

  // NOTA: existía aquí una variante anterior de esta tarjeta
  // (renderSuperadminSummaryCard, clickeable con onclick="showPanel(...)")
  // que quedó sin usar en ningún lado tras el rediseño a la versión de
  // solo lectura de abajo. Se retiró por ser código muerto.

  // Tarjeta de resumen de SOLO LECTURA: overline arriba a la izquierda,
  // valor grande debajo, icono circular a la derecha. Sin onclick, sin
  // cursor pointer y sin hover de navegación — a propósito no llevan a
  // ningún panel, para que el dashboard sea puramente informativo.
  function renderSuperadminSummaryCardReadonly(opts) {
    return `
      <article class="superadmin-card superadmin-card-readonly">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="superadmin-card-title">${escapeHtml(opts.title)}</p>
            <p class="superadmin-card-value">${escapeHtml(String(opts.value))}</p>
          </div>
          <div class="superadmin-card-icon shrink-0" style="background:${opts.color}1A;color:${opts.color}">${SUPERADMIN_CARD_ICONS[opts.icon] || ''}</div>
        </div>
      </article>`;
  }

  // Serie mensual real del promedio general: agrega TODAS las notas de
  // TODAS las cohortes/docentes agrupadas por el campo "mes" que ya trae
  // cada registro en notas_modulos. No se inventa ningún dato: si un mes
  // no tiene notas cargadas, simplemente no aparece en la serie.
  async function tendenciaPromedioGeneralMensual() {
    const registros = await Store.list('notas_modulos');
    const usuarios = (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && u.cohorte);
    const porMes = {};
    MESES_ES.forEach(m => { porMes[m] = []; });

    registros.forEach(rec => {
      if (!rec.mes || !porMes.hasOwnProperty(rec.mes)) return;
      const estudiantesCohorte = usuarios.filter(u => u.cohorte === rec.cohorte);
      estudiantesCohorte.forEach(u => {
        const resultado = calcularNotaFinal(rec, u.nombre);
        if (resultado && !resultado.pendiente) porMes[rec.mes].push(resultado.valor);
      });
    });

    return MESES_ES
      .map(m => ({
        mes: m,
        promedio: porMes[m].length ? porMes[m].reduce((a, b) => a + b, 0) / porMes[m].length : null,
      }))
      .filter(p => p.promedio !== null);
  }

  // Mini gráfico de línea/área SVG (sin librerías), en el mismo espíritu
  // que anilloProgreso: recibe una serie de puntos {label, value} y un
  // color, y devuelve un <svg> con área + línea + eje de etiquetas.
  function miniLineaTendencia(puntos, color, w, h) {
    const width = w || 520;
    const height = h || 160;
    const padX = 8;
    const padTop = 14;
    const padBottom = 26;
    if (!puntos.length) {
      return `<div class="grid place-items-center text-xs text-slate2" style="height:${height}px">Aún no hay datos suficientes para mostrar una tendencia.</div>`;
    }
    const valores = puntos.map(p => p.value);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = (max - min) || 1;
    const plotW = width - padX * 2;
    const plotH = height - padTop - padBottom;
    const step = puntos.length > 1 ? plotW / (puntos.length - 1) : 0;

    const coords = puntos.map((p, i) => {
      const x = padX + step * i;
      const y = padTop + plotH - ((p.value - min) / rango) * plotH;
      return { x, y, label: p.label };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${padTop + plotH} L${coords[0].x.toFixed(1)},${padTop + plotH} Z`;
    const gradId = 'tendGrad' + Math.random().toString(36).slice(2, 8);

    return `
      <svg viewBox="0 0 ${width} ${height}" class="w-full" style="height:${height}px" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#${gradId})" stroke="none"/>
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${coords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke-width="2"/>`).join('')}
        ${coords.map(c => `<text x="${c.x.toFixed(1)}" y="${height - 6}" font-size="10" fill="#8891A0" text-anchor="middle">${escapeHtml(c.label.slice(0, 3))}</text>`).join('')}
      </svg>`;
  }

  // Mini gráfico de barras SVG para distribución de usuarios por rol.
  function miniBarrasRoles(datos, w, h) {
    const width = w || 420;
    const height = h || 170;
    const padBottom = 34;
    const padTop = 10;
    const plotH = height - padTop - padBottom;
    const max = Math.max(1, ...datos.map(d => d.value));
    const gap = 18;
    const barW = (width - gap * (datos.length + 1)) / datos.length;

    return `
      <svg viewBox="0 0 ${width} ${height}" class="w-full" style="height:${height}px" preserveAspectRatio="none">
        ${datos.map((d, i) => {
          const bh = Math.max(3, (d.value / max) * plotH);
          const x = gap + i * (barW + gap);
          const y = padTop + (plotH - bh);
          return `
            <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" fill="${d.color}"/>
            <text x="${(x + barW / 2).toFixed(1)}" y="${height - 20}" font-size="10.5" fill="rgba(255,255,255,0.55)" text-anchor="middle">${escapeHtml(d.label)}</text>
            <text x="${(x + barW / 2).toFixed(1)}" y="${height - 6}" font-size="11.5" font-weight="800" fill="#fff" text-anchor="middle">${d.value}</text>`;
        }).join('')}
      </svg>`;
  }

  // Cohorte elegida en el filtro del card "Promedio" del Resumen Superadmin.
  // '' = Promedio general (todas las cohortes).
  let resumenSuperadminCohorte = '';

  // Calcula el promedio a mostrar en el card "Promedio" del Resumen:
  // si hay una cohorte elegida, promedia solo los estudiantes de esa
  // cohorte; si no, promedia todos los estudiantes con cohorte (general).
  // async: promedioGeneralEstudianteCohorte() ahora es async.
  async function promedioResumenSuperadmin(usuarios, cohorteFiltro) {
    const estudiantesConCohorte = usuarios.filter(u => u.rol === 'Estudiante' && u.cohorte && (!cohorteFiltro || u.cohorte === cohorteFiltro));
    const resultados = await Promise.all(estudiantesConCohorte.map(e => promedioGeneralEstudianteCohorte(e.nombre, e.cohorte, null)));
    const promediosValidos = resultados.filter(Boolean).map(r => r.promedio);
    return promediosValidos.length ? (promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length) : null;
  }

  function onCambiaResumenSuperadminCohorte(valor) {
    resumenSuperadminCohorte = valor || '';
    renderResumenSuperadmin();
  }

  // async: 'usuarios' vía MySQL + contarInscritos() (que también es
  // async) se resuelven con Promise.all antes de calcular inscritos.
  async function renderResumenSuperadmin() {
    const usuarios = await Store.list('usuarios');
    const modulos = await Store.list('modulos');
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const cupos = modulos.reduce((a, m) => a + Number(m.cupos || 0), 0);
    // CORREGIDO: antes se sumaba m.inscritos, un campo que ya no existe en
    // el formulario de Cohorte (ver comentario en SCHEMAS.modulos) y por lo
    // tanto siempre daba 0 — "Ocupación de cupos" marcaba 0% sin importar
    // cuántos estudiantes reales tuviera cada cohorte (se veía en la tarjeta
    // "Ocupación de cupos" del Resumen). Ahora se cuenta con contarInscritos(),
    // la misma fuente real (estudiantes con esa cohorte asignada) que ya usa
    // la tabla "Cohortes registradas".
    const inscritosPorModulo = modulos.map(m => usuarios.filter(u => u.rol === 'Estudiante' && u.cohorte === m.nombre).length);
    const inscritos = inscritosPorModulo.reduce((a, b) => a + b, 0);
    const ocupacion = cupos ? Math.round((inscritos / cupos) * 100) : 0;

    // Si la cohorte guardada ya no existe (fue eliminada), se vuelve a
    // "Promedio general" para no quedar apuntando a un valor inválido.
    if (resumenSuperadminCohorte && !modulos.some(m => m.nombre === resumenSuperadminCohorte)) {
      resumenSuperadminCohorte = '';
    }

    // Promedio real: promedia el promedio de cada estudiante con cohorte
    // (misma fuente que el panel Calificaciones), filtrado por la cohorte
    // elegida en el selector, o todas las cohortes si no hay ninguna
    // seleccionada ("Promedio general").
    const promedioGeneral = await promedioResumenSuperadmin(usuarios, resumenSuperadminCohorte);
    const enRiesgo = (await computeSemaforo()).filter(s => s.riesgo === 'Rojo').length;

    const cards = [
      {
        icon: 'usuarios', title: 'Usuarios', color: '#1FC8C0',
        value: usuarios.length,
      },
      {
        icon: 'cohortes', title: 'Cohortes', color: '#8B5CF6',
        value: modulos.length,
      },
      {
        icon: 'riesgo', title: 'En riesgo', color: '#F0455C',
        value: enRiesgo,
      },
    ];

    const rolesData = [
      { label: 'Estudiantes', value: usuarios.filter(u => u.rol === 'Estudiante').length, color: '#1FC8C0' },
      { label: 'Docentes', value: usuarios.filter(u => u.rol === 'Docente').length, color: '#8B5CF6' },
      { label: 'Admin.', value: usuarios.filter(u => u.rol === 'Coordinador' || u.rol === 'Administrador').length, color: '#F5A623' },
    ];

    const tendencia = await tendenciaPromedioGeneralMensual();
    const puntosTendencia = tendencia.map(t => ({ label: t.mes, value: t.promedio }));
    const tendenciaSubiendo = tendencia.length >= 2 && tendencia[tendencia.length - 1].promedio >= tendencia[0].promedio;

    document.getElementById('mount-resumen').innerHTML = `
      <div class="superadmin-cards mb-6">
        ${renderSuperadminSummaryCardReadonly(cards[0])}
        ${renderSuperadminSummaryCardReadonly(cards[1])}
        <article class="superadmin-card superadmin-card-readonly">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <label for="resumenSuperadminCohorteSelect" class="superadmin-card-title block">Promedio</label>
              <p class="superadmin-card-value">${promedioGeneral !== null ? promedioGeneral.toFixed(1) : '—'}</p>
              <select id="resumenSuperadminCohorteSelect" onchange="onCambiaResumenSuperadminCohorte(this.value)" class="mt-2 w-full max-w-[160px] rounded-lg border border-morado/25 bg-morado/5 px-2 py-1 text-[11px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
                <option value="" ${!resumenSuperadminCohorte ? 'selected' : ''}>Promedio general</option>
                ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${resumenSuperadminCohorte === m.nombre ? 'selected' : ''}>${escapeHtml(m.nombre)}</option>`).join('')}
              </select>
            </div>
            <div class="superadmin-card-icon shrink-0" style="background:#F5A6231A;color:#F5A623">${SUPERADMIN_CARD_ICONS['calificaciones'] || ''}</div>
          </div>
        </article>
        ${renderSuperadminSummaryCardReadonly(cards[2])}
      </div>

      <div class="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <div class="dashboard-hero-banner p-7 sm:p-8 flex items-center justify-between gap-6">
          <div>
            <h3 class="text-lg sm:text-xl font-extrabold text-white">Fundación A<span class="text-coral">+</span></h3>
            <p class="text-sm text-white/75 mt-1.5 max-w-sm leading-relaxed">Panel administrativo institucional, ahora con vista de solo lectura.</p>
          </div>
          <svg class="w-14 h-14 text-white/85 shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M4 21V9l8-6 8 6v12M9 21v-6h6v6M4 9h16"/></svg>
        </div>

        <div class="dashboard-dark-card p-6 sm:p-7">
          <p class="text-sm font-extrabold text-white">Ocupación de cupos</p>
          <p class="font-display text-3xl font-bold text-white mt-2">${ocupacion}%</p>
          <div class="dashboard-progress-track mt-3">
            <div class="dashboard-progress-fill" style="width:${Math.max(0, Math.min(100, ocupacion))}%"></div>
          </div>
          <p class="text-xs text-white/55 mt-2.5">${inscritos} de ${cupos || 0} cupos usados</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-5">
        <div class="dashboard-dark-card p-6 sm:p-7">
          <p class="text-sm font-extrabold text-white">Usuarios por rol</p>
          <p class="text-xs text-white/50 mt-0.5 mb-4">Distribución actual</p>
          ${miniBarrasRoles(rolesData)}
        </div>
        <div class="admin-panel-card p-6 sm:p-7">
          <p class="text-sm font-extrabold text-ink">Promedio general</p>
          <p class="text-xs mt-0.5 mb-2 ${tendencia.length >= 2 ? (tendenciaSubiendo ? 'text-turquesa' : 'text-coral') : 'text-slate2'}">
            ${tendencia.length >= 2 ? `${tendenciaSubiendo ? '↑' : '↓'} tendencia ${tendenciaSubiendo ? 'estable' : 'a la baja'} este período` : 'Sin histórico suficiente aún'}
          </p>
          ${miniLineaTendencia(puntosTendencia, '#8B5CF6')}
        </div>
      </div>

      <h3 class="text-sm font-extrabold text-ink mt-8 mb-3">Más indicadores</h3>
      <div class="grid lg:grid-cols-2 gap-5">
        ${await renderIndicadorPqr()}
        ${await renderIndicadorActividadReciente()}
      </div>

      <p class="text-xs text-slate2 mt-6 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m0-11a4 4 0 014 4c0 1.5-1 2-2 3s-1 1.5-1 2m-6 6h10a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        Vista de solo lectura: los datos se administran desde cada apartado del menú.
      </p>`;
  }

  // ---------- Indicador: PQR abiertas (Pendiente) vs resueltas (Activo) ----------
  // "Abiertas" = estado "Pendiente" (aún no la abre/descarga ningún admin);
  // "Resueltas" = estado "Activo" (ya fue descargada/atendida). Son los
  // ÚNICOS dos estados reales que usa este flujo (ver descargarPqrAdmin),
  // así que no se contempla "Cerrado"/"Resuelto" porque no ocurren en la
  // práctica con el código actual.
  // async: 'pqr' vía MySQL.
  async function renderIndicadorPqr() {
    const pqr = await Store.list('pqr');
    const abiertas = pqr.filter(p => p.estado === 'Pendiente').length;
    const resueltas = pqr.filter(p => p.estado === 'Activo').length;
    const total = pqr.length;
    const pctResueltas = total ? Math.round((resueltas / total) * 100) : 0;

    return `
      <div class="admin-panel-card p-6 sm:p-7">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <p class="text-sm font-extrabold text-ink">PQR: abiertas vs resueltas</p>
            <p class="text-xs text-slate2 mt-0.5">${total} PQR en total registradas</p>
          </div>
          <div class="superadmin-card-icon shrink-0" style="background:#F0455C1A;color:#F0455C">${SUPERADMIN_CARD_ICONS['riesgo'] || ''}</div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p class="font-display text-2xl font-bold text-coral">${abiertas}</p>
            <p class="text-xs text-slate2 mt-0.5">Abiertas (Pendiente)</p>
          </div>
          <div>
            <p class="font-display text-2xl font-bold text-turquesa">${resueltas}</p>
            <p class="text-xs text-slate2 mt-0.5">Resueltas (Activo)</p>
          </div>
        </div>
        <div class="dashboard-progress-track" style="background:#F0455C1A">
          <div class="dashboard-progress-fill" style="width:${pctResueltas}%;background:linear-gradient(90deg,#1FC8C0,#4FE0D8)"></div>
        </div>
        <p class="text-xs text-slate2 mt-2">${pctResueltas}% resueltas${!total ? ' — aún no hay PQR registradas' : ''}</p>
      </div>`;
  }

  // ---------- Indicador: Actividad reciente (últimos 7 días) ----------
  // Combina las dos bitácoras reales: auditoria_login (logins exitosos de
  // cualquier rol: Superadmin/Coordinador/Docente/Estudiante) y
  // auditoria_acciones (acciones dentro del sistema, hoy solo "Notas
  // actualizadas" por un docente — ver guardarNotasModuloRecord). Se
  // muestran los eventos más recientes, ya ordenados porque ambas
  // bitácoras se guardan con unshift() (más nuevo primero).
  async function renderIndicadorActividadReciente() {
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);
    const hace7diasISO = hace7dias.toISOString().slice(0, 10);

    const logins = (await Store.list('auditoria_login'))
      .filter(l => l.resultado === 'Exitoso' && l.fecha >= hace7diasISO)
      .map(l => ({ fecha: l.fecha, hora: l.hora, texto: `${l.rol || 'Usuario'} inició sesión`, detalle: l.email }));

    const acciones = (await Store.list('auditoria_acciones'))
      .filter(a => a.fecha >= hace7diasISO)
      .map(a => ({ fecha: a.fecha, hora: a.hora, texto: `${a.actor} — ${a.tipo}`, detalle: a.detalle }));

    const eventos = [...logins, ...acciones]
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
      .slice(0, 8);

    return `
      <div class="admin-panel-card p-6 sm:p-7">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <p class="text-sm font-extrabold text-ink">Actividad reciente</p>
            <p class="text-xs text-slate2 mt-0.5">Últimos 7 días · logins y acciones registradas</p>
          </div>
          <div class="superadmin-card-icon shrink-0" style="background:#8B5CF61A;color:#8B5CF6">${SUPERADMIN_CARD_ICONS['cohortes'] || ''}</div>
        </div>
        ${eventos.length ? `
          <ul class="space-y-3">
            ${eventos.map(e => `
              <li class="flex items-start justify-between gap-3 text-sm">
                <div class="min-w-0">
                  <p class="font-semibold text-ink truncate">${escapeHtml(e.texto)}</p>
                  ${e.detalle ? `<p class="text-xs text-slate2 truncate">${escapeHtml(e.detalle)}</p>` : ''}
                </div>
                <span class="text-xs text-slate2 shrink-0 whitespace-nowrap">${fmtDate(e.fecha)}</span>
              </li>`).join('')}
          </ul>`
          : `<p class="text-sm text-slate2">Sin actividad registrada en los últimos 7 días.</p>`}
      </div>`;
  }

  // ---------- RENDER: Resumen ----------
  // ---------- RENDER: Resumen ----------
  // async: 'usuarios' vía MySQL + contarInscritos() async.
  async function renderResumen() {
    if (currentAdminRole === 'superadmin') {
      await renderResumenSuperadmin();
      return;
    }

    const usuarios = await Store.list('usuarios');
    const modulos = await Store.list('modulos');
    const pqr = await Store.list('pqr');
    const semaforo = await computeSemaforo();

    const docentes = usuarios.filter(u => u.rol === 'Docente' && u.estado === 'Activo').length;
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;
    const conPromedio = semaforo.filter(s => s.promedio !== '—');
    const promedio = conPromedio.length ? (conPromedio.reduce((a, s) => a + Number(s.promedio), 0) / conPromedio.length).toFixed(1) : '—';
    const enRiesgo = semaforo.filter(s => s.riesgo === 'Rojo').length;
    const enAlerta = semaforo.filter(s => s.riesgo === 'Amarillo').length;
    const pqrAbiertos = pqr.filter(p => p.estado === 'Pendiente').length;
    const cupos = modulos.reduce((a, m) => a + Number(m.cupos || 0), 0);
    // CORREGIDO: antes se sumaba m.inscritos, un campo que ya no existe en
    // el formulario de Cohorte (ver comentario en SCHEMAS.modulos) y por lo
    // tanto siempre daba 0 — "Ocupación de cupos" marcaba 0% sin importar
    // cuántos estudiantes reales tuviera cada cohorte. Ahora se cuenta con
    // contarInscritos(), la misma fuente real (estudiantes con esa cohorte
    // asignada) que ya usa la tabla "Cohortes registradas".
    const inscritosPorModulo = modulos.map(m => usuarios.filter(u => u.rol === 'Estudiante' && u.cohorte === m.nombre).length);
    const inscritos = inscritosPorModulo.reduce((a, b) => a + b, 0);
    const ocupacion = cupos ? Math.round((inscritos / cupos) * 100) : 0;

    const iconUsuarios = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg>';
    const iconRiesgo = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z"/></svg>';
    const iconPromedio = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H6a1 1 0 01-1-1V6a2 2 0 012-2h10a2 2 0 012 2v10a1 1 0 01-1 1h-2"/></svg>';
    const iconCohortes = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25v13.5M4.75 8.5L12 6.25l7.25 2.25v9L12 19.75l-7.25-2.25v-9z"/></svg>';
    const iconOcupacion = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5M3.75 3h16.5M21.75 3h-1.5m0 0v11.25a2.25 2.25 0 01-2.25 2.25h-2.25m0 0V21m0-4.5H9m6 4.5H9m0 0V16.5"/></svg>';
    const iconPqr = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
    const iconAlerta = '<svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>';

    const cardsHtml = [
      statCardBrand({ label: 'Usuarios registrados', value: usuarios.length, sub: docentes + ' docentes activos', color: '#1FC8C0', icon: iconUsuarios, clickPanel: 'usuarios' }),
      statCardBrand({ label: 'Estudiantes en riesgo', value: enRiesgo, sub: 'Requieren acompañamiento', color: '#F0455C', icon: iconRiesgo, clickPanel: 'semaforo' }),
      // CORREGIDO: decía "Sobre 5.0" pero el sistema califica sobre 10 (ver
      // calcularNotaFinal() y calificacionCualitativa(): Desempeño Superior
      // desde 9, Alto desde 7, Básico desde 6 — todo en escala 0-10). Ese
      // texto era un remanente de un diseño anterior y quedaba engañoso.
      statCardBrand({ label: 'Promedio general', value: promedio, sub: 'Sobre 10.0, todas las cohortes', color: '#F5A623', icon: iconPromedio, clickPanel: 'calificaciones' }),
      statCardBrand({ label: 'Cohortes en curso', value: enCurso, sub: modulos.length + ' registradas en total', color: '#8B5CF6', icon: iconCohortes, clickPanel: 'modulos' }),
      statCardBrand({ label: 'Ocupación de cupos', value: ocupacion + '%', sub: inscritos + ' de ' + cupos + ' cupos', color: '#EC4899', icon: iconOcupacion, clickPanel: 'modulos' }),
      statCardBrand({ label: 'PQR pendientes', value: pqrAbiertos, sub: 'A la espera de revisión', color: '#9A5B3F', icon: iconPqr, clickPanel: 'pqr' }),
      statCardBrand({ label: 'Alertas en amarillo', value: enAlerta, sub: 'Cerca del umbral mínimo', color: '#F5A623', icon: iconAlerta, clickPanel: 'semaforo' }),
      statCardBrand({ label: 'Alertas totales', value: enRiesgo + enAlerta, sub: 'Rojas + amarillas', color: '#F0455C', icon: iconAlerta, clickPanel: 'semaforo' }),
    ].join('');

    const ranking = [...semaforo].filter(s => s.promedio !== '—').sort((a, b) => Number(b.promedio) - Number(a.promedio)).slice(0, 5);
    const rankHtml = ranking.length ? ranking.map((r, i) => `
      <div class="flex items-center gap-3">
        <span class="w-6 h-6 rounded-full ${i === 0 ? 'bg-oro/15 text-oro' : 'bg-gray-100 text-slate2'} text-xs font-bold grid place-items-center shrink-0">${i + 1}</span>
        <span class="flex-1 text-sm text-ink font-medium truncate">${escapeHtml(r.nombre)}</span>
        <span class="text-sm font-bold" style="color:${r.riesgo === 'Rojo' ? '#F0455C' : r.riesgo === 'Amarillo' ? '#F5A623' : '#14181F'}">${r.promedio}</span>
      </div>`).join('') : `<p class="text-sm text-slate2">Aún no hay calificaciones registradas.</p>`;

    const alerts = [];
    semaforo.filter(s => s.riesgo === 'Rojo').forEach(s => alerts.push({ c: '#F0455C', txt: `<span class="text-ink font-semibold">${escapeHtml(s.nombre)}:</span> riesgo crítico${s.motivo ? ' — ' + escapeHtml(s.motivo).toLowerCase() : ''}.` }));
    pqr.filter(p => p.estado === 'Pendiente').forEach(p => alerts.push({ c: '#F5A623', txt: `<span class="text-ink font-semibold">PQR ${escapeHtml(p.tipo)} de ${escapeHtml(p.solicitante)}:</span> "${escapeHtml(p.asunto)}" sin revisar.` }));
    // CORREGIDO: mismo problema que "Ocupación de cupos" arriba — m.inscritos
    // nunca se llena, así que esta alerta nunca disparaba aunque una cohorte
    // sí estuviera llena en la realidad. Se usa contarInscritos() (conteo real).
    // Reutiliza inscritosPorModulo (ya calculado arriba, mismo orden que
    // modulos) en vez de volver a llamar contarInscritos() por cohorte.
    modulos.filter((m, i) => m.cupos && inscritosPorModulo[i] >= m.cupos).forEach(m => alerts.push({ c: '#8B5CF6', txt: `<span class="text-ink font-semibold">${escapeHtml(m.nombre)}:</span> cupos completos.` }));
    const alertsHtml = alerts.length ? alerts.slice(0, 6).map(a => `
      <div class="flex items-start gap-3">
        <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${a.c}"></span>
        <p class="text-sm text-slate2">${a.txt}</p>
      </div>`).join('') : `<p class="text-sm text-slate2">No hay alertas activas por ahora.</p>`;

    document.getElementById('mount-resumen').innerHTML = `
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">${cardsHtml}</div>
      <div class="grid lg:grid-cols-2 gap-5 mt-5">
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between mb-5">
            <p class="font-bold text-ink text-sm">Ranking académico</p>
            <span class="text-xs text-slate2">Top 5</span>
          </div>
          <div class="space-y-3">${rankHtml}</div>
        </div>
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between mb-5">
            <p class="font-bold text-ink text-sm">Alertas del sistema</p>
            ${alerts.length ? '<span class="w-2 h-2 rounded-full bg-coral animate-pulse"></span>' : ''}
          </div>
          <div class="space-y-4">${alertsHtml}</div>
        </div>
      </div>`;
  }

  // Resumen de materias/horas que un Docente tiene asignadas, según el Horario.
  // async: getSlotsDocente() ahora es async.
  async function getDocenteResumenMaterias(nombreDocente) {
    const slots = await getSlotsDocente(nombreDocente);
    if (!slots.length) return null;
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);
    const materias = Array.from(new Set(slots.map(s => s.curso || s.materia).filter(Boolean)));
    return { count: slots.length, totalHoras, materias };
  }

  // ---------- RENDER: Usuarios ----------
  // ---------- CURSOS (catálogo general de programas, independiente de Pensum) ----------
  // ---------- HISTORIAL TRAINEE (ficha centralizada del estudiante) ----------
  // Reúne, de solo lectura, todo lo que ya existe en otros módulos sobre un
  // estudiante puntual (Memorandos, Asistencia, PQR, Calificaciones), más
  // una sección de Archivos (imágenes/PDF) que SOLO existe aquí — se
  // guardan como Data URL en localStorage (Store 'trainee_archivos'), con
  // un límite de tamaño razonable por archivo para no saturar el navegador.
  const TRAINEE_ARCHIVO_MAX_BYTES = 3 * 1024 * 1024; // 3 MB por archivo
  let traineeState = { estudianteId: null, busquedaArchivo: '', filtroTipo: 'todos', archivosExpandidos: false };

  function toggleExpandirArchivosTrainee() {
    traineeState.archivosExpandidos = !traineeState.archivosExpandidos;
    renderTraineeFicha();
  }

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getBadgeArchivo(archivo) {
    const tipo = (archivo.tipo || '').toLowerCase();
    const nombre = (archivo.nombre || '').toLowerCase();
    if (tipo.includes('pdf') || nombre.endsWith('.pdf')) {
      return { label: 'PDF', bg: 'bg-rose-500 text-white', icon: 'pdf' };
    }
    if (tipo.includes('png') || nombre.endsWith('.png')) {
      return { label: 'PNG', bg: 'bg-indigo-600 text-white', icon: 'img' };
    }
    if (tipo.includes('jpeg') || tipo.includes('jpg') || nombre.endsWith('.jpg') || nombre.endsWith('.jpeg')) {
      return { label: 'JPG', bg: 'bg-amber-600 text-white', icon: 'img' };
    }
    if (tipo.includes('webp') || nombre.endsWith('.webp')) {
      return { label: 'WEBP', bg: 'bg-teal-600 text-white', icon: 'img' };
    }
    if (tipo.startsWith('image/')) {
      return { label: 'IMG', bg: 'bg-morado text-white', icon: 'img' };
    }
    return { label: 'DOC', bg: 'bg-slate-700 text-white', icon: 'doc' };
  }

  async function renderTrainee() {
    const todosEstudiantes = (await Store.list('usuarios'))
      .filter(u => u.rol === 'Estudiante' || u.fueEstudiante)
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    if (!traineeState.estudianteId && todosEstudiantes.length > 0) {
      traineeState.estudianteId = todosEstudiantes[0].id;
    }
    const estudianteActivo = todosEstudiantes.find(u => u.id === traineeState.estudianteId);

    document.getElementById('mount-trainee').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Historial Trainee</h2>
        <p class="text-sm text-slate2 mt-0.5">Todo lo que ha pasado con un estudiante en la fundación: memorandos, asistencia, PQR, calificaciones y archivos. Incluye a quienes fueron estudiantes y ahora tienen otro rol.</p>
      </div>
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label class="block text-xs font-bold text-slate2 uppercase tracking-wide" for="traineeBusquedaEmail">Buscar por correo o nombre</label>
          <span class="text-xs text-slate2">${todosEstudiantes.length} trainees en plataforma</span>
        </div>
        <div class="relative w-full sm:max-w-md mb-3">
          <input id="traineeBusquedaEmail" type="text" value="${estudianteActivo ? escapeHtml(estudianteActivo.nombre + ' (' + estudianteActivo.email + ')') : ''}" oninput="onBuscaTraineeEmail(this.value)" autocomplete="off" placeholder="Escribe para buscar..."
            class="w-full rounded-xl border border-morado/25 bg-morado/5 pl-9 pr-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          <svg class="w-4 h-4 text-slate2 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div id="traineeBusquedaResultados" class="mb-2"></div>
        ${todosEstudiantes.length ? `
          <div class="pt-3 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1">
            <span class="text-[11px] font-bold text-slate2 uppercase tracking-wide shrink-0">Acceso rápido:</span>
            ${todosEstudiantes.slice(0, 10).map(u => `
              <button onclick="onCambiaTraineeEstudiante('${u.id}')" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${u.id === traineeState.estudianteId ? 'bg-morado text-white shadow-sm' : 'bg-gray-100 text-slate2 hover:bg-gray-200 hover:text-ink'}">
                ${escapeHtml(u.nombre.split(' ')[0])}
              </button>
            `).join('')}
            ${todosEstudiantes.length > 10 ? `<span class="text-xs text-slate2 shrink-0">+${todosEstudiantes.length - 10} más</span>` : ''}
          </div>
        ` : ''}
      </div>
      <div id="traineeFicha"></div>`;

    await renderTraineeFicha();
  }

  // Busca por coincidencia parcial de correo O nombre, y solo entre quienes
  // son o fueron Estudiante — nunca se listan nombres/correos de antemano,
  // solo aparecen como resultado de escribir algo que coincide.
  // async: 'usuarios' vía MySQL.
  async function onBuscaTraineeEmail(valor) {
    const wrap = document.getElementById('traineeBusquedaResultados');
    const q = valor.trim().toLowerCase();
    if (q.length < 3) { wrap.innerHTML = ''; return; }

    const coincidencias = (await Store.list('usuarios'))
      .filter(u => (u.rol === 'Estudiante' || u.fueEstudiante) &&
        ((u.email || '').toLowerCase().includes(q) || (u.nombre || '').toLowerCase().includes(q)))
      .slice(0, 8);

    if (!coincidencias.length) {
      wrap.innerHTML = `<p class="text-xs text-slate2 mt-1">Sin coincidencias.</p>`;
      return;
    }
    wrap.innerHTML = `
      <div class="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
        ${coincidencias.map(u => `
          <button onclick="onCambiaTraineeEstudiante('${u.id}')" class="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-between gap-3">
            <span class="min-w-0">
              <span class="block text-ink font-medium truncate">${escapeHtml(u.nombre)}</span>
              <span class="block text-xs text-slate2 truncate">${escapeHtml(u.email)}</span>
            </span>
            <span class="text-xs text-slate2 shrink-0">${u.rol === 'Estudiante' ? '' : 'Fue estudiante · ahora ' + escapeHtml(u.rol)}</span>
          </button>`).join('')}
      </div>`;
  }

  async function onCambiaTraineeEstudiante(estudianteId) {
    traineeState.estudianteId = estudianteId;
    traineeState.busquedaArchivo = '';
    traineeState.filtroTipo = 'todos';
    traineeState.archivosExpandidos = false;
    const input = document.getElementById('traineeBusquedaEmail');
    const resWrap = document.getElementById('traineeBusquedaResultados');
    if (resWrap) resWrap.innerHTML = '';

    const wrap = document.getElementById('traineeFicha');
    if (wrap) {
      wrap.innerHTML = `<div class="admin-panel-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-10 h-10 border-4 border-morado/20 border-t-morado rounded-full animate-spin"></div>
        <p class="text-sm font-semibold text-ink">Cargando ficha del trainee...</p>
      </div>`;
    }

    const persona = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (input && persona) input.value = persona.nombre + ' (' + persona.email + ')';
    await renderTraineeFicha();
  }

  // Se puede llamar desde afuera (ej. desde el panel Usuarios) para abrir
  // directamente la ficha de un estudiante puntual.
  async function abrirHistorialTrainee(estudianteId) {
    traineeState.estudianteId = estudianteId;
    traineeState.busquedaArchivo = '';
    traineeState.filtroTipo = 'todos';
    traineeState.archivosExpandidos = false;
    await showPanel('trainee');
  }

  async function renderTraineeFicha() {
    const wrap = document.getElementById('traineeFicha');
    if (!wrap) return;
    if (!traineeState.estudianteId) {
      wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Selecciona un estudiante para ver su historial.</p></div>`;
      return;
    }
    const est = (await Store.list('usuarios')).find(u => u.id === traineeState.estudianteId);
    if (!est) { wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Este estudiante ya no existe.</p></div>`; return; }

    // Si ya no es Estudiante (cambió a Docente, Administrador, etc.), la
    // cohorte relevante para todo el historial es la que tenía CUANDO era
    // estudiante (cohorteAnterior, ver saveModal), no la actual — est.cohorte
    // puede estar vacía o ser otra cosa para un Docente/Administrador.
    const esEstudianteActual = est.rol === 'Estudiante';
    const cohorteHistorica = esEstudianteActual ? est.cohorte : est.cohorteAnterior;

    // ---- Memorandos: mismo criterio que memorandosParaEstudiante() (case-
    //      insensitive en el email, incluye envíos a "Todos", "Todos los
    //      estudiantes", o a toda la cohorte del estudiante), y solo los
    //      que ya están en estado "Enviado" — un Borrador tampoco debe
    //      aparecer aquí, igual que no aparece para el propio destinatario.
    //      Se recalcula aquí en vez de reusar esa función porque ella
    //      depende de currentEstudiante (la sesión activa), no de un id
    //      elegido. ----
    const emailLower = (est.email || '').toLowerCase();
    const memos = [...(await Store.list('memorandos'))].filter(m => {
      if (m.estado !== 'Enviado') return false;
      const dest = m.destinatario || '';
      return dest.toLowerCase() === emailLower
        || dest === 'Todos'
        || dest === 'Todos los estudiantes'
        || (cohorteHistorica && dest === cohorteHistorica);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    // ---- Asistencia ----
    const asistencia = [...(await Store.list('asistencia'))].filter(a => a.estudiante === est.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalesAsist = { Presente: 0, Tarde: 0, Falla: 0 };
    asistencia.forEach(a => { if (totalesAsist[a.estado] !== undefined) totalesAsist[a.estado]++; });
    const pctAsistencia = asistencia.length ? Math.round((totalesAsist.Presente / asistencia.length) * 100) : null;

    // ---- Calificaciones: promedio general por cohorte (reusa el mismo
    //      cálculo que ve Administración en el panel Calificaciones), MÁS
    //      el desglose mes a mes (unión de todos los meses con notas de
    //      cualquier docente de esa cohorte, ver Etapa 5). ----
    const promedioGeneral = cohorteHistorica ? await promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, null) : null;
    let calificacionesPorMes = [];
    if (cohorteHistorica) {
      const mesesUnicos = new Set();
      const docentesHistorico = await docentesDeCohorte(cohorteHistorica);
      for (const d of docentesHistorico) {
        (await mesesConNotasDocenteCohorte(d, cohorteHistorica)).forEach(m => mesesUnicos.add(m));
      }
      const mesesOrdenados = [...mesesUnicos].sort().reverse();
      const resultadosPorMes = await Promise.all(mesesOrdenados.map(m => promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, m)));
      calificacionesPorMes = mesesOrdenados.map((m, i) => ({
        mes: m,
        resultado: resultadosPorMes[i]
      })).filter(r => r.resultado); // solo meses donde este estudiante puntual sí tiene nota
    }

    // ---- Archivos (única sección con datos propios de este módulo) ----
    // Filtro por nombre: se aplica sobre TODOS los archivos de este
    // estudiante, sin importar mayúsculas/acentos, buscando coincidencia
    // parcial dentro del nombre que se le puso a cada archivo.
    // CORREGIDO: Store.list('trainee_archivos') se llamaba de forma
    // síncrona (sin await) — funcionaba "por accidente" porque esta
    // entidad vivía solo en localStorage y Store.get() para entidades NO
    // migradas es síncrono. Ahora que trainee_archivos SÍ está en
    // ENTIDADES_MYSQL (ver db.js), Store.list() devuelve una Promise; sin
    // el await, "archivosTodos" habría quedado como esa Promise en vez
    // del array, rompiendo el .filter() de abajo.
    const archivosTodos = (await Store.list('trainee_archivos', { query: 'estudiante_id=' + encodeURIComponent(est.id) + '&con_datos=1' })).filter(a => a.estudianteId === est.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalArchivos = archivosTodos.length;
    const totalImagenes = archivosTodos.filter(a => (a.tipo || '').startsWith('image/')).length;
    const totalPdfs = archivosTodos.filter(a => (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf'))).length;

    const filtroTipo = traineeState.filtroTipo || 'todos';
    const filtroArchivo = (traineeState.busquedaArchivo || '').trim().toLowerCase();

    let archivos = archivosTodos;
    if (filtroTipo === 'imagenes') {
      archivos = archivos.filter(a => (a.tipo || '').startsWith('image/'));
    } else if (filtroTipo === 'pdfs') {
      archivos = archivos.filter(a => (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf')));
    }
    if (filtroArchivo) {
      archivos = archivos.filter(a => (a.nombre || '').toLowerCase().includes(filtroArchivo));
    }

    const limiteArchivos = 6;
    const mostrarVerMas = archivos.length > limiteArchivos;
    const archivosMostrados = (mostrarVerMas && !traineeState.archivosExpandidos)
      ? archivos.slice(0, limiteArchivos)
      : archivos;

    const promVal = promedioGeneral ? promedioGeneral.promedio : null;
    let semaforoBadge = { text: 'Sin datos suficientes', bg: 'bg-gray-100 text-slate2 border-gray-200', dot: 'bg-slate-400' };
    if (promVal !== null || pctAsistencia !== null) {
      const p = promVal !== null ? promVal : 7.0;
      const a = pctAsistencia !== null ? pctAsistencia : 100;
      const m = memos.length;
      if (p >= 7.0 && a >= 80 && m === 0) {
        semaforoBadge = { text: 'Rendimiento Óptimo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      } else if (p >= 6.0 && a >= 70 && m <= 1) {
        semaforoBadge = { text: 'En Seguimiento', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      } else {
        semaforoBadge = { text: 'Atención Requerida', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
      }
    }

    const iniciales = escapeHtml((est.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = est.fotoUrl
      ? `<img src="${escapeHtml(est.fotoUrl)}" alt="${escapeHtml(est.nombre)}" onclick="expandirFotoPerfil('${escapeHtml(est.fotoUrl)}', '${escapeHtml(est.nombre || '')}', '${escapeHtml(est.rol || 'Estudiante')}')" class="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-md shadow-morado/20 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-morado/40" title="Clic para ampliar foto" />`
      : `<div class="w-16 h-16 rounded-2xl grid place-items-center text-xl font-extrabold text-white shrink-0 shadow-md shadow-morado/20" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    wrap.innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            ${avatarHtml}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-lg font-extrabold text-ink">${escapeHtml(est.nombre)}</p>
                ${!esEstudianteActual ? `<span class="text-[10px] font-bold uppercase tracking-wide text-morado bg-morado/10 border border-morado/20 rounded-full px-2 py-0.5">Histórico · ${escapeHtml(est.rol)}</span>` : ''}
                ${statusPill(est.estado || 'Activo', ESTADO_COLORS)}
              </div>
              <p class="text-sm text-slate2 mt-0.5">${escapeHtml(est.email || '')} ${cohorteHistorica ? '· <span class="font-semibold text-ink">' + escapeHtml(cohorteHistorica) + '</span>' + (esEstudianteActual ? '' : ' (cohorte histórica)') : ''}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="exportarFichaTraineePDF('${est.id}')" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold shadow-md shadow-morado/20 hover:shadow-lg hover:shadow-morado/30 transition-all active:scale-[0.98]">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Exportar Ficha Oficial (PDF)</span>
            </button>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Asistencia Acumulada</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-black text-ink">${pctAsistencia !== null ? pctAsistencia + '%' : '—'}</p>
              ${pctAsistencia !== null ? `<span class="text-[11px] font-semibold ${pctAsistencia >= 85 ? 'text-emerald-600' : (pctAsistencia >= 75 ? 'text-amber-600' : 'text-rose-600')}">${pctAsistencia >= 85 ? 'Excelente' : (pctAsistencia >= 75 ? 'Regular' : 'Crítica')}</span>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-0.5">${asistencia.length} registros totales</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Promedio General</p>
            <div class="flex items-baseline gap-2 mt-1">
              <p class="text-2xl font-black" style="color:${promVal !== null ? colorCualitativa(promVal) : '#1E293B'}">${promVal !== null ? promVal.toFixed(1) : '—'}</p>
              ${promVal !== null ? `<span class="text-[11px] font-bold uppercase" style="color:${colorCualitativa(promVal)}">${calificacionCualitativa(promVal)}</span>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-0.5">Escala estándar 0 a 10</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Diagnóstico Académico</p>
            <div class="mt-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${semaforoBadge.bg}">
                <span class="w-2 h-2 rounded-full ${semaforoBadge.dot} animate-pulse"></span>
                ${semaforoBadge.text}
              </span>
            </div>
            <p class="text-[11px] text-slate2 mt-1">${memos.length} ${memos.length === 1 ? 'llamado registrado' : 'llamados registrados'}</p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
            <p class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Cohorte y Estado</p>
            <p class="text-base font-extrabold text-ink mt-1 truncate" title="${escapeHtml(cohorteHistorica || 'Sin cohorte')}">${escapeHtml(cohorteHistorica || 'Sin cohorte')}</p>
            <p class="text-[11px] text-slate2 mt-0.5">${esEstudianteActual ? 'En formación activa' : 'Completó etapa formativa'}</p>
          </div>
        </div>
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 class="text-sm font-bold text-ink">Calificaciones por mes</h3>
            <p class="text-xs text-slate2">Rendimiento mensual consolidado según evaluaciones docentes</p>
          </div>
          <span class="text-xs text-slate2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">Promedio general: <span class="font-bold ml-1" style="color:${promVal !== null ? colorCualitativa(promVal) : '#5B6472'}">${promVal !== null ? promVal.toFixed(1) : '—'}</span></span>
        </div>
        ${calificacionesPorMes.length ? `
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-3">Mes</th><th class="py-2.5 px-3">Promedio</th><th class="py-2.5 px-3">Nivel Cualitativo</th><th class="py-2.5 px-3">Docentes Evaluadores</th></tr></thead>
            <tbody>${calificacionesPorMes.map(r => `
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition last:border-0">
                <td class="py-3 px-3 text-sm text-ink font-semibold capitalize">${escapeHtml(mesLabel(r.mes))}</td>
                <td class="py-3 px-3 text-sm"><span class="text-base font-black px-2 py-0.5 rounded-lg" style="color:${colorCualitativa(r.resultado.promedio)};background:${colorCualitativa(r.resultado.promedio)}15">${r.resultado.promedio.toFixed(1)}</span></td>
                <td class="py-3 px-3 text-xs font-bold uppercase" style="color:${colorCualitativa(r.resultado.promedio)}">${calificacionCualitativa(r.resultado.promedio)}</td>
                <td class="py-3 px-3 text-sm text-slate2">${r.resultado.profesores}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : '<p class="text-sm text-slate2 py-2">Sin calificaciones registradas por mes todavía.</p>'}
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-ink">Llamados de Atención y Memorandos</h3>
            <p class="text-xs text-slate2">Expediente disciplinario y compromisos formativos</p>
          </div>
          <span class="text-xs font-bold ${memos.length > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'} px-2.5 py-0.5 rounded-full">${memos.length} ${memos.length === 1 ? 'memorando' : 'memorandos'}</span>
        </div>
        ${memos.length ? memos.map(m => `
          <div class="flex items-start justify-between gap-3 py-3 px-3 rounded-xl hover:bg-gray-50/80 transition border-b border-gray-50 last:border-0">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-ink">${escapeHtml(m.titulo)}</p>
                <p class="text-xs text-slate2 mt-0.5">${fmtDate(m.fecha)}</p>
              </div>
            </div>
            <button onclick="abrirMemorandoCarta('${m.id}')" class="text-xs font-bold text-morado bg-morado/10 hover:bg-morado/20 px-3 py-1.5 rounded-lg transition shrink-0">Ver carta</button>
          </div>`).join('') : `
          <div class="py-3 px-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>Expediente impecable: no registra llamados de atención ni sanciones disciplinarias.</span>
          </div>`}
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-ink">Asistencia Reciente</h3>
            <p class="text-xs text-slate2">Últimos registros de asistencia a clases y talleres</p>
          </div>
          ${pctAsistencia !== null ? `<span class="text-xs font-bold text-ink bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">Asistencia: <span class="font-extrabold ${pctAsistencia >= 85 ? 'text-emerald-600' : 'text-amber-600'}">${pctAsistencia}%</span></span>` : ''}
        </div>
        ${asistencia.length ? `
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-3">Fecha</th><th class="py-2.5 px-3">Curso / Módulo</th><th class="py-2.5 px-3">Estado</th></tr></thead>
            <tbody>${asistencia.slice(0, 10).map(a => `
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition last:border-0">
                <td class="py-2.5 px-3 text-sm text-ink font-medium">${fmtDate(a.fecha)}</td>
                <td class="py-2.5 px-3 text-sm text-slate2">${escapeHtml(a.modulo || '—')}</td>
                <td class="py-2.5 px-3">${statusPill(a.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'] })}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        ${asistencia.length > 10 ? `<p class="text-xs text-slate2 mt-2">Mostrando los 10 registros más recientes de un total de ${asistencia.length}.</p>` : ''}` : '<p class="text-sm text-slate2 py-2">Sin registros de asistencia.</p>'}
      </div>

      <div class="admin-panel-card p-6 md:p-8">
        <!-- Header con Icono y Botón de Subida -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-morado/15 to-turquesa/15 text-morado flex items-center justify-center shadow-inner shrink-0">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-extrabold text-ink">Archivos y Evidencias</h3>
                <span class="text-xs font-bold text-morado bg-morado/10 px-2.5 py-0.5 rounded-full">${totalArchivos}</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Certificados, documentos de identidad o fotos del estudiante (hasta 3 MB).</p>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <label class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-4 py-2.5 shadow-md shadow-morado/20 hover:shadow-lg hover:shadow-morado/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span>Subir archivo</span>
              <input type="file" accept="image/*,.pdf,application/pdf" class="hidden" onchange="abrirNombreArchivoTrainee(this)" />
            </label>
          </div>
        </div>

        <!-- Filtros por tipo y Buscador -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-5">
          <!-- Filtros de Tipo -->
          <div class="inline-flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
            <button onclick="setFiltroTipoArchivoTrainee('todos')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'todos' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              Todos <span class="ml-1 opacity-75 text-[11px]">(${totalArchivos})</span>
            </button>
            <button onclick="setFiltroTipoArchivoTrainee('imagenes')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'imagenes' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              Imágenes <span class="ml-1 opacity-75 text-[11px]">(${totalImagenes})</span>
            </button>
            <button onclick="setFiltroTipoArchivoTrainee('pdfs')" class="px-3 py-1.5 rounded-lg text-xs transition-all ${filtroTipo === 'pdfs' ? 'bg-white text-ink shadow-sm border border-gray-200/60 font-bold' : 'text-slate2 hover:text-ink font-medium'}">
              PDFs <span class="ml-1 opacity-75 text-[11px]">(${totalPdfs})</span>
            </button>
          </div>

          <!-- Buscador -->
          <div class="relative w-full sm:w-64">
            <svg class="w-4 h-4 text-slate2 absolute left-3.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input id="traineeArchivoBusqueda" type="text" value="${escapeHtml(traineeState.busquedaArchivo || '')}" placeholder="Buscar por nombre..." oninput="buscarArchivoTrainee(this.value)" class="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs text-ink placeholder-slate2/60 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
            ${traineeState.busquedaArchivo ? `
              <button onclick="buscarArchivoTrainee('')" class="absolute right-2.5 top-2 text-slate2 hover:text-ink w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            ` : ''}
          </div>
        </div>

        <!-- Subida interactiva -->
        <div id="traineeArchivoNombreWrap"></div>

        <!-- Grid de Archivos -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${archivosMostrados.map(a => {
            const badge = getBadgeArchivo(a);
            const esImg = (a.tipo || '').startsWith('image/');
            const esPdf = (a.tipo === 'application/pdf' || (a.nombre || '').toLowerCase().endsWith('.pdf'));

            return `
            <div class="group relative rounded-2xl border border-gray-200/80 bg-white hover:border-morado/30 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
              <!-- Thumbnail / Vista Previa -->
              ${esImg ? `
                <div class="relative h-44 sm:h-48 bg-gray-100 overflow-hidden cursor-pointer" onclick="verArchivoTraineeModal('${a.id}')">
                  <img src="${a.datos}" alt="${escapeHtml(a.nombre)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                  <div class="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                    <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-ink text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                      <svg class="w-3.5 h-3.5 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Ver imagen
                    </span>
                  </div>
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${badge.bg} shadow-md uppercase">
                    ${badge.label}
                  </span>
                </div>
              ` : `
                <div class="relative h-44 sm:h-48 bg-gradient-to-br from-rose-50 via-red-50/60 to-orange-50 border-b border-rose-100/60 flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden" onclick="verArchivoTraineeModal('${a.id}')">
                  <div class="w-16 h-20 bg-white rounded-xl shadow-md border border-rose-200/80 flex flex-col items-center justify-center relative group-hover:scale-110 transition-transform duration-300">
                    <div class="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <span class="text-[9px] font-black tracking-widest text-rose-700 uppercase">PDF</span>
                  </div>
                  <div class="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center">
                    <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-ink text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition duration-300">
                      <svg class="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Abrir PDF
                    </span>
                  </div>
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${badge.bg} shadow-md uppercase">
                    ${badge.label}
                  </span>
                </div>
              `}

              <!-- Card Details -->
              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-extrabold text-ink truncate mb-1.5" title="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)}</h4>
                  <div class="flex items-center gap-2 text-slate2 text-[11px] flex-wrap">
                    <span class="inline-flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      ${fmtDate(a.fecha)}
                    </span>
                    ${a.origen ? `
                      <span class="inline-block truncate max-w-[120px] font-semibold text-morado bg-morado/5 px-2 py-0.5 rounded-full" title="${escapeHtml(a.origen)}">
                        ${escapeHtml(a.origen)}
                      </span>
                    ` : ''}
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
                  <div class="flex items-center gap-1.5">
                    <button onclick="verArchivoTraineeModal('${a.id}')" title="Ver archivo" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-morado/10 text-slate2 hover:text-morado text-xs font-bold border border-gray-200/60 transition-all">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Ver
                    </button>
                    <a href="${a.datos}" download="${escapeHtml(a.nombre)}" title="Descargar archivo" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-turquesa/10 text-slate2 hover:text-turquesa text-xs font-bold border border-gray-200/60 transition-all">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Descargar
                    </a>
                  </div>
                  <button onclick="eliminarArchivoTrainee('${a.id}')" title="Eliminar archivo" class="w-8 h-8 rounded-xl text-slate2 hover:text-coral hover:bg-coral/10 flex items-center justify-center transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            </div>`;
          }).join('') || (filtroArchivo || filtroTipo !== 'todos' ? `
            <div class="col-span-full py-12 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <div class="w-12 h-12 rounded-full bg-gray-100 text-slate2 mx-auto flex items-center justify-center mb-3">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">No se encontraron archivos</p>
              <p class="text-xs text-slate2 mt-1">Ningún archivo coincide con los filtros aplicados.</p>
              <button onclick="traineeState.busquedaArchivo='';traineeState.filtroTipo='todos';renderTraineeFicha();" class="mt-3 text-xs font-bold text-morado hover:underline">Restablecer filtros</button>
            </div>
          ` : `
            <div class="col-span-full py-12 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <div class="w-14 h-14 rounded-2xl bg-morado/10 text-morado mx-auto flex items-center justify-center mb-3 shadow-inner">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">No hay archivos adjuntos</p>
              <p class="text-xs text-slate2 mt-1 max-w-sm mx-auto">Sube evidencias, notas, fotos o documentos relevantes para el historial de este estudiante.</p>
              <label class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-5 py-2.5 shadow-md hover:opacity-95 cursor-pointer transition">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Subir el primer archivo
                <input type="file" accept="image/*,.pdf,application/pdf" class="hidden" onchange="abrirNombreArchivoTrainee(this)" />
              </label>
            </div>
          `)}

          ${mostrarVerMas ? `
            <div class="col-span-full flex justify-center mt-2">
              <button onclick="toggleExpandirArchivosTrainee()" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-morado/30 bg-morado/5 hover:bg-morado/10 text-morado text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95">
                ${traineeState.archivosExpandidos ? `
                  <span>Mostrar menos archivos</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
                ` : `
                  <span>Ver más archivos (${archivos.length - limiteArchivos} adicionales)</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                `}
              </button>
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  // Escribe en traineeState y vuelve a pintar la ficha para aplicar el
  // filtro — se hace en cada tecla (oninput).
  async function buscarArchivoTrainee(valor) {
    traineeState.busquedaArchivo = valor;
    await renderTraineeFicha();
    const input = document.getElementById('traineeArchivoBusqueda');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }

  function setFiltroTipoArchivoTrainee(tipo) {
    traineeState.filtroTipo = tipo;
    renderTraineeFicha();
  }

  // Paso intermedio entre elegir el archivo y guardarlo: pide el nombre
  // (opcional) antes de leerlo/guardarlo con una tarjeta visual interactiva.
  function abrirNombreArchivoTrainee(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (!wrap) { agregarArchivoTrainee(file, file.name); return; }

    window.__traineeArchivoPendiente = file;
    const fileSizeFmt = formatFileSize(file.size);
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    wrap.innerHTML = `
      <div class="rounded-2xl border-2 border-dashed border-morado/40 bg-gradient-to-br from-morado/5 via-white to-turquesa/5 p-4 sm:p-5 mb-5 animate-fadeIn">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl ${esPdf ? 'bg-rose-100 text-rose-600' : 'bg-morado/15 text-morado'} flex items-center justify-center shrink-0 mt-0.5">
            ${esPdf ? `
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            ` : `
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            `}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-extrabold text-ink truncate max-w-[280px]">${escapeHtml(file.name)}</span>
              ${fileSizeFmt ? `<span class="text-[11px] font-bold text-slate2 bg-gray-100 px-2 py-0.5 rounded-full">${fileSizeFmt}</span>` : ''}
              <span class="text-[10px] font-bold text-morado bg-morado/10 px-2 py-0.5 rounded-full uppercase">${esPdf ? 'Documento PDF' : 'Imagen'}</span>
            </div>
            <label class="block text-xs font-semibold text-slate2 mt-2.5 mb-1" for="traineeArchivoNombreInput">Asignar un nombre o descripción (opcional):</label>
            <div class="flex items-center gap-2 flex-wrap">
              <input id="traineeArchivoNombreInput" type="text" placeholder="${escapeHtml(file.name)}" class="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-ink placeholder-slate2/60 focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
              <button onclick="confirmarSubidaArchivoTrainee()" class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-morado via-purple-600 to-turquesa text-white text-xs font-bold px-4 py-2 hover:opacity-95 shadow-md shadow-morado/20 hover:scale-[1.02] active:scale-[0.98] transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Guardar archivo
              </button>
              <button onclick="cancelarSubidaArchivoTrainee()" class="px-3 py-2 text-xs font-semibold text-slate2 hover:text-coral hover:bg-coral/5 rounded-xl transition">
                Cancelar
              </button>
            </div>
            <p class="text-[11px] text-slate2/80 mt-1.5">Si lo dejas vacío, se guardará con su nombre de origen: <span class="font-medium text-ink">${escapeHtml(file.name)}</span></p>
          </div>
        </div>
      </div>`;
    const nombreInput = document.getElementById('traineeArchivoNombreInput');
    if (nombreInput) nombreInput.focus();
  }

  function cancelarSubidaArchivoTrainee() {
    window.__traineeArchivoPendiente = null;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (wrap) wrap.innerHTML = '';
  }

  function confirmarSubidaArchivoTrainee() {
    const file = window.__traineeArchivoPendiente;
    if (!file) return;
    const nombreInput = document.getElementById('traineeArchivoNombreInput');
    const nombrePersonalizado = nombreInput ? nombreInput.value.trim() : '';
    window.__traineeArchivoPendiente = null;
    const wrap = document.getElementById('traineeArchivoNombreWrap');
    if (wrap) wrap.innerHTML = '';
    agregarArchivoTrainee(file, nombrePersonalizado || file.name);
  }

  // CORREGIDO: guardaba con Store.set('trainee_archivos', arrayCompleto)
  // — eso solo persistía en localStorage (trainee_archivos no estaba en
  // ENTIDADES_MYSQL), por eso los archivos no aparecían al entrar desde
  // otro navegador o dispositivo. Ahora usa Store.agregarArchivo(), que
  // sube SOLO este archivo al servidor.
  async function agregarArchivoTrainee(file, nombre) {
    const esValido = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esValido) { toast('Solo se permiten imágenes o archivos PDF', 'err'); return; }
    if (file.size > TRAINEE_ARCHIVO_MAX_BYTES) { toast('El archivo no puede superar 3 MB', 'err'); return; }

    const datos = await leerArchivoComoDataURL(file);
    const nuevoRegistro = {
      id: 'ta_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
      estudianteId: traineeState.estudianteId,
      nombre: (nombre || file.name).trim() || file.name,
      tipo: file.type || 'application/pdf',
      datos,
      fecha: new Date().toISOString().slice(0, 10),
    };

    let resultado;
    if (typeof Store !== 'undefined' && typeof Store.agregarArchivo === 'function') {
      resultado = await Store.agregarArchivo(nuevoRegistro);
    } else if (typeof apiFetch === 'function') {
      try {
        await apiFetch('trainee_archivos', { method: 'POST', body: JSON.stringify(nuevoRegistro) });
        resultado = { ok: true, remoto: true };
      } catch (e) {
        resultado = { ok: false, remoto: false, error: e.message };
      }
    } else {
      resultado = { ok: false, remoto: false };
    }

    toast(resultado && resultado.remoto ? 'Archivo guardado en la base de datos' : 'No se pudo guardar el archivo en el servidor, intenta de nuevo', resultado && resultado.remoto ? 'ok' : 'err');
    renderTraineeFicha();
  }

  async function eliminarArchivoTrainee(archivoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.')) return;

    // Limpia del localStorage de inmediato por si el archivo provenía de caché local
    try {
      const locales = JSON.parse(localStorage.getItem('aplus_admin_v1_trainee_archivos') || '[]');
      localStorage.setItem('aplus_admin_v1_trainee_archivos', JSON.stringify(locales.filter(a => a.id !== archivoId)));
    } catch (e) {}

    let resultado;
    if (typeof Store !== 'undefined' && typeof Store.eliminarArchivo === 'function') {
      resultado = await Store.eliminarArchivo(archivoId);
    } else if (typeof apiFetch === 'function') {
      try {
        await apiFetch('trainee_archivos?id=' + encodeURIComponent(archivoId), {
          method: 'DELETE',
          body: JSON.stringify({ id: archivoId }),
        });
        resultado = { ok: true, remoto: true };
      } catch (e) {
        resultado = { ok: false, remoto: false, error: e.message };
      }
    } else {
      resultado = { ok: true, remoto: false };
    }

    toast(resultado && resultado.remoto ? 'Archivo eliminado de la base de datos' : 'Archivo eliminado', 'ok');
    renderTraineeFicha();
  }

  function handleEscapeTraineeModal(e) {
    if (e.key === 'Escape') cerrarArchivoTraineeModal();
  }

  async function verArchivoTraineeModal(archivoId) {
    let arch = null;
    try {
      arch = await Store.getArchivo('trainee_archivos', archivoId);
    } catch (e) {
      const archivos = await Store.list('trainee_archivos');
      arch = archivos.find(a => a.id === archivoId);
    }
    if (!arch || !arch.datos || arch.datos === '1') { toast('Archivo no encontrado o datos no disponibles', 'err'); return; }

    let modal = document.getElementById('traineeArchivoModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'traineeArchivoModal';
      document.body.appendChild(modal);
    }

    const esImagen = (arch.tipo || '').startsWith('image/');
    const esPdf = arch.tipo === 'application/pdf' || (arch.nombre || '').toLowerCase().endsWith('.pdf');
    const badge = getBadgeArchivo(arch);

    modal.innerHTML = `
      <div id="traineeArchivoModalBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-sm animate-fadeIn">
        <div class="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20" onclick="event.stopPropagation()">
          <!-- Header del visor -->
          <div class="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/80">
            <div class="flex items-center gap-3 min-w-0">
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badge.bg} shadow-sm shrink-0">
                ${badge.label}
              </span>
              <div class="min-w-0">
                <h4 class="text-sm font-extrabold text-ink truncate">${escapeHtml(arch.nombre)}</h4>
                <p class="text-[11px] text-slate2">${fmtDate(arch.fecha)}${arch.origen ? ' · ' + escapeHtml(arch.origen) : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a href="${arch.datos}" download="${escapeHtml(arch.nombre)}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-morado text-white text-xs font-bold hover:bg-morado/90 transition shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Descargar</span>
              </a>
              <button onclick="cerrarArchivoTraineeModal()" class="w-8 h-8 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-ink flex items-center justify-center transition" aria-label="Cerrar">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Contenedor del visor -->
          <div class="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-gray-900/5 min-h-[350px]">
            ${esImagen ? `
              <img src="${arch.datos}" alt="${escapeHtml(arch.nombre)}" class="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg mx-auto" />
            ` : esPdf ? `
              <iframe src="${arch.datos}" class="w-full h-[72vh] rounded-xl border border-gray-200 bg-white shadow-inner" title="${escapeHtml(arch.nombre)}"></iframe>
            ` : `
              <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm">
                <div class="w-12 h-12 rounded-2xl bg-morado/10 text-morado mx-auto flex items-center justify-center mb-3">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <p class="text-sm font-bold text-ink">Vista previa no disponible</p>
                <p class="text-xs text-slate2 mt-1">Este formato de archivo se puede abrir tras descargarlo.</p>
                <a href="${arch.datos}" download="${escapeHtml(arch.nombre)}" class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-morado text-white text-xs font-bold shadow-md hover:bg-morado/90 transition">
                  Descargar ahora
                </a>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('traineeArchivoModalBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', cerrarArchivoTraineeModal);
    }
    window.addEventListener('keydown', handleEscapeTraineeModal);
  }

  function cerrarArchivoTraineeModal() {
    const modal = document.getElementById('traineeArchivoModal');
    if (modal) modal.remove();
    window.removeEventListener('keydown', handleEscapeTraineeModal);
  }

  // Genera el informe oficial completo del Trainee en formato membretado listo para imprimir o guardar en PDF
  async function exportarFichaTraineePDF(estudianteId) {
    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (!est) { toast('Estudiante no encontrado', 'err'); return; }

    const esEstudianteActual = est.rol === 'Estudiante';
    const cohorteHistorica = esEstudianteActual ? est.cohorte : (est.cohorteAnterior || est.cohorte);
    const emailLower = (est.email || '').toLowerCase();

    const [memosTodos, asistenciaTodas, archivosTodos] = await Promise.all([
      Store.list('memorandos'),
      Store.list('asistencia'),
      Store.list('trainee_archivos')
    ]);

    const memos = memosTodos.filter(m => {
      if (m.estado !== 'Enviado') return false;
      const dest = m.destinatario || '';
      return dest.toLowerCase() === emailLower
        || dest === 'Todos'
        || dest === 'Todos los estudiantes'
        || (cohorteHistorica && dest === cohorteHistorica);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const asistencia = asistenciaTodas.filter(a => a.estudiante === est.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalesAsist = { Presente: 0, Tarde: 0, Falla: 0 };
    asistencia.forEach(a => { if (totalesAsist[a.estado] !== undefined) totalesAsist[a.estado]++; });
    const pctAsistencia = asistencia.length ? Math.round((totalesAsist.Presente / asistencia.length) * 100) : null;

    const promedioGeneral = cohorteHistorica ? await promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, null) : null;
    let calificacionesPorMes = [];
    if (cohorteHistorica) {
      const mesesUnicos = new Set();
      const docentesHistorico = await docentesDeCohorte(cohorteHistorica);
      for (const d of docentesHistorico) {
        (await mesesConNotasDocenteCohorte(d, cohorteHistorica)).forEach(m => mesesUnicos.add(m));
      }
      const mesesOrdenados = [...mesesUnicos].sort().reverse();
      const resultadosPorMes = await Promise.all(mesesOrdenados.map(m => promedioGeneralEstudianteCohorte(est.nombre, cohorteHistorica, m)));
      calificacionesPorMes = mesesOrdenados.map((m, i) => ({
        mes: m,
        resultado: resultadosPorMes[i]
      })).filter(r => r.resultado);
    }

    const archivos = archivosTodos.filter(a => a.estudianteId === est.id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const semaforoColor = (promedioGeneral && promedioGeneral.promedio >= 7.0 && (pctAsistencia === null || pctAsistencia >= 85) && memos.length === 0)
      ? '#059669' // verde esmeralda
      : ((!promedioGeneral || promedioGeneral.promedio >= 6.0) && (pctAsistencia === null || pctAsistencia >= 75) && memos.length <= 1)
        ? '#D97706' // ambar
        : '#DC2626'; // rojo

    const semaforoTexto = semaforoColor === '#059669'
      ? 'Rendimiento Óptimo'
      : (semaforoColor === '#D97706' ? 'En Seguimiento' : 'Atención Requerida');

    const faseTexto = (cohorteHistorica || '').toLowerCase().includes('profundizacion') || (cohorteHistorica || '').toLowerCase().includes('fase 2') || (cohorteHistorica || '').toLowerCase().includes('fase dos')
      ? 'Profundización (Fase 2)'
      : 'Fundamentación (Fase 1)';

    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ficha Integral del Trainee — ${escapeHtml(est.nombre)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #14181F; background: #eef1f5; margin: 0; padding: 24px 16px; }
  .action-bar { max-width: 850px; margin: 0 auto 16px; display: flex; justify-content: flex-end; gap: 10px; }
  .action-bar button { border: none; border-radius: 9999px; padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer; background: #8B5CF6; color: #fff; box-shadow: 0 2px 8px rgba(139,92,246,0.3); transition: all 0.2s; }
  .action-bar button:hover { background: #7C3AED; }
  .action-bar button.close-btn { background: #5B6472; }
  .page { max-width: 850px; margin: 0 auto; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; padding: 40px 48px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #8B5CF6; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { height: 42px; width: auto; border-radius: 6px; }
  .brand-title { font-size: 18px; font-weight: 900; color: #14181F; margin: 0; }
  .brand-sub { font-size: 11px; font-weight: 600; color: #5B6472; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
  
  .doc-title { text-align: center; margin-bottom: 24px; }
  .doc-title h1 { font-size: 18px; font-weight: 900; color: #14181F; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title p { font-size: 12px; color: #5B6472; margin: 0; }
  
  .student-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
  .student-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; font-size: 13px; }
  .student-grid .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .student-grid .val { font-weight: 700; color: #0f172a; margin-top: 1px; }
  
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center; }
  .kpi-card .num { font-size: 20px; font-weight: 900; margin: 4px 0 2px; }
  .kpi-card .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
  
  .section-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 24px 0 12px; display: flex; align-items: center; justify-content: space-between; }
  
  table.data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  table.data-table th { background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 10px; text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; }
  table.data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
  table.data-table tr:nth-child(even) td { background: #f8fafc; }
  
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  
  .footer-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 48px; margin-top: 56px; padding-top: 16px; }
  .signature-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; }
  .signature-box .role { font-size: 11px; color: #64748b; margin-top: 2px; }
  
  .verification-note { margin-top: 36px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 10px; color: #64748b; text-align: center; }

  @media print {
    body { background: #fff; padding: 0; }
    .action-bar { display: none; }
    .page { border: none; box-shadow: none; padding: 20px 24px; max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="action-bar">
    <button onclick="window.print()"><svg style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>Descargar / Imprimir en PDF</button>
    <button class="close-btn" onclick="window.close()"><svg style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:4px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Cerrar</button>
  </div>
  
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="${LOGO_FUNDACION_DATAURL}" alt="Fundación A+" />
        <div>
          <h2 class="brand-title">Fundación A+</h2>
          <p class="brand-sub">Programa TrAIning de 100 a 1000+</p>
        </div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:11px;font-weight:700;color:#64748b;">EXPEDIENTE OFICIAL</span><br>
        <span style="font-size:12px;font-weight:800;color:#8B5CF6;">ID: TRAINEE-${escapeHtml(est.id.slice(-6).toUpperCase())}</span>
      </div>
    </div>

    <div class="doc-title">
      <h1>Ficha Integral y Expediente Académico del Trainee</h1>
      <p>Reporte oficial consolidado emitido el ${fechaHoy}</p>
    </div>

    <div class="student-box">
      <div class="student-grid">
        <div>
          <div class="label">Estudiante / Trainee</div>
          <div class="val">${escapeHtml(est.nombre)}</div>
        </div>
        <div>
          <div class="label">Correo Electrónico</div>
          <div class="val">${escapeHtml(est.email || 'No registrado')}</div>
        </div>
        <div>
          <div class="label">Cohorte Académica</div>
          <div class="val">${escapeHtml(cohorteHistorica || 'Sin cohorte')} (${faseTexto})</div>
        </div>
        <div>
          <div class="label">Estado Actual</div>
          <div class="val">${escapeHtml(est.estado || 'Activo')}</div>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="lbl">Asistencia Global</div>
        <div class="num" style="color:#0f172a;">${pctAsistencia !== null ? pctAsistencia + '%' : '—'}</div>
        <span style="font-size:10px;color:#64748b;">${totalesAsist.Presente} asistencias · ${totalesAsist.Falla} fallas</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Promedio General</div>
        <div class="num" style="color:${promedioGeneral ? colorCualitativa(promedioGeneral.promedio) : '#0f172a'};">
          ${promedioGeneral ? promedioGeneral.promedio.toFixed(1) : '—'}
        </div>
        <span style="font-size:10px;color:#64748b;">${promedioGeneral ? escapeHtml(calificacionCualitativa(promedioGeneral.promedio)) : 'Sin notas'}</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Salud Académica</div>
        <div class="num" style="font-size:14px;color:${semaforoColor};margin-top:7px;">
          ${semaforoTexto}
        </div>
        <span style="font-size:10px;color:#64748b;">Diagnóstico continuo</span>
      </div>
      <div class="kpi-card">
        <div class="lbl">Evidencias / Archivos</div>
        <div class="num" style="color:#8B5CF6;">${archivos.length}</div>
        <span style="font-size:10px;color:#64748b;">Documentos adjuntos</span>
      </div>
    </div>

    <div class="section-title">
      <span>1. Calificaciones Consolidadas por Mes</span>
      <span style="font-size:10px;color:#64748b;">${calificacionesPorMes.length} periodos evaluados</span>
    </div>
    ${calificacionesPorMes.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Promedio Numérico</th>
          <th>Evaluación Cualitativa</th>
          <th>Docentes Evaluadores</th>
        </tr>
      </thead>
      <tbody>
        ${calificacionesPorMes.map(r => `
          <tr>
            <td><b>${escapeHtml(mesLabel(r.mes))}</b></td>
            <td style="font-weight:800;color:${colorCualitativa(r.resultado.promedio)};">${r.resultado.promedio.toFixed(1)}</td>
            <td><span class="badge" style="background:${colorCualitativa(r.resultado.promedio)}20;color:${colorCualitativa(r.resultado.promedio)};">${escapeHtml(calificacionCualitativa(r.resultado.promedio))}</span></td>
            <td>${escapeHtml(r.resultado.profesores || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#64748b;font-style:italic;">No registra calificaciones periódicas en el sistema.</p>'}

    <div class="section-title">
      <span>2. Balance de Asistencia y Asistencia Reciente</span>
      <span style="font-size:10px;color:#64748b;">${asistencia.length} clases computadas</span>
    </div>
    ${asistencia.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Módulo / Curso</th>
          <th>Registro de Asistencia</th>
        </tr>
      </thead>
      <tbody>
        ${asistencia.slice(0, 8).map(a => `
          <tr>
            <td>${fmtDate(a.fecha)}</td>
            <td>${escapeHtml(a.modulo || '—')}</td>
            <td><b>${escapeHtml(a.estado)}</b></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${asistencia.length > 8 ? `<p style="font-size:10px;color:#64748b;margin-top:4px;">* Mostrando las 8 sesiones más recientes de un total de ${asistencia.length}.</p>` : ''}
    ` : '<p style="font-size:12px;color:#64748b;font-style:italic;">Sin registros de asistencia.</p>'}

    <div class="section-title">
      <span>3. Novedades y Memorandos Emitidos</span>
      <span style="font-size:10px;color:#64748b;">${memos.length} registros</span>
    </div>
    ${memos.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Título / Asunto del Memorando</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${memos.map(m => `
          <tr>
            <td>${fmtDate(m.fecha)}</td>
            <td><b>${escapeHtml(m.titulo)}</b></td>
            <td>Oficial / Enviado</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#059669;font-weight:600;display:flex;align-items:center;gap:6px;"><svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>El estudiante no cuenta con memorandos ni observaciones disciplinarias.</p>'}

    <div class="section-title">
      <span>4. Portafolio de Archivos y Evidencias Adjuntas</span>
      <span style="font-size:10px;color:#64748b;">${archivos.length} archivos</span>
    </div>
    ${archivos.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Nombre del Archivo / Documento</th>
          <th>Formato</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
        ${archivos.map(a => `
          <tr>
            <td>${fmtDate(a.fecha)}</td>
            <td><b>${escapeHtml(a.nombre)}</b></td>
            <td>${(a.tipo || '').includes('pdf') || (a.nombre || '').toLowerCase().endsWith('.pdf') ? 'Documento PDF' : 'Imagen'}</td>
            <td>${escapeHtml(a.origen || 'Carga directa')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<p style="font-size:12px;color:#64748b;font-style:italic;">Sin evidencias registradas.</p>'}

    <div class="footer-signatures">
      <div class="signature-box">
        <b>Dirección Académica y Pedagógica</b>
        <div class="role">Fundación A+ · Programa TrAIning</div>
      </div>
      <div class="signature-box">
        <b>Coordinación de Programas y Alianzas</b>
        <div class="role">Fundación A+ · Litoral Pacífico</div>
      </div>
    </div>

    <div class="verification-note">
      Documento oficial generado por la Plataforma de Gestión Académica de la Fundación A+.
      Para verificar la autenticidad de esta ficha, comunicarse con info@fundacionamas.org.co.
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast('Habilita las ventanas emergentes para generar el PDF', 'err');
      return;
    }
    win.document.open();
    win.document.write(htmlDoc);
    win.document.close();
  }

  // Exposición explícita para llamadas desde onclick
  window.verArchivoTraineeModal = verArchivoTraineeModal;
  window.cerrarArchivoTraineeModal = cerrarArchivoTraineeModal;
  window.setFiltroTipoArchivoTrainee = setFiltroTipoArchivoTrainee;
  window.buscarArchivoTrainee = buscarArchivoTrainee;
  window.abrirNombreArchivoTrainee = abrirNombreArchivoTrainee;
  window.confirmarSubidaArchivoTrainee = confirmarSubidaArchivoTrainee;
  window.cancelarSubidaArchivoTrainee = cancelarSubidaArchivoTrainee;
  window.eliminarArchivoTrainee = eliminarArchivoTrainee;
  window.toggleExpandirArchivosTrainee = toggleExpandirArchivosTrainee;
  window.exportarFichaTraineePDF = exportarFichaTraineePDF;

  // async: 'cursos' vía MySQL.
  async function renderCursos() {
    const records = [...(await Store.list('cursos'))].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const rows = records.map(c => `
      <tr data-search="${escapeHtml((c.nombre + ' ' + (c.descripcion || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(c.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2 max-w-md">${escapeHtml(c.descripcion || '—')}</td>
        <td class="py-3 px-4">${statusPill(c.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('cursos','${c.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('cursos','${c.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-cursos').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('cursos', 'Cursos', records.length + ' curso' + (records.length === 1 ? '' : 's') + ' en el catálogo')}
        <div class="overflow-x-auto">
          <table id="table-cursos" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Nombre</th><th class="py-2.5 px-4">Descripción</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(4)}</tbody>
          </table>
        </div>
      </div>`;
  }

  /**
   * Módulo: Chat conocimiento
   * Alimenta la base de conocimiento general en MySQL (tabla chat_voz_conocimiento).
   * Persistencia: Store('chat_voz_conocimiento').
   */
  // async: 'chat_voz_conocimiento' vía MySQL (Fase 6).
  async function renderChatVozConocimiento() {
    const records = [...(await Store.list('chat_voz_conocimiento'))].sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));

    const visibilidadBadge = (v) => v === 'Solo usuarios con sesión'
      ? '<span class="text-xs font-semibold rounded-full px-2.5 py-1" style="background:#8B5CF61A;color:#8B5CF6">Solo con sesión</span>'
      : '<span class="text-xs font-semibold rounded-full px-2.5 py-1" style="background:#1FC8C01A;color:#0f8f89">Pública</span>';

    const rows = records.map(r => `
      <tr data-search="${escapeHtml((r.titulo + ' ' + (r.categoria || '') + ' ' + r.contenido).toLowerCase())}" class="border-b border-gray-50 last:border-0 align-top">
        <td class="py-3 px-4 text-sm font-semibold text-ink max-w-xs">${escapeHtml(r.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2 max-w-md">${escapeHtml((r.contenido || '').slice(0, 140))}${(r.contenido || '').length > 140 ? '…' : ''}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.categoria || '—')}</td>
        <td class="py-3 px-4">${visibilidadBadge(r.visibilidad)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('chat_voz_conocimiento','${r.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('chat_voz_conocimiento','${r.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-chatvoz').innerHTML = `
      <div class="admin-panel-card p-6 mb-6 border-l-4" style="border-left-color:#8B5CF6">
        <h3 class="text-sm font-extrabold text-ink mb-1">Chat de la Fundación A+ — de texto, por ahora</h3>
        <p class="text-xs text-slate2 leading-relaxed">El widget de chat ya es visible en el sitio (botón flotante abajo a la derecha), tanto para visitantes como dentro de cualquier login. Es un chat de TEXTO — la parte de voz (micrófono, respuestas habladas) todavía no está implementada. El backend que responde corre aparte (Python + Gemini/Groq) y ya está conectado a esta misma base de datos MySQL — lo que guardes aquí llega directo al chat, sin pasos manuales. <strong>El campo "Tema" es solo un TEMA de referencia, no una pregunta exacta que el visitante deba escribir igual</strong>: el chat usa IA para responder cualquier forma de preguntar sobre ese tema, así que redacta cada entrada como un tema amplio (ej. "Convocatorias e inscripciones: cuándo abren y cómo aplicar") y en "Información" pon todo lo que el chat pueda necesitar sobre ese tema, no una frase única para leer literal.</p>
      </div>
      <div class="admin-panel-card p-6">
        ${sectionHeader('chat_voz_conocimiento', 'Base de conocimiento', records.length + ' entrada' + (records.length === 1 ? '' : 's') + ' registrada' + (records.length === 1 ? '' : 's'))}
        <div class="overflow-x-auto">
          <table id="table-chat_voz_conocimiento" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Tema</th><th class="py-2.5 px-4">Información</th><th class="py-2.5 px-4">Categoría</th><th class="py-2.5 px-4">Visibilidad</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  /**
   * PLACEHOLDER — punto de entrada real para cuando se implemente el motor
   * del chat de voz. Hoy hace una búsqueda de texto simple (coincidencia de
   * palabras) sobre la base de conocimiento, respetando la regla de
   * visibilidad. El futuro motor de voz/IA debería llamar a esta función (o
   * reemplazarla) para obtener el contexto/las respuestas permitidas antes
   * de responderle a la persona.
   *
   * @param {string} textoConsulta - lo que la persona preguntó (transcrito de voz o texto)
   * @param {boolean} haySesionActiva - true si quien pregunta tiene una sesión iniciada (Estudiante/Docente/Administración/Superadmin)
   * @returns {Array<{pregunta:string, respuesta:string, categoria:string}>} coincidencias permitidas, más relevantes primero
   */
  function buscarEnBaseConocimientoChatVoz(textoConsulta, haySesionActiva) {
    const texto = (textoConsulta || '').trim().toLowerCase();
    if (!texto) return [];

    const visibilidadesPermitidas = haySesionActiva
      ? ['Pública', 'Solo usuarios con sesión']
      : ['Pública']; // visitante sin sesión: NUNCA entradas "Solo usuarios con sesión"

    const candidatos = Store.list('chat_voz_conocimiento')
      .filter(r => r.estado === 'Activa' && visibilidadesPermitidas.includes(r.visibilidad));

    const palabras = texto.split(/\s+/).filter(Boolean);
    const puntuados = candidatos.map(r => {
      const base = (r.pregunta + ' ' + (r.categoria || '')).toLowerCase();
      const coincidencias = palabras.filter(p => base.includes(p)).length;
      return { r, coincidencias };
    }).filter(x => x.coincidencias > 0);

    puntuados.sort((a, b) => b.coincidencias - a.coincidencias);
    return puntuados.map(x => ({ pregunta: x.r.pregunta, respuesta: x.r.respuesta, categoria: x.r.categoria || '' }));
  }

  let tabUsuariosActivo = 'todos'; // 'todos' | 'profesores' | 'estudiantes' | 'registrados'
  async function cambiarTabUsuarios(tab) {
    tabUsuariosActivo = tab;
    if (typeof TableManager !== 'undefined' && TableManager.clearFilter) {
      TableManager.clearFilter('table-usuarios');
    }
    await renderUsuarios();
    initTablesEnPanel('panel-usuarios');
  }
  window.cambiarTabUsuarios = cambiarTabUsuarios;

  function filtrarTablaLive(term, tableId) {
    if (typeof TableManager !== 'undefined' && TableManager.filter) {
      TableManager.filter(tableId, term);
    } else {
      filterTable(tableId.replace(/^table-/, ''), term);
    }
  }
  window.filtrarTablaLive = filtrarTablaLive;

  // Helper robusto para detectar si un usuario es una solicitud de registro pendiente
  function esSolicitudPendienteUsuario(u) {
    if (!u) return false;
    const reg = String(u.estadoRegistro || '').trim().toLowerCase();
    const est = String(u.estado || '').trim().toLowerCase();
    if (reg === 'rechazado' || est === 'rechazado') return false;
    if (reg === 'pendiente' || reg === 'solicitud' || reg.includes('pend') || reg.includes('solicit') || reg.includes('espera')) return true;
    if (est === 'pendiente' || est === 'solicitud' || est.includes('pend') || est.includes('solicit')) return true;
    if (u.estadoRegistro && reg !== 'aprobado' && reg !== 'activo') return true;
    return false;
  }

  // async: 'usuarios' vía MySQL.
  async function renderUsuarios() {
    // Forzar lectura fresca de la base de datos limpiando la caché en memoria
    if (typeof Store.clearCache === 'function') Store.clearCache('usuarios');
    const todosUsuarios = await Store.list('usuarios', { forceRefresh: true });

    // Respaldo de seguridad: si existe alguna solicitud pendiente o registro guardado en localStorage, integrarla
    try {
      const rawLocal = localStorage.getItem('aplus_admin_v1_usuarios');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          parsed.forEach(lu => {
            if (!lu || !lu.email) return;
            const idx = todosUsuarios.findIndex(tu => tu.email && tu.email.toLowerCase() === lu.email.toLowerCase());
            if (idx !== -1) {
              if (esSolicitudPendienteUsuario(lu)) {
                todosUsuarios[idx].estadoRegistro = 'Pendiente';
                if (lu.nombre && (!todosUsuarios[idx].nombre || todosUsuarios[idx].nombre === 'Loren Liseth')) {
                  todosUsuarios[idx].nombre = lu.nombre;
                }
                if (lu.telefono) todosUsuarios[idx].telefono = lu.telefono;
              }
            } else {
              if (esSolicitudPendienteUsuario(lu)) {
                todosUsuarios.unshift(lu);
              }
            }
          });
        }
      }
    } catch (e) {}

    const pendientes = todosUsuarios.filter(esSolicitudPendienteUsuario);
    const records = todosUsuarios.filter(u => u.rol !== 'Coordinador' && u.rol !== 'Administrador' && !esSolicitudPendienteUsuario(u));

    const docentes = records.filter(u => u.rol === 'Docente');
    const estudiantes = records.filter(u => u.rol === 'Estudiante');

    // Banner de alerta superior cuando hay solicitudes pendientes y no estamos en la pestaña 'registrados'
    const alertaPendientes = (pendientes.length && tabUsuariosActivo !== 'registrados') ? `
      <div onclick="cambiarTabUsuarios('registrados')" class="admin-panel-card p-4 mb-5 border-l-4 border-amber-400 bg-amber-50/60 hover:bg-amber-100/70 cursor-pointer transition flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <div>
            <p class="text-xs font-bold text-ink">¡Hay ${pendientes.length} solicitud${pendientes.length === 1 ? '' : 'es'} de registro pendiente${pendientes.length === 1 ? '' : 's'} de revisión!</p>
            <p class="text-[11px] text-slate2">Haz clic aquí o en la pestaña "Solicitudes" para filtrar y aprobarla(s) de inmediato.</p>
          </div>
        </div>
        <span class="text-xs font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition shrink-0 shadow-xs">Filtrar solicitudes (${pendientes.length}) ›</span>
      </div>` : '';

    let cuerpoTablaHtml = '';
    let tablaHeaderHtml = '';

    if (tabUsuariosActivo === 'todos') {
      const listaCombinada = [...pendientes, ...records];
      const allRows = listaCombinada.map(u => {
        const esPend = esSolicitudPendienteUsuario(u);
        const iniciales = (u.nombre || 'U').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return `
        <tr data-search="${escapeHtml(((u.nombre || '') + ' ' + (u.email || '') + ' ' + (u.telefono || '') + ' ' + (u.rol || '') + ' ' + (u.cohorte || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0 ${esPend ? 'bg-amber-50/50 hover:bg-amber-100/60' : 'hover:bg-gray-50/70'} transition">
          <td class="py-3 px-4 text-sm font-semibold text-ink">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl ${esPend ? 'bg-amber-100 text-amber-800 border border-amber-300' : (u.rol === 'Docente' ? 'bg-morado/10 text-morado' : 'bg-turquesa/15 text-turquesa')} font-bold text-xs flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
              <div>
                <div class="flex items-center gap-1.5">
                  <p class="font-bold text-ink leading-tight">${escapeHtml(u.nombre)}</p>
                  ${esPend ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">Solicitud</span>' : ''}
                </div>
                <p class="text-xs text-slate2">${escapeHtml(u.email)}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.telefono || '—')}</td>
          <td class="py-3 px-4 text-sm">
            ${esPend ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Autorregistro web</span>' : (u.rol === 'Docente' ? '<span class="text-xs font-bold text-morado">Profesor</span>' : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-turquesa/10 text-turquesa border border-turquesa/20">Estudiante · ${escapeHtml(u.cohorte || 'Sin cohorte')}</span>`)}
          </td>
          <td class="py-3 px-4">${esPend ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pendiente</span>' : statusPill(u.estado, ESTADO_COLORS)}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            ${esPend ? `
              <button onclick="aprobarRegistroPendiente('${u.id}')" class="text-xs font-bold text-white bg-turquesa hover:opacity-90 px-3 py-1.5 rounded-xl shadow-sm mr-2 transition cursor-pointer">Aprobar</button>
              <button onclick="rechazarRegistroPendiente('${u.id}')" class="text-xs font-semibold text-coral hover:bg-coral/10 px-2.5 py-1.5 rounded-xl transition cursor-pointer mr-2">Rechazar</button>
              <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline cursor-pointer">Detalles</button>
            ` : `
              <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline mr-3 cursor-pointer">Editar</button>
              <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline cursor-pointer">Eliminar</button>
            `}
          </td>
        </tr>`;
      }).join('');

      tablaHeaderHtml = `
        <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
          <th class="py-2.5 px-4">Usuario / Solicitante</th><th class="py-2.5 px-4">Teléfono</th><th class="py-2.5 px-4">Tipo / Cohorte</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4 text-right">Acciones</th>
        </tr></thead>`;
      cuerpoTablaHtml = allRows || emptyRow(5);

    } else if (tabUsuariosActivo === 'profesores') {
      const resumenesMaterias = await Promise.all(docentes.map(u => getDocenteResumenMaterias(u.nombre)));
      const rowsDocentes = docentes.map((u, i) => {
        const resumen = resumenesMaterias[i];
        const iniciales = (u.nombre || 'D').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const materiasTexto = (resumen && Array.isArray(resumen.materias)) ? resumen.materias.join(' ') : (resumen ? (resumen.count + ' materias') : '');
        return `
        <tr data-search="${escapeHtml(((u.nombre || '') + ' ' + (u.email || '') + ' ' + (u.telefono || '') + ' ' + materiasTexto).toLowerCase())}" class="border-b border-gray-50 last:border-0 hover:bg-morado/5 transition">
          <td class="py-3 px-4 text-sm font-semibold text-ink">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-morado/10 text-morado font-bold text-xs flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
              <div>
                <p class="font-bold text-ink leading-tight">${escapeHtml(u.nombre)}</p>
                <p class="text-xs text-slate2">${escapeHtml(u.email)}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.telefono || '—')}</td>
          <td class="py-3 px-4 text-sm">
            ${resumen && resumen.count > 0
              ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-morado/10 text-morado border border-morado/20">${resumen.count} materia${resumen.count === 1 ? '' : 's'} · ${resumen.totalHoras} h/sem</span>`
              : '<span class="text-slate2 text-xs">Sin materias en horario</span>'}
          </td>
          <td class="py-3 px-4">${statusPill(u.estado, ESTADO_COLORS)}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline mr-3 cursor-pointer">Editar</button>
            <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline cursor-pointer">Eliminar</button>
          </td>
        </tr>`;
      }).join('');

      tablaHeaderHtml = `
        <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
          <th class="py-2.5 px-4">Profesor / Docente</th><th class="py-2.5 px-4">Teléfono</th><th class="py-2.5 px-4">Materias Asignadas</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4 text-right">Acciones</th>
        </tr></thead>`;
      cuerpoTablaHtml = rowsDocentes || emptyRow(5);

    } else if (tabUsuariosActivo === 'estudiantes') {
      const rowsEstudiantes = estudiantes.map(u => {
        const iniciales = (u.nombre || 'E').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return `
        <tr data-search="${escapeHtml((u.nombre + ' ' + u.email + ' ' + (u.telefono || '') + ' ' + (u.cohorte || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0 hover:bg-turquesa/5 transition">
          <td class="py-3 px-4 text-sm font-semibold text-ink">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-turquesa/15 text-turquesa font-bold text-xs flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
              <div>
                <div class="flex items-center gap-1.5">
                  <p class="font-bold text-ink leading-tight">${escapeHtml(u.nombre)}</p>
                  ${u.fueEstudiante ? `<button onclick="abrirHistorialTrainee('${u.id}')" title="Fue estudiante — ver su historial" class="text-[10px] font-bold uppercase tracking-wide text-morado bg-morado/10 hover:bg-morado/20 rounded-full px-2 py-0.5 transition cursor-pointer">Historial</button>` : ''}
                </div>
                <p class="text-xs text-slate2">${escapeHtml(u.email)}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.telefono || '—')}</td>
          <td class="py-3 px-4 text-sm">
            ${u.cohorte
              ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-turquesa/10 text-turquesa border border-turquesa/20">${escapeHtml(u.cohorte)}</span>`
              : '<span class="text-slate2 text-xs">Sin cohorte</span>'}
          </td>
          <td class="py-3 px-4">${statusPill(u.estado, ESTADO_COLORS)}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline mr-3 cursor-pointer">Editar</button>
            <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline cursor-pointer">Eliminar</button>
          </td>
        </tr>`;
      }).join('');

      tablaHeaderHtml = `
        <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
          <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Teléfono</th><th class="py-2.5 px-4">Cohorte Asignada</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4 text-right">Acciones</th>
        </tr></thead>`;
      cuerpoTablaHtml = rowsEstudiantes || emptyRow(5);

    } else if (tabUsuariosActivo === 'registrados') {
      const rowsRegistrados = pendientes.map(u => {
        const iniciales = (u.nombre || 'R').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const fechaTxt = u.creadoEn ? new Date(u.creadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente';
        return `
        <tr data-search="${escapeHtml(((u.nombre || '') + ' ' + (u.email || '') + ' ' + (u.telefono || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition">
          <td class="py-3 px-4 text-sm font-semibold text-ink">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
              <div>
                <p class="font-bold text-ink leading-tight">${escapeHtml(u.nombre)}</p>
                <p class="text-xs text-slate2">${escapeHtml(u.email)}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.telefono || '—')}</td>
          <td class="py-3 px-4 text-xs text-slate2">${escapeHtml(fechaTxt)}</td>
          <td class="py-3 px-4 text-sm">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Pendiente
            </span>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="aprobarRegistroPendiente('${u.id}')" class="text-xs font-bold text-white bg-turquesa hover:opacity-90 px-3 py-1.5 rounded-xl shadow-sm mr-2 transition cursor-pointer">Aprobar</button>
            <button onclick="rechazarRegistroPendiente('${u.id}')" class="text-xs font-semibold text-coral hover:bg-coral/10 px-2.5 py-1.5 rounded-xl transition cursor-pointer mr-2">Rechazar</button>
            <button onclick="openModal('usuarios','${u.id}')" class="text-xs font-semibold text-morado hover:underline cursor-pointer">Detalles</button>
          </td>
        </tr>`;
      }).join('');

      tablaHeaderHtml = `
        <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
          <th class="py-2.5 px-4">Solicitante</th><th class="py-2.5 px-4">Teléfono</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4 text-right">Acciones</th>
        </tr></thead>`;
      cuerpoTablaHtml = rowsRegistrados || `<tr><td colspan="5" class="py-12 text-center text-slate2 text-sm">
        <svg class="w-10 h-10 mx-auto mb-2 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="font-semibold text-ink">No hay solicitudes de registro pendientes</p>
        <p class="text-xs text-slate2 mt-1">Los nuevos estudiantes que se registren desde el portal público aparecerán aquí para tu aprobación.</p>
      </td></tr>`;
    }

    const rolParaModal = tabUsuariosActivo === 'profesores' ? 'Docente' : 'Estudiante';
    const labelNuevoBtn = tabUsuariosActivo === 'profesores' ? 'Nuevo profesor' : 'Nuevo estudiante';

    document.getElementById('mount-usuarios').innerHTML = `
      ${alertaPendientes}
      <div class="admin-panel-card p-6">
        
        <!-- Pestañas de separación Todos / Profesores / Estudiantes / Solicitudes -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
          <div class="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-2xl shrink-0 overflow-x-auto">
            <button type="button" onclick="cambiarTabUsuarios('todos')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabUsuariosActivo === 'todos' ? 'bg-white text-ink shadow-sm' : 'text-slate2 hover:text-ink'}">
              <svg class="w-4 h-4 shrink-0 ${tabUsuariosActivo === 'todos' ? 'text-ink' : 'text-slate2'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span>Todos</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tabUsuariosActivo === 'todos' ? 'bg-gray-200 text-ink' : 'bg-gray-200/80 text-slate2'}">${records.length + pendientes.length}</span>
            </button>
            <button type="button" onclick="cambiarTabUsuarios('profesores')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabUsuariosActivo === 'profesores' ? 'bg-white text-ink shadow-sm' : 'text-slate2 hover:text-ink'}">
              <svg class="w-4 h-4 shrink-0 ${tabUsuariosActivo === 'profesores' ? 'text-morado' : 'text-slate2'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/>
              </svg>
              <span>Profesores</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tabUsuariosActivo === 'profesores' ? 'bg-morado/10 text-morado' : 'bg-gray-200 text-slate2'}">${docentes.length}</span>
            </button>
            <button type="button" onclick="cambiarTabUsuarios('estudiantes')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabUsuariosActivo === 'estudiantes' ? 'bg-white text-ink shadow-sm' : 'text-slate2 hover:text-ink'}">
              <svg class="w-4 h-4 shrink-0 ${tabUsuariosActivo === 'estudiantes' ? 'text-turquesa' : 'text-slate2'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              <span>Estudiantes</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tabUsuariosActivo === 'estudiantes' ? 'bg-turquesa/10 text-turquesa' : 'bg-gray-200 text-slate2'}">${estudiantes.length}</span>
            </button>
            <button type="button" onclick="cambiarTabUsuarios('registrados')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabUsuariosActivo === 'registrados' ? 'bg-white text-ink shadow-sm' : 'text-slate2 hover:text-ink'}">
              <svg class="w-4 h-4 shrink-0 ${tabUsuariosActivo === 'registrados' ? 'text-amber-500' : 'text-slate2'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
              </svg>
              <span>Solicitudes</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pendientes.length ? 'bg-amber-500 text-white animate-pulse' : (tabUsuariosActivo === 'registrados' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-slate2')}">${pendientes.length}</span>
            </button>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div class="relative flex-1 sm:w-64">
              <input type="text" data-table="table-usuarios" oninput="filtrarTablaLive(this.value, 'table-usuarios')" placeholder="Buscar en ${tabUsuariosActivo === 'profesores' ? 'profesores' : (tabUsuariosActivo === 'estudiantes' ? 'estudiantes' : (tabUsuariosActivo === 'registrados' ? 'solicitudes' : 'usuarios'))}..." class="w-full rounded-full border border-gray-200 pl-9 pr-3 py-1.5 text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition" />
              <svg class="w-3.5 h-3.5 text-slate2 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            ${tabUsuariosActivo === 'registrados' ? '' : `
            <button onclick="openModal('usuarios', null, '${rolParaModal}')" class="shrink-0 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-xs py-2 px-4 hover:opacity-90 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span>${tabUsuariosActivo === 'todos' ? 'Nuevo usuario' : labelNuevoBtn}</span>
            </button>`}
          </div>
        </div>

        <div class="overflow-x-auto">
          <table id="table-usuarios" class="w-full admin-table">
            ${tablaHeaderHtml}
            <tbody>${cuerpoTablaHtml}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- Notificación por correo del estado de autorregistro (EmailJS) ----------
  // Todo el proyecto corre localmente (sin backend propio), así que el
  // correo se envía directo desde el navegador con EmailJS (servicio
  // gratuito pensado justo para esto: manda correos desde JS puro, sin
  // servidor). Configuración necesaria una sola vez, más abajo en
  // EMAILJS_CONFIG. Es "best-effort": si falla (sin configurar, sin
  // internet, etc.) no bloquea aprobar/rechazar — solo avisa con un toast.
  //
  // Pasos para activarlo (una sola vez, gratis):
  //   1. Crea una cuenta en https://www.emailjs.com/
  //   2. "Email Services" → conecta tu Gmail/Outlook (o el que uses) →
  //      copia el "Service ID".
  //   3. "Email Templates" → crea una plantilla con estas variables:
  //      {{to_email}} {{to_name}} {{subject}} {{message}}
  //      → copia el "Template ID".
  //   4. "Account" → "General" → copia tu "Public Key".
  //   5. Reemplaza los 3 valores de EMAILJS_CONFIG abajo.
  //   6. Agrega este script en index.html, ANTES de app.js:
  //      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
  const EMAILJS_CONFIG = {
    publicKey: 'eIyshGVkR2fYZQJfO',
    serviceId: 'service_20mxfgu',
    templateId: 'template_qvmzl1l',
  };

  let emailjsInicializado = false;
  function asegurarEmailJsInicializado(pubKey) {
    const key = pubKey || EMAILJS_CONFIG.publicKey;
    if (emailjsInicializado || typeof emailjs === 'undefined' || !key) return;
    try {
      emailjs.init({ publicKey: key });
      emailjsInicializado = true;
    } catch (e) {}
  }

  async function notificarEstadoRegistroPorCorreo(email, nombre, tipo, extras = {}) {
    const nombreFundacion = 'Fundación A+';
    const esAprobado = tipo === 'aprobado';
    const urlPortal = window.location.origin + window.location.pathname;
    const urlBase = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const logoGithub = 'https://raw.githubusercontent.com/yohanprado04-netizen/Fundaci-n-A-/main/logo.jpg';
    const logoHttp = urlBase + 'logo.jpg';
    const logoDataUrl = (typeof LOGO_FUNDACION_DATAURL !== 'undefined') ? LOGO_FUNDACION_DATAURL : '';

    const passwordVal = extras.password || '';
    const passwordModificada = !!extras.passwordModificada;
    const cohorteVal = extras.cohorte || '';

    function esBcrypt(str) {
      return typeof str === 'string' && /^\$2[aby]\$\d{2}\$/.test(str);
    }
    const rawPass = extras.password || '';
    const contrasenaMostrar = (!rawPass || esBcrypt(rawPass))
      ? '(La contraseña definida en tu registro)'
      : rawPass;

    let subject = '';
    if (esAprobado) {
      subject = passwordModificada
        ? `Fundación A+ | Acceso a la plataforma y credenciales`
        : `Fundación A+ | Activación de tu cuenta`;
    } else {
      subject = `Fundación A+ | Información de tu solicitud de registro`;
    }

    let message = '';
    if (esAprobado) {
      message = `Estimado(a) ${nombre},

Nos complace informarte que tu solicitud de registro en Fundación A+ ha sido aprobada.

${passwordModificada
  ? 'El administrador ha configurado las siguientes credenciales para tu acceso a la plataforma:'
  : 'Tus datos para acceder a la plataforma institucional son los siguientes:'}

Usuario: ${email}
Contraseña: ${contrasenaMostrar}${cohorteVal ? `\nCohorte: ${cohorteVal}` : ''}

Si tienes alguna inquietud o requieres asistencia, por favor contacta a la coordinación académica.

Atentamente,
Fundación A+`;
    } else {
      message = `Estimado(a) ${nombre},

Te informamos que tu solicitud de registro en Fundación A+ no ha sido aprobada en esta ocasión.

Si consideras que se trata de un error o deseas más información, por favor comunícate con la administración.

Atentamente,
Fundación A+`;
    }

    const messageHtml = `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="padding: 24px 36px 18px 36px; text-align: center; border-bottom: 1px solid #f1f5f9;">
    <img src="${logoGithub}" alt="Fundación A+" style="height: 52px; width: auto; display: inline-block;" />
  </div>
  
  <div style="padding: 28px 36px; color: #334155; font-size: 14px; line-height: 1.6;">
    <p style="margin-top: 0; font-size: 15px; color: #0f172a;">Estimado(a) <strong>${nombre}</strong>,</p>
    
    <p style="color: #475569;">
      ${esAprobado
        ? (passwordModificada
            ? 'Nos complace informarte que tu solicitud de registro en la <strong>Fundación A+</strong> ha sido aprobada. El administrador ha configurado las siguientes credenciales para tu acceso:'
            : 'Nos complace informarte que tu solicitud de registro en la <strong>Fundación A+</strong> ha sido aprobada. A continuación encontrarás los datos para ingresar a la plataforma:')
        : 'Te informamos que tu solicitud de registro en la <strong>Fundación A+</strong> no ha sido aprobada en esta ocasión. Si consideras que se trata de un error, por favor comunícate con la administración.'}
    </p>

    ${esAprobado ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 100px;">Usuario:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Contraseña:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${contrasenaMostrar}</td>
        </tr>
        ${cohorteVal ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Cohorte:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${cohorteVal}</td>
        </tr>` : ''}
      </table>
    </div>` : ''}

    <p style="font-size: 13px; color: #64748b; margin-bottom: 0; padding-top: 14px;">
      Si tienes alguna inquietud o requieres asistencia técnica, comunícate con el equipo de soporte institucional.
    </p>

    <p style="margin-top: 24px; margin-bottom: 0; font-size: 14px; color: #334155;">
      Atentamente,<br />
      <strong>Fundación A+</strong>
    </p>
  </div>

  <div style="background-color: #f8fafc; padding: 14px 36px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
    Fundación A+ · Todos los derechos reservados
  </div>
</div>`;

    let cfg = {};
    try {
      cfg = (await Store.get('configuracion')) || {};
    } catch (e) {}

    const metodo = cfg.emailMetodo || 'emailjs';

    // 1. Si el método configurado es SMTP, enviar directamente por backend PHP
    if (metodo === 'smtp') {
      try {
        const tokenSesion = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem(DB_PREFIX_TOKEN + 'authToken') || '');
        const resp = await fetch(API_BASE_URL + '/api/enviar_correo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tokenSesion ? { 'Authorization': 'Bearer ' + tokenSesion } : {})
          },
          body: JSON.stringify({
            destinatarioEmail: email,
            destinatarioNombre: nombre,
            asunto: subject,
            mensaje: message,
            mensajeHtml: messageHtml,
          })
        });
        const res = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(res.error || 'Error al enviar por SMTP');
        }
        toast(`Correo de notificación enviado a ${email} vía SMTP`, 'ok');
        return { ok: true, metodo: 'smtp' };
      } catch (err) {
        toast(`Solicitud procesada, pero falló el envío de correo SMTP: ${err.message}`, 'err');
        return { ok: false, error: err.message };
      }
    }

    // 2. Si el método es EmailJS:
    const pubKey = cfg.emailjsPublicKey || EMAILJS_CONFIG.publicKey;
    const srvId = cfg.emailjsServiceId || EMAILJS_CONFIG.serviceId;
    const tmplId = cfg.emailjsTemplateId || EMAILJS_CONFIG.templateId;

    if (!pubKey || pubKey.startsWith('TU_') || !srvId || !tmplId) {
      toast(`Solicitud procesada, pero falta configurar EmailJS o SMTP en Configuración para enviar el correo a ${email}`, 'err');
      return { ok: false, error: 'Credenciales incompletas' };
    }

    if (typeof emailjs === 'undefined') {
      toast('La solicitud se procesó, pero no se pudo cargar la librería EmailJS en el navegador', 'err');
      return { ok: false, error: 'Librería no cargada' };
    }

    asegurarEmailJsInicializado(pubKey);

    try {
      await emailjs.send(srvId, tmplId, {
        to_email: email,
        email: email,
        user_email: email,
        to_name: nombre,
        name: nombre,
        subject: subject,
        usuario: email,
        password: contrasenaMostrar,
        contrasena: contrasenaMostrar,
        cohorte: cohorteVal,
        logo_url: logoGithub,
        logo_http_url: logoHttp,
        logo_data_url: logoDataUrl,
        url_portal: '',
        link: '',
        message: message,
        message_html: messageHtml,
      });
      toast(`Correo de notificación enviado a ${email}`, 'ok');
      return { ok: true, metodo: 'emailjs' };
    } catch (err) {
      const errTexto = (err && (err.text || err.message)) || 'Cuenta no encontrada o inválida en EmailJS';
      toast(`Solicitud procesada, pero falló EmailJS al notificar a ${email}: ${errTexto}. Revisa tus credenciales en Configuración.`, 'err');
      return { ok: false, error: errTexto };
    }
  }

  // Aprobar: abre de inmediato el editor del usuario con el modo de aprobación activado
  // para que el Superadmin le asigne cohorte, perfil y configure/asigne credenciales.
  // Al guardar se enviará el correo con sus credenciales y el logo institucional.
  async function aprobarRegistroPendiente(id) {
    const usuarios = await Store.list('usuarios');
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    await openModal('usuarios', id, null, { esAprobacion: true });
  }

  async function rechazarRegistroPendiente(id) {
    const usuarios = await Store.list('usuarios');
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    const seguro = confirm(`¿Estás seguro de rechazar la solicitud de registro de "${u.nombre}"? Se le enviará un correo de notificación.`);
    if (!seguro) return;

    // 1. Limpiar de localStorage si quedó alguna copia local
    try {
      const rawLocal = localStorage.getItem('aplus_admin_v1_usuarios');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          const limpiado = parsed.filter(x => x.id !== id && (!u.email || (x.email || '').toLowerCase() !== u.email.toLowerCase()));
          localStorage.setItem('aplus_admin_v1_usuarios', JSON.stringify(limpiado));
        }
      }
    } catch (e) {}

    // 2. Guardar en Store / MySQL sin el usuario rechazado
    const nuevaLista = usuarios.filter(x => x.id !== id && (!u.email || (x.email || '').toLowerCase() !== u.email.toLowerCase()));
    await Store.set('usuarios', nuevaLista);
    if (typeof Store.clearCache === 'function') Store.clearCache('usuarios');

    toast('Solicitud rechazada. Enviando correo de aviso...', 'ok');
    try {
      await notificarEstadoRegistroPorCorreo(u.email, u.nombre, 'rechazado');
    } catch (err) {
      console.warn('[rechazarRegistroPendiente] Error enviando correo:', err);
    }
    await renderUsuarios();
    await renderAdminBannerStats();
  }

  // ---------- PERFILES Y PERMISOS (exclusivo Superadmin) ----------
  // async: 'perfiles' vía MySQL (Fase 4).
  const THEME_CATEGORIA_PERFIL = {
    'Administrativo': {
      nombre: 'Administrativo',
      color: '#8B5CF6',
      badgeClass: 'bg-morado/10 text-morado border border-morado/25',
      textClass: 'text-morado',
      borderClass: 'border-morado/20',
      bgHeader: 'bg-morado/5',
      btnGradient: 'from-morado to-purple-700',
    },
    'Docente': {
      nombre: 'Docente',
      color: '#1FC8C0',
      badgeClass: 'bg-turquesa/10 text-turquesa border border-turquesa/25',
      textClass: 'text-turquesa',
      borderClass: 'border-turquesa/20',
      bgHeader: 'bg-turquesa/5',
      btnGradient: 'from-turquesa to-teal-600',
    },
    'Estudiante': {
      nombre: 'Estudiante',
      color: '#F5A623',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      textClass: 'text-amber-600',
      borderClass: 'border-amber-200',
      bgHeader: 'bg-amber-50/60',
      btnGradient: 'from-amber-500 to-orange-500',
    }
  };

  async function renderPerfiles() {
    const perfiles = [...(await Store.list('perfiles'))].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const usuarios = await Store.list('usuarios');
    const rows = perfiles.map(p => {
      const enUso = usuarios.filter(u => (u.perfiles || []).includes(p.id)).length;
      const totalPaneles = CATALOGO_PANELES.filter(pan => pan.categoria === p.categoria).length;
      const conVer = Object.values(p.permisos || {}).filter(x => x.ver).length;
      const theme = THEME_CATEGORIA_PERFIL[p.categoria] || THEME_CATEGORIA_PERFIL['Administrativo'];
      return `
      <tr data-search="${escapeHtml((p.nombre + ' ' + p.categoria).toLowerCase())}" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(p.nombre)} ${p.esSistema ? '<span class="text-[10px] font-bold uppercase tracking-wide text-slate2 bg-gray-100 rounded-full px-2 py-0.5 ml-1.5">Sistema</span>' : ''}</td>
        <td class="py-3 px-4 text-sm"><span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${theme.badgeClass}">${escapeHtml(p.categoria)}</span></td>
        <td class="py-3 px-4 text-sm text-slate2">${conVer} / ${totalPaneles} paneles</td>
        <td class="py-3 px-4 text-sm text-slate2">${enUso} usuario${enUso === 1 ? '' : 's'}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="abrirEditorPerfil('${p.id}')" class="text-xs font-semibold text-morado hover:underline mr-3 cursor-pointer">Editar</button>
          ${p.esSistema ? '' : `<button onclick="askDelete('perfiles','${p.id}')" class="text-xs font-semibold text-coral hover:underline cursor-pointer">Eliminar</button>`}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-perfiles').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Perfiles y permisos</h2>
            <p class="text-sm text-slate2 mt-0.5">Cada perfil marca qué paneles puede Ver, Crear, Editar o Eliminar. Los administradores usan morado, los profesores su tono turquesa y los estudiantes su tono dorado.</p>
          </div>
          <button onclick="abrirEditorPerfil()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white text-sm font-semibold px-4 py-2 hover:opacity-90 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Nuevo perfil
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Nombre</th><th class="py-2.5 px-4">Categoría</th><th class="py-2.5 px-4">Acceso</th><th class="py-2.5 px-4">En uso</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(5)}</tbody>
          </table>
        </div>
      </div>
      <div id="perfilEditorWrap"></div>`;
  }

  let perfilEditorId = null; // null = creando uno nuevo

  // async: 'perfiles' vía MySQL (Fase 4).
  async function abrirEditorPerfil(id) {
    perfilEditorId = id || null;
    const perfil = id ? (await Store.list('perfiles')).find(p => p.id === id) : null;
    const esNuevo = !perfil;
    const categoria = perfil ? perfil.categoria : 'Administrativo';
    const permisos = perfil ? perfil.permisos : {};
    const theme = THEME_CATEGORIA_PERFIL[categoria] || THEME_CATEGORIA_PERFIL['Administrativo'];

    const filasPorCategoria = (cat) => {
      const th = THEME_CATEGORIA_PERFIL[cat] || THEME_CATEGORIA_PERFIL['Administrativo'];
      return CATALOGO_PANELES.filter(p => p.categoria === cat).map(p => {
        const perm = permisos[p.codigo] || {};
        return `
          <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
            <td class="py-2 px-3 text-sm text-ink font-medium">${escapeHtml(p.etiqueta)}</td>
            ${['ver', 'crear', 'editar', 'eliminar'].map(accion => `
              <td class="py-2 px-3 text-center">
                <input type="checkbox" data-panel-codigo="${p.codigo}" data-accion="${accion}"
                  style="accent-color:${th.color};"
                  class="perfil-permiso-checkbox w-4 h-4 rounded border-gray-300 cursor-pointer"
                  ${perm[accion] ? 'checked' : ''} />
              </td>`).join('')}
          </tr>`;
      }).join('');
    };

    document.getElementById('perfilEditorWrap').innerHTML = `
      <div class="fixed inset-0 bg-ink/40 z-40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) cerrarEditorPerfil()">
        <div class="bg-white rounded-3xl shadow-softLg max-w-2xl w-full my-8 overflow-hidden">
          <div id="perfilEditorHeader" class="p-6 border-b ${theme.borderClass} ${theme.bgHeader} transition-colors">
            <p id="perfilEditorEyebrow" class="text-xs font-bold uppercase tracking-widest ${theme.textClass}">${esNuevo ? 'Crear nuevo' : 'Editar'}</p>
            <h3 class="text-lg font-extrabold text-ink mt-0.5">Perfil de ${escapeHtml(categoria)}</h3>
          </div>
          <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold text-slate2 block mb-1.5">Nombre del perfil</label>
                <input id="perfil_nombre" type="text" value="${escapeHtml(perfil ? perfil.nombre : '')}" placeholder="Ej. Coordinador Académico"
                  ${perfil && perfil.esSistema ? 'disabled' : ''}
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado disabled:bg-gray-50 disabled:text-slate2" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate2 block mb-1.5">Categoría de usuario</label>
                <select id="perfil_categoria" onchange="abrirEditorPerfil_cambiarCategoria(this.value)"
                  ${perfil && perfil.esSistema ? 'disabled' : ''}
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado disabled:bg-gray-50 disabled:text-slate2">
                  ${['Administrativo', 'Docente', 'Estudiante'].map(c => `<option value="${c}" ${c === categoria ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate2 block mb-1.5">Descripción (opcional)</label>
              <input id="perfil_descripcion" type="text" value="${escapeHtml(perfil ? (perfil.descripcion || '') : '')}" placeholder="Para qué sirve este perfil"
                class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
            <div>
              <p id="perfilPermisosTitulo" class="text-xs font-semibold text-slate2 mb-2">Permisos por panel — categoría <strong class="text-ink">${escapeHtml(categoria)}</strong></p>
              <div class="overflow-x-auto border border-gray-100 rounded-2xl">
                <table id="perfilPermisosTabla" class="w-full">
                  <thead><tr class="text-left text-[11px] font-bold uppercase tracking-wide text-slate2 bg-gray-50 border-b border-gray-100">
                    <th class="py-2.5 px-3">Panel</th><th class="py-2.5 px-3 text-center">Ver</th><th class="py-2.5 px-3 text-center">Crear</th><th class="py-2.5 px-3 text-center">Editar</th><th class="py-2.5 px-3 text-center">Eliminar</th>
                  </tr></thead>
                  <tbody id="perfilPermisosFilas">${filasPorCategoria(categoria)}</tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
            <button onclick="cerrarEditorPerfil()" class="rounded-full border border-gray-200 text-slate2 hover:bg-gray-100 text-sm font-semibold px-4 py-2.5 transition cursor-pointer">Cancelar</button>
            <button id="perfilEditorBtnGuardar" onclick="withBotonCargando(this, guardarPerfil)" class="rounded-full bg-gradient-to-r ${theme.btnGradient} text-white font-semibold text-sm py-2.5 px-6 hover:opacity-95 shadow-sm transition cursor-pointer">Guardar perfil</button>
          </div>
        </div>
      </div>`;
  }

  // Al cambiar la categoría de un perfil NUEVO, se recalculan las filas de
  // permisos para esa categoría y se actualizan los colores temáticos
  function abrirEditorPerfil_cambiarCategoria(categoria) {
    const theme = THEME_CATEGORIA_PERFIL[categoria] || THEME_CATEGORIA_PERFIL['Administrativo'];
    const header = document.getElementById('perfilEditorHeader');
    const eyebrow = document.getElementById('perfilEditorEyebrow');
    const titulo = document.getElementById('perfilPermisosTitulo');
    const btn = document.getElementById('perfilEditorBtnGuardar');

    if (header) {
      header.className = `p-6 border-b ${theme.borderClass} ${theme.bgHeader} transition-colors`;
    }
    if (eyebrow) {
      eyebrow.className = `text-xs font-bold uppercase tracking-widest ${theme.textClass}`;
    }
    if (titulo) {
      titulo.innerHTML = `Permisos por panel — categoría <strong class="text-ink">${escapeHtml(categoria)}</strong>`;
    }
    if (btn) {
      btn.className = `rounded-full bg-gradient-to-r ${theme.btnGradient} text-white font-semibold text-sm py-2.5 px-6 hover:opacity-95 shadow-sm transition cursor-pointer`;
    }

    document.getElementById('perfilPermisosFilas').innerHTML = CATALOGO_PANELES.filter(p => p.categoria === categoria).map(p => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
        <td class="py-2 px-3 text-sm text-ink font-medium">${escapeHtml(p.etiqueta)}</td>
        ${['ver', 'crear', 'editar', 'eliminar'].map(accion => `
          <td class="py-2 px-3 text-center">
            <input type="checkbox" data-panel-codigo="${p.codigo}" data-accion="${accion}"
              style="accent-color:${theme.color};"
              class="perfil-permiso-checkbox w-4 h-4 rounded border-gray-300 cursor-pointer" />
          </td>`).join('')}
      </tr>`).join('');
  }

  function cerrarEditorPerfil() {
    perfilEditorId = null;
    const wrap = document.getElementById('perfilEditorWrap');
    if (wrap) wrap.innerHTML = '';
  }

  async function guardarPerfil() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const categoria = document.getElementById('perfil_categoria').value;
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    if (!nombre) { toast('Ponle un nombre al perfil', 'err'); return; }

    // async: 'perfiles' vía MySQL (Fase 4).
    const perfiles = await Store.list('perfiles');
    const duplicado = perfiles.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== perfilEditorId);
    if (duplicado) { toast('Ya existe un perfil con ese nombre', 'err'); return; }

    const permisos = {};
    document.querySelectorAll('#perfilPermisosFilas .perfil-permiso-checkbox').forEach(chk => {
      const codigo = chk.dataset.panelCodigo;
      const accion = chk.dataset.accion;
      if (!permisos[codigo]) permisos[codigo] = { ver: false, crear: false, editar: false, eliminar: false };
      permisos[codigo][accion] = chk.checked;
      // "Crear/Editar/Eliminar" sin "Ver" no tiene sentido en esta interfaz
      // (todos los renders filtran primero por "ver"): si se marca alguna
      // acción, se activa "ver" automáticamente para que el permiso sea usable.
      if (chk.checked && accion !== 'ver') permisos[codigo].ver = true;
    });

    let perfil = perfilEditorId ? perfiles.find(p => p.id === perfilEditorId) : null;
    if (perfil) {
      perfil.nombre = nombre;
      perfil.descripcion = descripcion;
      perfil.permisos = permisos;
      // categoria y esSistema no se tocan al editar uno existente.
    } else {
      perfiles.push({ id: uid('perf'), nombre, categoria, descripcion, esSistema: false, permisos });
    }
    await Store.set('perfiles', perfiles);
    invalidarCachePerfiles();
    cerrarEditorPerfil();
    renderPerfiles();
    toast('Perfil guardado', 'ok');
  }

  // ---------- ADMINISTRADORES (apartado exclusivo del Superadmin) ----------
  // A diferencia de "Usuarios" (Estudiantes/Docentes), este apartado solo
  // existe para que el Superadmin cree, edite o elimine cuentas con rol
  // "Coordinador" (mostradas aquí como "Administrador"). Reutiliza el mismo
  // modal/CRUD de 'usuarios', pero con el rol fijo en 'Coordinador' y sin
  // mostrar los campos de rol/cohorte (openModal('usuarios', id, 'Coordinador')).
  // async: 'usuarios' vía MySQL.
  async function renderAdministradores() {
    const records = (await Store.list('usuarios')).filter(u => u.rol === 'Coordinador' || u.rol === 'Administrador');
    const rows = records.map(u => `
      <tr data-search="${escapeHtml((u.nombre + ' ' + u.email).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(u.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(u.email)}</td>
        <td class="py-3 px-4">${statusPill(u.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="openModal('usuarios','${u.id}','Coordinador')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('usuarios','${u.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-administradores').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink tracking-tight">Administradores</h2>
            <p class="text-xs text-slate2 mt-0.5">${records.length} administrador${records.length === 1 ? '' : 'es'} con acceso al panel de Administración.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div class="relative">
              <input data-table="table-administradores" oninput="filterTable('administradores', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-2 text-xs sm:text-sm w-40 sm:w-48 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-4 h-4 text-morado absolute left-3 top-2.5 sm:top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="recargarPanelActual()" title="Actualizar datos en vivo" class="rounded-xl border border-gray-200 text-slate2 hover:text-morado hover:bg-morado/5 text-xs sm:text-sm font-semibold px-3 py-2 transition flex items-center gap-1.5 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span class="hidden md:inline">Actualizar</span>
            </button>
            <button onclick="openModal('usuarios', null, 'Coordinador')" class="btn-glow-primary rounded-xl bg-gradient-to-r from-morado via-indigo-600 to-turquesa text-white text-xs sm:text-sm font-bold px-4 py-2 hover:opacity-95 transition flex items-center gap-1.5 shadow-md shadow-morado/20 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nuevo administrador
            </button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-administradores" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Nombre</th><th class="py-2.5 px-4">Correo</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4" data-no-sort="true"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(4)}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-administradores');
  }

  // ---------- HORARIO (antes "Módulos y cohortes") ----------
  // Estado en memoria de la grilla que se está armando/editando.
  let horarioState = { cohorte: null, mes: null, incluyeSabado: false };

  // async: contarInscritos(), docentesDeCohorte() y 'modulos' vía MySQL.
  async function renderModulos() {
    const cohortes = await Store.list('modulos');
    if (!horarioState.cohorte && cohortes.length > 0) {
      horarioState.cohorte = cohortes[0].nombre;
    }
    const [usuariosList, horariosList] = await Promise.all([
      Store.list('usuarios'),
      Store.list('horarios')
    ]);
    const inscritosPorCohorte = cohortes.map(m => usuariosList.filter(u => u.rol === 'Estudiante' && u.cohorte === m.nombre).length);
    const docentesPorCohorte = cohortes.map(m => {
      const nombres = new Set();
      horariosList.filter(h => h.cohorte === m.nombre).forEach(h => {
        franjasActivas(h).forEach(f => { if (f.docente) nombres.add(f.docente); });
      });
      return [...nombres];
    });

    const rows = cohortes.map((m, i) => {
      const inscritos = inscritosPorCohorte[i];
      const docentes = docentesPorCohorte[i];
      const pct = m.cupos ? Math.min(100, Math.round((inscritos / m.cupos) * 100)) : 0;
      const llena = m.cupos && inscritos >= m.cupos;
      const esSeleccionada = horarioState.cohorte === m.nombre;
      return `
      <tr onclick="seleccionarCohorteHorario('${escapeHtml(m.nombre)}')" data-search="${escapeHtml((m.nombre + ' ' + m.modulo + ' ' + docentes.join(' ')).toLowerCase())}" class="cursor-pointer transition border-b border-gray-50 last:border-0 ${esSeleccionada ? 'bg-morado/10 font-medium' : 'hover:bg-gray-50/80'}" title="Clic para ver horario de ${escapeHtml(m.nombre)}">
        <td class="py-3 px-4 text-sm font-semibold text-ink flex items-center gap-2">
          ${esSeleccionada ? `<span class="w-2 h-2 rounded-full bg-morado animate-pulse"></span>` : ''}
          ${escapeHtml(m.nombre)}
        </td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(m.fechaInicio)} – ${fmtDate(m.fechaFin)}</td>
        <td class="py-3 px-4 text-sm text-slate2 min-w-[110px]">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div class="h-full ${llena ? 'bg-coral' : 'bg-morado'}" style="width:${pct}%"></div></div>
            <span class="text-xs shrink-0">${inscritos}/${m.cupos}</span>
          </div>
        </td>
        <td class="py-3 px-4">${statusPill(m.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
          <button onclick="openModal('modulos','${m.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('modulos','${m.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-modulos').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">Horario</h2>
            <p class="text-sm text-slate2 mt-0.5">Elige una cohorte y un mes: la grilla aparece automáticamente para asignar materia y docente en cada franja.</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="horarioCohorteSelect">Cohorte</label>
            <select id="horarioCohorteSelect" onchange="onCambiaHorarioCohorte()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option value="">Selecciona una cohorte...</option>
              ${cohortes.map(c => `<option value="${escapeHtml(c.nombre)}" ${horarioState.cohorte === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="horarioMesSelect">Mes</label>
            <select id="horarioMesSelect" onchange="onCambiaHorarioMes()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" ${horarioState.cohorte ? '' : 'disabled'}>
              <option value="">Selecciona un mes...</option>
            </select>
          </div>
          <div class="flex items-end pb-1">
            <label class="inline-flex items-center gap-2 text-sm text-slate2 select-none">
              <input id="horarioSabadoCheck" type="checkbox" onchange="onToggleHorarioSabado()" class="w-4 h-4 rounded border-gray-300 text-morado focus:ring-morado/30" ${horarioState.incluyeSabado ? 'checked' : ''} />
              Incluir sábado <span class="text-slate2/70">(opcional)</span>
            </label>
          </div>
        </div>
        <div id="horarioGridWrap" class="mt-5"></div>
      </div>

      <div class="admin-panel-card p-6">
        ${sectionHeader('modulos', 'Cohortes registradas', cohortes.length + ' cohortes del Training de 100 a 1000+')}
        <div class="overflow-x-auto">
          <table id="table-modulos" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Fechas</th><th class="py-2.5 px-4">Cupos</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;

    await poblarMesesHorario();
    await renderHorarioGrid();
  }

  async function seleccionarCohorteHorario(nombre) {
    horarioState.cohorte = nombre;
    const sel = document.getElementById('horarioCohorteSelect');
    if (sel) sel.value = nombre;
    await poblarMesesHorario();
    await renderHorarioGrid();
    document.getElementById('horarioCohorteSelect')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  window.seleccionarCohorteHorario = seleccionarCohorteHorario;

  // async: 'modulos' vía MySQL.
  async function poblarMesesHorario() {
    const mesSelect = document.getElementById('horarioMesSelect');
    if (!mesSelect) return;
    if (!horarioState.cohorte) {
      mesSelect.innerHTML = '<option value="">Selecciona un mes...</option>';
      mesSelect.disabled = true;
      return;
    }
    const cohorte = (await Store.list('modulos')).find(c => c.nombre === horarioState.cohorte);
    const opciones = generarOpcionesMes(cohorte);
    if (!horarioState.mes && opciones.length > 0) {
      horarioState.mes = opciones[0].value;
    }
    mesSelect.disabled = false;
    mesSelect.innerHTML = '<option value="">Selecciona un mes...</option>' +
      opciones.map(o => `<option value="${o.value}" ${horarioState.mes === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
  }

  function onCambiaHorarioCohorte() {
    const sel = document.getElementById('horarioCohorteSelect');
    horarioState.cohorte = sel.value || null;
    horarioState.mes = null;
    horarioState.incluyeSabado = false;
    poblarMesesHorario();
    renderHorarioGrid();
  }

  // async: getHorario ahora es async.
  async function onCambiaHorarioMes() {
    const sel = document.getElementById('horarioMesSelect');
    horarioState.mes = sel.value || null;
    const existente = (horarioState.cohorte && horarioState.mes) ? await getHorario(horarioState.cohorte, horarioState.mes) : null;
    horarioState.incluyeSabado = existente ? !!existente.incluyeSabado : false;
    const chk = document.getElementById('horarioSabadoCheck');
    if (chk) chk.checked = horarioState.incluyeSabado;
    renderHorarioGrid();
  }

  function onToggleHorarioSabado() {
    const chk = document.getElementById('horarioSabadoCheck');
    horarioState.incluyeSabado = chk.checked;
    renderHorarioGrid();
  }

  // Color de acento por estado, para la barra lateral de cada tarjeta de franja.
  const FRANJA_ESTADO_COLOR = { Activo: '#1FC8C0', Inactivo: '#5B6472' };

  // async: getHorario ahora es async.
  async function renderHorarioGrid(preservarForm = false) {
    const wrap = document.getElementById('horarioGridWrap');
    if (!wrap) return;
    if (!horarioState.cohorte || !horarioState.mes) {
      wrap.innerHTML = `<p class="text-sm text-slate2 text-center py-10 border border-dashed border-gray-200 rounded-2xl">Selecciona una cohorte y un mes para gestionar su horario.</p>`;
      return;
    }
    const existente = await getHorario(horarioState.cohorte, horarioState.mes);
    const franjas = existente && existente.franjas ? existente.franjas : [];
    const dias = horarioState.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const totalHorasActivas = franjasActivas(existente).reduce((acc, f) => acc + horasFranja(f), 0);

    // Vista tipo agenda: una columna por día, franjas ordenadas por hora de
    // inicio dentro de cada columna, como tarjetas compactas con semejanza de color
    // según el código de vestimenta de la cohorte.
    const configCamisa = getColoresCamisaCohorte(horarioState.cohorte);

    const columnas = dias.map(dia => {
      const franjasDelDia = franjas
        .filter(f => f.dia === dia)
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      const horasDelDia = franjasDelDia.filter(f => f.estado !== 'Inactivo').reduce((acc, f) => acc + horasFranja(f), 0);

      const colorCamisa = configCamisa[dia] || COLORES_CAMISA_DEFAULT[dia] || 'Blanco';
      const infoCamisa = COLORES_CAMISA_INFO[colorCamisa] || COLORES_CAMISA_INFO['Blanco'];

      const tarjetas = franjasDelDia.map(f => {
        const inactiva = f.estado === 'Inactivo';
        return `
          <div class="horario-franja-card rounded-2xl bg-white border border-gray-200/80 p-3.5 mb-2.5 shadow-2xs hover:shadow-sm transition ${inactiva ? 'opacity-55' : ''}" style="border-left:4px solid ${infoCamisa.franjaBorder};">
            <div class="flex items-start justify-between gap-2">
              <p class="text-xs font-bold text-ink leading-snug">${escapeHtml(f.curso || '(sin curso)')}</p>
              <button onclick="eliminarFranjaHorario('${f.id}')" title="Eliminar franja" class="text-slate2 hover:text-coral transition shrink-0 -mt-0.5 -mr-0.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-1.5 font-medium">
              <svg class="w-3 h-3 text-slate2/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/></svg>
              <span>${f.inicio} – ${f.fin} · <strong class="text-ink font-semibold">${horasFranja(f)} h</strong></span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-1">
              <svg class="w-3 h-3 text-slate2/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span class="truncate">${f.docente ? escapeHtml(f.docente) : '<span class="italic text-slate2/70">Sin trainer asignado</span>'}</span>
            </div>
            <div class="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-gray-100">
              <button onclick="toggleEstadoFranjaHorario('${f.id}')" class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full cursor-pointer transition ${inactiva ? 'bg-gray-100 text-slate2' : 'bg-turquesa/10 text-turquesa border border-turquesa/20'}">
                ${f.estado || 'Activo'}
              </button>
              <span class="text-[10px] font-semibold text-slate2 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full ${infoCamisa.swatchClass}"></span>
                ${escapeHtml(infoCamisa.nombre)}
              </span>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="horario-dia-col rounded-2xl p-3 border border-gray-200/70 shadow-2xs flex flex-col" style="background:${infoCamisa.franjaBg};">
          <div class="flex flex-col gap-1.5 mb-2.5 pb-2 border-b border-gray-200/60">
            <div class="flex items-center justify-between gap-1">
              <p class="text-xs font-extrabold uppercase tracking-wider text-ink">${dia}</p>
              <span class="text-[10px] font-bold text-slate2 bg-white/85 px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">${horasDelDia} h</span>
            </div>
            <div class="w-full flex">
              ${badgeCamisaDia(dia, horarioState.cohorte)}
            </div>
          </div>
          <div class="flex-1">
            ${tarjetas || '<div class="p-4 text-center rounded-xl bg-white/70 border border-dashed border-gray-200 text-[11px] text-slate2/70 italic">Sin clases</div>'}
          </div>
        </div>`;
    }).join('');

    // Si se pide preservar el formulario abierto y el contenedor de columnas ya existe en DOM,
    // refrescamos solo los datos sin destruir ni parpadear el formulario abierto.
    const gridColsContainer = document.getElementById('horarioGridColumnsContainer');
    if (preservarForm && gridColsContainer) {
      const statsText = document.getElementById('horarioStatsText');
      if (statsText) {
        statsText.innerHTML = `<span class="font-bold text-ink">${franjasActivas(existente).length}</span> franja${franjasActivas(existente).length === 1 ? '' : 's'} activa${franjasActivas(existente).length === 1 ? '' : 's'} · <span class="font-bold text-ink">${totalHorasActivas} horas</span> semanales`;
      }
      gridColsContainer.innerHTML = columnas;
      return;
    }

    wrap.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/70">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-turquesa"></span>
          <p id="horarioStatsText" class="text-xs text-slate2">
            <span class="font-bold text-ink">${franjasActivas(existente).length}</span> franja${franjasActivas(existente).length === 1 ? '' : 's'} activa${franjasActivas(existente).length === 1 ? '' : 's'} · <span class="font-bold text-ink">${totalHorasActivas} horas</span> semanales
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button type="button" onclick="abrirModalColoresCamisa('${escapeHtml(horarioState.cohorte)}')" title="Configurar qué color de camisa corresponde a cada día para esta cohorte" class="rounded-full border border-morado/30 text-morado bg-morado/5 hover:bg-morado/15 text-xs font-bold px-3.5 py-2 transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5l2.5 2.5h2.5l2.5 4.5-2.5 2-1-1v8h-8v-8l-1 1-2.5-2 2.5-4.5h2.5L12 4.5z" />
            </svg>
            <span>Código de vestimenta</span>
          </button>
          <button onclick="descargarPlantillaCSVHorario()" title="Descargar plantilla CSV" class="rounded-full border border-gray-200 bg-white text-slate2 hover:text-ink text-xs font-semibold px-3 py-2 transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
            <span>Plantilla</span>
          </button>
          <button onclick="document.getElementById('horarioCsvInput').click()" title="Subir CSV de franjas" class="rounded-full border border-gray-200 bg-white text-slate2 hover:text-ink text-xs font-semibold px-3 py-2 transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21V9m0 0l-4 4m4-4l4 4M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2"/></svg>
            <span>Subir CSV</span>
          </button>
          <input id="horarioCsvInput" type="file" accept=".csv,text/csv" class="hidden" onchange="onSeleccionaCSVHorario(event)" />
          <button onclick="abrirFormFranjaHorario()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white text-xs font-bold px-4 py-2 hover:opacity-90 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>Añadir franja</span>
          </button>
        </div>
      </div>
      <div id="horarioFormFranjaWrap" class="mb-4"></div>
      <div id="horarioCsvResultWrap" class="mb-4"></div>
      <div class="overflow-x-auto pb-3 -mx-1 px-1">
        <div id="horarioGridColumnsContainer" class="grid gap-3 min-w-[780px]" style="grid-template-columns:repeat(${dias.length}, minmax(180px, 1fr))">
          ${columnas}
        </div>
      </div>`;
  }

  function setHorarioRapido(inicio, fin) {
    const i = document.getElementById('ff_inicio');
    const f = document.getElementById('ff_fin');
    if (i) i.value = inicio;
    if (f) f.value = fin;
  }
  window.setHorarioRapido = setHorarioRapido;

  let horarioFormAbierto = false;

  function cerrarFormFranjaHorario() {
    horarioFormAbierto = false;
    const wrap = document.getElementById('horarioFormFranjaWrap');
    if (wrap) wrap.innerHTML = '';
  }
  window.cerrarFormFranjaHorario = cerrarFormFranjaHorario;

  // Formulario inline para añadir una franja nueva — fácil, rápido y filtrado
  // por los profesores asignados a la cohorte actual.
  async function abrirFormFranjaHorario() {
    horarioFormAbierto = true;
    const cohorteActual = horarioState.cohorte;
    const dias = horarioState.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const cursos = (await Store.list('cursos')).filter(c => c.estado === 'Activo');
    const todosDocentes = (await Store.list('usuarios')).filter(u => u.rol === 'Docente');

    // FILTRO: Solo traer los profesores asignados a esa cohorte
    const docentesDeCohorte = todosDocentes.filter(u => u.cohorte === cohorteActual);
    const listaDocentes = docentesDeCohorte.length > 0 ? docentesDeCohorte : todosDocentes;

    const badgeFiltroDocente = docentesDeCohorte.length > 0
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-turquesa bg-turquesa/10 border border-turquesa/20 px-2.5 py-0.5 rounded-full"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ${docentesDeCohorte.length} profesor${docentesDeCohorte.length === 1 ? '' : 'es'} de ${escapeHtml(cohorteActual)}</span>`
      : `<span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate2 bg-gray-100 px-2 py-0.5 rounded-full">Sin profesores vinculados a esta cohorte (mostrando lista general)</span>`;

    const wrapForm = document.getElementById('horarioFormFranjaWrap');
    if (!wrapForm) return;

    wrapForm.innerHTML = `
      <div class="rounded-2xl border border-morado/20 p-5 bg-gradient-to-b from-white to-gray-50/70 shadow-soft animate-in fade-in duration-150">
        <div class="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-gray-100">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-morado">Nueva Franja de Clase</h4>
            <p class="text-[11px] text-slate2 mt-0.5">Asigna materia, docente y horario para <strong class="text-ink">${escapeHtml(cohorteActual)}</strong>. Se mantendrá abierto para agregar la siguiente fácilmente.</p>
          </div>
          ${badgeFiltroDocente}
        </div>

        <div class="grid sm:grid-cols-5 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate2 mb-1">Día principal</label>
            <select id="ff_dia" class="w-full rounded-xl border border-morado/25 bg-white px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              ${dias.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate2 mb-1">Curso / Materia</label>
            <select id="ff_curso" class="w-full rounded-xl border border-morado/25 bg-white px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option value="">Selecciona curso...</option>
              ${cursos.map(c => `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate2 mb-1">Profesor / Docente</label>
            <select id="ff_docente" class="w-full rounded-xl border border-morado/25 bg-white px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option value="">— Sin asignar —</option>
              ${listaDocentes.map(d => `<option value="${escapeHtml(d.nombre)}">${escapeHtml(d.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate2 mb-1">Hora Inicio</label>
            <input id="ff_inicio" type="time" value="08:00" class="w-full rounded-xl border border-morado/25 bg-white px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate2 mb-1">Hora Fin</label>
            <input id="ff_fin" type="time" value="10:00" class="w-full rounded-xl border border-morado/25 bg-white px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
        </div>

        <!-- Atajos de horas frecuentes para creación ultra-rápida -->
        <div class="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-gray-100 flex-wrap">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate2 mr-1">Atajos de horario:</span>
          <button type="button" onclick="setHorarioRapido('08:00','10:00')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">08:00–10:00 (2h)</button>
          <button type="button" onclick="setHorarioRapido('10:00','12:00')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">10:00–12:00 (2h)</button>
          <button type="button" onclick="setHorarioRapido('14:00','16:00')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-turquesa/15 text-turquesa hover:bg-turquesa hover:text-white transition cursor-pointer">14:00–16:00 (2h)</button>
          <button type="button" onclick="setHorarioRapido('16:00','18:00')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-turquesa/15 text-turquesa hover:bg-turquesa hover:text-white transition cursor-pointer">16:00–18:00 (2h)</button>
          <button type="button" onclick="setHorarioRapido('08:00','12:00')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer">08:00–12:00 (4h)</button>
        </div>

        <!-- Replicar en días adicionales para no repetir el proceso -->
        <div class="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-gray-100 flex-wrap">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[11px] font-bold text-ink">Replicar también en:</span>
            ${dias.map(d => `
              <label class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate2 hover:text-ink cursor-pointer select-none">
                <input type="checkbox" name="ff_dias_extra" value="${d}" class="w-3.5 h-3.5 rounded border-gray-300 text-morado focus:ring-morado/30">
                <span>${d}</span>
              </label>
            `).join('')}
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="cerrarFormFranjaHorario()" class="rounded-full border border-gray-200 text-slate2 hover:bg-gray-100 text-xs font-semibold px-4 py-2 transition cursor-pointer">Listo / Cerrar</button>
            <button type="button" onclick="guardarNuevaFranjaHorario()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white text-xs font-bold px-5 py-2 hover:opacity-90 shadow-sm transition cursor-pointer flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span>Guardar y continuar</span>
            </button>
          </div>
        </div>

        <div id="ff_feedback" class="hidden"></div>
      </div>`;
  }

  function franjasSeSolapan(inicioA, finA, inicioB, finB) {
    const a1 = minutosDesdeHora(inicioA), a2 = minutosDesdeHora(finA);
    const b1 = minutosDesdeHora(inicioB), b2 = minutosDesdeHora(finB);
    return a1 < b2 && b1 < a2;
  }

  // async: 'horarios' vía MySQL. Guarda franja principal y opcionalmente días adicionales seleccionados.
  // Mantiene el formulario abierto y avanza automáticamente las horas para que sea fácil agregar más franjas.
  async function guardarNuevaFranjaHorario() {
    if (!horarioState.cohorte || !horarioState.mes) { toast('Selecciona una cohorte y un mes primero', 'err'); return; }
    const diaPrincipal = document.getElementById('ff_dia').value;
    const curso = document.getElementById('ff_curso').value;
    const docente = document.getElementById('ff_docente').value;
    const inicio = document.getElementById('ff_inicio').value;
    const fin = document.getElementById('ff_fin').value;

    if (!curso) { toast('Selecciona un curso', 'err'); return; }
    if (!inicio || !fin) { toast('Completa hora de inicio y fin', 'err'); return; }
    if (minutosDesdeHora(fin) <= minutosDesdeHora(inicio)) { toast('La hora de fin debe ser después de la hora de inicio', 'err'); return; }

    // Días a crear: el principal + los marcados en checkboxes adicionales
    const diasSeleccionados = new Set([diaPrincipal]);
    document.querySelectorAll('input[name="ff_dias_extra"]:checked').forEach(cb => {
      if (cb.value) diasSeleccionados.add(cb.value);
    });
    const listaDias = Array.from(diasSeleccionados);

    const registros = await Store.list('horarios');

    // Validación de solapamiento para cada día elegido
    if (docente) {
      for (const d of listaDias) {
        const conflicto = registros
          .filter(h => h.mes === horarioState.mes)
          .flatMap(h => (h.franjas || []))
          .filter(f => f.estado !== 'Inactivo')
          .find(f =>
            f.docente === docente &&
            f.dia === d &&
            franjasSeSolapan(inicio, fin, f.inicio, f.fin)
          );
        if (conflicto) {
          toast(`${docente} ya tiene clase el ${d} de ${conflicto.inicio} a ${conflicto.fin} este mes. Elige otro horario o desmarca ese día.`, 'err');
          return;
        }
      }
    }

    let idx = registros.findIndex(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    if (idx === -1) {
      registros.push({ id: uid('ho'), cohorte: horarioState.cohorte, mes: horarioState.mes, incluyeSabado: horarioState.incluyeSabado, franjas: [] });
      idx = registros.length - 1;
    }
    registros[idx].franjas = registros[idx].franjas || [];

    for (const d of listaDias) {
      const nuevaFranja = { id: uid('fr'), dia: d, curso, docente, inicio, fin, estado: 'Activo' };
      registros[idx].franjas.push(nuevaFranja);
      await registrarAuditoriaHorario(horarioState.cohorte, horarioState.mes, franjaLabel(nuevaFranja), 'Franja creada', '', curso + (docente ? ' · ' + docente : ''));
    }

    registros[idx].incluyeSabado = horarioState.incluyeSabado;
    await Store.save('horarios', registros);

    toast(`Se guardaron ${listaDias.length} franja${listaDias.length === 1 ? '' : 's'} en el horario`, 'ok');

    // Auto-avanzar horario y limpiar materia para permitir ingresar la siguiente franja de inmediato
    const duracionMin = Math.max(60, minutosDesdeHora(fin) - minutosDesdeHora(inicio));
    const nuevoInicioMin = minutosDesdeHora(fin);
    const nuevoFinMin = Math.min(22 * 60, nuevoInicioMin + duracionMin);

    const pad = n => String(n).padStart(2, '0');
    const proximoInicio = `${pad(Math.floor(nuevoInicioMin / 60))}:${pad(nuevoInicioMin % 60)}`;
    const proximoFin = `${pad(Math.floor(nuevoFinMin / 60))}:${pad(nuevoFinMin % 60)}`;

    const elInicio = document.getElementById('ff_inicio');
    const elFin = document.getElementById('ff_fin');
    const elCurso = document.getElementById('ff_curso');
    const elFeedback = document.getElementById('ff_feedback');

    if (elInicio && elFin && nuevoInicioMin < 22 * 60) {
      elInicio.value = proximoInicio;
      elFin.value = proximoFin;
    }
    if (elCurso) {
      elCurso.value = '';
      elCurso.focus();
    }
    document.querySelectorAll('input[name="ff_dias_extra"]:checked').forEach(cb => { cb.checked = false; });

    if (elFeedback) {
      elFeedback.className = 'mt-3 pt-2.5 border-t border-gray-100 animate-in fade-in duration-200 block';
      elFeedback.innerHTML = `
        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>Franja <strong>${diaPrincipal} ${inicio}–${fin} (${escapeHtml(curso)})</strong> guardada. Horario sugerido avanzado a <strong>${proximoInicio}–${proximoFin}</strong>. Puedes ingresar la siguiente.</span>
          </div>
          <button type="button" onclick="cerrarFormFranjaHorario()" class="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0">Listo / Terminar</button>
        </div>`;
    }

    // Refrescar grilla de franjas preservando el formulario abierto
    await renderHorarioGrid(true);
    if (panelActivoAdmin === 'usuarios' && RENDERERS['usuarios']) RENDERERS['usuarios']();
  }

  // Estado Activo/Inactivo en vez de eliminar: una franja Inactiva deja de
  // contar para la carga del docente, la vista del estudiante, etc. (ver
  // franjasActivas()), pero queda en el historial de ese horario.
  // async: 'horarios' vía MySQL.
  async function toggleEstadoFranjaHorario(franjaId) {
    const registros = await Store.list('horarios');
    const horario = registros.find(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    if (!horario) return;
    const franja = (horario.franjas || []).find(f => f.id === franjaId);
    if (!franja) return;
    const estadoAnterior = franja.estado || 'Activo';
    franja.estado = estadoAnterior === 'Activo' ? 'Inactivo' : 'Activo';
    await Store.save('horarios', registros);
    await registrarAuditoriaHorario(horarioState.cohorte, horarioState.mes, franjaLabel(franja), 'Estado', estadoAnterior, franja.estado);
    const formAbierto = !!document.getElementById('horarioFormFranjaWrap')?.querySelector('#ff_dia');
    await renderHorarioGrid(formAbierto);
    if (panelActivoAdmin === 'usuarios' && RENDERERS['usuarios']) RENDERERS['usuarios']();
  }

  // async: 'horarios' vía MySQL.
  async function eliminarFranjaHorario(franjaId) {
    const registros = await Store.list('horarios');
    const horario = registros.find(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    if (!horario) return;
    const franja = (horario.franjas || []).find(f => f.id === franjaId);
    horario.franjas = (horario.franjas || []).filter(f => f.id !== franjaId);
    await Store.save('horarios', registros);
    if (franja) await registrarAuditoriaHorario(horarioState.cohorte, horarioState.mes, franjaLabel(franja), 'Franja eliminada', franja.curso, '');
    toast('Franja eliminada', 'ok');
    const formAbierto = !!document.getElementById('horarioFormFranjaWrap')?.querySelector('#ff_dia');
    await renderHorarioGrid(formAbierto);
    // Solo si el panel Usuarios es el que se está viendo ahora mismo:
    // refresca la columna "materias · horas" de los docentes, que se
    // calcula a partir del Horario. Si el admin está en otro panel (lo
    // más común al editar el Horario), no tiene sentido gastar esa
    // consulta extra en una tabla que ni siquiera se está mostrando.
    if (panelActivoAdmin === 'usuarios' && RENDERERS['usuarios']) RENDERERS['usuarios']();
  }

  // ---------- HORARIO: carga masiva de franjas por CSV ----------
  // Complementa el alta manual (abrirFormFranjaHorario/guardarNuevaFranjaHorario):
  // sube varias franjas a la vez para la Cohorte/Mes ya seleccionados arriba.
  // Validación todo-o-nada: si cualquier fila falla, no se guarda ninguna —
  // se listan todos los errores encontrados para que el usuario corrija el
  // archivo y lo vuelva a subir.
  //
  // Separador ";" (no ","): Excel en español interpreta "," como separador
  // decimal, así que un CSV separado por comas abierto con doble clic cae
  // todo en la columna A. ";" es el separador que Excel en configuración
  // regional español espera por defecto, y así cada dato cae en su propia
  // columna al abrirlo directamente.
  const HORARIO_CSV_HEADERS = ['dia', 'curso', 'docente', 'inicio', 'fin'];
  const HORARIO_CSV_SEP = ';';

  // Excel auto-formatea columnas que "parecen hora" a su propio formato
  // regional al escribir en ellas (ej. "13:00" se convierte en
  // "1:00:00 p. m." al guardar como CSV). Esta función acepta esos
  // formatos además del HH:MM esperado, y siempre devuelve HH:MM de 24h —
  // así el resto de la validación no tiene que conocer estos casos.
  // Formatos aceptados: "13:00", "8:00", "1:00:00 p.m.", "1:00 pm",
  // "13:00:00", "08:00 a. m.".
  function normalizarHoraCSV(valor) {
    if (!valor) return null;
    const v = valor.trim().toLowerCase()
      .replace(/\./g, '')      // "p.m." / "a. m." -> "pm" / "a m"
      .replace(/\s+/g, ' ')
      .trim();

    // HH:MM o HH:MM:SS en 24h (ya en el formato esperado, o con segundos).
    let m = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m && !/[ap] ?m$/.test(v)) {
      const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
      if (h <= 23 && min <= 59) return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
      return null;
    }

    // HH:MM[:SS] am/pm (formato de 12h que Excel genera para "hora").
    m = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|a m|p m)$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const esPM = m[3].startsWith('p');
      if (h < 1 || h > 12 || min > 59) return null;
      if (h === 12) h = 0;
      if (esPM) h += 12;
      return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
    }

    return null; // formato irreconocible
  }


  function descargarPlantillaCSVHorario() {
    const dias = horarioState.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const filas = [
      HORARIO_CSV_HEADERS,
      ['Lunes', 'Nombre exacto del curso', 'Nombre exacto del docente', '08:00', '10:00'],
      ['Martes', 'Nombre exacto del curso', '', '10:00', '12:00'],
    ];
    const rows = filas.map(fila => fila.map(v => `"${v}"`).join(HORARIO_CSV_SEP));
    const comentario = `"# Dias validos: ${dias.join(', ')}. Formato de hora: HH:MM (24h). El curso debe existir tal cual en el panel Cursos. El docente es opcional, dejalo vacio si no aplica."`;
    // BOM UTF-8 al inicio: sin esto, Excel abre el archivo asumiendo otra
    // codificación y las tildes/eñes se ven como caracteres corruptos.
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + rows.join('\n') + '\n' + comentario], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_horario.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Plantilla CSV descargada', 'ok');
  }

  // Parser CSV: soporta "," y ";" como separador (Excel en español exporta
  // con ";"; muchas otras herramientas usan ","), y comillas dobles
  // alrededor de campos. Ignora líneas vacías y líneas que empiezan con
  // "#" (comentarios, como la que agrega descargarPlantillaCSVHorario al
  // final del archivo). Detecta el separador real mirando la línea de
  // encabezado, para no mezclar ambos dentro del mismo archivo.
  function parsearFilasCSV(texto) {
    const limpio = texto.replace(/^\uFEFF/, ''); // quita el BOM si viene de nuestra propia plantilla
    const lineas = limpio.split(/\r\n|\n|\r/).filter(l => l.trim() !== '' && !l.trim().startsWith('#'));
    if (!lineas.length) return [];
    const primeraLinea = lineas[0];
    const sep = (primeraLinea.match(/;/g) || []).length >= (primeraLinea.match(/,/g) || []).length ? ';' : ',';
    return lineas.map(linea => {
      const campos = [];
      let actual = '', dentroComillas = false;
      for (let i = 0; i < linea.length; i++) {
        const ch = linea[i];
        if (ch === '"') { dentroComillas = !dentroComillas; }
        else if (ch === sep && !dentroComillas) { campos.push(actual); actual = ''; }
        else { actual += ch; }
      }
      campos.push(actual);
      return campos.map(c => c.trim());
    });
  }

  function onSeleccionaCSVHorario(evt) {
    const input = evt.target;
    const file = input.files && input.files[0];
    if (!file) return;

    if (!horarioState.cohorte || !horarioState.mes) {
      toast('Selecciona una cohorte y un mes antes de subir el CSV', 'err');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      procesarCSVHorario(String(reader.result || ''));
      input.value = ''; // permite volver a subir el mismo archivo si se corrige y reintenta
    };
    reader.onerror = () => {
      toast('No se pudo leer el archivo', 'err');
      input.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  }

  // async: 'usuarios' vía MySQL.
  async function procesarCSVHorario(textoCSV) {
    const resultWrap = document.getElementById('horarioCsvResultWrap');
    const filas = parsearFilasCSV(textoCSV);
    if (!filas.length) {
      mostrarErroresCSVHorario(['El archivo está vacío.']);
      return;
    }

    // La primera fila debe ser el encabezado esperado (permite validar que
    // no suban un CSV de otro panel por error).
    const encabezado = filas[0].map(h => h.toLowerCase());
    const encabezadoValido = HORARIO_CSV_HEADERS.every((h, i) => encabezado[i] === h);
    if (!encabezadoValido) {
      mostrarErroresCSVHorario([`El encabezado debe ser exactamente: ${HORARIO_CSV_HEADERS.join(', ')}`]);
      return;
    }

    const filasDatos = filas.slice(1);
    if (!filasDatos.length) {
      mostrarErroresCSVHorario(['El archivo no tiene filas de datos, solo el encabezado.']);
      return;
    }

    const dias = horarioState.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const cursosValidos = (await Store.list('cursos')).filter(c => c.estado === 'Activo').map(c => c.nombre);
    const docentesValidos = (await Store.list('usuarios')).filter(u => u.rol === 'Docente').map(u => u.nombre);
    const registros = await Store.list('horarios');
    const horarioExistente = registros.find(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    const franjasExistentesActivas = horarioExistente ? franjasActivas(horarioExistente) : [];

    // Conflictos de docente en TODO el mes (misma regla que el alta manual:
    // cualquier cohorte, no solo la seleccionada): se comparan por
    // solapamiento real de rango de horas, no por coincidencia exacta de
    // hora de inicio — así se detecta también un cruce como "ya tiene
    // 08:00–12:00, esta fila trae 10:00–14:00" o "01:00pm–05:00pm".
    const franjasOcupadasDocenteMes = registros
      .filter(h => h.mes === horarioState.mes)
      .flatMap(h => (h.franjas || []))
      .filter(f => f.estado !== 'Inactivo' && f.docente);

    const errores = [];
    const franjasNuevas = [];
    // Copia mutable: cada franja nueva del CSV que pasa validación se suma
    // aquí también, para detectar conflictos ENTRE filas del propio archivo.
    const franjasParaChequear = franjasOcupadasDocenteMes.slice();

    filasDatos.forEach((campos, idx) => {
      const numFila = idx + 2; // +1 por encabezado, +1 porque las filas se cuentan desde 1
      const [dia, curso, docente, inicio, fin] = campos;

      if (!dia || !curso || !inicio || !fin) {
        errores.push(`Fila ${numFila}: faltan datos obligatorios (día, curso, inicio y fin son requeridos).`);
        return;
      }
      if (!dias.includes(dia)) {
        errores.push(`Fila ${numFila}: "${dia}" no es un día válido para este horario (${dias.join(', ')}).`);
        return;
      }
      if (!cursosValidos.includes(curso)) {
        errores.push(`Fila ${numFila}: el curso "${curso}" no existe en el catálogo de cursos activos.`);
        return;
      }
      if (docente && !docentesValidos.includes(docente)) {
        errores.push(`Fila ${numFila}: el docente "${docente}" no existe o no tiene rol Docente.`);
        return;
      }
      const inicioNorm = normalizarHoraCSV(inicio);
      const finNorm = normalizarHoraCSV(fin);
      if (!inicioNorm || !finNorm) {
        errores.push(`Fila ${numFila}: formato de hora inválido (usa HH:MM, ej. 13:00), inicio="${inicio}" fin="${fin}".`);
        return;
      }
      if (minutosDesdeHora(finNorm) <= minutosDesdeHora(inicioNorm)) {
        errores.push(`Fila ${numFila}: la hora de fin (${finNorm}) debe ser después de la hora de inicio (${inicioNorm}).`);
        return;
      }
      if (docente) {
        const conflicto = franjasParaChequear.find(f =>
          f.docente === docente &&
          f.dia === dia &&
          franjasSeSolapan(inicioNorm, finNorm, f.inicio, f.fin)
        );
        if (conflicto) {
          errores.push(`Fila ${numFila}: ${docente} ya tiene una clase el ${dia} de ${conflicto.inicio} a ${conflicto.fin} en este mes, y se cruza con ${inicioNorm}–${finNorm}.`);
          return;
        }
      }

      const nuevaFranja = { id: uid('fr'), dia, curso, docente: docente || '', inicio: inicioNorm, fin: finNorm, estado: 'Activo' };
      franjasNuevas.push(nuevaFranja);
      if (docente) franjasParaChequear.push(nuevaFranja);
    });

    if (errores.length) {
      mostrarErroresCSVHorario(errores);
      return;
    }

    // Todo-o-nada: solo llegamos aquí si CADA fila pasó todas las validaciones.
    let idx = registros.findIndex(h => h.cohorte === horarioState.cohorte && h.mes === horarioState.mes);
    if (idx === -1) {
      registros.push({ id: uid('ho'), cohorte: horarioState.cohorte, mes: horarioState.mes, incluyeSabado: horarioState.incluyeSabado, franjas: [] });
      idx = registros.length - 1;
    }
    registros[idx].franjas = registros[idx].franjas || [];
    registros[idx].franjas.push(...franjasNuevas);
    registros[idx].incluyeSabado = horarioState.incluyeSabado;
    await Store.save('horarios', registros);

    for (const f of franjasNuevas) {
      await registrarAuditoriaHorario(horarioState.cohorte, horarioState.mes, franjaLabel(f), 'Franja creada por CSV', '', f.curso + (f.docente ? ' · ' + f.docente : ''));
    }

    if (resultWrap) resultWrap.innerHTML = '';
    toast(`${franjasNuevas.length} franja${franjasNuevas.length === 1 ? '' : 's'} añadida${franjasNuevas.length === 1 ? '' : 's'} desde el CSV`, 'ok');
    renderHorarioGrid();
    // Solo si el panel Usuarios es el que se está viendo ahora mismo:
    // refresca la columna "materias · horas" de los docentes, que se
    // calcula a partir del Horario. Si el admin está en otro panel (lo
    // más común al editar el Horario), no tiene sentido gastar esa
    // consulta extra en una tabla que ni siquiera se está mostrando.
    if (panelActivoAdmin === 'usuarios' && RENDERERS['usuarios']) RENDERERS['usuarios']();
  }

  function mostrarErroresCSVHorario(errores) {
    const resultWrap = document.getElementById('horarioCsvResultWrap');
    if (!resultWrap) { toast('El CSV tiene errores — revisa el formato', 'err'); return; }
    resultWrap.innerHTML = `
      <div class="rounded-xl border border-coral/25 bg-coral/5 p-4">
        <p class="text-xs font-bold text-coral mb-2">No se subió ningún dato: el CSV tiene ${errores.length} error${errores.length === 1 ? '' : 'es'}. Corrige el archivo y vuelve a intentarlo.</p>
        <ul class="text-[11px] text-ink/80 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
          ${errores.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
        </ul>
        <button onclick="document.getElementById('horarioCsvResultWrap').innerHTML=''" class="text-[11px] font-semibold text-coral hover:underline mt-3">Cerrar</button>
      </div>`;
    toast('El CSV tiene errores — ninguna franja fue guardada', 'err');
  }

  // ---------- RENDER: Pensum curricular ----------
  // Abre en una pestaña nueva el archivo adjunto de un tema del pensum
  // (guardado como data URL). Usado desde el panel admin y el de estudiante.
  function verArchivoPensum(id) {
    const win = window.open();
    if (!win) { toast('Habilita las ventanas emergentes para ver el archivo', 'err'); return; }
    Store.getArchivo('pensum', id).then(p => {
      if (!p || !p.archivoDatos || p.archivoDatos === '1') {
        win.close();
        toast('Este tema aún no tiene un archivo adjunto disponible', 'info');
        return;
      }
      win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
      win.document.title = p.archivoNombre || p.tema;
    }).catch(() => {
      win.close();
      toast('No se pudo cargar el archivo del pensum', 'err');
    });
  }

  async function renderPensum() {
    const records = [...(await Store.list('pensum'))].sort((a, b) => (a.modulo > b.modulo ? 1 : -1) || (a.orden - b.orden));
    const grouped = {};
    records.forEach(p => { (grouped[p.modulo] = grouped[p.modulo] || []).push(p); });

    const groupsHtml = Object.keys(grouped).length ? Object.keys(grouped).map(mod => `
      <div class="mb-5 last:mb-0">
        <p class="text-xs font-bold uppercase tracking-wide text-morado mb-2">${escapeHtml(mod)}</p>
        <div class="rounded-xl border border-gray-100 divide-y divide-gray-50">
          ${grouped[mod].map(p => `
            <div data-search="${escapeHtml((p.modulo + ' ' + p.tema + ' ' + p.docente).toLowerCase())}" class="flex items-center gap-3 px-4 py-3">
              <span class="w-6 h-6 rounded-full bg-gray-100 text-slate2 text-xs font-bold grid place-items-center shrink-0">${p.orden}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">${escapeHtml(p.tema)}</p>
                <p class="text-xs text-slate2">${escapeHtml(p.docente || '—')} · ${p.horas} h${p.archivoNombre ? ' · ' + ICON_CLIP_SVG + escapeHtml(p.archivoNombre) : ''}</p>
              </div>
              ${p.archivoDatos ? `<button onclick="verArchivoPensum('${p.id}')" class="text-xs font-semibold text-turquesa hover:underline mr-3">Ver archivo</button>` : ''}
              <button onclick="openModal('pensum','${p.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
              <button onclick="askDelete('pensum','${p.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
            </div>`).join('')}
        </div>
      </div>`).join('') : `<p class="text-sm text-slate2 text-center py-10">Aún no hay temas curriculares. Haz clic en "Nuevo" para crear el primero.</p>`;

    document.getElementById('mount-pensum').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('pensum', 'Pensum curricular', records.length + ' temas distribuidos por módulo', null, true, ['archivoDatos'])}
        <div id="table-pensum">${groupsHtml}</div>
      </div>`;
  }

  // ---------- Semáforo de riesgo — 100% AUTOMÁTICO ----------
  // Ya no admite ajustes manuales: el riesgo se calcula siempre a partir de
  // datos reales de la plataforma —
  //   - Promedio: promedioGeneralEstudianteCohorte() (Etapa 5), la misma
  //     fuente que ve Administración en el panel Calificaciones.
  //   - Asistencia: % real de "Presente" sobre el total de registros en
  //     Store('asistencia') para ese estudiante (la misma fuente que ve el
  //     estudiante en su propio panel y el Trainee en su historial).
  // Un estudiante sin notas o sin registros de asistencia aún no entra en
  // "Rojo/Amarillo" por falta de datos — queda en Verde hasta que haya
  // suficiente información real para evaluarlo.
  // async: 'usuarios' vía MySQL + promedioGeneralEstudianteCohorte() (que
  // también es async, usa 'horarios' vía MySQL) resueltos con Promise.all
  // computeSemaforo: cálculo optimizado en servidor MySQL (/api/semaforo) en ~7ms.
  // Cuenta con fallback resiliente a cálculo local si el backend está temporalmente inaccesible.
  async function computeSemaforo(cohorteFiltro = '') {
    try {
      const q = cohorteFiltro ? ('?cohorte=' + encodeURIComponent(cohorteFiltro)) : '';
      const datos = await Store.list('semaforo' + q);
      if (Array.isArray(datos) && datos.length > 0) {
        return datos;
      }
    } catch (e) {
      console.warn('[computeSemaforo] Fallback a cálculo local:', e.message);
    }

    const usuarios = (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && (!cohorteFiltro || u.cohorte === cohorteFiltro));
    const asistenciaTodos = await Store.list('asistencia');
    const cfg = (await Store.get('configuracion')) || SEED.configuracion;

    // Optimización: indexar asistencia por estudiante O(N) para evitar O(S x A)
    const asistenciaMap = new Map();
    for (const a of asistenciaTodos) {
      if (!a.estudiante) continue;
      let rec = asistenciaMap.get(a.estudiante);
      if (!rec) {
        rec = { total: 0, presentes: 0 };
        asistenciaMap.set(a.estudiante, rec);
      }
      rec.total++;
      if (a.estado === 'Presente') rec.presentes++;
    }

    const resultadosPromedio = await Promise.all(usuarios.map(u => u.cohorte ? promedioGeneralEstudianteCohorte(u.nombre, u.cohorte, null) : null));

    return usuarios.map((u, i) => {
      const resultado = resultadosPromedio[i];
      const promedio = resultado ? resultado.promedio : null;

      const asoc = asistenciaMap.get(u.nombre);
      const asistencia = (asoc && asoc.total > 0) ? Math.round((asoc.presentes / asoc.total) * 100) : null;

      let riesgo = 'Verde';
      const promedioBajo = promedio !== null && promedio < NOTA_MINIMA_APROBACION;
      const promedioAlerta = promedio !== null && promedio < NOTA_MINIMA_APROBACION + 0.5;
      const asistenciaBaja = asistencia !== null && asistencia < cfg.asistenciaMinima;
      const asistenciaAlerta = asistencia !== null && asistencia < cfg.asistenciaMinima + 10;
      if (promedioBajo || asistenciaBaja) riesgo = 'Rojo';
      else if (promedioAlerta || asistenciaAlerta) riesgo = 'Amarillo';

      return {
        id: u.id, nombre: u.nombre, cohorte: u.cohorte,
        promedio: promedio !== null ? promedio.toFixed(1) : '—',
        asistencia: asistencia !== null ? asistencia : '—',
        riesgo,
        motivo: promedioBajo ? 'Promedio bajo el mínimo' : asistenciaBaja ? 'Asistencia bajo el mínimo' : (promedioAlerta || asistenciaAlerta) ? 'Cerca del mínimo' : ''
      };
    });
  }

  let semaforoCohorteFiltro = '';
  let semaforoRiesgoFiltro = 'todos'; // 'todos' | 'Rojo' | 'Amarillo' | 'Verde'

  async function cambiarFiltroSemaforoCohorte(cohorte) {
    semaforoCohorteFiltro = cohorte || '';
    await renderSemaforo();
  }
  window.cambiarFiltroSemaforoCohorte = cambiarFiltroSemaforoCohorte;

  async function cambiarFiltroSemaforoRiesgo(riesgo) {
    semaforoRiesgoFiltro = riesgo || 'todos';
    await renderSemaforo();
  }
  window.cambiarFiltroSemaforoRiesgo = cambiarFiltroSemaforoRiesgo;

  async function renderSemaforo() {
    const [data, modulos] = await Promise.all([computeSemaforo(), Store.list('modulos')]);
    const riesgoColor = { Verde: { bg: '#1FC8C01A', text: '#0f8f89', dot: '#1FC8C0' }, Amarillo: { bg: '#F5A6231A', text: '#b5790f', dot: '#F5A623' }, Rojo: { bg: '#F0455C1A', text: '#F0455C', dot: '#F0455C' } };

    // Lista ordenada de cohortes únicas disponibles
    const cohortes = Array.from(new Set([
      ...modulos.map(m => m.nombre).filter(Boolean),
      ...data.map(s => s.cohorte).filter(Boolean)
    ])).sort();

    // Si el filtro seleccionado ya no existe en el sistema, reiniciar
    if (semaforoCohorteFiltro && !cohortes.includes(semaforoCohorteFiltro)) {
      semaforoCohorteFiltro = '';
    }

    const dataFiltradaCohorte = semaforoCohorteFiltro
      ? data.filter(s => s.cohorte === semaforoCohorteFiltro)
      : data;

    const enRiesgo = dataFiltradaCohorte.filter(s => s.riesgo === 'Rojo').length;
    const enAlerta = dataFiltradaCohorte.filter(s => s.riesgo === 'Amarillo').length;
    const enVerde = dataFiltradaCohorte.filter(s => s.riesgo === 'Verde').length;

    const dataFiltrada = semaforoRiesgoFiltro === 'todos'
      ? dataFiltradaCohorte
      : dataFiltradaCohorte.filter(s => s.riesgo === semaforoRiesgoFiltro);

    const rows = dataFiltrada.map(s => `
      <tr data-search="${escapeHtml((s.nombre + ' ' + (s.cohorte || '') + ' ' + s.riesgo + ' ' + (s.motivo || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">
          <span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${riesgoColor[s.riesgo].dot}"></span>${escapeHtml(s.nombre)}
        </td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.cohorte || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2 font-mono">${s.promedio}</td>
        <td class="py-3 px-4 text-sm text-slate2 font-mono">${s.asistencia === '—' ? '—' : s.asistencia + '%'}</td>
        <td class="py-3 px-4">
          <span class="text-xs font-semibold rounded-full px-2.5 py-1" style="background:${riesgoColor[s.riesgo].bg};color:${riesgoColor[s.riesgo].text}">${s.riesgo}</span>
        </td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.motivo) || '—'}</td>
      </tr>`).join('');

    document.getElementById('mount-semaforo').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-extrabold text-ink">Semáforo de riesgo</h2>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-morado/10 text-morado">${dataFiltradaCohorte.length} estudiante${dataFiltradaCohorte.length === 1 ? '' : 's'}</span>
              ${semaforoCohorteFiltro ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-slate2">Cohorte: ${escapeHtml(semaforoCohorteFiltro)}</span>` : ''}
            </div>
            <p class="text-sm text-slate2 mt-0.5">Calculado automáticamente con el promedio real de calificaciones y el % real de asistencia de cada estudiante.</p>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onclick="cambiarFiltroSemaforoRiesgo('todos')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${semaforoRiesgoFiltro === 'todos' ? 'bg-morado text-white shadow-sm ring-2 ring-morado/20' : 'bg-gray-100 text-slate2 hover:bg-gray-200'}">
                Todos (${dataFiltradaCohorte.length})
              </button>
              <button type="button" onclick="cambiarFiltroSemaforoRiesgo('Rojo')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${semaforoRiesgoFiltro === 'Rojo' ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Rojo' ? 'bg-white' : 'bg-rose-500'}"></span>${enRiesgo} en riesgo
              </button>
              <button type="button" onclick="cambiarFiltroSemaforoRiesgo('Amarillo')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${semaforoRiesgoFiltro === 'Amarillo' ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-200' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Amarillo' ? 'bg-white' : 'bg-amber-500'}"></span>${enAlerta} en alerta
              </button>
              <button type="button" onclick="cambiarFiltroSemaforoRiesgo('Verde')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${semaforoRiesgoFiltro === 'Verde' ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-200' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${semaforoRiesgoFiltro === 'Verde' ? 'bg-white' : 'bg-teal-500'}"></span>${enVerde} en orden
              </button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div class="flex items-center gap-1.5">
              <label for="filtroSemaforoCohorte" class="text-xs font-semibold text-slate2 shrink-0">Cohorte:</label>
              <select id="filtroSemaforoCohorte" onchange="cambiarFiltroSemaforoCohorte(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3 py-2 text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">
                <option value="">Todas las cohortes (${data.length})</option>
                ${cohortes.map(c => {
                  const cant = data.filter(s => s.cohorte === c).length;
                  return `<option value="${escapeHtml(c)}" ${semaforoCohorteFiltro === c ? 'selected' : ''}>${escapeHtml(c)} (${cant})</option>`;
                }).join('')}
              </select>
            </div>
            <div class="relative">
              <input data-table="table-semaforo" oninput="filterTable('semaforo', this.value)" type="text" placeholder="Buscar estudiante..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-2 text-xs sm:text-sm w-44 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-4 h-4 text-morado absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportarSemaforoCSV()" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3.5 py-2 transition">CSV</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-semaforo" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Promedio</th><th class="py-2.5 px-4">Asistencia</th><th class="py-2.5 px-4">Riesgo</th><th class="py-2.5 px-4">Motivo</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-sm text-slate2 text-center py-6">No se encontraron estudiantes para los criterios seleccionados.</td></tr>'}</tbody>
          </table>
        </div>
        ${!data.length ? '<p class="text-sm text-slate2 text-center py-4">Crea usuarios con rol "Estudiante" para que aparezcan aquí.</p>' : ''}
      </div>`;
    TableManager.init('table-semaforo');
  }

  // El semáforo se calcula en vivo (no vive en Store como lista), así que
  // no puede usar exportCSV(entity) genérico — arma el CSV directamente
  // desde computeSemaforo(), respetando el filtro de cohorte si está activo.
  async function exportarSemaforoCSV() {
    const data = await computeSemaforo();
    let dataFiltrada = semaforoCohorteFiltro
      ? data.filter(s => s.cohorte === semaforoCohorteFiltro)
      : data;
    if (semaforoRiesgoFiltro && semaforoRiesgoFiltro !== 'todos') {
      dataFiltrada = dataFiltrada.filter(s => s.riesgo === semaforoRiesgoFiltro);
    }
    if (!dataFiltrada.length) { toast('No hay datos para exportar', 'err'); return; }
    const keys = ['nombre', 'cohorte', 'promedio', 'asistencia', 'riesgo', 'motivo'];
    const rows = [keys.join(',')].concat(
      dataFiltrada.map(r => keys.map(k => '"' + String(r[k] ?? '').replace(/"/g, '""') + '"').join(','))
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sufijoCohorte = semaforoCohorteFiltro ? '_' + semaforoCohorteFiltro.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const sufijoRiesgo = semaforoRiesgoFiltro !== 'todos' ? '_' + semaforoRiesgoFiltro.toLowerCase() : '';
    a.href = url; a.download = `semaforo_riesgo${sufijoCohorte}${sufijoRiesgo}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Archivo CSV exportado', 'ok');
  }

  // ---------- Memorandos: helpers compartidos (admin + estudiante) ----------
  // async: 'usuarios' vía MySQL.
  async function usuarioPorEmail(email) {
    const e = (email || '').toLowerCase();
    return (await Store.list('usuarios')).find(u => (u.email || '').toLowerCase() === e) || null;
  }

  function rolLabelCarta(rol) {
    const map = { Estudiante: 'Trainee', Docente: 'Docente', Coordinador: 'Coordinador', Administrador: 'Administrador' };
    return map[rol] || (rol || '');
  }

  // Etiqueta amigable del destinatario para las tablas del panel admin
  // (el valor guardado en el registro es el correo del usuario, o un grupo).
  async function destinatarioLabelAdmin(destinatario) {
    const u = await usuarioPorEmail(destinatario);
    if (u) return `${u.nombre} (${u.rol})`;
    return destinatario || '—';
  }

  // ---------- Buscador de destinatario (Memorandos) ----------
  // Filtra window.__catalogoDestinatarios (armado en el render del campo,
  // ver type 'buscar_destinatario') por nombre o correo, y pinta hasta 8
  // resultados en el desplegable debajo del input.
  function buscarDestinatarioInput(texto) {
    const cont = document.getElementById('destinatarioResultados');
    const hidden = document.getElementById('field_destinatario');
    if (!cont || !hidden) return;
    const catalogo = window.__catalogoDestinatarios || [];
    const q = (texto || '').trim().toLowerCase();

    // Si el texto escrito ya no coincide con la última selección, se limpia
    // el valor real guardado — así no se puede enviar un memorando a medio
    // escribir un nombre distinto al que quedó seleccionado por última vez.
    const actual = catalogo.find(o => o.value === hidden.value);
    if (!actual || actual.label.toLowerCase() !== q) hidden.value = '';

    const resultados = (q === ''
      ? catalogo
      : catalogo.filter(o => o.label.toLowerCase().includes(q))
    ).slice(0, 8);

    if (!resultados.length) {
      cont.innerHTML = `<p class="px-3.5 py-2.5 text-sm text-slate2">Sin resultados para "${escapeHtml(texto)}"</p>`;
    } else {
      cont.innerHTML = resultados.map(o => `
        <button type="button" onmousedown="elegirDestinatario('${escapeHtml(o.value)}','${escapeHtml(o.label)}')"
          class="w-full text-left px-3.5 py-2.5 text-sm hover:bg-morado/5 border-b border-gray-50 last:border-0 transition">
          ${escapeHtml(o.label)}
        </button>`).join('');
    }
    cont.classList.remove('hidden');
  }

  // Se llama al hacer click (onmousedown, para disparar ANTES del blur del
  // input) sobre un resultado del buscador de destinatario: fija el correo
  // real (o el nombre del grupo) en el input oculto que lee saveModal(), y
  // muestra la etiqueta legible en el input visible.
  function elegirDestinatario(value, label) {
    const visible = document.getElementById('destinatarioBuscar');
    const hidden = document.getElementById('field_destinatario');
    const cont = document.getElementById('destinatarioResultados');
    if (visible) visible.value = label;
    if (hidden) hidden.value = value;
    if (cont) cont.classList.add('hidden');
  }

  // Memorandos dirigidos al usuario actualmente logueado (Estudiante o
  // Docente): por su correo exacto, por los grupos generales, por su grupo
  // de rol (estudiantes/docentes), o (compatibilidad con datos antiguos)
  // por su cohorte si es estudiante.
  async function memorandosParaUsuarioActual() {
    const doc = currentEstudiante || currentDocente || {};
    const esDocente = !!currentDocente;
    const email = (doc.email || '').toLowerCase();
    return [...(await Store.list('memorandos'))].filter(m => {
      if (m.estado !== 'Enviado') return false; // un Borrador nunca es visible para el destinatario, solo para Administración
      const dest = m.destinatario || '';
      return dest.toLowerCase() === email
        || dest === 'Todos'
        || (esDocente ? dest === 'Todos los docentes' : dest === 'Todos los estudiantes')
        || (!esDocente && doc.cohorte && dest === doc.cohorte);
    }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }
  // Alias por compatibilidad: código existente que llamaba a la función
  // con su nombre anterior (solo tenía en cuenta al estudiante) sigue
  // funcionando igual — ahora resuelve el rol real de currentEstudiante.
  async function memorandosParaEstudiante() { return await memorandosParaUsuarioActual(); }

  // Seguimiento de lectura por usuario: { [memorandoId]: { [email]: true } }.
  // Se guarda aparte (no en el registro del memorando) porque un mismo memorando
  // puede estar dirigido a varios destinatarios (grupo) y cada uno lee por su lado.
  async function memorandoLeidoPorEmail(memorandoId, email) {
    const mapa = (await Store.get('memorandos_leidos')) || {};
    return !!(mapa[memorandoId] && mapa[memorandoId][email]);
  }
  async function marcarMemorandoLeidoPorEmail(memorandoId, email) {
    if (!email) return;
    const mapa = (await Store.get('memorandos_leidos')) || {};
    if (!mapa[memorandoId]) mapa[memorandoId] = {};
    if (mapa[memorandoId][email]) return;
    mapa[memorandoId][email] = true;
    await Store.set('memorandos_leidos', mapa);
  }
  // Actualiza el badge de "no leídos" del rol que esté logueado ahora
  // mismo (el estudiante tiene el suyo, memorandosBadge; el docente tiene
  // el suyo aparte, memorandosBadgeDocente — nunca los dos a la vez).
  async function updateMemorandosBadge() {
    const doc = currentEstudiante || currentDocente || {};
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      memorandosParaUsuarioActual(),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    const noLeidos = memos.filter(m => !(mapa[m.id] && mapa[m.id][email])).length;
    const badgeId = currentDocente ? 'memorandosBadgeDocente' : 'memorandosBadge';
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (noLeidos > 0) { badge.textContent = noLeidos; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  }

  // Construye el HTML completo del memorando en formato de carta institucional
  // (logo Fundación A+, marca Training, encabezado PARA/DE/ASUNTO, cuerpo libre
  // de hasta decenas de miles de caracteres) y lo abre en una pestaña nueva,
  // lista para imprimir o "Guardar como PDF" desde el navegador.
  // async: usuarioPorEmail ahora es async (usa 'usuarios' vía MySQL).
  async function construirCartaMemorandoHTML(m) {
    const cfg = (await Store.get('configuracion')) || SEED.configuracion;
    const destinatarioUsuario = await usuarioPorEmail(m.destinatario);
    const nombreDestinatario = destinatarioUsuario ? destinatarioUsuario.nombre : (
      m.destinatario === 'Todos los docentes' ? 'Docentes de la Fundación A+' :
      m.destinatario === 'Todos los estudiantes' ? 'Trainees de la Fundación A+' :
      m.destinatario === 'Todos' ? 'Comunidad Fundación A+' : (m.destinatario || '—')
    );
    const rolDestinatario = destinatarioUsuario ? rolLabelCarta(destinatarioUsuario.rol) : '';
    const nombrePila = destinatarioUsuario ? nombreDestinatario.split(' ')[0] : nombreDestinatario;

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Memorando — ${escapeHtml(m.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color:#14181F; background:#e9e9ec; margin:0; padding:32px 16px; }
  .hoja { max-width: 800px; margin: 0 auto 32px; background:#fff; border:1px solid #14181F; padding: 48px 56px 64px; }
  .encabezado { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-bottom:8px; }
  .marca { display:flex; align-items:center; gap:10px; font-family:'Inter',Arial,sans-serif; }
  .marca img.logo-real { height:34px; width:auto; flex-shrink:0; }
  .marca-texto { font-size:16px; font-weight:800; color:#14181F; }
  .marca-texto b { color:#F0455C; }
  .training-mark { display:flex; align-items:center; gap:6px; font-family:'Inter',Arial,sans-serif; color:#14181F; }
  .training-mark .chevron { font-size:24px; color:#F5A623; font-weight:900; line-height:1; }
  .training-mark .txt { font-size:14px; font-weight:800; letter-spacing:.2px; }
  .training-mark .txt .ai { color:#8B5CF6; }
  .training-mark .num { font-size:11px; font-weight:700; color:#5B6472; margin-left:2px; }
  hr.linea { border:none; border-top:2px solid #14181F; margin: 18px 0 26px; }
  h1.titulo-memo { text-align:center; font-size:16px; letter-spacing:2.5px; margin: 0 0 26px; }
  .meta-fecha { margin-bottom: 22px; font-size:14px; }
  table.campos { width:100%; border-collapse:collapse; margin-bottom: 24px; font-size:14px; }
  table.campos td { padding: 3px 0; vertical-align:top; }
  table.campos td.etiqueta { width:82px; font-weight:700; }
  .cuerpo { font-size:14px; line-height:1.7; }
  .cuerpo p { margin: 0 0 14px; text-align: justify; }
  .firma { margin-top: 48px; font-size:14px; }
  .barra-accion { max-width:800px; margin: 0 auto 18px; display:flex; justify-content:flex-end; gap:10px; font-family:'Inter',Arial,sans-serif; }
  .barra-accion button { border:none; border-radius:9999px; padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer; background:#14181F; color:#fff; }
  .barra-accion button:hover { background:#8B5CF6; }
  .barra-accion button.adjunto { background:#F5A623; }
  .barra-accion button.adjunto:hover { background:#8B5CF6; }
  @media print {
    body { background:#fff; padding:0; }
    .hoja { border:1px solid #14181F; margin:0; max-width:none; }
    .barra-accion { display:none; }
  }
</style></head>
<body>
  <div class="barra-accion">
    ${m.archivoDatos ? `<button class="adjunto" onclick="window.open('${m.archivoDatos}','_blank')"><svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>Ver archivo adjunto</button>` : ''}
    <button onclick="window.print()">Descargar / Imprimir</button>
  </div>
  <div class="hoja">
    <div class="encabezado">
      <div class="marca">
        <img class="logo-real" src="${LOGO_FUNDACION_DATAURL}" alt="Fundación A+" />
        <span class="marca-texto">Fundación A<b>+</b></span>
      </div>
      <div class="training-mark">
        <span class="chevron">‹</span>
        <span class="txt">Tr<span class="ai">AI</span>ning</span>
        <span class="num">100 → 1000+</span>
      </div>
    </div>
    <hr class="linea" />
    <h1 class="titulo-memo">MEMORANDO</h1>
    <p class="meta-fecha">${escapeHtml(cfg.ciudad || 'Quibdó')}, ${fmtDate(m.fecha)}</p>
    <table class="campos">
      <tr><td class="etiqueta">PARA:</td><td>${escapeHtml(nombreDestinatario)}${rolDestinatario ? ', ' + escapeHtml(rolDestinatario) : ''}</td></tr>
      <tr><td class="etiqueta">DE:</td><td>EQUIPO DIRECTIVO FUNDACIÓN A+</td></tr>
      <tr><td class="etiqueta">ASUNTO:</td><td>${escapeHtml(m.titulo)}</td></tr>
    </table>
    <div class="cuerpo">
      <p>Estimado/a ${escapeHtml(nombrePila)},</p>
      <p>Por medio del presente memorando, la Fundación A+ le informa que el documento oficial correspondiente a este comunicado se encuentra adjunto.</p>
      ${m.archivoDatos ? `<p style="text-align:center;margin:22px 0"><button class="adjunto" onclick="window.open('${m.archivoDatos}','_blank')" style="border:none;border-radius:9999px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;background:#F5A623;color:#fff;font-family:'Inter',Arial,sans-serif"><svg style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:6px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>Abrir ${escapeHtml(m.archivoNombre || 'documento adjunto')}</button></p>` : '<p><em>Este memorando no tiene un archivo adjunto.</em></p>'}
      <div class="firma">
        <p>Cordialmente,</p>
        <p><strong>Equipo Directivo</strong><br/>Fundación A+</p>
      </div>
    </div>
  </div>
</body></html>`;
  }

  // Abre el memorando ya renderizado como carta en una pestaña nueva.
  // IMPORTANTE: window.open() se llama de forma SÍNCRONA, antes de
  // cualquier await — así el navegador la asocia al click original del
  // usuario y no la bloquea como popup. El contenido (que sí depende de
  // una consulta async a 'usuarios') se escribe después, cuando esté listo.
  async function abrirMemorandoCarta(id) {
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para ver el memorando', 'err'); return; }
    const m = (await Store.list('memorandos')).find(x => x.id === id);
    if (!m) { win.close(); toast('No se encontró el memorando', 'err'); return; }
    const html = await construirCartaMemorandoHTML(m);
    win.document.write(html);
    win.document.close();
  }

  // Igual que abrirMemorandoCarta, pero además marca el memorando como
  // leído por el usuario actual (Estudiante o Docente) y refresca su
  // badge de notificaciones y su propia lista.
  async function verMemorandoUsuarioActual(id) {
    const doc = currentEstudiante || currentDocente || {};
    const email = (doc.email || '').toLowerCase();
    // Se espera a que quede guardado como "leído" ANTES de refrescar la
    // lista/el badge: si no se espera, el re-render de abajo podría leer
    // el mapa de memorandos_leidos todavía sin esta marca (condición de
    // carrera contra la propia petición que la está guardando).
    await marcarMemorandoLeidoPorEmail(id, email);
    abrirMemorandoCarta(id);
    await updateMemorandosBadge();
    if (currentDocente) renderMemorandosDocente();
    else renderMemorandosEstudiante();
  }
  // Alias por compatibilidad con el nombre anterior (solo asumía estudiante).
  async function verMemorandoEstudiante(id) { await verMemorandoUsuarioActual(id); }

  // ---------- RENDER: Memorandos ----------
  // async: destinatarioLabelAdmin ahora es async (usa 'usuarios' vía MySQL) —
  // se resuelve una vez por registro con Promise.all ANTES del .map() que
  // arma las filas, porque ese .map() no puede usar await dentro.
  async function renderMemorandos() {
    const records = await Store.list('memorandos');
    const labels = await Promise.all(records.map(m => destinatarioLabelAdmin(m.destinatario)));
    const rows = records.map((m, i) => `
      <tr data-search="${escapeHtml((m.titulo + ' ' + labels[i]).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(m.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(labels[i])}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(m.fecha)}</td>
        <td class="py-3 px-4">${statusPill(m.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button onclick="abrirMemorandoCarta('${m.id}')" class="text-xs font-semibold text-turquesa hover:underline mr-3">Ver carta</button>
          ${m.archivoDatos ? `<button onclick="verArchivoMemorando('${m.id}')" class="text-xs font-semibold text-oro hover:underline mr-3 inline-flex items-center gap-1">${ICON_CLIP_SVG}Archivo</button>` : ''}
          <button onclick="openModal('memorandos','${m.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('memorandos','${m.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-memorandos').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('memorandos', 'Memorandos', records.length + ' comunicaciones internas', null, true, ['archivoDatos'])}
        <div class="overflow-x-auto">
          <table id="table-memorandos" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Título</th><th class="py-2.5 px-4">Destinatario</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(5)}</tbody>
          </table>
        </div>
      </div>`;
  }

  function verArchivoMemorando(id) {
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para ver el archivo', 'err'); return; }
    Store.getArchivo('memorandos', id).then(m => {
      if (!m || !m.archivoDatos || m.archivoDatos === '1') {
        win.close();
        toast('Este memorando no tiene un archivo adjunto disponible', 'info');
        return;
      }
      win.document.write(`<iframe src="${m.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
      win.document.title = m.archivoNombre || m.titulo;
    }).catch(() => {
      win.close();
      toast('No se pudo cargar el archivo del memorando', 'err');
    });
  }

  // ---------- RENDER: PQR ----------
  // El administrador (Superadmin o Administración) NO puede editar ni crear
  // PQR: cada solicitud la envía el Docente o el Estudiante como archivo PDF.
  // El estado pasa de "Pendiente" a "Activo" automáticamente la primera vez
  // que el administrador abre/descarga el PDF (ver descargarPqrAdmin).
  //
  // Quién ve estas PQR: cualquier administrador con permiso "ver" sobre
  // admin.pqr en su perfil — el Superadmin siempre (acceso total), y cada
  // Coordinador solo si su perfil tiene ese módulo habilitado. Eso ya lo
  // resuelve el sistema de permisos existente (oculta el botón/panel
  // completo si no tiene el permiso); no hace falta elegir un destinatario
  // al enviar la PQR — llega automáticamente a "quien tenga PQR habilitado".
  // async: 'pqr' vía MySQL.
  async function actualizarBadgePqrAdmin() {
    const pendientes = (await Store.list('pqr')).filter(p => p.estado === 'Pendiente').length;
    const badge = document.getElementById('pqrBadgeAdmin');
    if (!badge) return;
    if (pendientes > 0) { badge.textContent = pendientes; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  }

  // async: actualizarBadgePqrAdmin() y 'pqr' vía MySQL.
  async function renderPqr() {
    await actualizarBadgePqrAdmin();
    const records = [...(await Store.list('pqr'))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const rows = records.map(p => `
      <tr data-search="${escapeHtml((p.tipo + ' ' + p.solicitante + ' ' + p.asunto).toLowerCase())}" class="border-b border-gray-50 last:border-0 align-top">
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.tipo)}</td>
        <td class="py-3 px-4 text-sm">
          <p class="font-semibold text-ink">${escapeHtml(p.solicitante)}</p>
          <p class="text-xs text-slate2 mt-0.5">${escapeHtml(p.remitenteRol || '—')}</p>
        </td>
        <td class="py-3 px-4 text-sm text-ink max-w-xs">${escapeHtml(p.asunto)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(p.fecha)}</td>
        <td class="py-3 px-4">${statusPill(p.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          ${p.archivoDatos
            ? `<button onclick="descargarPqrAdmin('${p.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Descargar PDF</button>`
            : `<span class="text-xs text-slate2 mr-3">Sin archivo</span>`}
          <button onclick="askDelete('pqr','${p.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>
        </td>
      </tr>`).join('');

    document.getElementById('mount-pqr').innerHTML = `
      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-extrabold text-ink">PQR</h2>
            <p class="text-sm text-slate2 mt-0.5">${records.length} peticiones, quejas y reclamos enviados por docentes y estudiantes como PDF</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input data-table="table-pqr" oninput="filterTable('pqr', this.value)" type="text" placeholder="Buscar..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-2 text-xs sm:text-sm w-40 sm:w-48 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-4 h-4 text-morado absolute left-3 top-2.5 sm:top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="recargarPanelActual()" title="Actualizar datos en vivo" class="rounded-xl border border-gray-200 text-slate2 hover:text-morado hover:bg-morado/5 text-xs sm:text-sm font-semibold px-3 py-2 transition flex items-center gap-1.5 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span class="hidden md:inline">Actualizar</span>
            </button>
            <button onclick="exportCSV('pqr', ['archivoDatos'])" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3.5 py-2 transition shadow-sm">CSV</button>
          </div>
        </div>
        <p class="text-xs text-slate2 -mt-2 mb-4">Solo lectura: el administrador no puede editar ni crear PQR. El estado cambia a <span class="font-semibold text-ink">Activo</span> automáticamente al descargar el PDF por primera vez.</p>
        <div class="table-responsive-container">
          <table id="table-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Tipo</th><th class="py-2.5 px-4">Remitente</th><th class="py-2.5 px-4">Asunto</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4" data-no-sort="true"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-pqr');
  }

  // Abre el PDF de una PQR en una pestaña nueva y, la primera vez que el
  // administrador lo hace, cambia el estado de "Pendiente" a "Activo".
  // async: 'pqr' vía MySQL. window.open() se llama SÍNCRONAMENTE antes de
  // cualquier await, para no activar el bloqueador de popups (mismo
  // cuidado que en abrirMemorandoCarta/descargarPensumEstudiante).
  async function descargarPqrAdmin(id) {
    const win = window.open('', '_blank');
    let p = null;
    try {
      p = await Store.getArchivo('pqr', id);
    } catch (e) {
      const registros = await Store.list('pqr');
      p = registros.find(r => r.id === id);
    }
    if (!p || !p.archivoDatos || p.archivoDatos === '1') {
      toast('Esta PQR no tiene un archivo adjunto disponible', 'info');
      if (win) win.close();
      return;
    }

    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.asunto;

    if (p.estado !== 'Activo') {
      const registros = await Store.list('pqr');
      const idx = registros.findIndex(r => r.id === id);
      if (idx !== -1) {
        registros[idx].estado = 'Activo';
        registros[idx].fechaActivacion = new Date().toISOString().slice(0, 10);
        await Store.set('pqr', registros);
      }
      renderPqr();
      toast('PDF descargado. Estado actualizado a Activo.', 'ok');
    }
  }

  // Estado del filtro del panel Calificaciones (Admin). mes=null significa
  // "General": promedia TODOS los meses con notas de cada docente en esa
  // cohorte, en vez de solo el mes vigente.
  let calificacionesAdminState = { cohorte: null, mes: null };

  // Todos los meses (con notas registradas) que un docente ha dictado en
  // una cohorte — se usa para poblar el selector de mes y para el cálculo
  // "General".
  // async: 'notas_modulos' vía MySQL.
  async function mesesConNotasDocenteCohorte(docenteNombre, cohorteNombre) {
    return (await Store.list('notas_modulos'))
      .filter(r => r.docente === docenteNombre && r.cohorte === cohorteNombre && r.mes)
      .map(r => r.mes);
  }

  // Promedio general de un estudiante en una cohorte, para UN mes puntual
  // (mes=null => promedia sobre TODOS los meses con notas de cada docente,
  // es decir la vista "General").
  // async: docentesDeCohorte() y mesesConNotasDocenteCohorte() ahora son
  // async — se usa for...of en vez de forEach para poder hacer await
  // dentro del bucle con claridad.
  async function promedioGeneralEstudianteCohorte(estudianteNombre, cohorteNombre, mes) {
    const docentes = await docentesDeCohorte(cohorteNombre);
    const registros = await Store.list('notas_modulos');
    const notasPorProfesor = [];
    for (const docenteNombre of docentes) {
      const mesesDelDocente = mes ? [mes] : await mesesConNotasDocenteCohorte(docenteNombre, cohorteNombre);
      const valoresDelDocente = [];
      mesesDelDocente.forEach(m => {
        const rec = registros.find(r => r.docente === docenteNombre && r.cohorte === cohorteNombre && r.mes === m);
        if (!rec) return;
        const resultado = calcularNotaFinal(rec, estudianteNombre);
        if (resultado && !resultado.pendiente) valoresDelDocente.push(resultado.valor);
      });
      if (valoresDelDocente.length) {
        // Si es "General" y el docente tiene notas en varios meses, se
        // promedia primero dentro del docente, así un profesor con muchos
        // periodos no pesa más que uno con pocos.
        notasPorProfesor.push(valoresDelDocente.reduce((a, b) => a + b, 0) / valoresDelDocente.length);
      }
    }
    if (!notasPorProfesor.length) return null;
    const promedio = notasPorProfesor.reduce((a, b) => a + b, 0) / notasPorProfesor.length;
    return { promedio, profesores: notasPorProfesor.length };
  }

  // Desglose de la nota de UN estudiante, docente por docente (vista
  // "General": promedia todos los meses con notas de cada uno), para que
  // el chat pueda decir en cuáles va bien o mal — no solo el promedio
  // general. Se reutiliza la misma lógica de promedioGeneralEstudianteCohorte,
  // solo que sin colapsar el resultado final en un único número.
  // async: docentesDeCohorte() y mesesConNotasDocenteCohorte() ahora son async.
  async function desgloseNotasEstudianteCohorte(estudianteNombre, cohorteNombre) {
    const docentes = await docentesDeCohorte(cohorteNombre);
    const registros = await Store.list('notas_modulos');
    const detalle = [];
    for (const docenteNombre of docentes) {
      const meses = await mesesConNotasDocenteCohorte(docenteNombre, cohorteNombre);
      const valores = [];
      meses.forEach(m => {
        const rec = registros.find(r => r.docente === docenteNombre && r.cohorte === cohorteNombre && r.mes === m);
        if (!rec) return;
        const resultado = calcularNotaFinal(rec, estudianteNombre);
        if (resultado && !resultado.pendiente) valores.push(resultado.valor);
      });
      if (valores.length) {
        detalle.push({ docente: docenteNombre, nota: valores.reduce((a, b) => a + b, 0) / valores.length });
      } else {
        detalle.push({ docente: docenteNombre, nota: null }); // aún sin nota registrada con ese docente
      }
    }
    return detalle;
  }

  // Notas que UN docente le puso a sus propios estudiantes en una cohorte,
  // usando el mes más reciente con notas registradas por él ahí (o el
  // único mes si solo tiene uno). Es la vista del propio docente, así que
  // nunca mezcla notas de otros profesores. Se usa para que el chat pueda
  // decir qué estudiantes van bajos en SU materia.
  // async: 'usuarios' vía MySQL.
  async function notasDocenteEnCohorte(docenteNombre, cohorteNombre) {
    const meses = await mesesConNotasDocenteCohorte(docenteNombre, cohorteNombre);
    if (!meses.length) return [];
    const mesReciente = [...meses].sort().pop();
    const registros = await Store.list('notas_modulos');
    const rec = registros.find(r => r.docente === docenteNombre && r.cohorte === cohorteNombre && r.mes === mesReciente);
    if (!rec) return [];
    const estudiantes = ((await Store.list('usuarios')) || []).filter(u => u.rol === 'Estudiante' && u.cohorte === cohorteNombre);
    return estudiantes.map(e => {
      const resultado = calcularNotaFinal(rec, e.nombre);
      return { nombre: e.nombre, nota: (resultado && !resultado.pendiente) ? resultado.valor : null, mes: mesReciente };
    });
  }

  // async: 'modulos' vía MySQL.
  async function renderCalificaciones() {
    const cohortes = await Store.list('modulos');
    if (!calificacionesAdminState.cohorte && cohortes.length > 0) {
      calificacionesAdminState.cohorte = cohortes[0].nombre;
    }

    document.getElementById('mount-calificaciones').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Calificaciones</h2>
        <p class="text-sm text-slate2 mt-0.5">Elige una cohorte y un mes (o "General" para el promedio acumulado): los estudiantes de esa cohorte aparecen automáticamente con su promedio.</p>
      </div>
      <div class="admin-panel-card p-6 mb-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="califAdminCohorteSelect">Cohorte</label>
            <select id="califAdminCohorteSelect" onchange="onCambiaCalifAdminCohorte()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option value="">Selecciona una cohorte...</option>
              ${cohortes.map(c => `<option value="${escapeHtml(c.nombre)}" ${calificacionesAdminState.cohorte === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="califAdminMesSelect">Periodo</label>
            <select id="califAdminMesSelect" onchange="onCambiaCalifAdminMes()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" ${calificacionesAdminState.cohorte ? '' : 'disabled'}>
              <option value="">General (todos los meses)</option>
            </select>
          </div>
        </div>
      </div>
      <div id="califAdminResultado"></div>`;

    await poblarMesesCalifAdmin();
    await renderCalifAdminResultado();
  }

  // async: docentesDeCohorte() ahora es async.
  async function poblarMesesCalifAdmin() {
    const mesSelect = document.getElementById('califAdminMesSelect');
    if (!mesSelect) return;
    if (!calificacionesAdminState.cohorte) {
      mesSelect.innerHTML = '<option value="">General (todos los meses)</option>';
      mesSelect.disabled = true;
      return;
    }
    // Unión de todos los meses con notas de cualquier docente de esta cohorte.
    const docentes = await docentesDeCohorte(calificacionesAdminState.cohorte);
    const meses = new Set();
    for (const d of docentes) {
      (await mesesConNotasDocenteCohorte(d, calificacionesAdminState.cohorte)).forEach(m => meses.add(m));
    }
    const mesesOrdenados = [...meses].sort().reverse();
    mesSelect.disabled = false;
    mesSelect.innerHTML = '<option value="">General (todos los meses)</option>' +
      mesesOrdenados.map(m => `<option value="${m}" ${calificacionesAdminState.mes === m ? 'selected' : ''}>${mesLabel(m)}</option>`).join('');
  }

  async function onCambiaCalifAdminCohorte() {
    const sel = document.getElementById('califAdminCohorteSelect');
    calificacionesAdminState.cohorte = sel.value || null;
    calificacionesAdminState.mes = null;
    calificacionesAdminState.filtro = 'todos';
    const wrap = document.getElementById('califAdminResultado');
    if (wrap) {
      wrap.innerHTML = `<div class="admin-panel-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-morado/20 border-t-morado rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-slate2">Cargando calificaciones...</p>
      </div>`;
    }
    await poblarMesesCalifAdmin();
    await renderCalifAdminResultado();
  }

  function onCambiaCalifAdminMes() {
    const sel = document.getElementById('califAdminMesSelect');
    calificacionesAdminState.mes = sel.value || null;
    calificacionesAdminState.filtro = 'todos';
    renderCalifAdminResultado();
  }

  function cambiarFiltroCalifAdmin(filtro) {
    calificacionesAdminState.filtro = filtro || 'todos';
    renderCalifAdminResultado();
  }
  window.cambiarFiltroCalifAdmin = cambiarFiltroCalifAdmin;

  async function exportarCalificacionesCohorteCSV() {
    if (!calificacionesAdminState.cohorte) { toast('Selecciona una cohorte', 'err'); return; }
    const estudiantes = (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && u.cohorte === calificacionesAdminState.cohorte);
    if (!estudiantes.length) { toast('No hay estudiantes en esta cohorte', 'err'); return; }
    const resultadosPorEstudiante = await Promise.all(estudiantes.map(e => promedioGeneralEstudianteCohorte(e.nombre, calificacionesAdminState.cohorte, calificacionesAdminState.mes)));

    const rows = [['Estudiante', 'Cohorte', 'Periodo', 'Promedio', 'Profesores Evaluadores', 'Estado']];
    estudiantes.forEach((e, i) => {
      const res = resultadosPorEstudiante[i];
      const prom = res ? res.promedio.toFixed(1) : 'Sin notas';
      const profs = res ? res.profesores : 0;
      const estado = res ? (res.promedio >= NOTA_MINIMA_APROBACION ? 'Aprobado' : 'En riesgo') : 'Pendiente';
      rows.push([
        `"${e.nombre.replace(/"/g, '""')}"`,
        `"${calificacionesAdminState.cohorte.replace(/"/g, '""')}"`,
        `"${(calificacionesAdminState.mes ? mesLabel(calificacionesAdminState.mes) : 'General').replace(/"/g, '""')}"`,
        `"${prom}"`,
        `"${profs}"`,
        `"${estado}"`
      ]);
    });

    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sufijoCohorte = calificacionesAdminState.cohorte.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sufijoMes = calificacionesAdminState.mes ? '_' + calificacionesAdminState.mes : '_general';
    a.href = url; a.download = `calificaciones_${sufijoCohorte}${sufijoMes}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Calificaciones exportadas en CSV', 'ok');
  }
  window.exportarCalificacionesCohorteCSV = exportarCalificacionesCohorteCSV;

  // async: 'usuarios' vía MySQL.
  async function renderCalifAdminResultado() {
    const wrap = document.getElementById('califAdminResultado');
    if (!wrap) return;
    if (!calificacionesAdminState.cohorte) {
      wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Selecciona una cohorte para ver sus calificaciones.</p></div>`;
      return;
    }
    const estudiantes = (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && u.cohorte === calificacionesAdminState.cohorte);
    const docentesCohorte = await docentesDeCohorte(calificacionesAdminState.cohorte);
    const resultadosPorEstudiante = await Promise.all(estudiantes.map(e => promedioGeneralEstudianteCohorte(e.nombre, calificacionesAdminState.cohorte, calificacionesAdminState.mes)));

    // Estadísticas agregadas para stress-testing y grandes volúmenes de estudiantes
    const conNotas = resultadosPorEstudiante.filter(r => r && r.promedio !== null && !isNaN(r.promedio));
    const promedioGrupal = conNotas.length ? (conNotas.reduce((acc, r) => acc + r.promedio, 0) / conNotas.length).toFixed(1) : '—';
    const aprobados = resultadosPorEstudiante.filter(r => r && r.promedio !== null && r.promedio >= NOTA_MINIMA_APROBACION);
    const enRiesgo = resultadosPorEstudiante.filter(r => r && r.promedio !== null && r.promedio < NOTA_MINIMA_APROBACION);
    const sinNotas = resultadosPorEstudiante.filter(r => !r || r.promedio === null);
    const tasaAprobacion = conNotas.length ? Math.round((aprobados.length / conNotas.length) * 100) + '%' : '—';

    let mejorEstudiante = '—';
    if (conNotas.length) {
      const maxVal = Math.max(...conNotas.map(r => r.promedio));
      const idx = resultadosPorEstudiante.findIndex(r => r && r.promedio === maxVal);
      if (idx !== -1) mejorEstudiante = estudiantes[idx].nombre + ` (${maxVal.toFixed(1)})`;
    }

    const filtroActivo = calificacionesAdminState.filtro || 'todos';

    // Lista filtrada según pestaña
    const indicesFiltrados = estudiantes.map((_, i) => i).filter(i => {
      const res = resultadosPorEstudiante[i];
      if (filtroActivo === 'aprobados') return res && res.promedio !== null && res.promedio >= NOTA_MINIMA_APROBACION;
      if (filtroActivo === 'riesgo') return res && res.promedio !== null && res.promedio < NOTA_MINIMA_APROBACION;
      if (filtroActivo === 'sin_notas') return !res || res.promedio === null;
      return true;
    });

    const filas = indicesFiltrados.map(i => {
      const e = estudiantes[i];
      const resultado = resultadosPorEstudiante[i];
      const promedioHtml = resultado
        ? `<span class="font-bold" style="color:${colorCualitativa(resultado.promedio)}">${resultado.promedio.toFixed(1)}</span>
           <span class="text-[11px] text-slate2 ml-1">(${resultado.profesores} profesor${resultado.profesores !== 1 ? 'es' : ''})</span>`
        : `<span class="text-slate2 text-xs">Sin notas aún</span>`;
      return `
      <tr data-search="${escapeHtml(e.nombre.toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.nombre)}</td>
        <td class="py-3 px-4 text-sm">${promedioHtml}</td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <!-- KPI Cards de rendimiento de la cohorte -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="admin-panel-card p-4 flex items-center gap-3.5 border-l-4 border-morado">
          <div class="w-10 h-10 rounded-xl bg-morado/10 text-morado flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2">Promedio general cohorte</p>
            <p class="text-xl font-extrabold text-ink leading-tight mt-0.5">${promedioGrupal} <span class="text-xs font-normal text-slate2">/ 10</span></p>
          </div>
        </div>

        <div class="admin-panel-card p-4 flex items-center gap-3.5 border-l-4 border-teal-500">
          <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2">Tasa de aprobación</p>
            <p class="text-xl font-extrabold text-teal-700 leading-tight mt-0.5">${tasaAprobacion} <span class="text-xs font-normal text-slate2">(${aprobados.length}/${conNotas.length})</span></p>
          </div>
        </div>

        <div class="admin-panel-card p-4 flex items-center gap-3.5 border-l-4 border-amber-500">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate2">Destacado / Mejor nota</p>
            <p class="text-sm font-bold text-ink truncate leading-tight mt-0.5" title="${escapeHtml(mejorEstudiante)}">${escapeHtml(mejorEstudiante)}</p>
          </div>
        </div>
      </div>

      <div class="admin-panel-card p-6">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p class="text-sm font-bold text-ink">${escapeHtml(calificacionesAdminState.cohorte)}</p>
            <p class="text-xs text-slate2">${calificacionesAdminState.mes ? escapeHtml(mesLabel(calificacionesAdminState.mes)) : 'General — promedio de todos los meses con notas'}</p>
            
            <!-- Quick Filter Tabs -->
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onclick="cambiarFiltroCalifAdmin('todos')" class="text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${filtroActivo === 'todos' ? 'bg-morado text-white shadow-sm ring-2 ring-morado/20' : 'bg-gray-100 text-slate2 hover:bg-gray-200'}">
                Todos (${estudiantes.length})
              </button>
              <button type="button" onclick="cambiarFiltroCalifAdmin('aprobados')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${filtroActivo === 'aprobados' ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-200' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${filtroActivo === 'aprobados' ? 'bg-white' : 'bg-teal-500'}"></span>Aprobados (${aprobados.length})
              </button>
              <button type="button" onclick="cambiarFiltroCalifAdmin('riesgo')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${filtroActivo === 'riesgo' ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${filtroActivo === 'riesgo' ? 'bg-white' : 'bg-rose-500'}"></span>En riesgo (${enRiesgo.length})
              </button>
              <button type="button" onclick="cambiarFiltroCalifAdmin('sin_notas')" class="text-xs font-semibold px-3 py-1 rounded-full transition cursor-pointer ${filtroActivo === 'sin_notas' ? 'bg-slate-700 text-white shadow-sm' : 'bg-gray-50 text-slate2 border border-gray-200 hover:bg-gray-100'}">
                Sin notas (${sinNotas.length})
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2.5 self-start sm:self-center">
            <span class="text-xs text-slate2 shrink-0">${docentesCohorte.length} docente${docentesCohorte.length !== 1 ? 's' : ''}</span>
            <div class="relative">
              <input data-table="table-calificaciones-admin" oninput="TableManager.filter('table-calificaciones-admin', this.value)" type="text" placeholder="Buscar estudiante..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-3.5 h-3.5 text-morado absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button type="button" onclick="exportarCalificacionesCohorteCSV()" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3 py-1.5 transition shadow-sm cursor-pointer">CSV</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-calificaciones-admin" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Promedio${calificacionesAdminState.mes ? '' : ' general'}</th>
            </tr></thead>
            <tbody>${filas || '<tr><td colspan="2" class="text-sm text-slate2 text-center py-6">No se encontraron estudiantes para este filtro.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-calificaciones-admin');
  }

  // ---------- RENDER: Informes enviados por docentes (agrupados por profesor) ----------
  // Estado del filtro del panel Informes (Admin). mes=null = "General"
  // (todos los informes de la cohorte, sin filtrar por periodo).
  let informesAdminState = { cohorte: null, mes: null, docenteSeleccionado: null };

  // async: 'modulos' vía MySQL.
  async function renderInformesAdmin() {
    const cohortes = await Store.list('modulos');
    if (!informesAdminState.cohorte && cohortes.length) {
      informesAdminState.cohorte = cohortes[0].nombre;
    }

    document.getElementById('mount-informes-admin').innerHTML = `
      <div class="mb-5">
        <h2 class="text-lg font-extrabold text-ink">Informes de docentes</h2>
        <p class="text-sm text-slate2 mt-0.5">Elige una cohorte y un mes: automáticamente aparecerán los profesores con informes de ese periodo. Haz clic en un profesor para ver los informes detallados de cada uno de sus estudiantes.</p>
      </div>
      <div class="admin-panel-card p-6 mb-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="infAdminCohorteSelect">Cohorte</label>
            <select id="infAdminCohorteSelect" onchange="onCambiaInfAdminCohorte()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option value="">Selecciona una cohorte...</option>
              ${cohortes.map(c => `<option value="${escapeHtml(c.nombre)}" ${informesAdminState.cohorte === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5" for="infAdminMesSelect">Periodo (Mes)</label>
            <select id="infAdminMesSelect" onchange="onCambiaInfAdminMes()" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" ${informesAdminState.cohorte ? '' : 'disabled'}>
              <option value="">General (todos los meses)</option>
            </select>
          </div>
        </div>
      </div>
      <div id="infAdminResultado"></div>`;

    await poblarMesesInfAdmin();
    await renderInfAdminResultado();
  }

  // async: 'informes_docente' y 'horarios' vía MySQL.
  async function poblarMesesInfAdmin() {
    const mesSelect = document.getElementById('infAdminMesSelect');
    if (!mesSelect) return;
    if (!informesAdminState.cohorte) {
      mesSelect.innerHTML = '<option value="">General (todos los meses)</option>';
      mesSelect.disabled = true;
      return;
    }
    const meses = new Set();
    const informes = await Store.list('informes_docente');
    informes
      .filter(i => i.cohorte === informesAdminState.cohorte && i.estado === 'Enviado' && i.fecha)
      .forEach(i => meses.add(i.fecha.slice(0, 7)));

    const horarios = await Store.list('horarios');
    horarios
      .filter(h => h.cohorte === informesAdminState.cohorte && h.mes)
      .forEach(h => meses.add(h.mes));

    const mesesOrdenados = [...meses].sort().reverse();
    mesSelect.disabled = false;
    mesSelect.innerHTML = '<option value="">General (todos los meses)</option>' +
      mesesOrdenados.map(m => `<option value="${m}" ${informesAdminState.mes === m ? 'selected' : ''}>${mesLabel(m)}</option>`).join('');
  }

  // async: 'informes_docente' vía MySQL.
  async function onCambiaInfAdminCohorte() {
    const sel = document.getElementById('infAdminCohorteSelect');
    informesAdminState.cohorte = sel.value || null;
    informesAdminState.mes = null;
    informesAdminState.docenteSeleccionado = null;
    await poblarMesesInfAdmin();
    await renderInfAdminResultado();
  }
  window.onCambiaInfAdminCohorte = onCambiaInfAdminCohorte;

  // async: 'informes_docente' vía MySQL.
  async function onCambiaInfAdminMes() {
    const sel = document.getElementById('infAdminMesSelect');
    informesAdminState.mes = sel.value || null;
    informesAdminState.docenteSeleccionado = null;
    await renderInfAdminResultado();
  }
  window.onCambiaInfAdminMes = onCambiaInfAdminMes;

  async function seleccionarDocenteInfAdmin(nombreDocente) {
    informesAdminState.docenteSeleccionado = nombreDocente;
    await renderInfAdminResultado();
  }
  window.seleccionarDocenteInfAdmin = seleccionarDocenteInfAdmin;

  // Obtiene el curso real que dicta un docente en una cohorte/mes según el Horario.
  // Evita usar 'Formacion' (que es el tipo de módulo de la cohorte) y prioriza el curso del horario.
  async function cursoDeDocenteEnCohorte(docenteNombre, cohorteNombre, mes) {
    if (!docenteNombre) return 'Curso asignado';
    const slotsDocente = await getSlotsDocente(docenteNombre);
    // 1. Filtrar por cohorte y mes si se especifica
    if (cohorteNombre && mes) {
      const match = slotsDocente.filter(s => s.cohorte === cohorteNombre && s.mes === mes);
      const cursos = [...new Set(match.map(s => s.curso || s.materia))].filter(c => c && c !== '(sin curso)' && c !== '(sin materia)' && c !== 'Formacion' && c !== 'Formación');
      if (cursos.length) return cursos.join(' / ');
    }
    // 2. Filtrar por cohorte en cualquier mes
    if (cohorteNombre) {
      const match = slotsDocente.filter(s => s.cohorte === cohorteNombre);
      const cursos = [...new Set(match.map(s => s.curso || s.materia))].filter(c => c && c !== '(sin curso)' && c !== '(sin materia)' && c !== 'Formacion' && c !== 'Formación');
      if (cursos.length) return cursos.join(' / ');
    }
    // 3. Cualquier curso activo del docente en el horario
    const cursosGen = [...new Set(slotsDocente.map(s => s.curso || s.materia))].filter(c => c && c !== '(sin curso)' && c !== '(sin materia)' && c !== 'Formacion' && c !== 'Formación');
    if (cursosGen.length) return cursosGen.join(' / ');

    // 4. Pensum si aplica
    const pensum = await Store.list('pensum');
    const matchPensum = pensum.filter(p => p.docente === docenteNombre && (!cohorteNombre || p.cohorte === cohorteNombre));
    const cursosPensum = [...new Set(matchPensum.map(p => p.modulo || p.curso))].filter(c => c && c !== 'Formacion' && c !== 'Formación');
    if (cursosPensum.length) return cursosPensum.join(' / ');

    return 'Curso asignado';
  }
  window.cursoDeDocenteEnCohorte = cursoDeDocenteEnCohorte;

  // ---------- MODAL INTERACTIVO DE DETALLE COMPLETO DE INFORME ----------
  async function abrirModalDetalleInforme(informeIdOData) {
    let inf = null;
    if (typeof informeIdOData === 'object' && informeIdOData !== null) {
      inf = informeIdOData;
    } else {
      const informes = await Store.list('informes_docente');
      inf = informes.find(i => String(i.id) === String(informeIdOData));
    }
    if (!inf) {
      toast('No se encontró el detalle de este informe', 'err');
      return;
    }

    const iniciales = (inf.estudiante || 'E').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'E';
    const numPromedio = (inf.promedio !== null && inf.promedio !== undefined && !isNaN(Number(inf.promedio))) ? Number(inf.promedio) : null;
    const colorNota = numPromedio !== null ? colorCualitativa(numPromedio) : '#8B5CF6';
    const cualitativa = inf.cualitativa || (numPromedio !== null ? calificacionCualitativa(numPromedio) : 'Sin calificación');
    const asistPct = (inf.asistenciaPct !== null && inf.asistenciaPct !== undefined) ? inf.asistenciaPct + '%' : 'Sin datos';
    const notaCuant = numPromedio !== null ? numPromedio.toFixed(1) : 'Sin nota';

    const modalHtml = `
      <div id="modalDetalleInformeBackdrop" class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-sm animate-fadeIn" onclick="if(event.target===this) cerrarModalDetalleInforme()">
        <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
          
          <!-- Encabezado con estilo membretado -->
          <div class="px-6 py-4.5 text-white flex items-center justify-between gap-4 border-b border-white/10" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%);">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold text-sm shadow-inner border border-white/15">
                <svg class="w-5 h-5 text-turquesa" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <div>
                <p class="text-[10px] uppercase font-bold tracking-widest text-turquesa">Informe Oficial de Desempeño</p>
                <h3 class="text-base font-extrabold text-white leading-tight">${escapeHtml(inf.cohorte || 'Cohorte')} · ${escapeHtml(mesLabel(inf.mes || (inf.fecha || '').slice(0, 7)))}</h3>
              </div>
            </div>
            <button type="button" onclick="cerrarModalDetalleInforme()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer" title="Cerrar">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Cuerpo interactivo y estructurado -->
          <div class="p-6 overflow-y-auto space-y-5">
            
            <!-- Ficha del Estudiante y Docente -->
            <div class="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5">
                <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-morado to-turquesa text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">${escapeHtml(iniciales)}</span>
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-morado bg-morado/10 px-2 py-0.5 rounded-md">Estudiante</span>
                  <h4 class="text-base font-black text-ink leading-snug mt-0.5">${escapeHtml(inf.estudiante)}</h4>
                  <p class="text-xs text-slate2">Materia: <strong class="text-ink">${escapeHtml(inf.materia || inf.curso || 'Curso')}</strong></p>
                </div>
              </div>
              <div class="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200 w-full sm:w-auto">
                <p class="text-[11px] text-slate2">Docente evaluador</p>
                <p class="text-xs font-bold text-ink">${escapeHtml(inf.docente || 'Docente')}</p>
                <p class="text-[10px] text-slate2/80 mt-0.5">Radicado el ${inf.fecha ? fmtDate(inf.fecha) : '—'}</p>
              </div>
            </div>

            <!-- Métricas Clave (Asistencia, Nota y Cualitativa) -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-soft">
                <p class="text-[10px] font-bold uppercase text-slate2 mb-1">Asistencia</p>
                <p class="text-xl font-black text-ink">${asistPct}</p>
                <span class="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${Number(inf.asistenciaPct) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${Number(inf.asistenciaPct) >= 80 ? 'Cumple meta' : 'Bajo revisión'}
                </span>
              </div>

              <div class="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-soft">
                <p class="text-[10px] font-bold uppercase text-slate2 mb-1">Nota Cuantitativa</p>
                <p class="text-xl font-black" style="color:${colorNota}">${notaCuant}</p>
                <span class="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate2">Escala 10.0</span>
              </div>

              <div class="bg-white rounded-2xl p-3.5 text-center border border-gray-100 shadow-soft">
                <p class="text-[10px] font-bold uppercase text-slate2 mb-1">Desempeño</p>
                <p class="text-sm font-extrabold truncate" style="color:${colorNota}">${escapeHtml(cualitativa)}</p>
                <span class="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style="background:${colorNota}1A; color:${colorNota}">Oficial</span>
              </div>
            </div>

            <!-- Conclusión Automática de Rendimiento -->
            <div class="bg-slate-50/90 rounded-2xl p-4 border border-gray-200/60">
              <div class="flex items-center gap-2 mb-1.5">
                <svg class="w-4 h-4 text-morado shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <h5 class="text-xs font-bold text-ink uppercase tracking-wider">Conclusión de Rendimiento</h5>
              </div>
              <p class="text-xs sm:text-sm text-ink leading-relaxed">${escapeHtml(inf.conclusion || 'Sin conclusión registrada.')}</p>
            </div>

            <!-- Observaciones Personales del Docente -->
            <div class="bg-gradient-to-br from-morado/5 to-turquesa/5 rounded-2xl p-4 border border-morado/20">
              <div class="flex items-center gap-2 mb-1.5">
                <svg class="w-4 h-4 text-morado shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                <h5 class="text-xs font-bold text-morado uppercase tracking-wider">Observaciones del Docente</h5>
              </div>
              <p class="text-xs sm:text-sm font-medium text-ink leading-relaxed whitespace-pre-wrap">${escapeHtml(inf.observaciones || 'El docente no añadió observaciones cualitativas adicionales.')}</p>
            </div>

          </div>

          <!-- Footer del modal -->
          <div class="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            <span class="text-[11px] text-slate2 font-medium flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Informe radicado con éxito
            </span>
            <button type="button" onclick="cerrarModalDetalleInforme()" class="px-5 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer">
              Cerrar
            </button>
          </div>

        </div>
      </div>`;

    let cont = document.getElementById('modalDetalleInformeContainer');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'modalDetalleInformeContainer';
      document.body.appendChild(cont);
    }
    cont.innerHTML = modalHtml;
  }
  window.abrirModalDetalleInforme = abrirModalDetalleInforme;

  function cerrarModalDetalleInforme() {
    const cont = document.getElementById('modalDetalleInformeContainer');
    if (cont) cont.innerHTML = '';
  }
  window.cerrarModalDetalleInforme = cerrarModalDetalleInforme;

  // async: 'informes_docente' vía MySQL.
  async function renderInfAdminResultado() {
    const wrap = document.getElementById('infAdminResultado');
    if (!wrap) return;
    if (!informesAdminState.cohorte) {
      wrap.innerHTML = `<div class="admin-panel-card p-10 text-center"><p class="text-sm text-slate2">Selecciona una cohorte para ver sus informes.</p></div>`;
      return;
    }

    const informes = (await Store.list('informes_docente')).filter(i =>
      i.cohorte === informesAdminState.cohorte && i.estado === 'Enviado' &&
      (!informesAdminState.mes || (i.fecha || '').slice(0, 7) === informesAdminState.mes || i.mes === informesAdminState.mes)
    );

    const porDocente = {};
    informes.forEach(i => {
      const docNombre = i.docente || 'Sin docente';
      if (!porDocente[docNombre]) porDocente[docNombre] = [];
      porDocente[docNombre].push(i);
    });

    const docentesConInformes = Object.keys(porDocente).sort((a, b) => a.localeCompare(b));

    if (!docentesConInformes.length) {
      wrap.innerHTML = `
        <div class="admin-panel-card p-10 text-center">
          <div class="w-12 h-12 rounded-2xl bg-morado/10 text-morado grid place-items-center mx-auto mb-3">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <p class="text-base font-extrabold text-ink">No hay informes enviados para este periodo</p>
          <p class="text-xs text-slate2 mt-1 max-w-md mx-auto leading-relaxed">Los docentes de la cohorte "${escapeHtml(informesAdminState.cohorte)}" aún no han enviado informes para ${informesAdminState.mes ? mesLabel(informesAdminState.mes) : 'este periodo'}.</p>
        </div>`;
      return;
    }

    // Si el docente seleccionado no está o es nulo, preseleccionar el primero
    if (!informesAdminState.docenteSeleccionado || !docentesConInformes.includes(informesAdminState.docenteSeleccionado)) {
      informesAdminState.docenteSeleccionado = docentesConInformes[0];
    }

    // 1. Selector visual e interactivo de profesores
    const botonesDocenteHtml = (await Promise.all(docentesConInformes.map(async docNombre => {
      const listaDoc = porDocente[docNombre];
      const esActivo = docNombre === informesAdminState.docenteSeleccionado;
      let cursosDoc = [...new Set(listaDoc.map(i => i.curso || i.materia))].filter(c => c && c !== 'Formacion' && c !== 'Formación').join(', ');
      if (!cursosDoc) {
        cursosDoc = await cursoDeDocenteEnCohorte(docNombre, informesAdminState.cohorte, informesAdminState.mes);
      }
      const inicial = docNombre.charAt(0).toUpperCase();

      return `
        <button type="button" onclick="seleccionarDocenteInfAdmin('${escapeHtml(docNombre)}')"
          class="group text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${esActivo ? 'bg-morado/10 border-morado shadow-md ring-2 ring-morado/25 scale-[1.01]' : 'bg-white border-gray-200/80 hover:border-morado/40 hover:bg-gray-50/80'}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-xl ${esActivo ? 'bg-gradient-to-br from-morado to-indigo-600 text-white shadow-sm shadow-morado/30' : 'bg-morado/10 text-morado'} font-extrabold grid place-items-center text-sm shrink-0 transition-transform group-hover:scale-105">
              ${inicial}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="font-extrabold text-sm text-ink truncate">${escapeHtml(docNombre)}</p>
                ${esActivo ? '<span class="w-2 h-2 rounded-full bg-morado animate-pulse"></span>' : ''}
              </div>
              <p class="text-xs text-slate2 truncate mt-0.5">${escapeHtml(cursosDoc)}</p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-bold ${esActivo ? 'bg-morado text-white shadow-sm' : 'bg-gray-100 text-slate2'}">
              ${listaDoc.length} estudiante${listaDoc.length !== 1 ? 's' : ''}
            </span>
          </div>
        </button>`;
    }))).join('');

    // 2. Detalle de estudiantes del docente seleccionado en tabla limpia y compacta
    const listaSeleccionada = porDocente[informesAdminState.docenteSeleccionado] || [];
    const listaOrdenada = listaSeleccionada.slice().sort((a, b) => (a.estudiante || '').localeCompare(b.estudiante || ''));

    const cursoDocenteSeleccionado = await cursoDeDocenteEnCohorte(informesAdminState.docenteSeleccionado, informesAdminState.cohorte, informesAdminState.mes);

    const notasValidas = listaOrdenada.filter(i => i.promedio !== null && i.promedio !== undefined).map(i => Number(i.promedio));
    const promDocente = notasValidas.length ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1) : '—';
    const asistValidas = listaOrdenada.filter(i => i.asistenciaPct !== null && i.asistenciaPct !== undefined).map(i => Number(i.asistenciaPct));
    const asistDocente = asistValidas.length ? Math.round(asistValidas.reduce((a, b) => a + b, 0) / asistValidas.length) + '%' : '—';

    const filasEstudiantes = listaOrdenada.map(i => {
      let cursoEst = (i.curso || (i.materia && i.materia !== 'Formacion' && i.materia !== 'Formación' ? i.materia : null)) || cursoDocenteSeleccionado;
      return `
      <tr onclick="abrirModalDetalleInforme('${escapeHtml(i.id)}')" class="border-b border-gray-50 last:border-0 hover:bg-morado/5 transition cursor-pointer group" title="Clic para ver reporte completo de ${escapeHtml(i.estudiante)}">
        <td class="py-3 px-4 text-sm font-semibold text-ink">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-turquesa/15 text-turquesa font-bold text-xs grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              ${(i.estudiante || 'E').charAt(0).toUpperCase()}
            </span>
            <div class="min-w-0">
              <p class="font-bold text-ink leading-tight">${escapeHtml(i.estudiante)}</p>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(cursoEst || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2 whitespace-nowrap">${i.fecha ? fmtDate(i.fecha) : '—'}</td>
        <td class="py-3 px-4 text-sm whitespace-nowrap">
          ${i.asistenciaPct !== null && i.asistenciaPct !== undefined
            ? `<span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${Number(i.asistenciaPct) >= 80 ? 'bg-turquesa/10 text-turquesa' : 'bg-coral/10 text-coral'}">${i.asistenciaPct}%</span>`
            : '<span class="text-slate2 text-xs">Sin datos</span>'}
        </td>
        <td class="py-3 px-4 text-sm whitespace-nowrap">
          ${i.promedio !== null && i.promedio !== undefined
            ? `<span class="font-extrabold text-sm" style="color:${colorCualitativa(i.promedio)}">${Number(i.promedio).toFixed(1)}</span>
               <span class="text-[11px] font-semibold text-slate2 ml-1">(${escapeHtml(i.cualitativa || '')})</span>`
            : '<span class="text-slate2 text-xs">Sin datos</span>'}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="event.stopPropagation(); abrirModalDetalleInforme('${escapeHtml(i.id)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition shadow-xs cursor-pointer">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>Ver reporte</span>
          </button>
        </td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <div class="mb-6">
        <div class="flex items-center justify-between gap-3 mb-3">
          <p class="text-xs font-bold uppercase tracking-wider text-slate2">
            Profesores con informes en esta cohorte (${docentesConInformes.length})
          </p>
          <span class="text-xs text-morado font-semibold">Toca un profesor para ver sus estudiantes</span>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${botonesDocenteHtml}
        </div>
      </div>

      <div class="admin-panel-card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wide text-morado">Informes individuales</span>
              <span class="text-xs text-slate2">•</span>
              <span class="text-xs font-bold text-slate2">${informesAdminState.mes ? mesLabel(informesAdminState.mes) : 'General (Todos los meses)'}</span>
            </div>
            <h3 class="text-lg font-black text-ink mt-0.5">
              Profesor: ${nombrePersonaClicable(informesAdminState.docenteSeleccionado, 'Docente')}
            </h3>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="bg-gray-50 rounded-xl px-3.5 py-1.5 text-right border border-gray-100">
              <p class="text-[10px] uppercase font-bold text-slate2">Estudiantes evaluados</p>
              <p class="text-sm font-extrabold text-ink">${listaOrdenada.length}</p>
            </div>
            <div class="bg-gray-50 rounded-xl px-3.5 py-1.5 text-right border border-gray-100">
              <p class="text-[10px] uppercase font-bold text-slate2">Promedio del grupo</p>
              <p class="text-sm font-extrabold text-morado">${promDocente}</p>
            </div>
            <div class="bg-gray-50 rounded-xl px-3.5 py-1.5 text-right border border-gray-100">
              <p class="text-[10px] uppercase font-bold text-slate2">Asistencia media</p>
              <p class="text-sm font-extrabold text-turquesa">${asistDocente}</p>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full admin-table">
            <thead>
              <tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
                <th class="py-3 px-4">Estudiante</th>
                <th class="py-3 px-4">Curso</th>
                <th class="py-3 px-4">Fecha</th>
                <th class="py-3 px-4">Asistencia</th>
                <th class="py-3 px-4">Nota</th>
                <th class="py-3 px-4 text-right">Reporte Detallado</th>
              </tr>
            </thead>
            <tbody>
              ${filasEstudiantes || '<tr><td colspan="6" class="py-6 text-center text-sm text-slate2">No hay estudiantes informados para este profesor.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- RENDER: Encuestas de satisfacción ----------
  // async: 'encuestas' vía MySQL.
  async function renderEncuestas() {
    // Tanto Superadmin como Administración pueden crear y editar encuestas.
    const puedeEditar = true;
    const records = [...(await Store.list('encuestas'))].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const rows = records.map(e => `
      <tr data-search="${escapeHtml((e.titulo + ' ' + (e.cohorte || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink">${escapeHtml(e.titulo)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(e.cohorte || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2">${fmtDate(e.fecha)}</td>
        <td class="py-3 px-4 text-sm">${e.url ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="text-morado font-semibold hover:underline">Abrir link ↗</a>` : '—'}</td>
        <td class="py-3 px-4">${statusPill(e.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          ${puedeEditar ? `<button onclick="openModal('encuestas','${e.id}')" class="text-xs font-semibold text-morado hover:underline mr-3">Editar</button>
          <button onclick="askDelete('encuestas','${e.id}')" class="text-xs font-semibold text-coral hover:underline">Eliminar</button>` : `<span class="text-xs text-slate2">Solo lectura</span>`}
        </td>
      </tr>`).join('');

    document.getElementById('mount-encuestas').innerHTML = `
      <div class="admin-panel-card p-6">
        ${sectionHeader('encuestas', 'Encuestas de satisfacción', 'Link externo (Google Forms u otro) enviado a los estudiantes de la cohorte elegida', null, puedeEditar)}
        ${!puedeEditar ? `<p class="text-xs text-slate2 -mt-2 mb-4">Acceso de solo lectura: la cuenta de Administración puede consultar las encuestas, pero no editarlas ni crear nuevas.</p>` : ''}
        <p class="text-xs text-slate2 -mt-2 mb-4">Las respuestas y su análisis se consultan directamente en la herramienta externa (ej. Google Forms) — la plataforma solo guarda el link y a quién se le envió.</p>
        <div class="overflow-x-auto">
          <table id="table-encuestas" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Encuesta</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Link</th><th class="py-2.5 px-4">Estado</th><th class="py-2.5 px-4"></th>
            </tr></thead>
            <tbody>${rows || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ---------- RENDER: Configuración ----------
  // ---------- RENDER: Auditoría (solo Superadmin) ----------
  // Tres bitácoras de solo lectura: intentos de login (cualquier rol),
  // acciones dentro del sistema, y cambios de Materia/Docente en el
  // Horario (quién, cuándo, antes→ahora). Las tres ya viven en MySQL.
  // async: 'auditoria_login'/'auditoria_acciones'/'auditoria_horario' vía MySQL.
  let auditoriaLoginFiltro = 'todos'; // 'todos' | 'Fallido' | 'Exitoso'

  function cambiarFiltroAuditoriaLogin(filtro) {
    auditoriaLoginFiltro = filtro || 'todos';
    renderAuditoria();
  }
  window.cambiarFiltroAuditoriaLogin = cambiarFiltroAuditoriaLogin;

  async function renderAuditoria() {
    const logins = await Store.list('auditoria_login');
    const cambios = await Store.list('auditoria_horario');
    const acciones = await Store.list('auditoria_acciones');

    const fallidosCount = logins.filter(l => l.resultado === 'Fallido').length;
    const exitososCount = logins.filter(l => l.resultado === 'Exitoso').length;

    const loginsFiltrados = auditoriaLoginFiltro === 'todos'
      ? logins
      : logins.filter(l => l.resultado === auditoriaLoginFiltro);

    const filasLogin = loginsFiltrados.map(l => `
      <tr data-search="${escapeHtml((l.fecha + ' ' + l.hora + ' ' + (l.rol || '') + ' ' + l.email + ' ' + l.resultado).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${fmtDate(l.fecha)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(l.hora)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(l.rol || 'Superadmin')}</td>
        <td class="py-2.5 px-4 text-sm text-ink font-semibold">${escapeHtml(l.email)}</td>
        <td class="py-2.5 px-4">${statusPill(l.resultado, { 'Exitoso': { bg: '#1FC8C01A', text: '#0f8f89' }, 'Fallido': { bg: '#F0455C1A', text: '#F0455C' } })}</td>
      </tr>`).join('');

    const filasAcciones = acciones.map(a => `
      <tr data-search="${escapeHtml((a.fecha + ' ' + a.hora + ' ' + (a.rol || '') + ' ' + a.actor + ' ' + a.tipo + ' ' + (a.detalle || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${fmtDate(a.fecha)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(a.hora)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(a.rol || '—')}</td>
        <td class="py-2.5 px-4 text-sm text-ink font-semibold">${escapeHtml(a.actor)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(a.tipo)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(a.detalle || '—')}</td>
      </tr>`).join('');

    const filasCambios = cambios.map(c => `
      <tr data-search="${escapeHtml((c.fecha + ' ' + c.hora + ' ' + c.autor + ' ' + c.cohorte + ' ' + c.mes + ' ' + c.franja + ' ' + c.campo + ' ' + c.valorAnterior + ' ' + c.valorNuevo).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${fmtDate(c.fecha)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(c.hora)}</td>
        <td class="py-2.5 px-4 text-sm text-ink font-semibold">${escapeHtml(c.autor)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(c.cohorte)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(c.mes)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2 whitespace-nowrap">${escapeHtml(c.franja)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(c.campo)}</td>
        <td class="py-2.5 px-4 text-sm text-coral">${escapeHtml(c.valorAnterior)}</td>
        <td class="py-2.5 px-4 text-sm text-turquesa font-semibold">${escapeHtml(c.valorNuevo)}</td>
      </tr>`).join('');

    document.getElementById('mount-auditoria').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 class="text-lg font-extrabold text-ink tracking-tight">Auditoría de accesos</h2>
            <p class="text-xs text-slate2 mt-0.5">${logins.length} intento${logins.length === 1 ? '' : 's'} de inicio de sesión registrado${logins.length === 1 ? '' : 's'} (Superadmin, Coordinador, Docente y Estudiante).</p>
            <div class="flex flex-wrap items-center gap-2 mt-2.5">
              <button type="button" onclick="cambiarFiltroAuditoriaLogin('todos')" class="text-xs font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${auditoriaLoginFiltro === 'todos' ? 'bg-morado text-white shadow-xs' : 'bg-gray-100 text-slate2 hover:bg-gray-200'}">
                Todos (${logins.length})
              </button>
              <button type="button" onclick="cambiarFiltroAuditoriaLogin('Fallido')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${auditoriaLoginFiltro === 'Fallido' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${auditoriaLoginFiltro === 'Fallido' ? 'bg-white' : 'bg-rose-500'}"></span>
                Fallidos (${fallidosCount})
              </button>
              <button type="button" onclick="cambiarFiltroAuditoriaLogin('Exitoso')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${auditoriaLoginFiltro === 'Exitoso' ? 'bg-teal-600 text-white shadow-xs' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'}">
                <span class="w-1.5 h-1.5 rounded-full ${auditoriaLoginFiltro === 'Exitoso' ? 'bg-white' : 'bg-teal-500'}"></span>
                Exitosos (${exitososCount})
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-center">
            <div class="relative">
              <input data-table="table-auditoria-login" oninput="TableManager.filter('table-auditoria-login', this.value)" type="text" placeholder="Buscar acceso..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-3.5 h-3.5 text-morado absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportCSV('auditoria_login')" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3 py-1.5 transition shadow-sm">CSV</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-auditoria-login" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Hora</th><th class="py-2.5 px-4">Rol</th><th class="py-2.5 px-4">Correo</th><th class="py-2.5 px-4">Resultado</th>
            </tr></thead>
            <tbody>${filasLogin || emptyRow(5)}</tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 class="text-lg font-extrabold text-ink tracking-tight">Auditoría de acciones</h2>
            <p class="text-xs text-slate2 mt-0.5">${acciones.length} acción${acciones.length === 1 ? '' : 'es'} registrada${acciones.length === 1 ? '' : 's'} dentro del sistema (ej. notas actualizadas por un docente).</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input data-table="table-auditoria-acciones" oninput="TableManager.filter('table-auditoria-acciones', this.value)" type="text" placeholder="Buscar acción..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-3.5 h-3.5 text-morado absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportCSV('auditoria_acciones')" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3 py-1.5 transition shadow-sm">CSV</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-auditoria-acciones" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Hora</th><th class="py-2.5 px-4">Rol</th><th class="py-2.5 px-4">Quién</th><th class="py-2.5 px-4">Acción</th><th class="py-2.5 px-4">Detalle</th>
            </tr></thead>
            <tbody>${filasAcciones || emptyRow(6)}</tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel-card p-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 class="text-lg font-extrabold text-ink tracking-tight">Auditoría de cambios en el Horario</h2>
            <p class="text-xs text-slate2 mt-0.5">${cambios.length} cambio${cambios.length === 1 ? '' : 's'} de Materia o Docente registrado${cambios.length === 1 ? '' : 's'}, con quién lo hizo y cuándo.</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input data-table="table-auditoria-horario" oninput="TableManager.filter('table-auditoria-horario', this.value)" type="text" placeholder="Buscar cambio..." class="rounded-xl border border-morado/30 bg-morado/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition text-ink" />
              <svg class="w-3.5 h-3.5 text-morado absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="exportCSV('auditoria_horario')" class="rounded-xl border border-gray-200 text-slate2 hover:text-ink hover:bg-gray-50 text-xs sm:text-sm font-semibold px-3 py-1.5 transition shadow-sm">CSV</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-auditoria-horario" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Fecha</th><th class="py-2.5 px-4">Hora</th><th class="py-2.5 px-4">Autor</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Mes</th><th class="py-2.5 px-4">Franja</th><th class="py-2.5 px-4">Campo</th><th class="py-2.5 px-4">Antes</th><th class="py-2.5 px-4">Ahora</th>
            </tr></thead>
            <tbody>${filasCambios || emptyRow(9)}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-auditoria-login');
    TableManager.init('table-auditoria-acciones');
    TableManager.init('table-auditoria-horario');
  }

  // async: 'configuracion' y 'superadmin_credentials' vía MySQL (Fase 4).
  async function renderConfiguracion() {
    const cfg = (await Store.get('configuracion')) || SEED.configuracion;
    const cred = (await Store.get('superadmin_credentials')) || SEED.superadmin_credentials;
    const seguridadSuperadmin = currentAdminRole === 'superadmin' ? `
      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl mt-6">
        <h2 class="text-lg font-extrabold text-ink mb-1">Seguridad del Superadmin</h2>
        <p class="text-sm text-slate2 mb-6">Cambia el correo y/o la contraseña con los que inicias sesión como Superadmin. Debes confirmar tu contraseña actual para guardar cambios.</p>
        <form onsubmit="event.preventDefault(); guardarCredencialesSuperadmin();" class="grid gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo de acceso</label>
            <input id="sa_email" type="email" value="${escapeHtml(cred.email)}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Contraseña actual</label>
            <input id="sa_actual" type="text" autocomplete="off" placeholder="Requerida para confirmar el cambio" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nueva contraseña</label>
            <input id="sa_nueva" type="text" autocomplete="new-password" placeholder="Déjala en blanco para no cambiarla" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="guardarCredencialesSuperadmin()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition shadow-sm">Guardar credenciales</button>
        </div>
      </div>` : '';

    document.getElementById('mount-configuracion').innerHTML = `
      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl">
        <h2 class="text-lg font-extrabold text-ink mb-1">Configuración general</h2>
        <p class="text-sm text-slate2 mb-6">Parámetros institucionales que usa el panel para calcular alertas y el semáforo de riesgo.</p>
        <form id="configForm" onsubmit="event.preventDefault(); saveConfiguracion();" class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre de la fundación</label>
            <input id="cfg_nombre" type="text" value="${escapeHtml(cfg.nombre)}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Ciudad (para cartas y memorandos)</label>
            <input id="cfg_ciudad" type="text" value="${escapeHtml(cfg.ciudad || '')}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Dirección</label>
            <input id="cfg_direccion" type="text" placeholder="Ej: Calle 10 #5-20, Quibdó" value="${escapeHtml(cfg.direccion || '')}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo de contacto</label>
            <input id="cfg_correo" type="email" value="${escapeHtml(cfg.correo)}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Teléfono</label>
            <input id="cfg_telefono" type="text" value="${escapeHtml(cfg.telefono)}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asistencia mínima (%)</label>
            <input id="cfg_asistencia" type="number" value="${cfg.asistenciaMinima}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            <p class="text-xs text-slate2 mt-1.5">Solo se usa como referencia en el Semáforo de riesgo — la aprobación de notas depende únicamente del promedio (mínimo 6.0/10, fijo).</p>
          </div>
          <div class="sm:col-span-2 flex items-center gap-6 mt-1">
            <label class="flex items-center gap-2 text-sm text-ink"><input id="cfg_notifEmail" type="checkbox" ${cfg.notificacionesEmail ? 'checked' : ''} class="rounded" /> Notificaciones por correo</label>
            <label class="flex items-center gap-2 text-sm text-ink"><input id="cfg_notifIA" type="checkbox" ${cfg.notificacionesIA ? 'checked' : ''} class="rounded" /> Alertas generadas por IA</label>
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="saveConfiguracion()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition shadow-sm">Guardar configuración</button>
        </div>
      </div>

      <!-- Panel de Notificaciones por Correo (EmailJS / SMTP) -->
      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl mt-6">
        <h2 class="text-lg font-extrabold text-ink mb-1">Servicio de correos (Aprobación de Estudiantes)</h2>
        <p class="text-sm text-slate2 mb-4">Define cómo se enviarán los correos de aprobación/rechazo a los estudiantes inscritos. Puedes usar <strong>EmailJS</strong> (desde el navegador) o un <strong>Servidor SMTP</strong> (directo desde PHP / Gmail / Outlook).</p>

        <div class="mb-4">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Método de envío</label>
          <select id="cfg_emailMetodo" onchange="toggleCamposMetodoEmail(this.value)" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-medium">
            <option value="emailjs" ${(cfg.emailMetodo || 'emailjs') === 'emailjs' ? 'selected' : ''}>EmailJS (Desde el navegador)</option>
            <option value="smtp" ${(cfg.emailMetodo || '') === 'smtp' ? 'selected' : ''}>Servidor SMTP (Directo desde PHP / Gmail / Outlook)</option>
          </select>
        </div>

        <!-- Campos EmailJS -->
        <div id="seccion_emailjs" class="space-y-3 ${(cfg.emailMetodo || 'emailjs') === 'smtp' ? 'hidden' : ''}">
          <div class="rounded-xl p-3.5 bg-morado/5 border border-morado/20 text-xs text-slate2 space-y-1">
            <p class="font-bold text-morado">¿Cómo obtener tus credenciales de EmailJS?</p>
            <ol class="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Crea una cuenta gratis en <a href="https://www.emailjs.com/" target="_blank" class="text-morado underline font-semibold">emailjs.com</a>.</li>
              <li>En <em>Email Services</em>, conecta tu Gmail/Outlook y copia el <strong>Service ID</strong>.</li>
              <li>En <em>Email Templates</em>, crea una plantilla con variables <code>{{to_email}}</code>, <code>{{to_name}}</code>, <code>{{subject}}</code>, <code>{{message}}</code> y copia el <strong>Template ID</strong>.</li>
              <li>En <em>Account &gt; General</em>, copia tu <strong>Public Key</strong> y pégala abajo.</li>
            </ol>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1">Public Key (User ID)</label>
            <input id="cfg_emailjsPublicKey" type="text" value="${escapeHtml(cfg.emailjsPublicKey || 'eIyshGVkR2fYZQJfO')}" placeholder="Ej: eIyshGVkR2fYZQJfO" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-mono text-xs" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Service ID</label>
              <input id="cfg_emailjsServiceId" type="text" value="${escapeHtml(cfg.emailjsServiceId || 'service_20mxfgu')}" placeholder="Ej: service_xxx" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-mono text-xs" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Template ID</label>
              <input id="cfg_emailjsTemplateId" type="text" value="${escapeHtml(cfg.emailjsTemplateId || 'template_qvmzl1l')}" placeholder="Ej: template_xxx" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-mono text-xs" />
            </div>
          </div>
        </div>

        <!-- Campos SMTP -->
        <div id="seccion_smtp" class="space-y-3 ${(cfg.emailMetodo || 'emailjs') === 'smtp' ? '' : 'hidden'}">
          <div class="rounded-xl p-3.5 bg-morado/5 border border-morado/20 text-xs text-slate2 space-y-1">
            <p class="font-bold text-morado">Configuración SMTP recomendada (Gmail / Outlook / Hosting)</p>
            <p class="text-[11px]">Para Gmail: Servidor <code>smtp.gmail.com</code>, Puerto <code>465</code> (SSL) o <code>587</code> (TLS). En contraseña, usa una <em>Contraseña de aplicación</em> de Google (16 caracteres) generada en myaccount.google.com/apppasswords.</p>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-slate2 mb-1">Servidor SMTP</label>
              <input id="cfg_smtpHost" type="text" value="${escapeHtml(cfg.smtpHost || 'smtp.gmail.com')}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Puerto</label>
              <input id="cfg_smtpPort" type="number" value="${cfg.smtpPort || 465}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Usuario / Correo emisor</label>
              <input id="cfg_smtpUser" type="email" value="${escapeHtml(cfg.smtpUser || '')}" placeholder="ej: tu_correo@gmail.com" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Contraseña de aplicación</label>
              <input id="cfg_smtpPass" type="password" value="${escapeHtml(cfg.smtpPass || '')}" placeholder="••••••••••••••••" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Nombre / Correo Remitente (From)</label>
              <input id="cfg_smtpFrom" type="text" value="${escapeHtml(cfg.smtpFrom || 'info@fundacionamas.org.co')}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1">Seguridad</label>
              <select id="cfg_smtpSecure" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
                <option value="ssl" ${(cfg.smtpSecure || 'ssl') === 'ssl' ? 'selected' : ''}>SSL (Puerto 465)</option>
                <option value="tls" ${(cfg.smtpSecure || '') === 'tls' ? 'selected' : ''}>TLS (Puerto 587)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Probar envío de correo -->
        <div class="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input id="cfg_correoPrueba" type="email" placeholder="Ingresa tu correo para probar envío" class="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-morado/30 flex-1" />
          <button type="button" onclick="probarEnvioCorreoTest()" class="rounded-xl bg-morado/10 hover:bg-morado/20 text-morado font-bold text-xs px-4 py-2.5 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            <span>Probar envío de correo</span>
          </button>
        </div>

        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="saveConfiguracion()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition shadow-sm cursor-pointer">Guardar configuración</button>
        </div>
      </div>

      <div class="admin-panel-card p-6 sm:p-8 max-w-2xl mt-6">
        <h2 class="text-lg font-extrabold text-ink mb-1">Postulación pública</h2>
        <p class="text-sm text-slate2 mb-6">Controla el botón "Postular" del sitio público. Pega aquí el link del cuestionario externo (Google Forms u otro) donde los interesados dejan sus datos, y actívalo cuando quieras recibir postulaciones.</p>
        <form onsubmit="event.preventDefault(); saveConfiguracion();" class="grid gap-4">
          <label class="flex items-center gap-2 text-sm text-ink">
            <input id="cfg_postulacionHabilitada" type="checkbox" ${cfg.postulacionHabilitada ? 'checked' : ''} class="rounded" />
            Habilitar postulación en el sitio público
          </label>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Link del cuestionario</label>
            <input id="cfg_postulacionUrl" type="url" placeholder="https://forms.gle/..." value="${escapeHtml(cfg.postulacionUrl || '')}" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
            <p class="text-xs text-slate2 mt-1.5">Mientras esté deshabilitada, el botón "Postular" del sitio mostrará un aviso de que las postulaciones están cerradas, sin importar el link que hayas guardado aquí.</p>
          </div>
        </form>
        <div class="mt-6 pt-5 border-t border-gray-100">
          <button onclick="saveConfiguracion()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition shadow-sm">Guardar configuración</button>
        </div>
      </div>
      ${seguridadSuperadmin}`;
  }

  function toggleCamposMetodoEmail(metodo) {
    const elEmailjs = document.getElementById('seccion_emailjs');
    const elSmtp = document.getElementById('seccion_smtp');
    if (elEmailjs) elEmailjs.classList.toggle('hidden', metodo === 'smtp');
    if (elSmtp) elSmtp.classList.toggle('hidden', metodo !== 'smtp');
  }
  window.toggleCamposMetodoEmail = toggleCamposMetodoEmail;

  async function probarEnvioCorreoTest() {
    const emailInput = document.getElementById('cfg_correoPrueba');
    const email = (emailInput ? emailInput.value : '').trim();
    if (!email) {
      toast('Ingresa un correo electrónico para enviar la prueba.', 'err');
      if (emailInput) emailInput.focus();
      return;
    }
    toast('Enviando correo de prueba...', 'ok');
    const res = await notificarEstadoRegistroPorCorreo(email, 'Usuario de Prueba', 'aprobado', {
      password: 'DemoPassword123*',
      passwordModificada: true,
      cohorte: 'Cohorte 1 (Demostración)',
    });
    if (res && res.ok) {
      toast('¡Correo de prueba enviado con éxito a ' + email + '!', 'ok');
    }
  }
  window.probarEnvioCorreoTest = probarEnvioCorreoTest;

  // Cambia el correo y/o la contraseña con los que se inicia sesión como
  // Superadmin. Exige la contraseña actual para confirmar el cambio; si
  // "Nueva contraseña" se deja en blanco, conserva la que ya tenía.
  // async: 'superadmin_credentials' vía MySQL (Fase 4).
  async function guardarCredencialesSuperadmin() {
    const cred = (await Store.get('superadmin_credentials')) || SEED.superadmin_credentials;
    const nuevoEmail = document.getElementById('sa_email').value.trim();
    const actual = document.getElementById('sa_actual').value;
    const nueva = document.getElementById('sa_nueva').value;

    if (!nuevoEmail) { toast('El correo no puede quedar vacío', 'err'); return; }
    if (actual !== cred.password) { toast('La contraseña actual no es correcta', 'err'); return; }

    await Store.set('superadmin_credentials', { email: nuevoEmail, password: nueva !== '' ? nueva : cred.password });
    document.getElementById('sa_actual').value = '';
    document.getElementById('sa_nueva').value = '';
    toast('Credenciales del Superadmin actualizadas', 'ok');
  }

  // async: 'configuracion' vía MySQL (Fase 4).
  async function saveConfiguracion() {
    const urlPostulacion = document.getElementById('cfg_postulacionUrl').value.trim();
    const habilitarPostulacion = document.getElementById('cfg_postulacionHabilitada').checked;

    if (habilitarPostulacion && !urlPostulacion) {
      toast('Para habilitar la postulación primero pega el link del cuestionario', 'err');
      return;
    }

    const cfg = {
      nombre: document.getElementById('cfg_nombre').value.trim(),
      ciudad: document.getElementById('cfg_ciudad').value.trim(),
      direccion: document.getElementById('cfg_direccion').value.trim(),
      correo: document.getElementById('cfg_correo').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim(),
      asistenciaMinima: parseFloat(document.getElementById('cfg_asistencia').value) || 0,
      notificacionesEmail: document.getElementById('cfg_notifEmail').checked,
      notificacionesIA: document.getElementById('cfg_notifIA').checked,
      postulacionHabilitada: habilitarPostulacion,
      postulacionUrl: urlPostulacion,
      emailMetodo: document.getElementById('cfg_emailMetodo') ? document.getElementById('cfg_emailMetodo').value : 'emailjs',
      emailjsPublicKey: document.getElementById('cfg_emailjsPublicKey') ? document.getElementById('cfg_emailjsPublicKey').value.trim() : '',
      emailjsServiceId: document.getElementById('cfg_emailjsServiceId') ? document.getElementById('cfg_emailjsServiceId').value.trim() : '',
      emailjsTemplateId: document.getElementById('cfg_emailjsTemplateId') ? document.getElementById('cfg_emailjsTemplateId').value.trim() : '',
      smtpHost: document.getElementById('cfg_smtpHost') ? document.getElementById('cfg_smtpHost').value.trim() : 'smtp.gmail.com',
      smtpPort: document.getElementById('cfg_smtpPort') ? parseInt(document.getElementById('cfg_smtpPort').value, 10) || 465 : 465,
      smtpUser: document.getElementById('cfg_smtpUser') ? document.getElementById('cfg_smtpUser').value.trim() : '',
      smtpPass: document.getElementById('cfg_smtpPass') ? document.getElementById('cfg_smtpPass').value : '',
      smtpFrom: document.getElementById('cfg_smtpFrom') ? document.getElementById('cfg_smtpFrom').value.trim() : 'info@fundacionamas.org.co',
      smtpSecure: document.getElementById('cfg_smtpSecure') ? document.getElementById('cfg_smtpSecure').value : 'ssl',
    };
    await Store.set('configuracion', cfg);
    toast('Configuración guardada con éxito', 'ok');
    renderSemaforo();
    renderResumen();
    renderContactoPublico();
    actualizarBotonesPostular();
  }

  // ---------- Sitio público: Contáctanos + Postular (alimentados por Configuración) ----------

  /** Pinta el bloque "Contacto" del footer público con los datos reales de la fundación. */
  // async: 'configuracion' vía MySQL (Fase 4).
  async function renderContactoPublico(cfgDirecta) {
    const el = document.getElementById('contactoPublico');
    if (!el) return; // el sitio público aún no está en el DOM (no debería pasar, pero por seguridad)
    const cfg = cfgDirecta || (await Store.get('configuracion')) || SEED.configuracion;

    const filas = [];
    if (cfg.correo) filas.push(`<a href="mailto:${escapeHtml(cfg.correo)}" class="flex items-center gap-2 hover:text-ink transition">${escapeHtml(cfg.correo)}</a>`);
    if (cfg.telefono) filas.push(`<a href="tel:${escapeHtml(cfg.telefono.replace(/\s+/g, ''))}" class="flex items-center gap-2 hover:text-ink transition">${escapeHtml(cfg.telefono)}</a>`);
    if (cfg.direccion) filas.push(`<span class="flex items-center gap-2">${escapeHtml(cfg.direccion)}${cfg.ciudad ? ', ' + escapeHtml(cfg.ciudad) : ''}</span>`);
    else if (cfg.ciudad) filas.push(`<span class="flex items-center gap-2">${escapeHtml(cfg.ciudad)}</span>`);

    el.innerHTML = filas.join('') || '<span class="text-slate2">Datos de contacto próximamente.</span>';
  }

  /** Activa/desactiva y enlaza los botones "Postular" del sitio con el link que definió el Superadmin. */
  // async: 'configuracion' vía MySQL (Fase 4).
  async function actualizarBotonesPostular(cfgDirecta) {
    const cfg = cfgDirecta || (await Store.get('configuracion')) || SEED.configuracion;
    const habilitada = !!(cfg.postulacionHabilitada && cfg.postulacionUrl);
    document.querySelectorAll('.btn-postular').forEach(btn => {
      btn.classList.toggle('opacity-50', !habilitada);
      btn.title = habilitada ? 'Postula al programa' : 'Las postulaciones no están abiertas en este momento';
    });
  }

  /** onclick de los botones "Postular": abre el cuestionario externo o avisa que está cerrado. */
  // async: 'configuracion' vía MySQL (Fase 4).
  async function abrirPostulacion(event) {
    if (event && event.preventDefault) event.preventDefault();
    const cfg = (await Store.get('configuracion')) || SEED.configuracion;
    if (cfg.postulacionHabilitada && cfg.postulacionUrl) {
      window.open(cfg.postulacionUrl, '_blank', 'noopener');
    } else {
      toast('Las postulaciones no están abiertas en este momento. Vuelve pronto.', 'info');
    }
  }

  const RENDERERS = {
    resumen: renderResumen,
    usuarios: renderUsuarios,
    perfiles: renderPerfiles,
    administradores: renderAdministradores,
    modulos: renderModulos,
    cursos: renderCursos,
    trainee: renderTrainee,
    codigosqr: renderCodigosQr,
    pensum: renderPensum,
    semaforo: renderSemaforo,
    memorandos: renderMemorandos,
    pqr: renderPqr,
    calificaciones: renderCalificaciones,
    informesAdmin: renderInformesAdmin,
    encuestas: renderEncuestas,
    auditoria: renderAuditoria,
    chatvoz: renderChatVozConocimiento,
    configuracion: renderConfiguracion,
  };

  // async porque hace await de seedIfEmpty() (que sí toca 'usuarios',
  // migrada a MySQL) — submitLogin ya la llama con await.
  async function initAdmin() {
    await seedIfEmpty();
    await migrarNotasModulosSinMes();
    if (!ADMIN_BOOTED) {
      ADMIN_BOOTED = true;
    }
    actualizarBadgePqrAdmin();
  }

  /**
   * Panel Docente — módulos funcionales.
   */

  // Cohortes/módulos que dicta el docente que inició sesión.
  // Se calcula a partir del Horario real (docentesDeCohorte), que es la
  // única fuente de verdad de qué docente dicta qué cohorte — el campo
  // "docente" que traía la cohorte ya no se usa para esto.
  // async: 'modulos' vía MySQL.
  async function docenteModulosActivos() {
    const doc = currentDocente || {};
    if (!doc.nombre) return [];
    // docentesDeCohorte() es async (consulta MySQL) — no se puede usar
    // dentro de un .filter() normal (callback síncrono) sin resolver antes
    // cada promesa, o "docentesDeCohorte(...).includes" revienta porque se
    // llama sobre la Promise en vez de sobre el array ya resuelto.
    const modulos = await Store.list('modulos');
    const pertenece = await Promise.all(modulos.map(m => docentesDeCohorte(m.nombre)));
    return modulos.filter((m, i) => pertenece[i].includes(doc.nombre));
  }
  // Estudiantes matriculados en una cohorte (por nombre de cohorte).
  // async: 'usuarios' vía MySQL.
  async function docenteEstudiantesDeCohorte(cohorteNombre) {
    return (await Store.list('usuarios')).filter(u => u.rol === 'Estudiante' && u.cohorte === cohorteNombre);
  }

  // ---------- VISOR DE FOTOS DE PERFIL (LIGHTBOX) ----------
  function expandirFotoPerfil(url, nombre = 'Foto de perfil', rol = '') {
    if (!url) return;
    const modal = document.getElementById('lightboxFotoModal');
    const img = document.getElementById('lightboxFotoImg');
    const nombreEl = document.getElementById('lightboxFotoNombre');
    const rolEl = document.getElementById('lightboxFotoRol');
    const downloadBtn = document.getElementById('lightboxFotoDownload');
    if (!modal || !img) return;

    img.src = url;
    if (nombreEl) nombreEl.textContent = nombre || 'Foto de perfil';
    if (rolEl) rolEl.textContent = rol ? `Fundación A+ · ${rol}` : 'Fundación A+';
    if (downloadBtn) {
      downloadBtn.href = url;
      const safeName = (nombre || 'perfil').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      downloadBtn.download = `foto_${safeName}.jpg`;
    }
    modal.classList.remove('hidden');
  }
  window.expandirFotoPerfil = expandirFotoPerfil;

  function cerrarLightboxFoto() {
    const modal = document.getElementById('lightboxFotoModal');
    if (modal) modal.classList.add('hidden');
    const img = document.getElementById('lightboxFotoImg');
    if (img) img.src = '';
  }
  window.cerrarLightboxFoto = cerrarLightboxFoto;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      cerrarLightboxFoto();
    }
  });

  // ---------- RENDER: Resumen (docente) ----------
  // ---------- PERFIL (docente) ----------
  // Foto de perfil y descripción breve, ambas opcionales. Ambas viven en
  // Store('usuarios') (MySQL, columnas foto_url/descripcion) — la foto se
  // guarda como data URL (base64) directamente en esa columna.
  function renderPerfilDocente() {
    const doc = currentDocente || {};
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Docente')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-turquesa/40 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    document.getElementById('mount-t-perfil').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 max-w-2xl">
        <div class="flex items-center gap-5 mb-6">
          ${avatarHtml}
          <div>
            <p class="text-base font-extrabold text-ink">${escapeHtml(doc.nombre || '')}</p>
            <p class="text-sm text-slate2">${escapeHtml(doc.email || '')}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <label class="text-xs font-semibold text-morado hover:underline cursor-pointer">
                Cambiar foto
                <input id="perfil_foto_input" type="file" accept="image/*" class="hidden" onchange="subirFotoPerfilDocente(this)" />
              </label>
              ${doc.fotoUrl ? `<button onclick="quitarFotoPerfilDocente()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-1">Foto opcional · JPG o PNG, máx. 2 MB</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre completo</label>
            <input id="perfil_nombre" type="text" value="${escapeHtml(doc.nombre || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo electrónico</label>
            <input type="email" value="${escapeHtml(doc.email || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Descripción breve</label>
          <textarea id="perfil_descripcion" rows="3" maxlength="280" placeholder="Ej: Docente de Desarrollo Web, apasionado por enseñar buenas prácticas de programación (opcional)" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30 resize-none">${escapeHtml(doc.descripcion || '')}</textarea>
          <p class="text-[11px] text-slate2 mt-1">Opcional · máx. 280 caracteres</p>
        </div>
        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="text" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
            <input id="perfil_pass2" type="text" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquesa/30" />
          </div>
        </div>
        <button onclick="guardarPerfilDocente()" class="mt-6 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Guardar cambios</button>
      </div>`;
    habilitarEnterEnFormulario('mount-t-perfil', null, false);
  }

  // async: 'usuarios' vía MySQL.
  async function actualizarUsuarioDocenteActual(cambios) {
    const usuarios = (await Store.list('usuarios')).map(u => u.id === currentDocente.id ? { ...u, ...cambios } : u);
    await Store.set('usuarios', usuarios);
    currentDocente = { ...currentDocente, ...cambios };
  }

  // CORREGIDO (2): subir/quitar foto llamaba a renderPerfilDocente() al
  // terminar, que reconstruye TODO el formulario con innerHTML —
  // incluido el <textarea id="perfil_descripcion">, que se repone con
  // doc.descripcion (el valor guardado, no lo que el usuario tuviera
  // escrito sin guardar todavía). Si escribías la descripción y LUEGO
  // subías la foto, el texto se perdía antes de que pudieras darle a
  // "Guardar cambios" — parecía que la descripción "no se guardaba"
  // cuando en realidad se borraba sola de la pantalla. Ahora solo se
  // actualiza la imagen del avatar y el botón "Quitar foto" en el DOM,
  // sin tocar el resto del formulario.
  function actualizarAvatarDocenteEnDom(fotoUrl) {
    const cont = document.getElementById('mount-t-perfil');
    if (!cont) return;
    const avatarActual = cont.querySelector('img[alt="Foto de perfil"], div.rounded-full.grid');
    if (avatarActual) {
      if (fotoUrl) {
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.alt = 'Foto de perfil';
        img.className = avatarActual.className.includes('w-20') ? avatarActual.className : 'w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100';
        avatarActual.replaceWith(img);
      } else if (avatarActual.tagName === 'IMG') {
        const doc = currentDocente || {};
        const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
        const div = document.createElement('div');
        div.className = 'w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0';
        div.style = 'background:linear-gradient(135deg,#1FC8C0,#8B5CF6)';
        div.textContent = iniciales;
        avatarActual.replaceWith(div);
      }
    }
    const btnQuitar = cont.querySelector('button[onclick="quitarFotoPerfilDocente()"]');
    if (fotoUrl && !btnQuitar) {
      const label = cont.querySelector('label.cursor-pointer');
      if (label) label.insertAdjacentHTML('afterend', ' <button onclick="quitarFotoPerfilDocente()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>');
    } else if (!fotoUrl && btnQuitar) {
      btnQuitar.remove();
    }
  }

  function subirFotoPerfilDocente(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const resultado = await Store.actualizarPerfilPropio({ fotoUrl: reader.result });
      currentDocente = { ...currentDocente, fotoUrl: reader.result };
      toast(resultado.remoto ? 'Foto de perfil actualizada' : 'Foto guardada solo en este navegador (sin conexión con el servidor)', resultado.remoto ? 'ok' : 'err');
      actualizarAvatarDocenteEnDom(reader.result);
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  async function quitarFotoPerfilDocente() {
    const resultado = await Store.actualizarPerfilPropio({ fotoUrl: '' });
    currentDocente = { ...currentDocente, fotoUrl: '' };
    toast(resultado.remoto ? 'Foto de perfil eliminada' : 'No se pudo eliminar la foto en el servidor', resultado.remoto ? 'ok' : 'err');
    actualizarAvatarDocenteEnDom('');
  }

  // async: actualizarUsuarioDocenteActual ahora es async.
  async function guardarPerfilDocente() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    const cambios = {};
    if (nombre) cambios.nombre = nombre;
    cambios.descripcion = descripcion; // opcional: puede quedar vacía
    // CORREGIDO: la nueva contraseña se validaba arriba pero nunca se
    // agregaba a "cambios" — el formulario decía "Perfil actualizado
    // correctamente" pero la contraseña jamás cambiaba de verdad.
    if (p1) cambios.password = p1;
    // CORREGIDO: usaba actualizarUsuarioDocenteActual() ->
    // Store.set('usuarios', ...), que exige rol Superadmin/Coordinador
    // en el backend — el docente veía "Perfil actualizado correctamente"
    // pero nombre/descripción/password nunca llegaban a MySQL. Ver
    // manejarPerfilPropio() en api/index.php.
    const resultado = await Store.actualizarPerfilPropio(cambios);
    currentDocente = { ...currentDocente, ...cambios };
    delete currentDocente.password; // no guardar el texto plano en memoria
    toast(resultado.remoto ? 'Perfil actualizado correctamente' : 'No se pudo guardar en el servidor, intenta de nuevo', resultado.remoto ? 'ok' : 'err');
    renderPerfilDocente();
  }

  // async: Store.list() vía MySQL.
  async function renderResumenDocente() {
    const doc = currentDocente || {};
    const [modulos, usuariosList, pensumList] = await Promise.all([
      docenteModulosActivos(),
      Store.list('usuarios'),
      Store.list('pensum')
    ]);
    const pensumItems = pensumList.filter(p => p.docente === doc.nombre);
    const inscritosPorModulo = modulos.map(m => usuariosList.filter(u => u.rol === 'Estudiante' && u.cohorte === m.nombre).length);
    const totalEstudiantes = inscritosPorModulo.reduce((a, b) => a + b, 0);
    const enCurso = modulos.filter(m => m.estado === 'En curso').length;

    // Riesgo real de los estudiantes en sus cohortes (misma fuente que
    // renderRiesgoDocente), para el anillo de "en buen camino".
    const cohortesNombres = modulos.map(m => m.nombre);
    const semaforoDocente = (await computeSemaforo()).filter(s => cohortesNombres.includes(s.cohorte));
    const enRiesgo = semaforoDocente.filter(s => s.riesgo === 'Rojo').length;
    const pctBienEncaminados = semaforoDocente.length ? Math.round(((semaforoDocente.length - enRiesgo) / semaforoDocente.length) * 100) : 100;

    const modulosRows = modulos.map((m, i) => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(m.modulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(m.nombre)} · ${inscritosPorModulo[i]}/${m.cupos} estudiantes</p>
        </div>
        ${statusPill(m.estado, ESTADO_COLORS)}
      </div>`).join('');

    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Docente')" class="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white/30 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-white/50" title="Clic para ampliar foto" />`
      : `<div class="w-14 h-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0 bg-white/15 border-2 border-white/30">${iniciales}</div>`;

    document.getElementById('mount-t-resumen').innerHTML = `
      <div class="dash-hero p-6 sm:p-8 mb-6" style="--hero-gradient:linear-gradient(120deg,#0D9488 0%,#1FC8C0 55%,#0EA5A0 100%)">
        <div class="flex items-center gap-4">
          ${avatarHtml}
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Panel docente</p>
            <h2 class="font-display text-xl sm:text-2xl font-bold text-white truncate">${escapeHtml(doc.nombre || 'Docente')}</h2>
            <p class="text-sm text-white/80 truncate">${escapeHtml(doc.email || '')}</p>
          </div>
        </div>
        ${doc.descripcion ? `<p class="text-sm text-white/85 mt-4 italic border-t border-white/15 pt-4">"${escapeHtml(doc.descripcion)}"</p>` : ''}
      </div>

      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="dash-stat-card" style="--brand:#1FC8C0">
          <div class="dash-stat-icon mb-4" style="background:#1FC8C014;color:#1FC8C0"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25v13.5M4.75 8.5L12 6.25l7.25 2.25v9L12 19.75l-7.25-2.25v-9z"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Módulos asignados</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${modulos.length}</p>
          <p class="text-xs text-slate2 mt-2">${enCurso} en curso</p>
        </div>
        <div class="dash-stat-card" style="--brand:#8B5CF6">
          <div class="dash-stat-icon mb-4" style="background:#8B5CF614;color:#8B5CF6"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3.87-5"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Estudiantes a cargo</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${totalEstudiantes}</p>
          <p class="text-xs text-slate2 mt-2">En tus cohortes activas</p>
        </div>
        <div class="dash-stat-card flex items-center gap-4" style="--brand:#F5A623">
          <div class="relative shrink-0">
            ${anilloProgreso(pctBienEncaminados, enRiesgo > 0 ? '#F5A623' : '#1FC8C0', 64, 6)}
            <div class="absolute inset-0 grid place-items-center">
              <span class="font-display text-sm font-bold text-ink">${pctBienEncaminados}%</span>
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">En buen camino</p>
            <p class="text-xs text-slate2 mt-1">${enRiesgo > 0 ? enRiesgo + ' en riesgo crítico' : 'Nadie en riesgo'}</p>
          </div>
        </div>
      </div>

      <div class="admin-panel-card p-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Tus módulos y cohortes</p>
          <p class="text-xs text-slate2">${pensumItems.length} tema${pensumItems.length === 1 ? '' : 's'} de pensum a tu cargo</p>
        </div>
        ${modulosRows || '<p class="text-sm text-slate2 text-center py-6">Aún no tienes módulos asignados. El administrador puede asignarlos desde el panel.</p>'}
      </div>`;
  }

  // ---------- RENDER: Mi horario (docente) ----------
  let docenteHorarioVista = 'agenda'; // 'agenda' | 'tabla'
  function setDocenteHorarioVista(v) {
    docenteHorarioVista = v;
    renderHorarioDocente();
  }
  window.setDocenteHorarioVista = setDocenteHorarioVista;

  // async: getSlotsDocente() ahora es async.
  async function renderHorarioDocente() {
    const doc = currentDocente || {};
    const slots = await getSlotsDocente(doc.nombre);
    const totalHoras = slots.reduce((acc, s) => acc + s.horas, 0);

    const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoyFecha = new Date();
    const diaHoy = diasSemanaNombres[hoyFecha.getDay()];
    const mesActual = hoyFecha.getFullYear() + '-' + String(hoyFecha.getMonth() + 1).padStart(2, '0');

    // Clases programadas específicamente para el día de hoy
    const slotsHoy = slots.filter(s => s.dia === diaHoy);
    const cohorteRef = slotsHoy.length > 0 ? slotsHoy[0].cohorte : (slots.length > 0 ? slots[0].cohorte : null);
    const infoCamisaHoy = getInfoCamisaDia(diaHoy, cohorteRef);
    const badgeHoy = badgeCamisaDia(diaHoy, cohorteRef);
    const cohortesUnicas = [...new Set(slots.map(s => s.cohorte))];

    // Banner: Tu jornada de hoy y código de vestimenta
    let hoyBannerHtml = '';
    if (diaHoy === 'Domingo') {
      hoyBannerHtml = `
        <div class="rounded-3xl border border-gray-200/80 bg-gradient-to-r from-slate-50 to-white p-5 shadow-soft mb-6">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gray-100 text-slate2 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate2">Jornada de descanso</p>
                <h3 class="text-base font-extrabold text-ink">Hoy es Domingo</h3>
              </div>
            </div>
            <span class="text-xs font-medium text-slate2">No hay sesiones académicas regulares programadas hoy.</span>
          </div>
        </div>`;
    } else {
      const clasesHoyCards = slotsHoy.length > 0 ? slotsHoy.map(s => {
        const info = getInfoCamisaDia(s.dia, s.cohorte);
        return `
          <div class="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${info.franjaBorder};">
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-turquesa/10 text-turquesa border border-turquesa/20">${escapeHtml(s.cohorte)}</span>
              <span class="text-[11px] font-bold text-slate2">${s.horas} h</span>
            </div>
            <p class="text-xs font-bold text-ink truncate" title="${escapeHtml(s.materia)}">${escapeHtml(s.materia)}</p>
            <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-2 font-medium">
              <svg class="w-3.5 h-3.5 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${s.inicio} – ${s.fin}</span>
            </div>
          </div>`;
      }).join('') : `
        <div class="col-span-full p-4 rounded-2xl bg-white/80 border border-dashed border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate2">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>Hoy no tienes clases programadas en tu horario.</span>
          </div>
          <span class="text-[11px] text-slate2">Si visitas la sede, el código de hoy es <strong class="text-ink">Camisa ${escapeHtml(infoCamisaHoy.nombre)}</strong>.</span>
        </div>`;

      hoyBannerHtml = `
        <div class="rounded-3xl border border-turquesa/25 p-5 sm:p-6 shadow-soft mb-6 transition" style="background: linear-gradient(135deg, ${infoCamisaHoy.franjaBg}, #ffffff 80%);">
          <div class="flex items-center justify-between gap-3 flex-wrap pb-3 mb-3 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-turquesa/10 text-turquesa flex items-center justify-center shrink-0 border border-turquesa/20">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-extrabold text-ink">Tu jornada de hoy · ${diaHoy}</h3>
                  <span class="w-2 h-2 rounded-full bg-turquesa animate-pulse"></span>
                </div>
                <p class="text-xs text-slate2 mt-0.5">${slotsHoy.length} sesión${slotsHoy.length === 1 ? '' : 'es'} asignada${slotsHoy.length === 1 ? '' : 's'} para hoy</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-semibold text-slate2 hidden sm:inline">Código de vestimenta:</span>
              ${badgeHoy}
            </div>
          </div>
          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${clasesHoyCards}
          </div>
        </div>`;
    }

    // Agrupar por Cohorte + Mes
    const grupos = {};
    slots.forEach(s => {
      const k = s.cohorte + '|' + s.mes;
      (grupos[k] = grupos[k] || { cohorte: s.cohorte, mes: s.mes, items: [] }).items.push(s);
    });

    const gruposHtml = Object.keys(grupos).length ? Object.keys(grupos).map(k => {
      const g = grupos[k];
      const horasGrupo = g.items.reduce((acc, it) => acc + it.horas, 0);

      // Render según vista activa
      let cuerpoHtml = '';
      if (docenteHorarioVista === 'agenda') {
        const columnasDias = DIAS_HORARIO.map(dia => {
          const infoCamisa = getInfoCamisaDia(dia, g.cohorte);
          const slotsDia = g.items.filter(s => s.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
          const tarjetas = slotsDia.map(s => `
            <div class="p-3 mb-2 rounded-xl bg-white border border-gray-100 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${infoCamisa.franjaBorder};">
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-xs font-bold text-ink leading-snug line-clamp-2">${escapeHtml(s.materia)}</span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-slate2">${s.horas}h</span>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate2 mt-1.5 font-medium">
                <svg class="w-3 h-3 text-turquesa shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${s.inicio}–${s.fin}</span>
              </div>
            </div>`).join('');

          return `
            <div class="rounded-2xl p-3 border border-gray-200/70 shadow-2xs flex flex-col" style="background:${infoCamisa.franjaBg};">
              <div class="flex flex-col gap-1.5 mb-2.5 pb-2 border-b border-gray-200/60">
                <div class="flex items-center justify-between gap-1">
                  <p class="text-xs font-extrabold uppercase tracking-wider text-ink">${dia}</p>
                  <span class="text-[10px] font-bold text-slate2 bg-white/85 px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">${slotsDia.length} sesión${slotsDia.length === 1 ? '' : 'es'}</span>
                </div>
                <div class="w-full flex">
                  ${badgeCamisaDia(dia, g.cohorte)}
                </div>
              </div>
              <div class="flex-1">
                ${tarjetas || '<div class="p-3 text-center rounded-xl bg-white/70 border border-dashed border-gray-200 text-[11px] text-slate2/70 italic">Sin clases</div>'}
              </div>
            </div>`;
        }).join('');

        cuerpoHtml = `
          <div class="p-4 sm:p-6 overflow-x-auto">
            <div class="grid gap-3 min-w-[780px]" style="grid-template-columns:repeat(6, minmax(160px, 1fr))">
              ${columnasDias}
            </div>
          </div>`;
      } else {
        // Vista Tabla Detallada
        cuerpoHtml = `
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100 bg-gray-50/50">
                <th class="py-3 px-6">Día</th>
                <th class="py-3 px-4">Código de vestimenta</th>
                <th class="py-3 px-4">Horario</th>
                <th class="py-3 px-4">Materia</th>
                <th class="py-3 px-4 text-right">Horas</th>
              </tr></thead>
              <tbody>${g.items.map(s => {
                const infoCamisa = getInfoCamisaDia(s.dia, g.cohorte);
                const esHoy = s.dia === diaHoy;
                return `
                  <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition ${esHoy ? 'bg-turquesa/5 font-medium' : ''}">
                    <td class="py-3 px-6 text-sm font-semibold text-ink flex items-center gap-2">
                      ${esHoy ? '<span class="w-2 h-2 rounded-full bg-turquesa animate-pulse"></span>' : ''}
                      ${escapeHtml(s.dia)}
                    </td>
                    <td class="py-3 px-4">${badgeCamisaDia(s.dia, g.cohorte)}</td>
                    <td class="py-3 px-4 text-sm text-slate2 whitespace-nowrap font-medium">${s.inicio} – ${s.fin}</td>
                    <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(s.materia)}</td>
                    <td class="py-3 px-4 text-sm text-slate2 text-right">${s.horas} h</td>
                  </tr>`;
              }).join('')}
              </tbody>
            </table>
          </div>`;
      }

      return `
        <div class="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden mb-6">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-gray-50/40">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-turquesa"></span>
                <h4 class="text-sm font-extrabold text-ink">${escapeHtml(g.cohorte)}</h4>
              </div>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(mesLabel(g.mes))} · ${horasGrupo} horas programadas</p>
            </div>
            <button onclick="abrirModalColoresCamisa('${escapeHtml(g.cohorte)}')" title="Ver o ajustar colores de camisa para esta cohorte" class="rounded-full border border-morado/20 bg-morado/5 hover:bg-morado/15 text-morado text-xs font-bold px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5l2.5 2.5h2.5l2.5 4.5-2.5 2-1-1v8h-8v-8l-1 1-2.5-2 2.5-4.5h2.5L12 4.5z" />
              </svg>
              <span>Código de vestimenta</span>
            </button>
          </div>
          ${cuerpoHtml}
        </div>`;
    }).join('') : `
      <div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-10 text-center">
        <div class="w-12 h-12 rounded-2xl bg-turquesa/10 text-turquesa flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-base font-extrabold text-ink">Sin horarios asignados</h3>
        <p class="text-xs text-slate2 mt-1 max-w-md mx-auto">Aún no apareces en ningún horario. El administrador te asignará materias y horas desde el panel de Horario.</p>
      </div>`;

    document.getElementById('mount-t-modulos').innerHTML = `
      ${hoyBannerHtml}
      ${slots.length ? `
        <div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-6 flex-wrap">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Carga Semanal</p>
              <p class="text-2xl font-extrabold text-ink">${totalHoras} <span class="text-sm font-semibold text-slate2">horas</span></p>
            </div>
            <div class="h-8 w-px bg-gray-100 hidden sm:block"></div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Cohortes</p>
              <p class="text-xl font-bold text-ink">${cohortesUnicas.length}</p>
            </div>
            <div class="h-8 w-px bg-gray-100 hidden sm:block"></div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Sesiones</p>
              <p class="text-xl font-bold text-ink">${slots.length}</p>
            </div>
          </div>
          <div class="flex items-center bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
            <button onclick="setDocenteHorarioVista('agenda')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${docenteHorarioVista === 'agenda' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
              <span>Agenda semanal</span>
            </button>
            <button onclick="setDocenteHorarioVista('tabla')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${docenteHorarioVista === 'tabla' ? 'bg-white text-ink shadow-2xs' : 'text-slate2 hover:text-ink'}">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>Tabla</span>
            </button>
          </div>
        </div>` : ''}
      ${gruposHtml}`;
  }

  // ---------- Códigos QR reales de asistencia (imprimibles y reutilizables) ----------
  // Cada cohorte tiene DOS códigos QR ESTABLES (se generan una sola vez y no
  // cambian día a día — se imprimen y listo, "al otro día es lo mismo"):
  //  - QR del DOCENTE: al abrirlo (escaneándolo con la cámara) activa la
  //    sesión de asistencia de HOY para esa cohorte.
  //  - QR del ESTUDIANTE: al abrirlo, pide el correo con el que fue
  //    registrado en el sistema y aplica su asistencia según la hora.
  // Ambos códigos codifican una URL real a esta misma página
  // (?qr=docente|estudiante&t=TOKEN) para que abrirlos con la cámara de un
  // celular funcione de verdad en cuanto el sitio esté publicado en una URL.
  function fechaHoyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }

  function horaHoyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${dia} ${h}:${min}:${s}`;
  }

  // async: 'qr_tokens' vía MySQL.
  // Genera un token aleatorio nuevo CADA DÍA para evitar fraude.
  // Los códigos QR de días anteriores expiran automáticamente.
  async function getOrCrearTokenQR(tipo, cohorteNombre, docenteNombre, forzarNuevo = false) {
    const hoy = fechaHoyLocal();
    const tokens = await Store.list('qr_tokens');
    let rec = tokens.find(t => t.tipo === tipo && t.cohorte === cohorteNombre && t.docente === docenteNombre);

    // Si ya existe y corresponde a hoy (y no se forzó nueva generación), reutilizar el de hoy
    if (rec && rec.fecha === hoy && !forzarNuevo) {
      return rec.token;
    }

    // Si no existía, o es de un día anterior, o se forzó regeneración:
    // Generar un token aleatorio completamente nuevo para el día de hoy
    const nuevoToken = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    if (rec) {
      rec.token = nuevoToken;
      rec.fecha = hoy;
    } else {
      rec = { id: uid('qr'), tipo, cohorte: cohorteNombre, docente: docenteNombre, token: nuevoToken, fecha: hoy };
      tokens.push(rec);
    }
    await Store.set('qr_tokens', tokens);
    return rec.token;
  }

  async function regenerarTokensQRCohorte(cohorteNombre, docenteNombre) {
    if (!confirm('¿Deseas generar nuevos códigos QR aleatorios para hoy? Los códigos anteriores quedarán invalidados de inmediato.')) return;
    const hoy = fechaHoyLocal();
    const tokens = await Store.list('qr_tokens');

    const nuevoTokenDoc = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    let recDoc = tokens.find(t => t.tipo === 'docente' && t.cohorte === cohorteNombre && t.docente === docenteNombre);
    if (recDoc) {
      recDoc.token = nuevoTokenDoc;
      recDoc.fecha = hoy;
    } else {
      tokens.push({ id: uid('qr'), tipo: 'docente', cohorte: cohorteNombre, docente: docenteNombre, token: nuevoTokenDoc, fecha: hoy });
    }

    const nuevoTokenEst = Math.random().toString(36).slice(2, 10) + (Date.now() + 7).toString(36).slice(-4);
    let recEst = tokens.find(t => t.tipo === 'estudiante' && t.cohorte === cohorteNombre && t.docente === docenteNombre);
    if (recEst) {
      recEst.token = nuevoTokenEst;
      recEst.fecha = hoy;
    } else {
      tokens.push({ id: uid('qr'), tipo: 'estudiante', cohorte: cohorteNombre, docente: docenteNombre, token: nuevoTokenEst, fecha: hoy });
    }

    await Store.set('qr_tokens', tokens);

    // Nota antifraude: la hora de inicio de la sesión de hoy nunca se altera; la clase solo se activa una vez al día.
    toast('¡Códigos QR renovados con éxito! Los anteriores han expirado.', 'ok');

    if (typeof renderCodigosQr === 'function') await renderCodigosQr();
    if (typeof renderAsistenciaDocente === 'function') await renderAsistenciaDocente();
  }
  window.regenerarTokensQRCohorte = regenerarTokensQRCohorte;

  // El curso que dicta un docente específico dentro de una cohorte, según
  // el Horario (solo franjas Activas). Si el docente tiene varias franjas,
  // se usa la primera como etiqueta.
  // async: 'horarios' vía MySQL.
  async function materiaDeDocenteEnCohorte(cohorteNombre, docenteNombre) {
    const horarios = (await Store.list('horarios')).filter(h => h.cohorte === cohorteNombre);
    for (const h of horarios) {
      const franja = franjasActivas(h).find(f => f.docente === docenteNombre && f.curso);
      if (franja) return franja.curso;
    }
    return null;
  }

  function urlQr(tipo, token, forzarLocal = false) {
    let origin = location.origin;
    // Si estamos en localhost y es para un código QR (que se escaneará desde un celular),
    // debemos usar la IP de la red local para que el celular no intente conectarse a sí mismo.
    if (!forzarLocal && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      const lanIp = (typeof window !== 'undefined' && window.SERVER_LAN_IP) ? window.SERVER_LAN_IP : '192.168.1.35';
      origin = location.protocol + '//' + lanIp + (location.port ? ':' + location.port : '');
    }
    return origin + location.pathname + '?qr=' + tipo + '&t=' + token;
  }

  function copiarLinkQr(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        if (typeof toast === 'function') toast('Enlace copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para el celular:', url);
      });
    } else {
      prompt('Copia este enlace para el celular:', url);
    }
  }
  window.copiarLinkQr = copiarLinkQr;

  // Dibuja un QR real (librería qrcodejs, cargada en index.html) dentro de divId.
  function pintarQrImprimible(divId, texto) {
    const cont = document.getElementById(divId);
    if (!cont) return;
    cont.innerHTML = '';
    if (typeof QRCode === 'undefined') {
      cont.innerHTML = '<p class="text-xs text-coral px-2">No se pudo cargar la librería de códigos QR (revisa tu conexión a internet).</p>';
      return;
    }
    new QRCode(cont, { text: texto, width: 152, height: 152, correctLevel: QRCode.CorrectLevel.M });
  }

  // Abre una ventana lista para imprimir/descargar el QR ya dibujado en divId.
  function imprimirQr(titulo, subtitulo, divId) {
    const cont = document.getElementById(divId);
    const el = cont ? cont.querySelector('img, canvas') : null;
    const src = el ? (el.tagName === 'CANVAS' ? el.toDataURL('image/png') : el.src) : '';
    if (!src) { toast('El código QR aún no está listo, espera un momento', 'err'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para imprimir el QR', 'err'); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#14181F;text-align:center;padding:60px 20px;}
      h1{font-size:20px;margin-bottom:4px;} p{color:#5B6472;font-size:13px;margin-top:0;}
      img{margin:28px 0;width:260px;height:260px;}
      button{margin-top:10px;border:none;border-radius:9999px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;background:#14181F;color:#fff;}
      @media print{button{display:none;}}
    </style></head><body>
    <button onclick="window.print()">Descargar / Imprimir</button>
    <h1>${escapeHtml(titulo)}</h1>
    <p>${escapeHtml(subtitulo)}</p>
    <img src="${src}" alt="Código QR" />
    <p>Fundación A+ — Training de 100 a 1000+</p>
    </body></html>`);
    win.document.close();
  }

  // ---------- Asistencia automatizada por código de sesión (docente + estudiante) ----------
  // El docente "habilita" el código de la sesión de hoy para su cohorte
  // (equivalente a mostrar el QR en el salón). A partir de esa hora de
  // inicio, el sistema calcula el estado de cada estudiante SOLO con el
  // tiempo transcurrido — nadie marca asistencia manualmente:
  //   0–20 min desde el inicio   -> Puntual (Presente)
  //   20–50 min desde el inicio  -> Tarde
  //   +50 min sin escanear       -> Ausente (Falla), se registra solo
  const VENTANA_PUNTUAL_MIN = 20;
  const VENTANA_TARDE_MIN = 50; // 20 + 30 minutos de tolerancia

  function generarCodigoSesion() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  // async: 'sesiones_asistencia' vía MySQL.
  async function sesionAsistenciaHoy(cohorteNombre, docenteNombre) {
    const hoy = fechaHoyLocal();
    return (await Store.list('sesiones_asistencia')).find(s => s.cohorte === cohorteNombre && s.fecha === hoy && s.iniciadaPor === docenteNombre) || null;
  }

  function minutosTranscurridos(horaInicioStr) {
    if (!horaInicioStr) return 0;
    const s = String(horaInicioStr).trim();
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    const diffMs = Date.now() - d.getTime();
    return Math.max(0, diffMs / 60000);
  }

  function estadoPorTiempo(mins) {
    if (mins <= VENTANA_PUNTUAL_MIN) return 'Presente';
    if (mins <= VENTANA_TARDE_MIN) return 'Tarde';
    return 'Falla';
  }

  // ASISTENCIA POR DEFECTO: En cuanto se crea la sesión, todos los estudiantes
  // de la cohorte inician con registro 'Falla' (pérdida por defecto).
  // Si el estudiante escanea o digita el código, su registro se actualiza a Presente o Tarde.
  // async: 'asistencia' vía MySQL.
  async function sincronizarAusentesSesion(sesion, estudiantesCohorte) {
    if (!sesion || !estudiantesCohorte || !estudiantesCohorte.length) return;
    const registros = await Store.list('asistencia', { forceRefresh: true });
    let cambiado = false;
    estudiantesCohorte.forEach(e => {
      const yaTiene = registros.some(r => r.estudiante === e.nombre && (r.sesionId === sesion.id || (r.fecha === sesion.fecha && (r.materia === sesion.materia || r.modulo === sesion.modulo))));
      if (!yaTiene) {
        registros.push({
          id: uid('as'),
          estudiante: e.nombre,
          modulo: sesion.modulo,
          docente: sesion.iniciadaPor,
          materia: sesion.materia || sesion.modulo,
          fecha: sesion.fecha,
          estado: 'Falla',
          sesionId: sesion.id,
          automatico: true
        });
        cambiado = true;
      }
    });
    if (cambiado) await Store.set('asistencia', registros);
  }

  function estadoVentanaSesion(sesion) {
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins <= VENTANA_PUNTUAL_MIN) return { texto: `Ventana de puntualidad activa — quedan ${Math.ceil(VENTANA_PUNTUAL_MIN - mins)} min`, color: '#0f8f89' };
    if (mins <= VENTANA_TARDE_MIN) return { texto: `Ventana de tolerancia (llegada tarde) activa — quedan ${Math.ceil(VENTANA_TARDE_MIN - mins)} min`, color: '#b5790f' };
    return { texto: 'Sesión cerrada — quien no escaneó quedó como ausente (Falla definitiva)', color: '#F0455C' };
  }

  // async: 'asistencia' vía MySQL.
  async function estadoActualEstudianteSesion(sesion, estudianteNombreVal, asistListPreloaded = null) {
    if (!sesion) return { estado: 'Sin sesión', automatico: false };
    const list = asistListPreloaded || (await Store.list('asistencia'));
    const todos = list.filter(r => r.estudiante === estudianteNombreVal && (r.sesionId === sesion.id || (r.fecha === sesion.fecha && (r.materia === sesion.materia || r.modulo === sesion.modulo))));
    if (!todos.length) return { estado: 'Falla', automatico: true };
    const prioridad = { Presente: 1, Tarde: 2, Justificada: 3, Falla: 4 };
    todos.sort((a, b) => (prioridad[a.estado] || 99) - (prioridad[b.estado] || 99));
    return { estado: todos[0].estado, automatico: !!todos[0].automatico };
  }

  // ---------- RENDER: Asistencia (QR automático) — docente ----------
  let docenteAsistCohorte = null;
  let asistenciaDocenteTimer = null;
  let docenteAsistFiltroTexto = '';
  let docenteAsistFiltroEstado = 'TODOS';
  let docenteAsistHistFiltroTexto = '';
  let docenteAsistHistFiltroEstado = 'TODOS';

  function filtrarAsistenciaDocenteLive(texto) {
    docenteAsistFiltroTexto = (texto || '').toLowerCase().trim();
    aplicarFiltrosTablaDocente();
  }
  window.filtrarAsistenciaDocenteLive = filtrarAsistenciaDocenteLive;

  function setFiltroEstadoDocente(estado) {
    docenteAsistFiltroEstado = estado;
    document.querySelectorAll('.btn-filtro-asist-doc').forEach(btn => {
      const e = btn.getAttribute('data-filtro-estado');
      if (e === estado) {
        btn.className = btn.getAttribute('data-class-active');
      } else {
        btn.className = btn.getAttribute('data-class-inactive');
      }
    });
    aplicarFiltrosTablaDocente();
  }
  window.setFiltroEstadoDocente = setFiltroEstadoDocente;

  function aplicarFiltrosTablaDocente() {
    const tbody = document.getElementById('tbody-asist-hoy');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-estudiante]');
    let visibles = 0;
    rows.forEach(r => {
      const nombre = (r.getAttribute('data-nombre') || '').toLowerCase();
      const estado = r.getAttribute('data-estado') || '';
      const coincideTexto = !docenteAsistFiltroTexto || nombre.includes(docenteAsistFiltroTexto);
      const coincideEstado = docenteAsistFiltroEstado === 'TODOS' || estado === docenteAsistFiltroEstado;
      if (coincideTexto && coincideEstado) {
        r.classList.remove('hidden');
        visibles++;
      } else {
        r.classList.add('hidden');
      }
    });
    const filaVacia = document.getElementById('fila-asist-vacia');
    if (filaVacia) filaVacia.classList.toggle('hidden', visibles > 0);
    const contadorVisibles = document.getElementById('contador-asist-visibles');
    if (contadorVisibles) contadorVisibles.textContent = `${visibles} estudiante${visibles === 1 ? '' : 's'}`;
  }
  window.aplicarFiltrosTablaDocente = aplicarFiltrosTablaDocente;

  function filtrarHistorialDocenteLive(texto) {
    docenteAsistHistFiltroTexto = (texto || '').toLowerCase().trim();
    aplicarFiltrosHistorialDocente();
  }
  window.filtrarHistorialDocenteLive = filtrarHistorialDocenteLive;

  function setFiltroEstadoHistorialDocente(filtro) {
    docenteAsistHistFiltroEstado = filtro;
    document.querySelectorAll('.btn-filtro-hist-doc').forEach(btn => {
      const f = btn.getAttribute('data-filtro-hist');
      if (f === filtro) {
        btn.className = btn.getAttribute('data-class-active');
      } else {
        btn.className = btn.getAttribute('data-class-inactive');
      }
    });
    aplicarFiltrosHistorialDocente();
  }
  window.setFiltroEstadoHistorialDocente = setFiltroEstadoHistorialDocente;

  function aplicarFiltrosHistorialDocente() {
    const tbody = document.getElementById('tbody-historial-doc');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-estudiante]');
    let visibles = 0;
    rows.forEach(r => {
      const nombre = (r.getAttribute('data-nombre') || '').toLowerCase();
      const pct = parseFloat(r.getAttribute('data-pct') || '-1');
      const coincideTexto = !docenteAsistHistFiltroTexto || nombre.includes(docenteAsistHistFiltroTexto);
      let coincideEstado = true;
      if (docenteAsistHistFiltroEstado === 'AL_DIA') {
        coincideEstado = pct >= 80;
      } else if (docenteAsistHistFiltroEstado === 'EN_RIESGO') {
        coincideEstado = pct >= 0 && pct < 80;
      }
      if (coincideTexto && coincideEstado) {
        r.classList.remove('hidden');
        visibles++;
      } else {
        r.classList.add('hidden');
      }
    });
    const filaVacia = document.getElementById('fila-hist-vacia');
    if (filaVacia) filaVacia.classList.toggle('hidden', visibles > 0);
  }
  window.aplicarFiltrosHistorialDocente = aplicarFiltrosHistorialDocente;

  // async: docenteEstudiantesDeCohorte ahora es async (usa 'usuarios' vía
  // MySQL). El setInterval de más abajo sigue funcionando igual con un
  // callback async — no espera a que termine antes de la siguiente vuelta,
  // mismo comportamiento que ya tenía.
  async function renderAsistenciaDocente() {
    if (asistenciaDocenteTimer) clearInterval(asistenciaDocenteTimer);
    const doc = currentDocente || {};

    const modulos = await docenteModulosActivos();
    if (!docenteAsistCohorte || !modulos.some(m => m.nombre === docenteAsistCohorte)) {
      docenteAsistCohorte = modulos.length ? modulos[0].nombre : null;
    }
    const moduloSel = modulos.find(m => m.nombre === docenteAsistCohorte) || null;

    if (!modulos.length) {
      document.getElementById('mount-t-asistencia').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas. El coordinador debe asignarte una desde el panel administrativo para poder abrir la asistencia.</p>
      </div>`;
      return;
    }

    const estudiantes = await docenteEstudiantesDeCohorte(moduloSel.nombre);
    const sesion = await sesionAsistenciaHoy(moduloSel.nombre, doc.nombre);
    if (sesion) await sincronizarAusentesSesion(sesion, estudiantes);

    const pillMap = { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'], 'Esperando escaneo': { bg: '#5B647214', text: '#5B6472' }, 'Sin sesión': { bg: '#5B647214', text: '#5B6472' } };

    const selector = `<select onchange="cambiarCohorteAsistDocente(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
      ${modulos.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteAsistCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${escapeHtml(m.modulo)}</option>`).join('')}
    </select>`;

    const materiaDoc = (await materiaDeDocenteEnCohorte(moduloSel.nombre, doc.nombre)) || moduloSel.modulo;
    const tokenDocente = await getOrCrearTokenQR('docente', moduloSel.nombre, doc.nombre);
    const tokenEstudiante = await getOrCrearTokenQR('estudiante', moduloSel.nombre, doc.nombre);

    const tarjetasQr = `
      <div class="grid sm:grid-cols-2 gap-5 mb-6">
        <!-- Tarjeta QR Docente -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-left">
              <div class="w-7 h-7 rounded-lg bg-morado/10 text-morado flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">Tu código de inicio de clase</p>
            </div>
            <span class="text-[10px] ${sesion ? 'bg-morado/10 text-morado border border-morado/20' : 'bg-emerald-100 text-emerald-800'} px-2 py-0.5 rounded-full font-semibold">${sesion ? 'Activada hoy (' + fmtHora(sesion.horaInicio) + ')' : 'Código de hoy'}</span>
          </div>
          <p class="text-xs text-slate2 mb-4 text-left">${sesion ? `Esta clase ya fue activada hoy a las <strong>${fmtHora(sesion.horaInicio)}</strong>. La asistencia solo se activa una vez al día; si vuelves a escanear o abrir el enlace, el sistema no volverá a activar la sesión.` : `Escanéalo con tu celular o ábrelo en el navegador para activar la asistencia de hoy en <strong>${escapeHtml(materiaDoc)}</strong>.`}</p>
          <div id="qrDocenteImg" class="flex justify-center mb-4 min-h-[160px] items-center"></div>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-100">
            <a href="${urlQr('docente', tokenDocente, true)}" target="_blank" class="text-xs font-semibold text-morado hover:underline flex items-center gap-1">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              ${sesion ? 'Ver estado de sesión' : 'Abrir enlace'}
            </a>
            <span class="text-slate2/40">•</span>
            <button type="button" onclick="copiarEnlaceDocente('${tokenDocente}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar enlace
            </button>
            <span class="text-slate2/40">•</span>
            <button onclick="imprimirQr('Código del docente — ${escapeHtml(materiaDoc)}','Escanéalo para activar la asistencia de hoy','qrDocenteImg')" class="text-xs font-semibold text-morado hover:underline">
              Imprimir
            </button>
            <span class="text-slate2/40">•</span>
            <button type="button" onclick="regenerarTokensQRCohorte('${escapeHtml(moduloSel.nombre)}', '${escapeHtml(doc.nombre)}')" class="text-xs font-semibold text-coral hover:underline flex items-center gap-1" title="Generar nuevo código para hoy">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Renovar QR
            </button>
          </div>
        </div>

        <!-- Tarjeta QR Estudiantes -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 text-center">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-left">
              <div class="w-7 h-7 rounded-lg bg-turquesa/10 text-turquesa flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
              </div>
              <p class="text-sm font-bold text-ink">Código para tus estudiantes</p>
            </div>
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Código de hoy</span>
          </div>
          <p class="text-xs text-slate2 mb-4 text-left">Proyéctalo en clase o comparte el enlace. Al escanearlo, su asistencia se registrará automáticamente en el sistema.</p>
          <div id="qrEstudianteImg" class="flex justify-center mb-4 min-h-[160px] items-center"></div>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-gray-100">
            <button type="button" onclick="copiarEnlaceEstudiante('${tokenEstudiante}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar enlace
            </button>
            <span class="text-slate2/40">•</span>
            <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(materiaDoc)}','Escanéalo para registrar tu asistencia','qrEstudianteImg')" class="text-xs font-semibold text-morado hover:underline">
              Descargar / Agrandar
            </button>
          </div>
        </div>
      </div>`;

    let tarjetaSesion;
    if (!sesion) {
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate2/10 text-slate2 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-ink">Asistencia de hoy: sin activar</p>
              <p class="text-xs text-slate2 mt-1">Para activar la clase de hoy, <strong>escanea tu código QR del docente</strong> o haz clic en <a href="${urlQr('docente', tokenDocente, true)}" target="_blank" class="text-turquesa font-semibold underline">Abrir enlace</a>. Al activarla, todos los estudiantes inician con <strong>Falla (pérdida)</strong> por defecto hasta que escaneen el código QR de estudiantes.</p>
            </div>
          </div>
        </div>`;
    } else {
      const ventana = estadoVentanaSesion(sesion);
      tarjetaSesion = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
          <p class="text-sm font-bold text-ink">Asistencia de hoy: ya activada (única activación del día)</p>
          <p class="text-xs text-slate2 mt-1">Activada a las ${fmtHora(sesion.horaInicio)}${sesion.iniciadaPor ? ' por ' + escapeHtml(sesion.iniciadaPor) : ''}. Todos los estudiantes iniciaron con <strong>Falla</strong> por defecto hasta que confirmen su asistencia. Por seguridad, esta clase no se puede volver a activar en el día.</p>
          <p class="text-xs font-bold mt-2" style="color:${ventana.color}">${ventana.texto}</p>
        </div>`;
    }

    const asistenciaTodos = await Store.list('asistencia');
    const infoPorEstudiante = await Promise.all(estudiantes.map(e => estadoActualEstudianteSesion(sesion, e.nombre, asistenciaTodos)));
    let countPresentes = 0;
    let countTardes = 0;
    let countFallas = 0;

    const filasHoy = estudiantes.length ? estudiantes.map((e, i) => {
      const info = infoPorEstudiante[i];
      if (info.estado === 'Presente') countPresentes++;
      else if (info.estado === 'Tarde') countTardes++;
      else countFallas++;

      const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';

      return `<tr data-estudiante="1" data-nombre="${escapeHtml(e.nombre.toLowerCase())}" data-estado="${escapeHtml(info.estado)}" class="border-b border-gray-50 last:border-0 hover:bg-slate-50/80 transition-colors">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-full bg-morado/10 text-morado text-[11px] font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
            <span class="truncate">${escapeHtml(e.nombre)}</span>
          </div>
        </td>
        <td class="py-2.5 px-4 text-right sm:text-left">
          <div class="flex items-center justify-end sm:justify-start gap-1.5 flex-wrap">
            ${statusPill(info.estado === 'Falla' ? 'Falla' : info.estado, pillMap)}
            ${info.automatico && info.estado === 'Falla' ? '<span class="hidden sm:inline-block text-[10px] text-coral font-medium bg-coral/10 px-2 py-0.5 rounded-full border border-coral/20">por defecto</span>' : ''}
          </div>
        </td>
      </tr>`;
    }).join('') : '';
    let countHistAlDia = 0;
    let countHistEnRiesgo = 0;

    const historial = estudiantes.map(e => {
      const rawRegs = asistenciaTodos.filter(a =>
        a.estudiante === e.nombre &&
        (a.docente === doc.nombre || a.modulo === moduloSel.modulo || a.modulo === moduloSel.nombre || a.materia === materiaDoc || a.materia === moduloSel.modulo)
      );
      const porClase = new Map();
      rawRegs.forEach(r => {
        const k = r.sesionId ? ('ses_' + r.sesionId) : ('date_' + r.fecha);
        if (!porClase.has(k) || (r.estado === 'Presente' || r.estado === 'Tarde')) {
          porClase.set(k, r);
        }
      });
      const regs = Array.from(porClase.values());
      const presentes = regs.filter(r => r.estado === 'Presente').length;
      const pct = regs.length ? Math.round((presentes / regs.length) * 100) : null;
      if (pct !== null) {
        if (pct >= 80) countHistAlDia++;
        else countHistEnRiesgo++;
      }
      const badgeBg = pct === null ? 'bg-slate-100 text-slate-700' : pct >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : pct >= 60 ? 'bg-amber-50 text-amber-800 border border-amber-200/60' : 'bg-coral/10 text-coral border border-coral/20';
      const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';

      return `<tr data-estudiante="1" data-nombre="${escapeHtml(e.nombre.toLowerCase())}" data-pct="${pct !== null ? pct : -1}" class="border-b border-gray-50 last:border-0 hover:bg-slate-50/80 transition-colors">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
            <span class="truncate">${escapeHtml(e.nombre)}</span>
          </div>
        </td>
        <td class="py-2.5 px-4 text-sm text-slate2">${regs.length} sesión${regs.length === 1 ? '' : 'es'}</td>
        <td class="py-2.5 px-4 text-right sm:text-left">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}">${pct === null ? '—' : pct + '%'}</span>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('mount-t-asistencia').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Asistencia de hoy — ${escapeHtml(moduloSel.modulo)}</p>
            <p class="text-xs text-slate2 mt-0.5">${fmtDate(fechaHoyLocal())} · Todo se calcula automáticamente por tiempo, sin marcado manual.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${tarjetaSesion}
      ${tarjetasQr}

      <!-- Control de Asistencia de Hoy: Compacto, con buscador y filtros para cohortes grandes -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <!-- Encabezado con métricas y buscador -->
        <div class="p-4 sm:p-5 border-b border-gray-100 bg-linear-to-r from-slate-50/60 to-white">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${sesion ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                <h3 class="text-sm font-bold text-ink">Estudiantes de la cohorte</h3>
                <span id="contador-asist-visibles" class="text-xs font-semibold text-morado bg-morado/10 px-2 py-0.5 rounded-full">${estudiantes.length} estudiantes</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Control optimizado: busca por nombre o filtra por estado sin desplazarte interminablemente.</p>
            </div>
            <!-- Mini KPIs de la sesión -->
            <div class="flex items-center gap-2 flex-wrap text-xs">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${countPresentes} Presente${countPresentes === 1 ? '' : 's'}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200/60">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>${countTardes} Tarde${countTardes === 1 ? '' : 's'}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral/10 text-coral font-semibold border border-coral/20">
                <span class="w-1.5 h-1.5 rounded-full bg-coral"></span>${countFallas} Falla${countFallas === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <!-- Buscador y botones de filtro rápido -->
          <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div class="relative flex-1 max-w-sm">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-turquesa">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </span>
              <input type="text" id="filtroDocenteNombre" value="${escapeHtml(docenteAsistFiltroTexto)}" oninput="filtrarAsistenciaDocenteLive(this.value)" placeholder="Buscar estudiante por nombre..." class="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-turquesa/5 border border-turquesa/30 rounded-xl text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition-all">
            </div>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button type="button" onclick="setFiltroEstadoDocente('TODOS')" data-filtro-estado="TODOS" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-turquesa text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-white text-slate2 border border-gray-200 hover:bg-gray-50" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'TODOS' ? 'bg-turquesa text-white shadow-xs' : 'bg-white text-slate2 border border-gray-200 hover:bg-gray-50'}">Todos (${estudiantes.length})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Presente')" data-filtro-estado="Presente" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-600 text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Presente' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}">Presentes (${countPresentes})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Tarde')" data-filtro-estado="Tarde" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-amber-600 text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Tarde' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'}">Tardes (${countTardes})</button>
              <button type="button" onclick="setFiltroEstadoDocente('Falla')" data-filtro-estado="Falla" data-class-active="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral text-white shadow-xs" data-class-inactive="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20" class="btn-filtro-asist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistFiltroEstado === 'Falla' ? 'bg-coral text-white shadow-xs' : 'bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20'}">Fallas (${countFallas})</button>
            </div>
          </div>
        </div>

        <!-- Tabla con scroll vertical compacto (max-h-96) y encabezado sticky -->
        <div class="max-h-[380px] overflow-y-auto divide-y divide-gray-100 relative">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-white/95 backdrop-blur-xs z-10 shadow-xs border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-slate2">
              <tr>
                <th class="py-2.5 px-4 bg-white/95">Estudiante</th>
                <th class="py-2.5 px-4 text-right sm:text-left bg-white/95">Estado hoy</th>
              </tr>
            </thead>
            <tbody id="tbody-asist-hoy">
              ${filasHoy || '<tr><td colspan="2" class="text-sm text-slate2 text-center py-6">Esta cohorte aún no tiene estudiantes matriculados.</td></tr>'}
              <tr id="fila-asist-vacia" class="hidden">
                <td colspan="2" class="text-sm text-slate2 text-center py-8">
                  <div class="flex flex-col items-center justify-center gap-1">
                    <svg class="w-6 h-6 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>No se encontraron estudiantes con ese criterio de búsqueda.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historial de Asistencia: Compacto con sticky header y búsqueda -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-gray-100 bg-linear-to-r from-slate-50/60 to-white">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-ink">Historial acumulado — ${escapeHtml(moduloSel.modulo)}</h3>
                <span class="text-xs text-slate2 bg-slate-100 px-2 py-0.5 rounded-md font-medium">${estudiantes.length} estudiantes</span>
              </div>
              <p class="text-xs text-slate2 mt-0.5">Porcentaje global de asistencia de cada estudiante en este módulo.</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="setFiltroEstadoHistorialDocente('TODOS')" data-filtro-hist="TODOS" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-turquesa text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-white text-slate2 border border-gray-200 hover:bg-gray-50" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'TODOS' ? 'bg-turquesa text-white shadow-xs' : 'bg-white text-slate2 border border-gray-200 hover:bg-gray-50'}">Todos</button>
              <button type="button" onclick="setFiltroEstadoHistorialDocente('AL_DIA')" data-filtro-hist="AL_DIA" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-600 text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'AL_DIA' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}">Al día (≥80%)</button>
              <button type="button" onclick="setFiltroEstadoHistorialDocente('EN_RIESGO')" data-filtro-hist="EN_RIESGO" data-class-active="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral text-white shadow-xs" data-class-inactive="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20" class="btn-filtro-hist-doc px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${docenteAsistHistFiltroEstado === 'EN_RIESGO' ? 'bg-coral text-white shadow-xs' : 'bg-coral/10 text-coral border border-coral/20 hover:bg-coral/20'}">En riesgo (&lt;80%)</button>
            </div>
          </div>
          <div class="relative max-w-sm">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-turquesa">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input type="text" id="filtroHistDocenteNombre" value="${escapeHtml(docenteAsistHistFiltroTexto)}" oninput="filtrarHistorialDocenteLive(this.value)" placeholder="Buscar en historial por nombre..." class="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-turquesa/5 border border-turquesa/30 rounded-xl text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition-all">
          </div>
        </div>

        <div class="max-h-[320px] overflow-y-auto divide-y divide-gray-100 relative">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-white/95 backdrop-blur-xs z-10 shadow-xs border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-slate2">
              <tr>
                <th class="py-2.5 px-4 bg-white/95">Estudiante</th>
                <th class="py-2.5 px-4 bg-white/95">Sesiones</th>
                <th class="py-2.5 px-4 text-right sm:text-left bg-white/95">% Asistencia</th>
              </tr>
            </thead>
            <tbody id="tbody-historial-doc">
              ${historial || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Sin registros todavía.</td></tr>'}
              <tr id="fila-hist-vacia" class="hidden">
                <td colspan="3" class="text-sm text-slate2 text-center py-8">
                  <div class="flex flex-col items-center justify-center gap-1">
                    <svg class="w-6 h-6 text-slate2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>No se encontraron estudiantes en el historial con ese criterio.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // Renderizar los códigos QR visibles en pantalla para el docente
    pintarQrImprimible('qrDocenteImg', urlQr('docente', tokenDocente));
    pintarQrImprimible('qrEstudianteImg', urlQr('estudiante', tokenEstudiante));

    // Aplicar filtros activos previamente
    aplicarFiltrosTablaDocente();
    aplicarFiltrosHistorialDocente();

    asistenciaDocenteTimer = setInterval(() => {
      const panel = document.getElementById('panel-t-asistencia');
      const inputActivo = document.activeElement && (document.activeElement.id === 'filtroDocenteNombre' || document.activeElement.id === 'filtroHistDocenteNombre');
      if (panel && !panel.classList.contains('hidden')) {
        if (!inputActivo) renderAsistenciaDocente();
      } else {
        clearInterval(asistenciaDocenteTimer);
      }
    }, 15000);
  }

  // ---------- RENDER: Códigos QR (admin) ----------
  // Junta, a partir del Horario, cada combinación real de Docente + Cohorte +
  // Materia, y genera (o reutiliza) el par de QR estables de cada una — así
  // el administrador puede imprimirlos todos sin depender de que cada
  // docente entre primero a su propio panel.
  // async: 'horarios' vía MySQL.
  async function combosDocenteCohorte() {
    const registros = await Store.list('horarios');
    const vistos = new Set();
    const combos = [];
    registros.forEach(h => {
      franjasActivas(h).forEach(f => {
        if (!f.docente) return;
        const key = f.docente + '|' + h.cohorte;
        if (vistos.has(key)) return;
        vistos.add(key);
        combos.push({ docente: f.docente, cohorte: h.cohorte, materia: f.curso || h.modulo || h.cohorte });
      });
    });
    combos.sort((a, b) => a.cohorte.localeCompare(b.cohorte) || a.docente.localeCompare(b.docente));
    return combos;
  }

  let filtroQrCohorte = '';

  function cambiarFiltroQrCohorte(cohorte) {
    filtroQrCohorte = cohorte || '';
    renderCodigosQr();
  }
  window.cambiarFiltroQrCohorte = cambiarFiltroQrCohorte;

  // async: 'modulos'/'horarios'/'qr_tokens' vía MySQL.
  async function renderCodigosQr() {
    const combos = await combosDocenteCohorte();
    const cohortes = await Store.list('modulos');

    if (!combos.length) {
      document.getElementById('mount-codigosqr').innerHTML = `
        <div class="admin-panel-card p-10 text-center">
          <p class="font-bold text-ink mb-1.5">Aún no hay códigos QR para generar</p>
          <p class="text-sm text-slate2">Primero asigna un docente a alguna franja en el panel <span class="font-semibold text-ink">Cohortes → Horario</span>. En cuanto un docente quede asignado a una materia, sus dos códigos (el suyo y el de sus estudiantes) aparecerán aquí listos para imprimir.</p>
        </div>`;
      return;
    }

    const cohortesUnicas = Array.from(new Set(combos.map(c => c.cohorte))).sort();
    if (filtroQrCohorte && !cohortesUnicas.includes(filtroQrCohorte)) {
      filtroQrCohorte = '';
    }

    const combosFiltrados = filtroQrCohorte
      ? combos.filter(c => c.cohorte === filtroQrCohorte)
      : combos;

    const tokensDoc = await Promise.all(combosFiltrados.map(c => getOrCrearTokenQR('docente', c.cohorte, c.docente)));
    const tokensEst = await Promise.all(combosFiltrados.map(c => getOrCrearTokenQR('estudiante', c.cohorte, c.docente)));

    const tarjetas = combosFiltrados.map((combo, i) => {
      const modulo = cohortes.find(c => c.nombre === combo.cohorte);
      const tokenDoc = tokensDoc[i];
      const tokenEst = tokensEst[i];
      const idDoc = 'qrAdminDoc_' + i;
      const idEst = 'qrAdminEst_' + i;
      return {
        html: `
        <div class="admin-panel-card p-6">
          <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(combo.cohorte)}</p>
              <p class="text-xs text-slate2">${escapeHtml(combo.materia)} · ${modulo ? escapeHtml(modulo.modulo) : ''}</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="regenerarTokensQRCohorte('${escapeHtml(combo.cohorte)}', '${escapeHtml(combo.docente)}')" class="text-[11px] font-bold text-morado bg-morado/10 hover:bg-morado/20 px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer" title="Generar un nuevo código aleatorio inmediatamente para evitar fraude">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Renovar QR
              </button>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-morado/10 text-morado">${escapeHtml(combo.docente)}</span>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR del docente</p>
              <div id="${idDoc}" class="flex justify-center mb-3"></div>
              <div class="flex flex-col gap-2 mt-2">
                <button onclick="imprimirQr('Código del docente — ${escapeHtml(combo.docente)} · ${escapeHtml(combo.materia)}','Escanéalo para activar la asistencia de hoy','${idDoc}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
                <div class="flex items-center justify-center gap-2 text-[11px] pt-2 border-t border-gray-100">
                  <a href="${escapeHtml(urlQr('docente', tokenDoc, true))}" target="_blank" class="text-morado font-bold hover:underline flex items-center gap-1" title="Probar activación directamente en el navegador">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    Activar en PC
                  </a>
                  <span class="text-slate2">·</span>
                  <button type="button" onclick="copiarLinkQr('${escapeHtml(urlQr('docente', tokenDoc))}')" class="text-turquesa font-bold hover:underline flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copiar enlace
                  </button>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-gray-100 p-4 text-center">
              <p class="text-xs font-bold text-ink mb-3">QR de estudiantes</p>
              <div id="${idEst}" class="flex justify-center mb-3"></div>
              <div class="flex flex-col gap-2 mt-2">
                <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(combo.cohorte)} · ${escapeHtml(combo.materia)}','Escanéalo e ingresa tu correo institucional','${idEst}')" class="text-xs font-semibold text-morado hover:underline">Descargar / Imprimir</button>
                <div class="flex items-center justify-center gap-2 text-[11px] pt-2 border-t border-gray-100">
                  <a href="${escapeHtml(urlQr('estudiante', tokenEst, true))}" target="_blank" class="text-morado font-bold hover:underline flex items-center gap-1" title="Probar formulario directamente en el navegador">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    Abrir en PC
                  </a>
                  <span class="text-slate2">·</span>
                  <button type="button" onclick="copiarLinkQr('${escapeHtml(urlQr('estudiante', tokenEst))}')" class="text-turquesa font-bold hover:underline flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copiar enlace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>`,
        idDoc, idEst, tokenDoc, tokenEst
      };
    });

    const fechaHoyStr = fmtDate(fechaHoyLocal());
    document.getElementById('mount-codigosqr').innerHTML = `
      <div class="admin-panel-card p-6 mb-6">
        <div class="flex items-center gap-2.5 mb-1">
          <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <h2 class="text-lg font-extrabold text-ink">Códigos QR de asistencia — Renovación diaria antifraude</h2>
        </div>
        <p class="text-sm text-slate2 mt-1">Los códigos QR de cada clase se <strong>actualizan aleatoriamente cada día de forma automática</strong>. De esta manera se evita el fraude: los enlaces de días anteriores expiran para asegurar que los estudiantes solo puedan registrar asistencia si están presentes en la clase del día.</p>
        <div class="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex font-medium">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          <span>Códigos activos generados para hoy: <strong>${fechaHoyStr}</strong></span>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <label for="filtroQrCohorteSelect" class="text-xs font-semibold text-slate2">Filtrar por cohorte:</label>
            <select id="filtroQrCohorteSelect" onchange="cambiarFiltroQrCohorte(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">
              <option value="">Todas las cohortes (${combos.length} combinaciones)</option>
              ${cohortesUnicas.map(c => {
                const cant = combos.filter(x => x.cohorte === c).length;
                return `<option value="${escapeHtml(c)}" ${filtroQrCohorte === c ? 'selected' : ''}>${escapeHtml(c)} (${cant})</option>`;
              }).join('')}
            </select>
          </div>
          <span class="text-xs font-medium text-slate2">Mostrando ${combosFiltrados.length} de ${combos.length} materias</span>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-5">${tarjetas.map(t => t.html).join('') || '<div class="col-span-full admin-panel-card p-10 text-center"><p class="text-sm text-slate2">No hay materias registradas para la cohorte seleccionada.</p></div>'}</div>`;

    // El QR se dibuja DESPUÉS de insertar el HTML (necesita el contenedor ya en el DOM).
    tarjetas.forEach(t => {
      pintarQrImprimible(t.idDoc, urlQr('docente', t.tokenDoc));
      pintarQrImprimible(t.idEst, urlQr('estudiante', t.tokenEst));
    });
  }

  function cambiarCohorteAsistDocente(value) {
    docenteAsistCohorte = value;
    docenteAsistFiltroTexto = '';
    docenteAsistFiltroEstado = 'TODOS';
    docenteAsistHistFiltroTexto = '';
    docenteAsistHistFiltroEstado = 'TODOS';
    renderAsistenciaDocente();
  }

  // async: docenteModulosActivos() ahora es async.
  async function habilitarSesionAsistenciaDocente() {
    const doc = currentDocente || {};
    const moduloSel = (await docenteModulosActivos()).find(m => m.nombre === docenteAsistCohorte);
    if (!moduloSel) return;
    if (await sesionAsistenciaHoy(moduloSel.nombre, doc.nombre)) { toast('Ya hay un código de asistencia activo hoy para tu materia', 'info'); renderAsistenciaDocente(); return; }
    const cursoNombre = (await cursoDeDocenteEnCohorte(doc.nombre, moduloSel.nombre)) || moduloSel.modulo;
    const sesiones = await Store.list('sesiones_asistencia');
    const nuevaSesId = uid('ses');
    const hoy = fechaHoyLocal();
    sesiones.push({
      id: nuevaSesId, cohorte: moduloSel.nombre, modulo: cursoNombre,
      materia: cursoNombre, fecha: hoy,
      horaInicio: horaHoyLocal(), codigo: generarCodigoSesion(), iniciadaPor: doc.nombre
    });
    await Store.set('sesiones_asistencia', sesiones);

    // Pre-poblar asistencia con 'Falla' (por defecto pérdida) para todos los estudiantes de la cohorte
    const estudiantes = await docenteEstudiantesDeCohorte(moduloSel.nombre);
    const registros = await Store.list('asistencia', { forceRefresh: true });
    let cambiado = false;
    estudiantes.forEach(e => {
      const yaTiene = registros.some(r => r.estudiante === e.nombre && (r.sesionId === nuevaSesId || (r.fecha === hoy && (r.materia === cursoNombre || r.modulo === cursoNombre))));
      if (!yaTiene) {
        registros.push({
          id: uid('as'),
          estudiante: e.nombre,
          modulo: cursoNombre,
          docente: doc.nombre,
          materia: cursoNombre,
          fecha: hoy,
          estado: 'Falla',
          sesionId: nuevaSesId,
          automatico: true
        });
        cambiado = true;
      }
    });
    if (cambiado) await Store.set('asistencia', registros);

    toast('Código habilitado: los estudiantes inician con Falla por defecto y tienen ' + VENTANA_PUNTUAL_MIN + ' min para llegar puntuales', 'ok');
    renderAsistenciaDocente();
  }

  /**
   * Escaneo de códigos QR de asistencia (?qr=docente|estudiante&t=TOKEN).
   * Identifica cohorte, docente y materia para activación o registro de asistencia.
   */

  function qrLandingShell(icono, color, titulo, subtitulo, cuerpoHtml) {
    return `
      <div class="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5" style="background:${color}1A">
        <span class="text-2xl">${icono}</span>
      </div>
      <h1 class="text-xl font-extrabold text-ink mb-1.5">${escapeHtml(titulo)}</h1>
      <p class="text-sm text-slate2 mb-6">${subtitulo}</p>
      ${cuerpoHtml}
      <p class="text-xs text-slate2 mt-8">Fundación A+ — Training de 100 a 1000+</p>`;
  }

  function fmtHora(iso) {
    if (!iso) return '—';
    const s = String(iso).trim();
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? iso : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Copia el enlace de activación para el docente
  function copiarEnlaceDocente(token) {
    const enlace = urlQr('docente', token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(enlace).then(() => {
        toast('Enlace del docente copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para activar la clase:', enlace);
      });
    } else {
      prompt('Copia este enlace para activar la clase:', enlace);
    }
  }
  window.copiarEnlaceDocente = copiarEnlaceDocente;

  // Copia el enlace de asistencia para compartirlo con los estudiantes
  function copiarEnlaceEstudiante(token) {
    const enlace = urlQr('estudiante', token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(enlace).then(() => {
        toast('Enlace de asistencia copiado al portapapeles', 'ok');
      }).catch(() => {
        prompt('Copia este enlace para tus estudiantes:', enlace);
      });
    } else {
      prompt('Copia este enlace para tus estudiantes:', enlace);
    }
  }
  window.copiarEnlaceEstudiante = copiarEnlaceEstudiante;

  // Re-consulta el estado del QR del estudiante (por si el docente recién lo activó)
  async function verificarSesionEstudianteQr(token) {
    toast('Verificando si el docente activó la clase...', 'info');
    await manejarQrEnURL();
  }
  window.verificarSesionEstudianteQr = verificarSesionEstudianteQr;

  // Re-consulta las asistencias en la pantalla del docente
  async function recargarEstadoDocenteQr(token) {
    await manejarQrEnURL();
    toast('Lista de asistencias actualizada', 'ok');
  }
  window.recargarEstadoDocenteQr = recargarEstadoDocenteQr;

  // async: 'qr_asistencia' endpoint en backend PHP.
  async function manejarQrEnURL() {
    const params = new URLSearchParams(location.search);
    const tipo = params.get('qr');
    const token = params.get('t');
    if (!tipo || !token) return;

    document.getElementById('siteView').classList.add('hidden');
    const qrView = document.getElementById('qrView');
    if (qrView) qrView.classList.remove('hidden');

    let devId = '';
    try {
      devId = localStorage.getItem('fa_dispositivo_id') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('fa_dispositivo_id', devId);
      }
    } catch (e) {}

    try {
      const resp = await fetch(API_BASE_URL + '/api/qr_asistencia?tipo=' + encodeURIComponent(tipo) + '&token=' + encodeURIComponent(token) + '&devId=' + encodeURIComponent(devId), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const datos = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        document.getElementById('qrViewCard').innerHTML = `
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md mx-auto">
            <div class="w-14 h-14 rounded-full bg-coral/10 text-coral flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h2 class="text-xl font-bold text-ink mb-2">Código no válido o expirado</h2>
            <p class="text-sm text-slate2 mb-6">${escapeHtml(datos.error || 'Este QR no corresponde a ninguna cohorte activa.')}</p>
            <a href="${location.pathname}" class="inline-block rounded-full bg-morado text-white text-xs font-semibold px-6 py-2.5 hover:opacity-90 transition">Volver al inicio</a>
          </div>`;
        return;
      }

      if (tipo === 'docente') {
        renderQrLandingDocente(datos);
      } else if (datos.yaRegistradoDispositivo) {
        // Antifraude: el dispositivo o IP ya registró asistencia en esta clase
        renderConfirmacionGoogleForm({
          estudiante: datos.estudianteRegistrado,
          estado: datos.estadoRegistrado,
          cohorte: (datos.registro && datos.registro.cohorte) || '',
          materia: (datos.sesion && datos.sesion.materia) || '',
          yaRegistrado: true,
          ipCliente: datos.ipCliente
        }, token);
      } else {
        renderQrLandingEstudianteGoogleForm(datos);
      }
    } catch (e) {
      document.getElementById('qrViewCard').innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md mx-auto">
          <div class="w-14 h-14 rounded-full bg-coral/10 text-coral flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-ink mb-2">Error de conexión</h2>
          <p class="text-sm text-slate2 mb-6">No se pudo conectar con el servidor local. Verifica que XAMPP (Apache y MySQL) esté iniciado.</p>
        </div>`;
    }
  }

  // ---- Landing del QR del DOCENTE: activa la sesión de hoy y proyecta el QR del estudiante ----
  function renderQrLandingDocente(datos) {
    const { registro, sesion, recienActivada, yaEstabaActivada, tokenEstudiante, totalAsistencias } = datos;
    const mins = minutosTranscurridos(sesion.horaInicio);
    const ventana = estadoVentanaSesion(sesion);
    const esCerrada = mins > VENTANA_TARDE_MIN;
    const idQrEst = 'qrDocenteEstudianteScreen';

    const qrEstudianteHtml = (tokenEstudiante && !esCerrada) ? `
      <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm text-center">
        <p class="text-xs font-bold text-morado tracking-wide uppercase mb-1">Código QR para tus estudiantes</p>
        <p class="text-sm font-semibold text-ink mb-4">Muestra este código a tus estudiantes para que lo escaneen y confirmen su asistencia:</p>
        <div id="${idQrEst}" class="flex justify-center mb-4"></div>
        <div class="flex items-center justify-center gap-3">
          <button onclick="imprimirQr('Código de estudiantes — ${escapeHtml(registro.cohorte)} · ${escapeHtml(sesion.materia)}','Escanéalo para ingresar tu usuario de asistencia','${idQrEst}')" class="text-xs font-semibold text-morado hover:underline flex items-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir / Agrandar
          </button>
          <span class="text-slate2/40">•</span>
          <button onclick="copiarEnlaceEstudiante('${tokenEstudiante}')" class="text-xs font-semibold text-turquesa hover:underline flex items-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar enlace
          </button>
        </div>
      </div>
    ` : (esCerrada ? `
      <div class="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-5 text-center">
        <div class="w-10 h-10 rounded-xl bg-gray-200 text-slate2 flex items-center justify-center mx-auto mb-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <p class="text-xs font-bold text-ink uppercase tracking-wide">Registro de asistencia cerrado</p>
        <p class="text-xs text-slate2 mt-1">El periodo de tolerancia concluyó. Los registros de asistencia para esta fecha ya han quedado consolidados.</p>
      </div>
    ` : '');

    const bannerEstado = recienActivada ? `
      <div class="rounded-2xl p-5 border-l-4" style="background:#1FC8C014; border-left-color:#1FC8C0">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-turquesa/20 text-turquesa flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="text-base font-extrabold text-ink">¡Asistencia de hoy activada!</p>
        </div>
        <p class="text-xs font-semibold mt-1" style="color:${ventana.color}">${ventana.texto}</p>
        <p class="text-xs text-slate2 mt-2">Hora de inicio: <strong>${fmtHora(sesion.horaInicio)}</strong></p>
      </div>` : `
      <div class="rounded-2xl p-5 border-l-4" style="background:#8B5CF614; border-left-color:#8B5CF6">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-morado/20 text-morado flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <p class="text-base font-extrabold text-ink">Asistencia ya activada el día de hoy</p>
        </div>
        <p class="text-xs text-slate2 mt-1">Esta clase ya fue activada a las <strong>${fmtHora(sesion.horaInicio)}</strong>. Por control antifraude, <strong>no es posible volver a activar la asistencia</strong> para este mismo día.</p>
        <p class="text-xs font-semibold mt-2" style="color:${ventana.color}">${ventana.texto}</p>
      </div>`;

    const cuerpo = `
      <div class="flex flex-col gap-4">
        ${bannerEstado}

        ${qrEstudianteHtml}

        <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-slate2">Asistencias registradas hoy en esta clase:</p>
              <p class="text-2xl font-extrabold text-ink mt-0.5" id="contadorAsistenciasHoy">${totalAsistencias} estudiante${totalAsistencias === 1 ? '' : 's'}</p>
            </div>
            <button onclick="recargarEstadoDocenteQr('${registro.token}')" class="rounded-xl border border-gray-200 text-slate2 hover:text-morado hover:bg-morado/5 text-xs font-semibold px-3 py-2 transition flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>
        </div>

        <div class="text-center mt-2">
          <a href="${location.pathname}" class="text-xs text-slate2 hover:text-ink underline">Ir al portal de la Fundación</a>
        </div>
      </div>`;

    document.getElementById('qrViewCard').innerHTML = `
      <div class="bg-white rounded-3xl shadow-softLg border border-gray-100 p-8 max-w-lg mx-auto">
        <div class="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 bg-morado/10 text-morado">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6m-4-2.5v2.5m8-2.5v2.5"/></svg>
        </div>
        <h1 class="text-xl font-extrabold text-ink mb-1">Docente: ${escapeHtml(registro.docente)}</h1>
        <p class="text-xs text-slate2 mb-6">Cohorte <strong class="text-ink">${escapeHtml(registro.cohorte)}</strong> · ${escapeHtml(sesion.materia)}</p>
        ${cuerpo}
      </div>`;

    if (tokenEstudiante) {
      pintarQrImprimible(idQrEst, urlQr('estudiante', tokenEstudiante));
    }
  }

  // ---- Landing del QR del ESTUDIANTE: Flujo 100% automatizado ----
  let timerEsperaDocenteQr = null;

  function renderQrLandingEstudianteGoogleForm(datos, errorInicial = '') {
    window.__ultimoQrDatosEstudiante = datos;
    if (timerEsperaDocenteQr) {
      clearInterval(timerEsperaDocenteQr);
      timerEsperaDocenteQr = null;
    }

    const { registro, sesionActiva, sesion } = datos;
    const token = registro.token;
    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Determinar si ya tenemos la identidad del estudiante guardada (login o escaneo previo)
    let savedEmail = '';
    try {
      savedEmail = (currentEstudiante && (currentEstudiante.email || currentEstudiante.nombre)) 
        || localStorage.getItem('aplus_estudiante_email') 
        || '';
    } catch (e) {}

    // Si la sesión está activa y tenemos la identidad y NO venimos de un error inicial:
    // PROCESO AUTOMÁTICO INMEDIATO:
    if (sesionActiva && savedEmail && !errorInicial) {
      document.getElementById('qrViewCard').innerHTML = `
        <div class="space-y-4 max-w-xl mx-auto">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center p-8">
            <div class="h-2.5 -mx-8 -mt-8 mb-6" style="background: #673ab7;"></div>
            <div class="w-16 h-16 rounded-full bg-morado/10 text-morado flex items-center justify-center mx-auto mb-4">
              <svg class="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
            <h2 class="text-xl font-extrabold text-ink mb-1">Registrando asistencia automáticamente...</h2>
            <p class="text-xs text-slate2 mb-3">Identificado como <strong class="text-morado font-bold">${escapeHtml(savedEmail)}</strong></p>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-turquesa/10 text-turquesa text-xs font-semibold">
              <span>Cohorte: ${escapeHtml(registro.cohorte)} · ${escapeHtml(sesion ? (sesion.materia || sesion.modulo) : '')}</span>
            </div>
          </div>
          <p class="text-center text-[11px] text-slate2">Sistema de Asistencia Automatizada · Fundación A+</p>
        </div>`;

      // Se ejecuta de inmediato el registro
      setTimeout(() => {
        enviarFormularioAsistencia(token, savedEmail);
      }, 350);
      return;
    }

    // Si la sesión no está activa, activamos sondeo cada 3 segundos
    if (!sesionActiva) {
      timerEsperaDocenteQr = setInterval(() => {
        const qrView = document.getElementById('qrView');
        if (qrView && !qrView.classList.contains('hidden')) {
          manejarQrEnURL();
        } else {
          clearInterval(timerEsperaDocenteQr);
          timerEsperaDocenteQr = null;
        }
      }, 3000);
    }

    let estadoSesionHtml = '';
    if (sesionActiva) {
      const ventana = estadoVentanaSesion(sesion);
      estadoSesionHtml = `
        <div class="rounded-xl p-3.5 mb-5 text-left flex items-start gap-2.5" style="background:#1FC8C014; border-left: 4px solid #1FC8C0;">
          <span class="relative flex h-3 w-3 mt-1 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <p class="text-xs font-bold text-ink">Sesión abierta por el docente</p>
            <p class="text-[11px] font-semibold mt-0.5" style="color:${ventana.color}">${ventana.texto}</p>
            <p class="text-[11px] text-coral font-medium mt-1.5 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Recuerda: tu asistencia inicia marcada como <strong>Falla (pérdida)</strong> por defecto hasta que confirmes tu usuario.</span>
            </p>
          </div>
        </div>`;
    } else {
      estadoSesionHtml = `
        <div class="rounded-xl p-3.5 mb-5 text-left flex items-start gap-2.5" style="background:#F5A62314; border-left: 4px solid #F5A623;">
          <div class="w-5 h-5 shrink-0 mt-0.5">
            <svg class="w-4 h-4 animate-spin text-oro" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
          <div>
            <p class="text-xs font-bold text-ink">Esperando activación de clase...</p>
            <p class="text-[11px] text-slate2 mt-0.5">El docente (${escapeHtml(registro.docente)}) aún no ha abierto la sesión. En cuanto la active, tu asistencia se registrará automáticamente en segundo plano.</p>
          </div>
        </div>`;
    }

    document.getElementById('qrViewCard').innerHTML = `
      <div class="space-y-4 max-w-xl mx-auto">
        <!-- Card 1: Encabezado estilo Google Forms con franja morada superior -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="h-3 w-full" style="background: #673ab7;"></div>
          <div class="p-6 text-left">
            <h1 class="text-2xl font-bold text-[#202124] tracking-tight mb-2">Registro de Asistencia — Fundación A+</h1>
            <div class="text-xs text-[#5f6368] space-y-1 mb-4">
              <p>Cohorte: <strong class="text-[#202124]">${escapeHtml(registro.cohorte)}</strong></p>
              <p>Docente: <strong class="text-[#202124]">${escapeHtml(registro.docente)}</strong></p>
              <p>Fecha: <span class="capitalize">${hoy}</span></p>
            </div>
            ${estadoSesionHtml}
            <div class="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-[#d93025]">
              <span>* Indica que la pregunta es obligatoria</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Pregunta / Formulario estilo Google Forms -->
        <div class="bg-white rounded-xl shadow-sm border ${errorInicial ? 'border-red-400' : 'border-gray-200'} p-6 text-left transition" id="cardPreguntaUsuario">
          <label for="googleFormUsuarioInput" class="block text-sm font-semibold text-[#202124] mb-1">
            Correo institucional o Usuario asignado <span class="text-[#d93025]">*</span>
          </label>
          <p class="text-xs text-[#5f6368] mb-4">Ingresa tu correo institucional o tu nombre de usuario para registrar tu asistencia automáticamente en esta y futuras clases.</p>
          
          <div class="relative mb-2">
            <input 
              id="googleFormUsuarioInput" 
              type="text" 
              autocomplete="email" 
              placeholder="Tu respuesta" 
              value="${escapeHtml(savedEmail)}"
              class="w-full text-sm text-[#202124] py-2.5 px-3 border-b-2 border-gray-300 focus:border-[#673ab7] focus:outline-none transition bg-transparent placeholder-gray-400"
            />
          </div>
          <div id="googleFormErrorMsg" class="${errorInicial ? '' : 'hidden'} text-xs text-[#d93025] mt-1.5 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            <span id="googleFormErrorText">${escapeHtml(errorInicial)}</span>
          </div>
        </div>

        <!-- Card 3: Botón de Enviar -->
        <div class="flex items-center justify-between pt-1">
          <button 
            type="button" 
            onclick="enviarFormularioAsistencia('${token}')" 
            id="btnEnviarAsistencia"
            class="rounded-lg text-white font-medium text-sm px-7 py-2.5 shadow hover:shadow-md transition flex items-center gap-2 cursor-pointer"
            style="background: #673ab7;"
          >
            <span id="btnEnviarText">Enviar</span>
            <svg id="btnEnviarSpinner" class="hidden animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </button>
          <button 
            type="button" 
            onclick="document.getElementById('googleFormUsuarioInput').value='';" 
            class="text-xs font-semibold text-[#5f6368] hover:text-[#202124] transition cursor-pointer"
          >
            Borrar formulario
          </button>
        </div>

        <div class="text-center pt-4">
          <p class="text-[11px] text-[#5f6368]">Formulario de asistencia automatizada · Fundación A+</p>
        </div>
      </div>`;

    const input = document.getElementById('googleFormUsuarioInput');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') enviarFormularioAsistencia(token);
      });
    }
  }

  // Envía la respuesta del formulario y la procesa en MySQL
  async function enviarFormularioAsistencia(token, valorDirecto) {
    const input = document.getElementById('googleFormUsuarioInput');
    const valor = ((valorDirecto !== undefined && valorDirecto !== null) ? valorDirecto : (input ? input.value : '')).trim();
    const errorEl = document.getElementById('googleFormErrorMsg');
    const errorText = document.getElementById('googleFormErrorText');
    const cardPregunta = document.getElementById('cardPreguntaUsuario');
    const btn = document.getElementById('btnEnviarAsistencia');
    const btnText = document.getElementById('btnEnviarText');
    const btnSpinner = document.getElementById('btnEnviarSpinner');

    if (!valor) {
      if (errorEl && errorText) {
        errorText.textContent = 'Esta pregunta es obligatoria';
        errorEl.classList.remove('hidden');
        if (cardPregunta) cardPregunta.classList.add('border-red-400');
        if (input) input.focus();
      }
      return;
    }

    if (errorEl) errorEl.classList.add('hidden');
    if (cardPregunta) cardPregunta.classList.remove('border-red-400');

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Enviando...';
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    let devId = '';
    try {
      devId = localStorage.getItem('fa_dispositivo_id') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('fa_dispositivo_id', devId);
      }
    } catch (e) {}

    try {
      const resp = await fetch(API_BASE_URL + '/api/qr_asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ token, usuario: valor, dispositivoId: devId })
      });
      const res = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Si falló en modo automático, renderizar formulario editable con el error
        if (!document.getElementById('googleFormUsuarioInput')) {
          renderQrLandingEstudianteGoogleForm(window.__ultimoQrDatosEstudiante || { registro: { token }, sesionActiva: true }, res.error || 'Error al registrar asistencia.');
          return;
        }
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Enviar';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (errorEl && errorText) {
          errorText.textContent = res.error || 'Error al registrar asistencia.';
          errorEl.classList.remove('hidden');
          if (cardPregunta) cardPregunta.classList.add('border-red-400');
        }
        return;
      }

      // Guardamos la identidad para futuros escaneos automatizados
      try {
        localStorage.setItem('aplus_estudiante_email', valor);
      } catch (e) {}

      renderConfirmacionGoogleForm(res, token);
    } catch (err) {
      if (!document.getElementById('googleFormUsuarioInput')) {
        renderQrLandingEstudianteGoogleForm(window.__ultimoQrDatosEstudiante || { registro: { token }, sesionActiva: true }, 'No se pudo comunicar con el servidor local.');
        return;
      }
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Enviar';
      if (btnSpinner) btnSpinner.classList.add('hidden');
      if (errorEl && errorText) {
        errorText.textContent = 'No se pudo comunicar con el servidor local.';
        errorEl.classList.remove('hidden');
      }
    }
  }
  window.enviarFormularioAsistencia = enviarFormularioAsistencia;

  // Pantalla de confirmación estilo Google Forms
  function renderConfirmacionGoogleForm(res, token) {
    if (timerEsperaDocenteQr) {
      clearInterval(timerEsperaDocenteQr);
      timerEsperaDocenteQr = null;
    }

    const estadoBadge = res.estado === 'Presente' 
      ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:#0f8f89;"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Presente (Puntual)</span>'
      : '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:#b5790f;"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Llegada con retraso (Tarde)</span>';

    document.getElementById('qrViewCard').innerHTML = `
      <div class="space-y-4 text-left max-w-xl mx-auto">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="h-3 w-full" style="background: #673ab7;"></div>
          <div class="p-6">
            <h1 class="text-2xl font-bold text-[#202124] tracking-tight mb-2">Registro de Asistencia — Fundación A+</h1>
            <p class="text-sm text-[#202124] mb-4">${res.yaRegistrado ? 'Tu asistencia ya había sido registrada previamente para esta clase.' : 'Se ha registrado tu respuesta correctamente en el sistema.'}</p>
            
            <div class="rounded-xl p-4 bg-gray-50 border border-gray-200 space-y-2 mb-6">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Estudiante:</span>
                <span class="text-sm font-bold text-ink">${escapeHtml(res.estudiante)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Estado:</span>
                <span>${estadoBadge}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Cohorte / Materia:</span>
                <span class="text-xs font-medium text-ink">${escapeHtml(res.cohorte)} · ${escapeHtml(res.materia)}</span>
              </div>
              ${res.hora ? `
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate2">Hora de registro:</span>
                <span class="text-xs font-semibold text-slate2">${escapeHtml(res.hora)}</span>
              </div>` : ''}
            </div>

            <div class="pt-3 flex items-center gap-2.5 text-xs text-[#0f8f89] font-medium bg-[#1FC8C014] p-3 rounded-xl border border-[#1FC8C0]/30">
              <svg class="w-4 h-4 shrink-0 text-[#0f8f89]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span>Tu respuesta ha sido registrada y bloqueada para esta clase. No se permite enviar otra respuesta.</span>
            </div>
          </div>
        </div>

        <div class="text-center pt-2">
          <p class="text-[11px] text-[#5f6368]">Fundación A+ — Sistema de Control de Asistencia</p>
        </div>
      </div>`;
  }
  window.renderConfirmacionGoogleForm = renderConfirmacionGoogleForm;


  let docenteRiesgoCohorte = '';

  async function cambiarDocenteRiesgoCohorte(cohorte) {
    docenteRiesgoCohorte = cohorte || '';
    await renderRiesgoDocente();
  }
  window.cambiarDocenteRiesgoCohorte = cambiarDocenteRiesgoCohorte;

  // ---------- RENDER: Semáforo de riesgo — docente ----------
  async function renderRiesgoDocente() {
    const modulosDoc = await docenteModulosActivos();
    const cohortes = Array.from(new Set(modulosDoc.map(m => m.nombre).filter(Boolean))).sort();
    const tieneMultiplesCohortes = cohortes.length >= 2;

    if (docenteRiesgoCohorte && !cohortes.includes(docenteRiesgoCohorte)) {
      docenteRiesgoCohorte = '';
    }

    const dataSemaforo = (await computeSemaforo(docenteRiesgoCohorte || '')).filter(s => cohortes.includes(s.cohorte));
    const dataFiltrada = docenteRiesgoCohorte
      ? dataSemaforo.filter(s => s.cohorte === docenteRiesgoCohorte)
      : dataSemaforo;

    const riesgoColor = { Verde: { bg: '#1FC8C01A', text: '#0f8f89', dot: '#1FC8C0' }, Amarillo: { bg: '#F5A6231A', text: '#b5790f', dot: '#F5A623' }, Rojo: { bg: '#F0455C1A', text: '#F0455C', dot: '#F0455C' } };

    const rows = dataFiltrada.map(s => `
      <tr data-search="${escapeHtml((s.nombre + ' ' + (s.cohorte || '') + ' ' + s.riesgo + ' ' + (s.motivo || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm font-semibold text-ink"><span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${riesgoColor[s.riesgo].dot}"></span>${escapeHtml(s.nombre)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.cohorte || '—')}</td>
        <td class="py-3 px-4 text-sm text-slate2 font-mono">${s.promedio}</td>
        <td class="py-3 px-4 text-sm text-slate2 font-mono">${s.asistencia === '—' ? '—' : s.asistencia + '%'}</td>
        <td class="py-3 px-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${riesgoColor[s.riesgo].bg};color:${riesgoColor[s.riesgo].text}">${s.riesgo}</span></td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(s.motivo) || '—'}</td>
      </tr>`).join('');

    const filtroCohorteHtml = tieneMultiplesCohortes
      ? `<div class="flex items-center gap-1.5">
           <label for="filtroDocenteRiesgoCohorte" class="text-xs font-semibold text-slate2 shrink-0">Filtrar cohorte:</label>
           <select id="filtroDocenteRiesgoCohorte" onchange="cambiarDocenteRiesgoCohorte(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3 py-1.5 text-xs sm:text-sm font-medium text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado transition">
             <option value="">Todas mis cohortes (${dataSemaforo.length})</option>
             ${cohortes.map(c => {
               const cant = dataSemaforo.filter(s => s.cohorte === c).length;
               return `<option value="${escapeHtml(c)}" ${docenteRiesgoCohorte === c ? 'selected' : ''}>${escapeHtml(c)} (${cant})</option>`;
             }).join('')}
           </select>
         </div>`
      : (cohortes.length === 1 ? `<span class="text-xs font-semibold px-3 py-1 bg-turquesa/10 text-turquesa rounded-xl border border-turquesa/20">Cohorte: ${escapeHtml(cohortes[0])}</span>` : '');

    document.getElementById('mount-t-riesgo').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-bold text-ink tracking-tight">Semáforo de riesgo académico</p>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-turquesa/10 text-turquesa">${dataFiltrada.length} estudiante${dataFiltrada.length === 1 ? '' : 's'}</span>
            </div>
            <p class="text-xs text-slate2 mt-0.5">Calculado automáticamente con el promedio de notas y el % de asistencia de tus estudiantes.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            ${filtroCohorteHtml}
            <div class="relative">
              <input data-table="table-docente-riesgo" oninput="TableManager.filter('table-docente-riesgo', this.value)" type="text" placeholder="Buscar estudiante..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs sm:text-sm w-40 sm:w-48 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
              <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-docente-riesgo" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
              <th class="py-2.5 px-4">Estudiante</th><th class="py-2.5 px-4">Cohorte</th><th class="py-2.5 px-4">Promedio</th><th class="py-2.5 px-4">Asistencia</th><th class="py-2.5 px-4">Riesgo</th><th class="py-2.5 px-4">Motivo</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-sm text-slate2 text-center py-6">Aún no tienes estudiantes en la cohorte seleccionada.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-docente-riesgo');
  }

  // ---------- Calificaciones (docente) — notas de 0.0 a 10.0, ponderadas ----------
  // Una cohorte + docente + MES = un registro con "criterios" (notas
  // configurables por el docente: nombre + peso %) y "valores" (nota
  // 0.0–10.0 de cada estudiante por criterio). Arranca vacío: sin criterios
  // ni notas de ejemplo.
  //
  // Separación por mes: cada vez que se crea un Horario nuevo (nuevo mes)
  // para una cohorte, el docente asignado ve una hoja de calificación NUEVA
  // y en blanco para ese mes — las notas de meses anteriores no se tocan ni
  // se mezclan, quedan disponibles como historial de solo lectura (tanto
  // para el docente como para el estudiante, ver renderCalificacionesEstudiante).
  let docenteCalifSeleccion = null; // "cohorte__mes"

  // Mes calendario real de hoy, en el mismo formato "YYYY-MM" que usa el
  // campo `mes` en toda la plataforma — punto único de esta comparación,
  // usado por mesActualParaDocenteCohorte() y por el cálculo de "esFuturo"
  // en los selectores de Calificaciones e Informes.
  function mesActualReal() {
    const hoy = new Date();
    return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  }

  // Mes más reciente en el que un docente tiene una franja de Horario para
  // una cohorte dada, PERO nunca más adelante que el mes calendario real de
  // hoy — ese es el "periodo actual" y el único editable.
  // CORREGIDO: antes se tomaba el mes más reciente que existiera en el
  // Horario sin importar la fecha real, así que si ya se creaba el
  // horario de un mes futuro (ej. octubre creado en septiembre), ese mes
  // futuro quedaba marcado como "actual" y editable de inmediato — un
  // docente podía enviar calificaciones/informes de un mes que todavía no
  // había llegado. Ahora se compara contra hoy (formato "YYYY-MM", el
  // mismo que usa el campo `mes` en toda la plataforma, así que la
  // comparación de strings basta) y se toma el mes más reciente que no la
  // supere. Si el docente solo tiene franjas en meses futuros (ningún mes
  // ya llegó todavía), no hay ningún mes editable — se devuelve null.
  // async: getSlotsDocente() ahora es async.
  async function mesActualParaDocenteCohorte(docenteNombre, cohorteNombre) {
    const mesHoy = mesActualReal();
    const meses = (await getSlotsDocente(docenteNombre))
      .filter(s => s.cohorte === cohorteNombre)
      .map(s => s.mes)
      .filter(Boolean)
      .filter(m => m <= mesHoy); // descarta cualquier mes que todavía no haya llegado
    if (!meses.length) return null;
    return meses.reduce((a, b) => (b > a ? b : a));
  }

  // Migración: asigna un "mes" a cualquier registro de notas_modulos que se
  // haya creado antes de separar las calificaciones por periodo. Se corre
  // una sola vez al cargar la página (ver el arranque, al final del archivo).
  // async: 'notas_modulos' vía MySQL + mesActualParaDocenteCohorte() (que
  // también es async, usa 'horarios' vía MySQL).
  async function migrarNotasModulosSinMes() {
    const registros = await Store.list('notas_modulos');
    const sinMes = registros.filter(r => !r.mes);
    if (!sinMes.length) return;
    const mesesResueltos = await Promise.all(sinMes.map(r => mesActualParaDocenteCohorte(r.docente, r.cohorte)));
    sinMes.forEach((r, i) => { r.mes = mesesResueltos[i] || '0000-00'; });
    await Store.set('notas_modulos', registros);
  }

  // async: 'notas_modulos' vía MySQL.
  async function getNotasModuloRecord(cohorteNombre, mes, crear) {
    const doc = currentDocente || {};
    const registros = await Store.list('notas_modulos');
    let rec = registros.find(r => r.docente === doc.nombre && r.cohorte === cohorteNombre && r.mes === mes);
    if (!rec && crear) {
      // Migración suave: si existe un registro de antes de separar las notas
      // por mes (sin campo "mes") para este mismo docente+cohorte, se adopta
      // en vez de perder esas calificaciones ya cargadas.
      const legacy = registros.find(r => r.docente === doc.nombre && r.cohorte === cohorteNombre && !r.mes);
      if (legacy) {
        legacy.mes = mes;
        rec = legacy;
        await Store.set('notas_modulos', registros);
      } else {
        rec = { id: uid('nm'), docente: doc.nombre, cohorte: cohorteNombre, mes, criterios: [], valores: {} };
        registros.push(rec);
        await Store.set('notas_modulos', registros);
      }
    }
    return rec || null;
  }

  // async: 'notas_modulos' vía MySQL.
  async function guardarNotasModuloRecord(rec) {
    const registros = await Store.list('notas_modulos');
    const idx = registros.findIndex(r => r.id === rec.id);
    if (idx >= 0) registros[idx] = rec; else registros.push(rec);
    await Store.set('notas_modulos', registros);
    // Deja rastro en "Actividad reciente" del dashboard: quién subió/editó
    // notas, en qué cohorte y mes. currentDocente siempre está disponible
    // aquí porque los 4 llamadores de esta función viven en el panel Docente.
    if (currentDocente) {
      await registrarAuditoriaAccion('Notas actualizadas', currentDocente.nombre, 'Docente', `${rec.cohorte || ''} · ${rec.mes || ''}`.trim());
    }
  }

  function pesoTotalCriterios(rec) {
    return (rec.criterios || []).reduce((a, c) => a + (Number(c.peso) || 0), 0);
  }

  // Nota cuantitativa ponderada (0.0–10.0). Se normaliza sobre el peso total
  // definido (aunque no sume exactamente 100%) para que el cálculo nunca
  // quede roto, pero la interfaz igual avisa si el peso no suma 100%.
  function calcularNotaFinal(rec, estudianteNombre) {
    const criterios = rec.criterios || [];
    if (!criterios.length) return null;
    const valores = (rec.valores && rec.valores[estudianteNombre]) || {};
    let sumaPeso = 0, sumaPonderada = 0, faltan = false;
    criterios.forEach(c => {
      const peso = Number(c.peso) || 0;
      sumaPeso += peso;
      const v = valores[c.id];
      if (v === undefined || v === null || v === '') { faltan = true; return; }
      sumaPonderada += Number(v) * peso;
    });
    if (!sumaPeso) return null;
    if (faltan) return { pendiente: true };
    return { valor: sumaPonderada / sumaPeso, pendiente: false };
  }

  function calificacionCualitativa(nota) {
    if (nota === null || nota === undefined || isNaN(nota)) return '—';
    if (nota >= 9) return 'Desempeño Superior';
    if (nota >= 7) return 'Desempeño Alto';
    if (nota >= 6) return 'Desempeño Básico';
    return 'Desempeño Bajo';
  }
  function colorCualitativa(nota) {
    if (nota === null || nota === undefined || isNaN(nota)) return '#5B6472';
    if (nota >= 9) return '#1FC8C0';
    if (nota >= 7) return '#0f8f89';
    if (nota >= 6) return '#F5A623';
    return '#F0455C';
  }

  // Opciones para el selector de "Calificar estudiantes": una por cada
  // combinación real Cohorte+Mes que aparece en el Horario del docente
  // (no solo por cohorte). Más recientes primero.
  // async: getSlotsDocente() y mesActualParaDocenteCohorte() ahora son async.
  async function docenteCalifOpciones() {
    const doc = currentDocente || {};
    if (!doc.nombre) return [];
    const mapa = new Map();
    (await getSlotsDocente(doc.nombre)).forEach(s => {
      const key = s.cohorte + '__' + s.mes;
      if (!mapa.has(key)) mapa.set(key, { cohorte: s.cohorte, mes: s.mes, materias: new Set() });
      if (s.materia) mapa.get(key).materias.add(s.materia);
    });
    const entradas = [...mapa.entries()];
    const esActualPorEntrada = await Promise.all(entradas.map(([, o]) => mesActualParaDocenteCohorte(doc.nombre, o.cohorte)));
    const mesHoy = mesActualReal();
    const arr = entradas.map(([key, o], i) => ({
      key, cohorte: o.cohorte, mes: o.mes,
      materia: [...o.materias].filter(Boolean).join(' / ') || '(sin materia)',
      esActual: o.mes === esActualPorEntrada[i],
      esFuturo: o.mes > mesHoy, // mes que en el calendario real todavía no llega — distinto de "historial" (un mes ya pasado)
    }));
    arr.sort((a, b) => b.mes.localeCompare(a.mes) || a.cohorte.localeCompare(b.cohorte));
    return arr;
  }

  // async: docenteEstudiantesDeCohorte ahora es async.
  async function renderCalificacionesDocente() {
    const opciones = await docenteCalifOpciones();
    if (!docenteCalifSeleccion || !opciones.some(o => o.key === docenteCalifSeleccion)) {
      docenteCalifSeleccion = opciones.length ? opciones[0].key : null;
    }
    const sel = opciones.find(o => o.key === docenteCalifSeleccion) || null;

    if (!opciones.length) {
      document.getElementById('mount-t-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes/módulos asignados. El coordinador debe asignarte uno desde el panel administrativo (Horario) para poder subir calificaciones.</p>
      </div>`;
      return;
    }

    const rec = (await getNotasModuloRecord(sel.cohorte, sel.mes, false)) || { criterios: [], valores: {} };
    const pesoTotal = pesoTotalCriterios(rec);
    const pesoOk = pesoTotal === 100;
    const estudiantes = await docenteEstudiantesDeCohorte(sel.cohorte);
    const editable = sel.esActual;

    const selector = `<select onchange="cambiarCalifDocente(this.value)" class="rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
      ${opciones.map(o => `<option value="${escapeHtml(o.key)}" ${o.key === docenteCalifSeleccion ? 'selected' : ''}>${escapeHtml(o.cohorte)} — ${escapeHtml(mesLabel(o.mes))} — ${escapeHtml(o.materia)}${o.esActual ? '' : (o.esFuturo ? ' (aún no disponible)' : ' (historial)')}</option>`).join('')}
    </select>`;

    const avisoHistorial = !editable ? `<p class="text-xs font-semibold text-morado bg-morado/10 rounded-xl px-4 py-2.5 mb-4">Estás viendo un periodo anterior (${escapeHtml(mesLabel(sel.mes))}). Quedó guardado como historial y ya no se puede editar — el periodo activo para calificar es el mes más reciente que te asignaron en el Horario.</p>` : '';

    const criteriosFilas = (rec.criterios || []).map(c => `
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
        <input type="text" value="${escapeHtml(c.nombre)}" ${editable ? `onchange="actualizarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}','nombre', this.value)"` : 'disabled'} class="flex-1 bg-white text-sm font-semibold text-ink focus:outline-none disabled:opacity-60 rounded-lg border border-gray-100 px-2 py-1" placeholder="Nombre de la nota (ej. Taller 1)" />
        <div class="flex items-center gap-1.5 shrink-0">
          <input type="number" min="0" max="100" step="1" value="${c.peso}" ${editable ? `onchange="actualizarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}','peso', this.value)"` : 'disabled'} class="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right disabled:opacity-60" />
          <span class="text-xs text-slate2 font-semibold">%</span>
        </div>
        ${editable ? `<button onclick="eliminarCriterioCalif('${sel.cohorte}','${sel.mes}','${c.id}')" class="text-coral hover:opacity-70 shrink-0" title="Eliminar nota">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>` : ''}
      </div>`).join('');

    let tablaNotas;
    if (!rec.criterios || !rec.criterios.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">${editable ? 'Agrega al menos una nota (por ejemplo, "Taller 1") para empezar a calificar a tus estudiantes.' : 'Este periodo no llegó a tener notas de evaluación definidas.'}</p>`;
    } else if (!estudiantes.length) {
      tablaNotas = `<p class="text-sm text-slate2 text-center py-8">Esta cohorte aún no tiene estudiantes matriculados.</p>`;
    } else {
      const headerCriterios = rec.criterios.map(c => `<th class="py-2.5 px-3 text-center">${escapeHtml(c.nombre)}<br/><span class="text-[10px] font-normal normal-case text-slate2">${c.peso}%</span></th>`).join('');
      const filas = estudiantes.map(e => {
        const valores = (rec.valores && rec.valores[e.nombre]) || {};
        const celdas = rec.criterios.map(c => `
          <td class="py-2 px-3 text-center">
            <input type="number" min="0" max="10" step="0.1" value="${valores[c.id] !== undefined ? valores[c.id] : ''}" placeholder="0.0" ${editable ? '' : 'disabled'}
              onchange="guardarNotaCriterio('${sel.cohorte}','${sel.mes}','${e.id}','${c.id}', this.value)"
              class="w-16 rounded-lg border border-morado/25 bg-morado/5 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado disabled:opacity-60" />
          </td>`).join('');
        const resultado = calcularNotaFinal(rec, e.nombre);
        const nota = resultado && !resultado.pendiente ? resultado.valor : null;
        const cuantHtml = nota !== null ? `<span class="font-bold" style="color:${colorCualitativa(nota)}">${nota.toFixed(1)}</span>` : `<span class="text-slate2 text-xs">Incompleta</span>`;
        // Nota: la "Cualitativa" (Desempeño Superior/Alto/Básico/Bajo) ya NO se muestra
        // aquí. Esa valoración cualitativa vive únicamente en el Informe que el docente
        // genera para el estudiante/administrador (ver renderInformesDocente).
        return `<tr class="border-b border-gray-50 last:border-0">
          <td class="py-2.5 px-4 text-sm font-semibold text-ink whitespace-nowrap">${nombrePersonaClicable(e.nombre, 'Estudiante')}</td>
          ${celdas}
          <td class="py-2.5 px-3 text-center">${cuantHtml}</td>
        </tr>`;
      }).join('');
      tablaNotas = `<div class="overflow-x-auto rounded-xl border border-gray-100">
        <table class="w-full">
          <thead><tr class="text-left text-[10px] font-bold uppercase tracking-wide text-slate2 border-b border-gray-100">
            <th class="py-2.5 px-4">Estudiante</th>${headerCriterios}<th class="py-2.5 px-3 text-center">Cuantitativa</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    }

    document.getElementById('mount-t-calificaciones').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-ink">Calificaciones por cohorte y mes</p>
            <p class="text-xs text-slate2 mt-0.5">Escala de 0.0 a 10.0. Cada mes/materia asignada en tu Horario tiene su propia hoja de calificación — el mes más reciente es el periodo activo; los anteriores quedan como historial de solo lectura.</p>
          </div>
          ${selector}
        </div>
      </div>
      ${avisoHistorial}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p class="text-sm font-bold text-ink">Notas de evaluación — ${escapeHtml(sel.materia)} · ${escapeHtml(mesLabel(sel.mes))}</p>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${pesoOk ? '#1FC8C01A' : '#F0455C1A'};color:${pesoOk ? '#0f8f89' : '#F0455C'}">Peso total: ${pesoTotal}%${pesoOk ? '' : ' — debe sumar 100%'}</span>
        </div>
        <div class="space-y-2.5 mb-4">${criteriosFilas || '<p class="text-sm text-slate2">Aún no has definido notas para este periodo.</p>'}</div>
        ${editable ? `<button onclick="agregarCriterioCalif('${sel.cohorte}','${sel.mes}')" class="rounded-xl border border-dashed border-gray-300 text-slate2 hover:text-ink hover:border-ink text-sm font-semibold px-4 py-2.5 transition">+ Agregar nota</button>` : ''}
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <p class="text-sm font-bold text-ink mb-4">Calificar estudiantes</p>
        ${tablaNotas}
      </div>`;
  }

  function cambiarCalifDocente(value) {
    docenteCalifSeleccion = value;
    renderCalificacionesDocente();
  }

  // async: 'notas_modulos' vía MySQL.
  async function agregarCriterioCalif(cohorteNombre, mes) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    rec.criterios = rec.criterios || [];
    rec.criterios.push({ id: uid('cr'), nombre: 'Nota ' + (rec.criterios.length + 1), peso: 0 });
    await guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  async function actualizarCriterioCalif(cohorteNombre, mes, criterioId, campo, valor) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    const c = (rec.criterios || []).find(x => x.id === criterioId);
    if (!c) return;
    if (campo === 'peso') {
      let n = parseFloat(valor);
      if (isNaN(n) || n < 0) n = 0;
      if (n > 100) n = 100;
      c.peso = n;
    } else {
      c.nombre = valor.trim() || c.nombre;
    }
    await guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  async function eliminarCriterioCalif(cohorteNombre, mes, criterioId) {
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    rec.criterios = (rec.criterios || []).filter(c => c.id !== criterioId);
    Object.keys(rec.valores || {}).forEach(est => { if (rec.valores[est]) delete rec.valores[est][criterioId]; });
    await guardarNotasModuloRecord(rec);
    toast('Nota de evaluación eliminada', 'ok');
    renderCalificacionesDocente();
  }

  // async: 'usuarios' y 'notas_modulos' vía MySQL.
  async function guardarNotaCriterio(cohorteNombre, mes, estudianteId, criterioId, valorStr) {
    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    if (!est) return;
    let n = valorStr === '' ? null : parseFloat(valorStr);
    if (n !== null) {
      if (isNaN(n)) { toast('Ingresa un número válido entre 0.0 y 10.0', 'err'); renderCalificacionesDocente(); return; }
      if (n < 0) n = 0;
      if (n > 10) n = 10;
    }
    const rec = await getNotasModuloRecord(cohorteNombre, mes, true);
    rec.valores = rec.valores || {};
    rec.valores[est.nombre] = rec.valores[est.nombre] || {};
    if (n === null) delete rec.valores[est.nombre][criterioId];
    else rec.valores[est.nombre][criterioId] = n;
    await guardarNotasModuloRecord(rec);
    renderCalificacionesDocente();
  }

  // ---------- Informes docentes (autocompletado inteligente) ----------
  // Mismo patrón que docenteCalifSeleccion/docenteCalifOpciones (ver
  // arriba): un informe nuevo e independiente por cada combinación
  // Cohorte+Mes real que aparece en el Horario del docente. Al pasar a
  // octubre, en cuanto exista una franja de Horario de octubre para esa
  // cohorte, aparece un informe NUEVO y en blanco para ese mes — el
  // informe de septiembre (si ya fue Enviado) queda intacto, como
  // historial de solo lectura, y nunca se reabre ni se sobrescribe.
  let docenteInformesSeleccion = null; // "cohorte__mes"

  // async: 'asistencia' y 'notas_modulos' vía MySQL.
  async function generarDatosInformeEstudiante(estudianteNombre, cohorteNombre, cursoNombre, mes, docenteNombre, preloaded = null) {
    const asistList = (preloaded && preloaded.asistList) ? preloaded.asistList : await Store.list('asistencia');
    const asistReg = asistList.filter(a => {
      if (a.estudiante !== estudianteNombre) return false;
      if (docenteNombre && a.docente && a.docente === docenteNombre) {
        if (mes && a.fecha && a.fecha.slice(0, 7) !== mes) return false;
        return true;
      }
      if (cursoNombre && (a.materia === cursoNombre || a.modulo === cursoNombre)) {
        if (mes && a.fecha && a.fecha.slice(0, 7) !== mes) return false;
        return true;
      }
      return false;
    });
    const presentes = asistReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistReg.length ? Math.round((presentes / asistReg.length) * 100) : null;

    // Si se pasa recNotas en preloaded (incluso si es null), se aprovecha directamente
    const rec = (preloaded && preloaded.recNotas !== undefined)
      ? preloaded.recNotas
      : await getNotasModuloRecord(cohorteNombre, mes, false);
    const resultado = rec ? calcularNotaFinal(rec, estudianteNombre) : null;
    const nota = resultado && !resultado.pendiente ? resultado.valor : null;

    const partes = [];
    if (pctAsistencia !== null) partes.push('una asistencia del ' + pctAsistencia + '%');
    if (nota !== null) partes.push('una nota cuantitativa de ' + nota.toFixed(1) + ' (' + calificacionCualitativa(nota) + ')');
    const conclusion = partes.length
      ? 'Durante el curso, el/la estudiante registró ' + partes.join(' y ') + '.'
      : 'Aún no hay suficientes datos de asistencia o calificaciones para generar una conclusión automática.';

    return { pctAsistencia, nota, cualitativa: nota !== null ? calificacionCualitativa(nota) : null, conclusion };
  }

  // Opciones para el selector de Informes: una por cada combinación real
  // Cohorte+Mes que aparece en el Horario del docente — igual que
  // docenteCalifOpciones(). "esActual" marca el mes más reciente (según
  // el Horario) para esa cohorte; los meses anteriores se muestran como
  // historial de solo lectura si ya fueron enviados.
  // async: getSlotsDocente() y mesActualParaDocenteCohorte() ahora son async.
  async function docenteInformesOpciones() {
    const doc = currentDocente || {};
    if (!doc.nombre) return [];
    const mapa = new Map();
    (await getSlotsDocente(doc.nombre)).forEach(s => {
      const key = s.cohorte + '__' + s.mes;
      if (!mapa.has(key)) mapa.set(key, { cohorte: s.cohorte, mes: s.mes, materias: new Set() });
      if (s.materia) mapa.get(key).materias.add(s.materia);
    });
    const entradas = [...mapa.entries()];
    const esActualPorEntrada = await Promise.all(entradas.map(([, o]) => mesActualParaDocenteCohorte(doc.nombre, o.cohorte)));
    const mesHoy = mesActualReal();
    const arr = entradas.map(([key, o], i) => ({
      key, cohorte: o.cohorte, mes: o.mes,
      materia: [...o.materias].filter(Boolean).join(' / ') || '(sin materia)',
      esActual: o.mes === esActualPorEntrada[i],
      esFuturo: o.mes > mesHoy, // mes que en el calendario real todavía no llega — distinto de "historial" (un mes ya pasado)
    }));
    arr.sort((a, b) => b.mes.localeCompare(a.mes) || a.cohorte.localeCompare(b.cohorte));
    return arr;
  }

  // Estado del filtro del panel Informes del Docente:
  let docenteInformesCohorte = null; // cohorte seleccionada
  let docenteInformesMes = null;     // mes "YYYY-MM" seleccionado

  async function cambiarCohorteInformesDocente(cohorte) {
    docenteInformesCohorte = cohorte || null;
    docenteInformesMes = null;
    await renderInformesDocente();
  }
  window.cambiarCohorteInformesDocente = cambiarCohorteInformesDocente;

  async function cambiarMesInformesDocente(mes) {
    docenteInformesMes = mes || null;
    await renderInformesDocente();
  }
  window.cambiarMesInformesDocente = cambiarMesInformesDocente;

  // Estado para desplegar informes ya radicados
  let docenteInformesVerEnviados = false;
  function toggleVerInformesEnviadosDocente() {
    docenteInformesVerEnviados = !docenteInformesVerEnviados;
    const sec = document.getElementById('seccion-informes-enviados');
    const btn = document.getElementById('btn-toggle-informes-enviados');
    if (sec) sec.classList.toggle('hidden', !docenteInformesVerEnviados);
    if (btn) {
      btn.innerHTML = docenteInformesVerEnviados
        ? `<span>Ocultar informes enviados</span> <svg class="w-3.5 h-3.5 rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`
        : `<span>Ver detalles de informes enviados</span> <svg class="w-3.5 h-3.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`;
    }
  }
  window.toggleVerInformesEnviadosDocente = toggleVerInformesEnviadosDocente;

  // async: docenteEstudiantesDeCohorte y docenteModulosActivos son async.
  async function renderInformesDocente() {
    const doc = currentDocente || {};
    if (!doc.nombre) return;
    const modulosDoc = await docenteModulosActivos();

    if (!modulosDoc.length) {
      document.getElementById('mount-t-informes').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes cohortes asignadas para generar informes.</p>
      </div>`;
      return;
    }

    if (!docenteInformesCohorte || !modulosDoc.some(m => m.nombre === docenteInformesCohorte)) {
      docenteInformesCohorte = modulosDoc[0].nombre;
      docenteInformesMes = null;
    }

    const cohorteSel = modulosDoc.find(m => m.nombre === docenteInformesCohorte) || modulosDoc[0];
    const slotsDocente = await getSlotsDocente(doc.nombre);
    const slotsCohorte = slotsDocente.filter(s => s.cohorte === docenteInformesCohorte);
    
    // Meses del horario para esta cohorte
    let mesesCohorte = [...new Set(slotsCohorte.map(s => s.mes))].filter(Boolean).sort().reverse();
    if (!mesesCohorte.length) {
      mesesCohorte = generarOpcionesMes(cohorteSel).map(o => o.value).reverse();
    }
    if (!mesesCohorte.length) {
      mesesCohorte = [mesActualReal()];
    }

    const mesHoy = mesActualReal();
    const mesActualCohorte = await mesActualParaDocenteCohorte(doc.nombre, docenteInformesCohorte);

    if (!docenteInformesMes || !mesesCohorte.includes(docenteInformesMes)) {
      docenteInformesMes = (mesActualCohorte && mesesCohorte.includes(mesActualCohorte))
        ? mesActualCohorte
        : (mesesCohorte.find(m => m <= mesHoy) || mesesCohorte[0]);
    }

    const esFuturo = docenteInformesMes > mesHoy;
    const esMesActivo = (docenteInformesMes === mesActualCohorte) && !esFuturo;
    const esPeriodoEditable = esMesActivo;

    const estudiantes = await docenteEstudiantesDeCohorte(docenteInformesCohorte);
    const guardados = (await Store.list('informes_docente', {
      params: { docente: doc.nombre, cohorte: docenteInformesCohorte, mes: docenteInformesMes },
      forceRefresh: true
    })).filter(i => 
      i.docente === doc.nombre && 
      i.cohorte === docenteInformesCohorte && 
      (i.mes === docenteInformesMes || (i.fecha && i.fecha.slice(0, 7) === docenteInformesMes))
    );

    const cursoSel = await cursoDeDocenteEnCohorte(doc.nombre, docenteInformesCohorte, docenteInformesMes);
    const [asistList, recNotas] = await Promise.all([
      Store.list('asistencia'),
      getNotasModuloRecord(docenteInformesCohorte, docenteInformesMes, false)
    ]);
    const preloadedInf = { asistList, recNotas };
    const datosPorEstudiante = await Promise.all(estudiantes.map(e => generarDatosInformeEstudiante(e.nombre, docenteInformesCohorte, cursoSel, docenteInformesMes, doc.nombre, preloadedInf)));

    const listaCompleta = estudiantes.map((e, i) => {
      const datos = datosPorEstudiante[i];
      const guardado = guardados.find(g => g.estudiante === e.nombre);
      const enviado = !!(guardado && guardado.estado === 'Enviado');
      return { e, datos, guardado, enviado };
    });

    const pendientes = listaCompleta.filter(item => !item.enviado);
    const enviados = listaCompleta.filter(item => item.enviado);
    const enviadosCount = enviados.length;
    const todosEnviados = estudiantes.length > 0 && pendientes.length === 0;

    let avisoPeriodoHtml = '';
    if (esFuturo) {
      avisoPeriodoHtml = `
        <div class="rounded-xl p-4 mb-5 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
          <div class="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="font-bold">Periodo planificado para el futuro — Aún no disponible (${escapeHtml(mesLabel(docenteInformesMes))})</p>
            <p class="text-slate2 mt-0.5">El horario de este mes ya está definido, pero los informes solo se pueden redactar y enviar durante el mes en curso. Actualmente estamos en <strong>${escapeHtml(mesLabel(mesHoy))}</strong>.</p>
          </div>
        </div>`;
    } else if (!esMesActivo) {
      avisoPeriodoHtml = `
        <div class="rounded-xl p-3.5 mb-5 bg-gray-50 border border-gray-200 text-slate2 flex items-start gap-2 text-xs">
          <div class="w-6 h-6 rounded-lg bg-gray-200 text-slate2 flex items-center justify-center shrink-0 mt-0.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <div>
            <p class="font-bold text-ink">Historial de informes (${escapeHtml(mesLabel(docenteInformesMes))})</p>
            <p class="mt-0.5">Estás consultando un periodo anterior cerrado. Los informes de meses pasados se conservan como historial en modo solo lectura.</p>
          </div>
        </div>`;
    }

    const selectorCohortes = `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5" for="docenteInfCohorteSelect">
          Cohorte ${modulosDoc.length > 1 ? `<span class="text-morado font-bold">(${modulosDoc.length} asignadas)</span>` : ''}
        </label>
        <select id="docenteInfCohorteSelect" onchange="cambiarCohorteInformesDocente(this.value)" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-semibold">
          ${modulosDoc.map(m => `<option value="${escapeHtml(m.nombre)}" ${m.nombre === docenteInformesCohorte ? 'selected' : ''}>${escapeHtml(m.nombre)}</option>`).join('')}
        </select>
      </div>`;

    const selectorMeses = `
      <div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5" for="docenteInfMesSelect">Periodo (Mes)</label>
        <select id="docenteInfMesSelect" onchange="cambiarMesInformesDocente(this.value)" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado font-semibold">
          ${mesesCohorte.map(m => {
            const esFut = m > mesHoy;
            const esAct = m === mesActualCohorte;
            const tag = esFut ? ' (aún no disponible)' : (esAct ? ' (mes activo)' : ' (historial)');
            return `<option value="${m}" ${m === docenteInformesMes ? 'selected' : ''}>${mesLabel(m)}${tag}</option>`;
          }).join('')}
        </select>
      </div>`;

    let cuerpoInformesHtml = '';

    if (!estudiantes.length) {
      cuerpoInformesHtml = '<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 text-center text-sm text-slate2">Esta cohorte aún no tiene estudiantes matriculados.</div>';
    } else if (esFuturo) {
      cuerpoInformesHtml = '';
    } else if (!esMesActivo) {
      // Historial de meses cerrados: vista limpia y compacta con apertura de modal
      cuerpoInformesHtml = `
        <div class="space-y-3">
          ${listaCompleta.map(item => {
            const { e, datos, guardado, enviado } = item;
            const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
            return `
            <div onclick="abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 flex items-center justify-between gap-3 hover:border-morado/30 hover:bg-morado/5 transition cursor-pointer group" title="Clic para ver reporte completo">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">${escapeHtml(iniciales)}</span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-ink truncate">${escapeHtml(e.nombre)}</p>
                  <p class="text-xs text-slate2 truncate">Curso: <strong class="text-ink">${escapeHtml(cursoSel)}</strong> · Asist: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : '—'}</strong> · Nota: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : '—'}</strong></p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${enviado ? `<span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-turquesa/10 text-turquesa"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Enviado</span>` : `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">No radicado</span>`}
                ${datos.nota !== null ? `<span class="hidden sm:inline-block text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(datos.nota)}1A;color:${colorCualitativa(datos.nota)}">${datos.cualitativa}</span>` : ''}
                <button type="button" onclick="event.stopPropagation(); abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="px-3 py-1 rounded-full text-xs font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">
                  Ver reporte
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } else if (todosEnviados) {
      // Periodo activo: TODOS los informes de los estudiantes ya fueron enviados
      cuerpoInformesHtml = `
        <div class="bg-white rounded-2xl border border-emerald-200/90 shadow-soft p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/60 shadow-inner">
            <svg class="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-ink mb-1.5">Todos los informes enviados correctamente este mes</h3>
            <p class="text-xs sm:text-sm text-slate2 max-w-lg mx-auto">
              Has completado y enviado con éxito todos los informes de los estudiantes (${enviados.length} en total) para el periodo de <strong class="text-emerald-700">${escapeHtml(mesLabel(docenteInformesMes))}</strong> en la cohorte <strong class="text-ink">${escapeHtml(docenteInformesCohorte)}</strong>.
            </p>
          </div>
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>${enviados.length} de ${estudiantes.length} informes radicados en la administración</span>
          </div>
        </div>`;
    } else {
      // Periodo activo: Aún quedan estudiantes pendientes por informe
      cuerpoInformesHtml = `
        <div class="flex items-center justify-between gap-3 mb-5 flex-wrap bg-linear-to-r from-morado/5 to-turquesa/5 p-4 rounded-2xl border border-morado/15">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <p class="text-xs sm:text-sm font-bold text-ink">
              Informes pendientes por diligenciar: <span class="text-morado font-extrabold">${pendientes.length}</span> de ${estudiantes.length}
            </p>
          </div>
          <span class="text-xs text-slate2">Al enviar el informe de un estudiante, su tarjeta se radicará y desaparecerá de esta lista.</span>
        </div>

        <div class="space-y-4">
          ${pendientes.map(item => {
            const { e, datos, guardado } = item;
            const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
            return `
            <div id="card_informe_${e.id}" class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 transition-all duration-300">
              <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-full bg-morado/10 text-morado text-xs font-bold flex items-center justify-center shrink-0">${escapeHtml(iniciales)}</span>
                  <p class="text-sm font-bold text-ink">${escapeHtml(e.nombre)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">Pendiente de envío</span>
                  ${datos.nota !== null ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(datos.nota)}1A;color:${colorCualitativa(datos.nota)}">${datos.cualitativa}</span>` : ''}
                </div>
              </div>
              <p class="text-xs text-slate2 mb-2">Curso: <strong class="text-ink">${escapeHtml(cursoSel)}</strong> · Asistencia: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : 'Sin datos'}</strong> · Nota cuantitativa: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : 'Sin datos'}</strong></p>
              <p class="text-sm text-ink mb-3 bg-slate-50/70 rounded-xl p-3 border border-gray-100">${escapeHtml(datos.conclusion)}</p>
              <label class="block text-xs font-semibold text-slate2 mb-1.5" for="obs_${e.id}">Observaciones personales del docente</label>
              <textarea id="obs_${e.id}" rows="2" placeholder="Ej. Durante las clases mostró mayor liderazgo y compromiso." oninput="autoguardarBorradorInforme('${e.id}','${escapeHtml(docenteInformesCohorte)}','${escapeHtml(docenteInformesMes)}')" class="w-full rounded-xl border border-morado/25 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado bg-morado/5">${escapeHtml(guardado ? guardado.observaciones : '')}</textarea>
              <div class="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <div class="flex items-center gap-3">
                  <button type="button" id="btn_enviar_${e.id}" onclick="enviarInformeDocente('${e.id}','${escapeHtml(docenteInformesCohorte)}','${escapeHtml(docenteInformesMes)}')" style="background: linear-gradient(135deg, #8B5CF6 0%, #1FC8C0 100%) !important; color: #ffffff !important;" class="cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                    <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    <span>Enviar informe</span>
                  </button>
                  <span id="autoguardado_${e.id}" class="text-xs text-slate2"></span>
                </div>
                <span class="text-[11px] text-slate2">Una vez enviado se archivará definitivamente</span>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    }

    // Sección desplegable de informes ya enviados (disponible cuando hay enviados en periodo activo)
    let seccionEnviadosHtml = '';
    if (esMesActivo && enviados.length > 0) {
      seccionEnviadosHtml = `
        <div class="mt-8 pt-6 border-t border-gray-200">
          <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate2">Informes ya enviados este mes (${enviados.length})</h4>
            </div>
            <button type="button" id="btn-toggle-informes-enviados" onclick="toggleVerInformesEnviadosDocente()" class="inline-flex items-center gap-1.5 text-xs font-semibold text-morado hover:text-morado/80 transition cursor-pointer">
              <span>${docenteInformesVerEnviados ? 'Ocultar informes enviados' : 'Ver detalles de informes enviados'}</span>
              <svg class="w-3.5 h-3.5 ${docenteInformesVerEnviados ? 'rotate-180' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
          <div id="seccion-informes-enviados" class="${docenteInformesVerEnviados ? '' : 'hidden'} space-y-3">
            ${enviados.map(item => {
              const { e, datos, guardado } = item;
              const iniciales = (e.nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'E';
              return `
              <div onclick="abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="bg-gray-50/80 rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-morado/30 hover:bg-morado/5 transition cursor-pointer group" title="Clic para ver reporte">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">${escapeHtml(iniciales)}</span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-ink truncate">${escapeHtml(e.nombre)}</p>
                    <p class="text-[11px] text-slate2 truncate">Asistencia: <strong class="text-ink">${datos.pctAsistencia !== null ? datos.pctAsistencia + '%' : '—'}</strong> · Nota: <strong class="text-ink">${datos.nota !== null ? datos.nota.toFixed(1) : '—'}</strong> · Radicado ${fmtDate(guardado ? guardado.fecha : '')}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"><svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Enviado</span>
                  <button type="button" onclick="event.stopPropagation(); abrirModalDetalleInforme('${escapeHtml((guardado && guardado.id) || '')}')" class="px-3 py-1 rounded-full text-xs font-bold bg-morado/10 text-morado hover:bg-morado hover:text-white transition cursor-pointer">
                    Ver reporte
                  </button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    document.getElementById('mount-t-informes').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 class="text-lg font-black text-ink">Informes mensuales de estudiantes</h2>
            <p class="text-xs text-slate2 mt-0.5 max-w-xl">El sistema autocompleta asistencia, notas y conclusión a partir de tus registros reales. Filtra por cohorte y mes para redactar tus observaciones y enviar los informes definitivos a la administración.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 shrink-0 text-right">
            <span class="text-[11px] font-bold text-slate2 uppercase tracking-wide">Estado de envíos</span>
            <p class="text-sm font-extrabold ${todosEnviados ? 'text-turquesa' : 'text-morado'}">${enviadosCount} de ${estudiantes.length} enviados</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          ${selectorCohortes}
          ${selectorMeses}
        </div>
      </div>
      ${avisoPeriodoHtml}
      ${cuerpoInformesHtml}
      ${seccionEnviadosHtml}`;
  }

  // async: 'usuarios' vía MySQL.
  // guardarInformeDocenteInterno(): helper compartido por el autoguardado
  // de borrador y por el envío definitivo — arma y persiste el registro.
  async function guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, estadoFinal) {
    const mesHoy = mesActualReal();
    const mesComparar = mes || mesHoy;

    // REGLA: Un profesor no puede redactar ni enviar informes de un mes futuro (ej. octubre estando en septiembre)
    if (mesComparar > mesHoy) {
      return null;
    }

    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    const doc = currentDocente || {};
    const modulosDoc = await docenteModulosActivos();
    const moduloSel = modulosDoc.find(m => m.nombre === cohorteNombre);
    if (!est || !moduloSel) return null;
    const textarea = document.getElementById('obs_' + estudianteId);
    const observaciones = textarea ? textarea.value.trim() : '';

    const curso = await cursoDeDocenteEnCohorte(doc.nombre, cohorteNombre, mes);

    const datos = await generarDatosInformeEstudiante(est.nombre, cohorteNombre, curso, mesComparar, doc.nombre);
    const registros = await Store.list('informes_docente', { forceRefresh: true });

    const idx = registros.findIndex(r => 
      r.docente === doc.nombre && 
      r.estudiante === est.nombre && 
      r.cohorte === cohorteNombre && 
      (r.mes === mesComparar || (r.fecha && r.fecha.slice(0, 7) === mesComparar))
    );

    if (idx >= 0 && registros[idx].estado === 'Enviado' && estadoFinal === 'Borrador') return registros[idx];

    const hoyStr = fechaHoyLocal();
    const fechaInforme = (mesComparar && mesComparar !== hoyStr.slice(0, 7)) ? `${mesComparar}-01` : hoyStr;

    const registro = {
      id: idx >= 0 ? registros[idx].id : uid('inf'),
      docente: doc.nombre,
      estudiante: est.nombre,
      cohorte: cohorteNombre,
      curso: curso,
      materia: curso,
      mes: mesComparar,
      fecha: fechaInforme,
      asistenciaPct: datos.pctAsistencia,
      promedio: datos.nota,
      cualitativa: datos.cualitativa,
      conclusion: datos.conclusion,
      observaciones,
      estado: estadoFinal,
    };

    if (idx >= 0) registros[idx] = registro;
    else registros.push(registro);

    await Store.set('informes_docente', registros);
    return registro;
  }

  // Autoguardado silencioso mientras el docente escribe la observación
  // (debounce de 900ms) — así el texto no se pierde si recarga la
  // página o cambia de cohorte antes de enviar. Queda como 'Borrador'.
  let _timersAutoguardadoInforme = {};
  function autoguardarBorradorInforme(estudianteId, cohorteNombre, mes) {
    const mesHoy = mesActualReal();
    if (mes && mes > mesHoy) return; // Bloquear guardado de meses futuros
    clearTimeout(_timersAutoguardadoInforme[estudianteId]);
    const indicador = document.getElementById('autoguardado_' + estudianteId);
    if (indicador) indicador.textContent = 'Guardando borrador…';
    _timersAutoguardadoInforme[estudianteId] = setTimeout(async () => {
      await guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, 'Borrador');
      const ind = document.getElementById('autoguardado_' + estudianteId);
      if (ind) ind.innerHTML = '<span class="inline-flex items-center gap-1 text-emerald-600 font-medium"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Borrador guardado automáticamente</span>';
    }, 900);
  }
  window.autoguardarBorradorInforme = autoguardarBorradorInforme;

  // Envío definitivo: pide confirmación porque, una vez enviado, el
  // informe ya no se puede editar.
  async function enviarInformeDocente(estudianteId, cohorteNombre, mes) {
    const mesHoy = mesActualReal();
    if (mes && mes > mesHoy) {
      toast(`No puedes enviar informes de un mes futuro (${mesLabel(mes)}). El mes actual es ${mesLabel(mesHoy)}.`, 'err');
      return;
    }
    const mesActualCohorte = await mesActualParaDocenteCohorte(currentDocente?.nombre || '', cohorteNombre);
    if (mesActualCohorte && mes !== mesActualCohorte) {
      toast(`Solo se pueden enviar informes del mes actual activo (${mesLabel(mesActualCohorte)}).`, 'err');
      return;
    }

    const est = (await Store.list('usuarios')).find(u => u.id === estudianteId);
    const confirmado = confirm(`¿Enviar el informe de ${est ? est.nombre : 'este estudiante'}?\n\nUna vez enviado quedará definitivo y no se podrá editar.`);
    if (!confirmado) return;

    // Animación inmediata de salida de la tarjeta para una respuesta visual instantánea
    const card = document.getElementById('card_informe_' + estudianteId);
    if (card) {
      card.style.transition = 'all 0.35s ease-out';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-12px) scale(0.96)';
      card.style.pointerEvents = 'none';
      setTimeout(() => { try { card.remove(); } catch(e) {} }, 350);
    }

    const registro = await guardarInformeDocenteInterno(estudianteId, cohorteNombre, mes, 'Enviado');
    if (registro) {
      if (typeof toast === 'function') toast('Informe enviado con éxito: ' + registro.estudiante, 'ok');
    }
    await renderInformesDocente();
  }
  window.enviarInformeDocente = enviarInformeDocente;

  // ---------- Pensum curricular (docente) ----------
  async function renderPensumDocente() {
    const doc = currentDocente || {};
    const items = [...(await Store.list('pensum'))].filter(p => p.docente === doc.nombre).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const totalHoras = items.reduce((a, p) => a + (Number(p.horas) || 0), 0);

    const rows = items.map(p => `
      <tr data-search="${escapeHtml((p.modulo + ' ' + p.tema).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(p.modulo)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${escapeHtml(p.tema)}</td>
        <td class="py-2.5 px-4 text-sm text-slate2">${p.horas} h</td>
      </tr>`).join('');

    document.getElementById('mount-t-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-ink">Pensum curricular</p>
          <p class="text-xs text-slate2 mt-0.5">${items.length} tema${items.length === 1 ? '' : 's'} asignado${items.length === 1 ? '' : 's'} a tu perfil · ${totalHoras} h en total</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative">
            <input data-table="table-docente-pensum" oninput="TableManager.filter('table-docente-pensum', this.value)" type="text" placeholder="Buscar tema..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs sm:text-sm w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
            <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button onclick="descargarPensumDocente()" ${items.length ? '' : 'disabled'} class="rounded-xl ${items.length ? 'bg-gradient-to-r from-morado to-turquesa text-white hover:opacity-95 shadow-sm' : 'bg-gray-100 text-slate2 cursor-not-allowed'} font-semibold text-xs sm:text-sm py-2 px-4 transition">Descargar PDF</button>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden p-6">
        <div class="table-responsive-container">
          <table id="table-docente-pensum" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Módulo / Asignatura</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad horaria</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes temas asignados en el pensum.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-docente-pensum');
  }

  function descargarPensumDocente() {
    const doc = currentDocente || {};
    // window.open() primero y de forma síncrona (mismo tick del clic) para
    // que el navegador no lo trate como popup bloqueado.
    const win = window.open('', '_blank');
    if (!win) { toast('Habilita las ventanas emergentes para descargar el PDF', 'err'); return; }
    Store.list('pensum').then(registros => {
      const items = [...registros].filter(p => p.docente === doc.nombre).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      if (!items.length) { win.close(); toast('Aún no tienes temas asignados en el pensum', 'info'); return; }
      const filas = items.map(p => `<tr><td>${escapeHtml(p.modulo)}</td><td>${escapeHtml(p.tema)}</td><td>${p.horas} h</td></tr>`).join('');
      win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pensum — ${escapeHtml(doc.nombre || '')}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#14181F;padding:40px;}
        h1{font-size:20px;margin-bottom:4px;} p.sub{color:#5B6472;margin-top:0;margin-bottom:24px;font-size:13px;}
        table{width:100%;border-collapse:collapse;} th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;}
        th{text-transform:uppercase;font-size:11px;letter-spacing:.05em;color:#5B6472;}
        button{margin-bottom:20px;border:none;border-radius:9999px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;background:#14181F;color:#fff;}
        @media print{button{display:none;}}
      </style></head><body>
      <button onclick="window.print()">Descargar / Imprimir</button>
      <h1>Pensum curricular — Fundación A+</h1>
      <p class="sub">Docente: ${escapeHtml(doc.nombre || '')}</p>
      <table><thead><tr><th>Módulo / Asignatura</th><th>Tema</th><th>Intensidad horaria</th></tr></thead><tbody>${filas}</tbody></table>
      </body></html>`);
      win.document.close();
    });
  }

  // ---------- Agenda personal (docente) ----------
  // async: 'agenda_docente' vía MySQL.
  async function renderAgendaDocente() {
    const doc = currentDocente || {};
    const eventos = [...(await Store.list('agenda_docente'))].filter(a => a.docente === doc.nombre).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    document.getElementById('mount-t-agenda').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_t_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          <select id="ag_t_tipo" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
            <option>Clase</option><option>Taller</option><option>Quiz</option><option>Entrega</option><option>Reunión</option><option>Recordatorio</option>
          </select>
          <input id="ag_t_fecha" type="date" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
        </div>
        <button onclick="agregarEventoAgendaDocente()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Agregar</button>
      </div>
      <div class="space-y-3">
        ${eventos.map(a => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(a.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}</p>
            </div>
            <button onclick="eliminarEventoAgendaDocente('${a.id}')" class="text-xs font-semibold text-coral hover:underline shrink-0">Eliminar</button>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes eventos en tu agenda personal.</p>'}
      </div>`;
  }

  // async: 'agenda_docente' vía MySQL.
  async function agregarEventoAgendaDocente() {
    const doc = currentDocente || {};
    const titulo = document.getElementById('ag_t_titulo').value.trim();
    const tipo = document.getElementById('ag_t_tipo').value;
    const fecha = document.getElementById('ag_t_fecha').value;
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = await Store.list('agenda_docente');
    registros.push({ id: uid('ag'), docente: doc.nombre, titulo, tipo, fecha, hora: '', notas: '' });
    await Store.set('agenda_docente', registros);
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaDocente();
  }

  // async: 'agenda_docente' vía MySQL.
  async function eliminarEventoAgendaDocente(id) {
    const doc = currentDocente || {};
    const registros = (await Store.list('agenda_docente')).filter(a => !(a.id === id && a.docente === doc.nombre));
    await Store.set('agenda_docente', registros);
    toast('Evento eliminado', 'ok');
    renderAgendaDocente();
  }

  const RENDERERS_DOCENTE = {
    resumen: renderResumenDocente,
    perfil: renderPerfilDocente,
    asistencia: renderAsistenciaDocente,
    riesgo: renderRiesgoDocente,
    informes: renderInformesDocente,
    modulos: renderHorarioDocente,
    calificaciones: renderCalificacionesDocente,
    pensum: renderPensumDocente,
    memorandos: renderMemorandosDocente,
    pqr: renderPqrDocente,
    agenda: renderAgendaDocente,
  };

  // ---------- PQR (docente) ----------
  // Reutiliza subirPqrArchivo() y filaPqrPropia() (definidos en el módulo
  // PQR del panel Estudiante) para no duplicar la lógica de subida de PDF.
  // async: 'pqr' vía MySQL.
  async function renderPqrDocente() {
    const doc = currentDocente || {};
    const propias = [...(await Store.list('pqr'))].filter(p => p.solicitante === doc.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-t-pqr').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Enviar una nueva solicitud</p>
        <p class="text-xs text-slate2 mb-4">Adjunta tu petición, queja o reclamo como archivo PDF. Quedará en estado <span class="font-semibold text-ink">Pendiente</span> hasta que el administrador lo descargue.</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Tipo</label>
            <select id="pqr_t_tipo" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado">
              <option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asunto</label>
            <input id="pqr_t_asunto" type="text" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
          </div>
        </div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Archivo PDF</label>
        <input id="pqr_t_archivo" type="file" accept=".pdf,application/pdf" class="w-full rounded-xl border border-morado/25 bg-morado/5 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-morado/15 file:text-morado file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-morado/30 focus:border-morado" />
        <button onclick="enviarPqrDocente()" class="mt-4 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Mis solicitudes</p>
          <div class="relative">
            <input data-table="table-docente-pqr" oninput="TableManager.filter('table-docente-pqr', this.value)" type="text" placeholder="Buscar solicitud..." class="rounded-xl border border-turquesa/30 bg-turquesa/5 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-turquesa/30 focus:border-turquesa transition" />
            <svg class="w-3.5 h-3.5 text-turquesa absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-docente-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4" data-no-sort="true">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-docente-pqr');
  }

  async function enviarPqrDocente() {
    const doc = currentDocente || {};
    const ok = await subirPqrArchivo({ tipoId: 'pqr_t_tipo', asuntoId: 'pqr_t_asunto', fileId: 'pqr_t_archivo', solicitante: doc.nombre, remitenteRol: 'Docente' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrDocente();
  }

  /**
   * Panel Estudiante — módulos y seguimiento académico.
   */

  const PANEL_COLOR_ESTUDIANTE = '#D4AF37';

  const MENSAJES_MOTIVACIONALES = [
    'Cada tema que dominas hoy es un paso más cerca de tu meta. ¡Vas muy bien!',
    'Los errores no son fracasos, son la evidencia de que estás intentando aprender algo nuevo.',
    'Tu constancia de hoy es el resultado que vas a celebrar mañana.',
    'No compares tu proceso con el de otros: compáralo con el tuyo de la semana pasada.',
    'Un pequeño avance diario, sostenido en el tiempo, construye grandes resultados.',
    'Pregunta, participa y equivócate: así es como se aprende de verdad.',
    'Tu esfuerzo de hoy en el Training de 100 a 1000+ ya está marcando la diferencia.',
  ];

  const INSIGNIAS_CATALOGO = [
    { nombre: 'Primeros pasos', descripcion: 'Completaste tu primera semana en la plataforma.', color: '#1FC8C0' },
    { nombre: 'Asistencia perfecta', descripcion: 'Sin fallas durante un módulo completo.', color: '#F5A623' },
    { nombre: 'Mente analítica', descripcion: 'Obtuviste una nota sobresaliente en una evaluación.', color: '#8B5CF6' },
    { nombre: 'Participación activa', descripcion: 'Respondiste todas las encuestas de satisfacción disponibles.', color: '#EC4899' },
    { nombre: 'Ruta cumplida', descripcion: 'Completaste una ruta de aprendizaje sugerida por la IA.', color: '#F0455C' },
    { nombre: 'Colaborador A+', descripcion: 'Participaste en una reunión virtual institucional.', color: '#9A5B3F' },
  ];

  function estudianteNombre() {
    return (currentEstudiante && currentEstudiante.nombre) || '';
  }

  // async: 'modulos' vía MySQL.
  async function estudianteModulo() {
    // El módulo activo del estudiante se deriva de su cohorte asignada.
    const doc = currentEstudiante || {};
    const modulos = await Store.list('modulos');
    return modulos.find(m => m.nombre === doc.cohorte) || null;
  }

  // async porque hace await de seedIfEmpty() (que sí toca 'usuarios',
  // migrada a MySQL) — submitLogin ya la llama con await.
  async function initEstudiante() {
    await seedIfEmpty();
    const nombre = estudianteNombre();
    const msg = MENSAJES_MOTIVACIONALES[Math.abs(hashCode(nombre + new Date().toDateString())) % MENSAJES_MOTIVACIONALES.length];
    const box = document.getElementById('mensajeMotivacional');
    document.getElementById('mensajeMotivacionalTexto').textContent = msg;
    box.classList.remove('hidden');
    await updateMemorandosBadge();
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }

  let panelActivoEstudiante = null;
  async function showPanelEstudiante(panel) {
    const tab = document.querySelector('.panel-tab-s[data-spanel="' + panel + '"]');
    if (tab && tab.classList.contains('hidden')) return;
    if (!(await permisoUsuarioSobrePanel(currentEstudiante, 'estudiante.' + panel)).ver) return;

    // Ocultar de inmediato todos los demás paneles de estudiante y desmarcar tabs
    document.querySelectorAll('.panel-content-s').forEach(p => {
      if (p.id !== 'panel-s-' + panel) p.classList.add('hidden');
    });
    document.querySelectorAll('.panel-tab-s').forEach(t => {
      if (t.dataset.spanel !== panel) {
        t.classList.remove('font-semibold', 'is-active');
        t.style.borderLeftColor = '';
        t.style.background = '';
        t.style.color = '';
      }
    });

    const content = document.getElementById('panel-s-' + panel);
    if (content) content.classList.remove('hidden');
    if (tab) {
      tab.classList.add('font-semibold', 'is-active');
      tab.style.borderLeftColor = '';
      tab.style.background = '';
      tab.style.color = '';
    }
    panelActivoEstudiante = panel;

    const mount = document.getElementById('mount-s-' + panel);
    if (mount && (!mount.innerHTML.trim() || mount.innerHTML.includes('No se pudo cargar el módulo'))) {
      mount.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-12 text-center flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-[#F5A623]/25 border-t-[#F5A623] rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-slate2">Cargando...</p>
      </div>`;
    }

    if (RENDERERS_ESTUDIANTE[panel]) {
      try {
        await RENDERERS_ESTUDIANTE[panel]();
        initTablesEnPanel('panel-s-' + panel);
      } catch (err) {
        console.error('[showPanelEstudiante] Error al cargar panel "' + panel + '":', err);
        if (mount) {
          mount.innerHTML = `<div class="bg-white rounded-2xl border border-coral/20 shadow-soft p-10 text-center flex flex-col items-center justify-center gap-3">
            <div class="w-10 h-10 rounded-full bg-coral/10 text-coral flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <p class="text-sm font-bold text-ink">No se pudo cargar el módulo</p>
            <p class="text-xs text-slate2 max-w-sm">${escapeHtml(err.message || 'Error inesperado al renderizar')}</p>
            <button onclick="showPanelEstudiante('${panel}')" class="mt-2 px-4 py-1.5 rounded-full bg-morado text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer">Reintentar</button>
          </div>`;
        }
      }
    }
  }

  // ---------- RESUMEN ----------
  // async: 'modulos' vía MySQL.
  async function renderResumenEstudiante() {
    const nombre = estudianteNombre();
    const est = currentEstudiante || {};
    const mod = await estudianteModulo();
    const asistenciaReg = (await Store.list('asistencia')).filter(a => a.estudiante === nombre);
    const presentes = asistenciaReg.filter(a => a.estado === 'Presente').length;
    const pctAsistencia = asistenciaReg.length ? Math.round((presentes / asistenciaReg.length) * 100) : 100;
    const agenda = [...(await Store.list('agenda_estudiante'))].filter(a => a.estudiante === nombre)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).slice(0, 3);

    // Promedio real: misma fuente que Calificaciones/Semáforo/Historial
    // Trainee, no la entidad genérica "calificaciones" (nunca se llena).
    const resultado = est.cohorte ? await promedioGeneralEstudianteCohorte(nombre, est.cohorte, null) : null;
    const promedio = resultado ? resultado.promedio.toFixed(1) : '—';

    const agendaRows = agenda.map(a => `
      <div class="flex items-center justify-between py-3 px-4 border-b border-gray-50 last:border-0">
        <div>
          <p class="text-sm font-semibold text-ink">${escapeHtml(a.titulo)}</p>
          <p class="text-xs text-slate2">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}${a.hora ? ' · ' + escapeHtml(a.hora) : ''}</p>
        </div>
      </div>`).join('');

    const iniciales = escapeHtml((nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = est.fotoUrl
      ? `<img src="${escapeHtml(est.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(est.fotoUrl)}', '${escapeHtml(nombre || '')}', 'Estudiante')" class="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white/30 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-white/50" title="Clic para ampliar foto" />`
      : `<div class="w-14 h-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0 bg-white/15 border-2 border-white/30">${iniciales}</div>`;

    document.getElementById('mount-s-resumen').innerHTML = `
      <div class="dash-hero p-6 sm:p-8 mb-6" style="--hero-gradient:linear-gradient(120deg,#7C3AED 0%,#8B5CF6 50%,#EC4899 100%)">
        <div class="flex items-center gap-4">
          ${avatarHtml}
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Panel estudiante</p>
            <h2 class="font-display text-xl sm:text-2xl font-bold text-white truncate">${escapeHtml(nombre || 'Estudiante')}</h2>
            <p class="text-sm text-white/80 truncate">${mod ? escapeHtml(mod.modulo) + ' · ' + escapeHtml(mod.nombre) : 'Sin módulo asignado'}</p>
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="dash-stat-card flex items-center gap-4" style="--brand:#1FC8C0">
          <div class="relative shrink-0">
            ${anilloProgreso(pctAsistencia, pctAsistencia >= 90 ? '#1FC8C0' : pctAsistencia >= 75 ? '#F5A623' : '#F0455C', 64, 6)}
            <div class="absolute inset-0 grid place-items-center">
              <span class="font-display text-sm font-bold text-ink">${pctAsistencia}%</span>
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Asistencia</p>
            <p class="text-xs text-slate2 mt-1">${asistenciaReg.length} registro${asistenciaReg.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div class="dash-stat-card" style="--brand:#F5A623">
          <div class="dash-stat-icon mb-4" style="background:#F5A62314;color:#F5A623"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0H6a1 1 0 01-1-1V6a2 2 0 012-2h10a2 2 0 012 2v10a1 1 0 01-1 1h-2"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Promedio</p>
          <p class="font-display text-3xl font-bold text-ink mt-1 leading-none">${promedio}</p>
          <!-- CORREGIDO: decía "Sobre 5.0" pero el sistema califica sobre 10
               (ver calcularNotaFinal()/calificacionCualitativa()). -->
          <p class="text-xs text-slate2 mt-2">Sobre 10.0</p>
        </div>
        <div class="dash-stat-card" style="--brand:#8B5CF6">
          <div class="dash-stat-icon mb-4" style="background:#8B5CF614;color:#8B5CF6"><svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg></div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate2">Módulo activo</p>
          <p class="font-display text-lg font-bold text-ink mt-1 leading-tight truncate">${mod ? escapeHtml(mod.modulo) : 'Sin asignar'}</p>
          <p class="text-xs text-slate2 mt-2 truncate">${mod ? escapeHtml(mod.nombre) : ''}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="admin-panel-card p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Próximo en tu agenda</p>
          ${agendaRows || '<p class="text-sm text-slate2 text-center py-4">No tienes eventos próximos en tu agenda personal.</p>'}
        </div>
        <div class="admin-panel-card p-6">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Accesos rápidos</p>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="showPanelEstudiante('asistencia')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-turquesa hover:bg-turquesa/5 transition"><p class="text-sm font-semibold text-ink">Registrar asistencia</p><p class="text-xs text-slate2 mt-0.5">Escanea el QR de hoy</p></button>
            <button onclick="showPanelEstudiante('pensum')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-morado hover:bg-morado/5 transition"><p class="text-sm font-semibold text-ink">Ver pensum</p><p class="text-xs text-slate2 mt-0.5">Temas de tu módulo</p></button>
            <button onclick="showPanelEstudiante('calificaciones')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-oro hover:bg-oro/5 transition"><p class="text-sm font-semibold text-ink">Mis calificaciones</p><p class="text-xs text-slate2 mt-0.5">Por materia y mes</p></button>
            <button onclick="showPanelEstudiante('memorandos')" class="text-left rounded-xl border border-gray-100 p-4 hover:border-coral hover:bg-coral/5 transition"><p class="text-sm font-semibold text-ink">Memorandos</p><p class="text-xs text-slate2 mt-0.5">Comunicaciones internas</p></button>
          </div>
        </div>
      </div>`;
  }

  // ---------- PERFIL ----------
  function renderPerfilEstudiante() {
    const doc = currentEstudiante || {};
    const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = doc.fotoUrl
      ? `<img src="${escapeHtml(doc.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(doc.fotoUrl)}', '${escapeHtml(doc.nombre || '')}', 'Estudiante')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-amber-400/50 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    document.getElementById('mount-s-perfil').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 sm:p-8 max-w-2xl">
        <div class="flex items-center gap-5 mb-6">
          ${avatarHtml}
          <div>
            <p class="text-base font-extrabold text-ink">${escapeHtml(doc.nombre || '')}</p>
            <p class="text-sm text-slate2">${escapeHtml(doc.cohorte || '')}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <label class="text-xs font-semibold text-morado hover:underline cursor-pointer">
                Cambiar foto
                <input id="perfil_foto_input" type="file" accept="image/*" class="hidden" onchange="subirFotoPerfilEstudiante(this)" />
              </label>
              ${doc.fotoUrl ? `<button onclick="quitarFotoPerfilEstudiante()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>` : ''}
            </div>
            <p class="text-[11px] text-slate2 mt-1">Foto opcional · JPG o PNG, máx. 2 MB</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Nombre completo</label>
            <input id="perfil_nombre" type="text" value="${escapeHtml(doc.nombre || '')}" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Correo electrónico</label>
            <input type="email" value="${escapeHtml(doc.email || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Cohorte</label>
            <input type="text" value="${escapeHtml(doc.cohorte || '')}" disabled class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 text-slate2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
            ${statusPill(doc.estado || 'Activo', ESTADO_COLORS)}
          </div>
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate2 mb-1.5">Descripción breve</label>
          <textarea id="perfil_descripcion" rows="3" maxlength="280" placeholder="Cuéntale algo breve sobre ti a tus profesores y compañeros (opcional)" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30 resize-none">${escapeHtml(doc.descripcion || '')}</textarea>
          <p class="text-[11px] text-slate2 mt-1">Opcional · máx. 280 caracteres</p>
        </div>
        <div class="border-t border-gray-100 pt-6">
          <p class="text-sm font-bold text-ink mb-3">Cambiar contraseña</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <input id="perfil_pass1" type="text" placeholder="Nueva contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
            <input id="perfil_pass2" type="text" placeholder="Confirmar contraseña" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
        </div>
        <button onclick="guardarPerfilEstudiante()" class="mt-6 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Guardar cambios</button>
      </div>`;
    habilitarEnterEnFormulario('mount-s-perfil', null, false);
  }

  // async: 'usuarios' vía MySQL.
  async function actualizarUsuarioEstudianteActual(cambios) {
    const usuarios = (await Store.list('usuarios')).map(u => u.id === currentEstudiante.id ? { ...u, ...cambios } : u);
    await Store.set('usuarios', usuarios);
    currentEstudiante = { ...currentEstudiante, ...cambios };
  }

  // CORREGIDO (2): mismo bug que en Docente — ver el comentario en
  // actualizarAvatarDocenteEnDom()/subirFotoPerfilDocente(). Al subir o
  // quitar la foto, ya no se reconstruye todo el formulario (eso borraba
  // la descripción que el usuario tuviera escrita y sin guardar); solo
  // se actualiza el avatar y el botón "Quitar foto" en el DOM.
  function actualizarAvatarEstudianteEnDom(fotoUrl) {
    const cont = document.getElementById('mount-s-perfil');
    if (!cont) return;
    const avatarActual = cont.querySelector('img[alt="Foto de perfil"], div.rounded-full.grid');
    if (avatarActual) {
      if (fotoUrl) {
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.alt = 'Foto de perfil';
        img.className = avatarActual.className.includes('w-20') ? avatarActual.className : 'w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100';
        avatarActual.replaceWith(img);
      } else if (avatarActual.tagName === 'IMG') {
        const doc = currentEstudiante || {};
        const iniciales = escapeHtml((doc.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
        const div = document.createElement('div');
        div.className = 'w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0';
        div.style = 'background:linear-gradient(135deg,#1FC8C0,#8B5CF6)';
        div.textContent = iniciales;
        avatarActual.replaceWith(div);
      }
    }
    const btnQuitar = cont.querySelector('button[onclick="quitarFotoPerfilEstudiante()"]');
    if (fotoUrl && !btnQuitar) {
      const label = cont.querySelector('label.cursor-pointer');
      if (label) label.insertAdjacentHTML('afterend', ' <button onclick="quitarFotoPerfilEstudiante()" class="text-xs font-semibold text-coral hover:underline">Quitar foto</button>');
    } else if (!fotoUrl && btnQuitar) {
      btnQuitar.remove();
    }
  }

  function subirFotoPerfilEstudiante(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('El archivo debe ser una imagen', 'err'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La imagen no debe superar 2 MB', 'err'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const resultado = await Store.actualizarPerfilPropio({ fotoUrl: reader.result });
      currentEstudiante = { ...currentEstudiante, fotoUrl: reader.result };
      toast(resultado.remoto ? 'Foto de perfil actualizada' : 'Foto guardada solo en este navegador (sin conexión con el servidor)', resultado.remoto ? 'ok' : 'err');
      actualizarAvatarEstudianteEnDom(reader.result);
    };
    reader.onerror = () => toast('No se pudo leer la imagen', 'err');
    reader.readAsDataURL(file);
  }

  async function quitarFotoPerfilEstudiante() {
    const resultado = await Store.actualizarPerfilPropio({ fotoUrl: '' });
    currentEstudiante = { ...currentEstudiante, fotoUrl: '' };
    toast(resultado.remoto ? 'Foto de perfil eliminada' : 'No se pudo eliminar la foto en el servidor', resultado.remoto ? 'ok' : 'err');
    actualizarAvatarEstudianteEnDom('');
  }

  async function guardarPerfilEstudiante() {
    const nombre = document.getElementById('perfil_nombre').value.trim();
    const descripcion = document.getElementById('perfil_descripcion').value.trim();
    const p1 = document.getElementById('perfil_pass1').value;
    const p2 = document.getElementById('perfil_pass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
      if (p1 !== p2) { toast('Las contraseñas no coinciden', 'err'); return; }
    }
    const cambios = {};
    if (nombre) cambios.nombre = nombre;
    cambios.descripcion = descripcion; // opcional: puede quedar vacía
    // CORREGIDO: mismo bug que guardarPerfilDocente() — la nueva
    // contraseña se validaba pero nunca se guardaba de verdad.
    if (p1) cambios.password = p1;
    // CORREGIDO: usaba actualizarUsuarioEstudianteActual() ->
    // Store.set('usuarios', ...), que exige rol Superadmin/Coordinador
    // en el backend. Ver el mismo comentario en guardarPerfilDocente().
    const resultado = await Store.actualizarPerfilPropio(cambios);
    currentEstudiante = { ...currentEstudiante, ...cambios };
    delete currentEstudiante.password;
    toast(resultado.remoto ? 'Perfil actualizado correctamente' : 'No se pudo guardar en el servidor, intenta de nuevo', resultado.remoto ? 'ok' : 'err');
    renderPerfilEstudiante();
  }

  // ---------- VER PERFIL DE OTRA PERSONA (modal de solo lectura) ----------
  // Usado por el estudiante para ver el perfil de sus profesores asignados,
  // y por el docente para ver el perfil de sus estudiantes.
  // async: 'usuarios' vía MySQL.
  async function abrirPerfilPersonaPorNombreYRol(nombre, rol) {
    if (!nombre) return;
    const objetivo = nombre.trim().toLowerCase();
    const usuarios = await Store.list('usuarios');
    const usuario = usuarios.find(u => u.rol === rol && u.nombre && u.nombre.trim().toLowerCase() === objetivo);
    if (!usuario) { toast('No se encontró el perfil de ' + nombre, 'err'); return; }
    await abrirPerfilPersona(usuario.id);
  }

  async function abrirPerfilPersona(usuarioId) {
    const usuario = (await Store.list('usuarios')).find(u => u.id === usuarioId);
    if (!usuario) { toast('No se encontró ese perfil', 'err'); return; }

    const iniciales = escapeHtml((usuario.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join(''));
    const avatarHtml = usuario.fotoUrl
      ? `<img src="${escapeHtml(usuario.fotoUrl)}" alt="Foto de perfil" onclick="expandirFotoPerfil('${escapeHtml(usuario.fotoUrl)}', '${escapeHtml(usuario.nombre || '')}', '${escapeHtml(usuario.rol || '')}')" class="w-20 h-20 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:scale-105 transition hover:ring-2 hover:ring-morado/40 shadow-sm" title="Clic para ampliar foto" />`
      : `<div class="w-20 h-20 rounded-full grid place-items-center text-2xl font-extrabold text-white shrink-0" style="background:linear-gradient(135deg,#1FC8C0,#8B5CF6)">${iniciales}</div>`;

    const esDocente = usuario.rol === 'Docente';
    const materiasDocente = esDocente ? (await Store.list('pensum')).filter(p => p.docente === usuario.nombre) : [];
    const infoExtra = esDocente
      ? `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Rol</label>
              <p class="text-sm text-ink font-semibold">Docente</p>
            </div>
            ${materiasDocente.length ? `
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Materias que dicta</label>
              <p class="text-sm text-ink">${escapeHtml([...new Set(materiasDocente.map(m => m.modulo))].join(', '))}</p>
            </div>` : ''}`
      : `
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Cohorte</label>
              <p class="text-sm text-ink">${escapeHtml(usuario.cohorte || '—')}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate2 mb-1.5">Estado</label>
              ${statusPill(usuario.estado || 'Activo', ESTADO_COLORS)}
            </div>`;

    document.getElementById('perfilPersonaContenido').innerHTML = `
      <div class="flex items-center gap-5 mb-6">
        ${avatarHtml}
        <div>
          <p class="text-base font-extrabold text-ink">${escapeHtml(usuario.nombre || '')}</p>
          <p class="text-sm text-slate2">${escapeHtml(usuario.email || '')}</p>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">${infoExtra}</div>
      ${usuario.descripcion ? `
      <div class="border-t border-gray-100 pt-5">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-2">Descripción</p>
        <p class="text-sm text-ink leading-relaxed">${escapeHtml(usuario.descripcion)}</p>
      </div>` : `
      <div class="border-t border-gray-100 pt-5">
        <p class="text-sm text-slate2 italic">Esta persona aún no ha agregado una descripción.</p>
      </div>`}
    `;
    document.getElementById('perfilPersonaModal').classList.remove('hidden');
  }

  function cerrarPerfilPersonaModal() {
    document.getElementById('perfilPersonaModal').classList.add('hidden');
  }

  // Devuelve un <button> clicable con el nombre de una persona, que abre su
  // perfil de solo lectura. Se usa para reemplazar texto plano de nombres.
  function nombrePersonaClicable(nombre, rol) {
    if (!nombre) return '—';
    return `<button type="button" onclick="abrirPerfilPersonaPorNombreYRol('${escapeHtml(nombre).replace(/'/g, "\\'")}', '${rol}')" class="hover:underline hover:text-morado transition text-left">${escapeHtml(nombre)}</button>`;
  }

  // ---------- ASISTENCIA (QR) ----------
  let asistenciaEstudianteTimer = null;

  // async: docenteEstudiantesDeCohorte ahora es async.
  async function renderAsistenciaEstudiante() {
    if (asistenciaEstudianteTimer) clearInterval(asistenciaEstudianteTimer);

    const nombre = estudianteNombre();
    const mod = await estudianteModulo();
    const rawRegistros = [...(await Store.list('asistencia', { forceRefresh: true }))].filter(a => a.estudiante === nombre);
    const prioridad = { Presente: 1, Tarde: 2, Justificada: 3, Falla: 4 };
    const porSesion = new Map();
    rawRegistros.forEach(r => {
      const key = r.sesionId ? ('ses_' + r.sesionId) : ('date_' + r.fecha + '_' + (r.materia || r.modulo));
      if (!porSesion.has(key)) {
        porSesion.set(key, r);
      } else {
        const actual = porSesion.get(key);
        if ((prioridad[r.estado] || 99) < (prioridad[actual.estado] || 99)) {
          porSesion.set(key, r);
        }
      }
    });
    const registros = Array.from(porSesion.values()).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totales = { Presente: 0, Tarde: 0, Falla: 0 };
    registros.forEach(r => { if (totales[r.estado] !== undefined) totales[r.estado]++; });
    const pct = registros.length ? Math.round((totales.Presente / registros.length) * 100) : 100;

    const rows = registros.map(r => `
      <tr data-search="${escapeHtml((r.fecha + ' ' + (r.modulo || '') + ' ' + r.estado).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-ink">${fmtDate(r.fecha)}</td>
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(r.modulo)}</td>
        <td class="py-3 px-4">${statusPill(r.estado, { Presente: ESTADO_COLORS['Activo'], Tarde: ESTADO_COLORS['En proceso'] || ESTADO_COLORS['Planeada'], Falla: ESTADO_COLORS['Abierto'] })}${r.automatico ? '<span class="text-[10px] text-slate2 ml-2">automático</span>' : ''}</td>
      </tr>`).join('');

    let tarjetasSesiones;
    if (!mod) {
      tarjetasSesiones = `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 text-center">
          <p class="text-sm text-slate2">No tienes un módulo activo asignado.</p>
        </div>`;
    } else {
      const hoy = fechaHoyLocal();
      const sesionesHoy = (await Store.list('sesiones_asistencia')).filter(s => s.cohorte === mod.nombre && s.fecha === hoy);

      if (!sesionesHoy.length) {
        tarjetasSesiones = `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
            <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 grid place-items-center shrink-0">
              <svg class="w-14 h-14 text-slate2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h2M19 19h1"/></svg>
            </div>
            <div class="flex-1 text-center sm:text-left">
              <p class="text-sm font-bold text-ink">Código de asistencia de hoy</p>
              <p class="text-xs text-slate2 mt-1">Módulo: ${escapeHtml(mod.modulo)}</p>
              <p class="text-sm text-slate2 mt-3">Ninguno de tus docentes ha habilitado su código de asistencia todavía. Cada materia se activa por separado.</p>
            </div>
          </div>`;
      } else {
        // Se resuelve una vez, antes del .map() síncrono de abajo (que no
        // puede usar await dentro): docenteEstudiantesDeCohorte ahora es
        // async (usa 'usuarios' vía MySQL). Como es el mismo mod.nombre
        // para todas las sesiones del día, basta una sola llamada.
        const estudiantesCohorte = await docenteEstudiantesDeCohorte(mod.nombre);
        sesionesHoy.forEach(sesion => sincronizarAusentesSesion(sesion, estudiantesCohorte));
        tarjetasSesiones = sesionesHoy.map(sesion => {
          const materiaLabel = sesion.materia || sesion.modulo;
          const yaReg = registros.find(r => r.sesionId === sesion.id);
          const mins = minutosTranscurridos(sesion.horaInicio);

          // Si el estudiante ya confirmó su asistencia y quedó en Presente o Tarde
          if (yaReg && (yaReg.estado === 'Presente' || yaReg.estado === 'Tarde')) {
            const color = yaReg.estado === 'Presente' ? '#0f8f89' : '#b5790f';
            const texto = yaReg.estado === 'Presente' ? 'Llegaste puntual' : 'Llegaste tarde';
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 grid place-items-center shrink-0" style="border-color:${color}">
                  <p class="text-sm font-extrabold text-center px-2" style="color:${color}">${texto}</p>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <p class="text-xs text-slate2 mt-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')} · ${fmtDate(sesion.fecha)}</p>
                  <div class="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:${color}"><svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ${yaReg.estado}</span>
                  </div>
                </div>
              </div>`;
          }

          // Si ya expiró la ventana de tolerancia (+50 min) y quedó con Falla definitiva
          if (mins > VENTANA_TARDE_MIN) {
            return `
              <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
                <div class="w-28 h-28 rounded-2xl border-2 border-coral grid place-items-center shrink-0">
                  <svg class="w-11 h-11 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)} — la ventana ya cerró</p>
                  <p class="text-xs text-slate2 mt-1">Quedaste registrado como ausente (Falla definitiva). Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                  <div class="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-coral/15 text-coral border border-coral/20">Falla</span>
                  </div>
                </div>
              </div>`;
          }

          // Ventana de asistencia activa (<= 50 min): la asistencia está en 'Falla' por defecto
          const ventana = estadoVentanaSesion(sesion);
          return `
            <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-4 flex flex-col sm:flex-row items-center gap-6">
              <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-coral/50 bg-coral/5 grid place-items-center shrink-0">
                <div class="text-center p-2">
                  <span class="text-xs font-extrabold text-coral block">FALLA</span>
                  <span class="text-[10px] text-slate2 block">(por defecto)</span>
                </div>
              </div>
              <div class="flex-1 text-center sm:text-left">
                <div class="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
                  <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)}</p>
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-bold bg-coral/10 text-coral border border-coral/20">Estado actual: Pérdida</span>
                </div>
                <p class="text-xs text-slate2 mt-0.5 mb-1">Docente: ${escapeHtml(sesion.iniciadaPor || '—')}</p>
                <p class="text-xs font-bold mb-2" style="color:${ventana.color}">${ventana.texto}</p>
                <div class="p-3 bg-morado/5 rounded-xl border border-morado/15 max-w-md">
                  <p class="text-xs text-morado font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                    <svg class="w-4 h-4 shrink-0 text-morado" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                    Asistencia 100% automatizada vía QR
                  </p>
                  <p class="text-[11px] text-slate2 mt-1">Escanea el código QR proyectado en clase o abre el enlace compartido para registrar tu asistencia automáticamente en el sistema.</p>
                </div>
              </div>
            </div>`;
        }).join('');
      }
    }

    document.getElementById('mount-s-asistencia').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">% Asistencia</p><p class="text-2xl font-extrabold text-ink mt-1">${pct}%</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Llegadas tarde</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Tarde}</p></div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5"><p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Fallas</p><p class="text-2xl font-extrabold text-ink mt-1">${totales.Falla}</p></div>
      </div>
      ${tarjetasSesiones}
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Historial de asistencia</p>
          <div class="relative">
            <input data-table="table-estudiante-asistencia" oninput="TableManager.filter('table-estudiante-asistencia', this.value)" type="text" placeholder="Buscar fecha o materia..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-asistencia" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Fecha</th><th class="py-3 px-4">Materia</th><th class="py-3 px-4">Estado</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no tienes registros de asistencia.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-asistencia');

    asistenciaEstudianteTimer = setInterval(() => {
      const panel = document.getElementById('panel-s-asistencia');
      if (panel && !panel.classList.contains('hidden')) renderAsistenciaEstudiante();
      else clearInterval(asistenciaEstudianteTimer);
    }, 15000);
  }

  // async: 'modulos', 'sesiones_asistencia' y 'asistencia' vía MySQL.
  async function escanearAsistencia(sesionId) {
    const nombre = estudianteNombre();
    const mod = await estudianteModulo();
    if (!mod) { toast('No tienes un módulo activo asignado', 'err'); return; }
    const hoy = fechaHoyLocal();
    const sesion = (await Store.list('sesiones_asistencia')).find(s => s.id === sesionId && s.cohorte === mod.nombre && s.fecha === hoy);
    if (!sesion) { toast('Esa sesión ya no está disponible', 'err'); renderAsistenciaEstudiante(); return; }
    const registros = await Store.list('asistencia');
    const registroExistente = registros.find(r => r.estudiante === nombre && r.sesionId === sesion.id);
    if (registroExistente && (registroExistente.estado === 'Presente' || registroExistente.estado === 'Tarde')) {
      toast('Ya registraste tu asistencia en esta materia hoy: ' + registroExistente.estado, 'info');
      renderAsistenciaEstudiante();
      return;
    }
    const mins = minutosTranscurridos(sesion.horaInicio);
    if (mins > VENTANA_TARDE_MIN) {
      toast('La ventana de asistencia ya cerró', 'err'); renderAsistenciaEstudiante(); return;
    }
    const input = document.getElementById('codigo_qr_estudiante_' + sesionId);
    const codigo = (input ? input.value : '').trim().toUpperCase();
    if (!codigo) { toast('Ingresa el código que muestra tu docente', 'err'); return; }
    if (codigo !== sesion.codigo) { toast('El código no coincide con el de la sesión de hoy', 'err'); return; }

    const estado = estadoPorTiempo(mins);
    if (registroExistente) {
      registroExistente.estado = estado;
      registroExistente.automatico = false;
      registroExistente.materia = sesion.materia || sesion.modulo;
    } else {
      registros.push({
        id: uid('as'),
        estudiante: nombre,
        modulo: sesion.modulo,
        docente: sesion.iniciadaPor,
        materia: sesion.materia || sesion.modulo,
        fecha: sesion.fecha,
        estado,
        sesionId: sesion.id,
        automatico: false
      });
    }
    await Store.set('asistencia', registros);
    const msg = estado === 'Presente' ? 'Asistencia registrada: llegaste puntual.' : 'Asistencia registrada: llegaste tarde.';
    toast(msg, 'ok');
    renderAsistenciaEstudiante();
  }

  // ---------- MIS MATERIAS Y HORARIO ----------
  // Mes seleccionado por el estudiante para ver su horario (memoria de sesión)
  let estudianteHorarioMes = null;

  // ---------- Calificaciones (estudiante) — solo lectura ----------
  // Muestra, por cada docente que le sube notas en su cohorte: cuántas notas
  // hay, el porcentaje (peso) de cada una, la nota definitiva y el puesto
  // que ocupa entre sus compañeros de esa misma cohorte. Nada más.
  // async: docenteEstudiantesDeCohorte ahora es async.
  async function renderCalificacionesEstudiante() {
    const nombre = estudianteNombre();
    const mod = await estudianteModulo();

    if (!mod) {
      document.getElementById('mount-s-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Aún no tienes una cohorte activa asignada, así que todavía no hay calificaciones para mostrar.</p>
      </div>`;
      return;
    }

    // Un bloque por cada registro Docente+Cohorte+MES real —misma separación
    // que ya usa el docente al calificar (ver renderCalificacionesDocente).
    // El mes más reciente de cada docente es el periodo activo; los
    // anteriores quedan visibles como historial de solo lectura, igual que
    // ya ocurre en el panel del docente.
    const registros = [...(await Store.list('notas_modulos'))]
      .filter(r => r.cohorte === mod.nombre && (r.criterios || []).length)
      .sort((a, b) => (b.mes || '').localeCompare(a.mes || '') || (a.docente || '').localeCompare(b.docente || ''));

    if (!registros.length) {
      document.getElementById('mount-s-calificaciones').innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 sm:p-10 text-center">
        <p class="text-sm text-slate2">Tu(s) docente(s) aún no han registrado notas en <strong class="text-ink">${escapeHtml(mod.nombre)}</strong>.</p>
      </div>`;
      return;
    }

    const compañeros = await docenteEstudiantesDeCohorte(mod.nombre);

    const esActualPorRegistro = await Promise.all(registros.map(rec => mesActualParaDocenteCohorte(rec.docente, mod.nombre)));
    const slotsPorRegistro = await Promise.all(registros.map(rec => getSlotsDocente(rec.docente)));

    const bloques = registros.map((rec, i) => {
      const esActual = rec.mes === esActualPorRegistro[i];
      const materias = [...new Set(slotsPorRegistro[i].filter(s => s.cohorte === mod.nombre && s.mes === rec.mes).map(s => s.materia))];
      const materiaLabel = materias.length ? materias.join(', ') : mod.modulo;

      const valores = (rec.valores && rec.valores[nombre]) || {};
      const filasNotas = (rec.criterios || []).map(c => {
        const v = valores[c.id];
        const tieneValor = v !== undefined && v !== null && v !== '';
        return `<tr class="border-b border-gray-50 last:border-0">
          <td class="py-2.5 px-4 text-sm font-semibold text-ink">${escapeHtml(c.nombre)}</td>
          <td class="py-2.5 px-4 text-sm text-slate2">${c.peso}%</td>
          <td class="py-2.5 px-4 text-sm font-bold text-right" style="color:${tieneValor ? '#14181F' : '#5B6472'}">${tieneValor ? Number(v).toFixed(1) : 'Pendiente'}</td>
        </tr>`;
      }).join('');

      const resultado = calcularNotaFinal(rec, nombre);
      const definitiva = resultado && !resultado.pendiente ? resultado.valor : null;

      const ranking = compañeros
        .map(u => {
          const r = calcularNotaFinal(rec, u.nombre);
          return { nombre: u.nombre, valor: r && !r.pendiente ? r.valor : null };
        })
        .filter(x => x.valor !== null)
        .sort((a, b) => b.valor - a.valor);
      const puesto = definitiva !== null ? ranking.findIndex(x => x.nombre === nombre) + 1 : null;

      return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden mb-6">
        <div class="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-sm font-bold text-ink">${escapeHtml(materiaLabel)} · ${escapeHtml(mesLabel(rec.mes))}</p>
            <p class="text-xs text-slate2 mt-0.5">Docente: ${nombrePersonaClicable(rec.docente, 'Docente')}</p>
          </div>
          <div class="flex items-center gap-2">
            ${esActual
              ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-turquesa/10 text-turquesa">Periodo actual</span>`
              : `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-slate2">Historial</span>`}
            ${definitiva !== null ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${colorCualitativa(definitiva)}1A;color:${colorCualitativa(definitiva)}">${calificacionCualitativa(definitiva)}</span>` : ''}
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-2.5 px-4">Nota</th><th class="py-2.5 px-4">Porcentaje</th><th class="py-2.5 px-4 text-right">Calificación</th></tr></thead>
            <tbody>${filasNotas || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Este docente aún no ha definido notas de evaluación.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 px-6 py-5 border-t border-gray-100">
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Nota definitiva</p>
            <p class="text-2xl font-extrabold mt-1" style="color:${colorCualitativa(definitiva)}">${definitiva !== null ? definitiva.toFixed(1) : '—'}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate2 uppercase tracking-wide">Puesto en la cohorte</p>
            <p class="text-2xl font-extrabold text-ink mt-1">${puesto !== null ? puesto + ' de ' + ranking.length : '—'}</p>
          </div>
        </div>
      </div>`;
    }).join('');

    document.getElementById('mount-s-calificaciones').innerHTML = `
      <p class="text-xs text-slate2 mb-5">Cada mes y materia que te asignaron tiene su propia hoja de calificación — el periodo más reciente es el actual; los anteriores quedan como historial.</p>
      ${bloques}`;
  }

  // async: 'modulos' vía MySQL.
  async function renderAcademicoEstudiante() {
    const mod = await estudianteModulo();
    const pensumItems = mod ? (await Store.list('pensum')).filter(p => p.modulo === mod.modulo) : [];
    const docentesCohorte = mod ? await docentesDeCohorte(mod.nombre) : [];
    document.getElementById('mount-s-academico').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-xs font-bold uppercase tracking-wide text-slate2 mb-3">Mi cohorte</p>
        ${mod ? `
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <p class="text-lg font-extrabold text-ink">${escapeHtml(mod.nombre)}</p>
            ${statusPill(mod.estado, ESTADO_COLORS)}
          </div>
          <p class="text-sm text-slate2">${escapeHtml(mod.modulo)}</p>
          <p class="text-sm text-slate2 mt-1">${fmtDate(mod.fechaInicio)} — ${fmtDate(mod.fechaFin)}</p>
          <div class="mt-3">
            <p class="text-xs font-semibold text-slate2 mb-1.5">Profesores de mi cohorte</p>
            <div class="flex flex-wrap gap-2">
              ${docentesCohorte.length
                ? docentesCohorte.map(d => `<span class="inline-flex items-center rounded-full bg-morado/10 px-3 py-1 text-sm font-semibold text-morado">${nombrePersonaClicable(d, 'Docente')}</span>`).join('')
                : '<span class="text-sm text-slate2">Sin docentes asignados aún.</span>'}
            </div>
          </div>
        ` : '<p class="text-sm text-slate2">No tienes un módulo activo asignado por el momento.</p>'}
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Temas / horario de tu módulo</p>
          <div class="relative">
            <input data-table="table-estudiante-academico" oninput="TableManager.filter('table-estudiante-academico', this.value)" type="text" placeholder="Buscar tema o docente..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-academico" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4">Docente</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr data-search="${escapeHtml((p.tema + ' ' + (p.docente || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-ink">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm text-slate2">${nombrePersonaClicable(p.docente, 'Docente')}</td>
              </tr>`).join('') || '<tr><td colspan="3" class="text-sm text-slate2 text-center py-6">Aún no hay temas cargados para tu módulo.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      ${await renderHorarioEstudianteBloque(mod)}`;
    TableManager.init('table-estudiante-academico');
  }

  // ---------- Mi horario de clases (estudiante) ----------
  // async: 'horarios' vía MySQL.
  async function renderHorarioEstudianteBloque(mod) {
    if (!mod) return '';
    const registros = (await Store.list('horarios')).filter(h => h.cohorte === mod.nombre);
    if (!registros.length) {
      return `<div class="bg-white rounded-3xl border border-gray-100 shadow-soft p-8 mt-6 text-center">
        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200/60">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <p class="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Mi horario de clases</p>
        <p class="text-sm text-slate2">Tu cohorte aún no tiene un horario publicado por la administración.</p>
      </div>`;
    }
    const meses = registros.map(r => r.mes).sort();
    if (!estudianteHorarioMes || !meses.includes(estudianteHorarioMes)) {
      const hoy = new Date();
      const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
      estudianteHorarioMes = meses.includes(mesActual) ? mesActual : meses[meses.length - 1];
    }
    const registro = registros.find(r => r.mes === estudianteHorarioMes);
    const dias = registro.incluyeSabado ? DIAS_HORARIO : DIAS_HORARIO.slice(0, 5);
    const franjas = franjasActivas(registro);

    const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = diasSemanaNombres[(new Date()).getDay()];

    const columnas = dias.map(dia => {
      const infoCamisa = getInfoCamisaDia(dia, mod.nombre);
      const franjasDelDia = franjas.filter(f => f.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
      const esHoy = dia === diaHoy;

      const tarjetas = franjasDelDia.map(f => `
        <div class="rounded-xl border border-gray-100 p-3 mb-2 shadow-2xs transition hover:shadow-soft" style="border-left: 4px solid ${infoCamisa.franjaBorder}; background: #ffffff;">
          <div class="flex items-center justify-between gap-1 mb-1">
            <p class="text-xs font-bold text-ink leading-snug">${escapeHtml(f.curso || '—')}</p>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-slate2">${horasFranja(f)}h</span>
          </div>
          <p class="text-[11px] text-slate2 mt-1.5 font-medium flex items-center gap-1">
            <svg class="w-3 h-3 text-slate2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>${f.inicio}–${f.fin}</span>
          </p>
          <div class="flex items-center gap-1 text-[11px] text-slate2 mt-1">
            <svg class="w-3 h-3 text-slate2/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span class="truncate">${nombrePersonaClicable(f.docente, 'Docente')}</span>
          </div>
        </div>`).join('');

      return `
        <div class="rounded-2xl p-3 border border-gray-200/70 shadow-2xs flex flex-col ${esHoy ? 'ring-2 ring-amber-400/40' : ''}" style="background:${infoCamisa.franjaBg};">
          <div class="flex flex-col gap-1.5 mb-2.5 pb-2 border-b border-gray-200/60">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1.5">
                ${esHoy ? '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>' : ''}
                <p class="text-xs font-extrabold uppercase tracking-wider text-ink">${dia}</p>
              </div>
              <span class="text-[10px] font-bold text-slate2 bg-white/85 px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">${franjasDelDia.length} clase${franjasDelDia.length === 1 ? '' : 'es'}</span>
            </div>
            <div class="w-full flex">
              ${badgeCamisaDia(dia, mod.nombre)}
            </div>
          </div>
          <div class="flex-1">
            ${tarjetas || '<div class="p-3 text-center rounded-xl bg-white/70 border border-dashed border-gray-200 text-[11px] text-slate2/70 italic">Sin clases</div>'}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden mt-6">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-amber-50/20">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <p class="text-xs font-bold uppercase tracking-wider text-amber-600">Mi horario de clases</p>
            </div>
            <h3 class="text-sm font-extrabold text-ink mt-0.5">${escapeHtml(mod.nombre)} · ${franjas.length} franja${franjas.length === 1 ? '' : 's'}</h3>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate2 font-semibold">Mes:</label>
              <select onchange="onCambiaMesEstudianteHorario(this.value)" class="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                ${meses.map(m => `<option value="${m}" ${m === estudianteHorarioMes ? 'selected' : ''}>${mesLabel(m)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="p-4 sm:p-6 overflow-x-auto">
          <div class="grid gap-3 min-w-[780px]" style="grid-template-columns:repeat(${dias.length}, minmax(160px, 1fr))">
            ${columnas}
          </div>
        </div>
      </div>`;
  }

  function onCambiaMesEstudianteHorario(mes) {
    estudianteHorarioMes = mes;
    renderAcademicoEstudiante();
  }

  // ---------- PENSUM CURRICULAR ----------
  // async: 'modulos' vía MySQL.
  async function renderPensumEstudiante() {
    const mod = await estudianteModulo();
    const pensumItems = [...(await Store.list('pensum'))].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    document.getElementById('mount-s-pensum').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <p class="text-sm font-bold text-ink tracking-tight">Pensum de ${mod ? escapeHtml(mod.modulo) : 'tu módulo'}</p>
            <p class="text-xs text-slate2 mt-0.5">${pensumItems.length} tema${pensumItems.length === 1 ? '' : 's'} en el plan de estudios</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <input data-table="table-estudiante-pensum" oninput="TableManager.filter('table-estudiante-pensum', this.value)" type="text" placeholder="Buscar tema..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
              <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="descargarPensumEstudiante()" class="text-xs font-semibold text-white bg-ink hover:bg-morado transition rounded-full px-4 py-2">Descargar PDF</button>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-pensum" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">#</th><th class="py-3 px-4">Tema</th><th class="py-3 px-4">Intensidad</th><th class="py-3 px-4" data-no-sort="true">Material</th></tr></thead>
            <tbody>${pensumItems.map(p => `
              <tr data-search="${escapeHtml((p.orden + ' ' + p.tema + ' ' + (p.archivoNombre || '')).toLowerCase())}" class="border-b border-gray-50 last:border-0">
                <td class="py-3 px-4 text-sm text-slate2">${p.orden}</td>
                <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(p.tema)}</td>
                <td class="py-3 px-4 text-sm text-slate2">${p.horas} h</td>
                <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verArchivoPensum('${p.id}')" class="text-xs font-semibold text-morado hover:underline inline-flex items-center gap-1">${ICON_CLIP_SVG}${escapeHtml(p.archivoNombre || 'Ver archivo')}</button>` : '<span class="text-xs text-slate2">Sin archivo</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Sin temas registrados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-pensum');
  }

  // async: 'modulos' vía MySQL. window.open() se llama SÍNCRONAMENTE antes
  // de cualquier await, para no activar el bloqueador de popups del
  // navegador (mismo cuidado que en abrirMemorandoCarta).
  async function descargarPensumEstudiante() {
    const win = window.open('', '_blank');
    const mod = await estudianteModulo();
    const pensumItems = [...(await Store.list('pensum'))].filter(p => !mod || p.modulo === mod.modulo).sort((a, b) => a.orden - b.orden);
    win.document.write(`<html><head><title>Pensum - ${escapeHtml(mod ? mod.modulo : '')}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#14181F}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}th{background:#f5f5f5}</style>
      </head><body><h1>Pensum curricular — ${escapeHtml(mod ? mod.modulo : '')}</h1>
      <p>Estudiante: ${escapeHtml(estudianteNombre())}</p>
      <table><thead><tr><th>#</th><th>Tema</th><th>Intensidad</th></tr></thead><tbody>
      ${pensumItems.map(p => `<tr><td>${p.orden}</td><td>${escapeHtml(p.tema)}</td><td>${p.horas} h</td></tr>`).join('')}
      </tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  // ---------- MEMORANDOS (solo lectura, formato carta) ----------
  async function renderMemorandosEstudiante() {
    const doc = currentEstudiante || {};
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      memorandosParaEstudiante(),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    document.getElementById('mount-s-memorandos').innerHTML = `
      <div class="space-y-4">
        ${memos.map(m => {
          const noLeido = !(mapa[m.id] && mapa[m.id][email]);
          return `
          <button onclick="verMemorandoEstudiante('${m.id}')" class="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-soft p-5 hover:border-oro transition">
            <div class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${noLeido ? '#F5A623' : '#5B647233'}"></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3 mb-1">
                  <p class="text-sm ${noLeido ? 'font-bold text-ink' : 'font-semibold text-slate2'}">${escapeHtml(m.titulo)}</p>
                  ${statusPill(m.estado, ESTADO_COLORS)}
                </div>
                <p class="text-xs text-slate2 mb-2">${fmtDate(m.fecha)} · De: Equipo Directivo Fundación A+</p>
                <p class="text-sm text-slate2 flex items-center gap-1">${m.archivoDatos ? `${ICON_CLIP_SVG} ${escapeHtml(m.archivoNombre || 'Documento adjunto')}` : 'Sin archivo adjunto'}</p>
                <p class="text-xs font-semibold text-morado mt-2">Ver memorando en formato de carta →</p>
              </div>
            </div>
          </button>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes memorandos por el momento.</p>'}
      </div>`;
  }

  // Igual que renderMemorandosEstudiante, pero para el panel del Docente
  // (mount-t-memorandos) y usando verMemorandoUsuarioActual (que resuelve
  // solo por el correo real, sin depender de una cohorte).
  async function renderMemorandosDocente() {
    const doc = currentDocente || {};
    const email = (doc.email || '').toLowerCase();
    const [memos, mapaLeidos] = await Promise.all([
      memorandosParaUsuarioActual(),
      Store.get('memorandos_leidos'),
    ]);
    const mapa = mapaLeidos || {};
    document.getElementById('mount-t-memorandos').innerHTML = `
      <div class="space-y-4">
        ${memos.map(m => {
          const noLeido = !(mapa[m.id] && mapa[m.id][email]);
          return `
          <button onclick="verMemorandoUsuarioActual('${m.id}')" class="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-soft p-5 hover:border-oro transition">
            <div class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${noLeido ? '#F5A623' : '#5B647233'}"></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3 mb-1">
                  <p class="text-sm ${noLeido ? 'font-bold text-ink' : 'font-semibold text-slate2'}">${escapeHtml(m.titulo)}</p>
                  ${statusPill(m.estado, ESTADO_COLORS)}
                </div>
                <p class="text-xs text-slate2 mb-2">${fmtDate(m.fecha)} · De: Equipo Directivo Fundación A+</p>
                <p class="text-sm text-slate2 flex items-center gap-1">${m.archivoDatos ? `${ICON_CLIP_SVG} ${escapeHtml(m.archivoNombre || 'Documento adjunto')}` : 'Sin archivo adjunto'}</p>
                <p class="text-xs font-semibold text-morado mt-2">Ver memorando en formato de carta →</p>
              </div>
            </div>
          </button>`;
        }).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes memorandos por el momento.</p>'}
      </div>`;
  }

  // ---------- PQR ----------
  // Helper compartido (Docente y Estudiante): sube una PQR como archivo PDF.
  // Devuelve true si se guardó correctamente.
  // Copia un archivo (ya en Data URL) a la sección "Archivos" de la ficha
  // del estudiante en Historial Trainee — usado SOLO para memorandos
  // dirigidos puntualmente a un estudiante (ver saveModal). Las PQR son
  // privadas y nunca generan copia aquí: no se mezclan con Historial
  // Trainee, que es visible para cualquier admin/coordinador con acceso a
  // ese panel. No aplica el límite de 3MB pensado para subida manual
  // (TRAINEE_ARCHIVO_MAX_BYTES): esta es una copia de algo que ya pasó su
  // propio límite de origen (el de saveModal en Memorandos), no una
  // subida nueva.
  // async: 'usuarios' vía MySQL.
  // CORREGIDO: mismo bug que agregarArchivoTrainee() — usaba Store.set()
  // con el array completo. Ahora usa Store.agregarArchivo() (POST
  // puntual). El campo "origen" ('PQR'/'Memorando') viaja en el mismo
  // body; ver la columna `origen` agregada a trainee_archivos en
  // migracion_trainee_archivos_origen.sql.
  async function copiarArchivoATraineeDeEstudiante(estudianteNombreOEmail, { nombre, tipo, datos, origen }) {
    if (!datos) return;
    const usuarios = await Store.list('usuarios');
    const est = usuarios.find(u =>
      u.rol === 'Estudiante' && (
        u.nombre === estudianteNombreOEmail ||
        (u.email || '').toLowerCase() === String(estudianteNombreOEmail || '').toLowerCase()
      ));
    if (!est) return; // no se pudo resolver a un estudiante real (ej. remitente ya no existe o no es estudiante) — no se guarda nada
    await Store.agregarArchivo({
      estudianteId: est.id,
      nombre: nombre || 'Archivo', tipo: tipo || 'application/pdf', datos,
      fecha: new Date().toISOString().slice(0, 10),
      origen: origen || null, // 'PQR' | 'Memorando' — solo informativo, para distinguir en la UI de dónde vino
    });
  }

  async function subirPqrArchivo({ tipoId, asuntoId, fileId, solicitante, remitenteRol }) {
    const tipo = document.getElementById(tipoId).value;
    const asunto = document.getElementById(asuntoId).value.trim();
    const fileInput = document.getElementById(fileId);
    const file = fileInput.files && fileInput.files[0];
    if (!asunto) { toast('Escribe el asunto de tu solicitud', 'err'); return false; }
    if (!file) { toast('Adjunta el PDF de tu solicitud', 'err'); return false; }
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) { toast('El archivo debe ser un PDF', 'err'); return false; }
    if (file.size > 8 * 1024 * 1024) { toast('El archivo no puede superar 8 MB', 'err'); return false; }

    const archivoDatos = await leerArchivoComoDataURL(file);
    const registros = await Store.list('pqr');
    registros.push({
      id: uid('pq'), tipo, solicitante, remitenteRol, asunto,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'Pendiente', fechaActivacion: null,
      archivoNombre: file.name, archivoTipo: file.type || 'application/pdf', archivoDatos,
    });
    await Store.set('pqr', registros);
    fileInput.value = '';

    // Las PQR son privadas: no se archiva ninguna copia en Historial
    // Trainee. Ese historial es visible para cualquier admin/coordinador
    // con acceso al panel "Historial Trainee", mientras que PQR tiene su
    // propio flujo de acceso (panel PQR) — mezclar ambos filtraría
    // contenido privado del estudiante a una vista que no debería tenerlo.
    return true;
  }

  // Fila reutilizable de "mis solicitudes" (Docente y Estudiante).
  function filaPqrPropia(p) {
    return `
      <tr data-search="${escapeHtml((p.tipo + ' ' + p.asunto + ' ' + p.estado).toLowerCase())}" class="border-b border-gray-50 last:border-0">
        <td class="py-3 px-4 text-sm text-slate2">${escapeHtml(p.tipo)}</td>
        <td class="py-3 px-4 text-sm text-ink font-semibold">${escapeHtml(p.asunto)}</td>
        <td class="py-3 px-4">${statusPill(p.estado, ESTADO_COLORS)}</td>
        <td class="py-3 px-4 text-sm">${p.archivoDatos ? `<button onclick="verPqrPropia('${p.id}')" class="text-xs font-semibold text-morado hover:underline inline-flex items-center gap-1">${ICON_CLIP_SVG}${escapeHtml(p.archivoNombre || 'Ver PDF')}</button>` : '—'}</td>
      </tr>`;
  }

  // Abre en una pestaña nueva el PDF que el propio Docente/Estudiante envió.
  // async: 'pqr' vía MySQL. window.open() se llama SÍNCRONAMENTE antes de
  // cualquier await, para no activar el bloqueador de popups.
  async function verPqrPropia(id) {
    const win = window.open('', '_blank');
    const p = (await Store.list('pqr')).find(r => r.id === id);
    if (!p || !p.archivoDatos) { toast('No se encontró el archivo', 'err'); win.close(); return; }
    win.document.write(`<iframe src="${p.archivoDatos}" style="border:0;width:100%;height:100vh"></iframe>`);
    win.document.title = p.archivoNombre || p.asunto;
  }

  // async: 'pqr' vía MySQL.
  async function renderPqrEstudiante() {
    const nombre = estudianteNombre();
    const propias = [...(await Store.list('pqr'))].filter(p => p.solicitante === nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-s-pqr').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Enviar una nueva solicitud</p>
        <p class="text-xs text-slate2 mb-4">Adjunta tu petición, queja o reclamo como archivo PDF. Quedará en estado <span class="font-semibold text-ink">Pendiente</span> hasta que el administrador lo descargue.</p>
        <div class="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Tipo</label>
            <select id="pqr_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30">
              <option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate2 mb-1.5">Asunto</label>
            <input id="pqr_asunto" type="text" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          </div>
        </div>
        <label class="block text-xs font-semibold text-slate2 mb-1.5">Archivo PDF</label>
        <input id="pqr_archivo" type="file" accept=".pdf,application/pdf" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-2 focus:ring-oro/30" />
        <button onclick="enviarPqrEstudiante()" class="mt-4 rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Enviar solicitud</button>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 overflow-hidden">
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-wide text-slate2">Mis solicitudes</p>
          <div class="relative">
            <input data-table="table-estudiante-pqr" oninput="TableManager.filter('table-estudiante-pqr', this.value)" type="text" placeholder="Buscar solicitud..." class="rounded-xl border border-amber-400/40 bg-amber-50/60 pl-9 pr-3 py-1.5 text-xs w-36 sm:w-44 text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 transition" />
            <svg class="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <div class="table-responsive-container">
          <table id="table-estudiante-pqr" class="w-full admin-table">
            <thead><tr class="text-left text-xs font-bold uppercase tracking-wide text-slate2 border-b border-gray-100"><th class="py-3 px-4">Tipo</th><th class="py-3 px-4">Asunto</th><th class="py-3 px-4">Estado</th><th class="py-3 px-4" data-no-sort="true">Archivo</th></tr></thead>
            <tbody>${propias.map(filaPqrPropia).join('') || '<tr><td colspan="4" class="text-sm text-slate2 text-center py-6">Aún no has enviado solicitudes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    TableManager.init('table-estudiante-pqr');
  }

  async function enviarPqrEstudiante() {
    const ok = await subirPqrArchivo({ tipoId: 'pqr_tipo', asuntoId: 'pqr_asunto', fileId: 'pqr_archivo', solicitante: estudianteNombre(), remitenteRol: 'Estudiante' });
    if (!ok) return;
    toast('Solicitud enviada correctamente', 'ok');
    renderPqrEstudiante();
  }

  // "Calendario institucional" fue eliminado del panel Estudiante.

  // ---------- ENCUESTAS DE SATISFACCIÓN ----------
  // async: 'encuestas' vía MySQL.
  async function renderEncuestasEstudiante() {
    const est = currentEstudiante || {};
    const encuestas = [...(await Store.list('encuestas'))]
      .filter(e => e.estado === 'Abierta' && e.cohorte === est.cohorte)
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    document.getElementById('mount-s-encuestas').innerHTML = `
      <div class="grid sm:grid-cols-2 gap-4">
        ${encuestas.map(e => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-sm font-bold text-ink">${escapeHtml(e.titulo)}</p>
              ${statusPill(e.estado, ESTADO_COLORS)}
            </div>
            <p class="text-xs text-slate2 mb-3">${fmtDate(e.fecha)}</p>
            <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-ink hover:bg-oro transition rounded-full px-4 py-2">
              Responder encuesta
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8 sm:col-span-2">No hay encuestas disponibles para tu cohorte por el momento.</p>'}
      </div>`;
  }

  // ---------- AGENDA PERSONAL INTELIGENTE ----------
  // async: 'agenda_estudiante' vía MySQL.
  async function renderAgendaEstudiante() {
    const nombre = estudianteNombre();
    const eventos = [...(await Store.list('agenda_estudiante'))].filter(a => a.estudiante === nombre).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    document.getElementById('mount-s-agenda').innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 mb-6">
        <p class="text-sm font-bold text-ink mb-4">Agregar evento a mi agenda</p>
        <div class="grid sm:grid-cols-4 gap-3 mb-3">
          <input id="ag_titulo" type="text" placeholder="Título" class="sm:col-span-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
          <select id="ag_tipo" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30">
            <option>Taller</option><option>Quiz</option><option>Entrega</option><option>Evento</option><option>Recordatorio</option>
          </select>
          <input id="ag_fecha" type="date" class="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oro/30" />
        </div>
        <button onclick="agregarEventoAgenda()" class="rounded-full bg-gradient-to-r from-morado to-turquesa text-white font-semibold text-sm py-3 px-6 hover:opacity-90 transition">Agregar</button>
      </div>
      <div class="space-y-3">
        ${eventos.map(a => `
          <div class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-ink">${escapeHtml(a.titulo)}</p>
              <p class="text-xs text-slate2 mt-0.5">${escapeHtml(a.tipo)} · ${fmtDate(a.fecha)}${a.hora ? ' · ' + escapeHtml(a.hora) : ''}</p>
            </div>
            <button onclick="eliminarEventoAgenda('${a.id}')" class="text-xs font-semibold text-coral hover:underline shrink-0">Eliminar</button>
          </div>`).join('') || '<p class="text-sm text-slate2 text-center py-8">No tienes eventos en tu agenda personal.</p>'}
      </div>`;
  }

  // async: 'agenda_estudiante' vía MySQL.
  async function agregarEventoAgenda() {
    const titulo = document.getElementById('ag_titulo').value.trim();
    const tipo = document.getElementById('ag_tipo').value;
    const fecha = document.getElementById('ag_fecha').value;
    if (!titulo || !fecha) { toast('Completa el título y la fecha', 'err'); return; }
    const registros = await Store.list('agenda_estudiante');
    registros.push({ id: uid('ag'), estudiante: estudianteNombre(), titulo, tipo, fecha, hora: '', notas: '' });
    await Store.set('agenda_estudiante', registros);
    toast('Evento agregado a tu agenda', 'ok');
    renderAgendaEstudiante();
  }

  // async: 'agenda_estudiante' vía MySQL.
  async function eliminarEventoAgenda(id) {
    const registros = (await Store.list('agenda_estudiante')).filter(a => a.id !== id);
    await Store.set('agenda_estudiante', registros);
    toast('Evento eliminado', 'ok');
    renderAgendaEstudiante();
  }

  const RENDERERS_ESTUDIANTE = {
    resumen: renderResumenEstudiante,
    perfil: renderPerfilEstudiante,
    asistencia: renderAsistenciaEstudiante,
    academico: renderAcademicoEstudiante,
    calificaciones: renderCalificacionesEstudiante,
    pensum: renderPensumEstudiante,
    memorandos: renderMemorandosEstudiante,
    pqr: renderPqrEstudiante,
    encuestas: renderEncuestasEstudiante,
    agenda: renderAgendaEstudiante,
  };
  // Si la URL trae ?qr=... (viene de escanear un código impreso con la
  // cámara), toma el control ANTES que cualquier otra cosa.
  manejarQrEnURL();

  // Limpieza única: 'alumnos_cohorte' fue una entidad de prueba del
  // simulador de roles (ya retirado). Se borra para dejar el almacenamiento limpio.
  localStorage.removeItem(DB_PREFIX + 'alumnos_cohorte');

  /**
   * Carga optimizada del sitio público: una única petición ultraliviana (/api/public_info)
   * que solo trae lo necesario para visitantes (contacto, postulación y total para la constelación).
   * No ejecuta seedIfEmpty, ni migraciones administrativas, ni descarga la tabla de usuarios.
   */
  async function cargarInfoPublica() {
    try {
      const resp = await fetch(API_BASE_URL + '/api/public_info');
      if (resp.ok) {
        const info = await resp.json();
        if (info && info.configuracion) {
          renderContactoPublico(info.configuracion);
          actualizarBotonesPostular(info.configuracion);
        }
        renderConstellation(info ? info.totalEstudiantes : 0, info ? info.estudiantes : null);
        return;
      }
    } catch (e) {
      console.warn('[cargarInfoPublica] Modo local offline:', e.message);
    }
    // Respaldo offline si el servidor no responde
    renderContactoPublico();
    actualizarBotonesPostular();
    renderConstellation();
  }
  // Renderizado estelar inmediato sin esperar la red
  renderConstellation();
  cargarInfoPublica();

  // Arranca el widget de chat (público + dentro de cualquier login), ver
  // bloque "WIDGET: Chat de la Fundación A+" más abajo.
  initAplusChat();

  /**
   * Widget de chat con IA (Fundación A+).
   * Comunicación fluida con backend FastAPI / Groq & Gemini y base de conocimiento MySQL.
   */
  const CHAT_CONFIG = {
    // Backend local de Chat IA (uvicorn corriendo en el puerto 8001).
    // Usa dinámicamente el host actual (localhost, 127.0.0.1 o IP de red WiFi del celular).
    baseUrl: (function() {
      const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
      const proto = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) ? window.location.protocol : 'http:';
      return `${proto}//${host}:8001`;
    })(),
    // Cada cuánto se vuelve a comprobar /health mientras el chat está abierto
    healthCheckIntervalMs: 30000,
  };

  // Valida si existe una sesión activa real en la interfaz de la aplicación
  function haySesionActivaApp() {
    return Boolean(currentAdminRole || currentDocente || currentEstudiante || currentAdminUser);
  }

  // Token de sesión del CHAT: vive ÚNICAMENTE en memoria durante la sesión activa.
  // No se persiste en localStorage para evitar que un visitante público en la misma máquina
  // herede credenciales administrativas residuales y acceda a información privada.
  let chatSessionToken = null;

  // Limpieza defensiva en arranque: si no hay sesión activa en la app, purgar cualquier residuo
  if (!haySesionActivaApp()) {
    try {
      localStorage.removeItem('aplus_chat_token');
    } catch (_) {}
  }

  /** Se llama justo después de un login exitoso en la app (cualquier rol)
   *  para obtener el token que el chat necesita mandar en cada mensaje.
   *  Si el backend de autenticación no responde (apagado, sin MySQL
   *  configurado, etc.), usa el token de sesión de la app (compatible con
   *  backend_chat/auth.py) como respaldo automático. */
  async function iniciarSesionChat(email, password) {
    if (!haySesionActivaApp()) return;
    try {
      const resp = await fetch(CHAT_CONFIG.baseUrl + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const tokenFallback = (typeof getAuthToken === 'function' ? getAuthToken() : null);
        chatSessionToken = tokenFallback || null;
        return;
      }
      const data = await resp.json();
      chatSessionToken = data.token || null;
    } catch (e) {
      const tokenFallback = (typeof getAuthToken === 'function' ? getAuthToken() : null);
      chatSessionToken = tokenFallback || null;
    }
  }

  /** Se llama en cada logout (cualquier rol) para que el chat deje de
   *  mandar un token de una sesión que ya terminó. */
  function cerrarSesionChat() {
    chatSessionToken = null;
    try {
      localStorage.removeItem('aplus_chat_token');
    } catch (_) {}
  }

  function initAplusChat() {
    const fab = document.getElementById('aplusFab');
    const panel = document.getElementById('aplusPanel');
    const body = document.getElementById('aplusBody');
    const input = document.getElementById('aplusInput');
    const sendBtn = document.getElementById('aplusSend');
    const clearBtn = document.getElementById('aplusClear');
    const chipsWrap = document.getElementById('aplusChips');
    const statusDot = document.getElementById('aplusStatusDot');
    const statusText = document.getElementById('aplusStatusText');
    if (!fab || !panel || !body || !input || !sendBtn) return; // widget no presente en esta página
    // Elementos añadidos en una actualización posterior del widget
    // (chips de sugerencias, indicador de estado, botón de limpiar). Si el
    // index.html publicado quedó desactualizado respecto a este app.js
    // (por ejemplo, un despliegue a medias que subió el .js nuevo pero no
    // el .html nuevo, o una copia en caché del navegador), cualquiera de
    // estos podía ser null y entonces un solo error (p.ej. "Cannot read
    // properties of null" en statusDot) cortaba TODA la función a mitad de
    // camino — dejando sin registrar incluso los addEventListener de más
    // abajo (el input de texto dejaba de reaccionar, aunque el chat en sí
    // pareciera funcionar). Por eso cada uso de estos elementos más abajo
    // revisa primero que existan.

    let history = [];
    let isOpen = false;
    let isLoading = false;
    let hasGreeted = false;
    let backendOnline = true; // optimista hasta la primera comprobación real
    let healthCheckTimer = null;

    function getRoleGreeting() {
      if (currentAdminRole === 'superadmin') {
        return '¡Hola Superadmin! Estoy listo para apoyarte con la gestión de la plataforma y consultas administrativas.';
      }
      if (currentAdminRole === 'administracion' && currentAdminUser) {
        return `¡Hola ${currentAdminUser.nombre}! ¿En qué te puedo apoyar hoy con la administración?`;
      }
      if (currentDocente) {
        return `¡Hola docente ${currentDocente.nombre}! ¿En qué te puedo colaborar hoy?`;
      }
      if (currentEstudiante) {
        return `¡Hola ${currentEstudiante.nombre}! ¿En qué te puedo ayudar hoy con tus cursos o calificaciones?`;
      }
      return '¡Hola! Soy el asistente virtual de la Fundación A+. ¿En qué te puedo ayudar hoy?';
    }

    /** Preguntas sugeridas (chips) según quién esté usando el chat en
     *  este momento — cada rol ve las que probablemente le sirven más.
     *  Se muestran solo al abrir el chat, antes de escribir nada, y
     *  desaparecen en cuanto se manda el primer mensaje (ver toggleChat
     *  y sendMessage). */
    function getSuggestedChips() {
      if (currentEstudiante) {
        return ['¿Cuáles son mis notas?', '¿Cómo va mi asistencia?', '¿Tengo memorandos sin leer?', '¿Cuál es mi cohorte?'];
      }
      if (currentDocente) {
        return ['¿Qué cohortes tengo a cargo?', '¿Cómo va la asistencia de mis clases?', '¿Tengo PQR pendientes?', '¿Cuál es mi pensum?'];
      }
      if (currentAdminRole === 'superadmin' || currentAdminRole === 'administracion') {
        return ['¿Cuántos usuarios hay registrados?', '¿Cuántas cohortes están activas?', '¿Hay PQR sin resolver?'];
      }
      return ['¿Cómo ser voluntario?', '¿Cuáles son sus redes sociales?', '¿Qué es el TrAIning de 100 a 1000+?', '¿Dónde están ubicados?'];
    }

    function renderChips() {
      if (!chipsWrap) return;
      const chips = getSuggestedChips();
      chipsWrap.innerHTML = chips.map(c => `<button type="button" class="aplus-chat-chip">${escapeHtml(c)}</button>`).join('');
      chipsWrap.classList.add('is-visible');
      chipsWrap.querySelectorAll('.aplus-chat-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          input.value = btn.textContent;
          sendMessage();
        });
      });
    }

    function hideChips() {
      if (!chipsWrap) return;
      chipsWrap.classList.remove('is-visible');
      chipsWrap.innerHTML = '';
    }

    function resetChatSession() {
      history = [];
      body.innerHTML = '';
      hasGreeted = true;
      addMessage('assistant', getRoleGreeting());
      renderChips();
    }
    window.aplusChatResetSession = resetChatSession;

    /** Comprueba GET /health una vez y refleja el resultado en el punto
     *  de estado del header (verde=en línea, ámbar=comprobando,
     *  coral=sin conexión). Nunca lanza: un fallo de red se trata igual
     *  que backend caído. */
    async function checkBackendStatus() {
      if (!statusDot || !statusText) return;
      statusDot.className = 'aplus-chat-dot is-checking';
      statusText.textContent = 'Comprobando...';
      try {
        const resp = await fetch(CHAT_CONFIG.baseUrl + '/health', { method: 'GET' });
        backendOnline = resp.ok;
      } catch (e) {
        backendOnline = false;
      }
      statusDot.className = 'aplus-chat-dot' + (backendOnline ? '' : ' is-offline');
      statusText.textContent = backendOnline ? 'Asistente virtual' : 'Sin conexión';
      sendBtn.disabled = !backendOnline || isLoading;
    }

    function startHealthChecks() {
      checkBackendStatus();
      if (healthCheckTimer) clearInterval(healthCheckTimer);
      healthCheckTimer = setInterval(checkBackendStatus, CHAT_CONFIG.healthCheckIntervalMs);
    }
    function stopHealthChecks() {
      if (healthCheckTimer) clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }

    function toggleChat() {
      isOpen = !isOpen;
      fab.classList.toggle('is-open', isOpen);
      panel.classList.toggle('is-open', isOpen);
      // En móvil el panel pasa a pantalla completa (ver @media en style.css);
      // esta clase en el contenedor hace que el FAB flote por encima del
      // panel abierto, para que siga sirviendo de botón "cerrar".
      const container = document.getElementById('aplusChat');
      if (container) container.classList.toggle('is-open-mobile', isOpen);
      fab.setAttribute('aria-expanded', String(isOpen));
      panel.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        if (!hasGreeted) {
          hasGreeted = true;
          addMessage('assistant', getRoleGreeting());
          renderChips();
        }
        startHealthChecks();
        input.focus();
      } else {
        stopHealthChecks();
      }
    }

    /** Convierte las URLs (http/https) de un texto en enlaces clicables,
     *  reales y seguros: el texto se escapa primero como HTML (igual que
     *  escapeHtml) y solo DESPUÉS se envuelven las URLs detectadas en
     *  <a>, así el contenido que devuelve la IA nunca puede inyectar HTML
     *  propio — solo se le permite convertirse en un link normal. */
    function linkifyMensajeAsistente(texto) {
      const escapado = escapeHtml(texto);
      return escapado.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])/g, url =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
    }

    /** Markdown MUY básico y seguro para las respuestas del asistente:
     *  **negrita** y líneas que empiezan con "- " como lista. Se aplica
     *  DESPUÉS de linkify (que ya escapó el texto), así que solo actúa
     *  sobre marcado literal tipo **texto**, nunca sobre HTML — no hay
     *  forma de que esto introduzca una etiqueta que no sea <strong>,
     *  <ul> o <li>, generadas aquí mismo. */
    function formatearMarkdownBasico(html) {
      // Normaliza ***texto*** (bold+italic en markdown estándar) a
      // **texto** antes de procesar negritas — si no, el "*" extra queda
      // suelto porque solo reconocemos "**".
      html = html.replace(/\*\*\*(.+?)\*\*\*/gs, '**$1**');
      // CORREGIDO: el flag "s" (dotAll) es imprescindible aquí — sin él,
      // "." no coincide con saltos de línea, así que una negrita que el
      // modelo parte en dos líneas (p.ej. "**Fase 2\n(Profundización)**",
      // algo normal en respuestas largas) nunca cerraba correctamente: el
      // regex terminaba emparejando el "**" de apertura con el SIGUIENTE
      // "**" que encontrara en el texto (que podía ser el de otra negrita
      // más adelante), produciendo negritas en el lugar equivocado y
      // dejando asteriscos sueltos visibles en el mensaje final.
      html = html.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
      // RED DE SEGURIDAD: el modelo a veces genera markdown mal formado —
      // un "**" de apertura que nunca cierra (la respuesta termina a
      // mitad de una negrita, o el modelo simplemente lo olvida). Ningún
      // regex puede adivinar un cierre que no existe, así que cualquier
      // "**" que sobreviva hasta aquí (no se convirtió en <strong>) se
      // elimina en vez de mostrarse crudo — es preferible perder el
      // énfasis a mostrar asteriscos sueltos en el chat.
      html = html.replace(/\*\*/g, '');
      // Agrupa líneas consecutivas que empiezan con "- " en un solo <ul>
      const lineas = html.split('\n');
      let out = [];
      let enLista = false;
      for (const linea of lineas) {
        const esItem = /^\s*-\s+(.+)/.exec(linea);
        if (esItem) {
          if (!enLista) { out.push('<ul>'); enLista = true; }
          out.push(`<li>${esItem[1]}</li>`);
        } else {
          if (enLista) { out.push('</ul>'); enLista = false; }
          out.push(linea);
        }
      }
      if (enLista) out.push('</ul>');
      return out.join('\n');
    }

    function horaCorta() {
      return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }

    function addMessage(role, content) {
      const row = document.createElement('div');
      row.className = 'aplus-msg-row ' + role;
      const bubble = document.createElement('div');
      bubble.className = 'aplus-msg ' + role;
      if (role === 'assistant') {
        // Solo las respuestas del asistente pasan por linkify + markdown
        // básico (para que WhatsApp, redes sociales, negritas, listas,
        // etc. salgan bien formateadas); lo que escribe el propio usuario
        // se muestra siempre como texto plano, tal cual lo tipeó.
        bubble.innerHTML = formatearMarkdownBasico(linkifyMensajeAsistente(content));
      } else {
        bubble.textContent = content;
      }
      row.appendChild(bubble);
      if (role !== 'error') {
        const time = document.createElement('div');
        time.className = 'aplus-msg-time';
        time.textContent = horaCorta();
        row.appendChild(time);
      }
      body.appendChild(row);
      scrollToBottom();
      return { row, bubble };
    }

    function showTyping() {
      const row = document.createElement('div');
      row.className = 'aplus-msg-row assistant';
      row.id = 'aplusTypingRow';
      row.innerHTML = '<div class="aplus-msg assistant aplus-typing"><span class="node"></span><span class="node"></span><span class="node"></span></div>';
      body.appendChild(row);
      scrollToBottom();
    }

    function hideTyping() {
      const row = document.getElementById('aplusTypingRow');
      if (row) row.remove();
    }

    function scrollToBottom() { body.scrollTop = body.scrollHeight; }

    function setLoading(state) {
      isLoading = state;
      sendBtn.disabled = state || !backendOnline;
      input.disabled = state;
    }

    /** Mensajes de error específicos según lo que falló, en vez de un
     *  genérico único: ayuda a distinguir "el backend está apagado/no
     *  desplegado" de "se cayó la conexión a mitad de respuesta" de
     *  "el servidor respondió con un error puntual". */
    function mensajeDeError(err) {
      if (err && err.isTimeout) return 'El asistente está tardando más de lo normal. Intenta de nuevo en un momento.';
      if (err && err.name === 'TypeError') return 'No pudimos conectar con el asistente. Comprueba tu conexión a internet e intenta de nuevo.';
      if (err && err.fromServer) return err.message || 'El asistente tuvo un problema al responder. Intenta de nuevo.';
      return 'Ocurrió un error inesperado. Intenta de nuevo en un momento.';
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || isLoading || !backendOnline) return;

      hideChips();
      addMessage('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';
      autoGrow();
      setLoading(true);
      showTyping();

      let acumulado = '';
      let streamingBubble = null;

      try {
        // SEGURIDAD CRÍTICA: solo enviar token si el usuario REALMENTE tiene una sesión activa
        // en la interfaz de la aplicación (Superadmin, Administración, Docente o Estudiante).
        // Si la persona está en el sitio público sin iniciar sesión, NUNCA enviar token:
        // el asistente debe responder estrictamente como visitante público con información institucional
        // general y jamás con datos privados, estadísticas ni guías de gestión administrativa.
        const tokenParaChat = haySesionActivaApp() ? (chatSessionToken || (typeof getAuthToken === 'function' ? getAuthToken() : null)) : null;

        const response = await fetch(CHAT_CONFIG.baseUrl + '/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            token: tokenParaChat,
          })
        });

        if (!response.ok || !response.body) {
          const err = new Error('Respuesta no válida del servidor (' + response.status + ')');
          err.fromServer = true;
          throw err;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Los eventos SSE vienen separados por una línea en blanco
          // ("\n\n"); se procesan de a uno según van completándose.
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const evento = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const linea = evento.split('\n').find(l => l.startsWith('data: '));
            if (!linea) continue;
            let payload;
            try { payload = JSON.parse(linea.slice(6)); } catch (e) { continue; }

            if (payload.error) {
              const err = new Error(payload.error);
              err.fromServer = true;
              throw err;
            }
            if (payload.delta) {
              if (!streamingBubble) {
                hideTyping();
                streamingBubble = addMessage('assistant', '');
                streamingBubble.bubble.classList.add('is-streaming');
              }
              acumulado += payload.delta;
              // Mientras el streaming está en curso se muestra el texto
              // PLANO acumulado (sin procesar markdown todavía). Antes se
              // reprocesaba **negrita** y enlaces en cada fragmento
              // parcial, pero el texto a medio llegar puede tener un "**"
              // de apertura sin su cierre (llegó en un chunk posterior);
              // el regex terminaba emparejando ese "**" suelto con el de
              // OTRA negrita más adelante en el texto, produciendo negritas
              // en el lugar equivocado y asteriscos sueltos visibles en el
              // mensaje ya terminado. formatearMarkdownBasico()/linkify
              // ahora se aplican una sola vez, al final (evento "done"),
              // sobre el texto ya completo — ahí el emparejamiento de "**"
              // siempre es correcto.
              streamingBubble.bubble.textContent = acumulado;
              scrollToBottom();
            }
            if (payload.done) {
              if (streamingBubble) {
                streamingBubble.bubble.classList.remove('is-streaming');
                streamingBubble.bubble.innerHTML = formatearMarkdownBasico(linkifyMensajeAsistente(acumulado));
              }
            }
          }
        }

        hideTyping();
        if (streamingBubble) {
          streamingBubble.bubble.classList.remove('is-streaming');
          // Red de seguridad: si por lo que sea el backend nunca mandó el
          // evento "done" (stream cortado, etc.), el markdown final igual
          // se aplica aquí — nunca debe quedar la burbuja mostrando texto
          // plano con "**"/enlaces crudos por no haber pasado por done.
          streamingBubble.bubble.innerHTML = formatearMarkdownBasico(linkifyMensajeAsistente(acumulado));
          history.push({ role: 'assistant', content: acumulado });
        } else {
          // El stream terminó sin ningún fragmento de contenido (caso
          // límite poco común) — se avisa en vez de dejar la conversación
          // sin respuesta visible y sin explicación.
          addMessage('error', 'El asistente no devolvió una respuesta. Intenta de nuevo.');
        }
      } catch (err) {
        hideTyping();
        if (streamingBubble) streamingBubble.row.remove(); // no dejar una burbuja a medio escribir sin explicación
        addMessage('error', mensajeDeError(err));
        console.error('Error del chat de la Fundación A+:', err);
        if (err && err.name === 'TypeError') checkBackendStatus(); // probable caída del backend: refresca el indicador ya
      } finally {
        setLoading(false);
        input.focus();
      }
    }

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 88) + 'px';
    }

    function clearConversation() {
      history = [];
      body.innerHTML = '';
      hasGreeted = true;
      addMessage('assistant', getRoleGreeting());
      renderChips();
      input.focus();
    }

    fab.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', sendMessage);
    if (clearBtn) clearBtn.addEventListener('click', clearConversation);
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }