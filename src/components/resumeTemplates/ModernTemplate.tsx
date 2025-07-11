import React from 'react';

const ModernTemplate = ({ data }: { data: any }) => {
  const { name, email, phone, summary, experience, education, skills } = data;

  return (
    <div className="bg-white p-10 max-w-3xl mx-auto text-gray-900 font-sans shadow-md rounded">
      <header className="border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="text-sm text-gray-600">{email} | {phone}</p>
      </header>

      {summary && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Summary</h2>
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Experience</h2>
          {experience.map((item: any, index: number) => (
            <div key={index} className="mb-3">
              <p className="font-bold">{item.title} - <span className="font-normal">{item.company}</span></p>
              <p className="text-sm text-gray-500">{item.startDate} – {item.endDate}</p>
              <p className="text-gray-700">{item.description}</p>
            </div>
          ))}
        </section>
      )}

      {education?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Education</h2>
          {education.map((item: any, index: number) => (
            <div key={index} className="mb-3">
              <p className="font-bold">{item.degree} - <span className="font-normal">{item.school}</span></p>
              <p className="text-sm text-gray-500">{item.graduationDate}</p>
            </div>
          ))}
        </section>
      )}

      {skills?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-1">Skills</h2>
          <ul className="flex flex-wrap gap-2 mt-2">
            {skills.map((skill: string, index: number) => (
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
