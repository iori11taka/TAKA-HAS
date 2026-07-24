# Evaluación presión-temperatura

Se añadió una evaluación automática de presión corregida por temperatura.

## Archivos modificados

- `engine/pressure.js`
- `data/fluoropolymer-hoses.json` (tabla publicada de la serie T)

## Archivo nuevo

- `engine/pressure-temperature.js`

## Criterio

Cuando la temperatura está entre dos puntos publicados, el sistema usa la
menor presión de ambos puntos. Es un criterio conservador y evita inventar
una interpolación no publicada por el catálogo.

Para series sin tabla digitalizada, el sistema conserva el estado
`Requiere revisión` cuando la temperatura supera la condición de referencia.

Fuente para la serie T: catálogo Swagelok MS-01-180, página 49.
