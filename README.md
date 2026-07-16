# ANDER CLOUD PC Linux v1

Esta versión ya no intenta fingir Linux dentro de un HTML. Levanta tres servicios reales:

- **ANDER Linux:** escritorio Debian XFCE completo en el navegador.
- **ANDER Browser:** Chromium real; abre YouTube, Google, GitHub y descargas sin API de cada servicio.
- **ANDER Code:** code-server, VS Code ejecutándose en Linux con terminal y extensiones.

Los archivos de trabajo se guardan en `data/workspace` y se comparten entre Linux y VS Code.

## Activarlo en el Codespace que ya tienes abierto

Primero abre la terminal y trae todo lo que se subió al repositorio:

```bash
git pull --ff-only
```

Después abre la paleta de comandos de VS Code, busca **Rebuild** y selecciona:

```text
Codespaces: Rebuild Container
```

La reconstrucción es necesaria porque este proyecto agregó Docker, Node.js, Python y la configuración completa del contenedor. Al terminar, `scripts/codespace-start.sh` intentará levantar ANDER CLOUD PC automáticamente.

Si no arranca solo, ejecuta:

```bash
cp -n .env.example .env
bash start.sh
```

Luego abre la pestaña **Puertos** y entra al puerto `8080`, identificado como **ANDER CLOUD PC**.

También puedes abrir la paleta de comandos y ejecutar la tarea:

```text
ANDER: Iniciar PC
```

## Servicios

- `/` — interfaz principal de la laptop ANDER.
- `/linux/` — escritorio Linux Debian XFCE.
- `/browser/` — Chromium real para YouTube y cualquier página.
- `/code/` — VS Code web con terminal, Git y extensiones.

## Credenciales iniciales

La reconstrucción crea `.env` usando `.env.example`. Cambia la contraseña antes de compartir el puerto:

```env
ANDER_PORT=8080
ANDER_USER=ander
ANDER_PASSWORD=CAMBIA_ESTA_CLAVE
```

## Sincronización con GitHub

`scripts/auto-sync.sh` revisa GitHub cada 60 segundos cuando el Codespace no tiene cambios locales. Solo aplica actualizaciones fast-forward y nunca pisa archivos que estés editando ni commits locales sin subir.

Desde **Terminal → Ejecutar tarea** también tienes:

```text
GitHub: Traer cambios
GitHub: Guardar cambios
ANDER: Iniciar PC
ANDER: Detener PC
ANDER: Ver contenedores
ANDER: Ver logs
```

Para guardar manualmente desde la terminal:

```bash
bash scripts/push-changes.sh
```

## Requisitos

Un entorno Linux con Docker y Docker Compose. GitHub Codespaces sirve para pruebas y desarrollo móvil; el Codespace se detiene cuando no se usa. Para mantener la PC encendida permanentemente se necesitará posteriormente un VPS o una mini PC Linux.

## Qué resuelve

- YouTube real sin YouTube Data API.
- Chromium real con audio, sesiones y descargas.
- Linux real con terminal y gestor de archivos.
- VS Code web con extensiones, Git y terminal.
- Node.js y Python disponibles en el Codespace.
- Datos persistentes mientras exista el Codespace o servidor.
- Acceso desde móvil, tablet o PC.

## Seguridad

No expongas el puerto `8080` públicamente sin contraseña segura, HTTPS y autenticación. Quien entra al escritorio Linux puede utilizar la terminal del contenedor.
