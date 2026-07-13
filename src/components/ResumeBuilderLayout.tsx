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
import { api, ApiError, apiErrorMessage } from '@/lib/api';
import { getToken, isLoggedIn } from '@/lib/auth';
import { exportElementToPDF, exportToDocx } from '@/lib/exportResume';
import {
  emptyResumeData,
  normalizeResumeData,
  type ResumeData,
  type SectionKey,
  type TemplateId,
  type TemplateCustomization,
} from '@/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const STEPS = ['Contact', 'Experience', 'Education', 'Skills', 'Customize'];

export default function ResumeBuilderLayout({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const router = useRouter();
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
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load resume.')));
  }, [mode, routeResumeId, router]);

  // ---------- Persistence ----------

  const persistLocal = useCallback((data: ResumeData) => {
    localStorage.setItem('resumeData', JSON.stringify(data));
    sessionStorage.setItem('resumeData', JSON.stringify(data));
  }, []);

  const saveToServer = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!isLoggedIn()) return false;
      setSaveState('saving');
      try {
        const res = await api<{ _id: string }>('/resume/create', {
          method: 'POST',
          body: {
            ...(resumeId ? { id: resumeId } : {}),
            data: formData,
            templateId: template,
            title: formData.title || formData.fullName || 'Untitled resume',
          },
        });
        if (!resumeId && res?._id) setResumeId(res._id);
        setSaveState('saved');
        if (!silent) toast.success('Resume saved');
        return true;
      } catch (err) {
        setSaveState('error');
        if (!silent) toast.error(apiErrorMessage(err, 'Failed to save resume.'));
        return false;
      }
    },
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
      if (!res.suggestions?.length) toast.info('No suggestions returned — try adding more detail first.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not get AI suggestions.'));
    } finally {
      setAiLoading(false);
    }
  }, [formData.summary, generate]);

  const getExperienceSuggestions = async (index: number) => {
    const exp = formData.experience[index];
    if (!exp?.description.trim()) {
      toast.info('Fill in the job description first, then let AI improve it.');
      return;
    }
    if (!isLoggedIn()) {
      toast.info('Log in to use AI experience suggestions.');
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
      toast.error(apiErrorMessage(err, 'AI could not improve this description.'));
    } finally {
      setAiLoading(false);
    }
  };

  const getSkillSuggestions = async () => {
    if (!isLoggedIn()) {
      toast.info('Log in to use AI skill suggestions.');
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
      toast.error(apiErrorMessage(err, 'AI could not suggest skills.'));
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
    setSaving(true);
    const ok = await saveToServer();
    setSaving(false);
    if (ok && mode === 'create' && !resumeId) router.push('/dashboard');
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await exportElementToPDF(exportRef.current, `${formData.fullName || 'resume'}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed — please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    try {
      await exportToDocx(formData, `${formData.fullName || 'resume'}.docx`);
      toast.success('DOCX downloaded');
    } catch (err) {
      console.error(err);
      toast.error('DOCX export failed — please try again.');
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
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
      </span>
    ) : saveState === 'saved' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <Check className="w-3.5 h-3.5" /> All changes saved
      </span>
    ) : saveState === 'error' ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">Autosave failed</span>
    ) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {mode === 'edit' ? 'Edit Your Resume' : 'Create Your Resume'}
          </h1>
          <div className="flex items-center gap-3 mt-1 min-h-[18px]">
            <p className="text-sm text-slate-500">Your work is saved automatically to this browser.</p>
            {saveIndicator}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            onClick={() => setShowPreview((v) => !v)}
            className="xl:hidden"
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileDown className="w-4 h-4" />}
            loading={exporting === 'pdf'}
            onClick={handleExportPDF}
          >
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4" />}
            loading={exporting === 'docx'}
            onClick={handleExportDocx}
          >
            DOCX
          </Button>
          <Button
            size="sm"
            icon={<Save className="w-4 h-4" />}
            loading={saving}
            onClick={handleSaveResume}
          >
            {isLoggedIn() ? 'Save' : 'Save (log in)'}
          </Button>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-8 items-start">
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
                  <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-1">
                        <Settings2 className="w-5 h-5 text-blue-500" aria-hidden /> Customize & finish
                      </h2>
                      <p className="text-sm text-slate-500">
                        Name your resume, pick a template, arrange sections, and tune the look.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="resumeTitle" className="block text-sm font-medium text-slate-700 mb-1.5">
                          Resume name
                        </label>
                        <input
                          id="resumeTitle"
                          value={formData.title || ''}
                          onChange={(e) => setFormData((old) => ({ ...old, title: e.target.value }))}
                          placeholder='e.g. "Frontend roles — 2026"'
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="builderTargetRole" className="block text-sm font-medium text-slate-700 mb-1.5">
                          Target role <span className="text-slate-400 font-normal">(shown on some templates)</span>
                        </label>
                        <input
                          id="builderTargetRole"
                          value={formData.targetRole || ''}
                          onChange={(e) => setFormData((old) => ({ ...old, targetRole: e.target.value }))}
                          placeholder="e.g. Frontend Developer"
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2.5">Template</h3>
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

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                      <Button icon={<FileDown className="w-4 h-4" />} loading={exporting === 'pdf'} onClick={handleExportPDF} variant="secondary">
                        Export PDF
                      </Button>
                      <Button icon={<FileText className="w-4 h-4" />} loading={exporting === 'docx'} onClick={handleExportDocx} variant="outline">
                        Export DOCX
                      </Button>
                      <Button icon={<CloudUpload className="w-4 h-4" />} loading={saving} onClick={handleSaveResume} variant="success">
                        {isLoggedIn() ? 'Save to my account' : 'Log in & save'}
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
              Previous
            </Button>
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
            )}
          </div>
        </div>

        {/* ---------- Live preview column ---------- */}
        <div className={`${showPreview ? 'block' : 'hidden'} xl:block`}>
          <div className="xl:sticky xl:top-20">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Live preview</p>
            <div className="bg-slate-200/60 rounded-2xl p-3 sm:p-5 overflow-auto thin-scrollbar max-h-[80vh] border border-slate-200">
              <div className="origin-top-left scale-[0.45] sm:scale-[0.6] lg:scale-[0.7] w-[222%] sm:w-[166%] lg:w-[142%]">
                <div className="shadow-2xl">
                  <ResumePreview data={formData} template={template} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden full-size copy used for pixel-perfect PDF export */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={exportRef}>
          <ResumePreview data={formData} template={template} />
        </div>
      </div>
    </div>
  );
}
