// Dashboard sidebar widget catalog — kept in sync with DASHBOARD_WIDGET_KEYS
// in backend/models/User.js. Only the sidebar column is customizable; the
// main column (resumes / score progress / week) stays fixed since it's
// dense, data-heavy content rather than discrete cards.

export const WIDGET_KEYS = [
  'careerTarget',
  'dailyChecklist',
  'interviewReadiness',
  'careerProgress',
  'recommendations',
  'missingSkills',
  'topJobMatches',
  'recentAchievements',
  'upcomingTasks',
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

export const DEFAULT_SIDEBAR_ORDER: WidgetKey[] = [...WIDGET_KEYS];

export const WIDGET_LABEL_KEYS: Record<WidgetKey, string> = {
  careerTarget: 'dashboardPage.careerTarget',
  dailyChecklist: 'dashboardPage.dailyChecklist',
  interviewReadiness: 'dashboardPage.interviewReadiness',
  careerProgress: 'dashboardPage.careerProgress',
  recommendations: 'dashboardPage.recommendedNextSteps',
  missingSkills: 'dashboardPage.missingSkills',
  topJobMatches: 'dashboardPage.topJobMatches',
  recentAchievements: 'dashboardPage.recentAchievements',
  upcomingTasks: 'dashboardPage.upcomingTasks',
};

/** Merge a saved order with the current widget catalog: keeps the user's
 * ordering for widgets that still exist, appends any new widgets shipped
 * since they last customized (so a product update never silently hides a
 * new widget), and drops keys that no longer exist. */
export function reconcileOrder(saved: string[] | undefined): WidgetKey[] {
  const known = new Set<string>(WIDGET_KEYS);
  const kept = (saved || []).filter((k): k is WidgetKey => known.has(k));
  const missing = WIDGET_KEYS.filter((k) => !kept.includes(k));
  return [...kept, ...missing];
}
