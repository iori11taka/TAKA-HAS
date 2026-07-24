"use strict";

import {
  evaluatePressure,
  evaluatePulsation
} from "./engine/pressure.js";

import {
  evaluateBendRadius
} from "./engine/bendradius.js";

import {
  evaluateVibration
} from "./engine/vibration.js";

import {
  evaluateCompatibility
} from "./engine/compatibility.js";

import {
  calculateInstallationGeometry,
  getCenterlineMinimumRadius,
  getPublishedMinimumRadius
} from "./engine/geometry.js";

import {
  calculateResultStatus,
  calculateScore,
  sortResults
} from "./engine/scoring.js";

const DATA_FILES = [
  "./data/metal-hoses.json",
  "./data/metal-flexible-tubes.json",
  "./data/hybrid-hoses.json",
  "./data/fluoropolymer-hoses.json",
  "./data/nylon-hoses.json",
  "./data/polyethylene-hoses.json",
  "./data/rubber-hoses.json"
];

const FLUIDS_FILE = "./data/fluids.json";
const COMPATIBILITY_FILE =
  "./data/material-compatibility.json";

const elements = {
  form: document.getElementById("hoseForm"),
  summaryCard: document.getElementById("summaryCard"),
  summaryTitle: document.getElementById("summaryTitle"),
  candidateCount: document.getElementById("candidateCount"),
  resultsContainer: document.getElementById("resultsContainer"),
  globalWarnings: document.getElementById("globalWarnings"),
  geometryDesigner: document.getElementById("geometryDesigner"),
  geometrySelectedHose: document.getElementById("geometrySelectedHose"),
  geometryRouteType: document.getElementById("geometryRouteType"),
  geometryRouteFields: document.getElementById("geometryRouteFields"),
  geometryRadius: document.getElementById("geometryRadius"),
  geometrySvg: document.getElementById("geometrySvg"),
  geometryResult: document.getElementById("geometryResult"),
  calculateGeometry: document.getElementById("calculateGeometry"),
  closeGeometryDesigner: document.getElementById("closeGeometryDesigner")
};

let hoseDatabase = [];
let fluidsDatabase = [];
let compatibilityDatabase = [];
let latestResults = [];
let selectedGeometryResult = null;

initializeApplication();

async function initializeApplication() {
  validateRequiredElements();
  initializeSoftwareUi();

  setFormEnabled(false);

  try {
    [
      hoseDatabase,
      fluidsDatabase,
      compatibilityDatabase
    ] = await Promise.all([
      loadHoseDatabase(DATA_FILES),
      loadJsonFile(FLUIDS_FILE),
      loadJsonFile(COMPATIBILITY_FILE)
    ]);

    validateHoseDatabase(hoseDatabase);
    validateFluidsDatabase(fluidsDatabase);
    populateFluidSelector(fluidsDatabase);

    console.log(
      `Base técnica cargada: ${hoseDatabase.length} series.`
    );

    console.log(
      `Fluidos cargados: ${fluidsDatabase.length}.`
    );

    console.log(
      `Registros de compatibilidad cargados: ` +
      `${compatibilityDatabase.length}.`
    );

    console.table(
      hoseDatabase.map((hose) => ({
        serie: hose.series,
        familia: hose.family,
        construccion: hose.constructionType,
        tamanos: Array.isArray(hose.sizes)
          ? hose.sizes.length
          : 0
      }))
    );

    elements.form.addEventListener(
      "submit",
      handleFormSubmit
    );

    elements.resultsContainer.addEventListener(
      "click",
      handleResultActions
    );

    elements.geometryRouteType?.addEventListener(
      "change",
      () => {
        renderGeometryRouteFields();
        calculateAndRenderGeometry();
      }
    );

    elements.calculateGeometry?.addEventListener(
      "click",
      calculateAndRenderGeometry
    );

    elements.geometryDesigner?.addEventListener(
      "input",
      (event) => {
        if (event.target.matches("input, select")) {
          calculateAndRenderGeometry();
        }
      }
    );

    elements.closeGeometryDesigner?.addEventListener(
      "click",
      () => elements.geometryDesigner?.classList.add("hidden")
    );
  } catch (error) {
    console.error(
      "Error al inicializar Hose Advisor:",
      error
    );

    alert(
      "No se pudo cargar la base técnica. " +
      "Revisa la consola y los archivos JSON."
    );
  } finally {
    setFormEnabled(true);
  }
}

function validateRequiredElements() {
  const missingElements = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    throw new Error(
      `Faltan elementos HTML requeridos: ` +
      missingElements.join(", ")
    );
  }
}

function setFormEnabled(enabled) {
  if (!elements.form) {
    return;
  }

  const controls = elements.form.querySelectorAll(
    "input, select, button, textarea"
  );

  controls.forEach((control) => {
    control.disabled = !enabled;
  });
}

async function loadHoseDatabase(files) {
  const fileContents = await Promise.all(
    files.map(loadJsonFile)
  );

  return fileContents.flat();
}

