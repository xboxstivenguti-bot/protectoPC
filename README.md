# ANDER CLOUD PC Linux v1

Esta versión ya no intenta fingir Linux dentro de un HTML. Levanta tres servicios reales:

- **ANDER Linux:** escritorio Debian XFCE completo en el navegador.
- **ANDER Browser:** Chromium real; abre YouTube, Google, GitHub y descargas sin API de cada servicio.
- **ANDER Code:** code-server, VS Code ejecutándose en Linux con terminal y extensiones.

Los archivos de trabajo se guardan en `data/workspace` y se comparten entre Linux y VS Code.

## Inicio rápido en tu Codespace

Cuando los archivos aparezcan en el editor, abre la terminal y ejecuta:

```bash
git pull
cp -n .env.example .env
bash start.sh
```

Luego abre la pestaña **Puertos** y entra al puerto `8080`, identificado como **ANDER CLOUD PC**.

También puedes abrir la paleta de comandos de VS Code y ejecutar la tarea:

```text
ANDER: Iniciar PC
```

## Servicios

- `/` — interfaz principal de la laptop ANDER.
- `/linux/` — escritorio Linux Debian XFCE.
- `/browser/` — Chromium real para YouTube y cualquier página.
- `/code/` — VS Code web con terminal, Git y extensiones.

## Credenciales iniciales

Copia `.env.example` como `.env` y cambia la contraseña:

```env
ANDER_PORT=8080
ANDER_USER=ander
ANDER_PASSWORD=CAMBIA_ESTA_CLAVE
```

No publiques el Codespace o el servidor con la contraseña de ejemplo.

## Sincronización con GitHub

El proyecto incluye `scripts/auto-sync.sh`. Cuando el Codespace está limpio, revisa GitHub cada 60 segundos y aplica cambios remotos mediante `git pull --ff-only`. Nunca pisa archivos que estés editando ni commits locales sin subir.

Para guardar tus cambios desde la terminal:

```bash
git add .
git commit -m "Actualización de ANDER CLOUD PC"
git push
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
