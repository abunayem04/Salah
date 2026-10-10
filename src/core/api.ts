import type { CalculationParameters, Coordinates, Prayer, PrayerTimes } from "./types";
import { calculatePrayerTimes } from "./engine";
import { addDays, zonedMidnight, type CivilDate } from "./timeZone";

export interface SyncResult {
  source: "api" | "calculated";
  today: PrayerTimes;
  tomorrow: PrayerTimes;
  error?: string;
  syncedAt: Date;
}

const ALADHAN_METHOD_MAP: Record<string, number> = {
  karachi: 1,
  isna: 2,
  mwl: 3,
  ummalqura: 4,
  egyptian: 5,
  diyanet: 13,
  moonsighting: 15,
  jakim: 17,
  kemenag: 20,
};

/**
 * Attempt to fetch online prayer times from Aladhan API with timeout.
 * Strips parentheses/timezones from returned time strings (e.g. "04:38 (BST)" -> "04:38").
 */
export async function fetchAladhanTimes(
  date: CivilDate,
  coordinates: Coordinates,
  methodId: string,
  hanafi: boolean,
  timeZone: string,
  timeoutMs = 4000,
): Promise<PrayerTimes> {
  const cleanMethodId = methodId.replace(".hanafi", "");
  const methodNum = ALADHAN_METHOD_MAP[cleanMethodId] ?? 3;
  const schoolNum = hanafi ? 1 : 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const formattedDate = `${String(date.day).padStart(2, "0")}-${String(date.month).padStart(2, "0")}-${date.year}`;
  const url = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&method=${methodNum}&school=${schoolNum}&timezonestring=${encodeURIComponent(timeZone)}`;

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`API returned HTTP status ${res.status}`);
    }

    const json = await res.json();
    if (!json || json.code !== 200 || !json.data?.timings) {
      throw new Error("Invalid API response format");
    }

    const timings = json.data.timings as Record<string, string>;
    const base = zonedMidnight(date, timeZone);

    const parseTiming = (key: string): Date | undefined => {
      const raw = timings[key];
      if (!raw) return undefined;
      const clean = raw.trim().split(" ")[0]; // Strip suffix like "(BST)"
      const [hStr, mStr] = clean.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
      return new Date(base.getTime() + (h * 60 + m) * 60_000);
    };

    const times: Partial<Record<Prayer, Date>> = {
      fajr: parseTiming("Fajr"),
      sunrise: parseTiming("Sunrise"),
      dhuhr: parseTiming("Dhuhr"),
      asr: parseTiming("Asr"),
      maghrib: parseTiming("Maghrib"),
      isha: parseTiming("Isha"),
    };

    for (const key of Object.keys(times) as Prayer[]) {
      if (!times[key]) delete times[key];
    }

    return { date: base, times };
  } catch (err: unknown) {
    clearTimeout(timer);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Loads today and tomorrow's prayer times.
 * Tries online API first; if offline, network error, or timeout,
 * gracefully falls back to local high-precision calculation engine.
 * NEVER throws or crashes.
 */
export async function loadPrayerTimesWithFallback({
  todayDate,
  coordinates,
  methodId,
  hanafi,
  params,
  timeZone,
  preferApi = true,
}: {
  todayDate: CivilDate;
  coordinates: Coordinates;
  methodId: string;
  hanafi: boolean;
  params: CalculationParameters;
  timeZone: string;
  preferApi?: boolean;
}): Promise<SyncResult> {
  const tomorrowDate = addDays(todayDate, 1);
  const calculatedToday = calculatePrayerTimes(todayDate, coordinates, params, timeZone);
  const calculatedTomorrow = calculatePrayerTimes(tomorrowDate, coordinates, params, timeZone);

  if (!preferApi || methodId === "manual") {
    return {
      source: "calculated",
      today: calculatedToday,
      tomorrow: calculatedTomorrow,
      syncedAt: new Date(),
    };
  }

  try {
    const [todayTimes, tomorrowTimes] = await Promise.all([
      fetchAladhanTimes(todayDate, coordinates, methodId, hanafi, timeZone, 3500),
      fetchAladhanTimes(tomorrowDate, coordinates, methodId, hanafi, timeZone, 3500),
    ]);

    return {
      source: "api",
      today: todayTimes,
      tomorrow: tomorrowTimes,
      syncedAt: new Date(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network unavailable";
    return {
      source: "calculated",
      today: calculatedToday,
      tomorrow: calculatedTomorrow,
      error: msg,
      syncedAt: new Date(),
    };
  }
}
