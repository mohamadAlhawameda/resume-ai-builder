'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Mail, Linkedin, User, Sparkles, Copy, Download, FileText } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import type { ResumeRecord } from '@/lib/types';

type Tool = 'cover-letter' | 'linkedin-summary' | 'bio';

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    id: 'cover-letter',
    label: 'Cover Letter',
    icon: Mail,
    description: 'A tailored cover letter grounded in your resume and the job you are applying to.',
  },
  {
    id: 'linkedin-summary',
    label: 'LinkedIn Summary',
    icon: Linkedin,
    description: 'A first-person "About" section for your LinkedIn profile.',
  },
  {
    id: 'bio',
    label: 'Professional Bio',
    icon: User,
    description: 'A short third-person bio for portfolios, talks, or team pages.',
  },
];

function ToolsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tool, setTool] = useState<Tool>((searchParams.get('tool') as Tool) || 'cover-letter');
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [aiUsed, setAiUsed] = useState(true);

  // Cover letter inputs
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'professional' | 'confident' | 'friendly'>('professional');
  const [targetRole, setTargetRole] = useState('');

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
      .catch((err) => toast.error(apiErrorMessage(err, 'Could not load resumes.')))
      .finally(() => setLoading(false));

    // Prefill from job discovery ("Cover letter" button on a job card)
    const ctx = sessionStorage.getItem('tools:jobContext');
    if (ctx) {
      try {
        const parsed = JSON.parse(ctx);
        setJobTitle(parsed.jobTitle || '');
        setCompany(parsed.company || '');
        setJobDescription(parsed.jobDescription || '');
        setTool('cover-letter');
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem('tools:jobContext');
    }
  }, [router]);

  const resume = resumes.find((r) => r._id === selectedResume);

  const generate = async () => {
    if (!resume) {
      toast.info('Create a resume first — the generators are grounded in it.');
      return;
    }
    setGenerating(true);
    setOutput('');
    try {
      const res = await api<{ text?: string; suggestions?: string[]; aiUsed?: boolean }>('/generate', {
        method: 'POST',
        body: {
          type: tool,
          data: resume.data,
          jobTitle,
          company,
          jobDescription,
          tone,
          targetRole,
        },
      });
      setOutput(res.text || (res.suggestions || []).join('\n\n'));
      setAiUsed(res.aiUsed !== false);
      if (res.aiUsed === false) {
        toast.info('AI is not configured on the server — this is a starter template to edit.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Generation failed — please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
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

  const activeTool = TOOLS.find((t) => t.id === tool)!;

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">AI Writing Tools</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Generate application materials grounded in your actual resume — nothing invented.
        </p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="You need a resume first"
            description="These tools are grounded in your resume content. Create one and come back."
            action={<Button onClick={() => router.push('/resume')}>Create resume</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Tool selector */}
          <div className="grid sm:grid-cols-3 gap-3 mb-6" role="tablist" aria-label="Writing tools">
            {TOOLS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tool === id}
                onClick={() => {
                  setTool(id);
                  setOutput('');
                }}
                className={clsx(
                  'text-left p-4 rounded-2xl border transition-all duration-150',
                  tool === id
                    ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                )}
              >
                <Icon className={clsx('w-5 h-5 mb-2', tool === id ? 'text-blue-600' : 'text-slate-400')} aria-hidden />
                <p className="font-semibold text-sm text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Inputs */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-slate-900">{activeTool.label} details</h2>

              <div>
                <label htmlFor="tool-resume" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Base resume
                </label>
                <select
                  id="tool-resume"
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title || r.data?.fullName || 'Untitled resume'}
                    </option>
                  ))}
                </select>
              </div>

              {tool === 'cover-letter' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cl-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Job title
                      </label>
                      <input
                        id="cl-title"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Frontend Developer"
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="cl-company" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Company
                      </label>
                      <input
                        id="cl-company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Acme Inc."
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cl-jd" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Job description <span className="text-slate-400 font-normal">(recommended)</span>
                    </label>
                    <textarea
                      id="cl-jd"
                      rows={6}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description for a sharper letter…"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>
                </>
              )}

              {tool === 'linkedin-summary' && (
                <div>
                  <label htmlFor="li-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Target role <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="li-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Full Stack Developer"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {tool !== 'bio' && (
                <div>
                  <label htmlFor="tool-tone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tone
                  </label>
                  <select
                    id="tool-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as typeof tone)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="confident">Confident</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>
              )}

              <Button icon={<Sparkles className="w-4 h-4" />} loading={generating} onClick={generate} fullWidth size="lg">
                {generating ? 'Writing…' : `Generate ${activeTool.label.toLowerCase()}`}
              </Button>
            </Card>

            {/* Output */}
            <Card className="min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">Result</h2>
                {output && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyOutput}>
                      Copy
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadOutput}>
                      .txt
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
                      Starter template (AI not configured on server) — fill in the bracketed parts.
                    </p>
                  )}
                  <textarea
                    value={output}
                    onChange={(e) => setOutput(e.target.value)}
                    rows={14}
                    aria-label="Generated text (editable)"
                    className="flex-1 w-full text-sm text-slate-800 leading-relaxed border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                  <p className="text-xs text-slate-400 mt-2">Edit freely — this is your voice, AI just drafted it.</p>
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="text-sm text-slate-400 max-w-xs">
                    Fill in the details and hit generate. The result appears here, ready to edit and copy.
                  </p>
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
