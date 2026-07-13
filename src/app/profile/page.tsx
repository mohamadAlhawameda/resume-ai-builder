'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';
import {
  UserCircle2,
  Sparkles,
  Target,
  Share2,
  Plus,
  Trash2,
  FileText,
  Award,
  Languages as LanguagesIcon,
  FolderGit2,
  Wand2,
  Copy,
  Eye,
  CheckCircle2,
  Circle,
  MessageSquareQuote,
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import TagInput from '@/components/ui/TagInput';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import type { CareerProfile, VaultItem, ResumeRecord } from '@/lib/types';

type Tab = 'twin' | 'vault' | 'goals' | 'passport';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'twin');
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [profRes, resumesRes] = await Promise.allSettled([
      api<CareerProfile>('/profile'),
      api<ResumeRecord[]>('/resume/resumes'),
    ]);
    if (profRes.status === 'fulfilled') setProfile(profRes.value);
    else toast.error(apiErrorMessage(profRes.reason, 'Could not load your career profile.'));
    if (resumesRes.status === 'fulfilled') setResumes(resumesRes.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/profile');
      return;
    }
    load();
  }, [router, load]);

  // ---- Digital Twin actions ----
  const importFromResume = async (resumeId: string) => {
    setBusy(true);
    try {
      const res = await api<{ profile: CareerProfile; added: number }>(`/profile/import-from-resume/${resumeId}`, { method: 'POST' });
      setProfile(res.profile);
      toast.success(`Imported ${res.added} new item(s) into your Career Digital Twin.`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addSkill = async (name: string) => {
    if (!profile || !name.trim()) return;
    const skills = [...profile.skills, { name: name.trim(), proficiency: 'proficient' as const, evidence: '', source: 'user' as const }];
    try {
      const updated = await api<CareerProfile>('/profile/skills', { method: 'PUT', body: { skills } });
      setProfile(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const removeSkill = async (name: string) => {
    if (!profile) return;
    const skills = profile.skills.filter((s) => s.name !== name);
    try {
      const updated = await api<CareerProfile>('/profile/skills', { method: 'PUT', body: { skills } });
      setProfile(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Skeleton className="h-9 w-72 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!profile) return null;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'twin', label: 'Digital Twin', icon: UserCircle2 },
    { id: 'vault', label: `Career Vault (${profile.vault.length})`, icon: Sparkles },
    { id: 'goals', label: 'Goals & Roadmap', icon: Target },
    { id: 'passport', label: 'Career Passport', icon: Share2 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Career Profile</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base max-w-2xl">
            Your verified Career Digital Twin — everything here feeds smarter matching, roadmaps, and resumes,
            without re-typing it each time.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <p className="text-2xl font-bold text-blue-600">{profile.completionPct}%</p>
            <p className="text-xs text-slate-500">profile complete</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" role="tablist">
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

      {tab === 'twin' && (
        <TwinTab
          profile={profile}
          resumes={resumes}
          busy={busy}
          onImport={importFromResume}
          onAddSkill={addSkill}
          onRemoveSkill={removeSkill}
        />
      )}
      {tab === 'vault' && <VaultTab profile={profile} onChange={setProfile} />}
      {tab === 'goals' && <GoalsTab profile={profile} onChange={setProfile} />}
      {tab === 'passport' && <PassportTab profile={profile} resumes={resumes} onChange={setProfile} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Digital Twin tab
// ---------------------------------------------------------------------------

function TwinTab({
  profile,
  resumes,
  busy,
  onImport,
  onAddSkill,
  onRemoveSkill,
}: {
  profile: CareerProfile;
  resumes: ResumeRecord[];
  busy: boolean;
  onImport: (resumeId: string) => void;
  onAddSkill: (name: string) => void;
  onRemoveSkill: (name: string) => void;
}) {
  const [skillDraft, setSkillDraft] = useState('');

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {resumes.length > 0 && (
          <Card>
            <h2 className="font-semibold text-slate-900 mb-3">Import from an existing resume</h2>
            <p className="text-sm text-slate-500 mb-3">
              Pulls experience, education, and skills into your Digital Twin — never overwrites, only adds what&apos;s new.
            </p>
            <div className="flex flex-wrap gap-2">
              {resumes.map((r) => (
                <Button key={r._id} size="sm" variant="outline" loading={busy} onClick={() => onImport(r._id)}>
                  {r.title || r.data?.fullName || 'Untitled resume'}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" aria-hidden /> Experience ({profile.experience.length})
          </h2>
          {profile.experience.length === 0 ? (
            <p className="text-sm text-slate-500">No experience yet — import from a resume above.</p>
          ) : (
            <ul className="space-y-3">
              {profile.experience.map((e, i) => (
                <li key={i} className="border border-slate-100 rounded-xl p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {e.role || 'Role'} · {e.company || 'Company'}
                  </p>
                  <p className="text-xs text-slate-400">{e.from} – {e.to}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-violet-500" aria-hidden /> Education ({profile.education.length})
          </h2>
          {profile.education.length === 0 ? (
            <p className="text-sm text-slate-500">No education yet — import from a resume above.</p>
          ) : (
            <ul className="space-y-2">
              {profile.education.map((e, i) => (
                <li key={i} className="text-sm text-slate-700">
                  {e.degree}, {e.school} <span className="text-slate-400">({e.from}–{e.to})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-slate-900 mb-3">Skills with evidence</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.skills.map((s) => (
              <span
                key={s.name}
                className="group inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full ps-2.5 pe-1 py-0.5 text-xs font-medium"
                title={s.evidence || undefined}
              >
                {s.name}
                {s.source !== 'user' && <span className="text-blue-400">·{s.source === 'resume-import' ? 'imported' : 'AI'}</span>}
                <button
                  aria-label={`Remove ${s.name}`}
                  onClick={() => onRemoveSkill(s.name)}
                  className="p-0.5 rounded-full hover:bg-blue-100 transition"
                >
                  ×
                </button>
              </span>
            ))}
            {profile.skills.length === 0 && <p className="text-sm text-slate-500">No skills yet.</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddSkill(skillDraft);
                  setSkillDraft('');
                }
              }}
              placeholder="Add a skill…"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                onAddSkill(skillDraft);
                setSkillDraft('');
              }}
            >
              Add
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-500" aria-hidden /> Projects
          </h2>
          <p className="text-sm text-slate-500">{profile.projects.length} saved. Manage detailed projects from the Career Vault tab.</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <LanguagesIcon className="w-4 h-4 text-amber-500" aria-hidden /> Languages
          </h2>
          <p className="text-sm text-slate-500">
            {profile.languages.length > 0 ? profile.languages.map((l) => l.name).join(', ') : 'None added yet.'}
          </p>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Career Vault tab (includes AI Achievement Interview)
// ---------------------------------------------------------------------------

function VaultTab({ profile, onChange }: { profile: CareerProfile; onChange: (p: CareerProfile) => void }) {
  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftMetric, setDraftMetric] = useState('');
  const [saving, setSaving] = useState(false);

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewBullet, setInterviewBullet] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [interviewLoading, setInterviewLoading] = useState(false);

  const addVaultItem = async () => {
    if (!draftText.trim()) return;
    setSaving(true);
    try {
      const updated = await api<CareerProfile>('/profile/vault', {
        method: 'POST',
        body: { type: 'achievement', text: draftText.trim(), metric: draftMetric.trim(), tags: [] },
      });
      onChange(updated);
      setDraftText('');
      setDraftMetric('');
      setAdding(false);
      toast.success('Added to your Career Vault.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeVaultItem = async (id: string) => {
    try {
      const updated = await api<CareerProfile>(`/profile/vault/${id}`, { method: 'DELETE' });
      onChange(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const startInterview = async () => {
    if (!interviewBullet.trim()) return;
    setInterviewLoading(true);
    try {
      const res = await api<{ questions: string[]; aiUsed: boolean }>('/profile/achievement-interview', {
        method: 'POST',
        body: { bullet: interviewBullet },
      });
      setQuestions(res.questions);
      setAnswers(new Array(res.questions.length).fill(''));
      if (!res.aiUsed) toast.info('AI not configured — showing standard clarifying questions.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setInterviewLoading(false);
    }
  };

  const saveInterviewResult = async () => {
    const combined = [interviewBullet, ...answers.filter(Boolean).map((a, i) => `${questions[i]} → ${a}`)].join('\n');
    setSaving(true);
    try {
      const updated = await api<CareerProfile>('/profile/vault', {
        method: 'POST',
        body: { type: 'achievement', text: combined, source: 'ai-confirmed', tags: ['achievement-interview'] },
      });
      onChange(updated);
      toast.success('Saved to your Career Vault with the metrics you confirmed.');
      setInterviewOpen(false);
      setInterviewBullet('');
      setQuestions([]);
      setAnswers([]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-purple-500" aria-hidden /> AI Achievement Interview
          </h2>
          <p className="text-sm text-slate-500 max-w-xl">
            Paste a vague bullet — AI asks clarifying questions to help you recall the real metric. It never invents
            numbers; you supply them.
          </p>
        </div>
        <Button icon={<Wand2 className="w-4 h-4" />} onClick={() => setInterviewOpen(true)}>
          Start interview
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Saved achievements & bullets ({profile.vault.length})</h2>
          <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)}>
            Add manually
          </Button>
        </div>

        {adding && (
          <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-2">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
              placeholder="e.g. Reduced deployment time by 60% by automating the release pipeline"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={draftMetric}
              onChange={(e) => setDraftMetric(e.target.value)}
              placeholder="Metric (optional), e.g. 60% faster deploys"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={addVaultItem}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {profile.vault.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
            title="Your Career Vault is empty"
            description="Save reusable, evidence-backed bullets and achievements here — pull them into any resume later."
          />
        ) : (
          <ul className="space-y-3">
            {profile.vault.map((v: VaultItem) => (
              <li key={v._id} className="border border-slate-100 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 whitespace-pre-line">{v.text}</p>
                  {v.metric && <Badge tone="green" className="mt-1.5">{v.metric}</Badge>}
                </div>
                <button
                  aria-label="Remove"
                  onClick={() => removeVaultItem(v._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={interviewOpen} onClose={() => setInterviewOpen(false)} title="AI Achievement Interview" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your bullet (as-is, even if vague)</label>
            <textarea
              value={interviewBullet}
              onChange={(e) => setInterviewBullet(e.target.value)}
              rows={2}
              placeholder="e.g. Helped improve the checkout flow"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" className="mt-2" loading={interviewLoading} onClick={startInterview}>
              Ask clarifying questions
            </Button>
          </div>

          {questions.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{q}</label>
                  <input
                    value={answers[i] || ''}
                    onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                    placeholder="Your answer — only real numbers you know"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <Button loading={saving} onClick={saveInterviewResult} fullWidth>
                Save to Career Vault
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goals & Roadmap tab
// ---------------------------------------------------------------------------

function GoalsTab({ profile, onChange }: { profile: CareerProfile; onChange: (p: CareerProfile) => void }) {
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals);
  const [targetRoles, setTargetRoles] = useState(profile.targetRoles);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const saveGoals = async () => {
    setSaving(true);
    try {
      const updated = await api<CareerProfile>('/profile/goals', { method: 'PUT', body: { careerGoals, targetRoles } });
      onChange(updated);
      toast.success('Career goals saved.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      const res = await api<{ roadmap: CareerProfile['roadmap']; aiUsed: boolean }>('/profile/roadmap', {
        method: 'POST',
        body: { targetRole: targetRoles[0] || '' },
      });
      onChange({ ...profile, roadmap: res.roadmap });
      toast.success(res.aiUsed ? 'Your Career GPS roadmap is ready.' : 'Roadmap generated (AI not configured — using a standard plan).');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = async (bucket: 'thirtyDay' | 'ninetyDay' | 'longTerm', index: number, done: boolean) => {
    try {
      const roadmap = await api<CareerProfile['roadmap']>('/profile/roadmap/item', {
        method: 'PATCH',
        body: { bucket, index, done },
      });
      onChange({ ...profile, roadmap });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const roadmap = profile.roadmap;
  const hasRoadmap = !!roadmap?.generatedAt;

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900">Career goals</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">What are you working toward?</label>
          <textarea
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            rows={3}
            placeholder="e.g. Become a staff engineer within 3 years, leading a platform team."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <TagInput
          id="target-roles"
          label="Target roles"
          values={targetRoles}
          onChange={setTargetRoles}
          placeholder="e.g. Senior Frontend Engineer — press Enter"
        />
        <Button size="sm" loading={saving} onClick={saveGoals}>Save goals</Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" aria-hidden /> Career GPS
          </h2>
          <Button size="sm" variant="outline" loading={generating} onClick={generateRoadmap}>
            {hasRoadmap ? 'Regenerate' : 'Generate roadmap'}
          </Button>
        </div>
        {!hasRoadmap ? (
          <p className="text-sm text-slate-500">
            Generate a personalized 30-day, 90-day, and long-term roadmap grounded in your profile and real skill gaps
            from live job matches.
          </p>
        ) : (
          <div className="space-y-5">
            {(
              [
                ['30 days', 'thirtyDay'],
                ['90 days', 'ninetyDay'],
                ['Long term', 'longTerm'],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h3>
                <ul className="space-y-1.5">
                  {roadmap[key].map((item, i) => (
                    <li key={i}>
                      <button
                        onClick={() => toggleItem(key, i, !item.done)}
                        className="w-full flex items-start gap-2 text-start text-sm group"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" aria-hidden />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 group-hover:text-blue-400 mt-0.5 shrink-0 transition" aria-hidden />
                        )}
                        <span className={clsx(item.done && 'line-through text-slate-400')}>{item.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Career Passport tab
// ---------------------------------------------------------------------------

function PassportTab({
  profile,
  resumes,
  onChange,
}: {
  profile: CareerProfile;
  resumes: ResumeRecord[];
  onChange: (p: CareerProfile) => void;
}) {
  const [headline, setHeadline] = useState(profile.passport.headline);
  const [resumeId, setResumeId] = useState(profile.passport.resumeId || '');
  const [showProjects, setShowProjects] = useState(profile.passport.showProjects);
  const [showCertifications, setShowCertifications] = useState(profile.passport.showCertifications);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const publicUrl =
    profile.passport.enabled && profile.passport.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/passport/${profile.passport.slug}`
      : '';

  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, { width: 160, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [publicUrl]);

  const save = async (enabled: boolean) => {
    setSaving(true);
    try {
      const updated = await api<CareerProfile>('/profile/passport', {
        method: 'PUT',
        body: {
          enabled,
          headline,
          showProjects,
          showCertifications,
          resumeId: resumeId || null,
        },
      });
      onChange(updated);
      toast.success(enabled ? 'Career Passport is live.' : 'Career Passport is now private.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Link copied');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Public Career Passport</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.passport.enabled}
              onChange={(e) => save(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">{profile.passport.enabled ? 'Public' : 'Private'}</span>
          </label>
        </div>
        <p className="text-sm text-slate-500">
          A shareable page with your experience, projects, and certifications — no email or phone exposed. Perfect for
          a LinkedIn bio link or a QR code on your resume.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {resumes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Link a downloadable resume (optional)</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>{r.title || r.data?.fullName || 'Untitled'}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showProjects} onChange={(e) => setShowProjects(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300" />
            Show projects
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showCertifications} onChange={(e) => setShowCertifications(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300" />
            Show certifications
          </label>
        </div>

        <Button size="sm" loading={saving} onClick={() => save(profile.passport.enabled)}>
          Save settings
        </Button>
      </Card>

      <Card className="flex flex-col items-center text-center gap-4">
        {profile.passport.enabled && publicUrl ? (
          <>
            {qrDataUrl && <img src={qrDataUrl} alt="QR code linking to your Career Passport" className="rounded-xl border border-slate-200" />}
            <p className="text-sm text-slate-600 break-all">{publicUrl}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyLink}>Copy link</Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />}>Preview</Button>
              </a>
            </div>
            <p className="text-xs text-slate-400">{profile.passport.viewCount} view(s) so far</p>
          </>
        ) : (
          <EmptyState
            icon={<Share2 className="w-6 h-6" />}
            title="Passport is private"
            description="Turn it on to get a shareable link and QR code."
          />
        )}
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 py-10"><Skeleton className="h-96" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
