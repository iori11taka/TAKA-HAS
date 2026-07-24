"use strict";

import {
  getAllowablePressureAtTemperature
} from "./pressure-temperature.js";

export function evaluatePressure(
  series,
  sizeData,
  application
) {
  const requiredPressure = application.pressureBar;
  const publishedPressure = sizeData.workingPressureBar;
  const maximumTemperatureC = application.maximumTemperatureC;

  if (
    typeof requiredPressure !== "number" ||
    !Number.isFinite(requiredPressure) ||
    requiredPressure < 0
  ) {
    return {
      name: "Presión de servicio",
      status: "fail",
      scoreImpact: -100,
      message:
        "La presión requerida debe ser un valor numérico válido."
    };
  }

  if (
    typeof publishedPressure !== "number" ||
    !Number.isFinite(publishedPressure)
  ) {
    return {
      name: "Presión de servicio",
      status: "review",
      scoreImpact: -15,
      message:
        "La base técnica no contiene una presión de servicio válida para esta serie y tamaño."
    };
  }

  const temperatureResult =
    getAllowablePressureAtTemperature(
      sizeData.pressureTemperatureTable,
      maximumTemperatureC
    );

  if (temperatureResult) {
    return evaluateWithPressureTemperatureTable({
      requiredPressure,
      publishedPressure,
      maximumTemperatureC,
      temperatureResult
    });
  }

  if (requiredPressure > publishedPressure) {
    return {
      name: "Presión de servicio",
      status: "fail",
      scoreImpact: -100,
      message:
        `La aplicación requiere ${formatNumber(
          requiredPressure
        )} bar, pero la serie admite ${formatNumber(
          publishedPressure
        )} bar en la condición de referencia publicada.`
    };
  }

  const utilization =
    (requiredPressure / publishedPressure) * 100;

  if (
    typeof series.basePressureTemperatureMaxC === "number" &&
    maximumTemperatureC > series.basePressureTemperatureMaxC
  ) {
    return {
      name: "Presión de servicio",
      status: "review",
      scoreImpact: -12,
      message:
        `La presión requerida está por debajo de los ` +
        `${formatNumber(publishedPressure)} bar publicados, ` +
        `pero no existe una tabla digitalizada para calcular la ` +
        `presión admisible a ${formatNumber(
          maximumTemperatureC
        )} °C. El valor publicado corresponde hasta ` +
        `${formatNumber(
          series.basePressureTemperatureMaxC
        )} °C; debe revisarse la tabla del catálogo.`
    };
  }

  return {
    name: "Presión de servicio",
    status: "pass",
    scoreImpact: 0,
    message:
      `Presión publicada: ${formatNumber(
        publishedPressure
      )} bar. Utilización aproximada: ${formatNumber(
        utilization
      )} %.`
  };
}

function evaluateWithPressureTemperatureTable({
  requiredPressure,
  publishedPressure,
  maximumTemperatureC,
  temperatureResult
}) {
  if (temperatureResult.status === "outside-low") {
    return {
      name: "Presión de servicio",
      status: "review",
      scoreImpact: -15,
      message:
        `La temperatura máxima de ${formatNumber(
          maximumTemperatureC
        )} °C está por debajo del primer punto de la tabla ` +
        `presión-temperatura (${formatNumber(
          temperatureResult.upperPoint.temperatureC
        )} °C). No se extrapola la presión admisible.`
    };
  }

  if (temperatureResult.status === "outside-high") {
    return {
      name: "Presión de servicio",
      status: "fail",
      scoreImpact: -100,
      message:
        `La temperatura máxima de ${formatNumber(
          maximumTemperatureC
        )} °C supera el último punto publicado de la tabla ` +
        `presión-temperatura (${formatNumber(
          temperatureResult.lowerPoint.temperatureC
        )} °C).`
    };
  }

  const allowablePressure =
    temperatureResult.allowablePressureBar;

  if (!Number.isFinite(allowablePressure)) {
    return {
      name: "Presión de servicio",
      status: "review",
      scoreImpact: -15,
      message:
        "No fue posible determinar la presión admisible a la temperatura indicada."
    };
  }

  const utilization =
    (requiredPressure / allowablePressure) * 100;

  if (requiredPressure > allowablePressure) {
    return {
      name: "Presión de servicio",
      status: "fail",
      scoreImpact: -100,
      message:
        `A ${formatNumber(maximumTemperatureC)} °C, la tabla ` +
        `presión-temperatura permite de forma conservadora ` +
        `${formatNumber(allowablePressure)} bar. La aplicación ` +
        `requiere ${formatNumber(requiredPressure)} bar, por lo ` +
        `que la serie no cumple.`
    };
  }

  const methodMessage =
    temperatureResult.status === "between"
      ? `El valor se tomó conservadoramente entre los puntos ` +
        `${formatNumber(
          temperatureResult.lowerPoint.temperatureC
        )} y ${formatNumber(
          temperatureResult.upperPoint.temperatureC
        )} °C, usando la menor presión publicada.`
      : "El valor corresponde a un punto publicado de la tabla.";

  return {
    name: "Presión de servicio",
    status: "pass",
    scoreImpact: 0,
    message:
      `Presión base a 20 °C: ${formatNumber(
        publishedPressure
      )} bar. Presión admisible considerada a ` +
      `${formatNumber(maximumTemperatureC)} °C: ` +
      `${formatNumber(allowablePressure)} bar. Utilización: ` +
      `${formatNumber(utilization)} %. ${methodMessage}`
  };
}

export function evaluatePulsation(
  series,
  sizeData,
  application
) {
  if (!application.hasPulsation) {
    return {
      name: "Pulsaciones",
      status: "pass",
      scoreImpact: 0,
      message:
        "No se han indicado pulsaciones, golpes de ariete o subidas bruscas de presión."
    };
  }

  if (series.constructionType === "metal") {
    const fiftyPercentPressure =
      sizeData.workingPressureBar * 0.5;

    return {
      name: "Pulsaciones y golpes de presión",
      status: "review",
      scoreImpact: -20,
      message:
        `Las mangueras metálicas no deben someterse a pulsaciones, ` +
        `golpes de ariete o subidas bruscas superiores al 50 % de ` +
        `su presión de servicio. Para esta serie y tamaño, dicho ` +
        `valor equivale a ${formatNumber(
          fiftyPercentPressure
        )} bar.`
    };
  }

  return {
    name: "Pulsaciones e impulso",
    status: "review",
    scoreImpact: -8,
    message:
      "La construcción se mantiene como candidata, pero debe verificarse la magnitud, frecuencia y cantidad de ciclos de impulso."
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1
  }).format(value);
}
