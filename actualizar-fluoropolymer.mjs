"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const databasePath = path.join(
  currentDirectory,
  "data",
  "fluoropolymer-hoses.json"
);

const SERIES_MATERIALS = {
  T: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe",
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "ss304"
    ],
    coverMaterialId: null
  },

  B: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe"
    ],
    reinforcementMaterialIds: [
      "ss304"
    ],
    coverMaterialId: null
  },

  X: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe",
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "fiber",
      "ss304"
    ],
    coverMaterialId: null
  },

  S: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe",
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "fiber",
      "ss304"
    ],
    coverMaterialId: "silicone"
  },

  C: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe",
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "ss304"
    ],
    coverMaterialId: null
  },

  J: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe"
    ],
    reinforcementMaterialIds: [
      "ss304"
    ],
    coverMaterialId: "silicone"
  },

  N: {
    coreMaterialId: "filled_ptfe",
    availableCoreMaterialIds: [
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "ceramic",
      "aramid_fiber"
    ],
    coverMaterialId: null
  },

  W: {
    coreMaterialId: "filled_ptfe",
    availableCoreMaterialIds: [
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "fiber",
      "ceramic",
      "ss304"
    ],
    coverMaterialId: "silicone"
  },

  F: {
    coreMaterialId: "ptfe",
    availableCoreMaterialIds: [
      "ptfe",
      "filled_ptfe"
    ],
    reinforcementMaterialIds: [
      "fiber"
    ],
    coverMaterialId: null
  },

  U: {
    coreMaterialId: "pfa",
    availableCoreMaterialIds: [
      "pfa",
      "filled_pfa"
    ],
    reinforcementMaterialIds: [
      "ss302"
    ],
    coverMaterialId: "silicone"
  }
};

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró el archivo: ${filePath}`
    );
  }

  const content = fs.readFileSync(
    filePath,
    "utf8"
  );

  let database;

  try {
    database = JSON.parse(content);
  } catch (error) {
    throw new Error(
      "fluoropolymer-hoses.json no contiene " +
      `un JSON válido: ${error.message}`
    );
  }

  if (!Array.isArray(database)) {
    throw new Error(
      "fluoropolymer-hoses.json debe contener un arreglo."
    );
  }

  return database;
}

function createBackup(filePath) {
  const backupPath = filePath.replace(
    ".json",
    ".backup.json"
  );

  fs.copyFileSync(filePath, backupPath);

  return backupPath;
}

function updateSeriesMaterials(series) {
  const materialConfiguration =
    SERIES_MATERIALS[series.series];

  if (!materialConfiguration) {
    console.warn(
      `⚠ Serie ${series.series}: no existe una ` +
      "configuración de materiales."
    );

    return series;
  }

  return insertMaterialFields(
    series,
    materialConfiguration
  );
}

function insertMaterialFields(
  series,
  materialConfiguration
) {
  const updatedSeries = {};

  Object.entries(series).forEach(
    ([key, value]) => {
      updatedSeries[key] = value;

      if (key === "coreMaterial") {
        updatedSeries.coreMaterialId =
          materialConfiguration.coreMaterialId;

        updatedSeries.availableCoreMaterialIds =
          materialConfiguration
            .availableCoreMaterialIds;
      }

      if (key === "reinforcement") {
        updatedSeries.reinforcementMaterialIds =
          materialConfiguration
            .reinforcementMaterialIds;
      }

      if (key === "coverMaterial") {
        updatedSeries.coverMaterialId =
          materialConfiguration.coverMaterialId;
      }
    }
  );

  return updatedSeries;
}

function validateUpdatedDatabase(database) {
  const errors = [];

  database.forEach((series) => {
    if (!series.coreMaterialId) {
      errors.push(
        `Serie ${series.series}: falta coreMaterialId.`
      );
    }

    if (
      !Array.isArray(
        series.availableCoreMaterialIds
      ) ||
      series.availableCoreMaterialIds.length === 0
    ) {
      errors.push(
        `Serie ${series.series}: falta ` +
        "availableCoreMaterialIds."
      );
    }

    if (
      !Array.isArray(
        series.reinforcementMaterialIds
      )
    ) {
      errors.push(
        `Serie ${series.series}: falta ` +
        "reinforcementMaterialIds."
      );
    }

    if (
      !Object.hasOwn(
        series,
        "coverMaterialId"
      )
    ) {
      errors.push(
        `Serie ${series.series}: falta ` +
        "coverMaterialId."
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(
      "La actualización produjo errores:\n" +
      errors.join("\n")
    );
  }
}

function printSummary(database) {
  console.log(
    "\nResumen de materiales actualizados:"
  );

  database.forEach((series) => {
    const reinforcement =
      series.reinforcementMaterialIds.length > 0
        ? series.reinforcementMaterialIds.join(", ")
        : "ninguno";

    console.log(
      [
        `• Serie ${series.series}`,
        `ánima=${series.coreMaterialId}`,
        `refuerzo=${reinforcement}`,
        `cubierta=${series.coverMaterialId ?? "ninguna"}`
      ].join(" | ")
    );
  });
}

function main() {
  console.log(
    "Actualizando materiales de las mangueras " +
    "de fluoropolímero..."
  );

  const database = readJsonFile(
    databasePath
  );

  const backupPath = createBackup(
    databasePath
  );

  const updatedDatabase = database.map(
    updateSeriesMaterials
  );

  validateUpdatedDatabase(
    updatedDatabase
  );

  fs.writeFileSync(
    databasePath,
    JSON.stringify(
      updatedDatabase,
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(
    "\n✓ fluoropolymer-hoses.json actualizado."
  );

  console.log(
    `✓ Copia de seguridad creada en:\n${backupPath}`
  );

  printSummary(
    updatedDatabase
  );
}

try {
  main();
} catch (error) {
  console.error(
    "\n✖ No se pudo completar la actualización."
  );

  console.error(
    error.message
  );

  process.exitCode = 1;
}