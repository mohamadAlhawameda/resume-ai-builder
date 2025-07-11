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

export default function ResumeBuilderLayout() {
  const router = useRouter();
  const steps = ["Contact", "Education", "Experience", "Skills"];

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    linkedIn: "",
    github: "",
    isDeveloper: false,
    summary: "",
    education: [],
    experience: [],
    skills: [],
  });

  const [theme, setTheme] = useState("light");
  const [template, setTemplate] = useState("classic");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummarySuggestions, setAiSummarySuggestions] = useState([]);
  const [aiExpSuggestions, setAiExpSuggestions] = useState([]);
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("resumeData") || sessionStorage.getItem("resumeData");
    if (saved) setFormData(JSON.parse(saved));
  }, []);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldAutoSave = urlParams.get("autosave") === "true";
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (shouldAutoSave && token) {
      handleSubmit(); // Automatically save after redirect
      urlParams.delete("autosave");
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, "", newUrl); // Clean up URL
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("resumeData", JSON.stringify(formData))
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

  const onChange = useCallback((field, index, key, value) => {
    setFormData((old) => {
      const newData = { ...old };
      if (index === null) {
        newData[field] = value;
      } else if (typeof index === "number" && key) {
        newData[field] = [...(newData[field] || [])];
        newData[field][index] = { ...newData[field][index], [key]: value };
      } else if (typeof index === "number") {
        newData[field] = [...(newData[field] || [])];
        newData[field][index] = value;
      }
      return newData;
    });
  }, []);

  const addItem = (field) => {
    setFormData((old) => {
      const newData = { ...old };
      if (field === "education") newData.education.push({ school: "", degree: "", from: "", to: "" });
      if (field === "experience") newData.experience.push({ company: "", role: "", from: "", to: "", description: "" });
      if (field === "skills") newData.skills.push("");
      return newData;
    });
  };

  const removeItem = (field, index) => {
    setFormData((old) => {
      const newData = { ...old };
      if (Array.isArray(newData[field])) newData[field].splice(index, 1);
      return newData;
    });
    if (field === "experience") {
      setAiExpSuggestions((old) => {
        const newArr = [...old];
        newArr.splice(index, 1);
        return newArr;
      });
    }
  };

  const onSummaryChange = (val) =>
    setFormData((old) => ({ ...old, summary: val }));

  const onDeveloperToggle = (checked) =>
    setFormData((old) => ({ ...old, isDeveloper: checked, github: checked ? old.github : "" }));

  // Function to call AI suggestion endpoint
const getSummarySuggestions = async () => {
  if (!formData.summary.trim()) return;

  setAiLoading(true);
  try {
    const response = await fetch("http://localhost:3001/ai/suggest/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header here
      },
      body: JSON.stringify({
        prompt: `Suggest improvements or rewrite for this professional summary: ${formData.summary}`,
        type: "summary",
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    setAiSummarySuggestions(data.suggestions || []);
    console.log("AI summary response data:", data);
  } catch (error) {
    console.error("AI summary suggestion error:", error);
    alert("Failed to get AI summary suggestions");
  }
  setAiLoading(false);
};


const applySummarySuggestion = (sugg) => {
  setFormData((old) => ({ ...old, summary: sugg }));
  setAiSummarySuggestions([]);
};


 const getExperienceSuggestions = async (index) => {
  const exp = formData.experience[index];
  if (!exp || !exp.description.trim()) return;

  setAiLoading(true);

  try {
const token = sessionStorage.getItem('token'); // or use context/auth provider if you store it differently
    console.log("Retrieved token:", token);

    if (!token) {
      alert("You are not logged in.");
      setAiLoading(false);
      return;
    }

    const response = await fetch("http://localhost:3001/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt: `Suggest improvements or rewrite for this experience description: ${exp.description}`,
        type: "experience",
      }),
    });

    if (response.status === 401) {
      alert("Unauthorized. Please log in again.");
      setAiLoading(false);
      return;
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    setAiExpSuggestions((old) => {
      const newArr = [...old];
      newArr[index] = data.suggestions || [];
      return newArr;
    });
  } catch (err) {
    console.error(err);
    alert("Failed to get AI experience suggestions");
  } finally {
    setAiLoading(false);
  }
};



  const applyExperienceSuggestion = (index, sugg) => {
    setFormData((old) => {
      const newData = { ...old };
      if (newData.experience && newData.experience[index]) {
        newData.experience[index].description = sugg;
      }
      return newData;
    });
    setAiExpSuggestions((old) => {
      const newArr = [...old];
      newArr[index] = [];
      return newArr;
    });
  };

  const getSkillSuggestions = async () => {
    setAiLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token")
      let prompt = "Suggest skills based on this resume content:\n";
      if (formData.summary) prompt += `Summary: ${formData.summary}\n`;
      formData.experience.forEach((exp, i) => {
        if (exp.description) prompt += `Experience ${i + 1}: ${exp.description}\n`;
      });
      prompt += "List relevant skills separated by commas.";
      const response = await fetch("http://localhost:3001/ai/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, type: "skills" }),
      });
      const data = await response.json();
      let skills = [];
      if (Array.isArray(data.suggestions)) skills = data.suggestions;
      else if (typeof data.suggestions === "string") skills = data.suggestions.split(",").map((s) => s.trim());
      setAiSkillSuggestions(skills);
    } catch (err) {
      console.error(err);
      alert("Failed to get AI skill suggestions");
    }
    setAiLoading(false);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      localStorage.setItem("resumeData", JSON.stringify(formData));
      sessionStorage.setItem("resumeData", JSON.stringify(formData));
      router.push("/login?redirect=/resumebuilder&autosave=true");
      return;
  }
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      // router.push("/login")
      
      const response = await fetch("http://localhost:3001/resume/create", {
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
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Your Resume</h1>
        <div className="flex gap-4 items-center">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <TemplateSelector template={template} setTemplate={setTemplate} />
        </div>
      </div>

      <ProgressBar step={step} totalSteps={steps.length} />
      <StepNavigation steps={steps} currentStep={step} onStepChange={setStep} />

      <div className="mb-12">
        {step === 0 && (
          <ContactStep
            formData={formData}
            onChange={onChange}
            onSummaryChange={onSummaryChange}
            summary={formData.summary}
            getSummarySuggestions={getSummarySuggestions}
            aiSummarySuggestions={aiSummarySuggestions}
            applySummarySuggestion={applySummarySuggestion}
            aiLoading={aiLoading}
            isDeveloper={formData.isDeveloper}
            onDeveloperToggle={onDeveloperToggle}
          />
        )}
        {step === 1 && (
          <EducationStep
            education={formData.education}
            addItem={addItem}
            removeItem={removeItem}
            onChange={onChange}
          />
        )}
        {step === 2 && (
          <ExperienceStep
            experience={formData.experience}
            addItem={addItem}
            removeItem={removeItem}
            onChange={onChange}
            getExperienceSuggestions={getExperienceSuggestions}
            aiExpSuggestions={aiExpSuggestions}
            applyExperienceSuggestion={applyExperienceSuggestion}
            aiLoading={aiLoading}
          />
        )}
        {step === 3 && (
          <SkillsStep
            skills={formData.skills}
            addItem={addItem}
            removeItem={removeItem}
            onChange={onChange}
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
