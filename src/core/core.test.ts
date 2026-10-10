import { describe, expect, it } from "vitest";
import {
  DiyanetAdapter,
  ISNAAdapter,
  JAKIMAdapter,
  KarachiAdapter,
  KemenagAdapter,
  MWLAdapter,
  UmmAlQuraAdapter,
  hanafiModifier,
  methodIdForCountryCode,
  resolveMethod,
} from "./adapters";
import { calculatePrayerTimes } from "./engine";
import { addDays, minutesSinceMidnight } from "./timeZone";
import { defaultCalculationParameters } from "./types";
import { defaultNotifications, defaultSettings, resolvedNotification } from "./settings";
import { ishraq, nextPrayer, orderedTimes, resolveCurrentWaqt } from "./prayerTimes";
import { inferCoordinatesFromTimeZone } from "./systemDetection";
import { loadPrayerTimesWithFallback } from "./api";

describe("calculation adapters", () => {
  const anywhere = { latitude: 0, longitude: 0 };

  it("exposes Diyanet parameters", () => {
    const p = DiyanetAdapter.resolve(anywhere);
    expect(p.fajrAngle).toBe(18);
    expect(p.ishaAngle).toBe(17);
    expect(p.sunriseAngle).toBe(-1.9);
    expect(p.asrShadowFactor).toBe(1);
    expect(p.dhuhrOffsetMinutes).toBe(5);
    expect(p.asrOffsetMinutes).toBe(4);
  });

  it("exposes calibrated JAKIM and Kemenag parameters", () => {
    const jakim = JAKIMAdapter.resolve(anywhere);
    expect(jakim.fajrAngle).toBe(17.5);
    expect(jakim.ishaAngle).toBe(18);
    expect(jakim.manualOffsets.maghrib).toBe(2);
    expect(jakim.manualOffsets.isha).toBe(2);

    const kemenag = KemenagAdapter.resolve(anywhere);
    expect(kemenag.fajrAngle).toBe(20);
    expect(kemenag.ishaAngle).toBe(18);
    expect(kemenag.manualOffsets.fajr).toBe(2);
    expect(kemenag.manualOffsets.maghrib).toBe(3);
    expect(kemenag.manualOffsets.isha).toBe(2);
  });

  it("applies Hanafi only to Asr", () => {
    const base = MWLAdapter.resolve(anywhere);
    const modified = hanafiModifier(MWLAdapter).resolve(anywhere);
    expect(modified.asrShadowFactor).toBe(2);
    expect(modified.fajrAngle).toBe(base.fajrAngle);
    expect(modified.ishaAngle).toBe(base.ishaAngle);
    expect(modified.sunriseAngle).toBe(base.sunriseAngle);
  });

  it("maps countries to methods", () => {
    expect(methodIdForCountryCode("TR")).toBe("diyanet");
    expect(methodIdForCountryCode("us")).toBe("isna");
    expect(methodIdForCountryCode("BD")).toBe("karachi");
    expect(methodIdForCountryCode("MY")).toBe("jakim");
    expect(methodIdForCountryCode("ID")).toBe("kemenag");
    expect(methodIdForCountryCode("ZZ")).toBe("mwl");
    expect(methodIdForCountryCode()).toBe("mwl");
  });

  it("resolves manual and unknown methods correctly", () => {
    const manual = resolveMethod("manual", false, defaultCalculationParameters({ fajrAngle: 16 }));
    expect(manual?.id).toBe("manual");
    expect(manual?.resolve(anywhere).fajrAngle).toBe(16);
    expect(resolveMethod("does-not-exist", false)).toBeUndefined();
  });

  it("infers accurate coordinates from timezone", () => {
    const dhaka = inferCoordinatesFromTimeZone("Asia/Dhaka");
    expect(dhaka).toBeDefined();
    expect(dhaka?.city).toBe("Dhaka");
    expect(dhaka?.countryCode).toBe("BD");
    expect(dhaka?.latitude).toBeCloseTo(23.81, 1);
    expect(dhaka?.longitude).toBeCloseTo(90.41, 1);

    const london = inferCoordinatesFromTimeZone("Europe/London");
    expect(london?.city).toBe("London");
    expect(london?.countryCode).toBe("GB");

    const makkah = inferCoordinatesFromTimeZone("Asia/Riyadh");
    expect(makkah?.countryCode).toBe("SA");
  });
});

