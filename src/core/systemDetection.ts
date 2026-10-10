import type { Coordinates } from "./types";

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

const timeZoneCountryHints: Array<[RegExp, string]> = [
  [/^Europe\/Istanbul$/i, "TR"],
  [/^America\/(New_York|Chicago|Denver|Los_Angeles|Anchorage|Phoenix|Detroit|Indiana\/.+)$/i, "US"],
  [/^America\/(Toronto|Vancouver|Edmonton|Halifax|Winnipeg|Regina|St_Johns)$/i, "CA"],
  [/^Asia\/Riyadh$/i, "SA"],
  [/^Africa\/Cairo$/i, "EG"],
  [/^Asia\/Karachi$/i, "PK"],
  [/^Asia\/Dhaka$/i, "BD"],
  [/^Asia\/(Kolkata|Calcutta)$/i, "IN"],
  [/^Asia\/Kuala_Lumpur$/i, "MY"],
  [/^Asia\/Jakarta$/i, "ID"],
  [/^Asia\/Dubai$/i, "AE"],
  [/^Asia\/Doha$/i, "QA"],
  [/^Asia\/Kuwait$/i, "KW"],
  [/^Asia\/Muscat$/i, "OM"],
  [/^Asia\/Bahrain$/i, "BH"],
  [/^Europe\/London$/i, "GB"],
  [/^Europe\/Dublin$/i, "IE"],
  [/^Europe\/(Paris|Berlin|Rome|Madrid|Amsterdam|Brussels)$/i, "EU"],
  [/^Europe\/(Oslo|Stockholm|Helsinki|Copenhagen)$/i, "NO"],
  [/^Australia\/(Sydney|Melbourne|Brisbane|Perth)$/i, "AU"],
];

