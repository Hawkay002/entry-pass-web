// lib/timezones.ts — timezone list generated from the countries-and-timezones package.
// Runs at build/module-load time (pure synchronous, no runtime cost).

import ct from "countries-and-timezones";

export interface TimezoneOption {
  label: string;   // "IST — India (UTC+5:30)"
  offset: string;  // "+05:30"
}

// Map of common country codes → short labels for nicer display.
const COUNTRY_LABELS: Record<string, string> = {
  IN: "India",
  US: "USA",
  GB: "UK",
  AE: "UAE",
  SG: "Singapore",
  AU: "Australia",
  JP: "Japan",
  DE: "Germany",
  BR: "Brazil",
  CA: "Canada",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  RU: "Russia",
  CN: "China",
  KR: "South Korea",
  TH: "Thailand",
  ID: "Indonesia",
  MY: "Malaysia",
  PH: "Philippines",
  VN: "Vietnam",
  BD: "Bangladesh",
  PK: "Pakistan",
  LK: "Sri Lanka",
  NP: "Nepal",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  NZ: "New Zealand",
  TR: "Turkey",
  IR: "Iran",
  IL: "Israel",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  PL: "Poland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  IE: "Ireland",
  PT: "Portugal",
  GR: "Greece",
  CZ: "Czechia",
  RO: "Romania",
  HU: "Hungary",
  UA: "Ukraine",
};

// Abbreviation map for nicer labels.
const TZ_ABBREV: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "America/New_York": "EST",
  "America/Chicago": "CST",
  "America/Denver": "MST",
  "America/Los_Angeles": "PST",
  "America/Anchorage": "AKST",
  "Pacific/Honolulu": "HST",
  "Europe/London": "GMT",
  "Europe/Paris": "CET",
  "Europe/Berlin": "CET",
  "Europe/Madrid": "CET",
  "Europe/Rome": "CET",
  "Asia/Dubai": "GST",
  "Asia/Karachi": "PKT",
  "Asia/Dhaka": "BST",
  "Asia/Bangkok": "ICT",
  "Asia/Shanghai": "CST-CN",
  "Asia/Singapore": "SGT",
  "Asia/Tokyo": "JST",
  "Australia/Sydney": "AEST",
  "Australia/Adelaide": "ACST",
  "Pacific/Auckland": "NZST",
  "America/Sao_Paulo": "BRT",
  "America/Argentina/Buenos_Aires": "ART",
  "Asia/Riyadh": "AST",
  "Africa/Johannesburg": "SAST",
  "Africa/Lagos": "WAT",
  "Africa/Cairo": "EET",
};

/** Build the timezone list from the package, deduped by offset, sorted. */
function buildTimezones(): TimezoneOption[] {
  const countries = ct.getAllCountries();
  const seen = new Set<string>();
  const list: TimezoneOption[] = [];

  for (const [code, country] of Object.entries(countries)) {
    const tzName = country.timezones?.[0];
    if (!tzName) continue;
    try {
      const tz = ct.getTimezone(tzName);
      if (!tz?.utcOffsetStr || seen.has(tz.utcOffsetStr)) continue;
      seen.add(tz.utcOffsetStr);

      const countryName = COUNTRY_LABELS[code] ?? country.name;
      const abbrev = TZ_ABBREV[tzName] ?? code;
      list.push({
        label: `${abbrev} — ${countryName} (UTC${tz.utcOffsetStr})`,
        offset: tz.utcOffsetStr,
      });
    } catch {
      // skip invalid timezone
    }
  }

  // Sort by UTC offset (parse "+05:30" → 330 for numeric sort).
  list.sort((a, b) => {
    const parse = (s: string) => {
      const sign = s[0] === "-" ? -1 : 1;
      const [h, m] = s.slice(1).split(":").map(Number);
      return sign * (h * 60 + m);
    };
    return parse(a.offset) - parse(b.offset);
  });

  // Move India (+05:30) to the top.
  const istIdx = list.findIndex((t) => t.offset === "+05:30");
  if (istIdx > 0) {
    const [ist] = list.splice(istIdx, 1);
    list.unshift(ist);
  }

  return list;
}

export const TIMEZONES: TimezoneOption[] = buildTimezones();

/** Find IST offset (always +05:30) — used as default. */
export const DEFAULT_TZ = "+05:30";
