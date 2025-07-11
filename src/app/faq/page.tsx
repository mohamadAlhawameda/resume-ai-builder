"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    question: "What is this tool and how does it work?",
    answer:
      "This is an AI-powered resume builder that helps you create a professional resume step-by-step. Our system guides you through key sections like Contact Info, Education, Experience, and Skills, and provides smart AI suggestions based on your input.",
  },
  {
    question: "How does the AI generate suggestions?",
    answer:
      "We use large language models to analyze your input and offer improvement suggestions for your summary, work experience, and skills. These suggestions are generated in real-time based on best practices and clarity.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Yes. All data you enter is stored locally in your browser for privacy. If you choose to save it to our servers (e.g., when logged in), it's encrypted and only accessible by you.",
  },
  {
    question: "Do I need to be a developer to use this?",
    answer:
      "Not at all! The resume builder is designed for anyone — whether you're applying to tech jobs, healthcare, education, or any other field.",
  },
  {
    question: "What templates are available?",
    answer:
      "We offer several clean and modern resume templates, with more coming soon. You can switch templates anytime and preview your resume in real-time.",
  },
  {
    question: "Can I download my resume as a PDF?",
    answer:
      "Yes! Once your resume is complete, you can export it as a professionally formatted PDF file. No watermark, no cost.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-10">Frequently Asked Questions</h1>
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full flex justify-between items-center px-5 py-4 text-left bg-white hover:bg-gray-50 transition"
              onClick={() => toggle(index)}
            >
              <span className="font-medium text-gray-900">{faq.question}</span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-5 pb-4 text-sm text-gray-700 bg-gray-50 border-t border-gray-200">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
