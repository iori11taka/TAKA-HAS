"use strict";

const RESULT_BY_RATING = {
  compatible: {
    status: "pass",
    scoreImpact: 0,
    label: "Compatible"
  },
  conditional: {
    status: "review",
    scoreImpact: -10,
    label: "Compatible con condiciones"
  },
  unknown: {
    status: "review",
    scoreImpact: -15,
    label: "Compatibilidad no confirmada"
  },
  not_recommended: {
    status: "fail",
    scoreImpact: -100,
    label: "No recomendado"
  }
};

const RATING_PRIORITY = {
  compatible: 0,
  conditional: 1,
  unknown: 2,
  not_recommended: 3
};

export function evaluateCompatibility(
  series,
  application,
  compatibilityDatabase
) {
  if (!application?.fluidId) {
    return createReview(
      "No se seleccionó un fluido. La compatibilidad química " +
      "no puede considerarse aprobada."
    );
  }

  if (!Array.isArray(compatibilityDatabase)) {
    return createReview(
      "La base de compatibilidad química no está disponible."
    );
  }

  const materialId = normalizeMaterialId(
    series?.coreMaterialId || series?.coreMaterial
  );

  if (!materialId) {
    return createReview(
      "Compatibilidad química no evaluada: el material interno " +
      "de la serie no está normalizado."
    );
  }

  const specificCandidates = compatibilityDatabase.filter(
    (record) =>
      record.fluidId === application.fluidId &&
      record.materialId === materialId
  );

  const specificRecord = chooseApplicableRecord(
    specificCandidates,
    application
  );

  if (specificRecord) {
    return buildCheck(
      specificRecord,
      materialId,
      "specific"
    );
  }

  const inheritanceAllowed =
    application.inheritFamilyCompatibility !== false;

  const familyCandidates =
    inheritanceAllowed && application.fluidFamilyId
      ? compatibilityDatabase.filter(
          (record) =>
            record.familyId === application.fluidFamilyId &&
            record.materialId === materialId
        )
      : [];

  const familyRecord = chooseApplicableRecord(
    familyCandidates,
    application
  );

  if (familyRecord) {
    return buildCheck(
      familyRecord,
      materialId,
      "family"
    );
  }

  if (!inheritanceAllowed) {
    return createReview(
      "Este fluido exige una compatibilidad específica. " +
      "No se permite aprobarlo mediante herencia de familia química."
    );
  }

  if (
    specificCandidates.length > 0 ||
    familyCandidates.length > 0
  ) {
    return createReview(
      `Existen datos para ${formatMaterialName(materialId)}, ` +
      "pero no cubren la fase, concentración o temperatura ingresadas."
    );
  }

  return createReview(
    `Compatibilidad química no evaluada: no existe un registro ` +
    `específico ni familiar para ${formatMaterialName(materialId)} ` +
    "con el fluido seleccionado."
  );
}

function chooseApplicableRecord(records, application) {
  const applicable = records.filter(
    (record) =>
      matchesPhase(record, application) &&
      matchesConcentration(record, application) &&
      matchesTemperature(record, application)
  );

  if (applicable.length === 0) {
    return null;
  }

  return [...applicable].sort(
    (a, b) =>
      getRatingPriority(b.rating) -
      getRatingPriority(a.rating)
  )[0];
}

function matchesPhase(record, application) {
  if (
    !record.phase ||
    record.phase === "any" ||
    !application.fluidPhase
  ) {
    return true;
  }

  const phases = Array.isArray(record.phase)
    ? record.phase
    : [record.phase];

  return phases.includes(application.fluidPhase);
}

function matchesConcentration(record, application) {
  const concentration = application.concentrationPercent;
  const recordHasLimits =
    Number.isFinite(record.concentrationMinPercent) ||
    Number.isFinite(record.concentrationMaxPercent);

  if (!Number.isFinite(concentration)) {
    return !recordHasLimits;
  }

  if (
    Number.isFinite(record.concentrationMinPercent) &&
    concentration < record.concentrationMinPercent
  ) {
    return false;
  }

  if (
    Number.isFinite(record.concentrationMaxPercent) &&
    concentration > record.concentrationMaxPercent
  ) {
    return false;
  }

  return true;
}

