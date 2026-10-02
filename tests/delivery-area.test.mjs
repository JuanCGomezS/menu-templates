import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

function loadClientModule() {
  const source = readFileSync(
    new URL("../src/lib/delivery-area.ts", import.meta.url),
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

const require = createRequire(import.meta.url);
const client = loadClientModule();
const server = require("../functions/delivery-area.js");
const center = { latitude: 4.711, longitude: -74.0721 };
const enabledArea = { enabled: true, radiusMeters: 1_000 };

for (const [name, isWithinDeliveryArea] of [
  ["client", client.isWithinDeliveryArea],
  ["server", server.isWithinDeliveryArea],
]) {
  test(`${name}: accepts a point within the configured radius`, () => {
    assert.equal(
      isWithinDeliveryArea(enabledArea, center, {
        latitude: 4.716,
        longitude: -74.0721,
      }),
      true,
    );
  });

  test(`${name}: accepts the coverage boundary`, () => {
    const pointAtBoundary = {
      latitude: 4.711 + 1_000 / 111_195,
      longitude: -74.0721,
    };
    assert.equal(
      isWithinDeliveryArea(
        {
          enabled: true,
          radiusMeters: server.distanceInMeters(center, pointAtBoundary),
        },
        center,
        pointAtBoundary,
      ),
      true,
    );
  });

  test(`${name}: rejects a point outside the configured radius`, () => {
    assert.equal(
      isWithinDeliveryArea(enabledArea, center, {
        latitude: 4.73,
        longitude: -74.0721,
      }),
      false,
    );
  });

  test(`${name}: fails closed for an enabled invalid area or point`, () => {
    assert.equal(
      isWithinDeliveryArea({ enabled: true }, center, center),
      false,
    );
    assert.equal(isWithinDeliveryArea(enabledArea, null, center), false);
  });

  test(`${name}: keeps delivery unrestricted when coverage is disabled`, () => {
    assert.equal(
      isWithinDeliveryArea({ enabled: false, radiusMeters: 1 }, center, {
        latitude: 10,
        longitude: -74,
      }),
      true,
    );
  });
}
