/**
 * Formatea un precio según la moneda especificada
 * @param price - Precio numérico
 * @param currency - Código de moneda (COP, USD, EUR)
 * @returns String formateado con símbolo y separadores
 */
export function formatPrice(price: number, currency: string): string {
  const formatters: Record<string, string> = {
    'COP': '$',
    'USD': 'USD',
    'EUR': '€'
  };
  const symbol = formatters[currency] || currency;
  // @ts-ignore
  let priceText = '';
  if (currency === 'USD') {
    priceText = `${price.toLocaleString()} ${symbol}`;
  } else {
    priceText = `${symbol} ${price.toLocaleString()}`
  }
  return priceText;
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formatea el nombre del día de la semana
 */
export function formatDayName(day: string): string {
  const days: Record<string, string> = {
    'monday': 'Lunes',
    'tuesday': 'Martes',
    'wednesday': 'Miércoles',
    'thursday': 'Jueves',
    'friday': 'Viernes',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  return days[day.toLowerCase()] || capitalize(day);
}

export type ScheduleDayValue =
  | string
  | {
      open?: string;
      close?: string;
      closed?: boolean;
    };

export type Schedule = Record<string, ScheduleDayValue>;

export function formatScheduleValue(value: ScheduleDayValue): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || value.closed) {
    return 'closed';
  }

  if (value.open && value.close) {
    return `${value.open}-${value.close}`;
  }

  return value.open || value.close || '';
}

/**
 * Ordena los días de la semana en orden correcto (Lunes a Domingo)
 * @param schedule - Objeto con los horarios por día
 * @returns Array de tuplas [día, horario] ordenadas
 */
export function sortScheduleDays(schedule: Schedule): Array<[string, string]> {
  const dayOrder: Record<string, number> = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 7
  };

  return Object.entries(schedule)
    .map(([day, value]) => [day, formatScheduleValue(value)] as [string, string])
    .filter(([, value]) => value.length > 0)
    .sort(([dayA], [dayB]) => {
      const orderA = dayOrder[dayA.toLowerCase()] || 999;
      const orderB = dayOrder[dayB.toLowerCase()] || 999;
      return orderA - orderB;
    });
}
