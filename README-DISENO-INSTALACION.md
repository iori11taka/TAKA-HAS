# Diseñador de instalación v1.1

Mejoras de claridad incorporadas:

- Los extremos se identifican como Punto 1 y Punto 2.
- Las dimensiones rígidas se denominan Dimensión A del terminal 1 y 2.
- En la curva de 90°, X e Y se definen como separaciones entre caras de conexión.
- En la curva en U, los tramos se identifican como lado 1 y lado 2.
- El radio de la U se calcula automáticamente como R = D / 2.
- El campo de radio manual se oculta para la U, evitando valores contradictorios.
- El SVG muestra directamente puntos, lados, X, Y, D y R.
- Los resultados se recalculan al modificar las dimensiones.

Los cálculos siguen siendo preliminares y deben validarse con el método de medición, orientación de terminales, tolerancias y holgura requeridos.

## U dinámica para absorber movimiento

El diseñador distingue ahora entre U estática y U dinámica. Para la U dinámica usa:

- R = (X - offset) / 2
- L flexible = 4R + 1.57 T1 + T2 / 2
- OAL = L flexible + A1 + A2 + separación vertical adicional

La validación se realiza contra el radio mínimo dinámico de la serie, aunque la evaluación general se haya configurado como estática. T1, T2 y la separación vertical adicional son entradas independientes.

## Validación técnica v1.4

El diseñador distingue el fundamento del radio mínimo publicado:

- Núcleo metálico: se usa el radio publicado asociado al contacto de las corrugaciones.
- Otras mangueras: se usa el radio publicado por Swagelok, cuyo criterio estático se basa en la regla de deformación del 80 %.
- Servicio dinámico: se usa siempre el radio dinámico publicado para la serie y el tamaño.

La aplicación no recalcula esos radios; utiliza los valores del catálogo.

Para una U estática se añadió una salvaguarda independiente para la transición junto a los terminales. Como la documentación aportada no establece una longitud recta mínima universal, la herramienta utiliza provisionalmente `2 × OD` por cada lado y lo identifica como criterio preliminar, no como valor publicado por Swagelok. Si un lado queda por debajo, la geometría se marca como no aceptable aunque el radio de la U cumpla.

## v1.5 — Mejora del esquema SVG para U estática

- La U se centra y escala dentro del área visible sin cortar el arco superior.
- Las ramas se representan proporcionalmente a las longitudes ingresadas.
- Las cotas D y R se separan visualmente de la manguera.
- Se añaden representaciones grises de las dimensiones de terminal cuando son mayores que cero.
- Las etiquetas de cada lado se mantienen dentro del SVG.
- La longitud total se muestra en un recuadro independiente.
- Los segmentos que incumplen una validación continúan marcándose en rojo.
