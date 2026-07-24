"use strict";

/**
 * Obtiene una presión admisible conservadora a la temperatura máxima.
 *
 * La tabla debe contener objetos con:
 * - temperatureC
 * - workingPressureBar
 *
 * Cuando la temperatura queda entre dos puntos publicados, se utiliza
 * el menor de ambos valores. Esto evita inventar una interpolación que
 * el catálogo no publica y mantiene un criterio conservador.
 */
export function getAllowablePressureAtTemperature(
  pressureTemperatureTable,
  maximumTemperatureC
) {
  if (
    !Array.isArray(pressureTemperatureTable) ||
    pressureTemperatureTable.length === 0 ||
    !Number.isFinite(maximumTemperatureC)
  ) {
    return null;
  }

  const points = pressureTemperatureTable
    .filter(
      (point) =>
        Number.isFinite(point?.temperatureC) &&
        Number.isFinite(point?.workingPressureBar)
    )
    .map((point) => ({
      temperatureC: point.temperatureC,
      workingPressureBar: point.workingPressureBar
    }))
    .sort((a, b) => a.temperatureC - b.temperatureC);

  if (points.length === 0) {
    return null;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (maximumTemperatureC < first.temperatureC) {
    return {
      status: "outside-low",
      allowablePressureBar: null,
      lowerPoint: null,
      upperPoint: first
    };
  }

  if (maximumTemperatureC > last.temperatureC) {
    return {
      status: "outside-high",
      allowablePressureBar: null,
      lowerPoint: last,
      upperPoint: null
    };
  }

  const exact = points.find(
    (point) => point.temperatureC === maximumTemperatureC
  );

  if (exact) {
    return {
      status: "exact",
      allowablePressureBar: exact.workingPressureBar,
      lowerPoint: exact,
      upperPoint: exact
    };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const lowerPoint = points[index];
    const upperPoint = points[index + 1];

    if (
      maximumTemperatureC > lowerPoint.temperatureC &&
      maximumTemperatureC < upperPoint.temperatureC
    ) {
      return {
        status: "between",
        allowablePressureBar: Math.min(
          lowerPoint.workingPressureBar,
          upperPoint.workingPressureBar
        ),
        lowerPoint,
        upperPoint
      };
    }
  }

  return null;
}
