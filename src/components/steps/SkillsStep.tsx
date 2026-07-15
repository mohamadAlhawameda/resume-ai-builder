'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import FloatingInput from '../ui/FloatingInput';
import { Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

interface SkillsStepProps {
  skills: string[];
  onChange: (index: number, value: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  getSkillSuggestions?: () => void;
  aiSkillSuggestions?: string[];
  aiLoading?: boolean;
}

export default function SkillsStep({
  skills,
  onChange,
  addItem,
  removeItem,
  getSkillSuggestions,
  aiSkillSuggestions = [],
  aiLoading = false,
}: SkillsStepProps) {
  const { t } = useLocale();
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(skills);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    reordered.forEach((item, index) => {
      onChange(index, item);
    });
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="skillsList">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-6 relative"
            >
              {skills.map((skill, index) => (
                <Draggable
                  key={index.toString()}
                  draggableId={index.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      className="relative bg-surface border border-border rounded-lg p-5 shadow-soft hover:shadow-soft-lg transition"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <button
                        type="button"
                        title={t('builderPage.removeSkillTitle')}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(index);
                        }}
                        className="absolute -top-3 -end-3 z-10 bg-surface border border-danger/30 text-danger text-xs w-7 h-7 flex items-center justify-center rounded-full shadow hover:bg-danger/10 hover:scale-105 transition"
                      >
                        ✕
                      </button>

                      <FloatingInput
                        id={`skill-${index}`}
                        label={t('builderPage.skillNumberLabel', { n: index + 1 })}
                        value={skill}
                        onChange={(e) => onChange(index, e.target.value)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex flex-wrap items-center gap-4 mt-6">
        <button
          onClick={addItem}
          className="px-4 py-2 min-h-11 bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition"
        >
          {t('builderPage.addSkillButton')}
        </button>

        {getSkillSuggestions && (
          <button
            onClick={getSkillSuggestions}
            disabled={aiLoading}
            className={`inline-flex items-center gap-1 text-sm font-medium px-3 py-2 min-h-11 rounded-lg transition ${
              aiLoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? t('builderPage.generatingEllipsis') : t('builderPage.suggestSkillsButton')}
          </button>
        )}
      </div>

      {aiSkillSuggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {aiSkillSuggestions.map((skill, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(skills.length, skill)}
              className="bg-muted hover:bg-primary/10 text-sm text-foreground border border-border-strong rounded-full px-4 py-1 min-h-11 transition cursor-pointer shadow-sm hover:shadow"
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
