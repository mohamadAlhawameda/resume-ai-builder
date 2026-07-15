// Interview Readiness — a deterministic, explainable 0–100 score in the same
// weighted style as jobMatch.js / analysis.js. Every part maps to data the
// user can directly act on, with a `tipKey` the frontend translates.

const WEIGHTS = {
  resumeScore: 0.35, // latest scan overall
  profile: 0.15, // Career Digital Twin completeness
  evidence: 0.2, // Career Vault stories/achievements ready to tell
  pipeline: 0.15, // applications actually moving (applied/interviewing/offer)
  networking: 0.15, // contacts reached out to
};

// Vault items needed for full evidence credit — enough distinct stories to
// cover a typical behavioral-interview round.
const EVIDENCE_TARGET = 5;
const PIPELINE_TARGET = 3; // active applications for full credit
const NETWORKING_TARGET = 3; // contacted contacts for full credit

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * @param {object} input
 * @param {number|null} input.latestScanScore  latest resume scan overall (0–100) or null
 * @param {number} input.completionPct         CareerProfile.completionPct (0–100)
 * @param {number} input.vaultCount            CareerProfile.vault length
 * @param {number} input.activeApplications    SavedJobs with status applied/interviewing/offer
 * @param {number} input.contactedContacts     Contacts with contacted=true
 */
export function computeReadiness({ latestScanScore, completionPct, vaultCount, activeApplications, contactedContacts }) {
  const parts = [
    {
      key: 'resumeScore',
      score: clamp(latestScanScore ?? 0),
      weight: WEIGHTS.resumeScore,
      tipKey: latestScanScore === null ? 'runScan' : latestScanScore < 75 ? 'improveResume' : 'resumeStrong',
    },
    {
      key: 'profile',
      score: clamp(completionPct),
      weight: WEIGHTS.profile,
      tipKey: completionPct < 80 ? 'completeProfile' : 'profileStrong',
    },
    {
      key: 'evidence',
      score: clamp((vaultCount / EVIDENCE_TARGET) * 100),
      weight: WEIGHTS.evidence,
      tipKey: vaultCount < EVIDENCE_TARGET ? 'addStories' : 'evidenceStrong',
    },
    {
      key: 'pipeline',
      score: clamp((activeApplications / PIPELINE_TARGET) * 100),
      weight: WEIGHTS.pipeline,
      tipKey: activeApplications === 0 ? 'startApplying' : activeApplications < PIPELINE_TARGET ? 'applyMore' : 'pipelineStrong',
    },
    {
      key: 'networking',
      score: clamp((contactedContacts / NETWORKING_TARGET) * 100),
      weight: WEIGHTS.networking,
      tipKey: contactedContacts === 0 ? 'startNetworking' : contactedContacts < NETWORKING_TARGET ? 'networkMore' : 'networkingStrong',
    },
  ];

  const score = clamp(parts.reduce((sum, p) => sum + p.score * p.weight, 0));
  return { score, parts };
}
