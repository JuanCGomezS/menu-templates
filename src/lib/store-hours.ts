import type { Schedule } from './utils';

const DAY_LABELS: Record<string, string> = { sunday: 'domingo', monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves', friday: 'viernes', saturday: 'sábado' }; 

function timeParts(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '';
  return { day: part('weekday').toLowerCase(), minutes: Number(part('hour')) * 60 + Number(part('minute')) };
}

function minutes(value?: string) {
  const [hours, mins] = (value || '').split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(mins) ? hours * 60 + mins : null;
}

export function getStoreOpeningStatus(schedule: Schedule | undefined, timeZone = 'America/Bogota', now = new Date()) {
  if (!schedule) return { isOpen: true, message: '' }; // Compatible with stores that have not configured hours.
  try {
    const current = timeParts(timeZone, now);
    const today = schedule[current.day];
    if (!today || typeof today === 'string' || today.closed) return { isOpen: false, message: nextOpeningMessage(schedule, timeZone, now) };
    const open = minutes(today.open); const close = minutes(today.close);
    if (open === null || close === null) return { isOpen: true, message: '' };
    if (current.minutes >= open && current.minutes <= close) return { isOpen: true, message: '' };
    return { isOpen: false, message: current.minutes < open ? `Abrimos hoy a las ${today.open}.` : nextOpeningMessage(schedule, timeZone, now) };
  } catch { return { isOpen: true, message: '' }; }
}

function nextOpeningMessage(schedule: Schedule, timeZone: string, now: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const next = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const { day } = timeParts(timeZone, next);
    const entry = schedule[day];
    if (entry && typeof entry !== 'string' && !entry.closed && entry.open) return `Volvemos el ${DAY_LABELS[day] || 'próximo día'} a las ${entry.open}.`;
  }
  return 'Consulta nuestro horario para volver a pedir.';
}
