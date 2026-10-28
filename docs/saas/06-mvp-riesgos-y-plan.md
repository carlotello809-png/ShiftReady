# 6. MVP, riesgos de compatibilidad y plan de implementación

## 6.1 MVP frente a funciones futuras

| Área | MVP (primera versión) | Fase 2 | Futuro |
|---|---|---|---|
| **Acceso** | Inicio de sesión, recuperación, invitaciones, selector de espacio, estados de cuenta, dos pasos para administradores | Solicitud de acceso con seguimiento | SSO (SAML/OIDC), aprovisionamiento SCIM, autoservicio con prueba |
| **Plataforma (superadmin)** | Alta y suspensión de empresas, invitación del primer administrador, búsqueda de usuarios, límites de plan, auditoría, acceso de soporte | Uso y límites detallados, tickets de soporte | Facturación y pagos, integraciones, exportaciones |
| **Personas** | Directorio, equipos, roles, invitaciones, desactivación | Importación CSV | Grupos dinámicos, SCIM |
| **Formación** | Campañas con el asistente de 6 pasos usando los **días, dificultades y ajustes reales** del simulador; biblioteca estándar en lectura; configuración por defecto | Duplicar y plantillas de campaña, recordatorios | Editor de escenarios, escenarios y documentos propios por empresa, rúbricas, voz, IA |
| **Simulación** | Simulador actual lanzado en modo foco con parámetros; resultado enviado al servidor y recalculado | Reanudar una sesión interrumpida en otro dispositivo | Simulación por voz |
| **Resultados** | Informe de sesión (el actual), historial, progreso por campaña y por equipo, revisión de conversaciones | Análisis de errores, fortalezas y mejoras de equipo, recomendaciones por reglas, informe por escenario | Exportación CSV/PDF, comparativas avanzadas, recomendaciones con IA |
| **Cuenta** | Perfil, preferencias (tema, sonido), contraseña, privacidad | Notificaciones por correo | Descarga de datos personales |

### Indicadores: qué existe hoy y qué necesita servidor

| Ya lo calcula el motor, **por sesión** (etiqueta «Motor actual») | Necesita servidor e historial (etiqueta «Requiere backend») |
|---|---|
| Puntos, estrellas y aprobado por día (≥ 60) | Historial entre dispositivos |
| CSAT simulado por chat y medio | Medias entre sesiones o entre personas |
| Calidad de las respuestas (Excelente/Buena/Mejorable/Mala) | Tendencias semanales y comparación entre periodos |
| Chats resueltos, sin resolver y abandonados | Progreso de campañas y cumplimiento de fechas |
| Acierto en los códigos de cierre | Uso por empresa, puestos ocupados |
| Tiempo de primera respuesta y medio | Auditoría, notificaciones, exportaciones |
| Decisiones con su valoración, nota y mejor respuesta | Frecuencia de errores en un equipo |
| Fortalezas, áreas de mejora y consejos del informe (`buildReport`) | Recomendaciones asignadas por un coach |

**Nada de la columna derecha existe todavía.** En el prototipo esos valores son demostrativos.

## 6.2 Riesgos de compatibilidad con el simulador