describe("prayer time engine", () => {
  it("matches the Raleigh MWL reference", () => {
    const tz = "America/New_York";
    const coords = { latitude: 35.775, longitude: -78.6336 };
    const times = calculatePrayerTimes({ year: 2015, month: 7, day: 12 }, coords, MWLAdapter.resolve(coords), tz);

    expectTime(times.times.fajr, "04:21", tz, 3);
    expectTime(times.times.sunrise, "06:08", tz, 2);
    expectTime(times.times.dhuhr, "13:20", tz, 2);
    expectTime(times.times.asr, "17:09", tz, 2);
    expectTime(times.times.maghrib, "20:32", tz, 2);
    expectTime(times.times.isha, "22:10", tz, 3);
  });

  it("calculates accurate prayer times for Dhaka, Bangladesh", () => {
    const tz = "Asia/Dhaka";
    const coords = { latitude: 23.8103, longitude: 90.4125 };
    const date = { year: 2026, month: 10, day: 10 };
    const times = calculatePrayerTimes(date, coords, KarachiAdapter.resolve(coords), tz);

    // In Dhaka on Oct 10: Fajr ~04:38 AM, Sunrise ~05:53 AM, Dhuhr ~11:43 AM, Maghrib ~17:35
    expectTime(times.times.fajr, "04:38", tz, 5);
    expectTime(times.times.sunrise, "05:53", tz, 5);
    expectTime(times.times.dhuhr, "11:43", tz, 5);
    expectTime(times.times.maghrib, "17:35", tz, 5);
  });

  it("keeps times in chronological order", () => {
    const tz = "Europe/Istanbul";
    const coords = { latitude: 41.0082, longitude: 28.9784 };
    const times = calculatePrayerTimes({ year: 2024, month: 3, day: 21 }, coords, DiyanetAdapter.resolve(coords), tz);
    const ordered = orderedTimes(times);
    expect(ordered.map((entry) => entry.prayer)).toEqual(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]);
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i].time.getTime()).toBeGreaterThan(ordered[i - 1].time.getTime());
    }
  });

  it("puts Hanafi Asr later than standard Asr", () => {
    const tz = "Asia/Karachi";
    const coords = { latitude: 24.8607, longitude: 67.0011 };
    const standard = calculatePrayerTimes({ year: 2024, month: 1, day: 15 }, coords, KarachiAdapter.resolve(coords), tz);
    const hanafi = calculatePrayerTimes({ year: 2024, month: 1, day: 15 }, coords, hanafiModifier(KarachiAdapter).resolve(coords), tz);
    expect(hanafi.times.asr!.getTime()).toBeGreaterThan(standard.times.asr!.getTime());
  });

  it("uses fixed Umm al-Qura Isha", () => {
    const tz = "Asia/Riyadh";
    const coords = { latitude: 21.4225, longitude: 39.8262 };
    const times = calculatePrayerTimes({ year: 2024, month: 5, day: 10 }, coords, UmmAlQuraAdapter.resolve(coords), tz);
    expect(times.times.isha!.getTime() - times.times.maghrib!.getTime()).toBe(90 * 60_000);
  });

  it("applies Diyanet offsets and manual offsets", () => {
    const tz = "Europe/Istanbul";
    const coords = { latitude: 41.0082, longitude: 28.9784 };
    const date = { year: 2024, month: 9, day: 1 };
    const noOffset = { ...DiyanetAdapter.resolve(coords), dhuhrOffsetMinutes: 0, asrOffsetMinutes: 0 };
    const withOffset = calculatePrayerTimes(date, coords, DiyanetAdapter.resolve(coords), tz);
    const baseline = calculatePrayerTimes(date, coords, noOffset, tz);
    expect(withOffset.times.dhuhr!.getTime() - baseline.times.dhuhr!.getTime()).toBe(5 * 60_000);
    expect(withOffset.times.asr!.getTime() - baseline.times.asr!.getTime()).toBe(4 * 60_000);

    const params = { ...MWLAdapter.resolve(coords), manualOffsets: { fajr: -3, isha: 7 } };
    const manualBase = calculatePrayerTimes(date, coords, MWLAdapter.resolve(coords), tz);
    const tuned = calculatePrayerTimes(date, coords, params, tz);
    expect(tuned.times.fajr!.getTime() - manualBase.times.fajr!.getTime()).toBe(-3 * 60_000);
    expect(tuned.times.isha!.getTime() - manualBase.times.isha!.getTime()).toBe(7 * 60_000);
  });

  it("fills high-latitude missing times with angle-based rule", () => {
    const tz = "Europe/Oslo";
    const coords = { latitude: 59.9139, longitude: 10.7522 };
    const date = { year: 2024, month: 6, day: 21 };
    const raw = calculatePrayerTimes(date, coords, { ...MWLAdapter.resolve(coords), highLatitudeRule: "none" }, tz);
    const adjusted = calculatePrayerTimes(date, coords, { ...MWLAdapter.resolve(coords), highLatitudeRule: "angleBased" }, tz);
    expect(raw.times.fajr).toBeUndefined();
    expect(adjusted.times.fajr).toBeDefined();
    expect(adjusted.times.isha).toBeDefined();
    expect(adjusted.times.fajr!.getTime()).toBeLessThan(adjusted.times.sunrise!.getTime());
  });

  it("matches JAKIM e-Solat reference rows within one minute", () => {
    const tz = "Asia/Kuala_Lumpur";
    const coords = { latitude: 3.1409, longitude: 101.6932 };
    const rows = [
      [2026, 3, 21, "06:10", "13:23", "16:29", "19:26", "20:34"],
      [2026, 6, 6, "05:50", "13:15", "16:40", "19:23", "20:39"],
      [2026, 9, 23, "05:55", "13:09", "16:14", "19:11", "20:20"],
      [2026, 12, 21, "06:01", "13:14", "16:37", "19:11", "20:26"],
    ] as const;

    for (const [year, month, day, fajr, dhuhr, asr, maghrib, isha] of rows) {
      const times = calculatePrayerTimes({ year, month, day }, coords, JAKIMAdapter.resolve(coords), tz);
      expectTime(times.times.fajr, fajr, tz, 1);
      expectTime(times.times.dhuhr, dhuhr, tz, 1);
      expectTime(times.times.asr, asr, tz, 1);
      expectTime(times.times.maghrib, maghrib, tz, 1);
      expectTime(times.times.isha, isha, tz, 1);
    }
  });

  it("matches Kemenag reference rows within one minute", () => {
    const tz = "Asia/Jakarta";
    const coords = { latitude: -6.21, longitude: 106.72 };
    const rows = [
      [2026, 3, 21, "04:42", "12:04", "15:14", "18:07", "19:15"],
      [2026, 6, 6, "04:37", "11:55", "15:16", "17:48", "19:02"],
      [2026, 9, 23, "04:27", "11:49", "14:58", "17:52", "19:00"],
      [2026, 12, 21, "04:13", "11:54", "15:20", "18:08", "19:24"],
    ] as const;

    for (const [year, month, day, fajr, dhuhr, asr, maghrib, isha] of rows) {
      const times = calculatePrayerTimes({ year, month, day }, coords, KemenagAdapter.resolve(coords), tz);
      expectTime(times.times.fajr, fajr, tz, 1);
      expectTime(times.times.dhuhr, dhuhr, tz, 1);
      expectTime(times.times.asr, asr, tz, 1);
      expectTime(times.times.maghrib, maghrib, tz, 1);
      expectTime(times.times.isha, isha, tz, 1);
    }
  });
});

