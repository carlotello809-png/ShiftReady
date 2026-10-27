# Fase 0 — El motor de ShiftReady por dentro

Referencia técnica del motor de simulación (`assets/js/engine.js`) tal como funciona hoy,
de lo que cubren las pruebas y de lo que se cambió en esta fase. Todo lo descrito se comprobó
en el código y en las pruebas automáticas (`npm test`).

## 1. Carga de scripts

`index.html` carga scripts clásicos (sin módulos) en este orden, y todos comparten el objeto global `window.SR`:

| Orden | Archivo | Qué deja en `SR` |
| --- | --- | --- |
| 1 | `sounds.js` | `SR.sounds` (audio en base64) |
| 2 | `boot.js` | `SR.boot` (pantalla de entrada) |
| 3 | `icons.js` | `SR.icon` |
| 4 | `data/company.js` | `SR.data` (empresa, días, tipos de cliente, códigos de cierre, políticas) y `SR.scenario()` |
| 5–9 | `data/day1.js` … `day5.js` | Cada caso se registra con `SR.scenario({...})` en `SR.data.scenarios` |
| 10 | `data/products.js` | `SR.data.products` |
| 11 | `engine.js` | `SR.engine` (el motor de la página) y `SR.createEngine` |
| 12 | `ui.js` | Lee todo lo anterior; asigna `SR.engine.settings` y `SR.engine.hooks` |

`company.js` debe ir antes que los días (define `SR.scenario`), y el motor después de los datos
(lee `SR.data` al crearse). La prueba `tests/data.test.js` comprueba este orden.

## 2. API pública del motor

| Función / propiedad | Entrada | Efecto / salida |
| --- | --- | --- |
| `startDay(n, { pace, seed })` | número de día; opcional: multiplicadores de ritmo y semilla | Crea `E.st` (estado del turno) y programa las llegadas a `1,2 s + arrive`. Sin opciones, todo como antes. Ver `docs/sesiones-y-dificultad.md`. Emite `start`. |
| `tick()` | — | Avanza el reloj del juego con el tiempo real transcurrido (máx. 500 ms por llamada), procesa la cola de eventos y la paciencia. El navegador lo llama cada 100 ms. |
| `setPaused(p)` | booleano | Congela o reanuda el reloj. No hace nada sin turno o con el turno terminado. Emite `pause`. |
| `select(id, i)` | chat, índice de opción | Marca la opción (`c.selected`) si es el turno del agente y no se usó. |
| `send(id, i)` | chat, índice de opción **en el archivo del caso** | Envía la respuesta. Devuelve `true`, o `false` si no es el turno, el índice no existe o la opción ya se usó. |
| `wrapUp(id, code)` | chat, código de cierre | Cierra un chat terminado; si es el último, termina el turno y emite `dayEnd` con el informe. |
| `report()` | — | Informe del turno (ver §4). Requiere un turno activo. |
| `liveStats()` | — | `{ total, open, waiting, closed, csat }` o `null` sin turno. |
| `get(id)` | chat | La conversación o `null`. |
| `quit()` | — | Borra el turno (`E.st = null`). |
| `fill(text, c)` | texto, chat | Sustituye `{agent}` (nombre de pila del agente) y `{first}` (nombre del cliente). |
| `replyIn(c)` | chat | Segundos que tarda ese cliente en contestar (`caso.replyIn` → `persona.replyIn` → 15). |
| `st`, `activeId`, `settings`, `hooks`, `lastTs` | — | Estado que la interfaz lee o asigna directamente. |

**Eventos (`hooks`)** que el motor emite hacia la interfaz: `start`, `arrive`, `message`, `typing`,
`status`, `turn`, `end`, `closed`, `angry`, `tick`, `pause`, `dayEnd`.

## 3. Una respuesta del agente: entradas y salidas

Entrada: `send(id, i)` durante el turno del agente (`c.status === 'agent'`).

Salida, en este orden:

1. Mensaje del agente (con `{agent}` y `{first}` sustituidos) y nota del coach `{ from: 'coach', q, text: fb }`.
2. Decisión registrada: `{ prompt, chosen, q, fb, best, rt }` (`prompt` = último mensaje del cliente o `''`
   si es un seguimiento; `best` = texto de la mejor opción o `null` si se eligió la mejor; `rt` = ms de espera).
3. Paciencia: `+10 / +5 / −4 / −12` según `q` 3/2/1/0, entre 0 y 100. Si llega a 0, el cliente se va.
4. Destino, en este orden de prioridad:
   - `end` → el cliente reacciona (`r`) y el chat termina con ese resultado;
   - `retry: true` → el cliente reclama (`r`), la opción desaparece y el agente vuelve a elegir en el mismo nodo (el resto conserva su orden);
   - `go` → el cliente reacciona (`r`) y se pasa al nodo indicado, que vuelve a mostrar todas sus opciones (por eso los ciclos funcionan).

Estados de una conversación: `pending` (no llegó) → `customer` (el cliente escribe) ⇄ `agent` (espera al agente)
→ `ended` (terminó; falta el código de cierre) → `closed`.

## 4. Reglas de puntuación (sin cambios en esta fase)

- **Paciencia mientras espera al agente:** baja `día.decay × persona.decay × caso.decay` puntos por segundo.
  Avisos del cliente al bajar de 60, 35 y 15; alarma de enojo al cruzar 20; a 0 el cliente se va.
- **Calidad (accuracy):** suma de `q` / (3 × respuestas). Sin respuestas = 0.
- **CSAT:** cliente que se fue = 1 · sin resolver = 2 si calidad ≥ 0,6, si no 1 ·
  resuelto: `s = 0,7 × calidad + 0,3 × paciencia/100` → ≥ 0,88: 5 · ≥ 0,72: 4 · ≥ 0,55: 3 · ≥ 0,38: 2 · resto 1.
- **Código de cierre correcto:** el `disp` del final (nodo u opción) o el del caso si el chat se resolvió;
  `no-resolution` en cualquier otro caso.
- **Puntos del turno:** `round(45 × (CSAT medio − 1)/4 + 30 × calidad media + 15 × % resueltos + 10 × % códigos correctos)`.
  Estrellas: ≥ 90 tres, ≥ 75 dos, ≥ 60 una. Se aprueba con 60.
- El tiempo de respuesta se informa (primera respuesta y media) pero solo resta a través de la paciencia.

## 5. Pausa, reintento y salida

- **Pausa:** con `setPaused(true)` el reloj no avanza, la paciencia no baja y no llega ningún mensaje;
  al reanudar no se cuenta el tiempo en pausa. La interfaz pausa con `P`, durante el tutorial del Día 1,
  con el teléfono en vertical y cuando la pestaña queda oculta.
- **Reintento de una respuesta:** opciones `retry` (ver §3).
- **Repetir el día:** `startDay(n)` de nuevo crea un estado limpio; los eventos pendientes del intento anterior se descartan.
- **Salir:** `quit()`; las demás funciones dejan de actuar sin fallar (salvo `report()`, que la interfaz no llama sin turno).

## 6. Lo que impedía probar el motor automáticamente

| Efecto lateral (antes) | Cómo se resuelve ahora |
| --- | --- |
| Exigía `window.SR` al cargarse | En Node se usa `createEngine({ data })`; las pruebas también cargan los archivos tal cual en un contexto `vm` que imita al navegador (`tools/browser-sandbox.js`). |
| Arrancaba `setInterval(E.tick, 100)` al cargarse, sin poder detenerlo | Solo en el navegador. En Node no se crea ningún temporizador; las pruebas mueven el reloj a mano en pasos de 100 ms. |
| Reloj real (`performance.now()`) | Se puede pasar `now` a `createEngine`; por defecto sigue siendo `performance.now()`. |
| Azar real (`Math.random()`): orden de opciones y tiempos | Se puede pasar `random`; las pruebas usan una semilla fija. |
| Un único motor global (`SR.engine`) | `createEngine()` crea motores independientes; el navegador sigue usando uno solo. |
| Las excepciones de eventos y hooks solo van a la consola | Las pruebas fallan si hay cualquier `console.error`, y el validador detecta los datos que las provocan. |