| # | Riesgo | Impacto | Propuesta |
|---|---|---|---|
| 1 | **El simulador ocupa toda la pantalla** y en el móvil se gira a horizontal | No cabe dentro del armazón con barra lateral | Abrirlo en **modo foco** (ruta propia sin armazón) con un botón claro para volver. No meterlo en un `iframe` en el MVP |
| 2 | **El progreso vive en el navegador** (`localStorage` `shiftready.v1`, `sessionStorage`) | Se pierde al cambiar de dispositivo; no lo ve el coach | Guardar sesiones y resultados en el servidor. Al conectar la cuenta, ofrecer importar el progreso local una sola vez (marcado como «no verificado») |
| 3 | **La puntuación se calcula en el cliente** | Un usuario podría enviar resultados falsos | El cliente envía la configuración, la semilla y el **registro de decisiones con marcas de tiempo**; el servidor **vuelve a ejecutar** el motor (`engine.js` y `session.js` ya funcionan en Node, como prueban los tests) y guarda su propio resultado. Los indicadores de tiempo dependen del reloj: el servidor debe validar que las marcas sean plausibles |
| 4 | **Desbloqueo por días** (aprobar el día anterior) frente a **asignación por campaña** | Una campaña puede pedir el Día 4 a alguien sin el Día 3 | En campañas, los días permitidos los da la campaña (`isUnlocked` de `validateConfig` recibe esa lista). El desbloqueo secuencial queda para la práctica libre |
| 5 | **Reglas de práctica**: Fácil, menos clientes o respuestas lentas convierten la sesión en práctica (no cuenta) | Una campaña en Fácil o con menos clientes generaría sesiones «de práctica» | **Decidido:** en campañas cuentan para completar, pero no cambian los mejores resultados |
| 6 | **Semilla y clientes por día**: con menos clientes, quién entra depende de la semilla | Dos agentes de la misma campaña podrían ver casos distintos | **Decidido:** la semilla se guarda por campaña y todas las personas ven los mismos clientes |
| 7 | **Contenido de una sola empresa ficticia** (Lumen & Co.), en inglés y dentro del código (`assets/js/data/day*.js`) | No hay escenarios por empresa ni traducción | Tratarlo como **biblioteca estándar** de ShiftReady. Los escenarios propios requieren un modelo de datos y un editor (Futuro) |
| 8 | **Versionado del contenido** | Si se edita un caso, los resultados antiguos dejan de cuadrar | Guardar con cada resultado la versión del contenido y del motor |
| 9 | **Espacio de nombres global `SR`** y scripts clásicos sin empaquetar | Choques al integrar con la plataforma | Mantener el simulador como página independiente; la plataforma solo intercambia parámetros y resultados. El prototipo ya convive leyendo `SR` en solo lectura |
| 10 | **Peso de la carga**: el simulador carga los 5 días, imágenes y ~400 KB de sonidos | El armazón sería lento si cargara el simulador | La plataforma no carga recursos del simulador hasta abrir el modo foco |
| 11 | **Preferencias** (tema, sonido, voz) en `shiftready.v1` | Se pierden entre dispositivos | Moverlas al perfil y pasarlas al simulador al abrirlo |
| 12 | **Datos personales y rendimiento** | Los resultados de formación pueden usarse en evaluaciones laborales | Política de retención, visibilidad mínima (la persona, su coach y los administradores), registro de quién revisa conversaciones, exportación y borrado a petición |
| 13 | **Idioma**: la plataforma se propone en español y el simulador está en inglés | Experiencia mezclada | **Decidido:** interfaz en español e inglés; el contenido estándar sigue en inglés hasta tener traducción |

### Contrato propuesto entre plataforma y simulador

```
Entrada (al abrir el modo foco):
  campaña, días, dificultad, clientes por día, velocidad de respuesta, semilla,
  versión de contenido, preferencias (tema, sonido), idioma
Salida (al terminar o abandonar):
  configuración usada, semilla, registro de decisiones con marcas de tiempo,
  códigos de cierre, informe calculado en el cliente (solo para mostrar al momento)
El servidor recalcula y su resultado es el que se guarda y se muestra después.
```

El simulador **no cambia sus reglas, escenarios ni puntuación** para esto; solo necesita aceptar parámetros de entrada y emitir el registro de la sesión.

## 6.3 Orden de implementación recomendado

Cada etapa se puede revisar por separado. Ninguna empieza sin aprobación.

