// Normalize messy ATS location strings ("Remote - Ontario, Canada",
// "San Francisco, CA • New York, NY", "Hybrid") into countries + regions so
// jobs can be filtered to the markets the platform serves (US + Canada) and
// users can filter by state/province.

export const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

export const CA_PROVINCES = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

// Major cities that often appear without a state/province.
const US_CITIES = {
  'new york city': 'New York', nyc: 'New York', 'san francisco': 'California',
  'foster city': 'California', hayward: 'California', 'los angeles': 'California',
  'san diego': 'California', 'san jose': 'California', 'palo alto': 'California',
  'mountain view': 'California', oakland: 'California', seattle: 'Washington',
  bellevue: 'Washington', austin: 'Texas', dallas: 'Texas', houston: 'Texas',
  chicago: 'Illinois', boston: 'Massachusetts', cambridge: 'Massachusetts',
  miami: 'Florida', atlanta: 'Georgia', denver: 'Colorado', boulder: 'Colorado',
  phoenix: 'Arizona', portland: 'Oregon', philadelphia: 'Pennsylvania',
  pittsburgh: 'Pennsylvania', detroit: 'Michigan', minneapolis: 'Minnesota',
  'salt lake city': 'Utah', nashville: 'Tennessee', charlotte: 'North Carolina',
  raleigh: 'North Carolina', columbus: 'Ohio', 'washington, d.c.': 'District of Columbia',
};

const CA_CITIES = {
  toronto: 'Ontario', ottawa: 'Ontario', mississauga: 'Ontario', waterloo: 'Ontario',
  kitchener: 'Ontario', hamilton: 'Ontario', london_on: 'Ontario',
  vancouver: 'British Columbia', victoria: 'British Columbia', burnaby: 'British Columbia',
  montreal: 'Quebec', montréal: 'Quebec', 'quebec city': 'Quebec',
  calgary: 'Alberta', edmonton: 'Alberta', winnipeg: 'Manitoba', halifax: 'Nova Scotia',
  saskatoon: 'Saskatchewan', regina: 'Saskatchewan',
};

const STATE_NAMES = new Map(Object.values(US_STATES).map((n) => [n.toLowerCase(), n]));
const PROVINCE_NAMES = new Map(Object.values(CA_PROVINCES).map((n) => [n.toLowerCase(), n]));

const US_COUNTRY_RE = /\b(?:united states|u\.s\.a\.?|usa|u\.s\.)\b/i;
// Bare "US" only as its own token (case-sensitive so "In-Office"/"us" prose don't match)
const US_TOKEN_RE = /(?:^|[\s,;\-–—(/])US(?=$|[\s,:;)\-–—/])/;
const CA_COUNTRY_RE = /\bcanada\b/i;
// "Remote, North America" / "Remote, Americas" — open to both markets we serve.
const NORTH_AMERICA_RE = /\bnorth america\b|\bamericas\b/i;

/**
 * @param {string} location   raw ATS location string
 * @param {string} [countryHint] ISO code from the provider (Lever's `country`)
 * @returns {{ countries: string[], regions: string[] }}
 *   countries ⊆ ['US','CA'] — empty when the location is outside both or unknown.
 */
export function parseJobLocation(location = '', countryHint = '') {
  const countries = new Set();
  const regions = new Set();
  const text = String(location || '');
  const lower = text.toLowerCase();

  if (countryHint === 'US' || countryHint === 'CA') countries.add(countryHint);

  if (US_COUNTRY_RE.test(text) || US_TOKEN_RE.test(text)) countries.add('US');
  if (CA_COUNTRY_RE.test(text)) countries.add('CA');
  if (NORTH_AMERICA_RE.test(text)) {
    countries.add('US');
    countries.add('CA');
  }

  // Two-letter codes after a comma: "Boston, MA", "Toronto, ON".
  for (const m of text.matchAll(/,\s*([A-Z]{2})(?=$|[\s,;•)/])/g)) {
    const code = m[1];
    if (US_STATES[code]) {
      countries.add('US');
      regions.add(US_STATES[code]);
    } else if (CA_PROVINCES[code]) {
      countries.add('CA');
      regions.add(CA_PROVINCES[code]);
    }
  }

  // Full state/province names anywhere in the string.
  for (const [nameLower, name] of STATE_NAMES) {
    if (lower.includes(nameLower)) {
      // "Washington" the state vs "Washington, D.C." — DC wins when present.
      if (name === 'Washington' && /washington,?\s*d\.?c\.?/i.test(text)) continue;
      countries.add('US');
      regions.add(name);
    }
  }
  for (const [nameLower, name] of PROVINCE_NAMES) {
    if (lower.includes(nameLower)) {
      countries.add('CA');
      regions.add(name);
    }
  }

  // Known bare city names ("Toronto", "San Francisco").
  for (const [city, region] of Object.entries(US_CITIES)) {
    if (lower.includes(city)) {
      countries.add('US');
      regions.add(region);
    }
  }
  for (const [city, region] of Object.entries(CA_CITIES)) {
    if (city === 'london_on') continue; // London ON is ambiguous with London UK — skip
    if (lower.includes(city)) {
      countries.add('CA');
      regions.add(region);
    }
  }

  return { countries: [...countries], regions: [...regions].sort() };
}

/** Countries the platform serves. JOB_COUNTRIES=all disables filtering. */
export function allowedCountries() {
  const raw = (process.env.JOB_COUNTRIES || 'US,CA').trim();
  if (raw.toLowerCase() === 'all') return null;
  return new Set(raw.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean));
}
