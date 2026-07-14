'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FilePlus2,
  FileText,
  ScanSearch,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Target,
  Sparkles,
  ClipboardList,
  Gauge,
  ListChecks,
  Trophy,
  CalendarClock,
  Puzzle,
  Bell,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ScoreRing from '@/components/ui/ScoreRing';
import { TrendLine } from '@/components/ui/Chart';
import { api, apiErrorMessage } from '@/lib/api';
import { getUser, isLoggedIn, type StoredUser } from '@/lib/auth';
import type { ResumeRecord, ScanHistoryItem, SavedJob, Job, NextAction, CareerProfile } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

interface Profile {
  targetRole: string;
  industry: string;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [topJobs, setTopJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile>({ targetRole: '', industry: '' });
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    setUser(getUser());

    const load = async () => {
      // Each call is independent — one failing (e.g. older backend) shouldn't
      // blank the whole dashboard.
      const results = await Promise.allSettled([
        api<ResumeRecord[]>('/resume/resumes'),
        api<ScanHistoryItem[]>('/analysis/history'),
        api<SavedJob[]>('/jobs/saved'),
        api<{ jobs: Job[] }>('/jobs/recommended'),
        api<{ user: { targetRole: string; industry: string } }>('/auth/me'),
        api<NextAction>('/profile/next-action'),
        api<CareerProfile>('/profile'),
      ]);
      if (results[0].status === 'fulfilled') setResumes(results[0].value);
      if (results[1].status === 'fulfilled') setHistory(results[1].value);
      if (results[2].status === 'fulfilled') setSavedJobs(results[2].value);
      if (results[3].status === 'fulfilled') setTopJobs((results[3].value.jobs || []).slice(0, 3));
      if (results[4].status === 'fulfilled') {
        setProfile({
          targetRole: results[4].value.user.targetRole || '',
          industry: results[4].value.user.industry || '',
        });
      }
      if (results[5].status === 'fulfilled') setNextAction(results[5].value);
      if (results[6].status === 'fulfilled') setCareerProfile(results[6].value);
      if (results[0].status === 'rejected') {
        toast.error(apiErrorMessage(results[0].reason, t('dashboardPage.toastLoadResumesError')));
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      await api('/auth/profile', { method: 'PUT', body: profile });
      toast.success(t('dashboardPage.toastTargetUpdated'));
      setEditingTarget(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }, [profile, t]);

  const scans = history.filter((h) => h.type === 'scan' && typeof h.overall === 'number');
  const latestScore = scans[0]?.overall ?? null;
  const previousScore = scans[1]?.overall ?? null;
  const scoreDelta = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;
  const applications = savedJobs.filter((j) => j.status !== 'saved').length;

  const chartData = useMemo(
    () =>
      [...scans]
        .reverse()
        .slice(-12)
        .map((s, i) => ({
          label: formatDate(s.createdAt, { month: 'short', day: 'numeric' }),
          score: s.overall ?? 0,
          key: s._id || i,
        })),
    [scans, formatDate]
  );

  // Missing skills: the deficits that show up most often across today's top
  // matches — a compact, actionable slice of what Radar/Simulator show in full.
  const missingSkills = useMemo(() => {
    const freq = new Map<string, number>();
    for (const job of topJobs) {
      for (const skill of job.match?.missingSkills || []) {
        freq.set(skill, (freq.get(skill) || 0) + 1);
      }
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill]) => skill);
  }, [topJobs]);

