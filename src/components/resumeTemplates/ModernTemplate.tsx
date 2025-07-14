import React from "react";

// Match ResumePreview types
interface ExperienceItem {
  role: string;
  company: string;
  from: string;
  to: string;
  description: string;
}

interface EducationItem {
  degree: string;
  school: string;
  from: string;
  to: string;
}

interface ModernTemplateProps {
  data: {
    fullName: string;
    email: string;
    phone: string;
    summary?: string;
    experience?: ExperienceItem[];
    education?: EducationItem[];
    skills?: string[];
  };
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ data }) => {
  const { fullName, email, phone, summary, experience, education, skills } = data;

  return (
    <div className="bg-white p-10 max-w-3xl mx-auto text-gray-900 font-sans shadow-md rounded">
      <header className="border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">{fullName}</h1>
        <p className="text-sm text-gray-600">
          {email} | {phone}
        </p>
      </header>

      {summary && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Summary</h2>
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Experience</h2>
          {experience.map((item, index) => (
            <div key={index} className="mb-3">
              <p className="font-bold">
                {item.role} - <span className="font-normal">{item.company}</span>
              </p>
              <p className="text-sm text-gray-500">
                {item.from} – {item.to}
              </p>
              <p className="text-gray-700">{item.description}</p>
            </div>
          ))}
        </section>
      )}

      {education && education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Education</h2>
          {education.map((item, index) => (
            <div key={index} className="mb-3">
              <p className="font-bold">
                {item.degree} - <span className="font-normal">{item.school}</span>
              </p>
              <p className="text-sm text-gray-500">
                {item.from} – {item.to}
              </p>
            </div>
          ))}
        </section>
      )}

      {skills && skills.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-1">Skills</h2>
          <ul className="flex flex-wrap gap-2 mt-2">
            {skills.map((skill, index) => (
              <li key={index} className="bg-gray-200 text-sm px-3 py-1 rounded-full">
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
