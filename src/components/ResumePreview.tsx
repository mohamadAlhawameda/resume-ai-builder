// "use client";

// import React from "react";
// import ModernTemplate from "@/components/resumeTemplates/ModernTemplate";
// import ClassicTemplate from "@/components/resumeTemplates/ClassicTemplate";
// import MinimalTemplate from "@/components/resumeTemplates/MinimalTemplate";

// interface ResumePreviewProps {
//   data: {
//     fullName: string;
//     email: string;
//     phone: string;
//     linkedIn: string;
//     github: string;
//     isDeveloper: boolean;
//     summary: string;
//     education: {
//       school: string;
//       degree: string;
//       from: string;
//       to: string;
//     }[];
//     experience: {
//       company: string;
//       role: string;
//       from: string;
//       to: string;
//       description: string;
//     }[];
//     skills: string[];
//   };
//   template: "modern" | "classic" | "minimal";
// }

// export default function ResumePreview({ data, template }: ResumePreviewProps) {
//   const renderTemplate = () => {
//     switch (template) {
//       case "modern":
//         return <ModernTemplate data={data} />;
//       case "classic":
//         return <ClassicTemplate data={data} />;
//       case "minimal":
//         return <MinimalTemplate data={data} />;
//       default:
//         return (
//           <div className="text-center py-8 text-red-500 font-medium">
//             Unknown template: {template}
//           </div>
//         );
//     }
//   };

//   return (
//    <div
//   style={{
//     backgroundColor: "#fff",
//     border: "1px solid #e5e7eb", // same as Tailwind border-gray-200
//     borderRadius: "1rem",         // same as rounded-xl
//     boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", // approximate shadow-md
//     padding: "1.5rem",
//   }}
//   className="overflow-hidden mx-auto max-w-[900px] w-full print:shadow-none print:border-none print:p-0"
// >
//   {renderTemplate()}
// </div>

//   );
// }
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
          <div style={{ textAlign: "center", padding: "2rem", color: "red", fontWeight: "500" }}>
            Unknown template: {template}
          </div>
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff", // white background
        color: "#000000", // black text
        width: "210mm", // A4 width
        minHeight: "297mm", // A4 height
        margin: "0 auto",
        boxSizing: "border-box",
        padding: "2rem", // visible only in browser
        overflow: "hidden",
      }}
      className="print:p-0 print:m-0 print:shadow-none print:border-none print:rounded-none print:bg-white"
    >
      {renderTemplate()}
    </div>
  );
}
