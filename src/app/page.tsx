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
  Upload,
  Wand2,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import ScoreRing from '@/components/ui/ScoreRing';
import { useLocale } from '@/i18n/LocaleProvider';

const FEATURES = [
  { icon: Sparkles, key: 'feature1', tint: 'from-blue-500 to-indigo-600' },
  { icon: ScanSearch, key: 'feature2', tint: 'from-violet-500 to-purple-600' },
  { icon: Briefcase, key: 'feature3', tint: 'from-emerald-500 to-teal-600' },
  { icon: FileDown, key: 'feature4', tint: 'from-amber-500 to-orange-600' },
  { icon: History, key: 'feature5', tint: 'from-sky-500 to-blue-600' },
  { icon: Target, key: 'feature6', tint: 'from-rose-500 to-pink-600' },
];

const STEPS = [
  { icon: Upload, key: 'step1' },
  { icon: Wand2, key: 'step2' },
  { icon: Send, key: 'step3' },
];

export default function Home() {
  const { t, tArray } = useLocale();
  const checks = tArray('home.checks');
  const mockCategories: Array<['ats' | 'impact' | 'keywords', number]> = [
    ['ats', 92],
    ['impact', 84],
    ['keywords', 78],
  ];

  return (
    <div className="text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-[420px] bg-dot-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-2 items-center gap-10 lg:gap-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-surface/80 border border-primary/20 shadow-sm rounded-full px-3 py-1 mb-5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              {t('home.badge')}
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground mb-5">
              {t('home.heroTitle')}
              <span className="gradient-text"> {t('home.heroTitleAccent')}</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl">{t('home.heroSubtitle')}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-11 bg-gradient-to-b from-primary to-primary-hover text-primary-foreground rounded-xl font-semibold hover:brightness-110 transition shadow-lg shadow-primary/25 hover:-translate-y-0.5"
              >
                {t('home.ctaPrimary')} <ArrowRight className="w-4 h-4 rtl-flip" aria-hidden />
              </Link>
              <Link
                href="/resume"
                className="inline-flex items-center justify-center px-6 py-3.5 min-h-11 border border-border-strong bg-surface/80 backdrop-blur-sm text-foreground rounded-xl font-semibold hover:border-primary/50 hover:text-primary transition"
              >
                {t('home.ctaSecondary')}
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-8">
              {checks.map((c) => (
                <li key={c} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" aria-hidden /> {c}
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
            <div className="relative bg-surface rounded-3xl shadow-[0_30px_80px_-20px_rgba(37,99,235,0.35)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-foreground/5 p-6 sm:p-8 max-w-md mx-auto">
              <div className="absolute -top-4 -end-4 bg-surface rounded-full shadow-lg ring-1 ring-foreground/5 px-3.5 py-2 text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                {t('home.mockBadge')}
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('home.mockScanTitle')}</p>
                  <p className="text-xs text-muted-foreground">frontend-2026.pdf</p>
                </div>
                <span className="text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-1">
                  {t('home.mockScoreDelta')}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <ScoreRing score={86} size={120} />
                <ul className="space-y-2.5 flex-1">
                  {mockCategories.map(([key, val]) => (
                    <li key={key}>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                        <span>{t(`home.mock${key.charAt(0).toUpperCase()}${key.slice(1)}`)}</span>
                        <span>{val}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-foreground mb-2">{t('home.mockTopMatch')}</p>
                <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('home.mockJobTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('home.mockCompany')}</p>
                  </div>
                  <span className="text-lg font-bold text-success">91%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-16 sm:py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('home.howItWorksTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('home.howItWorksSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-7 start-[16.5%] end-[16.5%] h-px bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" aria-hidden />
            {STEPS.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative text-center"
              >
                <div className="relative z-10 w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center mb-5 shadow-lg shadow-primary/25">
                  <Icon className="w-6 h-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">
                  {i + 1}. {t(`home.${key}Title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{t(`home.${key}Text`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 py-16 sm:py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t('home.featuresTitle')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('home.featuresSubtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map(({ icon: Icon, key, tint }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="p-6 bg-surface rounded-2xl border border-border shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 hover:border-border-strong transition-all duration-300 group"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tint} text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{t(`home.${key}Title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.${key}Text`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative max-w-5xl mx-auto overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-hover to-accent px-6 py-14 sm:px-16 sm:py-16 text-center shadow-xl shadow-primary/20"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-16 -end-16 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -start-16 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">{t('home.ctaTitle')}</h2>
            <p className="text-white/85 mb-8 max-w-xl mx-auto">{t('home.ctaSubtitle')}</p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-11 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition shadow-lg shadow-black/10 hover:-translate-y-0.5"
            >
              {t('home.ctaButton')} <ArrowRight className="w-4 h-4 rtl-flip" aria-hidden />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