export const popularCities: CityLocation[] = [
  // Bangladesh (Primary local divisions & major districts)
  { id: "bd-dhaka", name: "Dhaka", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.8103, longitude: 90.4125 },
  { id: "bd-chittagong", name: "Chittagong", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 22.3569, longitude: 91.7832 },
  { id: "bd-khulna", name: "Khulna", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 22.8456, longitude: 89.5403 },
  { id: "bd-sylhet", name: "Sylhet", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.8949, longitude: 91.8687 },
  { id: "bd-rajshahi", name: "Rajshahi", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.3745, longitude: 88.6042 },
  { id: "bd-barisal", name: "Barisal", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 22.7010, longitude: 90.3535 },
  { id: "bd-rangpur", name: "Rangpur", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 25.7439, longitude: 89.2752 },
  { id: "bd-mymensingh", name: "Mymensingh", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.7471, longitude: 90.4203 },
  { id: "bd-comilla", name: "Comilla", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.4682, longitude: 91.1788 },
  { id: "bd-bogura", name: "Bogura", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.8465, longitude: 89.3777 },
  { id: "bd-coxsbazar", name: "Cox's Bazar", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 21.4272, longitude: 92.0058 },
  { id: "bd-gazipur", name: "Gazipur", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.9999, longitude: 90.4203 },
  { id: "bd-narayanganj", name: "Narayanganj", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.6238, longitude: 90.5000 },
  { id: "bd-jessore", name: "Jessore", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.1664, longitude: 89.2081 },
  { id: "bd-kushtia", name: "Kushtia", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.9013, longitude: 89.1205 },
  { id: "bd-dinajpur", name: "Dinajpur", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 25.6217, longitude: 88.6354 },
  { id: "bd-tangail", name: "Tangail", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.2513, longitude: 89.9167 },
  { id: "bd-faridpur", name: "Faridpur", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.6071, longitude: 89.8429 },
  { id: "bd-pabna", name: "Pabna", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 24.0129, longitude: 89.2483 },
  { id: "bd-noakhali", name: "Noakhali", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 22.8696, longitude: 91.0995 },
  { id: "bd-brahmanbaria", name: "Brahmanbaria", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.9571, longitude: 91.1119 },
  { id: "bd-feni", name: "Feni", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka", latitude: 23.0159, longitude: 91.3976 },

  // Middle East & Holy Sites
  { id: "sa-makkah", name: "Makkah", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh", latitude: 21.4225, longitude: 39.8262 },
  { id: "sa-madinah", name: "Madinah", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh", latitude: 24.5247, longitude: 39.5692 },
  { id: "sa-riyadh", name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh", latitude: 24.7136, longitude: 46.6753 },
  { id: "sa-jeddah", name: "Jeddah", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh", latitude: 21.5433, longitude: 39.1728 },
  { id: "ae-dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai", latitude: 25.2048, longitude: 55.2708 },
  { id: "ae-abudhabi", name: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai", latitude: 24.4539, longitude: 54.3773 },
  { id: "qa-doha", name: "Doha", country: "Qatar", countryCode: "QA", timeZone: "Asia/Qatar", latitude: 25.2854, longitude: 51.5310 },
  { id: "kw-kuwait", name: "Kuwait City", country: "Kuwait", countryCode: "KW", timeZone: "Asia/Kuwait", latitude: 29.3759, longitude: 47.9774 },
  { id: "om-muscat", name: "Muscat", country: "Oman", countryCode: "OM", timeZone: "Asia/Muscat", latitude: 23.5880, longitude: 58.3829 },
  { id: "eg-cairo", name: "Cairo", country: "Egypt", countryCode: "EG", timeZone: "Africa/Cairo", latitude: 30.0444, longitude: 31.2357 },
  { id: "tr-istanbul", name: "Istanbul", country: "Turkey", countryCode: "TR", timeZone: "Europe/Istanbul", latitude: 41.0082, longitude: 28.9784 },

  // South Asia
  { id: "pk-karachi", name: "Karachi", country: "Pakistan", countryCode: "PK", timeZone: "Asia/Karachi", latitude: 24.8607, longitude: 67.0011 },
  { id: "pk-lahore", name: "Lahore", country: "Pakistan", countryCode: "PK", timeZone: "Asia/Karachi", latitude: 31.5204, longitude: 74.3587 },
  { id: "pk-islamabad", name: "Islamabad", country: "Pakistan", countryCode: "PK", timeZone: "Asia/Karachi", latitude: 33.6844, longitude: 73.0479 },
  { id: "in-delhi", name: "New Delhi", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata", latitude: 28.6139, longitude: 77.2090 },
  { id: "in-mumbai", name: "Mumbai", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata", latitude: 19.0760, longitude: 72.8777 },
  { id: "in-kolkata", name: "Kolkata", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata", latitude: 22.5726, longitude: 88.3639 },

  // Southeast Asia
  { id: "my-kualalumpur", name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", timeZone: "Asia/Kuala_Lumpur", latitude: 3.1390, longitude: 101.6869 },
  { id: "id-jakarta", name: "Jakarta", country: "Indonesia", countryCode: "ID", timeZone: "Asia/Jakarta", latitude: -6.2088, longitude: 106.8456 },
  { id: "sg-singapore", name: "Singapore", country: "Singapore", countryCode: "SG", timeZone: "Asia/Singapore", latitude: 1.3521, longitude: 103.8198 },

  // UK, Europe, Americas, Australia
  { id: "gb-london", name: "London", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London", latitude: 51.5074, longitude: -0.1278 },
  { id: "gb-birmingham", name: "Birmingham", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London", latitude: 52.4862, longitude: -1.8904 },
  { id: "us-newyork", name: "New York", country: "United States", countryCode: "US", timeZone: "America/New_York", latitude: 40.7128, longitude: -74.0060 },
  { id: "us-chicago", name: "Chicago", country: "United States", countryCode: "US", timeZone: "America/Chicago", latitude: 41.8781, longitude: -87.6298 },
  { id: "us-losangeles", name: "Los Angeles", country: "United States", countryCode: "US", timeZone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 },
  { id: "ca-toronto", name: "Toronto", country: "Canada", countryCode: "CA", timeZone: "America/Toronto", latitude: 43.6532, longitude: -79.3832 },
  { id: "fr-paris", name: "Paris", country: "France", countryCode: "FR", timeZone: "Europe/Paris", latitude: 48.8566, longitude: 2.3522 },
  { id: "de-berlin", name: "Berlin", country: "Germany", countryCode: "DE", timeZone: "Europe/Berlin", latitude: 52.5200, longitude: 13.4050 },
  { id: "au-sydney", name: "Sydney", country: "Australia", countryCode: "AU", timeZone: "Australia/Sydney", latitude: -33.8688, longitude: 151.2093 },
  { id: "au-melbourne", name: "Melbourne", country: "Australia", countryCode: "AU", timeZone: "Australia/Melbourne", latitude: -37.8136, longitude: 144.9631 },
];

export function findNearestCity(lat: number, lon: number, thresholdKm = 35): CityLocation | undefined {
  let nearest: CityLocation | undefined;
  let minDistance = Infinity;

  for (const city of popularCities) {
    const dLat = (city.latitude - lat) * 111;
    const dLon = (city.longitude - lon) * 111 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = city;
    }
  }

  if (minDistance <= thresholdKm) {
    return nearest;
  }
  return undefined;
}

export function inferCountryCode(timeZone: string): string | undefined {
  const browserLocales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const locale of browserLocales) {
    const region = locale.match(/-([A-Z]{2})(?:$|-)/i)?.[1]?.toUpperCase();
    if (region) return region;
  }
  for (const [pattern, country] of timeZoneCountryHints) {
    if (pattern.test(timeZone)) return country;
  }
  return undefined;
}

export function inferCoordinatesFromTimeZone(timeZone: string): (Coordinates & { city: string; country: string; countryCode: string }) | undefined {
  const exact = popularCities.find((c) => c.timeZone.toLowerCase() === timeZone.toLowerCase());
  if (exact) {
    return {
      latitude: exact.latitude,
      longitude: exact.longitude,
      elevation: exact.elevation ?? 0,
      city: exact.name,
      country: exact.country,
      countryCode: exact.countryCode,
    };
  }

  // Fallback pattern matching for common timezone prefixes
  if (/Dhaka/i.test(timeZone)) return { latitude: 23.8103, longitude: 90.4125, elevation: 0, city: "Dhaka", country: "Bangladesh", countryCode: "BD" };
  if (/Karachi/i.test(timeZone)) return { latitude: 24.8607, longitude: 67.0011, elevation: 0, city: "Karachi", country: "Pakistan", countryCode: "PK" };
  if (/Kolkata|Calcutta/i.test(timeZone)) return { latitude: 28.6139, longitude: 77.2090, elevation: 0, city: "New Delhi", country: "India", countryCode: "IN" };
  if (/Riyadh/i.test(timeZone)) return { latitude: 24.7136, longitude: 46.6753, elevation: 0, city: "Riyadh", country: "Saudi Arabia", countryCode: "SA" };
  if (/Dubai/i.test(timeZone)) return { latitude: 25.2048, longitude: 55.2708, elevation: 0, city: "Dubai", country: "UAE", countryCode: "AE" };
  if (/Cairo/i.test(timeZone)) return { latitude: 30.0444, longitude: 31.2357, elevation: 0, city: "Cairo", country: "Egypt", countryCode: "EG" };
  if (/Istanbul/i.test(timeZone)) return { latitude: 41.0082, longitude: 28.9784, elevation: 0, city: "Istanbul", country: "Turkey", countryCode: "TR" };
  if (/London/i.test(timeZone)) return { latitude: 51.5074, longitude: -0.1278, elevation: 0, city: "London", country: "United Kingdom", countryCode: "GB" };
  if (/New_York/i.test(timeZone)) return { latitude: 40.7128, longitude: -74.0060, elevation: 0, city: "New York", country: "United States", countryCode: "US" };
  if (/Kuala_Lumpur/i.test(timeZone)) return { latitude: 3.1390, longitude: 101.6869, elevation: 0, city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY" };
  if (/Jakarta/i.test(timeZone)) return { latitude: -6.2088, longitude: 106.8456, elevation: 0, city: "Jakarta", country: "Indonesia", countryCode: "ID" };

  return undefined;
}

export interface DetectedLocationResult {
  latitude: number;
  longitude: number;
  elevation: number;
  cityName: string;
  source: "gps" | "ip" | "timezone";
}

export async function detectPreciseLocation(forceGps = false): Promise<DetectedLocationResult> {
  // 1. Try Device GPS first
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: forceGps ? 10000 : 6000,
          maximumAge: 30000,
        });
      });

      const lat = Number(pos.coords.latitude.toFixed(4));
      const lon = Number(pos.coords.longitude.toFixed(4));
      const elevation = pos.coords.altitude ? Math.round(pos.coords.altitude) : 0;

      const nearest = findNearestCity(lat, lon, 35);
      if (nearest) {
        return {
          latitude: lat,
          longitude: lon,
          elevation,
          cityName: `${nearest.name}, ${nearest.country}`,
          source: "gps",
        };
      }

      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
          { signal: AbortSignal.timeout(4000) },
        );
        if (res.ok) {
          const geo = await res.json();
          const place = geo.city || geo.locality || geo.principalSubdivision;
          if (place) {
            return {
              latitude: lat,
              longitude: lon,
              elevation,
              cityName: `${place}, ${geo.countryName || "Bangladesh"}`,
              source: "gps",
            };
          }
        }
      } catch {}

      return {
        latitude: lat,
        longitude: lon,
        elevation,
        cityName: `GPS (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        source: "gps",
      };
    } catch {
      // GPS not available or rejected, fall back to high-speed IP
    }
  }

  // 2. High-speed, unblocked IP Geolocation providers
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && typeof data.latitude === "number" && typeof data.longitude === "number") {
        const lat = Number(data.latitude.toFixed(4));
        const lon = Number(data.longitude.toFixed(4));
        const nearest = findNearestCity(lat, lon, 40);
        const city = nearest ? nearest.name : (data.city || data.region || "Detected City");
        const country = data.country || "Bangladesh";
        return {
          latitude: lat,
          longitude: lon,
          elevation: 0,
          cityName: `${city}, ${country}`,
          source: "ip",
        };
      }
    }
  } catch {}

  try {
    const res = await fetch("https://freeipapi.com/api/json", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
        const lat = Number(data.latitude.toFixed(4));
        const lon = Number(data.longitude.toFixed(4));
        const nearest = findNearestCity(lat, lon, 40);
        const city = nearest ? nearest.name : (data.cityName || data.regionName || "Detected City");
        const country = data.countryName || "Bangladesh";
        return {
          latitude: lat,
          longitude: lon,
          elevation: 0,
          cityName: `${city}, ${country}`,
          source: "ip",
        };
      }
    }
  } catch {}

  // 3. Fallback: Timezone estimation
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Dhaka";
  const tzMatch = inferCoordinatesFromTimeZone(tz);
  if (tzMatch) {
    return {
      latitude: tzMatch.latitude,
      longitude: tzMatch.longitude,
      elevation: tzMatch.elevation ?? 0,
      cityName: `${tzMatch.city}, ${tzMatch.country}`,
      source: "timezone",
    };
  }

  return {
    latitude: 22.8456,
    longitude: 89.5403,
    elevation: 0,
    cityName: "Khulna, Bangladesh",
    source: "ip",
  };
}
