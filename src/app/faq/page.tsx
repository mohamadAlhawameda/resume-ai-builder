"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

const FAQ_KEYS = [
  ["faqPage.q1", "faqPage.a1"],
  ["faqPage.q2", "faqPage.a2"],
  ["faqPage.q3", "faqPage.a3"],
  ["faqPage.q4", "faqPage.a4"],
  ["faqPage.q5", "faqPage.a5"],
  ["faqPage.q6", "faqPage.a6"],
] as const;

export default function FAQPage() {
  const { t } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-10">{t('faqPage.title')}</h1>
      <div className="space-y-6">
        {FAQ_KEYS.map(([qKey, aKey], index) => (
          <div key={index} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full flex justify-between items-center px-5 py-4 text-left bg-white hover:bg-gray-50 transition"
              onClick={() => toggle(index)}
            >
              <span className="font-medium text-gray-900">{t(qKey)}</span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-5 pb-4 text-sm text-gray-700 bg-gray-50 border-t border-gray-200">
                {t(aKey)}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