async function loadJsonFile(file) {
  const response = await fetch(file, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${file}. HTTP ${response.status}`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      `${file} no contiene un JSON válido: ${error.message}`
    );
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `${file} debe contener un arreglo JSON.`
    );
  }

  return data;
}

function validateHoseDatabase(database) {
  const requiredSeriesFields = [
    "series",
    "name",
    "family",
    "constructionType",
    "sizes"
  ];

  const seenSeries = new Set();

  database.forEach((series, index) => {
    requiredSeriesFields.forEach((field) => {
      if (
        series[field] === undefined ||
        series[field] === null
      ) {
        throw new Error(
          `La serie en la posición ${index} no contiene ` +
          `el campo requerido "${field}".`
        );
      }
    });

    if (!Array.isArray(series.sizes)) {
      throw new Error(
        `La serie ${series.series} debe contener "sizes" ` +
        `como arreglo.`
      );
    }

    if (seenSeries.has(series.series)) {
      throw new Error(
        `La serie ${series.series} está duplicada.`
      );
    }

    seenSeries.add(series.series);
  });
}


function validateFluidsDatabase(database) {
  const seenIds = new Set();

  database.forEach((fluid, index) => {
    if (
      typeof fluid?.id !== "string" ||
      fluid.id.trim() === ""
    ) {
      throw new Error(
        `El fluido en la posición ${index} no tiene un id válido.`
      );
    }

    if (
      typeof fluid?.name !== "string" ||
      fluid.name.trim() === ""
    ) {
      throw new Error(
        `El fluido "${fluid.id}" no tiene un nombre válido.`
      );
    }

    if (seenIds.has(fluid.id)) {
      throw new Error(
        `El fluido "${fluid.id}" está duplicado.`
      );
    }

    seenIds.add(fluid.id);
  });
}

function populateFluidSelector(fluids) {
  const selector = document.getElementById("fluid");

  if (!selector) {
    throw new Error(
      'No se encontró el selector con id="fluid".'
    );
  }

  selector.innerHTML =
    '<option value="">Sin evaluación química</option>';

  const sortedFluids = [...fluids].sort((a, b) =>
    a.name.localeCompare(b.name, "es", {
      sensitivity: "base"
    })
  );

  sortedFluids.forEach((fluid) => {
    const option = document.createElement("option");

    option.value = fluid.id;
    option.textContent = fluid.name;

    selector.appendChild(option);
  });
}

function handleFormSubmit(event) {
  event.preventDefault();

  if (hoseDatabase.length === 0) {
    alert("La base técnica todavía no está disponible.");
    return;
  }

  const application = getApplicationData();
  const validationMessage =
    validateApplicationData(application);

  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  const results = evaluateAllHoses(application);
  latestResults = results;

  renderResults(results);
}

function getApplicationData() {
  const selectedApplicationType =
    document.querySelector(
      'input[name="applicationType"]:checked'
    );

  const fluidId =
    document.getElementById("fluid")?.value || "";

  const selectedFluid =
    fluidsDatabase.find(
      (fluid) => fluid.id === fluidId
    ) || null;

  return {
    nominalSize:
      document.getElementById("nominalSize").value,

    pressureBar: readNumberInput("pressure"),

    minimumTemperatureC:
      readNumberInput("minimumTemperature"),

    maximumTemperatureC:
      readNumberInput("maximumTemperature"),

    availableRadiusMm:
      readNumberInput("availableRadius"),

    applicationType:
      selectedApplicationType?.value || "static",

    hasPulsation:
      document.getElementById("hasPulsation").checked,

    vibrationLevel:
      document.getElementById("vibrationLevel").value,

    continuousVibration:
      document.getElementById(
        "continuousVibration"
      ).checked,

    lowPermeation:
      document.getElementById("lowPermeation").checked,

    requiresNonConductive:
      document.getElementById(
        "requiresNonConductive"
      )?.checked || false,

    fluidId,

    concentrationPercent:
      readOptionalNumberInput("concentration"),

    fluidFamilyId:
      selectedFluid?.familyId || "",

    fluidPhase:
      selectedFluid?.phase || "",

    inheritFamilyCompatibility:
      selectedFluid?.inheritFamilyCompatibility !== false,

    fluidWarnings:
      Array.isArray(selectedFluid?.warnings)
        ? selectedFluid.warnings
        : [],

    fluidTags:
      Array.isArray(selectedFluid?.tags)
        ? selectedFluid.tags
        : []
  };
}

function readNumberInput(id) {
  const element = document.getElementById(id);

  if (!element) {
    return Number.NaN;
  }

  return Number(element.value);
}

function readOptionalNumberInput(id) {
  const element = document.getElementById(id);

  if (!element || element.value.trim() === "") {
    return Number.NaN;
  }

  return Number(element.value);
}

function validateApplicationData(application) {
  if (!application.nominalSize) {
    return "Selecciona un tamaño nominal.";
  }

  if (
    !Number.isFinite(application.pressureBar) ||
    application.pressureBar < 0
  ) {
    return "Ingresa una presión válida mayor o igual a cero.";
  }

  if (
    !Number.isFinite(
      application.minimumTemperatureC
    ) ||
    !Number.isFinite(
      application.maximumTemperatureC
    )
  ) {
    return "Ingresa temperaturas válidas.";
  }

  if (
    application.maximumTemperatureC <
    application.minimumTemperatureC
  ) {
    return (
      "La temperatura máxima no puede ser menor " +
      "que la mínima."
    );
  }

  if (
    Number.isFinite(application.concentrationPercent) &&
    (application.concentrationPercent < 0 ||
      application.concentrationPercent > 100)
  ) {
    return "La concentración debe estar entre 0 y 100 %.";
  }

  if (
    !Number.isFinite(application.availableRadiusMm) ||
    application.availableRadiusMm <= 0
  ) {
    return (
      "Ingresa un radio disponible válido mayor que cero."
    );
  }

  return "";
}

function evaluateAllHoses(application) {
  const results = hoseDatabase.map((series) =>
    evaluateSeries(series, application)
  );

  return sortResults(results);
}

function evaluateSeries(series, application) {
  const checks = [];
  const warnings = [
    ...(Array.isArray(series.warnings)
      ? series.warnings
      : []),
    ...(Array.isArray(application.fluidWarnings)
      ? application.fluidWarnings
      : [])
  ];
  const reasons = [];

  const sizeData = findSizeData(
    series,
    application.nominalSize
  );

  if (!sizeData) {
    checks.push(
      createCheck({
        name: "Tamaño nominal",
        status: "fail",
        scoreImpact: -100,
        message:
          `La serie ${series.series} no está disponible ` +
          `en ${application.nominalSize} pulg.`
      })
    );

    return buildResult({
      series,
      sizeData: null,
      application,
      checks,
      warnings,
      reasons
    });
  }

  checks.push(
    createCheck({
      name: "Tamaño nominal",
      status: "pass",
      scoreImpact: 0,
      message:
        `Disponible en ${application.nominalSize} pulg.`
    })
  );

  checks.push(
    evaluateTemperature(
      series,
      sizeData,
      application
    )
  );

  checks.push(
    evaluatePressure(
      series,
      sizeData,
      application
    )
  );

  checks.push(
    evaluatePulsation(
      series,
      sizeData,
      application
    )
  );

  checks.push(
    evaluateBendRadius(
      series,
      sizeData,
      application
    )
  );

  checks.push(
    evaluateVibration(
      series,
      application
    )
  );

  checks.push(
    evaluateCompatibility(
      series,
      application,
      compatibilityDatabase
    )
  );

  evaluateLowPermeation({
    series,
    application,
    checks,
    reasons
  });

  evaluateElectricalRequirement({
    series,
    application,
    checks,
    reasons
  });

  addGeneralReasons({
    series,
    application,
    reasons
  });

  return buildResult({
    series,
    sizeData,
    application,
    checks,
    warnings,
    reasons
  });
}

function findSizeData(series, nominalSize) {
  if (!Array.isArray(series.sizes)) {
    return null;
  }

  return (
    series.sizes.find(
      (size) => size.nominalSize === nominalSize
    ) || null
  );
}

function evaluateTemperature(
  series,
  sizeData,
  application
) {
  const minimumTemperatureC =
    getFiniteValue(
      sizeData.temperatureMinC,
      series.temperatureMinC
    );

  const maximumTemperatureC =
    getFiniteValue(
      sizeData.temperatureMaxC,
      series.temperatureMaxC
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

function evaluateLowPermeation({
  series,
  application,
  checks,
  reasons
}) {
  if (!application.lowPermeation) {
    return;
  }

  if (series.lowPermeationSuitable === true) {
    checks.push(
      createCheck({
        name: "Baja permeación",
        status: "pass",
        scoreImpact: 0,
        message:
          "La serie está identificada como adecuada " +
          "para aplicaciones que requieren baja permeación."
      })
    );

    reasons.push(
      "La construcción presenta una característica " +
      "favorable de baja permeación."
    );

    return;
  }

  if (series.lowPermeationSuitable === false) {
    checks.push(
      createCheck({
        name: "Baja permeación",
        status: "fail",
        scoreImpact: -100,
        message:
          "La aplicación requiere baja permeación, " +
          "pero esta serie no está identificada como adecuada."
      })
    );

    return;
  }

  checks.push(
    createCheck({
      name: "Baja permeación",
      status: "review",
      scoreImpact: -8,
      message:
        "La base técnica no confirma la aptitud de " +
        "esta serie para el requisito de baja permeación."
    })
  );
}

function evaluateElectricalRequirement({
  series,
  application,
  checks,
  reasons
}) {
  if (!application.requiresNonConductive) {
    return;
  }

  const isNonConductive =
    series.nonConductive === true;

  if (isNonConductive) {
    checks.push(
      createCheck({
        name: "Propiedad no conductiva",
        status: "pass",
        scoreImpact: 0,
        message:
          "La serie está identificada como no conductiva."
      })
    );

    reasons.push(
      "La serie cumple el requisito eléctrico no conductivo."
    );

    return;
  }

  checks.push(
    createCheck({
      name: "Propiedad no conductiva",
      status: "fail",
      scoreImpact: -100,
      message:
        "La aplicación exige una manguera no conductiva " +
        "y esta serie no está identificada como tal."
    })
  );
}

function addGeneralReasons({
  series,
  application,
  reasons
}) {
  if (
    application.lowPermeation &&
    series.lowPermeationSuitable === true
  ) {
    reasons.push(
      "La serie puede mantenerse como candidata " +
      "cuando la permeación no es aceptable."
    );
  }

  if (
    series.constructionType !== "metal" &&
    (
      application.vibrationLevel === "high" ||
      application.continuousVibration
    )
  ) {
    reasons.push(
      "La construcción no metálica se mantiene " +
      "como candidata frente a la vibración indicada."
    );
  }
}

function createCheck({
  name,
  status,
  scoreImpact,
  message
}) {
  return {
    name,
    status,
    scoreImpact,
    message
  };
}

function getFiniteValue(primaryValue, fallbackValue) {
  if (Number.isFinite(primaryValue)) {
    return primaryValue;
  }

  return fallbackValue;
}

function buildResult({
  series,
  sizeData,
  application,
  checks,
  warnings,
  reasons
}) {
  const normalizedChecks =
    checks.filter(Boolean);

  const status =
    calculateResultStatus(normalizedChecks);

  const score = calculateScore(
    series,
    normalizedChecks,
    application,
    status
  );

  return {
    series,
    sizeData,
    status,
    score,
    checks: normalizedChecks,
    warnings: uniqueStrings(warnings),
    reasons: uniqueStrings(reasons)
  };
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      )
    )
  ];
}

function renderResults(results) {
  elements.resultsContainer.innerHTML = "";
  elements.globalWarnings.innerHTML = "";

  const groups = groupResultsByStatus(results);
  const accepted = groups.accepted;
  const review = groups.review;
  const rejected = groups.rejected;

  if (accepted.length > 0) {
    const best = accepted[0];
    setAssistantMessage(
      `La Serie ${best.series.series} obtuvo el mejor resultado con ${formatNumber(best.score)} puntos. ` +
      "Revisa las validaciones y abre el diseñador para confirmar la instalación."
    );
  } else if (review.length > 0) {
    setAssistantMessage(
      `La Serie ${review[0].series.series} es la candidata mejor posicionada, pero requiere validaciones adicionales antes de seleccionarla.`
    );
  } else {
    setAssistantMessage(
      "Ninguna serie cumple todas las condiciones ingresadas. Revisa presión, temperatura, radio y compatibilidad química."
    );
  }

  if (accepted.length > 0) {
    elements.summaryTitle.textContent =
      "Series recomendadas";
  } else if (review.length > 0) {
    elements.summaryTitle.textContent =
      "Series candidatas pendientes de validación";
  } else {
    elements.summaryTitle.textContent =
      "No se encontraron opciones válidas";
  }

  elements.candidateCount.textContent =
    `${accepted.length} cumplen · ` +
    `${review.length} en revisión · ` +
    `${rejected.length} no cumplen`;

  if (review.length > 0) {
    elements.globalWarnings.innerHTML = `
      <div class="alert alert-warning">
        Las opciones en revisión requieren completar
        las validaciones indicadas antes de emitir una
        selección final.
      </div>
    `;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((result, index) => {
    fragment.appendChild(
      createResultCard(result, index)
    );
  });

  elements.resultsContainer.appendChild(fragment);
  elements.summaryCard.classList.remove("hidden");

  elements.summaryCard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function groupResultsByStatus(results) {
  return {
    accepted: results.filter(
      (result) => result.status === "accepted"
    ),
    review: results.filter(
      (result) => result.status === "review"
    ),
    rejected: results.filter(
      (result) => result.status === "rejected"
    )
  };
}

function createResultCard(result, index) {
  const article = document.createElement("article");

  article.className =
    `hose-result hose-result--${result.status}`;

  article.dataset.resultIndex = String(index);
  article.dataset.series = result.series.series;

  const statusLabels = {
    accepted: "Cumple",
    review: "Requiere revisión",
    rejected: "No cumple"
  };

  const scoreMarkup =
    result.status !== "rejected"
      ? `<strong>${formatNumber(result.score)}/100</strong>`
      : "<strong>Descartada</strong>";

  article.innerHTML = `
    <div class="result-header">
      <div>
        <p class="series-label">
          SERIE ${escapeHtml(result.series.series)}
        </p>

        <h3>${escapeHtml(result.series.name)}</h3>
      </div>

      <div>
        <span
          class="status-badge status-badge--${result.status}"
        >
          ${statusLabels[result.status]}
        </span>

        <p>${scoreMarkup}</p>
      </div>
    </div>

    <p class="result-description">
      ${escapeHtml(result.series.description || "")}
    </p>

    ${createTechnicalDataMarkup(result)}

    <div class="construction">
      <p>
        <strong>Ánima:</strong>
        ${escapeHtml(
          result.series.coreMaterial ||
          "No especificada"
        )}
      </p>

      <p>
        <strong>Refuerzo:</strong>
        ${escapeHtml(
          result.series.reinforcement ||
          "No aplica o no especificado"
        )}
      </p>

      ${
        result.series.coverMaterial
          ? `
            <p>
              <strong>Cubierta:</strong>
              ${escapeHtml(result.series.coverMaterial)}
            </p>
          `
          : ""
      }
    </div>

    <div class="checks-list">
      ${result.checks
        .map(createCheckMarkup)
        .join("")}
    </div>

    ${createListBoxMarkup(
      "reason-box",
      "Aspectos favorables",
      result.reasons
    )}

    ${createListBoxMarkup(
      "warning-box",
      "Advertencias",
      result.warnings
    )}

    ${result.status !== "rejected" && result.sizeData ? `
      <button
        type="button"
        class="secondary-button geometry-open-button"
        data-geometry-index="${index}"
      >
        Diseñar forma de instalación
      </button>
    ` : ""}
  `;

  return article;
}

function createTechnicalDataMarkup(result) {
  if (!result.sizeData) {
    return "";
  }

  const pressureLabel =
    result.sizeData.pressureTemperatureTable
      ? "Presión base publicada"
      : "Presión publicada";

  return `
    <div class="technical-grid">
      <div>
        <span>Diámetro interior</span>
        <strong>
          ${formatNumber(
            result.sizeData.insideDiameterMm
          )} mm
        </strong>
      </div>

      <div>
        <span>Diámetro exterior</span>
        <strong>
          ${formatNumber(
            result.sizeData.outsideDiameterMm
          )} mm
        </strong>
      </div>

      <div>
        <span>${pressureLabel}</span>
        <strong>
          ${formatNumber(
            result.sizeData.workingPressureBar
          )} bar
        </strong>
      </div>
    </div>
  `;
}

function createCheckMarkup(check) {
  return `
    <div class="check-row check-row--${check.status}">
      <span class="check-icon">
        ${getCheckIcon(check.status)}
      </span>

      <div>
        <strong>${escapeHtml(check.name)}</strong>
        <p>${escapeHtml(check.message)}</p>
      </div>
    </div>
  `;
}

function createListBoxMarkup(
  className,
  title,
  items
) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <div class="${className}">
      <h4>${escapeHtml(title)}</h4>

      <ul>
        ${items
          .map(
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("")}
      </ul>
    </div>
  `;
}

function getCheckIcon(status) {
  const icons = {
    pass: "✓",
    review: "!",
    fail: "×"
  };

  return icons[status] || "?";
}


function handleResultActions(event) {
  const button = event.target.closest("[data-geometry-index]");
  if (!button) return;

  const index = Number(button.dataset.geometryIndex);
  const result = latestResults[index];
  if (!result?.sizeData) return;

  openGeometryDesigner(result);
}

function openGeometryDesigner(result) {
  selectedGeometryResult = result;

  const applicationType =
    document.querySelector('input[name="applicationType"]:checked')?.value ||
    "static";

  const minimumRadiusMm = getCenterlineMinimumRadius(
    result.series,
    result.sizeData,
    applicationType
  );

  elements.geometrySelectedHose.textContent =
    `Serie ${result.series.series} · ${result.sizeData.nominalSize} pulg. · ` +
    `radio mínimo ${formatNumber(minimumRadiusMm)} mm desde la línea central.`;

  elements.geometryRadius.value = Number.isFinite(minimumRadiusMm)
    ? String(Math.ceil(minimumRadiusMm * 10) / 10)
    : "";

  renderGeometryRouteFields();
  elements.geometryDesigner.classList.remove("hidden");
  setAssistantMessage(
    `Diseñando la Serie ${result.series.series}. Ajusta el recorrido y verifica que el radio instalado y las transiciones rectas cumplan.`
  );
  calculateAndRenderGeometry();
  elements.geometryDesigner.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderGeometryRouteFields() {
  const type = elements.geometryRouteType.value;
  const radiusField = document.getElementById("geometryRadiusField");

  if (radiusField) {
    radiusField.classList.add("hidden");
  }

  if (type === "straight") {
    elements.geometryRouteFields.innerHTML = `
      <div class="geometry-explanation">
        <strong>Recorrido recto</strong>
        <p>La longitud flexible se mide entre el final del terminal 1 y el inicio del terminal 2.</p>
      </div>
      <div class="field">
        <label for="geometryStraightLength">Longitud de la parte flexible recta</label>
        <div class="input-unit">
          <input id="geometryStraightLength" type="number" min="0.1" step="0.1" value="500">
          <span>mm</span>
        </div>
      </div>
    `;
    return;
  }

  if (type === "u180") {
    elements.geometryRouteFields.innerHTML = `
      <div class="geometry-explanation">
        <strong>Curva en U de 180°</strong>
        <p>Selecciona si la U permanecerá fija o si absorberá movimiento. La U dinámica usa el radio mínimo dinámico de la serie.</p>
      </div>

      <div class="field">
        <label for="geometryUMode">Tipo de servicio de la U</label>
        <select id="geometryUMode">
          <option value="static">U estática</option>
          <option value="dynamic">U dinámica para absorber movimiento</option>
        </select>
      </div>

      <div id="geometryUFields"></div>
    `;

    const modeSelector = document.getElementById("geometryUMode");
    modeSelector?.addEventListener("change", () => {
      renderUFields(modeSelector.value);
      calculateAndRenderGeometry();
    });

    renderUFields(modeSelector?.value || "static");
    return;
  }

  elements.geometryRouteFields.innerHTML = `
    <div class="geometry-explanation">
      <strong>Curva de 90°</strong>
      <p>Las separaciones X e Y se miden entre las caras de conexión de los equipos, no entre los extremos de la parte flexible.</p>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="geometryHorizontal">Separación horizontal X entre puntos de conexión</label>
        <div class="input-unit"><input id="geometryHorizontal" type="number" min="0.1" step="0.1" value="500"><span>mm</span></div>
        <p class="field-help">Distancia horizontal desde la cara de conexión 1 hasta la vertical de la cara de conexión 2.</p>
      </div>
      <div class="field">
        <label for="geometryVertical">Separación vertical Y entre puntos de conexión</label>
        <div class="input-unit"><input id="geometryVertical" type="number" min="0.1" step="0.1" value="1200"><span>mm</span></div>
        <p class="field-help">Diferencia de altura entre la cara de conexión 1 y la cara de conexión 2.</p>
      </div>
    </div>
  `;
}

function renderUFields(mode) {
  const container = document.getElementById("geometryUFields");
  if (!container) return;

  if (mode === "dynamic") {
    container.innerHTML = `
      <div class="geometry-explanation">
        <strong>U dinámica</strong>
        <p>El radio disponible se calcula como R = (X − offset) ÷ 2. La longitud flexible se calcula con L = 4R + 1.57·T1 + T2 ÷ 2.</p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label for="geometryAvailableWidth">Espacio horizontal disponible X</label>
          <div class="input-unit"><input id="geometryAvailableWidth" type="number" min="0.1" step="0.1" value="609.6"><span>mm</span></div>
          <p class="field-help">Distancia horizontal total disponible para formar la U.</p>
        </div>
        <div class="field">
          <label for="geometryHorizontalOffset">Descuento u offset horizontal</label>
          <div class="input-unit"><input id="geometryHorizontalOffset" type="number" min="0" step="0.1" value="127"><span>mm</span></div>
          <p class="field-help">Espacio ocupado por el equipo u obstáculo que debe restarse antes de dividir entre dos.</p>
        </div>
        <div class="field">
          <label for="geometryHorizontalMovement">Movimiento horizontal T1</label>
          <div class="input-unit"><input id="geometryHorizontalMovement" type="number" min="0" step="0.1" value="254"><span>mm</span></div>
          <p class="field-help">Recorrido horizontal máximo que deberá absorber la manguera.</p>
        </div>
        <div class="field">
          <label for="geometryVerticalMovement">Movimiento vertical T2</label>
          <div class="input-unit"><input id="geometryVerticalMovement" type="number" min="0" step="0.1" value="254"><span>mm</span></div>
          <p class="field-help">Recorrido vertical máximo que deberá absorber la manguera.</p>
        </div>
        <div class="field">
          <label for="geometryVerticalSeparation">Separación vertical adicional entre conexiones</label>
          <div class="input-unit"><input id="geometryVerticalSeparation" type="number" min="0" step="0.1" value="254"><span>mm</span></div>
          <p class="field-help">Separación fija que se suma al largo total. Puede coincidir con T2, pero es un dato conceptualmente distinto.</p>
        </div>
      </div>
      <div id="geometryCalculatedRadius" class="geometry-calculated-value">Radio disponible: —</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="geometry-explanation">
      <strong>U estática</strong>
      <p>El lado 1 y el lado 2 son las partes rectas flexibles de cada rama. El radio se calcula como la mitad de la separación entre líneas centrales.</p>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="geometryLegA">Tramo recto flexible del lado 1</label>
        <div class="input-unit"><input id="geometryLegA" type="number" min="0.1" step="0.1" value="300"><span>mm</span></div>
        <p class="field-help">Desde el final del terminal 1 hasta el punto tangente donde comienza la curva de 180°. Se validará un recto mínimo preliminar de 2 × OD.</p>
      </div>
      <div class="field">
        <label for="geometryLegB">Tramo recto flexible del lado 2</label>
        <div class="input-unit"><input id="geometryLegB" type="number" min="0.1" step="0.1" value="300"><span>mm</span></div>
        <p class="field-help">Desde el punto tangente donde termina la curva hasta el comienzo del terminal 2. Se validará un recto mínimo preliminar de 2 × OD.</p>
      </div>
    </div>
    <div class="field">
      <label for="geometryDiameter">Separación entre líneas centrales de las dos ramas (diámetro D)</label>
      <div class="input-unit"><input id="geometryDiameter" type="number" min="0.1" step="0.1" value="200"><span>mm</span></div>
      <p class="field-help">El diseñador calculará automáticamente R = D ÷ 2. No se mide entre los bordes exteriores de la manguera.</p>
    </div>
    <div id="geometryCalculatedRadius" class="geometry-calculated-value">Radio calculado: 100 mm</div>
  `;
}

function calculateAndRenderGeometry() {
  if (!selectedGeometryResult?.sizeData) return;

  const routeType = elements.geometryRouteType.value;
  const uMode = document.getElementById("geometryUMode")?.value || "static";

  const selectedApplicationType =
    document.querySelector('input[name="applicationType"]:checked')?.value ||
    "static";

  const radiusApplicationType =
    routeType === "u180" && uMode === "dynamic"
      ? "dynamic"
      : selectedApplicationType;

  const minimumRadiusMm = getCenterlineMinimumRadius(
    selectedGeometryResult.series,
    selectedGeometryResult.sizeData,
    radiusApplicationType
  );

  const publishedMinimumRadiusMm = getPublishedMinimumRadius(
    selectedGeometryResult.series,
    selectedGeometryResult.sizeData,
    radiusApplicationType
  );

  const centerlineDiameterMm = readGeometryNumber("geometryDiameter");
  const availableWidthMm = readGeometryNumber("geometryAvailableWidth");
  const horizontalOffsetMm = readGeometryNumber("geometryHorizontalOffset");

  if (routeType === "u180") {
    const calculatedRadius = uMode === "dynamic"
      ? (availableWidthMm - horizontalOffsetMm) / 2
      : centerlineDiameterMm / 2;

    const radiusOutput = document.getElementById("geometryCalculatedRadius");
    if (radiusOutput && Number.isFinite(calculatedRadius)) {
      radiusOutput.textContent =
        `${uMode === "dynamic" ? "Radio disponible" : "Radio calculado"}: ` +
        `${formatNumber(calculatedRadius)} mm`;
    }
  }

  const input = {
    routeType,
    uMode,
    endAMm: readGeometryNumber("geometryEndA"),
    endBMm: readGeometryNumber("geometryEndB"),
    installedRadiusMm: readGeometryNumber("geometryRadius"),
    minimumRadiusMm,
    publishedMinimumRadiusMm,
    dynamicMinimumRadiusMm:
      routeType === "u180" && uMode === "dynamic"
        ? minimumRadiusMm
        : Number.NaN,
    outsideDiameterMm: selectedGeometryResult.sizeData.outsideDiameterMm,
    hoseConstructionType: selectedGeometryResult.series.constructionType,
    hoseConstructionGroup: selectedGeometryResult.series.constructionGroup,
    preliminaryStraightMinimumMm:
      Number(selectedGeometryResult.sizeData.outsideDiameterMm) * 2,
    commercialIncrementMm: readGeometryNumber("geometryIncrement"),
    straightLengthMm: readGeometryNumber("geometryStraightLength"),
    horizontalMm: readGeometryNumber("geometryHorizontal"),
    verticalMm: readGeometryNumber("geometryVertical"),
    legAMm: readGeometryNumber("geometryLegA"),
    legBMm: readGeometryNumber("geometryLegB"),
    centerlineDiameterMm,
    availableWidthMm,
    horizontalOffsetMm,
    horizontalMovementMm: readGeometryNumber("geometryHorizontalMovement"),
    verticalMovementMm: readGeometryNumber("geometryVerticalMovement"),
    verticalSeparationMm: readGeometryNumber("geometryVerticalSeparation")
  };

  const geometry = calculateInstallationGeometry(input);
  renderGeometryResult(geometry);
  renderGeometrySvg(geometry, input);

  if (geometry.valid) {
    if (geometry.radiusPass === false) {
      setAssistantMessage(
        "El radio instalado no cumple. Aumenta el radio o modifica el espacio disponible antes de definir la longitud comercial."
      );
    } else if (geometry.transitionPass === false) {
      setAssistantMessage(
        "La transición recta próxima al terminal no cumple. Aumenta el tramo recto antes de iniciar la curvatura."
      );
    } else {
      setAssistantMessage(
        `La geometría cumple las validaciones preliminares. Longitud comercial recomendada: ${formatNumber(geometry.commercialLengthMm)} mm.`
      );
    }
  }
}

function readGeometryNumber(id) {
  const element = document.getElementById(id);
  return element ? Number(element.value) : Number.NaN;
}

function renderGeometryResult(geometry) {
  if (!geometry.valid) {
    elements.geometryResult.innerHTML = `
      <div class="alert alert-danger">${escapeHtml(geometry.message)}</div>
    `;
    return;
  }

  const detailRows = geometry.details
    .map((detail) => `
      <div><span>${escapeHtml(detail.label)}</span><strong>${formatNumber(detail.valueMm)} mm</strong></div>
    `)
    .join("");

  const diameterMarkup = geometry.centerlineDiameterMm
    ? `<div><span>Separación central D de la U</span><strong>${formatNumber(geometry.centerlineDiameterMm)} mm</strong></div>
       <div><span>Espacio exterior aproximado</span><strong>${formatNumber(geometry.outsideEnvelopeMm)} mm</strong></div>`
    : "";

  const elbowSummary = geometry.routeType === "elbow90"
    ? `
      <div><span>Longitud mínima</span><strong>${formatNumber(geometry.shortestLengthMm)} mm</strong></div>
      <div><span>Longitud máxima</span><strong>${formatNumber(geometry.longestLengthMm)} mm</strong></div>
      <div><span>Longitud ideal (promedio)</span><strong>${formatNumber(geometry.idealLengthMm)} mm</strong></div>
      <div><span>Longitud comercial recomendada</span><strong>${formatNumber(geometry.recommendedLengthMm)} mm</strong></div>
      <div><span>Radio máximo disponible</span><strong>${formatNumber(geometry.maximumAvailableRadiusMm)} mm</strong></div>
      <div><span>Radio mínimo publicado</span><strong>${formatNumber(geometry.publishedMinimumRadiusMm)} mm</strong></div>
    `
    : `
      <div><span>Longitud geométrica</span><strong>${formatNumber(geometry.totalLengthMm)} mm</strong></div>
      <div><span>Longitud comercial recomendada</span><strong>${formatNumber(geometry.recommendedLengthMm)} mm</strong></div>
      <div><span>Radio efectivo sobre la línea central</span><strong>${formatNumber(geometry.installedRadiusMm)} mm</strong></div>
      <div><span>Radio mínimo</span><strong>${formatNumber(geometry.minimumRadiusMm)} mm</strong></div>
      ${diameterMarkup}
      ${detailRows}
    `;

  const validationMarkup =
    geometry.routeType === "u180" && geometry.uMode === "static"
      ? `
        <div class="geometry-validation-list">
          <div class="geometry-validation geometry-validation--${geometry.radiusPass ? "pass" : "fail"}">
            <strong>Radio de curvatura</strong>
            <span>${formatNumber(geometry.installedRadiusMm)} mm ${geometry.radiusPass ? "≥" : "<"} ${formatNumber(geometry.minimumRadiusMm)} mm</span>
          </div>
          <div class="geometry-validation geometry-validation--${geometry.legAPass ? "pass" : "fail"}">
            <strong>Transición recta del lado 1</strong>
            <span>${formatNumber(geometry.legAMm)} mm ${geometry.legAPass ? "≥" : "<"} ${formatNumber(geometry.preliminaryStraightMinimumMm)} mm</span>
          </div>
          <div class="geometry-validation geometry-validation--${geometry.legBPass ? "pass" : "fail"}">
            <strong>Transición recta del lado 2</strong>
            <span>${formatNumber(geometry.legBMm)} mm ${geometry.legBPass ? "≥" : "<"} ${formatNumber(geometry.preliminaryStraightMinimumMm)} mm</span>
          </div>
        </div>
      `
      : "";

  elements.geometryResult.innerHTML = `
    <div class="geometry-status geometry-status--${geometry.status}">
      ${geometry.overallPass ? "Geometría aceptable" : "Geometría no aceptable"}
    </div>
    ${validationMarkup}
    <div class="geometry-metrics">
      ${elbowSummary}
    </div>
    <p class="field-help">
      ${geometry.routeType === "elbow90"
        ? "La longitud ideal es el promedio entre la manguera más corta posible (curva amplia) y la más larga posible (radio mínimo publicado)."
        : geometry.routeType === "u180" && geometry.uMode === "dynamic"
          ? "La U dinámica usa la fórmula L = 4R + 1.57·T1 + T2 ÷ 2; después suma las dimensiones A de los terminales y la separación vertical adicional."
          : "Longitud preliminar medida sobre la línea central e incluyendo las longitudes de terminal ingresadas."}
      Confirma orientación de conexiones, tolerancias de fabricación, holgura y método de medición antes de ordenar.
    </p>
  `;
}

function renderGeometrySvg(geometry, input) {
  const svg = elements.geometrySvg;
  const stroke = "#1476a8";
  const fitting = "#61707d";
  const dimension = "#24313d";
  const muted = "#61707d";

  if (!geometry.valid) {
    svg.innerHTML = `<text x="310" y="180" text-anchor="middle" fill="${dimension}">Completa dimensiones válidas</text>`;
    return;
  }

  const common = `fill="none" stroke="${stroke}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"`;

  if (input.routeType === "straight") {
    svg.innerHTML = `
      <line x1="90" y1="180" x2="530" y2="180" ${common}/>
      <circle cx="80" cy="180" r="9" fill="${fitting}"/>
      <circle cx="540" cy="180" r="9" fill="${fitting}"/>
      <text x="80" y="220" text-anchor="middle" fill="${dimension}">Punto 1</text>
      <text x="540" y="220" text-anchor="middle" fill="${dimension}">Punto 2</text>
      <text x="310" y="145" text-anchor="middle" fill="${dimension}">Parte flexible: ${formatNumber(input.straightLengthMm)} mm</text>
    `;
    return;
  }

  if (input.routeType === "u180") {
    if (input.uMode === "dynamic") {
      svg.innerHTML = `
        <path d="M 130 85 L 130 235 Q 130 305 200 305 L 360 305 Q 430 305 430 235 L 430 170" ${common}/>
        <circle cx="130" cy="75" r="9" fill="${fitting}"/>
        <circle cx="430" cy="160" r="9" fill="${fitting}"/>
        <text x="130" y="52" text-anchor="middle" fill="${dimension}">Punto 1</text>
        <text x="430" y="138" text-anchor="middle" fill="${dimension}">Punto 2</text>
        <text x="95" y="190" text-anchor="end" fill="${muted}">Rama fija</text>
        <text x="465" y="245" fill="${muted}">Rama móvil</text>
        <line x1="130" y1="335" x2="430" y2="335" stroke="${dimension}" stroke-width="1"/>
        <line x1="130" y1="328" x2="130" y2="342" stroke="${dimension}" stroke-width="1"/>
        <line x1="430" y1="328" x2="430" y2="342" stroke="${dimension}" stroke-width="1"/>
        <text x="280" y="355" text-anchor="middle" fill="${dimension}">2R = ${formatNumber(geometry.centerlineDiameterMm)} mm</text>
        <text x="280" y="285" text-anchor="middle" fill="${dimension}">R = ${formatNumber(geometry.installedRadiusMm)} mm</text>
        <text x="500" y="80" text-anchor="middle" fill="${dimension}"><tspan x="500" dy="0">T1 = ${formatNumber(input.horizontalMovementMm)} mm</tspan><tspan x="500" dy="20">T2 = ${formatNumber(input.verticalMovementMm)} mm</tspan></text>
        <text x="500" y="285" text-anchor="middle" fill="${dimension}"><tspan x="500" dy="0">OAL</tspan><tspan x="500" dy="20">${formatNumber(geometry.totalLengthMm)} mm</tspan></text>
      `;
      return;
    }

    const maxLeg = Math.max(input.legAMm || 1, input.legBMm || 1, 1);
    const availableWidth = 250;
    const minRadiusSvg = 58;
    const maxRadiusSvg = 112;
    const radiusRatio = geometry.centerlineDiameterMm > 0
      ? geometry.centerlineDiameterMm / Math.max(geometry.centerlineDiameterMm, maxLeg)
      : 0.5;
    const radiusSvg = Math.max(
      minRadiusSvg,
      Math.min(maxRadiusSvg, 72 + radiusRatio * 40)
    );

    const centerX = 300;
    const leftX = centerX - radiusSvg;
    const rightX = centerX + radiusSvg;
    const topY = 82;
    const maximumLegSvg = 205;
    const minimumLegSvg = 52;
    const legASvg = minimumLegSvg +
      (maximumLegSvg - minimumLegSvg) * ((input.legAMm || 0) / maxLeg);
    const legBSvg = minimumLegSvg +
      (maximumLegSvg - minimumLegSvg) * ((input.legBMm || 0) / maxLeg);
    const leftBottomY = Math.min(302, topY + radiusSvg + legASvg);
    const rightBottomY = Math.min(302, topY + radiusSvg + legBSvg);
    const tangentY = topY + radiusSvg;
    const leftStroke = geometry.legAPass ? stroke : "#c53030";
    const rightStroke = geometry.legBPass ? stroke : "#c53030";
    const arcStroke = geometry.radiusPass ? stroke : "#c53030";
    const terminalA = Math.max(0, Math.min(32, (input.endAMm || 0) * 0.35));
    const terminalB = Math.max(0, Math.min(32, (input.endBMm || 0) * 0.35));
    const labelLeftX = Math.max(88, leftX - 20);
    const labelRightX = Math.min(520, rightX + 20);

    svg.innerHTML = `
      <path d="M ${leftX} ${leftBottomY} L ${leftX} ${tangentY}" fill="none" stroke="${leftStroke}" stroke-width="12" stroke-linecap="round"/>
      <path d="M ${leftX} ${tangentY} A ${radiusSvg} ${radiusSvg} 0 0 1 ${rightX} ${tangentY}" fill="none" stroke="${arcStroke}" stroke-width="12" stroke-linecap="round"/>
      <path d="M ${rightX} ${tangentY} L ${rightX} ${rightBottomY}" fill="none" stroke="${rightStroke}" stroke-width="12" stroke-linecap="round"/>

      ${terminalA > 0 ? `<line x1="${leftX}" y1="${leftBottomY}" x2="${leftX}" y2="${leftBottomY + terminalA}" stroke="${fitting}" stroke-width="14" stroke-linecap="butt"/>` : ""}
      ${terminalB > 0 ? `<line x1="${rightX}" y1="${rightBottomY}" x2="${rightX}" y2="${rightBottomY + terminalB}" stroke="${fitting}" stroke-width="14" stroke-linecap="butt"/>` : ""}

      <circle cx="${leftX}" cy="${leftBottomY + terminalA + 7}" r="8" fill="${geometry.legAPass ? fitting : "#c53030"}"/>
      <circle cx="${rightX}" cy="${rightBottomY + terminalB + 7}" r="8" fill="${geometry.legBPass ? fitting : "#c53030"}"/>

      <text x="${leftX}" y="${Math.min(346, leftBottomY + terminalA + 31)}" text-anchor="middle" fill="${dimension}">Punto 1</text>
      <text x="${rightX}" y="${Math.min(346, rightBottomY + terminalB + 31)}" text-anchor="middle" fill="${dimension}">Punto 2</text>

      <text x="${labelLeftX}" y="${tangentY + Math.max(28, (leftBottomY - tangentY) / 2)}" text-anchor="end" fill="${leftStroke}">
        <tspan x="${labelLeftX}" dy="0">Lado 1</tspan>
        <tspan x="${labelLeftX}" dy="17">${formatNumber(input.legAMm)} mm</tspan>
      </text>
      <text x="${labelRightX}" y="${tangentY + Math.max(28, (rightBottomY - tangentY) / 2)}" fill="${rightStroke}">
        <tspan x="${labelRightX}" dy="0">Lado 2</tspan>
        <tspan x="${labelRightX}" dy="17">${formatNumber(input.legBMm)} mm</tspan>
      </text>

      <line x1="${leftX}" y1="42" x2="${rightX}" y2="42" stroke="${dimension}" stroke-width="1"/>
      <line x1="${leftX}" y1="35" x2="${leftX}" y2="49" stroke="${dimension}" stroke-width="1"/>
      <line x1="${rightX}" y1="35" x2="${rightX}" y2="49" stroke="${dimension}" stroke-width="1"/>
      <text x="${centerX}" y="27" text-anchor="middle" fill="${dimension}">D = ${formatNumber(geometry.centerlineDiameterMm)} mm</text>

      <line x1="${centerX}" y1="${topY}" x2="${centerX}" y2="${tangentY}" stroke="${dimension}" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="${centerX + 10}" y="${topY + radiusSvg / 2}" fill="${dimension}">R = ${formatNumber(geometry.installedRadiusMm)} mm</text>

      <rect x="468" y="65" width="132" height="58" rx="9" fill="#f4f6f8" stroke="#d5dce2"/>
      <text x="534" y="87" text-anchor="middle" fill="${muted}">Longitud total</text>
      <text x="534" y="109" text-anchor="middle" fill="${dimension}" font-weight="700">${formatNumber(geometry.totalLengthMm)} mm</text>

      ${input.endAMm > 0 ? `<text x="${leftX - 12}" y="${leftBottomY + terminalA / 2}" text-anchor="end" fill="${muted}">Terminal 1: ${formatNumber(input.endAMm)} mm</text>` : ""}
      ${input.endBMm > 0 ? `<text x="${rightX + 12}" y="${rightBottomY + terminalB / 2}" fill="${muted}">Terminal 2: ${formatNumber(input.endBMm)} mm</text>` : ""}

      ${!geometry.transitionPass ? `<text x="${centerX}" y="348" text-anchor="middle" fill="#c53030">La curva comienza demasiado cerca de un terminal</text>` : ""}
    `;
    return;
  }

  svg.innerHTML = `
    <path d="M 80 280 L 390 280 Q 500 280 500 170 L 500 80" ${common}/>
    <circle cx="70" cy="280" r="9" fill="${fitting}"/>
    <circle cx="500" cy="70" r="9" fill="${fitting}"/>
    <text x="70" y="310" text-anchor="middle" fill="${dimension}">Punto 1</text>
    <text x="500" y="48" text-anchor="middle" fill="${dimension}">Punto 2</text>
    <text x="235" y="260" text-anchor="middle" fill="${muted}">Tramo horizontal flexible</text>
    <text x="515" y="160" fill="${muted}">Tramo vertical flexible</text>
    <line x1="70" y1="330" x2="500" y2="330" stroke="${dimension}" stroke-width="1"/>
    <line x1="70" y1="323" x2="70" y2="337" stroke="${dimension}" stroke-width="1"/>
    <line x1="500" y1="323" x2="500" y2="337" stroke="${dimension}" stroke-width="1"/>
    <text x="285" y="352" text-anchor="middle" fill="${dimension}">X = ${formatNumber(input.horizontalMm)} mm entre caras</text>
    <line x1="560" y1="280" x2="560" y2="70" stroke="${dimension}" stroke-width="1"/>
    <line x1="553" y1="280" x2="567" y2="280" stroke="${dimension}" stroke-width="1"/>
    <line x1="553" y1="70" x2="567" y2="70" stroke="${dimension}" stroke-width="1"/>
    <text x="575" y="180" fill="${dimension}">Y = ${formatNumber(input.verticalMm)} mm</text>
    <text x="425" y="235" fill="${dimension}">R máx. = ${formatNumber(geometry.maximumAvailableRadiusMm)} mm</text>
    <text x="285" y="25" text-anchor="middle" fill="${dimension}">L ideal = ${formatNumber(geometry.idealLengthMm)} mm</text>
  `;
}


function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function initializeSoftwareUi() {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("taka-has-theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    root.dataset.theme = savedTheme;
  }

  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    localStorage.setItem("taka-has-theme", nextTheme);
    themeToggle.textContent = nextTheme === "dark" ? "☀" : "◐";
  });

  const sidebarToggle = document.getElementById("sidebarToggle");
  sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  const moduleLabel = document.getElementById("currentModuleLabel");
  document.querySelectorAll(".nav-item[data-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const target = document.getElementById(targetId);
      if (!target || target.classList.contains("hidden")) {
        setAssistantMessage(
          targetId === "geometryDesigner"
            ? "Primero evalúa una manguera y abre el diseñador desde una serie aceptada o en revisión."
            : "Este módulo estará disponible cuando existan resultados de evaluación."
        );
        return;
      }

      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      if (moduleLabel) moduleLabel.textContent = button.textContent.trim().replace("Próximamente", "");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.body.classList.remove("sidebar-open");
    });
  });

  initializeUserMenu(root, themeToggle);
  initializePwaFeatures();

  const assistant = document.getElementById("technicalAssistant");
  document.getElementById("assistantToggle")?.addEventListener("click", () => {
    assistant?.classList.toggle("collapsed");
  });
  document.getElementById("assistantClose")?.addEventListener("click", () => {
    assistant?.classList.add("collapsed");
  });
}

