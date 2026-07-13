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
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import TagInput from '@/components/ui/TagInput';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  DEFAULT_JOB_PREFERENCES,
  type Job,
  type JobPreferences,
  type SavedJob,
  type SavedJobStatus,
} from '@/lib/types';

type Tab = 'recommended' | 'saved' | 'preferences';

const CA_PROVINCES = new Set([
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon',
]);

const STATUS_OPTIONS: { value: SavedJobStatus; label: string; tone: 'slate' | 'blue' | 'purple' | 'green' | 'red' }[] = [
  { value: 'saved', label: 'Saved', tone: 'slate' },
  { value: 'applied', label: 'Applied', tone: 'blue' },
  { value: 'interviewing', label: 'Interviewing', tone: 'purple' },
  { value: 'offer', label: 'Offer 🎉', tone: 'green' },
  { value: 'rejected', label: 'Rejected', tone: 'red' },
];

function salaryText(job: Job): string | null {
  if (!job.salaryMin && !job.salaryMax) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
  return fmt((job.salaryMin || job.salaryMax) as number);
}

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'recommended');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalMatched, setTotalMatched] = useState(0);
  const [sampleData, setSampleData] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [prefs, setPrefs] = useState<JobPreferences>({ ...DEFAULT_JOB_PREFERENCES });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('any');
  const [countryFilter, setCountryFilter] = useState<'any' | 'CA' | 'US'>('any');
  const [regionFilter, setRegionFilter] = useState('any');
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState<'match' | 'date' | 'salary'>('match');

  const load = useCallback(async () => {
    const [recRes, savedRes] = await Promise.allSettled([
      api<{ jobs: Job[]; totalMatched?: number; sampleData: boolean; resumeId: string | null; preferences: Partial<JobPreferences> }>(
        '/jobs/recommended'
      ),
      api<SavedJob[]>('/jobs/saved'),
    ]);
    if (recRes.status === 'fulfilled') {
      setJobs(recRes.value.jobs || []);
      setTotalMatched(recRes.value.totalMatched ?? (recRes.value.jobs || []).length);
      setSampleData(!!recRes.value.sampleData);
      setResumeId(recRes.value.resumeId);
      setPrefs({ ...DEFAULT_JOB_PREFERENCES, ...(recRes.value.preferences || {}) });
    } else {
      toast.error(apiErrorMessage(recRes.reason, 'Could not load jobs — is the backend up to date?'));
    }
    if (savedRes.status === 'fulfilled') setSavedJobs(savedRes.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/jobs');
      return;
    }
    load();
  }, [router, load]);

  const savedIds = useMemo(() => new Set(savedJobs.map((s) => s.job?.id)), [savedJobs]);

  // Provinces/states available for the selected country, from the loaded jobs.
  // Dual-country postings carry regions from both sides, so keep only the
  // regions that actually belong to the selected country.
  const regionOptions = useMemo(() => {
    if (countryFilter === 'any') return [];
    const set = new Set<string>();
    for (const j of jobs) {
      if (!j.countries?.includes(countryFilter)) continue;
      for (const r of j.regions || []) {
        const isProvince = CA_PROVINCES.has(r);
        if ((countryFilter === 'CA') === isProvince) set.add(r);
      }
    }
    return [...set].sort();
  }, [jobs, countryFilter]);

  const filteredJobs = useMemo(() => {
    let list = jobs.filter((j) => {
      if (query) {
        const q = query.toLowerCase();
        if (!`${j.title} ${j.company} ${j.location} ${j.skills.join(' ')}`.toLowerCase().includes(q)) return false;
      }
      if (remoteFilter !== 'any' && j.remote !== remoteFilter) return false;
      if (countryFilter !== 'any' && !j.countries?.includes(countryFilter)) return false;
      if (regionFilter !== 'any' && !j.regions?.includes(regionFilter)) return false;
      if ((j.match?.percent ?? 0) < minMatch) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'match') return (b.match?.percent ?? 0) - (a.match?.percent ?? 0);
      if (sortBy === 'salary') return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
      return new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime();
    });
    return list;
  }, [jobs, query, remoteFilter, countryFilter, regionFilter, minMatch, sortBy]);

  const handleSave = async (job: Job) => {
    setBusyJob(job.id);
    try {
      const saved = await api<SavedJob>('/jobs/save', {
        method: 'POST',
        body: { job: { ...job, match: undefined }, matchPercent: job.match?.percent ?? null },
      });
      setSavedJobs((prev) => [saved, ...prev.filter((s) => s._id !== saved._id)]);
      toast.success('Job saved');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyJob(null);
    }
  };

  const handleTailor = async (job: Job) => {
    if (!resumeId) {
      toast.info('Create a resume first, then tailor it for jobs.');
      return;
    }
    setBusyJob(job.id);
    try {
      const copy = await api<{ _id: string }>(`/resume/duplicate/${resumeId}`, {
        method: 'POST',
        body: { title: `${job.title} @ ${job.company}` },
      });
      toast.success('Created a tailored copy — edit it for this job.');
      router.push(`/resume/edit/${copy._id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusyJob(null);
    }
  };

  // Hand a job's context to the AI tools page (cover letter, interview prep, …).
  const openToolForJob = (job: Job, tool: 'cover-letter' | 'interview-prep' | 'follow-up-email' | 'thank-you-email') => {
    sessionStorage.setItem(
      'tools:jobContext',
      JSON.stringify({ jobTitle: job.title, company: job.company, jobDescription: job.description })
    );
    router.push(`/tools?tool=${tool}`);
  };

  const handleAnalyzeAgainstJob = (job: Job) => {
    sessionStorage.setItem('analyze:jobDescription', job.description);
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
      if (status === 'applied') toast.success('Marked as applied — good luck! 🍀');
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
      toast.success('Preferences saved — recommendations updated.');
      setLoading(true);
      await load();
      setTab('recommended');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'recommended', label: 'Recommended', icon: Sparkles },
    { id: 'saved', label: `Saved & Applied (${savedJobs.length})`, icon: Bookmark },
    { id: 'preferences', label: 'Preferences & Alerts', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Discovery</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Jobs scored against your resume and preferences — with the exact skills you match and miss.
        </p>
      </div>

      {sampleData && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-sm text-amber-800">
          <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <p>
            <strong>Development data:</strong> these are realistic sample jobs. Connect a live feed
            (Greenhouse/Lever company boards via <code className="font-mono text-xs">GREENHOUSE_BOARDS</code> /{' '}
            <code className="font-mono text-xs">LEVER_COMPANIES</code>) to see real postings.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" role="tablist" aria-label="Job sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition',
              tab === id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            )}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

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
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search title, company, skill…"
                      aria-label="Search jobs"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={countryFilter}
                      onChange={(e) => {
                        setCountryFilter(e.target.value as typeof countryFilter);
                        setRegionFilter('any');
                      }}
                      aria-label="Filter by country"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any">🌎 US & Canada</option>
                      <option value="CA">🇨🇦 Canada</option>
                      <option value="US">🇺🇸 United States</option>
                    </select>
                    {countryFilter !== 'any' && regionOptions.length > 0 && (
                      <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        aria-label={countryFilter === 'CA' ? 'Filter by province' : 'Filter by state'}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="any">{countryFilter === 'CA' ? 'All provinces' : 'All states'}</option>
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
                      aria-label="Filter by work style"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any">Any location type</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                    <select
                      value={minMatch}
                      onChange={(e) => setMinMatch(Number(e.target.value))}
                      aria-label="Minimum match"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Any match</option>
                      <option value={50}>50%+ match</option>
                      <option value={70}>70%+ match</option>
                      <option value={85}>85%+ match</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      aria-label="Sort jobs"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="match">Best match</option>
                      <option value="date">Newest</option>
                      <option value="salary">Highest salary</option>
                    </select>
                  </div>
                </div>
              </Card>

              {totalMatched > jobs.length && (
                <p className="text-xs text-slate-500 px-1">
                  Showing your top {jobs.length} matches from {totalMatched.toLocaleString()} live postings.
                </p>
              )}

              {filteredJobs.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Briefcase className="w-6 h-6" />}
                    title="No jobs match your filters"
                    description="Try loosening the filters, or update your preferences so we can find better matches."
                    action={<Button variant="outline" onClick={() => setTab('preferences')}>Edit preferences</Button>}
                  />
                </Card>
              ) : (
                filteredJobs.map((job, i) => (
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
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900">{job.title}</h3>
                              {job.isSampleData && <Badge tone="amber">sample</Badge>}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="font-medium text-slate-700">{job.company}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" aria-hidden /> {job.location}
                              </span>
                              {salaryText(job) && (
                                <span className="flex items-center gap-0.5">
                                  <DollarSign className="w-3.5 h-3.5" aria-hidden />
                                  {salaryText(job)}
                                </span>
                              )}
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
                          {job.match && (
                            <div className="text-center shrink-0">
                              <div
                                className="text-2xl font-bold"
                                style={{ color: job.match.percent >= 80 ? '#059669' : job.match.percent >= 60 ? '#2563eb' : job.match.percent >= 40 ? '#d97706' : '#dc2626' }}
                              >
                                {job.match.percent}%
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">match</div>
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
                              <li key={j} className="text-xs text-slate-500 flex items-start gap-1.5">
                                <span className="text-blue-400 mt-0.5">•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Description toggle */}
                        <button
                          onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                          className="mt-3 text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition"
                          aria-expanded={expandedJob === job.id}
                        >
                          {expandedJob === job.id ? 'Hide' : 'Show'} description
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
                              <p className="mt-2 text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-xl p-4">
                                {job.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Actions */}
                      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={savedIds.has(job.id) ? 'success' : 'outline'}
                          icon={savedIds.has(job.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          disabled={savedIds.has(job.id) || busyJob === job.id}
                          onClick={() => handleSave(job)}
                        >
                          {savedIds.has(job.id) ? 'Saved' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<FileText className="w-3.5 h-3.5" />}
                          loading={busyJob === job.id}
                          onClick={() => handleTailor(job)}
                        >
                          Tailor resume
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Sparkles className="w-3.5 h-3.5" />}
                          onClick={() => openToolForJob(job, 'cover-letter')}
                        >
                          Cover letter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<MessagesSquare className="w-3.5 h-3.5" />}
                          onClick={() => openToolForJob(job, 'interview-prep')}
                        >
                          Interview prep
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAnalyzeAgainstJob(job)}>
                          Full match report
                        </Button>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            Apply on company site <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
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
                    title="No saved jobs yet"
                    description="Save jobs from the Recommended tab to track your applications here."
                    action={<Button variant="outline" onClick={() => setTab('recommended')}>Browse jobs</Button>}
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
                            <h3 className="font-semibold text-slate-900">{saved.job.title}</h3>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                            {typeof saved.matchPercent === 'number' && (
                              <Badge tone={scoreTone(saved.matchPercent)}>{saved.matchPercent}% match</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {saved.job.company} · {saved.job.location}
                            {saved.appliedAt &&
                              ` · applied ${new Date(saved.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="sr-only" htmlFor={`status-${saved._id}`}>
                            Application status
                          </label>
                          <select
                            id={`status-${saved._id}`}
                            value={saved.status}
                            onChange={(e) => updateStatus(saved, e.target.value as SavedJobStatus)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          {saved.job.url && (
                            <a
                              href={saved.job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open job posting"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => removeSaved(saved)}
                            aria-label="Remove saved job"
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Next-step AI actions matched to where the application is */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide mr-1">Prepare</span>
                        {saved.status === 'saved' && (
                          <Button size="sm" variant="outline" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => openToolForJob(saved.job, 'cover-letter')}>
                            Cover letter
                          </Button>
                        )}
                        {saved.status === 'applied' && (
                          <Button size="sm" variant="outline" onClick={() => openToolForJob(saved.job, 'follow-up-email')}>
                            Follow-up email
                          </Button>
                        )}
                        {saved.status === 'interviewing' && (
                          <Button size="sm" variant="outline" onClick={() => openToolForJob(saved.job, 'thank-you-email')}>
                            Thank-you email
                          </Button>
                        )}
                        {(saved.status === 'saved' || saved.status === 'applied' || saved.status === 'interviewing') && (
                          <Button size="sm" variant="outline" icon={<MessagesSquare className="w-3.5 h-3.5" />} onClick={() => openToolForJob(saved.job, 'interview-prep')}>
                            Interview prep
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleAnalyzeAgainstJob(saved.job)}>
                          Match report
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
                  <h2 className="font-semibold text-slate-900 mb-1">Job preferences</h2>
                  <p className="text-sm text-slate-500">
                    These shape your recommendations and match scores alongside your resume content.
                  </p>
                </div>
                <TagInput
                  id="pref-titles"
                  label="Preferred job titles"
                  values={prefs.titles}
                  onChange={(titles) => setPrefs((p) => ({ ...p, titles }))}
                  placeholder="e.g. Frontend Developer — press Enter to add"
                />
                <TagInput
                  id="pref-skills"
                  label="Key skills"
                  values={prefs.skills}
                  onChange={(skills) => setPrefs((p) => ({ ...p, skills }))}
                  placeholder="e.g. React, SQL, project management"
                  helper="Skills from your resume are matched automatically — add extras here."
                />
                <TagInput
                  id="pref-locations"
                  label="Preferred locations"
                  values={prefs.locations}
                  onChange={(locations) => setPrefs((p) => ({ ...p, locations }))}
                  placeholder="e.g. Toronto, Vancouver"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pref-worktype" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Work type
                    </label>
                    <select
                      id="pref-worktype"
                      value={prefs.workType}
                      onChange={(e) => setPrefs((p) => ({ ...p, workType: e.target.value as JobPreferences['workType'] }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any">Any</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-remote" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Remote preference
                    </label>
                    <select
                      id="pref-remote"
                      value={prefs.remote}
                      onChange={(e) => setPrefs((p) => ({ ...p, remote: e.target.value as JobPreferences['remote'] }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any">Any</option>
                      <option value="remote">Remote only</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-salmin" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Minimum salary ($/yr)
                    </label>
                    <input
                      id="pref-salmin"
                      type="number"
                      min={0}
                      value={prefs.salaryMin ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, salaryMin: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="e.g. 70000"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="pref-salmax" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Target salary ($/yr)
                    </label>
                    <input
                      id="pref-salmax"
                      type="number"
                      min={0}
                      value={prefs.salaryMax ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, salaryMax: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="e.g. 110000"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" aria-hidden />
                  <h2 className="font-semibold text-slate-900">Job alerts</h2>
                </div>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm text-slate-700">
                    <span className="font-medium">In-app notifications</span>
                    <span className="block text-xs text-slate-500">Get notified when a new job strongly matches your resume.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.alertsEnabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, alertsEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm text-slate-700">
                    <span className="font-medium">Email alerts</span>
                    <span className="block text-xs text-slate-500">
                      Also send strong matches by email (requires email provider configured on the server).
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.emailAlerts}
                    onChange={(e) => setPrefs((p) => ({ ...p, emailAlerts: e.target.checked }))}
                    className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </label>
                <div>
                  <label htmlFor="pref-threshold" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Alert threshold: <span className="text-blue-600 font-bold">{prefs.alertThreshold}%+ match</span>
                  </label>
                  <input
                    id="pref-threshold"
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={prefs.alertThreshold}
                    onChange={(e) => setPrefs((p) => ({ ...p, alertThreshold: Number(e.target.value) }))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </Card>

              <Button loading={savingPrefs} onClick={savePreferences} size="lg">
                Save preferences
              </Button>
            </div>
          )}
        </>
      )}
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
