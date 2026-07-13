// Career Digital Twin completeness — feeds the profile UI and the Career
// Concierge's "next best action" logic.
export function computeCompleteness(profile) {
  let score = 0;
  const add = (cond, pts) => {
    if (cond) score += pts;
  };
  add((profile.experience || []).length > 0, 20);
  add((profile.education || []).length > 0, 10);
  add((profile.skills || []).length >= 5, 20);
  add((profile.projects || []).length > 0, 10);
  add((profile.certifications || []).length > 0, 5);
  add((profile.languages || []).length > 0, 5);
  add(!!profile.careerGoals?.trim(), 10);
  add((profile.targetRoles || []).length > 0, 10);
  add((profile.vault || []).length >= 3, 10);
  return Math.min(100, score);
}
