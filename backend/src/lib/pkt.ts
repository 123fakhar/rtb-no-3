const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export interface ShiftParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/** Business day starts at 6:00 PM Pakistan time and runs until 6:00 PM the next day. */
export function shiftParts(date: Date): ShiftParts {
  const pkt = new Date(date.getTime() + PKT_OFFSET_MS);
  let year = pkt.getUTCFullYear();
  let month = pkt.getUTCMonth();
  let day = pkt.getUTCDate();
  if (pkt.getUTCHours() < 18) {
    const previous = new Date(Date.UTC(year, month, day - 1));
    year = previous.getUTCFullYear();
    month = previous.getUTCMonth();
    day = previous.getUTCDate();
  }
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month, day)).getUTCDay(),
  };
}

export function shiftKey(parts: ShiftParts) {
  const month = String(parts.month + 1).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

/** 6:00 PM Pakistan time on the shift's evening, as a UTC instant. */
export function shiftStartInstant(parts: Pick<ShiftParts, "year" | "month" | "day">) {
  return new Date(Date.UTC(parts.year, parts.month, parts.day, 13, 0, 0));
}

export function periodStart(range: "day" | "week" | "month", now = new Date()) {
  const parts = shiftParts(now);
  if (range === "month") return shiftStartInstant({ ...parts, day: 1 });
  if (range === "week") {
    const back = parts.weekday === 0 ? 6 : parts.weekday - 1;
    const monday = new Date(Date.UTC(parts.year, parts.month, parts.day - back));
    return shiftStartInstant({
      year: monday.getUTCFullYear(),
      month: monday.getUTCMonth(),
      day: monday.getUTCDate(),
    });
  }
  return shiftStartInstant(parts);
}
