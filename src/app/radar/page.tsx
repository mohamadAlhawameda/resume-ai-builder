'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Radar as RadarIcon,
  Target,
  TrendingUp,
  Building2,
  Compass,
  ExternalLink,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import TagInput from '@/components/ui/TagInput';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import type { OpportunityRadar, SkillSimulationResult, RadarJob } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

function JobRow({ job }: { job: RadarJob }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
        <p className="text-xs text-slate-500 truncate">{job.company} · {job.location}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge tone={job.match.percent >= 75 ? 'green' : 'blue'}>{job.match.percent}%</Badge>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function RadarPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [radar, setRadar] = useState<OpportunityRadar | null>(null);
  const [simSkills, setSimSkills] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SkillSimulationResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<OpportunityRadar>('/jobs/radar');
      setRadar(res);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('radarPage.toastLoadError')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/radar');
      return;
    }
    load();
  }, [router, load]);

  const runSimulation = async () => {
    if (simSkills.length === 0) {
      toast.info(t('radarPage.toastAddSkillFirst'));
      return;
    }
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await api<SkillSimulationResult>('/jobs/simulate', {
        method: 'POST',
        body: { addSkills: simSkills },
      });
      setSimResult(res);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <Skeleton className="h-9 w-72 mb-8" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!radar) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <RadarIcon className="w-6 h-6 text-blue-600" aria-hidden /> {t('radarPage.title')}
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base max-w-2xl">{t('radarPage.subtitle')}</p>
      </div>

      {!radar.hasProfile ? (
        <Card>
          <div className="flex flex-col items-center text-center py-10 px-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
              <RadarIcon className="w-6 h-6" aria-hidden />
            </div>
            <h2 className="text-base font-semibold text-slate-900">{t('radarPage.noProfileTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">{t('radarPage.noProfileDesc')}</p>
            <Button className="mt-5" onClick={() => router.push('/resume')}>
              {t('radarPage.createResume')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
      {radar.sampleData && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-sm text-amber-800">
          <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <p>{t('radarPage.sampleBanner')}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card padded={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" aria-hidden />
            <h2 className="font-semibold text-slate-900">{t('radarPage.qualifyNowTitle', { n: radar.qualifyNow.length })}</h2>
          </div>
          <div className="px-5 py-2 max-h-96 overflow-y-auto thin-scrollbar">
            {radar.qualifyNow.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 text-center">{t('radarPage.qualifyNowEmpty')}</p>
            ) : (
              radar.qualifyNow.map((j) => <JobRow key={j.id} job={j} />)
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" aria-hidden />
            <h2 className="font-semibold text-slate-900">{t('radarPage.qualifySoonTitle', { n: radar.qualifySoon.length })}</h2>
          </div>
          <div className="px-5 py-2 max-h-96 overflow-y-auto thin-scrollbar">
            {radar.qualifySoon.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 text-center">{t('radarPage.qualifySoonEmpty')}</p>
            ) : (
              radar.qualifySoon.map((j) => <JobRow key={j.id} job={j} />)
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" aria-hidden /> {t('radarPage.companiesHiringTitle')}
          </h2>
          {radar.companiesHiring.length === 0 ? (
            <p className="text-sm text-slate-500">{t('radarPage.companiesHiringEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {radar.companiesHiring.map((c) => (
                <li key={c.company} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{c.company}</span>
                  <span className="text-slate-500">{t('radarPage.roleCount', { n: c.jobCount, avg: c.avgMatch })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" aria-hidden /> {t('radarPage.adjacentPathsTitle')}
          </h2>
          {radar.adjacentPaths.length === 0 ? (
            <p className="text-sm text-slate-500">{t('radarPage.adjacentPathsEmpty')}</p>
          ) : (
            <div className="space-y-4">
              {radar.adjacentPaths.map((p) => (
                <div key={p.family}>
                  <p className="text-sm font-semibold text-slate-800">{p.family}</p>
                  <p className="text-xs text-slate-500 mb-1.5">{t('radarPage.viaSkills', { skills: p.matchedSkills.slice(0, 4).join(', ') })}</p>
                  <ul className="space-y-1">
                    {p.openings.map((o) => (
                      <li key={o.id} className="text-xs text-slate-600 flex items-center justify-between">
                        <span className="truncate">{o.title} @ {o.company}</span>
                        <Badge tone="blue">{o.matchPercent}%</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Skill Impact Simulator */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" aria-hidden /> {t('radarPage.simulatorTitle')}
        </h2>
        <p className="text-sm text-slate-500 mb-4">{t('radarPage.simulatorDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <TagInput
              id="sim-skills"
              label={t('radarPage.simSkillsLabel')}
              values={simSkills}
              onChange={setSimSkills}
              placeholder={t('radarPage.simSkillsPlaceholder')}
            />
          </div>
          <Button loading={simulating} onClick={runSimulation} className="sm:mt-6">
            {t('radarPage.simulateImpact')}
          </Button>
        </div>

        {simResult && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">{t('radarPage.avgMatchAcross', { n: simResult.totalJobsConsidered })}</p>
              <p className="text-2xl font-bold text-slate-900">
                {simResult.avgMatchBefore}% <span className="text-slate-400 mx-1">→</span>{' '}
                <span className="text-emerald-600">{simResult.avgMatchAfter}%</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">{t('radarPage.qualifyingJobsLabel')}</p>
              <p className="text-2xl font-bold text-slate-900">
                {simResult.qualifyingJobsBefore} <span className="text-slate-400 mx-1">→</span>{' '}
                <span className="text-emerald-600">{simResult.qualifyingJobsAfter}</span>
              </p>
            </div>
            {simResult.newlyQualifying.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {t('radarPage.newlyWithinReach')}
                </p>
                <ul className="space-y-1.5">
                  {simResult.newlyQualifying.map((j) => (
                    <li key={j.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate">{j.title} @ {j.company}</span>
                      <span className="text-slate-400 text-xs">{j.before}% → {j.after}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </Card>
        </>
      )}
    </div>
  );
}
