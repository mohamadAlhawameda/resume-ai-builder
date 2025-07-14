// components/resumeTemplates/MinimalTemplate.tsx
import React from "react";

type EducationItem = {
  degree?: string;
  school?: string;
  from?: string;
  to?: string;
};

type ExperienceItem = {
  role?: string;
  company?: string;
  from?: string;
  to?: string;
  description?: string;
};

type ResumeData = {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
  isDeveloper?: boolean;
  summary?: string;
  education?: EducationItem[];
  experience?: ExperienceItem[];
  skills?: string[];
};

type Props = {
  data: ResumeData;
};

export default function MinimalTemplate({ data }: Props) {
  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-sans font-bold">{data.fullName || "Your Name"}</h1>
        <p className="text-xs text-gray-600">
          {data.email || "email@example.com"} | {data.phone || "Phone Number"} |{" "}
          {data.linkedIn ? (
            <a href={data.linkedIn} className="text-blue-500 underline" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : (
            "LinkedIn"
          )}
          {data.isDeveloper && data.github && (
            <>
              {" "}
              |{" "}
              <a href={data.github} className="text-blue-500 underline" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          )}
        </p>
      </header>

      {data.summary && (
        <section className="mb-5">
          <h2 className="text-lg font-sans font-semibold mb-1 border-b border-gray-300 pb-1">Summary</h2>
          <p className="text-sm">{data.summary}</p>
        </section>
      )}

      {data.education && data.education.length > 0 && (
        <section className="mb-5">
          <h2 className="text-lg font-sans font-semibold mb-1 border-b border-gray-300 pb-1">Education</h2>
          <ul className="text-sm list-inside list-disc space-y-1">
            {data.education.map((edu: EducationItem, i: number) => (
              <li key={i}>
                <strong>{edu.degree || "Degree"}</strong>, {edu.school || "School"}{" "}
                <span className="text-gray-500 text-xs">
                  ({edu.from || "Start"} - {edu.to || "End"})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.experience && data.experience.length > 0 && (
        <section className="mb-5">
          <h2 className="text-lg font-sans font-semibold mb-1 border-b border-gray-300 pb-1">Experience</h2>
          <ul className="text-sm list-inside list-disc space-y-2">
            {data.experience.map((exp: ExperienceItem, i: number) => (
              <li key={i}>
                <strong>{exp.role || "Role"}</strong>, {exp.company || "Company"}{" "}
                <span className="text-gray-500 text-xs">
                  ({exp.from || "Start"} - {exp.to || "End"})
                </span>
                <p className="mt-1 whitespace-pre-line">{exp.description || "Description"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.skills && data.skills.length > 0 && (
        <section>
          <h2 className="text-lg font-sans font-semibold mb-1 border-b border-gray-300 pb-1">Skills</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {data.skills.map((skill: string, i: number) => (
              <li key={i} className="bg-gray-300 rounded px-2 py-0.5">
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
