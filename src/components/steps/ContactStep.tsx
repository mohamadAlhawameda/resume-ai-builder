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
  const isFilled = (val: string | undefined) => (val?.trim() ?? '').length > 0;

  const fields = [
    {
      id: 'fullName' as keyof ContactData,
      label: 'Full Name',
      icon: <User className="w-5 h-5" />,
      helper: 'Include your full legal name.',
    },
    {
      id: 'email' as keyof ContactData,
      label: 'Email Address',
      icon: <Mail className="w-5 h-5" />,
      helper: 'Use a professional and active email.',
    },
    {
      id: 'phone' as keyof ContactData,
      label: 'Phone Number',
      icon: <Phone className="w-5 h-5" />,
      helper: 'Include your country code.',
    },
    {
      id: 'city' as keyof ContactData,
      label: 'City',
      icon: <MapPin className="w-5 h-5" />,
      helper: 'City you are based in or applying to.',
    },
    {
      id: 'postalCode' as keyof ContactData,
      label: 'Postal Code',
      icon: <Landmark className="w-5 h-5" />,
      helper: 'Helps with regional targeting.',
    },
    {
      id: 'linkedIn' as keyof ContactData,
      label: 'LinkedIn URL',
      icon: <Linkedin className="w-5 h-5" />,
      helper: 'Paste your full LinkedIn profile link.',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white p-8 rounded-3xl shadow-2xl space-y-12 border border-gray-200"
    >
      <div className="text-center space-y-1">
        <h2 className="text-4xl font-extrabold text-gray-900">Contact Details</h2>
        <p className="text-gray-500 text-sm max-w-xl mx-auto">
          Start by filling in your contact details. We&apos;ll help you turn this into a clean and modern resume.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {fields.map(({ id, label, icon, helper }) => (
          <div key={id} className="space-y-1.5">
            <div className="relative border border-gray-300 rounded-xl px-4 pt-6 pb-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
              <label
                htmlFor={id}
                className={clsx(
                  'absolute left-12 text-sm bg-white px-1 transition-all duration-200 pointer-events-none',
                  isFilled(formData[id]) ? 'top-1 text-xs text-blue-600' : 'top-5 text-gray-400'
                )}
              >
                {label}
              </label>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-blue-500">{icon}</div>
                <input
                  id={id}
                  type="text"
                  value={formData[id] || ''}
                  onChange={(e) => onChange(id, e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-gray-900 pt-1.5"
                />
                <AnimatePresence>
                  {isFilled(formData[id]) && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle className="text-green-500 w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {helper && (
              <p className="text-xs text-gray-500 flex items-center gap-1 pl-2">
                <Info className="w-3.5 h-3.5 text-gray-400" /> {helper}
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
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isDeveloper" className="text-sm text-gray-700">
          I&apos;m a developer — show GitHub field
        </label>
      </div>

      {isDeveloper && (
        <div className="space-y-1.5">
          <div className="border border-gray-300 rounded-xl px-4 pt-6 pb-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
            <label
              htmlFor="github"
              className={clsx(
                'absolute left-12 text-sm bg-white px-1 transition-all duration-200',
                isFilled(formData.github) ? 'top-1 text-xs text-blue-600' : 'top-5 text-gray-400'
              )}
            >
              GitHub URL
            </label>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-blue-500">
                <Github className="w-5 h-5" />
              </div>
              <input
                id="github"
                type="text"
                value={formData.github || ''}
                onChange={(e) => onChange('github', e.target.value)}
                className="w-full bg-transparent focus:outline-none text-gray-900 pt-1.5"
              />
              <AnimatePresence>
                {isFilled(formData.github) && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="text-green-500 w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1 pl-2">
            <Info className="w-3.5 h-3.5 text-gray-400" /> Showcase your GitHub portfolio and contributions.
          </p>
        </div>
      )}

      <div className="mt-10 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
          <button
            type="button"
            onClick={getSummarySuggestions}
            disabled={aiLoading || !summary.trim()}
            className={`text-sm font-medium flex items-center gap-1 ${
              aiLoading ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:underline'
            }`}
          >
            {aiLoading && <Loader2 className="animate-spin h-4 w-4" />}
            {aiLoading ? 'Generating...' : 'AI Suggestion'}
          </button>
        </div>
        <textarea
          rows={5}
          placeholder="E.g. Results-driven developer with 3+ years of experience in frontend engineering..."
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {aiSummarySuggestions.length > 0 && (
          <ul className="mt-3 bg-purple-50 border border-purple-300 rounded-lg p-3 space-y-2 max-h-48 overflow-auto text-sm">
            {aiSummarySuggestions.map((sugg, i) => (
              <li key={i}>
                <button
                  onClick={() => applySummarySuggestion(sugg)}
                  className="text-blue-600 hover:underline text-left w-full"
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
