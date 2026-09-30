const BILLING_PERIODS = new Set([
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
]);

function asDate(value) {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === "function") return value.toDate();
  return null;
}

function isValidSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return false;
  const startsAt = asDate(subscription.startsAt);
  const endsAt = asDate(subscription.endsAt);
  return (
    BILLING_PERIODS.has(subscription.billingPeriod) &&
    startsAt instanceof Date &&
    endsAt instanceof Date &&
    Number.isFinite(startsAt.getTime()) &&
    Number.isFinite(endsAt.getTime()) &&
    startsAt < endsAt
  );
}

function isStoreSubscriptionActive(subscription, now = new Date()) {
  if (subscription === undefined) return true;
  if (!isValidSubscription(subscription)) return false;
  const startsAt = asDate(subscription.startsAt);
  const endsAt = asDate(subscription.endsAt);
  return startsAt <= now && now < endsAt;
}

module.exports = { isStoreSubscriptionActive, isValidSubscription };
