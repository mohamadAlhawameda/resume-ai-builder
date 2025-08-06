// import React from "react";

// // Match ResumePreview types
// interface ExperienceItem {
//   role: string;
//   company: string;
//   from: string;
//   to: string;
//   description: string;
// }

// interface EducationItem {
//   degree: string;
//   school: string;
//   from: string;
//   to: string;
// }

// interface ModernTemplateProps {
//   data: {
//     fullName: string;
//     email: string;
//     phone: string;
//     summary?: string;
//     experience?: ExperienceItem[];
//     education?: EducationItem[];
//     skills?: string[];
//   };
// }

// const ModernTemplate: React.FC<ModernTemplateProps> = ({ data }) => {
//   const { fullName, email, phone, summary, experience, education, skills } = data;

//   return (
//     <div className="bg-white p-10 max-w-3xl mx-auto text-gray-900 font-sans shadow-md rounded">
//       <header className="border-b pb-4 mb-6">
//         <h1 className="text-3xl font-bold">{fullName}</h1>
//         <p className="text-sm text-gray-600">
//           {email} | {phone}
//         </p>
//       </header>

//       {summary && (
//         <section className="mb-6">
//           <h2 className="text-xl font-semibold mb-1">Summary</h2>
//           <p className="text-gray-700">{summary}</p>
//         </section>
//       )}

//       {experience && experience.length > 0 && (
//         <section className="mb-6">
//           <h2 className="text-xl font-semibold mb-1">Experience</h2>
//           {experience.map((item, index) => (
//             <div key={index} className="mb-3">
//               <p className="font-bold">
//                 {item.role} - <span className="font-normal">{item.company}</span>
//               </p>
//               <p className="text-sm text-gray-500">
//                 {item.from} – {item.to}
//               </p>
//               <p className="text-gray-700">{item.description}</p>
//             </div>
//           ))}
//         </section>
//       )}

//       {education && education.length > 0 && (
//         <section className="mb-6">
//           <h2 className="text-xl font-semibold mb-1">Education</h2>
//           {education.map((item, index) => (
//             <div key={index} className="mb-3">
//               <p className="font-bold">
//                 {item.degree} - <span className="font-normal">{item.school}</span>
//               </p>
//               <p className="text-sm text-gray-500">
//                 {item.from} – {item.to}
//               </p>
//             </div>
//           ))}
//         </section>
//       )}

//       {skills && skills.length > 0 && (
//         <section>
//           <h2 className="text-xl font-semibold mb-1">Skills</h2>
//           <ul className="flex flex-wrap gap-2 mt-2">
//             {skills.map((skill, index) => (
//               <li key={index} className="bg-gray-200 text-sm px-3 py-1 rounded-full">
//                 {skill}
//               </li>
//             ))}
//           </ul>
//         </section>
//       )}
//     </div>
//   );
// };

// export default ModernTemplate;
import React from "react";

// Match ResumePreview types
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
    <div className="bg-white p-6 sm:p-10 max-w-4xl mx-auto text-gray-900 font-sans shadow-md rounded-lg print:shadow-none print:border-none">
      {/* Header */}
      <header className="border-b pb-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">{fullName || "Your Name"}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {email || "your@email.com"} | {phone || "Phone Number"}
        </p>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p className="text-gray-700 text-sm whitespace-pre-line">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Experience</h2>
          {experience.map((item, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold">
                {item.role || "Role"} - <span className="font-normal">{item.company || "Company"}</span>
              </p>
              <p className="text-sm text-gray-500">
                {item.from || "Start"} – {item.to || "End"}
              </p>
              {item.description && (
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Education</h2>
          {education.map((item, index) => (
            <div key={index} className="mb-3">
              <p className="font-semibold">
                {item.degree || "Degree"} - <span className="font-normal">{item.school || "School"}</span>
              </p>
              <p className="text-sm text-gray-500">
                {item.from || "Start"} – {item.to || "End"}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Skills</h2>
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
