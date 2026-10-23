# ShiftReady — Simulador de chat de atención al cliente

Simulador para practicar soporte por chat en inglés: atiendes a varios clientes al mismo tiempo,
eliges la mejor respuesta y el cliente reacciona según lo que contestes. Si tardas, se enoja.

## Cómo abrirlo

Haz doble clic en `index.html`. No necesita instalar nada. Funciona en computadora y en teléfono.

(Con internet se ven las fotos de perfil y la tipografía; sin internet funciona igual con iniciales.)

## Cómo se juega

- **Entrada:** sobre el simulador difuminado aparece el logo con "Tap to start" / "Click to start".
  Al presionarlo suena tu audio de voz y cada palabra aparece cuando se dice, con letra estilo iPhone:
  "Welcome to ShiftReady" → "A Customer Service Simulator"; después se quita el difuminado. Empezar con
  un toque es lo que permite que la voz suene en cualquier navegador, también en teléfonos. Ya empezada,
  se salta con cualquier tecla o clic,
  se repite desde el lobby ("Replay welcome") y se desactiva en Settings. El texto y sus tiempos
  están al inicio de `assets/js/boot.js` (`LINES`), por si cambias el audio.
- **Lobby:** tu logo y al lado el botón redondeado **Press!** (se mueve como un botón real: da un
  saltito cada pocos segundos, se hunde al presionarlo con una onda de luz y respira mientras habla la voz). Al presionarlo suena tu audio "voz"
  ("Hi there! Welcome to the simulator…") y sus palabras aparecen mientras se dicen; cuando dice
  "press Start Shift", el botón Start shift se ilumina. Presionarlo otra vez lo detiene.
- **Tutorial del Día 1:** al empezar el Día 1, apenas llega el primer mensaje, un recorrido corto
  explica cada parte (tus chats, la conversación, el expediente del cliente, la barra de arriba y las
  herramientas). La parte que se explica se ve nítida y el resto queda difuminado; se avanza con
  **Continue** (o `Enter`), se puede saltar con "Skip tour" (o `Esc`) y el tiempo queda en pausa mientras dura.
- **Modo oscuro:** botón de luna en el lobby y en la barra superior, o en Settings.
- **Sonidos** (tus archivos, en `assets/audio/` y embebidos en `assets/js/sounds.js`):
  - clic (sonido_4): cualquier botón, códigos de cierre, día;
  - opción (sonido_3, un "ding"): elegir una respuesta (clic o teclas 1–4);
  - enviar (sonido_6): enviar, cerrar el chat, empezar/repetir turno y confirmaciones;
  - menú (sonido_7): abrir chats, pestañas, documentos, menús, base de conocimiento, el botón Press!;
  - volver (sonido_8): cerrar o volver, interruptores, modo oscuro, sonido y pausa;
  - notificación (sonido_3 dos veces, la segunda más aguda): chat nuevo y cliente esperando;
    más grave cuando un cliente se enoja o se va;
  - éxito (el sonido de notificación anterior): chat cerrado y fin del turno.
  Se apagan todos (también la voz) con "Sound" en Settings o el botón de bocina.
- **Cliente enojado:** si tardas demasiado, la pantalla se pone roja, tiembla y aparece un aviso.
- **Teléfono:** la bienvenida y el lobby se usan con el teléfono derecho. Al presionar **Start shift**
  aparece, sobre el fondo difuminado, un teléfono que gira: hay que poner el celular horizontal y el
  turno se ve igual que en la computadora (el tiempo queda en pausa mientras está derecho). Si lo
  vuelves a poner derecho, aparece otra vez el aviso. "Back to lobby" sale del turno.
- **Ventana angosta en computadora:** estilo WhatsApp (lista de chats y chat a pantalla completa).
- **Bandeja (izquierda):** tus chats. El anillo alrededor de la foto es la paciencia del cliente.
- **Expediente del cliente (derecha):** cada documento (contacto, pedido, envío, historial,
  políticas, notas) es una tarjeta. Al hacer clic se abre como documento con el fondo difuminado;
  cambia de pestaña con `←` `→` y cierra con `Esc`. El tiempo sigue corriendo mientras lees.
- **Chat (centro):** elige una respuesta con las teclas `1`–`4` y envía con `Enter`
  (o doble clic en la respuesta). Algunas respuestas suenan bien pero tienen datos falsos.
- **Ritmo de cada cliente:** después de que respondes, cada cliente tarda su propio tiempo
  en contestar (de ~8 a ~30 segundos, nunca más de 30). Aprovecha ese tiempo para atender los
  otros chats. El ritmo se define con `replyIn` (segundos) en cada caso.
- **Panel del cliente (derecha):** datos, pedido, inventario, historial y políticas de la empresa.
- **Fotos de productos:** cada producto que piden los clientes (28 en total) tiene su foto: en miniatura
  en la tarjeta del pedido y grande dentro del documento del pedido. Están en `assets/img/products/`
  y se asignan por nombre en `assets/js/data/products.js`; las fuentes y licencias están en
  `assets/img/products/CREDITS.md`.
- **Wrap-up:** al terminar cada chat eliges el código de resolución y cierras la conversación.
- **Días:** 5 niveles (3 → 7 clientes). Con 60 puntos pasas al siguiente día.
- **Reporte:** al final del día ves cada respuesta que diste, la nota del coach y la mejor respuesta.

Atajos: `Alt`+`↓/↑` cambia de chat · `K` base de conocimiento · `P` pausa · `Esc` cierra paneles.

## Estructura

| Archivo | Qué contiene |
| --- | --- |
| `assets/js/data/company.js` | Empresa ficticia, políticas, códigos de cierre, tipos de cliente y los 5 días |
| `assets/js/data/day1.js` … `day5.js` | Los 25 casos (árboles de diálogo) |
| `assets/js/boot.js` | Pantalla de entrada (voz + palabras sincronizadas → logo) |
| `assets/js/data/products.js` | Foto de cada producto (por nombre) |
| `assets/img/products/` | Las 28 fotos de productos y `CREDITS.md` |
| `assets/js/sounds.js` | Las dos voces (entrada y botón Press!) y los efectos de sonido |
| `assets/audio/` | Copias de los sonidos ya recortados |
| `assets/img/` | Logo (versiones para la interfaz, la animación y el ícono de pestaña) |
| `assets/js/engine.js` | Reloj, "typing…", paciencia y puntuación |
| `assets/js/ui.js` | Toda la interfaz |
| `assets/css/app.css` | Estilos |

Para agregar un caso nuevo, copia uno existente en `dayN.js` y cambia sus textos.
Cada opción tiene `q` (3 excelente, 2 buena, 1 débil, 0 mala), `go` (siguiente paso),
`r` (reacción del cliente), `retry` (el cliente reclama y eliges otra vez) y `fb` (nota del coach).
