"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(currentFile);
const dataDirectory = path.join(projectRoot, "data");

const HOSE_FILES = [
  "fluoropolymer-hoses.json",
  "hybrid-hoses.json",
  "metal-flexible-tubes.json",
  "metal-hoses.json",
  "nylon-hoses.json",
  "polyethylene-hoses.json",
  "rubber-hoses.json"
];

const MATERIAL_PATTERNS = [
  {
    id: "filled_ptfe",
    patterns: [
      /ptfe.*(?:rellen|carga).*(?:carbon|negro)/i,
      /(?:carbon|negro).*(?:rellen|carga).*ptfe/i,
      /ptfe conductiv/i
    ]
  },
  {
    id: "filled_pfa",
    patterns: [
      /pfa.*(?:rellen|carga).*(?:carbon|negro)/i,
      /pfa conductiv/i
    ]
  },
  {
    id: "ptfe",
    patterns: [
      /\bptfe\b/i,
      /politetrafluoroetileno/i,
      /\btefl[oó]n\b/i
    ]
  },
  {
    id: "pfa",
    patterns: [
      /\bpfa\b/i,
      /perfluoroalcoxi/i,
      /perfluoroalkoxy/i
    ]
  },
  {
    id: "fep",
    patterns: [
      /\bfep\b/i
    ]
  },
  {
    id: "ss316l",
    patterns: [
      /acero inoxidable\s*316l/i,
      /\b316l\s*(?:ss|stainless)/i,
      /\bss[-\s]?316l\b/i
    ]
  },
  {
    id: "ss316",
    patterns: [
      /acero inoxidable\s*316(?!l)/i,
      /\b316\s*(?:ss|stainless)/i,
      /\bss[-\s]?316\b/i
    ]
  },
  {
    id: "ss304",
    patterns: [
      /acero inoxidable\s*304/i,
      /\b304\s*(?:ss|stainless)/i,
      /\bss[-\s]?304\b/i
    ]
  },
  {
    id: "ss302",
    patterns: [
      /acero inoxidable\s*302/i,
      /\b302\s*(?:ss|stainless)/i,
      /\bss[-\s]?302\b/i
    ]
  },
  {
    id: "nylon",
    patterns: [
      /\bnylon\b/i,
      /\bpoliamida\b/i,
      /\bpolyamide\b/i
    ]
  },
  {
    id: "polyethylene",
    patterns: [
      /\bpolietileno\b/i,
      /\bpolyethylene\b/i,
      /\bpe\b/i
    ]
  },
  {
    id: "buna_n",
    patterns: [
      /\bbuna[-\s]?n\b/i,
      /\bnbr\b/i,
      /caucho nitrilo/i,
      /nitrile rubber/i
    ]
  },
  {
    id: "epdm",
    patterns: [
      /\bepdm\b/i
    ]
  },
  {
    id: "silicone",
    patterns: [
      /\bsilicona\b/i,
      /\bsilicone\b/i
    ]
  },
  {
    id: "aramid_fiber",
    patterns: [
      /fibra de aramida/i,
      /\baramida\b/i,
      /\baramid\b/i
    ]
  },
  {
    id: "ceramic",
    patterns: [
      /\bcer[aá]mica\b/i,
      /\bceramic\b/i
    ]
  },
  {
    id: "fiber",
    patterns: [
      /\bmalla.*fibra\b/i,
      /\bfibra\b/i,
      /\bfiber\b/i
    ]
  },
  {
    id: "pvc",
    patterns: [
      /\bpvc\b/i,
      /cloruro de polivinilo/i
    ]
  },
  {
    id: "polyurethane",
    patterns: [
      /\bpoliuretano\b/i,
      /\bpolyurethane\b/i
    ]
  },
  {
    id: "csm",
    patterns: [
      /\bcsm\b/i,
      /\bhypalon\b/i,
      /polietileno clorosulfonado/i
    ]
  }
];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${filePath}`);
  }

  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(value)) {
    throw new Error(`${filePath} debe contener un arreglo JSON.`);
  }

  return value;
}

function identifyMaterials(description) {
  if (typeof description !== "string" || description.trim() === "") {
    return [];
  }

  const matches = [];

  for (const material of MATERIAL_PATTERNS) {
    if (
      material.patterns.some((pattern) =>
        pattern.test(description)
      )
    ) {
      matches.push(material.id);
    }
  }

  // Evita que "fiber" se duplique conceptualmente cuando ya se
  // identificó la fibra específica de aramida.
  if (matches.includes("aramid_fiber")) {
    return unique(matches.filter((id) => id !== "fiber"));
  }

  return unique(matches);
}

function chooseCoreMaterialId(series) {
  const currentId =
    typeof series.coreMaterialId === "string"
      ? series.coreMaterialId.trim()
      : "";

  if (currentId) {
    return currentId;
  }

  const ids = identifyMaterials(series.coreMaterial);

  return ids[0] || null;
}

function chooseAvailableCoreMaterialIds(series, defaultId) {
  const existing = Array.isArray(series.availableCoreMaterialIds)
    ? series.availableCoreMaterialIds.filter(Boolean)
    : [];

  const ids = [...existing];

  if (defaultId && !ids.includes(defaultId)) {
    ids.unshift(defaultId);
  }

  const electricalText =
    `${series.electricalProperty || ""} ${series.coreMaterial || ""}`;

  if (
    defaultId === "ptfe" &&
    /carbon|negro|conductiv|disipaci[oó]n est[aá]tica/i.test(
      electricalText
    ) &&
    !ids.includes("filled_ptfe")
  ) {
    ids.push("filled_ptfe");
  }

  if (
    defaultId === "pfa" &&
    /carbon|negro|conductiv|disipaci[oó]n est[aá]tica/i.test(
      electricalText
    ) &&
    !ids.includes("filled_pfa")
  ) {
    ids.push("filled_pfa");
  }

  return unique(ids);
}

function normalizeSeries(series, filename) {
  const coreMaterialId = chooseCoreMaterialId(series);

  const reinforcementMaterialIds =
    Array.isArray(series.reinforcementMaterialIds)
      ? unique(series.reinforcementMaterialIds.filter(Boolean))
      : identifyMaterials(series.reinforcement);

  const existingCoverId =
    typeof series.coverMaterialId === "string" &&
    series.coverMaterialId.trim() !== ""
      ? series.coverMaterialId.trim()
      : null;

  const coverIds = identifyMaterials(series.coverMaterial);

  const coverMaterialId =
    existingCoverId || coverIds[0] || null;

  return {
    ...series,
    coreMaterialId,
    availableCoreMaterialIds:
      chooseAvailableCoreMaterialIds(series, coreMaterialId),
    reinforcementMaterialIds,
    coverMaterialId,
    materialNormalization: {
      status: coreMaterialId ? "normalized" : "review",
      sourceFile: filename,
      generatedBy: "normalize-hose-materials-v1"
    }
  };
}

function validateSeries(series, filename) {
  const errors = [];

  if (!series.series) {
    errors.push(`${filename}: existe una serie sin código.`);
  }

  if (!series.coreMaterialId) {
    errors.push(
      `${filename} / serie ${series.series}: ` +
      `no se pudo normalizar "${series.coreMaterial || "sin ánima"}".`
    );
  }

  if (!Array.isArray(series.availableCoreMaterialIds)) {
    errors.push(
      `${filename} / serie ${series.series}: ` +
      "availableCoreMaterialIds no es un arreglo."
    );
  }

  if (!Array.isArray(series.reinforcementMaterialIds)) {
    errors.push(
      `${filename} / serie ${series.series}: ` +
      "reinforcementMaterialIds no es un arreglo."
    );
  }

  return errors;
}

function unique(values) {
  return [...new Set(values)];
}

function createBackup(filePath) {
  const backupPath = filePath.replace(
    /\.json$/i,
    ".before-material-normalization.json"
  );

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  return backupPath;
}

function updateMaterialsCatalog(materialIds) {
  const materialsPath = path.join(
    dataDirectory,
    "materials.json"
  );

  const existing = fs.existsSync(materialsPath)
    ? readJson(materialsPath)
    : [];

  const existingIds = new Set(
    existing.map((material) => material.id)
  );

  const names = {
    filled_ptfe: "PTFE con carga conductiva",
    filled_pfa: "PFA con carga conductiva",
    ptfe: "PTFE",
    pfa: "PFA",
    fep: "FEP",
    ss316l: "Acero inoxidable 316L",
    ss316: "Acero inoxidable 316",
    ss304: "Acero inoxidable 304",
    ss302: "Acero inoxidable 302",
    nylon: "Nylon",
    polyethylene: "Polietileno",
    buna_n: "Buna N",
    epdm: "EPDM",
    silicone: "Silicona",
    aramid_fiber: "Fibra de aramida",
    ceramic: "Cerámica",
    fiber: "Fibra",
    pvc: "PVC",
    polyurethane: "Poliuretano",
    csm: "CSM"
  };

  for (const id of [...materialIds].sort()) {
    if (existingIds.has(id)) {
      continue;
    }

    existing.push({
      id,
      name: names[id] || id,
      category: inferCategory(id),
      description:
        "Material agregado durante la normalización de la base técnica.",
      aliases: []
    });
  }

  fs.writeFileSync(
    materialsPath,
    JSON.stringify(existing, null, 2) + "\n",
    "utf8"
  );
}

function inferCategory(id) {
  if (id.startsWith("ss")) {
    return "metal";
  }

  if (
    ["buna_n", "epdm", "silicone", "csm"].includes(id)
  ) {
    return "elastomer";
  }

  if (
    ["fiber", "aramid_fiber", "ceramic"].includes(id)
  ) {
    return "reinforcement";
  }

  return "polymer";
}

function main() {
  const allMaterialIds = new Set();
  const validationErrors = [];
  let totalSeries = 0;

  console.log("Normalizando materiales de toda la base técnica...\n");

  for (const filename of HOSE_FILES) {
    const filePath = path.join(dataDirectory, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Se omitió ${filename}: archivo no encontrado.`);
      continue;
    }

    createBackup(filePath);

    const database = readJson(filePath);
    const normalized = database.map((series) =>
      normalizeSeries(series, filename)
    );

    for (const series of normalized) {
      totalSeries += 1;

      [
        series.coreMaterialId,
        ...series.availableCoreMaterialIds,
        ...series.reinforcementMaterialIds,
        series.coverMaterialId
      ]
        .filter(Boolean)
        .forEach((id) => allMaterialIds.add(id));

      validationErrors.push(
        ...validateSeries(series, filename)
      );
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(normalized, null, 2) + "\n",
      "utf8"
    );

    console.log(
      `✓ ${filename}: ${normalized.length} series actualizadas.`
    );
  }

  updateMaterialsCatalog(allMaterialIds);

  console.log(`\nSeries procesadas: ${totalSeries}`);
  console.log(`Materiales identificados: ${allMaterialIds.size}`);

  if (validationErrors.length > 0) {
    console.warn(
      "\n⚠ Elementos que requieren revisión manual:"
    );

    validationErrors.forEach((error) =>
      console.warn(`- ${error}`)
    );

    console.warn(
      "\nLa aplicación seguirá tratándolos como " +
      '"Requiere revisión"; nunca como "Cumple".'
    );
  } else {
    console.log(
      "\n✓ Todas las series tienen un material interno normalizado."
    );
  }
}

try {
  main();
} catch (error) {
  console.error("\n✖ Error durante la normalización:");
  console.error(error.message);
  process.exitCode = 1;
}
