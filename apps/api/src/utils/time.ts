export function formatYYYYMMDDInTZ(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

export function timeStringToMinutes(t: string) {
  const parts = t.split(":").map((n) => Number(n));
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  return hh * 60 + mm;
}

export function nowMinutesInTZ(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hh * 60 + mm;
}

export function isInQuietHours(params: {
  now: Date;
  timeZone: string;
  quietStart: string; // "HH:MM:SS" or "HH:MM"
  quietEnd: string;   // "HH:MM:SS" or "HH:MM"
}) {
  const nowMins = nowMinutesInTZ(params.now, params.timeZone);
  const start = timeStringToMinutes(params.quietStart);
  const end = timeStringToMinutes(params.quietEnd);

  if (start === end) return false;
  if (start < end) return nowMins >= start && nowMins < end;
  return nowMins >= start || nowMins < end; // crosses midnight
}