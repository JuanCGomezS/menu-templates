const DAY_MAP = {
  Sunday: "sunday",
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
};

function timeParts(timeZone, now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "America/Bogota",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type) =>
    parts.find((entry) => entry.type === type)?.value || "";

  return {
    day: DAY_MAP[part("weekday")],
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function toMinutes(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function activeEntry(entry) {
  return entry && typeof entry === "object" && !entry.closed ? entry : null;
}

function storeIsOpen(schedule, timeZone, now = new Date()) {
  if (!schedule) return true;

  try {
    const current = timeParts(timeZone, now);
    const yesterday = timeParts(
      timeZone,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );
    const todayEntry = activeEntry(schedule[current.day]);
    const yesterdayEntry = activeEntry(schedule[yesterday.day]);
    const todayOpen = toMinutes(todayEntry?.open);
    const todayClose = toMinutes(todayEntry?.close);
    const yesterdayOpen = toMinutes(yesterdayEntry?.open);
    const yesterdayClose = toMinutes(yesterdayEntry?.close);

    if (
      todayOpen !== null &&
      todayClose !== null &&
      todayOpen <= todayClose &&
      current.minutes >= todayOpen &&
      current.minutes < todayClose
    )
      return true;

    if (
      todayOpen !== null &&
      todayClose !== null &&
      todayOpen > todayClose &&
      current.minutes >= todayOpen
    )
      return true;

    return (
      yesterdayOpen !== null &&
      yesterdayClose !== null &&
      yesterdayOpen > yesterdayClose &&
      current.minutes < yesterdayClose
    );
  } catch {
    return false;
  }
}

module.exports = { storeIsOpen };
