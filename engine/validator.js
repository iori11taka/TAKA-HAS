"use strict";

const REQUIRED_SERIES_FIELDS = [
  "series",
  "name",
  "family",
  "constructionType",
  "sizes"
];

const REQUIRED_SIZE_FIELDS = [
  "nominalSize",
  "insideDiameterMm",
  "outsideDiameterMm"
];

export function validateHoseDatabase(database) {
  if (!Array.isArray(database)) {
    throw new Error(
      "La base técnica debe ser un arreglo."
    );
  }

  const seenSeries = new Set();

  database.forEach((series, seriesIndex) => {
    validateSeries(
      series,
      seriesIndex,
      seenSeries
    );
  });

  return true;
}

function validateSeries(
  series,
  seriesIndex,
  seenSeries
) {
  REQUIRED_SERIES_FIELDS.forEach((field) => {
    if (
      series[field] === undefined ||
      series[field] === null
    ) {
      throw new Error(
        `La serie en la posición ${seriesIndex} ` +
        `no contiene el campo "${field}".`
      );
    }
  });

  if (!Array.isArray(series.sizes)) {
    throw new Error(
      `La serie ${series.series} debe contener ` +
      `"sizes" como arreglo.`
    );
  }

  if (seenSeries.has(series.series)) {
    throw new Error(
      `La serie ${series.series} está duplicada.`
    );
  }

  seenSeries.add(series.series);

  const seenSizes = new Set();

  series.sizes.forEach((size, sizeIndex) => {
    validateSize(
      series.series,
      size,
      sizeIndex,
      seenSizes
    );
  });
}

function validateSize(
  seriesCode,
  size,
  sizeIndex,
  seenSizes
) {
  REQUIRED_SIZE_FIELDS.forEach((field) => {
    if (
      size[field] === undefined ||
      size[field] === null
    ) {
      throw new Error(
        `La serie ${seriesCode}, tamaño en posición ` +
        `${sizeIndex}, no contiene "${field}".`
      );
    }
  });

  if (seenSizes.has(size.nominalSize)) {
    throw new Error(
      `La serie ${seriesCode} tiene repetido el tamaño ` +
      `${size.nominalSize}.`
    );
  }

  seenSizes.add(size.nominalSize);
}
