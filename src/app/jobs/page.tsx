'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Briefcase,
  MapPin,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Settings,
  ChevronDown,
  Sparkles,
  FileText,
  Search,
  FlaskConical,
  Bell,
  DollarSign,
  Trash2,
  MessagesSquare,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import TagInput from '@/components/ui/TagInput';
import MultiSelect from '@/components/ui/MultiSelect';
import Tabs from '@/components/ui/Tabs';
import CompanyIntelligencePanel from '@/components/CompanyIntelligence';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  COUNTRY_OPTIONS,
  CA_PROVINCE_OPTIONS,
  US_STATE_OPTIONS,
  WORK_STYLE_OPTIONS,
} from '@/lib/locationData';
import {
  DEFAULT_JOB_PREFERENCES,
  type Job,
  type JobPreferences,
  type SavedJob,
  type SavedJobStatus,
  type ResumeRecord,
} from '@/lib/types';
import GuidedApplyFlow from '@/components/GuidedApplyFlow';
import { useLocale } from '@/i18n/LocaleProvider';

type Tab = 'recommended' | 'saved' | 'preferences';


const STATUS_OPTIONS: { value: SavedJobStatus; labelKey: string; tone: 'slate' | 'blue' | 'purple' | 'green' | 'red' }[] = [
  { value: 'saved', labelKey: 'jobsPage.statusSaved', tone: 'slate' },
  { value: 'applied', labelKey: 'jobsPage.statusApplied', tone: 'blue' },
  { value: 'interviewing', labelKey: 'jobsPage.statusInterviewing', tone: 'purple' },
  { value: 'offer', labelKey: 'jobsPage.statusOffer', tone: 'green' },
  { value: 'rejected', labelKey: 'jobsPage.statusRejected', tone: 'red' },
];

/** Compact page-number window with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20. */
function paginationWindow(current: number, total: number): (number | '…')[] {
  const delta = 1;
  const pages: (number | '…')[] = [];
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);

  pages.push(1);
  if (range[0] > 2) pages.push('…');
  pages.push(...range);
  if (range[range.length - 1] < total - 1) pages.push('…');
  if (total > 1) pages.push(total);
  return pages;
}

function salaryText(job: Job): string | null {
  if (!job.salaryMin && !job.salaryMax) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
  return fmt((job.salaryMin || job.salaryMax) as number);
}

