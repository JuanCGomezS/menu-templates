import type { Schedule, ScheduleDayValue } from "./utils";

const DAY_LABELS: Record<string, string> = {
  sunday: "domingo",
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miércoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sábado",
};

function timeParts(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value || "";
  return {
    day: part("weekday").toLowerCase(),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function minutes(value?: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  return hours <= 23 && mins <= 59 ? hours * 60 + mins : null;
}

function isScheduleDay(
  value: ScheduleDayValue | undefined,
): value is Exclude<ScheduleDayValue, string> {
  return typeof value === "object" && value !== null;
}

export function getStoreOpeningStatus(
  schedule: Schedule | undefined,
  timeZone = "America/Bogota",
  now = new Date(),
) {
  if (!schedule) return { isOpen: true, message: "" };
  try {
    const current = timeParts(timeZone, now);
    const today = schedule[current.day];
    const yesterday =
      schedule[
        timeParts(timeZone, new Date(now.getTime() - 24 * 60 * 60 * 1000)).day
      ];
    const todayEntry = isScheduleDay(today) && !today.closed ? today : null;
    const yesterdayEntry =
      isScheduleDay(yesterday) && !yesterday.closed ? yesterday : null;
    const todayOpen = minutes(todayEntry?.open);
    const todayClose = minutes(todayEntry?.close);
    const yesterdayOpen = minutes(yesterdayEntry?.open);
    const yesterdayClose = minutes(yesterdayEntry?.close);

    if (
      todayOpen !== null &&
      todayClose !== null &&
      todayOpen <= todayClose &&
      current.minutes >= todayOpen &&
      current.minutes < todayClose
    )
      return { isOpen: true, message: "" };
    if (
      todayOpen !== null &&
      todayClose !== null &&
      todayOpen > todayClose &&
      current.minutes >= todayOpen
    )
      return { isOpen: true, message: "" };
    if (
      yesterdayOpen !== null &&
      yesterdayClose !== null &&
      yesterdayOpen > yesterdayClose &&
      current.minutes < yesterdayClose
    )
      return { isOpen: true, message: "" };
    if (todayOpen === null || todayClose === null)
      return {
        isOpen: false,
        message: nextOpeningMessage(schedule, timeZone, now),
      };
    return {
      isOpen: false,
      message:
        current.minutes < todayOpen
          ? `Abrimos hoy a las ${todayEntry?.open}.`
          : nextOpeningMessage(schedule, timeZone, now),
    };
  } catch {
    return {
      isOpen: false,
      message: "Consulta nuestro horario para volver a pedir.",
    };
  }
}

function nextOpeningMessage(schedule: Schedule, timeZone: string, now: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const next = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const { day } = timeParts(timeZone, next);
    const entry = schedule[day];
    if (entry && typeof entry !== "string" && !entry.closed && entry.open)
      return `Volvemos el ${DAY_LABELS[day] || "próximo día"} a las ${entry.open}.`;
  }
  return "Consulta nuestro horario para volver a pedir.";
}
