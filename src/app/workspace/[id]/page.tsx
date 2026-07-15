'use client';

// Per-job workspace — one place for everything about a single tracked
// application: status, notes, contacts at that company, interview prep, and
// quick links to the resume/cover-letter/company-intel tools that already
// exist elsewhere. Pure aggregation over existing endpoints — no new backend.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  ExternalLink,
  Building2,
  Users,
  MessagesSquare,
  Sparkles,
  FileText,
  Send,
  Save,
  Loader2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import CompanyIntelligencePanel from '@/components/CompanyIntelligence';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useLocale } from '@/i18n/LocaleProvider';
import type { SavedJob, SavedJobStatus, Contact, ResumeRecord, InterviewQuestion } from '@/lib/types';

const STATUS_OPTIONS: SavedJobStatus[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

export default function JobWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { t, formatDate } = useLocale();

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedJob | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);

  const [prepLoading, setPrepLoading] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api<SavedJob[]>('/jobs/saved'),
      api<Contact[]>('/contacts'),
      api<ResumeRecord[]>('/resume/resumes'),
    ]);
    if (results[0].status === 'fulfilled') {
      const match = results[0].value.find((s) => s._id === params.id) || null;
      setSaved(match);
      setNotes(match?.notes || '');
      if (!match) toast.error(t('workspacePage.notFound'));
    }
    if (results[1].status === 'fulfilled') setContacts(results[1].value);
    if (results[2].status === 'fulfilled') setResumes(results[2].value);
    setLoading(false);
  }, [params.id, t]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push(`/login?redirect=/workspace/${params.id}`);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const companyContacts = useMemo(() => {
    if (!saved) return [];
    const lower = saved.job.company.toLowerCase();
    return contacts.filter((c) => c.company.toLowerCase() === lower);
  }, [contacts, saved]);

  const updateStatus = async (status: SavedJobStatus) => {
    if (!saved) return;
    setStatusBusy(true);
    try {
      const updated = await api<SavedJob>(`/jobs/saved/${saved._id}`, { method: 'PATCH', body: { status } });
      setSaved(updated);
      toast.success(t('workspacePage.statusUpdated'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setStatusBusy(false);
    }
  };

  const saveNotes = async () => {
    if (!saved) return;
    setSavingNotes(true);
    try {
      const updated = await api<SavedJob>(`/jobs/saved/${saved._id}`, { method: 'PATCH', body: { status: saved.status, notes } });
      setSaved(updated);
      toast.success(t('workspacePage.notesSaved'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingNotes(false);
    }
  };

  const generatePrep = async () => {
    if (!saved) return;
    const resume = resumes[0];
    if (!resume) {
      toast.info(t('jobsPage.toastCreateResumeFirst'));
      return;
    }
    setPrepLoading(true);
    try {
      const result = await api<{ questions: InterviewQuestion[] }>('/generate', {
        method: 'POST',
        body: {
          type: 'interview-prep',
          data: resume.data,
          jobTitle: saved.job.title,
          company: saved.job.company,
          jobDescription: saved.job.description || '',
        },
      });
      setQuestions(result.questions || []);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPrepLoading(false);
    }
  };

  const sendToTools = (tool: string) => {
    if (!saved) return;
    sessionStorage.setItem(
      'tools:jobContext',
      JSON.stringify({ jobTitle: saved.job.title, company: saved.job.company, jobDescription: saved.job.description || '' })
    );
    router.push(`/tools?tool=${tool}`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!saved) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-foreground font-medium mb-2">{t('workspacePage.notFound')}</p>
        <Link href="/jobs?tab=saved" className="text-primary font-medium hover:underline">
          {t('workspacePage.backToTracker')}
        </Link>
      </div>
    );
  }

  const job = saved.job;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Link href="/jobs?tab=saved" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5 rtl-flip" /> {t('workspacePage.backToTracker')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{job.title}</h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {job.company}</span>
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
            {(job.salaryMin || job.salaryMax) && (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ''}
                {job.salaryMin && job.salaryMax ? '–' : ''}
                {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved.matchPercent !== null && saved.matchPercent !== undefined && (
            <Badge tone={scoreTone(saved.matchPercent)} className="text-sm px-3 py-1.5">
              {saved.matchPercent}%
            </Badge>
          )}
          <select
            aria-label={t('workspacePage.statusLabel')}
            value={saved.status}
            disabled={statusBusy}
            onChange={(e) => updateStatus(e.target.value as SavedJobStatus)}
            className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`jobsPage.status${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <Card>
            <h2 className="font-semibold text-foreground mb-3">{t('workspacePage.quickActions')}</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={<Send className="w-3.5 h-3.5" />} onClick={() => sendToTools('cover-letter')}>
                {t('jobsPage.coverLetter')}
              </Button>
              <Button size="sm" variant="outline" icon={<Send className="w-3.5 h-3.5" />} onClick={() => sendToTools('follow-up-email')}>
                {t('jobsPage.followUpEmail')}
              </Button>
              <Button size="sm" variant="outline" icon={<Send className="w-3.5 h-3.5" />} onClick={() => sendToTools('thank-you-email')}>
                {t('jobsPage.thankYouEmail')}
              </Button>
              <Button size="sm" variant="outline" icon={<Building2 className="w-3.5 h-3.5" />} onClick={() => setIntelOpen(true)}>
                {t('jobsPage.companyInfo')}
              </Button>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-sm transition"
                >
                  {t('jobsPage.applyOnSite')} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              )}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h2 className="font-semibold text-foreground mb-3">{t('workspacePage.notes')}</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder={t('workspacePage.notesPlaceholder')}
              className="w-full px-3 py-2.5 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" className="mt-2" loading={savingNotes} icon={<Save className="w-3.5 h-3.5" />} onClick={saveNotes}>
              {t('common.save')}
            </Button>
          </Card>

          {/* Interview prep */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">{t('jobsPage.interviewPrep')}</h2>
              {!questions && (
                <Button size="sm" variant="outline" loading={prepLoading} icon={<Sparkles className="w-3.5 h-3.5" />} onClick={generatePrep}>
                  {t('workspacePage.generatePrep')}
                </Button>
              )}
            </div>
            {prepLoading && !questions && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden />}
            {questions && (
              <ul className="space-y-3">
                {questions.map((q, i) => (
                  <li key={i} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{q.question}</p>
                      <Badge tone="slate" className="shrink-0">{q.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.starHint}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contacts at this company */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" aria-hidden /> {t('network.yourContacts')}
              </h2>
              <Link href="/network" className="text-sm font-medium text-primary hover:underline">
                {t('network.tabContacts')}
              </Link>
            </div>
            {companyContacts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">{t('workspacePage.noContactsHere')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {companyContacts.map((c) => (
                  <li key={c._id} className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                    {c.contacted && <Badge tone="green" className="mt-1">{t('network.contacted')}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Resumes */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" aria-hidden /> {t('dashboardPage.yourResumes')}
              </h2>
              <Link href="/resumes" className="text-sm font-medium text-primary hover:underline">
                {t('dashboardPage.viewAll')}
              </Link>
            </div>
            {resumes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">{t('dashboardPage.noResumesDescription')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {resumes.slice(0, 3).map((r) => (
                  <li key={r._id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{r.title || r.data?.fullName || t('dashboardPage.untitledResume')}</span>
                    <Link href={`/resume/edit/${r._id}`} className="text-xs font-medium text-primary hover:underline shrink-0">
                      {t('dashboardPage.edit')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Timeline */}
          <Card>
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <MessagesSquare className="w-4 h-4 text-muted-foreground" aria-hidden /> {t('workspacePage.timeline')}
            </h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>{t('workspacePage.savedOn', { date: formatDate(saved.createdAt) })}</li>
              {saved.appliedAt && <li>{t('workspacePage.appliedOn', { date: formatDate(saved.appliedAt) })}</li>}
            </ul>
          </Card>
        </div>
      </div>

      <CompanyIntelligencePanel company={intelOpen ? job.company : null} onClose={() => setIntelOpen(false)} />
    </div>
  );
}
