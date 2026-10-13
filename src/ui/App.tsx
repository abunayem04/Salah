import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  EyeOff,
  GripHorizontal,
  Home,
  Info,
  LocateFixed,
  MapPin,
  Menu,
  Minus,
  Moon,
  Pin,
  Power,
  RotateCcw,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Target,
  Volume2,
  Wifi,
  WifiOff,
  X,
  CheckCircle2,
  FlaskConical,
  History,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MWLAdapter, builtInMethods, methodIdForCountryCode, resolveMethod } from "../core/adapters";
import { loadPrayerTimesWithFallback, type SyncResult } from "../core/api";
import { buildTrayLabel, formatHijriDateLocalized, prayerLabel, resolveLanguage, t, textDirection, type SupportedLanguage } from "../core/localization";
import { calculateTodayAndTomorrow } from "../core/engine";
import { civilDateFromDate, formatClock, zonedMidnight } from "../core/timeZone";
import { currentPrayer, ishraq, longCountdown, nextPrayer, orderedTimes, shortCountdown } from "../core/prayerTimes";
import { defaultJamaatTimes, defaultPrayerNotification, defaultSettings, resolvedNotification } from "../core/settings";
import { detectPreciseLocation, findNearestCity, inferCountryCode, inferCoordinatesFromTimeZone, popularCities, type CityLocation, type DetectedLocationResult } from "../core/systemDetection";
import { isObligatory, obligatoryPrayers } from "../core/types";
import type { AppSettings, CalculationMethodAdapter, CalculationSource, Coordinates, NotificationSound, Prayer, PrayerNotificationConfig, PrayerTimes } from "../core/types";

type SidebarNav = "overview" | "prayerTimes" | "accountability" | "history" | "settings";
type SettingsTab = "general" | "location" | "calculation" | "notifications" | "focus" | "testing";

type RuntimeScheduledEvent = {
  id: string;
  prayer?: Prayer;
  atMs: number;
  title: string;
  body: string;
  playSound: boolean;
  sound?: NotificationSound;
  playFullAdhan: boolean;
  startFocus: boolean;
};

const prayerIcons: Record<Prayer, typeof Sunrise> = {
  fajr: Sunrise,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: Sparkles,
  maghrib: Sunset,
  isha: Moon,
};

const prayerNames: Record<Prayer, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const periodNames: Record<Prayer, { en: string; bn: string }> = {
  fajr: { en: "Dawn", bn: "ঊষা" },
  sunrise: { en: "Morning", bn: "প্রভাত" },
  dhuhr: { en: "Midday", bn: "মধ্যাহ্ন" },
  asr: { en: "Afternoon", bn: "অপরাহ্ন" },
  maghrib: { en: "Sunset", bn: "গোধূলি" },
  isha: { en: "Night", bn: "নিশি" },
};

/* ==========================================================================
   ISLAMIC ROSETTE LOGO & MOSQUE ILLUSTRATION
   ========================================================================== */

function IslamicRosetteLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M24 3 L29 13.5 L40.5 8.5 L35.5 20 L46 24 L35.5 28 L40.5 39.5 L29 34.5 L24 45 L19 34.5 L7.5 39.5 L12.5 28 L2 24 L12.5 20 L7.5 8.5 L19 13.5 Z"
        stroke="#1E5144"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="7.5" stroke="#1E5144" strokeWidth="2" />
      <circle cx="24" cy="24" r="2.5" fill="#1E5144" />
    </svg>
  );
}

function RadiantIslamicLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0, filter: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.5))" }}>
      <defs>
        <linearGradient id="dockRosetteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 L29 13.5 L40.5 8.5 L35.5 20 L46 24 L35.5 28 L40.5 39.5 L29 34.5 L24 45 L19 34.5 L7.5 39.5 L12.5 28 L2 24 L12.5 20 L7.5 8.5 L19 13.5 Z"
        stroke="url(#dockRosetteGrad)"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="rgba(16, 185, 129, 0.14)"
      />
      <circle cx="24" cy="24" r="7.5" stroke="url(#dockRosetteGrad)" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="2.8" fill="url(#dockRosetteGrad)" />
    </svg>
  );
}

function MosqueDomeIllustration({ size = 76 }: { size?: number }) {
  return (
    <div className="reminder-illustration" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" fill="#E8F1EC" />
        <circle cx="50" cy="28" r="14" fill="#DDE8E2" opacity="0.6" />
        <path d="M66 26 Q69 23 72 25 Q75 23 78 26" stroke="#7A9B8D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M72 20 Q74 18 76 19 Q78 18 80 20" stroke="#7A9B8D" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Minaret */}
        <path d="M22 68 L22 46 L26 46 L26 68 Z" fill="#6B9382" />
        <path d="M20 46 L28 46 L24 38 Z" fill="#4E7867" />
        <circle cx="24" cy="36" r="1.5" fill="#3D6454" />
        {/* Back Dome */}
        <path d="M50 42 C40 42 36 50 36 68 L64 68 C64 50 60 42 50 42 Z" fill="#5A8472" />
        {/* Main Onion Dome */}
        <path d="M50 34 C43 37 42 45 42 68 L58 68 C58 45 57 37 50 34 Z" fill="#3D6A58" />
        {/* Dome Finial with Crescent */}
        <path d="M50 34 L50 26" stroke="#2D5444" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="24" r="2" fill="#2D5444" />
        {/* Arch Doorway */}
        <path d="M47 68 L47 57 C47 55 53 55 53 57 L53 68 Z" fill="#E8F1EC" />
        {/* Ground */}
        <rect x="15" y="68" width="70" height="18" fill="#4E7867" rx="3" />
        <path d="M20 68 L80 68" stroke="#3D6454" strokeWidth="2" />
      </svg>
    </div>
  );
}

/* ==========================================================================
   MAIN APP COMPONENT
   ========================================================================== */

