# 5. Wireframes de las pantallas principales

Esquemas de baja fidelidad. La versión navegable de cada uno está en el prototipo (ruta indicada). Las cifras son ilustrativas.

## 5.1 Armazón con sesión iniciada

```
┌──────────────────────┬───────────────────────────────────────────────────────────────┐
│ [logo] ShiftReady    │ [≡] [BC Bahía Contact Center ▾]  [🔍 Buscar…    /]   (?) (🔔•) (AT ▾) │
│ Formación de agentes ├───────────────────────────────────────────────────────────────┤
│                      │ Migas › de › pan                                               │
│ GENERAL              │ Título de la página  [Etiqueta]          [Secundaria] [Primaria] │
│ ▌Inicio              │ Descripción breve                                              │
│ PERSONAS             │                                                               │
│  Directorio          │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│  Equipos             │ │ KPI     │ │ KPI     │ │ KPI     │ │ KPI     │                 │
│  Invitaciones    (2) │ └─────────┘ └─────────┘ └─────────┘ └─────────┘                 │
│ FORMACIÓN            │ ┌───────────────────────────────┐ ┌───────────────┐             │
│  Campañas            │ │ Contenido principal           │ │ Lateral       │             │
│  …                   │ └───────────────────────────────┘ └───────────────┘             │
│──────────────────────│                                                               │
│ Plan Business        │                                                               │
│ ▓▓▓▓▓▓▓▓░░ 120/150   │                                                               │
└──────────────────────┴───────────────────────────────────────────────────────────────┘
Móvil (< 900 px): la barra lateral se oculta y se abre como cajón con [≡]; la búsqueda se oculta en < 640 px.
```

## 5.2 Portada pública · `#/access/landing`

```
┌───────────────────────────────┬───────────────────────────────┐
│ [logo] ShiftReady             │  Bienvenido a ShiftReady      │
│                               │  Accede con la cuenta que te  │
│ Entrena a tu equipo de        │  dio tu organización.         │
│ atención al cliente con       │  [      Iniciar sesión      ] │
│ simulaciones reales.          │  [ ✉ Tengo una invitación   ] │
│                               │  ── ¿Tu empresa aún no…? ──   │
│ ✓ Cada empresa ve solo sus    │  [ Solicitar acceso empresa ] │
│   datos.                      │  ⓘ No hay registro con        │
│ ✓ Los roles los asigna tu     │    elección de rol.           │
│   organización.               │  Estados: [Sin org] [Invitado]│
│ ✓ Informes por agente…        │  [Miembro] [Multi-espacio]    │
└───────────────────────────────┴───────────────────────────────┘
```

## 5.3 Invitación · `#/access/invite` y `#/access/invite-account`

```
 [✉ Invitado]                              Crea tu cuenta
 Te invitaron a unirte                     Nombre y apellido   [Jorge Vidal        ]
 ┌─────────────────────────────────┐       Correo electrónico  [jorge.vidal@… 🔒  ]
 │ [BC] Bahía Contact Center       │         Es el correo al que llegó la invitación.
 │ Invitación de Laura · caduca 1 nov       Contraseña          [••••••••••        ]
 │ Correo       jorge.vidal@…      │         Al menos 10 caracteres.
 │ Rol asignado [Agente] 🔒        │       Rol                 [Agente] asignado por tu organización
 │ Equipo       Nuevos ingresos    │       [✓] Acepto los términos…
 └─────────────────────────────────┘       [   Crear cuenta y unirme   ]
 [ Aceptar y crear mi cuenta ]
 [ Rechazar invitación ]
```

## 5.4 Selector de espacio de trabajo · `#/access/workspaces`

```
 [Multi-espacio]
 Elige un espacio de trabajo
 ┌ [BC] Bahía Contact Center · Administradora de empresa · 120 personas      › ┐
 ┌ [AB] Andes BPO · Supervisora / coach · equipo Soporte 1                   › ┐
 ┌ [SR] Consola de plataforma · solo cuentas internas autorizadas            🔒 ┐  (borde discontinuo)
```

