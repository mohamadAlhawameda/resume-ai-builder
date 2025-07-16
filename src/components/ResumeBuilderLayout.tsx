

"use client";

import React, { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import TemplateSelector from "./TemplateSelector";
import ProgressBar from "./ProgressBar";
import StepNavigation from "./StepNavigation";
import ContactStep from "./steps/ContactStep";
import EducationStep from "./steps/EducationStep";
import ExperienceStep from "./steps/ExperienceStep";
import SkillsStep from "./steps/SkillsStep";
import ResumePreview from "./ResumePreview";
import html2canvas from "html2canvas";
import { useRef } from "react";
import html2pdf from "html2pdf.js";

type TemplateType = "classic" | "modern" | "minimal";

interface Education {
  school: string;
  degree: string;
  from: string;
  to: string;
}

interface Experience {
  company: string;
  role: string;
  from: string;
  to: string;
  description: string;
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  postalCode: string;
  linkedIn: string;
  github: string;
  isDeveloper: boolean;
  summary: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
}

type ArrayField = "education" | "experience" | "skills";

export default function ResumeBuilderLayout() {
  const router = useRouter();
  const steps = ["Contact", "Education", "Experience", "Skills"];
  const previewRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    postalCode: "",
    linkedIn: "",
    github: "",
    isDeveloper: false,
    summary: "",
    education: [],
    experience: [],
    skills: [],
  });

  // const [theme, setTheme] = useState<ThemeType>("light");
  const [template, setTemplate] = useState<TemplateType>("classic");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummarySuggestions, setAiSummarySuggestions] = useState<string[]>([]);
  const [aiExpSuggestions, setAiExpSuggestions] = useState<string[][]>([]);
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("resumeData") || sessionStorage.getItem("resumeData");
    if (saved) setFormData(JSON.parse(saved));
  }, []);

 useEffect(() => {
  const container = document.querySelector("#resume-preview");

  if (container) {
    container.querySelectorAll("*").forEach((el) => {
      const style = getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;

      if (color.includes("oklch")) {
        (el as HTMLElement).style.color = "#000"; // or a safe fallback
      }
      if (bg.includes("oklch")) {
        (el as HTMLElement).style.backgroundColor = "#fff"; // or another safe fallback
      }
    });
  }
}, [formData, template]);


// const handleSubmit = useCallback(async () => {
//   const token = localStorage.getItem("token") || sessionStorage.getItem("token");

//   // Save data locally
//   localStorage.setItem("resumeData", JSON.stringify(formData));
//   sessionStorage.setItem("resumeData", JSON.stringify(formData));

//   // Generate styled PDF from previewRef
//   const element = previewRef.current;
//   if (element) {
//     const canvas = await html2canvas(element, { scale: 2 });
// const imgData = canvas.toDataURL("image/png");

// // A4 size in pixels at 96 DPI
// const a4Width = 794;
// const a4Height = 1123;

// // Scale your content to fit A4 width, maintain aspect ratio
// const aspectRatio = canvas.height / canvas.width;
// const pdfHeight = a4Width * aspectRatio;

// const pdf = new jsPDF({
//   orientation: "portrait",
//   unit: "px",
//   format: [a4Width, a4Height],
// });

// pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfHeight);
//     pdf.save(`${formData.fullName || "resume"}.pdf`);
//   }

//   // Save to backend if logged in
//   if (!token) {
//     alert("You are not logged in. Your resume has been downloaded as a PDF.");
//     return;
//   }

//   setAiLoading(true);
//   try {
//     const response = await fetch("https://resume-ai-builder-esnw.onrender.com/resume/create", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({ data: formData }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       alert(`Failed to save resume: ${errorText || response.statusText}`);
//       return;
//     }

//     alert("Resume saved successfully!");
//     router.push("/dashboard");
//   } catch (err) {
//     console.error("Save resume error:", err);
//     alert("Unexpected error. Try again later.");
//   } finally {
//     setAiLoading(false);
//   }
// }, [formData, router]);

