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
import ScoreRing, { scoreLabel } from '@/components/ui/ScoreRing';
import ScoreBar from '@/components/ui/ScoreBar';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  SCAN_CATEGORY_LABELS,
  type ResumeRecord,
  type ScanResult,
  type JobMatchResult,
  type ScanHistoryItem,
  type ScanCategoryKey,
} from '@/lib/types';

type Tab = 'scan' | 'match';

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

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
  }, [router, searchParams]);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await api<ScanHistoryItem[]>('/analysis/history'));
    } catch {
      /* non-critical */
    }
  }, []);

  const runScan = async () => {
    if (!selectedResume) {
      toast.info('Create a resume first, then scan it.');
      return;
    }
    setScanning(true);
    setScan(null);
    try {
      const result = await api<ScanResult>('/analysis/scan', {
        method: 'POST',
        body: { resumeId: selectedResume },
      });
      setScan(result);
      setExpanded(null);
      refreshHistory();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Scan failed — is the backend up to date?'));
    } finally {
      setScanning(false);
    }
  };

  const runMatch = async () => {
    if (!selectedResume) {
      toast.info('Create a resume first.');
      return;
    }
    if (jobDescription.trim().length < 60) {
      toast.info('Paste the full job description (at least a few sentences).');
      return;
    }
    setMatching(true);
    setMatch(null);
    try {
      const result = await api<JobMatchResult>('/analysis/job-match', {
        method: 'POST',
        body: { resumeId: selectedResume, jobDescription, jobTitle },
      });
      setMatch(result);
      refreshHistory();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Comparison failed — please try again.'));
    } finally {
      setMatching(false);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Resume Analyzer</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base max-w-2xl">
          Get an objective score out of 100 across nine categories, or paste a job posting to see
          exactly how well your resume matches — and what to fix.
        </p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="You need a resume first"
            description="Create and save a resume, then come back to scan it."
            action={<Button onClick={() => router.push('/resume')}>Create resume</Button>}
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label htmlFor="resumeSelect" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Resume to analyze
                  </label>
                  <select
                    id="resumeSelect"
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.title || r.data?.fullName || 'Untitled resume'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50" role="tablist" aria-label="Analysis type">
                  {(
                    [
                      { id: 'scan', label: 'Resume scan', icon: ScanSearch },
                      { id: 'match', label: 'Job match', icon: Briefcase },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className={clsx(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition',
                        tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'match' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Job title <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Developer"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Job description
                    </label>
                    <textarea
                      id="jobDescription"
                      rows={7}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the full job posting here…"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                {tab === 'scan' ? (
                  <Button icon={<ScanSearch className="w-4 h-4" />} loading={scanning} onClick={runScan} size="lg">
                    {scanning ? 'Scanning…' : 'Scan my resume'}
                  </Button>
                ) : (
                  <Button icon={<Briefcase className="w-4 h-4" />} loading={matching} onClick={runMatch} size="lg">
                    {matching ? 'Comparing…' : 'Compare with job'}
                  </Button>
                )}
              </div>
            </Card>

            {/* ---------- Scan results ---------- */}
            <AnimatePresence>
              {tab === 'scan' && scan && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <Card>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ScoreRing score={scan.overall} size={150} />
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold text-slate-900">
                          Your resume scores {scan.overall}/100 — {scoreLabel(scan.overall).toLowerCase()}
                        </h2>
                        {scan.strengths.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {scan.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 justify-center sm:justify-start">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" aria-hidden />
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
                    <h3 className="font-semibold text-slate-900 mb-4">Category breakdown</h3>
                    <div className="space-y-2">
                      {scan.categories.map((cat) => (
                        <div key={cat.key} className="border border-slate-100 rounded-xl">
                          <button
                            onClick={() => setExpanded(expanded === cat.key ? null : cat.key)}
                            aria-expanded={expanded === cat.key}
                            className="w-full px-4 py-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <ScoreBar label={SCAN_CATEGORY_LABELS[cat.key] || cat.key} score={cat.score} />
                              </div>
                              <ChevronDown
                                className={clsx('w-4 h-4 text-slate-400 transition-transform shrink-0', expanded === cat.key && 'rotate-180')}
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
                                <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                                  <p className="text-sm text-slate-600 mb-3">{cat.explanation}</p>
                                  {cat.suggestions.length > 0 ? (
                                    <ul className="space-y-2">
                                      {cat.suggestions.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" aria-hidden />
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4" aria-hidden /> Looking great — nothing to fix here.
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
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden /> Fix these first
                      </h3>
                      <ol className="space-y-2.5 list-none">
                        {scan.topFixes.map((fix, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {fix}
                          </li>
                        ))}
                      </ol>
                      <Button className="mt-4" variant="outline" size="sm" onClick={() => router.push(selectedResume ? `/resume/edit/${selectedResume}` : '/resume')}>
                        Open in builder <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Card>
                  )}

                  {/* Language findings */}
                  {scan.languageFindings.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-slate-900 mb-3">Language check</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Weak phrases, filler words, repetition, passive voice and possible spelling issues found in your resume.
                      </p>
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
                              <span className="font-medium text-slate-900">“{f.term}”</span>
                              {f.count > 1 && <span className="text-slate-400"> ×{f.count}</span>}
                              <p className="text-slate-600">{f.advice}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Action verbs */}
                  {scan.actionVerbSuggestions.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" aria-hidden /> Strong action verbs to use
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {scan.actionVerbSuggestions.map((v) => (
                          <span key={v} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
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
                      <ScoreRing score={match.matchPercent} size={150} label="Match" />
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold text-slate-900">
                          {match.matchPercent}% match{match.jobTitle ? ` — ${match.jobTitle}` : ''}
                        </h2>
                        <p className="text-sm text-slate-600 mt-2">{match.summary}</p>
                      </div>
                    </div>
                  </Card>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <Card>
                      <h3 className="font-semibold text-slate-900 mb-3">✓ You already match</h3>
                      {match.matchedSkills.length + match.matchedKeywords.length === 0 ? (
                        <p className="text-sm text-slate-500">No direct matches found.</p>
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
                      <h3 className="font-semibold text-slate-900 mb-3">✗ Missing from your resume</h3>
                      {match.missingSkills.length + match.missingKeywords.length === 0 ? (
                        <p className="text-sm text-emerald-600">Nothing important is missing — great coverage!</p>
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
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden /> Requirements to address
                      </h3>
                      <ul className="space-y-2">
                        {match.missingQualifications.map((q, i) => (
                          <li key={i} className="text-sm text-slate-700 pl-3 border-l-2 border-amber-300">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {match.keywordPlan.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-slate-900 mb-3">Keyword plan (no stuffing)</h3>
                      <ul className="space-y-2.5">
                        {match.keywordPlan.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" aria-hidden />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {match.bulletRewrites.length > 0 && (
                    <Card>
                      <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" aria-hidden /> Bullet rewrites for this job
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Copy the improved versions into the builder — only where they truthfully describe your work.
                      </p>
                      <div className="space-y-4">
                        {match.bulletRewrites.map((rw, i) => (
                          <div key={i} className="border border-slate-200 rounded-xl p-4">
                            <p className="text-sm text-slate-500 line-through decoration-slate-300">{rw.original}</p>
                            {rw.improved && (
                              <p className="text-sm font-medium text-slate-900 mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                {rw.improved}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">{rw.reason}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History sidebar */}
          <Card padded={false} className="lg:sticky lg:top-20">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" aria-hidden />
              <h2 className="font-semibold text-slate-900">Scan history</h2>
            </div>
            {history.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">
                Your scans will appear here so you can track improvement over time.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto thin-scrollbar">
                {history.map((h) => (
                  <li key={h._id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {h.type === 'scan' ? 'Resume scan' : h.jobTitle || 'Job match'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge tone={scoreTone(h.overall ?? h.matchPercent ?? 0)}>
                      {h.type === 'scan' ? `${h.overall}` : `${h.matchPercent}%`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-5 py-3 border-t border-slate-100">
              <Link href="/tools" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                Generate a cover letter <ArrowRight className="w-3.5 h-3.5" />
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
