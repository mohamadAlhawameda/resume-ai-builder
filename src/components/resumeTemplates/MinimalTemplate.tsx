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

function renderBullets(text?: string) {
  if (!text?.trim()) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem", listStyle: "disc" }}>
      {lines.map((line, i) => (
        <li key={i} style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
          {line}
        </li>
      ))}
    </ul>
  );
}

export default function MinimalTemplate({ data }: Props) {
  const sectionStyle = {
    marginBottom: "1.75rem",
  };

  const headingStyle = {
    fontSize: "1.1rem",
    fontWeight: 600,
    borderBottom: "1px solid #ccc",
    paddingBottom: "0.25rem",
    marginBottom: "0.5rem",
    fontFamily: "sans-serif",
  };

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: "0.9rem", color: "#111" }}>
      {/* Header */}
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          {data.fullName || "Your Name"}
        </h1>
        <p style={{ fontSize: "0.75rem", color: "#555" }}>
          {data.email || "email@example.com"} | {data.phone || "Phone Number"} |{" "}
          {data.linkedIn ? (
            <a href={data.linkedIn} style={{ color: "#2563eb", textDecoration: "underline" }} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : (
            "LinkedIn"
          )}
          {data.isDeveloper && data.github && (
            <>
              {" "} |{" "}
              <a href={data.github} style={{ color: "#2563eb", textDecoration: "underline" }} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          )}
        </p>
      </header>

      {/* Summary */}
      {data.summary && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Summary</h2>
          <p style={{ whiteSpace: "pre-line", fontSize: "0.85rem", lineHeight: "1.5" }}>{data.summary}</p>
        </section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Education</h2>
          <ul style={{ paddingLeft: "1.25rem", listStyle: "disc", margin: 0 }}>
            {data.education.map((edu, i) => (
              <li key={i} style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <strong>{edu.degree || "Degree"}</strong>, {edu.school || "School"}{" "}
                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                  ({edu.from || "Start"} – {edu.to || "End"})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Experience</h2>
          <div>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: "600" }}>
                  {exp.role || "Role"}, {exp.company || "Company"}
                  <span style={{ fontSize: "0.7rem", fontStyle: "italic", marginLeft: "0.5rem", color: "#666" }}>
                    ({exp.from || "Start"} – {exp.to || "End"})
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
        <section>
          <h2 style={headingStyle}>Skills</h2>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
              fontSize: "0.75rem",
              padding: 0,
              listStyle: "none",
              marginTop: "0.5rem",
            }}
          >
            {data.skills.map((skill, i) => (
              <li
                key={i}
                style={{
                  backgroundColor: "#e5e7eb",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                }}
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