| Etapa | Contenido | Por qué en este orden |
|---|---|---|
| **0. Decisiones y base visual** ✓ | Decisiones cerradas (6.4). Colores, tipografía, espaciado y forma comunes en [`assets/css/tokens.css`](../../assets/css/tokens.css), que el prototipo ya usa. Falta que el simulador lo adopte cuando se confirmen sus cambios en curso | Evita rehacer pantallas |
| **1. Base del servidor (Supabase)** · en curso | **Hecho:** proyecto `shiftready-dev`; migración en [`supabase/`](../../supabase/README.md) con 19 pruebas sin conexión, **aplicada y comprobada el 28 oct 2026**. **Falta:** asignar el primer superadministrador (necesita la pantalla de dos pasos de la etapa 2). Contenido: proyecto de Supabase; tablas de empresas, personas, pertenencias, equipos, invitaciones y auditoría; reglas por fila (RLS) para aislar empresas y comprobar roles; cuentas con correo y contraseña y dos pasos para administradores. Alta de empresas con un script interno | Todo lo demás depende de saber quién es quién y qué puede hacer |
| **2. Acceso y armazón** · en curso | **Hecho (28 oct 2026):** app real en [`app/`](../../app/README.md) conectada a shiftready-dev: acceso, cuenta, recuperación, dos pasos, invitaciones, selector de espacio, estados de cuenta, barra lateral por rol y herramientas mínimas (empresas, equipos, invitaciones, auditoría). **También hecho:** primer superadministrador asignado (carlotello809@gmail.com, «arranque inicial», con dos pasos y registro en auditoría). **Falta:** probar el circuito con una empresa y personas de prueba | Primera experiencia de todos los roles |
| **3. Flujo del agente** | Entrenamientos, configuración, lanzamiento del simulador con parámetros, envío del resultado y recálculo en una función de Supabase con `engine.js` y `session.js`, historial e informe | Es la parte **más arriesgada** (integración con el simulador); conviene validarla pronto, con campañas de ejemplo cargadas por script |
| **4. Supervisor / coach** | Resumen del equipo, participantes, progreso, resultados, revisión de conversaciones | Usa los resultados que produce la etapa 3 |
| **5. Administrador de empresa** | Directorio, equipos, invitaciones, asistente de campañas, biblioteca en lectura, informes | Sustituye los scripts de la etapa 3 por herramientas propias |
| **6. Consola del superadministrador** | Empresas, usuarios, límites, auditoría, acceso de soporte | Hasta aquí basta con herramientas internas |
| **7. Fase 2** | Análisis de errores, fortalezas de equipo, recomendaciones por reglas, uso detallado, informe por escenario, tickets | Mejoras sobre datos ya existentes |
| **8. Futuro** | SSO/SCIM, editor de escenarios, documentos propios, voz, IA, exportaciones, facturación, integraciones | Dependen de decisiones de negocio y proveedores |

## 6.4 Decisiones tomadas (27 de octubre de 2026)

La propuesta se aprobó y estas decisiones quedan cerradas para la implementación.

| # | Tema | Decisión |
|---|---|---|
| 1 | Alta de empresas | **La gestiona ShiftReady**: la empresa solicita acceso, ShiftReady la valida, la crea e invita a su primer administrador |
| 2 | Tecnología del servidor | **Supabase**: PostgreSQL, cuentas y reglas por fila (RLS) para aislar a cada empresa; la puntuación se recalcula en una función del servidor. El sitio sigue siendo estático |
| 3 | El coach invita agentes | **Sí**, solo agentes y solo a sus equipos |
| 4 | El coach crea campañas | **Crea y publica** campañas para sus equipos. Si la campaña incluye equipos que no supervisa, se envía **como propuesta** y la publica un administrador (así se combinan las dos opciones elegidas) |
| 5 | Acceso a transcripciones | Los coaches ven **siempre** las conversaciones de sus equipos; los administradores, las de toda la empresa. Cada revisión queda registrada |
| 6 | Práctica libre | Configurable por empresa, activada por defecto |
| 7 | Fácil o ritmo reducido en campañas | Cuentan para completar la campaña; no cambian los mejores resultados |
| 8 | Nota de aprobado | Fija en 60 en el MVP; configurable por campaña más adelante, sin cambiar el motor (se compara el resultado con otra nota) |
| 9 | Semilla de las campañas | La misma para todas las personas de una campaña, para que los resultados sean comparables |
| 10 | Esquinas | 2 px. *Corrección:* el simulador usa hoy 0 px (no 2 px como decía la propuesta); la diferencia apenas se ve |
| 11 | Responsable de la facturación | El propietario de la cuenta (precios y pagos siguen fuera de esta fase) |
| 12 | Retención de datos | Configurable por empresa, con un máximo |
| 13 | Acceso de soporte | Aprobación de la empresa cuando se vean datos personales; siempre con motivo, tiempo limitado y auditoría |
| 14 | Idiomas | Interfaz en español e inglés; contenido estándar en inglés hasta tener traducción |
| 15 | Precios y planes | Fuera de esta fase |

### Qué falta decidir más adelante
- Región de los datos (se elige al crear el proyecto de Supabase).
- Duración máxima de la retención y plazos de borrado.
- Si en el futuro habrá autoservicio para crear empresas.
