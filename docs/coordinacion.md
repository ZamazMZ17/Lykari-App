# Coordinación Claude ↔ ChatGPT/Codex

Plan completo: módulo Control (tiempo en pantalla + filtro +18) y rediseño de la sesión de ejercicio.
Rama base: `trabajo-zamly`. Cada tarea va en **su rama**; nadie empuja a `trabajo-zamly` salvo la integración (Claude).

## Reglas comunes
- Leer `AGENTS.md` (= `CLAUDE.md`) antes de tocar código. §4 diseño y §11 Control son obligatorios.
- **Archivos compartidos que solo toca la integración:** `src/App.tsx`, `src/db/db.ts`, `android/app/src/main/AndroidManifest.xml`, `MainActivity.java`, `package.json`, `android/app/build.gradle`. Si hace falta un cambio ahí, se describe al final del commit/PR en una sección "Cambios pendientes para integración".
- **Contratos congelados:** `src/control/tipos.ts`, `src/control/plugin.ts`. Si falta algo, pedirlo; no cambiarlos.
- Diseño: solo tokens de `CLAUDE.md` §4, íconos lucide, **nada de rojo**, sin textos de culpa.
- Criterio de aceptación de toda tarea: `npm run build` y `npm test` pasan.
- Commits convencionales (`feat:`, `fix:`) y push de la rama propia.

## Tablero

| # | Tarea | Ejecutor | Rama | Estado |
|---|---|---|---|---|
| 0 | Contratos, migración Dexie v8, CLAUDE/AGENTS §11 | Claude | `trabajo-zamly` | hecho |
| 1 | Motor nativo Control + filtro +18 | Claude | `control-nativo` | pendiente |
| 2 | Lógica pura `src/control/reglas.ts` + tests | Claude (subagente) | `control-reglas` | pendiente |
| 3 | UI de Control | ChatGPT/Codex | `codex/control-ui` | pendiente |
| 4 | Sesión de ejercicio con rutina visible | ChatGPT/Codex | `codex/entrenamiento` | pendiente |
| 5 | Entrada `X` en Hoy + pestañas Racha/Control en Zamly | Claude (subagente) | `zamly-entrada` | pendiente |
| 6 | Integración, versión 0.8.0, APK | Claude | `trabajo-zamly` | pendiente |
| 7 | Revisión cruzada | ambos | — | pendiente |

---

## Encargo 3 — UI de Control (`codex/control-ui`)

**Objetivo.** Construir las pantallas del módulo Control que van dentro de la pestaña "Control" de Zamly.

**Crear** en `src/pantallas/control/`:
- `Control.tsx`: componente raíz `export function Control()`. Si `!esNativo` (`src/lib/plataforma.ts`) muestra "Disponible solo en el APK". Si faltan permisos, muestra `Permisos`. Si no, muestra subnavegación: Resumen · Apps · Webs · Modos · +18 · Historial · Protección.
- `Permisos.tsx`: lista `EstadoPermisos` con un botón por permiso → `Control.abrirAjustesPermiso`. Refresca al volver a la app (`document.visibilitychange`).
- `Resumen.tsx`: uso de hoy (`Control.usoHoy`), apps con límite y minutos restantes, modo activo ahora.
- `Apps.tsx`: `Control.listarApps` con buscador, ordenadas por uso de 7 días (`usoRango`). Hoja por app: minutos/día, aperturas/día opcional, días de la semana, activo.
- `Webs.tsx`: CRUD de `ReglaWeb` (dominio o palabra).
- `Modos.tsx`: CRUD de `ModoControl` con plantillas Estudio (lun–vie), Sueño (23:00–07:00), En clase; varios horarios; estrategia bloquear/permitir; selector de apps.
- `FiltroAdulto.tsx`: estado de capas, palabras, dominios, chats de Telegram bloqueados, navegadores permitidos, contador de intentos (`Control.intentos`). Apagar = registrar `apagadoPedidoEn` y mostrar cuenta regresiva de 24 h; se apaga solo al vencer. No hay forma de saltarse la espera.
- `Historial.tsx`: uso por semana y mes desde `db.controlUsoDiario`, extensiones (`Control.extensiones`). Datos crudos, sin juicios.
- `Proteccion.tsx`: activar/desactivar. Desactivar pide la contraseña de nuevo (`verificarContrasena` de `src/db/zamly.ts`) antes de `Control.activarProteccion({activa:false})`.
- `src/control/almacen.ts`: `leerReglas()` (desde `db.controlReglas` id 1, o `reglasVacias()`), `guardarReglas(reglas)` (escribe Dexie + `Control.guardarReglas`, actualiza `actualizado`), hook `useReglas()` con `useLiveQuery`.

**Mock para desarrollar en web:** `src/control/mock.ts` con datos falsos (TikTok, Instagram, Telegram, Clash Royale…) activable con `localStorage.lykariControlMock = "1"`; en ese caso `Control.tsx` usa el mock aunque no sea nativo.

**No tocar:** `App.tsx`, `db.ts`, `Zamly.tsx`, contratos, nada en `android/`.
**Aceptación:** build + tests pasan; con el mock se navegan todas las subpantallas en `npm run dev`.

---

## Encargo 4 — Sesión de ejercicio con la rutina visible (`codex/entrenamiento`)

**Problema.** En "Ejercicio"/"GymFace", al tocar "Cronometrar esta sesión" (`src/pantallas/Plan.tsx` ~241-260) se cierra la hoja del plan y se abre `src/pantallas/Sesion.tsx`, que solo muestra el reloj. No se ven los ejercicios, los checks ni el descanso, y el descanso (estado local en `Plan.tsx` ~51-94) se pierde.

**Hacer:**
1. Extraer de `DetallePlan` un componente `src/pantallas/plan/RutinaDelDia.tsx` (props: `plan`, `actividad`, `sesionId?`) con: título del día, lista de ejercicios con check, detalle, chip de descanso. `DetallePlan` pasa a usarlo.
2. **Checks guardan al tocar** usando `guardarAvanceHoy` (`src/db/planes.ts` ~242), pasando `sesionId` si existe (el campo `RegistroPlan.sesionId?` ya está en `db.ts`). Quitar la dependencia de un botón "guardar" final si existe.
3. **Descanso persistente:** `src/pantallas/plan/descanso.ts` guarda `{nombre, terminaEn}` en la tabla `ajustes` (clave `descansoActivo`, ver `src/ia/ajustes.ts` para el patrón). La cuenta se calcula con `terminaEn - Date.now()`, así sobrevive a salir/volver. Al llegar a 0: `navigator.vibrate(250)` y, si la app está en segundo plano, notificación local (ver `src/notificaciones.ts`).
4. `Sesion.tsx` recibe un prop nuevo opcional `plan?: Plan`. Con plan: cronómetro compacto en header fijo (tiempo mono, Pausar/Continuar, Finalizar) + `RutinaDelDia` desplazable debajo. Sin plan: pantalla actual sin cambios.
5. Colores: el descanso corriendo usa ámbar (algo corriendo ahora). Sin rojo.

**No tocar:** `App.tsx` (describir en "Cambios pendientes para integración": pasar `plan={planPorActividadId.get(actividadAbierta.id)}` a `<PantallaSesion>`), `db.ts`, `android/`.
**Aceptación:** build + tests pasan; en `npm run dev`, abrir Ejercicio → Cronometrar → se ven los ejercicios, marcar uno, iniciar descanso, ir a Hoy y volver con la barra de sesión: el check y la cuenta siguen.
