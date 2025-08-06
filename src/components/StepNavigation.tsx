// import React from "react";
// import clsx from "clsx";

// interface StepNavigationProps {
//   steps: string[];
//   currentStep: number;
//   onStepChange: (stepIndex: number) => void;
// }

// export default function StepNavigation({
//   steps,
//   currentStep,
//   onStepChange,
// }: StepNavigationProps) {
//   return (
//     <nav className="flex gap-3 mb-10">
//       {steps.map((label: string, i: number) => (
//         <button
//           key={label}
//           onClick={() => onStepChange(i)}
//           className={clsx(
//             "px-5 py-2 rounded-full transition duration-200 text-sm font-medium",
//             currentStep === i
//               ? "bg-blue-700 text-white shadow"
//               : "bg-gray-100 text-gray-800 hover:bg-gray-200"
//           )}
//         >
//           {label}
//         </button>
//       ))}
//     </nav>
//   );
// }
import React from "react";
import clsx from "clsx";

interface StepNavigationProps {
  steps: string[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
}

export default function StepNavigation({
  steps,
  currentStep,
  onStepChange,
}: StepNavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2 sm:gap-3 mb-10 overflow-x-auto">
      {steps.map((label: string, i: number) => (
        <button
          key={label}
          onClick={() => onStepChange(i)}
          className={clsx(
            "px-5 py-2 rounded-full transition duration-200 text-sm font-medium whitespace-nowrap",
            currentStep === i
              ? "bg-blue-700 text-white shadow-md"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
