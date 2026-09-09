# Auditoría UX/UI y arquitectura de información

## Decisión de producto

Lykari registra la realidad; no representa un horario que haya que cumplir. La interfaz debe reducir la fricción de empezar, dejar rastro verificable de lo que ocurrió y permitir revisar patrones sin castigo.

## Arquitectura final de navegación

```
Hoy ────── actividad → sesión → cierre con nota
 │  └───── agenda de estudios (contexto, no pestaña principal)
Capturar ─ cinco bandejas: música · video · negocio · diario · pendientes
Camino ─── días / semanas / meses → análisis y reparto de tiempo
```

La agenda deja de competir como una cuarta pestaña. Se abre desde Hoy porque responde a una pregunta de contexto inmediato («¿qué tengo alrededor de este día?»), mientras que Hoy, Capturar y Camino responden respectivamente a hacer, guardar y comprender.

## Hallazgos y correcciones aplicadas

| Hallazgo | Riesgo | Corrección |
|---|---|---|
| Cuatro pestañas principales | La agenda fragmentaba la tarea central y rompía la navegación aprobada. | Tres áreas principales; agenda contextual desde Hoy. |
| Rutina con elementos que sugieren gimnasio o equipo | No refleja el entorno real de entrenamiento y dificulta comenzar. | Rutina solo de peso corporal: sentadillas, zancadas, flexiones adaptables, planchas, puentes y abdominales. |
| “Completar” podía leerse como cumplimiento | Reintroduce la lógica de aprobar/fallar que la app debe evitar. | Se guarda «lo que hice»; el avance parcial vale como registro. |
| Respaldo omitía cursos y rutinas | Al pasar de móvil a laptop se perdía parte del contexto de los hábitos. | Formato de copia v2 con cursos, evaluaciones, planes y registros de rutina. |
| Dos equipos podían reemplazarse mutuamente | Un envío tardío podía borrar información nueva. | Revisión obligatoria de la copia: el puente rechaza conflictos y pide traer primero. |

## Reglas de interfaz mantenidas

- Hoy conserva el orden de acción: resumen breve, actividades numeradas, iniciar con un toque.
- El ámbar solo indica sesión/racha activa; los registros parciales usan pino, nunca rojo.
- Los tiempos de referencia siguen siendo una marca visual y no un límite.
- La ruta de entrenamiento alterna dos sesiones de cuerpo completo para evitar la dependencia de accesorios; cualquier ejercicio se puede registrar por separado.
- Móvil y laptop comparten los mismos datos y significado; en pantalla amplia solo cambia la disposición, no el flujo.

## Arquitectura de sincronización

```
PWA móvil ─┐                         ┌─ voz: «resumen de Lykari» / «registra…»
           ├─ HTTPS + clave → Sam    ┤
PWA laptop ┘              (laptop)   └─ REST: copia, resumen y sesiones
```

Cada dispositivo conserva IndexedDB como fuente local. Sam conserva una instantánea versionada y no las claves de IA. `PUT /v1/snapshot` exige la revisión que el dispositivo conoce; un cambio remoto devuelve `412` en vez de reemplazar datos. Esto prioriza integridad sobre una falsa “sincronización mágica”. El Bridge independiente queda como alternativa cuando Sam no está en uso.

## Control por chat

El MCP expone solo tres acciones con un límite claro: leer el resumen, listar actividades y añadir una sesión finalizada sobre una actividad existente. No puede borrar datos, editar secretos ni dejar un cronómetro abierto. Para conectar un chat remoto, el Bridge debe tener una URL HTTPS accesible y privada; una IP local o `localhost` no basta para un servicio de chat.
