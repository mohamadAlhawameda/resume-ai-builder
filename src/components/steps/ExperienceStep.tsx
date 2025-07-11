"use client";

import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import FloatingInput from "../ui/FloatingInput";
import FloatingTextarea from "../ui/FloatingTextarea";

interface ExperienceEntry {
  company: string;
  role: string;
  from: string;
  to: string;
  description: string;
}

interface ExperienceStepProps {
  experience: ExperienceEntry[];
  onChange: (
    field: string,
    index: number,
    key: keyof ExperienceEntry,
    value: string
  ) => void;
  addItem: (field: string) => void;
  removeItem: (field: string, index: number) => void;
  getExperienceSuggestions?: (index: number) => void;
  applyExperienceSuggestion?: (index: number, suggestion: string) => void;
  aiExpSuggestions?: string[][];
  aiLoading?: boolean;
}

export default function ExperienceStep({
  experience,
  onChange,
  addItem,
  removeItem,
  getExperienceSuggestions,
  applyExperienceSuggestion,
  aiExpSuggestions = [],
  aiLoading = false,
}: ExperienceStepProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(experience);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    reordered.forEach((item, index) => {
      onChange("experience", index, "company", item.company);
      onChange("experience", index, "role", item.role);
      onChange("experience", index, "from", item.from);
      onChange("experience", index, "to", item.to);
      onChange("experience", index, "description", item.description);
    });
  };

  return (
    <div>
      <button
        onClick={() => addItem("experience")}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Add Experience
      </button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="experienceList">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-6"
            >
              {experience.map((exp, index) => (
                <Draggable
                  key={index.toString()}
                  draggableId={index.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="rounded border p-4 shadow-sm bg-white space-y-4 relative"
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-move text-gray-400 text-sm mb-2 select-none"
                        aria-label="Drag handle"
                      >
                        ⠿ Drag
                      </div>

                      <FloatingInput
                        id={`company-${index}`}
                        label="Company"
                        value={exp.company}
                        onChange={(e) =>
                          onChange("experience", index, "company", e.target.value)
                        }
                      />

                      <FloatingInput
                        id={`role-${index}`}
                        label="Role"
                        value={exp.role}
                        onChange={(e) =>
                          onChange("experience", index, "role", e.target.value)
                        }
                      />

                      <div className="flex gap-4">
                        <FloatingInput
                          id={`from-${index}`}
                          label="From"
                          value={exp.from}
                          onChange={(e) =>
                            onChange("experience", index, "from", e.target.value)
                          }
                        />
                        <FloatingInput
                          id={`to-${index}`}
                          label="To"
                          value={exp.to}
                          onChange={(e) =>
                            onChange("experience", index, "to", e.target.value)
                          }
                        />
                      </div>

                      <FloatingTextarea
                        id={`description-${index}`}
                        label="Description"
                        value={exp.description}
                        onChange={(e) =>
                          onChange("experience", index, "description", e.target.value)
                        }
                      />

                      <div className="flex justify-between items-center mt-2">
                        <button
                          type="button"
                          onClick={() => getExperienceSuggestions?.(index)}
                          disabled={aiLoading || !exp.description.trim()}
                          className={`text-sm font-medium ${
                            aiLoading
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-purple-600 hover:underline"
                          }`}
                        >
                          {aiLoading ? "Generating..." : "AI Suggestion"}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem("experience", index)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      {aiExpSuggestions[index]?.length > 0 && (
                        <div className="mt-2 text-sm space-y-1">
                          {aiExpSuggestions[index].map((sugg, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof sugg === "string") {
                                  applyExperienceSuggestion?.(index, sugg);
                                } else {
                                  console.warn("Invalid suggestion type", sugg);
                                }
                              }}
                              className="w-full text-left cursor-pointer bg-gray-100 p-2 rounded hover:bg-gray-200 transition"
                            >
                              {typeof sugg === "string"
                                ? sugg
                                : "Invalid suggestion"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
