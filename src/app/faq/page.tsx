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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-foreground mb-8 sm:mb-10">{t('faqPage.title')}</h1>
      <div className="space-y-4 sm:space-y-6">
        {FAQ_KEYS.map(([qKey, aKey], index) => {
          const open = openIndex === index;
          return (
            <div key={index} className="border border-border rounded-xl overflow-hidden shadow-soft bg-surface">
              <button
                className="w-full flex justify-between items-center gap-3 px-5 py-4 min-h-11 text-start hover:bg-surface-hover transition"
                onClick={() => toggle(index)}
                aria-expanded={open}
              >
                <span className="font-medium text-foreground">{t(qKey)}</span>
                {open ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                )}
              </button>
              {open && (
                <div className="px-5 pb-4 text-sm text-muted-foreground bg-muted/50 border-t border-border">
                  {t(aKey)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
