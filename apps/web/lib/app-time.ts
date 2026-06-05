export const APP_TIME_ZONE = "Asia/Makassar";
export const APP_TIME_ZONE_LABEL = "WITA";

const APP_TIME_ZONE_UTC_OFFSET_MINUTES = 8 * 60;

export type AppDateInput = Date | string | null | undefined;

export function toAppDate(value: AppDateInput) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAppDate(
  value: AppDateInput,
  {
    dateStyle = "medium",
    fallback = "-",
  }: {
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    fallback?: string;
  } = {},
) {
  const date = toAppDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatAppDateTime(
  value: AppDateInput,
  {
    dateStyle = "medium",
    fallback = "-",
    timeStyle = "short",
  }: {
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    fallback?: string;
    timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  } = {},
) {
  const date = toAppDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle,
    timeStyle,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatAppDateTimeInput(value: AppDateInput) {
  const date = toAppDate(value);

  if (!date) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}T${byType.get("hour")}:${byType.get("minute")}`;
}

export function parseAppDateTimeInput(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [, year, month, day, hour, minute] = match;
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) -
    APP_TIME_ZONE_UTC_OFFSET_MINUTES * 60 * 1000;
  const date = new Date(utcMs);

  return Number.isNaN(date.getTime()) ? null : date;
}
