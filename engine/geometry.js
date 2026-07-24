"use strict";

export function calculateInstallationGeometry(input) {
  const routeType = input.routeType || "straight";
  const endAMm = positiveOrZero(input.endAMm);
  const endBMm = positiveOrZero(input.endBMm);
  const minimumRadiusMm = positive(input.minimumRadiusMm);
  const publishedMinimumRadiusMm =
    positive(input.publishedMinimumRadiusMm) || minimumRadiusMm;
  const installedRadiusMm = positive(input.installedRadiusMm);
  const outsideDiameterMm = positiveOrZero(input.outsideDiameterMm);
  const hoseConstructionType = String(input.hoseConstructionType || "");
  const hoseConstructionGroup = String(input.hoseConstructionGroup || "");
  const isMetalCore =
    hoseConstructionType === "metal" ||
    hoseConstructionGroup === "metal" ||
    hoseConstructionGroup === "metal-core";
  const radiusBasis = isMetalCore
    ? "Radio publicado para núcleo metálico: límite determinado cuando las corrugaciones comienzan a tocarse."
    : "Radio publicado para manguera no metálica: límite estático basado por Swagelok en la regla de deformación del 80 %.";

  if (!minimumRadiusMm) {
    return invalid("No se encontró un radio mínimo válido para esta manguera.");
  }

  let result;

  if (routeType === "straight") {
    const flexibleLengthMm = positive(input.straightLengthMm);
    if (!flexibleLengthMm) {
      return invalid("Ingresa la longitud flexible recta.");
    }

    result = {
      routeType,
      arcLengthMm: 0,
      straightLengthMm: flexibleLengthMm,
      totalLengthMm: endAMm + flexibleLengthMm + endBMm,
      details: [
        { label: "Tramo flexible", valueMm: flexibleLengthMm }
      ],
      installedRadiusMm: minimumRadiusMm,
      radiusPass: true
    };
  } else if (routeType === "elbow90") {
    const horizontalMm = positive(input.horizontalMm);
    const verticalMm = positive(input.verticalMm);

    if (!horizontalMm || !verticalMm) {
      return invalid("Ingresa las separaciones horizontal X y vertical Y.");
    }

    const hoseClearanceMm = outsideDiameterMm * 2;
    const maximumAvailableRadiusMm =
      horizontalMm - endAMm - hoseClearanceMm;

    if (maximumAvailableRadiusMm <= 0) {
      return invalid(
        "La separación horizontal no alcanza para el terminal 1 y dos diámetros exteriores de manguera."
      );
    }

    if (maximumAvailableRadiusMm < publishedMinimumRadiusMm) {
      return invalid(
        `El radio máximo disponible (${roundForMessage(maximumAvailableRadiusMm)} mm) ` +
        `es menor que el radio mínimo publicado (${roundForMessage(publishedMinimumRadiusMm)} mm).`
      );
    }

    /*
     * MANGUERA MÁS CORTA
     * Se usa la curva más amplia que permite la separación horizontal.
     * El tramo corto junto al terminal 1 se conserva como 2 × OD,
     * siguiendo el procedimiento mostrado en el ejemplo de cálculo.
     */
    const shortestVerticalStraightMm =
      verticalMm - maximumAvailableRadiusMm - endBMm;

    if (shortestVerticalStraightMm < 0) {
      return invalid(
        "La separación vertical no alcanza para el terminal 2 y el radio máximo disponible."
      );
    }

    const shortestArcMm = Math.PI * maximumAvailableRadiusMm / 2;
    const shortestLengthMm =
      endAMm + endBMm + hoseClearanceMm +
      shortestVerticalStraightMm + shortestArcMm;

    /*
     * MANGUERA MÁS LARGA
     * Se usa el radio mínimo interior publicado por el catálogo.
     * Conforme al método definido para esta herramienta, de cada separación
     * se descuentan el terminal y la longitud del arco de 90° calculada con
     * ese radio mínimo.
     */
    const longestArcMm = Math.PI * publishedMinimumRadiusMm / 2;
    const longestHorizontalStraightMm =
      horizontalMm - endAMm - longestArcMm;
    const longestVerticalStraightMm =
      verticalMm - endBMm - longestArcMm;

    if (
      longestHorizontalStraightMm < 0 ||
      longestVerticalStraightMm < 0
    ) {
      return invalid(
        "Las separaciones entre conexiones no alcanzan para los terminales y el arco calculado con el radio mínimo publicado."
      );
    }

    const longestLengthMm =
      endAMm + endBMm + longestHorizontalStraightMm +
      longestVerticalStraightMm + longestArcMm;

    const idealLengthMm = (shortestLengthMm + longestLengthMm) / 2;

    result = {
      routeType,
      totalLengthMm: idealLengthMm,
      shortestLengthMm,
      longestLengthMm,
      idealLengthMm,
      maximumAvailableRadiusMm,
      publishedMinimumRadiusMm,
      hoseClearanceMm,
      shortestArcMm,
      longestArcMm,
      shortestVerticalStraightMm,
      longestHorizontalStraightMm,
      longestVerticalStraightMm,
      arcLengthMm: longestArcMm,
      straightLengthMm:
        longestHorizontalStraightMm + longestVerticalStraightMm,
      installedRadiusMm: maximumAvailableRadiusMm,
      radiusPass: true,
      details: [
        { label: "Radio máximo disponible", valueMm: maximumAvailableRadiusMm },
        { label: "Radio mínimo publicado", valueMm: publishedMinimumRadiusMm },
        { label: "Longitud mínima", valueMm: shortestLengthMm },
        { label: "Longitud máxima", valueMm: longestLengthMm },
        { label: "Longitud ideal promedio", valueMm: idealLengthMm }
      ]
    };
  } else if (routeType === "u180") {
    const uMode = input.uMode === "dynamic" ? "dynamic" : "static";

    if (uMode === "dynamic") {
      const availableWidthMm = positive(input.availableWidthMm);
      const horizontalOffsetMm = positiveOrZero(input.horizontalOffsetMm);
      const horizontalMovementMm = positiveOrZero(input.horizontalMovementMm);
      const verticalMovementMm = positiveOrZero(input.verticalMovementMm);
      const verticalSeparationMm = positiveOrZero(input.verticalSeparationMm);
      const dynamicMinimumRadiusMm =
        positive(input.dynamicMinimumRadiusMm) || minimumRadiusMm;

      if (!availableWidthMm) {
        return invalid("Ingresa el espacio horizontal disponible para la U dinámica.");
      }

      if (horizontalOffsetMm >= availableWidthMm) {
        return invalid("El descuento horizontal debe ser menor que el espacio horizontal disponible.");
      }

      const uRadiusMm = (availableWidthMm - horizontalOffsetMm) / 2;
      const uRadiusPass = uRadiusMm >= dynamicMinimumRadiusMm;
      const flexibleLengthMm =
        4 * uRadiusMm +
        1.57 * horizontalMovementMm +
        verticalMovementMm / 2;
      const totalLengthMm =
        flexibleLengthMm + endAMm + endBMm + verticalSeparationMm;

      result = {
        routeType,
        uMode,
        installedRadiusMm: uRadiusMm,
        minimumRadiusMm: dynamicMinimumRadiusMm,
        radiusPass: uRadiusPass,
        flexibleLengthMm,
        totalLengthMm,
        availableWidthMm,
        horizontalOffsetMm,
        horizontalMovementMm,
        verticalMovementMm,
        verticalSeparationMm,
        centerlineDiameterMm: uRadiusMm * 2,
        outsideEnvelopeMm: uRadiusMm * 2 + outsideDiameterMm,
        arcLengthMm: Math.PI * uRadiusMm,
        straightLengthMm: Math.max(0, flexibleLengthMm - Math.PI * uRadiusMm),
        details: [
          { label: "Radio disponible R", valueMm: uRadiusMm },
          { label: "Longitud flexible calculada", valueMm: flexibleLengthMm },
          { label: "Movimiento horizontal T1", valueMm: horizontalMovementMm },
          { label: "Movimiento vertical T2", valueMm: verticalMovementMm },
          { label: "Separación vertical adicional", valueMm: verticalSeparationMm },
          { label: "Terminales A1 + A2", valueMm: endAMm + endBMm }
        ]
      };
    } else {
      const legAMm = positive(input.legAMm);
      const legBMm = positive(input.legBMm);
      const centerlineDiameterMm = positive(input.centerlineDiameterMm);

      if (!legAMm || !legBMm || !centerlineDiameterMm) {
        return invalid("Ingresa ambos tramos rectos y el diámetro de línea central de la U.");
      }

      const uRadiusMm = centerlineDiameterMm / 2;
      const uRadiusPass = uRadiusMm >= minimumRadiusMm;
      const arcLengthMm = Math.PI * uRadiusMm;

      /*
       * Salvaguarda preliminar para evitar que la curva comience pegada al
       * terminal. La diapositiva de Swagelok explica cómo se determina el
       * radio publicado, pero no publica una longitud recta mínima universal.
       * Por ello usamos 2 × OD como criterio conservador configurable y lo
       * identificamos expresamente como validación preliminar, no como dato de
       * catálogo.
       */
      const preliminaryStraightMinimumMm =
        positive(input.preliminaryStraightMinimumMm) || outsideDiameterMm * 2;
      const legAPass = legAMm >= preliminaryStraightMinimumMm;
      const legBPass = legBMm >= preliminaryStraightMinimumMm;
      const transitionPass = legAPass && legBPass;

      result = {
        routeType,
        uMode,
        installedRadiusMm: uRadiusMm,
        radiusPass: uRadiusPass,
        transitionPass,
        legAPass,
        legBPass,
        preliminaryStraightMinimumMm,
        arcLengthMm,
        straightLengthMm: legAMm + legBMm,
        legAMm,
        legBMm,
        totalLengthMm: endAMm + endBMm + legAMm + legBMm + arcLengthMm,
        centerlineDiameterMm,
        outsideEnvelopeMm: centerlineDiameterMm + outsideDiameterMm,
        details: [
          { label: "Tramo flexible del lado 1", valueMm: legAMm },
          { label: "Arco de 180°", valueMm: arcLengthMm },
          { label: "Tramo flexible del lado 2", valueMm: legBMm },
          { label: "Recto mínimo preliminar por lado", valueMm: preliminaryStraightMinimumMm }
        ]
      };
    }
  } else {
    return invalid("El tipo de recorrido seleccionado no es válido.");
  }

  const effectiveRadiusMm = result.installedRadiusMm || installedRadiusMm || minimumRadiusMm;
  const effectiveRadiusPass = result.radiusPass ?? (effectiveRadiusMm >= minimumRadiusMm);
  const effectiveTransitionPass = result.transitionPass ?? true;
  const overallPass = effectiveRadiusPass && effectiveTransitionPass;
  const commercialIncrementMm = positive(input.commercialIncrementMm) || 10;
  const recommendedLengthMm =
    Math.ceil(result.totalLengthMm / commercialIncrementMm) * commercialIncrementMm;

  return {
    valid: true,
    ...result,
    installedRadiusMm: effectiveRadiusMm,
    minimumRadiusMm: result.minimumRadiusMm || minimumRadiusMm,
    radiusPass: effectiveRadiusPass,
    transitionPass: effectiveTransitionPass,
    overallPass,
    radiusMarginMm: effectiveRadiusMm - minimumRadiusMm,
    radiusBasis,
    isMetalCore,
    endAMm,
    endBMm,
    recommendedLengthMm,
    commercialIncrementMm,
    status: overallPass ? "pass" : "fail"
  };
}

export function getCenterlineMinimumRadius(series, sizeData, applicationType) {
  const isDynamic = applicationType === "dynamic";
  let radius = isDynamic
    ? sizeData?.dynamicBendRadiusMm ?? sizeData?.minimumBendRadiusMm
    : sizeData?.staticBendRadiusMm ?? sizeData?.minimumBendRadiusMm;

  if (!Number.isFinite(radius)) return null;

  if (series?.bendRadiusMeasurement === "inside") {
    const od = Number(sizeData?.outsideDiameterMm);
    if (!Number.isFinite(od)) return null;
    radius += od / 2;
  }

  return radius;
}


export function getPublishedMinimumRadius(series, sizeData, applicationType) {
  const isDynamic = applicationType === "dynamic";
  const radius = isDynamic
    ? sizeData?.dynamicBendRadiusMm ?? sizeData?.minimumBendRadiusMm
    : sizeData?.staticBendRadiusMm ?? sizeData?.minimumBendRadiusMm;

  return Number.isFinite(radius) ? radius : null;
}

function roundForMessage(value) {
  return Math.round(value * 10) / 10;
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function positiveOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function invalid(message) {
  return { valid: false, status: "fail", message };
}
