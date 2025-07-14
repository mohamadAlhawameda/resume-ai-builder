"use client";

import React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GraduationCap, XCircle } from "lucide-react";
import FloatingInput from "../ui/FloatingInput";

// Local type definitions
type EducationEntry = {
  school: string;
  degree: string;
  from: string;
  to: string;
};

type EducationStepProps = {
  education: EducationEntry[];
  onChange: (index: number, field: keyof EducationEntry, value: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
};

export default function EducationStep({
  education,
  onChange,
  addItem,
  removeItem,
}: EducationStepProps) {
  const dragControls = useDragControls();

  // Optional: handle reorder if you want to allow drag and drop reordering
  const handleReorder = (newOrder: EducationEntry[]) => {
    newOrder.forEach((item, i) => {
      onChange(i, "school", item.school);
      onChange(i, "degree", item.degree);
      onChange(i, "from", item.from);
      onChange(i, "to", item.to);
    });
  };

  return (
    <section className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Education</h2>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
        >
          + Add Education
        </button>
      </div>

      {education.length === 0 && (
        <p className="text-sm text-gray-500 text-center italic py-6">
          No education entries yet. Start by adding one above.
        </p>
      )}

      <Reorder.Group axis="y" values={education} onReorder={handleReorder} className="space-y-6">
        {education.map((item, index) => (
          <Reorder.Item
            key={index}
            value={item}
            dragListener={false}
            dragControls={dragControls}
            className="rounded-xl border border-gray-300 bg-gray-50 px-6 py-5 shadow-sm space-y-4 relative"
          >
            <div
              className="text-xs text-gray-400 font-mono absolute top-0.5 left-3 cursor-move"
              onPointerDown={(e) => dragControls.start(e)}
            >
              ⠿ Drag
            </div>

            <FloatingInput
              id={`school-${index}`}
              label="School Name"
              value={item.school}
              onChange={(e) => onChange(index, "school", e.target.value)}
            />

            <FloatingInput
              id={`degree-${index}`}
              label="Degree / Program"
              value={item.degree}
              onChange={(e) => onChange(index, "degree", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                id={`from-${index}`}
                label="Start Year"
                value={item.from}
                onChange={(e) => onChange(index, "from", e.target.value)}
              />

              <FloatingInput
                id={`to-${index}`}
                label="End Year"
                value={item.to}
                onChange={(e) => onChange(index, "to", e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => removeItem(index)}
              className="flex items-center gap-1 text-red-600 text-sm hover:underline hover:text-red-700 mt-1"
            >
              <XCircle className="w-4 h-4" /> Remove
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}
