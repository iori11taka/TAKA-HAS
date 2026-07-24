"use strict";

export const DEFAULT_DATA_FILES = [
  "./data/metal-hoses.json",
  "./data/metal-flexible-tubes.json",
  "./data/hybrid-hoses.json",
  "./data/fluoropolymer-hoses.json",
  "./data/nylon-hoses.json",
  "./data/polyethylene-hoses.json",
  "./data/rubber-hoses.json"
];

export async function loadHoseDatabase(
  files = DEFAULT_DATA_FILES
) {
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

export async function loadFluids() {
  const response = await fetch("./data/fluids.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar fluids.json (${response.status})`
    );
  }

  const fluids = await response.json();

  if (!Array.isArray(fluids)) {
    throw new Error(
      "fluids.json debe contener un arreglo."
    );
  }

  return fluids;
}

export async function loadCompatibilityDatabase() {
  const response = await fetch(
    "./data/material-compatibility.json",
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar material-compatibility.json (${response.status})`
    );
  }

  const database = await response.json();

  if (!Array.isArray(database)) {
    throw new Error(
      "material-compatibility.json debe contener un arreglo."
    );
  }

  return database;
}