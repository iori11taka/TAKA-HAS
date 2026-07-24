"use strict";

import {
  createCheck
} from "../utils/helpers.js";

export function evaluatePermeability(
  series,
  application
) {
  if (!application.lowPermeation) {
    return null;
  }

  if (series.lowPermeationSuitable === true) {
    return createCheck({
      name: "Baja permeación",
      status: "pass",
      scoreImpact: 0,
      message:
        "La serie está identificada como adecuada " +
        "para aplicaciones que requieren baja permeación."
    });
  }

  if (series.lowPermeationSuitable === false) {
    return createCheck({
      name: "Baja permeación",
      status: "fail",
      scoreImpact: -100,
      message:
        "La aplicación requiere baja permeación, " +
        "pero esta serie no está identificada como adecuada."
    });
  }

  return createCheck({
    name: "Baja permeación",
    status: "review",
    scoreImpact: -8,
    message:
      "La base técnica no confirma la aptitud de " +
      "esta serie para el requisito de baja permeación."
  });
}
