# TAKA-HAS

**TAKA — Hose Assembly Selection System**

Rediseño profesional de la interfaz del selector y diseñador de ensambles de mangueras industriales.

## Archivos incluidos

- `index.html`: nueva estructura tipo software con header, sidebar, workspace, navegación y asistente técnico.
- `styles.css`: sistema visual responsive, tema claro/oscuro, tarjetas de resultados y viewport tipo CAD.
- `app.js`: lógica original conservada y ampliada únicamente con comportamiento visual, navegación, tema y mensajes de TAKA.
- `assets/taka-assistant.png`: mascota oficial integrada como asistente técnico.

## Integración con el proyecto original

Este paquete conserva las rutas originales que `app.js` utiliza:

- `./engine/pressure.js`
- `./engine/bendradius.js`
- `./engine/vibration.js`
- `./engine/compatibility.js`
- `./engine/geometry.js`
- `./engine/scoring.js`
- `./data/*.json`

Copia las carpetas `engine` y `data` de tu proyecto original dentro de esta carpeta antes de ejecutar. Los motores y JSON no fueron adjuntados en esta entrega, por lo que no se modificaron.

## Ejecución

Por usar módulos ES y `fetch`, abre el proyecto mediante un servidor local, por ejemplo **Live Server** en Visual Studio Code. No abras `index.html` directamente con `file://`.

## Verificaciones realizadas

- Sintaxis JavaScript validada con `node --check`.
- IDs requeridos por la lógica original conservados.
- Sin IDs HTML duplicados.
- Rutas de módulos, datos y recursos preservadas.
- Diseño responsive preparado para escritorio, tablet y móvil.

## PWA y funcionamiento sin conexión

Esta versión incluye `manifest.webmanifest`, `service-worker.js`, iconos instalables y detección de conectividad.

Para probarla correctamente, no abras `index.html` mediante `file://`. Usa un servidor local, por ejemplo:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`. En producción debe publicarse mediante HTTPS. La primera carga requiere conexión para almacenar los recursos; después puede abrirse sin internet.
