export type BillingPeriod = "monthly" | "quarterly" | "semiannual" | "annual";

type SubscriptionDate =
  | { toDate?: () => Date; seconds?: number; nanoseconds?: number }
  | Date
  | null;

export interface StoreSubscription {
  billingPeriod: BillingPeriod;
  startsAt: SubscriptionDate;
  endsAt: SubscriptionDate;
}

export const BILLING_PERIODS: Array<{
  value: BillingPeriod;
  label: string;
  months: number;
}> = [
  { value: "monthly", label: "Mensual", months: 1 },
  { value: "quarterly", label: "Trimestral", months: 3 },
  { value: "semiannual", label: "Semestral", months: 6 },
  { value: "annual", label: "Anual", months: 12 },
];

export function subscriptionDate(value: SubscriptionDate | undefined) {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === "function") return value.toDate();
  if (
    value &&
    typeof value.seconds === "number" &&
    Number.isFinite(value.seconds) &&
    (value.nanoseconds === undefined ||
      (typeof value.nanoseconds === "number" &&
        Number.isFinite(value.nanoseconds)))
  )
    return new Date(
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000),
    );
  return null;
}

export function isValidSubscription(
  subscription: unknown,
): subscription is StoreSubscription {
  if (!subscription || typeof subscription !== "object") return false;
  const value = subscription as StoreSubscription;
  return (
    BILLING_PERIODS.some((period) => period.value === value.billingPeriod) &&
    subscriptionDate(value.startsAt) instanceof Date &&
    subscriptionDate(value.endsAt) instanceof Date &&
    Number.isFinite(subscriptionDate(value.startsAt)?.getTime()) &&
    Number.isFinite(subscriptionDate(value.endsAt)?.getTime()) &&
    subscriptionDate(value.startsAt)!.getTime() <
      subscriptionDate(value.endsAt)!.getTime()
  );
}

export function isStoreSubscriptionActive(
  subscription: unknown,
  now = new Date(),
) {
  if (subscription === undefined) return true;
  if (!isValidSubscription(subscription)) return false;
  const startsAt = subscriptionDate(subscription.startsAt)!;
  const endsAt = subscriptionDate(subscription.endsAt)!;
  return startsAt <= now && now < endsAt;
}

export function dateInputInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function zonedDateStart(dateInput: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  const target = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(target);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;
  const actual = new Date(
    `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}.000Z`,
  );
  const result = new Date(
    target.getTime() + (target.getTime() - actual.getTime()),
  );
  return dateInputInTimeZone(result, timeZone) === dateInput ? result : null;
}

export function addDays(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function subscriptionEndDate(
  startDate: string,
  billingPeriod: BillingPeriod,
) {
  const period = BILLING_PERIODS.find((entry) => entry.value === billingPeriod);
  const [year, month, day] = startDate.split("-").map(Number);
  if (!period || !year || !month || !day) return "";
  const targetMonth = month - 1 + period.months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const nextStart = `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  return addDays(nextStart, -1);
}
