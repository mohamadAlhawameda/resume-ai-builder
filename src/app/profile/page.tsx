'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
import Tabs from '@/components/ui/Tabs';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import type { CareerProfile, VaultItem, ResumeRecord } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

type Tab = 'twin' | 'vault' | 'goals' | 'passport';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
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
    else toast.error(apiErrorMessage(profRes.reason, t('profilePage.toastLoadError')));
    if (resumesRes.status === 'fulfilled') setResumes(resumesRes.value);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.success(t('profilePage.toastImported', { n: res.added }));
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
    { id: 'twin', label: t('profilePage.tabTwin'), icon: UserCircle2 },
    { id: 'vault', label: t('profilePage.tabVault', { n: profile.vault.length }), icon: Sparkles },
    { id: 'goals', label: t('profilePage.tabGoals'), icon: Target },
    { id: 'passport', label: t('profilePage.tabPassport'), icon: Share2 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('profilePage.careerProfile')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-2xl">{t('profilePage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <p className="text-2xl font-bold text-primary">{profile.completionPct}%</p>
            <p className="text-xs text-muted-foreground">{t('profilePage.profileComplete')}</p>
          </div>
        </div>
      </div>

      <Tabs
        ariaLabel={t('profilePage.careerProfile')}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        className="mb-6 pb-1"
        items={tabs.map(({ id, label, icon }) => ({ value: id, label, icon }))}
      />

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
  const { t } = useLocale();
  const [skillDraft, setSkillDraft] = useState('');

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {resumes.length > 0 && (
          <Card>
            <h2 className="font-semibold text-foreground mb-3">{t('profilePage.importFromResumeTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-3">{t('profilePage.importFromResumeDesc')}</p>
            <div className="flex flex-wrap gap-2">
              {resumes.map((r) => (
                <Button key={r._id} size="sm" variant="outline" loading={busy} onClick={() => onImport(r._id)}>
                  {r.title || r.data?.fullName || t('profilePage.untitledResume')}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" aria-hidden /> {t('profilePage.experienceTitle', { n: profile.experience.length })}
          </h2>
          {profile.experience.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('profilePage.noExperienceText')}</p>
          ) : (
            <ul className="space-y-3">
              {profile.experience.map((e, i) => (
                <li key={i} className="border border-border rounded-xl p-3">
                  <p className="text-sm font-medium text-foreground">
                    {e.role || t('profilePage.roleFallback')} · {e.company || t('profilePage.companyFallback')}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.from} – {e.to}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" aria-hidden /> {t('profilePage.educationTitle', { n: profile.education.length })}
          </h2>
          {profile.education.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('profilePage.noEducationText')}</p>
          ) : (
            <ul className="space-y-2">
              {profile.education.map((e, i) => (
                <li key={i} className="text-sm text-foreground">
                  {e.degree}, {e.school} <span className="text-muted-foreground">({e.from}–{e.to})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-foreground mb-3">{t('profilePage.skillsWithEvidenceTitle')}</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.skills.map((s) => (
              <span
                key={s.name}
                className="group inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full ps-2.5 pe-1 py-0.5 text-xs font-medium"
                title={s.evidence || undefined}
              >
                {s.name}
                {s.source !== 'user' && (
                  <span className="text-primary/70">·{s.source === 'resume-import' ? t('profilePage.skillSourceImported') : t('profilePage.skillSourceAI')}</span>
                )}
                <button
                  aria-label={t('profilePage.removeSkillAria', { name: s.name })}
                  onClick={() => onRemoveSkill(s.name)}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition"
                >
                  ×
                </button>
              </span>
            ))}
            {profile.skills.length === 0 && <p className="text-sm text-muted-foreground">{t('profilePage.noSkillsText')}</p>}
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
              placeholder={t('profilePage.addSkillPlaceholder')}
              className="flex-1 px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                onAddSkill(skillDraft);
                setSkillDraft('');
              }}
            >
              {t('profilePage.add')}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-success" aria-hidden /> {t('profilePage.projectsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('profilePage.projectsSavedText', { n: profile.projects.length })}</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <LanguagesIcon className="w-4 h-4 text-warning" aria-hidden /> {t('profilePage.languagesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {profile.languages.length > 0 ? profile.languages.map((l) => l.name).join(', ') : t('profilePage.noLanguagesText')}
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
  const { t } = useLocale();
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
      toast.success(t('profilePage.toastAddedToVault'));
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
      if (!res.aiUsed) toast.info(t('profilePage.toastAiNotConfiguredQuestions'));
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
      toast.success(t('profilePage.toastSavedWithMetrics'));
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
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-accent" aria-hidden /> {t('profilePage.achievementInterviewTitle')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">{t('profilePage.achievementInterviewDesc')}</p>
        </div>
        <Button icon={<Wand2 className="w-4 h-4" />} onClick={() => setInterviewOpen(true)}>
          {t('profilePage.startInterview')}
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">{t('profilePage.savedAchievementsTitle', { n: profile.vault.length })}</h2>
          <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)}>
            {t('profilePage.addManually')}
          </Button>
        </div>

        {adding && (
          <div className="border border-border rounded-xl p-4 mb-4 space-y-2">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
              placeholder={t('profilePage.draftTextPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border-strong rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={draftMetric}
              onChange={(e) => setDraftMetric(e.target.value)}
              placeholder={t('profilePage.draftMetricPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border-strong rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={addVaultItem}>{t('profilePage.save')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{t('profilePage.cancel')}</Button>
            </div>
          </div>
        )}

        {profile.vault.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
            title={t('profilePage.vaultEmptyTitle')}
            description={t('profilePage.vaultEmptyDesc')}
          />
        ) : (
          <ul className="space-y-3">
            {profile.vault.map((v: VaultItem) => (
              <li key={v._id} className="border border-border rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-line">{v.text}</p>
                  {v.metric && <Badge tone="green" className="mt-1.5">{v.metric}</Badge>}
                </div>
                <button
                  aria-label={t('profilePage.removeAria')}
                  onClick={() => removeVaultItem(v._id)}
                  className="p-1.5 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={interviewOpen} onClose={() => setInterviewOpen(false)} title={t('profilePage.interviewModalTitle')} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profilePage.yourBulletLabel')}</label>
            <textarea
              value={interviewBullet}
              onChange={(e) => setInterviewBullet(e.target.value)}
              rows={2}
              placeholder={t('profilePage.interviewBulletPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" className="mt-2" loading={interviewLoading} onClick={startInterview}>
              {t('profilePage.askClarifyingQuestions')}
            </Button>
          </div>

          {questions.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-foreground mb-1">{q}</label>
                  <input
                    value={answers[i] || ''}
                    onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                    placeholder={t('profilePage.answerPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <Button loading={saving} onClick={saveInterviewResult} fullWidth>
                {t('profilePage.saveToVault')}
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
  const { t } = useLocale();
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals);
  const [targetRoles, setTargetRoles] = useState(profile.targetRoles);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const saveGoals = async () => {
    setSaving(true);
    try {
      const updated = await api<CareerProfile>('/profile/goals', { method: 'PUT', body: { careerGoals, targetRoles } });
      onChange(updated);
      toast.success(t('profilePage.toastGoalsSaved'));
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
      toast.success(res.aiUsed ? t('profilePage.toastRoadmapReady') : t('profilePage.toastRoadmapStandard'));
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
        <h2 className="font-semibold text-foreground">{t('profilePage.careerGoalsTitle')}</h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('profilePage.workingTowardLabel')}</label>
          <textarea
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            rows={3}
            placeholder={t('profilePage.careerGoalsPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <TagInput
          id="target-roles"
          label={t('profilePage.targetRolesLabel')}
          values={targetRoles}
          onChange={setTargetRoles}
          placeholder={t('profilePage.targetRolesPlaceholder')}
        />
        <Button size="sm" loading={saving} onClick={saveGoals}>{t('profilePage.saveGoals')}</Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" aria-hidden /> {t('profilePage.careerGpsTitle')}
          </h2>
          <Button size="sm" variant="outline" loading={generating} onClick={generateRoadmap}>
            {hasRoadmap ? t('profilePage.regenerate') : t('profilePage.generateRoadmap')}
          </Button>
        </div>
        {!hasRoadmap ? (
          <p className="text-sm text-muted-foreground">{t('profilePage.roadmapEmptyText')}</p>
        ) : (
          <div className="space-y-5">
            {(
              [
                [t('profilePage.thirtyDays'), 'thirtyDay'],
                [t('profilePage.ninetyDays'), 'ninetyDay'],
                [t('profilePage.longTerm'), 'longTerm'],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</h3>
                <ul className="space-y-1.5">
                  {roadmap[key].map((item, i) => (
                    <li key={i}>
                      <button
                        onClick={() => toggleItem(key, i, !item.done)}
                        className="w-full flex items-start gap-2 text-start text-sm group min-h-11"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" aria-hidden />
                        ) : (
                          <Circle className="w-4 h-4 text-border-strong group-hover:text-primary/60 mt-0.5 shrink-0 transition" aria-hidden />
                        )}
                        <span className={clsx(item.done && 'line-through text-muted-foreground')}>{item.text}</span>
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
  const { t } = useLocale();
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
      toast.success(enabled ? t('profilePage.toastPassportPublic') : t('profilePage.toastPassportPrivate'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success(t('profilePage.toastLinkCopied'));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{t('profilePage.publicPassportTitle')}</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.passport.enabled}
              onChange={(e) => save(e.target.checked)}
              className="w-5 h-5 rounded text-primary border-border-strong focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">{profile.passport.enabled ? t('profilePage.public') : t('profilePage.private')}</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">{t('profilePage.passportDesc')}</p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('profilePage.headlineLabel')}</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={t('profilePage.headlinePlaceholder')}
            className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {resumes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profilePage.linkResumeLabel')}</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('profilePage.none')}</option>
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>{r.title || r.data?.fullName || t('profilePage.untitled')}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={showProjects} onChange={(e) => setShowProjects(e.target.checked)} className="w-4 h-4 rounded text-primary border-border-strong" />
            {t('profilePage.showProjects')}
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={showCertifications} onChange={(e) => setShowCertifications(e.target.checked)} className="w-4 h-4 rounded text-primary border-border-strong" />
            {t('profilePage.showCertifications')}
          </label>
        </div>

        <Button size="sm" loading={saving} onClick={() => save(profile.passport.enabled)}>
          {t('profilePage.saveSettings')}
        </Button>
      </Card>

      <Card className="flex flex-col items-center text-center gap-4">
        {profile.passport.enabled && publicUrl ? (
          <>
            {qrDataUrl && (
              <Image src={qrDataUrl} alt={t('profilePage.qrAlt')} width={160} height={160} unoptimized className="rounded-xl border border-border" />
            )}
            <p className="text-sm text-muted-foreground break-all">{publicUrl}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyLink}>{t('profilePage.copyLink')}</Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />}>{t('profilePage.preview')}</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{t('profilePage.viewsSoFar', { n: profile.passport.viewCount })}</p>
          </>
        ) : (
          <EmptyState
            icon={<Share2 className="w-6 h-6" />}
            title={t('profilePage.passportPrivateTitle')}
            description={t('profilePage.passportPrivateDesc')}
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
