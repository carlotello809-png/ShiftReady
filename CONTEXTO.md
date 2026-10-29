# ShiftReady — contexto para continuar (actualizado 29 oct 2026)

Léelo al empezar un chat nuevo. Resume qué es el proyecto, dónde está cada cosa, qué está hecho y qué falta.

## Qué es
Plataforma SaaS para **entrenar agentes de atención al cliente** con un simulador de chats (clientes simulados, respuestas con nota, informe al final). Empresas clientes → equipos → coaches → agentes. Sitio estático (HTML/CSS/JS, sin compilación) + **Supabase** (base de datos, cuentas, funciones).

## Enlaces
- **Sitio (un solo enlace):** https://carlotello809-png.github.io/ShiftReady/ — simulador + chat «Crear entrenamiento» a la izquierda + botón **Ingresar** al final de la página.
- **Cuentas:** el botón Ingresar abre `/app/` (mismo sitio).
- **Repositorio:** github.com/carlotello809-png/ShiftReady — rama de trabajo `plataforma-saas-etapas-0-2`, publicada en `main` (GitHub Pages publica `main`).
- **Supabase:** proyecto `shiftready-dev` (https://euusjtfndzlvxrpimwkq.supabase.co). Clave pública en `app/config.js`. La clave secreta nunca va al código.
- **Local:** `python -m http.server 5178 --bind 127.0.0.1` → http://localhost:5178/

## Dónde está cada cosa
| Carpeta / archivo | Qué es |
|---|---|
| `index.html`, `assets/js/` (`engine.js`, `session.js`, `ui.js`, `data/day1-5.js`) | Simulador original (motor, 25 casos, 19 políticas). No cambiar reglas ni puntuación |
| `assets/js/data/calls.js` | 6 llamadas telefónicas (nivel 1 = días 1–2, nivel 2 = día 3, nivel 3 = días 4–5) para el modo «Chats + calls» |
| `assets/audio/` | Voces de ElevenLabs: `tour-1..7.mp3` (tour del Día 1), `report-good/ok/bad.mp3` (informe), `ringtone.mp3` (timbre, 5 tonos = 20 s) |
| `assets/js/train-chat.js`, `assets/css/train-chat.css` | Chat «Crear entrenamiento» de la portada (prompt + archivos → propuesta de días reales; botón IA) |
| `app/` (`app.js`, `app.css`, `config.js`) | Plataforma con cuentas: acceso, 2 pasos, invitaciones, empresas, equipos, campañas, entrenamientos, historial |
| `assets/css/tokens.css`, `assets/css/platform.css` | Sistema de diseño de la plataforma |
| `supabase/migrations/` | Base de datos (ya aplicadas en shiftready-dev, en orden) |
| `supabase/functions/` | `verify-session` (verifica partidas) y `generate-training` (IA con Claude) |
| `supabase/tests/` | 34 pruebas de base de datos (`cd supabase/tests && npm test`) |
| `tools/` | Validador de escenarios y generadores de las funciones |
| `docs/saas/` | Diseño aprobado, roles, permisos, decisiones (06 §6.4) y plan por etapas |
| `prototype/` | Prototipo de diseño con datos de demo (solo referencia) |

Pruebas: `npm test` (255: simulador + llamadas y voz en `tests/calls.test.js`) y `npm run validate` (escenarios y llamadas).

## Roles
- **Superadmin:** carlotello809@gmail.com (con verificación en dos pasos). Consola de plataforma: crea y suspende empresas, auditoría.
- **Administrador de empresa:** también carlotello809@gmail.com en «Empresa de prueba». Invita gente, equipos, campañas.
- **Coach:** crea campañas para sus equipos (con asistente: prompt + archivos) y las asigna a equipos o agentes concretos.
- **Agente:** «Mis entrenamientos», entrena en el simulador, historial.
- Invitaciones: generan un enlace para copiar (aún no hay correo automático). Para cuentas de prueba: Supabase → Authentication → Users → Add user (Auto Confirm).

## Hecho
- Diseño aprobado (docs/saas), etapas 0 a 3: base de datos con seguridad por empresa, app de acceso, campañas, sesiones del simulador guardadas y verificadas por el servidor.
- Un solo enlace con «Ingresar» al final de la portada.
- Chat de entrenamiento en la portada y asistente de campañas para coaches.
- IA con Claude **preparada pero sin conectar** (falta crédito en Anthropic y la clave `ANTHROPIC_API_KEY` en Supabase → Edge Functions → Secrets). Sin cuenta: 1 día de prueba; con cuenta: 15/día; 150/día el sitio.
- Retoques visuales y animaciones (solo opacity/transform); portada y bienvenida solo con logo.
- **Llamadas (modo «Chats + calls»), activado por defecto** (se puede cambiar en la tuerquita → Channels). La llamada entra deslizándose por la izquierda en la lista y por el borde derecho con la tarjeta «Incoming call» + timbre; contestar con el botón o la tecla A; si no contestas en 20 s se pierde. Al contestar se abre la **pantalla de llamada** (sin chat): foto grande con anillos cuando el cliente habla, subtítulos palabra por palabra (botón CC) y la voz del navegador (elige la voz más natural instalada). **Se contesta en voz alta**: en tu turno el micrófono escucha solo, compara lo que dijiste con las respuestas y envía la que dijiste, con su «% clear» (claridad). Si no entiende, el cliente dice «Sorry, could you repeat that?». Sin micrófono, sin permiso o en otro navegador (no Chrome/Edge), se elige con clic. Mientras hablas, el cliente no pierde paciencia. Hold / tecla H. Las llamadas cuentan en la nota como un chat (perdida = cliente que se fue); el informe muestra «Phone calls» con «Speaking clarity» y lo que dijiste en cada respuesta. Para probar sin micrófono: en la consola, `SR.voice.hear('texto')`.
- **Clientes de chat más pausados por día** (solo en el simulador): tardan ~1 minuto en el Día 1, 52 s, 45 s, 38 s y ~30 s en el Día 5 (`replyIn` de cada día en `data/company.js`). Las campañas de la plataforma siguen con el ritmo de antes para que el servidor las verifique igual.
- **Voces automáticas, sin botón:** cada paso del tour del Día 1 pone su audio al aparecer («Continue» corta el anterior y pone el siguiente); el informe pone el mensaje del coach según la nota (75+ bien, 60–74 regular, <60 mal) y lo muestra escrito. El interruptor Sound las apaga.
- Arreglado: la pantalla de bienvenida se quedaba trabada (no se podía cerrar) por un elemento quitado en el cambio anterior.

## Pendiente / ideas
1. **Llamadas en las campañas de la plataforma** (`/app/`): hoy solo están en el simulador público. Para usarlas en campañas, el servidor que verifica la nota (`verify-session`) tendría que repetir también contestar/espera.
2. Optimizar la velocidad de carga (medir primero).
3. Verificación en dos pasos: hacerla opcional para administradores de empresa (propuesto; obligatoria solo para superadmin).
4. Correo automático (Brevo) para invitaciones y confirmación de cuentas.
5. Guardar los archivos subidos (hoy solo se guardan sus nombres) y que la IA genere casos nuevos al tener crédito.
6. Cobros y planes de pago, dominio propio.

## Preferencias del usuario
- Habla español; explicaciones simples y paso a paso.
- Commits sin atribución de IA (sin "Co-Authored-By").
- Pide permiso antes de cambios grandes en el motor o la puntuación.
