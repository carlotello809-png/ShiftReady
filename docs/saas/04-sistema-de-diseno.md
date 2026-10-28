# 4. Sistema de diseño

La plataforma y el simulador deben verse como **un solo producto**: el mismo azul marino de la barra lateral, el mismo azul de acción, el verde de ShiftReady, la tipografía Inter y las esquinas casi rectas del simulador. El nuevo logo (reloj con flecha de reinicio) se reutiliza desde `assets/js/logo.js`.

Implementación de referencia:
- [`assets/css/tokens.css`](../../assets/css/tokens.css): los valores comunes (prefijo `--sr-`), pensados para que los usen la plataforma y el simulador.
- [`assets/css/platform.css`](../../assets/css/platform.css): los tokens semánticos (claro y oscuro) y los componentes de la plataforma, construidos sobre `tokens.css`. Lo usan la app real (`app/`) y el prototipo.

## 4.1 Tokens

### Color de marca

| Token | Valor | Uso |
|---|---|---|
| `--navy-800` | `#0f2438` | Barra lateral (igual que el simulador) |
| `--navy-900` / `--navy-700` / `--navy-600` | `#0b1b2b` / `#1a3754` / `#284a6d` | Fondos oscuros, logos de espacio de trabajo |
| `--blue-500` | `#2b62e3` | **Acción principal**, enlaces, foco |
| `--blue-600` / `--blue-700` | `#2152c4` / `#1b46ad` | Hover y pulsado de la acción principal |
| `--blue-50` / `--blue-100` | `#eef3fe` / `#d9e5fd` | Fondos suaves de selección |
| `--teal-500` | `#16a874` | **Acento** de ShiftReady: progreso, indicador de página activa, botón del simulador |
| `--teal-600` / `--teal-50` | `#0f8f62` / `#e6f5ee` | Variantes del acento |

### Neutros y semánticos

| Token semántico | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#eef2f6` | `#0d141d` | Fondo de la página |
| `--surface` | `#ffffff` | `#151e29` | Tarjetas, tablas, menús |
| `--surface-2` | `#f6f8fa` | `#19232f` | Cabeceras de tabla, campos de búsqueda |
| `--border` / `--border-strong` | `#e3e8ee` / `#d4dce5` | `#243040` / `#2e3b4c` | Bordes |
| `--text` / `--text-2` / `--text-3` | `#10243a` / `#44576c` / `#6f8296` | `#e5ecf4` / `#b2becb` / `#8293a6` | Texto principal, secundario y de apoyo |
| `--primary` | `#2b62e3` | `#5288f8` | Acción principal |
| `--accent` | `#16a874` | `#2fbf8a` | Acento |
| `--focus` | `#2b62e3` | `#79a4ff` | Contorno de foco |

### Estados

| Estado | Texto | Fondo | Uso |
|---|---|---|---|
| Éxito | `#12915c` | `#e6f5ee` | Activo, aprobado, al día |
| Aviso | `#9a6310` | `#fdf4e1` | Pendiente, invitado, atrasado |
| Peligro | `#c73434` | `#fcebeb` | Suspendida, desactivado, no aprobado |
| Información | `#2152c4` | `#eef3fe` | Prueba, programada, práctica |

**Regla:** un estado **nunca se comunica solo con color**; siempre lleva texto (y, en alertas, icono).

### Tipografía

| Token | Tamaño | Uso |
|---|---|---|
| `--fs-xs` | 12 px | Etiquetas, ayudas, notas al pie |
| `--fs-sm` | 13 px | Tablas, texto secundario |
| `--fs-md` | 14 px | Texto base de la interfaz |
| `--fs-lg` | 16 px | Subtítulos |
| `--fs-xl` | 20 px | Títulos de tarjeta destacada, título de página en móvil |
| `--fs-2xl` | 24 px | Título de página |
| `--fs-3xl` | 30 px | Valor de indicadores |

Fuente `Inter` (con `system-ui` de respaldo). Interlineado 1,5 en texto y 1,2 en títulos. Cifras tabulares (`font-variant-numeric: tabular-nums`) en tablas e indicadores.

### Espaciado, forma, profundidad y movimiento

| Grupo | Tokens |
|---|---|
| Espaciado (base 4 px) | `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-8` 32 · `--sp-10` 40 · `--sp-12` 48 |
| Esquinas | `--radius: 2px` (decidido; el simulador usa hoy 0 px y la diferencia apenas se ve) |
| Sombras | `--shadow-1` (tarjetas) · `--shadow-2` (menús y diálogos) |
| Armazón | barra lateral 248 px · barra superior 56 px · contenido máx. 1240 px |
| Movimiento | `--dur: 160ms` · `--ease: cubic-bezier(.23, 1, .32, 1)`; se desactiva con `prefers-reduced-motion` |

### Modo oscuro

Se activa con `data-theme="dark"` en `<html>` y redefine solo los tokens semánticos. Por defecto sigue la preferencia del sistema; la persona puede fijarlo desde el menú de usuario o su perfil.

## 4.2 Componentes y reglas de uso