## 5.5 Superadministrador · Empresas · `#/app/superadmin/companies`

```
 Empresas [Demo]                                         [Exportar · Futuro] [+ Nueva empresa]
 [🔍 Buscar empresa] [Plan: todos ▾] [Estado: todos ▾]
 ┌──────────────────────────┬──────────┬────────────┬──────────────┬────────────┬──────────┐
 │ Empresa                  │ Plan     │ Estado     │ Puestos      │ Sesiones 30│ Alta     │
 ├──────────────────────────┼──────────┼────────────┼──────────────┼────────────┼──────────┤
 │ Bahía Contact Center     │ Business │ [Activa]   │ 120/150 ▓▓▓░ │      1.840 │ 2026-03  │
 │ Meridian Help Desk       │ Business │ [Suspend.] │  64/150 ▓░░░ │          0 │ 2026-01  │
 └──────────────────────────┴──────────┴────────────┴──────────────┴────────────┴──────────┘
 Detalle: pestañas [Resumen] [Usuarios] [Plan y uso] [Actividad]
          Acciones: [Acceso de soporte] [Reenviar invitación] [Suspender empresa]
```

## 5.6 Administrador · Asistente de campaña · `#/app/admin/campaigns/new?step=2`

```
 Campañas › Nueva campaña
 (✓ Información) (✓ Participantes) (3 Contenido) (4 Evaluación) (5 Fechas e informes) (6 Revisión)
 ┌ Contenido ─────────────────────────────────────────────────────────────────────────────┐
 │ Días y escenarios [Contenido real]                                                     │
 │ [ ] Día 1 · Orientation [Fácil]       Daniel — … · Priya — … · Marcus — …              │
 │ [✓] Día 4 · Tough Customers [Difícil] …                                                │
 │ [✓] Día 5 · Peak Friday [Experto]     …                                                │
 │ Dificultad [Niveles reales]   ( ) Fácil   ( ) Intermedio   (•) Difícil                   │
 │ Ritmo del turno               Clientes por día [Todos ▾]  Velocidad de respuesta [Auto ▾] │
 │ Canal                         (•) Chat [MVP]   ( ) Voz [Futuro]                          │
 │ ✓ 2 día(s) · 13 escenarios. La configuración es válida según las reglas del simulador.  │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ [Anterior]                                          [Guardar borrador] [Siguiente]      │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.7 Administrador · Biblioteca de escenarios · `#/app/admin/scenarios`

```
 Biblioteca de escenarios [Los 25 casos reales]                      [+ Nuevo escenario · Futuro]
 [🔍 Buscar por tema o cliente] [Día ▾] [Canal ▾] [Tipo de cliente ▾]
 │ Escenario                    │ Día                │ Dificultad │ Canal     │ Cliente    │ Políticas │ Estado     │
 │ Where is my order?           │ Día 1 · Orientation│ [Fácil]    │ App móvil │ Tranquilo  │         2 │ [Publicado]│
```

## 5.8 Coach · Resumen del equipo · `#/app/coach/team`

```
 Retail A · Mañana [Demo]
 ┌Participantes 5┐┌Puntuación media 78 +3┐┌Calidad 85 %┐┌Necesitan apoyo 2┐
 ┌ Evolución de la puntuación media ───────────────┐ ┌ Atención prioritaria ─────────┐
 │ 80 ┤                                ●──●        │ │ (CN) Carla Núñez [Necesita a.]│
 │ 60 ┼ ─ ─ ─ ─ ─ ─ ─ aprobado ─ ─ ─●─ ─ ─ ─ ─ ─ ─ │ │ (DO) Daniel Ortega [Atrasado] │
 │ 40 ┤  ●──●──●                                   │ │ (ER) Elena Ruiz [Invitación]  │
 │      S1  S2  S3  S4  S5  S6                     │ └───────────────────────────────┘
 └─────────────────────────────────────────────────┘
```

