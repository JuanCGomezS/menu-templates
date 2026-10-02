import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function loadStoreHours() {
  const source = readFileSync(
    new URL("../src/lib/store-hours.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports;
}

const { getStoreOpeningStatus } = loadStoreHours();

test("keeps an overnight schedule open after midnight", () => {
  const schedule = {
    monday: { open: "18:00", close: "01:00", closed: false },
    tuesday: { closed: true },
  };

  const result = getStoreOpeningStatus(
    schedule,
    "America/Bogota",
    new Date("2025-01-07T05:30:00Z"),
  );

  assert.equal(result.isOpen, true);
});

test("does not open an overnight shift before it starts", () => {
  const schedule = {
    monday: { closed: true },
    tuesday: { open: "18:00", close: "01:00", closed: false },
  };

  const result = getStoreOpeningStatus(
    schedule,
    "America/Bogota",
    new Date("2025-01-07T05:30:00Z"),
  );

  assert.equal(result.isOpen, false);
});

test("fails closed for an invalid configured time", () => {
  const result = getStoreOpeningStatus(
    { tuesday: { open: "8:00", close: "18:00", closed: false } },
    "America/Bogota",
    new Date("2025-01-07T17:00:00Z"),
  );

  assert.equal(result.isOpen, false);
});

test("closes at the configured closing minute", () => {
  const result = getStoreOpeningStatus(
    { tuesday: { open: "08:00", close: "18:00", closed: false } },
    "America/Bogota",
    new Date("2025-01-07T23:00:00Z"),
  );

  assert.equal(result.isOpen, false);
});
