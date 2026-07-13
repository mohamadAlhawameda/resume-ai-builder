// ATS feeds identify companies by URL slug ("gitlab", "shield-ai"); turn that
// into a display name for job cards. Known brands with non-trivial casing are
// mapped explicitly; everything else gets simple word capitalization.
const KNOWN_NAMES = {
  gitlab: 'GitLab',
  doordash: 'DoorDash',
  mongodb: 'MongoDB',
  octoenergy: 'Octopus Energy',
  whoop: 'WHOOP',
};

export function prettyCompanyName(slug = '') {
  const key = slug.toLowerCase();
  if (KNOWN_NAMES[key]) return KNOWN_NAMES[key];
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
