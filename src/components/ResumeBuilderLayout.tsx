"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import TemplateSelector from "./TemplateSelector";
import ProgressBar from "./ProgressBar";
import StepNavigation from "./StepNavigation";

import ContactStep from "./steps/ContactStep";
import EducationStep from "./steps/EducationStep";
import ExperienceStep from "./steps/ExperienceStep";
import SkillsStep from "./steps/SkillsStep";

import ResumePreview from "./ResumePreview";

type TemplateType = "classic" | "modern" | "minimal";
type ThemeType = "light" | "dark";

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
  github: string;  // optional as in ContactStep
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

  const [step, setStep] = useState(0);

  // <-- UPDATED: Added city and postalCode with empty string defaults
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

  const [theme, setTheme] = useState<ThemeType>("light");
  const [template, setTemplate] = useState<TemplateType>("classic");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummarySuggestions, setAiSummarySuggestions] = useState<string[]>([]);
  const [aiExpSuggestions, setAiExpSuggestions] = useState<string[][]>([]);
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("resumeData") || sessionStorage.getItem("resumeData");
    if (saved) setFormData(JSON.parse(saved));
  }, []);

  const handleSubmit = useCallback(async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      localStorage.setItem("resumeData", JSON.stringify(formData));
      sessionStorage.setItem("resumeData", JSON.stringify(formData));
      router.push("/login?redirect=/resumebuilder&autosave=true");
      return;
    }
    try {
      const response = await fetch("https://resume-ai-builder-esnw.onrender.com/resume/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: formData }),
      });
      if (response.ok) {
        alert("Resume saved successfully!");
        router.push("/dashboard");
      } else {
        const error = await response.text();
        alert(`Failed to save resume: ${error}`);
      }
    } catch (err) {
      console.error("Save resume error:", err);
      alert("Failed to save resume.");
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

  // Strictly typed onChange handler:
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
        body: JSON.stringify({ prompt: `Suggest improvements or rewrite for this professional summary: ${formData.summary}`, type: "summary" }),
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

  const getSkillSuggestions = async () => {
    // Replace with your logic
    setAiSkillSuggestions(["JavaScript", "TypeScript", "React", "Node.js"]);
  };
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
          <ThemeToggle theme={theme} setTheme={setTheme} />
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
            getExperienceSuggestions={async (index: number) => {
              setAiExpSuggestions((prev) => {
                const updated = [...prev];
                updated[index] = ["Improved experience description"];
                return updated;
              });
            }}
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
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Save Resume
          </button>
        )}
      </div>

      <div className="mt-14 space-y-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Preview</h2>
        <ResumePreview data={formData} template={template} />
      </div>
    </div>
  );
}
