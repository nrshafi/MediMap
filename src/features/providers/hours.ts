export const weekDays = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type WeekDay = (typeof weekDays)[number];
export type OpeningPeriod = { opens: string; closes: string };
export type WeeklyHours = { timeZone: 'Asia/Dhaka'; days: Record<WeekDay, OpeningPeriod[] | null> };

export class InvalidHours extends Error {
  constructor() {
    super('Use unknown days, closed days, or non-overlapping 24-hour periods.');
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidHours();
  return Object.fromEntries(Object.entries(value));
}
function minutes(value: unknown, closing = false): number {
  if (closing && value === '24:00') return 1440;
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new InvalidHours();
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
function bounds(period: OpeningPeriod) {
  const start = minutes(period.opens);
  let end = minutes(period.closes, true);
  if (end === start) throw new InvalidHours();
  if (end < start) end += 1440;
  return { start, end };
}

export function weeklyHours(value: unknown): WeeklyHours {
  const input = object(value);
  if (input.timeZone !== 'Asia/Dhaka' || Object.keys(input).length !== 2) throw new InvalidHours();
  const days = object(input.days);
  if (Object.keys(days).length !== 7 || weekDays.some((day) => !Object.hasOwn(days, day)))
    throw new InvalidHours();
  const result: WeeklyHours = {
    timeZone: 'Asia/Dhaka',
    days: {
      sunday: null,
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
    },
  };
  const intervals: { start: number; end: number }[] = [];
  weekDays.forEach((day, index) => {
    const periods = days[day];
    if (periods === null) return;
    if (!Array.isArray(periods) || periods.length > 4) throw new InvalidHours();
    result.days[day] = periods
      .map((value: unknown) => {
        const period = object(value);
        if (
          typeof period.opens !== 'string' ||
          typeof period.closes !== 'string' ||
          Object.keys(period).length !== 2
        )
          throw new InvalidHours();
        const interval = bounds({ opens: period.opens, closes: period.closes });
        intervals.push({ start: index * 1440 + interval.start, end: index * 1440 + interval.end });
        return { opens: period.opens, closes: period.closes };
      })
      .sort((a, b) => minutes(a.opens) - minutes(b.opens));
  });
  intervals.sort((a, b) => a.start - b.start);
  for (let index = 1; index < intervals.length; index++) {
    if (intervals[index].start < intervals[index - 1].end) throw new InvalidHours();
  }
  const last = intervals.at(-1);
  if (last && last.end > intervals[0].start + 10080) throw new InvalidHours();
  return result;
}

export function hoursFromForm(input: Record<string, unknown>): WeeklyHours | null {
  const days: Record<string, OpeningPeriod[] | null> = {};
  for (const day of weekDays) {
    const value = input[`hours_${day}`] ?? '';
    if (typeof value !== 'string' || value.length > 120) throw new InvalidHours();
    const text = value.trim();
    if (!text) days[day] = null;
    else if (text.toLowerCase() === 'closed') days[day] = [];
    else
      days[day] = text.split(',').map((item) => {
        const pair = item.trim().split('-');
        if (pair.length !== 2) throw new InvalidHours();
        return { opens: pair[0].trim(), closes: pair[1].trim() };
      });
  }
  const result = weeklyHours({ timeZone: 'Asia/Dhaka', days });
  return weekDays.every((day) => result.days[day] === null) ? null : result;
}

export function storedHours(value: unknown): WeeklyHours | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new InvalidHours();
  const parsed: unknown = JSON.parse(value);
  return weeklyHours(parsed);
}

export function dayHoursInput(periods: OpeningPeriod[] | null): string {
  return periods === null
    ? ''
    : periods.length
      ? periods.map((period) => `${period.opens}-${period.closes}`).join(', ')
      : 'closed';
}
export function dayHoursLabel(periods: OpeningPeriod[] | null): string {
  if (periods === null) return 'Unknown';
  if (!periods.length) return 'Closed';
  return periods
    .map(
      (period) =>
        `${period.opens} to ${period.closes}${minutes(period.closes, true) < minutes(period.opens) ? ' next day' : ''}`,
    )
    .join(', ');
}

export function openingStatus(
  hours: WeeklyHours | null,
  instant: Date,
): 'open' | 'closed' | 'unknown' {
  if (!hours) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const index = weekDays.findIndex((day) => day === part('weekday')?.toLowerCase());
  if (index < 0) throw new InvalidHours();
  const now = Number(part('hour')) * 60 + Number(part('minute'));
  const today = hours.days[weekDays[index]];
  const previous = hours.days[weekDays[(index + 6) % 7]];
  if (
    today?.some((period) => {
      const interval = bounds(period);
      return interval.start <= now && now < interval.end;
    })
  )
    return 'open';
  if (
    previous?.some((period) => {
      const interval = bounds(period);
      return interval.end > 1440 && now < interval.end - 1440;
    })
  )
    return 'open';
  return today === null || previous === null ? 'unknown' : 'closed';
}
