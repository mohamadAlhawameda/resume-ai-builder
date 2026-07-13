'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileDown, Briefcase, GraduationCap, Award, FolderGit2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { api, apiErrorMessage } from '@/lib/api';
import type { PublicPassport } from '@/lib/types';
import { toast } from 'react-toastify';

export default function PublicPassportPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [data, setData] = useState<PublicPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api<PublicPassport>(`/profile/passport/${slug}`, { auth: false })
      .then(setData)
      .catch((err) => {
        setNotFound(true);
        toast.error(apiErrorMessage(err, 'This career passport is not available.'));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Card>
          <EmptyState
            icon={<Briefcase className="w-6 h-6" />}
            title="Career passport not found"
            description="This link may be disabled or no longer exists."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Card className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{data.name}</h1>
        {data.headline && <p className="text-slate-600 mt-1">{data.headline}</p>}
        {data.resume && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.info('Open this person\'s profile in the app to export their linked resume.');
            }}
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-blue-600 hover:underline"
          >
            <FileDown className="w-4 h-4" aria-hidden /> {data.resume.title || 'View resume'}
          </a>
        )}
      </Card>

      {data.skills.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s) => (
              <Badge key={s} tone="blue">{s}</Badge>
            ))}
          </div>
        </Card>
      )}

      {data.experience.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" aria-hidden /> Experience
          </h2>
          <ul className="space-y-4">
            {data.experience.map((e, i) => (
              <li key={i}>
                <p className="text-sm font-medium text-slate-900">{e.role} · {e.company}</p>
                <p className="text-xs text-slate-400 mb-1">{e.from} – {e.to}</p>
                {e.description && <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.education.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-600" aria-hidden /> Education
          </h2>
          <ul className="space-y-2">
            {data.education.map((e, i) => (
              <li key={i} className="text-sm text-slate-700">
                {e.degree}, {e.school} <span className="text-slate-400">({e.from}–{e.to})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.projects.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-600" aria-hidden /> Projects
          </h2>
          <ul className="space-y-3">
            {data.projects.map((p, i) => (
              <li key={i}>
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.certifications.length > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" aria-hidden /> Certifications
          </h2>
          <ul className="space-y-1.5">
            {data.certifications.map((c, i) => (
              <li key={i} className="text-sm text-slate-700">
                {c.name}{c.issuer && ` — ${c.issuer}`}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
