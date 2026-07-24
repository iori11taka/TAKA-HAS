# Matriz de compatibilidad química v2

Esta versión contiene 180 registros específicos: 20 fluidos × 9 materiales de ánima.

## Alcance

La matriz sirve para **preselección y cribado**, no como aprobación final. Evalúa el material principal del ánima y no sustituye la revisión de conexiones, soldaduras, juntas, limpieza, permeación, presión, temperatura, concentración, ciclos ni normativa aplicable.

## Cambios incluidos

- `data/material-compatibility.json`: 180 reglas específicas.
- `index.html`: campo opcional de concentración.
- `app.js`: captura y valida la concentración.
- `engine/compatibility.js`: no aplica reglas con límites de concentración cuando el usuario no ingresó concentración y marca los datos como cribado preliminar.

## Criterios conservadores

Servicios críticos como oxígeno, hidrógeno, cloro, amoniaco y H2S se mantienen con resultados condicionales o no recomendados cuando la compatibilidad química por sí sola no permite aprobar la aplicación.

## Referencias de orientación

- Swagelok, Hose and Flexible Tubing, MS-01-180.
- Swagelok, Oxygen System Safety, MS-06-13.
- Swagelok, guías de selección y seguridad de mangueras.
- Nickel Institute 4368, aceros inoxidables austeníticos para servicio criogénico.
- Guías de resistencia química de fabricantes de polímeros y elastómeros.

Antes de uso comercial, cada regla debe pasar por revisión y aprobación interna de ingeniería.
