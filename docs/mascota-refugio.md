# Kiro: compañero de expedición

Rediseño pedido por el dueño, septiembre de 2026. Nombre inicial editable: Kiro.

La mascota representa el camino registrado. Es un husky gris, blanco y negro,
con una bufanda ámbar que conserva los nudos ganados. El dibujo es SVG propio,
con volumen, máscara facial, orejas, pelaje y cola curvada; comparte rostro entre
la burbuja y la ficha. Los colores del animal son fijos para conservar su
legibilidad en modo claro y oscuro. El refugio y la interfaz siguen los tokens.

## Interacción

- Tocar la burbuja abre el refugio; el nombre se cambia desde el lápiz.
- Respiración lenta, parpadeo, oreja atenta y movimiento suave de cola.
- Tocar el animal produce un saludo breve, sin puntos ni premios por tocarlo.
- El modo tranquilo se guarda en el dispositivo y detiene las animaciones.
  La burbuja queda quieta cuando hay una sesión y la ficha durante una sesión
  corriendo. También se respeta la preferencia del sistema de reducir movimiento.
- Las huellas muestran registros de la semana actual. Vacíos y futuros se
  distinguen en su descripción accesible; nunca se califican como fracaso.
- La ficha muestra racha actual y total real de nudos permanentes. La ilustración
  representa hasta cinco nudos; el contador muestra todos.
- El equipo se calcula desde los registros existentes. Cada accesorio permite
  probar su apariencia, con una etiqueta explícita de vista previa. Probar no
  modifica los registros ni concede la pieza; al cerrar la ficha se descarta.
- El nombre y el modo tranquilo se comparten entre ficha y burbuja. Las consultas
  de semana/racha se actualizan al cambiar el día, sin tener que reiniciar.
- Se conserva el acceso a Camino y la opción de esconder hasta mañana.

## Límites del concepto

No necesita comida, atención obligatoria, compras ni notificaciones propias.
No hay una puntuación de autoestima ni una inferencia del estado emocional.
Su voz se refiere al registro observable: sesión, pausa o huella de hoy.
Las reglas de racha y desbloqueo siguen siendo las que ya tenía la aplicación.

## Verificación

Build web, pruebas existentes y compilación Android. Revisión visual en navegador
con ancho de celular; probador, nombre persistente y modo tranquilo comprobados
desde la interfaz. La revisión en navegador no sustituye una prueba en el teléfono.
