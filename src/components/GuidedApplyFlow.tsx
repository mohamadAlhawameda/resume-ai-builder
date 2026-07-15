'use client';

// Guided "Apply to this job" workflow — a 4-step stepper that chains
// together endpoints that already exist elsewhere in the app (job match
// data already on the card, /generate's tailor-bullets and cover-letter
// types, /resume/duplicate, /jobs/save, /jobs/saved/:id PATCH). No new
// backend logic; this is purely an orchestration layer so a user doesn't
// have to bounce between the Jobs, Resume Builder, and AI Tools pages
// one action at a time.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { CheckCircle2, Copy, Download, FileText, Sparkles, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import Badge, { scoreTone } from '@/components/ui/Badge';
import { api, apiErrorMessage } from '@/lib/api';
import { useLocale } from '@/i18n/LocaleProvider';
import type { Job, ResumeRecord, SavedJob } from '@/lib/types';

interface BulletRewrite {
  original: string;
  improved: string;
  reason: string;
}

interface Props {
  job: Job | null;
  resumes: ResumeRecord[];
  defaultResumeId: string | null;
  getFullDescription: (job: Job) => Promise<string>;
  onClose: () => void;
  onSaved: (saved: SavedJob) => void;
}

const STEP_KEYS = ['match', 'tailor', 'coverLetter', 'save'] as const;
type StepKey = (typeof STEP_KEYS)[number];