  const recentAchievements = useMemo(
    () =>
      [...(careerProfile?.vault || [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [careerProfile]
  );

  const weekStats = useMemo(() => {
    const since = Date.now() - ONE_WEEK_MS;
    const scansThisWeek = history.filter((h) => h.type === 'scan' && new Date(h.createdAt).getTime() >= since).length;
    const applicationsThisWeek = savedJobs.filter((j) => j.appliedAt && new Date(j.appliedAt).getTime() >= since).length;
    const savedThisWeek = savedJobs.filter((j) => new Date(j.createdAt || j.appliedAt || 0).getTime() >= since).length;
    return { scansThisWeek, applicationsThisWeek, savedThisWeek };
  }, [history, savedJobs]);

  const stats = [
    {
      label: t('dashboardPage.statResumes'),
      value: resumes.length,
      icon: FileText,
      href: '/resumes',
      color: 'from-blue-500 to-indigo-600 shadow-blue-600/25',
    },
    {
      label: t('dashboardPage.statLatestScore'),
      value: latestScore !== null ? `${latestScore}/100` : '—',
      sub: scoreDelta !== null ? t('dashboardPage.vsPrevious', { delta: `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}` }) : undefined,
      icon: ScanSearch,
      href: '/analyze',
      color: 'from-violet-500 to-purple-600 shadow-purple-600/25',
    },
    {
      label: t('dashboardPage.statSavedJobs'),
      value: savedJobs.length,
      icon: Briefcase,
      href: '/jobs?tab=saved',
      color: 'from-emerald-500 to-teal-600 shadow-emerald-600/25',
    },
    {
      label: t('dashboardPage.statApplications'),
      value: applications,
      icon: ClipboardList,
      href: '/jobs?tab=saved',
      color: 'from-amber-500 to-orange-600 shadow-amber-600/25',
    },
  ];

  const recommendations: { text: string; href: string }[] = [];
  if (!profile.targetRole) {
    recommendations.push({ text: t('dashboardPage.recTargetRole'), href: '#target' });
  }
  if (resumes.length === 0) {
    recommendations.push({ text: t('dashboardPage.recFirstResume'), href: '/resume' });
  } else if (scans.length === 0) {
    recommendations.push({ text: t('dashboardPage.recFirstScan'), href: '/analyze' });
  } else if (latestScore !== null && latestScore < 75) {
    recommendations.push({ text: t('dashboardPage.recImproveScore', { score: latestScore }), href: '/analyze' });
  }
  if (resumes.length > 0 && savedJobs.length === 0) {
    recommendations.push({ text: t('dashboardPage.recBrowseJobs'), href: '/jobs' });
  }
  if (resumes.length === 1) {
    recommendations.push({ text: t('dashboardPage.recDuplicateResume'), href: '/resumes' });
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-40 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('dashboardPage.welcomeBack', { name: user?.name?.split(' ')[0] || t('dashboardPage.thereFallback') })}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {profile.targetRole
              ? profile.industry
                ? t('dashboardPage.workingTowardWithIndustry', { role: profile.targetRole, industry: profile.industry })
                : t('dashboardPage.workingToward', { role: profile.targetRole })
              : t('dashboardPage.progressAtGlance')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<ScanSearch className="w-4 h-4" />} variant="outline" onClick={() => router.push('/analyze')}>
            {t('dashboardPage.scanResume')}
          </Button>
          <Button icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push('/resume')}>
            {t('dashboardPage.newResume')}
          </Button>
        </div>
      </motion.div>

      {/* Career Concierge — always the one next best action */}
      {nextAction && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
          <div className="flex items-center gap-4 bg-gradient-to-r from-primary to-accent rounded-2xl px-5 py-4 shadow-md shadow-primary/20">
            <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" aria-hidden />
            </span>
            <p className="text-sm text-white flex-1">{t(`dashboardPage.nextAction.${nextAction.key}`, nextAction.params)}</p>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 !bg-white/95 !text-primary !border-white/60 hover:!bg-white"
              onClick={() => router.push(nextAction.href)}
            >
              {t('dashboardPage.go')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={s.href} className="block group">
              <Card hover className="h-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br text-white shadow-md ${s.color}`}>
                  <s.icon className="w-5 h-5" aria-hidden />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {s.sub && (
                  <p className={`text-xs font-medium mt-0.5 ${scoreDelta !== null && scoreDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                    {s.sub}
                  </p>
                )}
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: resumes + scan history */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent resumes */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{t('dashboardPage.yourResumes')}</h2>
              <Link href="/resumes" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                {t('dashboardPage.viewAll')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
              </Link>
            </div>
            {resumes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title={t('dashboardPage.noResumesTitle')}
                description={t('dashboardPage.noResumesDescription')}
                action={<Button onClick={() => router.push('/resume')}>{t('dashboardPage.createResume')}</Button>}
              />
            ) : (
              <ul className="divide-y divide-border">
                {resumes.slice(0, 4).map((r) => (
                  <li key={r._id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-surface-hover transition">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {r.title || r.data?.fullName || t('dashboardPage.untitledResume')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboardPage.updatedOn', { date: formatDate(r.updatedAt) })}
                        {r.templateId && ` · ${t('dashboardPage.templateSuffix', { template: r.templateId })}`}
                      </p>
                    </div>
                    {typeof (r as ResumeRecord & { lastScore?: number }).lastScore === 'number' && (
                      <Badge tone={scoreTone((r as ResumeRecord & { lastScore: number }).lastScore)}>
                        {(r as ResumeRecord & { lastScore: number }).lastScore}/100
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => router.push(`/resume/edit/${r._id}`)}>
                      {t('dashboardPage.edit')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Scan history / progress */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" aria-hidden /> {t('dashboardPage.scoreProgress')}
              </h2>
              <Link href="/analyze" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                {t('dashboardPage.newScan')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
              </Link>
            </div>
            {scans.length === 0 ? (
              <EmptyState
                icon={<ScanSearch className="w-6 h-6" />}
                title={t('dashboardPage.noScansTitle')}
                description={t('dashboardPage.noScansDescription')}
                action={<Button variant="outline" onClick={() => router.push('/analyze')}>{t('dashboardPage.runFirstScan')}</Button>}
              />
            ) : (
              <div className="px-3 sm:px-6 py-5">
                {chartData.length >= 2 ? (
                  <TrendLine data={chartData} xKey="label" yKey="score" height={180} ariaLabel={t('dashboardPage.scoreHistoryChart')} />
                ) : (
                  <div className="flex items-center gap-4 px-2 py-2">
                    <ScoreRing score={chartData[0]?.score ?? 0} size={72} strokeWidth={7} />
                    <p className="text-sm text-muted-foreground">{t('dashboardPage.noScansDescription')}</p>
                  </div>
                )}
                <ul className="space-y-2 mt-4 px-2 sm:px-0">
                  {history.slice(0, 4).map((h) => (
                    <li key={h._id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {h.type === 'scan'
                          ? t('dashboardPage.resumeScanLabel')
                          : h.jobTitle
                            ? t('dashboardPage.jobMatchLabelWithTitle', { title: h.jobTitle })
                            : t('dashboardPage.jobMatchLabel')}
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <Badge tone={scoreTone(h.overall ?? h.matchPercent ?? 0)}>
                          {h.type === 'scan' ? `${h.overall}/100` : t('dashboardPage.matchPercent', { n: h.matchPercent ?? 0 })}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-16 text-end">
                          {formatDate(h.createdAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Your week at a glance */}
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-accent" aria-hidden /> {t('dashboardPage.yourWeek')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <p className="text-2xl font-bold text-foreground">{weekStats.scansThisWeek}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardPage.weekScans')}</p>
              </Card>
              <Card>
                <p className="text-2xl font-bold text-foreground">{weekStats.applicationsThisWeek}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardPage.weekApplications')}</p>
              </Card>
              <Card>
                <p className="text-2xl font-bold text-foreground">{weekStats.savedThisWeek}</p>
                <p className="text-sm text-muted-foreground">{t('dashboardPage.weekSaved')}</p>
              </Card>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Career target */}
          <Card id="target">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" aria-hidden /> {t('dashboardPage.careerTarget')}
            </h2>
            {editingTarget ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="targetRole" className="block text-xs font-medium text-muted-foreground mb-1">
                    {t('dashboardPage.targetRoleLabel')}
                  </label>
                  <input
                    id="targetRole"
                    value={profile.targetRole}
                    onChange={(e) => setProfile((p) => ({ ...p, targetRole: e.target.value }))}
                    placeholder={t('dashboardPage.targetRolePlaceholder')}
                    className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="industry" className="block text-xs font-medium text-muted-foreground mb-1">
                    {t('dashboardPage.industryLabel')}
                  </label>
                  <input
                    id="industry"
                    value={profile.industry}
                    onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
                    placeholder={t('dashboardPage.industryPlaceholder')}
                    className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={savingProfile} onClick={saveProfile}>
                    {t('dashboardPage.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTarget(false)}>
                    {t('dashboardPage.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {profile.targetRole ? (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{profile.targetRole}</span>
                    {profile.industry && <span className="text-muted-foreground"> · {profile.industry}</span>}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('dashboardPage.targetNotSet')}</p>
                )}
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditingTarget(true)}>
                  {profile.targetRole ? t('dashboardPage.edit') : t('dashboardPage.setTarget')}
                </Button>
              </div>
            )}
          </Card>

          {/* Career progress — how close to the goal, at a glance */}
          {careerProfile && (
            <Card>
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-primary" aria-hidden /> {t('dashboardPage.careerProgress')}
              </h2>
              <div className="flex items-center gap-4">
                <ScoreRing score={careerProfile.completionPct} size={76} strokeWidth={7} animate={false} />
                <p className="text-sm text-muted-foreground flex-1">
                  {careerProfile.completionPct >= 90
                    ? t('dashboardPage.progressComplete')
                    : t('dashboardPage.progressIncomplete')}
                </p>
              </div>
              {careerProfile.completionPct < 90 && (
                <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {t('dashboardPage.completeProfile')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                </Link>
              )}
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-warning" aria-hidden /> {t('dashboardPage.recommendedNextSteps')}
              </h2>
              <ul className="space-y-2.5">
                {recommendations.slice(0, 4).map((rec, i) => (
                  <li key={i}>
                    <Link
                      href={rec.href}
                      className="flex items-start gap-2 text-sm text-muted-foreground hover:text-primary transition group"
                    >
                      <ArrowRight className="w-4 h-4 mt-0.5 text-primary/60 group-hover:translate-x-0.5 rtl-flip transition-transform shrink-0" />
                      {rec.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Missing skills — the recurring gaps across today's top matches */}
          {missingSkills.length > 0 && (
            <Card>
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Puzzle className="w-4 h-4 text-accent" aria-hidden /> {t('dashboardPage.missingSkills')}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill) => (
                  <Badge key={skill} tone="slate">{skill}</Badge>
                ))}
              </div>
              <Link href="/radar" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                {t('dashboardPage.seeSkillImpact')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
              </Link>
            </Card>
          )}

          {/* Top job matches */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{t('dashboardPage.topJobMatches')}</h2>
              <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
                {t('dashboardPage.allJobs')}
              </Link>
            </div>
            {topJobs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">{t('dashboardPage.jobMatchesEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {topJobs.map((job) => (
                  <li key={job.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{job.title}</p>
                      {job.match && <Badge tone={scoreTone(job.match.percent)}>{job.match.percent}%</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {job.company} · {job.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent achievements — from the Career Vault */}
          <Card>
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-warning" aria-hidden /> {t('dashboardPage.recentAchievements')}
            </h2>
            {recentAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboardPage.noAchievements')}</p>
            ) : (
              <ul className="space-y-3">
                {recentAchievements.map((a) => (
                  <li key={a._id} className="text-sm text-foreground border-s-2 border-warning/40 ps-3">
                    <p className="line-clamp-2">{a.text}</p>
                    {a.metric && <p className="text-xs text-success font-medium mt-0.5">{a.metric}</p>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/profile?tab=vault" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {t('dashboardPage.openVault')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
            </Link>
          </Card>

          {/* Upcoming tasks — reminders/follow-ups land here once Networking ships */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" aria-hidden /> {t('dashboardPage.upcomingTasks')}
              </h2>
              <Badge tone="slate">{t('dashboardPage.comingSoon')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t('dashboardPage.upcomingTasksDescription')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
