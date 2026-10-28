# 3. Acceso, registro e invitaciones

## 3.1 Idea central

**Nadie consigue permisos rellenando un formulario.** Hay tres puertas y ninguna permite elegir rol:

| Puerta | Para quién | Qué crea |
|---|---|---|
| **Iniciar sesión** | Personas con cuenta | Nada nuevo |
| **Tengo una invitación** | Agentes, coaches y administradores invitados por su empresa | Una cuenta (si no la tenía) y su pertenencia a la empresa **con el rol que fijó quien invitó** |
| **Solicitar acceso para mi empresa** | Empresas que aún no son clientes | Solo una solicitud para el equipo de ShiftReady. **No crea cuenta ni permisos** |

El superadministrador no tiene puerta pública: se asigna por un procedimiento interno (3.6).

## 3.2 Alta de una empresa (propuesta: gestionada por ShiftReady)

```mermaid
sequenceDiagram
  actor R as Responsable de la empresa
  participant W as Web pública
  participant SR as Equipo ShiftReady
  participant SA as Consola (superadministrador)
  participant M as Correo
  R->>W: Solicitar acceso (empresa, nombre, correo, tamaño)
  W-->>R: «Solicitud recibida» (sin cuenta ni permisos)
  W->>SR: Aviso de nueva solicitud
  SR->>SR: Validar la empresa y acordar el plan
  SR->>SA: Crear empresa (nombre, plan, correo del primer administrador)
  SA->>M: Invitación como Administrador de empresa
  SA->>SA: Registro en auditoría
  M-->>R: Enlace de invitación (código de un solo uso, 7 días)
  R->>W: Acepta y crea su cuenta
  W-->>R: Inicio de la empresa (onboarding del administrador)
```

> **Decidido:** el alta la gestiona ShiftReady. Si en el futuro se añade autoservicio, quien cree una empresa solo obtendrá el rol de administrador **de esa empresa nueva y vacía**, nunca acceso a otras empresas ni a la consola.

## 3.3 Invitación de una persona

```mermaid
sequenceDiagram
  actor AE as Administrador de empresa
  participant S as Servidor
  participant M as Correo
  actor P as Persona invitada
  AE->>S: Invitar (correos, rol, equipo)
  S->>S: Comprobar permiso org.members.invite y puestos libres
  S->>S: Guardar invitación (rol, equipo, caducidad, código aleatorio)
  S->>M: Enviar enlace con el código
  M-->>P: «Te invitaron a unirte a {empresa}»
  P->>S: Abre el enlace
  S-->>P: Empresa, quién invita, rol y equipo (solo lectura)
  alt Ya tiene cuenta
    P->>S: Inicia sesión y acepta
  else No tiene cuenta
    P->>S: Nombre + contraseña (correo bloqueado) + términos
  end
  S->>S: Crear pertenencia con el rol guardado e invalidar el código
  S-->>P: Bienvenida → Inicio según su rol
```

**Pantallas del prototipo:** `#/access/invite` → `#/access/invite-account` → `#/access/onboarding`.

Un **coach** sigue el mismo flujo con dos límites que comprueba el servidor: solo puede invitar con el rol Agente y solo a los equipos que supervisa (`#/app/coach/participants` → «Invitar agentes»).

### Casos límite

| Situación | Qué ve la persona |
|---|---|
| La invitación caducó | «Esta invitación caducó. Pide a {quien invitó} que te envíe otra.» |
| La invitación fue revocada | Mismo mensaje que caducada (no revela el motivo) |
| Ya es miembro de la empresa | Se le lleva a esa empresa sin crear otra pertenencia |
| Ha iniciado sesión con otro correo | «Esta invitación es para j•••@bahia.demo. Cierra sesión y entra con ese correo.» |
| La empresa no tiene puestos libres al aceptar | «Tu empresa alcanzó su límite de puestos. Avisamos a su administrador.» (y se le notifica) |
| Su cuenta está desactivada en esa empresa | Pantalla «Cuenta desactivada»; puede seguir usando otras empresas |

## 3.4 Inicio de sesión y selección de espacio

```mermaid
flowchart TD
  A[Correo + contraseña] --> B{¿Correctos?}
  B -->|no| B1[«Correo o contraseña incorrectos» · bloqueo temporal tras varios intentos]
  B -->|sí| C{¿Dos pasos exigidos?}
  C -->|sí| C1[Código de verificación] --> D
  C -->|no| D{¿Cuenta activa?}
  D -->|no| D1[Cuenta desactivada]
  D -->|sí| E{Espacios de trabajo}
  E -->|0| E0[Sin organización: revisar invitaciones o solicitar acceso]
  E -->|1| E1[Inicio de su rol]
  E -->|2 o más| E2[Selector de espacio: recuerda el último]
```

- El mensaje de error **no distingue** entre correo inexistente y contraseña incorrecta.
- «Recuperar contraseña» siempre responde «Si existe una cuenta con ese correo, recibirás un enlace» (`#/access/recover-sent`).
- La **sesión caduca** tras un tiempo sin actividad (30 minutos propuestos). Una simulación en curso se pausa y se retoma al volver (`#/access/expired`).
- El acceso con **SSO** de la empresa aparece como «Próximamente» y desactivado.

## 3.5 Estados de una persona

```mermaid
stateDiagram-v2
  [*] --> SinOrganizacion: crea cuenta sin invitación válida
  [*] --> Invitado: recibe una invitación
  Invitado --> Miembro: acepta
  Invitado --> [*]: caduca o se revoca
  SinOrganizacion --> Miembro: acepta una invitación
  Miembro --> MultiEspacio: acepta una invitación de otra empresa
  MultiEspacio --> Miembro: deja una de las empresas
  Miembro --> Desactivado: un administrador lo desactiva
  Desactivado --> Miembro: un administrador lo reactiva
```

En la interfaz cada estado tiene una **insignia con icono y texto** (nunca solo color):

| Insignia | Significado | Dónde aparece |
|---|---|---|
| Sin organización | Cuenta válida sin empresa | Pantalla «Sin organización» |
| Invitado | Invitación pendiente de aceptar | Invitación, directorio, invitaciones |
| Miembro | Pertenece a una empresa | Bienvenida, directorio |
| Multi-espacio | Pertenece a varias empresas | Selector de espacio y menú de usuario |
| Desactivado | Acceso retirado por la empresa | Directorio (para administradores) |

## 3.6 Procedimiento para asignar un superadministrador

1. Una persona del equipo interno de ShiftReady lo solicita por escrito indicando motivo y duración (si es temporal).
2. **Dos** responsables distintos lo aprueban; ninguno puede ser la persona solicitante.
3. La persona debe tener activada la verificación en dos pasos (preferiblemente con llave física).
4. El rol se asigna con una herramienta interna o un script auditado, **no** desde la interfaz pública ni desde la consola de empresa.
5. Se avisa a todos los superadministradores y queda en la auditoría de plataforma.
6. Cada trimestre se revisa la lista y se retiran los accesos que ya no hacen falta.

El selector de espacio solo muestra la «Consola de plataforma» a las cuentas que tienen ese rol (en el prototipo aparece con borde discontinuo y un candado para indicarlo).

## 3.7 Textos de las pantallas de acceso (guía)

- Hablar de **«tu organización»** como la fuente del rol: «Tu rol lo asigna tu organización».
- Explicar el siguiente paso siempre: quién puede ayudar y qué hacer.
- No revelar si una cuenta existe, ni el motivo de una revocación.
- Mostrar el correo invitado parcialmente oculto cuando la persona ha iniciado sesión con otro.
