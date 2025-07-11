import React from "react";
import clsx from "clsx";

export default function StepNavigation({ steps, currentStep, onStepChange }) {
  return (
    <nav className="flex gap-3 mb-10">
      {steps.map((label, i) => (
        <button
          key={label}
          onClick={() => onStepChange(i)}
          className={clsx(
            "px-5 py-2 rounded-full transition duration-200 text-sm font-medium",
            currentStep === i
              ? "bg-blue-700 text-white shadow"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}