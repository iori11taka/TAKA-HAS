"use strict";

import {
  createCheck
} from "../utils/helpers.js";

export function evaluateElectrical(
  series,
  application
) {
  if (!application.requiresNonConductive) {
    return null;
  }

  if (series.nonConductive === true) {
    return createCheck({
      name: "Propiedad no conductiva",
      status: "pass",
      scoreImpact: 0,
      message:
        "La serie está identificada como no conductiva."
    });
  }

  return createCheck({
    name: "Propiedad no conductiva",
    status: "fail",
    scoreImpact: -100,
    message:
      "La aplicación exige una manguera no conductiva " +
      "y esta serie no está identificada como tal."
  });
}