const handleSubmit = useCallback(async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // Save data locally
  localStorage.setItem("resumeData", JSON.stringify(formData));
  sessionStorage.setItem("resumeData", JSON.stringify(formData));

  const element = previewRef.current;

  if (element) {
    // Scroll to top to avoid capturing partial view
    window.scrollTo(0, 0);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = {
      width: canvas.width,
      height: canvas.height,
    };

    const pxToMm = (px: number) => px * 0.264583; // px to mm
    const imgWidthMm = pxToMm(imgProps.width);
    const imgHeightMm = pxToMm(imgProps.height);

    let renderWidth = pdfWidth;
    let renderHeight = (imgHeightMm * pdfWidth) / imgWidthMm;

    if (renderHeight > pdfHeight) {
      renderHeight = pdfHeight;
      renderWidth = (imgWidthMm * pdfHeight) / imgHeightMm;
    }

    const x = (pdfWidth - renderWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, "PNG", x, y, renderWidth, renderHeight);
    pdf.save(`${formData.fullName || "resume"}.pdf`);
  }

  // Save to backend if logged in
  if (!token) {
    alert("You are not logged in. Your resume has been downloaded as a PDF.");
    return;
  }

  setAiLoading(true);
  try {
    const response = await fetch("https://resume-ai-builder-esnw.onrender.com/resume/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: formData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      alert(`Failed to save resume: ${errorText || response.statusText}`);
      return;
    }

    alert("Resume saved successfully!");
    router.push("/dashboard");
  } catch (err) {
    console.error("Save resume error:", err);
    alert("Unexpected error. Try again later.");
  } finally {
    setAiLoading(false);
  }
}, [formData, router]);


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldAutoSave = urlParams.get("autosave") === "true";
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (shouldAutoSave && token) {
      handleSubmit();
      urlParams.delete("autosave");
      const newUrl = `${window.location.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [handleSubmit]);

  useEffect(() => {
    localStorage.setItem("resumeData", JSON.stringify(formData));
    sessionStorage.setItem("resumeData", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (formData.experience.length > 0 && aiExpSuggestions.length < formData.experience.length) {
      setAiExpSuggestions((old) => {
        const newArr = [...old];
        while (newArr.length < formData.experience.length) newArr.push([]);
        return newArr;
      });
    }
  }, [formData.experience.length, aiExpSuggestions.length]);

  type ArrayElement<F extends keyof FormData> =
    F extends "education" ? Education :
    F extends "experience" ? Experience :
    F extends "skills" ? string :
    never;

  const onChange = useCallback(
    <F extends keyof FormData>(
      field: F,
      index: number | null,
      key: string | null,
      value: string | boolean | string[]
    ) => {
      setFormData((old) => {
        const newData = { ...old };

        if (index === null) {
          newData[field] = value as FormData[F];
        } else {
          const arr = newData[field] as unknown as ArrayElement<F>[];

          if (key && typeof arr[index] === "object" && arr[index] !== null) {
            const item = { ...((arr[index] as unknown) as Record<string, unknown>) };
            item[key] = value;
            arr[index] = item as unknown as ArrayElement<F>;
          } else {
            arr[index] = value as ArrayElement<F>;
          }
        }

        return newData;
      });
    },
    []
  );

  const addItem = (field: ArrayField) => {
    setFormData((old) => {
      const newData = { ...old };
      if (field === "education") newData.education.push({ school: "", degree: "", from: "", to: "" });
      if (field === "experience") newData.experience.push({ company: "", role: "", from: "", to: "", description: "" });
      if (field === "skills") newData.skills.push("");
      return newData;
    });
  };

  const removeItem = (field: ArrayField, index: number) => {
    setFormData((old) => {
      const newData = { ...old };
      if (field === "education") newData.education.splice(index, 1);
      if (field === "experience") newData.experience.splice(index, 1);
      if (field === "skills") newData.skills.splice(index, 1);
      return newData;
    });
    if (field === "experience") {
      setAiExpSuggestions((old) => old.filter((_, i) => i !== index));
    }
  };

  const onSummaryChange = useCallback((val: string) => {
    setFormData((old) => ({ ...old, summary: val }));
  }, []);

  const onDeveloperToggle = useCallback((checked: boolean) => {
    setFormData((old) => ({ ...old, isDeveloper: checked, github: checked ? old.github : "" }));
  }, []);

  const getSummarySuggestions = useCallback(async () => {
    if (!formData.summary.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch("https://resume-ai-builder-esnw.onrender.com/ai/suggest/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Suggest improvements or rewrite for this professional summary: ${formData.summary}`,
          type: "summary",
        }),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      setAiSummarySuggestions(data.suggestions || []);
    } catch (error) {
      alert("Failed to get AI summary suggestions");
      console.error(error);
    }
    setAiLoading(false);
  }, [formData.summary]);
const getExperienceSuggestions = async (index: number) => {
  const exp = formData.experience[index];
  if (!exp || !exp.description.trim()) {
    alert("Please fill in the job description first.");
    return;
  }

  const rawToken = sessionStorage.getItem("token") || localStorage.getItem("token");
  const token = rawToken?.startsWith("Bearer ") ? rawToken.split(" ")[1] : rawToken;

  if (!token) {
    alert("You must be logged in to get AI experience suggestions.");
    return;
  }

  setAiLoading(true);

  try {
    const response = await fetch("https://resume-ai-builder-esnw.onrender.com/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt: `Rewrite and improve this job description using clear, concise bullet points:\n${exp.description}`,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        return;
      }
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    setAiExpSuggestions((prev) => {
      const updated = [...prev];
      updated[index] = data.suggestions || [];
      return updated;
    });
  } catch (error) {
    console.error("Failed to fetch experience suggestions", error);
    alert("AI failed to suggest improvements.");
  } finally {
    setAiLoading(false);
  }
};