## 7. Separación realizada

`engine.js` envuelve su código en `createEngine(opts)` y al final hace lo mismo que antes:

```js
// navegador
SR.engine = createEngine({ data: SR.data });
setInterval(SR.engine.tick, 100);
// Node.js
const { createEngine } = require('./assets/js/engine.js');
const engine = createEngine({ data, now: () => miReloj, random: miAzar });
```

Cambios de lógica: ninguno. Ignorando la sangría, el diff son 30 líneas añadidas y 11 quitadas: la cabecera,
la creación del objeto, 2 llamadas a `Math.random()` → `random()`, 2 a `performance.now()` → `readClock()` y el `setInterval`,
que pasa al final. `ui.js` no cambió. La prueba `golden` comprueba que 20 turnos completos producen exactamente los
mismos mensajes, tiempos, eventos y puntuaciones que antes del cambio, y `engine-node.test.js` que la versión Node da
el mismo resultado exacto que la del navegador.

Los archivos de datos (`data/*.js`) siguen necesitando `window`: en Node se cargan con `tools/browser-sandbox.js`.

## 8. Comportamientos observados que no se modificaron

- La paciencia empieza a bajar en el mismo tick en que empieza el turno del agente (hasta 100 ms antes de lo que marca el cronómetro).
- Si `performance.now()` valiera exactamente 0 al empezar el turno, el primer tick no contaría tiempo (`E.lastTs || now`). En el navegador no ocurre.
- Un `go` a un nodo inexistente termina el chat como **resuelto** sin avisar al jugador (solo un mensaje en consola).
- Un nodo sin opciones ni final deja el chat bloqueado: el agente recibe el turno pero `send()` lanza una excepción.
- Una `q` fuera de 0–3 convierte la paciencia en `NaN` y el cliente nunca se va.
- La calidad se mide contra 3 por respuesta, no contra la mejor opción disponible. Hoy todos los nodos tienen una opción con `q = 3`, así que no influye.
- La puntuación se calcula en el navegador: un usuario puede alterarla. Para una plataforma empresarial, el servidor deberá recalcularla.
- El validador repite listas que viven en `ui.js` y `app.css` (canales, resultados, prioridades). Si cambian allí, hay que actualizarlo.

## 9. Pruebas

| Archivo | Qué comprueba |
| --- | --- |
| `tests/data.test.js` | Los 25 casos cargan (3-4-5-6-7 por día), ids únicos, referencias entre nodos, nodos alcanzables, orden de carga en `index.html`, validador por línea de comandos. |
| `tests/validator.test.js` | Cada tipo de error y de advertencia con un caso roto a propósito; ciclos con salida = advertencia; y, ejecutando el motor, que los "errores" rompen de verdad un chat. |
| `tests/scoring.test.js` | CSAT, calidad, paciencia y puntos con valores calculados a mano, incluidos los bordes de cada nivel de CSAT. |
| `tests/engine.test.js` | Entradas y salidas de cada respuesta, reintentos, ciclos, paciencia, avisos, enojo, abandono, pausa, cierre, fin del turno, repetir el día, salir y efectos de carga. |
| `tests/scenarios.test.js` | Los 25 casos jugados enteros: juego perfecto = 100 puntos cada día; sin responder = 10; juego pésimo no aprueba; dos recorridos trazados a mano; 60 partidas aleatorias sin bloqueos. |
| `tests/golden.test.js` | Registro de referencia (`tests/fixtures/engine-golden.json`) de 20 turnos completos. |
| `tests/engine-node.test.js` | El motor usado desde Node: sin `window`, sin temporizadores, motores independientes y mismo resultado exacto que en el navegador. |

Para comprobar que las pruebas no se limitan a repetir el código, se alteraron a propósito 12 reglas en una copia del motor
(valores de paciencia, umbrales de avisos, enojo y CSAT, pesos de la puntuación, estrellas, aprobado, orden tras un reintento,
código esperado sin resolver, tope de espera). Cada alteración hizo fallar al menos una prueba.
