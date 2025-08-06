"use client";

import React from "react";
import ModernTemplate from "@/components/resumeTemplates/ModernTemplate";
import ClassicTemplate from "@/components/resumeTemplates/ClassicTemplate";
import MinimalTemplate from "@/components/resumeTemplates/MinimalTemplate";

interface ResumePreviewProps {
  data: {
    fullName: string;
    email: string;
    phone: string;
    linkedIn: string;
    github: string;
    isDeveloper: boolean;
    summary: string;
    education: {
      school: string;
      degree: string;
      from: string;
      to: string;
    }[];
    experience: {
      company: string;
      role: string;
      from: string;
      to: string;
      description: string;
    }[];
    skills: string[];
  };
  template: "modern" | "classic" | "minimal";
}

export default function ResumePreview({ data, template }: ResumePreviewProps) {
  const renderTemplate = () => {
    switch (template) {
      case "modern":
        return <ModernTemplate data={data} />;
      case "classic":
        return <ClassicTemplate data={data} />;
      case "minimal":
        return <MinimalTemplate data={data} />;
      default:
        return (
          <div className="text-center py-8 text-red-500 font-medium">
            Unknown template: {template}
          </div>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 print:px-0">
      <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden mx-auto max-w-[900px] w-full p-4 sm:p-6 md:p-8 print:shadow-none print:border-none print:p-0">
        {renderTemplate()}
      </div>
    </div>
  );
}
