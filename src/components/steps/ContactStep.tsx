'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Landmark,
  Linkedin,
  Github,
  CheckCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

// Contact form data shape
interface ContactData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  postalCode: string;
  linkedIn: string;
  github: string;
}

// Props for the ContactStep component
interface ContactStepProps {
  formData: ContactData;
  onChange: (field: keyof ContactData, value: string) => void;
  onSummaryChange: (value: string) => void;
  summary: string;
  getSummarySuggestions: () => void;
  aiSummarySuggestions: string[];
  applySummarySuggestion: (suggestion: string) => void;
  aiLoading: boolean;
  isDeveloper: boolean;
  onDeveloperToggle: (checked: boolean) => void;
}

export default function ContactStep({
  formData,
  onChange,
  onSummaryChange,
  summary,
  getSummarySuggestions,
  aiSummarySuggestions,
  applySummarySuggestion,
  aiLoading,
  isDeveloper,
  onDeveloperToggle,
}: ContactStepProps) {
  const { t } = useLocale();
  const isFilled = (val: string | undefined) => (val?.trim() ?? '').length > 0;

  const fields = [
    {
      id: 'fullName' as keyof ContactData,
      label: t('builderPage.fullName'),
      icon: <User className="w-5 h-5" />,
      helper: t('builderPage.fullNameHelper'),
    },
    {
      id: 'email' as keyof ContactData,
      label: t('builderPage.emailAddress'),
      icon: <Mail className="w-5 h-5" />,
      helper: t('builderPage.emailHelper'),
    },
    {
      id: 'phone' as keyof ContactData,
      label: t('builderPage.phoneNumber'),
      icon: <Phone className="w-5 h-5" />,
      helper: t('builderPage.phoneHelper'),
    },
    {
      id: 'city' as keyof ContactData,
      label: t('builderPage.city'),
      icon: <MapPin className="w-5 h-5" />,
      helper: t('builderPage.cityHelper'),
    },
    {
      id: 'postalCode' as keyof ContactData,
      label: t('builderPage.postalCode'),
      icon: <Landmark className="w-5 h-5" />,
      helper: t('builderPage.postalCodeHelper'),
    },
    {
      id: 'linkedIn' as keyof ContactData,
      label: t('builderPage.linkedinUrl'),
      icon: <Linkedin className="w-5 h-5" />,
      helper: t('builderPage.linkedinHelper'),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-surface p-6 sm:p-8 rounded-3xl shadow-soft-lg space-y-10 sm:space-y-12 border border-border"
    >
      <div className="text-center space-y-1">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">{t('builderPage.contactTitle')}</h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">{t('builderPage.contactSubtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {fields.map(({ id, label, icon, helper }) => (
          <div key={id} className="space-y-1.5">
            <div className="relative border border-border-strong rounded-xl px-4 pt-6 pb-2 bg-surface shadow-sm focus-within:ring-2 focus-within:ring-primary">
              <label
                htmlFor={id}
                className={clsx(
                  'absolute start-12 text-sm bg-surface px-1 transition-all duration-200 pointer-events-none',
                  isFilled(formData[id]) ? 'top-1 text-xs text-primary' : 'top-5 text-muted-foreground'
                )}
              >
                {label}
              </label>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-primary">{icon}</div>
                <input
                  id={id}
                  type="text"
                  value={formData[id] || ''}
                  onChange={(e) => onChange(id, e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-foreground pt-1.5 min-h-11"
                />
                <AnimatePresence>
                  {isFilled(formData[id]) && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle className="text-success w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {helper && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ps-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" /> {helper}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <input
          id="isDeveloper"
          type="checkbox"
          checked={isDeveloper}
          onChange={(e) => onDeveloperToggle(e.target.checked)}
          className="h-4 w-4 text-primary border-border-strong rounded focus:ring-primary"
        />
        <label htmlFor="isDeveloper" className="text-sm text-foreground">
          {t('builderPage.isDeveloperLabel')}
        </label>
      </div>

      {isDeveloper && (
        <div className="space-y-1.5">
          <div className="relative border border-border-strong rounded-xl px-4 pt-6 pb-2 bg-surface shadow-sm focus-within:ring-2 focus-within:ring-primary">
            <label
              htmlFor="github"
              className={clsx(
                'absolute start-12 text-sm bg-surface px-1 transition-all duration-200',
                isFilled(formData.github) ? 'top-1 text-xs text-primary' : 'top-5 text-muted-foreground'
              )}
            >
              {t('builderPage.githubUrl')}
            </label>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-primary">
                <Github className="w-5 h-5" />
              </div>
              <input
                id="github"
                type="text"
                value={formData.github || ''}
                onChange={(e) => onChange('github', e.target.value)}
                className="w-full bg-transparent focus:outline-none text-foreground pt-1.5 min-h-11"
              />
              <AnimatePresence>
                {isFilled(formData.github) && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="text-success w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 ps-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground" /> {t('builderPage.githubHelper')}
          </p>
        </div>
      )}

      <div className="mt-10 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">{t('builderPage.professionalSummary')}</h3>
          <button
            type="button"
            onClick={getSummarySuggestions}
            disabled={aiLoading || !summary.trim()}
            className={`text-sm font-medium flex items-center gap-1 min-h-11 ${
              aiLoading ? 'text-muted-foreground cursor-not-allowed' : 'text-accent hover:underline'
            }`}
          >
            {aiLoading && <Loader2 className="animate-spin h-4 w-4" />}
            {aiLoading ? t('builderPage.generating') : t('builderPage.aiSuggestion')}
          </button>
        </div>
        <textarea
          rows={5}
          placeholder={t('builderPage.summaryPlaceholder')}
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="w-full px-4 py-3 border border-border-strong rounded-xl bg-surface text-foreground shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {aiSummarySuggestions.length > 0 && (
          <ul className="mt-3 bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2 max-h-48 overflow-auto text-sm">
            {aiSummarySuggestions.map((sugg, i) => (
              <li key={i}>
                <button
                  onClick={() => applySummarySuggestion(sugg)}
                  className="text-primary hover:underline text-start w-full"
                >
                  {sugg}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