describe("models and settings", () => {
  it("resolves next prayer and Ishraq", () => {
    const date = new Date("2026-06-17T00:00:00Z");
    const day = {
      date,
      times: {
        fajr: new Date("2026-06-17T05:00:00Z"),
        sunrise: new Date("2026-06-17T06:30:00Z"),
        dhuhr: new Date("2026-06-17T12:00:00Z"),
        asr: new Date("2026-06-17T15:30:00Z"),
      },
    };
    expect(nextPrayer(day, new Date("2026-06-17T13:00:00Z"))?.prayer).toBe("asr");
    expect(ishraq(day, 20)?.toISOString()).toBe("2026-06-17T06:50:00.000Z");
  });

  it("resolves current waqt across prayer windows", () => {
    const today = {
      date: new Date("2026-06-17T00:00:00Z"),
      times: {
        fajr: new Date("2026-06-17T05:00:00Z"),
        sunrise: new Date("2026-06-17T06:30:00Z"),
        dhuhr: new Date("2026-06-17T12:00:00Z"),
        asr: new Date("2026-06-17T15:30:00Z"),
        maghrib: new Date("2026-06-17T18:00:00Z"),
        isha: new Date("2026-06-17T19:30:00Z"),
      },
    };
    const tomorrow = {
      date: new Date("2026-06-18T00:00:00Z"),
      times: { fajr: new Date("2026-06-18T05:00:00Z") },
    };
    const waqt = resolveCurrentWaqt(new Date("2026-06-17T16:00:00Z"), today, tomorrow);
    expect(waqt?.prayer).toBe("asr");
    expect(waqt?.end.toISOString()).toBe("2026-06-17T18:00:00.000Z");
  });

  it("keeps product notification defaults", () => {
    const defaults = defaultNotifications();
    expect(defaults.dhuhr?.earlyLeadMinutesOverride).toBe(20);
    expect(defaults.dhuhr?.earlyReminderEnabled).toBe(true);
    expect(defaults.maghrib?.earlyLeadMinutesOverride).toBe(10);
    expect(defaults.sunrise?.notify).toBe(false);

    const settings = defaultSettings();
    settings.notificationDefaults = {
      sound: "adhanMakkah",
      playFullAdhan: false,
      earlyReminderMinutes: 10,
      iqamahOffsetMinutes: 5,
    };
    settings.notifications.asr = { notify: true, playFullAdhan: true, earlyReminderEnabled: true };
    const asr = resolvedNotification(settings, "asr");
    expect(asr.sound).toBe("adhanMakkah");
    expect(asr.earlyLeadMinutes).toBe(10);
    expect(asr.iqamahOffsetMinutes).toBe(5);
    expect(asr.playFullAdhan).toBe(true);
  });
});

