import { includes, excludes } from "./validation/assertions.mjs";
import { readValidationText } from "./validation-text.mjs";

const dataPage = await readValidationText("./api/_data-page.js", import.meta.url);

for (const token of [
  "function countRows(where, parameters) {",
  "function parametersEqual(left, right) {",
  "const sameResultSet = where === sourceWhere && parametersEqual(parameters, baseParameters);",
  "const totalRows = countRows(where, parameters);",
  "const sourceRows = sameResultSet ? totalRows : countRows(sourceWhere, baseParameters);",
  "totalRows,\n    sourceRows,",
]) {
  includes(dataPage, token, `Paged table count fast path is missing: ${token}`);
}

excludes(
  dataPage,
  "const sourceRows = Number(queryOne(\n    `SELECT count(*) AS count FROM players${sourceWhere}`",
  "Paged reads must not unconditionally execute the source count before result filters are known.",
);

console.log("Paged table reads reuse the filtered count as sourceRows whenever the final predicate is unchanged, while filtered requests preserve separate source and result totals.");
