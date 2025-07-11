// components/resumeTemplates/ClassicTemplate.tsx
import React from "react";

export default function ClassicTemplate({ data }) {
  return (
    <>
      <header className="mb-8 border-b-2 border-black pb-2">
        <h1 className="text-4xl font-serif font-bold">{data.fullName || "Your Name"}</h1>
        <p className="text-base font-serif italic mt-1">
          {data.email || "email@example.com"} | {data.phone || "Phone Number"} |{" "}
          {data.linkedIn ? (
            <a href={data.linkedIn} className="underline text-blue-700" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : (
            "LinkedIn"
          )}
          {data.isDeveloper && data.github && (
            <>
              {" "}
              |{" "}
              <a href={data.github} className="underline text-blue-700" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          )}
        </p>
      </header>

      {data.summary && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Professional Summary
          </h2>
          <p className="whitespace-pre-line">{data.summary}</p>
        </section>
      )}

      {data.education && data.education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Education
          </h2>
          <ul className="list-disc pl-5">
            {data.education.map((edu, i) => (
              <li key={i} className="mb-2">
                <span className="font-semibold">{edu.degree || "Degree"}</span> — {edu.school || "School"}
                <br />
                <span className="italic text-sm">
                  {edu.from || "Start"} - {edu.to || "End"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.experience && data.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">
            Experience
          </h2>
          <ul className="list-disc pl-5">
            {data.experience.map((exp, i) => (
              <li key={i} className="mb-4">
                <span className="font-semibold">{exp.role || "Role"}</span>, {exp.company || "Company"}
                <br />
                <span className="italic text-sm">
                  {exp.from || "Start"} - {exp.to || "End"}
                </span>
                <p className="mt-1 whitespace-pre-line">{exp.description || "Description"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.skills && data.skills.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif font-semibold border-b border-black pb-1 mb-3">Skills</h2>
          <ul className="flex flex-wrap gap-3">
            {data.skills.map((skill, i) => (
              <li
                key={i}
                className="border border-black rounded px-4 py-1 text-sm font-serif font-semibold"
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
