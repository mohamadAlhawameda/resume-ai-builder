'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  ScanSearch,
  Briefcase,
  FileDown,
  History,
  Target,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import ScoreRing from '@/components/ui/ScoreRing';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Writing Help',
    text: 'Summaries, bullet points, skills, cover letters, and LinkedIn bios — grounded in your real experience, never invented.',
  },
  {
    icon: ScanSearch,
    title: 'Resume Scanner',
    text: 'A score out of 100 across 9 categories — ATS, impact, keywords, grammar, readability and more — with a fix-it plan.',
  },
  {
    icon: Briefcase,
    title: 'Job Matching',
    text: 'Paste a job posting for a match percentage, missing keywords, and tailored bullet rewrites. Discover jobs scored against your resume.',
  },
  {
    icon: FileDown,
    title: 'PDF & DOCX Export',
    text: 'Five professional templates with live preview, custom colors and section ordering. Export pixel-perfect PDF or editable Word.',
  },
  {
    icon: History,
    title: 'Versions & History',
    text: 'Every save is versioned. Duplicate a resume per job, compare versions side by side, and roll back anytime.',
  },
  {
    icon: Target,
    title: 'Application Tracking',
    text: 'Save jobs, track applied → interviewing → offer, and get alerts when a new job strongly matches your resume.',
  },
];

const CHECKS = ['Free to use', 'No watermark', 'ATS-friendly templates', 'Your data stays yours'];

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/60 text-slate-800">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 items-center gap-14">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100/70 border border-blue-200 rounded-full px-3 py-1 mb-5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            AI resume platform — builder, scanner & job matching
          </p>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-slate-900 mb-5">
            Build a resume that
            <span className="text-blue-600"> scores interviews</span>
          </h1>

          <p className="text-lg text-slate-600 mb-8 max-w-xl">
            Create a professional resume in minutes, scan it like a recruiter&apos;s ATS would, and
            match it against real job postings — with AI coaching at every step.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-200"
            >
              Get started free <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/resume"
              className="px-6 py-3 border border-slate-300 bg-white text-slate-700 rounded-xl font-semibold hover:border-blue-400 hover:text-blue-600 transition"
            >
              Try the builder — no account needed
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-8">
            {CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-1.5 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden /> {c}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Hero visual: mock scan card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-slate-100 p-6 sm:p-8 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-900">Resume scan</p>
                <p className="text-xs text-slate-400">frontend-2026.pdf</p>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                +12 since last scan
              </span>
            </div>
            <div className="flex items-center gap-6">
              <ScoreRing score={86} size={120} />
              <ul className="space-y-2.5 flex-1">
                {[
                  ['ATS compatibility', 92],
                  ['Impact', 84],
                  ['Keywords', 78],
                ].map(([label, val]) => (
                  <li key={label as string}>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>{label}</span>
                      <span>{val}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${val}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-900 mb-2">Top job match</p>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Frontend Developer</p>
                  <p className="text-xs text-slate-400">Northwind Labs · Hybrid</p>
                </div>
                <span className="text-lg font-bold text-emerald-600">91%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 px-6 border-t border-blue-100/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything between you and the interview</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              One workspace for writing, scoring, tailoring, and tracking your job applications.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Your next role is a better resume away</h2>
          <p className="text-slate-500 mb-8">
            Start free. Build, scan, and match in one sitting — most users finish their first resume in under 15 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Create my resume <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