function initializeUserMenu(root, themeToggle) {
  const menuButton = document.getElementById("userMenuButton");
  const menu = document.getElementById("userMenu");
  const profileDialog = document.getElementById("profileDialog");
  const aboutDialog = document.getElementById("aboutDialog");
  const profileForm = document.getElementById("profileForm");
  const profileName = document.getElementById("profileName");
  const profileRole = document.getElementById("profileRole");
  const themeLabel = document.getElementById("userThemeLabel");

  const readProfile = () => ({
    name: localStorage.getItem("taka-has-user-name") || "Usuario técnico",
    role: localStorage.getItem("taka-has-user-role") || "Ingeniería"
  });

  const renderProfile = () => {
    const profile = readProfile();
    ["userDisplayName", "userMenuName"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = profile.name;
    });
    ["userDisplayRole", "userMenuRole"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = profile.role;
    });
  };

  const updateThemeLabel = () => {
    if (themeLabel) {
      themeLabel.textContent = root.dataset.theme === "dark"
        ? "Cambiar a modo claro"
        : "Cambiar a modo oscuro";
    }
    if (themeToggle) {
      themeToggle.textContent = root.dataset.theme === "dark" ? "☀" : "◐";
    }
  };

  const closeMenu = () => {
    menu?.classList.add("hidden");
    menuButton?.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    if (!menu || !menuButton) return;
    const willOpen = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !willOpen);
    menuButton.setAttribute("aria-expanded", String(willOpen));
  };

  renderProfile();
  updateThemeLabel();
  menuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });
  menu?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.getElementById("editProfileButton")?.addEventListener("click", () => {
    const profile = readProfile();
    if (profileName) profileName.value = profile.name;
    if (profileRole) profileRole.value = profile.role;
    closeMenu();
    profileDialog?.showModal();
    window.setTimeout(() => profileName?.focus(), 0);
  });

  document.getElementById("userThemeButton")?.addEventListener("click", () => {
    themeToggle?.click();
    updateThemeLabel();
    closeMenu();
  });

  document.getElementById("aboutButton")?.addEventListener("click", () => {
    closeMenu();
    aboutDialog?.showModal();
  });

  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = profileName?.value.trim() || "Usuario técnico";
    const role = profileRole?.value.trim() || "Ingeniería";
    localStorage.setItem("taka-has-user-name", name);
    localStorage.setItem("taka-has-user-role", role);
    renderProfile();
    profileDialog?.close();
    setAssistantMessage(`Perfil actualizado. Bienvenido, ${name}.`);
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeDialog)?.close();
    });
  });

  [profileDialog, aboutDialog].forEach((dialog) => {
    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  themeToggle?.addEventListener("click", updateThemeLabel);
}


function initializePwaFeatures() {
  const installButton = document.getElementById("installAppButton");
  const connectionStatus = document.getElementById("connectionStatus");
  const connectionText = document.getElementById("connectionStatusText");
  const sidebarDot = document.getElementById("sidebarConnectionDot");
  const sidebarText = document.getElementById("sidebarConnectionText");
  const updateToast = document.getElementById("updateToast");
  const reloadButton = document.getElementById("reloadAppButton");
  let deferredInstallPrompt = null;

  const renderConnection = () => {
    const online = navigator.onLine;
    connectionStatus?.classList.toggle("offline", !online);
    sidebarDot?.classList.toggle("offline", !online);
    if (connectionText) connectionText.textContent = online ? "Sistema operativo" : "Modo sin conexión";
    if (sidebarText) sidebarText.textContent = online ? "Motor técnico disponible" : "Cálculos locales disponibles";
    if (!online) {
      setAssistantMessage("Estás trabajando sin conexión. La evaluación, las bases técnicas almacenadas y el diseñador continúan disponibles localmente.");
    }
  };

  window.addEventListener("online", () => {
    renderConnection();
    setAssistantMessage("Conexión restablecida. TAKA-HAS continúa utilizando los motores técnicos locales.");
  });
  window.addEventListener("offline", renderConnection);
  renderConnection();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton?.classList.remove("hidden");
  });

  installButton?.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.classList.add("hidden");
      return;
    }
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setAssistantMessage(isiOS
      ? "Para instalar en iPhone o iPad, abre el menú Compartir de Safari y selecciona ‘Agregar a inicio’."
      : "Abre el menú del navegador y selecciona ‘Instalar TAKA-HAS’ o ‘Agregar a pantalla principal’."
    );
  });

  window.addEventListener("appinstalled", () => {
    installButton?.classList.add("hidden");
    setAssistantMessage("TAKA-HAS quedó instalado correctamente y puede abrirse como una aplicación independiente.");
  });

  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js").then((registration) => {
    if (registration.waiting) updateToast?.classList.remove("hidden");
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          updateToast?.classList.remove("hidden");
        }
      });
    });
    reloadButton?.addEventListener("click", () => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  }).catch((error) => console.warn("No se pudo registrar el modo offline:", error));

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function setAssistantMessage(message) {
  const messageElement = document.getElementById("assistantMessage");
  const assistant = document.getElementById("technicalAssistant");
  if (!messageElement || typeof message !== "string" || message.trim() === "") return;
  messageElement.textContent = message;
  assistant?.classList.remove("collapsed");
}
