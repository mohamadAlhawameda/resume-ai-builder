'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FileText,
  Copy,
  Pencil,
  Trash2,
  Eye,
  History,
  FilePlus2,
  RotateCcw,
  Columns2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ResumePreview from '@/components/ResumePreview';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  normalizeResumeData,
  type ResumeRecord,
  type ResumeVersion,
  type TemplateId,
} from '@/lib/types';

const formatDate = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

const formatDateTime = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

type WithScore = ResumeRecord & { lastScore?: number | null };

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<WithScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [preview, setPreview] = useState<WithScore | null>(null);
  const [renaming, setRenaming] = useState<WithScore | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<WithScore | null>(null);
  const [versionsFor, setVersionsFor] = useState<WithScore | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [compareVersion, setCompareVersion] = useState<ResumeVersion | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<WithScore[]>('/resume/resumes');
      setResumes(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load your resumes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/resumes');
      return;
    }
    load();
  }, [router, load]);

  const handleDuplicate = async (resume: WithScore) => {
    setBusy(true);
    try {
      await api(`/resume/duplicate/${resume._id}`, { method: 'POST', body: {} });
      toast.success('Resume duplicated — tailor it for a new role!');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    try {
      await api(`/resume/rename/${renaming._id}`, { method: 'PATCH', body: { title: renameValue.trim() } });
      toast.success('Renamed');
      setRenaming(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/resume/delete/${deleting._id}`, { method: 'DELETE' });
      setResumes((prev) => prev.filter((r) => r._id !== deleting._id));
      toast.success('Resume deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openVersions = async (resume: WithScore) => {
    setVersionsFor(resume);
    setVersions([]);
    setCompareVersion(null);
    setVersionsLoading(true);
    try {
      const res = await api<{ versions: ResumeVersion[] }>(`/resume/versions/${resume._id}`);
      setVersions(res.versions || []);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Version history is not available.'));
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (version: ResumeVersion) => {
    if (!versionsFor || !version._id) return;
    setBusy(true);
    try {
      await api(`/resume/versions/${versionsFor._id}/restore/${version._id}`, { method: 'POST', body: {} });
      toast.success('Version restored');
      setVersionsFor(null);
      setCompareVersion(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Resumes</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Duplicate a resume to tailor it per job. Every save keeps a version you can restore.
          </p>
        </div>
        <Button icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push('/resume')}>
          New resume
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No resumes yet"
            description="Create your first resume — the builder guides you step by step with AI suggestions."
            action={<Button onClick={() => router.push('/resume')}>Start building</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map((resume, i) => (
            <motion.div
              key={resume._id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card hover className="flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge tone="indigo">{resume.templateId === 'default' ? 'classic' : resume.templateId}</Badge>
                    {typeof resume.lastScore === 'number' && (
                      <Badge tone={scoreTone(resume.lastScore)}>{resume.lastScore}/100</Badge>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {resume.title || resume.data?.fullName || 'Untitled resume'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Updated {formatDate(resume.updatedAt)}</p>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setPreview(resume)}>
                    View
                  </Button>
                  <Button size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => router.push(`/resume/edit/${resume._id}`)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    disabled={busy}
                    onClick={() => handleDuplicate(resume)}
                  >
                    Duplicate
                  </Button>
                  <Button size="sm" variant="outline" icon={<History className="w-3.5 h-3.5" />} onClick={() => openVersions(resume)}>
                    Versions
                  </Button>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => {
                      setRenaming(resume);
                      setRenameValue(resume.title || resume.data?.fullName || '');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-blue-600 transition"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => setDeleting(resume)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden /> Delete
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || preview?.data?.fullName || 'Resume'} size="lg">
        {preview && (
          <div className="overflow-auto thin-scrollbar bg-slate-100 rounded-xl p-3">
            <div className="origin-top-left scale-[0.85] sm:scale-100 w-[118%] sm:w-full">
              <ResumePreview
                data={normalizeResumeData(preview.data)}
                template={(preview.templateId === 'default' ? 'classic' : preview.templateId) as TemplateId}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Rename modal */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename resume" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRename();
          }}
        >
          <label htmlFor="rename" className="block text-sm font-medium text-slate-700 mb-1.5">
            Resume name
          </label>
          <input
            id="rename"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='e.g. "Frontend roles — 2026"'
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!renameValue.trim()}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete resume?" size="sm">
        <p className="text-sm text-slate-600">
          “{deleting?.title || deleting?.data?.fullName || 'This resume'}” and its version history will be
          permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={handleDelete} icon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Versions modal */}
      <Modal
        open={!!versionsFor && !compareVersion}
        onClose={() => setVersionsFor(null)}
        title={`Version history — ${versionsFor?.title || versionsFor?.data?.fullName || 'Resume'}`}
        size="md"
      >
        {versionsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No versions yet — a snapshot is stored automatically every time you save changes.
          </p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li
                key={v._id || i}
                className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {v.label || `Version ${versions.length - i}`}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(v.createdAt)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" icon={<Columns2 className="w-3.5 h-3.5" />} onClick={() => setCompareVersion(v)}>
                    Compare
                  </Button>
                  <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={busy} onClick={() => restoreVersion(v)}>
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Side-by-side compare */}
      <Modal
        open={!!compareVersion}
        onClose={() => setCompareVersion(null)}
        title={`Compare — current vs ${formatDateTime(compareVersion?.createdAt)}`}
        size="full"
      >
        {compareVersion && versionsFor && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge tone="green">Current</Badge>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-[65vh] thin-scrollbar bg-white">
                <div className="origin-top-left scale-[0.7] w-[143%]">
                  <ResumePreview
                    data={normalizeResumeData(versionsFor.data)}
                    template={(versionsFor.templateId === 'default' ? 'classic' : versionsFor.templateId) as TemplateId}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge tone="amber">{compareVersion.label || `Saved ${formatDateTime(compareVersion.createdAt)}`}</Badge>
                <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={busy} onClick={() => restoreVersion(compareVersion)}>
                  Restore this version
                </Button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-[65vh] thin-scrollbar bg-white">
                <div className="origin-top-left scale-[0.7] w-[143%]">
                  <ResumePreview
                    data={normalizeResumeData(compareVersion.data)}
                    template={(compareVersion.templateId === 'default' || !compareVersion.templateId ? 'classic' : compareVersion.templateId) as TemplateId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
