import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { storeIsOpen } = require("../functions/store-hours.js");

const timeZone = "America/Bogota";

test("rejects a configured schedule that omits the current day", () => {
  assert.equal(
    storeIsOpen(
      { monday: { open: "08:00", close: "18:00", closed: false } },
      timeZone,
      new Date("2025-01-07T17:00:00Z"),
    ),
    false,
  );
});

test("accepts an enabled day during its configured schedule", () => {
  assert.equal(
    storeIsOpen(
      { tuesday: { open: "08:00", close: "18:00", closed: false } },
      timeZone,
      new Date("2025-01-07T17:00:00Z"),
    ),
    true,
  );
});

test("rejects an order at the configured closing minute", () => {
  assert.equal(
    storeIsOpen(
      { tuesday: { open: "08:00", close: "18:00", closed: false } },
      timeZone,
      new Date("2025-01-07T23:00:00Z"),
    ),
    false,
  );
});

test("accepts the prior day overnight schedule after midnight", () => {
  assert.equal(
    storeIsOpen(
      {
        monday: { open: "18:00", close: "01:00", closed: false },
        tuesday: { closed: true },
      },
      timeZone,
      new Date("2025-01-07T05:30:00Z"),
    ),
    true,
  );
});