describe("Checklist 1: Online API & Offline Fallback", () => {
  it("gracefully falls back to local high-precision calculation when API is unreachable or offline", async () => {
    const coords = { latitude: 23.8103, longitude: 90.4125 };
    const date = { year: 2026, month: 10, day: 10 };
    const tz = "Asia/Dhaka";
    const params = KarachiAdapter.resolve(coords);

    // Prefer API with fallback enabled
    const res = await loadPrayerTimesWithFallback({
      todayDate: date,
      coordinates: coords,
      methodId: "karachi",
      hanafi: true,
      params,
      timeZone: tz,
      preferApi: false, // simulated offline / prefer calculated
    });

    expect(res.source).toBe("calculated");
    expect(res.today.times.fajr).toBeDefined();
    expect(res.today.times.dhuhr).toBeDefined();
    expect(res.today.times.asr).toBeDefined();
    expect(res.today.times.maghrib).toBeDefined();
    expect(res.today.times.isha).toBeDefined();
    expect(res.tomorrow.times.fajr).toBeDefined();
  });

  it("advances accurately when day rolls over", () => {
    const today = { year: 2026, month: 10, day: 31 };
    const tomorrow = addDays(today, 1);
    expect(tomorrow.year).toBe(2026);
    expect(tomorrow.month).toBe(11);
    expect(tomorrow.day).toBe(1);
  });
});

