export function evaluateVibration(
  series,
  application
) {
  const level =
    application.vibrationLevel || "none";

  const isContinuous =
    application.continuousVibration === true;

  const suitability =
    series.vibrationSuitability || "unknown";

  const isMetal =
    series.constructionType === "metal";

  /*
   * SIN VIBRACIÓN
   */
  if (level === "none" && !isContinuous) {
    return {
      name: "Vibración",
      status: "pass",
      scoreImpact: 0,
      message:
        "No se ha identificado vibración apreciable."
    };
  }

  /*
   * VIBRACIÓN BAJA E INTERMITENTE
   */
  if (level === "low" && !isContinuous) {
    return {
      name: "Vibración baja",
      status: "pass",
      scoreImpact: 0,
      message:
        "La vibración baja e intermitente no constituye por sí sola un criterio de descarte."
    };
  }

  /*
   * REGLA DE DESCARTE PARA MANGUERAS METÁLICAS
   *
   * De acuerdo con el criterio establecido para este
   * selector, una vibración alta y continua excluye
   * preliminarmente las construcciones metálicas.
   */
  if (
    isMetal &&
    level === "high" &&
    isContinuous
  ) {
    return {
      name: "Vibración alta y continua",
      status: "fail",
      scoreImpact: -100,
      message:
        "La vibración alta y continua descarta preliminarmente las mangueras metálicas para esta aplicación."
    };
  }

  /*
   * METÁLICAS CON VIBRACIÓN MODERADA, ALTA
   * O CONTINUA, PERO SIN CUMPLIR SIMULTÁNEAMENTE
   * LA CONDICIÓN DE DESCARTE.
   */
  if (
    isMetal &&
    (
      level === "moderate" ||
      level === "high" ||
      isContinuous
    )
  ) {
    return {
      name: "Vibración en manguera metálica",
      status: "review",
      scoreImpact: -20,
      message:
        "La construcción metálica requiere revisar amplitud, frecuencia, orientación del movimiento, radio dinámico y vida cíclica."
    };
  }

  /*
   * APTITUD ALTA
   *
   * Se mantiene como aprobada porque la base técnica
   * ya identifica a la serie como favorable frente
   * a vibración. La revisión final se conserva como
   * advertencia en el mensaje, no como cambio de estado.
   */
  if (suitability === "high") {
    return {
      name:
        level === "high" || isContinuous
          ? "Vibración alta o continua"
          : "Vibración",
      status: "pass",
      scoreImpact: 0,
      message:
        "La construcción presenta aptitud favorable frente a la vibración indicada. La instalación final debe respetar el radio dinámico y evitar torsión."
    };
  }

  /*
   * APTITUD MEDIA
   */
  if (suitability === "medium") {
    if (
      level === "high" ||
      isContinuous
    ) {
      return {
        name: "Vibración",
        status: "review",
        scoreImpact: -12,
        message:
          "La serie requiere validar frecuencia, amplitud, trazado y cantidad esperada de ciclos antes de su selección."
      };
    }

    return {
      name: "Vibración",
      status: "pass",
      scoreImpact: -2,
      message:
        "La serie puede mantenerse como candidata para la vibración moderada indicada."
    };
  }

  /*
   * APTITUD BAJA
   */
  if (suitability === "low") {
    if (
      level === "high" ||
      isContinuous
    ) {
      return {
        name: "Vibración",
        status: "review",
        scoreImpact: -25,
        message:
          "La construcción presenta aptitud limitada frente a vibración alta o continua y requiere evaluación técnica específica."
      };
    }

    return {
      name: "Vibración",
      status: "review",
      scoreImpact: -12,
      message:
        "La construcción presenta aptitud limitada frente a la vibración indicada."
    };
  }

  /*
   * INFORMACIÓN NO DISPONIBLE
   */
  return {
    name: "Vibración",
    status: "review",
    scoreImpact: -15,
    message:
      "La base técnica todavía no define la aptitud de esta serie frente a la vibración."
  };
}