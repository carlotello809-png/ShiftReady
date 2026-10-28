# Sesiones de entrenamiento, dificultad e informe

Cómo funcionan la configuración por días, los tres niveles de dificultad, el informe de sesión
y la corrección de pistas en las respuestas. Código: `assets/js/session.js` (reglas, sin pantalla),
`assets/js/ui.js` (pantallas), `assets/js/engine.js` (`startDay(n, { pace, seed })`).

## 1. Sesión y selección de días

- Una **sesión** = los días elegidos, jugados uno tras otro con la misma dificultad. El motor sigue
  jugando un día cada vez; la sesión solo encadena los días y junta sus resultados.
- Pantalla de varios días (desde la tuerquita: «Play several days in a row»): casillas por día (con sus clientes, motivos, canal y
  habilidades), «Select all available», «Clear», tarjetas de dificultad y un resumen con días,
  clientes y orden. «Start session» solo se activa si `validateConfig` no da errores
  (al menos un día, días existentes y desbloqueados, sin repetidos, dificultad válida).
- Los días bloqueados siguen la regla de siempre (aprobar el día anterior o «Unlock all days»).
- Desde el lobby, «Start shift» crea una sesión de un solo día con los ajustes de la tuerquita (⚙).
- Tras cada día: «Continue to Day N», «Retry Day N» (reemplaza el resultado de ese día) o
  «End session · report». Al terminar el último día: «View session report».
- Si se sale a mitad de un día, ese día no puntúa; la sesión conserva los días terminados y se
  puede **continuar** desde «Session reports». Una sesión sin ningún día terminado no se guarda.

### Ajustes del turno (la tuerquita)

| Ajuste | Opciones | Qué hace |
| --- | --- | --- |
| Customers | 1 … todos los del día | Con menos, se eligen al azar (fijos para la sesión, por su semilla) y el primero llega al empezar; los demás mantienen su separación. Motor: `startDay(n, { scenarios: [ids] })`. |
| Difficulty | Easy · Intermediate · Hard | La tabla de abajo. En la pantalla de varios días se elige allí. |
| How fast customers reply | Auto · Fast ×0,6 · Normal ×1 · Slow ×1,5 | Reemplaza `pace.reply` de la dificultad; Auto la deja como está. |

«Use default settings» = Intermedio, todos los clientes, Auto. Un turno es **de práctica** (no
desbloquea días ni cambia la mejor puntuación; el informe no da aprobado/suspenso) si es Fácil, si
algún día tiene menos clientes de los que trae o si las respuestas son lentas. Rápidas sí cuentan
(es más presión). Las sesiones guardadas antes de estos ajustes siguen la regla anterior (solo
Fácil es práctica). Pruebas: `tests/session.test.js` («Ajustes del turno») y
`tests/engine-pace.test.js` («Turno más corto»).

## 2. Qué cambia realmente con la dificultad

Se usan solo variables que el motor ya tenía. Los 25 casos, sus respuestas y la puntuación son los
mismos en los tres niveles.

| | Fácil | Intermedio | Difícil |
| --- | --- | --- | --- |
| Pérdida de paciencia mientras esperan | ×0,6 | ×1 (la de siempre) | ×1,4 |
| Separación entre llegadas de clientes | ×1,5 | ×1 | ×0,6 (más chats a la vez) |
| Tiempo que tarda el cliente en contestar | ×1 | ×1 | ×0,75 (vuelven antes) |
| Notas del coach durante el turno | siempre | según el ajuste | ocultas hasta el informe |
| Cuenta para desbloquear días y mejor puntuación | no (práctica) | sí | sí |

Intermedio es exactamente la simulación anterior (todos los multiplicadores en 1), por eso el
registro de referencia del motor no cambia. Efectos medidos en las pruebas (`tests/session.test.js`):
las mismas respuestas valen lo mismo en los tres niveles (juego perfecto = 100 puntos por día);
con un agente que tarda 20 s por respuesta en el Día 4, Fácil 100 · Intermedio 96 · Difícil 84
(en Difícil se va un cliente); en el Día 5 coinciden más chats esperando a la vez en Difícil.

**Lo que la dificultad no puede hacer con los datos actuales:** cambiar el contenido de un caso
(clientes más exigentes, información incompleta, objeciones nuevas). Eso necesitaría versiones
escritas de cada caso por nivel. Hoy la complejidad del contenido la dan los propios días
(Día 1 Easy → Día 5 Expert), que se eligen en la configuración.

