import React from "react";

type EducationItem = {
  degree?: string;
  school?: string;
  from?: string;
  to?: string;
  achievements?: string; // newline-separated
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

function renderBullets(text?: string) {
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <ul className="list-disc pl-6 mt-1 space-y-1">
      {lines.map((line, i) => (
        <li key={i} className="text-sm leading-snug">
          {line}
        </li>
      ))}
    </ul>
  );
}

function renderAchievements(text?: string) {
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <ul className="list-disc pl-6 mt-2 space-y-1">
      {lines.map((line, i) => (
        <li key={i} className="text-sm leading-snug">
          <span className="font-semibold">Achievements: </span>
          {line}
        </li>
      ))}
    </ul>
  );
}

export default function ClassicTemplate({ data }: Props) {
  return (
    <>
      {/* Header */}
      <header className="mb-8 border-b-2 border-black pb-2">
        <h1 className="text-4xl font-serif font-bold">{data.fullName || "Your Name"}</h1>
        <p className="text-base font-serif italic mt-1">
          {data.email || "email@example.com"} | {data.phone || "Phone Number"} |{" "}
          {data.linkedIn ? (
            <a
              href={data.linkedIn}
              className="underline text-blue-700"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          ) : (
            "LinkedIn"
          )}
          {data.isDeveloper && data.github && (
            <>
              {" "}
              |{" "}
              <a
                href={data.github}
                className="underline text-blue-700"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </>
          )}
        </p>
      </header>

      {/* Summary */}
      {data.summary && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Professional Summary
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Education
          </h2>
          <div className="space-y-6">
            {data.education.map((edu, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between font-semibold">
                  <span>
                    {edu.degree || "Degree"}, {edu.school || "School"}
                  </span>
                  <span className="italic text-sm text-gray-600">
                    {edu.from || "Start"} – {edu.to || "End"}
                  </span>
                </div>
                {renderAchievements(edu.achievements)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Experience
          </h2>
          <div className="space-y-6">
            {data.experience.map((exp, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between font-semibold">
                  <span>{exp.role || "Role"}, {exp.company || "Company"}</span>
                  <span className="italic text-sm text-gray-600">
                    {exp.from || "Start"} – {exp.to || "End"}
                  </span>
                </div>
                {renderBullets(exp.description)}
              </div>
            ))}
          </div>
        </section>
      )}

     {/* Skills */}
{data.skills && data.skills.length > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
      Skills
    </h2>
    <ul className="grid grid-cols-3 gap-y-1 pl-4 text-sm list-disc list-inside">
      {data.skills.map((skill, i) => (
        <li
          key={i}
          className={
            i % 3 === 0
              ? "text-left"
              : i % 3 === 1
              ? "text-center"
              : "text-right"
          }
        >
          {skill}
        </li>
      ))}
    </ul>
  </section>
)}


    </>
  );
}