//  const getExperienceSuggestions = async (index: number) => {
//   const exp = formData.experience[index];
//   if (!exp || !exp.description.trim()) return;

//   const rawToken = sessionStorage.getItem('token') || localStorage.getItem('token');
//   const token = rawToken?.startsWith("Bearer ") ? rawToken.split(" ")[1] : rawToken;

//   console.log("Using token:", token);

//   if (!token) {
//     alert("You are not logged in.");
//     return;
//   }

//   setAiLoading(true);

//   try {
//     const response = await fetch("https://resume-ai-builder-esnw.onrender.com/ai/suggest", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({
//         prompt: `Rewrite and improve this job description using clear, concise bullet points:\n${exp.description}`

//       }),
//     });

//     if (response.status === 401) {
//       alert("Unauthorized. Please log in again.");
//       return;
//     }

//     if (!response.ok) {
//       throw new Error(`Request failed with status ${response.status}`);
//     }

//     const data = await response.json();

//     setAiExpSuggestions((prev) => {
//       const updated = [...prev];
//       updated[index] = data.suggestions || [];
//       return updated;
//     });

//   } catch (error) {
//     console.error("Failed to fetch experience suggestions", error);
//     alert("AI failed to suggest improvements.");
//   } finally {
//     setAiLoading(false);
//   }
// };
const getSkillSuggestions = async () => {
  const rawToken = sessionStorage.getItem("token") || localStorage.getItem("token");
  const token = rawToken?.startsWith("Bearer ") ? rawToken.split(" ")[1] : rawToken;

  if (!token) {
    alert("You must be logged in to get AI skill suggestions.");
    return;
  }

  const expText = formData.experience.map((e) => e.description).join("\n");
  const eduText = formData.education.map((e) => `${e.degree} at ${e.school}`).join(", ");

  const prompt = `Based on the following experience and education, suggest a list of at least 9 relevant technical and soft skills:
Experience:
${expText}
Education:
${eduText}
Skills:
-`;

  setAiLoading(true);

  try {
    const response = await fetch("https://resume-ai-builder-esnw.onrender.com/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        return;
      }
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    const rawSkillsText = Array.isArray(data.suggestions) ? data.suggestions.join("\n") : data.suggestions;

    const bulletPoints = rawSkillsText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith("-") || line.startsWith("*"))
      .map((line: string) => line.replace(/^[-*]\s*/, ""));

    const commonSoftSkills = [
      "Communication",
      "Teamwork",
      "Problem-solving",
      "Time management",
      "Adaptability",
      "Critical thinking",
      "Leadership",
      "Creativity",
      "Work ethic",
    ];

    const skills = bulletPoints.length >= 9
      ? bulletPoints
      : [...bulletPoints, ...commonSoftSkills].slice(0, 9);

    setAiSkillSuggestions(skills);
  } catch (error) {
    console.error("Failed to fetch skill suggestions", error);
    alert("AI failed to suggest skills.");
  } finally {
    setAiLoading(false);
  }
};

// const getSkillSuggestions = async () => {
//   const rawToken = sessionStorage.getItem("token") || localStorage.getItem("token");
//   const token = rawToken?.startsWith("Bearer ") ? rawToken.split(" ")[1] : rawToken;

//   if (!token) {
//     alert("You must be logged in to get AI suggestions.");
//     return;
//   }

//   const expText = formData.experience.map((e) => e.description).join("\n");
//   const eduText = formData.education.map((e) => `${e.degree} at ${e.school}`).join(", ");

//   const prompt = `Based on the following experience and education, suggest a list of at least 9 relevant  technical skills, including both technical skills and soft skills, formatted as bullet points:
// Experience:
// ${expText}
// Education:
// ${eduText}
// Skills:
// -`;

//   setAiLoading(true);

//   try {
//     const response = await fetch("https://resume-ai-builder-esnw.onrender.com/ai/suggest", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({ prompt }),
//     });

//     if (response.status === 401) {
//       alert("Unauthorized. Please log in again.");
//       return;
//     }

//     if (!response.ok) {
//       throw new Error(`Request failed with status ${response.status}`);
//     }

//     const data = await response.json();

//     // Assume data.suggestions is an array of strings or one string
//     const rawSkillsText = Array.isArray(data.suggestions) ? data.suggestions.join("\n") : data.suggestions;

//     // Extract bullet points
//     const bulletPoints = rawSkillsText
//   .split("\n")
//   .map((line: string) => line.trim())
//   .filter((line: string) => line.startsWith("-") || line.startsWith("*"))
//   .map((line: string) => line.replace(/^[-*]\s*/, ""));