const PAGE_SIZE = 10;

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatDate } = useLocale();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'recommended');
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatched, setTotalMatched] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);
  const [sampleData, setSampleData] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [prefs, setPrefs] = useState<JobPreferences>({ ...DEFAULT_JOB_PREFERENCES });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [intelCompany, setIntelCompany] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [guidedApplyJob, setGuidedApplyJob] = useState<Job | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [descriptionLoading, setDescriptionLoading] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);

  // Filters — applied server-side so pagination stays correct across the
  // whole matched set, not just whatever page happens to be loaded.
  const [query, setQuery] = useState('');
  const [queryDebounced, setQueryDebounced] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('any');
  const [countryFilter, setCountryFilter] = useState<'any' | 'CA' | 'US'>('any');
  const [regionFilter, setRegionFilter] = useState('any');
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState<'match' | 'date' | 'salary'>('match');

  // Debounce the free-text search so we don't re-fetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQueryDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const loadJobs = useCallback(
    async (targetPage: number) => {
      setJobsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
          sortBy,
        });
        if (queryDebounced) params.set('q', queryDebounced);
        if (remoteFilter !== 'any') params.set('remote', remoteFilter);
        if (countryFilter !== 'any') params.set('country', countryFilter);
        if (regionFilter !== 'any') params.set('region', regionFilter);
        if (minMatch > 0) params.set('minMatch', String(minMatch));

        const res = await api<{
          jobs: Job[];
          page: number;
          totalPages: number;
          totalMatched: number;
          hasProfile: boolean;
          sampleData: boolean;
          resumeId: string | null;
          preferences: Partial<JobPreferences>;
        }>(`/jobs/recommended?${params.toString()}`);

        setJobs(res.jobs || []);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setTotalMatched(res.totalMatched ?? (res.jobs || []).length);
        setHasProfile(res.hasProfile !== false);
        setSampleData(!!res.sampleData);
        setResumeId(res.resumeId);
        setPrefs({ ...DEFAULT_JOB_PREFERENCES, ...(res.preferences || {}) });
      } catch (err) {
        toast.error(apiErrorMessage(err, t('jobsPage.toastLoadError')));
      } finally {
        setJobsLoading(false);
        setLoading(false);
      }
    },
    [sortBy, queryDebounced, remoteFilter, countryFilter, regionFilter, minMatch, t]
  );

  // Re-fetch page 1 whenever a filter changes; re-fetch the current page
  // (without resetting to 1) when only the page number changes.
  useEffect(() => {
    loadJobs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, queryDebounced, remoteFilter, countryFilter, regionFilter, minMatch]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/jobs');
      return;
    }
    api<SavedJob[]>('/jobs/saved')
      .then(setSavedJobs)
      .catch(() => {
        /* non-critical for the recommended tab */
      });
    api<ResumeRecord[]>('/resume/resumes')
      .then(setResumes)
      .catch(() => {
        /* Guided Apply just prompts to create a resume if this is empty */
      });
    loadJobs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadJobs(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const savedIds = useMemo(() => new Set(savedJobs.map((s) => s.job?.id)), [savedJobs]);

  const regionOptions = useMemo(() => {
    if (countryFilter === 'CA') return CA_PROVINCE_OPTIONS.map((o) => o.value);
    if (countryFilter === 'US') return US_STATE_OPTIONS.map((o) => o.value);
    return [];
  }, [countryFilter]);

  // Fetch (and cache) a job's full description — the list/saved-jobs
  // endpoints deliberately omit it to stay lightweight, so any action that
  // actually needs the JD text (save, cover letter, match report) loads it
  // on demand first.
  const getFullDescription = async (job: Job): Promise<string> => {
    if (job.description) return job.description;
    if (descriptions[job.id] !== undefined) return descriptions[job.id];
    const full = await api<Job>(`/jobs/detail/${encodeURIComponent(job.id)}`);
    const text = full.description || '';
    setDescriptions((prev) => ({ ...prev, [job.id]: text }));
    return text;
  };

  const toggleDescription = async (job: Job) => {
    if (expandedJob === job.id) {
      setExpandedJob(null);
      return;
    }
    setExpandedJob(job.id);
    if (descriptions[job.id] !== undefined) return;
    setDescriptionLoading(job.id);
    try {
      await getFullDescription(job);
    } catch (err) {
      setDescriptions((prev) => ({ ...prev, [job.id]: 'Could not load the full description.' }));
      toast.error(apiErrorMessage(err));
    } finally {
      setDescriptionLoading(null);
    }
  };

  const handleSave = async (job: Job) => {
    setBusyJob(job.id);
    try {
      const description = await getFullDescription(job).catch(() => job.description || '');
      const saved = await api<SavedJob>('/jobs/save', {
        method: 'POST',
        body: { job: { ...job, description, match: undefined }, matchPercent: job.match?.percent ?? null },
      });
      setSavedJobs((prev) => [saved, ...prev.filter((s) => s._id !== saved._id)]);
      toast.success(t('jobsPage.toastJobSaved'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyJob(null);
    }
  };

  const handleTailor = async (job: Job) => {
    if (!resumeId) {
      toast.info(t('jobsPage.toastCreateResumeFirst'));
      return;
    }
    setBusyJob(job.id);
    try {
      const copy = await api<{ _id: string }>(`/resume/duplicate/${resumeId}`, {
        method: 'POST',
        body: { title: `${job.title} @ ${job.company}` },
      });
      toast.success(t('jobsPage.toastTailoredCopyCreated'));
      router.push(`/resume/edit/${copy._id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusyJob(null);
    }
  };

  // Hand a job's context to the AI tools page (cover letter, interview prep, …).
  const openToolForJob = async (job: Job, tool: 'cover-letter' | 'interview-prep' | 'follow-up-email' | 'thank-you-email') => {
    setBusyJob(job.id);
    const jobDescription = await getFullDescription(job).catch(() => '');
    setBusyJob(null);
    sessionStorage.setItem('tools:jobContext', JSON.stringify({ jobTitle: job.title, company: job.company, jobDescription }));
    router.push(`/tools?tool=${tool}`);
  };

  const handleAnalyzeAgainstJob = async (job: Job) => {
    setBusyJob(job.id);
    const jobDescription = await getFullDescription(job).catch(() => '');
    setBusyJob(null);
    sessionStorage.setItem('analyze:jobDescription', jobDescription);
    // Structured metadata enables location/remote/salary rows in the
    // Qualification Evidence Map that a raw pasted JD alone can't provide.
    sessionStorage.setItem(
      'analyze:jobMeta',
      JSON.stringify({ location: job.location, remote: job.remote, salaryMin: job.salaryMin, salaryMax: job.salaryMax })
    );
    router.push(`/analyze?tab=match&jobTitle=${encodeURIComponent(job.title)}`);
  };

  const updateStatus = async (saved: SavedJob, status: SavedJobStatus) => {
    try {
      const updated = await api<SavedJob>(`/jobs/saved/${saved._id}`, { method: 'PATCH', body: { status } });
      setSavedJobs((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      if (status === 'applied') toast.success(t('jobsPage.toastMarkedApplied'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const removeSaved = async (saved: SavedJob) => {
    try {
      await api(`/jobs/saved/${saved._id}`, { method: 'DELETE' });
      setSavedJobs((prev) => prev.filter((s) => s._id !== saved._id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      await api('/jobs/preferences', { method: 'PUT', body: prefs });
      toast.success(t('jobsPage.toastPrefsSaved'));
      await loadJobs(1);
      setTab('recommended');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'recommended', label: t('jobsPage.tabRecommended'), icon: Sparkles },
    { id: 'saved', label: `${t('jobsPage.tabSaved')} (${savedJobs.length})`, icon: Bookmark },
    { id: 'preferences', label: t('jobsPage.tabPreferences'), icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('jobsPage.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('jobsPage.subtitle')}</p>
      </div>

      {sampleData && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/25 rounded-2xl px-4 py-3 mb-6 text-sm text-warning">
          <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <p>{t('jobsPage.sampleBanner')}</p>
        </div>
      )}

      {!hasProfile && (
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-6 text-sm text-foreground">
          <FileText className="w-5 h-5 shrink-0 mt-0.5 text-primary" aria-hidden />
          <div className="flex-1">
            <p>{t('jobsPage.noProfileBanner')}</p>
            <p className="text-xs text-primary mt-0.5">{t('jobsPage.noProfileBannerSub')}</p>
          </div>
          <Button size="sm" onClick={() => router.push('/resume')} className="shrink-0">
            {t('jobsPage.createResume')}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        ariaLabel={t('jobsPage.ariaJobSections')}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        className="mb-6 pb-1"
        items={tabs.map(({ id, label, icon }) => ({ value: id, label, icon }))}
      />

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <>
          {/* ---------- Recommended ---------- */}
          {tab === 'recommended' && (
            <div className="space-y-4">
              {/* Filters */}
              <Card padded={false} className="p-4">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" aria-hidden />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('jobsPage.searchPlaceholder')}
                      aria-label={t('jobsPage.searchPlaceholder')}
                      className="w-full ps-9 pe-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={countryFilter}
                      onChange={(e) => {
                        setCountryFilter(e.target.value as typeof countryFilter);
                        setRegionFilter('any');
                      }}
                      aria-label={t('jobsPage.anyCountry')}
                      className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="any">{t('jobsPage.anyCountry')}</option>
                      <option value="CA">{t('jobsPage.canada')}</option>
                      <option value="US">{t('jobsPage.unitedStates')}</option>
                    </select>
                    {countryFilter !== 'any' && regionOptions.length > 0 && (
                      <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        aria-label={countryFilter === 'CA' ? t('jobsPage.prefProvinces') : t('jobsPage.prefStates')}
                        className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="any">{countryFilter === 'CA' ? t('jobsPage.allProvinces') : t('jobsPage.allStates')}</option>
                        {regionOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      value={remoteFilter}
                      onChange={(e) => setRemoteFilter(e.target.value)}
                      aria-label={t('jobsPage.anyLocationType')}
                      className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="any">{t('jobsPage.anyLocationType')}</option>
                      <option value="remote">{t('jobsPage.remote')}</option>
                      <option value="hybrid">{t('jobsPage.hybrid')}</option>
                      <option value="onsite">{t('jobsPage.onsite')}</option>
                    </select>
                    <select
                      value={minMatch}
                      onChange={(e) => setMinMatch(Number(e.target.value))}
                      aria-label={t('jobsPage.anyMatch')}
                      className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={0}>{t('jobsPage.anyMatch')}</option>
                      <option value={50}>{t('jobsPage.matchPlus', { n: 50 })}</option>
                      <option value={70}>{t('jobsPage.matchPlus', { n: 70 })}</option>
                      <option value={85}>{t('jobsPage.matchPlus', { n: 85 })}</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      aria-label={t('jobsPage.sortBestMatch')}
                      className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="match">{t('jobsPage.sortBestMatch')}</option>
                      <option value="date">{t('jobsPage.sortNewest')}</option>
                      <option value="salary">{t('jobsPage.sortSalary')}</option>
                    </select>
                  </div>
                </div>
              </Card>

              {totalMatched > 0 && (
                <p className="text-xs text-muted-foreground px-1">
                  {t('jobsPage.pageOf', { page, totalPages, total: totalMatched.toLocaleString() })}
                </p>
              )}

              {jobsLoading ? (
                <div className="space-y-4">
                  {[...Array(PAGE_SIZE)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Briefcase className="w-6 h-6" />}
                    title={t('jobsPage.noJobsTitle')}
                    description={t('jobsPage.noJobsDescription')}
                    action={<Button variant="outline" onClick={() => setTab('preferences')}>{t('jobsPage.editPreferences')}</Button>}
                  />
                </Card>
              ) : (
                jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card hover padded={false} className="overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-semibold text-foreground">{job.title}</h3>
                              {job.isSampleData && <Badge tone="amber">{t('jobsPage.sampleBadge')}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="font-medium text-foreground">{job.company}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" aria-hidden /> {job.location}
                              </span>
                              {salaryText(job) && (
                                <span className="flex items-center gap-0.5">
                                  <DollarSign className="w-3.5 h-3.5" aria-hidden />
                                  {salaryText(job)}
                                </span>
                              )}
                              {job.postedAt && (
                                <span className="text-muted-foreground">
                                  {t('jobsPage.posted', { date: formatDate(job.postedAt) })}
                                </span>
                              )}
                              {job.source && <span className="text-muted-foreground">{t('jobsPage.via', { source: job.source })}</span>}
                            </p>
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              <Badge tone="slate">{job.remote}</Badge>
                              {job.workType && <Badge tone="slate">{job.workType}</Badge>}
                              {job.countries?.includes('CA') && <Badge tone="blue">🇨🇦 Canada</Badge>}
                              {job.countries?.includes('US') && <Badge tone="blue">🇺🇸 US</Badge>}
                              {(job.regions || []).slice(0, 3).map((r) => (
                                <Badge key={r} tone="slate">{r}</Badge>
                              ))}
                            </div>
                          </div>
                          {job.match ? (
                            <div className="text-center shrink-0">
                              <div
                                className="text-2xl font-bold"
                                style={{ color: job.match.percent >= 80 ? '#059669' : job.match.percent >= 60 ? '#2563eb' : job.match.percent >= 40 ? '#d97706' : '#dc2626' }}
                              >
                                {job.match.percent}%
                              </div>
                              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">match</div>
                            </div>
                          ) : (
                            <div className="text-center shrink-0 max-w-[7rem]">
                              <div className="text-lg font-bold text-border-strong">—</div>
                              <div className="text-[11px] text-muted-foreground leading-tight">{t('jobsPage.addResumeForScore')}</div>
                            </div>
                          )}
                        </div>

                        {/* Skills match */}
                        {job.match && (job.match.matchedSkills.length > 0 || job.match.missingSkills.length > 0) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {job.match.matchedSkills.slice(0, 6).map((s) => (
                              <Badge key={s} tone="green">✓ {s}</Badge>
                            ))}
                            {job.match.missingSkills.slice(0, 4).map((s) => (
                              <Badge key={s} tone="red">✗ {s}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Why this match */}
                        {job.match && job.match.reasons.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {job.match.reasons.map((r, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary/60 mt-0.5">•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Description toggle — fetched lazily on first expand */}
                        <button
                          onClick={() => toggleDescription(job)}
                          className="mt-3 text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition min-h-11"
                          aria-expanded={expandedJob === job.id}
                        >
                          {expandedJob === job.id ? t('jobsPage.hideDescription') : t('jobsPage.showDescription')}
                          <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', expandedJob === job.id && 'rotate-180')} aria-hidden />
                        </button>
                        <AnimatePresence>
                          {expandedJob === job.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              {descriptionLoading === job.id ? (
                                <div className="mt-2 space-y-2 bg-muted rounded-xl p-4">
                                  <Skeleton className="h-3.5 w-full" />
                                  <Skeleton className="h-3.5 w-5/6" />
                                  <Skeleton className="h-3.5 w-2/3" />
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line bg-muted rounded-xl p-4">
                                  {descriptions[job.id] || job.description}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Actions */}
                      <div className="px-5 py-3 bg-muted/50 border-t border-border flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Sparkles className="w-3.5 h-3.5" />}
                          onClick={() => setGuidedApplyJob(job)}
                        >
                          {t('jobsPage.guidedApply')}
                        </Button>
                        <Button
                          size="sm"
                          variant={savedIds.has(job.id) ? 'success' : 'outline'}
                          icon={savedIds.has(job.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          disabled={savedIds.has(job.id) || busyJob === job.id}
                          onClick={() => handleSave(job)}
                        >
                          {savedIds.has(job.id) ? t('jobsPage.saved') : t('jobsPage.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<FileText className="w-3.5 h-3.5" />}
                          loading={busyJob === job.id}
                          onClick={() => handleTailor(job)}
                        >
                          {t('jobsPage.tailorResume')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Sparkles className="w-3.5 h-3.5" />}
                          loading={busyJob === job.id}
                          onClick={() => openToolForJob(job, 'cover-letter')}
                        >
                          {t('jobsPage.coverLetter')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<MessagesSquare className="w-3.5 h-3.5" />}
                          loading={busyJob === job.id}
                          onClick={() => openToolForJob(job, 'interview-prep')}
                        >
                          {t('jobsPage.interviewPrep')}
                        </Button>
                        <Button size="sm" variant="ghost" loading={busyJob === job.id} onClick={() => handleAnalyzeAgainstJob(job)}>
                          {t('jobsPage.matchReport')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Building2 className="w-3.5 h-3.5" />}
                          onClick={() => setIntelCompany(job.company)}
                        >
                          {t('jobsPage.companyInfo')}
                        </Button>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-sm transition"
                          >
                            {t('jobsPage.applyOnSite')} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}

              {!jobsLoading && jobs.length > 0 && totalPages > 1 && (
                <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label={t('jobsPage.ariaJobResultsPages')}>
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                    {t('jobsPage.previous')}
                  </Button>
                  {paginationWindow(page, totalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p as number)}
                        aria-current={p === page ? 'page' : undefined}
                        className={clsx(
                          'min-w-11 min-h-11 rounded-lg text-sm font-medium transition',
                          p === page ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-surface-hover'
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                    {t('jobsPage.next')}
                  </Button>
                </nav>
              )}
            </div>
          )}

          {/* ---------- Saved & applied ---------- */}
          {tab === 'saved' && (
            <div className="space-y-4">
              {savedJobs.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Bookmark className="w-6 h-6" />}
                    title={t('jobsPage.noSavedTitle')}
                    description={t('jobsPage.noSavedDescription')}
                    action={<Button variant="outline" onClick={() => setTab('recommended')}>{t('jobsPage.browseJobs')}</Button>}
                  />
                </Card>
              ) : (
                savedJobs.map((saved) => {
                  const statusMeta = STATUS_OPTIONS.find((s) => s.value === saved.status) || STATUS_OPTIONS[0];
                  return (
                    <Card key={saved._id} padded={false} className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{saved.job.title}</h3>
                            <Badge tone={statusMeta.tone}>{t(statusMeta.labelKey)}</Badge>
                            {typeof saved.matchPercent === 'number' && (
                              <Badge tone={scoreTone(saved.matchPercent)}>{t('jobsPage.matchScoreLabel', { n: saved.matchPercent })}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {saved.job.company} · {saved.job.location}
                            {saved.appliedAt && ` · ${t('jobsPage.appliedOn', { date: formatDate(saved.appliedAt) })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="sr-only" htmlFor={`status-${saved._id}`}>
                            {t('jobsPage.applicationStatus')}
                          </label>
                          <select
                            id={`status-${saved._id}`}
                            value={saved.status}
                            onChange={(e) => updateStatus(saved, e.target.value as SavedJobStatus)}
                            className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {t(s.labelKey)}
                              </option>
                            ))}
                          </select>
                          {saved.job.url && (
                            <a
                              href={saved.job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t('jobsPage.openJobPosting')}
                              className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => removeSaved(saved)}
                            aria-label={t('jobsPage.removeSavedJob')}
                            className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Next-step AI actions matched to where the application is */}
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide me-1">{t('jobsPage.prepare')}</span>
                        {saved.status === 'saved' && (
                          <Button size="sm" variant="outline" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => openToolForJob(saved.job, 'cover-letter')}>
                            {t('jobsPage.coverLetter')}
                          </Button>
                        )}
                        {saved.status === 'applied' && (
                          <Button size="sm" variant="outline" onClick={() => openToolForJob(saved.job, 'follow-up-email')}>
                            {t('jobsPage.followUpEmail')}
                          </Button>
                        )}
                        {saved.status === 'interviewing' && (
                          <Button size="sm" variant="outline" onClick={() => openToolForJob(saved.job, 'thank-you-email')}>
                            {t('jobsPage.thankYouEmail')}
                          </Button>
                        )}
                        {(saved.status === 'saved' || saved.status === 'applied' || saved.status === 'interviewing') && (
                          <Button size="sm" variant="outline" icon={<MessagesSquare className="w-3.5 h-3.5" />} onClick={() => openToolForJob(saved.job, 'interview-prep')}>
                            {t('jobsPage.interviewPrep')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleAnalyzeAgainstJob(saved.job)}>
                          {t('jobsPage.matchReport')}
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Building2 className="w-3.5 h-3.5" />} onClick={() => setIntelCompany(saved.job.company)}>
                          {t('jobsPage.companyInfo')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<LayoutGrid className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/workspace/${saved._id}`)}
                        >
                          {t('workspacePage.openWorkspace')}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ---------- Preferences ---------- */}
          {tab === 'preferences' && (
            <div className="max-w-3xl space-y-6">
              <Card className="space-y-5">
                <div>
                  <h2 className="font-semibold text-foreground mb-1">{t('jobsPage.prefsTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('jobsPage.prefsSubtitle')}</p>
                </div>
                <TagInput
                  id="pref-titles"
                  label={t('jobsPage.prefTitles')}
                  values={prefs.titles}
                  onChange={(titles) => setPrefs((p) => ({ ...p, titles }))}
                  placeholder={t('jobsPage.prefTitlesPlaceholder')}
                />
                <TagInput
                  id="pref-skills"
                  label={t('jobsPage.prefSkills')}
                  values={prefs.skills}
                  onChange={(skills) => setPrefs((p) => ({ ...p, skills }))}
                  placeholder={t('jobsPage.prefSkillsPlaceholder')}
                  helper={t('jobsPage.prefSkillsHelper')}
                />
                <MultiSelect
                  id="pref-countries"
                  label={t('jobsPage.prefCountries')}
                  options={COUNTRY_OPTIONS}
                  values={prefs.countries}
                  onChange={(countries) => setPrefs((p) => ({ ...p, countries }))}
                  placeholder={t('jobsPage.prefCountriesPlaceholder')}
                  searchable={false}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  {prefs.countries.includes('CA') && (
                    <MultiSelect
                      id="pref-ca-provinces"
                      label={t('jobsPage.prefProvinces')}
                      options={CA_PROVINCE_OPTIONS}
                      values={prefs.caProvinces}
                      onChange={(caProvinces) => setPrefs((p) => ({ ...p, caProvinces }))}
                      placeholder={t('jobsPage.prefProvincesPlaceholder')}
                    />
                  )}
                  {prefs.countries.includes('US') && (
                    <MultiSelect
                      id="pref-us-states"
                      label={t('jobsPage.prefStates')}
                      options={US_STATE_OPTIONS}
                      values={prefs.usStates}
                      onChange={(usStates) => setPrefs((p) => ({ ...p, usStates }))}
                      placeholder={t('jobsPage.prefStatesPlaceholder')}
                    />
                  )}
                </div>
                <TagInput
                  id="pref-cities"
                  label={t('jobsPage.prefCities')}
                  values={prefs.cities}
                  onChange={(cities) => setPrefs((p) => ({ ...p, cities }))}
                  placeholder={t('jobsPage.prefCitiesPlaceholder')}
                  helper={t('jobsPage.prefCitiesHelper')}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pref-worktype" className="block text-sm font-medium text-foreground mb-1.5">
                      {t('jobsPage.prefWorkType')}
                    </label>
                    <select
                      id="pref-worktype"
                      value={prefs.workType}
                      onChange={(e) => setPrefs((p) => ({ ...p, workType: e.target.value as JobPreferences['workType'] }))}
                      className="w-full px-3 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="any">{t('jobsPage.workTypeAny')}</option>
                      <option value="full-time">{t('jobsPage.workTypeFullTime')}</option>
                      <option value="part-time">{t('jobsPage.workTypePartTime')}</option>
                      <option value="contract">{t('jobsPage.workTypeContract')}</option>
                      <option value="internship">{t('jobsPage.workTypeInternship')}</option>
                    </select>
                  </div>
                  <MultiSelect
                    id="pref-remote"
                    label={t('jobsPage.prefWorkStyle')}
                    options={WORK_STYLE_OPTIONS}
                    values={prefs.remoteTypes}
                    onChange={(remoteTypes) => setPrefs((p) => ({ ...p, remoteTypes: remoteTypes as JobPreferences['remoteTypes'] }))}
                    placeholder={t('jobsPage.prefWorkStylePlaceholder')}
                    searchable={false}
                  />
                  <div>
                    <label htmlFor="pref-salmin" className="block text-sm font-medium text-foreground mb-1.5">
                      {t('jobsPage.prefSalaryMin')}
                    </label>
                    <input
                      id="pref-salmin"
                      type="number"
                      min={0}
                      value={prefs.salaryMin ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, salaryMin: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="e.g. 70000"
                      className="w-full px-3 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="pref-salmax" className="block text-sm font-medium text-foreground mb-1.5">
                      {t('jobsPage.prefSalaryMax')}
                    </label>
                    <input
                      id="pref-salmax"
                      type="number"
                      min={0}
                      value={prefs.salaryMax ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, salaryMax: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="e.g. 110000"
                      className="w-full px-3 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" aria-hidden />
                  <h2 className="font-semibold text-foreground">{t('jobsPage.alertsTitle')}</h2>
                </div>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm text-foreground">
                    <span className="font-medium">{t('jobsPage.alertsInApp')}</span>
                    <span className="block text-xs text-muted-foreground">{t('jobsPage.alertsInAppHelper')}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.alertsEnabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, alertsEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded text-primary border-border-strong focus:ring-primary"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm text-foreground">
                    <span className="font-medium">{t('jobsPage.alertsEmail')}</span>
                    <span className="block text-xs text-muted-foreground">{t('jobsPage.alertsEmailHelper')}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.emailAlerts}
                    onChange={(e) => setPrefs((p) => ({ ...p, emailAlerts: e.target.checked }))}
                    className="w-5 h-5 rounded text-primary border-border-strong focus:ring-primary"
                  />
                </label>
                <div>
                  <label htmlFor="pref-threshold" className="block text-sm font-medium text-foreground mb-1.5">
                    {t('jobsPage.alertThresholdLabel')}{' '}
                    <span className="text-primary font-bold">{t('jobsPage.matchPlus', { n: prefs.alertThreshold })}</span>
                  </label>
                  <input
                    id="pref-threshold"
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={prefs.alertThreshold}
                    onChange={(e) => setPrefs((p) => ({ ...p, alertThreshold: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                </div>
              </Card>

              <Button loading={savingPrefs} onClick={savePreferences} size="lg">
                {t('jobsPage.savePreferences')}
              </Button>
            </div>
          )}
        </>
      )}

      <CompanyIntelligencePanel company={intelCompany} onClose={() => setIntelCompany(null)} />

      <GuidedApplyFlow
        job={guidedApplyJob}
        resumes={resumes}
        defaultResumeId={resumeId}
        getFullDescription={getFullDescription}
        onClose={() => setGuidedApplyJob(null)}
        onSaved={(saved) => setSavedJobs((prev) => [saved, ...prev.filter((s) => s._id !== saved._id)])}
      />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-10"><Skeleton className="h-96" /></div>}>
      <JobsContent />
    </Suspense>
  );
}
