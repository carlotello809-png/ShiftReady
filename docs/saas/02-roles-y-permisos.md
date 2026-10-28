# 2. Roles y permisos

## 2.1 Roles

| Rol | Ámbito | Cómo se obtiene | Quién lo puede retirar |
|---|---|---|---|
| **Superadministrador** | Toda la plataforma | Procedimiento interno de ShiftReady: solicitud escrita, aprobación de **dos** responsables, verificación en dos pasos obligatoria y registro en auditoría. Nunca desde un formulario. | Otro superadministrador, con el mismo procedimiento |
| **Soporte ShiftReady** *(opcional, interno)* | Plataforma, solo lectura | Igual que el anterior, con menos permisos | Superadministrador |
| **Administrador de empresa** | Una empresa | El primero lo invita ShiftReady al dar de alta la empresa; los siguientes, otro administrador de esa empresa | Otro administrador de la empresa (nunca el último) |
| **Supervisor / coach** | Los equipos que tenga asignados | Invitación o cambio de rol hecho por un administrador | Administrador de la empresa |
| **Agente** | Sus propios datos | Invitación de un administrador o de un coach de su equipo | Administrador de la empresa |

Una persona puede tener **roles distintos en empresas distintas** (por ejemplo, administradora en una y coach en otra). El rol siempre se evalúa **dentro del espacio de trabajo activo**.

## 2.2 Matriz de permisos

Leyenda: **✓** permitido · **◐** limitado o condicionado (ver nota) · **—** no permitido.
Columnas: **SA** superadministrador · **SP** soporte ShiftReady · **AE** administrador de empresa · **CO** supervisor/coach · **AG** agente.

### Global (plataforma)

| Permiso | SA | SP | AE | CO | AG |
|---|:-:|:-:|:-:|:-:|:-:|
| Crear, suspender y reactivar empresas | ✓ | — | — | — | — |
| Ver el listado de empresas, planes y uso | ✓ | ◐ ¹ | — | — | — |
| Cambiar el plan y los límites de una empresa | ✓ | — | — | — | — |
| Buscar usuarios de cualquier empresa | ✓ | ◐ ¹ | — | — | — |
| Asignar o retirar superadministradores | ◐ ² | — | — | — | — |
| Configuración global y de seguridad | ✓ | — | — | — | — |
| Publicar la biblioteca estándar de escenarios y políticas | ✓ | — | — | — | — |
| Acceso de soporte al espacio de una empresa | ◐ ³ | ◐ ³ | — | — | — |
| Ver la auditoría de la plataforma | ✓ | ◐ ¹ | — | — | — |

### Empresa

| Permiso | SA | SP | AE | CO | AG |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver y editar los datos de la empresa | ◐ ³ | — | ✓ | — | — |
| Seguridad de la empresa (dos pasos obligatoria; SSO en el futuro) | — | — | ✓ | — | — |
| Invitar personas | ◐ ⁴ | — | ✓ | ◐ ⁵ | — |
| Asignar o cambiar roles dentro de la empresa | — | — | ◐ ⁶ | — | — |
| Desactivar o reactivar cuentas | — | — | ✓ | — | — |
| Crear y editar equipos | — | — | ✓ | — | — |
| Crear, editar y publicar campañas | — | — | ✓ | ◐ ⁵ | — |
| Configuración de formación por defecto | — | — | ✓ | — | — |
| Ver la biblioteca de escenarios | — | — | ✓ | ✓ | — |
| Consultar las políticas | — | — | ✓ | ✓ | ◐ ⁷ |
| Subir documentos propios *(futuro)* | — | — | ✓ | — | — |
| Informes de toda la empresa | — | — | ✓ | — | — |
| Ver plan y uso | ✓ | ◐ ¹ | ✓ | — | — |
| Ver la auditoría de la empresa | ✓ | ◐ ³ | ✓ | — | — |
| Transferir la propiedad de la cuenta | — | — | ◐ ⁸ | — | — |

### Equipo

| Permiso | SA | SP | AE | CO | AG |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver participantes y su progreso | — | — | ✓ | ◐ ⁹ | — |
| Ver resultados de las sesiones | — | — | ✓ | ◐ ⁹ | — |
| Revisar conversaciones (transcripción completa) | — | — | ✓ | ◐ ¹⁰ | — |
| Escribir notas de coaching | — | — | ◐ ¹¹ | ◐ ⁹ | — |
| Asignar práctica a un participante | — | — | ✓ | ◐ ⁹ | — |
| Informes de equipo | — | — | ✓ | ◐ ⁹ | — |

### Personal

| Permiso | SA | SP | AE | CO | AG |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver mis entrenamientos y empezar sesiones | — | — | ◐ ¹² | ◐ ¹² | ✓ |
| Práctica libre fuera de campañas | — | — | ◐ ¹² | ◐ ¹² | ◐ ¹³ |
| Ver mi historial, mis informes y mis conversaciones | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editar mi perfil y preferencias | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cambiar mi contraseña y activar dos pasos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Descargar mis datos *(futuro)* | ✓ | ✓ | ✓ | ✓ | ✓ |

