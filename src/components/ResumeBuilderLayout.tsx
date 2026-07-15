'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  FileDown,
  FileText,
  Eye,
  EyeOff,
  Check,
  CloudUpload,
  Settings2,
  Loader2,
} from 'lucide-react';
import TemplateSelector from './TemplateSelector';
import ProgressBar from './ProgressBar';
import StepNavigation from './StepNavigation';
import ContactStep from './steps/ContactStep';
import EducationStep from './steps/EducationStep';
import ExperienceStep from './steps/ExperienceStep';
import SkillsStep from './steps/SkillsStep';
import ResumePreview from './ResumePreview';
import SectionManager from './SectionManager';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { api, ApiError, apiErrorMessage } from '@/lib/api';
import { getToken, isLoggedIn } from '@/lib/auth';
import useAuthStatus from '@/app/hooks/useAuthStatus';
import { exportElementToPDF, exportToDocx } from '@/lib/exportResume';
import {
  emptyResumeData,
  normalizeResumeData,
  type ResumeData,
  type SectionKey,
  type TemplateId,
  type TemplateCustomization,
} from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ResumeBuilderLayout({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const router = useRouter();
  const { t } = useLocale();
  // isLoggedIn() reads localStorage, which doesn't exist during SSR — using
  // it directly in rendered text causes a hydration mismatch (server always
  // renders the logged-out copy). useAuthStatus() defaults to false on first
  // render (matching SSR) and updates after mount, same as Navbar does.
  const authed = useAuthStatus();
  const STEPS = [
    t('builderPage.stepContact'),
    t('builderPage.stepExperience'),
    t('builderPage.stepEducation'),
    t('builderPage.stepSkills'),
    t('builderPage.stepCustomize'),
  ];
  const { id } = useParams();
  const routeResumeId = Array.isArray(id) ? id[0] : id;

  const exportRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ResumeData>(emptyResumeData());
  const [template, setTemplate] = useState<TemplateId>('classic');
  const [resumeId, setResumeId] = useState<string | undefined>(routeResumeId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummarySuggestions, setAiSummarySuggestions] = useState<string[]>([]);
  const [aiExpSuggestions, setAiExpSuggestions] = useState<string[][]>([]);
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState<string[]>([]);

  // Every resume needs a clear, distinct name before it can be saved.
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // ---------- Load: local draft (create) or server resume (edit) ----------

  useEffect(() => {
    if (mode === 'edit') return;
    const saved = localStorage.getItem('resumeData') || sessionStorage.getItem('resumeData');
    if (saved) {
      try {
        setFormData(normalizeResumeData(JSON.parse(saved)));
      } catch {
        /* corrupt draft — start fresh */
      }
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit' || !routeResumeId) return;
    if (!getToken()) {
      router.push(`/login?redirect=/resume/edit/${routeResumeId}`);
      return;
    }
    api<{ data: Partial<ResumeData>; templateId?: string }>(`/resume/resumes/${routeResumeId}`)
      .then((res) => {
        if (res?.data) {
          setFormData(normalizeResumeData(res.data));
          if (res.templateId && res.templateId !== 'default') setTemplate(res.templateId as TemplateId);
        }
      })
      .catch((err) => toast.error(apiErrorMessage(err, t('builderPage.toastLoadFailed'))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routeResumeId, router]);

  // ---------- Persistence ----------

  const persistLocal = useCallback((data: ResumeData) => {
    localStorage.setItem('resumeData', JSON.stringify(data));
    sessionStorage.setItem('resumeData', JSON.stringify(data));
  }, []);

  const saveToServer = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!isLoggedIn()) return false;
      const title = formData.title?.trim();
      if (!title) return false; // caller (handleSaveResume) gates this via the naming modal
      setSaveState('saving');
      try {
        const res = await api<{ _id: string }>('/resume/create', {
          method: 'POST',
          body: {
            ...(resumeId ? { id: resumeId } : {}),
            data: formData,
            templateId: template,
            title,
          },
        });
        if (!resumeId && res?._id) setResumeId(res._id);
        setSaveState('saved');
        if (!silent) toast.success(t('builderPage.toastResumeSaved'));
        return true;
      } catch (err) {
        setSaveState('error');
        // Duplicate name — surface it in the naming modal so the user can
        // fix it inline instead of a dead-end toast.
        if (err instanceof ApiError && err.status === 409) {
          setNameDraft(title);
          setNameError(err.message);
          setNameModalOpen(true);
          return false;
        }
        if (!silent) toast.error(apiErrorMessage(err, t('builderPage.toastSaveFailed')));
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, template, resumeId]
  );

  // Local draft persists on every change; server autosave (debounced) once the
  // resume exists on the server.
  useEffect(() => {
    persistLocal(formData);
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!resumeId || !isLoggedIn()) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveToServer(true), 2500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, template]);

  // Legacy post-login autosave flow (?autosave=true)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autosave') === 'true' && getToken()) {
      saveToServer();
      urlParams.delete('autosave');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Form field handlers ----------

  const onContactChange = useCallback(
    (field: keyof Omit<ResumeData, 'education' | 'experience' | 'skills'>, value: string) => {
      setFormData((old) => ({ ...old, [field]: value }));
    },
    []
  );

  const onSummaryChange = useCallback((val: string) => {
    setFormData((old) => ({ ...old, summary: val }));
  }, []);

  const onDeveloperToggle = useCallback((checked: boolean) => {
    setFormData((old) => ({ ...old, isDeveloper: checked, github: checked ? old.github : '' }));
  }, []);

  const onChange = useCallback(
    (field: 'education' | 'experience', index: number, key: string, value: string) => {
      setFormData((old) => {
        const arr = [...(old[field] as unknown as Record<string, string>[])];
        arr[index] = { ...arr[index], [key]: value };
        return { ...old, [field]: arr } as ResumeData;
      });
    },
    []
  );

  const addItem = (field: 'education' | 'experience' | 'skills') => {
    setFormData((old) => {
      if (field === 'education')
        return { ...old, education: [...old.education, { school: '', degree: '', from: '', to: '' }] };
      if (field === 'experience')
        return {
          ...old,
          experience: [...old.experience, { company: '', role: '', from: '', to: '', description: '' }],
        };
      return { ...old, skills: [...old.skills, ''] };
    });
  };

  const removeItem = (field: 'education' | 'experience' | 'skills', index: number) => {
    setFormData((old) => {
      const arr = [...(old[field] as unknown[])];
      arr.splice(index, 1);
      return { ...old, [field]: arr } as ResumeData;
    });
    if (field === 'experience') {
      setAiExpSuggestions((old) => old.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (formData.experience.length > 0 && aiExpSuggestions.length < formData.experience.length) {
      setAiExpSuggestions((old) => {
        const next = [...old];
        while (next.length < formData.experience.length) next.push([]);
        return next;
      });
    }
  }, [formData.experience.length, aiExpSuggestions.length]);

  // ---------- AI suggestions (new /generate API with legacy fallback) ----------

  const generate = useCallback(
    async (type: string, extra: Record<string, unknown> = {}) => {
      try {
        return await api<{ suggestions?: string[]; text?: string }>('/generate', {
          method: 'POST',
          body: { type, data: formData, ...extra },
        });
      } catch (err) {
        // Older deployed backend without /generate → legacy prompt endpoint.
        if (err instanceof ApiError && err.status === 404) {
          const legacyPrompt =
            type === 'summary'
              ? `Suggest improvements or rewrite for this professional summary: ${formData.summary}`
              : type === 'skills'
              ? `Based on this resume, list at least 9 relevant skills as bullet points:\n${formData.experience
                  .map((e) => e.description)
                  .join('\n')}`
              : '';
          const path = type === 'summary' ? '/ai/suggest/summary' : '/ai/suggest';
          return await api<{ suggestions?: string[] }>(path, {
            method: 'POST',
            body: { prompt: legacyPrompt },
          });
        }
        throw err;
      }
    },
    [formData]
  );

  const getSummarySuggestions = useCallback(async () => {
    if (!formData.summary.trim()) return;
    setAiLoading(true);
    try {
      const res = await generate('summary');
      setAiSummarySuggestions(res.suggestions || []);
      if (!res.suggestions?.length) toast.info(t('builderPage.toastNoSuggestions'));
    } catch (err) {
      toast.error(apiErrorMessage(err, t('builderPage.toastAiSuggestError')));
    } finally {
      setAiLoading(false);
    }
  }, [formData.summary, generate, t]);

  const getExperienceSuggestions = async (index: number) => {
    const exp = formData.experience[index];
    if (!exp?.description.trim()) {
      toast.info(t('builderPage.toastFillJobDescFirst'));
      return;
    }
    if (!isLoggedIn()) {
      toast.info(t('builderPage.toastLoginForExpSuggestions'));
      return;
    }
    setAiLoading(true);
    try {
      const res = await generate('bullets', { experienceIndex: index });
      setAiExpSuggestions((prev) => {
        const updated = [...prev];
        updated[index] = res.suggestions || [];
        return updated;
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, t('builderPage.toastAiExpFailed')));
    } finally {
      setAiLoading(false);
    }
  };

  const getSkillSuggestions = async () => {
    if (!isLoggedIn()) {
      toast.info(t('builderPage.toastLoginForSkillSuggestions'));
      return;
    }
    setAiLoading(true);
    try {
      const res = await generate('skills');
      const raw = res.suggestions || [];
      // Legacy endpoint returns bullet-formatted lines; strip markers.
      const cleaned = raw
        .map((s) => s.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
        .filter((s) => !formData.skills.some((have) => have.toLowerCase() === s.toLowerCase()));
      setAiSkillSuggestions(cleaned);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('builderPage.toastAiSkillsFailed')));
    } finally {
      setAiLoading(false);
    }
  };

  // ---------- Save & export ----------

  const handleSaveResume = async () => {
    if (!isLoggedIn()) {
      localStorage.setItem('resumeDataToSave', JSON.stringify(formData));
      router.push('/login?redirect=saveResume');
      return;
    }
    if (!formData.title?.trim()) {
      setNameDraft(formData.fullName ? `${formData.fullName} Resume` : '');
      setNameError(null);
      setNameModalOpen(true);
      return;
    }
    setSaving(true);
    const ok = await saveToServer();
    setSaving(false);
    if (ok && mode === 'create' && !resumeId) router.push('/dashboard');
  };

  const confirmNameAndSave = async () => {
    const title = nameDraft.trim();
    if (!title) {
      setNameError(t('builderPage.nameRequiredError'));
      return;
    }
    setFormData((old) => ({ ...old, title }));
    setNameModalOpen(false);
    setNameError(null);
    setSaving(true);
    // formData.title updates asynchronously via setState, so pass the
    // confirmed title straight through rather than reading stale state.
    try {
      const res = await api<{ _id: string }>('/resume/create', {
        method: 'POST',
        body: { ...(resumeId ? { id: resumeId } : {}), data: { ...formData, title }, templateId: template, title },
      });
      if (!resumeId && res?._id) setResumeId(res._id);
      setSaveState('saved');
      toast.success(t('builderPage.toastResumeSaved'));
      if (mode === 'create' && !resumeId) router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNameError(err.message);
        setNameModalOpen(true);
      } else {
        toast.error(apiErrorMessage(err, t('builderPage.toastSaveFailed')));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await exportElementToPDF(exportRef.current, `${formData.fullName || 'resume'}.pdf`);
      toast.success(t('builderPage.toastPdfDownloaded'));
    } catch (err) {
      console.error(err);
      toast.error(t('builderPage.toastPdfFailed'));
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    try {
      await exportToDocx(formData, `${formData.fullName || 'resume'}.docx`);
      toast.success(t('builderPage.toastDocxDownloaded'));
    } catch (err) {
      console.error(err);
      toast.error(t('builderPage.toastDocxFailed'));
    } finally {
      setExporting(null);
    }
  };

  // ---------- Customization handlers ----------

  const setOrder = (order: SectionKey[]) => setFormData((old) => ({ ...old, sectionOrder: order }));
  const toggleSection = (section: SectionKey) =>
    setFormData((old) => {
      const hidden = old.hiddenSections || [];
      return {
        ...old,
        hiddenSections: hidden.includes(section) ? hidden.filter((s) => s !== section) : [...hidden, section],
      };
    });
  const setCustomization = (customization: TemplateCustomization) =>
    setFormData((old) => ({ ...old, customization }));

  const saveIndicator =
    saveState === 'saving' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('builderPage.savingIndicator')}
      </span>
    ) : saveState === 'saved' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
        <Check className="w-3.5 h-3.5" /> {t('builderPage.savedIndicator')}
      </span>
    ) : saveState === 'error' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">{t('builderPage.autosaveFailed')}</span>
    ) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {mode === 'edit' ? t('builderPage.editTitle') : t('builderPage.createTitle')}
          </h1>
          <div className="flex items-center gap-3 mt-1 min-h-[18px]">
            <p className="text-sm text-muted-foreground">{t('builderPage.autosaveNotice')}</p>
            {saveIndicator}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden"
          >
            {showPreview ? t('builderPage.hidePreview') : t('builderPage.previewButton')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileDown className="w-4 h-4" />}
            loading={exporting === 'pdf'}
            onClick={handleExportPDF}
          >
            {t('builderPage.pdfButton')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4" />}
            loading={exporting === 'docx'}
            onClick={handleExportDocx}
          >
            {t('builderPage.docxButton')}
          </Button>
          <Button
            size="sm"
            icon={<Save className="w-4 h-4" />}
            loading={saving}
            onClick={handleSaveResume}
          >
            {authed ? t('builderPage.saveButton') : t('builderPage.saveLoginButton')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* ---------- Form column ---------- */}
        <div>
          <ProgressBar step={step} totalSteps={STEPS.length} />
          <StepNavigation steps={STEPS} currentStep={step} onStepChange={setStep} />

          <div className="mt-2 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <ContactStep
                    formData={formData}
                    onChange={onContactChange}
                    onSummaryChange={onSummaryChange}
                    summary={formData.summary}
                    getSummarySuggestions={getSummarySuggestions}
                    aiSummarySuggestions={aiSummarySuggestions}
                    applySummarySuggestion={(sugg) => {
                      setFormData((old) => ({ ...old, summary: sugg }));
                      setAiSummarySuggestions([]);
                    }}
                    aiLoading={aiLoading}
                    isDeveloper={formData.isDeveloper}
                    onDeveloperToggle={onDeveloperToggle}
                  />
                )}

                {step === 1 && (
                  <ExperienceStep
                    experience={formData.experience}
                    addItem={() => addItem('experience')}
                    removeItem={(index) => removeItem('experience', index)}
                    onChange={(index, key, value) => onChange('experience', index, key, value)}
                    getExperienceSuggestions={getExperienceSuggestions}
                    aiExpSuggestions={aiExpSuggestions}
                    applyExperienceSuggestion={(index, sugg) => {
                      setFormData((old) => {
                        const updated = [...old.experience];
                        updated[index] = { ...updated[index], description: sugg };
                        return { ...old, experience: updated };
                      });
                      setAiExpSuggestions((old) => {
                        const updated = [...old];
                        updated[index] = [];
                        return updated;
                      });
                    }}
                    aiLoading={aiLoading}
                  />
                )}

                {step === 2 && (
                  <EducationStep
                    education={formData.education}
                    addItem={() => addItem('education')}
                    removeItem={(index) => removeItem('education', index)}
                    onChange={(index, field, value) => onChange('education', index, field, value)}
                  />
                )}

                {step === 3 && (
                  <SkillsStep
                    skills={formData.skills}
                    addItem={() => addItem('skills')}
                    removeItem={(index) => removeItem('skills', index)}
                    onChange={(index, value) => {
                      setFormData((old) => {
                        const skills = [...old.skills];
                        skills[index] = value;
                        return { ...old, skills };
                      });
                    }}
                    getSkillSuggestions={getSkillSuggestions}
                    aiSkillSuggestions={aiSkillSuggestions}
                    aiLoading={aiLoading}
                  />
                )}

                {step === 4 && (
                  <section className="bg-surface p-6 sm:p-8 rounded-2xl shadow-soft border border-border space-y-8">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-1">
                        <Settings2 className="w-5 h-5 text-primary" aria-hidden /> {t('builderPage.customizeFinishTitle')}
                      </h2>
                      <p className="text-sm text-muted-foreground">{t('builderPage.customizeFinishDesc')}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="resumeTitle" className="block text-sm font-medium text-foreground mb-1.5">
                          {t('builderPage.resumeNameLabel')} <span className="text-danger">*</span>
                        </label>
                        <input
                          id="resumeTitle"
                          required
                          value={formData.title || ''}
                          onChange={(e) => setFormData((old) => ({ ...old, title: e.target.value }))}
                          placeholder={t('builderPage.resumeNamePlaceholder')}
                          className="w-full px-3.5 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{t('builderPage.resumeNameHelper')}</p>
                      </div>
                      <div>
                        <label htmlFor="builderTargetRole" className="block text-sm font-medium text-foreground mb-1.5">
                          {t('builderPage.targetRoleLabel')} <span className="text-muted-foreground font-normal">{t('builderPage.targetRoleOptional')}</span>
                        </label>
                        <input
                          id="builderTargetRole"
                          value={formData.targetRole || ''}
                          onChange={(e) => setFormData((old) => ({ ...old, targetRole: e.target.value }))}
                          placeholder={t('builderPage.targetRolePlaceholder')}
                          className="w-full px-3.5 py-2.5 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2.5">{t('builderPage.templateLabel')}</h3>
                      <TemplateSelector template={template} setTemplate={(v) => setTemplate(v as TemplateId)} />
                    </div>

                    <SectionManager
                      sectionOrder={formData.sectionOrder || []}
                      hiddenSections={formData.hiddenSections || []}
                      customization={formData.customization || emptyResumeData().customization!}
                      onOrderChange={setOrder}
                      onToggleSection={toggleSection}
                      onCustomizationChange={setCustomization}
                    />

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
                      <Button icon={<FileDown className="w-4 h-4" />} loading={exporting === 'pdf'} onClick={handleExportPDF} variant="secondary">
                        {t('builderPage.exportPdfButton')}
                      </Button>
                      <Button icon={<FileText className="w-4 h-4" />} loading={exporting === 'docx'} onClick={handleExportDocx} variant="outline">
                        {t('builderPage.exportDocxButton')}
                      </Button>
                      <Button icon={<CloudUpload className="w-4 h-4" />} loading={saving} onClick={handleSaveResume} variant="success">
                        {authed ? t('builderPage.saveToAccountButton') : t('builderPage.loginSaveButton')}
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step navigation buttons */}
          <div className="flex justify-between items-center gap-4 mt-8">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              {t('builderPage.previousButton')}
            </Button>
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>{t('builderPage.nextButton')}</Button>
            )}
          </div>
        </div>

        {/* ---------- Live preview column ---------- */}
        <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
          <div className="lg:sticky lg:top-20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('builderPage.livePreviewLabel')}</p>
            <div className="bg-muted rounded-2xl p-3 sm:p-5 overflow-auto thin-scrollbar max-h-[80vh] border border-border">
              {/* Scale steps roughly track how much width this column actually
                  has: full viewport width while stacked below the form
                  (<lg), then half the container once side-by-side kicks in
                  at lg — which is deliberately lg, not xl, so ~1024px+
                  laptop/tablet-landscape widths get the real side-by-side
                  layout instead of a toggled, heavily-shrunk preview. */}
              <div className="origin-top-left scale-[0.45] sm:scale-[0.6] lg:scale-[0.55] xl:scale-[0.7] w-[222%] sm:w-[166%] lg:w-[182%] xl:w-[143%]">
                <div className="shadow-2xl">
                  <ResumePreview data={formData} template={template} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden full-size copy used for pixel-perfect PDF export. insetInlineStart
          (not left) keeps this off-canvas on the logical start side under
          RTL too, so it doesn't blow up the page's scrollable width. */}
      <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '-9999px', top: 0 }}>
        <div ref={exportRef}>
          <ResumePreview data={formData} template={template} />
        </div>
      </div>

      {/* Every resume needs a clear, distinct name before it can be saved. */}
      <Modal open={nameModalOpen} onClose={() => setNameModalOpen(false)} title={t('builderPage.nameModalTitle')} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('builderPage.nameModalDesc')}</p>
          <div>
            <label htmlFor="resumeNameModal" className="sr-only">
              {t('builderPage.resumeNameSrLabel')}
            </label>
            <input
              id="resumeNameModal"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate: this field only exists inside a just-opened Modal, so moving focus into it matches the WAI-ARIA dialog pattern.
              autoFocus
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmNameAndSave();
                }
              }}
              placeholder={t('builderPage.resumeNamePlaceholder')}
              className={`w-full px-3.5 py-2.5 min-h-11 text-sm border rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 ${
                nameError ? 'border-danger focus:ring-danger' : 'border-border-strong focus:ring-primary'
              }`}
            />
            {nameError && <p className="text-danger text-xs mt-1.5 font-medium">{nameError}</p>}
          </div>
          <Button fullWidth loading={saving} onClick={confirmNameAndSave}>
            {t('builderPage.saveResumeButton')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
