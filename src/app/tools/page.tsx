'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Mail,
  Linkedin,
  User,
  Sparkles,
  Copy,
  Download,
  FileText,
  MessagesSquare,
  Send,
  Reply,
  MailCheck,
  Type,
} from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import type { ResumeRecord, InterviewQuestion } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

type Tool =
  | 'cover-letter'
  | 'interview-prep'
  | 'linkedin-summary'
  | 'linkedin-headline'
  | 'recruiter-message'
  | 'follow-up-email'
  | 'thank-you-email'
  | 'bio';

interface ToolFields {
  job?: boolean; // job title + company
  jd?: boolean; // job description textarea
  recipient?: boolean; // recipient name
  targetRole?: boolean;
  tone?: boolean;
}

const TOOLS: {
  id: Tool;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  descKey: string;
  fields: ToolFields;
}[] = [
  {
    id: 'cover-letter',
    labelKey: 'toolsPage.toolCoverLetterLabel',
    icon: Mail,
    descKey: 'toolsPage.toolCoverLetterDesc',
    fields: { job: true, jd: true, tone: true },
  },
  {
    id: 'interview-prep',
    labelKey: 'toolsPage.toolInterviewPrepLabel',
    icon: MessagesSquare,
    descKey: 'toolsPage.toolInterviewPrepDesc',
    fields: { job: true, jd: true },
  },
  {
    id: 'recruiter-message',
    labelKey: 'toolsPage.toolRecruiterMessageLabel',
    icon: Send,
    descKey: 'toolsPage.toolRecruiterMessageDesc',
    fields: { job: true, jd: true, recipient: true, tone: true },
  },
  {
    id: 'follow-up-email',
    labelKey: 'toolsPage.toolFollowUpLabel',
    icon: Reply,
    descKey: 'toolsPage.toolFollowUpDesc',
    fields: { job: true, recipient: true, tone: true },
  },
  {
    id: 'thank-you-email',
    labelKey: 'toolsPage.toolThankYouLabel',
    icon: MailCheck,
    descKey: 'toolsPage.toolThankYouDesc',
    fields: { job: true, recipient: true, tone: true },
  },
  {
    id: 'linkedin-summary',
    labelKey: 'toolsPage.toolLinkedinSummaryLabel',
    icon: Linkedin,
    descKey: 'toolsPage.toolLinkedinSummaryDesc',
    fields: { targetRole: true, tone: true },
  },
  {
    id: 'linkedin-headline',
    labelKey: 'toolsPage.toolLinkedinHeadlineLabel',
    icon: Type,
    descKey: 'toolsPage.toolLinkedinHeadlineDesc',
    fields: { targetRole: true },
  },
  {
    id: 'bio',
    labelKey: 'toolsPage.toolBioLabel',
    icon: User,
    descKey: 'toolsPage.toolBioDesc',
    fields: {},
  },
];

function ToolsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [tool, setTool] = useState<Tool>((searchParams.get('tool') as Tool) || 'cover-letter');
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [aiUsed, setAiUsed] = useState(true);

  // Shared generator inputs (which ones show depends on the selected tool)
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'professional' | 'confident' | 'friendly'>('professional');
  const [targetRole, setTargetRole] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/tools');
      return;
    }
    api<ResumeRecord[]>('/resume/resumes')
      .then((data) => {
        setResumes(data);
        if (data.length > 0) setSelectedResume(data[0]._id);
      })
      .catch((err) => toast.error(apiErrorMessage(err, t('toolsPage.toastLoadResumesError'))))
      .finally(() => setLoading(false));

    // Prefill from job discovery ("Cover letter" / "Interview prep" on a job card)
    const ctx = sessionStorage.getItem('tools:jobContext');
    if (ctx) {
      try {
        const parsed = JSON.parse(ctx);
        setJobTitle(parsed.jobTitle || '');
        setCompany(parsed.company || '');
        setJobDescription(parsed.jobDescription || '');
        const requested = searchParams.get('tool') as Tool | null;
        if (!requested || !TOOLS.some((tl) => tl.id === requested)) setTool('cover-letter');
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem('tools:jobContext');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  const resume = resumes.find((r) => r._id === selectedResume);

  const generate = async () => {
    if (!resume) {
      toast.info(t('toolsPage.toastCreateResumeFirst'));
      return;
    }
    setGenerating(true);
    setOutput('');
    setQuestions([]);
    try {
      const res = await api<{ text?: string; suggestions?: string[]; questions?: InterviewQuestion[]; aiUsed?: boolean }>('/generate', {
        method: 'POST',
        body: {
          type: tool,
          data: resume.data,
          jobTitle,
          company,
          jobDescription,
          tone,
          targetRole,
          recipientName,
        },
      });
      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        // Plain-text version powers the Copy / .txt buttons.
        setOutput(
          res.questions
            .map((q, i) => `${i + 1}. [${q.category}] ${q.question}\n   How to prepare: ${q.starHint}`)
            .join('\n\n')
        );
      } else {
        setOutput(res.text || (res.suggestions || []).join('\n\n'));
      }
      setAiUsed(res.aiUsed !== false);
      if (res.aiUsed === false) {
        toast.info(t('toolsPage.toastAiNotConfigured'));
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, t('toolsPage.toastGenerationFailed')));
    } finally {
      setGenerating(false);
    }
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    toast.success(t('toolsPage.toastCopied'));
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool}${company ? `-${company}` : ''}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTool = TOOLS.find((tl) => tl.id === tool)!;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Skeleton className="h-9 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('toolsPage.title')}</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">{t('toolsPage.subtitle')}</p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={t('toolsPage.needResumeTitle')}
            description={t('toolsPage.needResumeDescription')}
            action={<Button onClick={() => router.push('/resume')}>{t('toolsPage.createResume')}</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Tool selector */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" role="tablist" aria-label={t('toolsPage.ariaWritingTools')}>
            {TOOLS.map(({ id, labelKey, icon: Icon, descKey }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tool === id}
                onClick={() => {
                  setTool(id);
                  setOutput('');
                  setQuestions([]);
                }}
                className={clsx(
                  'text-left p-4 rounded-2xl border transition-all duration-150',
                  tool === id
                    ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                )}
              >
                <Icon className={clsx('w-5 h-5 mb-2', tool === id ? 'text-blue-600' : 'text-slate-400')} aria-hidden />
                <p className="font-semibold text-sm text-slate-900">{t(labelKey)}</p>
                <p className="text-xs text-slate-500 mt-1">{t(descKey)}</p>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Inputs */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-slate-900">{t('toolsPage.detailsSuffix', { tool: t(activeTool.labelKey) })}</h2>

              <div>
                <label htmlFor="tool-resume" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('toolsPage.baseResume')}
                </label>
                <select
                  id="tool-resume"
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title || r.data?.fullName || t('toolsPage.untitledResume')}
                    </option>
                  ))}
                </select>
              </div>

              {activeTool.fields.job && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cl-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('toolsPage.jobTitleLabel')}
                    </label>
                    <input
                      id="cl-title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t('toolsPage.jobTitlePlaceholder')}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="cl-company" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('toolsPage.companyLabel')}
                    </label>
                    <input
                      id="cl-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={t('toolsPage.companyPlaceholder')}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {activeTool.fields.recipient && (
                <div>
                  <label htmlFor="recipient" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('toolsPage.recipientLabel')} <span className="text-slate-400 font-normal">{t('toolsPage.optional')}</span>
                  </label>
                  <input
                    id="recipient"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={t('toolsPage.recipientPlaceholder')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {activeTool.fields.jd && (
                <div>
                  <label htmlFor="cl-jd" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('toolsPage.jdLabel')} <span className="text-slate-400 font-normal">{t('toolsPage.recommended')}</span>
                  </label>
                  <textarea
                    id="cl-jd"
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder={t('toolsPage.jdPlaceholder')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              )}

              {activeTool.fields.targetRole && (
                <div>
                  <label htmlFor="li-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('toolsPage.targetRoleLabel')} <span className="text-slate-400 font-normal">{t('toolsPage.optional')}</span>
                  </label>
                  <input
                    id="li-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder={t('toolsPage.targetRolePlaceholder')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {activeTool.fields.tone && (
                <div>
                  <label htmlFor="tool-tone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('toolsPage.toneLabel')}
                  </label>
                  <select
                    id="tool-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as typeof tone)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">{t('toolsPage.toneProfessional')}</option>
                    <option value="confident">{t('toolsPage.toneConfident')}</option>
                    <option value="friendly">{t('toolsPage.toneFriendly')}</option>
                  </select>
                </div>
              )}

              <Button icon={<Sparkles className="w-4 h-4" />} loading={generating} onClick={generate} fullWidth size="lg">
                {generating ? t('toolsPage.writing') : t('toolsPage.generate', { tool: t(activeTool.labelKey).toLowerCase() })}
              </Button>
            </Card>

            {/* Output */}
            <Card className="min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">{t('toolsPage.result')}</h2>
                {output && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyOutput}>
                      {t('toolsPage.copy')}
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadOutput}>
                      {t('toolsPage.txt')}
                    </Button>
                  </div>
                )}
              </div>
              {generating ? (
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : output ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                  {!aiUsed && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                      {questions.length > 0
                        ? t('toolsPage.aiNotConfiguredQuestions')
                        : t('toolsPage.aiNotConfiguredTemplate')}
                    </p>
                  )}
                  {questions.length > 0 ? (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto thin-scrollbar pr-1">
                      {questions.map((q, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {i + 1}. {q.question}
                            </p>
                            <Badge
                              tone={q.category === 'technical' ? 'blue' : q.category === 'behavioral' ? 'purple' : 'slate'}
                              className="shrink-0"
                            >
                              {q.category}
                            </Badge>
                          </div>
                          {q.starHint && (
                            <p className="text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <span className="font-semibold text-slate-700">{t('toolsPage.howToPrepare')}</span>
                              {q.starHint}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={output}
                        onChange={(e) => setOutput(e.target.value)}
                        rows={14}
                        aria-label={t('toolsPage.generatedTextAria')}
                        className="flex-1 w-full text-sm text-slate-800 leading-relaxed border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                      <p className="text-xs text-slate-400 mt-2">{t('toolsPage.editFreely')}</p>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="text-sm text-slate-400 max-w-xs">{t('toolsPage.fillDetailsPrompt')}</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10"><Skeleton className="h-96" /></div>}>
      <ToolsContent />
    </Suspense>
  );
}