## 5.9 Coach · Revisión de conversaciones · `#/app/coach/review`

```
 Revisión de conversaciones [Caso real d1-daniel] [Demo]
 ⓘ La ven los coaches del equipo y los administradores; cada revisión queda registrada.
 ┌ Conversación con Daniel Okafor ─────────────────────┐ ┌ Decisiones ────────────────┐
 │ (Daniel) I ordered some earbuds…                    │ │ 1 Hello. What is…  Mejorable│
 │                     Hello. What is your order… (Ana)│ │ 2 Thanks for waiting… Buena │
 │                                  [Mejorable]        │ │ 3 I understand…   Excelente │
 │ ✦ Nota del coach: … (texto real del simulador)      │ │ 4 Great! You'll…  Excelente │
 │   Mejor respuesta: …                                │ │ [Añadir nota de coaching]   │
 └─────────────────────────────────────────────────────┘ └─────────────────────────────┘
```

## 5.10 Agente · Inicio · `#/app/agent/home`

```
 Hola, Ana [Demo]
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ [Asignado por tu supervisor]                                              │
 │ Onboarding Retail · semana 1                                 [▶ Continuar] │
 │ Te falta el Día 2 · Returns & Accounts · Intermedio · hasta el 15 nov      │
 └───────────────────────────────────────────────────────────────────────────┘
 ┌Sesiones 5┐┌Mejor resultado 92 %┐┌Calidad media 74 %┐┌CSAT medio 3,8┐
 ┌ Tu evolución (línea) ───────────────────────┐ ┌ Recomendado para ti ───────┐
```

## 5.11 Agente · Configurar sesión · `#/app/agent/setup`

```
 Configurar la sesión [Días y niveles reales]
 ┌ 1 · Días ───────────────────────────────────────┐ ┌ Resumen ────────────────────┐
 │ [✓] Día 1 · Orientation [Fácil] 3 clientes      │ │ Entrenamiento  Onboarding…  │
 │ [✓] Día 2 · Returns & Accounts [Fácil] 4 client.│ │ Días           Días 1, 2    │
 │ [ ] Día 3 · Billing & Delivery     🔒 No incluido│ │ Clientes       7            │
 ├ 2 · Dificultad ──────────────────────────────────┤ │ Dificultad     Intermedio   │
 │ ( ) Fácil  (•) Intermedio 🔒  ( ) Difícil         │ │ ⓘ Cuenta como práctica…     │
 ├ 3 · Ritmo del turno ─────────────────────────────┤ ├─────────────────────────────┤
 │ Clientes por día [Todos ▾]  Velocidad [Auto ▾] 🔒 │ │ [▶  Empezar la sesión     ] │
 └──────────────────────────────────────────────────┘ └─────────────────────────────┘
 En práctica libre todo es editable; en una campaña los valores fijados llevan candado.
```

## 5.12 Agente · Simulación en modo foco · `#/app/agent/simulation`

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ Días 1, 2 · Intermedio · Todos los del día              [↗ Abrir el simulador] │
 │ Atiende a los clientes, consulta las políticas y cierra cada chat…        │
 └───────────────────────────────────────────────────────────────────────────┘
 Cómo se conectará: la plataforma abre el simulador con campaña, días, dificultad,
 ritmo y semilla → el simulador juega con el motor actual → envía las decisiones →
 el servidor recalcula la puntuación con la semilla → informe y progreso.
```

## 5.13 Agente · Informe de la sesión · `#/app/agent/report`

```
 Historial › Informe de la sesión
 Sesión aprobada [Aprobado] [Demo]
 ┌Puntos 183/200┐┌Calidad 89 %┐┌CSAT 4,7┐┌Códigos de cierre 86 %┐   (todos «Motor actual»)
 ┌ Puntuación por día (barras + línea 60) ┐ ┌ Valoración de las respuestas ┐
 ┌ Fortalezas ────────────────────────────┐ ┌ Áreas de mejora ─────────────┐
 Mismo contenido que el informe que ya genera session.js en el simulador.
```
