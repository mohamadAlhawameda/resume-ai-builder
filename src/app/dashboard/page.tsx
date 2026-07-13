'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { scoreColor } from '@/components/ui/ScoreRing';
import { api, apiErrorMessage } from '@/lib/api';
import { getUser, isLoggedIn, type StoredUser } from '@/lib/auth';
import type { ResumeRecord, ScanHistoryItem, SavedJob, Job } from '@/lib/types';

interface Profile {
  targetRole: string;
  industry: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [topJobs, setTopJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile>({ targetRole: '', industry: '' });
  const [editingTarget, setEditingTarget] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

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
      if (results[0].status === 'rejected') {
        toast.error(apiErrorMessage(results[0].reason, 'Could not load your resumes.'));
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      await api('/auth/profile', { method: 'PUT', body: profile });
      toast.success('Career target updated');
      setEditingTarget(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }, [profile]);

  const scans = history.filter((h) => h.type === 'scan' && typeof h.overall === 'number');
  const latestScore = scans[0]?.overall ?? null;
  const previousScore = scans[1]?.overall ?? null;
  const scoreDelta = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;
  const applications = savedJobs.filter((j) => j.status !== 'saved').length;

  const stats = [
    {
      label: 'Resumes',
      value: resumes.length,
      icon: FileText,
      href: '/resumes',
      color: 'from-blue-500 to-indigo-600 shadow-blue-600/25',
    },
    {
      label: 'Latest score',
      value: latestScore !== null ? `${latestScore}/100` : '—',
      sub: scoreDelta !== null ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta} vs previous` : undefined,
      icon: ScanSearch,
      href: '/analyze',
      color: 'from-violet-500 to-purple-600 shadow-purple-600/25',
    },
    {
      label: 'Saved jobs',
      value: savedJobs.length,
      icon: Briefcase,
      href: '/jobs?tab=saved',
      color: 'from-emerald-500 to-teal-600 shadow-emerald-600/25',
    },
    {
      label: 'Applications',
      value: applications,
      icon: ClipboardList,
      href: '/jobs?tab=saved',
      color: 'from-amber-500 to-orange-600 shadow-amber-600/25',
    },
  ];

  const recommendations: { text: string; href: string }[] = [];
  if (!profile.targetRole) {
    recommendations.push({ text: 'Set your target role so scans and job matches can be personalized.', href: '#target' });
  }
  if (resumes.length === 0) {
    recommendations.push({ text: 'Create your first resume — it takes about 10 minutes with AI help.', href: '/resume' });
  } else if (scans.length === 0) {
    recommendations.push({ text: 'Run your first resume scan to get an ATS score and improvement plan.', href: '/analyze' });
  } else if (latestScore !== null && latestScore < 75) {
    recommendations.push({ text: `Your latest score is ${latestScore}/100 — apply the top fixes to push it above 75.`, href: '/analyze' });
  }
  if (resumes.length > 0 && savedJobs.length === 0) {
    recommendations.push({ text: 'Browse recommended jobs and save the ones worth pursuing.', href: '/jobs' });
  }
  if (resumes.length === 1) {
    recommendations.push({ text: 'Duplicate your resume to tailor a version for each job family you target.', href: '/resumes' });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            {profile.targetRole
              ? `Working toward: ${profile.targetRole}${profile.industry ? ` · ${profile.industry}` : ''}`
              : 'Here is your career progress at a glance.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<ScanSearch className="w-4 h-4" />} variant="outline" onClick={() => router.push('/analyze')}>
            Scan resume
          </Button>
          <Button icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push('/resume')}>
            New resume
          </Button>
        </div>
      </motion.div>

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
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
                {s.sub && (
                  <p className={`text-xs font-medium mt-0.5 ${scoreDelta !== null && scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Your resumes</h2>
              <Link href="/resumes" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {resumes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No resumes yet"
                description="Create your first resume and let AI help you write it."
                action={<Button onClick={() => router.push('/resume')}>Create resume</Button>}
              />
            ) : (
              <ul className="divide-y divide-slate-50">
                {resumes.slice(0, 4).map((r) => (
                  <li key={r._id} className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/60 transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {r.title || r.data?.fullName || 'Untitled resume'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Updated {new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {r.templateId && ` · ${r.templateId} template`}
                      </p>
                    </div>
                    {typeof (r as ResumeRecord & { lastScore?: number }).lastScore === 'number' && (
                      <Badge tone={scoreTone((r as ResumeRecord & { lastScore: number }).lastScore)}>
                        {(r as ResumeRecord & { lastScore: number }).lastScore}/100
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => router.push(`/resume/edit/${r._id}`)}>
                      Edit
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Scan history / progress */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" aria-hidden /> Score progress
              </h2>
              <Link href="/analyze" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                New scan <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {scans.length === 0 ? (
              <EmptyState
                icon={<ScanSearch className="w-6 h-6" />}
                title="No scans yet"
                description="Scan your resume to get a score out of 100 across 9 categories, with fixes for each."
                action={<Button variant="outline" onClick={() => router.push('/analyze')}>Run first scan</Button>}
              />
            ) : (
              <div className="px-5 sm:px-6 py-5">
                {/* Simple score trend bars (oldest → newest) */}
                <div className="flex items-end gap-1.5 h-24 mb-4" role="img" aria-label="Score history chart">
                  {[...scans].reverse().slice(-12).map((s, i) => (
                    <div key={s._id || i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t-md transition-all duration-500 min-h-[6px]"
                        style={{
                          height: `${Math.max(6, (s.overall || 0) * 0.9)}%`,
                          backgroundColor: scoreColor(s.overall || 0),
                          opacity: 0.85,
                        }}
                      />
                      <span className="absolute -top-6 hidden group-hover:block text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm">
                        {s.overall}
                      </span>
                    </div>
                  ))}
                </div>
                <ul className="space-y-2">
                  {history.slice(0, 4).map((h) => (
                    <li key={h._id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">
                        {h.type === 'scan' ? 'Resume scan' : `Job match${h.jobTitle ? ` — ${h.jobTitle}` : ''}`}
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <Badge tone={scoreTone(h.overall ?? h.matchPercent ?? 0)}>
                          {h.type === 'scan' ? `${h.overall}/100` : `${h.matchPercent}% match`}
                        </Badge>
                        <span className="text-xs text-slate-400 w-16 text-right">
                          {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Career target */}
          <Card id="target">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-500" aria-hidden /> Career target
            </h2>
            {editingTarget ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="targetRole" className="block text-xs font-medium text-slate-600 mb-1">
                    Target role
                  </label>
                  <input
                    id="targetRole"
                    value={profile.targetRole}
                    onChange={(e) => setProfile((p) => ({ ...p, targetRole: e.target.value }))}
                    placeholder="e.g. Frontend Developer"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="industry" className="block text-xs font-medium text-slate-600 mb-1">
                    Industry
                  </label>
                  <input
                    id="industry"
                    value={profile.industry}
                    onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
                    placeholder="e.g. Fintech"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={savingProfile} onClick={saveProfile}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTarget(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {profile.targetRole ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{profile.targetRole}</span>
                    {profile.industry && <span className="text-slate-500"> · {profile.industry}</span>}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Not set — recommendations and job matching work best with a target.
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditingTarget(true)}>
                  {profile.targetRole ? 'Edit' : 'Set target'}
                </Button>
              </div>
            )}
          </Card>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" aria-hidden /> Recommended next steps
              </h2>
              <ul className="space-y-2.5">
                {recommendations.slice(0, 4).map((rec, i) => (
                  <li key={i}>
                    <Link
                      href={rec.href}
                      className="flex items-start gap-2 text-sm text-slate-600 hover:text-blue-700 transition group"
                    >
                      <ArrowRight className="w-4 h-4 mt-0.5 text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      {rec.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Top job matches */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Top job matches</h2>
              <Link href="/jobs" className="text-sm font-medium text-blue-600 hover:underline">
                All jobs
              </Link>
            </div>
            {topJobs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">
                Job matches appear once you have a resume saved.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {topJobs.map((job) => (
                  <li key={job.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-slate-900 truncate">{job.title}</p>
                      {job.match && <Badge tone={scoreTone(job.match.percent)}>{job.match.percent}%</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {job.company} · {job.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