//     // Common soft skills to pad if needed
//     const commonSoftSkills = [
//       "Communication",
//       "Teamwork",
//       "Problem-solving",
//       "Time management",
//       "Adaptability",
//       "Critical thinking",
//       "Leadership",
//       "Creativity",
//       "Work ethic",
//     ];

//     const skills = bulletPoints.length >= 9
//       ? bulletPoints
//       : [...bulletPoints, ...commonSoftSkills].slice(0, 9);

//     setAiSkillSuggestions(skills);
//   } catch (error) {
//     console.error("Failed to fetch skill suggestions", error);
//     alert("AI failed to suggest skills.");
//   } finally {
//     setAiLoading(false);
//   }
// };



  const onContactChange = useCallback(
    (field: keyof Omit<FormData, "education" | "experience" | "skills">, value: string) => {
      setFormData((old) => ({
        ...old,
        [field]: value,
      }));
    },
    []
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Your Resume</h1>
        <div className="flex gap-4 items-center">
          <TemplateSelector
            template={template}
            setTemplate={(value: string) => setTemplate(value as TemplateType)}
          />
        </div>
      </div>

      <ProgressBar step={step} totalSteps={steps.length} />
      <StepNavigation steps={steps} currentStep={step} onStepChange={setStep} />

      <div className="mb-12">
        {step === 0 && (
          <ContactStep
            formData={formData}
            onChange={onContactChange}
            onSummaryChange={onSummaryChange}
            summary={formData.summary}
            getSummarySuggestions={getSummarySuggestions}
            aiSummarySuggestions={aiSummarySuggestions}
            applySummarySuggestion={(sugg) => setFormData((old) => ({ ...old, summary: sugg }))}
            aiLoading={aiLoading}
            isDeveloper={formData.isDeveloper}
            onDeveloperToggle={onDeveloperToggle}
          />
        )}

        {step === 1 && (
          <EducationStep
            education={formData.education}
            addItem={() => addItem("education")}
            removeItem={(index) => removeItem("education", index)}
            onChange={(index, field, value) => onChange("education", index, field, value)}
          />
        )}

        {step === 2 && (
          <ExperienceStep
            experience={formData.experience}
            addItem={() => addItem("experience")}
            removeItem={(index) => removeItem("experience", index)}
            onChange={(index, key, value) => onChange("experience", index, key, value)}
            getExperienceSuggestions={getExperienceSuggestions}
            aiExpSuggestions={aiExpSuggestions}
            applyExperienceSuggestion={(index, sugg) => {
              setFormData((old) => {
                const updated = [...old.experience];
                updated[index].description = sugg;
                return { ...old, experience: updated };
              });
              setAiExpSuggestions((old) => {
                const updated = [...old];
                updated[index] = [];
                return updated;
              });
            }}
            aiLoading={aiLoading}
          />
        )}

        {step === 3 && (
          <SkillsStep
            skills={formData.skills}
            addItem={() => addItem("skills")}
            removeItem={(index) => removeItem("skills", index)}
            onChange={(index, value) => {
              setFormData((old) => {
                const updatedSkills = [...old.skills];
                updatedSkills[index] = value;
                return { ...old, skills: updatedSkills };
              });
            }}
            getSkillSuggestions={getSkillSuggestions}
            aiSkillSuggestions={aiSkillSuggestions}
            aiLoading={aiLoading}
          />
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-5 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition disabled:opacity-50"
        >
          Previous
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Next
          </button>
        ) : (
          // <button
          //   onClick={handleSubmit}
          //   className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          // >
          //   Save Resume
          // </button>
          <button
  onClick={handleSubmit}
  className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
  disabled={aiLoading}
>
  {aiLoading ? "Processing..." : "Save / Export Resume"}
</button>

        )}
      </div>

      {/* <div className="mt-14 space-y-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Preview</h2>
        <ResumePreview data={formData} template={template} />
      </div> */}
     {/* <div
  id="resume-preview"
  style={{
    backgroundColor: "#fff",
    color: "#000",
  }}
  ref={previewRef}
>
  <ResumePreview data={formData} template={template} />
</div> */}
<div
  id="resume-preview"
  ref={previewRef}
  style={{
    width: "210mm",             // Standard A4 width
    minHeight: "297mm",         // Standard A4 height
    backgroundColor: "#fff",
    color: "#000",
    padding: "0",               // No padding
    margin: "0",                // No margin
    boxSizing: "border-box",
    overflow: "hidden",         // Hide overflow during screenshot
    transform: "scale(1)",      // Avoid distortion
    transformOrigin: "top left",
  }}
>
  <ResumePreview data={formData} template={template} />
</div>




    </div>
  );
}
