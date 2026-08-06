// lib/timezones.ts — curated timezone list with full UTC offset coverage.
// Covers UTC-12 to UTC+14 including all rare half-hour and 45-minute offsets.
// India (+05:30) is listed first (default).

export interface TimezoneOption {
  label: string;   // "IST — India (UTC+5:30)"
  offset: string;  // "+05:30"
}

export const TIMEZONES: TimezoneOption[] = [
  { offset: "+05:30", label: "IST — India (UTC+5:30)" },
  { offset: "-12:00", label: "AoE — United States, Baker Island (UTC-12:00)" },
  { offset: "-11:00", label: "SST — American Samoa (UTC-11:00)" },
  { offset: "-10:00", label: "CKT — Cook Islands (UTC-10:00)" },
  { offset: "-09:30", label: "MART — French Polynesia, Marquesas Islands (UTC-9:30)" },
  { offset: "-09:00", label: "GAMT — French Polynesia, Gambier Islands (UTC-9:00)" },
  { offset: "-08:00", label: "PST — Pitcairn (UTC-8:00)" },
  { offset: "-07:00", label: "MST — Canada, Mountain Time (UTC-7:00)" },
  { offset: "-06:00", label: "CST — Belize (UTC-6:00)" },
  { offset: "-05:00", label: "EST — Bahamas (UTC-5:00)" },
  { offset: "-04:00", label: "AST — Antigua and Barbuda (UTC-4:00)" },
  { offset: "-03:30", label: "NST — Canada, Newfoundland (UTC-3:30)" },
  { offset: "-03:00", label: "ART — Argentina (UTC-3:00)" },
  { offset: "-02:00", label: "GST — South Georgia (UTC-2:00)" },
  { offset: "-01:00", label: "CVT — Cabo Verde (UTC-1:00)" },
  { offset: "+00:00", label: "GMT — Burkina Faso (UTC+0:00)" },
  { offset: "+01:00", label: "CET — Andorra (UTC+1:00)" },
  { offset: "+02:00", label: "EET — Åland Islands (UTC+2:00)" },
  { offset: "+03:00", label: "AST — Bahrain (UTC+3:00)" },
  { offset: "+03:30", label: "IRST — Iran (UTC+3:30)" },
  { offset: "+04:00", label: "GST — United Arab Emirates (UTC+4:00)" },
  { offset: "+04:30", label: "AFT — Afghanistan (UTC+4:30)" },
  { offset: "+05:00", label: "KZT — Kazakhstan (UTC+5:00)" },
  { offset: "+05:45", label: "NPT — Nepal (UTC+5:45)" },
  { offset: "+06:00", label: "BST — Bangladesh (UTC+6:00)" },
  { offset: "+06:30", label: "CCT — Cocos (Keeling) Islands (UTC+6:30)" },
  { offset: "+07:00", label: "CXT — Christmas Island (UTC+7:00)" },
  { offset: "+08:00", label: "AWST — Antarctica, Casey Station (UTC+8:00)" },
  { offset: "+08:45", label: "ACWST — Australia, Eucla (UTC+8:45)" },
  { offset: "+09:00", label: "JST — Japan (UTC+9:00)" },
  { offset: "+09:30", label: "ACST — Australia, Northern Territory (UTC+9:30)" },
  { offset: "+10:00", label: "AEST — Australia, Queensland (UTC+10:00)" },
  { offset: "+10:30", label: "LHST — Australia, Lord Howe Island (UTC+10:30)" },
  { offset: "+11:00", label: "PONT — Micronesia, Pohnpei (UTC+11:00)" },
  { offset: "+12:00", label: "FJT — Fiji (UTC+12:00)" },
  { offset: "+12:45", label: "CHAST — New Zealand, Chatham Islands (UTC+12:45)" },
  { offset: "+13:00", label: "PHOT — Kiribati, Phoenix Islands (UTC+13:00)" },
  { offset: "+14:00", label: "LINT — Kiribati, Line Islands (UTC+14:00)" },
];

/** Default timezone offset — India. */
export const DEFAULT_TZ = "+05:30";

/** Find the full label for a given offset. */
export function getTzLabel(offset: string): string | null {
  const tz = TIMEZONES.find((t) => t.offset === offset);
  return tz ? tz.label : null;
}
