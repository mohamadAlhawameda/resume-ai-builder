import React from "react";

interface ExperienceItem {
  role?: string;
  company?: string;
  from?: string;
  to?: string;
  description?: string;
}

interface EducationItem {
  degree?: string;
  school?: string;
  from?: string;
  to?: string;
}

interface ModernTemplateProps {
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    summary?: string;
    experience?: ExperienceItem[];
    education?: EducationItem[];
    skills?: string[];
  };
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ data }) => {
  const { fullName, email, phone, summary, experience, education, skills } = data;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "2rem",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#111827",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <header style={{ borderBottom: "2px solid #1f2937", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", letterSpacing: "-0.5px" }}>{fullName || "Your Name"}</h1>
        <p style={{ fontSize: "0.95rem", color: "#4B5563", marginTop: "0.25rem" }}>
          {email || "your@email.com"} | {phone || "Phone Number"}
        </p>
      </header>

      {summary && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, borderBottom: "1px solid #d1d5db", paddingBottom: "0.5rem" }}>Summary</h2>
          <p style={{ fontSize: "0.95rem", color: "#374151", marginTop: "0.75rem", lineHeight: 1.6, whiteSpace: "pre-line" }}>{summary}</p>
        </section>
      )}

      {experience && experience.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, borderBottom: "1px solid #d1d5db", paddingBottom: "0.5rem" }}>Experience</h2>
          {experience.map((item, index) => (
            <div key={index} style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.role || "Role"} <span style={{ fontWeight: 400 }}>@ {item.company || "Company"}</span></h3>
                <span style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#6B7280" }}>{item.from || "Start"} – {item.to || "End"}</span>
              </div>
              {item.description && (
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", listStyle: "disc" }}>
                  {item.description.split("\n").map((point, i) => (
                    <li key={i} style={{ fontSize: "0.95rem", marginBottom: "0.25rem" }}>{point.trim()}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {education && education.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, borderBottom: "1px solid #d1d5db", paddingBottom: "0.5rem" }}>Education</h2>
          {education.map((item, index) => (
            <div key={index} style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.degree || "Degree"} <span style={{ fontWeight: 400 }}>@ {item.school || "School"}</span></h3>
                <span style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#6B7280" }}>{item.from || "Start"} – {item.to || "End"}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {skills && skills.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, borderBottom: "1px solid #d1d5db", paddingBottom: "0.5rem" }}>Skills</h2>
          <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            {skills.map((skill, index) => (
              <li
                key={index}
                style={{
                  backgroundColor: "#E5E7EB",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "9999px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#111827",
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
};

export default ModernTemplate;
