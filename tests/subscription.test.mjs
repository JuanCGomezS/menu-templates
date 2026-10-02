import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  isStoreSubscriptionActive,
  isValidSubscription,
} = require("../functions/subscription.js");

const current = new Date("2026-01-15T12:00:00.000Z");

function subscription(startsAt, endsAt) {
  return { billingPeriod: "monthly", startsAt, endsAt };
}

test("legacy stores remain available when subscription is absent", () => {
  assert.equal(isStoreSubscriptionActive(undefined, current), true);
});

test("a plan is available from its start until, but excluding, its end", () => {
  const plan = subscription(
    new Date("2026-01-15T00:00:00.000Z"),
    new Date("2026-01-16T00:00:00.000Z"),
  );
  assert.equal(
    isStoreSubscriptionActive(plan, new Date("2026-01-15T00:00:00.000Z")),
    true,
  );
  assert.equal(
    isStoreSubscriptionActive(plan, new Date("2026-01-16T00:00:00.000Z")),
    false,
  );
});

test("future, expired, and malformed subscriptions fail closed", () => {
  assert.equal(
    isStoreSubscriptionActive(
      subscription(
        new Date("2026-01-16T00:00:00.000Z"),
        new Date("2026-02-16T00:00:00.000Z"),
      ),
      current,
    ),
    false,
  );
  assert.equal(
    isStoreSubscriptionActive(
      subscription(
        new Date("2025-12-01T00:00:00.000Z"),
        new Date("2026-01-01T00:00:00.000Z"),
      ),
      current,
    ),
    false,
  );
  assert.equal(isValidSubscription({ billingPeriod: "monthly" }), false);
});