export function App() {
  const isWidget = new URLSearchParams(window.location.search).get("widget") === "true";
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [storeReady, setStoreReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nav, setNav] = useState<SidebarNav>("overview");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [focusPreview, setFocusPreview] = useState(false);
  const [focusPrayer, setFocusPrayer] = useState<Prayer>("dhuhr");
  const [nativeSchedulerAvailable, setNativeSchedulerAvailable] = useState(true);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | undefined>();
  const [now, setNow] = useState(() => new Date());
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [focusIntervalMinutes, setFocusIntervalMinutes] = useState(5);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(15);
  const firedAlerts = useRef(new Set<string>());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Online API Sync State
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Windows Notification Permission Helper
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  const checkNotificationPermission = async () => {
    try {
      const notification = await import("@tauri-apps/plugin-notification");
      const granted = await notification.isPermissionGranted();
      setPermissionStatus(granted ? "granted" : "denied");
    } catch {
      if ("Notification" in window) {
        setPermissionStatus(
          Notification.permission === "granted"
            ? "granted"
            : Notification.permission === "denied"
            ? "denied"
            : "prompt",
        );
      } else {
        setPermissionStatus("granted");
      }
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const notification = await import("@tauri-apps/plugin-notification");
      const granted = await notification.isPermissionGranted();
      if (!granted) {
        const res = await notification.requestPermission();
        setPermissionStatus(res === "granted" ? "granted" : "denied");
      } else {
        setPermissionStatus("granted");
      }
    } catch {
      if ("Notification" in window) {
        const res = await Notification.requestPermission();
        setPermissionStatus(res === "granted" ? "granted" : "denied");
      }
    }
  };

  useEffect(() => {
    void checkNotificationPermission();
  }, []);

  // Focus Session Persistence across Restarts
  const [focusSession, setFocusSession] = useState<{ prayer: Prayer; targetEndTime: number } | null>(() => {
    try {
      const raw = localStorage.getItem("salah_active_focus_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.targetEndTime > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  // Prayer Completion Tracking
  const todayKey = now.toISOString().slice(0, 10);
  const [completedPrayers, setCompletedPrayers] = useState<Record<Prayer, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`salah_completed_${new Date().toISOString().slice(0, 10)}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false };
  });

  // Load daily completed tracking on mount or when day rolls over
  useEffect(() => {
    const loadDailyCompleted = async () => {
      try {
        const { load } = await import("@tauri-apps/plugin-store");
        const store = await load("prayer-records.json", { defaults: {}, autoSave: true });
        const saved = await store.get<Record<Prayer, boolean>>(`salah_completed_${todayKey}`);
        if (saved) {
          setCompletedPrayers(saved);
          localStorage.setItem(`salah_completed_${todayKey}`, JSON.stringify(saved));
          return;
        }
      } catch {}

      try {
        const saved = localStorage.getItem(`salah_completed_${todayKey}`);
        if (saved) {
          setCompletedPrayers(JSON.parse(saved));
          return;
        }
      } catch {}

      setCompletedPrayers({ fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false });
    };

    void loadDailyCompleted();
  }, [todayKey, storeReady]);

  const saveDailyCompleted = async (records: Record<Prayer, boolean>, dateKey: string) => {
    try {
      localStorage.setItem(`salah_completed_${dateKey}`, JSON.stringify(records));
    } catch {}
    if (!storeReady) return;
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("prayer-records.json", { defaults: {}, autoSave: true });
      await store.set(`salah_completed_${dateKey}`, records);
      await store.save();
    } catch {}
  };

  const [pendingSolemnPrayer, setPendingSolemnPrayer] = useState<Prayer | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ id: string; message: string } | null>(null);

  const triggerTestFeedback = (id: string, message: string) => {
    setTestFeedback({ id, message });
    window.setTimeout(() => {
      setTestFeedback((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const togglePrayer = (prayer: Prayer) => {
    setCompletedPrayers((prev) => {
      const isCurrentlyDone = !!prev[prayer];
      if (isCurrentlyDone) {
        // Un-marking does not require solemn oath
        const next = { ...prev, [prayer]: false };
        void saveDailyCompleted(next, todayKey);
        return next;
      }
      // If solemn confirmation is enabled, open the solemn oath confirmation modal
      if (settings.solemnConfirmationEnabled ?? true) {
        setPendingSolemnPrayer(prayer);
        return prev;
      }
      const next = { ...prev, [prayer]: true };
      void saveDailyCompleted(next, todayKey);
      return next;
    });
  };

  const markPrayerCompleted = (prayer: Prayer) => {
    setCompletedPrayers((prev) => {
      const next = { ...prev, [prayer]: true };
      void saveDailyCompleted(next, todayKey);
      return next;
    });
    setPendingSolemnPrayer(null);
  };

  const togglePastPrayerRecord = async (dateKey: string, prayer: Prayer) => {
    if (dateKey === todayKey) {
      togglePrayer(prayer);
      return;
    }
    const saved = localStorage.getItem(`salah_completed_${dateKey}`);
    let currentMap: Record<Prayer, boolean> = { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false };
    if (saved) {
      try {
        currentMap = JSON.parse(saved);
      } catch {}
    }
    const nextMap = { ...currentMap, [prayer]: !currentMap[prayer] };
    await saveDailyCompleted(nextMap, dateKey);
    setCompletedPrayers((prev) => ({ ...prev }));
  };

  const completedCount = obligatoryPrayers.filter((p) => completedPrayers[p]).length;

  const streakDays = useMemo(() => {
    const result: boolean[] = [];
    const base = new Date(now);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const key = `salah_completed_${d.toISOString().slice(0, 10)}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const count = obligatoryPrayers.filter((p) => parsed[p]).length;
          result.push(count >= 3);
        } catch {
          result.push(false);
        }
      } else {
        result.push(false);
      }
    }
    return result;
  }, [now, completedPrayers]);

  const pastDaysHistory = useMemo(() => {
    const list: Array<{
      dateKey: string;
      label: string;
      isToday: boolean;
      records: Record<Prayer, boolean>;
      completedCount: number;
    }> = [];
    const base = new Date(now);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      let records: Record<Prayer, boolean> = { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false };
      if (i === 0) {
        records = completedPrayers;
      } else {
        const saved = localStorage.getItem(`salah_completed_${key}`);
        if (saved) {
          try {
            records = JSON.parse(saved);
          } catch {}
        }
      }
      const count = obligatoryPrayers.filter((p) => records[p]).length;
      let label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (i === 0) label = `Today (${label})`;
      else if (i === 1) label = `Yesterday (${label})`;

      list.push({
        dateKey: key,
        label,
        isToday: i === 0,
        records,
        completedCount: count,
      });
    }
    return list;
  }, [now, completedPrayers]);

  const timeZone = settings.timeZoneMode.kind === "explicit"
    ? settings.timeZoneMode.identifier
    : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const language = resolveLanguage(settings.languageOverride);
  const detectedCountryCode = inferCountryCode(timeZone);
  const resolvedMethodId = settings.autoDetectMethod ? methodIdForCountryCode(detectedCountryCode) : settings.methodId;
  const method = useMemo(
    () => resolveMethod(resolvedMethodId, settings.hanafiAsr, settings.manualParameters) ?? MWLAdapter,
    [resolvedMethodId, settings.hanafiAsr, settings.manualParameters],
  );

  const systemDetectedLocation = useMemo(
    () => inferCoordinatesFromTimeZone(timeZone),
    [timeZone],
  );

  const [detectedCityName, setDetectedCityName] = useState<string>(() => {
    const saved = localStorage.getItem("salah_detected_city");
    if (saved) return saved;
    const nearest = findNearestCity(settings.manualCoordinates.latitude, settings.manualCoordinates.longitude, 40);
    if (nearest) return `${nearest.name}, ${nearest.country}`;
    return "Khulna, Bangladesh";
  });

  const [showLocationModal, setShowLocationModal] = useState<boolean>(() => {
    return localStorage.getItem("salah_location_verified") !== "true";
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "ip" | "timezone">("ip");

  const coordinates = useMemo(() => {
    if (settings.locationMode === "manual") {
      return settings.manualCoordinates;
    }
    const isIstanbulDefault =
      Math.abs(settings.manualCoordinates.latitude - 41.0082) < 0.001 &&
      Math.abs(settings.manualCoordinates.longitude - 28.9784) < 0.001;
    if (isIstanbulDefault && systemDetectedLocation && timeZone !== "Europe/Istanbul") {
      return {
        latitude: systemDetectedLocation.latitude,
        longitude: systemDetectedLocation.longitude,
        elevation: systemDetectedLocation.elevation ?? 0,
      };
    }
    return settings.manualCoordinates;
  }, [settings.locationMode, settings.manualCoordinates, systemDetectedLocation, timeZone]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const handleAutoDetect = useCallback(async (forceGps = false) => {
    setIsDetectingLocation(true);
    try {
      const res = await detectPreciseLocation(forceGps);
      updateSettings({
        locationMode: "automatic",
        manualCoordinates: {
          latitude: res.latitude,
          longitude: res.longitude,
          elevation: res.elevation,
        },
      });
      setDetectedCityName(res.cityName);
      setLocationSource(res.source);
      localStorage.setItem("salah_detected_city", res.cityName);
    } catch (e) {
      console.warn("Location detection error:", e);
    } finally {
      setIsDetectingLocation(false);
    }
  }, [updateSettings]);

  // Background auto-detection of location from device GPS or high-speed Network on startup
  useEffect(() => {
    if (settings.locationMode !== "automatic") return;

    let cancelled = false;

    detectPreciseLocation(false).then((res) => {
      if (cancelled || !res) return;
      updateSettings({
        manualCoordinates: {
          latitude: res.latitude,
          longitude: res.longitude,
          elevation: res.elevation,
        },
      });
      setDetectedCityName(res.cityName);
      setLocationSource(res.source);
      localStorage.setItem("salah_detected_city", res.cityName);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [settings.locationMode]);

  const handleSelectCity = (city: CityLocation) => {
    updateSettings({
      locationMode: "automatic",
      manualCoordinates: {
        latitude: city.latitude,
        longitude: city.longitude,
        elevation: city.elevation ?? 0,
      },
      timeZoneMode: { kind: "explicit", identifier: city.timeZone },
    });
    const name = `${city.name}, ${city.country}`;
    setDetectedCityName(name);
    localStorage.setItem("salah_detected_city", name);
    localStorage.setItem("salah_location_verified", "true");
    setShowLocationModal(false);
  };

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      setNow(new Date());
      timer = window.setTimeout(refresh, nextClockRefreshDelay(isWidget));
    };
    const refreshAfterVisibilityChange = () => {
      setNow(new Date());
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(refresh, nextClockRefreshDelay(isWidget));
    };
    document.addEventListener("visibilitychange", refreshAfterVisibilityChange);
    timer = window.setTimeout(refresh, nextClockRefreshDelay(isWidget));
    return () => {
      document.removeEventListener("visibilitychange", refreshAfterVisibilityChange);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isWidget]);

  useEffect(() => {
    let cancelled = false;
    loadPersistedSettings().then((persisted) => {
      if (cancelled) return;
      if (persisted) setSettings(persisted);
      setStoreReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void saveSettings(settings, storeReady);
  }, [settings, storeReady]);

  useEffect(() => {
    document.body.classList.toggle("widget-body", isWidget);
    document.body.dir = textDirection(language);
    document.documentElement.lang = language;
    return () => document.body.classList.remove("widget-body");
  }, [isWidget, language]);

  const playNotificationSound = async (sound: NotificationSound, playFullAdhan: boolean) => {
    const url = soundUrl(sound, playFullAdhan);
    if (!url) return;
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    try {
      await audio.play();
    } catch {
      setAudioPlaying(false);
    }
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setAudioPlaying(false);
  };

  const checkForAppUpdate = async (manual = false) => {
    if (updateBusy) return;
    setUpdateBusy(true);
    if (manual) setUpdateStatus("Checking for updates...");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        setUpdateStatus(manual ? "You already have the latest version." : undefined);
        return;
      }
      const approved = window.confirm(`Version ${update.version} is available. Download and install it now?`);
      if (!approved) {
        setUpdateStatus(`Update ${update.version} is available.`);
        return;
      }
      setUpdateStatus(`Downloading ${update.version}...`);
      await update.downloadAndInstall();
      setUpdateStatus(`Update ${update.version} installed. Restart the app if it does not relaunch automatically.`);
    } catch {
      setUpdateStatus(manual ? "Unable to check for updates right now." : undefined);
    } finally {
      setUpdateBusy(false);
    }
  };

  // Restore active focus session if present
  useEffect(() => {
    if (focusSession && focusSession.targetEndTime > Date.now()) {
      setFocusPrayer(focusSession.prayer);
      setFocusPreview(true);
      void startNativeFocusMode();
    }
  }, []);

  const beginFocusMode = async (prayer: Prayer = clock.next?.prayer ?? "dhuhr") => {
    const durationMs = (settings.focusDurationMinutes ?? 15) * 60_000;
    const targetEndTime = Date.now() + durationMs;
    const session = { prayer, targetEndTime };
    setFocusPrayer(prayer);
    setFocusSession(session);
    try {
      localStorage.setItem("salah_active_focus_session", JSON.stringify(session));
    } catch {}
    await startNativeFocusMode();
    setFocusPreview(true);
  };

  const endFocusMode = async () => {
    setFocusPreview(false);
    setFocusSession(null);
    try {
      localStorage.removeItem("salah_active_focus_session");
    } catch {}
    await endNativeFocusMode();
  };

  const confirmPrayerAndEndFocus = async (prayer: Prayer) => {
    await endFocusMode();
    if (settings.solemnConfirmationEnabled ?? true) {
      setPendingSolemnPrayer(prayer);
    } else {
      markPrayerCompleted(prayer);
    }
  };

  const testAdhanNotification = async (targetPrayer: Prayer = clock.next?.prayer ?? "dhuhr") => {
    const label = prayerNames[targetPrayer];
    const pTime = clock.today.times[targetPrayer] ?? now;
    const timeStr = formatClock(pTime, timeZone, language);
    const title = `${label} Prayer Adhan`;
    const body = `It is now time for ${label} (${timeStr}). Hayya 'alas-Salah!`;

    const sound = settings.notificationDefaults.sound ?? "adhanMadinah";
    void playNotificationSound(sound, settings.notificationDefaults.playFullAdhan);

    let sentNative = false;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("trigger_test_notification", { title, body });
      sentNative = true;
    } catch {}
    if (!sentNative) {
      await sendDesktopNotification(title, body);
    }
    triggerTestFeedback("adhan", `Windows Notification & ${sound} triggered for ${label}!`);
  };

  const testRecurringReminder = async (targetPrayer: Prayer = activeWaqt) => {
    const label = prayerNames[targetPrayer];
    const intervalMins = settings.recurringReminderIntervalMinutes ?? 5;
    const title = `${label} Reminder (${intervalMins}m elapsed)`;
    const body = `Have you prayed ${label}? Prayer window is active. Click to confirm.`;

    void playNotificationSound("softChime", false);

    let sentNative = false;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("trigger_test_notification", { title, body });
      sentNative = true;
    } catch {}
    if (!sentNative) {
      await sendDesktopNotification(title, body);
    }
    triggerTestFeedback("recurring", `Recurring reminder alert (${intervalMins}m interval) dispatched!`);
  };

  const testFocusMode = async (targetPrayer: Prayer = activeWaqt) => {
    triggerTestFeedback("focus", "Starting Fullscreen Focus Mode session...");
    await beginFocusMode(targetPrayer);
  };

  const testSolemnConfirmation = (targetPrayer: Prayer = activeWaqt) => {
    setPendingSolemnPrayer(targetPrayer);
    triggerTestFeedback("solemn", `Solemn Oath Dialog opened for ${prayerNames[targetPrayer]}!`);
  };

  const testToggleYesterdayRecord = async () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    const saved = localStorage.getItem(`salah_completed_${yKey}`);
    let currentMap: Record<Prayer, boolean> = { fajr: false, sunrise: false, dhuhr: false, asr: false, maghrib: false, isha: false };
    if (saved) {
      try {
        currentMap = JSON.parse(saved);
      } catch {}
    }
    const hasAny = obligatoryPrayers.some((p) => currentMap[p]);
    const nextMap: Record<Prayer, boolean> = {
      fajr: !hasAny,
      sunrise: false,
      dhuhr: !hasAny,
      asr: !hasAny,
      maghrib: !hasAny,
      isha: !hasAny,
    };
    await saveDailyCompleted(nextMap, yKey);
    setCompletedPrayers((prev) => ({ ...prev }));
    triggerTestFeedback("history", `Yesterday's history record ${!hasAny ? "marked 5/5 completed" : "reset"}!`);
  };

  // Sync prayer times with online API (fallback to local astronomical calculation)
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      setIsSyncing(true);
      const todayCivil = civilDateFromDate(now, timeZone);
      const calculationParams = {
        ...method.resolve(coordinates),
        highLatitudeRule: settings.highLatitudeRule,
      };
      const res = await loadPrayerTimesWithFallback({
        todayDate: todayCivil,
        coordinates,
        methodId: method.id,
        hanafi: settings.hanafiAsr,
        params: calculationParams,
        timeZone,
        preferApi: settings.calculationMode !== "manual",
      });
      if (!cancelled) {
        setSyncResult(res);
        setIsSyncing(false);
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [
    coordinates.latitude,
    coordinates.longitude,
    method.id,
    settings.hanafiAsr,
    settings.highLatitudeRule,
    settings.calculationMode,
    timeZone,
    todayKey,
  ]);

  const clock = useMemo(
    () => buildPrayerClock(now, settings, method, coordinates, timeZone, syncResult?.today, syncResult?.tomorrow),
    [coordinates, method, now, settings, timeZone, syncResult],
  );

  const runtimeSchedule = useMemo(
    () => buildRuntimeSchedule(clock.today, clock.tomorrow, settings, timeZone, language, completedPrayers),
    [clock.today, clock.tomorrow, language, settings, timeZone, completedPrayers],
  );

  const secondsUntilNext = clock.next ? Math.max(0, (clock.next.time.getTime() - now.getTime()) / 1000) : 0;
  const activePrayer = settings.menuBarCountdownMode === "currentWaqt"
    ? currentPrayer(clock.today, now)?.prayer ?? clock.next?.prayer
    : clock.next?.prayer;
  const currentPrayerTimeLabel = clock.next ? formatClock(clock.next.time, timeZone, language) : "--:--";
  const trayLabel = buildTrayLabel(
    language,
    settings.menuBarStyle,
    settings.menuBarCountdownMode,
    activePrayer,
    secondsUntilNext,
    currentPrayerTimeLabel,
    shortCountdown(secondsUntilNext),
  );
  const hijriDate = settings.showHijriDate ? formatHijriDateLocalized(now, settings.hijriDayAdjustment, timeZone, language) : undefined;
  const rows = orderedTimes(clock.today);
  const ishraqTime = settings.showIshraqTime ? ishraq(clock.today) : undefined;
  const activeWaqt = currentPrayer(clock.today, now)?.prayer ?? clock.next?.prayer ?? "dhuhr";

  useEffect(() => {
    if (!storeReady || isWidget) return;
    void setWidgetVisibility(settings.showPrayerWidget);
  }, [isWidget, settings.showPrayerWidget, storeReady]);

  useEffect(() => {
    if (!storeReady || isWidget || !settings.autoUpdateEnabled) return;
    const id = window.setTimeout(() => void checkForAppUpdate(false), 4_000);
    return () => window.clearTimeout(id);
  }, [isWidget, settings.autoUpdateEnabled, storeReady]);

  useEffect(() => {
    if (isWidget) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const attach = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<RuntimeScheduledEvent>("prayer-runtime-event", async (event) => {
          const payload = event.payload;
          if (payload.body) await sendDesktopNotification(payload.title, payload.body);
          if (payload.playSound && payload.sound) await playNotificationSound(payload.sound, payload.playFullAdhan);
          if (payload.startFocus && payload.prayer) await beginFocusMode(payload.prayer);
        });
        if (!cancelled) setNativeSchedulerAvailable(true);
      } catch {
        if (!cancelled) setNativeSchedulerAvailable(false);
      }
    };

    void attach();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [isWidget]);

  useEffect(() => {
    if (isWidget || !storeReady || !nativeSchedulerAvailable) return;
    let cancelled = false;
    const pushSchedule = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("sync_runtime_schedule", { events: runtimeSchedule });
      } catch {
        if (!cancelled) setNativeSchedulerAvailable(false);
      }
    };
    void pushSchedule();
    return () => { cancelled = true; };
  }, [isWidget, nativeSchedulerAvailable, runtimeSchedule, storeReady]);

  useEffect(() => {
    if (isWidget) return;
    let cancelled = false;
    const syncTray = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("update_tray_title", { title: trayLabel });
      } catch {}
    };
    void syncTray();
    return () => { cancelled = true; };
  }, [isWidget, trayLabel]);

  useEffect(() => {
    if (isWidget || nativeSchedulerAvailable) return;
    let timer: number | undefined;
    let cancelled = false;

    const checkAlerts = async () => {
      const currentNow = new Date();
      const currentClock = buildPrayerClock(
        currentNow,
        settings,
        method,
        coordinates,
        timeZone,
        syncResult?.today,
        syncResult?.tomorrow,
      );
      await fireDueAlerts({
        now: currentNow,
        today: currentClock.today,
        tomorrow: currentClock.tomorrow,
        settings,
        timeZone,
        fired: firedAlerts.current,
        completedPrayers,
        playSound: playNotificationSound,
        showFocus: async (prayer) => {
          if (shouldFocus(settings, prayer)) await beginFocusMode(prayer);
        },
      });
      if (!cancelled) {
        timer = window.setTimeout(
          checkAlerts,
          nextAlertCheckDelay(
            currentNow,
            currentClock.today,
            currentClock.tomorrow,
            settings,
            timeZone,
            firedAlerts.current,
            completedPrayers,
          ),
        );
      }
    };

    void checkAlerts();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [coordinates, completedPrayers, isWidget, method, nativeSchedulerAvailable, settings, syncResult, timeZone]);

  if (isWidget) {
    return (
      <PrayerWidget
        next={clock.next}
        secondsUntilNext={secondsUntilNext}
        timeZone={timeZone}
        hijriDate={hijriDate}
        language={language}
      />
    );
  }

  // Circular gauge calculation for Next Prayer card
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const prevWaqtTime = clock.today.times[activeWaqt]?.getTime() ?? (now.getTime() - 3600_000);
  const nextWaqtTime = clock.next?.time.getTime() ?? (now.getTime() + 7200_000);
  const totalWindow = Math.max(1, nextWaqtTime - prevWaqtTime);
  const elapsedWindow = Math.max(0, Math.min(totalWindow, now.getTime() - prevWaqtTime));
  const progressRatio = elapsedWindow / totalWindow;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const totalSecsLeft = clock.next ? Math.max(0, Math.floor((clock.next.time.getTime() - now.getTime()) / 1000)) : 0;
  const hoursLeft = Math.floor(totalSecsLeft / 3600);
  const minsLeft = Math.floor((totalSecsLeft % 3600) / 60);
  const countdownFormatted = `${String(hoursLeft).padStart(2, "0")}h ${String(minsLeft).padStart(2, "0")}m`;

  const gregorianDateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  const displayNext = clock.next ?? { prayer: "fajr" as Prayer, time: now };
  const isNextPrayed = completedPrayers[displayNext.prayer];

  return (
    <div className="salah-window-shell">
      <div className="salah-app-body">
      {/* Off-Canvas Backdrop (Click outside to close) */}
      {sidebarOpen && (
        <div
          className="salah-drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Off-Canvas Slide-Out Sidebar Drawer */}
      <aside className={`salah-slide-drawer ${sidebarOpen ? "open" : ""}`} aria-label="Main Navigation">
        <div className="drawer-header-top">
          <div className="drawer-brand">
            <IslamicRosetteLogo size={32} />
            <div>
              <h1 className="drawer-brand-name">Salah</h1>
              <p className="drawer-brand-tagline">Better Prayers. A Brighter You.</p>
            </div>
          </div>
          <button
            className="drawer-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="drawer-nav-list">
          <button
            className={`drawer-nav-item ${nav === "overview" ? "active" : ""}`}
            onClick={() => {
              setNav("overview");
              setSidebarOpen(false);
            }}
          >
            <Home size={19} />
            <span>Overview</span>
          </button>

          <button
            className={`drawer-nav-item ${nav === "prayerTimes" ? "active" : ""}`}
            onClick={() => {
              setNav("prayerTimes");
              setSidebarOpen(false);
            }}
          >
            <Clock size={19} />
            <span>Prayer Times</span>
          </button>

          <button
            className={`drawer-nav-item ${nav === "accountability" ? "active" : ""}`}
            onClick={() => {
              setNav("accountability");
              setSidebarOpen(false);
            }}
          >
            <Target size={19} />
            <span>Salah Accountability</span>
          </button>

          <button
            className={`drawer-nav-item ${nav === "history" ? "active" : ""}`}
            onClick={() => {
              setNav("history");
              setSidebarOpen(false);
            }}
          >
            <Calendar size={19} />
            <span>Prayer History & Streak</span>
          </button>

          <button
            className={`drawer-nav-item ${nav === "settings" ? "active" : ""}`}
            onClick={() => {
              setNav("settings");
              setSidebarOpen(false);
            }}
          >
            <SettingsIcon size={19} />
            <span>Settings & Preferences</span>
          </button>
        </nav>

        <div className="drawer-divider" />

        <div className="drawer-quick-actions">
          <button
            className="drawer-action-btn"
            onClick={() => {
              beginFocusMode(clock.next?.prayer);
              setSidebarOpen(false);
            }}
          >
            <EyeOff size={16} />
            <span>Start Focus Mode</span>
          </button>

          <button
            className={`drawer-action-btn ${settings.showPrayerWidget ? "highlight" : ""}`}
            onClick={() => {
              const nextVal = !settings.showPrayerWidget;
              updateSettings({ showPrayerWidget: nextVal });
              void setWidgetVisibility(nextVal);
            }}
          >
            <Moon size={16} />
            <span>Desktop Widget: {settings.showPrayerWidget ? "Active" : "Hidden"}</span>
          </button>
        </div>

        <div className="drawer-footer-user">
          <div className="drawer-user-info">
            <div className="drawer-user-avatar">
              <span>N</span>
              <div className="drawer-avatar-dot" />
            </div>
            <div>
              <strong className="drawer-user-name">Nayem</strong>
              <p className="drawer-user-streak">{streakDays.filter(Boolean).length} of 7 Days Streak</p>
            </div>
          </div>
        </div>
      </aside>

        {/* Main Canvas */}
        <main className="salah-main-canvas">
          {nav === "overview" && (
            <>
              {/* Header Greeting */}
              <header className="salah-header">
                <div className="header-greeting-left">
                  <button
                    className="salah-menu-trigger-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open navigation menu"
                  >
                    <Menu size={18} />
                    <span>Menu</span>
                  </button>
                  <div className="header-greeting-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h2 className="header-greeting-title">Assalamu Alaikum, Nayem</h2>
                      <button
                        type="button"
                        className="header-location-badge"
                        onClick={() => setShowLocationModal(true)}
                        title={`Active: ${detectedCityName} (${coordinates.latitude.toFixed(2)}°, ${coordinates.longitude.toFixed(2)}°) — Click to change or re-detect GPS`}
                      >
                        <MapPin size={11} />
                        <span>{detectedCityName.split(",")[0]}</span>
                        <ChevronDown size={10} style={{ opacity: 0.7, marginLeft: 2 }} />
                      </button>
                    </div>
                    <p className="header-greeting-sub">Make space for what matters.</p>
                  </div>
                </div>

                <div className="header-meta-group">
                  <div className="header-date-stack">
                    <span className="header-gregorian-date">{gregorianDateStr}</span>
                    <span className="header-hijri-date">{hijriDate ?? "Dhu al-Hijjah 10, 1447 AH"}</span>
                  </div>

                  <div className="header-meta-divider" />

                  {/* Primary Engine & Backup Status Badges */}
                  <div className="header-sync-status">
                    <span
                      className="api-badge astronomical"
                      title={`Primary Engine: ${method.displayName}${settings.hanafiAsr ? " • Hanafi Asr" : ""}`}
                    >
                      <Sparkles size={11} />
                      <span>Solar Engine (Primary)</span>
                    </span>

                    {syncResult?.source === "api" ? (
                      <span className="api-badge online" title="Cloud API Backup synced with Aladhan">
                        <Wifi size={11} />
                        <span>Cloud Backup Ready</span>
                      </span>
                    ) : (
                      <span
                        className="api-badge offline"
                        title={syncResult?.error ? `Cloud API Backup (${syncResult.error})` : "Cloud API Backup offline"}
                      >
                        <WifiOff size={11} />
                        <span>Backup Offline</span>
                      </span>
                    )}
                  </div>

                  <div className="header-meta-divider" />

                  <div className="header-progress-stack">
                    <div className="header-progress-top">
                      <Clock size={14} />
                      <span>Daily Progress</span>
                    </div>
                    <span className="header-progress-count">{completedCount} of 5 prayers</span>
                    <div className="header-progress-bar-track">
                      <div
                        className="header-progress-bar-fill"
                        style={{ width: `${(completedCount / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </header>

              {/* Windows Notification Permission Warning */}
              {permissionStatus === "denied" && (
                <div className="permission-warning-banner">
                  <div className="permission-warning-content">
                    <AlertCircle size={16} className="text-amber" />
                    <span>
                      Windows notifications are blocked for Salah. Enable them in Windows Settings &gt; System &gt; Notifications to receive prayer calls and 5-minute reminders.
                    </span>
                  </div>
                  <button className="btn-permission-retry" onClick={requestNotificationPermission}>
                    Check Again
                  </button>
                </div>
              )}

              {/* International Adaptive Bento Grid */}
              <div className="salah-bento-grid">
                {/* Column 1: Core Daily Prayer Hub */}
                <div className="bento-column-primary">
                  {/* Card 1: Next Prayer Hero */}
                  <div className="salah-card card-next-prayer">
                    <div className="card-top-eyebrow-row">
                      <span className="card-eyebrow">NEXT PRAYER</span>
                      <span className={`status-pill ${activeWaqt === displayNext.prayer ? "current" : "upcoming"}`}>
                        {activeWaqt === displayNext.prayer ? "Current" : "Upcoming"}
                      </span>
                    </div>

                    <div className="next-prayer-content">
                      <div className="next-prayer-info">
                        <strong className="next-prayer-name">{prayerNames[displayNext.prayer]}</strong>
                        <div className="next-prayer-time-line">
                          <Sunrise size={17} />
                          <span>{formatClock(displayNext.time, timeZone, language)}</span>
                        </div>
                      </div>

                      {/* Donut Gauge Ring */}
                      <div className="donut-gauge-container">
                        <svg className="donut-gauge-svg" viewBox="0 0 96 96">
                          <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="#E6EFEA"
                            strokeWidth="7"
                            fill="none"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="#1E5144"
                            strokeWidth="7"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="donut-gauge-labels">
                          <span className="donut-gauge-time">{countdownFormatted}</span>
                          <span className="donut-gauge-sub">until {prayerNames[displayNext.prayer]}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        className={`btn-card-prayed ${isNextPrayed ? "done" : "pending"}`}
                        onClick={() => togglePrayer(displayNext.prayer)}
                        style={{ flex: 1 }}
                      >
                        {isNextPrayed && <Check size={15} strokeWidth={2.5} />}
                        <span>{isNextPrayed ? "Prayed" : "I've Prayed"}</span>
                      </button>
                      <button
                        className="btn-quick-test"
                        onClick={() => void testAdhanNotification(displayNext.prayer)}
                        title="Test Windows notification & adhan audio"
                        style={{ padding: "0 12px", height: 44, borderRadius: 12 }}
                      >
                        <Bell size={14} />
                        <span>Test Notif</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Five Daily Prayers */}
                  <div className="salah-card card-five-prayers">
                    <div className="card-header-bar">
                      <div className="card-header-title">
                        <Calendar size={16} />
                        <span>Five Daily Prayers</span>
                      </div>
                      <button className="card-view-all-link" onClick={() => setNav("prayerTimes")}>
                        <span>View All</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    <div className="prayers-list-container">
                      {obligatoryPrayers.map((prayer) => {
                        const Icon = prayerIcons[prayer];
                        const pTime = clock.today.times[prayer] ?? now;
                        const isDone = completedPrayers[prayer];
                        const isCurrent = activeWaqt === prayer;

                        let badgeText = "Upcoming";
                        let badgeClass = "upcoming";
                        if (isDone) {
                          badgeText = "Completed";
                          badgeClass = "completed";
                        } else if (isCurrent) {
                          badgeText = "Current";
                          badgeClass = "current";
                        }

                        return (
                          <div key={prayer} className={`prayer-list-item ${isCurrent ? "item-current" : ""}`}>
                            <div className="prayer-item-left">
                              <div className="prayer-item-icon">
                                <Icon size={16} />
                              </div>
                              <span className="prayer-item-name">{prayerNames[prayer]}</span>
                            </div>

                            <div className="prayer-item-cluster">
                              <span className="prayer-item-time">{formatClock(pTime, timeZone, language)}</span>
                              <span className={`status-pill ${badgeClass}`}>{badgeText}</span>
                              <div
                                className={`prayer-check-btn ${isDone ? "completed" : isCurrent ? "current" : "upcoming"}`}
                                onClick={() => togglePrayer(prayer)}
                                title={isDone ? "Mark as uncompleted" : "Mark as completed"}
                              >
                                {isDone && <Check size={11} strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 3: Today's Salah */}
                  <div className="salah-card card-today-salah">
                    <div className="card-header-bar">
                      <div className="card-header-title">
                        <Target size={16} />
                        <span>Today's Salah</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="today-salah-header-pill">{completedCount} of 5 completed</span>
                        <button
                          className="btn-quick-test"
                          onClick={() => testSolemnConfirmation()}
                          title="Test Solemn Confirmation Oath Modal"
                        >
                          <ShieldCheck size={12} />
                          <span>Test Oath</span>
                        </button>
                      </div>
                    </div>

                    <div className="today-salah-track">
                      <div
                        className="today-salah-fill"
                        style={{ width: `${(completedCount / 5) * 100}%` }}
                      />
                    </div>

                    {/* 5 Milestone Checkpoint Circles */}
                    <div className="milestones-row">
                      {obligatoryPrayers.map((prayer) => {
                        const isDone = completedPrayers[prayer];
                        const isCurrent = activeWaqt === prayer;
                        return (
                          <div
                            key={prayer}
                            className="milestone-node"
                            onClick={() => togglePrayer(prayer)}
                          >
                            <div className={`milestone-circle ${isDone ? "completed" : isCurrent ? "current" : "upcoming"}`}>
                              {isDone && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="milestone-label">{prayerNames[prayer]}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Consistency (Last 7 days) */}
                    <div className="consistency-bar">
                      <div className="consistency-left">
                        <Calendar size={15} />
                        <div>
                          <div className="consistency-title">Consistency</div>
                          <div className="consistency-sub">Last 7 days</div>
                        </div>
                      </div>

                      <div className="streak-dots-group">
                        {streakDays.map((active, idx) => (
                          <div
                            key={idx}
                            className={`streak-indicator-dot ${active ? "active" : ""}`}
                            title={`Day ${idx + 1}: ${active ? "Consistent" : "Pending"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Companion & Focus Experience */}
                <div className="bento-column-secondary">
                  {/* Card 4: Salah Reminder Prompt */}
                  {!reminderDismissed ? (
                    <div className="salah-card card-reminder-prompt">
                      <div className="reminder-card-top">
                        <div className="card-header-title">
                          <Bell size={15} />
                          <span>Salah Reminder</span>
                        </div>
                        <button
                          className="reminder-dismiss-btn"
                          onClick={() => setReminderDismissed(true)}
                          title="Dismiss"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="reminder-card-body">
                        <MosqueDomeIllustration size={76} />
                        <div className="reminder-text-stack">
                          <h3 className="reminder-callout-title">It's time for {prayerNames[activeWaqt]}.</h3>
                          <p className="reminder-callout-sub">Take a pause and pray.</p>
                        </div>
                      </div>

                      <div className="reminder-actions-row">
                        <button
                          className="btn-reminder-prayed"
                          onClick={() => {
                            markPrayerCompleted(activeWaqt);
                            setReminderDismissed(true);
                          }}
                        >
                          I've Prayed
                        </button>
                        <button
                          className="btn-reminder-again"
                          onClick={() => setReminderDismissed(true)}
                        >
                          Remind Me Again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="salah-card reminder-settled-card">
                      <div className="reminder-settled-content">
                        <div className="reminder-settled-icon">
                          <Check size={20} strokeWidth={2.5} />
                        </div>
                        <strong className="reminder-settled-title">Reminder Settled</strong>
                        <p className="reminder-settled-sub">Next gentle alert will trigger at the upcoming prayer window.</p>
                        <button
                          className="reminder-reopen-btn"
                          onClick={() => setReminderDismissed(false)}
                        >
                          Show prompt again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card 5: Focus Mode */}
                  <div className="salah-card card-focus-mode">
                    <div className="focus-card-top">
                      <div className="card-header-title">
                        <Bell size={16} />
                        <span>Focus Mode</span>
                      </div>
                      <div
                        className={`salah-toggle-switch ${settings.focusModeEnabled ? "active" : ""}`}
                        onClick={() => updateSettings({ focusModeEnabled: !settings.focusModeEnabled })}
                      >
                        <div className="salah-toggle-thumb" />
                      </div>
                    </div>

                    <p className="focus-card-desc">
                      Gentle reminders until you confirm. A focused {focusDurationMinutes}-minute prayer break when needed.
                    </p>

                    <div className="focus-select-grid">
                      <div className="focus-select-col">
                        <label className="focus-field-label">
                          <Clock size={13} />
                          <span>Reminder Interval</span>
                        </label>
                        <select
                          className="focus-field-select"
                          value={focusIntervalMinutes}
                          onChange={(e) => setFocusIntervalMinutes(Number(e.target.value))}
                        >
                          <option value={5}>Every 5 minutes</option>
                          <option value={10}>Every 10 minutes</option>
                          <option value={15}>Every 15 minutes</option>
                        </select>
                      </div>

                      <div className="focus-select-col">
                        <label className="focus-field-label">
                          <Clock size={13} />
                          <span>Focus Duration</span>
                        </label>
                        <select
                          className="focus-field-select"
                          value={focusDurationMinutes}
                          onChange={(e) => setFocusDurationMinutes(Number(e.target.value))}
                        >
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={20}>20 minutes</option>
                          <option value={30}>30 minutes</option>
                        </select>
                      </div>
                    </div>

                    <div className="focus-footer-info">
                      <Info size={13} />
                      <span>Every {focusIntervalMinutes} minutes • Emergency recovery available</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW: PRAYER TIMES */}
          {nav === "prayerTimes" && (
            <div className="view-container">
              <div className="view-header">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    className="salah-menu-trigger-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open navigation menu"
                  >
                    <Menu size={18} />
                    <span>Menu</span>
                  </button>
                  <div>
                    <h2 className="view-title">Prayer Times Schedule</h2>
                    <p className="view-subtitle">Accurate astronomical timings based on your coordinates.</p>
                  </div>
                </div>
              </div>

              <div className="view-card-grid">
                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 16 }}>
                    <Calendar size={16} />
                    <span>Today's Complete Schedule</span>
                  </div>
                  <table className="prayer-table">
                    <thead>
                      <tr>
                        <th>Prayer</th>
                        <th>Period</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((entry) => {
                        const isCurrent = activeWaqt === entry.prayer;
                        const isNext = clock.next?.prayer === entry.prayer;
                        const isDone = completedPrayers[entry.prayer];
                        return (
                          <tr key={entry.prayer} className={isCurrent ? "active" : ""}>
                            <td style={{ fontWeight: 600 }}>{prayerNames[entry.prayer]}</td>
                            <td style={{ color: "#6B7280" }}>{periodNames[entry.prayer].en}</td>
                            <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                              {formatClock(entry.time, timeZone, language)}
                            </td>
                            <td>
                              <span className={`status-pill ${isDone ? "completed" : isCurrent ? "current" : "upcoming"}`}>
                                {isDone ? "Completed" : isCurrent ? "Current" : isNext ? "Next" : "Upcoming"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {settings.showIshraqTime && ishraqTime && (
                        <tr>
                          <td style={{ fontWeight: 600 }}>Ishraq</td>
                          <td style={{ color: "#6B7280" }}>Post-Sunrise</td>
                          <td style={{ fontWeight: 600 }}>{formatClock(ishraqTime, timeZone, language)}</td>
                          <td><span className="status-pill upcoming">Sunnah</span></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 16 }}>
                    <Clock size={16} />
                    <span>Tomorrow's Schedule</span>
                  </div>
                  <table className="prayer-table">
                    <thead>
                      <tr>
                        <th>Prayer</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedTimes(clock.tomorrow).map((entry) => (
                        <tr key={entry.prayer}>
                          <td style={{ fontWeight: 600 }}>{prayerNames[entry.prayer]}</td>
                          <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {formatClock(entry.time, timeZone, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E8ECE9", display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#6B7280" }}>
                    <div><strong>Calculation:</strong> {method.displayName}</div>
                    <div><strong>Coordinates:</strong> {coordinates.latitude.toFixed(4)}°, {coordinates.longitude.toFixed(4)}°</div>
                    <div><strong>Time Zone:</strong> {timeZone}</div>
                  </div>
                </div>

                <div className="salah-card view-full-card">
                  <div className="card-header-title" style={{ marginBottom: 12 }}>
                    <Sparkles size={16} />
                    <span>Quick Actions</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="setting-btn"
                      onClick={() => beginFocusMode(clock.next?.prayer)}
                    >
                      <EyeOff size={15} />
                      <span>Start Focus Mode Now</span>
                    </button>
                    <button
                      className="setting-btn"
                      onClick={() => {
                        const nextVal = !settings.showPrayerWidget;
                        updateSettings({ showPrayerWidget: nextVal });
                        void setWidgetVisibility(nextVal);
                      }}
                    >
                      <Moon size={15} />
                      <span>{settings.showPrayerWidget ? "Hide Desktop Widget" : "Show Desktop Widget"}</span>
                    </button>
                    {audioPlaying && (
                      <button className="setting-btn" style={{ background: "#FEE2E2", color: "#DC2626" }} onClick={stopAudio}>
                        <Volume2 size={15} />
                        <span>Stop Playing Adhan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SALAH ACCOUNTABILITY */}
          {nav === "accountability" && (
            <div className="view-container">
              <div className="view-header">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    className="salah-menu-trigger-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open navigation menu"
                  >
                    <Menu size={18} />
                    <span>Menu</span>
                  </button>
                  <div>
                    <h2 className="view-title">Salah Accountability</h2>
                    <p className="view-subtitle">Build consistent prayer habits and track your spiritual growth.</p>
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-quick-test" onClick={() => void testFocusMode()}>
                    <EyeOff size={13} />
                    <span>Test Focus Mode</span>
                  </button>
                  <button className="btn-quick-test" onClick={() => void testRecurringReminder()}>
                    <Clock size={13} />
                    <span>Test Recurring Alert</span>
                  </button>
                </div>
              </div>

              <div className="view-card-grid">
                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 16 }}>
                    <Target size={16} />
                    <span>Today's Checklist</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {obligatoryPrayers.map((prayer) => {
                      const isDone = completedPrayers[prayer];
                      return (
                        <div
                          key={prayer}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: isDone ? "#E8F3EE" : "#F8FAF9",
                            border: "1px solid #E8ECE9",
                            cursor: "pointer",
                          }}
                          onClick={() => togglePrayer(prayer)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className={`prayer-check-btn ${isDone ? "completed" : "upcoming"}`}>
                              {isDone && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <strong style={{ fontSize: 14, color: "#111827" }}>{prayerNames[prayer]} Prayer</strong>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>
                                {isDone ? "Marked as prayed on time" : "Pending obligation"}
                              </p>
                            </div>
                          </div>
                          <span className={`status-pill ${isDone ? "completed" : "upcoming"}`}>
                            {isDone ? "Prayed" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 16 }}>
                    <Calendar size={16} />
                    <span>Weekly Habit Stats</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                        <strong>Overall Consistency Rate</strong>
                        <span style={{ color: "#1E5144", fontWeight: 700 }}>
                          {Math.round((streakDays.filter(Boolean).length / 7) * 100)}%
                        </span>
                      </div>
                      <div className="today-salah-track">
                        <div
                          className="today-salah-fill"
                          style={{ width: `${(streakDays.filter(Boolean).length / 7) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div style={{ background: "#F8FAF9", borderRadius: 12, padding: 16, border: "1px solid #E8ECE9" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
                        Hadith of Reflection
                      </div>
                      <blockquote style={{ fontSize: 12.5, color: "#4B5563", lineHeight: 1.5, margin: 0 }}>
                        "The most beloved of deeds to Allah are those that are most consistent, even if they are small."
                      </blockquote>
                      <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#85928C" }}>— Sahih al-Bukhari</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PRAYER HISTORY */}
          {nav === "history" && (
            <div className="view-container">
              <div className="view-header">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    className="salah-menu-trigger-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open navigation menu"
                  >
                    <Menu size={18} />
                    <span>Menu</span>
                  </button>
                  <div>
                    <h2 className="view-title">Prayer History & Streak</h2>
                    <p className="view-subtitle">Review your consistency and journal over the last week.</p>
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <button className="btn-quick-test" onClick={testToggleYesterdayRecord}>
                    <History size={13} />
                    <span>Test Yesterday's Record</span>
                  </button>
                </div>
              </div>

              {/* 7-Day Consistency Banner */}
              <div className="view-card-grid" style={{ marginBottom: 16 }}>
                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 12 }}>
                    <Calendar size={16} />
                    <span>7-Day Habit Overview</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span>Consistency Rate</span>
                    <strong style={{ color: "#1E5144" }}>
                      {Math.round((streakDays.filter(Boolean).length / 7) * 100)}%
                    </strong>
                  </div>
                  <div className="today-salah-track" style={{ marginBottom: 16 }}>
                    <div
                      className="today-salah-fill"
                      style={{ width: `${(streakDays.filter(Boolean).length / 7) * 100}%` }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, textAlign: "center" }}>
                    {streakDays.map((active, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: active ? "#E8F3EE" : "#F8FAF9",
                          borderRadius: 8,
                          padding: "8px 4px",
                          border: "1px solid #E8ECE9",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: active ? "#1E5144" : "#E5E7EB",
                            color: "#FFFFFF",
                            display: "grid",
                            placeItems: "center",
                            margin: "0 auto 4px",
                          }}
                        >
                          {active ? <Check size={12} strokeWidth={2.5} /> : <Minus size={12} />}
                        </div>
                        <span style={{ fontSize: 10, color: active ? "#1E5144" : "#9CA3AF", fontWeight: 600 }}>
                          {active ? "Done" : "Miss"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="salah-card">
                  <div className="card-header-title" style={{ marginBottom: 12 }}>
                    <Target size={16} />
                    <span>Consistency Milestones</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#F8FAF9", padding: "12px 14px", borderRadius: 10, border: "1px solid #E8ECE9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, color: "#111827" }}>Active Consistent Streak</strong>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>Days with at least 3 obligatory prayers</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1E5144" }}>
                        {streakDays.filter(Boolean).length} Days
                      </span>
                    </div>

                    <div style={{ background: "#F8FAF9", padding: "12px 14px", borderRadius: 10, border: "1px solid #E8ECE9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, color: "#111827" }}>Today's Performance</strong>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>Fulfilled obligations today</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1E5144" }}>
                        {completedCount} / 5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed 7-Day Journal with clickable prayer badges */}
              <div className="salah-card">
                <div className="card-header-bar" style={{ marginBottom: 16 }}>
                  <div className="card-header-title">
                    <History size={16} />
                    <span>Daily Prayer Journal (Click prayer badge to toggle)</span>
                  </div>
                </div>

                <div className="history-journal-container">
                  {pastDaysHistory.map((day) => {
                    const isPerfect = day.completedCount === 5;
                    return (
                      <div key={day.dateKey} className="history-day-card">
                        <div className="history-day-header">
                          <div className="history-day-title-group">
                            <strong className="history-day-name">{day.label}</strong>
                            <span className={`status-pill ${isPerfect ? "completed" : day.completedCount >= 3 ? "current" : "upcoming"}`}>
                              {day.completedCount} of 5 Obligatory
                            </span>
                          </div>
                          <div style={{ width: 100 }}>
                            <div className="today-salah-track">
                              <div
                                className="today-salah-fill"
                                style={{ width: `${(day.completedCount / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="history-prayer-badges-row">
                          {obligatoryPrayers.map((p) => {
                            const isPrayed = day.records[p];
                            return (
                              <button
                                key={p}
                                className={`history-badge-btn ${isPrayed ? "done" : "pending"}`}
                                onClick={() => void togglePastPrayerRecord(day.dateKey, p)}
                                title={`Click to mark ${prayerNames[p]} as ${isPrayed ? "unprayed" : "prayed"}`}
                              >
                                {isPrayed ? <Check size={12} strokeWidth={2.8} /> : <Minus size={12} />}
                                <span>{prayerNames[p]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {nav === "settings" && (
            <div className="settings-view-wrapper">
              <div className="view-header">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    className="salah-menu-trigger-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open navigation menu"
                  >
                    <Menu size={18} />
                    <span>Menu</span>
                  </button>
                  <div>
                    <h2 className="view-title">Settings & Preferences</h2>
                    <p className="view-subtitle">Customize prayer calculation methods, notifications, and desktop behavior.</p>
                  </div>
                </div>
              </div>

              <nav className="settings-tabbar">
                <button
                  className={`settings-tab-btn ${settingsTab === "general" ? "active" : ""}`}
                  onClick={() => setSettingsTab("general")}
                >
                  <SettingsIcon size={15} />
                  <span>General</span>
                </button>
                <button
                  className={`settings-tab-btn ${settingsTab === "location" ? "active" : ""}`}
                  onClick={() => setSettingsTab("location")}
                >
                  <LocateFixed size={15} />
                  <span>Location & Time</span>
                </button>
                <button
                  className={`settings-tab-btn ${settingsTab === "calculation" ? "active" : ""}`}
                  onClick={() => setSettingsTab("calculation")}
                >
                  <Moon size={15} />
                  <span>Calculation</span>
                </button>
                <button
                  className={`settings-tab-btn ${settingsTab === "notifications" ? "active" : ""}`}
                  onClick={() => setSettingsTab("notifications")}
                >
                  <Bell size={15} />
                  <span>Notifications</span>
                </button>
                <button
                  className={`settings-tab-btn ${settingsTab === "focus" ? "active" : ""}`}
                  onClick={() => setSettingsTab("focus")}
                >
                  <EyeOff size={15} />
                  <span>Focus Mode</span>
                </button>
                <button
                  className={`settings-tab-btn ${settingsTab === "testing" ? "active" : ""}`}
                  onClick={() => setSettingsTab("testing")}
                >
                  <FlaskConical size={15} />
                  <span>Testing Lab</span>
                </button>
              </nav>

              <div className="settings-body-card">
                {settingsTab === "general" && (
                  <GeneralTab
                    settings={settings}
                    update={updateSettings}
                    language={language}
                    onCheckUpdates={() => void checkForAppUpdate(true)}
                    updateBusy={updateBusy}
                    updateStatus={updateStatus}
                  />
                )}
                {settingsTab === "location" && (
                  <LocationTab
                    settings={settings}
                    update={updateSettings}
                    coordinates={coordinates}
                    timeZone={timeZone}
                    language={language}
                    detectedCountryCode={detectedCountryCode}
                    detectedCityName={detectedCityName}
                    onSelectCity={handleSelectCity}
                  />
                )}
                {settingsTab === "calculation" && (
                  <CalculationTab
                    settings={settings}
                    update={updateSettings}
                    language={language}
                    detectedCountryCode={detectedCountryCode}
                    resolvedMethodId={resolvedMethodId}
                  />
                )}
                {settingsTab === "notifications" && (
                  <NotificationsTab
                    settings={settings}
                    update={updateSettings}
                    language={language}
                    onTestAdhan={() => void testAdhanNotification()}
                    onTestRecurring={() => void testRecurringReminder()}
                    onTestSolemn={() => testSolemnConfirmation()}
                  />
                )}
                {settingsTab === "focus" && (
                  <FocusTab
                    settings={settings}
                    update={updateSettings}
                    language={language}
                    onPreview={() => void testFocusMode()}
                  />
                )}
                {settingsTab === "testing" && (
                  <TestingTab
                    settings={settings}
                    update={updateSettings}
                    onTestAdhan={() => void testAdhanNotification()}
                    onTestRecurring={() => void testRecurringReminder()}
                    onTestFocus={() => void testFocusMode()}
                    onTestSolemn={() => testSolemnConfirmation()}
                    onTestHistory={() => void testToggleYesterdayRecord()}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {pendingSolemnPrayer && (
        <SolemnConfirmationModal
          prayer={pendingSolemnPrayer}
          language={language}
          onConfirm={() => {
            markPrayerCompleted(pendingSolemnPrayer);
          }}
          onCancel={() => setPendingSolemnPrayer(null)}
        />
      )}

      {testFeedback && (
        <div className="test-feedback-toast">
          <CheckCircle2 size={18} />
          <span>{testFeedback.message}</span>
        </div>
      )}

      {showLocationModal && (
        <LocationPermissionModal
          detectedCityName={detectedCityName}
          coordinates={coordinates}
          locationSource={locationSource}
          isDetecting={isDetectingLocation}
          onConfirm={() => {
            localStorage.setItem("salah_location_verified", "true");
            setShowLocationModal(false);
          }}
          onGpsDetect={() => void handleAutoDetect(true)}
          onSelectCity={handleSelectCity}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {focusPreview && (
        <FocusPreview
          session={focusSession ?? { prayer: focusPrayer, targetEndTime: Date.now() + (settings.focusDurationMinutes ?? 15) * 60_000 }}
          settings={settings}
          language={language}
          onConfirmPrayed={() => void confirmPrayerAndEndFocus(focusSession?.prayer ?? focusPrayer)}
          onDone={endFocusMode}
        />
      )}
    </div>
  );
}

function LocationPermissionModal({
  detectedCityName,
  coordinates,
  locationSource,
  isDetecting,
  onConfirm,
  onGpsDetect,
  onSelectCity,
  onClose,
}: {
  detectedCityName: string;
  coordinates: Coordinates;
  locationSource: "gps" | "ip" | "timezone";
  isDetecting: boolean;
  onConfirm: () => void;
  onGpsDetect: () => void;
  onSelectCity: (city: CityLocation) => void;
  onClose: () => void;
}) {
  const bangladeshDivisions = useMemo(() => {
    return popularCities.filter((c) =>
      ["bd-dhaka", "bd-chittagong", "bd-khulna", "bd-sylhet", "bd-rajshahi", "bd-barisal", "bd-rangpur", "bd-mymensingh"].includes(c.id)
    );
  }, []);

  const otherCities = useMemo(() => {
    return popularCities.filter(
      (c) => !["bd-dhaka", "bd-chittagong", "bd-khulna", "bd-sylhet", "bd-rajshahi", "bd-barisal", "bd-rangpur", "bd-mymensingh"].includes(c.id)
    );
  }, []);

  const currentCityShort = detectedCityName.split(",")[0].trim();

  return (
    <div className="location-modal-backdrop" onClick={onClose}>
      <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="location-modal-icon-wrap">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="location-modal-title">লোকেশন পারমিশন ও সনাক্তকরণ</h3>
              <p className="location-modal-subtitle">
                নামাজের নিখুঁত সময় হিসাবের জন্য আপনার সঠিক এলাকা বা বিভাগ নিশ্চিত করুন।
              </p>
            </div>
          </div>
          <button className="location-modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="location-detected-box">
          <div className="location-detected-label-row">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--salah-text-muted)" }}>
              {isDetecting ? "অনুসন্ধান চলছে..." : "বর্তমান সনাক্তকৃত অবস্থান:"}
            </span>
            <span className="location-detected-pill">
              {locationSource === "gps" ? "🎯 ডিভাইস GPS" : locationSource === "ip" ? "🌐 অটো নেটওয়ার্ক" : "📍 আনুমানিক"}
            </span>
          </div>

          <h4 className="location-detected-city">
            {isDetecting ? "সনাক্ত করা হচ্ছে..." : detectedCityName}
          </h4>

          <p className="location-detected-coords">
            কো-অর্ডিনেটস: {coordinates.latitude.toFixed(4)}° N, {coordinates.longitude.toFixed(4)}° E • উচ্চতা: {coordinates.elevation ?? 0}m
          </p>
        </div>

        <div className="location-modal-actions">
          <button
            type="button"
            className="location-btn-primary"
            onClick={onConfirm}
          >
            <Check size={17} />
            <span>{currentCityShort} নিশ্চিত করুন (Confirm Location)</span>
          </button>

          <button
            type="button"
            className="location-btn-secondary"
            onClick={onGpsDetect}
            disabled={isDetecting}
          >
            <LocateFixed size={16} />
            <span>{isDetecting ? "জিপিএস খোঁজা হচ্ছে..." : "ডিভাইস GPS থেকে নিখুঁত লোকেশন নিন (Exact GPS)"}</span>
          </button>
        </div>

        <div className="location-divisions-section">
          <label className="location-section-title">
            অথবা ১-ক্লিকে আপনার বিভাগ বেছে নিন:
          </label>
          <div className="location-divisions-grid">
            {bangladeshDivisions.map((city) => {
              const isActive = Math.abs(city.latitude - coordinates.latitude) < 0.1 && Math.abs(city.longitude - coordinates.longitude) < 0.1;
              return (
                <button
                  key={city.id}
                  type="button"
                  className={`location-division-btn ${isActive ? "active" : ""}`}
                  onClick={() => onSelectCity(city)}
                  title={`${city.name}, ${city.country}`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <label className="location-section-title">
            অন্যান্য জেলা বা আন্তর্জাতিক শহর:
          </label>
          <select
            className="location-select-custom"
            onChange={(e) => {
              const found = popularCities.find((c) => c.id === e.target.value);
              if (found) onSelectCity(found);
            }}
            defaultValue=""
          >
            <option value="" disabled>জেলা বা শহর বেছে নিন...</option>
            <optgroup label="বাংলাদেশ (অন্যান্য জেলা)">
              {otherCities.filter((c) => c.countryCode === "BD").map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°)</option>
              ))}
            </optgroup>
            <optgroup label="আন্তর্জাতিক শহরসমূহ">
              {otherCities.filter((c) => c.countryCode !== "BD").map((c) => (
                <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   DESKTOP FLOATING WIDGET
   ========================================================================== */

function PrayerWidget({
  next,
  secondsUntilNext,
  timeZone,
  hijriDate,
  language,
}: {
  next?: { prayer: Prayer; time: Date };
  secondsUntilNext: number;
  timeZone: string;
  hijriDate?: string;
  language: SupportedLanguage;
}) {
  const prayer = next?.prayer ?? "dhuhr";
  const Icon = prayerIcons[prayer];
  const startDrag = () => void startWidgetDrag();
  return (
    <main className="prayer-widget" onPointerDown={startDrag}>
      <div className="widget-grip"><GripHorizontal size={15} /></div>
      <button className="widget-close" onPointerDown={(event) => event.stopPropagation()} onClick={() => setWidgetVisibility(false)} title={t(language, "desktopWidget")}><X size={14} /></button>
      <section>
        <div className="widget-icon"><Icon size={22} /></div>
        <div className="widget-copy">
          <span>{t(language, "nextPrayer")}</span>
          <strong>{prayerLabel(language, prayer)}</strong>
        </div>
      </section>
      <aside>
        <strong>{next ? formatClock(next.time, timeZone, language) : "--:--"}</strong>
        <span>{next ? longCountdown(secondsUntilNext) : t(language, "waiting")}</span>
        {hijriDate && <em>{hijriDate}</em>}
      </aside>
    </main>
  );
}

/* ==========================================================================
   SETTINGS TABS & HELPER COMPONENTS
   ========================================================================== */

interface SettingsTabProps {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="setting-section">
      <h4 className="setting-section-title">{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function SettingRow({ label, subLabel, control }: { label: string; subLabel?: string; control: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-row-label-group">
        <span className="setting-label">{label}</span>
        {subLabel && <span className="setting-sublabel">{subLabel}</span>}
      </div>
      <div>{control}</div>
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div className={`salah-toggle-switch ${on ? "active" : ""}`} onClick={onClick}>
      <div className="salah-toggle-thumb" />
    </div>
  );
}

function NativeSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (val: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <select className="setting-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <input
      type="number"
      className="setting-input"
      style={{ width: 80 }}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function GeneralTab({
  settings,
  update,
  language,
  onCheckUpdates,
  updateBusy,
  updateStatus,
}: SettingsTabProps & { language: SupportedLanguage; onCheckUpdates: () => void; updateBusy: boolean; updateStatus?: string }) {
  const toggleLaunchAtLogin = async () => {
    const next = !settings.launchAtLogin;
    update({ launchAtLogin: next });
    await setLaunchAtLogin(next);
  };
  const togglePrayerWidget = async () => {
    const next = !settings.showPrayerWidget;
    update({ showPrayerWidget: next });
    await setWidgetVisibility(next);
  };

  return (
    <>
      <Section title="Startup & Widget">
        <SettingRow label="Launch at startup" control={<Switch on={settings.launchAtLogin} onClick={toggleLaunchAtLogin} />} />
        <SettingRow label="Show floating desktop widget" control={<Switch on={settings.showPrayerWidget} onClick={togglePrayerWidget} />} />
      </Section>
      <Section title="Tray & Taskbar">
        <SettingRow
          label="Taskbar label style"
          control={
            <NativeSelect
              value={settings.menuBarStyle}
              onChange={(menuBarStyle) => update({ menuBarStyle })}
              options={[
                ["iconOnly", "Icon only"],
                ["countdownOnly", "Countdown only"],
                ["iconCountdown", "Icon + Countdown"],
                ["nextPrayerCountdown", "Next prayer + Countdown"],
                ["iconNameCountdown", "Icon + Name + Countdown"],
                ["nextPrayerClock", "Next prayer clock"],
                ["iconNameClock", "Icon + Name + Clock"],
              ]}
            />
          }
        />
        <SettingRow
          label="Countdown shows"
          control={
            <NativeSelect
              value={settings.menuBarCountdownMode}
              onChange={(menuBarCountdownMode) => update({ menuBarCountdownMode })}
              options={[
                ["nextPrayer", "Time until next prayer"],
                ["currentWaqt", "Time remaining in current waqt"],
              ]}
            />
          }
        />
      </Section>
      <Section title="Display Preferences">
        <SettingRow label="Show Ishraq time" control={<Switch on={settings.showIshraqTime} onClick={() => update({ showIshraqTime: !settings.showIshraqTime })} />} />
        <SettingRow label="Show Hijri date" control={<Switch on={settings.showHijriDate} onClick={() => update({ showHijriDate: !settings.showHijriDate })} />} />
        <SettingRow label="Hijri day adjustment" subLabel="Adjust if sighting differs in your region" control={<NumberInput value={settings.hijriDayAdjustment} onChange={(hijriDayAdjustment) => update({ hijriDayAdjustment })} />} />
        <SettingRow
          label="Interface Language"
          control={
            <NativeSelect
              value={settings.languageOverride ?? "system"}
              onChange={(code) => update({ languageOverride: code === "system" ? undefined : code })}
              options={[
                ["system", "Follow System"],
                ["en", "English"],
                ["bn", "Bengali (বাংলা)"],
                ["ar", "Arabic (العربية)"],
                ["tr", "Turkish (Türkçe)"],
              ]}
            />
          }
        />
      </Section>
      <Section title="Application Updates">
        <SettingRow label="Check for updates automatically" subLabel={updateStatus} control={<Switch on={settings.autoUpdateEnabled} onClick={() => update({ autoUpdateEnabled: !settings.autoUpdateEnabled })} />} />
        <SettingRow
          label="Check for updates now"
          control={
            <button className="setting-btn" onClick={onCheckUpdates} disabled={updateBusy}>
              {updateBusy ? "Checking..." : "Check for updates"}
            </button>
          }
        />
      </Section>
      <Section title="About & Credits">
        <SettingRow
          label="Salah"
          subLabel="v0.1.10 • Islamic Prayer Times & Accountability Assistant"
          control={
            <span style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 600 }}>
              MVP Ready
            </span>
          }
        />
        <SettingRow
          label="Publisher"
          subLabel="Developed & Published by Abu Nayem"
          control={
            <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 500 }}>
              Abu Nayem
            </span>
          }
        />
        <SettingRow
          label="Inspiration & Foundation"
          subLabel="Special credits and inspiration to wdmahbubur"
          control={
            <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              wdmahbubur
            </span>
          }
        />
      </Section>
    </>
  );
}

function LocationTab({
  settings,
  update,
  coordinates,
  timeZone,
  language,
  detectedCountryCode,
  detectedCityName,
  onSelectCity,
}: SettingsTabProps & {
  coordinates: Coordinates;
  timeZone: string;
  language: SupportedLanguage;
  detectedCountryCode?: string;
  detectedCityName: string;
  onSelectCity: (city: CityLocation) => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const setCoordinate = (key: "latitude" | "longitude" | "elevation", value: number) => {
    update({
      locationMode: "manual",
      manualCoordinates: { ...settings.manualCoordinates, [key]: value },
    });
  };

  const detectLocation = async () => {
    setLocationStatus("Detecting location via GPS & Network...");
    setDetecting(true);

    try {
      const res = await detectPreciseLocation(true);
      update({
        locationMode: "automatic",
        manualCoordinates: {
          latitude: res.latitude,
          longitude: res.longitude,
          elevation: res.elevation,
        },
      });
      setLocationStatus(`Detected: ${res.cityName} (${res.source.toUpperCase()})`);
      const nearest = findNearestCity(res.latitude, res.longitude, 40);
      if (nearest) {
        onSelectCity(nearest);
      }
    } catch (error: any) {
      setLocationStatus(error?.message || "Could not detect location.");
    } finally {
      setDetecting(false);
    }
  };

  const selectedCityId = popularCities.find(
    (c) => Math.abs(c.latitude - coordinates.latitude) < 0.08 && Math.abs(c.longitude - coordinates.longitude) < 0.08,
  )?.id ?? "";

  return (
    <>
      <div style={{
        background: "#E8F3EE",
        border: "1px solid #C8DDD3",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1E5144", color: "#FFFFFF", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 15, color: "#111827" }}>{detectedCityName}</strong>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#4B5563" }}>
              {coordinates.latitude.toFixed(4)}° N, {coordinates.longitude.toFixed(4)}° E • {settings.locationMode === "automatic" ? "Auto Location Active" : "Custom Coordinates"}
            </p>
          </div>
        </div>

        <button
          className="setting-btn"
          onClick={detectLocation}
          disabled={detecting}
          style={{ whiteSpace: "nowrap" }}
        >
          <LocateFixed size={14} />
          <span>{detecting ? "Detecting..." : "Detect Location"}</span>
        </button>
      </div>

      {locationStatus && (
        <div style={{ fontSize: 12, color: "#1E5144", background: "#F0FDF4", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
          {locationStatus}
        </div>
      )}

      <Section title="Quick City Selector">
        <SettingRow
          label="Preset City"
          subLabel="Select your city to automatically apply exact coordinates, timezone, and local calculation method"
          control={
            <select
              className="setting-select"
              value={selectedCityId}
              onChange={(e) => {
                const city = popularCities.find((c) => c.id === e.target.value);
                if (city) onSelectCity(city);
              }}
            >
              <option value="">-- Choose City --</option>
              <optgroup label="Bangladesh">
                {popularCities.filter((c) => c.countryCode === "BD").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                ))}
              </optgroup>
              <optgroup label="Middle East & Holy Sites">
                {popularCities.filter((c) => ["SA", "AE", "QA", "KW", "OM", "EG", "TR"].includes(c.countryCode)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                ))}
              </optgroup>
              <optgroup label="South & Southeast Asia">
                {popularCities.filter((c) => ["PK", "IN", "MY", "ID", "SG"].includes(c.countryCode)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                ))}
              </optgroup>
              <optgroup label="United Kingdom, Europe, Americas, Australia">
                {popularCities.filter((c) => ["GB", "US", "CA", "FR", "DE", "AU"].includes(c.countryCode)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                ))}
              </optgroup>
            </select>
          }
        />
      </Section>

      <Section title="Geographic Coordinates">
        <SettingRow
          label="Latitude"
          control={
            <input
              type="number"
              step="0.0001"
              className="setting-input"
              value={coordinates.latitude}
              onChange={(e) => setCoordinate("latitude", Number(e.target.value))}
            />
          }
        />
        <SettingRow
          label="Longitude"
          control={
            <input
              type="number"
              step="0.0001"
              className="setting-input"
              value={coordinates.longitude}
              onChange={(e) => setCoordinate("longitude", Number(e.target.value))}
            />
          }
        />
      </Section>

      <Section title="Time Zone">
        <SettingRow
          label="Active Time Zone"
          subLabel={timeZone}
          control={
            <NativeSelect
              value={settings.timeZoneMode.kind}
              onChange={(kind) => update({ timeZoneMode: kind === "system" ? { kind: "system" } : { kind: "explicit", identifier: timeZone } })}
              options={[
                ["system", "Follow System Timezone"],
                ["explicit", "Explicit Timezone"],
              ]}
            />
          }
        />
      </Section>
    </>
  );
}

function CalculationTab({
  settings,
  update,
  language,
  detectedCountryCode,
  resolvedMethodId,
}: SettingsTabProps & { language: SupportedLanguage; detectedCountryCode?: string; resolvedMethodId: string }) {
  return (
    <>
      <Section title="Calculation Engine & Authority">
        <SettingRow
          label="Primary Calculation System"
          subLabel={
            (settings.calculationSource ?? "astronomical") === "astronomical"
              ? "Astronomical Calculation Engine (Offline, High-Precision Solar Equations — Active)"
              : "Online Cloud API (Aladhan Cloud API Sync)"
          }
          control={
            <NativeSelect
              value={settings.calculationSource ?? "astronomical"}
              onChange={(calculationSource) => update({ calculationSource: calculationSource as CalculationSource })}
              options={[
                ["astronomical", "Astronomical Engine (Primary — High Precision Solar)"],
                ["api", "Online Cloud API (Aladhan API — Backup Mode)"],
              ]}
            />
          }
        />
        <SettingRow
          label="Auto-detect method by country"
          subLabel={`Currently resolved: ${resolvedMethodId}`}
          control={<Switch on={settings.autoDetectMethod} onClick={() => update({ autoDetectMethod: !settings.autoDetectMethod })} />}
        />
        {!settings.autoDetectMethod && (
          <SettingRow
            label="Method Preset"
            control={
              <NativeSelect
                value={settings.methodId}
                onChange={(methodId) => update({ methodId })}
                options={builtInMethods.map((m) => [m.id, m.displayName])}
              />
            }
          />
        )}
      </Section>
      <Section title="Juristic School (Asr)">
        <SettingRow
          label="Hanafi Asr (Shadow factor 2x)"
          subLabel="Turn off for Standard / Shafi'i / Maliki / Hanbali (1x)"
          control={<Switch on={settings.hanafiAsr} onClick={() => update({ hanafiAsr: !settings.hanafiAsr })} />}
        />
      </Section>
      <Section title="High Latitude Rule">
        <SettingRow
          label="High latitude adjustment"
          control={
            <NativeSelect
              value={settings.highLatitudeRule}
              onChange={(highLatitudeRule) => update({ highLatitudeRule })}
              options={[
                ["none", "None / Normal"],
                ["middleOfNight", "Middle of the night"],
                ["seventhOfNight", "One-seventh of the night"],
                ["angleBased", "Angle-based rule"],
              ]}
            />
          }
        />
      </Section>
    </>
  );
}

function NotificationsTab({
  settings,
  update,
  language,
  onTestAdhan,
  onTestRecurring,
  onTestSolemn,
}: SettingsTabProps & {
  language: SupportedLanguage;
  onTestAdhan?: () => void;
  onTestRecurring?: () => void;
  onTestSolemn?: () => void;
}) {
  return (
    <>
      <Section title="Master Controls">
        <SettingRow
          label="Enable prayer notifications"
          subLabel="Shows desktop alerts and adhan audio when prayer time arrives"
          control={<Switch on={settings.masterNotificationsEnabled} onClick={() => update({ masterNotificationsEnabled: !settings.masterNotificationsEnabled })} />}
        />
        {onTestAdhan && (
          <SettingRow
            label="Test prayer notification"
            subLabel="Send a live Windows desktop alert and play audio right now"
            control={
              <button className="setting-btn" onClick={onTestAdhan}>
                <Bell size={14} />
                <span>Test Windows Notification</span>
              </button>
            }
          />
        )}
      </Section>

      <Section title="Recurring Reminders (ধারাবাহিক রিমাইন্ডার)">
        <SettingRow
          label="Recurring prayer alerts"
          subLabel="Periodic reminders until you confirm the prayer has been performed"
          control={
            <Switch
              on={settings.recurringReminderEnabled ?? true}
              onClick={() => update({ recurringReminderEnabled: !(settings.recurringReminderEnabled ?? true) })}
            />
          }
        />
        <SettingRow
          label="Reminder interval"
          subLabel="Frequency of reminder notifications during active waqt"
          control={
            <NativeSelect
              value={String(settings.recurringReminderIntervalMinutes ?? 5)}
              onChange={(val) => update({ recurringReminderIntervalMinutes: Number(val) })}
              options={[
                ["2", "Every 2 minutes"],
                ["3", "Every 3 minutes"],
                ["5", "Every 5 minutes (Recommended)"],
                ["10", "Every 10 minutes"],
                ["15", "Every 15 minutes"],
                ["20", "Every 20 minutes"],
              ]}
            />
          }
        />
        {onTestRecurring && (
          <SettingRow
            label="Test recurring alert"
            subLabel="Dispatch a simulated recurring reminder alert immediately"
            control={
              <button className="setting-btn" onClick={onTestRecurring}>
                <Clock size={14} />
                <span>Test Recurring Alert</span>
              </button>
            }
          />
        )}
      </Section>

      <Section title="Solemn Oath Confirmation (নামাজ শপথ মোড)">
        <SettingRow
          label="Require solemn oath before marking done"
          subLabel="Prompts sacred oath: 'আল্লাহর শপথ, আমি নামাজ আদায় করেছি' before recording completion"
          control={
            <Switch
              on={settings.solemnConfirmationEnabled ?? true}
              onClick={() => update({ solemnConfirmationEnabled: !(settings.solemnConfirmationEnabled ?? true) })}
            />
          }
        />
        {onTestSolemn && (
          <SettingRow
            label="Test solemn oath modal"
            subLabel="Preview the sacred Quranic oath confirmation dialog"
            control={
              <button className="setting-btn" onClick={onTestSolemn}>
                <ShieldCheck size={14} />
                <span>Test Solemn Oath Dialog</span>
              </button>
            }
          />
        )}
      </Section>

      <Section title="Default Sound & Audio">
        <SettingRow
          label="Notification Sound"
          control={
            <NativeSelect
              value={settings.notificationDefaults.sound}
              onChange={(sound) => update({ notificationDefaults: { ...settings.notificationDefaults, sound } })}
              options={[
                ["adhanMadinah", "Adhan (Al-Madinah)"],
                ["adhanMakkah", "Adhan (Makkah)"],
                ["takbir", "Takbir"],
                ["softChime", "Soft Chime"],
                ["systemDefault", "System Default Chime"],
                ["none", "Mute"],
              ]}
            />
          }
        />
        <SettingRow
          label="Play Full Adhan"
          control={
            <Switch
              on={settings.notificationDefaults.playFullAdhan}
              onClick={() => update({ notificationDefaults: { ...settings.notificationDefaults, playFullAdhan: !settings.notificationDefaults.playFullAdhan } })}
            />
          }
        />
        <SettingRow
          label="Early reminder minutes"
          subLabel="Notification sent in advance before prayer starts"
          control={
            <NumberInput
              value={settings.notificationDefaults.earlyReminderMinutes}
              onChange={(earlyReminderMinutes) => update({ notificationDefaults: { ...settings.notificationDefaults, earlyReminderMinutes } })}
            />
          }
        />
      </Section>
    </>
  );
}

function FocusTab({ settings, update, language, onPreview }: SettingsTabProps & { language: SupportedLanguage; onPreview: () => void }) {
  return (
    <>
      <Section title="Focus Mode Settings">
        <SettingRow
          label="Enable Focus Mode"
          subLabel="Blocks distractions and opens fullscreen accountability session"
          control={<Switch on={settings.focusModeEnabled} onClick={() => update({ focusModeEnabled: !settings.focusModeEnabled })} />}
        />
        <SettingRow
          label="Trigger deadline lead time"
          subLabel="Launch fullscreen accountability N minutes before waqt ends"
          control={
            <NativeSelect
              value={String(settings.focusLeadMinutes ?? 45)}
              onChange={(val) => update({ focusLeadMinutes: Number(val) })}
              options={[
                ["15", "15 minutes before deadline"],
                ["30", "30 minutes before deadline"],
                ["45", "45 minutes before deadline (Default)"],
                ["60", "60 minutes before deadline"],
              ]}
            />
          }
        />
        <SettingRow
          label="Focus duration (minutes)"
          subLabel="Duration of the fullscreen countdown session"
          control={
            <NativeSelect
              value={String(settings.focusDurationMinutes ?? 15)}
              onChange={(val) => update({ focusDurationMinutes: Number(val) })}
              options={[
                ["5", "5 minutes"],
                ["10", "10 minutes"],
                ["15", "15 minutes (Standard)"],
                ["20", "20 minutes"],
                ["30", "30 minutes"],
              ]}
            />
          }
        />
        <SettingRow
          label="Blur intensity"
          subLabel="Visual blur applied behind the focus card"
          control={
            <NativeSelect
              value={settings.focusBlurIntensity ?? "medium"}
              onChange={(focusBlurIntensity) => update({ focusBlurIntensity })}
              options={[
                ["low", "Subtle (Low blur)"],
                ["medium", "Balanced (Medium blur)"],
                ["high", "Deep (High blur)"],
                ["opaque", "Opaque (Complete block)"],
              ]}
            />
          }
        />
        <SettingRow
          label="Emergency exit button"
          subLabel="Allows instant dismiss if an urgent task arises"
          control={<Switch on={settings.focusEmergencyExitEnabled} onClick={() => update({ focusEmergencyExitEnabled: !settings.focusEmergencyExitEnabled })} />}
        />
        <SettingRow
          label="Test Focus Overlay"
          control={
            <button className="setting-btn" onClick={onPreview}>
              <EyeOff size={14} />
              <span>Preview Focus Mode Now</span>
            </button>
          }
        />
      </Section>
    </>
  );
}

function TestingTab({
  settings,
  update,
  onTestAdhan,
  onTestRecurring,
  onTestFocus,
  onTestSolemn,
  onTestHistory,
}: SettingsTabProps & {
  onTestAdhan: () => void;
  onTestRecurring: () => void;
  onTestFocus: () => void;
  onTestSolemn: () => void;
  onTestHistory: () => void;
}) {
  return (
    <div>
      <div className="test-lab-header">
        <h3 className="test-lab-title">Feature Diagnostics & Test Lab (সব ফিচার টেস্ট প্যানেল)</h3>
        <p className="test-lab-desc">
          এখানে প্রতিটি ফিচারের জন্য লাইভ টেস্ট বাটন রয়েছে। আপনি ওয়াক্তের সময়ের অপেক্ষা না করেই এখনই প্রতিটি ফিচার চেক করতে পারেন।
        </p>
      </div>

      <div className="test-lab-grid">
        {/* Test 1: Prayer Adhan & Windows Notification */}
        <div className="test-lab-card">
          <div>
            <div className="test-lab-card-top">
              <div className="test-lab-icon">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="test-lab-card-title">1. Prayer Adhan & Windows Notification</h4>
                <p className="test-lab-card-desc">
                  Windows notification সহ আযান ও ওয়াক্ত শুরুর অ্যালার্ট চেক করুন।
                </p>
              </div>
            </div>
          </div>
          <div className="test-lab-card-status">
            <span>সাউন্ড: {settings.notificationDefaults.sound}</span>
            <span style={{ color: "#1E5144", fontWeight: 700 }}>
              {settings.masterNotificationsEnabled ? "সক্রিয়" : "বন্ধ"}
            </span>
          </div>
          <button className="test-lab-btn-action" onClick={onTestAdhan}>
            <Bell size={14} />
            <span>Test Adhan & Windows Notification</span>
          </button>
        </div>

        {/* Test 2: Recurring Reminder */}
        <div className="test-lab-card">
          <div>
            <div className="test-lab-card-top">
              <div className="test-lab-icon">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="test-lab-card-title">2. Recurring Reminder (ধারাবাহিক রিমাইন্ডার)</h4>
                <p className="test-lab-card-desc">
                  নামাজ কনফার্ম না করা পর্যন্ত প্রতি {settings.recurringReminderIntervalMinutes ?? 5} মিনিট পর পর রিমাইন্ডার পাঠায়।
                </p>
              </div>
            </div>
          </div>
          <div className="test-lab-card-status">
            <span>ব্যবধান: প্রতি {settings.recurringReminderIntervalMinutes ?? 5} মিনিট</span>
            <span style={{ color: (settings.recurringReminderEnabled ?? true) ? "#1E5144" : "#9CA3AF", fontWeight: 700 }}>
              {(settings.recurringReminderEnabled ?? true) ? "চালু" : "বন্ধ"}
            </span>
          </div>
          <button className="test-lab-btn-action" onClick={onTestRecurring}>
            <Clock size={14} />
            <span>Test Recurring Reminder Alert</span>
          </button>
        </div>

        {/* Test 3: Fullscreen Focus Mode */}
        <div className="test-lab-card">
          <div>
            <div className="test-lab-card-top">
              <div className="test-lab-icon">
                <EyeOff size={18} />
              </div>
              <div>
                <h4 className="test-lab-card-title">3. Accountability Focus Mode (ফুলস্ক্রিন)</h4>
                <p className="test-lab-card-desc">
                  ওয়াক্তের শেষ {settings.focusLeadMinutes ?? 45} মিনিট আগে ফুলস্ক্রিন হয়ে {settings.focusDurationMinutes ?? 15} মিনিটের কাউন্টডাউন শুরু করে।
                </p>
              </div>
            </div>
          </div>
          <div className="test-lab-card-status">
            <span>সময়সীমা: {settings.focusDurationMinutes ?? 15} মিনিট</span>
            <span style={{ color: settings.focusModeEnabled ? "#1E5144" : "#9CA3AF", fontWeight: 700 }}>
              {settings.focusModeEnabled ? "সক্রিয়" : "বন্ধ"}
            </span>
          </div>
          <button className="test-lab-btn-action" onClick={onTestFocus}>
            <EyeOff size={14} />
            <span>Test Fullscreen Focus Countdown</span>
          </button>
        </div>

        {/* Test 4: Solemn Oath Modal */}
        <div className="test-lab-card">
          <div>
            <div className="test-lab-card-top">
              <div className="test-lab-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="test-lab-card-title">4. Solemn Prayer Oath (নামাজ শপথ মোড)</h4>
                <p className="test-lab-card-desc">
                  "আল্লাহর শপথ, আমি নামাজ আদায় করেছি" ডায়ালগ ও কুরআনের আয়াত প্রদর্শিত হয়।
                </p>
              </div>
            </div>
          </div>
          <div className="test-lab-card-status">
            <span>অবস্থা: {settings.solemnConfirmationEnabled ? "শপথ বাধ্যতামূলক" : "সাধারণ চেক"}</span>
            <span style={{ color: settings.solemnConfirmationEnabled ? "#1E5144" : "#9CA3AF", fontWeight: 700 }}>
              {settings.solemnConfirmationEnabled ? "চালু" : "বন্ধ"}
            </span>
          </div>
          <button className="test-lab-btn-action" onClick={onTestSolemn}>
            <ShieldCheck size={14} />
            <span>Test Solemn Oath Confirmation</span>
          </button>
        </div>

        {/* Test 5: History & Streak */}
        <div className="test-lab-card">
          <div>
            <div className="test-lab-card-top">
              <div className="test-lab-icon">
                <History size={18} />
              </div>
              <div>
                <h4 className="test-lab-card-title">5. Daily Salah Tracking & Past History</h4>
                <p className="test-lab-card-desc">
                  গত ৭ দিনের হিস্ট্রি ও স্ট্রিক আপডেট যাচাইয়ের জন্য গতকালের রেকর্ড টগল করুন।
                </p>
              </div>
            </div>
          </div>
          <div className="test-lab-card-status">
            <span>স্টোরেজ: লোকাল ও টোরি স্টোর সিঙ্কড</span>
            <span style={{ color: "#1E5144", fontWeight: 700 }}>সক্রিয়</span>
          </div>
          <button className="test-lab-btn-action" onClick={onTestHistory}>
            <History size={14} />
            <span>Toggle Yesterday Test Record</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Onboarding({ settings, update, language }: { settings: AppSettings; update: (patch: Partial<AppSettings>) => void; language: SupportedLanguage }) {
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <IslamicRosetteLogo size={42} />
        <h3 className="onboarding-title">Welcome to Salah</h3>
        <p className="onboarding-desc">
          Your peaceful, beautifully crafted Windows companion for prayer times, focus reminders, and consistent spiritual habits.
        </p>
        <div className="onboarding-actions">
          <button
            className="btn-reminder-prayed"
            onClick={() => update({ didCompleteOnboarding: true })}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusPreview({
  session,
  settings,
  language,
  onConfirmPrayed,
  onDone,
}: {
  session: { prayer: Prayer; targetEndTime: number };
  settings: AppSettings;
  language: SupportedLanguage;
  onConfirmPrayed: () => void;
  onDone: () => void;
}) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalDuration = (settings.focusDurationMinutes ?? 15) * 60;
  const remainingSeconds = Math.max(0, Math.floor((session.targetEndTime - nowMs) / 1000));
  const isFinished = remainingSeconds === 0;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const progressPercent = Math.min(100, Math.max(0, ((totalDuration - remainingSeconds) / totalDuration) * 100));
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="focus-overlay">
      <div className="focus-card">
        <div className="focus-badge">
          <Clock size={14} />
          <span>{settings.focusLeadMinutes ?? 45}-Minute Window Deadline Accountability</span>
        </div>

        <h2 className="focus-title">Time for {prayerLabel(language, session.prayer)}</h2>
        <p className="focus-desc">
          Take a peaceful pause, step away from distractions, and stand before Allah with complete presence of heart.
        </p>

        {/* Circular Countdown Clock */}
        <div className="focus-countdown-container">
          <svg className="focus-countdown-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="focus-ring-bg" />
            <circle
              cx="50"
              cy="50"
              r="45"
              className="focus-ring-progress"
              style={{ strokeDasharray: 283, strokeDashoffset }}
            />
          </svg>
          <div className="focus-countdown-time">
            <span className="countdown-digits">{timeFormatted}</span>
            <span className="countdown-label">
              {isFinished ? "Time Complete" : `${settings.focusDurationMinutes ?? 15}m Focus Remaining`}
            </span>
          </div>
        </div>

        {isFinished && (
          <div className="focus-finished-alert">
            <AlertCircle size={16} />
            <span>Focus time has elapsed. Please offer your prayer before the window ends.</span>
          </div>
        )}

        <div className="focus-actions">
          <button className="btn-focus-prayed" onClick={onConfirmPrayed}>
            <Check size={18} />
            <span>I Have Prayed (Confirm & Return)</span>
          </button>

          {settings.focusEmergencyExitEnabled && (
            <button className="btn-focus-dismiss" onClick={onDone}>
              Emergency Exit / Desktop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SolemnConfirmationModal({
  prayer,
  language,
  onConfirm,
  onCancel,
}: {
  prayer: Prayer;
  language: SupportedLanguage;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="solemn-modal-backdrop" onClick={onCancel}>
      <div className="solemn-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="solemn-modal-header">
          <div className="solemn-icon-ring">
            <ShieldCheck size={28} />
          </div>
          <h3 className="solemn-modal-title">
            {language === "bn" ? "নামাজ আদায়ের সত্য শপথ" : "Solemn Prayer Confirmation"}
          </h3>
          <p className="solemn-modal-subtitle">
            {language === "bn"
              ? "আল্লাহর সামনে দাঁড়িয়ে সত্যনিষ্ঠার সাথে নিশ্চিত করুন"
              : "Confirm your prayer with solemn truth before Allah"}
          </p>
        </div>

        <div className="solemn-quran-box">
          <div className="solemn-quran-arabic">
            إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
          </div>
          <div className="solemn-quran-meaning">
            "নিশ্চয়ই নির্ধারিত সময়ে নামাজ আদায় করা মুমিনদের উপর অবশ্য কর্তব্য।"
            <span className="solemn-quran-surah">— সূরা আন-নিসা (৪:১০৩)</span>
          </div>
        </div>

        <div className="solemn-oath-box">
          <div className="solemn-oath-arabic">
            وَاللَّهِ لَقَدْ صَلَّيْتُ ({prayerNames[prayer]})
          </div>
          <div className="solemn-oath-text">
            <strong>আল্লাহর শপথ,</strong> আমি একান্ত নিষ্ঠা ও আন্তরিকতার সাথে <strong>{prayerNames[prayer]}</strong> নামাজ আদায় করেছি।
          </div>
          <div className="solemn-oath-en">
            "I swear by Allah that I have offered the {prayerNames[prayer]} prayer sincerely and fulfilled my duty."
          </div>
        </div>

        <div className="solemn-modal-actions">
          <button className="btn-solemn-confirm" onClick={onConfirm}>
            <Check size={18} strokeWidth={2.6} />
            <span>আল্লাহর শপথ, নামাজ পড়েছি (Confirm)</span>
          </button>
          <button className="btn-solemn-cancel" onClick={onCancel}>
            <span>এখনও পড়িনি / বাতিল করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   TIME & CALCULATION HELPERS
   ========================================================================== */

function nextClockRefreshDelay(isWidget: boolean): number {
  return isWidget ? 1_000 : 1_000;
}

function buildPrayerClock(
  now: Date,
  settings: AppSettings,
  method: CalculationMethodAdapter,
  coordinates: Coordinates,
  timeZone: string,
  apiToday?: PrayerTimes,
  apiTomorrow?: PrayerTimes,
) {
  const calculationParams = {
    ...method.resolve(coordinates),
    highLatitudeRule: settings.highLatitudeRule,
  };
  const calculated = calculateTodayAndTomorrow(now, coordinates, calculationParams, timeZone);

  // High-precision Astronomical Engine is PRIMARY!
  // Only use API if user explicitly configured calculationSource === "api" and API times are available.
  const today = (settings.calculationSource === "api" && apiToday) ? apiToday : calculated.today;
  const tomorrow = (settings.calculationSource === "api" && apiTomorrow) ? apiTomorrow : calculated.tomorrow;

  const resolved = settings.calculationMode === "manual"
    ? {
        today: applyManualSchedule(today, settings, timeZone),
        tomorrow: applyManualSchedule(tomorrow, settings, timeZone),
      }
    : { today, tomorrow };
  const next = nextPrayer(resolved.today, now) ?? nextPrayer(resolved.tomorrow, now);
  return { today: resolved.today, tomorrow: resolved.tomorrow, next };
}

function applyManualSchedule(day: PrayerTimes, settings: AppSettings, timeZone: string): PrayerTimes {
  const civil = civilDateFromDate(day.date, timeZone);
  const base = zonedMidnight(civil, timeZone);
  const times = { ...day.times };
  for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as Prayer[]) {
    const minutes = settings.jamaatTimes[prayer] ?? defaultJamaatTimes[prayer];
    if (minutes !== undefined) times[prayer] = new Date(base.getTime() + minutes * 60_000);
  }
  return { ...day, times };
}

function loadSettings(): AppSettings {
  const fallback = defaultSettings();
  try {
    const raw = localStorage.getItem("prayer-times-settings.v1");
    if (!raw) return fallback;
    return mergeSettings(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

async function loadPersistedSettings(): Promise<AppSettings | null> {
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("settings.json", { defaults: {}, autoSave: true });
    const saved = await store.get<Partial<AppSettings>>("settings");
    return saved ? mergeSettings(saved) : null;
  } catch {
    return loadSettings();
  }
}

async function saveSettings(settings: AppSettings, storeReady: boolean) {
  localStorage.setItem("prayer-times-settings.v1", JSON.stringify(settings));
  if (!storeReady) return;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("settings.json", { defaults: {}, autoSave: true });
    await store.set("settings", settings);
    await store.save();
  } catch {}
}

function mergeSettings(saved: Partial<AppSettings>): AppSettings {
  const fallback = defaultSettings();
  return {
    ...fallback,
    ...saved,
    calculationSource: saved.calculationSource ?? fallback.calculationSource,
    manualCoordinates: { ...fallback.manualCoordinates, ...saved.manualCoordinates },
    jamaatTimes: { ...fallback.jamaatTimes, ...saved.jamaatTimes },
    notificationDefaults: { ...fallback.notificationDefaults, ...saved.notificationDefaults },
    notifications: { ...fallback.notifications, ...saved.notifications },
    timeZoneMode: saved.timeZoneMode ?? fallback.timeZoneMode,
  };
}

async function sendDesktopNotification(title: string, body: string) {
  try {
    const notification = await import("@tauri-apps/plugin-notification");
    let allowed = await notification.isPermissionGranted();
    if (!allowed) {
      const permission = await notification.requestPermission();
      allowed = permission === "granted";
    }
    if (allowed) {
      notification.sendNotification({ title, body });
      return;
    }
  } catch {}

  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    if (permission === "granted") new Notification(title, { body });
  }
}

async function setLaunchAtLogin(enabled: boolean) {
  try {
    const autostart = await import("@tauri-apps/plugin-autostart");
    if (enabled) await autostart.enable();
    else await autostart.disable();
  } catch {}
}

async function startNativeFocusMode() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("start_focus_mode");
  } catch {}
}

async function endNativeFocusMode() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("end_focus_mode");
  } catch {}
}

async function setWidgetVisibility(visible: boolean) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke(visible ? "show_widget" : "hide_widget");
  } catch {}
}

async function startWidgetDrag() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startDragging();
  } catch {}
}

function getPrayerWindowEnd(prayer: Prayer, day: PrayerTimes, nextDay: PrayerTimes): Date | undefined {
  switch (prayer) {
    case "fajr": return day.times.sunrise;
    case "dhuhr": return day.times.asr;
    case "asr": return day.times.maghrib;
    case "maghrib": return day.times.isha;
    case "isha": return nextDay.times.fajr;
    default: return undefined;
  }
}

function buildRuntimeSchedule(
  today: PrayerTimes,
  tomorrow: PrayerTimes,
  settings: AppSettings,
  timeZone: string,
  language: SupportedLanguage,
  completedPrayers: Record<Prayer, boolean>,
): RuntimeScheduledEvent[] {
  const events: RuntimeScheduledEvent[] = [];
  const days = [today, tomorrow];
  for (let dIdx = 0; dIdx < days.length; dIdx++) {
    const day = days[dIdx];
    const nextDay = dIdx === 0 ? tomorrow : day;
    for (const entry of orderedTimes(day)) {
      const isCompleted = Boolean(completedPrayers[entry.prayer]);
      const cfg = resolvedNotification(settings, entry.prayer);
      const label = prayerLabel(language, entry.prayer);
      const civil = civilDateFromDate(entry.time, timeZone);
      const dayKey = `${civil.year}-${civil.month}-${civil.day}`;
      const windowEnd = getPrayerWindowEnd(entry.prayer, day, nextDay);

      if (settings.masterNotificationsEnabled && cfg.notify && !isCompleted) {
        events.push({
          id: `${dayKey}:${entry.prayer}:adhan`,
          prayer: entry.prayer,
          atMs: notificationTime(entry.prayer, entry.time, settings).getTime(),
          title: `${label} time`,
          body: `${label} is now at ${formatClock(entry.time, timeZone, language)}.`,
          playSound: true,
          sound: cfg.sound,
          playFullAdhan: cfg.playFullAdhan,
          startFocus: false,
        });
        if (cfg.earlyReminderEnabled) {
          events.push({
            id: `${dayKey}:${entry.prayer}:early`,
            prayer: entry.prayer,
            atMs: entry.time.getTime() - cfg.earlyLeadMinutes * 60_000,
            title: `${label} soon`,
            body: `${label} starts in ${cfg.earlyLeadMinutes} minutes.`,
            playSound: false,
            sound: undefined,
            playFullAdhan: false,
            startFocus: false,
          });
        }
        if (isObligatory(entry.prayer) && cfg.iqamahOffsetMinutes > 0) {
          events.push({
            id: `${dayKey}:${entry.prayer}:iqamah`,
            prayer: entry.prayer,
            atMs: entry.time.getTime() + cfg.iqamahOffsetMinutes * 60_000,
            title: `${label} iqamah`,
            body: `${label} iqamah reminder.`,
            playSound: false,
            sound: undefined,
            playFullAdhan: false,
            startFocus: false,
          });
        }
      }

      // Recurring Reminder (Only until prayer confirmed or deadline window; customizable via settings)
      const recurringEnabled = settings.recurringReminderEnabled ?? true;
      const recurringInterval = Math.max(1, settings.recurringReminderIntervalMinutes ?? 5);
      const focusLead = Math.max(5, settings.focusLeadMinutes ?? 45);
      const focusDuration = Math.max(1, settings.focusDurationMinutes ?? 15);

      if (isObligatory(entry.prayer) && recurringEnabled && settings.masterNotificationsEnabled && cfg.notify && !isCompleted && windowEnd) {
        const startMs = entry.time.getTime();
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        const maxReminderMs = deadlineMs > startMs ? deadlineMs : windowEnd.getTime();
        const intervalMs = recurringInterval * 60_000;
        let count = 1;
        for (let t = startMs + intervalMs; t < maxReminderMs; t += intervalMs) {
          events.push({
            id: `${dayKey}:${entry.prayer}:remind_${recurringInterval}m_${count}`,
            prayer: entry.prayer,
            atMs: t,
            title: `${label} Reminder (${count * recurringInterval}m elapsed)`,
            body: `Have you prayed ${label}? Prayer window is active. Click to confirm.`,
            playSound: true,
            sound: "softChime",
            playFullAdhan: false,
            startFocus: false,
          });
          count++;
        }
      }

      // Window Deadline Focus Mode (Lead time & duration customizable via settings)
      if (isObligatory(entry.prayer) && shouldFocus(settings, entry.prayer) && !isCompleted && windowEnd) {
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        if (deadlineMs > entry.time.getTime()) {
          events.push({
            id: `${dayKey}:${entry.prayer}:focus_deadline_${focusLead}m`,
            prayer: entry.prayer,
            atMs: deadlineMs,
            title: `${label} Deadline Focus`,
            body: `${focusLead} minutes left in ${label} window! ${focusDuration}-minute accountability session started.`,
            playSound: true,
            sound: "softChime",
            playFullAdhan: false,
            startFocus: true,
          });
        }
      }
    }
  }
  return events;
}

async function fireDueAlerts({
  now,
  today,
  tomorrow,
  settings,
  timeZone,
  fired,
  completedPrayers,
  playSound,
  showFocus,
}: {
  now: Date;
  today: PrayerTimes;
  tomorrow: PrayerTimes;
  settings: AppSettings;
  timeZone: string;
  fired: Set<string>;
  completedPrayers: Record<Prayer, boolean>;
  playSound: (sound: NotificationSound, playFullAdhan: boolean) => Promise<void>;
  showFocus: (prayer: Prayer) => Promise<void>;
}) {
  const notificationWindowMs = 1_150;
  const days = [today, tomorrow];
  const recurringEnabled = settings.recurringReminderEnabled ?? true;
  const recurringInterval = Math.max(1, settings.recurringReminderIntervalMinutes ?? 5);
  const focusLead = Math.max(5, settings.focusLeadMinutes ?? 45);

  for (let dIdx = 0; dIdx < days.length; dIdx++) {
    const day = days[dIdx];
    const nextDay = dIdx === 0 ? tomorrow : day;
    for (const entry of orderedTimes(day)) {
      const isCompleted = Boolean(completedPrayers[entry.prayer]);
      if (isCompleted) continue; // Once prayer confirmed, cancel alerts for this prayer

      const cfg = resolvedNotification(settings, entry.prayer);
      const label = prayerNames[entry.prayer];
      const civil = civilDateFromDate(entry.time, timeZone);
      const dayKey = `${civil.year}-${civil.month}-${civil.day}`;
      const windowEnd = getPrayerWindowEnd(entry.prayer, day, nextDay);

      const events: Array<{ kind: string; at: Date; title: string; body: string; sound: boolean }> = [
        { kind: "adhan", at: notificationTime(entry.prayer, entry.time, settings), title: `${label} time`, body: `${label} is now at ${formatClock(entry.time, timeZone)}.`, sound: true },
      ];
      if (cfg.earlyReminderEnabled) {
        events.push({ kind: "early", at: new Date(entry.time.getTime() - cfg.earlyLeadMinutes * 60_000), title: `${label} soon`, body: `${label} starts in ${cfg.earlyLeadMinutes} minutes.`, sound: false });
      }
      if (isObligatory(entry.prayer) && cfg.iqamahOffsetMinutes > 0) {
        events.push({ kind: "iqamah", at: new Date(entry.time.getTime() + cfg.iqamahOffsetMinutes * 60_000), title: `${label} iqamah`, body: `${label} iqamah reminder.`, sound: false });
      }

      // Recurring Reminders (Interval from settings)
      if (isObligatory(entry.prayer) && recurringEnabled && windowEnd) {
        const startMs = entry.time.getTime();
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        const maxReminderMs = deadlineMs > startMs ? deadlineMs : windowEnd.getTime();
        const intervalMs = recurringInterval * 60_000;
        let count = 1;
        for (let t = startMs + intervalMs; t < maxReminderMs; t += intervalMs) {
          events.push({
            kind: `remind_${recurringInterval}m_${count}`,
            at: new Date(t),
            title: `${label} Reminder (${count * recurringInterval}m elapsed)`,
            body: `Have you prayed ${label}? Prayer window is active. Click to confirm.`,
            sound: true,
          });
          count++;
        }
      }

      for (const event of events) {
        const key = `${dayKey}:${entry.prayer}:${event.kind}`;
        if (fired.has(key)) continue;
        if (settings.masterNotificationsEnabled && cfg.notify && Math.abs(now.getTime() - event.at.getTime()) <= notificationWindowMs) {
          fired.add(key);
          await sendDesktopNotification(event.title, event.body);
          if (event.sound && cfg.sound) await playSound(cfg.sound, cfg.playFullAdhan);
        }
      }

      // Window Deadline Focus (Lead time from settings)
      if (isObligatory(entry.prayer) && shouldFocus(settings, entry.prayer) && windowEnd) {
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        if (deadlineMs > entry.time.getTime()) {
          const key = `${dayKey}:${entry.prayer}:focus_deadline_${focusLead}m`;
          if (!fired.has(key) && Math.abs(now.getTime() - deadlineMs) <= notificationWindowMs) {
            fired.add(key);
            await showFocus(entry.prayer);
          }
        }
      }
    }
  }
}

function nextAlertCheckDelay(
  now: Date,
  today: PrayerTimes,
  tomorrow: PrayerTimes,
  settings: AppSettings,
  timeZone: string,
  fired: Set<string>,
  completedPrayers: Record<Prayer, boolean>,
): number {
  const upcoming: number[] = [];
  const days = [today, tomorrow];
  const recurringEnabled = settings.recurringReminderEnabled ?? true;
  const recurringInterval = Math.max(1, settings.recurringReminderIntervalMinutes ?? 5);
  const focusLead = Math.max(5, settings.focusLeadMinutes ?? 45);

  for (let dIdx = 0; dIdx < days.length; dIdx++) {
    const day = days[dIdx];
    const nextDay = dIdx === 0 ? tomorrow : day;
    for (const entry of orderedTimes(day)) {
      if (completedPrayers[entry.prayer]) continue;

      const cfg = resolvedNotification(settings, entry.prayer);
      const civil = civilDateFromDate(entry.time, timeZone);
      const dayKey = `${civil.year}-${civil.month}-${civil.day}`;
      const windowEnd = getPrayerWindowEnd(entry.prayer, day, nextDay);

      if (settings.masterNotificationsEnabled && cfg.notify) {
        addPendingAlertTime(upcoming, fired, `${dayKey}:${entry.prayer}:adhan`, notificationTime(entry.prayer, entry.time, settings));
        if (cfg.earlyReminderEnabled) {
          addPendingAlertTime(upcoming, fired, `${dayKey}:${entry.prayer}:early`, new Date(entry.time.getTime() - cfg.earlyLeadMinutes * 60_000));
        }
        if (isObligatory(entry.prayer) && cfg.iqamahOffsetMinutes > 0) {
          addPendingAlertTime(upcoming, fired, `${dayKey}:${entry.prayer}:iqamah`, new Date(entry.time.getTime() + cfg.iqamahOffsetMinutes * 60_000));
        }
      }

      // Check upcoming recurring reminders
      if (isObligatory(entry.prayer) && recurringEnabled && windowEnd) {
        const startMs = entry.time.getTime();
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        const maxReminderMs = deadlineMs > startMs ? deadlineMs : windowEnd.getTime();
        const intervalMs = recurringInterval * 60_000;
        let count = 1;
        for (let t = startMs + intervalMs; t < maxReminderMs; t += intervalMs) {
          addPendingAlertTime(upcoming, fired, `${dayKey}:${entry.prayer}:remind_${recurringInterval}m_${count}`, new Date(t));
          count++;
        }
      }

      // Check upcoming deadline focus
      if (isObligatory(entry.prayer) && shouldFocus(settings, entry.prayer) && windowEnd) {
        const deadlineMs = windowEnd.getTime() - focusLead * 60_000;
        if (deadlineMs > entry.time.getTime()) {
          addPendingAlertTime(upcoming, fired, `${dayKey}:${entry.prayer}:focus_deadline_${focusLead}m`, new Date(deadlineMs));
        }
      }
    }
  }

  const next = upcoming
    .filter((time) => time > now.getTime() + 50)
    .sort((a, b) => a - b)[0];
  if (!next) return 60_000;
  return Math.min(60_000, Math.max(250, next - now.getTime() - 500));
}

function addPendingAlertTime(upcoming: number[], fired: Set<string>, key: string, at: Date) {
  if (!fired.has(key)) upcoming.push(at.getTime());
}

function notificationTime(prayer: Prayer, time: Date, settings: AppSettings): Date {
  if (settings.calculationMode === "manual" && isObligatory(prayer)) {
    return new Date(time.getTime() - Math.max(0, settings.azanBeforeJamaat) * 60_000);
  }
  return time;
}

function shouldFocus(settings: AppSettings, prayer: Prayer): boolean {
  if (!settings.focusModeEnabled) return false;
  if (settings.focusTrigger === "all") return true;
  if (settings.focusTrigger === "fajrIsha") return prayer === "fajr" || prayer === "isha";
  return isObligatory(prayer);
}

function soundUrl(sound: NotificationSound, playFullAdhan: boolean): string | null {
  if (sound === "none" || sound === "systemDefault") return null;
  if (playFullAdhan && sound === "adhanMadinah") return "/audio/adhan-madinah.m4a";
  if (playFullAdhan && sound === "adhanMakkah") return "/audio/adhan-makkah.m4a";
  switch (sound) {
    case "adhanMadinah": return "/audio/adhan-madinah.m4a";
    case "adhanMakkah": return "/audio/adhan-makkah.m4a";
    case "softChime": return "/audio/soft-chime.mp3";
    case "takbir": return "/audio/takbir.mp3";
    default: return null;
  }
}
