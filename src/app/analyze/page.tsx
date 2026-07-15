'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  ScanSearch,
  Briefcase,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  History,
  FileText,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { scoreTone } from '@/components/ui/Badge';
import ScoreRing, { useScoreLabel } from '@/components/ui/ScoreRing';
import ScoreBar from '@/components/ui/ScoreBar';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import ImportResumeButton from '@/components/ImportResumeButton';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  SCAN_CATEGORY_LABELS,
  type ResumeRecord,
  type ScanResult,
  type JobMatchResult,
  type ScanHistoryItem,
  type ScanCategoryKey,
  type ImportResumeResult,
  type AtsPreviewResult,
} from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

type Tab = 'scan' | 'match' | 'ats';

interface PendingJobMeta {
  location?: string;
  remote?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatDate } = useLocale();
  const getScoreLabel = useScoreLabel();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'scan');
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [expanded, setExpanded] = useState<ScanCategoryKey | null>(null);

  // Job match state
  const [jobTitle, setJobTitle] = useState(searchParams.get('jobTitle') || '');
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<JobMatchResult | null>(null);
  const [jobMeta, setJobMeta] = useState<PendingJobMeta>({});

  // ATS preview state
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsPreview, setAtsPreview] = useState<AtsPreviewResult | null>(null);

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [importInfo, setImportInfo] = useState<ImportResumeResult | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/analyze');
      return;
    }
    const load = async () => {
      const [resumesRes, historyRes] = await Promise.allSettled([
        api<ResumeRecord[]>('/resume/resumes'),
        api<ScanHistoryItem[]>('/analysis/history'),
      ]);
      if (resumesRes.status === 'fulfilled') {
        setResumes(resumesRes.value);
        const fromUrl = searchParams.get('resumeId');
        if (fromUrl && resumesRes.value.some((r) => r._id === fromUrl)) setSelectedResume(fromUrl);
        else if (resumesRes.value.length > 0) setSelectedResume(resumesRes.value[0]._id);
      }
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value);
      setLoading(false);
    };
    load();
    // Pre-fill JD when arriving from the jobs page ("Tailor" flow)
    const jd = sessionStorage.getItem('analyze:jobDescription');
    if (jd) {
      setJobDescription(jd);
      setTab('match');
      sessionStorage.removeItem('analyze:jobDescription');
    }
    // Structured metadata from a live job card enables location/remote/salary sub-scores.
    const metaRaw = sessionStorage.getItem('analyze:jobMeta');
    if (metaRaw) {
      try {
        setJobMeta(JSON.parse(metaRaw));
      } catch {
        /* ignore malformed */
      }
      sessionStorage.removeItem('analyze:jobMeta');
    }
  }, [router, searchParams]);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await api<ScanHistoryItem[]>('/analysis/history'));
    } catch {
      /* non-critical */
    }
  }, []);

  const runScan = async (resumeIdOverride?: string) => {
    const resumeId = resumeIdOverride || selectedResume;
    if (!resumeId) {
      toast.info(t('analyzePage.toastCreateResumeScan'));
      return;
    }
    setScanning(true);
    setScan(null);
    try {
      const result = await api<ScanResult>('/analysis/scan', {
        method: 'POST',
        body: { resumeId },
      });
      setScan(result);
      setExpanded(null);
      refreshHistory();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('analyzePage.toastScanFailed')));
    } finally {
      setScanning(false);
    }
  };

  // Uploaded PDF/DOCX was parsed into a new resume — select it, surface what
  // was detected, and score it right away.
  const handleImported = (result: ImportResumeResult) => {
    setResumes((prev) => [result.resume, ...prev]);
    setSelectedResume(result.resume._id);
    setImportInfo(result);
    setTab('scan');
    runScan(result.resume._id);
  };

  const runMatch = async () => {
    if (!selectedResume) {
      toast.info(t('analyzePage.toastCreateResumeFirst'));
      return;
    }
    if (jobDescription.trim().length < 60) {
      toast.info(t('analyzePage.toastPasteJD'));
      return;
    }
    setMatching(true);
    setMatch(null);
    try {
      const result = await api<JobMatchResult>('/analysis/job-match', {
        method: 'POST',
        body: {
          resumeId: selectedResume,
          jobDescription,
          jobTitle,
          jobLocation: jobMeta.location || '',
          jobRemote: jobMeta.remote || '',
          jobSalaryMin: jobMeta.salaryMin ?? null,
          jobSalaryMax: jobMeta.salaryMax ?? null,
        },
      });
      setMatch(result);
      refreshHistory();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('analyzePage.toastCompareFailed')));
    } finally {
      setMatching(false);
    }
  };

  const runAtsPreview = async () => {
    if (!selectedResume) {
      toast.info(t('analyzePage.toastCreateResumeFirst'));
      return;
    }
    setAtsLoading(true);
    setAtsPreview(null);
    try {
      const result = await api<AtsPreviewResult>('/analysis/ats-preview', {
        method: 'POST',
        body: { resumeId: selectedResume },
      });
      setAtsPreview(result);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('analyzePage.toastAtsFailed')));
    } finally {
      setAtsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-9 w-72 mb-8" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('analyzePage.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-2xl">{t('analyzePage.subtitle')}</p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={t('analyzePage.startTitle')}
            description={t('analyzePage.startDesc')}
            action={
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                <ImportResumeButton variant="primary" onImported={handleImported} />
                <Button variant="outline" onClick={() => router.push('/resume')}>
                  {t('analyzePage.createFromScratch')}
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label htmlFor="resumeSelect" className="block text-sm font-medium text-foreground mb-1.5">
                    {t('analyzePage.resumeToAnalyze')}
                  </label>
                  <select
                    id="resumeSelect"
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.title || r.data?.fullName || t('analyzePage.untitledResume')}
                      </option>
                    ))}
                  </select>
                </div>
                <Tabs
                  ariaLabel={t('analyzePage.ariaAnalysisType')}
                  value={tab}
                  onChange={(v) => setTab(v as Tab)}
                  className="rounded-xl border border-border p-1 bg-muted"
                  items={[
                    { value: 'scan', label: t('analyzePage.tabScan'), icon: ScanSearch },
                    { value: 'match', label: t('analyzePage.tabMatch'), icon: Briefcase },
                    { value: 'ats', label: t('analyzePage.tabAts'), icon: FileText },
                  ]}
                />
              </div>

              {tab === 'match' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-foreground mb-1.5">
                      {t('analyzePage.jobTitleLabel')} <span className="text-muted-foreground font-normal">{t('analyzePage.optional')}</span>
                    </label>
                    <input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t('analyzePage.jobTitlePlaceholder')}
                      className="w-full px-3.5 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="jobDescription" className="block text-sm font-medium text-foreground mb-1.5">
                      {t('analyzePage.jobDescriptionLabel')}
                    </label>
                    <textarea
                      id="jobDescription"
                      rows={7}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder={t('analyzePage.jobDescriptionPlaceholder')}
                      className="w-full px-3.5 py-2.5 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
                {tab === 'scan' && (
                  <Button icon={<ScanSearch className="w-4 h-4" />} loading={scanning} onClick={() => runScan()} size="lg">
                    {scanning ? t('analyzePage.scanning') : t('analyzePage.scanButton')}
                  </Button>
                )}
                {tab === 'match' && (
                  <Button icon={<Briefcase className="w-4 h-4" />} loading={matching} onClick={runMatch} size="lg">
                    {matching ? t('analyzePage.comparing') : t('analyzePage.compareButton')}
                  </Button>
                )}
                {tab === 'ats' && (
                  <Button icon={<FileText className="w-4 h-4" />} loading={atsLoading} onClick={runAtsPreview} size="lg">
                    {atsLoading ? t('analyzePage.analyzing') : t('analyzePage.atsButton')}
                  </Button>
                )}
                <ImportResumeButton onImported={handleImported} label={t('analyzePage.importAnother')} />
              </div>
            </Card>

            {/* Import review notice */}
            {importInfo && selectedResume === importInfo.resume._id && (
              <Card className="border-primary/20 bg-primary/5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" aria-hidden />
                      {t('analyzePage.importedTitle', { title: importInfo.resume.title || t('analyzePage.resumeFallback') })}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('analyzePage.detectedText', {
                        pct: importInfo.confidence,
                        aiSuffix: importInfo.aiUsed ? t('analyzePage.aiAssistedSuffix') : '',
                      })}
                    </p>
                    {importInfo.warnings.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {importInfo.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" aria-hidden />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/resume/edit/${importInfo.resume._id}`)}>
                    {t('analyzePage.reviewInBuilder')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                  </Button>
                </div>
              </Card>
            )}

            {/* ---------- Scan results ---------- */}
            <AnimatePresence>
              {tab === 'scan' && scan && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <Card>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ScoreRing score={scan.overall} size={150} />
                      <div className="flex-1 text-center sm:text-start">
                        <h2 className="text-xl font-bold text-foreground">
                          {t('analyzePage.scoresHeadline', { score: scan.overall, label: getScoreLabel(scan.overall).toLowerCase() })}
                        </h2>
                        {scan.strengths.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {scan.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground justify-center sm:justify-start">
                                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" aria-hidden />
                                {s}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Category breakdown */}
                  <Card>
                    <h3 className="font-semibold text-foreground mb-4">{t('analyzePage.categoryBreakdown')}</h3>
                    <div className="space-y-2">
                      {scan.categories.map((cat) => (
                        <div key={cat.key} className="border border-border rounded-xl">
                          <button
                            onClick={() => setExpanded(expanded === cat.key ? null : cat.key)}
                            aria-expanded={expanded === cat.key}
                            className="w-full px-4 py-3 text-start min-h-11"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <ScoreBar label={SCAN_CATEGORY_LABELS[cat.key] || cat.key} score={cat.score} />
                              </div>
                              <ChevronDown
                                className={clsx('w-4 h-4 text-muted-foreground transition-transform shrink-0', expanded === cat.key && 'rotate-180')}
                                aria-hidden
                              />
                            </div>
                          </button>
                          <AnimatePresence>
                            {expanded === cat.key && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 border-t border-border">
                                  <p className="text-sm text-muted-foreground mb-3">{cat.explanation}</p>
                                  {cat.suggestions.length > 0 ? (
                                    <ul className="space-y-2">
                                      {cat.suggestions.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                          <Lightbulb className="w-4 h-4 text-warning mt-0.5 shrink-0" aria-hidden />
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-success flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4" aria-hidden /> {t('analyzePage.lookingGreat')}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Top fixes */}
                  {scan.topFixes.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" aria-hidden /> {t('analyzePage.fixTheseFirst')}
                      </h3>
                      <ol className="space-y-2.5 list-none">
                        {scan.topFixes.map((fix, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                            <span className="w-5 h-5 rounded-full bg-warning/15 text-warning text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {fix}
                          </li>
                        ))}
                      </ol>
                      <Button className="mt-4" variant="outline" size="sm" onClick={() => router.push(selectedResume ? `/resume/edit/${selectedResume}` : '/resume')}>
                        {t('analyzePage.openInBuilder')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
                      </Button>
                    </Card>
                  )}

                  {/* Language findings */}
                  {scan.languageFindings.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.languageCheck')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('analyzePage.languageCheckDesc')}</p>
                      <div className="space-y-2.5">
                        {scan.languageFindings.map((f, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <Badge
                              tone={f.type === 'spelling' ? 'red' : f.type === 'weak' ? 'amber' : f.type === 'passive' ? 'purple' : 'slate'}
                              className="shrink-0 mt-0.5"
                            >
                              {f.type}
                            </Badge>
                            <div>
                              <span className="font-medium text-foreground">“{f.term}”</span>
                              {f.count > 1 && <span className="text-muted-foreground"> ×{f.count}</span>}
                              <p className="text-muted-foreground">{f.advice}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Action verbs */}
                  {scan.actionVerbSuggestions.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" aria-hidden /> {t('analyzePage.strongActionVerbs')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {scan.actionVerbSuggestions.map((v) => (
                          <span key={v} className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-medium">
                            {v}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ---------- Job match results ---------- */}
              {tab === 'match' && match && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <Card>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ScoreRing score={match.matchPercent} size={150} label={t('analyzePage.matchLabel')} />
                      <div className="flex-1 text-center sm:text-start">
                        <h2 className="text-xl font-bold text-foreground">
                          {t('analyzePage.matchHeadline', {
                            percent: match.matchPercent,
                            titleSuffix: match.jobTitle ? ` — ${match.jobTitle}` : '',
                          })}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">{match.summary}</p>
                      </div>
                    </div>
                  </Card>

                  {match.subScores && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.qualificationBreakdown')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(
                          Object.entries(match.subScores) as [string, number][]
                        ).map(([key, value]) => (
                          <div key={key} className="border border-border rounded-xl p-3">
                            <p className="text-xs text-muted-foreground capitalize mb-1">{key}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${value}%`,
                                    backgroundColor: value >= 75 ? '#059669' : value >= 50 ? '#2563eb' : '#d97706',
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-foreground">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  <div className="grid sm:grid-cols-2 gap-6">
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.alreadyMatch')}</h3>
                      {match.matchedSkills.length + match.matchedKeywords.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('analyzePage.noDirectMatches')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {match.matchedSkills.map((s) => (
                            <Badge key={`s-${s}`} tone="green">{s}</Badge>
                          ))}
                          {match.matchedKeywords.slice(0, 10).map((k) => (
                            <Badge key={`k-${k}`} tone="blue">{k}</Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.missingFromResume')}</h3>
                      {match.missingSkills.length + match.missingKeywords.length === 0 ? (
                        <p className="text-sm text-success">{t('analyzePage.nothingMissing')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {match.missingSkills.map((s) => (
                            <Badge key={`ms-${s}`} tone="red">{s}</Badge>
                          ))}
                          {match.missingKeywords.slice(0, 10).map((k) => (
                            <Badge key={`mk-${k}`} tone="amber">{k}</Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  {match.missingQualifications.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" aria-hidden /> {t('analyzePage.requirementsToAddress')}
                      </h3>
                      <ul className="space-y-2">
                        {match.missingQualifications.map((q, i) => (
                          <li key={i} className="text-sm text-foreground ps-3 border-s-2 border-warning/40">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {match.keywordPlan.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.keywordPlanTitle')}</h3>
                      <ul className="space-y-2.5">
                        {match.keywordPlan.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <Lightbulb className="w-4 h-4 text-warning mt-0.5 shrink-0" aria-hidden />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {match.bulletRewrites.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" aria-hidden /> {t('analyzePage.bulletRewritesTitle')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('analyzePage.bulletRewritesDesc')}</p>
                      <div className="space-y-4">
                        {match.bulletRewrites.map((rw, i) => (
                          <div key={i} className="border border-border rounded-xl p-4">
                            <p className="text-sm text-muted-foreground line-through decoration-muted-foreground">{rw.original}</p>
                            {rw.improved && (
                              <p className="text-sm font-medium text-foreground mt-2 bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                                {rw.improved}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">{rw.reason}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {match.evidenceMap && match.evidenceMap.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-1">{t('analyzePage.evidenceMapTitle')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('analyzePage.evidenceMapDesc')}</p>
                      <div className="space-y-2">
                        {match.evidenceMap.map((e, i) => (
                          <div key={i} className="flex items-start gap-3 border border-border rounded-xl p-3">
                            <Badge tone={e.status === 'matched' ? 'green' : 'red'} className="shrink-0 mt-0.5">
                              {e.status === 'matched' ? '✓' : '✗'}
                            </Badge>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{e.requirement}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {e.evidence ? t('analyzePage.evidenceText', { evidence: e.evidence }) : t('analyzePage.notFoundText')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ---------- ATS Preview results ---------- */}
              {tab === 'ats' && atsPreview && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <Card>
                    <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.recruiterFirstImpression')}</h3>
                    <div className="space-y-1.5 text-sm text-foreground">
                      <p><span className="text-muted-foreground">{t('analyzePage.nameLabel')}</span> {atsPreview.recruiterFirstImpression.name}</p>
                      <p><span className="text-muted-foreground">{t('analyzePage.headlineLabel2')}</span> {atsPreview.recruiterFirstImpression.headline || '—'}</p>
                      {atsPreview.recruiterFirstImpression.mostRecentRole && (
                        <p><span className="text-muted-foreground">{t('analyzePage.mostRecentRoleLabel')}</span> {atsPreview.recruiterFirstImpression.mostRecentRole}</p>
                      )}
                    </div>
                    {atsPreview.recruiterFirstImpression.topBullets.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {atsPreview.recruiterFirstImpression.topBullets.map((b, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" aria-hidden /> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {atsPreview.recruiterFirstImpression.topSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {atsPreview.recruiterFirstImpression.topSkills.map((s) => (
                          <Badge key={s} tone="blue">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>

                  {atsPreview.flags.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" aria-hidden /> {t('analyzePage.formattingRisks')}
                      </h3>
                      <div className="space-y-2">
                        {atsPreview.flags.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Badge tone={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'slate'} className="shrink-0 mt-0.5">
                              {f.severity}
                            </Badge>
                            <p className="text-foreground">{f.message}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  <Card>
                    <h3 className="font-semibold text-foreground mb-3">{t('analyzePage.atsExtractsTitle')}</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto thin-scrollbar">
                      {atsPreview.sections.map((s, i) => (
                        <div key={i} className="border border-border rounded-xl p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History sidebar */}
          <Card padded={false} className="lg:sticky lg:top-20">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" aria-hidden />
              <h2 className="font-semibold text-foreground">{t('analyzePage.scanHistoryTitle')}</h2>
            </div>
            {history.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">{t('analyzePage.noHistoryText')}</p>
            ) : (
              <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto thin-scrollbar">
                {history.map((h) => (
                  <li key={h._id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {h.type === 'scan' ? t('analyzePage.resumeScanLabel') : h.jobTitle || t('analyzePage.jobMatchFallback')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge tone={scoreTone(h.overall ?? h.matchPercent ?? 0)}>
                      {h.type === 'scan' ? `${h.overall}` : `${h.matchPercent}%`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-5 py-3 border-t border-border">
              <Link href="/tools" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                {t('analyzePage.generateCoverLetter')} <ArrowRight className="w-3.5 h-3.5 rtl-flip" />
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-10"><Skeleton className="h-96" /></div>}>
      <AnalyzeContent />
    </Suspense>
  );
}
