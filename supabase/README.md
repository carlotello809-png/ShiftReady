# Supabase · base del servidor (etapa 1)

Proyecto: **shiftready-dev** (`https://euusjtfndzlvxrpimwkq.supabase.co`), solo para desarrollo y pruebas.

> **Estado (28 oct 2026):** migración `20261027180000_etapa1_base.sql` **aplicada** en shiftready-dev y comprobada:
> - 8 tablas, todas con RLS;
> - 10 funciones públicas, 19 internas, 16 políticas y los 2 disparadores de `auth.users`;
> - los visitantes no leen empresas ni aceptan invitaciones;
> - correo con confirmación obligatoria y TOTP activados.
>
> No vuelvas a ejecutarla: fallaría sin cambiar nada, porque las tablas ya existen.

Esta carpeta contiene la base de datos de la plataforma: empresas, personas, roles, equipos, invitaciones y auditoría. Todas las reglas de acceso viven **en la base de datos**:

- Cada tabla tiene seguridad por filas (RLS): una empresa nunca ve las filas de otra.
- Los cambios de rol, miembros e invitaciones pasan por funciones que comprueban quién llama.
- La auditoría la escriben disparadores de la base de datos y nadie puede editarla desde la app.

Ocultar un botón en la interfaz nunca es la protección.

## Archivos

| Archivo | Para qué |
|---|---|
| `migrations/20261027180000_etapa1_base.sql` | Crea tablas, reglas de acceso, funciones y auditoría. Se ejecuta **una vez** |
| `scripts/grant-platform-role.sql` | Asigna el rol de superadministrador o de soporte (procedimiento interno) |
| `tests/` | Pruebas sin conexión con Postgres real (PGlite). No tocan tu proyecto |

## Cómo aplicarlo en tu proyecto

1. En Supabase, abre **SQL Editor** → **New query**.
2. Copia **todo** el contenido de `migrations/20261027180000_etapa1_base.sql`, pégalo y pulsa **Run**. Debe responder *Success. No rows returned*. Si da error, no lo repitas: copia el mensaje y pásamelo.
3. En **Authentication → Sign In / Providers → Email**, comprueba que estén activados **Email** y **Confirm email**. La confirmación es obligatoria: una invitación solo se acepta con el correo confirmado.
4. En **Authentication → Multi-Factor**, comprueba que **TOTP (app de autenticación)** esté activado. Los administradores lo necesitan para hacer cambios.
5. Comprobación: en **Table Editor** deben aparecer 8 tablas (`organizations`, `profiles`, `platform_admins`, `memberships`, `teams`, `team_members`, `invitations`, `audit_log`) y todas con **RLS enabled**. En **Advisors → Security Advisor** no debe haber errores de «RLS disabled».

> **Claves:** para la etapa 2 (pantallas) hará falta la clave **anon / public**, que es pública por diseño. La clave **service_role** salta todas las reglas: no la compartas ni la pongas nunca en el sitio.

## Primer superadministrador

Necesita una cuenta con la **verificación en dos pasos activada**. Supabase no permite activarla desde su panel: se hace desde la app. Por eso este paso **llega con la etapa 2**, cuando exista la pantalla de inicio de sesión con la configuración de dos pasos. Entonces:

1. Te registras en la app con tu correo, lo confirmas y activas los dos pasos.
2. Abres `scripts/grant-platform-role.sql`, rellenas tu correo, quién lo solicita, quién lo aprueba y el motivo, y lo ejecutas en el SQL Editor.

Al no haber todavía ningún superadministrador, el script acepta **un solo aprobador** y lo registra como «arranque inicial». A partir del segundo, exige **dos aprobadores distintos**, y ninguno puede ser la persona ni quien lo solicita.

## Qué hay en la base de datos

### Tablas

| Tabla | Contenido | Quién la ve |
|---|---|---|
| `organizations` | Empresas: plan, estado, puestos, zona horaria | Sus miembros; el personal de ShiftReady con dos pasos |
| `profiles` | Nombre, correo y preferencias de cada cuenta | La propia persona, los administradores de sus empresas, los coaches de sus equipos y su coach |
| `platform_admins` | Superadministradores y soporte | La propia persona y los superadministradores |
| `memberships` | Rol (`admin`, `coach`, `agent`) y estado de cada persona en cada empresa | La persona, los administradores, sus coaches |
| `teams`, `team_members` | Equipos y quién los coachea | Miembros de la empresa / administradores y coaches |
| `invitations` | Invitaciones; solo se guarda el **resumen (hash)** del código | Administradores; el coach, las suyas |
| `audit_log` | Cada cambio: quién, qué, cuándo y motivo | Administradores (de su empresa) y superadministradores |

### Funciones que usará la app

| Función | Quién | Qué hace |
|---|---|---|
| `create_invitation(empresa, correo, rol, equipo)` | Administrador con dos pasos · coach (solo agentes a sus equipos) | Crea la invitación y devuelve el código **una sola vez** |
| `revoke_invitation(id)` | Administrador · coach (las suyas) | Anula una invitación pendiente |
| `get_invitation_preview(código)` | Cualquiera con el código | Empresa, rol, equipo, quién invita y correo enmascarado |
| `accept_invitation(código)` | La persona invitada, con sesión y correo confirmado | Crea su pertenencia con el rol guardado (nunca el que envíe el navegador) |
| `set_member_role(id, rol)` / `set_member_status(id, estado)` | Administrador con dos pasos | Cambia rol o desactiva; nunca deja la empresa sin administrador activo |
| `my_workspaces()` | Cualquier persona con sesión | Sus empresas y su rol en cada una (selector de espacio) |
| `platform_create_org(nombre, plan, puestos, correo admin)` | Superadministrador con dos pasos | Crea la empresa e invita a su primer administrador |
| `platform_set_org_status(empresa, estado, motivo)` | Superadministrador con dos pasos | Suspende o reactiva; el motivo es obligatorio y queda en auditoría |
| `platform_update_plan(empresa, plan, puestos, motivo)` | Superadministrador con dos pasos | Cambia plan y límite de puestos |

Los errores llegan con un código corto que la interfaz traducirá: `not_allowed`, `mfa_required`, `invitation_invalid`, `email_mismatch`, `email_not_confirmed`, `already_member`, `seat_limit`, `last_admin`, `org_suspended`, `reason_required`, `invalid_role`, `invalid_team`, `invalid_email`.

## Pruebas sin conexión

```bash
cd supabase/tests
npm install
npm test
```

Recrean lo mínimo de Supabase (roles, `auth.users`, `auth.uid()`, nivel de dos pasos), aplican la migración en Postgres real (PGlite, sin Docker) y comprueban 19 casos. Entre ellos:

- aislamiento entre empresas;
- qué ve cada rol;
- que un coach solo invita agentes a sus equipos;
- que hace falta la verificación en dos pasos;
- que no se puede cambiar el plan ni los puestos;
- que la empresa no se queda sin su último administrador;
- límite de puestos, suspensión con motivo y auditoría completa.

`npm test` en la raíz del proyecto sigue ejecutando solo las pruebas del simulador; estas son aparte.

## Pendiente para etapas siguientes

- Envío de invitaciones por correo: hoy la función devuelve el código y el enlace se comparte a mano.
- Marcar automáticamente las invitaciones caducadas (hoy se tratan como caducadas por fecha).
- Acceso de soporte a una empresa (consola del superadministrador, etapa 6).
- Campañas, sesiones y resultados (etapas 3 a 5).
