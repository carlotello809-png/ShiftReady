# ShiftReady SaaS: propuesta de UX/UI y arquitectura de navegación

> **Estado (27 oct 2026):** propuesta **aprobada**. Etapa 0 terminada: decisiones cerradas ([6.4](06-mvp-riesgos-y-plan.md#64-decisiones-tomadas-27-de-octubre-de-2026)) y valores visuales comunes en `assets/css/tokens.css`. Etapa 1: base de datos aplicada en `shiftready-dev` ([`supabase/`](../../supabase/README.md)). Etapa 2: app real de acceso en [`app/`](../../app/README.md). Etapa 3 hecha: sesiones del simulador guardadas en el historial y verificadas por el servidor.
> Todavía no hay pantallas conectadas, autenticación en uso, pagos ni IA. El simulador actual (`index.html`) no se ha tocado y sigue funcionando igual.

Esta carpeta describe cómo pasar del simulador de un solo usuario a una plataforma para empresas con cuatro roles: superadministrador, administrador de empresa, supervisor/coach y agente. Junto a los documentos hay un **prototipo navegable** con datos demostrativos.

## Documentos

| # | Documento | Qué contiene |
|---|---|---|
| 1 | [Navegación y pantallas](01-navegacion-y-pantallas.md) | Mapa de navegación, inventario de pantallas y estructura del panel de cada rol |
| 2 | [Roles y permisos](02-roles-y-permisos.md) | Matriz de permisos (global, empresa, equipo y personal) y reglas de seguridad |
| 3 | [Acceso e invitaciones](03-acceso-e-invitaciones.md) | Registro, invitación, inicio de sesión, estados de una persona y cómo se asigna el superadministrador |
| 4 | [Sistema de diseño](04-sistema-de-diseno.md) | Tokens visuales, componentes reutilizables y sus reglas de uso |
| 5 | [Wireframes](05-wireframes.md) | Esquemas de las pantallas principales y su ruta en el prototipo |
| 6 | [MVP, riesgos y plan](06-mvp-riesgos-y-plan.md) | MVP frente a funciones futuras, riesgos de compatibilidad con el simulador, orden de implementación y decisiones tomadas |

## Cómo ver el prototipo

El prototipo vive en [`prototype/`](../../prototype/) y no modifica el simulador: solo **lee** sus archivos compartidos (logo, iconos, los 25 casos reales, las 19 políticas y las reglas de sesión de `session.js`).

1. Desde la carpeta del proyecto, inicia un servidor local:

   ```bash
   python -m http.server 5178 --bind 127.0.0.1
   ```

   (En la app de escritorio también sirve la vista previa llamada **shiftready**.)
2. Abre `http://localhost:5178/prototype/`.
3. Usa el selector **Vista de revisión** de la franja amarilla superior para cambiar entre Acceso, Superadministrador, Administrador de empresa, Supervisor/coach y Agente.

> El selector de la franja amarilla existe **solo para revisar el diseño**. En el producto real nadie elige su rol: lo asigna la organización (o, para el superadministrador, un procedimiento interno). Ver [Roles y permisos](02-roles-y-permisos.md).

### Qué es real y qué es demostrativo

| En el prototipo | Origen |
|---|---|
| Los 25 escenarios, sus días, canales, tipos de cliente y políticas | **Real**, leído del simulador (etiqueta verde «Contenido real») |
| Niveles de dificultad, clientes por día, velocidad de respuesta y validación de la configuración | **Real**, `session.js` (`DIFFICULTIES`, `REPLY_SPEEDS`, `validateConfig`) |
| Textos y notas de las respuestas en «Análisis de errores» y «Revisión de conversaciones» | **Real** (caso `d1-daniel` y otros) |
| Empresas, personas, equipos, campañas, puntuaciones, tendencias, auditoría, tickets | **Demostrativo** (etiqueta «Demo»), en `prototype/demo-data.js` |
| Indicadores con la etiqueta «Motor actual» | El simulador ya los calcula **por sesión**; el valor mostrado es demostrativo |
| Indicadores con la etiqueta «Requiere backend» | Necesitan servidor e historial (medias entre sesiones o personas, tendencias, uso) |
| Integraciones, SSO, voz, IA, documentos propios, exportaciones | **Futuro**: se muestran desactivadas y nunca como «conectadas» |

## Archivos de esta propuesta

Solo se crearon archivos nuevos; no se modificó ningún archivo existente.

```
assets/css/
  tokens.css     valores visuales comunes (prefijo --sr-); el simulador aún no lo carga
  platform.css   sistema de diseño de la plataforma: tokens semánticos y componentes
prototype/
  index.html     entrada del prototipo (carga en solo lectura los scripts compartidos del simulador)
  proto.js       enrutador, armazón por rol y las ~60 pantallas
  demo-data.js   datos demostrativos (todo inventado)
docs/saas/
  README.md y los documentos 01 a 06
```
