"use strict";

import {
  createCheck
} from "../utils/helpers.js";

import {
  getEffectiveTemperatureRange
} from "../utils/temperature.js";

export function evaluateTemperature(
  series,
  sizeData,
  application
) {
  const {
    minimumTemperatureC,
    maximumTemperatureC
  } = getEffectiveTemperatureRange(
    series,
    sizeData
  );

  if (
    !Number.isFinite(minimumTemperatureC) ||
    !Number.isFinite(maximumTemperatureC)
  ) {
    return createCheck({
      name: "Rango de temperatura",
      status: "review",
      scoreImpact: -10,
      message:
        "La base técnica no contiene un rango de " +
        "temperatura completo para este tamaño."
    });
  }

  const minimumPass =
    application.minimumTemperatureC >=
    minimumTemperatureC;

  const maximumPass =
    application.maximumTemperatureC <=
    maximumTemperatureC;

  const status =
    minimumPass && maximumPass
      ? "pass"
      : "fail";

  return createCheck({
    name: "Rango de temperatura",
    status,
    scoreImpact: status === "pass" ? 0 : -100,
    message:
      `El tamaño ${sizeData.nominalSize} pulg. admite ` +
      `temperaturas entre ${minimumTemperatureC} y ` +
      `${maximumTemperatureC} °C.`
  });
}
