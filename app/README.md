# ShiftReady · plataforma (etapa 2)

La app real de la plataforma, conectada al proyecto de Supabase **shiftready-dev**. Es una página estática sin instalación, como el simulador.

- **Acceso:** iniciar sesión, crear cuenta (sin empresa ni rol), recuperar la contraseña y verificación en dos pasos con una app de autenticación. Los dos pasos son obligatorios para administradores y para el superadministrador.
- **Invitaciones:** abrir el enlace, ver empresa, rol (bloqueado) y equipo, y crear la cuenta o entrar para aceptarla. La invitación se recuerda en el navegador mientras confirmas el correo.
- **Espacios de trabajo:** selector de empresa y pantallas «Sin organización», «Acceso desactivado» y «Empresa suspendida».
- **Menú lateral por rol.** Las secciones de etapas futuras dicen en qué etapa llegan y enlazan al prototipo.
- **Herramientas mínimas para probar el circuito completo:**
  - superadministrador: crear, suspender y reactivar empresas, y ver la auditoría;
  - administrador: directorio (cambiar rol, desactivar), equipos e invitaciones;
  - coach: su equipo e invitar agentes a él.

Todas las reglas las comprueba la base de datos ([`supabase/`](../supabase/README.md)). La app solo usa la **clave pública** (`config.js`); la secreta nunca va aquí.

## Cómo abrirla

Desde la carpeta del proyecto:

```bash
python -m http.server 5178 --bind 127.0.0.1
```

Abre `http://localhost:5178/app/`. Cuando se publique en GitHub Pages, la dirección será `https://carlotello809-png.github.io/ShiftReady/app/`. Las dos direcciones ya están autorizadas en Supabase para los enlaces de los correos.

## Primera vez: tu cuenta de superadministrador

1. En la app, pulsa **Crear cuenta** y usa **carlotello809@gmail.com**. En desarrollo, el correo de prueba de Supabase solo llega a los miembros del proyecto.
2. Abre el correo de confirmación **en el mismo navegador**.
3. Entra. Verás «Sin organización»: es lo correcto, la cuenta por sí sola no da permisos.
4. Pulsa **Activar verificación en dos pasos**, escanea el código QR con tu app de autenticación y escribe el código.
5. En el SQL Editor de Supabase, ejecuta [`supabase/scripts/grant-platform-role.sql`](../supabase/scripts/grant-platform-role.sql) con tu correo. Al ser el primero, basta un aprobador.
6. Vuelve a la app y recarga: te pedirá el código y entrarás en la **Consola de plataforma**.

## Probar el circuito completo

1. Como superadministrador, en **Empresas → Nueva empresa**, crea una empresa de prueba. La app te da el **enlace de invitación** del primer administrador; cópialo.
2. La persona invitada abre el enlace, crea su cuenta con **ese** correo, la confirma y acepta. Si es administradora, la app le pide activar los dos pasos.
3. El administrador crea equipos e invita a coaches y agentes; cada invitación da un enlace para copiar.

> **Correos en desarrollo:** el servidor de correo de prueba de Supabase solo envía a los miembros del proyecto y pocos correos por hora. Para probar con otras personas hay dos opciones:
> - crear su cuenta en Supabase (**Authentication → Users → Add user**, con **Auto Confirm User**) y que abran el enlace de invitación;
> - configurar un servidor de correo propio (SMTP), previsto para más adelante.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página. Carga en solo lectura el logo y los iconos del simulador |
| `config.js` | URL del proyecto y clave **pública** (publishable) |
| `app.js` | Pantallas, navegación y llamadas a Supabase (`@supabase/supabase-js` 2.117.3 desde jsDelivr) |
| `app.css` | Los pocos estilos propios; el resto viene de `assets/css/tokens.css` y `assets/css/platform.css` |

## Lo que todavía no hace

- Enviar las invitaciones por correo (hoy se comparte el enlace).
- Campañas, sesiones del simulador guardadas en el historial, informes y revisión de conversaciones (etapas 3 a 5).
- Acceso de soporte a una empresa, planes con más detalle (etapa 6).
- Cerrar la sesión tras 30 minutos sin actividad (requiere un plan de pago de Supabase o lógica propia).