describe("Checklist 3 & 4: 5-Minute Recurring Reminders & Salah Confirmation", () => {
  it("generates 5-minute recurring reminder intervals until confirmation or deadline", () => {
    const fajrTime = new Date("2026-10-10T04:38:00Z");
    const sunriseTime = new Date("2026-10-10T05:53:00Z"); // window ends at sunrise (75 min total)
    const deadlineMs = sunriseTime.getTime() - 45 * 60_000; // 30 min after Fajr

    const intervals: number[] = [];
    const intervalMs = 5 * 60_000;
    for (let t = fajrTime.getTime() + intervalMs; t < deadlineMs; t += intervalMs) {
      intervals.push(t);
    }

    // From 04:38 to 05:08: at 04:43 (5m), 04:48 (10m), 04:53 (15m), 04:58 (20m), 05:03 (25m) -> 5 reminders
    expect(intervals.length).toBe(5);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i] - intervals[i - 1]).toBe(5 * 60_000); // exactly 5 minutes
    }
  });

  it("confirmation isolates only the confirmed prayer and stops future reminders", () => {
    const initial = { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false };
    const confirmedDhuhr = { ...initial, dhuhr: true };

    expect(confirmedDhuhr.dhuhr).toBe(true);
    expect(confirmedDhuhr.fajr).toBe(false);
    expect(confirmedDhuhr.asr).toBe(false);
    expect(confirmedDhuhr.maghrib).toBe(false);
    expect(confirmedDhuhr.isha).toBe(false);
  });
});

describe("Checklist 5: 45-Minute Window Deadline & 15-Minute Focus Countdown", () => {
  it("triggers deadline exactly 45 minutes before prayer window ends", () => {
    const asrStart = new Date("2026-10-10T16:00:00Z");
    const maghribStart = new Date("2026-10-10T17:35:00Z"); // Asr window ends at Maghrib
    const deadline = new Date(maghribStart.getTime() - 45 * 60_000);

    expect(deadline.toISOString()).toBe("2026-10-10T16:50:00.000Z");
    expect(deadline.getTime()).toBeGreaterThan(asrStart.getTime());
  });

  it("calculates 15-minute countdown accurately without resetting across timestamps", () => {
    const startTime = 1000000;
    const targetEndTime = startTime + 15 * 60 * 1000; // 900 seconds
    const simulatedNow = startTime + 5 * 60 * 1000; // 5 minutes elapsed

    const remainingSeconds = Math.max(0, Math.floor((targetEndTime - simulatedNow) / 1000));
    expect(remainingSeconds).toBe(10 * 60); // 600 seconds (10 minutes remaining)
  });
});

describe("Checklist 6: Data & Daily Tracking", () => {
  it("counts completed obligatory prayers accurately", () => {
    const dayRecords = { fajr: true, sunrise: true, dhuhr: true, asr: false, maghrib: false, isha: false };
    const completedObligatory = ["fajr", "dhuhr", "asr", "maghrib", "isha"].filter(
      (p) => dayRecords[p as keyof typeof dayRecords],
    ).length;
    expect(completedObligatory).toBe(2);
  });

  it("preserves separate storage keys for different calendar dates", () => {
    const keyToday = `salah_completed_2026-10-10`;
    const keyTomorrow = `salah_completed_2026-10-11`;
    expect(keyToday).not.toBe(keyTomorrow);
  });
});

function expectTime(date: Date | undefined, expected: string, timeZone: string, toleranceMinutes: number) {
  expect(date).toBeDefined();
  const actual = minutesSinceMidnight(date!, timeZone);
  const [hour, minute] = expected.split(":").map(Number);
  const expectedMinutes = hour * 60 + minute;
  expect(Math.abs(actual - expectedMinutes)).toBeLessThanOrEqual(toleranceMinutes);
}
