'use client';

// Company Intelligence panel — everything the app can honestly show about a
// company: live openings from the official ATS feeds, the user's own saved
// contacts and applications there, plus an optional, clearly-labeled
// AI-generated brief grounded only in the postings. Opened from job cards
// and from the Networking page.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Users,
  Sparkles,
  Eye,
  EyeOff,
  Briefcase,
  MessagesSquare,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import Badge, { scoreTone } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { api, apiErrorMessage } from '@/lib/api';
import { useLocale } from '@/i18n/LocaleProvider';
import type { CompanyIntelligence as Intel, CompanyBrief } from '@/lib/types';

interface Props {
  company: string | null;
  onClose: () => void;
}

export default function CompanyIntelligencePanel({ company, onClose }: Props) {
  const { t, formatDate } = useLocale();
  const [intel, setIntel] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  useEffect(() => {
    if (!company) {
      setIntel(null);
      setBrief(null);
      return;
    }
    setLoading(true);
    api<Intel>(`/companies/${encodeURIComponent(company)}/intelligence`)
      .then(setIntel)
      .catch((err) => toast.error(apiErrorMessage(err, t('network.intelLoadError'))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const toggleWatch = async () => {
    if (!intel || !company) return;
    setWatchBusy(true);
    try {
      if (intel.watching && intel.watchlistId) {
        await api(`/companies/watchlist/${intel.watchlistId}`, { method: 'DELETE' });
        setIntel({ ...intel, watching: false, watchlistId: null });
        toast.success(t('network.unwatched', { company: intel.company }));
      } else {
        const item = await api<{ _id: string }>('/companies/watchlist', {
          method: 'POST',
          body: { companyName: intel.company },
        });
        setIntel({ ...intel, watching: true, watchlistId: item._id });
        toast.success(t('network.watched', { company: intel.company }));
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWatchBusy(false);
    }
  };

  const loadBrief = async () => {
    if (!company) return;
    setBriefLoading(true);
    try {
      const result = await api<CompanyBrief>(`/companies/${encodeURIComponent(company)}/brief`, {
        method: 'POST',
        body: {},
      });
      setBrief(result);
      if (!result.aiUsed) toast.info(t('network.briefUnavailable'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <Modal open={!!company} onClose={onClose} title={intel?.company || company || ''} size="lg">
      {loading || !intel ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary row + watch toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="blue">
              <Briefcase className="w-3 h-3" aria-hidden /> {t('network.openRoleCount', { n: intel.openRoleCount })}
            </Badge>
            {intel.contacts.length > 0 && (
              <Badge tone="indigo">
                <Users className="w-3 h-3" aria-hidden /> {t('network.contactCount', { n: intel.contacts.length })}
              </Badge>
            )}
            {intel.applications.length > 0 && (
              <Badge tone="green">
                <ClipboardList className="w-3 h-3" aria-hidden /> {t('network.applicationCount', { n: intel.applications.length })}
              </Badge>
            )}
            <Button
              size="sm"
              variant={intel.watching ? 'outline' : 'primary'}
              loading={watchBusy}
              icon={intel.watching ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              onClick={toggleWatch}
              className="ms-auto"
            >
              {intel.watching ? t('network.unwatch') : t('network.watch')}
            </Button>
          </div>

          {/* Open roles */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-primary" aria-hidden /> {t('network.openRoles')}
            </h3>
            {intel.openRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('network.noOpenRoles')}</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {intel.openRoles.slice(0, 6).map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.location}</p>
                    </div>
                    {job.match && <Badge tone={scoreTone(job.match.percent)}>{job.match.percent}%</Badge>}
                  </li>
                ))}
              </ul>
            )}
            {intel.openRoleCount > 6 && (
              <Link href="/jobs" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                {t('network.seeAllRoles', { n: intel.openRoleCount })}
              </Link>
            )}
          </section>

          {/* Locations + skills */}
          <div className="grid sm:grid-cols-2 gap-5">
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-success" aria-hidden /> {t('network.hiringLocations')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {intel.hiringLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  intel.hiringLocations.slice(0, 8).map((loc) => (
                    <Badge key={loc} tone="slate">{loc}</Badge>
                  ))
                )}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" aria-hidden /> {t('network.skillsAcrossJobs')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {intel.topSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  intel.topSkills.slice(0, 10).map(({ skill, count }) => (
                    <Badge key={skill} tone="indigo">
                      {skill} · {count}
                    </Badge>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Your contacts there */}
          {intel.contacts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" aria-hidden /> {t('network.yourContacts')}
              </h3>
              <ul className="space-y-1.5">
                {intel.contacts.map((c) => (
                  <li key={c._id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground truncate">
                      {c.name}
                      {c.role && <span className="text-muted-foreground"> · {c.role}</span>}
                    </span>
                    {c.contacted && <Badge tone="green">{t('network.contacted')}</Badge>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Networking activity */}
          {intel.networkingActivity.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <MessagesSquare className="w-4 h-4 text-accent" aria-hidden /> {t('network.recentActivity')}
              </h3>
              <ul className="space-y-1.5">
                {intel.networkingActivity.slice(0, 5).map((a, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{a.contactName}</span> — {t(`network.activityType.${a.type}`)}
                    {a.note && <span className="block text-xs ps-0 line-clamp-1">{a.note}</span>}
                    <span className="text-xs text-muted-foreground/80"> · {formatDate(a.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Application history */}
          {intel.applications.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-success" aria-hidden /> {t('network.applicationHistory')}
              </h3>
              <ul className="space-y-1.5">
                {intel.applications.map((s) => (
                  <li key={s._id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground truncate">{s.job.title}</span>
                    <Badge tone={s.status === 'offer' ? 'green' : s.status === 'rejected' ? 'red' : 'blue'}>
                      {t(`jobsPage.status${s.status.charAt(0).toUpperCase()}${s.status.slice(1)}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* AI brief — opt-in, clearly labeled */}
          <section className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning" aria-hidden /> {t('network.aiBrief')}
              </h3>
              {!brief?.aiUsed && (
                <Button size="sm" variant="outline" loading={briefLoading} onClick={loadBrief}>
                  {t('network.generateBrief')}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t('network.aiBriefDisclaimer')}</p>
            {briefLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden />}
            {brief?.aiUsed && (
              <div className="space-y-3 text-sm text-foreground">
                {brief.overview && <p>{brief.overview}</p>}
                {brief.interviewPrep.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">{t('network.interviewPrepNotes')}</p>
                    <ul className="list-disc ps-5 space-y-1 text-muted-foreground">
                      {brief.interviewPrep.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.questionsToAsk.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">{t('network.questionsToAsk')}</p>
                    <ul className="list-disc ps-5 space-y-1 text-muted-foreground">
                      {brief.questionsToAsk.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