**Por qué Fácil es práctica:** con menos presión es más fácil llegar a 60. Para no cambiar lo que
significa aprobar un día, los resultados en Fácil no desbloquean días ni cambian la mejor puntuación
(el informe lo indica).

## 3. Informe de sesión

Todo sale de lo que el motor registra; no se estima nada.

- **Puntos**: suma de las puntuaciones de cada día (la fórmula de siempre) sobre 100 × días jugados,
  y su porcentaje.
- **Estado**: *Passed* si cada día incluido llega a 60 (el mismo criterio que ya tenía un día);
  *Not passed* si alguno no llega; *Incomplete · no pass/fail* si faltan días; *Practice · no pass/fail*
  en Fácil. No se añadió ningún umbral de aprobado nuevo.
- **Indicadores**: días y clientes completados frente a los incluidos, respuestas enviadas y su
  reparto por nota, calidad media, CSAT medio, códigos de cierre correctos, primera respuesta y
  respuesta media, clientes resueltos / sin resolver / que se fueron.
- **Gráficos**: puntos por día con la marca de 60 y reparto de las respuestas por nota (con la tabla
  por día como vista alternativa).
- **Fortalezas y áreas de mejora**: reglas fijas sobre esos indicadores (`INSIGHT` en `session.js`;
  solo eligen qué comentario mostrar, nunca cambian una nota) y la calidad media en los casos que usan
  cada política.
- **Errores y recomendaciones**: las respuestas con nota 0–1 (con la nota del coach y la mejor
  respuesta), los códigos de cierre erróneos y consejos ligados a lo anterior, con los puntos de la
  política correspondiente.
- **Contenido**: dificultad y lo que cambió, días y clientes incluidos, código de la sesión (semilla).
- Se guarda en memoria y en `sessionStorage`: sobrevive al cambio de pantalla y a recargar la
  pestaña, y se pierde al cerrarla. Sin cuentas ni servidor.

## 4. Pistas superficiales en las respuestas

**Antes:** en los 112 turnos con opciones, la mejor respuesta era siempre la más larga (elegir la más
larga daba el 100 % de calidad) y era casi la única que usaba el nombre del cliente.

**Criterio:** ninguna regla superficial («la más larga», «la segunda más larga», «la más corta»,
«la que usa el nombre», «la que no lo usa», «la que tiene !», «la que pide disculpas») debe acertar
la mejor respuesta claramente más que elegir al azar. Herramienta: `npm run patterns`.

**Cambios** (131 textos de opciones incorrectas en 101 turnos; ninguna respuesta correcta tocada,
ni notas, destinos, reacciones o notas del coach):

1. Opciones incorrectas más largas y verosímiles que **conservan su error** (dato falso, política
   incumplida, paso omitido o tono inadecuado), de modo que la nota del coach sigue siendo cierta.
2. Reequilibrio para que la mejor respuesta no tenga una posición fija por longitud: en unos turnos
   es la más larga, en otros la segunda y en otros la más corta.
3. El nombre del cliente se quitó de 36 opciones incorrectas para que no se convierta en la pista
   contraria.

**Resultado** (azar = 34 %): la más larga 38 %, la segunda 37 %, la más corta 27 %, con nombre 27 %,
sin nombre 34 %, con «!» 35 %, con disculpa 31 %. Queda «la que hace una pregunta» (47 %, igual que
antes): responde a destrezas reales del trabajo (pedir los datos de verificación, cerrar preguntando
si hay algo más), así que no se forzó.

**Orden en pantalla:** el motor ya barajaba las opciones en cada turno; ahora usa una semilla por
día de sesión (repetible). Cada opción conserva su nota, destino y reacción sea cual sea su posición
(`tests/answer-patterns.test.js`).

## 5. Registro de referencia del motor

Con los textos nuevos fallaron 5 de las 20 partidas de `tests/fixtures/engine-golden.json` («worst» de
cada día), solo en la huella completa: comparadas campo a campo, las únicas diferencias eran los textos
de las respuestas enviadas (202 campos: el mensaje del agente y la decisión registrada). Tiempos,
eventos, caminos, notas, paciencia, CSAT y puntos eran idénticos, y las otras 15 partidas coincidían
byte a byte. Con aprobación, se regrabó (`UPDATE_GOLDEN=1 npm test`): en el archivo cambiaron solo esas
5 huellas; los resúmenes de las 20 partidas y la semilla siguen iguales.