| Componente | Variantes | Reglas | Estados |
|---|---|---|---|
| **Botón** | Primario, acento, secundario, fantasma, peligro, peligro suave · tamaños pequeño, normal, grande | **Un solo botón primario** por vista. «Acento» (verde) se reserva para entrar al simulador. Acciones destructivas con estilo de peligro y diálogo de confirmación | Normal, hover, foco, pulsado, desactivado (con motivo en `title` o al lado), cargando |
| **Etiqueta** | Éxito, aviso, peligro, info, neutra · **Demo**, **Futuro**, **MVP**, **Contenido real**, **Motor actual**, **Requiere backend** | Las de origen son obligatorias en el prototipo: todo número inventado lleva «Demo» y toda función no disponible lleva «Futuro» | — |
| **Tarjeta** | Con cabecera, cuerpo, pie; cuerpo sin margen para listas y tablas | No anidar tarjetas dentro de tarjetas | — |
| **Indicador (KPI)** | Valor, etiqueta con icono, pie con variación y origen | Indicar siempre el origen («Motor actual» si el simulador ya lo calcula por sesión, «Requiere backend» si necesita historial). La variación lleva signo y referencia («+5 frente al mes anterior») | Con dato, sin dato («—» y explicación) |
| **Tabla** | Con filtros, ordenable *(futuro)*, paginada | Primera columna = identidad (nombre o enlace). Números alineados a la derecha. Filas enlazables por su primera celda, no por toda la fila. En móvil, desplazamiento horizontal dentro de su contenedor | Cargando (esqueleto), vacía (estado vacío con acción), con resultados |
| **Barra de filtros** | Búsqueda, desplegables, chips | Los filtros se aplican al momento; «todos» es el valor por defecto | — |
| **Pestañas** | — | Para vistas hermanas del mismo objeto (detalle de empresa, informes). Cada pestaña tiene URL propia | Activa (`aria-current`) |
| **Pasos** | — | Asistentes de más de 3 pasos (campañas). Se puede volver a cualquier paso ya visitado; «Guardar borrador» siempre disponible | Completado, actual, pendiente |
| **Campo de formulario** | Texto, correo, contraseña, área de texto, selección, fecha | Etiqueta siempre visible (no solo marcador). Ayuda debajo. Error con texto, no solo borde rojo. Los valores fijados por otra persona (rol de una invitación, dificultad de una campaña) se muestran **en solo lectura con candado** y explicación | Normal, foco, solo lectura, desactivado, error |
| **Tarjeta de opción** | Radio o casilla con título y descripción | Para elecciones con consecuencias (dificultad, días, regla de finalización) | Seleccionada, desactivada («No incluido» con candado) |
| **Alerta** | Info, éxito, aviso, peligro | Título corto + explicación + siguiente paso. `role="alert"` solo para peligro | — |
| **Estado vacío** | Con icono, título, texto y acción | Explicar por qué está vacío y qué hacer | — |
| **Diálogo** | Normal, destructivo | Foco al primer campo; `Esc` y «Cancelar» cierran; las acciones destructivas piden **motivo** cuando quedan en auditoría | — |
| **Aviso flotante (toast)** | Éxito | Confirmaciones breves; desaparece solo a los 3 s; nunca para errores | — |
| **Menú desplegable** | Espacios, ayuda, notificaciones, usuario | Se abre con clic o teclado, `Esc` lo cierra y devuelve el foco al botón | — |
| **Avatar** | Pequeño, normal, grande | Iniciales con color derivado del nombre; nunca la única forma de identificar a alguien | — |
| **Insignia de estado de persona** | Sin organización, Invitado, Miembro, Multi-espacio | Icono + texto | — |
| **Barra de progreso** | Primaria, acento | Acompañada del valor en texto («1 / 2») | — |
| **Gráfico de barras** | Con línea de referencia | Valor numérico al final de cada barra; línea de aprobado (60) con leyenda | — |
| **Gráfico de líneas** | Una o dos series | Leyenda cuando hay más de una serie; puntos con título accesible; línea de referencia de aprobado | — |
| **Transcripción** | Burbuja del cliente, burbuja del agente, nota del coach | Valoración de cada respuesta con etiqueta de texto (Excelente, Buena, Mejorable, Mala) | — |
| **Tarjeta de foco** | — | Lanzador del simulador y «próxima tarea» del agente. Una por pantalla | — |
| **Franja de prototipo** | — | **Solo en el prototipo.** No existe en el producto | — |

## 4.3 Visualización de datos

- Cada gráfico muestra también los **números** (en la barra, en la tabla o al pasar el cursor).
- La **nota de aprobado (60)** aparece como línea de referencia siempre que tenga sentido.
- Matriz de progreso: número **y** color en cada celda (verde ≥ 60, rojo < 60, guion si no se completó).
- Máximo dos series por gráfico de líneas: azul (`--primary`) y verde (`--accent`).
- Los gráficos con datos inventados llevan la etiqueta «Demo» debajo.

## 4.4 Accesibilidad

- Contraste AA en texto e iconos funcionales, en claro y en oscuro.
- Foco visible (`:focus-visible`, 2 px) en todo elemento interactivo.
- Enlace «Saltar al contenido»; al cambiar de página el foco va al contenido principal y el título del documento cambia.
- `aria-current` en navegación, pestañas y pasos; `aria-expanded` en menús y cajón; diálogos con `role="dialog"` y `aria-modal`.
- Objetivos táctiles de al menos 36 px en escritorio y 40 px en móvil.
- Movimiento reducido respetado.

## 4.5 Estilo de los textos

- Español neutro, frases cortas, mayúscula solo al inicio («Nueva campaña», no «Nueva Campaña»).
- Porcentajes con espacio («85 %») y decimales con coma («4,7»).
- Verbos concretos en botones («Enviar invitaciones», «Publicar campaña»), nunca «Aceptar» genérico en acciones importantes.
- El contenido del simulador (casos, políticas) está hoy en inglés; la interfaz se ofrecerá en español e inglés (decisión 14).
