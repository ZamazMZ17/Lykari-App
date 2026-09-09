# Lykari Bridge

Este pequeño servidor hace que la laptop sea el punto de sincronización de Lykari. Conserva una instantánea cifrada en tránsito cuando se publica detrás de HTTPS; no guarda las API keys de IA porque estas nunca salen de cada dispositivo.

## Arranque

En PowerShell:

```powershell
$env:LYKARI_SYNC_TOKEN = "una-clave-aleatoria-de-20-caracteres-o-mas"
$env:LYKARI_ALLOWED_ORIGINS = "https://tu-dominio-de-la-app"
npm run sync:bridge
```

El archivo de datos se crea en `bridge/data/lykari-sync.json` y no se sube al repositorio. Para usarlo desde el teléfono, publica el puerto con una URL HTTPS privada (por ejemplo, mediante Tailscale Serve o un túnel HTTPS) y usa esa dirección y la misma clave en Ajustes → Sincronización con laptop. No uses la API key de Gemini como clave de sincronización.

La sincronización es deliberadamente manual: primero se trae o se envía desde un dispositivo. Si hubo cambios en otro equipo, el puente devuelve un conflicto en lugar de sobrescribirlos. Trae la versión más reciente y luego vuelve a enviar desde ese punto común.

## Control desde un chat

`POST /mcp` implementa un servidor MCP de alcance mínimo. Expone `resumen_hoy`, `listar_actividades` y `registrar_sesion`; este último solo puede añadir una sesión terminada a una actividad que ya existe. Un cliente compatible con MCP, incluido un chat configurado con un servidor MCP remoto, puede usarlo cuando el puente tenga una URL HTTPS pública/privada alcanzable y autenticación Bearer. El contrato REST está en `openapi.yaml` para clientes que usen OpenAPI.

Los clientes de chat no pueden alcanzar `localhost` ni una IP doméstica por sí solos: la URL debe ser accesible desde el servicio de chat y mantenerse privada. Revisa el método de conexión exacto del cliente antes de exponer datos personales.
