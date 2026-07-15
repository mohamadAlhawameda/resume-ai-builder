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
import { useLocale } from "@/i18n/LocaleProvider";

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
    index: number,
    key: keyof ExperienceEntry,
    value: string
  ) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
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
  const { t } = useLocale();
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(experience);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    reordered.forEach((item, index) => {
      onChange(index, "company", item.company);
      onChange(index, "role", item.role);
      onChange(index, "from", item.from);
      onChange(index, "to", item.to);
      onChange(index, "description", item.description);
    });
  };

  return (
    <div>
      <button
        onClick={addItem}
        className="mb-4 px-4 py-2 min-h-11 bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition"
      >
        {t('builderPage.addExperience')}
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
                      className="rounded-xl border border-border p-4 shadow-soft bg-surface space-y-4 relative"
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-move text-muted-foreground text-sm mb-2 select-none"
                        aria-label={t('builderPage.dragHandleAria')}
                      >
                        {t('builderPage.dragHandle')}
                      </div>

                      <FloatingInput
                        id={`company-${index}`}
                        label={t('builderPage.companyLabel')}
                        value={exp.company}
                        onChange={(e) =>
                          onChange(index, "company", e.target.value)
                        }
                      />

                      <FloatingInput
                        id={`role-${index}`}
                        label={t('builderPage.roleLabel')}
                        value={exp.role}
                        onChange={(e) => onChange(index, "role", e.target.value)}
                      />

                      <div className="flex gap-4">
                        <FloatingInput
                          id={`from-${index}`}
                          label={t('builderPage.fromLabel')}
                          value={exp.from}
                          onChange={(e) => onChange(index, "from", e.target.value)}
                        />
                        <FloatingInput
                          id={`to-${index}`}
                          label={t('builderPage.toLabel')}
                          value={exp.to}
                          onChange={(e) => onChange(index, "to", e.target.value)}
                        />
                      </div>

                      <FloatingTextarea
                        id={`description-${index}`}
                        label={t('builderPage.descriptionLabel')}
                        value={exp.description}
                        onChange={(e) =>
                          onChange(index, "description", e.target.value)
                        }
                      />

                      <div className="flex justify-between items-center mt-2">
                        <button
                          type="button"
                          onClick={() => getExperienceSuggestions?.(index)}
                          disabled={aiLoading || !exp.description.trim()}
                          className={`text-sm font-medium min-h-11 ${
                            aiLoading
                              ? "text-muted-foreground cursor-not-allowed"
                              : "text-accent hover:underline"
                          }`}
                        >
                          {aiLoading ? t('builderPage.generatingEllipsis') : t('builderPage.aiSuggestionLink')}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-danger hover:underline text-sm min-h-11"
                        >
                          {t('builderPage.removeButton')}
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
                                applyExperienceSuggestion?.(index, sugg);
                              }}
                              className="w-full text-start cursor-pointer bg-muted p-2 rounded-lg hover:bg-surface-hover transition"
                            >
                              {sugg}
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
