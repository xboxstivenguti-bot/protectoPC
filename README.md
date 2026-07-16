# ANDER CLOUD PC Linux v1

ANDER CLOUD PC ya usa servicios Linux reales:

- **ANDER Linux:** Debian XFCE completo en el navegador.
- **ANDER Browser:** Chromium real para YouTube, Google, GitHub y descargas sin API por aplicación.
- **ANDER Code:** VS Code web con terminal, Git y extensiones.

Los proyectos se guardan en `data/workspace` y se comparten entre Linux y VS Code.

## Arranque con un solo botón

El archivo principal es:

```text
start.js
```

Abre `start.js` en VS Code y pulsa el botón **Play / Run Code** de la esquina superior derecha. Code Runner ejecutará:

```bash
node start.js
```

Ese único archivo hace todo lo siguiente:

1. Comprueba y sincroniza GitHub mediante `git fetch` y `git pull --ff-only` cuando no hay cambios locales.
2. Crea `.env` y todas las carpetas persistentes necesarias.
3. Detiene la sesión anterior y elimina contenedores antiguos.
4. Libera el puerto configurado si otro proceso lo está usando.
5. Espera a que Docker esté listo.
6. Descarga y reconstruye Linux, Chromium, VS Code y Caddy.
7. Espera hasta que la laptop responda.
8. Muestra y trata de abrir automáticamente la URL del Codespace.

También puedes iniciarlo desde la terminal:

```bash
node start.js
```

O mediante:

```bash
npm start
```

## Primera vez en el Codespace

Después de traer estos cambios ejecuta:

```bash
git pull --ff-only
```

Luego abre la paleta de comandos y selecciona:

```text
Codespaces: Rebuild Container
```

La reconstrucción instala Docker, Node.js, Python y Code Runner. Después abre `start.js` y pulsa Play.

## Puerto y acceso

El proyecto usa por defecto:

```text
8080 — ANDER CLOUD PC
```

Cuando termine el arranque, abre la pestaña **Puertos** y toca el puerto `8080` si el navegador no se abrió automáticamente.

Servicios:

```text
/          Laptop ANDER
/linux/    Escritorio Debian XFCE
/browser/  Chromium real
/code/     VS Code web
```

## Credenciales

`.env` se crea desde `.env.example`:

```env
ANDER_PORT=8080
ANDER_USER=ander
ANDER_PASSWORD=CAMBIA_ESTA_CLAVE
```

Cambia la contraseña antes de compartir el puerto.

## Herramientas del editor

La configuración instala y prepara Code Runner. También incluye tareas:

```text
ANDER: Iniciar PC
ANDER: Detener PC
ANDER: Ver contenedores
ANDER: Ver logs
GitHub: Traer cambios
GitHub: Guardar cambios
```

## Sincronización con GitHub

`scripts/auto-sync.sh` revisa GitHub cada 60 segundos cuando no hay cambios locales. Nunca pisa trabajo sin guardar.

Para subir lo que edites desde el teléfono:

```bash
bash scripts/push-changes.sh
```

## Requisitos y límites

GitHub Codespaces sirve para desarrollar y probar desde el móvil, pero se detiene cuando no se usa. Para mantener la PC encendida permanentemente será necesario después un VPS o una mini PC Linux.

## Seguridad

No hagas público el puerto `8080` sin contraseña segura, HTTPS y autenticación. Quien entra al escritorio Linux puede utilizar la terminal del contenedor.