function matchesTemperature(record, application) {
  if (
    Number.isFinite(record.temperatureMinC) &&
    Number.isFinite(application.minimumTemperatureC) &&
    application.minimumTemperatureC < record.temperatureMinC
  ) {
    return false;
  }

  if (
    Number.isFinite(record.temperatureMaxC) &&
    Number.isFinite(application.maximumTemperatureC) &&
    application.maximumTemperatureC > record.temperatureMaxC
  ) {
    return false;
  }

  return true;
}

function buildCheck(record, materialId, matchType) {
  const rating = Object.hasOwn(
    RESULT_BY_RATING,
    record.rating
  )
    ? record.rating
    : "unknown";

  const result = RESULT_BY_RATING[rating];

  const origin =
    matchType === "specific"
      ? "Resultado específico para el fluido."
      : "Resultado heredado de la familia química.";

  const notes =
    typeof record.notes === "string" &&
    record.notes.trim() !== ""
      ? ` ${record.notes.trim()}`
      : "";

  const screeningNotice =
    record.screeningOnly === true
      ? " Clasificación de cribado preliminar; no equivale a aprobación final del producto."
      : "";

  return {
    name: "Compatibilidad química",
    status: result.status,
    scoreImpact: result.scoreImpact,
    critical: true,
    message:
      `${result.label}: ${formatMaterialName(materialId)} ` +
      `con el fluido seleccionado. ${origin}${notes}` +
      screeningNotice,
    metadata: {
      evaluated: true,
      matchType,
      materialId,
      fluidId: record.fluidId || "",
      familyId: record.familyId || "",
      rating,
      confidence: record.confidence || "unknown",
      sourceId: record.sourceId || ""
    }
  };
}

function createReview(message) {
  return {
    name: "Compatibilidad química",
    status: "review",
    scoreImpact: -15,
    critical: true,
    message,
    metadata: {
      evaluated: false,
      rating: "unknown"
    }
  };
}

export function normalizeMaterialId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = [
    ["filled_ptfe", [
      "filled ptfe",
      "carbon filled ptfe",
      "ptfe conductivo",
      "ptfe relleno"
    ]],
    ["filled_pfa", [
      "filled pfa",
      "carbon filled pfa",
      "pfa conductivo",
      "pfa relleno"
    ]],
    ["ptfe", ["ptfe", "politetrafluoroetileno", "teflon"]],
    ["pfa", ["pfa", "perfluoroalkoxy", "perfluoroalcoxi"]],
    ["fep", ["fep"]],
    ["ss316l", [
      "ss316l",
      "ss 316l",
      "316l ss",
      "acero inoxidable 316l"
    ]],
    ["ss316", [
      "ss316",
      "ss 316",
      "316 ss",
      "acero inoxidable 316"
    ]],
    ["ss304", [
      "ss304",
      "ss 304",
      "304 ss",
      "acero inoxidable 304"
    ]],
    ["ss302", [
      "ss302",
      "ss 302",
      "302 ss",
      "acero inoxidable 302"
    ]],
    ["nylon", ["nylon", "poliamida", "polyamide"]],
    ["polyethylene", ["polyethylene", "polietileno"]],
    ["buna_n", ["buna n", "nbr", "caucho nitrilo"]],
    ["epdm", ["epdm"]],
    ["silicone", ["silicone", "silicona"]],
    ["pvc", ["pvc"]],
    ["polyurethane", ["polyurethane", "poliuretano"]],
    ["csm", ["csm", "hypalon"]]
  ];

  for (const [id, values] of aliases) {
    if (
      normalized === id.replaceAll("_", " ") ||
      values.includes(normalized)
    ) {
      return id;
    }
  }

  for (const [id, values] of aliases) {
    if (values.some((alias) => normalized.includes(alias))) {
      return id;
    }
  }

  return "";
}

function getRatingPriority(rating) {
  return RATING_PRIORITY[rating] ??
    RATING_PRIORITY.unknown;
}

function formatMaterialName(materialId) {
  const names = {
    filled_ptfe: "PTFE con carga conductiva",
    filled_pfa: "PFA con carga conductiva",
    ptfe: "PTFE",
    pfa: "PFA",
    fep: "FEP",
    ss316l: "acero inoxidable 316L",
    ss316: "acero inoxidable 316",
    ss304: "acero inoxidable 304",
    ss302: "acero inoxidable 302",
    nylon: "nylon",
    polyethylene: "polietileno",
    buna_n: "Buna N",
    epdm: "EPDM",
    silicone: "silicona",
    pvc: "PVC",
    polyurethane: "poliuretano",
    csm: "CSM"
  };

  return names[materialId] || materialId;
}
