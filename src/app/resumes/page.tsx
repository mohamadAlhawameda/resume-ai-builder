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
import ImportResumeButton from '@/components/ImportResumeButton';
import ResumePreview from '@/components/ResumePreview';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import {
  normalizeResumeData,
  type ResumeRecord,
  type ResumeVersion,
  type TemplateId,
} from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

type WithScore = ResumeRecord & { lastScore?: number | null };

export default function ResumesPage() {
  const router = useRouter();
  const { t, formatDate, locale } = useLocale();
  const formatDateTime = useCallback(
    (dateStr?: string) =>
      dateStr
        ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale === 'fr' ? 'fr-CA' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(dateStr))
        : '',
    [locale]
  );
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
      toast.error(apiErrorMessage(err, t('resumesPage.toastLoadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      toast.success(t('resumesPage.toastDuplicated'));
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
      toast.success(t('resumesPage.toastRenamed'));
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
      toast.success(t('resumesPage.toastDeleted'));
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
      toast.error(apiErrorMessage(err, t('resumesPage.toastVersionsUnavailable')));
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (version: ResumeVersion) => {
    if (!versionsFor || !version._id) return;
    setBusy(true);
    try {
      await api(`/resume/versions/${versionsFor._id}/restore/${version._id}`, { method: 'POST', body: {} });
      toast.success(t('resumesPage.toastVersionRestored'));
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('resumesPage.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('resumesPage.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportResumeButton
            onImported={(result) => {
              router.push(`/resume/edit/${result.resume._id}`);
            }}
          />
          <Button icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push('/resume')}>
            {t('resumesPage.newResume')}
          </Button>
        </div>
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
            title={t('resumesPage.noResumesTitle')}
            description={t('resumesPage.noResumesDescription')}
            action={
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                <ImportResumeButton
                  variant="primary"
                  onImported={(result) => router.push(`/resume/edit/${result.resume._id}`)}
                />
                <Button variant="outline" onClick={() => router.push('/resume')}>
                  {t('resumesPage.startBuilding')}
                </Button>
              </div>
            }
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
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge tone="indigo">{resume.templateId === 'default' ? t('resumesPage.templateClassic') : resume.templateId}</Badge>
                    {typeof resume.lastScore === 'number' && (
                      <Badge tone={scoreTone(resume.lastScore)}>{resume.lastScore}/100</Badge>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground truncate">
                  {resume.title || resume.data?.fullName || t('resumesPage.untitledResume')}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{t('resumesPage.updatedOn', { date: formatDate(resume.updatedAt) })}</p>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setPreview(resume)}>
                    {t('resumesPage.view')}
                  </Button>
                  <Button size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => router.push(`/resume/edit/${resume._id}`)}>
                    {t('resumesPage.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    disabled={busy}
                    onClick={() => handleDuplicate(resume)}
                  >
                    {t('resumesPage.duplicate')}
                  </Button>
                  <Button size="sm" variant="outline" icon={<History className="w-3.5 h-3.5" />} onClick={() => openVersions(resume)}>
                    {t('resumesPage.versions')}
                  </Button>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => {
                      setRenaming(resume);
                      setRenameValue(resume.title || resume.data?.fullName || '');
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-primary transition min-h-11 flex items-center"
                  >
                    {t('resumesPage.rename')}
                  </button>
                  <button
                    onClick={() => setDeleting(resume)}
                    className="text-xs font-medium text-danger hover:opacity-80 transition flex items-center gap-1 min-h-11"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden /> {t('resumesPage.delete')}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || preview?.data?.fullName || t('resumesPage.resumeFallback')} size="lg">
        {preview && (
          <div className="overflow-auto thin-scrollbar bg-muted rounded-xl p-3">
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
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title={t('resumesPage.renameModalTitle')} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRename();
          }}
        >
          <label htmlFor="rename" className="block text-sm font-medium text-foreground mb-1.5">
            {t('resumesPage.resumeNameLabel')}
          </label>
          <input
            id="rename"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate: this field only exists inside a just-opened Modal, so moving focus into it matches the WAI-ARIA dialog pattern.
            autoFocus
            className="w-full px-3 py-2.5 min-h-11 border border-border-strong rounded-xl text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('resumesPage.renamePlaceholder')}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
              {t('resumesPage.cancel')}
            </Button>
            <Button type="submit" loading={busy} disabled={!renameValue.trim()}>
              {t('resumesPage.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t('resumesPage.deleteModalTitle')} size="sm">
        <p className="text-sm text-muted-foreground">
          {t('resumesPage.deleteConfirmText', { name: deleting?.title || deleting?.data?.fullName || t('resumesPage.deleteThisResumeFallback') })}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            {t('resumesPage.cancel')}
          </Button>
          <Button variant="danger" loading={busy} onClick={handleDelete} icon={<Trash2 className="w-4 h-4" />}>
            {t('resumesPage.delete')}
          </Button>
        </div>
      </Modal>

      {/* Versions modal */}
      <Modal
        open={!!versionsFor && !compareVersion}
        onClose={() => setVersionsFor(null)}
        title={t('resumesPage.versionHistoryTitle', { name: versionsFor?.title || versionsFor?.data?.fullName || t('resumesPage.resumeFallback') })}
        size="md"
      >
        {versionsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('resumesPage.noVersionsText')}</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li
                key={v._id || i}
                className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {v.label || t('resumesPage.versionLabel', { n: versions.length - i })}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" icon={<Columns2 className="w-3.5 h-3.5" />} onClick={() => setCompareVersion(v)}>
                    {t('resumesPage.compare')}
                  </Button>
                  <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={busy} onClick={() => restoreVersion(v)}>
                    {t('resumesPage.restore')}
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
        title={t('resumesPage.compareTitle', { date: formatDateTime(compareVersion?.createdAt) })}
        size="full"
      >
        {compareVersion && versionsFor && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge tone="green">{t('resumesPage.current')}</Badge>
              </div>
              <div className="border border-border rounded-xl overflow-auto max-h-[65vh] thin-scrollbar bg-muted">
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
                <Badge tone="amber">{compareVersion.label || t('resumesPage.savedAt', { date: formatDateTime(compareVersion.createdAt) })}</Badge>
                <Button size="sm" variant="outline" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={busy} onClick={() => restoreVersion(compareVersion)}>
                  {t('resumesPage.restoreThisVersion')}
                </Button>
              </div>
              <div className="border border-border rounded-xl overflow-auto max-h-[65vh] thin-scrollbar bg-muted">
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
