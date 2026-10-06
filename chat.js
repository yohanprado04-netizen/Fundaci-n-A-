/**
 * chat.js — Widget de Chat con Inteligencia Artificial
 * Fundación A+ (https://fundacionamas.org.co/)
 *
 * Desacoplado de app.js para optimización de rendimiento, mantenibilidad y modularidad.
 * Gestiona:
 * 1. Comunicación fluida con backend FastAPI (puerto 8001), Groq & Gemini
 * 2. Autenticación contextual con token de sesión en memoria
 * 3. Consultas a base de conocimiento MySQL y chip selector por rol
 * 4. Streaming de respuestas con TextDecoder y formateo enriquecido Markdown
 * 5. Monitoreo reactivo de disponibilidad (health checks)
 */
(function() {
  'use strict';

  // Helpers seguros con fallback a globales de app.js / db.js
  const escapeHtml = (str) => (typeof window !== 'undefined' && typeof window.escapeHtml === 'function' ? window.escapeHtml(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]));
  const getAdminRole = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminRole === 'function' ? window.getCurrentAdminRole() : null);
  const getAdminUser = () => (typeof window !== 'undefined' && typeof window.getCurrentAdminUser === 'function' ? window.getCurrentAdminUser() : null);
  const getDocente = () => (typeof window !== 'undefined' && typeof window.getCurrentDocente === 'function' ? window.getCurrentDocente() : null);
  const getEstudiante = () => (typeof window !== 'undefined' && typeof window.getCurrentEstudiante === 'function' ? window.getCurrentEstudiante() : null);
  const getAuthToken = () => (typeof window !== 'undefined' && typeof window.getAuthToken === 'function' ? window.getAuthToken() : null);
  const haySesionActivaApp = () => (typeof window !== 'undefined' && typeof window.haySesionActivaApp === 'function' ? window.haySesionActivaApp() : Boolean(getAdminRole() || getDocente() || getEstudiante()));

  /**
   * Widget de chat con IA (Fundación A+).
   * Comunicación fluida con backend FastAPI / Groq & Gemini y base de conocimiento MySQL.
   */
  const CHAT_CONFIG = {
    // Backend local de Chat IA (uvicorn corriendo en el puerto 8001).
    // Usa dinámicamente el host actual (localhost, 127.0.0.1 o IP de red WiFi del celular).
    baseUrl: (function() {
      const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
      const proto = (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) ? window.location.protocol : 'http:';
      return `${proto}//${host}:8001`;
    })(),
    // Cada cuánto se vuelve a comprobar /health mientras el chat está abierto
    healthCheckIntervalMs: 30000,
  };

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
    const closeBtn = document.getElementById('aplusClose');
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
      const currentAdminRole = getAdminRole();
      const currentAdminUser = getAdminUser();
      const currentDocente = getDocente();
      const currentEstudiante = getEstudiante();
      if (currentAdminRole === 'superadmin') {
        return '¡Hola Superadmin! Estoy listo para apoyarte con la gestión de la plataforma y consultas administrativas.';
      }
      if (currentAdminRole === 'administracion' && currentAdminUser) {
        return `¡Hola ${currentAdminUser.nombre}! ¿En qué te puedo apoyar hoy con la administración?`;
      }
      if (currentAdminRole === 'aliado' && currentAdminUser) {
        const esDonante = currentAdminUser.rol === 'Donante';
        return `¡Hola ${currentAdminUser.nombre}! Bienvenido a tu observatorio de ${esDonante ? 'Donaciones e Inversión Social' : 'Alianzas Estratégicas'}. ¿En qué te puedo colaborar hoy?`;
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
      const currentAdminRole = getAdminRole();
      const currentAdminUser = getAdminUser();
      const currentDocente = getDocente();
      const currentEstudiante = getEstudiante();
      if (currentEstudiante) {
        return ['¿Cuáles son mis notas?', '¿Cómo va mi asistencia?', '¿Tengo memorandos sin leer?', '¿Cuál es mi cohorte?'];
      }
      if (currentDocente) {
        return ['¿Qué cohortes tengo a cargo?', '¿Cómo va la asistencia de mis clases?', '¿Tengo PQR pendientes?', '¿Cuál es mi pensum?'];
      }
      if (currentAdminRole === 'aliado') {
        const esDonante = currentAdminUser && currentAdminUser.rol === 'Donante';
        return esDonante
          ? ['¿Cuáles son los proyectos con mayor retorno SROI?', '¿Qué iniciativas A+ están activas?', '¿Cómo van las cohortes del programa?', '¿Cuántos estudiantes están matriculados?']
          : ['¿Qué iniciativas A+ están activas?', '¿Cómo van las cohortes?', '¿Cuáles son los proyectos estudiantiles?', '¿Cuál es el impacto social promedio?'];
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
      const currentAdminRole = getAdminRole();
      if (currentAdminRole === 'aliado') {
        const container = document.getElementById('aplusChat');
        if (container) container.style.setProperty('display', 'none', 'important');
        return;
      }
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
    window.abrirAplusChatDirecto = function() {
      const currentAdminRole = getAdminRole();
      if (currentAdminRole === 'aliado') return;
      if (!isOpen) {
        toggleChat();
      } else {
        if (input) input.focus();
      }
    };

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
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);
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

  // Exportar funciones públicas a window
  window.initAplusChat = initAplusChat;
  window.iniciarSesionChat = iniciarSesionChat;
  window.cerrarSesionChat = cerrarSesionChat;

  // Auto-arranque defensivo del widget
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAplusChat);
  } else {
    initAplusChat();
  }
})();
