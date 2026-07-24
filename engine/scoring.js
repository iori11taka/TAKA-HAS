export function calculateResultStatus(checks) {
  const hasFailure = checks.some(function (check) {
    return check.status === "fail";
  });

  if (hasFailure) {
    return "rejected";
  }

  const needsReview = checks.some(function (check) {
    return check.status === "review";
  });

  if (needsReview) {
    return "review";
  }

  return "accepted";
}

export function calculateScore(
  series,
  checks,
  application,
  status
) {
  /*
   * Las opciones descartadas siempre obtienen 0.
   */
  if (status === "rejected") {
    return 0;
  }

  /*
   * Se parte de una base de 70 puntos.
   * Luego se suman ventajas y se restan revisiones.
   */
  let score = 70;

  /*
   * RESULTADOS DE LOS CHEQUEOS
   */
  checks.forEach(function (check) {
    if (check.status === "pass") {
      score += 3;
    }

    if (check.status === "review") {
      score -= 5;
    }

    if (
      typeof check.scoreImpact === "number" &&
      check.scoreImpact < 0
    ) {
      score += check.scoreImpact;
    }
  });

  /*
   * SERVICIO DINÁMICO
   */
  if (application.applicationType === "dynamic") {
    if (series.dynamicPerformance === "alto") {
      score += 12;
    }

    if (series.dynamicPerformance === "medio") {
      score += 5;
    }

    if (series.dynamicPerformance === "limitado") {
      score -= 15;
    }
  }

  /*
   * SERVICIO ESTÁTICO
   */
  if (application.applicationType === "static") {
    if (series.lowPermeationSuitable === true) {
      score += 5;
    }

    if (series.chemicalCompatibilityLevel === "high") {
      score += 4;
    }
  }

  /*
   * VIBRACIÓN
   */
  const hasRelevantVibration =
    application.vibrationLevel === "moderate" ||
    application.vibrationLevel === "high" ||
    application.continuousVibration;

  if (hasRelevantVibration) {
    if (series.vibrationSuitability === "high") {
      score += 12;
    }

    if (series.vibrationSuitability === "medium") {
      score += 4;
    }

    if (series.vibrationSuitability === "low") {
      score -= 20;
    }
  }

  /*
   * BAJA PERMEACIÓN
   */
  if (application.lowPermeation) {
    if (series.lowPermeationSuitable === true) {
      score += 15;
    }

    if (series.lowPermeationSuitable === null) {
      score -= 8;
    }

    if (series.lowPermeationSuitable === false) {
      score -= 40;
    }
  }

  /*
   * PROPIEDAD NO CONDUCTIVA
   */
  if (
    application.requiresNonConductive &&
    typeof series.electricalProperty === "string" &&
    series.electricalProperty
      .toLowerCase()
      .includes("no conductiva")
  ) {
    score += 15;
  }

  /*
   * 7N es una serie especializada.
   * Si no se requiere propiedad no conductiva,
   * se mantiene como alternativa pero pierde prioridad.
   */
  if (
    series.series === "7N" &&
    !application.requiresNonConductive
  ) {
    score -= 10;
  }

  /*
   * Una opción pendiente de revisión no debe
   * mostrar una puntuación de selección aprobada.
   */
  if (status === "review") {
    score = Math.min(score, 89);
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

export function sortResults(results) {
  const statusOrder = {
    accepted: 1,
    review: 2,
    rejected: 3
  };

  return [...results].sort(function (a, b) {
    /*
     * Primero:
     * Cumple → Revisión → No cumple
     */
    const statusDifference =
      statusOrder[a.status] -
      statusOrder[b.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    /*
     * Dentro del mismo estado:
     * mayor puntuación primero.
     */
    const scoreDifference =
      b.score - a.score;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    /*
     * Si existe empate, ordenar por nombre de serie.
     */
    return a.series.series.localeCompare(
      b.series.series,
      "es",
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}