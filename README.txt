NORMALIZACIÓN TOTAL DE MATERIALES

1. Copia `normalize-all-hose-materials.mjs` a la raíz del proyecto,
   al mismo nivel que app.js.

2. Reemplaza:
   engine/compatibility.js

3. Abre una terminal en la raíz de HOSE-ADVISOR y ejecuta:

   node normalize-all-hose-materials.mjs

El script recorrerá:
- fluoropolymer-hoses.json
- hybrid-hoses.json
- metal-flexible-tubes.json
- metal-hoses.json
- nylon-hoses.json
- polyethylene-hoses.json
- rubber-hoses.json

Añadirá:
- coreMaterialId
- availableCoreMaterialIds
- reinforcementMaterialIds
- coverMaterialId
- materialNormalization

También actualizará materials.json con cualquier material detectado.

SEGURIDAD DEL CAMBIO

Antes de modificar cada archivo crea una copia con el nombre:

<archivo>.before-material-normalization.json

NUEVO COMPORTAMIENTO

compatibility.js ya nunca devuelve null cuando hay un fluido seleccionado.
Si falta el material o no existe una regla química, devuelve un check crítico
con estado `review`. Por tanto, la serie no puede mostrarse como “Cumple”.

PRUEBA RECOMENDADA

GNL, -163 a -150 °C:
- La serie FJ puede cumplir temperatura, presión y radio.
- Su compatibilidad química debe aparecer como “Requiere revisión”.
- El resultado global debe ser “Requiere revisión”, no “Cumple”.

Los datos químicos de prueba siguen siendo ficticios y no deben emplearse
para una selección real.