export default function GuidedApplyFlow({ job, resumes, defaultResumeId, getFullDescription, onClose, onSaved }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [selectedResumeId, setSelectedResumeId] = useState(defaultResumeId || resumes[0]?._id || '');
  const [jobDescription, setJobDescription] = useState('');

  const [tailorLoading, setTailorLoading] = useState(false);
  const [rewrites, setRewrites] = useState<BulletRewrite[] | null>(null);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(null);

  const [coverLoading, setCoverLoading] = useState(false);
  const [coverText, setCoverText] = useState('');

  const [markApplied, setMarkApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedJob | null>(null);

  // Reset per-job state whenever a new job is opened in the flow.
  useEffect(() => {
    if (!job) return;
    setStep(0);
    setSelectedResumeId(defaultResumeId || resumes[0]?._id || '');
    setJobDescription('');
    setRewrites(null);
    setTailoredResumeId(null);
    setCoverText('');
    setMarkApplied(false);
    setSaved(null);
    getFullDescription(job)
      .then(setJobDescription)
      .catch(() => setJobDescription(job.description || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  if (!job) return null;

  const selectedResume = resumes.find((r) => r._id === selectedResumeId) || null;

  const runTailor = async () => {
    if (!selectedResume) return;
    setTailorLoading(true);
    try {
      const result = await api<{ rewrites: BulletRewrite[]; aiUsed: boolean }>('/generate', {
        method: 'POST',
        body: { type: 'tailor-bullets', data: selectedResume.data, jobDescription },
      });
      setRewrites(result.rewrites || []);
      if (!result.aiUsed) toast.info(t('jobsPage.guidedApplyAiUnavailable'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setTailorLoading(false);
    }
  };

  const createTailoredCopy = async () => {
    if (!selectedResume) return;
    setTailorLoading(true);
    try {
      const copy = await api<{ _id: string }>(`/resume/duplicate/${selectedResume._id}`, {
        method: 'POST',
        body: { title: `${job.title} @ ${job.company}` },
      });
      setTailoredResumeId(copy._id);
      toast.success(t('jobsPage.toastTailoredCopyCreated'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setTailorLoading(false);
    }
  };

  const runCoverLetter = async () => {
    if (!selectedResume) return;
    setCoverLoading(true);
    try {
      const result = await api<{ text: string; aiUsed: boolean }>('/generate', {
        method: 'POST',
        body: {
          type: 'cover-letter',
          data: selectedResume.data,
          jobTitle: job.title,
          company: job.company,
          jobDescription,
          tone: 'professional',
        },
      });
      setCoverText(result.text || '');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCoverLoading(false);
    }
  };

  const copyCoverLetter = async () => {
    await navigator.clipboard.writeText(coverText);
    toast.success(t('toolsPage.toastCopied'));
  };

  const downloadCoverLetter = () => {
    const blob = new Blob([coverText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${job.company}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const result = await api<SavedJob>('/jobs/save', {
        method: 'POST',
        body: { job: { ...job, description: jobDescription, match: undefined }, matchPercent: job.match?.percent ?? null },
      });
      let final = result;
      if (markApplied) {
        final = await api<SavedJob>(`/jobs/saved/${result._id}`, { method: 'PATCH', body: { status: 'applied' } });
      }
      setSaved(final);
      onSaved(final);
      toast.success(markApplied ? t('jobsPage.toastMarkedApplied') : t('jobsPage.toastJobSaved'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const stepDone: Record<StepKey, boolean> = {
    match: true, // informational — always considered "seen" once shown
    tailor: rewrites !== null,
    coverLetter: coverText.length > 0,
    save: saved !== null,
  };

  return (
    <Sheet open={!!job} onClose={onClose} title={t('jobsPage.guidedApplyTitle', { title: job.title, company: job.company })}>
      {/* Step indicator */}
      <ol className="flex items-center gap-1.5 mb-5" aria-label={t('jobsPage.guidedApplySteps')}>
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={clsx(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition',
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : stepDone[key]
                    ? 'bg-success/15 text-success'
                    : 'bg-muted text-muted-foreground'
              )}
              aria-label={t(`jobsPage.guidedApplyStep.${key}`)}
              aria-current={i === step ? 'step' : undefined}
            >
              {stepDone[key] && i !== step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </button>
            {i < STEP_KEYS.length - 1 && <span className="flex-1 h-px bg-border" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {t(`jobsPage.guidedApplyStep.${STEP_KEYS[step]}`)}
      </p>

      {/* Step 0: match */}
      {step === 0 && (
        <div className="space-y-4">
          {job.match ? (
            <div className="flex items-center gap-4">
              <Badge tone={scoreTone(job.match.percent)} className="text-base px-3 py-1.5">
                {job.match.percent}%
              </Badge>
              <p className="text-sm text-muted-foreground flex-1">{t('jobsPage.guidedApplyMatchDescription')}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              {t('jobsPage.guidedApplyNoMatch')}{' '}
              <button type="button" onClick={() => router.push('/resume')} className="text-primary font-medium hover:underline">
                {t('dashboardPage.createResume')}
              </button>
            </div>
          )}
          {job.match && job.match.matchedSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('jobsPage.matchedSkillsLabel')}</p>
              <div className="flex flex-wrap gap-1.5">
                {job.match.matchedSkills.map((s) => (
                  <Badge key={s} tone="green">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {job.match && job.match.missingSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('jobsPage.missingSkillsLabel')}</p>
              <div className="flex flex-wrap gap-1.5">
                {job.match.missingSkills.map((s) => (
                  <Badge key={s} tone="slate">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: tailor */}
      {step === 1 && (
        <div className="space-y-4">
          {resumes.length > 1 && (
            <div>
              <label htmlFor="guided-resume" className="block text-sm font-medium text-foreground mb-1.5">
                {t('jobsPage.guidedApplyChooseResume')}
              </label>
              <select
                id="guided-resume"
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  setRewrites(null);
                }}
                className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title || r.data?.fullName || t('dashboardPage.untitledResume')}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!rewrites ? (
            <Button icon={<Sparkles className="w-4 h-4" />} loading={tailorLoading} disabled={!selectedResume} onClick={runTailor}>
              {t('jobsPage.guidedApplyRunTailor')}
            </Button>
          ) : (
            <>
              {rewrites.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('jobsPage.guidedApplyNoRewrites')}</p>
              ) : (
                <ul className="space-y-3">
                  {rewrites.map((r, i) => (
                    <li key={i} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground line-through mb-1">{r.original}</p>
                      <p className="text-sm text-foreground font-medium">{r.improved}</p>
                      {r.reason && <p className="text-xs text-primary mt-1">{r.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {!tailoredResumeId ? (
                <Button variant="outline" icon={<FileText className="w-4 h-4" />} loading={tailorLoading} onClick={createTailoredCopy}>
                  {t('jobsPage.guidedApplyCreateCopy')}
                </Button>
              ) : (
                <div className="rounded-xl bg-success/10 border border-success/20 p-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-success">{t('jobsPage.guidedApplyCopyCreated')}</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/resume/edit/${tailoredResumeId}`)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    {t('dashboardPage.edit')} <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 2: cover letter */}
      {step === 2 && (
        <div className="space-y-4">
          {!coverText ? (
            <Button icon={<Sparkles className="w-4 h-4" />} loading={coverLoading} disabled={!selectedResume} onClick={runCoverLetter}>
              {t('jobsPage.guidedApplyGenerateCoverLetter')}
            </Button>
          ) : (
            <>
              <textarea
                readOnly
                value={coverText}
                rows={12}
                className="w-full px-3 py-2.5 text-sm border border-border-strong rounded-xl bg-surface text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyCoverLetter}>
                  {t('toolsPage.copy')}
                </Button>
                <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadCoverLetter}>
                  {t('toolsPage.txt')}
                </Button>
                <Button size="sm" variant="ghost" loading={coverLoading} onClick={runCoverLetter}>
                  {t('jobsPage.guidedApplyRegenerate')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: save & track */}
      {step === 3 && (
        <div className="space-y-4">
          {saved ? (
            <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" aria-hidden />
              <p className="text-sm text-success font-medium">{t('jobsPage.guidedApplyDone')}</p>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={markApplied}
                  onChange={(e) => setMarkApplied(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border-strong focus:ring-primary"
                />
                {t('jobsPage.guidedApplyAlreadyApplied')}
              </label>
              <Button icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} loading={saving} onClick={finish}>
                {markApplied ? t('jobsPage.guidedApplySaveApplied') : t('jobsPage.guidedApplySaveTracked')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          {t('common.back')}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button icon={<ArrowRight className="w-4 h-4 rtl-flip" />} onClick={() => setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1))}>
            {t('jobsPage.guidedApplyNext')}
          </Button>
        ) : (
          saved && (
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          )
        )}
      </div>
    </Sheet>
  );
}
