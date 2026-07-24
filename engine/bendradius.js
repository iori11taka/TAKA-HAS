export function evaluateBendRadius(
  series,
  sizeData,
  application
) {

  // Validar el radio ingresado por el usuario
  if (
    typeof application.availableRadiusMm !== "number" ||
    !Number.isFinite(application.availableRadiusMm) ||
    application.availableRadiusMm <= 0
  ) {
    return {
      name: "Radio de curvatura",
      status: "fail",
      scoreImpact: -100,
      message:
        "El radio disponible debe ser un valor numérico mayor que cero."
    };
  }

  const availableCenterlineRadius =
    application.availableRadiusMm;

  const isDynamic =
    application.applicationType === "dynamic";

  const radiusType = isDynamic
    ? "dinámico"
    : "estático";

  /*
   * Radios publicados desde la línea central.
   */
  if (series.bendRadiusMeasurement === "centerline") {
    const requiredCenterlineRadius = isDynamic
      ? sizeData.dynamicBendRadiusMm
      : sizeData.staticBendRadiusMm;

    if (
      typeof requiredCenterlineRadius !== "number"
    ) {
      return missingRadiusResult(radiusType);
    }

    return createRadiusResult(
      availableCenterlineRadius,
      requiredCenterlineRadius,
      `Radio ${radiusType}`,
      "medido desde la línea central"
    );
  }

  /*
   * Radios publicados hasta el interior de la curva.
   */
  if (series.bendRadiusMeasurement === "inside") {
    let requiredInsideRadius;

    if (isDynamic) {
      requiredInsideRadius =
        sizeData.dynamicBendRadiusMm ??
        sizeData.minimumBendRadiusMm;
    } else {
      requiredInsideRadius =
        sizeData.staticBendRadiusMm ??
        sizeData.minimumBendRadiusMm;
    }

    if (typeof requiredInsideRadius !== "number") {
      return missingRadiusResult(radiusType);
    }

    if (
  typeof sizeData.outsideDiameterMm !== "number" ||
  !Number.isFinite(sizeData.outsideDiameterMm)
) {
  return {
    name: `Radio ${radiusType}`,
    status: "review",
    scoreImpact: -10,
    message:
      "No se puede convertir el radio interior a radio de línea central porque falta el diámetro exterior."
  };
}

const requiredCenterlineRadius =
  requiredInsideRadius +
  sizeData.outsideDiameterMm / 2;

    const result = createRadiusResult(
      availableCenterlineRadius,
      requiredCenterlineRadius,
      `Radio ${radiusType}`,
      "equivalente desde la línea central"
    );

    result.message +=
      ` El catálogo publica ${formatNumber(
        requiredInsideRadius
      )} mm hasta el interior de la curva.`;

    return result;
  }

  return {
    name: "Radio de curvatura",
    status: "review",
    scoreImpact: -10,
    message:
      "No está definido el método de medición del radio para esta serie."
  };
}

function createRadiusResult(
  availableRadius,
  requiredRadius,
  name,
  measurementDescription
) {
  if (availableRadius >= requiredRadius) {
    const margin =
      availableRadius - requiredRadius;

    return {
      name,
      status: "pass",
      scoreImpact: 0,
      message:
        `Radio mínimo: ${formatNumber(
          requiredRadius
        )} mm, ${measurementDescription}. ` +
        `Margen disponible: ${formatNumber(
          margin
        )} mm.`
    };
  }

  const missingRadius =
    requiredRadius - availableRadius;

  return {
    name,
    status: "fail",
    scoreImpact: -100,
    message:
      `Se requieren al menos ${formatNumber(
        requiredRadius
      )} mm, ${measurementDescription}. ` +
      `Faltan ${formatNumber(missingRadius)} mm.`
  };
}

function missingRadiusResult(radiusType) {
  return {
    name: `Radio ${radiusType}`,
    status: "review",
    scoreImpact: -10,
    message:
      `La base técnica no contiene un radio ${radiusType} ` +
      "para esta serie y tamaño."
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1
  }).format(value);
}