**Notas**
1. Solo lectura y sin datos personales de los agentes.
2. Solo con el procedimiento interno (doble aprobación, dos pasos, auditoría). Nadie puede asignarse este rol a sí mismo.
3. Solo mediante **acceso de soporte**: motivo obligatorio, duración limitada (por ejemplo, 30 minutos o 2 horas), aprobación de la empresa si se verán datos personales, banner visible durante el acceso y registro de cada acción.
4. Solo la invitación del **primer** administrador al dar de alta la empresa.
5. **Decidido.** El coach invita solo agentes y solo a sus equipos. Crea y publica campañas para sus equipos; si una campaña incluye equipos que no supervisa, se envía como propuesta y la publica un administrador.
6. Puede asignar Agente, Supervisor/coach y Administrador de empresa **dentro de su empresa**. No puede crear superadministradores ni quitar el rol al último administrador, y cambiar su propio rol exige que quede otro administrador.
7. Durante la simulación (panel de políticas) y en sus recomendaciones.
8. Solo el propietario de la cuenta, con confirmación del nuevo propietario.
9. Solo en los equipos que tiene asignados.
10. **Decidido.** Los coaches ven siempre las conversaciones de sus equipos (no las de otros equipos). Cada revisión queda registrada en la auditoría de la empresa.
11. Puede leer todas las notas; escribir es opcional (decisión de la empresa).
12. Si su empresa les permite también entrenar (útil para coaches que se certifican).
13. Si la empresa permite práctica libre (configuración de formación).

## 2.3 Reglas de seguridad para la implementación

> **Ocultar un botón nunca es una medida de seguridad.** La interfaz oculta lo que el rol no puede hacer para no confundir, pero **cada petición al servidor** debe comprobar el permiso de nuevo.

1. **Validación en el servidor, siempre.** Cada operación comprueba: quién es la persona (sesión válida), en qué empresa actúa, qué rol tiene ahí y si el recurso pertenece a su ámbito (su empresa, su equipo o ella misma).
2. **Aislamiento entre empresas.** Todo dato de una empresa lleva su identificador y todas las consultas filtran por él en el servidor. Una URL con el identificador de otra empresa devuelve **403** o **404**, nunca datos.
3. **El rol nunca viene del navegador.** No se acepta un campo «rol» en el registro público ni se lee el rol de `localStorage`, de la URL o de un token que el cliente pueda editar. El rol de una invitación se guarda en el servidor y el enlace solo contiene un código aleatorio de un solo uso.
4. **Protección del último administrador** y bloqueo de la autopromoción.
5. **Superadministrador:** asignación con doble aprobación, verificación en dos pasos obligatoria, sesiones cortas, alerta a los demás superadministradores en cada alta o baja y revisión periódica de quién lo tiene.
6. **Auditoría inmutable** escrita por el servidor (no por la interfaz) para: altas, bajas y suspensiones de empresas; cambios de plan; invitaciones enviadas, aceptadas o revocadas; cambios de rol; desactivaciones; accesos de soporte; exportaciones; cambios de seguridad.
7. **Resultados:** la puntuación la recalcula el servidor (ver [Riesgos](06-mvp-riesgos-y-plan.md#62-riesgos-de-compatibilidad-con-el-simulador)); el cliente solo envía las decisiones.

### Amenazas de escalada de privilegios y respuesta

| Intento | Respuesta de diseño |
|---|---|
| Registrarse eligiendo «Administrador» o «Superadministrador» | No existe registro público con rol. «Solicitar acceso» solo envía un formulario; no crea cuenta ni permisos |
| Editar el enlace de invitación para cambiar el rol | El enlace lleva un código opaco; el rol está guardado en el servidor y se muestra en solo lectura |
| Cambiar el rol en las herramientas del navegador | El servidor ignora cualquier rol enviado por el cliente |
| Cambiar el identificador de empresa o de persona en la URL | Comprobación de ámbito en cada consulta: 403/404 |
| Un administrador intenta crear un superadministrador | No existe esa opción; el servidor la rechaza aunque se fuerce la petición |
| Un coach consulta a personas de otro equipo | Filtro por equipos asignados en el servidor |
| Reutilizar una invitación aceptada o caducada | Código de un solo uso con caducidad (7 días propuestos) |

## 2.4 Nombres de permisos propuestos para el backend

Una lista estable de permisos facilita que la interfaz y el servidor hablen el mismo idioma (la interfaz pregunta «¿puedo `campaign.publish`?» y el servidor lo valida igualmente).

| Clave | Descripción |
|---|---|
| `platform.orgs.manage` | Crear, suspender y reactivar empresas |
| `platform.plans.manage` | Cambiar plan y límites |
| `platform.support.access` | Solicitar acceso de soporte |
| `platform.audit.read` | Leer la auditoría global |
| `org.settings.manage` | Datos y seguridad de la empresa |
| `org.members.invite` | Invitar personas |
| `org.members.roles` | Cambiar roles dentro de la empresa |
| `org.members.deactivate` | Desactivar cuentas |
| `org.teams.manage` | Crear y editar equipos |
| `campaign.manage` / `campaign.publish` | Crear o editar / publicar campañas |
| `library.read` | Ver escenarios y políticas |
| `reports.org.read` / `reports.team.read` | Informes de empresa / de equipo |
| `session.review` | Revisar conversaciones de otras personas |
| `coaching.notes.write` | Escribir notas de coaching |
| `training.self` | Entrenar y ver los propios resultados |
