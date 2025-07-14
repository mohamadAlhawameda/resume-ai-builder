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
        return <ModernTemplate data={data} />;
    }
  };

  return (
    <div className="border rounded-lg shadow overflow-hidden bg-white p-6 print:p-0 print:shadow-none print:border-none">
      {renderTemplate()}
    </div>
  );
}
